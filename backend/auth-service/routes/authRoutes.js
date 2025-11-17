import express from "express";
import { loginUser, logoutUser, getLoginLogs, requestPasswordReset, resetPasswordWithOtp, exportLoginLogs, deleteLoginLogs } from "../controllers/authController.js";
import { authenticateJWT } from "../middleware/authenticationMiddleware.js"; 
import User from "../models/authModel.js";

const router = express.Router();

router.post("/login", loginUser);
router.post("/logout", authenticateJWT, logoutUser);
router.get("/logs", authenticateJWT, getLoginLogs);
router.get("/logs/export", authenticateJWT, exportLoginLogs);
router.post("/logs/delete", authenticateJWT, deleteLoginLogs);
router.get("/verify", authenticateJWT, async (req, res) => {
  try {
    // Fetch fresh user data from database to get updated profile picture
    const user = await User.findById(req.user.id || req.user._id).select('_id email firstname lastname role profile_picture');
    if (!user || user.is_deleted) {
      return res.status(401).json({ message: "User not found or deleted" });
    }
    
    res.json({ 
      message: "Token is valid", 
      user: {
        _id: user._id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role,
        profile_picture: user.profile_picture
      }
    });
  } catch (err) {
    console.error("Verify session error:", err);
    res.status(500).json({ message: "Failed to verify session" });
  }
});

// Forgot password (OTP)
router.post("/forgot-password/request", requestPasswordReset);
// Resend can reuse request endpoint with cooldown enforcement
router.post("/forgot-password/resend", requestPasswordReset);
router.post("/forgot-password/reset", resetPasswordWithOtp);

export default router;