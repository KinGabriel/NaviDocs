export const authorizeAdmin = (req, res, next) => {
  if (req.user?.role?.name === "Admin") {
    return next();
  }
  return res.status(403).json({ message: "Access denied: Admins only" });
};