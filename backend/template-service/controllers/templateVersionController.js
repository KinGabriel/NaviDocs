import TemplateHistory from '../models/templateVersionModel.js';
import Template from '../models/templateModel.js';

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
  // determine next version_no for this template (scoped by template_id only)
  const latest = await TemplateHistory.findOne({ template_id: templateId }).sort({ version_no: -1 }).lean();
  const next = latest ? (latest.version_no || 0) + 1 : 1;
  const v = new TemplateHistory({ template_id: templateId, snapshot: snapToStore, version_no: next, created_by: userId, note });
  await v.save();
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
    return res.json({ success: true, versions });
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
    return res.json({ success: true, version: v });
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
    const isOwner = template.created_by && requesterId && String(template.created_by) === requesterId;
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'Admin' || req.user.isAdmin);
    if (!isOwner && !isAdmin) return res.status(403).json({ success: false, message: 'Not authorized to restore this template' });

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
