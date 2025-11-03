import FieldSuggestion from '../models/fieldSuggestionModel.js';
import deepEqual from '../utils/compareKeys.js';
import { isDeanOrSecretary } from '../../template-service/utils/roleUtils.js';

/**
 * @desc Save a field suggestion (user input) to be reused later.
 * @route POST /api/documents/field-suggestions
 */
export const saveFieldSuggestion = async (req, res) => {
  try {
    const { key, value, scope, label, tags } = req.body;
    if (!key || typeof key !== 'string') return res.status(400).json({ message: 'key required' });
    if (value === undefined || value === null) return res.status(400).json({ message: 'value required' });

    // scope handling: only 'user' or 'school' allowed when provided
    const allowedScopes = ['user', 'school'];
    const normalizedScope = allowedScopes.includes(scope) ? scope : 'user';

    // server-side permission guard: only Dean or Secretary may save school-scoped suggestions
    if (normalizedScope === 'school' && !isDeanOrSecretary(req.user)) {
      return res.status(403).json({ message: 'Insufficient permission to save school-scoped suggestion' });
    }

    const userId = req.user?.id || null;
    const school = req.user?.school || req.user?.role?.school || null;

    // normalize metadata
    const normalizedLabel = typeof label === 'string' && label.trim() !== '' ? label.trim() : null;
    const normalizedTags = Array.isArray(tags)
      ? Array.from(new Set(tags.map((t) => (t == null ? '' : String(t)).trim()).filter(Boolean))).sort()
      : [];

    const docData = { key, value, label: normalizedLabel, tags: normalizedTags, count: 1, last_used: new Date() };
    if (normalizedScope === 'user') docData.user = userId;
    if (normalizedScope === 'school') docData.school = school;
    docData.scope = normalizedScope;

  // Find existing suggestions for this owner. Prefer label-based grouping; fallback to key when label isn't provided.
  const ownerQuery = {};
  if (docData.scope === 'user') ownerQuery.user = userId;
  if (docData.scope === 'school') ownerQuery.school = school;
  if (normalizedLabel) ownerQuery.label = normalizedLabel; else ownerQuery.key = key;

    const existing = await FieldSuggestion.find(ownerQuery).lean();

    // If an existing suggestion has the same value AND same metadata (label/tags), update it instead of creating a new one.
    for (const ex of existing || []) {
      try {
        const sameLabel = (ex.label || null) === normalizedLabel;
        const exTags = Array.isArray(ex.tags) ? [...ex.tags].sort() : [];
        const sameTags = exTags.length === normalizedTags.length && exTags.every((v, i) => v === normalizedTags[i]);
        if (deepEqual(ex.value, value) && sameLabel && sameTags) {
          // Update the existing document's usage counters and last_used
          const updated = await FieldSuggestion.findByIdAndUpdate(ex._id || ex.id, { $inc: { count: 1 }, $set: { last_used: new Date(), value } }, { new: true });
          return res.json({ success: true, suggestion: updated });
        }
      } catch (e) {
        // ignore deepEqual failures and continue
      }
    }

    // No exact match found: create a new suggestion entry preserving previous ones (allows same key/label with different tags/values)
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

    const numericLimit = Math.min(Number(limit) || 10, 100);
    const fetchCap = Math.min(Math.max(numericLimit * 3, numericLimit), 1000);
    const userId = req.user?.id || null;
    const school = req.user?.school || req.user?.role?.school || null;

    const allowedScopes = ['user', 'school'];
    const queryScope = scope && allowedScopes.includes(scope) ? scope : null;

  // parse optional metadata filters (LABEL FIRST)
  const qLabel = typeof req.query.label === 'string' && req.query.label.trim() !== '' ? req.query.label.trim() : null;
    let qTags = [];
    if (Array.isArray(req.query.tags)) {
      qTags = req.query.tags;
    } else if (typeof req.query.tags === 'string' && req.query.tags.trim() !== '') {
      qTags = req.query.tags.split(',');
    }
    qTags = Array.from(new Set(qTags.map((t) => (t == null ? '' : String(t)).trim()).filter(Boolean))).sort();
    const hasTags = qTags.length > 0;
    const matchModeRaw = typeof req.query.matchMode === 'string' ? req.query.matchMode : undefined;
    const matchMode = matchModeRaw === 'label' || matchModeRaw === 'label-tags' || matchModeRaw === 'any'
      ? matchModeRaw
      : (hasTags ? 'label-tags' : (qLabel ? 'label' : 'any'));

    // If caller explicitly requested label+tags but provided no tags, do not return label-only fallbacks.
    if (matchMode === 'label-tags' && !hasTags) {
      return res.json({ suggestions: [] });
    }

    // Build base filter: prefer label; fallback to key. At least one must be present.
    const baseFilter = {};
    if (qLabel) baseFilter.label = qLabel; else if (key) baseFilter.key = key; else return res.status(400).json({ message: 'label or key required' });

    const rankSuggestion = (s) => {
      // higher score first
      const sameLabel = qLabel ? ((s.label || null) === qLabel) : false;
      const sTags = Array.isArray(s.tags) ? [...s.tags].map((t) => (t == null ? '' : String(t)).trim()).filter(Boolean).sort() : [];
      const sameTags = hasTags && sTags.length === qTags.length && sTags.every((v, i) => v === qTags[i]);
      if (matchMode === 'label-tags' && hasTags) {
        if (sameLabel && sameTags) return 3;
        if (sameLabel) return 2;
        return 1;
      }
      if (matchMode === 'label') {
        if (sameLabel) return 2;
        return 1;
      }
      // 'any'
      if (sameLabel && sameTags) return 3;
      if (sameLabel) return 2;
      return 1;
    };

    const sortWithRank = (arr) => arr
      .map((s) => ({ s, r: rankSuggestion(s) }))
      .sort((a, b) => {
        if (b.r !== a.r) return b.r - a.r;
        // Then by last_used desc, then by count desc
        const luA = a.s.last_used ? new Date(a.s.last_used).getTime() : 0;
        const luB = b.s.last_used ? new Date(b.s.last_used).getTime() : 0;
        if (luB !== luA) return luB - luA;
        const cA = typeof a.s.count === 'number' ? a.s.count : 0;
        const cB = typeof b.s.count === 'number' ? b.s.count : 0;
        return cB - cA;
      })
      .map((x) => x.s);

    if (queryScope === 'user') {
      const userSuggestions = await FieldSuggestion.find({ ...baseFilter, user: userId })
        .sort({ last_used: -1, count: -1 })
        .limit(fetchCap)
        .lean();

      const ranked = sortWithRank(userSuggestions);
      const unique = [];
      for (const s of ranked) {
        if (qLabel && matchMode !== 'any' && !rankSuggestion(s)) continue;
        let already = false;
        for (const inc of unique) { if (deepEqual(inc.value, s.value)) { already = true; break; } }
        if (!already) { unique.push(s); if (unique.length >= numericLimit) break; }
      }
      return res.json({ suggestions: unique });
    }

    if (queryScope === 'school') {
      if (!school) return res.status(400).json({ message: 'User has no school' });
      const schoolSuggestions = await FieldSuggestion.find({ ...baseFilter, school })
        .sort({ last_used: -1, count: -1 })
        .limit(fetchCap)
        .lean();

      const ranked = sortWithRank(schoolSuggestions);
      const unique = [];
      for (const s of ranked) {
        if (qLabel && matchMode !== 'any' && !rankSuggestion(s)) continue;
        let already = false;
        for (const inc of unique) { if (deepEqual(inc.value, s.value)) { already = true; break; } }
        if (!already) { unique.push(s); if (unique.length >= numericLimit) break; }
      }
      return res.json({ suggestions: unique });
    }

    const [userSuggestions, schoolSuggestions] = await Promise.all([
      FieldSuggestion.find({ ...baseFilter, user: userId }).sort({ last_used: -1, count: -1 }).limit(fetchCap).lean(),
      FieldSuggestion.find({ ...baseFilter, school }).sort({ last_used: -1, count: -1 }).limit(fetchCap).lean()
    ]);

    // rank within each scope first
    const rankedUser = sortWithRank(userSuggestions);
    const rankedSchool = sortWithRank(schoolSuggestions);
    const combined = [];
    const pushUnique = (arr) => {
      for (const s of arr) {
        if (qLabel && matchMode !== 'any' && !rankSuggestion(s)) continue;
        let already = false;
        for (const inc of combined) { if (deepEqual(inc.value, s.value)) { already = true; break; } }
        if (!already) { combined.push(s); if (combined.length >= numericLimit) return; }
      }
    };

    pushUnique(rankedUser);
    if (combined.length < numericLimit) pushUnique(rankedSchool);

    res.json({ suggestions: combined });
  } catch (err) {
    console.error('getFieldSuggestions error', err);
    res.status(500).json({ message: 'Failed to get suggestions', error: err.message });
  }
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

    // allow owner to update; allow Dean/Secretary to update school suggestions for their school
    if (ownerId !== requesterId) {
      if (!(doc.scope === 'school' && isDeanOrSecretary(req.user) && String(doc.school) === String(req.user?.school))) {
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
      if (!(doc.scope === 'school' && isDeanOrSecretary(req.user) && String(doc.school) === String(req.user?.school))) {
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
 * @desc List all known field keys for the current user (user-scope + school-scope if Dean/Secretary)
 * @route GET /api/documents/field-suggestions/fields
 */
export const listAllFieldsForUser = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const school = req.user?.school || req.user?.role?.school || null;
  const includeSchool = isDeanOrSecretary(req.user) && !!school;

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