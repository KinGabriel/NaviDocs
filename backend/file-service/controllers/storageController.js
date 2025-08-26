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
    const { folderName, owner, visibility, allowedSchools, allowedDepartments, allowedUsers } = req.body;
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
      owner,
      visibility: visibility || 'private',
      allowedSchools: allowedSchools || [],
      allowedDepartments: allowedDepartments || [],
      allowedUsers: allowedUsers || []
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

