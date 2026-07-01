import Admin from "../models/users/Admin.js";
import Faculty from "../models/users/Faculty.js";
import Student from "../models/users/Student.js";

const getProfileId = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Not authenticated" });

    let profile = null;
    switch (req.user.role) {
      case "ADMIN":   profile = await Admin.findOne({ userId: req.user._id }); break;
      case "FACULTY": profile = await Faculty.findOne({ userId: req.user._id }); break;
      case "STUDENT": profile = await Student.findOne({ userId: req.user._id }); break;
      default: return res.status(400).json({ success: false, message: "Invalid role" });
    }

    if (!profile) return res.status(404).json({ success: false, message: `${req.user.role} profile not found` });

    req.profileId = profile._id;
    req.profile = profile;
    next();
  } catch (error) {
    next(error);
  }
};

export default getProfileId;
