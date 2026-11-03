import mongoose from "mongoose";

const parentSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  phone:          { type: String, required: true, trim: true, maxlength: 15 },
  alternatePhone: { type: String, default: null, maxlength: 15 },
  relationship:   { type: String, enum: ["FATHER","MOTHER","GUARDIAN"], default: "FATHER" },
  address:        { type: String, default: null },
  children:       [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
  notificationPrefs: {
    sms:     { type: Boolean, default: true },
    email:   { type: Boolean, default: true },
    daily:   { type: Boolean, default: false },
    instant: { type: Boolean, default: true },
  },
  lastNotifiedAt: { type: Date, default: null },
}, { timestamps: true });

parentSchema.index({ children: 1 });
parentSchema.index({ phone: 1 });

export default mongoose.model("Parent", parentSchema);
