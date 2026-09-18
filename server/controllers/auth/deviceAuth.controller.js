import asyncHandler from "../../utils/asyncHandler.js";
import StudentSession from "../../models/users/StudentSession.js";
import Student from "../../models/users/Student.js";
import Faculty from "../../models/users/Faculty.js";
import { refId } from "../../utils/ids.js";

function present(sess) {
  return {
    id: sess._id,
    loginId: sess.loginId,
    deviceLabel: sess.deviceLabel || "Unknown device",
    deviceMeta: sess.deviceMeta || null,
    status: sess.status,
    reason: sess.reason,
    remark: sess.remark,
    createdAt: sess.createdAt,
    decidedAt: sess.decidedAt,
    student: sess.studentId
      ? {
          id: refId(sess.studentId),
          name: sess.studentId?.userId?.name || null,
          rollNumber: sess.studentId?.rollNumber || null,
          section: sess.studentId?.sectionId?.name || null,
        }
      : null,
    mentor: sess.studentId?.mentorId
      ? {
          id: refId(sess.studentId.mentorId),
          name: sess.studentId.mentorId?.userId?.name || null,
        }
      : null,
  };
}

/**
 * GET /api/device/mentor/pending — mentor's students' login requests.
 */
export const getMentorPendingLogins = asyncHandler(async (req, res) => {
  const facultyId = req.profileId;

  // Students whose mentor is this faculty
  const studentIds = await Student.find({ mentorId: facultyId })
    .select("_id")
    .lean();
  const ids = studentIds.map((s) => s._id);

  const list = ids.length
    ? await StudentSession.find({ studentId: { $in: ids }, status: "PENDING" })
        .populate({
          path: "studentId",
          select: "rollNumber userId sectionId mentorId",
          populate: [
            { path: "userId", select: "name" },
            { path: "sectionId", select: "name" },
            { path: "mentorId", select: "employeeId", populate: { path: "userId", select: "name" } },
          ],
        })
        .sort({ createdAt: -1 })
        .lean()
    : [];

  res.json({ success: true, count: list.length, data: list.map(present) });
});

/**
 * GET /api/device/admin/pending — all pending login requests (admin).
 */
export const getAdminPendingLogins = asyncHandler(async (req, res) => {
  const list = await StudentSession.find({ status: "PENDING" })
    .populate({
      path: "studentId",
      select: "rollNumber userId sectionId mentorId",
      populate: [
        { path: "userId", select: "name" },
        { path: "sectionId", select: "name" },
        { path: "mentorId", select: "employeeId", populate: { path: "userId", select: "name" } },
      ],
    })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, count: list.length, data: list.map(present) });
});

/**
 * POST /api/device/:id/decision — mentor (or admin) accepts/rejects a login.
 * Body: { decision: "ACCEPT" | "REJECT", remark? }
 */
export const decideLogin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { decision, remark } = req.body || {};

  const session = await StudentSession.findById(id);
  if (!session) return res.status(404).json({ success: false, message: "Login request not found" });

  const isAdmin = req.user?.role === "ADMIN";
  if (!isAdmin) {
    const faculty = await Faculty.findOne({ userId: req.user._id });
    if (!faculty) return res.status(403).json({ success: false, message: "Faculty profile not found" });

    const student = await Student.findById(session.studentId);
    const mentorId = student?.mentorId ? refId(student.mentorId) : null;
    if (!mentorId || mentorId !== refId(faculty._id)) {
      return res.status(403).json({
        success: false,
        message: "Only this student's mentor can approve the login request.",
      });
    }
  }

  if (session.status !== "PENDING") {
    return res.status(409).json({ success: false, message: "This login request was already decided." });
  }

  if (decision === "ACCEPT" || decision === "APPROVED") {
    session.status = "ACTIVE";
    // Single active device: close every other ACTIVE session for this student
    await StudentSession.updateMany(
      { studentId: session.studentId, _id: { $ne: session._id }, status: "ACTIVE" },
      { status: "LOGGED_OUT" }
    );
  } else if (decision === "REJECT" || decision === "REJECTED") {
    session.status = "REJECTED";
  } else {
    return res.status(400).json({ success: false, message: "decision must be ACCEPT or REJECT" });
  }

  session.decidedBy = isAdmin ? null : req.profileId;
  session.decidedAt = new Date();
  if (remark) session.remark = remark.trim() || null;
  await session.save();

  await session.populate({
    path: "studentId",
    select: "rollNumber userId sectionId mentorId",
    populate: [
      { path: "userId", select: "name" },
      { path: "sectionId", select: "name" },
    ],
  });

  res.json({
    success: true,
    message:
      session.status === "ACTIVE"
        ? "Login approved — the student can now use AttendX on this device."
        : "Login rejected.",
    data: {
      id: session._id,
      loginId: session.loginId,
      status: session.status,
      student: present(session).student,
    },
  });
});

/**
 * GET /api/device/mentor/sessions — mentor's students' recent login sessions
 * (history incl. rejected/active/logged-out), for oversight.
 */
export const getMentorSessionHistory = asyncHandler(async (req, res) => {
  const facultyId = req.profileId;
  const studentIds = await Student.find({ mentorId: facultyId }).select("_id").lean();
  const ids = studentIds.map((s) => s._id);
  const list = ids.length
    ? await StudentSession.find({ studentId: { $in: ids } })
        .populate({
          path: "studentId",
          select: "rollNumber userId sectionId",
          populate: [
            { path: "userId", select: "name" },
            { path: "sectionId", select: "name" },
          ],
        })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean()
    : [];
  res.json({ success: true, count: list.length, data: list.map(present) });
});
