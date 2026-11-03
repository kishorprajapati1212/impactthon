import asyncHandler from "../../utils/asyncHandler.js";
import AuditLog from "../../models/users/AuditLog.js";

const ENTITY_TYPES = ["STUDENT", "FACULTY", "ASSIGNMENT", "DEPARTMENT", "SUBJECT", "SECTION"];
const clampLimit = (v, d = 20, max = 100) => { const n = Number.parseInt(v, 10); return Number.isFinite(n) && n > 0 ? Math.min(n, max) : d; };

/** GET /api/audit/:entityType/:entityId?limit= — history of one record (newest first). */
export const getAuditHistory = asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.params;
  const type = String(entityType).toUpperCase();
  if (!ENTITY_TYPES.includes(type)) return res.status(400).json({ success: false, code: "VALIDATION", message: "Unknown record type." });
  const logs = await AuditLog.find({ entityType: type, entityId })
    .populate("changedBy", "name email role")
    .sort({ createdAt: -1 }).limit(clampLimit(req.query.limit, 50)).lean();
  res.json({ success: true, count: logs.length, data: logs });
});

/** GET /api/audit?limit=&entityType= — recent admin activity across the college. */
export const getRecentAudits = asyncHandler(async (req, res) => {
  const filter = {};
  const type = req.query.entityType ? String(req.query.entityType).toUpperCase() : null;
  if (type && ENTITY_TYPES.includes(type)) filter.entityType = type;
  const logs = await AuditLog.find(filter)
    .populate("changedBy", "name email role")
    .sort({ createdAt: -1 }).limit(clampLimit(req.query.limit, 20)).lean();
  res.json({ success: true, count: logs.length, data: logs });
});
