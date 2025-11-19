import Storage from '../models/storageModel.js';
import fs from 'fs';
import path from 'path';

/**
 * Recursively delete a folder and its contents from DB and disk
 * @param {string} folderId - The ID of the folder to delete
 * @param {string} uploadsRoot - The root uploads directory
 */
export async function deleteFolderRecursive(folderId, uploadsRoot) {
  const folder = await Storage.findById(folderId);
  if (!folder) return;

  // Delete all files in this folder (DB and disk)
  for (const file of folder.files || []) {
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  }

  // Recursively delete subfolders
  const subfolders = await Storage.find({ parentFolder: folderId });
  for (const sub of subfolders) {
    await deleteFolderRecursive(sub._id, uploadsRoot);
  }

  // Delete physical folder
  let parentNames = [];
  let current = folder;
  while (current.parentFolder) {
    current = await Storage.findById(current.parentFolder);
    if (current) parentNames.unshift(current.folderName);
    else break;
  }
  const folderPath = path.join(uploadsRoot, folder.owner, ...parentNames, folder.folderName);
  if (fs.existsSync(folderPath)) {
    fs.rmSync(folderPath, { recursive: true, force: true });
  }

  // Delete folder from DB
  await Storage.findByIdAndDelete(folderId);
}
