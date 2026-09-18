import express from "express";
import {
  getMentorPendingLogins,
  getAdminPendingLogins,
  decideLogin,
  getMentorSessionHistory,
} from "../../controllers/auth/deviceAuth.controller.js";
import protect from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/role.middleware.js";
import getProfileId from "../../middleware/identity.middleware.js";

const r = express.Router();

r.get("/api/device/mentor/pending", protect, getProfileId, authorizeRoles("FACULTY"), getMentorPendingLogins);
r.get("/api/device/mentor/sessions", protect, getProfileId, authorizeRoles("FACULTY"), getMentorSessionHistory);
r.get("/api/device/admin/pending", protect, getProfileId, authorizeRoles("ADMIN"), getAdminPendingLogins);
r.post("/api/device/:id/decision", protect, getProfileId, authorizeRoles("FACULTY", "ADMIN"), decideLogin);

export default r;
