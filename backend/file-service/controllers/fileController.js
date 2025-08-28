import path from 'path';
import fs from 'fs-extra';
import sharp from 'sharp';

/**
 * @desc Upload profile picture
 * @route POST /api/files/upload/profile
 * @access Internal (from other services)
 */
export const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Generate unique filename
    const fileExtension = path.extname(req.file.originalname);
    const fileName = `${userId}_${Date.now()}${fileExtension}`;
    const profilesDir = path.join(process.cwd(), 'uploads', 'profiles');
    const filePath = path.join(profilesDir, fileName);

    // Ensure directory exists
    await fs.ensureDir(profilesDir);

    // Process and save image using Sharp
    await sharp(req.file.buffer)
      .resize(300, 300, { 
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 85 })
      .toFile(filePath);

    // Return the file path that will be stored in database
    const relativePath = `/uploads/profiles/${fileName}`;
    
    console.log(`Profile picture saved: ${relativePath}`);
    res.status(200).json({
      message: 'Profile picture uploaded successfully',
      filePath: relativePath,
      fileName: fileName,
      originalName: req.file.originalname
    });

  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({
      message: 'Failed to upload profile picture',
      error: error.message
    });
  }
};


// Helper for document upload logic
export async function saveDocumentFile({ file, documentId, owner, folderName }) {
  if (!file) throw new Error('No file uploaded');
  if (!owner) throw new Error('Owner is required');

  // Validate file.buffer exists (for multer.memoryStorage)
  if (!file.buffer) {
    console.error('File object missing buffer:', file);
    throw new Error('Uploaded file is missing data (buffer property is undefined). Check multer config and frontend upload.');
  }

  const fileExtension = path.extname(file.originalname);
  const fileName = `${documentId || 'doc'}_${Date.now()}${fileExtension}`;
  const baseDir = folderName
    ? path.join(process.cwd(), 'uploads', owner, folderName)
    : path.join(process.cwd(), 'uploads', owner);
  const filePath = path.join(baseDir, fileName);

  await fs.ensureDir(baseDir);
  await fs.writeFile(filePath, file.buffer);

  const relativePath = folderName
    ? `/uploads/${owner}/${folderName}/${fileName}`
    : `/uploads/${owner}/${fileName}`;

  console.log(`Document saved: ${relativePath}`);
  return {
    message: 'Document uploaded successfully',
    filePath: relativePath,
    filename: fileName,
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: filePath,
    uploadedBy: owner,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * @desc Upload document file
 * @route POST /api/files/upload/document
 * @access Internal (from other services)
 *
 * Pathing: uploads/<owner>/<folderName> if folderName provided, else uploads/<owner>
 */
export const uploadDocument = async (req, res) => {
  try {
    const { documentId, owner, folderName } = req.body;
    const result = await saveDocumentFile({
      file: req.file,
      documentId,
      owner,
      folderName
    });
    res.status(200).json(result);
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({
      message: 'Failed to upload document',
      error: error.message
    });
  }
};

/**
 * @desc Delete file
 * @route DELETE /api/files/delete
 * @access Internal (from other services)
 */
export const deleteFile = async (req, res) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ message: 'File path is required' });
    }

    const fullPath = path.join(process.cwd(), filePath.replace(/^\//, ''));
    
    // Check if file exists
    const exists = await fs.pathExists(fullPath);
    if (!exists) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Delete file
    await fs.remove(fullPath);
    
    console.log(`File deleted: ${filePath}`);
    res.status(200).json({
      message: 'File deleted successfully',
      filePath: filePath
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      message: 'Failed to delete file',
      error: error.message
    });
  }
};

/**
 * @desc Get file info
 * @route GET /api/files/info
 * @access Internal (from other services)
 */
export const getFileInfo = async (req, res) => {
  try {
    const { filePath } = req.query;
    
    if (!filePath) {
      return res.status(400).json({ message: 'File path is required' });
    }

    const fullPath = path.join(process.cwd(), filePath.replace(/^\//, ''));
    
    // Check if file exists
    const exists = await fs.pathExists(fullPath);
    if (!exists) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Get file stats
    const stats = await fs.stat(fullPath);
    const fileInfo = {
      filePath,
      fileName: path.basename(fullPath),
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      extension: path.extname(fullPath)
    };
    
    res.status(200).json({
      message: 'File info retrieved successfully',
      fileInfo
    });

  } catch (error) {
    console.error('Error getting file info:', error);
    res.status(500).json({
      message: 'Failed to get file info',
      error: error.message
    });
  }
};