// models/Subject.js
import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema({
  subjectName: String,
  subjectCode: { type: String, unique: true, index: true, uppercase: true, },
  semester: Number,
});

export default mongoose.model("Subject", subjectSchema);
