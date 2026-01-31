// middleware/identityMiddleware.js
import Admin from "../models/users/Admin.js";
import Faculty from "../models/users/Faculty.js";
import Student from "../models/users/Student.js";

const getProfileId = async (req, res, next) => {
  try {
    const role = req.user.role;
    const userId = req.user._id;
    let profile;

    // Map roles to their respective collections
    switch (role) {
      case "ADMIN":
        profile = await Admin.findOne({ userId: userId }).select("_id");
        break;
      case "FACULTY":
        profile = await Faculty.findOne({ userId: userId }).select("_id");
        break;
      case "STUDENT":
        profile = await Student.findOne({ userId: userId }).select("_id");
        break;
      default:
        return res.status(403).json({ message: "Invalid Role" });
    }

    if (!profile) {
      return res.status(404).json({ message: `${role} profile not found` });
    }

    // Attach the specific database ID to the request
    req.profileId = profile._id; 
    // console.log("req.profileId",req.profileId)
    next();
  } catch (error) {
    res.status(500).json({ message: "Server error identifying user" });
  }
};

export default getProfileId;