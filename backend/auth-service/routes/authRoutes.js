import express from "express";
import { loginUser, logoutUser, getLoginLogs } from "../controllers/authController.js";
import { authenticateJWT } from "../middleware/authenticationMiddleware.js"; 

const router = express.Router();

router.post("/login", loginUser);
router.post("/logout", authenticateJWT, logoutUser);
router.get("/logs", authenticateJWT, getLoginLogs);
router.get("/verify", authenticateJWT, (req, res) => {
  res.json({ message: "Token is valid", user: req.user });
});

export default router;