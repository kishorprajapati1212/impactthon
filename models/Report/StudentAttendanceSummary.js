import mongoose from "mongoose";

const studentAttendanceSummarySchema = new mongoose.Schema({
  enrollmentNo: { type: String, required: true, index: true },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: "Section", index: true },
  year: { type: String, index: true },
  
  // This is the array you wanted, linking back to the first table
  monthlyData: [{
    month: String, // "01", "02"...
    presentCount: { type: Number, default: 0 },
    metadataId: { type: mongoose.Schema.Types.ObjectId, ref: "AttendanceExcelMetadata" } // The Link
  }],

  // Calculated at the end of every session for the dashboard
  overallPercentage: { type: Number, default: 0 } 
}, { timestamps: true });

export default mongoose.model("StudentAttendanceSummary", studentAttendanceSummarySchema);