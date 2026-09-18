import mongoose from "mongoose";

/**
 * Student leave application, reviewed by the student's faculty mentor.
 *
 * type:
 *  - FULL     → the whole day's lectures are credited
 *  - HALF     → first or second half of the day (halfWhich)
 *  - LECTURE  → only selected lectures (lectureIds)
 *
 * When APPROVED, the matching Attendance rows are set to LEAVE so the
 * day's lectures do not count as absent for the student.
 */
const leaveSchema = new mongoose.Schema({
  studentId:    { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  mentorId:     { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", default: null },
  sectionId:    { type: mongoose.Schema.Types.ObjectId, ref: "Section", default: null },
  type:         { type: String, enum: ["FULL", "HALF", "LECTURE"], default: "FULL" },
  halfWhich:    { type: String, enum: ["FIRST", "SECOND"], default: "FIRST" },
  date:         { type: Date, required: true }, // the leave day
  subjectId:    { type: mongoose.Schema.Types.ObjectId, ref: "Subject", default: null },
  lectureIds:   [{ type: mongoose.Schema.Types.ObjectId, ref: "LectureSession" }],
  reason:       { type: String, required: true, trim: true, maxlength: 500 },
  status:       { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" },
  decidedBy:    { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", default: null },
  mentorRemark: { type: String, default: null, maxlength: 300 },
  decidedAt:    { type: Date, default: null },
}, { timestamps: true });

leaveSchema.index({ studentId: 1, status: 1, createdAt: -1 });
leaveSchema.index({ mentorId: 1, status: 1, createdAt: -1 });
leaveSchema.index({ date: 1 });

export default mongoose.model("LeaveApplication", leaveSchema);
