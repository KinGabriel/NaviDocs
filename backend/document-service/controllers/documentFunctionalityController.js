import Document from '../models/documentModel.js';
import axios from 'axios';

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
    const { user, assignedTo, mine, limit = 200, page = 1 } = req.query;
    const q = {};

    // If explicit user id provided, filter by creator
    if (user) {
      q.created_by = user;
    }

    // If explicit assignedTo provided, filter by assigned array containing that user
    if (assignedTo) {
      // if creator filter already set, combine as OR
      if (q.created_by) {
        q.$or = [ { created_by: q.created_by }, { assigned: assignedTo } ];
        delete q.created_by;
      } else {
        q.assigned = assignedTo;
      }
    }

    // If mine flag set, use authenticated user id to find created or assigned docs
    if ((mine === 'true' || mine === true) && req.user && req.user.id) {
      const uid = req.user.id;
      q.$or = q.$or || [];
      q.$or.push({ created_by: uid }, { assigned: uid });
    }

    const numericLimit = Math.min(parseInt(limit, 10) || 200, 1000);
    const numericPage = Math.max(parseInt(page, 10) || 1, 1);
    const docs = await Document.find(q).limit(numericLimit).skip((numericPage - 1) * numericLimit).lean();
    return res.json({ documents: docs });
  } catch (err) {
    console.error('listDocuments error', err);
    return res.status(500).json({ message: 'Failed to list documents', error: err.message });
  }
};
