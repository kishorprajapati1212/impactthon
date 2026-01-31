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
  selfiePhoto: String,
  boundDeviceId: String,
  deviceBoundUntil: Date
});

export default mongoose.model("Student", studentSchema);
