import asyncHandler from "../../utils/asyncHandler.js";
import AuditLog from "../../models/users/AuditLog.js";

export const getAuditHistory = asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.params;
  const logs = await AuditLog.find({ entityType: entityType.toUpperCase(), entityId })
    .populate("changedBy", "name email role")
    .sort({ createdAt: -1 }).limit(50);
  res.json({ success: true, count: logs.length, data: logs });
});

export const getRecentAudits = asyncHandler(async (req, res) => {
  const logs = await AuditLog.find()
    .populate("changedBy", "name email role")
    .sort({ createdAt: -1 }).limit(20);
  res.json({ success: true, count: logs.length, data: logs });
});
