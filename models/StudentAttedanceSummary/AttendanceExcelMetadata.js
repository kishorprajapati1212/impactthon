import mongoose from "mongoose";

const attendanceExcelMetadataSchema = new mongoose.Schema(
  {
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true,
    },

    year: {
      type: String,
      required: true,
      trim: true,
    },

    month: {
      type: String,
      required: true,
      trim: true,
    },

    totalLectures: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastColumnIndex: {
      type: Number,
      default: 4,
      min: 0,
    },
  },
  { timestamps: true }
);

// One section can have only one record per year + month
attendanceExcelMetadataSchema.index(
  { sectionId: 1, year: 1, month: 1 },
  { unique: true }
);

export default mongoose.model(
  "AttendanceExcelMetadata",
  attendanceExcelMetadataSchema
);
