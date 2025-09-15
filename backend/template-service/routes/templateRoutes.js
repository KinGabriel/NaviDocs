import express from "express";
import { dashboardInfo, 
        createTemplate, 
        getTemplates, 
        getTemplateById, 
        updateTemplate, 
        deleteTemplate,
        addTemplateNote,
        adjustTemplateDeadline, 
        approveTemplate,
        submitTemplate,
        returnTemplate,
        rejectTemplate, 
        publishTemplate,
        assignUsersToCreateTemplate,
        assignControllersToTemplate } from "../controllers/templateController.js";
import { authenticateJWT } from "../middleware/authenticationMiddleware.js"; 

const router = express.Router();


router.post("/assign-controllers", authenticateJWT, assignControllersToTemplate);
router.post("/create-template", authenticateJWT, createTemplate);

router.get("/", authenticateJWT, getTemplates);
router.post("/assign", authenticateJWT, assignUsersToCreateTemplate);
router.get("/dashboard-info", authenticateJWT, dashboardInfo);
router.get("/:id", authenticateJWT, getTemplateById);
router.put("/:id", authenticateJWT, updateTemplate);
router.patch("/:id/approve", authenticateJWT, approveTemplate);
router.patch("/:id/publish", authenticateJWT, publishTemplate);
router.patch("/:id/submit", authenticateJWT, submitTemplate);
router.patch("/:id/return", authenticateJWT, returnTemplate);
router.patch("/:id/reject", authenticateJWT, rejectTemplate);
router.patch("/:id/add-note", authenticateJWT, addTemplateNote);
router.patch("/:id/adjust-deadline", authenticateJWT, adjustTemplateDeadline);
router.delete("/:id", authenticateJWT, deleteTemplate);


export default router;
