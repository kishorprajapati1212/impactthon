// models/Faculty.js
import mongoose from "mongoose";

const facultySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    unique: true,
    index: true
  },
  employeeId: { type: String, unique: true, index: true },
  departmentId: {type: mongoose.Schema.Types.ObjectId,
      ref: "Deaprtment",
      index: true}
});

export default mongoose.model("Faculty", facultySchema);
