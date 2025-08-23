import express from "express";
import multer from "multer";
import { createUser, getUsers, getDashboardInfo,archiveUser,unarchiveUser } from "../controllers/adminController.js";
import { authenticateJWT } from "../middleware/authenticationMiddleware.js"; 
import { authorizeAdmin } from "../middleware/authorizationMiddleware.js";

const router = express.Router();

//  multer for memory storage (files sent to File Service)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for profile pictures'), false);
    }
  }
});

// Admin routes
router.post("/create-user", 
  authenticateJWT, 
  authorizeAdmin, 
  upload.single("profile_picture"),
  createUser
);

router.get("/get-users", 
  authenticateJWT, 
  authorizeAdmin, 
  getUsers
);

router.get("/dashboard-info", 
  authenticateJWT, 
  authorizeAdmin, 
  getDashboardInfo
);

router.patch("/archive-user/:id", 
  authenticateJWT, 
  authorizeAdmin, 
  archiveUser
);

router.patch("/unarchive-user/:id", 
  authenticateJWT, 
  authorizeAdmin, 
  unarchiveUser
);

export default router;