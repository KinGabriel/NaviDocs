import express from 'express';
import { authenticateJWT } from '../middleware/authenticationMiddleware.js';
import {
  createDocument,
  getDocumentById,
  listDocuments,  
  updateDocumentFieldValues

} from '../controllers/documentFunctionalityController.js';
import {
  createVersionData,
  getVersionData,
  updateVersionFieldValues,
  patchVersionBookmark,
  listVersionDataByDocument
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

router.post('/version-data', authenticateJWT, createVersionData);
router.get('/version-data/:versionId', authenticateJWT, getVersionData);
router.patch('/version-data/:versionId/field-values', authenticateJWT, updateVersionFieldValues);
router.patch('/version-data/:versionId/bookmark', authenticateJWT, patchVersionBookmark);
router.get('/version-data/document/:documentId', authenticateJWT, listVersionDataByDocument);
export default router;
