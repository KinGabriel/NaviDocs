import path from 'path';
import fs from 'fs-extra';

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
  // If the file is a thumbnail, use only the documentId for the filename
  let fileName;
  if (file.originalname.endsWith('.png') && folderName === 'thumbnail') {
    fileName = `${documentId}${fileExtension}`;
  } else {
    fileName = `${documentId || 'doc'}_${Date.now()}${fileExtension}`;
  }
  const baseDir = folderName
    ? path.join(process.cwd(), 'uploads', owner, folderName)
    : path.join(process.cwd(), 'uploads', owner);
  const filePath = path.join(baseDir, fileName);

  await fs.ensureDir(baseDir);
  // Overwrite if exists (for thumbnails)
  await fs.writeFile(filePath, file.buffer);

  const relativePath = folderName
    ? `/uploads/${owner}/${folderName}/${fileName}`
    : `/uploads/${owner}/${fileName}`;

  console.log(`Document saved: ${relativePath}`);
  // Save a POSIX-style relative path for DB (for cross-platform compatibility)
  const relPathForDB = path.posix.join(
    'uploads',
    ...(folderName ? [owner, folderName, fileName] : [owner, fileName])
  );
  return {
    message: 'Document uploaded successfully',
    filePath: relativePath,
    filename: fileName,
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    // Save the DB path as a forward-slash relative path
    path: relPathForDB,
    uploadedBy: owner,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}
