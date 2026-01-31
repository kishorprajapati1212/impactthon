// models/AcademicCalendar.js
import mongoose from "mongoose";

const academicCalendarSchema = new mongoose.Schema({
  dates: [{ type: Date, index: true }],
  reason: String,
  isHoliday: Boolean,
  markAllPresent: Boolean
});

export default mongoose.model("AcademicCalendar", academicCalendarSchema);
