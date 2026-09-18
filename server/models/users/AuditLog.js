import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  entityType:  { type: String, enum: ["STUDENT","FACULTY","ASSIGNMENT"], required: true },
  entityId:    { type: mongoose.Schema.Types.ObjectId, required: true },
  changedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action:      { type: String, enum: ["CREATE","UPDATE","DEACTIVATE","REACTIVATE","DELETE"], required: true },
  changes:     { type: mongoose.Schema.Types.Mixed, default: {} },
  previousValues: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ changedBy: 1, createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
