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