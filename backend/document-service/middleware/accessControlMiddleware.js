import Document from '../models/documentModel.js';

// helper to extract user id string from assigned entry (string or object)
const assignedEntryUserId = (entry) => {
  if (!entry) return null;
  if (typeof entry === 'string') return String(entry);
  if (typeof entry === 'object') return String(entry.userId || entry.id || entry._id || entry.user || '');
  return null;
};

// check if userId has view access on document
const userHasViewAccess = (document, userId) => {
  if (!userId) return false;
  if (String(document.created_by || document.createdBy || '') === String(userId)) return true;
  if (Array.isArray(document.assigned)) {
    for (const a of document.assigned) {
      const au = assignedEntryUserId(a);
      if (au && au === String(userId)) return true;
    }
  }
  if (document.from_template && Array.isArray(document.from_template.assigned)) {
    for (const a of document.from_template.assigned) {
      const au = assignedEntryUserId(a);
      if (au && au === String(userId)) return true;
    }
  }
  return false;
};

// check if userId has edit access on document
const userHasEditAccess = (document, userId) => {
  if (!userId) return false;
  if (String(document.created_by || document.createdBy || '') === String(userId)) return true;
  if (Array.isArray(document.assigned)) {
    for (const a of document.assigned) {
      const au = assignedEntryUserId(a);
      if (!au) continue;
      if (au === String(userId)) {
        // legacy string assigned -> treat as editor
        if (typeof a === 'string') return true;
        // object-shaped assigned -> check access property
        const access = (a.access || a.role || 'viewer');
        if (['editor', 'owner', 'admin'].includes(String(access))) return true;
      }
    }
  }
  return false;
};

// middleware factory: level is 'view' or 'edit'
export const requireDocumentAccess = (level = 'view') => {
  return async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ message: 'id required' });

      // Load the document and attach to req for downstream handlers
      const doc = await Document.findById(id).lean();
      if (!doc) return res.status(404).json({ message: 'document not found' });
      req.document = doc;

      const uid = req.user?.id || null;
      if (!uid) return res.status(401).json({ message: 'Unauthorized' });

      if (level === 'view') {
        if (!userHasViewAccess(doc, uid)) return res.status(403).json({ message: 'forbidden' });
        return next();
      }

      if (level === 'edit') {
        if (!userHasEditAccess(doc, uid)) return res.status(403).json({ message: 'forbidden' });
        return next();
      }

      // default deny
      return res.status(403).json({ message: 'forbidden' });
    } catch (err) {
      console.error('accessControlMiddleware error', err);
      return res.status(500).json({ message: 'access control failure', error: err.message });
    }
  };
};

export default requireDocumentAccess;
