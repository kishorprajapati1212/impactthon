import mongoose from "mongoose";

const studentSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  rollNumber:     { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 30 },
  sectionId:      { type: mongoose.Schema.Types.ObjectId, ref: "Section", default: null, index: true },
  departmentId:   { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null, index: true },
  // Mentor — a faculty member who reviews this student's leave applications.
  mentorId:       { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", default: null, index: true },
  enrollmentYear: { type: Number, default: () => new Date().getFullYear(), min: 2000 },
  semester:       { type: Number, default: 1, min: 1, max: 16 },
  phone:          { type: String, default: null, maxlength: 15 },
  parentPhone:    { type: String, default: null, maxlength: 15 },
  isActive:       { type: Boolean, default: true },
}, { timestamps: true });

studentSchema.index({ sectionId: 1, isActive: 1 });
studentSchema.index({ departmentId: 1, semester: 1 });
studentSchema.index({ mentorId: 1, isActive: 1 });

export default mongoose.model("Student", studentSchema);
