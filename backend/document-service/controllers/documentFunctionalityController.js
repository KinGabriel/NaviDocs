
import Document from '../models/documentModel.js';
import axios from 'axios';
import { createVersionData,deleteAllVersionPerDocument } from './documentVersionController.js';
import VersionData from '../models/documentVersionModel.js';
import { fetchUserInfoById } from '../utils/userServiceUtils.js';

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
          console.log('Fetched template for document creation:', template);
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
            headerConfig: template.headerConfig || template.logoConfig || {},
            status_meta: template.status_meta || {},
            dateFormat: template.dateFormat || {},
            assigned: Array.isArray(template.assigned) ? template.assigned : [],
            snapshot_at: new Date()
          };

          // Only set values that are not explicitly provided in the payload 
          payload.title = payload.title || template.title || payload.title;
          payload.pages_json = Array.isArray(payload.pages_json) && payload.pages_json.length ? payload.pages_json : template.pages_json || payload.pages_json;
          // Prefer headerConfig from template for new documents
          if (!payload.headerConfig && (template.headerConfig || template.logoConfig)) {
            payload.headerConfig = template.headerConfig || template.logoConfig;
          }
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
  // set department from authenticated user or payload
  doc.department = req.user?.department || req.user?.role?.department || payload.department || null;

    await doc.save();
    //  create initial version data if caller supplied version info
    try {
      // Normalize note: treat note as a simple string. The codebase does not use notes arrays here.
      let note = '';
      if (typeof payload.note === 'string') {
        note = payload.note;
      } else if (typeof payload.notes === 'string') {
        // Some callers might send `notes` as a string; accept that for backward compatibility.
        note = payload.notes;
      }

      // Best-effort: create initial version data (fire-and-forget).
          const upsertInitialVersion = async () => {
        try {
          await createVersionData(String(doc._id), payload.field_values || {}, {
            userId: req.user?.id || null,
            note: 'initial version',
            last_activity_at: payload.last_activity_at || new Date()
            // isBookmarked: !!payload.isBookmarked,
            // last_activity_at: payload.last_activity_at || null
          });
        } catch (e) {
          console.error('createDocument createVersionData failed', e);
        }
      };

      upsertInitialVersion();
    } catch (e) {
      console.error('createDocument version upsert error', e);
    }

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
    if (!doc || doc.isArchived === true) return res.status(404).json({ message: 'document not found' });

    // Best-effort: fetch creator's name from user service and attach it to the response
    const fetchUserName = async (userId) => {
      if (!userId) return null;
      try {
        // request detailed user info (not the basic endpoint) so we can prefer firstname/lastname
        const info = await fetchUserInfoById(String(userId), req, { basic: false });
        if (info) {
          return `${info.firstname} ${info.lastname}`;
        }
      } catch (e) {
        // swallow and return null
      }
      return null;
    };

    try {
      const createdById = doc.created_by || doc.createdBy || null;
      if (createdById) {
        const name = await fetchUserName(createdById);
        if (name) doc.createdByName = name;
      }
    } catch (e) {
      console.warn('getDocumentById: failed to fetch creator info', e?.message || e);
    }

    console.log('getDocumentById', id, '->', doc);
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
        { assigned: { $elemMatch: { userId: uid } } } // documents assigned to user
      ],
      isArchived: { $ne: true }
    };

    const numericLimit = Math.min(Number(limit) || 200, 1000);
    const numericPage = Math.max(Number(page) || 1, 1);

    // Default sort: newest documents first. Prefer `updatedAt` (last activity), fall back to `updated_at`, then created timestamps.
    const documents = await Document.find(query)
      .sort({ updatedAt: -1, updated_at: -1, createdAt: -1, created_at: -1 })
      .limit(numericLimit)
      .skip((numericPage - 1) * numericLimit)
      .lean();

    // also compute total count so the frontend can paginate
    const totalCount = await Document.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(totalCount / numericLimit));

    res.json({ documents, pagination: { total_count: totalCount, total_pages: totalPages, page: numericPage, limit: numericLimit } });
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

    // Best-effort: update corresponding version data if caller provided version identifier or field values
    try {
      // Normalize note from request body: prefer `note` string, accept `notes` string for compatibility.
      let note = '';
      if (typeof req.body.note === 'string') {
        note = req.body.note;
      } else if (typeof req.body.notes === 'string') {
        note = req.body.notes;
      }

      // Best-effort: update corresponding version data (fire-and-forget).
      const upsertVersion = async () => {
        try {
          await createVersionData(String(doc._id), req.body.field_values || {}, {
            userId: req.user?.id || null,
            note,
            // isBookmarked: !!req.body.isBookmarked,
           last_activity_at: req.body.last_activity_at || new Date()
          });
        } catch (e) {
          console.error('updateDocumentFieldValues createVersionData failed', e);
        }
      };

      upsertVersion();
    } catch (e) {
      console.error('updateDocumentFieldValues version upsert error', e);
    }

    return res.json({ success: true, message: 'Field values updated', document: doc });
  } catch (err) {
    console.error('updateDocumentFieldValues error', err);
    return res.status(500).json({ message: 'Failed to update field values', error: err.message });
  }
};

/**
 * @desc Rename document (change its title)
 * @route PATCH /api/documents/:id/rename
 * @param {*} req
 */
export const renameDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { newName } = req.body;
    if (!id) return res.status(400).json({ message: 'id required' });
    if (!newName || newName.trim() === '') {
      return res.status(400).json({ message: 'Title is required and shouldn\'t be empty' });
    }
    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ message: 'document not found' });
    doc.title = newName.trim();
    await doc.save();

    res.json({ success: true, message: 'Document renamed successfully', document: doc });
  } catch (err) {
    console.error('renameDocument error', err);
    res.status(500).json({ message: 'Failed to rename document', error: err.message });
  }
};

/**
 * @desc Delete a document by its ID
 * @route DELETE /api/documents/:id
 * @param {*} req
*/
export const deleteDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'id required' });
    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ message: 'document not found' });

    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // If user is owner, delete document and all versions
    if (String(doc.created_by) === String(userId)) {
      await Document.deleteOne({ _id: id });
      await deleteAllVersionPerDocument(id);
      return res.json({ success: true, message: 'Document deleted successfully' });
    }

    // If user is assigned, remove their id from assigned array
    let changed = false;
    if (Array.isArray(doc.assigned)) {
      // Support both string and object-shaped entries
      const before = doc.assigned.length;
      doc.assigned = doc.assigned.filter(a => {
        if (!a) return false;
        if (typeof a === 'string' || typeof a === 'number') {
          return String(a) !== String(userId);
        } else if (typeof a === 'object') {
          const aid = a.userId || a.id || a._id || a.user;
          return String(aid) !== String(userId);
        }
        return true;
      });
      if (doc.assigned.length !== before) changed = true;
    }

    if (changed) {
      await doc.save();
      return res.json({ success: true, message: 'Removed from assigned list' });
    } else {
      return res.status(403).json({ message: 'Not authorized to delete this document or not assigned' });
    }
  } catch (err) {
    console.error('deleteDocumentById error', err);
    res.status(500).json({ message: 'Failed to delete document', error: err.message });
  }
};

/**
 * @desc duplicate a document by its ID
 * @route POST /api/documents/:id/duplicate
 * @param {*} req
 */
export const duplicateDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'id required' });

    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ message: 'document not found' });

    // Determine the new title: prefer a provided newName/title in body, else default
    const provided = (req.body && (typeof req.body.newName === 'string' ? req.body.newName : req.body.title)) || '';
    const newTitle = provided && provided.trim() !== '' ? provided.trim() : `Copy of ${doc.title}`;

    // Create a slim copy that only includes from_template and field_values
    // plus minimal metadata. This avoids duplicating owner/versions/etc.
    const newDocPayload = {
      title: newTitle,
      created_by: req.user?.id || doc.created_by || null,
      school: doc.school || '',
      // prefer explicit template_id, otherwise try from_template.id
      template_id: doc.template_id || (doc.from_template && doc.from_template.id) || null,
      from_template: doc.from_template || {},
      field_values: doc.field_values || {},
      status: 'draft',
      notes: [],
      thumbnailUrl: doc.thumbnailUrl || null,
      status_meta: doc.status_meta || {},
    };

    const duplicateDoc = new Document(newDocPayload);
    await duplicateDoc.save();

    return res.json({ success: true, message: 'Document duplicated successfully', document: duplicateDoc });
  } catch (err) {
    console.error('duplicateDocumentById error', err);
    res.status(500).json({ message: 'Failed to duplicate document', error: err.message });
  }
};

/**
 * @desc Archive a document by its ID
 * @route PATCH /api/documents/:id/archive
 * @param {*} req
 */
export const archiveDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'id required' });
    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ message: 'document not found' });

    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // If user is owner, archive document
    if (String(doc.created_by) === String(userId)) {
      doc.isArchived = true;
      await doc.save();
      return res.json({ success: true, message: 'Document archived successfully', document: doc });
    }

    // If user is assigned, remove their id from assigned array
    let changed = false;
    if (Array.isArray(doc.assigned)) {
      const before = doc.assigned.length;
      doc.assigned = doc.assigned.filter(a => {
        if (!a) return false;
        if (typeof a === 'string' || typeof a === 'number') {
          return String(a) !== String(userId);
        } else if (typeof a === 'object') {
          const aid = a.userId || a.id || a._id || a.user;
          return String(aid) !== String(userId);
        }
        return true;
      });
      if (doc.assigned.length !== before) changed = true;
    }

    if (changed) {
      await doc.save();
      return res.json({ success: true, message: 'Removed from assigned list' });
    } else {
      return res.status(403).json({ message: 'Not authorized to archive this document or not assigned' });
    }
  } catch (err) {
    console.error('archiveDocumentById error', err);
    res.status(500).json({ message: 'Failed to archive document', error: err.message });
  }
};

/**
 * List archived documents for current user
 * @route GET /api/documents/archived
 */
export const listArchivedDocuments = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { limit = 200, page = 1 } = req.query;
    const uid = req.user.id;
    const query = {
      $or: [
        { created_by: uid },
        { assigned: { $elemMatch: { userId: uid } } }
      ],
      isArchived: true
    };
    const numericLimit = Math.min(Number(limit) || 200, 1000);
    const numericPage = Math.max(Number(page) || 1, 1);
    const documents = await Document.find(query)
      .sort({ updatedAt: -1, updated_at: -1, createdAt: -1, created_at: -1 })
      .limit(numericLimit)
      .skip((numericPage - 1) * numericLimit)
      .lean();
    const totalCount = await Document.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(totalCount / numericLimit));
    res.json({ documents, pagination: { total_count: totalCount, total_pages: totalPages, page: numericPage, limit: numericLimit } });
  } catch (err) {
    console.error("listArchivedDocuments error:", err);
    res.status(500).json({ message: "Failed to list archived documents", error: err.message });
  }
};