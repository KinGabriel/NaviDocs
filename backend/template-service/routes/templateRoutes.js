import express from "express";
import { dashboardInfo, createTemplate, getTemplates, getTemplateById, updateTemplate, deleteTemplate, approveTemplate, publishTemplate,assignUsersToCreateTemplate } from "../controllers/templateController.js";
import { authenticateJWT } from "../middleware/authenticationMiddleware.js"; 

const router = express.Router();

router.post("/create-template", authenticateJWT, createTemplate);

router.get("/", authenticateJWT, getTemplates);
router.post("/assign", authenticateJWT, assignUsersToCreateTemplate);
router.get("/dashboard-info", authenticateJWT, dashboardInfo);
router.get("/:id", authenticateJWT, getTemplateById);
router.put("/:id", authenticateJWT, updateTemplate);
router.post("/:id/approve", authenticateJWT, approveTemplate);
router.post("/:id/publish", authenticateJWT, publishTemplate);
router.delete("/:id", authenticateJWT, deleteTemplate);


export default router;
