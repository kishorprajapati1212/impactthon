import asyncHandler from "../../utils/asyncHandler.js";
import { classLabel, classLabelLong } from "../../utils/classLabel.js";
import LectureSession from "../../models/lecture/LectureSession.js";
import FacultySubjectSection from "../../models/mapping/FacultySubjectSection.js";
import Faculty from "../../models/users/Faculty.js";
import { generateSessionToken } from "../../utils/generateQR.js";
import { validateStartLecture } from "../../validators/index.js";
import { finalizeLectureAbsentees, getSectionRostersBulk } from "../../utils/finalizeAttendance.js";
import { invalidatePrefix } from "../../services/cacheService.js";
import { refId, pct, toObjectIds } from "../../utils/ids.js";
import Attendance from "../../models/Attendance/Attendance.js";
import { parsePagination, parseSort, refFilter, escapeRegex, listEnvelope } from "../../utils/listQuery.js";
import { countLectureMarks, countLectureDependents, lectureDeletePolicy, deleteLectureCascade, describeDeletion } from "../../utils/deleteLecture.js";
import dayjs from "dayjs";
import GEOFENCE from "../../config/geofence.js";

/**
 * Wipe cached report/dashboard/analytics data whenever a lecture
 * lifecycle changes. Cache TTLs are short, but this makes the UI
 * update instantly after start/end/force-end.
 */
function invalidateLectureCaches() {
  invalidatePrefix("facultyDash:");
  invalidatePrefix("facultyHist:");
  invalidatePrefix("facultyHistFilters:");
  invalidatePrefix("studentReport:");
  invalidatePrefix("adminAnalytics:");
}

/** End one active lecture cleanly */
async function completeLecture(lecture) {
  if (!lecture || lecture.status !== "ACTIVE") return null;
  lecture.status = "COMPLETED";
  lecture.endTime = new Date();
  lecture.sessionToken = null;
  await lecture.save();
  const fin = await finalizeLectureAbsentees(lecture._id);
  invalidateLectureCaches();
  return fin;
}

/**
 * POST /lecture/start
 * Each faculty may only have ONE active session (their own).
 * Other faculty can always start in parallel — no global lock.
 */
export const startLectureSession = asyncHandler(async (req, res) => {
  const v = validateStartLecture(req.body);
  if (!v.valid) {
    return res.status(400).json({
      success: false,
      message: v.errors.map((e) => e.msg).join(". "),
      errors: v.errors,
      code: "VALIDATION",
    });
  }

  const { subjectId, sectionId, topic, description, location, attendanceWindow } =
    req.body;
  const facultyId = req.profileId;

  if (!topic?.trim()) {
    return res.status(400).json({
      success: false,
      message: "Topic is required",
      code: "TOPIC_REQUIRED",
    });
  }

  const assignment = await FacultySubjectSection.findOne({
    facultyId,
    subjectId,
    sectionId,
    isActive: true,
  });
  if (!assignment && req.user.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "You are not assigned to this subject–section. Contact admin.",
      code: "NOT_ASSIGNED",
    });
  }

  // Close ONLY this faculty's stuck ACTIVE sessions (never blocks other teachers)
  const mineActive = await LectureSession.find({
    facultyId,
    status: "ACTIVE",
  });
  for (const old of mineActive) {
    await completeLecture(old);
  }

  const serverTime = Date.now();
  const b = location?.bounds || {};
  const d = GEOFENCE.defaults;
  // Persist an explicit boolean flag so the UI/API can distinguish
  // "faculty shared real GPS" from legacy/derived values.
  const lat = location && location.latitude != null ? Number(location.latitude) : null;
  const lon = location && location.longitude != null ? Number(location.longitude) : null;
  const hasValidLat = lat != null && Number.isFinite(lat) && Math.abs(lat) <= 90;
  const hasValidLon = lon != null && Number.isFinite(lon) && Math.abs(lon) <= 180;
  const loc = {
    latitude: hasValidLat ? lat : null,
    longitude: hasValidLon ? lon : null,
    radius: location?.radius ?? d.radius,
    accuracy: location && location.accuracy != null ? Number(location.accuracy) : null,
    hasGps: Boolean(hasValidLat && hasValidLon),
    bounds: {
      north: b.north ?? d.north,
      south: b.south ?? d.south,
      east: b.east ?? d.east,
      west: b.west ?? d.west,
    },
  };

  const lecture = await LectureSession.create({
    facultyId,
    subjectId,
    sectionId,
    topic: topic.trim(),
    description,
    status: "ACTIVE",
    startTime: new Date(),
    location: loc,
    attendanceWindow: attendanceWindow || 15,
    sessionToken: "pending",
  });

  const sessionToken = generateSessionToken(lecture._id);
  lecture.sessionToken = sessionToken;
  await lecture.save();

  invalidateLectureCaches();

  res.status(201).json({
    success: true,
    message: "Lecture started",
    data: {
      lectureSessionId: lecture._id,
      sessionToken,
      serverTime,
      topic: lecture.topic,
      startTime: lecture.startTime,
      status: lecture.status,
      location: lecture.location,
      attendanceWindow: lecture.attendanceWindow,
    },
  });
});

export const endLectureSession = asyncHandler(async (req, res) => {
  const { lectureSessionId } = req.body;
  if (!lectureSessionId) {
    return res.status(400).json({
      success: false,
      message: "lectureSessionId is required",
      code: "ID_REQUIRED",
    });
  }

  const facultyId = req.profileId;
  let lecture = await LectureSession.findOne({
    _id: lectureSessionId,
    facultyId,
    status: "ACTIVE",
  });

  // Already ended (e.g. admin force-end) — treat as success so UI can clear
  if (!lecture) {
    const any = await LectureSession.findById(lectureSessionId);
    if (any && refId(any.facultyId) === refId(facultyId)) {
      return res.json({
        success: true,
        message: "Lecture already ended",
        data: {
          lectureSessionId: any._id,
          status: any.status,
          alreadyEnded: true,
          totalMarked: any.totalMarked,
        },
      });
    }
    return res.status(404).json({
      success: false,
      message: "Active lecture not found. It may have already ended.",
      code: "NOT_FOUND",
    });
  }

  const fin = await completeLecture(lecture);
  const duration = dayjs(lecture.endTime).diff(dayjs(lecture.startTime), "minute");
  res.json({
    success: true,
    message: "Lecture ended",
    data: {
      lectureSessionId: lecture._id,
      duration,
      totalMarked: fin?.presentCount ?? lecture.totalMarked,
      absentMarked: fin?.absentCreated ?? 0,
      rosterSize: fin?.rosterSize ?? 0,
    },
  });
});

/** Faculty: get my current ACTIVE session (for restoring UI / clearing stale) */
export const getMyActiveLecture = asyncHandler(async (req, res) => {
  const facultyId = req.profileId;
  const lecture = await LectureSession.findOne({
    facultyId,
    status: "ACTIVE",
  })
    .populate("subjectId", "subjectName subjectCode")
    .populate({ path: "sectionId", select: "name semester batchYear departmentId", populate: { path: "departmentId", select: "code name" } })
    .sort({ startTime: -1 });

  if (!lecture) {
    return res.json({ success: true, data: null });
  }

  res.json({
    success: true,
    data: {
      lectureSessionId: lecture._id,
      sessionToken: lecture.sessionToken,
      topic: lecture.topic,
      startTime: lecture.startTime,
      status: lecture.status,
      location: lecture.location,
      attendanceWindow: lecture.attendanceWindow,
      subject: lecture.subjectId,
      section: lecture.sectionId,
      classLabel: classLabel(lecture.sectionId),
      serverTime: Date.now(),
    },
  });
});

export const getFacultyDashboard = asyncHandler(async (req, res) => {
  const facultyId = req.profileId;
  const [total, active, completed] = await Promise.all([
    LectureSession.countDocuments({ facultyId }),
    LectureSession.countDocuments({ facultyId, status: "ACTIVE" }),
    LectureSession.countDocuments({ facultyId, status: "COMPLETED" }),
  ]);
  const recent = await LectureSession.find({ facultyId })
    .populate("subjectId", "subjectName subjectCode")
    .populate({ path: "sectionId", select: "name semester batchYear departmentId", populate: { path: "departmentId", select: "code name" } })
    .sort({ startTime: -1 })
    .limit(50)
    .lean();
  res.json({
    success: true,
    data: {
      stats: {
        totalLectures: total,
        activeLectures: active,
        completedLectures: completed,
      },
      recentLectures: recent.map((l) => ({
        id: l._id,
        topic: l.topic,
        subject: l.subjectId?.subjectName,
        subjectCode: l.subjectId?.subjectCode,
        section: l.sectionId?.name,
        semester: l.sectionId?.semester,
        batchYear: l.sectionId?.batchYear,
        departmentCode: l.sectionId?.departmentId?.code || null,
        classLabel: classLabel(l.sectionId),
        date: l.startTime,
        status: l.status,
        presentCount: l.totalMarked,
      })),
    },
  });
});

/**
 * POST /admin/lecture/end
 * Force-end one session — always clears ACTIVE so it disappears for everyone
 */
export const adminEndLecture = asyncHandler(async (req, res) => {
  const lectureSessionId =
    req.body?.lectureSessionId || req.body?.id || req.body?._id;
  if (!lectureSessionId) {
    return res.status(400).json({
      success: false,
      message: "lectureSessionId is required",
      code: "ID_REQUIRED",
    });
  }

  let lecture = await LectureSession.findById(lectureSessionId);
  if (!lecture) {
    return res.status(404).json({
      success: false,
      message: "Lecture not found",
      code: "NOT_FOUND",
    });
  }

  if (lecture.status === "ACTIVE") {
    const fin = await completeLecture(lecture);
    return res.json({
      success: true,
      message: "Lecture force-ended by admin",
      data: {
        lectureSessionId: lecture._id,
        status: "COMPLETED",
        absentMarked: fin?.absentCreated ?? 0,
        presentCount: fin?.presentCount ?? 0,
      },
    });
  }

  // Already ended — still success so admin UI refreshes cleanly
  res.json({
    success: true,
    message: `Lecture already ${lecture.status.toLowerCase()}`,
    data: {
      lectureSessionId: lecture._id,
      status: lecture.status,
      alreadyEnded: true,
    },
  });
});

/** Admin: end ALL active lectures (cleanup stuck sessions) */
export const adminEndAllLectures = asyncHandler(async (req, res) => {
  const active = await LectureSession.find({ status: "ACTIVE" });
  let ended = 0;
  for (const lec of active) {
    await completeLecture(lec);
    ended++;
  }
  res.json({
    success: true,
    message: `Force-ended ${ended} active lecture(s)`,
    data: { ended },
  });
});

export const getActiveLectures = asyncHandler(async (req, res) => {
  const lectures = await LectureSession.find({ status: "ACTIVE" })
    .populate({
      path: "facultyId",
      populate: { path: "userId", select: "name email" },
    })
    .populate("subjectId", "subjectName subjectCode")
    .populate({ path: "sectionId", select: "name semester batchYear departmentId", populate: { path: "departmentId", select: "code name" } })
    .sort({ startTime: -1 })
    .lean();

  const formatted = lectures.map((l) => ({
    id: l._id,
    _id: l._id,
    topic: l.topic,
    faculty:
      l.facultyId?.userId?.name ||
      l.facultyId?.employeeId ||
      "Unknown",
    facultyId: l.facultyId?._id,
    subject: l.subjectId?.subjectName,
    subjectCode: l.subjectId?.subjectCode,
    section: l.sectionId?.name,
    batchYear: l.sectionId?.batchYear ?? null,
    semester: l.sectionId?.semester ?? null,
    departmentCode: l.sectionId?.departmentId?.code || null,
    classLabel: classLabel(l.sectionId),
    classLabelLong: classLabelLong(l.sectionId),
    startTime: l.startTime,
    presentCount: l.totalMarked,
    elapsedMin: dayjs().diff(dayjs(l.startTime), "minute"),
    status: l.status,
  }));

  res.json({ success: true, count: formatted.length, data: formatted });
});

/* ────────────────────────────────────────────────────────────────────
 * Phase 18 — every lecture (admin) + deleting a lecture
 * ──────────────────────────────────────────────────────────────────── */

const LECTURE_POPULATE = [
  { path: "facultyId", select: "employeeId userId", populate: { path: "userId", select: "name email" } },
  { path: "subjectId", select: "subjectName subjectCode" },
  { path: "sectionId", select: "name semester batchYear batchEndYear departmentId", populate: { path: "departmentId", select: "code name" } },
];

const shapeLecture = (l, extra = {}) => ({
  id: l._id,
  _id: l._id,
  topic: l.topic,
  faculty: l.facultyId?.userId?.name || l.facultyId?.employeeId || "Unknown",
  facultyId: refId(l.facultyId),
  subject: l.subjectId?.subjectName,
  subjectCode: l.subjectId?.subjectCode,
  subjectId: refId(l.subjectId),
  section: l.sectionId?.name,
  sectionId: refId(l.sectionId),
  batchYear: l.sectionId?.batchYear ?? null,
  semester: l.sectionId?.semester ?? null,
  departmentCode: l.sectionId?.departmentId?.code || null,
  classLabel: classLabel(l.sectionId),
  classLabelLong: classLabelLong(l.sectionId),
  startTime: l.startTime,
  endTime: l.endTime,
  durationMin: l.endTime ? dayjs(l.endTime).diff(dayjs(l.startTime), "minute") : l.status === "ACTIVE" ? dayjs().diff(dayjs(l.startTime), "minute") : null,
  status: l.status,
  presentCount: l.totalMarked || 0,
  ...extra,
});

/**
 * Admin: every lecture, past and running, with the usual list filters.
 * GET /admin/lectures?status=&faculty=&section=&subject=&from=&to=&search=&page=&limit=&sortBy=&order=
 * Response = the standard admin list envelope.
 */
export const adminListLectures = asyncHandler(async (req, res) => {
  const q = req.query || {};
  const match = {};
  if (q.status && ["ACTIVE", "COMPLETED", "SCHEDULED", "CANCELLED"].includes(String(q.status).toUpperCase())) {
    match.status = String(q.status).toUpperCase();
  }
  const fac = refFilter(q.faculty);
  if (fac) match.facultyId = fac;
  const sec = refFilter(q.section ?? q.class);
  if (sec) match.sectionId = sec;
  const sub = refFilter(q.subject);
  if (sub) match.subjectId = sub;
  const from = q.from ? dayjs(q.from) : null;
  const to = q.to ? dayjs(q.to) : null;
  if ((from && from.isValid()) || (to && to.isValid())) {
    match.startTime = {};
    if (from && from.isValid()) match.startTime.$gte = from.startOf("day").toDate();
    if (to && to.isValid()) match.startTime.$lte = to.endOf("day").toDate();
  }
  if (q.search && String(q.search).trim()) {
    match.topic = { $regex: escapeRegex(String(q.search).trim()), $options: "i" };
  }

  const { page, limit, skip } = parsePagination(q, { defaultLimit: 50, maxLimit: 500 });
  const sort = parseSort(q, ["startTime", "status", "totalMarked", "topic"], { field: "startTime", order: "desc" });

  const [total, lectures] = await Promise.all([
    LectureSession.countDocuments(match),
    LectureSession.find(match).populate(LECTURE_POPULATE).sort(sort).skip(skip).limit(limit).lean(),
  ]);

  // Real mark counts for the rows on this page (totalMarked is only presence)
  const ids = lectures.map((l) => l._id);
  const markRows = ids.length
    ? await Attendance.aggregate([
        { $match: { lectureSessionId: { $in: toObjectIds(ids) } } },
        { $group: { _id: { lecture: "$lectureSessionId", status: "$status" }, n: { $sum: 1 } } },
      ])
    : [];
  const marks = new Map();
  for (const r of markRows) {
    const key = String(r._id.lecture);
    const m = marks.get(key) || { present: 0, total: 0 };
    m.total += r.n;
    if (r._id.status === "PRESENT" || r._id.status === "LATE") m.present += r.n;
    marks.set(key, m);
  }
  const rosters = await getSectionRostersBulk(lectures.map((l) => l.sectionId));

  const data = lectures.map((l) => {
    const m = marks.get(String(l._id)) || { present: 0, total: 0 };
    const roster = rosters.get(refId(l.sectionId)) || [];
    const present = l.status === "ACTIVE" ? Math.max(l.totalMarked || 0, m.present) : m.present;
    return shapeLecture(l, { presentCount: present, marksTotal: m.total, rosterSize: roster.length, attendanceRate: pct(present, roster.length) });
  });

  res.json(listEnvelope(data, { total, page, limit }));
});

/** Load one lecture with the names the UI shows, or null. */
async function loadLectureForDelete(id) {
  if (!/^[0-9a-fA-F]{24}$/.test(String(id || ""))) return null;
  return LectureSession.findById(id).populate(LECTURE_POPULATE).lean();
}

/**
 * What deleting this lecture would do, and whether the caller may do it.
 * GET /lecture/:id/delete-preview  (FACULTY own · ADMIN any)
 */
export const getLectureDeletePreview = asyncHandler(async (req, res) => {
  const lecture = await loadLectureForDelete(req.params.id);
  if (!lecture) {
    return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Lecture not found. It may already have been deleted." });
  }
  const [counts, dependents] = await Promise.all([countLectureMarks(lecture._id), countLectureDependents(lecture._id)]);
  const policy = lectureDeletePolicy({ role: req.user?.role, facultyId: req.profileId, lecture, presentCount: counts.present });
  res.json({
    success: true,
    data: {
      lecture: shapeLecture(lecture, { presentCount: counts.present }),
      marks: counts,
      leaveApplications: dependents.leaveApplications,
      notifications: dependents.notifications,
      allowed: policy.allowed,
      reason: policy.allowed ? null : policy.message,
      code: policy.allowed ? null : policy.code,
    },
  });
});

/**
 * Delete a lecture and everything that points at it.
 * DELETE /lecture/:id  (FACULTY: own + running or no presence · ADMIN: any)
 * See utils/deleteLecture.js for the exact cascade and why.
 */
export const deleteLecture = asyncHandler(async (req, res) => {
  const lecture = await loadLectureForDelete(req.params.id);
  const counts = lecture ? await countLectureMarks(lecture._id) : null;
  const policy = lectureDeletePolicy({ role: req.user?.role, facultyId: req.profileId, lecture, presentCount: counts?.present || 0 });
  if (!policy.allowed) {
    return res.status(policy.status).json({ success: false, code: policy.code, message: policy.message });
  }

  const result = await deleteLectureCascade(lecture, { req, counts });
  res.json({
    success: true,
    message: describeDeletion(result),
    data: {
      ...result,
      lecture: { id: String(lecture._id), topic: lecture.topic, classLabel: classLabel(lecture.sectionId), subjectCode: lecture.subjectId?.subjectCode || null },
    },
  });
});
