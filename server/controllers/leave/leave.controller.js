import asyncHandler from "../../utils/asyncHandler.js";
import LeaveApplication from "../../models/leave/LeaveApplication.js";
import Student from "../../models/users/Student.js";
import Faculty from "../../models/users/Faculty.js";
import LectureSession from "../../models/lecture/LectureSession.js";
import Attendance from "../../models/Attendance/Attendance.js";
import { mentorHistoryFor, menteeIdsFor, startMentorship } from "../../utils/mentorshipHistory.js";
import { applyLeaveToAttendance } from "../../utils/leaveService.js";
import { invalidatePrefix } from "../../services/cacheService.js";
import { refId } from "../../utils/ids.js";
import { classLabel } from "../../utils/classLabel.js";
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
      populate: [{ path: "userId", select: "name" }, { path: "sectionId", select: "name semester batchYear departmentId", populate: { path: "departmentId", select: "code name" } }],
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
    .select("rollNumber sectionId semester departmentId lifecycleStatus leftAt isActive")
    .populate("userId", "name email")
    .populate({ path: "sectionId", select: "name semester batchYear departmentId", populate: { path: "departmentId", select: "name code" } })
    .populate("departmentId", "name code")
    .sort({ rollNumber: 1 })
    .lean();

  // Backfill: students assigned a mentor before MentorStudentHistory existed
  // get their first history row the first time this list is opened.
  for (const m of mentees) startMentorship(m, null).catch(() => {});

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
          classLabel: l.studentId.sectionId ? classLabel(l.studentId.sectionId) : null,
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

/**
 * GET /api/leave/mentor/mentees/:studentId/detail
 * Full mentee profile for the mentor: identity, class, mentor, overall +
 * subject-wise attendance, recent lectures and leave history.
 * Access: only that student's mentor (or ADMIN). No model changes.
 */
export const getMenteeDetail = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const student = await Student.findById(studentId)
    .populate("userId", "name email")
    .populate({ path: "sectionId", select: "name semester batchYear batchEndYear", populate: { path: "departmentId", select: "name code" } })
    .populate("departmentId", "name code")
    .populate({ path: "mentorId", select: "employeeId designation", populate: { path: "userId", select: "name email" } })
    .lean();
  if (!student) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Student not found." });
  const isAdmin = req.user?.role === "ADMIN";
  const pastMentorIds = isAdmin ? [] : await menteeIdsFor(req.profileId);
  const isCurrentMentor = refId(student.mentorId?._id || student.mentorId) === refId(req.profileId);
  if (!isAdmin && !isCurrentMentor && !pastMentorIds.includes(String(student._id))) {
    return res.status(403).json({ success: false, code: "FORBIDDEN", message: "This student is not assigned to you as a mentee." });
  }
  const mentorHistory = await mentorHistoryFor(student._id).catch(() => []);
  let attendances = await Attendance.find({ studentId }).sort({ createdAt: -1 }).lean();
  const lecIds = attendances.map(a => a.lectureSessionId);
  const lectures = await LectureSession.find({ _id: { $in: lecIds } }).populate("subjectId", "subjectName subjectCode").lean();
  const byId = new Map(lectures.map(l => [String(l._id), l]));
  attendances = attendances.map(a => ({ ...a, lecture: byId.get(String(a.lectureSessionId)) || null }));
  const leaves = await LeaveApplication.find({ studentId }).sort({ createdAt: -1 }).limit(20).lean();

  const counted = attendances.filter(a => ["PRESENT","LATE","ABSENT"].includes(a.status));
  const present = attendances.filter(a => a.status === "PRESENT" || a.status === "LATE").length;
  const absent = attendances.filter(a => a.status === "ABSENT").length;
  const subjects = {};
  for (const a of attendances) {
    const name = a.lecture?.subjectId?.subjectName || "Unknown subject";
    const code = a.lecture?.subjectId?.subjectCode || "";
    const key = code || name;
    subjects[key] = subjects[key] || { subject: name, subjectCode: code, total: 0, present: 0, absent: 0, percentage: 0 };
    if (["PRESENT","LATE","ABSENT"].includes(a.status)) { subjects[key].total++; if (a.status === "ABSENT") subjects[key].absent++; else subjects[key].present++; }
  }
  Object.values(subjects).forEach(s => { s.percentage = s.total ? Math.round((s.present / s.total) * 100) : 0; });

  res.json({ success: true, data: {
    student: {
      id: student._id, name: student.userId?.name || null, email: student.userId?.email || null,
      rollNumber: student.rollNumber, phone: student.phone || null, parentPhone: student.parentPhone || null,
      semester: student.semester, enrollmentYear: student.enrollmentYear, isActive: student.isActive,
      section: student.sectionId ? { name: student.sectionId.name, semester: student.sectionId.semester, batchYear: student.sectionId.batchYear, departmentId: student.sectionId.departmentId || null } : null,
      classLabel: student.sectionId ? classLabel(student.sectionId) : null,
      department: student.departmentId?.name || student.sectionId?.departmentId?.name || null,
      mentor: student.mentorId ? { name: student.mentorId.userId?.name || null, email: student.mentorId.userId?.email || null, employeeId: student.mentorId.employeeId } : null,
      lifecycleStatus: student.lifecycleStatus || "STUDYING",
      leftAt: student.leftAt || null,
      leavingNote: student.leavingNote || null,
      mentorHistory: (mentorHistory || []).map((h) => ({
        mentorName: h.mentorId?.userId?.name || null, employeeId: h.mentorId?.employeeId || null,
        from: h.startsAt, to: h.endsAt, endReason: h.endReason, current: !h.endsAt,
      })),
    },
    summary: { totalLectures: counted.length, present, absent,
      late: attendances.filter(a=>a.status==="LATE").length,
      onLeave: attendances.filter(a=>a.status==="LEAVE").length,
      excused: attendances.filter(a=>a.status==="EXCUSED").length,
      percentage: counted.length ? Math.round((present / counted.length) * 100) : 0 },
    subjectBreakdown: Object.values(subjects).sort((a,b)=>a.percentage-b.percentage),
    recent: attendances.slice(0, 20).map(a => ({ status: a.status, markedAt: a.markedAt, date: a.lecture?.startTime || a.createdAt,
      topic: a.lecture?.topic || "Lecture", subject: a.lecture?.subjectId?.subjectName || "", subjectCode: a.lecture?.subjectId?.subjectCode || "" })),
    leaves: leaves.map(l => ({ id: l._id, type: l.type, date: l.date, reason: l.reason, status: l.status, mentorRemark: l.mentorRemark })),
  }});
});

/**
 * GET /api/leave/mentor/former-mentees — students this faculty mentored in the
 * past (mentor changed, course completed, transferred or left). Their full
 * record stays openable through the normal mentee-detail endpoint.
 */
export const getMyFormerMentees = asyncHandler(async (req, res) => {
  const facultyId = req.profileId;
  const ids = await menteeIdsFor(facultyId, { formerOnly: true });
  const current = await Student.find({ mentorId: facultyId }).select("_id").lean();
  const currentIds = new Set(current.map((s) => String(s._id)));
  const formerIds = ids.filter((id) => !currentIds.has(id));
  const mentees = await Student.find({ _id: { $in: formerIds } })
    .select("rollNumber sectionId semester departmentId lifecycleStatus leftAt isActive")
    .populate("userId", "name email")
    .populate("sectionId", "name semester batchYear")
    .populate("departmentId", "name code")
    .sort({ rollNumber: 1 }).lean();
  res.json({ success: true, count: mentees.length, data: mentees });
});
