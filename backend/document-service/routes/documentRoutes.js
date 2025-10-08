import express from 'express';
import { authenticateJWT } from '../middleware/authenticationMiddleware.js';
import {
  createDocument,
  getDocumentById,
  listDocuments,  
  updateDocumentFieldValues

} from '../controllers/documentFunctionalityController.js';
import { saveFieldSuggestion, getFieldSuggestions } from '../controllers/documentFunctionalityController.js';

const router = express.Router();

// Field suggestion endpoints (store and retrieve user inputs for reuse)
router.post('/field-suggestions', authenticateJWT, saveFieldSuggestion);
router.get('/field-suggestions', authenticateJWT, getFieldSuggestions);

router.post('/create-document', authenticateJWT, createDocument);
router.get('/', authenticateJWT, listDocuments);
router.get('/:id', authenticateJWT, getDocumentById);
router.patch('/:id/field-values', authenticateJWT, updateDocumentFieldValues);
export default router;
