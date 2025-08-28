import { createFolder,getFolder,addAccessToFolders,getFolderByID,deleteFolderByID } from "../controllers/storageController.js";
import { authenticateJWT } from "../middleware/authenticationMiddleware.js"; 
import express from "express";

const router = express.Router();

router.post("/create-folder", createFolder);
router.get("/folders", getFolder);
router.post("/folders/share", addAccessToFolders);
router.get('/folders/:id', getFolderByID);
router.delete('/folders/:id', deleteFolderByID);

export default router;