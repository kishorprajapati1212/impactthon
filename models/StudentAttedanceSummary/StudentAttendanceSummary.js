import mongoose from "mongoose";

const monthlyAttendanceSchema = new mongoose.Schema(
  {
    month: {
      type: String,
      required: true,
      trim: true,
    },

    presentCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalLectures: {
      type: Number,
      default: 0,
      min: 0,
    },

    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  { _id: false }
);

const studentAttendanceSummarySchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

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

    monthlyData: [monthlyAttendanceSchema],

    overallPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
);

// One student can have only one summary per section per year
studentAttendanceSummarySchema.index(
  { studentId: 1, sectionId: 1, year: 1 },
  { unique: true }
);

export default mongoose.model(
  "StudentAttendanceSummary",
  studentAttendanceSummarySchema
);
