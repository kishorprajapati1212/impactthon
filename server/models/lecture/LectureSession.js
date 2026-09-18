import mongoose from "mongoose";

const lectureSchema = new mongoose.Schema({
  facultyId:  { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
  subjectId:  { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  sectionId:  { type: mongoose.Schema.Types.ObjectId, ref: "Section", required: true },
  topic:      { type: String, required: true, trim: true, maxlength: 500 },
  description:{ type: String, default: null },
  status:     { type: String, enum: ["SCHEDULED","ACTIVE","COMPLETED","CANCELLED"], default: "ACTIVE" },
  startTime:  { type: Date, default: Date.now },
  endTime:    { type: Date, default: null },
  sessionToken: { type: String, default: null },
  location: {
    latitude:  { type: Number, default: null },
    longitude: { type: Number, default: null },
    radius:    { type: Number, default: 100 },
    accuracy:  { type: Number, default: null }, // meters
    hasGps:    { type: Boolean, default: false },
    bounds: {
      north: { type: Number, default: null },
      south: { type: Number, default: null },
      east:  { type: Number, default: null },
      west:  { type: Number, default: null },
    },
  },
  attendanceWindow: { type: Number, default: 15 },
  totalMarked:      { type: Number, default: 0 },
}, { timestamps: true });

lectureSchema.index({ facultyId: 1, status: 1 });
lectureSchema.index({ sectionId: 1 });
lectureSchema.index({ startTime: -1 });
lectureSchema.index({ status: 1 });

export default mongoose.model("LectureSession", lectureSchema);
