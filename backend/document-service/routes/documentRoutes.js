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
  archiveDocumentById,
  listArchivedDocuments,
} from '../controllers/documentFunctionalityController.js';
import { shareDocument, assignFacultyByDeptHead, submitDocumentLink } from '../controllers/documentWorkFlow.js';
import multer from 'multer';
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

// multer for memory storage (files sent to File Service)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });


router.post('/field-suggestions', authenticateJWT, saveFieldSuggestion);
router.get('/field-suggestions', authenticateJWT, getFieldSuggestions);
router.get('/field-suggestions/fields', authenticateJWT, listAllFieldsForUser);
router.patch('/field-suggestions/:id', authenticateJWT, updateFieldSuggestion);
router.delete('/field-suggestions/:id', authenticateJWT, deleteFieldSuggestion);

router.post('/create-document', authenticateJWT, createDocument);
router.get('/', authenticateJWT, listDocuments);
router.get('/archived', authenticateJWT, requireDocumentAccess('view'), listArchivedDocuments);

router.post('/:id/duplicate', authenticateJWT, requireDocumentAccess('view'), duplicateDocumentById);
router.post('/:id/duplicate-version', authenticateJWT, requireDocumentAccess('view'), duplicateDocumentFromVersion);
router.get('/:id', authenticateJWT, requireDocumentAccess('view'), getDocumentById);
router.patch('/:id/field-values', authenticateJWT, requireDocumentAccess('edit'), updateDocumentFieldValues);
router.post('/:id/share', authenticateJWT, requireDocumentAccess('edit'), shareDocument);
router.post('/:id/assign-by-dept-head', authenticateJWT, assignFacultyByDeptHead);
router.patch('/:id/submission', authenticateJWT, requireDocumentAccess('edit'), upload.single('document'), submitDocumentLink);

router.delete('/:id', authenticateJWT, requireDocumentAccess('edit'), deleteDocumentById);
router.patch('/:id/rename', authenticateJWT, requireDocumentAccess('edit'), renameDocument);
router.patch('/:id/archive', authenticateJWT, requireDocumentAccess('edit'), archiveDocumentById);

router.get('/version-data/:versionId', authenticateJWT, getVersionData);
router.patch('/version-data/:versionId/bookmark', authenticateJWT, patchVersionBookmark);
router.get('/version-data/document/:documentId', authenticateJWT, listVersionDataByDocument);
router.post('/version-data/restore', authenticateJWT, restoreDocumentVersion);
export default router;
