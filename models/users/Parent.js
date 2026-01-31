// models/Parent.js
import mongoose from "mongoose";

const parentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    unique: true,
    index: true
  },
  mobileNumber: String,
  studentEnrollmentNo: {
    type: String,
    ref: "Student",
    index: true
  }
});

export default mongoose.model("Parent", parentSchema);
