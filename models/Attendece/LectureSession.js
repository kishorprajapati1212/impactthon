// models/LectureSession.js
import mongoose from "mongoose";

const lectureSessionSchema = new mongoose.Schema({
  facultySubjectSectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FacultySubjectSection",
    index: true
  },
  lectureDate: { type: Date, index: true },
  startTime: Date,
  endTime: Date,
  minute: String,
  qrToken: { type: String, index: true },
  isActive: Boolean,
  gpsLocation: { 
    lat: Number,
    lng: Number
  }
},{ timestamps: true });

lectureSessionSchema.index({
  subjectId: 1,
  sectionId: 1,
  lectureDate: 1
});

export default mongoose.model("LectureSession", lectureSessionSchema);
