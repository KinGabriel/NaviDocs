
import Storage, { File } from '../models/storageModel.js';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { saveDocumentFile } from '../utils/saveDocumentFile.js';

/**
 * @desc Create a new folder (logical and optional physical) in the storage system
 * @route POST /api/storage/folder
 * @access Private (requires authentication)
 * @returns 400 { message } if required fields are missing
 * @returns 409 { message } if folder already exists for this owner
 * @returns 500 { message } on server error
 */
export const createFolder = async (req, res) => {
  try {
    const { folderName, owner } = req.body;
    if (!folderName || !owner) {
      return res.status(400).json({ message: 'folderName and owner are required.' });
    }
    // Check for duplicate folder for this owner
    const existing = await Storage.findOne({ folderName, owner });
    if (existing) {
      return res.status(409).json({ message: 'Folder already exists' });
    }
    // Create folder in DB
    const folder = new Storage({
      folderName,
      owner
    });
    await folder.save();

    // create a physical folder on disk
    const uploadsRoot = path.join(process.cwd(), 'uploads');
    const folderPath = path.join(uploadsRoot, owner, folderName);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    res.status(201).json({ message: 'Folder created successfully.', folder });
  } catch (err) {
    console.error('Error creating folder:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * @desc Get all folders user has access to
 * @route GET /api/storage/folders?userId=xxx&school=xxx&department=xxx
 * @access Private (requires authentication)
 */
export const getFolder = async (req, res) => {
  try {
    const { userId, school, department } = req.query;
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    // Get all folders
    const allFolders = await Storage.find();

    // Filter by access control
    const accessible = allFolders.filter(folder => {
      if (folder.visibility === 'public') return true;
      if (folder.owner === userId) return true;
      if (folder.allowedUsers?.includes(userId)) return true;
      if (school && folder.allowedSchools?.includes(school)) return true;
      if (department && folder.allowedDepartments?.includes(department)) return true;
      return false;
    });

     // TO DO: Axios request the user details
    // axios.get
    
    //  physical files list
    const result = accessible.map(folder => {
      const folderPath = path.join(process.cwd(), 'uploads', folder.owner, folder.folderName);
      let physicalFiles = [];
      if (fs.existsSync(folderPath)) {
        physicalFiles = fs.readdirSync(folderPath);
      }
   
      return {
        _id: folder._id,
        folderName: folder.folderName,
        visibility: folder.visibility,
        allowedDepartments: folder.allowedDepartments || [],
        allowedSchools: folder.allowedSchools || [],
        allowedUsers: folder.allowedUsers || [],
        createdAt: folder.createdAt || null,
        updatedAt: folder.updatedAt || null,
        owner: folder.owner || null,
      };
    });

    res.status(200).json({
      message: 'Accessible folders fetched successfully.',
      folders: result
    });
  } catch (err) {
    console.error('Error fetching accessible folders:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Get folder by ID
 * @route GET /api/storage/folder/:id
 * @param {*} req
 * @param {*} res
 * @returns
 */
export const getFolderByID = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'Folder ID is required.' });
    }

    const folder = await Storage.findById(id);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found.' });
    }

    // Get physical files
    const folderPath = path.join(process.cwd(), 'uploads', folder.owner, folder.folderName);
    let physicalFiles = [];
    if (fs.existsSync(folderPath)) {
      physicalFiles = fs.readdirSync(folderPath);
    }

    // If you want to include db files, adjust as needed
    const dbfiles = folder.files || [];

    const result = {
      _id: folder._id,
      folderName: folder.folderName,
      visibility: folder.visibility,
      allowedDepartments: folder.allowedDepartments || [],
      allowedSchools: folder.allowedSchools || [],
      allowedUsers: folder.allowedUsers || [],
      createdAt: folder.createdAt || null,
      updatedAt: folder.updatedAt || null,
      owner: folder.owner || null,
      dbfiles,
      physicalFiles
    };

    res.status(200).json({
      message: 'Folder fetched successfully.',
      folder: result
    });
  } catch (err) {
    console.error('Error fetching folder by ID:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Add or replace access to folders
 * @route POST /api/storage/folders/share
 * @param {*} req
 * @param {*} res
 * @returns
 */
export const addAccessToFolders = async (req, res) => {
  try {
    const { folderId, allowedUsers, allowedSchools, allowedDepartments } = req.body;
    if (!folderId) {
      return res.status(400).json({ message: 'folderId is required.' });
    }

    // Find the folder
    const folder = await Storage.findById(folderId);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found.' });
    }

    // Overwrite access control lists if provided
    if (Array.isArray(allowedUsers)) {
      folder.allowedUsers = allowedUsers;
    }
    if (Array.isArray(allowedSchools)) {
      folder.allowedSchools = allowedSchools;
    }
    if (Array.isArray(allowedDepartments)) {
      folder.allowedDepartments = allowedDepartments;
    }

    await folder.save();
    res.status(200).json({ message: 'Access control updated successfully.', folder });
  } catch (err) {
    console.error('Error updating access control:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
/**
 * Delete Folder by ID
 * @param {*} req
 * @param {*} res
 * @returns
 */
export const deleteFolderByID = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'Folder ID is required.' });
    }

    const folder = await Storage.findById(id);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found.' });
    }

    // Remove physical folder and its contents
    const uploadsRoot = path.join(process.cwd(), 'uploads');
    const folderPath = path.join(uploadsRoot, folder.owner, folder.folderName);
    if (fs.existsSync(folderPath)) {
      fs.rmSync(folderPath, { recursive: true, force: true });
    }

    await folder.remove();
    res.status(200).json({ message: 'Folder deleted successfully.' });
  } catch (err) {
    console.error('Error deleting folder by ID:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Add or update files in a folder
 * @route POST /api/storage/folders/:id/files
 * @param {*} req
 * @param {*} res
 * @returns
 *
 * Expects req.body.files to be an array of file metadata objects (from uploadDocument)
 * This will replace the folder's files array with the provided list
 */
export const addDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(req.body)
    // req.files is populated by multer middleware
    const uploadedFiles = req.files;
    // user_id may be sent in multipart form data
    const owner = req.body.owner || null;
    console.log('req.files:', req.files);
    console.log('req.body.owner:', owner);

    if (!id || !Array.isArray(uploadedFiles) || uploadedFiles.length === 0) {
      return res.status(400).json({ message: 'Folder ID and files are required.' });
    }

    const folder = await Storage.findById(id);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found.' });
    }


    // Use saveDocumentFile for each file and collect the file metadata
    const fileMetadatas = [];
    for (const file of uploadedFiles) {
      try {
        // Use user_id as owner if provided, else fallback to folder._id
        const meta = await saveDocumentFile({
          file,
          documentId: file.documentId || undefined,
          owner: owner,
          folderName: folder.folderName,
          uploaded_by: req.body.user_id
        });
        fileMetadatas.push(meta);
      } catch (err) {
        console.error('Error uploading document:', err);
      }
    }

    // Push new files to the array
    folder.files.push(...fileMetadatas);
    await folder.save();

    res.status(200).json({ message: 'Files uploaded and updated successfully.', folder });
  } catch (err) {
    console.error('Error updating files in folder:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Delete a file
 * @route DELETE /api/storage/files/:fileId
 * @param {*} req
 * @param {*} res
 * @returns
 */
export const deleteFile = async (req, res) => {
  try {
    const { folderId, fileId } = req.params;

    if (!fileId) {
      return res.status(400).json({ message: 'File ID is required.' });
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

      // Remove physical file
      if (fileDoc.path && fs.existsSync(fileDoc.path)) {
        fs.unlinkSync(fileDoc.path);
      }

      folder.files = folder.files.filter(f => f._id.toString() !== fileId);
      await folder.save();
    } else {
      // Orphan file
      fileDoc = await File.findById(fileId);
      if (!fileDoc) {
        return res.status(404).json({ message: 'File not found.' });
      }

      if (fileDoc.path && fs.existsSync(fileDoc.path)) {
        fs.unlinkSync(fileDoc.path);
      }

      await fileDoc.deleteOne();
    }

    res.status(200).json({ message: 'File deleted successfully.' });
  } catch (err) {
    console.error('Error deleting file:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Add an orphan file (not in a folder)
 * @route POST /api/files/upload-orphan
 * @param {*} req
 * @param {*} res
 * @returns
 */
export const addOrphanFile = async (req, res) => {
  try {
    return await uploadDocument(req, res);
  } catch (err) {
    console.error('Error uploading orphan file:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};