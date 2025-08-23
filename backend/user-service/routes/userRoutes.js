import express from 'express';
import multer from "multer";
import { getUserBasicInfo,updateUserAccountSettings,updateUserPassword } from '../controllers/userController.js';
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

router.get('/getUserInfo/:id', authenticateJWT, getUserBasicInfo);
router.patch('/updatePassword/:id', authenticateJWT, updateUserPassword);
router.patch('/updateAccountSettings/:id', authenticateJWT, upload.single('profile_picture'), updateUserAccountSettings);

export default router;
