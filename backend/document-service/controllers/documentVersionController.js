import VersionData from '../models/documentVersionModel.js';
// Minimum interval (ms) before treating an identical field_values update as a no-op and only bumping timestamps
const MIN_TEMPLATE_VERSION_INTERVAL_MS = process.env.MIN_TEMPLATE_VERSION_INTERVAL_MS
  ? parseInt(process.env.MIN_TEMPLATE_VERSION_INTERVAL_MS, 10)
  : 5 * 60 * 1000; // default 5 minutes

// Helper: compare field_values with a lightweight similarity heuristic
const fieldValuesEqualHelper = (a, b) => {
  try {
    if (!a && !b) return true;
    const norm = (x) => {
      if (!x || typeof x !== 'object') return {};
      return x;
    };
    const sa = JSON.stringify(norm(a));
    const sb = JSON.stringify(norm(b));
    if (sa === sb) return true;
    const maxLen = Math.max(sa.length, sb.length) || 1;
    const lenDiffRatio = Math.abs(sa.length - sb.length) / maxLen;
    if (lenDiffRatio <= 0.05) {
      if (sa.slice(0, 40) === sb.slice(0, 40)) return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};

const toIso = (val) => {
  if (!val) return null;
  try { const d = new Date(val); return isNaN(d.getTime()) ? null : d.toISOString(); } catch (e) { return null; }
};

const normalizeVersionData = (raw) => {
  if (!raw) return raw;
  const out = { ...raw };
  try {
    out.id = out._id ? String(out._id) : out.id || null;
    out.version_id = out.version_id ? String(out.version_id) : (out.version_no !== undefined ? String(out.version_no) : null);
    out.document_id = out.document_id ? String(out.document_id) : null;
    out.created_at = toIso(out.created_at || out.createdAt || null);
    out.updated_at = toIso(out.updated_at || out.updatedAt || null);
    out.last_activity_at = toIso(out.last_activity_at || null);
  } catch (e) {
    console.error('normalizeVersionData error', e);
  }
  return out;
};

/**
 * @desc Create or upsert version data for a template version (per-document filled values)
 * @route POST /api/documents/version-data
 */
export const createVersionData = async (req, res) => {
  try {
    const { version_id, field_values, notes, isBookmarked, last_activity_at, document_id } = req.body;
    if (!version_id) return res.status(400).json({ success: false, message: 'version_id required' });

    const exists = await VersionData.findOne({ version_id });
    if (exists) {
      const nowMs = Date.now();
      const lastMs = exists.last_activity_at ? new Date(exists.last_activity_at).getTime() : (exists.created_at ? new Date(exists.created_at).getTime() : 0);
      const similar = fieldValuesEqualHelper(exists.field_values, field_values || {});
      const diffMs = nowMs - lastMs;
      if (similar && diffMs < MIN_TEMPLATE_VERSION_INTERVAL_MS) {
        const now = new Date();
        exists.last_activity_at = now;
        exists.updated_at = now;
        await exists.save();
        return res.json({ success: true, versionData: normalizeVersionData(exists.toObject()) });
      }

      if (field_values && typeof field_values === 'object') exists.field_values = field_values;
      if (Array.isArray(notes)) exists.notes = notes;
      if (typeof isBookmarked === 'boolean') exists.isBookmarked = isBookmarked;
      if (last_activity_at) exists.last_activity_at = last_activity_at;
      if (document_id) exists.document_id = document_id;
      await exists.save();
      return res.json({ success: true, versionData: normalizeVersionData(exists.toObject()) });
    }

    const doc = new VersionData({ version_id, field_values: field_values || {}, notes: notes || [], isBookmarked: !!isBookmarked, last_activity_at: last_activity_at || null, document_id: document_id || null });
    await doc.save();
    return res.status(201).json({ success: true, versionData: normalizeVersionData(doc.toObject()) });
  } catch (err) {
    console.error('createVersionData error', err);
    return res.status(500).json({ success: false, message: 'Failed to create version data' });
  }
};

const isObjectIdString = (s) => typeof s === 'string' && /^[a-fA-F0-9]{24}$/.test(s);

/**
 * @desc Get version data by version id (supports version_id, _id, or version_no)
 * @route GET /api/documents/version-data/:versionId
 */
export const getVersionData = async (req, res) => {
  try {
    const { versionId } = req.params;
    if (!versionId) return res.status(400).json({ success: false, message: 'versionId required' });
    const or = [{ version_id: versionId }];
    if (isObjectIdString(versionId)) or.push({ _id: versionId });
    const verNo = Number(versionId);
    if (!Number.isNaN(verNo)) or.push({ version_no: verNo });
    const query = { $or: or };
    const v = await VersionData.findOne(query).lean();
    if (!v) return res.status(404).json({ success: false, message: 'version data not found' });
    return res.json({ success: true, versionData: normalizeVersionData(v) });
  } catch (err) {
    console.error('getVersionData error', err);
    return res.status(500).json({ success: false, message: 'Failed to get version data' });
  }
};

/**
 * @desc Patch field_values for a version (updates last_activity_at and may bump timestamps when near-duplicate)
 * @route PATCH /api/documents/version-data/:versionId/field-values
 */
export const updateVersionFieldValues = async (req, res) => {
  try {
    const { versionId } = req.params;
    const { field_values } = req.body;
    if (!versionId) return res.status(400).json({ success: false, message: 'versionId required' });
    if (!field_values || typeof field_values !== 'object') return res.status(400).json({ success: false, message: 'field_values object required' });
  const or = [{ version_id: versionId }];
  if (isObjectIdString(versionId)) or.push({ _id: versionId });
  const verNo = Number(versionId);
  if (!Number.isNaN(verNo)) or.push({ version_no: verNo });
  const query = { $or: or };
    const vdoc = await VersionData.findOne(query);
    if (!vdoc) return res.status(404).json({ success: false, message: 'version data not found' });

    const nowMs = Date.now();
    const lastMs = vdoc.last_activity_at ? new Date(vdoc.last_activity_at).getTime() : (vdoc.created_at ? new Date(vdoc.created_at).getTime() : 0);
    const similar = fieldValuesEqualHelper(vdoc.field_values, field_values || {});
    const diffMs = nowMs - lastMs;
    if (similar && diffMs < MIN_TEMPLATE_VERSION_INTERVAL_MS) {
      const now = new Date();
      vdoc.last_activity_at = now;
      vdoc.updated_at = now;
      await vdoc.save();
      return res.json({ success: true, versionData: normalizeVersionData(vdoc.toObject()) });
    }

    vdoc.field_values = field_values;
    vdoc.last_activity_at = new Date();
    await vdoc.save();
    return res.json({ success: true, versionData: normalizeVersionData(vdoc.toObject()) });
  } catch (err) {
    console.error('patchVersionFieldValues error', err);
    return res.status(500).json({ success: false, message: 'Failed to update field values' });
  }
};

/**
 * @desc Patch bookmark/note for a version (adds notes, toggles isBookmarked)
 * @route PATCH /api/documents/version-data/:versionId/bookmark
 */
export const patchVersionBookmark = async (req, res) => {
  try {
    const { versionId } = req.params;
    const { isBookmarked, note } = req.body;
    if (!versionId) return res.status(400).json({ success: false, message: 'versionId required' });
  const or = [{ version_id: versionId }];
  if (isObjectIdString(versionId)) or.push({ _id: versionId });
  const verNo = Number(versionId);
  if (!Number.isNaN(verNo)) or.push({ version_no: verNo });
  const query = { $or: or };
  const v = await VersionData.findOne(query);
    if (!v) return res.status(404).json({ success: false, message: 'version data not found' });
    if (typeof isBookmarked === 'boolean') v.isBookmarked = isBookmarked;
    if (typeof note === 'string') v.notes = v.notes.concat([{ added_by: req.user?.id || null, message: note, created_at: new Date() }]);
    await v.save();
    return res.json({ success: true, versionData: normalizeVersionData(v.toObject()) });
  } catch (err) {
    console.error('patchVersionBookmark error', err);
    return res.status(500).json({ success: false, message: 'Failed to update bookmark' });
  }
};

/**
 * @desc List version data entries for a document (optionally grouped). Supports query params: group=true, group_interval_ms
 * @route GET /api/documents/version-data/document/:documentId
 */
export const listVersionDataByDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    if (!documentId) return res.status(400).json({ success: false, message: 'documentId required' });
    const items = await VersionData.find({ document_id: documentId }).sort({ version_no: -1 }).lean();

    const doGroup = String(req.query.group || '').toLowerCase() === 'true' || !!req.query.group_interval_ms;
    const normalizedAll = items.map(v => normalizeVersionData(v));
    if (!doGroup) return res.json({ success: true, items: normalizedAll });

    const DEFAULT_GROUP_INTERVAL_MS = process.env.MIN_TEMPLATE_VERSION_INTERVAL_MS ? parseInt(process.env.MIN_TEMPLATE_VERSION_INTERVAL_MS, 10) : (5 * 60 * 1000);
    const groupIntervalMs = req.query.group_interval_ms ? parseInt(req.query.group_interval_ms, 10) : DEFAULT_GROUP_INTERVAL_MS;

    const normFieldValues = (fv) => { if (!fv || typeof fv !== 'object') return {}; try { return JSON.stringify(fv); } catch (e) { return String(fv); } };
    const fieldValuesEqualLocal = (a, b) => { try { return normFieldValues(a) === normFieldValues(b); } catch (e) { return false; } };
    const getMs = (v) => { const raw = v?.created_at || v?.createdAt || v?.timestamp || v?.created_at?.$date || null; if (!raw) return 0; try { return new Date(raw).getTime(); } catch (e) { return 0; } };

    const grouped = [];
    for (const v of items) {
      if (grouped.length === 0) { grouped.push({ representative: v, count: 1, versions: [v] }); continue; }
      const lastGroup = grouped[grouped.length - 1];
      const lastRep = lastGroup.representative;
      const diff = Math.abs(getMs(lastRep) - getMs(v));
      if (fieldValuesEqualLocal(lastRep.field_values, v.field_values) && diff <= groupIntervalMs) {
        lastGroup.count += 1; lastGroup.versions.push(v);
      } else { grouped.push({ representative: v, count: 1, versions: [v] }); }
    }

    for (const g of grouped) { g.representative = normalizeVersionData(g.representative); g.versions = g.versions.map(v => normalizeVersionData(v)); }
    const groupedVersions = grouped.map(g => ({ representative: g.representative, count: g.count, versions: g.versions }));

    return res.json({ success: true, items: normalizedAll, groupedVersions });
  } catch (err) {
    console.error('listVersionDataByDocument error', err);
    return res.status(500).json({ success: false, message: 'Failed to list version data' });
  }
};
