import mongoose from "mongoose";
const s = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  code: { type: String, required: true, unique: true, trim: true, uppercase: true },
  description: { type: String, default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
s.index({ code: 1 });
export default mongoose.model("Department", s);
