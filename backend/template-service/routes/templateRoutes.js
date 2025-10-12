import express from "express";
import { authenticateJWT } from "../middleware/authenticationMiddleware.js";
import {
        createTemplate,
        updateTemplate,
        deleteTemplate,
        getTemplateById,
        getTemplates,
        getTemplatesByUser,
        getPublishedTemplates,
        duplicateTemplate,
        renameTemplate
} from "../controllers/templateFunctionalitiesController.js";


import {
        dashboardInfo,
        getTemplateStats
} from "../controllers/templateDataController.js";

import {
        assignUsersToCreateTemplate,
        assignControllersToTemplate,
        adjustTemplateDeadline,
        addTemplateNote,
        approveTemplate,
        rejectTemplate,
        submitTemplate,
        unsubmitTemplate,
        returnTemplate,
        publishTemplate,
        unpublishTemplate,
        insertDocumentCode
} from "../controllers/templateWorkflowController.js";

import {
        listTemplateVersions,
        getTemplateVersion,
        updateTemplateVersionNote,
        updateTemplateVersionBookmark,
        restoreTemplateVersion
} from '../controllers/templateVersionController.js';

const router = express.Router();

router.post("/assign-controllers", authenticateJWT, assignControllersToTemplate);
router.post("/create-template", authenticateJWT, createTemplate);
router.get("/", authenticateJWT, getTemplates);
router.post("/assign", authenticateJWT, assignUsersToCreateTemplate);
router.get("/dashboard-info", authenticateJWT, dashboardInfo);
router.get("/stats", authenticateJWT, getTemplateStats);
router.get("/published", authenticateJWT, getPublishedTemplates);
router.get("/user/:userId", authenticateJWT, getTemplatesByUser);
router.get("/:id", authenticateJWT, getTemplateById);
router.get('/:id/versions', authenticateJWT, listTemplateVersions);
router.get('/:id/versions/:versionId', authenticateJWT, getTemplateVersion);
router.patch('/:id/versions/:versionId/note', authenticateJWT, updateTemplateVersionNote);
router.patch('/:id/versions/:versionId/bookmark', authenticateJWT, updateTemplateVersionBookmark);
router.post('/:id/versions/:versionId/restore', authenticateJWT, restoreTemplateVersion);
router.put("/:id", authenticateJWT, updateTemplate);
router.patch("/:id/approve", authenticateJWT, approveTemplate);
router.patch("/:id/publish", authenticateJWT, publishTemplate);
router.patch("/:id/unpublish", authenticateJWT, unpublishTemplate);
router.patch("/:id/submit", authenticateJWT, submitTemplate);
router.patch("/:id/unsubmit", authenticateJWT, unsubmitTemplate);
router.patch("/:id/return", authenticateJWT, returnTemplate);
router.patch("/:id/reject", authenticateJWT, rejectTemplate);
router.patch("/:id/add-note", authenticateJWT, addTemplateNote);
router.patch("/:id/adjust-deadline", authenticateJWT, adjustTemplateDeadline);
router.delete("/:id", authenticateJWT, deleteTemplate);
router.patch("/:id/insert-document-code", authenticateJWT, insertDocumentCode);
router.patch("/:id/rename", authenticateJWT, renameTemplate);
router.post("/:id/duplicate", authenticateJWT, duplicateTemplate);

export default router;
