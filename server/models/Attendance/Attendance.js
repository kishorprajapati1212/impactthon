import mongoose from "mongoose";

/**
 * One attendance row per (lecture, student) — enforced unique.
 * `location` is the GPS proof: latitude, longitude and the reported
 * accuracy (in meters). Keeping accuracy makes maps & audit honest.
 */
const attendanceSchema = new mongoose.Schema({
  lectureSessionId: { type: mongoose.Schema.Types.ObjectId, ref: "LectureSession", required: true },
  studentId:        { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  status:           { type: String, enum: ["PRESENT","ABSENT","LATE","EXCUSED","LEAVE"], default: "PRESENT" },
  markedAt:         { type: Date, default: null },
  markMethod:       { type: String, enum: ["QR","MANUAL","AUTO"], default: "QR" },
  markedBy:         { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  location: {
    latitude:  { type: Number, default: null },
    longitude: { type: Number, default: null },
    accuracy:  { type: Number, default: null }, // meters
  },
  deviceInfo: { type: String, default: null },
  remarks:    { type: String, default: null },
}, { timestamps: true });

attendanceSchema.index({ lectureSessionId: 1, studentId: 1 }, { unique: true });
attendanceSchema.index({ studentId: 1, createdAt: -1 });
attendanceSchema.index({ lectureSessionId: 1, status: 1 });
attendanceSchema.index({ createdAt: 1 });

export default mongoose.model("Attendance", attendanceSchema);
