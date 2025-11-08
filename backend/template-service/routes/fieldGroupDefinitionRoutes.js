import express from 'express';
import { authenticateJWT } from '../middleware/authenticationMiddleware.js';
import { listFieldGroups, upsertFieldGroup, bulkUpsertFieldGroups, deleteFieldGroup, getFieldGroupByKey, renameFieldGroup } from '../controllers/fieldGroupDefinitionController.js';

const router = express.Router();

router.get('/', authenticateJWT, listFieldGroups);
router.get('/one', authenticateJWT, getFieldGroupByKey);
router.post('/', authenticateJWT, upsertFieldGroup);
router.post('/bulk', authenticateJWT, bulkUpsertFieldGroups);
router.patch('/:id', authenticateJWT, renameFieldGroup);
router.delete('/:id', authenticateJWT, deleteFieldGroup);

export default router;
