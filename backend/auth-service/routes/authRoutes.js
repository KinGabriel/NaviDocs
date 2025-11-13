import express from "express";
import { loginUser, logoutUser, getLoginLogs, requestPasswordReset, resetPasswordWithOtp, exportLoginLogs, deleteLoginLogs } from "../controllers/authController.js";
import { authenticateJWT } from "../middleware/authenticationMiddleware.js"; 

const router = express.Router();

router.post("/login", loginUser);
router.post("/logout", authenticateJWT, logoutUser);
router.get("/logs", authenticateJWT, getLoginLogs);
router.get("/logs/export", authenticateJWT, exportLoginLogs);
router.post("/logs/delete", authenticateJWT, deleteLoginLogs);
router.get("/verify", authenticateJWT, (req, res) => {
  res.json({ message: "Token is valid", user: req.user });
});

// Forgot password (OTP)
router.post("/forgot-password/request", requestPasswordReset);
// Resend can reuse request endpoint with cooldown enforcement
router.post("/forgot-password/resend", requestPasswordReset);
router.post("/forgot-password/reset", resetPasswordWithOtp);

export default router;