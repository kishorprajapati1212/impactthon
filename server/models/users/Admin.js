import mongoose from "mongoose";
const s = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  employeeId: { type: String, required: true, unique: true, trim: true },
  phone:      { type: String, default: null },
}, { timestamps: true });
s.index({ userId: 1 });
export default mongoose.model("Admin", s);
