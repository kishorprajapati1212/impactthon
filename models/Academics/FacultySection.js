// models/FacultySection.js
import mongoose from "mongoose";

const facultySectionSchema = new mongoose.Schema({
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Faculty",
    index: true
  },
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Section",
    index: true
  }
});

facultySectionSchema.index(
  { facultyId: 1, sectionId: 1 },
  { unique: true }
);

export default mongoose.model("FacultySection", facultySectionSchema);
