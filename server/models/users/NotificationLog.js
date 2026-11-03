import mongoose from "mongoose";

const notificationLogSchema = new mongoose.Schema({
  parentId:    { type: mongoose.Schema.Types.ObjectId, ref: "Parent", required: true },
  studentId:   { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  lectureId:   { type: mongoose.Schema.Types.ObjectId, ref: "LectureSession", required: true },
  subjectName: { type: String, default: null },
  topic:       { type: String, default: null },
  type:        { type: String, enum: ["PRESENT","ABSENT","DAILY_SUMMARY","LOW_ATTENDANCE_WARNING"], required: true },
  channel:     { type: String, enum: ["SMS","EMAIL","BOTH"], default: "SMS" },
  status:      { type: String, enum: ["PENDING","SENT","FAILED"], default: "PENDING" },
  sentAt:      { type: Date, default: null },
  message:     { type: String, default: null },
  errorMessage:{ type: String, default: null },
}, { timestamps: true });

notificationLogSchema.index({ parentId: 1, createdAt: -1 });
notificationLogSchema.index({ studentId: 1, createdAt: -1 });
notificationLogSchema.index({ status: 1 });

export default mongoose.model("NotificationLog", notificationLogSchema);
