import Storage, { File } from '../models/storageModel.js';

/**
 * Extract ID from params/body/query in a flexible way
 */
const getId = (req, keys = []) => {
  for (const key of keys) {
    if (req.params?.[key]) return req.params[key];
    if (req.body?.[key]) return req.body[key];
    if (req.query?.[key]) return req.query[key];
  }
  return null;
};

/**
 * Check if user is owner or editor for a folder
 */
export const canModifyFolder = async (req, res, next) => {
  try {
    const folderId = getId(req, ['folderId', 'folder_id','parentFolder','id']);
    const userId =  req.user?.id;
    if (!folderId) {
    return next();
    }
   
    if (!folderId || !userId) {
      return res.status(400).json({ message: 'Folder ID and user ID required.' });
    }

    const folder = await Storage.findById(folderId);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found.' });
    }

    // Owner check
    if (folder.owner?.toString() === userId.toString()) {
      return next();
    }
    console.log("Allowed Users:", folder.allowedUsers);
    // Editor check
    if (Array.isArray(folder.allowedUsers)) {
      const allowedUser = folder.allowedUsers.find(
        u => u.userId?.toString() === userId.toString() && u.role === 'Editor'
      
      );
      console.log("Allowed User:", allowedUser);

      if (allowedUser) return next();
    }

    return res.status(403).json({ message: 'Forbidden: no permission on this folder.' });
  } catch (err) {
    console.error('Error in canModifyFolder validator:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Check if user is owner or editor for a file 
 */
export const canModifyFile = async (req, res, next) => {
  try {
    const fileId = getId(req, ['fileId']);
    const folderId = getId(req, ['folderId', 'folder_id', 'parentFolder']);
    const userId = req.user?.id;
    // If no fileId, allow through (e.g., uploading a new file)

    if (!userId) {
      return res.status(400).json({ message: 'User ID required.' });
    }

    let fileDoc;

    if (folderId) {
      // File inside a folder
      const folder = await Storage.findById(folderId);
      if (!folder) {
        return res.status(404).json({ message: 'Folder not found.' });
      }

      fileDoc = folder.files.find(f => f._id.toString() === fileId);
      if (!fileDoc) {
        return res.status(404).json({ message: 'File not found in folder.' });
      }

      // Check folder owner
      if (folder.owner?.toString() === userId.toString()) return next();

      // Check file-level allowedUsers for editor
      if (Array.isArray(fileDoc.allowedUsers)) {
        const allowedUser = fileDoc.allowedUsers.find(
          u => u.userId?.toString() === userId.toString() && u.role === 'Editor'
        );
        if (allowedUser) return next();
      }
    } else {
      // Orphan file
      fileDoc = await File.findById(fileId);
      if (!fileDoc) {
        return res.status(404).json({ message: 'File not found.' });
      }

      // Check orphan file owner/uploader
      if (
        fileDoc.uploadedBy?.toString() === userId.toString() ||
        fileDoc.owner?.toString() === userId.toString()
      ) {
        return next();
      }

      // Check if editor in file
      if (Array.isArray(fileDoc.files)) {
        const allowedUser = fileDoc.files.find(
          u => u.userId?.toString() === userId.toString() && u.role === 'editor'
        );
        if (allowedUser) return next();
      }
    }

    return res.status(403).json({ message: 'Forbidden: no permission on this file.' });
  } catch (err) {
    console.error('Error in canModifyFile validator:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};