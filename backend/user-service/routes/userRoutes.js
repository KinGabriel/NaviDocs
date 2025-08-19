import express from 'express';
import { getUserBasicInfo } from '../controllers/userController.js';
import { authenticateJWT } from '../middleware/authenticationMiddleware.js';

const router = express.Router();

router.get('/getUserInfo/:id', authenticateJWT, getUserBasicInfo);


export default router;
