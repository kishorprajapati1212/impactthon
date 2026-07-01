import mongoose from "mongoose";
const s = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  employeeId:     { type: String, required: true, unique: true, trim: true },
  departmentId:   { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
  designation:    { type: String, default: "Assistant Professor" },
  phone:          { type: String, default: null },
  specialization: { type: String, default: null },
}, { timestamps: true });
s.index({ userId: 1 }); s.index({ departmentId: 1 });
export default mongoose.model("Faculty", s);
