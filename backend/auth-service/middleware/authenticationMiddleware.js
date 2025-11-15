import jwt from "jsonwebtoken";
import User from "../models/authModel.js";

const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";
const COOKIE_SAMESITE =
  (process.env.COOKIE_SAMESITE || "").toLowerCase() || (COOKIE_SECURE ? "none" : "lax");

export const authenticateJWT = async (req, res, next) => {
  const token =
    req.cookies?.token ||
    (req.headers.authorization
      ? String(req.headers.authorization).split(" ")[1]
      : null);

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    try {
      const user = await User.findById(decoded.id).select("is_deleted");
      if (!user) return res.status(401).json({ message: "Invalid token" });

      if (user.is_deleted) {
        res.clearCookie("token", {
          httpOnly: true,
          secure: COOKIE_SECURE,
          sameSite: COOKIE_SAMESITE,
          path: "/",
        });

        return res.status(401).json({ message: "Account archived" });
      }
    } catch (err) {
      console.warn("Failed to verify user archived state:", err);
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
