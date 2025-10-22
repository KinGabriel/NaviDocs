import express from 'express';
import multer from "multer";
import { getUserEmail, getUserBasicInfo, getUserIdByEmail, updateUserAccountSettings, updateUserPassword, searchUsersByEmail, getSchoolStaff, getUsersInfoByBatch, getUserProfile } from '../controllers/userController.js';
import { authenticateJWT } from '../middleware/authenticationMiddleware.js';

const router = express.Router();

//  multer for memory storage (files sent to File Service)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for profile pictures'), false);
    }
  }
});
router.get('/getSchoolStaff', authenticateJWT, getSchoolStaff);
router.get('/getUserEmail/:id', authenticateJWT, getUserEmail);
router.get('/getUserInfo/:id', authenticateJWT, getUserBasicInfo);
router.post('/getUsersInfo', authenticateJWT, getUsersInfoByBatch);
router.get('/getUserIdByEmail/:email', authenticateJWT, getUserIdByEmail);
// Search users by email substring (for suggestions)
router.get('/searchByEmail', authenticateJWT, searchUsersByEmail);
router.patch('/updatePassword/:id', authenticateJWT, updateUserPassword);
router.patch('/updateAccountSettings/:id', authenticateJWT, upload.single('profile_picture'), updateUserAccountSettings);
router.get('/:id', authenticateJWT, getUserProfile);

export default router;
