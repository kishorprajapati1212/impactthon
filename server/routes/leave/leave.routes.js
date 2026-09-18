import express from "express";
import {
  getMyLeaves,
  getLeaveOptions,
  applyLeave,
  getMentorLeaves,
  getMyMentees,
  decideLeave,
} from "../../controllers/leave/leave.controller.js";
import protect from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/role.middleware.js";
import getProfileId from "../../middleware/identity.middleware.js";

const r = express.Router();

// Student
r.get("/api/leave/my", protect, getProfileId, authorizeRoles("STUDENT"), getMyLeaves);
r.get("/api/leave/new-options", protect, getProfileId, authorizeRoles("STUDENT"), getLeaveOptions);
r.post("/api/leave/apply", protect, getProfileId, authorizeRoles("STUDENT"), applyLeave);

// Faculty mentor
r.get("/api/leave/mentor/pending", protect, getProfileId, authorizeRoles("FACULTY"), getMentorLeaves);
r.get("/api/leave/mentor/mentees", protect, getProfileId, authorizeRoles("FACULTY"), getMyMentees);
r.post("/api/leave/:id/decision", protect, getProfileId, authorizeRoles("FACULTY", "ADMIN"), decideLeave);

export default r;
