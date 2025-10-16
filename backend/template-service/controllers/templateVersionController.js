import TemplateHistory from '../models/templateVersionModel.js';
import Template from '../models/templateModel.js';
import { fetchUserInfoById } from '../utils/userServiceUtils.js';

// Minimum interval (ms) before creating another identical snapshot version.
// Can be overridden with environment variable MIN_TEMPLATE_VERSION_INTERVAL_MS
const MIN_TEMPLATE_VERSION_INTERVAL_MS = process.env.MIN_TEMPLATE_VERSION_INTERVAL_MS
  ? parseInt(process.env.MIN_TEMPLATE_VERSION_INTERVAL_MS, 10)
  : 5 * 60 * 1000; // default 5 minutes

/**
 * @desc Create a template version (helper)
 * @route INTERNAL
 * Accepts { templateId, snapshot = null, userId = null, note = '' }
 */
export const createTemplateVersion = async ({ templateId, snapshot = null, userId = null, note = '' }) => {
  const allowedKeys = ['pages_json', 'fields', 'pageSetup', 'dateFormat'];
  let snapToStore = {};
  if (snapshot && typeof snapshot === 'object') {
    allowedKeys.forEach(k => { if (snapshot[k] !== undefined) snapToStore[k] = snapshot[k]; });
  } else {
    const tpl = await Template.findById(templateId).lean();
    if (tpl) {
      allowedKeys.forEach(k => { if (tpl[k] !== undefined) snapToStore[k] = tpl[k]; });
    }
  }
  // determine latest version for this template (scoped by template_id only)
  const latest = await TemplateHistory.findOne({ template_id: templateId }).sort({ version_no: -1 }).lean();

  // helper: compare snapshots for equality on the allowed keys
  const snapshotsEqual = (a, b) => {
    try {
      // both may be undefined/null -> treat as equal
      if (!a && !b) return true;
      // ensure deterministic serialization by building object with allowedKeys order
      const norm = (s) => {
        if (!s || typeof s !== 'object') return {};
        const out = {};
        allowedKeys.forEach(k => { if (s[k] !== undefined) out[k] = s[k]; });
        return out;
      };
      const sa = JSON.stringify(norm(a));
      const sb = JSON.stringify(norm(b));
      if (sa === sb) return true;
      // lightweight similarity heuristic: if lengths are very close and prefixes match, treat as equal
      const maxLen = Math.max(sa.length, sb.length) || 1;
      const lenDiffRatio = Math.abs(sa.length - sb.length) / maxLen;
      if (lenDiffRatio <= 0.05) {
        // compare prefixes (first 40 chars) to avoid small re-ordering changes
        if (sa.slice(0, 40) === sb.slice(0, 40)) return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  // If latest exists and snapshot matches, decide based on interval
  if (latest) {
    const lastSnapshot = latest.snapshot || {};
    const lastCreatedRaw = latest.created_at || latest.createdAt || latest.created_at?.$date || null;
    const lastCreatedMs = lastCreatedRaw ? new Date(lastCreatedRaw).getTime() : 0;
    const nowMs = Date.now();

    const similar = snapshotsEqual(snapToStore, lastSnapshot);
    const diffMs = nowMs - lastCreatedMs;
    //console.debug && console.debug('createTemplateVersion debug', { templateId, similar, diffMs, interval: MIN_TEMPLATE_VERSION_INTERVAL_MS });

    // If snapshot identical and the last version is newer than interval, skip creating a new version
    if (similar && diffMs < MIN_TEMPLATE_VERSION_INTERVAL_MS) {
     // console.debug && console.debug('createTemplateVersion - skipping creation (within interval, snapshots similar)', { templateId, latestId: latest._id, diffMs });
      // touch the latest version's timestamp so it represents the most recent activity
      try {
        const now = new Date();
        const bumped = await TemplateHistory.findByIdAndUpdate(
          latest._id,
          { $set: { created_at: now, createdAt: now, last_activity_at: now, updatedAt: now } },
          { new: true }
        );
        return bumped || latest;
      } catch (e) {
        console.error('createTemplateVersion - failed to bump latest timestamp', e);
        return latest;
      }
    }
  }

  // create a new version (next version_no)
  const next = latest ? (latest.version_no || 0) + 1 : 1;
  const v = new TemplateHistory({ template_id: templateId, snapshot: snapToStore, version_no: next, created_by: userId, note });
  await v.save();
  // console.debug && console.debug('createTemplateVersion - created new version', { templateId, version_no: next, id: v._id });
  return v;
};

/**
 * @desc List template versions for a template
 * @route GET /api/templates/:id/versions
 */
export const listTemplateVersions = async (req, res) => {
  try {
    const { id } = req.params; // original template id
    if (!id) return res.status(400).json({ success: false, message: 'template id required' });
  const versions = await TemplateHistory.find({ template_id: id }).sort({ version_no: -1 }).lean();

    //if caller sets group=true or provides group_interval_ms
    const doGroup = String(req.query.group || '').toLowerCase() === 'true' || !!req.query.group_interval_ms;
    // Normalize and enrich versions for response (attach created_by_name and author)
    const normalizeVersion = async (raw) => {
      if (!raw) return raw;
      const out = { ...raw };
      try {
        // normalize ids to strings
        out.id = out._id ? String(out._id) : out.id || null;
        out.template_id = out.template_id ? String(out.template_id) : out.template_id || null;
        // normalize created_by (may be ObjectId or { $oid } or nested)
        let cb = out.created_by;
        if (cb && typeof cb === 'object') {
          if (cb.$oid) cb = cb.$oid;
          else if (cb._id) cb = String(cb._id);
        }
        out.created_by = cb ? String(cb) : null;

        // normalize dates to ISO strings
        const toIso = (val) => {
          if (!val) return null;
          try {
            const d = new Date(val);
            return isNaN(d.getTime()) ? null : d.toISOString();
          } catch (e) { return null; }
        };
        out.created_at = toIso(out.created_at || out.createdAt || out.timestamp || null);
        out.updated_at = toIso(out.updated_at || out.updatedAt || null);
        out.last_activity_at = toIso(out.last_activity_at || out.lastActivityAt || out.last_activity_at || null);

        // fetch user info for created_by (response-only enrichment)
        out.created_by_name = null;
        out.author = null;
        if (out.created_by) {
          try {
            const user = await fetchUserInfoById(out.created_by, req);
            if (user && (user.firstname || user.lastname)) {
              const fn = (user.firstname || '').trim();
              const ln = (user.lastname || '').trim();
              const name = `${fn} ${ln}`.trim();
              out.created_by_name = name || null;
              out.author = name || null;
            }
          } catch (e) {
            // ignore user lookup failures
            console.debug && console.debug('normalizeVersion - user lookup failed', e);
          }
        }
      } catch (e) {
        console.error('normalizeVersion error', e);
      }
      return out;
    };

    if (!doGroup) {
      const mapped = await Promise.all(versions.map(v => normalizeVersion(v)));
      return res.json({ success: true, versions: mapped });
    }

    const groupIntervalMs = req.query.group_interval_ms ? parseInt(req.query.group_interval_ms, 10) : (5 * 60 * 1000);

    // helper to normalize snapshot for comparison (allowed keys)
    const allowedKeys = ['pages_json', 'fields', 'pageSetup', 'dateFormat'];
    const normSnapshot = (s) => {
      if (!s || typeof s !== 'object') return {};
      const out = {};
      allowedKeys.forEach(k => { if (s[k] !== undefined) out[k] = s[k]; });
      return out;
    };

    const snapshotsEqual = (a, b) => {
      try {
        return JSON.stringify(normSnapshot(a)) === JSON.stringify(normSnapshot(b));
      } catch (e) { return false; }
    };

    const getMs = (v) => {
      const raw = v?.created_at || v?.createdAt || v?.timestamp || v?.created_at?.$date || null;
      if (!raw) return 0;
      try { return new Date(raw).getTime(); } catch (e) { return 0; }
    };

    // versions are sorted newest first; we'll iterate and group adjacent entries
    const grouped = [];
    for (const v of versions) {
      if (grouped.length === 0) {
        grouped.push({ representative: v, count: 1, versions: [v] });
        continue;
      }
      const lastGroup = grouped[grouped.length - 1];
      const lastRep = lastGroup.representative;
      const diff = Math.abs(getMs(lastRep) - getMs(v));
      if (snapshotsEqual(lastRep.snapshot, v.snapshot) && diff <= groupIntervalMs) {
        // merge into last group
        lastGroup.count += 1;
        lastGroup.versions.push(v);
        // keep representative as the newest (already the group's first entry)
      } else {
        grouped.push({ representative: v, count: 1, versions: [v] });
      }
    }

    // Build groupedVersions for response: expose representative and metadata
    // normalize grouped entries as well
    for (const g of grouped) {
      g.representative = await normalizeVersion(g.representative);
      g.versions = await Promise.all((g.versions || []).map(v => normalizeVersion(v)));
    }
    const groupedVersions = grouped.map(g => ({
      representative: g.representative,
      count: g.count,
      versions: g.versions
    }));

    const normalizedAll = await Promise.all(versions.map(v => normalizeVersion(v)));
    console.debug && console.debug('listTemplateVersions - grouped', { templateId: id, originalCount: versions.length, groupedCount: groupedVersions.length });
    return res.json({ success: true, versions: normalizedAll, groupedVersions });
  } catch (err) {
    console.error('listTemplateVersions error', err);
    return res.status(500).json({ success: false, message: 'Failed to list template versions' });
  }
};

/**
 * @desc Get a single template version
 * @route GET /api/templates/:id/versions/:versionId
 */
export const getTemplateVersion = async (req, res) => {
  try {
    const { id, versionId } = req.params;
    if (!id || !versionId) return res.status(400).json({ success: false, message: 'template id & version id required' });
  const v = await TemplateHistory.findOne({ _id: versionId, template_id: id }).lean();
    if (!v) return res.status(404).json({ success: false, message: 'version not found' });
    // normalize and enrich returned version
    const normalizeVersionSingle = async (raw) => {
      // reuse same logic as in list; create a small inline copy to avoid scope issues
      const out = { ...raw };
      try {
        out.id = out._id ? String(out._id) : out.id || null;
        out.template_id = out.template_id ? String(out.template_id) : out.template_id || null;
        let cb = out.created_by;
        if (cb && typeof cb === 'object') {
          if (cb.$oid) cb = cb.$oid;
          else if (cb._id) cb = String(cb._id);
        }
        out.created_by = cb ? String(cb) : null;
        const toIso = (val) => { if (!val) return null; try { const d = new Date(val); return isNaN(d.getTime()) ? null : d.toISOString(); } catch (e) { return null; } };
        out.created_at = toIso(out.created_at || out.createdAt || out.timestamp || null);
        out.updated_at = toIso(out.updated_at || out.updatedAt || null);
        out.last_activity_at = toIso(out.last_activity_at || out.lastActivityAt || out.last_activity_at || null);
        out.created_by_name = null;
        out.author = null;
        if (out.created_by) {
          try {
            const user = await fetchUserInfoById(out.created_by, req);
            if (user && (user.firstname || user.lastname)) {
              const fn = (user.firstname || '').trim();
              const ln = (user.lastname || '').trim();
              const name = `${fn} ${ln}`.trim();
              out.created_by_name = name || null;
              out.author = name || null;
            }
          } catch (e) { console.debug && console.debug('normalize single version - user lookup failed', e); }
        }
      } catch (e) { console.error('normalizeVersionSingle error', e); }
      return out;
    };

    const normalized = await normalizeVersionSingle(v);
    return res.json({ success: true, version: normalized });
  } catch (err) {
    console.error('getTemplateVersion error', err);
    return res.status(500).json({ success: false, message: 'Failed to get template version' });
  }
};

/**
 * @desc Update the note for a template version
 * @route PATCH /api/templates/:id/versions/:versionId/note
 */
export const updateTemplateVersionNote = async (req, res) => {
  try {
    const { id, versionId } = req.params;
    const { note } = req.body;
    if (!id || !versionId) return res.status(400).json({ success: false, message: 'template id & version id required' });
  const v = await TemplateHistory.findOne({ _id: versionId, template_id: id });
    if (!v) return res.status(404).json({ success: false, message: 'version not found' });
    v.note = typeof note === 'string' ? note : v.note;
    await v.save();
    return res.json({ success: true, version: v });
  } catch (err) {
    console.error('updateTemplateVersionNote error', err);
    return res.status(500).json({ success: false, message: 'Failed to update version note' });
  }
};

/**
 * @desc Update bookmark fields for a template version (isBookmarked + bookmark_name)
 * @route PATCH /api/templates/:id/versions/:versionId/bookmark
 */
export const updateTemplateVersionBookmark = async (req, res) => {
  try {
    const { id, versionId } = req.params;
    const { isBookmarked, note } = req.body;
    if (!id || !versionId) return res.status(400).json({ success: false, message: 'template id & version id required' });

    const v = await TemplateHistory.findOne({ _id: versionId, template_id: id });
    if (!v) return res.status(404).json({ success: false, message: 'version not found' });

  if (typeof isBookmarked === 'boolean') v.isBookmarked = isBookmarked;
  // If unbookmarks, clear the note to remove bookmark 
  if (typeof isBookmarked === 'boolean' && isBookmarked === false) {
    v.note = '';
  } else if (typeof note === 'string') {
    v.note = note;
  }

    await v.save();
    return res.json({ success: true, version: v });
  } catch (err) {
    console.error('updateTemplateVersionBookmark error', err);
    return res.status(500).json({ success: false, message: 'Failed to update version bookmark' });
  }
};

/**
 * @desc Restore a template to a given version (creates a new version capturing the restore)
 * @route POST /api/templates/:id/versions/:versionId/restore
 */
export const restoreTemplateVersion = async (req, res) => {
  try {
    const { id, versionId } = req.params;
    const requesterId = req.user?.id ? String(req.user.id) : null;
    if (!id || !versionId) return res.status(400).json({ success: false, message: 'template id & version id required' });

  const version = await TemplateHistory.findOne({ _id: versionId, template_id: id }).lean();
    if (!version) return res.status(404).json({ success: false, message: 'version not found' });

    const template = await Template.findById(id);
    if (!template) return res.status(404).json({ success: false, message: 'template not found' });

    // permission: allow owner or admin
    /** 
    const isOwner = template.created_by && requesterId && String(template.created_by) === requesterId;
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'Admin' || req.user.isAdmin);
    if (!isOwner && !isAdmin) return res.status(403).json({ success: false, message: 'Not authorized to restore this template' });
*/
  // structural snapshot is stored in version.snapshot
  const snap = version.snapshot || {};
    const allowedKeys = ['pages_json','fields','pageSetup','dateFormat'];
    allowedKeys.forEach((k) => { if (snap[k] !== undefined) template[k] = snap[k]; });

    // Add a note about restore
    template.notes = template.notes || [];
  template.notes.push({ added_by: req.user.id, role_snapshot: req.user?.role?.name || '', type: 'change', message: `Restored from version ${version.version_no}`, created_at: new Date() });

    await template.save();

    // create a new version capturing the restore action
    try {
      // create a new version capturing the restore action (scoped by template_id only)
      await createTemplateVersion({ templateId: template._id, snapshot: template.toObject(), userId: req.user?.id, note: `Restored from version ${version.version_no}` });
    } catch (e) {
      console.error('Failed to create template version on restore', e);
    }

    return res.json({ success: true, message: 'Template restored', template: template.toObject() });
  } catch (err) {
    console.error('restoreTemplateVersion error', err);
    return res.status(500).json({ success: false, message: 'Failed to restore template version' });
  }
};

/**
 * @desc Duplicate a template from a specific version snapshot (copies pages_json, fields, pageSetup, dateFormat)
 * @route POST /api/templates/:id/duplicate-version
 * @access Private
 */
export const duplicateTemplateFromVersion = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    if (!id) return res.status(400).json({ success: false, message: 'template id required' });

    // Normalize incoming version identifiers
    const verNumber = (body.version_no !== undefined && body.version_no !== null)
      ? Number(body.version_no)
      : ((body.versionNo !== undefined && body.versionNo !== null) ? Number(body.versionNo) : null);
    const providedVersionId = body.versionId ?? body.version_id ?? null;
    const providedTitle = (typeof body.newName === 'string' && body.newName.trim() !== '') ? body.newName.trim() : (typeof body.title === 'string' && body.title.trim() !== '' ? body.title.trim() : null);

    let version = null;
    if (verNumber !== null && !Number.isNaN(verNumber)) {
      version = await TemplateHistory.findOne({ version_no: verNumber, template_id: id }).lean();
      if (!version) return res.status(404).json({ success: false, message: `version_no ${verNumber} not found for template` });
    } else if (providedVersionId) {
      // try numeric then _id
      const asNum = Number(providedVersionId);
      if (!Number.isNaN(asNum)) {
        version = await TemplateHistory.findOne({ version_no: asNum, template_id: id }).lean();
      }
      if (!version && /^[0-9a-fA-F]{24}$/.test(String(providedVersionId))) {
        version = await TemplateHistory.findOne({ _id: providedVersionId, template_id: id }).lean();
      }
      if (!version) return res.status(404).json({ success: false, message: 'version not found for provided versionId' });
    } else {
      return res.status(400).json({ success: false, message: 'version_no (number) required in body' });
    }

    const snap = version.snapshot || {};
    // allowed snapshot keys we care about
    const pages_json = Array.isArray(snap.pages_json) ? snap.pages_json : [];
    const fields = Array.isArray(snap.fields) ? snap.fields : [];
    const pageSetup = snap.pageSetup || {};
    const dateFormat = snap.dateFormat || {};

    // Fetch original template to preserve other metadata when possible
    let original = null;
    try { original = await Template.findById(id).lean(); } catch (e) { original = null; }

    const baseTitle = providedTitle || (original && original.title) || `Copy of Template`;

    const newTemplateData = {
      title: baseTitle,
      pages_json: pages_json && pages_json.length ? pages_json : (original && Array.isArray(original.pages_json) ? original.pages_json : [ { type: 'doc', content: [ { type: 'paragraph', content: [ { type: 'text', text: '' } ] } ] } ]),
      pageSetup: Object.keys(pageSetup).length ? pageSetup : (original && original.pageSetup ? original.pageSetup : {}),
      dateFormat: Object.keys(dateFormat).length ? dateFormat : (original && original.dateFormat ? original.dateFormat : {}),
      fields: Array.isArray(fields) && fields.length ? fields : (original && Array.isArray(original.fields) ? original.fields : []),
      status: 'draft',
      thumbnailUrl: null
    };

    // created_by is the requester
    if (req.user && req.user.id) newTemplateData.created_by = req.user.id;
    // copy school from requester or original
    newTemplateData.school = req.user?.school || (original && original.school) || req.user?.role?.school || '';

    // do not copy identifying fields
    delete newTemplateData.document_code;
    delete newTemplateData.revision_no;

    const newTemplate = new Template(newTemplateData);
    await newTemplate.save();

    // create initial version for the new template using the snapshot we duplicated from
    try {
      const snapshotForVersion = { pages_json: newTemplate.pages_json, fields: newTemplate.fields, pageSetup: newTemplate.pageSetup, dateFormat: newTemplate.dateFormat };
      await createTemplateVersion({ templateId: newTemplate._id, snapshot: snapshotForVersion, userId: req.user?.id, note: 'Duplicated from version' });
    } catch (e) {
      console.warn('createTemplateVersion for duplicated template failed', e);
    }

    return res.status(201).json({ success: true, message: 'Template duplicated from version successfully', template: newTemplate });
  } catch (error) {
    console.error('Error duplicating template from version:', error);
    return res.status(500).json({ success: false, message: 'Failed to duplicate template from version', error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' });
  }
};