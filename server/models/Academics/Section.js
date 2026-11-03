import mongoose from "mongoose";

const sectionSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true, maxlength: 50 },
  departmentId:  { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
  semester:      { type: Number, required: true, min: 1, max: 16 },
  batchYear:     { type: Number, required: true, min: 2000, max: 2100 },
  batchEndYear:  { type: Number, default: null, min: 2000, max: 2100 },
  totalStudents: { type: Number, default: 0, min: 0 },
  isActive:      { type: Boolean, default: true },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

sectionSchema.virtual("batchLabel").get(function () {
  if (this.batchEndYear && this.batchEndYear > this.batchYear) {
    return this.batchYear + "-" + String(this.batchEndYear).slice(-2);
  }
  return String(this.batchYear);
});

// Compound index: same name+semester can exist for different depts/batches
sectionSchema.index({ departmentId: 1, name: 1, semester: 1, batchYear: 1 }, { unique: true });
sectionSchema.index({ batchYear: -1, semester: 1 });

export default mongoose.model("Section", sectionSchema);
