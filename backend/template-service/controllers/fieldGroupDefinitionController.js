import FieldGroupDefinition from '../models/fieldGroupDefinitionModel.js';
import { isDeanOrSecretary, isDocumentController } from '../utils/roleUtils.js';
import { slug } from '../utils/stringUtils.js';

/**
 * Field Group Library controller
 * Provides CRUD and merge-on-upsert for reusable field groups scoped to user/school/global.
 * Search precedence for reads: user → school → global. Writes enforce role permissions.
 *
 * Error handling: Returns 4xx for validation/permission issues; 5xx for unexpected errors.
 */

/**
 * @desc List field groups visible to the current user (merged precedence: global < school < user)
 * @route GET /api/templates/field-groups
 */
export const listFieldGroups = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId || req.user?.uid || null;
    const school = req.user?.school || req.user?.role?.school || req.user?.schoolId || req.user?.school_id || null;
    const limit = Math.min(Number(req.query.limit) || 500, 2000);
    const q = String(req.query.q || '').trim().toLowerCase();

    const [userGroups, schoolGroups, globalGroups] = await Promise.all([
      userId ? FieldGroupDefinition.find({ scope: 'user', created_by: userId }).limit(limit).lean() : Promise.resolve([]),
      school ? FieldGroupDefinition.find({ scope: 'school', school }).limit(limit).lean() : Promise.resolve([]),
      FieldGroupDefinition.find({ scope: 'global' }).limit(limit).lean(),
    ]);

    const map = new Map();
    const add = (arr) => { for (const d of arr) { if (d && d.key && !map.has(d.key)) map.set(d.key, d); } };
    add(globalGroups); add(schoolGroups); add(userGroups);

    let out = Array.from(map.values());
    if (q) out = out.filter(g => (g.key && g.key.includes(q)) || (g.label && g.label.toLowerCase().includes(q)));
    res.json({ groups: out });
  } catch (err) {
    console.error('listFieldGroups error', err);
    res.status(500).json({ message: 'Failed to list field groups', error: err.message });
  }
};

/**
 * @desc Fetch a single field group by key; resolves scope by precedence when not provided (user → school → global)
 * @route GET /api/templates/field-groups/one
 */
export const getFieldGroupByKey = async (req, res) => {
  try {
    const key = String(req.query.key || '').trim().toLowerCase();
    if (!key) return res.status(400).json({ message: 'key required' });
    const scope = String(req.query.scope || '').trim().toLowerCase();
    const userId = req.user?.id || req.user?._id || req.user?.userId || req.user?.uid || null;
    const school = req.user?.school || req.user?.role?.school || req.user?.schoolId || req.user?.school_id || null;

    const findFor = async (sc) => {
      const filter = { key, scope: sc };
      if (sc === 'user') filter.created_by = userId;
      if (sc === 'school') filter.school = school;
      return FieldGroupDefinition.findOne(filter).lean();
    };

    let doc = null;
    if (scope === 'user' || scope === 'school' || scope === 'global') {
      doc = await findFor(scope);
    } else {
      // Precedence: user -> school -> global
      if (!doc && userId) doc = await findFor('user');
      if (!doc && school) doc = await findFor('school');
      if (!doc) doc = await findFor('global');
    }
    if (!doc) return res.status(404).json({ message: 'Group not found' });
    res.json({ group: doc });
  } catch (err) {
    console.error('getFieldGroupByKey error', err);
    res.status(500).json({ message: 'Failed to fetch group', error: err.message });
  }
};

/**
 * @desc Create or update (merge) a field group in the library under the chosen scope
 * @route POST /api/templates/field-groups
 */
export const upsertFieldGroup = async (req, res) => {
  try {
    const body = req.body || {};
    const key = slug(body.key || body.id || body.label || '');
    if (!key) return res.status(400).json({ message: 'key required' });
  const userId = req.user?.id || req.user?._id || req.user?.userId || req.user?.uid || null;
  const school = req.user?.school || req.user?.role?.school || req.user?.schoolId || req.user?.school_id || null;

  let scope = body.scope;
  if (!['user', 'school', 'global'].includes(scope)) scope = 'user';
  // Allow anyone to save; if school scope requested but user has no school, fall back to user
    // Enforce: global only Document Controller; school only Dean/Secretary with a school id
    if (scope === 'global' && !isDocumentController(req.user)) {
      return res.status(403).json({ message: 'Only Document Controller can save global groups' });
    }
    if (scope === 'school' && (!isDeanOrSecretary(req.user) || !school)) {
      return res.status(403).json({ message: 'Only Dean or Secretary with a school can save school groups' });
    }

    const filter = { key, scope };
    if (scope === 'user') filter.created_by = userId;
    if (scope === 'school') filter.school = school;

    const fields = Array.isArray(body.fields) ? body.fields : [];
    const normalizedFields = fields.map((f) => ({
      key: slug(f.key || f.id || f.name),
      label: f.label ?? f.name ?? f.key,
      type: f.type || 'text',
      placeholder: f.placeholder || '',
      instructions: f.instructions || '',
      tags: Array.isArray(f.tags) ? f.tags : [],
      options: f.options ?? null,
      required: !!f.required,
      defaultValue: f.defaultValue ?? null,
    }));

    // Merge with existing group (by key+scope+owner) so saving again appends/updates fields rather than replacing all
    const existing = await FieldGroupDefinition.findOne(filter).lean();
    const mergeFields = (prev = [], incoming = []) => {
      const map = new Map();
      for (const f of prev) map.set(f.key, { ...f });
      for (const f of incoming) map.set(f.key, { ...(map.get(f.key) || {}), ...f });
      const result = [];
      const seen = new Set();
      // keep original order, updating values
      for (const f of prev) {
        const val = map.get(f.key);
        if (val) {
          result.push(val);
          seen.add(f.key);
        }
      }
      // append new fields in provided order
      for (const f of incoming) {
        if (!seen.has(f.key)) result.push(map.get(f.key));
      }
      return result;
    };

    const mergedFields = existing ? mergeFields(existing.fields, normalizedFields) : normalizedFields;

    const updates = {
      key,
      label: body.label || body.name || key,
      fields: mergedFields,
      updated_by: userId,
    };
  if (scope === 'user') updates.created_by = userId;
  if (scope === 'school') updates.school = school;

    const doc = await FieldGroupDefinition.findOneAndUpdate(filter, { $set: updates, $setOnInsert: { usage_count: 0 } }, { new: true, upsert: true });
    res.json({ group: doc });
  } catch (err) {
    console.error('upsertFieldGroup error', err);
    if (err.code === 11000) return res.status(400).json({ message: 'Duplicate group key for this scope' });
    res.status(500).json({ message: 'Failed to save field group', error: err.message });
  }
};

/**
 * @desc Bulk create or update (merge) multiple field groups
 * @route POST /api/templates/field-groups/bulk
 */
export const bulkUpsertFieldGroups = async (req, res) => {
  try {
    const groups = Array.isArray(req.body?.groups) ? req.body.groups : [];
    const results = [];
    for (const g of groups) {
      req.body = g; // reuse handler
      const r = await upsertFieldGroupInner(req, /*returnOnly*/ true);
      results.push(r);
    }
    res.json({ groups: results });
  } catch (err) {
    console.error('bulkUpsertFieldGroups error', err);
    res.status(500).json({ message: 'Failed to save groups', error: err.message });
  }
};

/**
 * Internal helper to run upsert logic for one group.
 * @private
 * @param {import('express').Request} req
 * @param {boolean} [returnOnly=false]
 * @returns {Promise<object>} The updated group as a plain object
 */
const upsertFieldGroupInner = async (req, returnOnly = false) => {
  const body = req.body || {};
  const key = slug(body.key || body.id || body.label || '');
  if (!key) throw new Error('key required');
  const userId = req.user?.id || req.user?._id || req.user?.userId || req.user?.uid || null;
  const school = req.user?.school || req.user?.role?.school || req.user?.schoolId || req.user?.school_id || null;

  let scope = body.scope;
  if (!['user', 'school', 'global'].includes(scope)) scope = 'user';
  if (scope === 'school' && !school) scope = 'user';
    if (scope === 'global' && !isDocumentController(req.user)) {
      throw new Error('Only Document Controller can save global groups');
    }
    if (scope === 'school' && (!isDeanOrSecretary(req.user) || !school)) {
      throw new Error('Only Dean or Secretary with a school can save school groups');
    }

  const filter = { key, scope };
  if (scope === 'user') filter.created_by = userId;
  if (scope === 'school') filter.school = school;

  const fields = Array.isArray(body.fields) ? body.fields : [];
  const normalizedFields = fields.map((f) => ({
    key: slug(f.key || f.id || f.name),
    label: f.label ?? f.name ?? f.key,
    type: f.type || 'text',
    placeholder: f.placeholder || '',
    instructions: f.instructions || '',
    tags: Array.isArray(f.tags) ? f.tags : [],
    options: f.options ?? null,
    required: !!f.required,
    defaultValue: f.defaultValue ?? null,
  }));

  // Merge with existing if present
  const existing = await FieldGroupDefinition.findOne(filter).lean();
  const mergeFields = (prev = [], incoming = []) => {
    const map = new Map();
    for (const f of prev) map.set(f.key, { ...f });
    for (const f of incoming) map.set(f.key, { ...(map.get(f.key) || {}), ...f });
    const result = [];
    const seen = new Set();
    for (const f of prev) {
      const val = map.get(f.key);
      if (val) { result.push(val); seen.add(f.key); }
    }
    for (const f of incoming) {
      if (!seen.has(f.key)) result.push(map.get(f.key));
    }
    return result;
  };
  const mergedFields = existing ? mergeFields(existing.fields, normalizedFields) : normalizedFields;

  const updates = {
    key,
    label: body.label || body.name || key,
    fields: mergedFields,
    updated_by: userId,
  };
  if (scope === 'user') updates.created_by = userId;
  if (scope === 'school') updates.school = school;

  const doc = await FieldGroupDefinition.findOneAndUpdate(filter, { $set: updates, $setOnInsert: { usage_count: 0 } }, { new: true, upsert: true });
  return doc.toObject();
};

/**
 * @desc Delete a field group by id (owner/role-based permissions)
 * @route DELETE /api/templates/field-groups/:id
 */
export const deleteFieldGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await FieldGroupDefinition.findById(id);
    if (!doc) return res.status(404).json({ message: 'Group not found' });
    const userId = req.user?.id || req.user?._id || req.user?.userId || req.user?.uid || null;
    const school = req.user?.school || req.user?.role?.school || req.user?.schoolId || req.user?.school_id || null;
    if (doc.scope === 'user' && String(doc.created_by) !== String(userId)) return res.status(403).json({ message: 'Not permitted' });
    if (doc.scope === 'school' && String(doc.school) !== String(school)) return res.status(403).json({ message: 'Not permitted' });
    await FieldGroupDefinition.deleteOne({ _id: id });
    res.json({ success: true });
  } catch (err) {
    console.error('deleteFieldGroup error', err);
    res.status(500).json({ message: 'Failed to delete group', error: err.message });
  }
};

/**
 * @desc Rename a field group's label by id (permission-checked)
 * @route PATCH /api/templates/field-groups/:id
 */
export const renameFieldGroup = async (req, res) => {
  try {
    const { id } = req.params;
    let { label } = req.body || {};
    if (!label || !String(label).trim()) return res.status(400).json({ message: 'label required' });
    label = String(label).trim();

    const doc = await FieldGroupDefinition.findById(id);
    if (!doc) return res.status(404).json({ message: 'Group not found' });

    const userId = req.user?.id || req.user?._id || req.user?.userId || req.user?.uid || null;
    const school = req.user?.school || req.user?.role?.school || req.user?.schoolId || req.user?.school_id || null;

    // Permission: must own user/school groups; global requires document controller
    if (doc.scope === 'user' && String(doc.created_by) !== String(userId)) {
      return res.status(403).json({ message: 'Not permitted' });
    }
    if (doc.scope === 'school' && String(doc.school) !== String(school)) {
      return res.status(403).json({ message: 'Not permitted' });
    }
    if (doc.scope === 'global' && !isDocumentController(req.user)) {
      return res.status(403).json({ message: 'Only Document Controller can modify global groups' });
    }

    doc.label = label;
    doc.updated_by = userId;
    await doc.save();
    res.json({ group: doc });
  } catch (err) {
    console.error('renameFieldGroup error', err);
    res.status(500).json({ message: 'Failed to rename group', error: err.message });
  }
};
