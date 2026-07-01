import jwt from "jsonwebtoken";
import User from "../models/users/User.js";

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) return res.status(401).json({ success: false, message: "Not authorized, no token" });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) return res.status(401).json({ success: false, message: "User not found" });
      if (!req.user.isActive) return res.status(401).json({ success: false, message: "Account deactivated" });
      next();
    } catch {
      return res.status(401).json({ success: false, message: "Token invalid or expired" });
    }
  } catch (error) {
    next(error);
  }
};

export default protect;
