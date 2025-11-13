import jwt from "jsonwebtoken";
import User from "../models/authModel.js";

export const authenticateJWT = async (req, res, next) => {
  const token = req.cookies?.token || (req.headers.authorization ? String(req.headers.authorization).split(' ')[1] : null);
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Check current user state in DB (archived flag)
    try {
      const user = await User.findById(decoded.id).select('is_deleted');
      if (!user) return res.status(401).json({ message: 'Invalid token' });
      if (user.is_deleted) {
        // Clear auth cookie so the browser no longer sends the JWT
        try {
          res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
            path: '/',
          });
        } catch (e) {
          // ignore
        }
        return res.status(401).json({ message: 'Account archived' });
      }
    } catch (dbErr) {
      console.warn('Failed to check user archived state:', dbErr?.message || dbErr);
      // proceed with caution - still attach decoded
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};