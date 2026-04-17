// models/Student.js
import mongoose from "mongoose";

const studentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    unique: true,
    index: true
  },
  enrollmentNo: {
    type: String,
    unique: true,
    index: true
  },
  firstName: String,
  lastName: String,
  dob: Date,
  sectionId: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Section",
    index: true
  }],
  mentorFacultyId: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Faculty",
    index: true
  }],
  academicYear: { 
    type: String, 
    required: true, 
    index: true 
  }, // e.g., "2025-26"
  batch: { type: String }, // e.g., "2024-2028"
  selfiePhoto: String,
  boundDeviceId: String,
  deviceBoundUntil: Date
});

export default mongoose.model("Student", studentSchema);
