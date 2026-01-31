import mongoose from "mongoose";

const subjectMasterSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  code: { type: String, required: true, unique: true },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: true,
    index: true
  },
  credits: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("SubjectMaster", subjectMasterSchema);
