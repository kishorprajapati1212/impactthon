import mongoose from "mongoose";

/**
 * NEW additive table (no existing model was changed to add this).
 * One row = one period during which a faculty member mentored a student.
 * Student.mentorId still points at the CURRENT mentor (all existing code
 * keeps working); this table preserves every past connection so a faculty
 * member can still find a student after they change mentor, complete the
 * course, transfer, or leave the college.
 */
const mentorStudentHistorySchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  startsAt: { type: Date, default: Date.now },
  endsAt: { type: Date, default: null },
  endReason: {
    type: String,
    enum: ["MENTOR_CHANGED", "STUDENT_LEFT", "COURSE_COMPLETED", "TRANSFERRED", "SUSPENDED", "ADMIN_REMOVED"],
    default: null,
  },
}, { timestamps: true });

mentorStudentHistorySchema.index({ mentorId: 1, endsAt: 1 });
mentorStudentHistorySchema.index({ studentId: 1, startsAt: -1 });

export default mongoose.model("MentorStudentHistory", mentorStudentHistorySchema);
