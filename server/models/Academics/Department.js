import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true, trim: true, maxlength: 200 },
  code:        { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 10 },
  description: { type: String, default: null, maxlength: 2000 },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model("Department", departmentSchema);
