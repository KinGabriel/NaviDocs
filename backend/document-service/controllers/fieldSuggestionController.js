import FieldSuggestion from '../models/fieldSuggestionModel.js';
import deepEqual from '../utils/compareKeys.js';

/**
 * @desc Save a field suggestion (user input) to be reused later.
 * @route POST /api/documents/field-suggestions
 */
export const saveFieldSuggestion = async (req, res) => {
  try {
    const { key, value, scope } = req.body;
    if (!key || typeof key !== 'string') return res.status(400).json({ message: 'key required' });
    if (value === undefined || value === null) return res.status(400).json({ message: 'value required' });

    // scope handling: only 'user' or 'school' allowed when provided
    const allowedScopes = ['user', 'school'];
    const normalizedScope = allowedScopes.includes(scope) ? scope : 'user';

    // server-side permission guard: only document controllers may save school-scoped suggestions
    if (normalizedScope === 'school' && !isDocumentController(req.user)) {
      return res.status(403).json({ message: 'Insufficient permission to save school suggestion' });
    }

    const userId = req.user?.id || null;
    const school = req.user?.school || req.user?.role?.school || null;

    const docData = { key, value, count: 1, last_used: new Date() };
    if (normalizedScope === 'user') docData.user = userId;
    if (normalizedScope === 'school') docData.school = school;
    docData.scope = normalizedScope;

    // Find existing suggestions for this key and owner (user or school)
    const ownerQuery = {};
    if (docData.scope === 'user') ownerQuery.user = userId;
    if (docData.scope === 'school') ownerQuery.school = school;
    ownerQuery.key = key;

    const existing = await FieldSuggestion.find(ownerQuery).lean();

    // If an existing suggestion has the same value (raw deep equality), update it instead of creating a new one.
    for (const ex of existing || []) {
      try {
        if (deepEqual(ex.value, value)) {
          // Update the existing document's usage counters and last_used
          const updated = await FieldSuggestion.findByIdAndUpdate(ex._id || ex.id, { $inc: { count: 1 }, $set: { last_used: new Date(), value } }, { new: true });
          return res.json({ success: true, suggestion: updated });
        }
      } catch (e) {
        // ignore deepEqual failures and continue
      }
    }

    // No exact match found: delete previous owner-scoped suggestions for this key (we'll replace with the new one)
    if (existing && existing.length > 0) {
      const ids = existing.map((e) => e._id || e.id).filter(Boolean);
      if (ids.length) await FieldSuggestion.deleteMany({ _id: { $in: ids } });
    }

    const doc = new FieldSuggestion(docData);
    await doc.save();
    res.json({ success: true, suggestion: doc });
  } catch (err) {
    console.error('saveFieldSuggestion error', err);
    if (err.code === 11000) return res.status(400).json({ message: 'Duplicate suggestion' });
    res.status(500).json({ message: 'Failed to save suggestion', error: err.message });
  }
};

/**
 * @desc Get suggestions for a field key.
 * @route GET /api/documents/field-suggestions?key=name&scope=user
 */
export const getFieldSuggestions = async (req, res) => {
  try {
    const { key, scope, limit = 10 } = req.query;
    if (!key) return res.status(400).json({ message: 'key required' });

    const numericLimit = Math.min(Number(limit) || 10, 100);
    const fetchCap = Math.min(Math.max(numericLimit * 3, numericLimit), 1000);
    const userId = req.user?.id || null;
    const school = req.user?.school || req.user?.role?.school || null;

    const allowedScopes = ['user', 'school'];
    const queryScope = scope && allowedScopes.includes(scope) ? scope : null;

    if (queryScope === 'user') {
      const userSuggestions = await FieldSuggestion.find({ key, user: userId })
        .sort({ last_used: -1, count: -1 })
        .limit(fetchCap)
        .lean();

      const unique = [];
      for (const s of userSuggestions) {
        let already = false;
        for (const inc of unique) {
          if (deepEqual(inc.value, s.value)) { already = true; break; }
        }
        if (!already) {
          unique.push(s);
          if (unique.length >= numericLimit) break;
        }
      }

      return res.json({ suggestions: unique });
    }

    if (queryScope === 'school') {
      if (!school) return res.status(400).json({ message: 'User has no school' });
      const schoolSuggestions = await FieldSuggestion.find({ key, school })
        .sort({ last_used: -1, count: -1 })
        .limit(fetchCap)
        .lean();

      const unique = [];
      for (const s of schoolSuggestions) {
        let already = false;
        for (const inc of unique) {
          if (deepEqual(inc.value, s.value)) { already = true; break; }
        }
        if (!already) {
          unique.push(s);
          if (unique.length >= numericLimit) break;
        }
      }

      return res.json({ suggestions: unique });
    }

    const [userSuggestions, schoolSuggestions] = await Promise.all([
      FieldSuggestion.find({ key, user: userId }).sort({ last_used: -1, count: -1 }).limit(fetchCap).lean(),
      FieldSuggestion.find({ key, school }).sort({ last_used: -1, count: -1 }).limit(fetchCap).lean()
    ]);

    const combined = [];
    const pushUnique = (arr) => {
      for (const s of arr) {
        let already = false;
        for (const inc of combined) {
          if (deepEqual(inc.value, s.value)) { already = true; break; }
        }
        if (!already) {
          combined.push(s);
          if (combined.length >= numericLimit) return;
        }
      }
    };

    pushUnique(userSuggestions);
    if (combined.length < numericLimit) pushUnique(schoolSuggestions);

    res.json({ suggestions: combined });
  } catch (err) {
    console.error('getFieldSuggestions error', err);
    res.status(500).json({ message: 'Failed to get suggestions', error: err.message });
  }
};

const isDocumentController = (user) => {
  if (!user) return false;
  if (user === 'Document Controller') return true;
  if (typeof user === 'object') {
    if (user.role && (user.role === 'Document Controller' || user.role?.name === 'Document Controller')) return true;
    if (Array.isArray(user.roles) && user.roles.some(r => r && r.name === 'Document Controller')) return true;
  }
  return false;
};

/**
 * @desc Update a saved field suggestion
 * @route PATCH /api/documents/field-suggestions/:id
 */
export const updateFieldSuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'id required' });
    const updates = req.body || {};
    const doc = await FieldSuggestion.findById(id);
    if (!doc) return res.status(404).json({ message: 'suggestion not found' });

    const ownerId = doc.user ? String(doc.user) : null;
    const requesterId = req.user?.id ? String(req.user.id) : null;

    // allow owner to update; allow document controllers to update school suggestions for their school
    if (ownerId !== requesterId) {
      if (!(doc.scope === 'school' && isDocumentController(req.user) && String(doc.school) === String(req.user?.school))) {
        return res.status(403).json({ message: 'Insufficient permission to update suggestion' });
      }
    }

    // Only allow changing value and count
    if (updates.value !== undefined) doc.value = updates.value;
    if (updates.count !== undefined) doc.count = updates.count;
    doc.last_used = new Date();
    await doc.save();
    res.json({ suggestion: doc });
  } catch (err) {
    console.error('updateFieldSuggestion error', err);
    res.status(500).json({ message: 'Failed to update suggestion', error: err.message });
  }
};

/**
 * @desc Delete a saved field suggestion
 * @route DELETE /api/documents/field-suggestions/:id
 */
export const deleteFieldSuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'id required' });
    const doc = await FieldSuggestion.findById(id);
    if (!doc) return res.status(404).json({ message: 'suggestion not found' });

    const ownerId = doc.user ? String(doc.user) : null;
    const requesterId = req.user?.id ? String(req.user.id) : null;
    if (ownerId !== requesterId) {
      if (!(doc.scope === 'school' && isDocumentController(req.user) && String(doc.school) === String(req.user?.school))) {
        return res.status(403).json({ message: 'Insufficient permission to delete suggestion' });
      }
    }

  await FieldSuggestion.deleteOne({ _id: id });
  res.json({ success: true });
  } catch (err) {
    console.error('deleteFieldSuggestion error', err);
    res.status(500).json({ message: 'Failed to delete suggestion', error: err.message });
  }
};

/**
 * @desc List all known field keys for the current user (user-scope + school-scope if controller)
 * @route GET /api/documents/field-suggestions/fields
 */
export const listAllFieldsForUser = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const school = req.user?.school || req.user?.role?.school || null;
    const includeSchool = isDocumentController(req.user) && !!school;

    const queries = [FieldSuggestion.find({ user: userId }).distinct('key')];
    if (includeSchool) queries.push(FieldSuggestion.find({ school }).distinct('key'));

    const results = await Promise.all(queries);
    const keys = new Set();
    results.forEach((arr) => Array.isArray(arr) && arr.forEach((k) => keys.add(k)));

    // Return as array of { name, label }
    const out = Array.from(keys).map((k) => ({ name: k, label: k }));
    res.json({ fields: out });
  } catch (err) {
    console.error('listAllFieldsForUser error', err);
    res.status(500).json({ message: 'Failed to list fields', error: err.message });
  }
};