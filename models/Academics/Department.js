import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
  },
});

departmentSchema.index({ name: 1 }, { unique: true });

export default mongoose.model("Department", departmentSchema);
