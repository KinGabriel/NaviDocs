import express from "express";
import { createUser,loginUser } from "../controllers/userController.js";
import { authenticateJWT } from "../middleware/authenticationMiddleware.js"; 

const router = express.Router();

router.post("/register", createUser);
router.post("/login", loginUser);

export default router;