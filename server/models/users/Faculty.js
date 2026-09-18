import mongoose from "mongoose";

const facultySchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  employeeId:     { type: String, required: true, unique: true, trim: true, maxlength: 30 },
  departmentId:   { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null, index: true },
  designation:    { type: String, default: "Assistant Professor", maxlength: 100 },
  phone:          { type: String, default: null, maxlength: 15 },
  specialization: { type: String, default: null, maxlength: 200 },
  joiningYear:    { type: Number, default: () => new Date().getFullYear() },
  isActive:       { type: Boolean, default: true },
}, { timestamps: true });

facultySchema.index({ departmentId: 1, isActive: 1 });

export default mongoose.model("Faculty", facultySchema);
