import Storage from '../models/storageModel.js';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

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
        folder,
        dbFiles: folder.files || [],
        filledOutDocuments: folder.filledOutDocuments || [],
        visibility: folder.visibility,
        physicalFiles
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

    res.status(200).json({
      message: 'Folder fetched successfully.',
      folder
    });
  } catch (err) {
    console.error('Error fetching folder by ID:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Add access to folders
 * @route POST /api/storage/folders/share
 * @param {*} req
 * @param {*} res
 * @returns
 */
export const addAccessToFolders = async (req, res) => {
  try {
    const { folderId, userId, school, department } = req.body;
    if (!folderId || !userId) {
      return res.status(400).json({ message: 'folderId and userId are required.' });
    }

    // Find the folder
    const folder = await Storage.findById(folderId);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found.' });
    }

    // Update access control lists
    if (school) {
      folder.allowedSchools = folder.allowedSchools || [];
      folder.allowedSchools.push(school);
    }
    if (department) {
      folder.allowedDepartments = folder.allowedDepartments || [];
      folder.allowedDepartments.push(department);
    }
    folder.allowedUsers = folder.allowedUsers || [];
    folder.allowedUsers.push(userId);

    await folder.save();
    res.status(200).json({ message: 'Access control updated successfully.', folder });
  } catch (err) {
    console.error('Error updating access control:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

