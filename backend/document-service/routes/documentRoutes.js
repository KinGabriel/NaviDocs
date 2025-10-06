import express from 'express';
import { authenticateJWT } from '../../user-service/middleware/authenticationMiddleware.js';
import {
  createDocument,
  getDocumentById,
  listDocuments,  
  updateDocumentFieldValues

} from '../controllers/documentFunctionalityController.js';

const router = express.Router();

router.post('/create-document', authenticateJWT, createDocument);
router.get('/', authenticateJWT, listDocuments);
router.get('/:id', authenticateJWT, getDocumentById);
router.patch('/:id/field-values', authenticateJWT, updateDocumentFieldValues);
export default router;
