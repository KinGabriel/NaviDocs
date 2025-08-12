import express from 'express';
import { getApprovers } from '../controllers/docControllerController.js';
import { authenticateJWT } from '../middleware/authenticationMiddleware.js';

const router = express.Router();

router.get('/approvers', authenticateJWT, getApprovers);

export default router;
