import express from 'express';
import { authenticateJWT } from '../middleware/authenticationMiddleware.js';
import {
  createDocument,
  getDocumentById,
  listDocuments,  
  updateDocumentFieldValues

} from '../controllers/documentFunctionalityController.js';
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
export default router;
