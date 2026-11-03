import MentorStudentHistory from "../models/mapping/MentorStudentHistory.js";
import { refId } from "./ids.js";

/** Open a mentorship period (closes any open one for a different mentor). */
export async function startMentorship(student, assignedBy = null) {
  if (!student?._id || !student?.mentorId) return null;
  const mentorId = refId(student.mentorId?._id || student.mentorId);
  const open = await MentorStudentHistory.findOne({ studentId: student._id, endsAt: null });
  if (open && refId(open.mentorId) === mentorId) return open;
  if (open) { open.endsAt = new Date(); open.endReason = "MENTOR_CHANGED"; await open.save(); }
  return MentorStudentHistory.create({ studentId: student._id, mentorId, assignedBy, startsAt: new Date() });
}

/** Close the open mentorship period, keeping the row forever. */
export async function endMentorship(studentId, endReason = "ADMIN_REMOVED") {
  return MentorStudentHistory.updateMany(
    { studentId, endsAt: null },
    { endsAt: new Date(), endReason }
  );
}

/** All mentors a student ever had (newest first), names populated. */
export async function mentorHistoryFor(studentId) {
  return MentorStudentHistory.find({ studentId })
    .populate({ path: "mentorId", select: "employeeId", populate: { path: "userId", select: "name email" } })
    .sort({ startsAt: -1 }).lean();
}

/** Students this faculty mentors now OR mentored in the past. */
export async function menteeIdsFor(facultyId, { formerOnly = false } = {}) {
  const rows = await MentorStudentHistory.find({ mentorId: facultyId, ...(formerOnly ? { endsAt: { $ne: null } } : {}) })
    .select("studentId endsAt").lean();
  return [...new Set(rows.map((r) => String(r.studentId)))];
}
