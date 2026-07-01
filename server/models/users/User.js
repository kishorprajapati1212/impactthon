import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true, maxlength: 100 },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  role:     { type: String, enum: ["ADMIN","FACULTY","STUDENT"], required: true },
  isActive: { type: Boolean, default: true },
  avatar:   { type: String, default: null },
}, { timestamps: true });
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
export default mongoose.model("User", userSchema);
