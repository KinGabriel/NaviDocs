import { createFolder, getFolder, addAccessToFolders,addAccessToFile, getFolderByID, deleteFolderByID, addDocuments, deleteFile, addOrphanFile, getOrphanFiles, moveFolder, moveFile, renameFolder, renameFile } from "../controllers/storageController.js";
import { authenticateJWT } from "../middleware/authenticationMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";
import { canModifyFolder, canModifyFile } from "../middleware/authorizationMiddleware.js";
import express from "express";

const router = express.Router();

// Folder routes
router.post("/create-folder",authenticateJWT, canModifyFolder,createFolder);             
router.get("/folders", authenticateJWT,getFolder);                                       
router.post("/folders/share", authenticateJWT, canModifyFolder, addAccessToFolders);       
router.get("/folders/:id", authenticateJWT, getFolderByID);
router.delete("/folders/:id", authenticateJWT, canModifyFolder, deleteFolderByID);        
router.post("/folders/:id/files", authenticateJWT, canModifyFolder, upload.array("files"), addDocuments); 
router.delete("/folders/:folderId/files/:fileId", authenticateJWT, canModifyFile, deleteFile);        

// File routes
router.delete("/files/:fileId", authenticateJWT, canModifyFile, deleteFile);               
router.post("/files/upload-orphan", authenticateJWT, upload.array("files"), addOrphanFile); 
router.get("/files/get-orphan-files", authenticateJWT, getOrphanFiles);                  
router.patch("/files/share-access", authenticateJWT, canModifyFile, addAccessToFile);     

//  Move & Rename
router.patch("/folders/move-folder", authenticateJWT, canModifyFolder, moveFolder);
router.patch("/files/move-file", authenticateJWT, canModifyFile, moveFile);
router.patch("/folders/rename-folder", authenticateJWT, canModifyFolder, renameFolder);
router.patch("/files/rename-file", authenticateJWT, canModifyFile, renameFile);
export default router;
