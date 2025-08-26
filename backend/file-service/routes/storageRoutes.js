import { createFolder } from "../controllers/storageController.js";
import { authenticateJWT } from "../middleware/authenticationMiddleware.js"; 
import express from "express";

const router = express.Router();

router.post("/create-folder", authenticateJWT, createFolder);

export default router;