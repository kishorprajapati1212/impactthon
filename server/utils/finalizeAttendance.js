import Attendance from "../models/Attendance/Attendance.js";
import Student from "../models/users/Student.js";
import LectureSession from "../models/lecture/LectureSession.js";
import { refId } from "./ids.js";
import { notifyParentsOnAttendance } from "../controllers/notification/parentNotification.controller.js";

/**
 * Resolve section students for a lecture (handles populated + raw ObjectId).
 */
export async function getSectionRoster(sectionId, { activeOnly = true } = {}) {
  const sid = refId(sectionId);
  if (!sid) return [];
  const q = { sectionId: sid };
  if (activeOnly) q.isActive = true;
  return Student.find(q)
    .select("rollNumber userId parentPhone phone isActive sectionId")
    .populate({ path: "userId", select: "name email isActive" })
    .sort({ rollNumber: 1 })
    .lean();
}

/**
 * Resolve rosters for SEVERAL sections with a single query round-trip.
 * Returns a Map<sectionIdString, roster[]>.
 * (Fixes the N+1 query pattern in history/dashboard endpoints.)
 */
export async function getSectionRostersBulk(sectionIds = []) {
  const ids = [...new Set(sectionIds.map(refId).filter(Boolean))];
  const map = new Map();
  if (!ids.length) return map;
  const students = await Student.find({ sectionId: { $in: ids }, isActive: true })
    .select("rollNumber userId parentPhone phone isActive sectionId")
    .populate({ path: "userId", select: "name email isActive" })
    .sort({ rollNumber: 1 })
    .lean();
  for (const s of students) {
    const key = refId(s.sectionId);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  }
  // Ensure every requested id has an entry (possibly empty)
  for (const id of ids) if (!map.has(id)) map.set(id, []);
  return map;
}

/**
 * Finalize (create ABSENT rows) for MANY lectures in batches.
 * Returns a summary { absentCreated, presentChecked } without running
 * single-lecture loops, ready for the cache layer.
 */
export async function finalizeLecturesBulk(lectureIds = []) {
  const ids = [...new Set((lectureIds || []).map(refId).filter(Boolean))];
  if (!ids.length) return { absentCreated: 0 };

  const lectures = await LectureSession.find({ _id: { $in: ids } })
    .select("_id sectionId endTime status")
    .lean();

  // Only relevant for COMPLETED lectures (ACTIVE stays PENDING-based)
  const completed = lectures.filter((l) => l.status === "COMPLETED");
  if (!completed.length) return { absentCreated: 0 };

  const idList = completed.map((l) => refId(l._id));

  const sectionIds = [...new Set(completed.map((l) => refId(l.sectionId)).filter(Boolean))];
  const rosters = await getSectionRostersBulk(sectionIds);

  // Attach section -> studentIds
  const studentsBySection = new Map();
  for (const [secId, list] of rosters) {
    studentsBySection.set(secId, list.map((s) => refId(s._id)));
  }

  const existing = await Attendance.find({ lectureSessionId: { $in: idList } })
    .select("lectureSessionId studentId status")
    .lean();
  const hasRow = new Set(existing.map((e) => `${refId(e.lectureSessionId)}:${refId(e.studentId)}`));

  const docs = [];
  for (const l of completed) {
    const stuIds = studentsBySection.get(refId(l.sectionId)) || [];
    for (const sid of stuIds) {
      if (hasRow.has(`${refId(l._id)}:${sid}`)) continue;
      docs.push({
        lectureSessionId: l._id,
        studentId: sid,
        status: "ABSENT",
        markedAt: l.endTime || new Date(),
        markMethod: "AUTO",
      });
    }
  }

  let absentCreated = 0;
  if (docs.length) {
    try {
      const inserted = await Attendance.insertMany(docs, { ordered: false });
      absentCreated = inserted.length;
    } catch (err) {
      // Duplicate-key races → fall back to counting what already exists
      if (err?.code === 11000) {
        absentCreated = docs.length;
      } else {
        for (const d of docs) {
          try {
            await Attendance.create(d);
            absentCreated++;
          } catch {
            /* already exists */
          }
        }
      }
    }
  }

  // Refresh totalMarked for these lectures
  if (idList.length) {
    const agg = await Attendance.aggregate([
      { $match: { lectureSessionId: { $in: idList }, status: { $in: ["PRESENT", "LATE"] } } },
      { $group: { _id: "$lectureSessionId", n: { $sum: 1 } } },
    ]);
    const byLec = new Map(agg.map((r) => [String(r._id), r.n]));
    await Promise.all(
      idList.map((id) =>
        LectureSession.updateOne({ _id: id }, { totalMarked: byLec.get(id) || 0 })
      )
    );
  }

  return { absentCreated };
}

/**
 * Build full student list + summary for one lecture.
 * Rate = present / roster size (never "rows in Attendance only").
 */
export async function buildLectureRosterView(lectureId) {
  const lecture = await LectureSession.findById(lectureId)
    .populate("subjectId", "subjectName subjectCode")
    .populate("sectionId", "name semester batchYear batchEndYear")
    .populate("facultyId", "employeeId");

  if (!lecture) return null;

  // Backfill absents for completed lectures (fixes old broken sessions)
  if (lecture.status === "COMPLETED") {
    await finalizeLectureAbsentees(lecture._id, { notify: false });
  }

  const roster = await getSectionRoster(lecture.sectionId);
  const attendances = await Attendance.find({ lectureSessionId: lecture._id })
    .populate({
      path: "studentId",
      select: "rollNumber userId parentPhone",
      populate: { path: "userId", select: "name email" },
    })
    .lean();

  const byStudent = new Map();
  for (const a of attendances) {
    const sid = refId(a.studentId?._id || a.studentId);
    if (sid) byStudent.set(sid, a);
  }

  const students = roster.map((s) => {
    const sid = String(s._id);
    const att = byStudent.get(sid);
    const status = att?.status || (lecture.status === "ACTIVE" ? "PENDING" : "ABSENT");
    // Normalize location for maps (plain numbers + accuracy)
    let location = null;
    if (att?.location && (att.location.latitude != null || att.location.longitude != null)) {
      const la = Number(att.location.latitude);
      const lo = Number(att.location.longitude);
      if (Number.isFinite(la) && Number.isFinite(lo)) {
        location = { latitude: la, longitude: lo };
        if (att.location.accuracy != null && Number.isFinite(Number(att.location.accuracy))) {
          location.accuracy = Number(att.location.accuracy);
        }
      }
    }
    return {
      id: s._id,
      rollNumber: s.rollNumber,
      name: s.userId?.name || null,
      email: s.userId?.email || null,
      parentPhone: s.parentPhone || null,
      status,
      markedAt: att?.markedAt || null,
      markMethod: att?.markMethod || null,
      location,
      remarks: att?.remarks || null,
    };
  });

  // Include orphan attendance rows (student left section) still marked
  for (const a of attendances) {
    const sid = refId(a.studentId?._id || a.studentId);
    if (!sid || students.some((x) => String(x.id) === sid)) continue;
    students.push({
      id: a.studentId?._id || a.studentId,
      rollNumber: a.studentId?.rollNumber,
      name: a.studentId?.userId?.name || null,
      email: a.studentId?.userId?.email || null,
      parentPhone: a.studentId?.parentPhone || null,
      status: a.status,
      markedAt: a.markedAt,
      markMethod: a.markMethod,
      location: a.location,
      remarks: a.remarks,
    });
  }

  const present = students.filter((s) => s.status === "PRESENT" || s.status === "LATE").length;
  const absent = students.filter((s) => s.status === "ABSENT").length;
  const pending = students.filter((s) => s.status === "PENDING").length;
  const onLeave = students.filter((s) => s.status === "LEAVE").length;
  const totalStudents = roster.length;
  const attendanceRate =
    totalStudents > 0 ? parseFloat(((present / totalStudents) * 100).toFixed(2)) : 0;

  const absentees = students.filter((s) => s.status === "ABSENT" || s.status === "PENDING");

  return {
    lecture,
    students,
    absentees,
    attendances,
    summary: {
      totalStudents,
      present,
      absent,
      pending,
      onLeave,
      attendanceRate,
    },
  };
}

/**
 * When a lecture ends (or on repair), create ABSENT for every roster student
 * without a PRESENT/LATE/EXCUSED row. Idempotent.
 */
export async function finalizeLectureAbsentees(lectureId, { notify = true } = {}) {
  const lecture = await LectureSession.findById(lectureId);
  if (!lecture) return { absentCreated: 0, presentCount: 0, rosterSize: 0 };

  const sid = refId(lecture.sectionId);
  if (!sid) {
    return { absentCreated: 0, presentCount: 0, rosterSize: 0 };
  }

  const roster = await Student.find({ sectionId: sid, isActive: true }).select("_id");
  const existing = await Attendance.find({ lectureSessionId: lecture._id }).select(
    "studentId status"
  );
  const hasRow = new Set(existing.map((e) => refId(e.studentId)).filter(Boolean));

  let absentCreated = 0;
  const ops = [];
  for (const s of roster) {
    const id = String(s._id);
    if (hasRow.has(id)) continue;
    ops.push({
      lectureSessionId: lecture._id,
      studentId: s._id,
      status: "ABSENT",
      markedAt: lecture.endTime || new Date(),
      markMethod: "AUTO",
    });
  }

  if (ops.length) {
    try {
      await Attendance.insertMany(ops, { ordered: false });
      absentCreated = ops.length;
    } catch (err) {
      // duplicate key races — ignore
      if (err?.code !== 11000) {
        for (const doc of ops) {
          try {
            await Attendance.create(doc);
            absentCreated++;
          } catch {
            /* exists */
          }
        }
      } else {
        absentCreated = ops.length;
      }
    }

    if (notify) {
      for (const doc of ops) {
        notifyParentsOnAttendance({
          studentId: doc.studentId,
          lectureSessionId: lecture._id,
          status: "ABSENT",
        }).catch(() => {});
      }
    }
  }

  const presentCount = await Attendance.countDocuments({
    lectureSessionId: lecture._id,
    status: { $in: ["PRESENT", "LATE"] },
  });
  await LectureSession.findByIdAndUpdate(lecture._id, { totalMarked: presentCount });

  return { absentCreated, presentCount, rosterSize: roster.length };
}
