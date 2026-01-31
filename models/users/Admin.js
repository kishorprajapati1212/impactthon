// models/Admin.js
import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    unique: true,
    index: true
  },
  name: String
});

export default mongoose.model("Admin", adminSchema);
