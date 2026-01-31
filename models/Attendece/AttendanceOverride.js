// models/AttendanceOverride.js
import mongoose from "mongoose";

const attendanceOverrideSchema = new mongoose.Schema({
  lectureSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "LectureSession",
    index: true
  },
  applyType: {
    type: String,
    enum: ["ALL", "SELECTED"]
  },
  studentEnrollmentNos: [String],
  finalStatus: {
    type: String,
    enum: ["PRESENT", "ABSENT"]
  },
  reason: String,
  appliedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true
  },
  appliedAt: Date
});

export default mongoose.model("AttendanceOverride", attendanceOverrideSchema);
