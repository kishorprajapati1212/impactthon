import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true, maxlength: 100 },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  role:     { type: String, enum: ["ADMIN","FACULTY","STUDENT"], required: true, index: true },
  isActive: { type: Boolean, default: true, index: true },
  avatar:   { type: String, default: null },
}, { timestamps: true });

export default mongoose.model("User", userSchema);
