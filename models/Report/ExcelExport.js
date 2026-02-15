// models/ExcelExport.js
import mongoose from "mongoose";

const excelExportSchema = new mongoose.Schema({
  facultySubjectSectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FacultySubjectSection",
    index: true
  },
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Section",
    required: true,
  },
  month: { type: String, index: true },
  filePath: String,
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true
  },
  generatedAt: Date
});

export default mongoose.model("ExcelExport", excelExportSchema);
