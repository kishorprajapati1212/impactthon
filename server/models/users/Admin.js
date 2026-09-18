import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  employeeId: { type: String, required: true, unique: true, trim: true, maxlength: 30 },
  phone:      { type: String, default: null, maxlength: 15 },
}, { timestamps: true });

export default mongoose.model("Admin", adminSchema);
