import express from 'express';
import { authenticateJWT } from '../middleware/authenticationMiddleware.js';
import { upsertTag, listTags, deleteTag, searchFieldsByTag } from '../controllers/tagController.js';

const router = express.Router();

router.get('/', authenticateJWT, listTags);
router.get('/fields/search', authenticateJWT, searchFieldsByTag);
router.post('/', authenticateJWT, upsertTag);
router.delete('/:key', authenticateJWT, deleteTag);

export default router;
