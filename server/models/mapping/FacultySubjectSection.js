import mongoose from "mongoose";
const s = new mongoose.Schema({
  facultyId:    { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
  subjectId:    { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  sectionId:    { type: mongoose.Schema.Types.ObjectId, ref: "Section", required: true },
  academicYear: { type: Number, required: true, default: () => new Date().getFullYear() },
  semester:     { type: Number, required: true, min: 1, max: 8 },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });
s.index({ facultyId: 1, subjectId: 1, sectionId: 1, academicYear: 1, semester: 1 }, { unique: true });
s.index({ facultyId: 1, isActive: 1 });
export default mongoose.model("FacultySubjectSection", s);
