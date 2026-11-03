import mongoose from "mongoose";

/**
 * AuditLog — one row per admin action ("who changed what, when").
 *
 * Phase 11 (admin console) — ADDITIVE changes only, nothing renamed/removed:
 *  - entityType enum gained DEPARTMENT / SUBJECT / SECTION so the academic
 *    setup records are auditable too (before, only people + assignments were).
 *  - entityLabel: the record's human name at the time of the action
 *    (e.g. "CSE2024001 · Rahul Verma"). Needed because after a permanent
 *    DELETE the entity no longer exists, so a populate() could never recover
 *    the name for the activity feed.
 *  - summary: a ready-made sentence ("Updated class “CSE · A”: semester") so
 *    the dashboard shows activity without re-deriving it on every page load.
 * Old rows without these fields still load (defaults are null).
 *
 * Phase 18 — entityType gained LECTURE (additive, nothing renamed). Deleting a
 * lecture is the most sensitive action in the system (it removes attendance
 * marks), so every deletion must be traceable: who, when, which lecture
 * (entityLabel keeps the topic/subject/class/time after the row is gone) and
 * how many marks were removed (`changes`). See MODELS.md §13.
 */
const auditLogSchema = new mongoose.Schema({
  entityType:  { type: String, enum: ["STUDENT","FACULTY","ASSIGNMENT","DEPARTMENT","SUBJECT","SECTION","LECTURE"], required: true },
  entityId:    { type: mongoose.Schema.Types.ObjectId, required: true },
  entityLabel: { type: String, default: null, maxlength: 200 },
  changedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action:      { type: String, enum: ["CREATE","UPDATE","DEACTIVATE","REACTIVATE","DELETE"], required: true },
  summary:     { type: String, default: null, maxlength: 300 },
  changes:     { type: mongoose.Schema.Types.Mixed, default: {} },
  previousValues: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ changedBy: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
