// models/Attendance.js
import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  lectureSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "LectureSession",
    index: true
  },
  
  studentEnrollmentNo: {
    type: String,
    ref: "Student",
    index: true
  },
  scannedAt: Date,
  source: {
    type: String,
    enum: ["QR", "MANUAL", "SOUND"]
  },
  gpsLocation: {
    lat: Number,
    lng: Number
  },
  facerecongntion: {type: Boolean, default: false },
  facevalid : {type:Boolean, default: false },

});

attendanceSchema.index(
  { lectureSessionId: 1, studentEnrollmentNo: 1 },
  { unique: true }
);

export default mongoose.model("Attendance", attendanceSchema);
