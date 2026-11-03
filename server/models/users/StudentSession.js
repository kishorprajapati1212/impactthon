import mongoose from "mongoose";

/**
 * Student login-session — binds an issued JWT to one physical device.
 *
 * Lifecycle:
 *   PENDING     → login submitted; mentor must accept (new device = 1 approval)
 *   ACTIVE      → this device+loginId may use the app (single active session)
 *   REJECTED    → mentor refused this login
 *   LOGGED_OUT  → student logged out (trust is dropped → next login needs mentor)
 *
 * `deviceId` + `fingerprint` are the "digital fingerprint kept in the table";
 * they identify the physical machine so a stolen phone / shared login cannot
 * reuse someone else's session.
 */
const studentSessionSchema = new mongoose.Schema({
  studentId:   { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  loginId:     { type: String, required: true, unique: true, index: true },
  deviceId:    { type: String, default: null, index: true },
  deviceLabel: { type: String, default: null },
  fingerprint: { type: String, default: null },
  deviceMeta: {
    platform:       { type: String, default: null },
    browser:        { type: String, default: null },
    hardwareCores:  { type: Number, default: null },
    deviceMemory:   { type: Number, default: null },
    touchPoints:    { type: Number, default: null },
    screen:         { type: String, default: null },
    timezone:       { type: String, default: null },
    language:       { type: String, default: null },
  },
  status:  { type: String, enum: ["PENDING", "ACTIVE", "REJECTED", "LOGGED_OUT"], default: "PENDING", index: true },
  reason:  { type: String, enum: ["NEW_DEVICE", "KNOWN_DEVICE", "RELOGIN"], default: "NEW_DEVICE" },
  decidedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", default: null },
  decidedAt:   { type: Date, default: null },
  remark:      { type: String, default: null, maxlength: 300 },
  lastSeenAt:  { type: Date, default: null },
}, { timestamps: true });

studentSessionSchema.index({ studentId: 1, status: 1 });
studentSessionSchema.index({ studentId: 1, deviceId: 1 });
studentSessionSchema.index({ loginId: 1, status: 1 });

export default mongoose.model("StudentSession", studentSessionSchema);
