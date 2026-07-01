import mongoose from "mongoose";
const s = new mongoose.Schema({
  lectureSessionId: { type: mongoose.Schema.Types.ObjectId, ref: "LectureSession", required: true },
  studentId:        { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  status:           { type: String, enum: ["PRESENT","ABSENT","LATE","EXCUSED"], default: "PRESENT" },
  markedAt:         { type: Date, default: null },
  markMethod:       { type: String, enum: ["QR","MANUAL","AUTO"], default: "QR" },
  markedBy:         { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  location: {
    latitude:  { type: Number, default: null },
    longitude: { type: Number, default: null },
  },
  deviceInfo: { type: String, default: null },
  remarks:    { type: String, default: null },
}, { timestamps: true });
s.index({ lectureSessionId: 1, studentId: 1 }, { unique: true });
s.index({ studentId: 1, createdAt: -1 });
s.index({ lectureSessionId: 1, status: 1 });
export default mongoose.model("Attendance", s);
