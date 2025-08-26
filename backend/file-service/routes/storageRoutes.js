import { createFolder,getFolder } from "../controllers/storageController.js";
import { authenticateJWT } from "../middleware/authenticationMiddleware.js"; 
import express from "express";

const router = express.Router();

router.post("/create-folder", createFolder);
router.get("/folders", getFolder);

export default router;