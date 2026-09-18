import express from "express";
import { getParentByStudent, linkParentToStudent, getParentNotifications, sendTestNotification } from "../../controllers/notification/parentNotification.controller.js";
import protect from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/role.middleware.js";
import getProfileId from "../../middleware/identity.middleware.js";

const r = express.Router();

// Get parent linked to a student — accessible by faculty/admin
r.get("/api/parent/student/:studentId", protect, authorizeRoles("FACULTY","ADMIN"), getParentByStudent);

// Link parent to student — admin only
r.post("/api/parent/link", protect, authorizeRoles("ADMIN"), linkParentToStudent);

// Get notification history for a parent
r.get("/api/parent/notifications/:parentId", protect, authorizeRoles("ADMIN","FACULTY"), getParentNotifications);

// Test notification — admin only
r.post("/api/parent/send-test", protect, authorizeRoles("ADMIN"), sendTestNotification);

export default r;
