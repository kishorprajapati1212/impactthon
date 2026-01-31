import mongoose from "mongoose";

const facultySubjectSectionSchema = new mongoose.Schema(
  {
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true,
    },
  },
  { timestamps: true }
);

// prevent duplicate mapping
facultySubjectSectionSchema.index(
  { facultyId: 1, subjectId: 1, sectionId: 1 },
  { unique: true }
);

export default mongoose.model(
  "FacultySubjectSection",
  facultySubjectSectionSchema
);
