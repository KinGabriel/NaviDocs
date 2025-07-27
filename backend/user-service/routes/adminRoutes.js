import express from "express";
import { createUser, getUsers, getDashboardInfo } from "../controllers/adminController.js";
import { authenticateJWT } from "../middleware/authenticationMiddleware.js"; 
import { authorizeAdmin } from "../middleware/authorizationMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js"; 

const router = express.Router();

router.post("/create-user", authenticateJWT, authorizeAdmin, upload.single("profile_picture"), createUser);
router.get("/get-users", authenticateJWT, authorizeAdmin, getUsers);
router.get("/dashboard-info", authenticateJWT, authorizeAdmin, getDashboardInfo);

export default router;