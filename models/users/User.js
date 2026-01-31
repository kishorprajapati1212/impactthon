// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["ADMIN", "FACULTY", "STUDENT", "PARENT"],
    required: true,
    index: true
  },
  email: { type: String, unique: true, sparse: true },
  mobileNumber: { type: String, index: true },
  passwordHash: { type: String, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
