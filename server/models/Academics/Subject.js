import mongoose from "mongoose";
const s = new mongoose.Schema({
  subjectName:  { type: String, required: true, trim: true },
  subjectCode:  { type: String, required: true, unique: true, trim: true, uppercase: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
  credits:      { type: Number, default: 3, min: 1, max: 10 },
  semester:     { type: Number, default: 1, min: 1, max: 8 },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });
s.index({ subjectCode: 1 });
export default mongoose.model("Subject", s);
