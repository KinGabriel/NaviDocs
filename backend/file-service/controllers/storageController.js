import Storage from '../models/storageModel.js';
import fs from 'fs';
import path from 'path';

/**
 * @desc Create a new folder (logical and optional physical) in the storage system
 * @route POST /api/storage/folder
 * @access Private (requires authentication)
 * @body { folderName: String, owner: String, visibility?: String, allowedSchools?: [String], allowedDepartments?: [String], allowedUsers?: [String] }
 * @returns 201 { message, folder } on success
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
    const folderPath = path.join(uploadsRoot, folderName);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    res.status(201).json({ message: 'Folder created successfully.', folder });
  } catch (err) {
    console.error('Error creating folder:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};