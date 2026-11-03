import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema({
  facultyId:    { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
  subjectId:    { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  sectionId:    { type: mongoose.Schema.Types.ObjectId, ref: "Section", required: true },
  academicYear: { type: Number, required: true, default: () => new Date().getFullYear(), min: 2000, max: 2100 },
  semester:     { type: Number, required: true, min: 1, max: 16 },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

assignmentSchema.index(
  { facultyId: 1, subjectId: 1, sectionId: 1, academicYear: 1, semester: 1 },
  { unique: true }
);
assignmentSchema.index({ facultyId: 1, isActive: 1 });
assignmentSchema.index({ sectionId: 1, academicYear: 1 });

export default mongoose.model("FacultySubjectSection", assignmentSchema);
