import Document from '../models/documentModel.js';
import axios from 'axios';
import FieldSuggestion from '../models/fieldSuggestionModel.js';

// simple deep equality helper for primitives/objects/arrays (no normalization)
const deepEqual = (a, b) => {
  if (a === b) return true;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const k of aKeys) {
      if (!deepEqual(a[k], b[k])) return false;
    }
    return true;
  }
  return false;
};

/**
 * @desc Create a new document based on a template's essential content.
 * @route POST /api/documents/create-documen
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
export const createDocument = async (req, res) => {
  try {
    const payload = { ...req.body };

    // Default title
    if (!payload.title || payload.title.trim() === '') payload.title = 'Untitled Document';

    // Default created_by from authenticated user if available
    if (!payload.created_by) payload.created_by = req.user?.id ;

    // If a template_id is provided, fetch template data and use it as basis
    if (payload.template_id) {
      try {
        const templateServiceUrl = process.env.TEMPLATE_SERVICE_URL || 'http://localhost:8002';
        // Get a token passed in payload.context or req.context
        const context = req.context || payload.context || {};
        const headers = {};
        if (context.token) {
          headers['Cookie'] = `token=${context.token}`;
        } else if (req.cookies && req.cookies.token) {
          headers['Cookie'] = `token=${req.cookies.token}`;
        } else {
          console.warn('No token found in context.user!');
        }
        const resp = await axios.get(`${templateServiceUrl}/api/templates/${payload.template_id}`, { headers, withCredentials: true });
        if (resp.data && resp.data.template) {
          const template = resp.data.template;
          // Snapshot the template into the document using the current FromTemplateSchema
          payload.from_template = {
            id: template._id,
            title: template.title,
            document_code: template.document_code || null,
            revision_no: template.revision_no !== undefined && template.revision_no !== null ? String(template.revision_no) : null,
            effectivity: template.effectivity || null,
            fields: Array.isArray(template.fields) ? template.fields : [],
            pages_json: Array.isArray(template.pages_json) ? template.pages_json : [],
            pageSetup: template.pageSetup || {},
            status_meta: template.status_meta || {},
            dateFormat: template.dateFormat || {},
            assigned: Array.isArray(template.assigned) ? template.assigned : [],
            snapshot_at: new Date()
          };

          // Only set values that are not explicitly provided in the payload 
          payload.title = payload.title || template.title || payload.title;
          payload.pages_json = Array.isArray(payload.pages_json) && payload.pages_json.length ? payload.pages_json : template.pages_json || payload.pages_json;
          // Copy document_code and revision_no if template has document_code
          if (template.document_code) payload.document_code = payload.document_code || template.document_code;
          if (template.revision_no !== undefined && template.revision_no !== null) payload.revision_no = payload.revision_no || String(template.revision_no);
          if (template.effectivity) payload.effectivity = payload.effectivity || template.effectivity;
          // Merge metadata fields if template.fields exist
          if (Array.isArray(template.fields) && template.fields.length) {
            payload.metadata = payload.metadata || {};
            payload.metadata.template_fields = payload.metadata.template_fields || template.fields;
          }
        }
      } catch (err) {
        console.error('Failed to fetch template for document creation', err?.message || err);
      }
    }

    // Ensure pages_json is an array with a minimal doc if absent
    if (!Array.isArray(payload.pages_json)) {
      payload.pages_json = [
        {
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: '' }] }
          ]
        }
      ];
    }

    const doc = new Document({
      ...payload,
    });

    // set school from req.user if present
    doc.school = req.user?.school || req.user?.role?.school || '';

    await doc.save();
    return res.status(201).json({ success: true, message: 'Document created successfully', document: doc });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Document with this document code and revision already exists' });
    }
    console.error('createDocument error', err);
    return res.status(500).json({ success: false, message: 'Failed to create document', error: err.message });
  }
};
/**
 * Get a document by its ID
 * @route GET /api/documents/:id
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
export const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'id required' });
    const doc = await Document.findById(id).lean();
    if (!doc) return res.status(404).json({ message: 'document not found' });
    return res.json({ document: doc });
  } catch (err) {
    console.error('getDocumentById error', err);
    return res.status(500).json({ message: 'Failed to get document', error: err.message });
  }
};

/**
 * Get list of documents
 * @route GET /api/documents
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
export const listDocuments = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { limit = 200, page = 1 } = req.query;
    const uid = req.user.id;

    const query = {
      $or: [
        { created_by: uid }, // documents created by user
        { "from_template.assigned": uid } // documents assigned to user
      ]
    };

    const numericLimit = Math.min(Number(limit) || 200, 1000);
    const numericPage = Math.max(Number(page) || 1, 1);

    const documents = await Document.find(query)
      .limit(numericLimit)
      .skip((numericPage - 1) * numericLimit)
      .lean();

    res.json({ documents });
  } catch (err) {
    console.error("listDocuments error:", err);
    res.status(500).json({ message: "Failed to list documents", error: err.message });
  }
};

/**
 * Patch/update document field values
 * @route PATCH /api/documents/:id/field-values
 */
export const updateDocumentFieldValues = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'id required' });
    const { field_values, title } = req.body;
    if (!field_values || typeof field_values !== 'object') {
      return res.status(400).json({ message: 'field_values object required' });
    }

    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ message: 'document not found' });

    doc.field_values = Object.assign({}, doc.field_values || {}, field_values);

    // If caller provided a top-level title, persist it as well
    if (typeof title === 'string' && title.trim() !== '') {
      doc.title = title.trim();
    }

    await doc.save();

    return res.json({ success: true, message: 'Field values updated', document: doc });
  } catch (err) {
    console.error('updateDocumentFieldValues error', err);
    return res.status(500).json({ message: 'Failed to update field values', error: err.message });
  }
};

/**
 * @desc Save a field suggestion (user input) to be reused later.
 * @route POST /api/documents/field-suggestions
 */
export const saveFieldSuggestion = async (req, res) => {
  try {
  const { key, value, scope } = req.body;
    if (!key || typeof key !== 'string') return res.status(400).json({ message: 'key required' });
    if (value === undefined || value === null) return res.status(400).json({ message: 'value required' });

  // Use raw value comparison (no normalization)

  // scope handling: only 'user' or 'school' allowed when provided
  const allowedScopes = ['user', 'school'];
  const normalizedScope = allowedScopes.includes(scope) ? scope : 'user';

  const userId = req.user?.id || null;
  const school = req.user?.school || req.user?.role?.school || null;

    // Create new suggestion (attach user and school as context).
    // Autofill will use the key to fetch suggestions; we don't attempt to dedupe by value here.
    const docData = { key, value, count: 1, last_used: new Date() };
    if (normalizedScope === 'user') docData.user = userId;
    if (normalizedScope === 'school') docData.school = school;
    // scope stored for clarity
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

    // If a specific scope was requested, return only that scope
    if (queryScope === 'user') {
      // Get a larger batch and dedupe by raw value to ensure unique suggestions
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
      // Get a larger batch and dedupe by raw value to ensure unique suggestions
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

    // combine user -> school
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

