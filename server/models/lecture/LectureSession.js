import mongoose from "mongoose";
const s = new mongoose.Schema({
  facultyId:        { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
  subjectId:        { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  sectionId:        { type: mongoose.Schema.Types.ObjectId, ref: "Section", required: true },
  topic:            { type: String, required: true, trim: true },
  description:      { type: String, default: null },
  status:           { type: String, enum: ["SCHEDULED","ACTIVE","COMPLETED","CANCELLED"], default: "ACTIVE" },
  startTime:        { type: Date, default: Date.now },
  endTime:          { type: Date, default: null },
  sessionToken:     { type: String, default: null },
  location: {
    latitude:  { type: Number, default: null },
    longitude: { type: Number, default: null },
    radius:    { type: Number, default: 100 },
  },
  attendanceWindow: { type: Number, default: 15 },
  totalMarked:      { type: Number, default: 0 },
}, { timestamps: true });
s.index({ facultyId: 1, status: 1 }); s.index({ sectionId: 1 }); s.index({ startTime: -1 });
export default mongoose.model("LectureSession", s);
