import Storage, { File } from '../models/storageModel.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { deleteFolderRecursive } from '../utils/storageUtils.js';
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
    let { folderName, owner, parentFolder } = req.body;
    console.log('[createFolder] folderName:', folderName, 'owner:', owner, 'parentFolder:', parentFolder);
    if (parentFolder && typeof parentFolder === 'string') {
      try {
        parentFolder = new mongoose.Types.ObjectId(parentFolder);
      } catch (e) {
        return res.status(400).json({ message: 'Invalid parentFolder ID.' });
      }
    } else if (!parentFolder) {
      parentFolder = null;
    }
    if (!folderName || !owner) {
      return res.status(400).json({ message: 'folderName and owner are required.' });
    }
    // Check for duplicate folder for this owner and parent
  const query = { folderName, owner };
  if (parentFolder) query.parentFolder = parentFolder;
  const existing = await Storage.findOne(query);
    if (existing) {
      return res.status(409).json({ message: 'Folder already exists' });
    }
    // Inherit access from parent if present
    let allowedUsers = [];
    let allowedSchools = [];
    let allowedDepartments = [];
    if (parentFolder) {
      const parent = await Storage.findById(parentFolder);
      if (parent) {
        allowedUsers = parent.allowedUsers || [];
        allowedSchools = parent.allowedSchools || [];
        allowedDepartments = parent.allowedDepartments || [];
      }
    }
    // Create folder in DB
    const folder = new Storage({
      folderName,
      owner,
      parentFolder: parentFolder,
      allowedUsers,
      allowedSchools,
      allowedDepartments
    });
    await folder.save();

    // create a physical folder on disk (nested if parentFolder is set)
    const uploadsRoot = path.join(process.cwd(), 'uploads');
    let folderPath;
    if (parentFolder) {
      // Find parent folder's path recursively
      const parent = await Storage.findById(parentFolder);
      if (!parent) {
        return res.status(400).json({ message: 'Parent folder not found.' });
      }
      // Build the nested path: uploads/owner/parent1/parent2/.../folderName
      let parentNames = [parent.folderName];
      let current = parent;
      while (current.parentFolder) {
        current = await Storage.findById(current.parentFolder);
        if (current) parentNames.unshift(current.folderName);
        else break;
      }
      folderPath = path.join(uploadsRoot, owner, ...parentNames, folderName);
    } else {
      folderPath = path.join(uploadsRoot, owner, folderName);
    }
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

    // Filter by access control (allowedUsers is now array of objects)
    const accessible = allFolders.filter(folder => {
      if (folder.visibility === 'public') return true;
      if (folder.owner === userId) return true;
      if (Array.isArray(folder.allowedUsers) && folder.allowedUsers.some(u => u.userId === userId)) return true;
      if (school && folder.allowedSchools?.includes(school)) return true;
      if (department && folder.allowedDepartments?.includes(department)) return true;
      return false;
    });

    // Convert owner and allowedUsers IDs to emails
    const getUserEmail = async (userId) => {
      try {
        const headers = {};
        // Use JWT token from request cookies or headers
        const token = req.cookies?.token || req.headers?.cookie?.split('token=')[1]?.split(';')[0];
        if (token) {
          headers['Cookie'] = `token=${token}`;
        } else {
          console.warn('No token found in request!');
        }
        const resp = await axios.get(`${process.env.USER_SERVICE_URL || 'http://localhost:3001'}/api/user/getUserEmail/${userId}`, { headers });
        return resp.data?.email || userId;
      } catch (err) {
        console.log('Error fetching user email:', err);
        return userId;
      }
    };

    // Map folders and convert IDs to emails, preserving role
    const result = await Promise.all(accessible.map(async folder => {
      const folderPath = path.join(process.cwd(), 'uploads', folder.owner, folder.folderName);
      let physicalFiles = [];
      if (fs.existsSync(folderPath)) {
        physicalFiles = fs.readdirSync(folderPath);
      }
      // Convert owner and allowedUsers
      const ownerEmail = await getUserEmail(folder.owner);
      const allowedUsersEmails = Array.isArray(folder.allowedUsers) && folder.allowedUsers.length
        ? await Promise.all(folder.allowedUsers.map(async u => {
            const email = await getUserEmail(u.userId);
            return { userId: u.userId, role: u.role, email };
          }))
        : [];
      return {
        _id: folder._id,
        folderName: folder.folderName,
        visibility: folder.visibility,
        allowedDepartments: folder.allowedDepartments || [],
        allowedSchools: folder.allowedSchools || [],
        allowedUsers: allowedUsersEmails,
        createdAt: folder.createdAt || null,
        updatedAt: folder.updatedAt || null,
        owner: ownerEmail,
        parentFolder: folder.parentFolder || null,
      };
    }));

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

    // Helper to get user email
    const getUserEmail = async (userId) => {
      try {
        const headers = {};
        const token = req.cookies?.token || req.headers?.cookie?.split('token=')[1]?.split(';')[0];
        if (token) {
          headers['Cookie'] = `token=${token}`;
        }
        const resp = await axios.get(`${process.env.USER_SERVICE_URL || 'http://localhost:3001'}/api/user/getUserEmail/${userId}`, { headers });
        return resp.data?.email || userId;
      } catch (err) {
        console.log('Error fetching user email:', err);
        return userId;
      }
    };

    // Map dbfiles to resolve owner and allowedUsers to emails
    const dbfiles = folder.files && folder.files.length
      ? await Promise.all(folder.files.map(async file => {
        // Convert to plain object to avoid Mongoose subdoc internals
        const plainFile = typeof file.toObject === 'function' ? file.toObject() : { ...file };
        const ownerEmail = plainFile.owner ? await getUserEmail(plainFile.owner) : (plainFile.uploadedBy ? await getUserEmail(plainFile.uploadedBy) : null);
        const allowedUsersEmails = Array.isArray(plainFile.allowedUsers) && plainFile.allowedUsers.length
          ? await Promise.all(plainFile.allowedUsers.map(async u => {
            const email = await getUserEmail(u.userId);
            return { ...u, email };
          }))
          : [];
        return {
          ...plainFile,
          owner: ownerEmail,
          allowedUsers: allowedUsersEmails
        };
      }))
      : [];

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
console.log(result)
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
    //  recursively update access for folder and all descendants, including files in folders
    const updateAccessRecursive = async (parentId) => {
      const queue = [parentId];
      while (queue.length) {
        const currentId = queue.shift();
        const folder = await Storage.findById(currentId);
        if (!folder) continue;
        // Update folder allowedUsers
        if (Array.isArray(allowedUsers)) {
          // Preserve grantedBy and emailOfGrantedBy if present
          const filtered = allowedUsers
            .filter(u => typeof u === 'object' && u.userId && u.role)
            .map(u => ({
              userId: u.userId,
              role: u.role,
              email: u.email,
              grantedBy: u.grantedBy,
              emailOfGrantedBy: u.emailOfGrantedBy,
              viaFiles: false
            }));
          folder.allowedUsers = filtered;
        }
        if (Array.isArray(allowedSchools)) {
          folder.allowedSchools = allowedSchools;
        }
        if (Array.isArray(allowedDepartments)) {
          folder.allowedDepartments = allowedDepartments;
        }

        // Recursively update allowedUsers and visibility for files in this folder
        if (Array.isArray(allowedUsers) && Array.isArray(folder.files)) {
          folder.files = folder.files.map(file => {
            // Preserve all viaFiles:true entries
            const fileAllowedUsers = Array.isArray(file.allowedUsers) ? file.allowedUsers.filter(u => u.viaFiles) : [];
            // Build a set of userIds that have viaFiles:true
            const viaFilesUserIds = new Set(fileAllowedUsers.map(u => u.userId));
            // Add folder allowedUsers (with viaFiles: false), but skip if userId already exists in viaFiles:true
            const folderAllowedUsers = allowedUsers
              .filter(u => typeof u === 'object' && u.userId && u.role && !viaFilesUserIds.has(u.userId))
              .map(u => ({
                userId: u.userId,
                role: u.role,
                email: u.email,
                grantedBy: u.grantedBy,
                emailOfGrantedBy: u.emailOfGrantedBy,
                viaFiles: false
              }));
            return {
              ...file,
              allowedUsers: [...fileAllowedUsers, ...folderAllowedUsers],
              visibility: folder.visibility // sync file visibility with folder
            };
          });
        }

        await folder.save();
        // Find children and add to queue
        const children = await Storage.find({ parentFolder: currentId });
        for (const child of children) {
          queue.push(child._id);
        }
      }
    };

    // Get the previous allowedUsers list before update
    const folderBeforeUpdate = await Storage.findById(folderId);
    // Build a map of previous allowedUsers: { userId: role }
    const prevAllowedUsersMap = {};
    if (Array.isArray(folderBeforeUpdate?.allowedUsers)) {
      for (const u of folderBeforeUpdate.allowedUsers) {
        if (u.userId) prevAllowedUsersMap[u.userId.toString()] = u.role;
      }
    }

    await updateAccessRecursive(folderId);
    const updatedFolder = await Storage.findById(folderId);

    // Send notification emails only to users not already in the previous allowedUsers
    if (Array.isArray(allowedUsers) && allowedUsers.length) {
      const mailServiceUrl = process.env.EMAIL_SERVICE_URL || 'http://localhost:3005';
      let folderName = updatedFolder?.folderName || 'a folder';
      // Determine the default grantedBy (display name) and emailOfGrantedBy (email address)
      let defaultGrantedBy = 'an administrator';
      let emailOfGrantedBy = '';
      if (req.user) {
        if (req.user.name) {
          defaultGrantedBy = req.user.name;
        }
        if (req.user.email) {
          emailOfGrantedBy = req.user.email;
          if (!req.user.name) {
            defaultGrantedBy = req.user.email;
          }
        }
      }
      if (req.body.grantedBy) {
        defaultGrantedBy = req.body.grantedBy;
      }
      if (req.body.emailOfGrantedBy) {
        emailOfGrantedBy = req.body.emailOfGrantedBy;
      }
      for (const user of allowedUsers) {
        // Only send if user is new or their role has changed
        const prevRole = user.userId ? prevAllowedUsersMap[user.userId?.toString()] : undefined;
        const isNewUser = !prevRole;
        const isRoleChanged = prevRole && user.role && user.role !== prevRole;
        if (user.email && (isNewUser || isRoleChanged)) {
          const grantedBy = user.grantedBy || defaultGrantedBy;
          const emailGrantedBy = user.emailOfGrantedBy || emailOfGrantedBy;
          try {
            await axios.post(`${mailServiceUrl}/api/email/send-access`, {
              to: user.email,
              subject: 'You have been granted access to a folder',
              template: 'folderAccess',
              templateData: {
                folderName,
                grantedBy,
                emailOfGrantedBy: emailGrantedBy,
                folderLink: null,
                role: user.role || null
              }
            });
          } catch (mailErr) {
            console.error('Failed to send notification email to', user.email, mailErr.message);
          }
        }
      }
    }

    res.status(200).json({ message: 'Access control updated recursively.', folder: updatedFolder });
  } catch (err) {
    console.error('Error updating access control:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Add or replace access to a file (orphan or in folder)
 * @route PATCH /api/files/share-access
 * @param {*} req
 * @param {*} res
 * @returns
 */
export const addAccessToFile = async (req, res) => {
  try {
  const { fileId, folderId, allowedUsers, visibility } = req.body;
    if (!fileId) {
      return res.status(400).json({ message: 'fileId is required.' });
    }
    let fileDoc;
    let parentFolder = null;
    if (folderId) {
      // File inside a folder
      parentFolder = await Storage.findById(folderId);
      if (!parentFolder) {
        return res.status(404).json({ message: 'Parent folder not found.' });
      }
      fileDoc = parentFolder.files.find(f => f._id.toString() === fileId);
      if (!fileDoc) {
        return res.status(404).json({ message: 'File not found in folder.' });
      }
    } else {
      // Orphan file
      fileDoc = await File.findById(fileId);
      if (!fileDoc) {
        return res.status(404).json({ message: 'File not found.' });
      }
    }

    // Build a map of previous allowedUsers: { userId: role }
    const prevAllowedUsersMap = {};
    if (Array.isArray(fileDoc.allowedUsers)) {
      for (const u of fileDoc.allowedUsers) {
        if (u.userId) prevAllowedUsersMap[u.userId.toString()] = u.role;
      }
    }

    // Update allowedUsers
    if (Array.isArray(allowedUsers)) {
      const filtered = allowedUsers
        .filter(u => typeof u === 'object' && u.userId && u.role)
        .map(u => ({
          userId: u.userId,
          role: u.role,
          email: u.email,
          grantedBy: u.grantedBy,
          emailOfGrantedBy: u.emailOfGrantedBy
        }));
      fileDoc.allowedUsers = filtered;
    }
    // Update visibility if provided
    if (typeof visibility === 'string') {
      fileDoc.visibility = visibility;
    }

    // Save changes
    if (folderId && parentFolder) {
      // Update file in parent folder's files array
      parentFolder.files = parentFolder.files.map(f => f._id.toString() === fileId ? fileDoc : f);
      await parentFolder.save();
    } else {
      await fileDoc.save();
    }

    // Send notification emails only to users not already in the previous allowedUsers
    if (Array.isArray(allowedUsers) && allowedUsers.length) {
      const mailServiceUrl = process.env.EMAIL_SERVICE_URL || 'http://localhost:3005';
      let fileName = fileDoc.originalName || fileDoc.filename || 'a file';
      // Determine the default grantedBy (display name) and emailOfGrantedBy (email address)
      let defaultGrantedBy = 'an administrator';
      let emailOfGrantedBy = '';
      if (req.user) {
        if (req.user.name) {
          defaultGrantedBy = req.user.name;
        }
        if (req.user.email) {
          emailOfGrantedBy = req.user.email;
          if (!req.user.name) {
            defaultGrantedBy = req.user.email;
          }
        }
      }
      if (req.body.grantedBy) {
        defaultGrantedBy = req.body.grantedBy;
      }
      if (req.body.emailOfGrantedBy) {
        emailOfGrantedBy = req.body.emailOfGrantedBy;
      }
      for (const user of allowedUsers) {
        // Only send if user is new or their role has changed
        const prevRole = user.userId ? prevAllowedUsersMap[user.userId?.toString()] : undefined;
        const isNewUser = !prevRole;
        const isRoleChanged = prevRole && user.role && user.role !== prevRole;
        if (user.email && (isNewUser || isRoleChanged)) {
          const grantedBy = user.grantedBy || defaultGrantedBy;
          const emailGrantedBy = user.emailOfGrantedBy || emailOfGrantedBy;
          try {
            await axios.post(`${mailServiceUrl}/api/email/send-access`, {
              to: user.email,
              subject: 'You have been granted access to a file',
              template: 'fileAccess',
              templateData: {
                fileName,
                grantedBy,
                emailOfGrantedBy: emailGrantedBy,
                fileLink: null,
                role: user.role || null
              }
            });
          } catch (mailErr) {
            console.error('Failed to send notification email to', user.email, mailErr.message);
          }
        }
      }
    }

    res.status(200).json({ message: 'File access updated.', file: fileDoc });
  } catch (err) {
    console.error('Error updating file access:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
/**
 * Delete Folder by ID (recursive)
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
    const uploadsRoot = path.join(process.cwd(), 'uploads');
    await deleteFolderRecursive(id, uploadsRoot);
    res.status(200).json({ message: 'Folder and all contents deleted.' });
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
    // Build the full nested path for the folder
    let parentNames = [];
    let current = folder;
    while (current.parentFolder) {
      current = await Storage.findById(current.parentFolder);
      if (current) parentNames.unshift(current.folderName);
      else break;
    }
    for (const file of uploadedFiles) {
      try {
        const meta = await saveDocumentFile({
          file,
          documentId: file.documentId || undefined,
          owner: owner,
          folderName: parentNames.length > 0 ? [...parentNames, folder.folderName].join(path.sep) : folder.folderName,
          uploaded_by: req.body.user_id
        });
        // Inherit allowedUsers and visibility from folder for non-orphan files
        meta.allowedUsers = Array.isArray(folder.allowedUsers) ? folder.allowedUsers.map(u => ({ ...u })) : [];
        meta.visibility = folder.visibility || 'private';
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
    // req.files is populated by multer middleware

    const uploadedFiles = req.files;
    // Always use user_id as owner for orphan files
    const owner = req.body.user_id || req.body.owner || null;
    if (!owner) {
      return res.status(400).json({ message: 'user_id (owner) is required.' });
    }
    if (!Array.isArray(uploadedFiles) || uploadedFiles.length === 0) {
      return res.status(400).json({ message: 'Files are required.' });
    }

    // Use saveDocumentFile for each file and collect the file metadata
    const fileMetadatas = [];
    for (const file of uploadedFiles) {
      try {
        const meta = await saveDocumentFile({
          file,
          documentId: file.documentId || undefined,
          owner: owner,
          uploaded_by: req.body.user_id
        });
        fileMetadatas.push(meta);
      } catch (err) {
        console.error('Error uploading orphan document:', err);
      }
    }

    // Save each orphan file as a separate File document
    const createdFiles = [];
    for (const meta of fileMetadatas) {
      const fileDoc = new File(meta);
      await fileDoc.save();
      createdFiles.push(fileDoc);
    }

    res.status(200).json({ message: 'Orphan files uploaded successfully.', files: createdFiles });
  } catch (err) {
    console.error('Error uploading orphan file:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Get orphan files for a user (files not in any folder)
 * @route GET /api/storage/orphan-files?userId=xxx
 * @param {*} req
 * @param {*} res
 * @returns
 */
export const getOrphanFiles = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }
    // Find all File documents where owner/user_id matches and not linked to a folder
    const orphanFiles = await File.find({ uploadedBy: userId });

    // Convert owner and allowedUsers IDs to emails
    const getUserEmail = async (userId) => {
      try {
        const headers = {};
        // Use JWT token from request cookies or headers
        const token = req.cookies?.token || req.headers?.cookie?.split('token=')[1]?.split(';')[0];
        if (token) {
          headers['Cookie'] = `token=${token}`;
        } else {
          console.warn('No token found in request!');
        }
        const resp = await axios.get(`${process.env.USER_SERVICE_URL || 'http://localhost:3001'}/api/user/getUserEmail/${userId}`, { headers });
        return resp.data?.email || userId;
      } catch (err) {
        console.log('Error fetching user email:', err);
        return userId;
      }
    };

    // Map files and convert IDs to emails, preserving role
    const result = await Promise.all(orphanFiles.map(async file => {
      const ownerEmail = file.owner ? await getUserEmail(file.owner) : (file.uploadedBy ? await getUserEmail(file.uploadedBy) : null);
      const allowedUsersEmails = Array.isArray(file.allowedUsers) && file.allowedUsers.length
        ? await Promise.all(file.allowedUsers.map(async u => {
            const email = await getUserEmail(u.userId);
            return { userId: u.userId, role: u.role, email };
          }))
        : [];
      return {
        ...file.toObject(),
        owner: ownerEmail,
        allowedUsers: allowedUsersEmails
      };
    }));

    res.status(200).json({ message: 'Orphan files fetched successfully.', files: result });
  } catch (err) {
    console.error('Error fetching orphan files:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
/**
 * @route PATCH /api/storage/move-folder
 * @param {*} req
 * @param {*} res
 * @returns
 */
export const moveFolder = async (req, res) => {
  try {
    const { folderId, newParentId } = req.body;
    if (!folderId) {
      return res.status(400).json({ message: 'folderId is required.' });
    }

    const folder = await Storage.findById(folderId);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found.' });
    }

    //  Move physical folder on disk 
    const uploadsRoot = path.join(process.cwd(), 'uploads');
    // Get current physical path
    let oldParentNames = [];
    let current = folder;
    while (current.parentFolder) {
      current = await Storage.findById(current.parentFolder);
      if (current) oldParentNames.unshift(current.folderName);
      else break;
    }
    const oldPath = path.join(uploadsRoot, folder.owner, ...oldParentNames, folder.folderName);

    // Set new parentFolder and build new path
    let newPath;
    if (!newParentId) {
      folder.parentFolder = null;
      newPath = path.join(uploadsRoot, folder.owner, folder.folderName);
    } else {
      const newParent = await Storage.findById(newParentId);
      if (!newParent) {
        return res.status(404).json({ message: 'New parent folder not found.' });
      }
      folder.parentFolder = newParent._id;
      // Build new parent path
      let newParentNames = [newParent.folderName];
      let temp = newParent;
      while (temp.parentFolder) {
        temp = await Storage.findById(temp.parentFolder);
        if (temp) newParentNames.unshift(temp.folderName);
        else break;
      }
      newPath = path.join(uploadsRoot, folder.owner, ...newParentNames, folder.folderName);
    }

    // Move the folder on disk if it exists and the path is changing
    if (oldPath !== newPath && fs.existsSync(oldPath)) {
      // Ensure new parent directory exists
      const newParentDir = path.dirname(newPath);
      if (!fs.existsSync(newParentDir)) {
        fs.mkdirSync(newParentDir, { recursive: true });
      }
      fs.renameSync(oldPath, newPath);
    }

    await folder.save();
    res.status(200).json({ message: 'Folder moved successfully.' });
  } catch (err) {
    console.error('Error moving folder:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * @route PATCH /api/storage/move-file
 * @param {*} req
 * @param {*} res
 * @returns
 * Moves a file (orphan or in folder) to a new folder (or to orphan/root)
 */
export const moveFile = async (req, res) => {
  try {
    const { fileId, newFolderId } = req.body;
    if (!fileId) {
      return res.status(400).json({ message: 'fileId is required.' });
    }

    // Find the file (could be orphan or in a folder)
    let fileDoc = await File.findById(fileId);
    let isOrphan = !!fileDoc;
    let oldFolder = null;
    if (!fileDoc) {
      // Try to find in folders
      oldFolder = await Storage.findOne({ 'files._id': fileId });
      if (!oldFolder) {
        return res.status(404).json({ message: 'File not found.' });
      }
      fileDoc = oldFolder.files.find(f => f._id.toString() === fileId);
      if (!fileDoc) {
        return res.status(404).json({ message: 'File not found in folder.' });
      }
    }

    // Find the new folder (if any)
    let newFolder = null;
    if (newFolderId) {
      newFolder = await Storage.findById(newFolderId);
      if (!newFolder) {
        return res.status(404).json({ message: 'Destination folder not found.' });
      }
    }

    // Move the physical file if needed
    if (fileDoc.path && fs.existsSync(fileDoc.path)) {
      // Build new path
      let newFilePath;
      if (newFolder) {
        // Build nested path for new folder
        let parentNames = [newFolder.folderName];
        let current = newFolder;
        while (current.parentFolder) {
          current = await Storage.findById(current.parentFolder);
          if (current) parentNames.unshift(current.folderName);
          else break;
        }
        const uploadsRoot = path.join(process.cwd(), 'uploads');
        const destDir = path.join(uploadsRoot, newFolder.owner, ...parentNames);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        newFilePath = path.join(destDir, path.basename(fileDoc.path));
      } else {
        // Orphan: uploads/owner/
        const uploadsRoot = path.join(process.cwd(), 'uploads');
        const destDir = path.join(uploadsRoot, fileDoc.owner || fileDoc.uploadedBy);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        newFilePath = path.join(destDir, path.basename(fileDoc.path));
      }
      if (fileDoc.path !== newFilePath) {
        fs.renameSync(fileDoc.path, newFilePath);
      }
      //  set path to relative (from project root, forward slashes)
      const relPath = path.relative(process.cwd(), newFilePath).replace(/\\/g, '/');
      fileDoc.path = relPath;
    }

    // Remove from old location (if in folder)
    if (!isOrphan && oldFolder) {
      oldFolder.files = oldFolder.files.filter(f => f._id.toString() !== fileId);
      await oldFolder.save();
    }

    // Add to new folder or orphan
    if (newFolder) {
      // Add to new folder's files array
      newFolder.files.push(fileDoc);
      await newFolder.save();
      // Remove orphan file doc if it exists
      if (isOrphan) {
        await File.findByIdAndDelete(fileId);
      }
    } else {
      // Move to orphan: create File doc if not already
      if (!isOrphan) {
        const orphanFile = new File(fileDoc);
        await orphanFile.save();
      }
    }

    res.status(200).json({ message: 'File moved successfully.' });
  } catch (err) {
    console.error('Error moving file:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/*
  * Rename a folder
   * @route PATCH /api/storage/rename-folder
  * @param {*} req
  * @param {*} res
  * @returns
  */
export const renameFolder = async (req, res) => {
  try {
    const { folderId, newName } = req.body;
    if (!folderId || !newName) {
      return res.status(400).json({ message: 'folderId and newName are required.' });
    }
    const folder = await Storage.findById(folderId);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found.' });
    } 
    const oldName = folder.folderName;
    if (oldName === newName) {
      return res.status(400).json({ message: 'New name is the same as the current name.' });
    }
    // Check for duplicate folder name under same parent
    const query = { folderName: newName, owner: folder.owner };
    if (folder.parentFolder) query.parentFolder = folder.parentFolder;
    const existing = await Storage.findOne(query);
    if (existing) {
      return res.status(409).json({ message: 'A folder with the new name already exists in this location.' });
    }

    // Rename physical folder on disk
    const uploadsRoot = path.join(process.cwd(), 'uploads');
    let parentNames = [];
    let current = folder;
    while (current.parentFolder) {
      current = await Storage.findById(current.parentFolder);
      if (current) parentNames.unshift(current.folderName);
      else break;
    }
    // Build old and new folder paths
    const oldPath = path.join(uploadsRoot, folder.owner, ...parentNames, oldName);
    const newPath = path.join(uploadsRoot, folder.owner, ...parentNames, newName);
    // Rename on disk if exists and name is changing
    if (oldPath !== newPath && fs.existsSync(oldPath)) {
      try {
        fs.renameSync(oldPath, newPath);
      } catch (err) {
        return res.status(500).json({ message: 'Failed to rename folder on disk.', error: err.message });
      }
    }
    // Update DB
    folder.folderName = newName;
    await folder.save();
    return res.status(200).json({ message: 'Folder renamed successfully.', folder });
  } catch (err) {
    console.error('Error renaming folder:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};


/**
 * Rename a file (orphan or in folder)
 * @route PATCH /api/storage/rename-file
 * @param {*} req
 * @param {*} res
 * @returns
 */
export const renameFile = async (req, res) => {
  try {
    const { fileId, newName, folderId } = req.body;
    if (!fileId || !newName) {
      return res.status(400).json({ message: 'fileId and newName are required.' });
    }
    let fileDoc;
    let oldName;
    let filePath;
    let newFilePath;
    if (folderId) {
      // File inside a folder
      const folder = await Storage.findById(folderId);
      if (!folder) {
        return res.status(404).json({ message: 'Folder not found.' });
      }
      console.log('Folder files:', folder.files);
      fileDoc = folder.files.find(f => f._id.toString() === fileId);
      if (!fileDoc) {
        return res.status(404).json({ message: 'File not found in folder.' });
      }
      oldName = fileDoc.originalName || fileDoc.filename || fileDoc.name;
      // Check for duplicate name in folder
      if (folder.files.some(f => (f._id.toString() !== fileId && (f.originalName || f.filename || f.name) === newName))) {
        return res.status(409).json({ message: 'A file with the new name already exists in this folder.' });
      }
      // Build file path
      let parentNames = [folder.folderName];
      let current = folder;
      while (current.parentFolder) {
        current = await Storage.findById(current.parentFolder);
        if (current) parentNames.unshift(current.folderName);
        else break;
      }
      const uploadsRoot = path.join(process.cwd(), 'uploads');
      const folderPath = path.join(uploadsRoot, folder.owner, ...parentNames);
      filePath = fileDoc.path ? path.join(process.cwd(), fileDoc.path) : path.join(folderPath, oldName);
      newFilePath = path.join(folderPath, newName);
    } else {
      // Orphan file
      fileDoc = await File.findById(fileId);
      if (!fileDoc) {
        return res.status(404).json({ message: 'File not found.' });
      }
      oldName = fileDoc.originalName || fileDoc.filename || fileDoc.name;
      // Check for duplicate name among orphan files for owner
      const owner = fileDoc.owner || fileDoc.uploadedBy;
      const uploadsRoot = path.join(process.cwd(), 'uploads');
      const orphanDir = path.join(uploadsRoot, owner);
      filePath = fileDoc.path ? path.join(process.cwd(), fileDoc.path) : path.join(orphanDir, oldName);
      newFilePath = path.join(orphanDir, newName);
      const duplicate = await File.findOne({ owner, originalName: newName });
      if (duplicate && duplicate._id.toString() !== fileId) {
        return res.status(409).json({ message: 'A file with the new name already exists.' });
      }
    }
  //  update DB
  fileDoc.originalName = newName;
  // Do not change filename or path
    if (folderId) {
      // Save parent folder
      const folderToUpdate = await Storage.findById(folderId);
      if (folderToUpdate) {
        const updatedFiles = folderToUpdate.files.map(f => f._id.toString() === fileDoc._id.toString() ? fileDoc : f);
        folderToUpdate.files = updatedFiles;
        await folderToUpdate.save();
      }
    } else {
      await fileDoc.save();
    }
    return res.status(200).json({ message: 'File renamed successfully.', file: fileDoc });
  } catch (err) {
    console.error('Error renaming file:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};