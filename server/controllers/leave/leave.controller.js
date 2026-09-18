import asyncHandler from "../../utils/asyncHandler.js";
import LeaveApplication from "../../models/leave/LeaveApplication.js";
import Student from "../../models/users/Student.js";
import Faculty from "../../models/users/Faculty.js";
import LectureSession from "../../models/lecture/LectureSession.js";
import { applyLeaveToAttendance } from "../../utils/leaveService.js";
import { invalidatePrefix } from "../../services/cacheService.js";
import { refId } from "../../utils/ids.js";
import dayjs from "dayjs";

const ALLOWED_TYPES = ["FULL", "HALF", "LECTURE"];

function bustCaches() {
  invalidatePrefix("leave:");
  invalidatePrefix("facultyMentor:");
  invalidatePrefix("studentReport:");
}

/**
 * GET /api/leave/my — student's own applications (newest first).
 */
export const getMyLeaves = asyncHandler(async (req, res) => {
  const studentId = req.profileId;
  const list = await LeaveApplication.find({ studentId })
    .populate({
      path: "mentorId",
      select: "employeeId",
      populate: { path: "userId", select: "name" },
    })
    .populate("lectureIds", "topic startTime")
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, count: list.length, data: formatLeaves(list) });
});

/**
 * GET /api/leave/new-options — the lectures a student can pick from for a
 * LECTURE-type application on a given date (their section's lectures).
 */
export const getLeaveOptions = asyncHandler(async (req, res) => {
  const studentId = req.profileId;
  const { date } = req.query;
  const student = await Student.findById(studentId);
  if (!student) return res.status(404).json({ success: false, message: "Student not found" });

  const dayStart = dayjs(date).startOf("day");
  const dayEnd = dayjs(date).endOf("day");

  const lectures = await LectureSession.find({
    sectionId: student.sectionId,
    startTime: { $gte: dayStart.toDate(), $lte: dayEnd.toDate() },
  })
    .populate("subjectId", "subjectName subjectCode")
    .sort({ startTime: 1 })
    .lean();

  res.json({
    success: true,
    data: lectures.map((l) => ({
      id: l._id,
      topic: l.topic,
      subjectName: l.subjectId?.subjectName,
      subjectCode: l.subjectId?.subjectCode,
      startTime: l.startTime,
      time: dayjs(l.startTime).format("hh:mm A"),
    })),
  });
});

/**
 * POST /api/leave/apply — student submits a leave application.
 * Body: { type, date, reason, halfWhich?, lectureIds? }
 */
export const applyLeave = asyncHandler(async (req, res) => {
  const studentId = req.profileId;
  const { type, date, reason, halfWhich, lectureIds } = req.body || {};

  if (!ALLOWED_TYPES.includes(type)) {
    return res.status(400).json({ success: false, message: "Type must be FULL, HALF or LECTURE" });
  }
  if (!date) return res.status(400).json({ success: false, message: "Leave date is required" });
  if (!reason || !reason.trim()) {
    return res.status(400).json({ success: false, message: "Reason is required" });
  }
  if (type === "HALF" && !["FIRST", "SECOND"].includes(halfWhich)) {
    return res.status(400).json({ success: false, message: "For half leave choose FIRST or SECOND half" });
  }
  if (type === "LECTURE" && (!Array.isArray(lectureIds) || !lectureIds.length)) {
    return res.status(400).json({ success: false, message: "Select at least one lecture for lecture-wise leave" });
  }

  const student = await Student.findById(studentId).populate("sectionId", "name");
  if (!student) return res.status(404).json({ success: false, message: "Student not found" });

  // Auto-resolve mentor from the student's record
  const mentorId = student.mentorId || null;

  const dupe = await LeaveApplication.findOne({
    studentId,
    date: dayjs(date).startOf("day").toDate(),
    status: { $in: ["PENDING", "APPROVED"] },
  });
  if (dupe) {
    return res.status(409).json({
      success: false,
      message: "You already have a pending/approved leave for this date.",
    });
  }

  const leave = await LeaveApplication.create({
    studentId,
    mentorId,
    sectionId: student.sectionId || null,
    type,
    halfWhich: type === "HALF" ? halfWhich : undefined,
    date: dayjs(date).startOf("day").toDate(),
    lectureIds: type === "LECTURE" ? lectureIds.map(refId).filter(Boolean) : [],
    reason: reason.trim(),
    status: "PENDING",
  });

  bustCaches();

  res.status(201).json({
    success: true,
    message:
      mentorId
        ? "Leave application submitted to your mentor."
        : "Leave application submitted (no mentor assigned yet — admin will review).",
    data: leave,
  });
});

/**
 * GET /api/leave/mentor/pending — faculty mentor: their mentees' applications.
 */
export const getMentorLeaves = asyncHandler(async (req, res) => {
  const facultyId = req.profileId;
  const list = await LeaveApplication.find({ mentorId: facultyId })
    .populate({
      path: "studentId",
      select: "rollNumber sectionId",
      populate: [{ path: "userId", select: "name" }, { path: "sectionId", select: "name semester" }],
    })
    .populate("lectureIds", "topic startTime")
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, count: list.length, data: formatLeaves(list) });
});

/**
 * GET /api/leave/mentor/mentees — faculty mentor: their mentee list.
 */
export const getMyMentees = asyncHandler(async (req, res) => {
  const facultyId = req.profileId;
  const mentees = await Student.find({ mentorId: facultyId, isActive: true })
    .select("rollNumber sectionId semester departmentId")
    .populate("userId", "name email")
    .populate("sectionId", "name semester batchYear")
    .populate("departmentId", "name code")
    .sort({ rollNumber: 1 })
    .lean();

  res.json({ success: true, count: mentees.length, data: mentees });
});

/**
 * POST /api/leave/:id/decision — mentor approves/rejects.
 * Body: { decision: "APPROVED"|"REJECTED", remark? }
 */
export const decideLeave = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { decision, remark } = req.body || {};
  if (!["APPROVED", "REJECTED"].includes(decision)) {
    return res.status(400).json({ success: false, message: "decision must be APPROVED or REJECTED" });
  }

  const leave = await LeaveApplication.findById(id);
  if (!leave) return res.status(404).json({ success: false, message: "Leave application not found" });

  const faculty = req.profileId;
  const isAdmin = req.user?.role === "ADMIN";
  if (!isAdmin && leave.mentorId && refId(leave.mentorId) !== refId(faculty)) {
    return res.status(403).json({ success: false, message: "Only this student's mentor can decide" });
  }
  if (leave.status !== "PENDING") {
    return res.status(409).json({ success: false, message: "This application is already decided" });
  }

  leave.status = decision;
  leave.decidedBy = isAdmin ? null : faculty; // decidedBy expects a Faculty id
  leave.decidedAt = new Date();
  if (remark) leave.mentorRemark = remark.trim();
  await leave.save();

  // On approval, credit attendance (so the day doesn't count as absent)
  if (decision === "APPROVED") {
    await applyLeaveToAttendance(leave).catch(() => {});
  }

  bustCaches();

  res.json({
    success: true,
    message:
      decision === "APPROVED"
        ? "Leave approved — attendance for that day is credited."
        : "Leave rejected.",
    data: leave,
  });
});

function formatLeaves(list) {
  return list.map((l) => ({
    id: l._id,
    type: l.type,
    halfWhich: l.halfWhich,
    date: l.date,
    reason: l.reason,
    status: l.status,
    mentorRemark: l.mentorRemark,
    decidedAt: l.decidedAt,
    createdAt: l.createdAt,
    mentorName: l.mentorId?.userId?.name || null,
    mentorEmployeeId: l.mentorId?.employeeId || null,
    student: l.studentId
      ? {
          id: l.studentId._id,
          name: l.studentId.userId?.name || null,
          rollNumber: l.studentId.rollNumber,
          section: l.studentId.sectionId?.name || null,
          semester: l.studentId.sectionId?.semester ?? null,
        }
      : null,
    lectures: (l.lectureIds || []).map((lec) => ({
      id: lec._id || lec,
      topic: lec.topic || "",
      time: lec.startTime ? dayjs(lec.startTime).format("hh:mm A") : "",
    })),
  }));
}
