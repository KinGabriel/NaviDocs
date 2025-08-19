import express from 'express';
import { getUserBasicInfo,updateUserAccountSettings,updateUserPassword } from '../controllers/userController.js';
import { authenticateJWT } from '../middleware/authenticationMiddleware.js';

const router = express.Router();

router.get('/getUserInfo/:id', authenticateJWT, getUserBasicInfo);
router.put('/updatePassword/:id', authenticateJWT, updateUserPassword);
router.put('/updateAccountSettings/:id', authenticateJWT, updateUserAccountSettings);

export default router;
