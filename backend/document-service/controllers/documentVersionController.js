import VersionData from '../models/documentVersionModel.js';
import Document from '../models/documentModel.js';
import mongoose from 'mongoose';
import { fetchUserInfoById } from '../utils/userServiceUtils.js';

// Minimum interval (ms) before creating another version for the same document
const MIN_TEMPLATE_VERSION_INTERVAL_MS = process.env.MIN_TEMPLATE_VERSION_INTERVAL_MS
  ? parseInt(process.env.MIN_TEMPLATE_VERSION_INTERVAL_MS, 10)
  : 5 * 60 * 1000; // default 5 minutes

// helper to get epoch ms from various date shapes (Date, ISO string, number, or mongo $date wrapper)
const getTimeMs = (v) => {
  if (!v && v !== 0) return 0;
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'string') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }
  if (v && typeof v === 'object') {
    if (v.$date) return getTimeMs(v.$date);
    try { const d = new Date(v); return isNaN(d.getTime()) ? 0 : d.getTime(); } catch (e) { return 0; }
  }
  return 0;
};

const toIso = (val) => {
  if (!val) return null;
  try { const d = new Date(val); return isNaN(d.getTime()) ? null : d.toISOString(); } catch (e) { return null; }
};

// Deep merge two plain objects (arrays are replaced). Returns a new object.
const deepMerge = (target, source) => {
  if (!source || typeof source !== 'object') return target;
  if (!target || typeof target !== 'object') return source;
  const out = Array.isArray(target) ? target.slice() : { ...target };
  for (const k of Object.keys(source)) {
    const sv = source[k];
    const tv = out[k];
    if (sv && typeof sv === 'object' && !Array.isArray(sv) && tv && typeof tv === 'object' && !Array.isArray(tv)) {
      out[k] = deepMerge(tv, sv);
    } else {
      out[k] = sv;
    }
  }
  return out;
};

const normalizeVersionData = (raw) => {
  if (!raw) return raw;
  const out = { ...raw };
  try {
    out.id = out._id ? String(out._id) : out.id || null;
  // no separate version_id field; expose version_no as string
  out.version_id = out.version_no !== undefined ? String(out.version_no) : null;
    out.document_id = out.document_id ? String(out.document_id) : null;
    out.created_at = toIso(out.created_at || out.createdAt || null);
    out.updated_at = toIso(out.updated_at || out.updatedAt || null);
    out.last_activity_at = toIso(out.last_activity_at || null);
  } catch (e) {
    console.error('normalizeVersionData error', e);
  }
  return out;
};

// small helper to detect ObjectId-like strings
const isObjectIdString = (s) => typeof s === 'string' && /^[a-fA-F0-9]{24}$/.test(s);

/**
 * @desc Create a new version row for a document or merge updates into the latest recent version
 *       according to the interval-only suppression policy.
 * @route INTERNAL
 * @param {string|ObjectId|Object} document_id - Document id or document-like object (id/_id/document_id)
 * @param {Object} field_values - Delta of field values for this version
 * @param {Object} [opts] - Options: { userId, note, isBookmarked, last_activity_at, snapshot }
 * @returns {Promise<Object|null>} created or updated version object, or null on error
 *
 */
export const createVersionData = async (document_id, field_values = {}, opts = {}) => {
  try {
    // normalize document id
    let docIdRaw = document_id;
    if (document_id && typeof document_id === 'object') {
      if (document_id._id) docIdRaw = document_id._id;
      else if (document_id.document_id) docIdRaw = document_id.document_id;
      else if (document_id.documentId) docIdRaw = document_id.documentId;
      else if (document_id.id) docIdRaw = document_id.id;
      else if (typeof document_id.toString === 'function') {
        // handles Mongoose ObjectId or similar by using its string representation
        docIdRaw = document_id.toString();
      } else {
        return null;
      }
    }
    if (!docIdRaw) return null;
    const docId = isObjectIdString(String(docIdRaw)) ? new mongoose.Types.ObjectId(String(docIdRaw)) : docIdRaw;

    // find latest version
    const latest = await VersionData.findOne({ document_id: docId }).sort({ version_no: -1 });

    // Determine snapshot: prefer opts.snapshot, else attempt to load current document and use its field_values
    let snapshotObj = null;
    if (opts.snapshot && typeof opts.snapshot === 'object') {
      snapshotObj = opts.snapshot;
    } else {
      try {
        const docForSnapshot = await Document.findById(docId).lean();
        if (docForSnapshot) snapshotObj = docForSnapshot.field_values || {};
      } catch (e) {
        // ignore snapshot fetch failure; we'll default to empty object below
        snapshotObj = null;
      }
    }

    // prepare note string early so callers that passed a note force a new version
    let noteString = '';
    if (typeof opts.note === 'string') noteString = opts.note;
    else if (Array.isArray(opts.notes) && opts.notes.length) {
      if (typeof opts.notes[0] === 'string') noteString = opts.notes.join('\n');
      else noteString = opts.notes.map(n => (n && n.message) ? String(n.message) : String(n)).join('\n');
    }
    const hasNote = !!(noteString && String(noteString).trim().length > 0);

    // allow callers to force creation of a new version (skip interval-based suppression/update)
    const forceNew = !!opts.forceNew || hasNote;

    if (latest && !forceNew) {
      const lastMs = getTimeMs(latest.last_activity_at || latest.updated_at || latest.created_at);
      const diffMs = Date.now() - lastMs;
      if (diffMs < MIN_TEMPLATE_VERSION_INTERVAL_MS) {
        // suppress: update latest (merge delta into existing field_values and update snapshot)
        const now = new Date();
        const existingFV = latest.field_values && typeof latest.field_values === 'object' ? latest.field_values : {};
        const mergedFV = deepMerge(existingFV, field_values || {});
        const updatedFields = { field_values: mergedFV, last_activity_at: now, updated_at: now };
        if (snapshotObj !== null) updatedFields.snapshot = snapshotObj;
        const updated = await VersionData.findByIdAndUpdate(latest._id, { $set: updatedFields }, { new: true }).lean();
        return updated || (latest.toObject ? latest.toObject() : latest);
      }
    }
    // (noteString already prepared above)
    const isBookmarked = !!opts.isBookmarked;
    const last_activity_at = opts.last_activity_at ? new Date(opts.last_activity_at) : new Date();

    // allocate version_no with retry loop
    const MAX_RETRIES = 5;
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      attempt += 1;
      try {
        const latestForInsert = await VersionData.findOne({ document_id: docId }).sort({ version_no: -1 });
        const nextVersionNo = latestForInsert ? (Number(latestForInsert.version_no || 0) + 1) : 1;
        // determine created_by from opts.userId (caller) to avoid relying on req in internal helper
        let createdByVal = null;
        if (opts && opts.userId) {
          try {
            const s = String(opts.userId);
            createdByVal = isObjectIdString(s) ? new mongoose.Types.ObjectId(s) : s;
          } catch (e) {
            createdByVal = opts.userId;
          }
        }

        const toInsert = {
          document_id: docId,
          version_no: nextVersionNo,
          // delta changes for this version
          field_values: field_values || {},
          // full snapshot at this version (may be null -> DB will store empty object via default)
          snapshot: snapshotObj || {},
          created_by: createdByVal || null,
          note: noteString,
          isBookmarked,
          last_activity_at
        };
        const created = await VersionData.create(toInsert);
        return created.toObject ? created.toObject() : created;
      } catch (e) {
        if (e && e.code === 11000) {
          // duplicate key (race) — retry
          // small backoff
          await new Promise(r => setTimeout(r, 20 * attempt));
          continue;
        }
        console.error('createVersionData error', e);
        return null;
      }
    }
    console.error('createVersionData - could not allocate version_no after retries');
    return null;
  } catch (e) {
    console.error('createVersionData top-level error', e);
    return null;
  }
};

/**
 * @desc Get a single version data record by either its Mongo `_id` or by `version_no`.
 * @route GET /api/documents/version-data/:versionId
 */
export const getVersionData = async (req, res) => {
  try {
    const { versionId } = req.params;
    if (!versionId) return res.status(400).json({ success: false, message: 'versionId required' });
  const or = [];
  if (isObjectIdString(versionId)) or.push({ _id: versionId });
  const verNo = Number(versionId);
  if (!Number.isNaN(verNo)) or.push({ version_no: verNo });
  // fallback: if versionId is not objectId nor number, match _id string
  if (or.length === 0) or.push({ _id: versionId });
    const v = await VersionData.findOne({ $or: or }).lean();
    if (!v) return res.status(404).json({ success: false, message: 'version data not found' });
    return res.json({ success: true, versionData: normalizeVersionData(v) });
  } catch (err) {
    console.error('getVersionData error', err);
    return res.status(500).json({ success: false, message: 'Failed to get version data' });
  }
};

/**
 * @desc Patch bookmark and note for a version data record. Normalizes `note` to a string.
 * @route PATCH /api/documents/version-data/:versionId/bookmark
 */
export const patchVersionBookmark = async (req, res) => {
  try {
    const { versionId } = req.params;
  const { isBookmarked, note } = req.body;
    if (!versionId) return res.status(400).json({ success: false, message: 'versionId required' });
  const or = [];
  if (isObjectIdString(versionId)) or.push({ _id: versionId });
  const verNo = Number(versionId);
  if (!Number.isNaN(verNo)) or.push({ version_no: verNo });
  if (or.length === 0) or.push({ _id: versionId });
    const v = await VersionData.findOne({ $or: or });
    if (!v) return res.status(404).json({ success: false, message: 'version data not found' });
      // If a note is provided, create a new version row instead of updating the existing one
      const normalizeNote = (n) => {
        if (typeof n === 'string') return n;
        if (Array.isArray(n) && n.length) {
          if (typeof n[0] === 'string') return n.join('\n');
          return n.map(x => (x && x.message) ? String(x.message) : String(x)).join('\n');
        }
        if (n !== undefined && n !== null) return String(n);
        return '';
      };

      const noteString = normalizeNote(note);
      if (noteString && String(noteString).trim().length > 0) {
        // create a new version row capturing this note and bookmark flag
        try {
          const snapshotForNew = (v && v.snapshot) ? v.snapshot : (v && v.field_values ? v.field_values : {});
          const created = await createVersionData(v.document_id || v.documentId || v.document || v.document_id, {}, { note: noteString, isBookmarked: !!isBookmarked, forceNew: true, snapshot: snapshotForNew });
          if (!created) return res.status(500).json({ success: false, message: 'Failed to create version with note' });
          return res.json({ success: true, versionData: normalizeVersionData(created) });
        } catch (e) {
          console.error('Failed to create version when note provided', e);
          return res.status(500).json({ success: false, message: 'Failed to create version with note' });
        }
      }

      // No note provided -> update existing version (bookmark toggle)
      if (typeof isBookmarked === 'boolean') v.isBookmarked = isBookmarked;
      await v.save();
      return res.json({ success: true, versionData: normalizeVersionData(v.toObject()) });
  } catch (err) {
    console.error('patchVersionBookmark error', err);
    return res.status(500).json({ success: false, message: 'Failed to update bookmark' });
  }
};

/**
 * @desc List version data records for a document. Supports optional grouping by snapshot + interval.
 * @route GET /api/documents/version-data/document/:documentId
 */
export const listVersionDataByDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    if (!documentId) return res.status(400).json({ success: false, message: 'documentId required' });
    const items = await VersionData.find({ document_id: documentId }).sort({ version_no: -1 }).lean();

    const doGroup = String(req.query.group || '').toLowerCase() === 'true' || !!req.query.group_interval_ms;
    // normalize raw version doc and enrich created_by_name via user service
    const normalizeVersionAsync = async (raw) => {
      if (!raw) return raw;
      const out = normalizeVersionData(raw);
      try {
        // normalize created_by (may be ObjectId or nested)
        let cb = raw.created_by || raw.createdBy || out.created_by || out.createdBy || null;
        if (cb && typeof cb === 'object') {
          if (cb.$oid) cb = cb.$oid;
          else if (cb._id) cb = String(cb._id);
        }
        out.created_by = cb ? String(cb) : null;
        out.created_by_name = null;
        if (out.created_by) {
          try {
            const user = await fetchUserInfoById(out.created_by, req);
            if (user) {
              const u = (user.user && typeof user.user === 'object') ? user.user : (user.data && typeof user.data === 'object' && user.data.user ? user.data.user : (user.data || user));
              const first = (u && (u.firstname || u.first_name || u.firstName || u.given_name)) ? (u.firstname || u.first_name || u.firstName || u.given_name) : '';
              const last = (u && (u.lastname || u.last_name || u.lastName || u.family_name)) ? (u.lastname || u.last_name || u.lastName || u.family_name) : '';
              if (first || last) out.created_by_name = `${first} ${last}`.trim();
              else if (u && (u.name || u.fullName || u.full_name)) out.created_by_name = u.name || u.fullName || u.full_name;
              else if (u && u.email) out.created_by_name = String(u.email).split('@')[0];
            }
          } catch (e) {
            // ignore user lookup failures
          }
        }
      } catch (e) {
        console.error('normalizeVersionAsync error', e);
      }
      return out;
    };

    // If not grouping, return normalized list
    const normalizedAll = await Promise.all(items.map(v => normalizeVersionAsync(v)));
    if (!doGroup) return res.json({ success: true, items: normalizedAll });

    const DEFAULT_GROUP_INTERVAL_MS = process.env.MIN_TEMPLATE_VERSION_INTERVAL_MS ? parseInt(process.env.MIN_TEMPLATE_VERSION_INTERVAL_MS, 10) : (5 * 60 * 1000);
    const groupIntervalMs = req.query.group_interval_ms ? parseInt(req.query.group_interval_ms, 10) : DEFAULT_GROUP_INTERVAL_MS;

    // Use full snapshot for grouping if available; fallback to delta `field_values`.
    const normSnapshot = (obj) => { if (!obj || typeof obj !== 'object') return {}; try { return JSON.stringify(obj); } catch (e) { return String(obj); } };
    const snapshotsEqualLocal = (a, b) => {
      try {
        const aComp = a && a.snapshot ? a.snapshot : a && a.field_values ? a.field_values : a || {};
        const bComp = b && b.snapshot ? b.snapshot : b && b.field_values ? b.field_values : b || {};
        return normSnapshot(aComp) === normSnapshot(bComp);
      } catch (e) { return false; }
    };
    // Prefer last_activity_at as the time anchor, then updated/created
    const getMs = (v) => {
      const raw = v?.last_activity_at || v?.updated_at || v?.updatedAt || v?.created_at || v?.createdAt || null;
      if (!raw) return 0;
      try { return new Date(raw).getTime(); } catch (e) { return 0; }
    };

    const grouped = [];
    for (const v of items) {
      if (grouped.length === 0) { grouped.push({ representative: v, count: 1, versions: [v] }); continue; }
      const lastGroup = grouped[grouped.length - 1];
      const lastRep = lastGroup.representative;
      const diff = Math.abs(getMs(lastRep) - getMs(v));
      if (snapshotsEqualLocal(lastRep, v) && diff <= groupIntervalMs) {
        lastGroup.count += 1; lastGroup.versions.push(v);
      } else { grouped.push({ representative: v, count: 1, versions: [v] }); }
    }

    // Async normalize representative and versions and enrich created_by_name using user service
    for (const g of grouped) {
      g.representative = await normalizeVersionAsync(g.representative);
      g.versions = await Promise.all((g.versions || []).map(v => normalizeVersionAsync(v)));
      // If representative lacks created_by, search any version in the group for one and copy it
      let candidateId = null;
      if (!g.representative.created_by) {
        const found = (g.versions || []).find(v => v && v.created_by);
        if (found) {
          g.representative.created_by = found.created_by;
          g.representative.created_by_name = found.created_by_name || 'Unknown User';
          candidateId = found.created_by;
        } else {
          // no author info available in group
          g.representative.created_by_name = g.representative.created_by_name || 'Unknown User';
        }
      } else {
        // representative has created_by but ensure created_by_name is present (try to reuse from versions)
        g.representative.created_by_name = g.representative.created_by_name || ((g.versions || []).find(v => v && String(v.created_by) === String(g.representative.created_by))?.created_by_name) || 'Unknown User';
        candidateId = g.representative.created_by;
      }
    }
    const groupedVersions = grouped.map(g => ({ representative: g.representative, count: g.count, versions: g.versions }));
    return res.json({ success: true, items: normalizedAll, groupedVersions });
  } catch (err) {
    console.error('listVersionDataByDocument error', err);
    return res.status(500).json({ success: false, message: 'Failed to list version data' });
  }
};

/**
 * @desc Restore a document to a specific version. Merges the version's snapshot into the current document.
 * @route POST /api/documents/version-data/restore
 * @returns 
 */
export const restoreDocumentVersion = async (req, res) => {
  try {
    // Accept id/versionId from request body (preferred) or params (fallback)
    let id;
    let versionId;
    if (req.body && Object.keys(req.body).length) {
      ({ id, versionId } = req.body);
    }
    if ((!id || !versionId) && req.params) {
      id = id || req.params.id;
      versionId = versionId || req.params.versionId;
    }
    const requesterId = req.user?.id ? String(req.user.id) : null;
    if (!id || !versionId) return res.status(400).json({ success: false, message: 'document id & version id required' });

    // Try to find version by _id and document_id first
    let version = null;
    if (isObjectIdString(versionId)) {
      version = await VersionData.findOne({ _id: versionId, document_id: id }).lean();
    }
    // Fallback: if versionId is numeric, try matching version_no
    if (!version) {
      const verNo = Number(versionId);
      if (!Number.isNaN(verNo)) {
        version = await VersionData.findOne({ version_no: verNo, document_id: id }).lean();
      }
    }
    if (!version) return res.status(404).json({ success: false, message: 'version not found' });

  const document = await Document.findById(id);
    if (!document) return res.status(404).json({ success: false, message: 'document not found' });

      // permission: allow owner or admin
    /** 
    const isOwner = template.created_by && requesterId && String(template.created_by) === requesterId;
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'Admin' || req.user.isAdmin);
    if (!isOwner && !isAdmin) return res.status(403).json({ success: false, message: 'Not authorized to restore this template' });
*/
    // structural snapshot is stored in version.snapshot
    const snap = version.snapshot || {};
    // The snapshot may either contain a `field_values` object, or it may be the field-values
    // object itself (stored at the snapshot root). Normalize to `field_values`.
    const snapshotFieldValues = (snap && typeof snap === 'object')
      ? (snap.field_values && typeof snap.field_values === 'object' ? snap.field_values : snap)
      : {};
    document.field_values = snapshotFieldValues;
      //add a note about the restore
     document.notes = document.notes || [];
     document.notes.push({
       message: `Document restored to version ${version.version_no || version._id || ''}`,
       created_by: requesterId ? new mongoose.Types.ObjectId(requesterId) : null,
     });
     await document.save();

     try {
      // When restoring we want to force creation of a new version row capturing this restore.
      await createVersionData(document._id, snapshotFieldValues || {}, { forceNew: true, snapshot: snap, userId: requesterId, note: `Restored to version ${version.version_no || version._id || ''}` });
      } catch (e) {
        console.warn('Failed to create version after restore', e);
      }

      return res.json({ success: true, document: document.toObject ? document.toObject() : document });
  } catch (err) {
    console.error('restoreDocumentVersion error', err);
    return res.status(500).json({ success: false, message: 'Failed to restore document version' });
  }
};
