import express from 'express';
import { authenticateJWT } from '../middleware/authenticationMiddleware.js';
import {
  createDocument,
  getDocumentById,
  listDocuments,  
  updateDocumentFieldValues,
  deleteDocumentById,
  renameDocument,
} from '../controllers/documentFunctionalityController.js';
import {
  getVersionData,
  patchVersionBookmark,
  listVersionDataByDocument,
  restoreDocumentVersion,
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
router.get('/:id', authenticateJWT, getDocumentById);
router.patch('/:id/field-values', authenticateJWT, updateDocumentFieldValues);
router.delete('/:id', authenticateJWT, deleteDocumentById);
router.patch('/:id/rename', authenticateJWT, renameDocument);

router.get('/version-data/:versionId', authenticateJWT, getVersionData);
router.patch('/version-data/:versionId/bookmark', authenticateJWT, patchVersionBookmark);
router.get('/version-data/document/:documentId', authenticateJWT, listVersionDataByDocument);
router.post('/version-data/restore', authenticateJWT, restoreDocumentVersion);
export default router;
