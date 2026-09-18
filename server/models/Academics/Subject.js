import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema({
  subjectName:  { type: String, required: true, trim: true, maxlength: 200 },
  subjectCode:  { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 15 },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null, index: true },
  credits:      { type: Number, default: 3, min: 1, max: 15 },
  semester:     { type: Number, default: 1, min: 1, max: 16 },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

subjectSchema.index({ departmentId: 1, semester: 1 });

export default mongoose.model("Subject", subjectSchema);
