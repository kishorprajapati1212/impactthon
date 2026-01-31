import jwt from "jsonwebtoken";
import User from "../models/users/User.js";

const protect = async (req, res, next) => {
  let token;

  // Check Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      // Verify JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user in MongoDB
      const user = await User.findById(decoded.id)
        .select("_id  role isActive");

      if (!user || !user.isActive) {
        return res.status(401).json({
          message: "User inactive or not found"
        });
      }

      // Attach user to request
      req.user = user;

      next();
    } catch (error) {
      return res.status(401).json({
        message: "Not authorized, token failed"
      });
    }
  } else {
    return res.status(401).json({
      message: "Not authorized, no token"
    });
  }
};

export default protect;
