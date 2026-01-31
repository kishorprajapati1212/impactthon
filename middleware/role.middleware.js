const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    // console.log(req.user)

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied. You do not have permission to perform this action" });
    }

    next();
  };
};

export default authorizeRoles;
