import express from 'express';
import { upload, handleMulterError } from '../middleware/uploadMiddleware.js';
import { uploadProfilePicture, uploadDocument, deleteFile, getFileInfo } from '../controllers/fileController.js';

const router = express.Router();

// Routes
router.post('/upload/profile', upload.single('profile_picture'), uploadProfilePicture);
 router.post('/upload/document', upload.single('document'), uploadDocument);
router.delete('/delete', deleteFile);
router.get('/info', getFileInfo);

// Health check for file routes
router.get('/health', (req, res) => {
  res.status(200).json({ 
    message: 'File routes are working',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    endpoints: {
      'POST /upload/profile': 'Upload profile picture',
      'POST /upload/document': 'Upload document',
      'DELETE /delete': 'Delete file',
      'GET /info': 'Get file information'
    }
  });
});

router.use(handleMulterError);

export default router;