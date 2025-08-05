import express from "express";
import { createTemplate, getTemplates, getTemplateById } from "../controllers/templateController.js";
import { authenticateJWT } from "../middleware/authenticationMiddleware.js"; 

const router = express.Router();

router.post("/create-template", createTemplate);
router.get("/", getTemplates);
router.get("/:id", authenticateJWT, getTemplateById);

export default router;
