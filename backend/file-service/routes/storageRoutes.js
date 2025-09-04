import { createFolder, getFolder, addAccessToFolders, getFolderByID, deleteFolderByID, addDocuments, deleteFile, addOrphanFile, getOrphanFiles, moveFolder, moveFile, renameFolder, renameFile } from "../controllers/storageController.js";
import { authenticateJWT } from "../middleware/authenticationMiddleware.js";
import { upload } from "../middleware/uploadmiddleware.js";
import express from "express";

const router = express.Router();



// Folder routes
router.post("/create-folder", createFolder);
router.get("/folders", getFolder);
router.post("/folders/share", addAccessToFolders);
router.get('/folders/:id', getFolderByID);
router.delete('/folders/:id', deleteFolderByID);
router.post('/folders/:id/files', upload.array('files'), addDocuments);
router.delete('/folders/:folderId/files/:fileId', deleteFile);
router.delete('/files/:fileId', deleteFile);
router.post('/files/upload-orphan', upload.array('files'), addOrphanFile);
router.get('/files/get-orphan-files', getOrphanFiles);
router.post('/folders/move-folder', moveFolder);
router.post('/files/move-file', moveFile);
router.patch('/folders/rename-folder', renameFolder);
router.patch('/files/rename-file', renameFile);
export default router;
