const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: "Not authorized" });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: `Access denied. Need: ${roles.join(" or ")}` });
  }
  next();
};

export default authorizeRoles;
