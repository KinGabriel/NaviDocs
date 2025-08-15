import express from "express";
import {} from "../controllers/analyticsController.js";
import { authenticateJWT } from "../middleware/authenticationMiddleware.js"; 

const router = express.Router();


export default router