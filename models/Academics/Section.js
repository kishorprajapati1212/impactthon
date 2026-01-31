import mongoose from "mongoose";

const sectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  semester: { type: Number, required: true },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: true
  },
});

// ✅ Correct unique rule
sectionSchema.index(
  { name: 1, semester: 1, departmentId: 1 },
  { unique: true }
);

export default mongoose.model("Section", sectionSchema);
