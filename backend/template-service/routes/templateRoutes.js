import express from "express";
import { dashboardInfo,createTemplate, getTemplates, getTemplateById, updateTemplate, deleteTemplate } from "../controllers/templateController.js";
import { authenticateJWT } from "../middleware/authenticationMiddleware.js"; 

const router = express.Router();

router.post("/create-template", authenticateJWT, createTemplate);
router.get("/", authenticateJWT, getTemplates);
router.get("/dashboard-info", authenticateJWT, dashboardInfo);
router.get("/:id", authenticateJWT, getTemplateById);
router.put("/:id", authenticateJWT, updateTemplate);
router.delete("/:id", authenticateJWT, deleteTemplate);

export default router;
