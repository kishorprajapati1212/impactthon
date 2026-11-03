import express from "express";
import { getAuditHistory, getRecentAudits } from "../../controllers/history/audit.controller.js";
import protect from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/role.middleware.js";
const r = express.Router();
r.get("/api/audit/:entityType/:entityId", protect, authorizeRoles("ADMIN"), getAuditHistory);
r.get("/api/audit", protect, authorizeRoles("ADMIN"), getRecentAudits);
export default r;
