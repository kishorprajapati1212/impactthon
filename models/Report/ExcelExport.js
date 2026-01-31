// models/ExcelExport.js
import mongoose from "mongoose";

const excelExportSchema = new mongoose.Schema({
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    index: true
  },
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Section",
    index: true
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
