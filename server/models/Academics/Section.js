import mongoose from "mongoose";
const s = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  departmentId:  { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
  semester:      { type: Number, required: true, min: 1, max: 8 },
  batchYear:     { type: Number, required: true },
  totalStudents: { type: Number, default: 0 },
  isActive:      { type: Boolean, default: true },
}, { timestamps: true });
s.index({ departmentId: 1, semester: 1 });
export default mongoose.model("Section", s);
