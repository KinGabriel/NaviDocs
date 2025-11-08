import User from "../models/authModel.js";
import Log from "../models/logsModel.js";
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