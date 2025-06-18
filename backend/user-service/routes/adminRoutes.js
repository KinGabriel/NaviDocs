import express from "express";
import { createUser, getUsers,getDashboardInfo } from "../controllers/adminController.js";
import { authenticateJWT } from "../middleware/authenticationMiddleware.js"; 
 
const router = express.Router();

router.post("/crete-user", createUser);
router.get("/get-users", authenticateJWT, getUsers);
router.get("/dashboard-info",authenticateJWT, getDashboardInfo);
export default router;