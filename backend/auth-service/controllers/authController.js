import User from "../models/authModel.js";
import Log from "../models/logsModel.js";
import PasswordResetToken from "../models/passwordResetToken.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";


/**
 * @desc Login user
 * @route POST /api/auth/login
 * @access Public
 */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found!" });
    }

    if (user.is_deleted) {
      return res.status(400).json({ message: "User not found!" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect password!" });
    }

    // Capture IP (consider reverse proxy)
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      "";

    // Create login activity log (logout_time left null until logout)
    try {
      await Log.create({
        userId: user._id,
        email: user.email,
        role: user.role?.name || user.role || "",
        ip,
        login_time: new Date(),
        logout_time: null,
      });
    } catch (logErr) {
      console.error("Login activity log error:", logErr?.message || logErr);
    }

    // Generate JWT 
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        school: user.school || user.role?.school || "",
        department: user.department || user.role?.department || "",
        firstname: user.firstname || user.firstName || user.first_name || "",
        lastname: user.lastname || user.lastName || user.last_name || "",
        profile_picture: user.profile_picture || user.profilePicture || user.profile_picture || "",
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }  /// 30-days JWT
    );

    // Set cookie 
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: "/",
    });

    res.json({
      message: "Successful login!",
      user: {
        _id: user._id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        profile_picture: user.profile_picture,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc Logout user
 * @route POST /api/auth/logout
 * @access Public
 */
export const logoutUser = async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
    path: '/',
  });
  try {
    // Best-effort: update most recent login record for this user
    const userId = req.user?.id || req.user?._id; // may be undefined if logout without auth
    if (userId) {
      const latest = await Log.findOne({ userId, logout_time: null }).sort({ login_time: -1 });
      if (latest) {
        latest.logout_time = new Date();
        await latest.save();
      }
    }
  } catch (logErr) {
    console.error("Logout activity update error:", logErr?.message || logErr);
  }
  res.json({ message: "Logged out successfully" });
};

/**
 * @desc Fetch login activity logs with filters and pagination
 * @route GET /api/auth/logs
 * @access Private (Admin)
 */
export const getLoginLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      status, 
      date,   
      search,
    } = req.query;

    const q = {};
    if (role && role !== 'All' && role !== 'all') {
      q.role = role;
    }
    if (status === 'active') {
      q.logout_time = null;
    } else if (status === 'inactive') {
      q.logout_time = { $ne: null };
    }
    if (search) {
      q.email = { $regex: new RegExp(search, 'i') };
    }
    if (date) {
      const start = new Date(date);
      if (!isNaN(start.getTime())) {
        const end = new Date(start);
        end.setDate(start.getDate() + 1);
        q.login_time = { $gte: start, $lt: end };
      }
    }

    const pageNum = Math.max(1, parseInt(page));
    const perPage = Math.max(1, Math.min(100, parseInt(limit)));
    const [items, total] = await Promise.all([
      Log.find(q).sort({ login_time: -1 }).skip((pageNum - 1) * perPage).limit(perPage).lean(),
      Log.countDocuments(q),
    ]);

    return res.json({
      success: true,
      data: items,
      page: pageNum,
      limit: perPage,
      total,
      pages: Math.ceil(total / perPage) || 1,
    });
  } catch (err) {
    console.error('Get logs error:', err?.message || err);
    return res.status(500).json({ success: false, message: 'Failed to fetch login logs' });
  }
};

/**
 * Helper: generate a 6-digit numeric OTP as a string
 */
function generateOtp() {
  return ("" + Math.floor(100000 + Math.random() * 900000));
}

/**
 * Helper: best-effort call to Mail Service to send password reset OTP
 */
async function sendPasswordResetEmail({ to, firstname, lastname, otp }) {
  // Try multiple bases to improve reliability across environments (dev, docker-compose, prod)
  const candidates = [
    process.env.EMAIL_SERVICE_URL,
    process.env.MAIL_SERVICE_URL,
    'http://mail-service:8005',
    'http://127.0.0.1:8005',
    'http://localhost:8005',
  ].filter(Boolean);

  const payload = { to, firstname, lastname, otp };
  let lastError = null;

  const paths = ['/api/email/password-reset', '/api/email/send-password-reset', '/api/email/send-welcome'];
  for (const base of candidates) {
    for (const p of paths) {
      const url = `${String(base).replace(/\/$/, '')}${p}`;
      try {
        // If falling back to send-welcome, map fields to expected ones
        const body = p.endsWith('send-welcome')
          ? { email: to, firstname, lastname, password: otp }
          : payload;
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          throw new Error(data?.message || `Mail service error (${resp.status})`);
        }
        return data;
      } catch (err) {
        lastError = err;
        console.error(`Mail send via ${url} failed:`, err?.message || err);
        // try next path or base
      }
    }
  }

  console.warn('All mail service endpoints failed for password reset');
  return { error: true, message: lastError?.message || 'All mail endpoints failed' };
}

/**
 * @desc Request a password reset OTP (email-based)
 * @route POST /api/auth/forgot-password/request
 * @access Public
 */
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body || {};
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
      // Do not reveal enumeration details
      return res.status(200).json({ success: true, message: "If the email exists, an OTP has been sent." });
    }

    const user = await User.findOne({ email: normalized });
    // Always respond with 200 to avoid user enumeration
    if (!user || user.is_deleted) {
      return res.status(200).json({ success: true, message: "If the email exists, an OTP has been sent." });
    }

    // Rate limit: if a recent token exists within 45s, block
    const COOLDOWN_SECONDS = parseInt(process.env.RESET_OTP_COOLDOWN || "45", 10);
    const existing = await PasswordResetToken.findOne({ email: normalized, used: false })
      .sort({ createdAt: -1 });
    if (existing && existing.lastSentAt) {
      const diff = (Date.now() - new Date(existing.lastSentAt).getTime()) / 1000;
      if (diff < COOLDOWN_SECONDS) {
        const retryAfter = Math.ceil(COOLDOWN_SECONDS - diff);
        return res.status(429).json({ success: false, message: `Please wait ${retryAfter}s before requesting a new OTP.`, retryAfter });
      }
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const ttlMinutes = parseInt(process.env.RESET_OTP_TTL_MIN || "10", 10);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    // Invalidate previous tokens for this user (best-effort)
    await PasswordResetToken.updateMany({ email: normalized, used: false }, { $set: { used: true } });

    await PasswordResetToken.create({
      email: normalized,
      userId: user._id,
      otpHash,
      attempts: 0,
      maxAttempts: 5,
      expiresAt,
      used: false,
      lastSentAt: new Date(),
    });

    // Send email via Mail Service
    await sendPasswordResetEmail({
      to: normalized,
      firstname: user.firstname || "",
      lastname: user.lastname || "",
      otp,
    });

    return res.status(200).json({ success: true, message: "If the email exists, an OTP has been sent." });
  } catch (err) {
    console.error("requestPasswordReset error:", err);
    // Still 200 to avoid enumeration
    return res.status(200).json({ success: true, message: "If the email exists, an OTP has been sent." });
  }
};

/**
 * @desc Reset password using email + OTP
 * @route POST /api/auth/forgot-password/reset
 * @access Public
 */
export const resetPasswordWithOtp = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body || {};
    const normalized = String(email || "").trim().toLowerCase();
    const code = String(otp || "").trim();
    if (!normalized || !code || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "Invalid request." });
    }

    const user = await User.findOne({ email: normalized });
    if (!user || user.is_deleted) {
      // mask enumeration
      return res.status(400).json({ success: false, message: "Invalid OTP or expired." });
    }

    // Find latest active token
    const token = await PasswordResetToken.findOne({ email: normalized, used: false })
      .sort({ createdAt: -1 });
    if (!token) {
      return res.status(400).json({ success: false, message: "Invalid OTP or expired." });
    }
    if (new Date(token.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
    }
    if (token.attempts >= (token.maxAttempts || 5)) {
      return res.status(429).json({ success: false, message: "Too many attempts. Please request a new OTP." });
    }

    const match = await bcrypt.compare(code, token.otpHash);
    if (!match) {
      token.attempts = (token.attempts || 0) + 1;
      await token.save();
      return res.status(400).json({ success: false, message: "Invalid OTP." });
    }

    // Mark token used and update password
    token.used = true;
    await token.save();

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);
    user.password = hashed;
    await user.save();

    // Best-effort: invalidate other tokens
    await PasswordResetToken.updateMany({ email: normalized, used: false }, { $set: { used: true } });

    return res.status(200).json({ success: true, message: "Password updated successfully." });
  } catch (err) {
    console.error("resetPasswordWithOtp error:", err);
    return res.status(500).json({ success: false, message: "Failed to reset password." });
  }
};