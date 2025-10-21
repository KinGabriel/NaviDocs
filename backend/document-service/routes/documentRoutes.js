import express from 'express';
import { authenticateJWT } from '../middleware/authenticationMiddleware.js';
import { requireDocumentAccess } from '../middleware/accessControlMiddleware.js';
import {
  createDocument,
  getDocumentById,
  listDocuments,  
  updateDocumentFieldValues,
  deleteDocumentById,
  renameDocument,
  duplicateDocumentById,
} from '../controllers/documentFunctionalityController.js';
import { shareDocument } from '../controllers/documentWorkFlow.js';
import {
  getVersionData,
  patchVersionBookmark,
  listVersionDataByDocument,
  restoreDocumentVersion,
  duplicateDocumentFromVersion,
} from '../controllers/documentVersionController.js';
import { 
  saveFieldSuggestion, 
  getFieldSuggestions,
  updateFieldSuggestion,
  deleteFieldSuggestion,
  listAllFieldsForUser } 
  from '../controllers/fieldSuggestionController.js';

const router = express.Router();


router.post('/field-suggestions', authenticateJWT, saveFieldSuggestion);
router.get('/field-suggestions', authenticateJWT, getFieldSuggestions);
router.get('/field-suggestions/fields', authenticateJWT, listAllFieldsForUser);
router.patch('/field-suggestions/:id', authenticateJWT, updateFieldSuggestion);
router.delete('/field-suggestions/:id', authenticateJWT, deleteFieldSuggestion);

router.post('/create-document', authenticateJWT, createDocument);
router.get('/', authenticateJWT, listDocuments);
router.post('/:id/duplicate', authenticateJWT, requireDocumentAccess('view'), duplicateDocumentById);
router.post('/:id/duplicate-version', authenticateJWT, requireDocumentAccess('view'), duplicateDocumentFromVersion);
router.get('/:id', authenticateJWT, requireDocumentAccess('view'), getDocumentById);
router.patch('/:id/field-values', authenticateJWT, requireDocumentAccess('edit'), updateDocumentFieldValues);
router.post('/:id/share', authenticateJWT, requireDocumentAccess('edit'), shareDocument);
router.delete('/:id', authenticateJWT, requireDocumentAccess('edit'), deleteDocumentById);
router.patch('/:id/rename', authenticateJWT, requireDocumentAccess('edit'), renameDocument);

router.get('/version-data/:versionId', authenticateJWT, getVersionData);
router.patch('/version-data/:versionId/bookmark', authenticateJWT, patchVersionBookmark);
router.get('/version-data/document/:documentId', authenticateJWT, listVersionDataByDocument);
router.post('/version-data/restore', authenticateJWT, restoreDocumentVersion);
export default router;
