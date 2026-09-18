import asyncHandler from "../../utils/asyncHandler.js";
import Attendance from "../../models/Attendance/Attendance.js";
import LectureSession from "../../models/lecture/LectureSession.js";
import Student from "../../models/users/Student.js";
import Section from "../../models/Academics/Section.js";
import FacultySubjectSection from "../../models/mapping/FacultySubjectSection.js";
import Subject from "../../models/Academics/Subject.js";
import Faculty from "../../models/users/Faculty.js";
import {
  buildLectureRosterView,
  finalizeLecturesBulk,
  getSectionRoster,
  getSectionRostersBulk,
} from "../../utils/finalizeAttendance.js";
import { cacheGet, cacheSet } from "../../services/cacheService.js";
import { refId, pct } from "../../utils/ids.js";

// ── Cache helpers (short TTL; lecture lifecycle invalidates on write) ──
async function cached(key, ttl, fetchFn) {
  const hit = await cacheGet(key);
  if (hit !== null && hit !== undefined) return hit;
  const data = await fetchFn();
  if (data !== null && data !== undefined) await cacheSet(key, data, ttl);
  return data;
}

/**
 * Student report: every lecture for their section + true P/A %
 */
export const getStudentAttendanceReport = asyncHandler(async (req, res) => {
  const studentId = req.profileId;
  const data = await cached(
    `studentReport:${studentId}`,
    20,
    async () => {
      const student = await Student.findById(studentId);
      if (!student) return { __notFound: true };

      const sectionId = refId(student.sectionId);
      // Only COMPLETED lectures count toward % (ACTIVE shown as pending separately)
      const lectureQuery = { status: { $in: ["COMPLETED", "ACTIVE"] } };
      if (sectionId) lectureQuery.sectionId = sectionId;

      const lectures = await LectureSession.find(lectureQuery)
        .populate("subjectId", "subjectName subjectCode")
        .sort({ startTime: -1 })
        .lean();

      // Batch-repair completed lectures for this section (single bulk op
      // instead of one query per lecture — big speedup on first load).
      const completedIds = lectures
        .filter((l) => l.status === "COMPLETED")
        .map((l) => l._id);
      if (completedIds.length) {
        await finalizeLecturesBulk(completedIds);
      }

      // Re-read attendance after repair
      const attendances = await Attendance.find({ studentId }).lean();
      const attByLec = new Map(
        attendances.map((a) => [String(a.lectureSessionId), a])
      );

      const subjectMap = {};
      const details = [];
      let present = 0;
      let absent = 0;

      for (const lec of lectures) {
        const att = attByLec.get(String(lec._id));
        let status = "ABSENT";
        if (att?.status) status = att.status;
        else if (lec.status === "ACTIVE") status = "PENDING";

        if (status === "PRESENT" || status === "LATE") present++;
        else if (status === "ABSENT") absent++;

        const subjectName = lec.subjectId?.subjectName || "Unknown";
        const subjectCode = lec.subjectId?.subjectCode || "";
        if (!subjectMap[subjectName]) {
          subjectMap[subjectName] = {
            subject: subjectName,
            subjectCode,
            total: 0,
            present: 0,
            absent: 0,
            pending: 0,
          };
        }
        if (status === "PENDING") {
          subjectMap[subjectName].pending++;
        } else if (status !== "EXCUSED" && status !== "LEAVE") {
          subjectMap[subjectName].total++;
          if (status === "PRESENT" || status === "LATE") {
            subjectMap[subjectName].present++;
          } else {
            subjectMap[subjectName].absent++;
          }
        }

        details.push({
          lectureId: lec._id,
          subject: subjectName,
          subjectCode,
          topic: lec.topic,
          date: lec.startTime,
          status,
          markedAt: att?.markedAt || null,
          markMethod: att?.markMethod || null,
        });
      }

      const counted = present + absent;
      const subjectBreakdown = Object.values(subjectMap).map((s) => ({
        ...s,
        percentage: pct(s.present, s.total),
      }));

      return {
        summary: {
          totalLectures: counted,
          present,
          absent,
          percentage: pct(present, counted),
          pendingActive: details.filter((d) => d.status === "PENDING").length,
        },
        subjectBreakdown,
        details,
      };
    }
  );

  if (data?.__notFound) {
    return res.status(404).json({ success: false, message: "Student not found" });
  }
  res.json({ success: true, data });
});

export const getLectureAttendanceSummary = asyncHandler(async (req, res) => {
  const { lectureSessionId } = req.params;
  const data = await cached(
    `lectureSummary:${lectureSessionId}`,
    15,
    async () => {
      const view = await buildLectureRosterView(lectureSessionId);
      if (!view) return null;
      const { lecture, summary, students } = view;
      return {
        lectureInfo: {
          id: lectureSessionId,
          subject: lecture.subjectId?.subjectName,
          subjectCode: lecture.subjectId?.subjectCode,
          subjectId: refId(lecture.subjectId),
          section: lecture.sectionId?.name,
          sectionId: refId(lecture.sectionId),
          semester: lecture.sectionId?.semester,
          batchYear: lecture.sectionId?.batchYear,
          topic: lecture.topic,
          date: lecture.startTime,
          status: lecture.status,
          startTime: lecture.startTime,
          endTime: lecture.endTime,
          location: lecture.location,
        },
        summary,
        students,
      };
    }
  );
  if (!data) {
    return res.status(404).json({ success: false, message: "Lecture not found" });
  }
  res.json({ success: true, data });
});

export const getFacultyDashboardStats = asyncHandler(async (req, res) => {
  const facultyId = req.profileId;
  const data = await cached(`facultyDash:${facultyId}`, 12, async () => {
    const [total, active, completed, assignments] = await Promise.all([
      LectureSession.countDocuments({ facultyId }),
      LectureSession.countDocuments({ facultyId, status: "ACTIVE" }),
      LectureSession.countDocuments({ facultyId, status: "COMPLETED" }),
      FacultySubjectSection.find({ facultyId, isActive: true })
        .populate("subjectId", "subjectName subjectCode")
        .populate({
          path: "sectionId",
          select: "name semester batchYear",
          populate: { path: "departmentId", select: "name code" },
        })
        .lean(),
    ]);

    const recentLectures = await LectureSession.find({ facultyId })
      .populate("subjectId", "subjectName subjectCode")
      .populate("sectionId", "name semester batchYear")
      .sort({ startTime: -1 })
      .limit(30)
      .lean();

    // One bulk repair pass instead of per-lecture loops
    const completedIds = recentLectures
      .filter((l) => l.status === "COMPLETED")
      .map((l) => l._id);
    if (completedIds.length) await finalizeLecturesBulk(completedIds);

    const refreshed = await LectureSession.find({
      _id: { $in: recentLectures.map((l) => l._id) },
    })
      .populate("subjectId", "subjectName subjectCode")
      .populate("sectionId", "name semester batchYear")
      .sort({ startTime: -1 })
      .lean();

    const formatted = refreshed.map((l) => ({
      id: l._id,
      topic: l.topic,
      subject: l.subjectId?.subjectName,
      subjectCode: l.subjectId?.subjectCode,
      subjectId: refId(l.subjectId),
      section: l.sectionId?.name,
      sectionId: refId(l.sectionId),
      semester: l.sectionId?.semester,
      batchYear: l.sectionId?.batchYear,
      date: l.startTime,
      status: l.status,
      presentCount: l.totalMarked,
    }));

    return {
      stats: {
        totalLectures: total,
        activeLectures: active,
        completedLectures: completed,
        assignments: assignments.length,
      },
      recentLectures: formatted,
      assignments: assignments.map((a) => ({
        id: a._id,
        subjectId: refId(a.subjectId),
        subject: a.subjectId?.subjectName,
        subjectCode: a.subjectId?.subjectCode,
        sectionId: refId(a.sectionId),
        section: a.sectionId?.name,
        semester: a.sectionId?.semester ?? a.semester,
        batchYear: a.sectionId?.batchYear,
        academicYear: a.academicYear,
      })),
    };
  });
  res.json({ success: true, data });
});

/** Filters from FACULTY ASSIGNMENTS (not random lectures) */
export const getFacultyHistoryFilters = asyncHandler(async (req, res) => {
  const facultyId = req.profileId;
  const data = await cached(`facultyHistFilters:${facultyId}`, 60, async () => {
    const assignments = await FacultySubjectSection.find({
      facultyId,
      isActive: true,
    })
      .populate("subjectId", "subjectName subjectCode")
      .populate("sectionId", "name semester batchYear")
      .lean();

    // Also include sections/subjects from past lectures (ended assignments)
    const [lecSectionIds, lecSubjectIds] = await Promise.all([
      LectureSession.find({ facultyId }).distinct("sectionId"),
      LectureSession.find({ facultyId }).distinct("subjectId"),
    ]);

    const assignSections = assignments.map((a) => a.sectionId).filter(Boolean);
    const extraSections = await Section.find({
      _id: { $in: lecSectionIds },
    })
      .select("name semester batchYear")
      .lean();

    const sectionMap = new Map();
    [...assignSections, ...extraSections].forEach((s) => {
      if (!s?._id) return;
      sectionMap.set(String(s._id), s);
    });
    const sections = [...sectionMap.values()];

    const subjectsFromAssign = assignments.map((a) => a.subjectId).filter(Boolean);
    const extraSubjects = await Subject.find({ _id: { $in: lecSubjectIds } })
      .select("subjectName subjectCode")
      .lean();
    const subjectMap = new Map();
    [...subjectsFromAssign, ...extraSubjects].forEach((s) => {
      if (!s?._id) return;
      subjectMap.set(String(s._id), s);
    });

    const pairs = assignments.map((a) => ({
      subjectId: refId(a.subjectId),
      sectionId: refId(a.sectionId),
      label: `${a.subjectId?.subjectCode || "SUB"} · Sec ${a.sectionId?.name || "?"} · Sem ${a.sectionId?.semester ?? a.semester ?? "?"}`,
    }));

    return {
      divisions: [...new Set(sections.map((s) => s.name).filter(Boolean))].sort(),
      semesters: [...new Set(sections.map((s) => s.semester).filter((x) => x != null))].sort(
        (a, b) => a - b
      ),
      batchYears: [
        ...new Set(sections.map((s) => s.batchYear).filter((x) => x != null)),
      ].sort((a, b) => b - a),
      subjects: [...subjectMap.values()].map((s) => ({
        id: s._id,
        name: s.subjectName,
        code: s.subjectCode,
      })),
      assignmentPairs: pairs,
    };
  });
  res.json({ success: true, data });
});

export const getFacultyHistory = asyncHandler(async (req, res) => {
  const facultyId = req.profileId;
  const {
    division,
    semester,
    batchYear,
    subjectId,
    sectionId,
    page = 1,
    limit = 50,
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

  // Light cache key for the common case (first page, no filters)
  const cacheable = !division && !semester && !batchYear && !subjectId && !sectionId;
  const key = `facultyHist:${facultyId}:${pageNum}:${limitNum}`;

  const build = async () => {
    const match = { facultyId };
    if (subjectId) match.subjectId = subjectId;
    if (sectionId) match.sectionId = sectionId;

    if (division || semester || batchYear) {
      const sectionQuery = {};
      if (division) sectionQuery.name = division;
      if (semester) sectionQuery.semester = Number(semester);
      if (batchYear) sectionQuery.batchYear = Number(batchYear);
      const matchingSections = await Section.find(sectionQuery).select("_id").lean();
      const ids = matchingSections.map((s) => s._id);
      if (match.sectionId) {
        if (!ids.some((id) => String(id) === String(match.sectionId))) {
          match.sectionId = { $in: [] };
        }
      } else {
        match.sectionId = { $in: ids };
      }
    }

    const [total, lectures] = await Promise.all([
      LectureSession.countDocuments(match),
      LectureSession.find(match)
        .populate("subjectId", "subjectName subjectCode")
        .populate("sectionId", "name semester batchYear batchEndYear")
        .sort({ startTime: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
    ]);

    // Batch repair so presentCount is accurate
    const completedIds = lectures
      .filter((l) => l.status === "COMPLETED")
      .map((l) => l._id);
    if (completedIds.length) await finalizeLecturesBulk(completedIds);

    const refreshed = await LectureSession.find({
      _id: { $in: lectures.map((l) => l._id) },
    })
      .populate("subjectId", "subjectName subjectCode")
      .populate("sectionId", "name semester batchYear batchEndYear")
      .sort({ startTime: -1 })
      .lean();

    // Attach roster size for UI — one bulk query, not N queries
    const rosters = await getSectionRostersBulk(refreshed.map((l) => l.sectionId));

    const out = refreshed.map((l) => {
      const roster = rosters.get(refId(l.sectionId)) || [];
      return {
        id: l._id,
        topic: l.topic,
        subject: l.subjectId?.subjectName,
        subjectCode: l.subjectId?.subjectCode,
        subjectId: refId(l.subjectId),
        section: l.sectionId?.name,
        sectionId: refId(l.sectionId),
        semester: l.sectionId?.semester,
        batchYear: l.sectionId?.batchYear,
        date: l.startTime,
        status: l.status,
        presentCount: l.totalMarked || 0,
        rosterSize: roster.length,
        attendanceRate: pct(l.totalMarked || 0, roster.length),
      };
    });

    return {
      lectures: out,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  };

  const data = cacheable ? await cached(key, 12, build) : await build();
  res.json({ success: true, data });
});

export const getFacultySubjectRoster = asyncHandler(async (req, res) => {
  const facultyId = req.profileId;
  const { subjectId, sectionId } = req.query;
  if (!subjectId || !sectionId) {
    return res.status(400).json({
      success: false,
      message: "subjectId and sectionId are required",
    });
  }

  if (req.user?.role !== "ADMIN") {
    const allowed =
      (await FacultySubjectSection.findOne({
        facultyId,
        subjectId,
        sectionId,
        isActive: true,
      })) ||
      (await LectureSession.findOne({ facultyId, subjectId, sectionId }));
    if (!allowed) {
      return res
        .status(403)
        .json({ success: false, message: "Not assigned to this subject-section" });
    }
  }

  const lectures = await LectureSession.find({
    subjectId,
    sectionId,
    status: { $in: ["COMPLETED", "ACTIVE"] },
  })
    .sort({ startTime: 1 })
    .lean();

  const completedIds = lectures
    .filter((l) => l.status === "COMPLETED")
    .map((l) => l._id);
  if (completedIds.length) await finalizeLecturesBulk(completedIds);

  const roster = await getSectionRoster(sectionId);
  const completedLectures = lectures.filter((l) => l.status === "COMPLETED");
  const lectureIds = completedLectures.map((l) => l._id);
  const allAtt = lectureIds.length
    ? await Attendance.find({ lectureSessionId: { $in: lectureIds } }).lean()
    : [];

  const attMap = new Map();
  allAtt.forEach((a) => {
    attMap.set(`${a.lectureSessionId}:${a.studentId}`, a.status);
  });

  const totalSessions = completedLectures.length;
  const students = roster.map((s) => {
    let p = 0;
    let a = 0;
    const byLecture = completedLectures.map((l) => {
      const st = attMap.get(`${l._id}:${s._id}`) || "ABSENT";
      if (st === "PRESENT" || st === "LATE") p++;
      else if (st !== "EXCUSED" && st !== "LEAVE") a++;
      return {
        lectureId: l._id,
        topic: l.topic,
        date: l.startTime,
        status: st === "PRESENT" || st === "LATE" || st === "EXCUSED" || st === "LEAVE" ? st : "ABSENT",
      };
    });
    return {
      id: s._id,
      rollNumber: s.rollNumber,
      name: s.userId?.name,
      email: s.userId?.email,
      present: p,
      absent: a,
      total: totalSessions,
      percentage: pct(p, totalSessions),
      sessions: byLecture,
    };
  });

  const subject = await Subject.findById(subjectId).lean();
  const section = await Section.findById(sectionId).lean();

  res.json({
    success: true,
    data: {
      subject: {
        id: subjectId,
        name: subject?.subjectName,
        code: subject?.subjectCode,
      },
      section: {
        id: sectionId,
        name: section?.name,
        semester: section?.semester,
        batchYear: section?.batchYear,
      },
      totalSessions,
      students,
    },
  });
});

export const exportFacultySubjectRosterCsv = asyncHandler(async (req, res) => {
  const facultyId = req.profileId;
  const { subjectId, sectionId } = req.query;
  if (!subjectId || !sectionId) {
    return res
      .status(400)
      .json({ success: false, message: "subjectId and sectionId required" });
  }

  if (req.user?.role !== "ADMIN") {
    const allowed =
      (await FacultySubjectSection.findOne({
        facultyId,
        subjectId,
        sectionId,
        isActive: true,
      })) ||
      (await LectureSession.findOne({ facultyId, subjectId, sectionId }));
    if (!allowed) {
      return res.status(403).json({ success: false, message: "Not assigned" });
    }
  }

  const lectures = await LectureSession.find({
    subjectId,
    sectionId,
    status: "COMPLETED",
  })
    .sort({ startTime: 1 })
    .lean();

  const completedIds = lectures.map((l) => l._id);
  if (completedIds.length) await finalizeLecturesBulk(completedIds);

  const roster = await getSectionRoster(sectionId);
  const allAtt = lectures.length
    ? await Attendance.find({
        lectureSessionId: { $in: lectures.map((l) => l._id) },
      }).lean()
    : [];
  const attMap = new Map();
  allAtt.forEach((a) => {
    attMap.set(`${a.lectureSessionId}:${a.studentId}`, a.status);
  });

  const subject = await Subject.findById(subjectId).lean();
  const headerDates = lectures.map((l) => {
    const d = new Date(l.startTime);
    return `${d.toISOString().slice(0, 10)} ${(l.topic || "").replace(/,/g, " ")}`;
  });

  const lines = [];
  lines.push(
    ["Roll", "Name", "Email", ...headerDates, "Present", "Absent", "Total", "Percentage%"].join(
      ","
    )
  );

  for (const s of roster) {
    let p = 0;
    let a = 0;
    const cells = lectures.map((l) => {
      const st = attMap.get(`${l._id}:${s._id}`) || "ABSENT";
      if (st === "PRESENT" || st === "LATE") {
        p++;
        return "P";
      }
      if (st === "LEAVE") return "LV";
      if (st === "EXCUSED") return "E";
      a++;
      return "A";
    });
    const total = lectures.length;
    const name = (s.userId?.name || "").replace(/,/g, " ");
    const email = (s.userId?.email || "").replace(/,/g, " ");
    lines.push(
      [s.rollNumber, name, email, ...cells, p, a, total, pct(p, total)].join(",")
    );
  }

  const filename = `attendance_${subject?.subjectCode || subjectId}_${sectionId}.csv`;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send("\uFEFF" + lines.join("\n"));
});

export const getAdminAnalytics = asyncHandler(async (req, res) => {
  const daysParam = (req.query.days || "30").toString().toLowerCase();
  const key = `adminAnalytics:${daysParam}`;
  const ttl = daysParam === "all" ? 300 : 60;

  const data = await cached(key, ttl, async () => {
    let since = null;
    if (daysParam !== "all") {
      const n = Math.min(365, Math.max(1, parseInt(daysParam, 10) || 30));
      since = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
    }

    const attQuery = since ? { createdAt: { $gte: since } } : {};
    const recentAttendances = await Attendance.find(attQuery).lean();

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayMap = {};
    const span =
      daysParam === "all" ? 30 : Math.min(90, parseInt(daysParam, 10) || 30);
    for (let i = span - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key2 = `${dayNames[date.getDay()]} ${date.getMonth() + 1}/${date.getDate()}`;
      dayMap[key2] = { present: 0, absent: 0 };
    }

    recentAttendances.forEach((a) => {
      if (!a.createdAt) return;
      const date = new Date(a.createdAt);
      const k = `${dayNames[date.getDay()]} ${date.getMonth() + 1}/${date.getDate()}`;
      if (!dayMap[k]) return;
      if (a.status === "PRESENT" || a.status === "LATE") dayMap[k].present++;
      else if (a.status === "ABSENT") dayMap[k].absent++;
    });

    const dailyTrend = {
      labels: Object.keys(dayMap),
      present: Object.values(dayMap).map((d) => d.present),
      absent: Object.values(dayMap).map((d) => d.absent),
    };

    const allStudents = await Student.find().populate("departmentId", "name").lean();
    const deptMap = {};
    allStudents.forEach((s) => {
      const dept = s.departmentId?.name || "Unassigned";
      if (!deptMap[dept]) deptMap[dept] = { present: 0, total: 0 };
    });
    const stuDept = new Map(
      allStudents.map((s) => [String(s._id), s.departmentId?.name || "Unassigned"])
    );
    const allAttendance = await Attendance.find().lean();
    const neutral = (st) => st === "EXCUSED" || st === "LEAVE";
    allAttendance.forEach((a) => {
      const dept = stuDept.get(String(a.studentId)) || "Unassigned";
      if (!deptMap[dept]) deptMap[dept] = { present: 0, total: 0 };
      if (neutral(a.status)) return;
      deptMap[dept].total++;
      if (a.status === "PRESENT" || a.status === "LATE") deptMap[dept].present++;
    });

    const departmentBreakdown = {
      labels: Object.keys(deptMap),
      rates: Object.values(deptMap).map((d) => pct(d.present, d.total)),
    };

    // Subject-wise lecture counts + attendance rates
    const lectures = await LectureSession.find()
      .populate("subjectId", "subjectName subjectCode")
      .populate("facultyId", "employeeId")
      .lean();

    const subjectStats = {};
    for (const l of lectures) {
      const name = l.subjectId?.subjectName || "Unknown";
      if (!subjectStats[name]) {
        subjectStats[name] = { lectures: 0, present: 0, marks: 0 };
      }
      subjectStats[name].lectures++;
    }
    const lecSubject = new Map(
      lectures.map((l) => [String(l._id), l.subjectId?.subjectName || "Unknown"])
    );
    allAttendance.forEach((a) => {
      const name = lecSubject.get(String(a.lectureSessionId)) || "Unknown";
      if (!subjectStats[name]) subjectStats[name] = { lectures: 0, present: 0, marks: 0 };
      if (neutral(a.status)) return;
      subjectStats[name].marks++;
      if (a.status === "PRESENT" || a.status === "LATE") subjectStats[name].present++;
    });

    const subjectEntries = Object.entries(subjectStats)
      .map(([name, v]) => ({
        name,
        lectures: v.lectures,
        rate: pct(v.present, v.marks),
      }))
      .sort((a, b) => b.lectures - a.lectures);

    // Faculty-wise
    const facultyStats = {};
    for (const l of lectures) {
      const fid = refId(l.facultyId) || "unknown";
      if (!facultyStats[fid]) {
        facultyStats[fid] = {
          facultyId: fid,
          employeeId: l.facultyId?.employeeId || fid.slice(-6),
          lectures: 0,
          present: 0,
          marks: 0,
        };
      }
      facultyStats[fid].lectures++;
    }
    const lecFaculty = new Map(
      lectures.map((l) => [String(l._id), refId(l.facultyId) || "unknown"])
    );
    allAttendance.forEach((a) => {
      const fid = lecFaculty.get(String(a.lectureSessionId)) || "unknown";
      if (!facultyStats[fid]) return;
      if (neutral(a.status)) return;
      facultyStats[fid].marks++;
      if (a.status === "PRESENT" || a.status === "LATE") facultyStats[fid].present++;
    });

    // Resolve faculty names
    const facIds = Object.keys(facultyStats).filter((id) => id !== "unknown");
    const facDocs = await Faculty.find({ _id: { $in: facIds } })
      .populate("userId", "name")
      .lean();
    const facName = new Map(
      facDocs.map((f) => [String(f._id), f.userId?.name || f.employeeId])
    );

    const facultyBreakdown = Object.values(facultyStats)
      .map((f) => ({
        name: facName.get(f.facultyId) || f.employeeId,
        lectures: f.lectures,
        rate: pct(f.present, f.marks),
      }))
      .sort((a, b) => b.lectures - a.lectures)
      .slice(0, 12);

    const topSubjects = subjectEntries.slice(0, 8);

    const [totalScans, activeSessions, totalStudents, totalFaculty] =
      await Promise.all([
        Attendance.countDocuments(),
        LectureSession.countDocuments({ status: "ACTIVE" }),
        Student.countDocuments(),
        Faculty.countDocuments({ isActive: true }),
      ]);

    let avgAttendance = 0;
    if (allAttendance.length > 0) {
      const presentCount = allAttendance.filter(
        (a) => a.status === "PRESENT" || a.status === "LATE"
      ).length;
      const denom = allAttendance.filter((a) => !neutral(a.status)).length;
      avgAttendance = pct(presentCount, denom);
    }

    return {
      range: daysParam,
      dailyTrend,
      departmentBreakdown,
      subjectDistribution: {
        labels: topSubjects.map((e) => e.name),
        lectures: topSubjects.map((e) => e.lectures),
        rates: topSubjects.map((e) => e.rate),
      },
      facultyBreakdown: {
        labels: facultyBreakdown.map((f) => f.name),
        lectures: facultyBreakdown.map((f) => f.lectures),
        rates: facultyBreakdown.map((f) => f.rate),
      },
      summary: {
        totalScans,
        activeSessions,
        avgAttendance,
        totalStudents,
        totalLectures: lectures.length,
        totalFaculty,
      },
    };
  });

  res.json({ success: true, data });
});

/**
 * GET /api/report/admin/overview
 * One-shot overview matrix so the admin can see, without deep navigation:
 *  - every subject → assigned faculty → sections → live student count
 *  - every faculty → subjects taught, sections, distinct students, mentees
 *  - every mentor → mentees grouped BATCH-WISE
 *  - every batch → its sections and student counts
 */
export const getAdminOverviewMatrix = asyncHandler(async (req, res) => {
  const data = await cached("adminOverview", 30, async () => {
    const [subjects, sections, students, faculty, assignments, lectures] =
      await Promise.all([
        Subject.find().sort({ subjectCode: 1 }).lean(),
        Section.find({ isActive: true }).sort({ batchYear: -1, semester: -1 }).lean(),
        Student.find({ isActive: true })
          .populate("userId", "name email")
          .populate("sectionId", "name semester batchYear")
          .lean(),
        Faculty.find({ isActive: true }).populate("userId", "name email").lean(),
        FacultySubjectSection.find({ isActive: true }).lean(),
        LectureSession.find({ status: "COMPLETED" })
          .select("subjectId sectionId facultyId")
          .lean(),
      ]);

    const subjById = new Map(subjects.map((s) => [String(s._id), s]));
    const secById = new Map(sections.map((s) => [String(s._id), s]));
    const facById = new Map(faculty.map((f) => [String(f._id), f]));

    // Students per section (live roster)
    const studentsBySection = new Map();
    for (const st of students) {
      const sid = refId(st.sectionId);
      if (!sid) continue;
      if (!studentsBySection.has(sid)) studentsBySection.set(sid, []);
      studentsBySection.get(sid).push(st);
    }
    const sectionCount = (sid) => (studentsBySection.get(refId(sid)) || []).length;

    // Lecture counts per subject
    const lectureCountBySubject = new Map();
    for (const l of lectures) {
      const sid = refId(l.subjectId);
      lectureCountBySubject.set(sid, (lectureCountBySubject.get(sid) || 0) + 1);
    }

    // ── Subjects → faculty → sections → students ─────────────────
    const subjAssign = new Map(); // subjectId -> Map(sectionId -> Set(facultyId))
    for (const a of assignments) {
      const sid = refId(a.subjectId);
      const secId = refId(a.sectionId);
      const fid = refId(a.facultyId);
      if (!subjAssign.has(sid)) subjAssign.set(sid, new Map());
      const bySec = subjAssign.get(sid);
      if (!bySec.has(secId)) bySec.set(secId, new Set());
      bySec.get(secId).add(fid);
    }

    const subjectsOut = subjects.map((s) => {
      const sid = String(s._id);
      const bySec = subjAssign.get(sid) || new Map();
      const facIds = new Set();
      let studentCount = 0;
      const sectionsArr = [];
      for (const [secId, fids] of bySec) {
        fids.forEach((f) => facIds.add(f));
        const sec = secById.get(secId);
        const n = sectionCount(secId);
        studentCount += n;
        sectionsArr.push({
          id: secId,
          name: sec?.name || "?",
          semester: sec?.semester,
          batchYear: sec?.batchYear,
          students: n,
        });
      }
      return {
        id: sid,
        code: s.subjectCode,
        name: s.subjectName,
        facultyCount: facIds.size,
        faculty: [...facIds].map((fid) => {
          const f = facById.get(fid);
          return f ? { id: fid, employeeId: f.employeeId, name: f.userId?.name } : null;
        }).filter(Boolean),
        sectionCount: sectionsArr.length,
        studentCount,
        lectures: lectureCountBySubject.get(sid) || 0,
        sections: sectionsArr,
      };
    }).filter((s) => s.sectionCount > 0 || s.facultyCount > 0);

    // ── Faculty → subjects, sections, students, mentees ──────────
    const facAssign = new Map(); // facultyId -> { subjectIds:Set, sectionIds:Set }
    for (const a of assignments) {
      const fid = refId(a.facultyId);
      const sid = refId(a.subjectId);
      const secId = refId(a.sectionId);
      if (!facAssign.has(fid)) facAssign.set(fid, { subjects: new Set(), sections: new Set() });
      facAssign.get(fid).subjects.add(sid);
      facAssign.get(fid).sections.add(secId);
    }

    // Mentees per mentor
    const menteesByMentor = new Map();
    for (const st of students) {
      const mid = refId(st.mentorId);
      if (!mid) continue;
      if (!menteesByMentor.has(mid)) menteesByMentor.set(mid, []);
      menteesByMentor.get(mid).push(st);
    }

    const facultyOut = faculty.map((f) => {
      const fid = String(f._id);
      const asign = facAssign.get(fid) || { subjects: new Set(), sections: new Set() };
      // distinct students taught = union of assigned sections
      const sectionSet = new Set(asign.sections);
      let taughtStudents = 0;
      for (const secId of sectionSet) taughtStudents += sectionCount(secId);
      const mentees = menteesByMentor.get(fid) || [];
      return {
        id: fid,
        employeeId: f.employeeId,
        name: f.userId?.name,
        email: f.userId?.email,
        designation: f.designation,
        subjects: [...asign.subjects].map((sid) => {
          const s = subjById.get(sid);
          return s ? { id: sid, code: s.subjectCode, name: s.subjectName } : null;
        }).filter(Boolean),
        subjectCount: asign.subjects.size,
        sectionCount: sectionSet.size,
        taughtStudents,
        menteeCount: mentees.length,
      };
    });

    // ── Mentors → mentees BATCH-WISE ─────────────────────────────
    const mentorsOut = faculty
      .filter((f) => menteesByMentor.has(String(f._id)))
      .map((f) => {
        const fid = String(f._id);
        const mentees = menteesByMentor.get(fid);
        const byBatch = new Map();
        for (const m of mentees) {
          const b = `Batch ${m.sectionId?.batchYear ?? "—"}${m.sectionId?.semester ? ` · Sem ${m.sectionId.semester}` : ""}`;
          if (!byBatch.has(b)) byBatch.set(b, []);
          byBatch.get(b).push({
            id: m._id,
            rollNumber: m.rollNumber,
            name: m.userId?.name,
          });
        }
        const batches = [...byBatch.entries()].map(([batch, list]) => ({
          batch,
          count: list.length,
          students: list,
        }));
        return {
          id: fid,
          employeeId: f.employeeId,
          name: f.userId?.name,
          menteeCount: mentees.length,
          batches,
        };
      })
      .sort((a, b) => b.menteeCount - a.menteeCount);

    // ── Batches → sections → students ────────────────────────────
    const byBatch = new Map();
    for (const sec of sections) {
      const b = String(sec.batchYear);
      if (!byBatch.has(b)) byBatch.set(b, []);
      byBatch.get(b).push({
        id: sec._id,
        name: sec.name,
        semester: sec.semester,
        students: sectionCount(sec._id),
      });
    }
    const batchesOut = [...byBatch.entries()]
      .map(([batchYear, secs]) => ({
        batchYear: Number(batchYear),
        label: (() => {
          const withEnd = secs[0] ? secById.get(refId(secs[0].id)) : null;
          return withEnd && withEnd.batchEndYear && withEnd.batchEndYear > Number(batchYear)
            ? `${batchYear}-${String(withEnd.batchEndYear).slice(-2)}`
            : batchYear;
        })(),
        sectionCount: secs.length,
        studentCount: secs.reduce((n, s) => n + s.students, 0),
        sections: secs,
      }))
      .sort((a, b) => b.batchYear - a.batchYear);

    return {
      summary: {
        subjects: subjects.length,
        sections: sections.length,
        students: students.length,
        faculty: faculty.length,
        assignments: assignments.length,
        mentors: mentorsOut.length,
      },
      subjects: subjectsOut,
      faculty: facultyOut,
      mentors: mentorsOut,
      batches: batchesOut,
    };
  });

  res.json({ success: true, data });
});

/**
 * Shared builder: compute the student × lecture matrix for a class
 * (roll no, name, per-lecture status, totals). Reused by CSV and XLSX.
 */
async function computeClassMatrix(facultyId, reqUser, { subjectId, sectionId, from, to }) {
  if (reqUser?.role !== "ADMIN") {
    const allowed =
      (await FacultySubjectSection.findOne({
        facultyId,
        subjectId,
        sectionId,
        isActive: true,
      })) ||
      (await LectureSession.findOne({ facultyId, subjectId, sectionId }));
    if (!allowed) {
      const e = new Error("Not assigned");
      e.status = 403;
      throw e;
    }
  }

  const match = {
    subjectId,
    sectionId,
    status: "COMPLETED",
  };
  if (from || to) {
    match.startTime = {};
    if (from) match.startTime.$gte = new Date(from + "T00:00:00.000Z");
    if (to) match.startTime.$lte = new Date(to + "T23:59:59.999Z");
  }

  const lectures = await LectureSession.find(match).sort({ startTime: 1 }).lean();
  if (lectures.length) await finalizeLecturesBulk(lectures.map((l) => l._id));

  const roster = await getSectionRoster(sectionId);
  const lectureIds = lectures.map((l) => l._id);
  const allAtt = lectureIds.length
    ? await Attendance.find({ lectureSessionId: { $in: lectureIds } }).lean()
    : [];
  const attMap = new Map();
  allAtt.forEach((a) => {
    attMap.set(`${a.lectureSessionId}:${a.studentId}`, a.status);
  });

  const subject = await Subject.findById(subjectId).lean();
  const section = await Section.findById(sectionId).lean();
  return { lectures, roster, attMap, subject, section };
}

// Single-letter status codes used across CSV/XLSX exports
function statusCodeFor(st) {
  if (st === "PRESENT") return "P";
  if (st === "LATE") return "L";
  if (st === "EXCUSED") return "E";
  if (st === "LEAVE") return "LV";
  return "A";
}

/**
 * GET /api/report/faculty/attendance-sheet.csv
 * Rows: Enrollment No, Student Name, Email, [date+topic]..., Present, Late,
 * Absent, On Leave, Total Classes, Attendance %
 */
export const exportFacultyDateRangeCsv = asyncHandler(async (req, res) => {
  const facultyId = req.profileId;
  const { subjectId, sectionId, from, to } = req.query;
  if (!subjectId || !sectionId) {
    return res.status(400).json({
      success: false,
      message: "subjectId and sectionId are required",
    });
  }

  let matrix;
  try {
    matrix = await computeClassMatrix(facultyId, req.user, { subjectId, sectionId, from, to });
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
  const { lectures, roster, attMap, subject, section } = matrix;

  const esc = (v) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const dateHeaders = lectures.map((l) => {
    const d = new Date(l.startTime);
    return esc(`${d.toISOString().slice(0, 10)} ${(l.topic || "").slice(0, 28)}`);
  });

  const lines = [];
  lines.push(
    `AttendX Attendance Sheet — ${esc(subject?.subjectName || "")} (${esc(subject?.subjectCode || "")})`
  );
  lines.push(
    `Section: ${esc(section?.name || "")} | Semester: ${section?.semester ?? ""} | Batch: ${section?.batchYear ?? ""}`
  );
  lines.push(`Date range: ${from || "Full semester"} to ${to || "Full semester"} | Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push(
    [
      "Enrollment No",
      "Student Name",
      "Email",
      ...dateHeaders,
      "Present",
      "Late",
      "Absent",
      "On Leave",
      "Total Classes",
      "Attendance %",
    ].join(",")
  );

  for (const s of roster) {
    let p = 0, late = 0, a = 0, lv = 0;
    const cells = lectures.map((l) => {
      const st = attMap.get(`${l._id}:${s._id}`) || "ABSENT";
      if (st === "PRESENT") { p++; return "P"; }
      if (st === "LATE") { late++; p++; return "L"; }
      if (st === "LEAVE") { lv++; return "LV"; }
      if (st === "EXCUSED") return "E";
      a++;
      return "A";
    });
    const total = lectures.length;
    const attended = p;
    lines.push(
      [
        esc(s.rollNumber),
        esc(s.userId?.name || ""),
        esc(s.userId?.email || ""),
        ...cells,
        p - late,
        late,
        a,
        lv,
        total,
        pct(attended, total),
      ].join(",")
    );
  }

  lines.push("");
  lines.push("Legend: P=Present, L=Late, A=Absent, LV=On Leave, E=Excused");
  lines.push("Generated by AttendX");

  const code = subject?.subjectCode || "SUB";
  const secName = section?.name || "SEC";
  const filename = `AttendX_${code}_Sec${secName}_${from || "all"}_${to || "all"}.csv`;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename.replace(/"/g, "")}"`);
  res.send("\uFEFF" + lines.join("\n"));
});

/**
 * GET /api/report/faculty/attendance-sheet.xlsx
 * Real Excel workbook (.xlsx) — human-readable, two sheets:
 *  1. "Attendance Register" — Student | Enrollment No | per-date P/A/L/LV/E
 *     + Present / Late / Absent / On Leave / Total / %
 *  2. "Summary" — one row per student with totals and percentage
 */
export const exportFacultyDateRangeXlsx = asyncHandler(async (req, res) => {
  const facultyId = req.profileId;
  const { subjectId, sectionId, from, to } = req.query;
  if (!subjectId || !sectionId) {
    return res.status(400).json({
      success: false,
      message: "subjectId and sectionId are required",
    });
  }

  let matrix;
  try {
    matrix = await computeClassMatrix(facultyId, req.user, { subjectId, sectionId, from, to });
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
  const { lectures, roster, attMap, subject, section } = matrix;

  const XLSX = await import("xlsx");
  const fmtDate = (d) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  };
  const shortTopic = (l) => (l.topic || "Lecture").slice(0, 28);

  const header = ["Student Name", "Enrollment No"];
  lectures.forEach((l) => header.push(`${fmtDate(l.startTime)}\n${shortTopic(l)}`));
  header.push("Present", "Late", "Absent", "On Leave", "Total Classes", "Attendance %");

  const rows = roster.map((s) => {
    let p = 0, late = 0, a = 0, lv = 0;
    const cells = lectures.map((l) => {
      const st = attMap.get(`${l._id}:${s._id}`) || "ABSENT";
      if (st === "PRESENT") { p++; return "P"; }
      if (st === "LATE") { late++; p++; return "L"; }
      if (st === "LEAVE") { lv++; return "LV"; }
      if (st === "EXCUSED") return "E";
      a++;
      return "A";
    });
    const total = lectures.length;
    return [
      s.userId?.name || "",
      s.rollNumber,
      ...cells,
      p,
      late,
      a,
      lv,
      total,
      `${pct(p + late, total)}%`,
    ];
  });

  const ws1 = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws1["!cols"] = [
    { wch: 26 },
    { wch: 15 },
    ...lectures.map(() => ({ wch: 13 })),
    { wch: 9 }, { wch: 8 }, { wch: 9 }, { wch: 9 }, { wch: 12 }, { wch: 12 },
  ];
  ws1["!rows"] = [{ hpt: 36 }];

  const summaryHeader = [
    "Enrollment No",
    "Student Name",
    "Email",
    "Present",
    "Late",
    "Absent",
    "On Leave",
    "Total Classes",
    "Attendance %",
  ];
  const summaryRows = roster.map((s) => {
    let p = 0, late = 0, a = 0, lv = 0;
    lectures.forEach((l) => {
      const st = attMap.get(`${l._id}:${s._id}`) || "ABSENT";
      if (st === "PRESENT") p++;
      else if (st === "LATE") { late++; p++; }
      else if (st === "LEAVE") lv++;
      else if (st !== "EXCUSED") a++;
    });
    const total = lectures.length;
    return [
      s.rollNumber,
      s.userId?.name || "",
      s.userId?.email || "",
      p,
      late,
      a,
      lv,
      total,
      pct(p + late, total),
    ];
  });
  const ws2 = XLSX.utils.aoa_to_sheet([summaryHeader, ...summaryRows]);
  ws2["!cols"] = [
    { wch: 15 }, { wch: 26 }, { wch: 30 },
    { wch: 9 }, { wch: 8 }, { wch: 9 }, { wch: 9 }, { wch: 12 }, { wch: 12 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, "Attendance Register");
  XLSX.utils.book_append_sheet(wb, ws2, "Summary");

  const code = subject?.subjectCode || "SUB";
  const secName = section?.name || "SEC";
  const filename = `AttendX_${code}_Sec${secName}_${from || "all"}_${to || "all"}.xlsx`;

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename.replace(/"/g, "")}"`);
  res.send(buf);
});
