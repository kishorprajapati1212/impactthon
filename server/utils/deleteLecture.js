import mongoose from "mongoose";
import LectureSession from "../models/lecture/LectureSession.js";
import Attendance from "../models/Attendance/Attendance.js";
import LeaveApplication from "../models/leave/LeaveApplication.js";
import NotificationLog from "../models/users/NotificationLog.js";
import { recordAudit } from "./audit.js";
import { invalidateAll } from "../services/cacheService.js";
import { classLabel } from "./classLabel.js";
import { refId } from "./ids.js";

/**
 * Deleting a lecture (Phase 18).
 *
 * Why this exists: a teacher can accidentally start two sessions at once, or
 * start one for the wrong class. Ending it does not help — a COMPLETED lecture
 * still counts in every percentage (student report, faculty history, admin
 * attendance report, below-75% lists). The only correct fix is to remove the
 * lecture *and everything that points at it*, so the numbers are exactly as
 * if it had never been started.
 *
 * What points at a LectureSession (checked against every model):
 *   1. Attendance.lectureSessionId          → rows are deleted
 *   2. LeaveApplication.lectureIds[]        → the id is pulled out (the leave
 *      itself is the student's own record and is kept)
 *   3. NotificationLog.lectureId            → rows are deleted (they were
 *      "your child was absent in <lecture>" messages about a lecture that
 *      should not have existed)
 * Nothing else references a lecture (Student, Faculty, Section, Subject,
 * MentorStudentHistory, StudentSession, AuditLog use no lecture ids), and no
 * model keeps a denormalised lecture/attendance counter except
 * LectureSession.totalMarked, which goes away with the lecture.
 *
 * Standalone MongoDB (docker-compose) has no multi-document transactions, so
 * the steps run children-first and the lecture is removed last. Every step is
 * idempotent: if the process dies midway, running the delete again finishes
 * the job and nothing is double-counted.
 */

export const PRESENT_STATUSES = ["PRESENT", "LATE"];

/** Marks grouped by status for one lecture — the numbers shown before deleting. */
export async function countLectureMarks(lectureId) {
  const id = new mongoose.Types.ObjectId(String(lectureId));
  const rows = await Attendance.aggregate([
    { $match: { lectureSessionId: id } },
    { $group: { _id: "$status", n: { $sum: 1 } } },
  ]);
  const counts = { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0, LEAVE: 0, total: 0 };
  for (const r of rows) {
    if (r._id in counts) counts[r._id] = r.n;
    counts.total += r.n;
  }
  counts.present = counts.PRESENT + counts.LATE;
  counts.notPresent = counts.total - counts.present;
  return counts;
}

/** How many other records mention this lecture (for the confirmation screen). */
export async function countLectureDependents(lectureId) {
  const [leaveApplications, notifications] = await Promise.all([
    LeaveApplication.countDocuments({ lectureIds: lectureId }),
    NotificationLog.countDocuments({ lectureId }),
  ]);
  return { leaveApplications, notifications };
}

/**
 * Who may delete which lecture. Pure — unit tested.
 *
 *  - ADMIN   → any lecture, running or finished.
 *  - FACULTY → only their own lecture, and only while it is still running or
 *              when nobody has been marked present yet. A finished lecture
 *              with real presence is part of the students' record, so that
 *              needs an admin (the request tells the teacher exactly that).
 */
export function lectureDeletePolicy({ role, facultyId, lecture, presentCount = 0 }) {
  if (!lecture) {
    return { allowed: false, status: 404, code: "NOT_FOUND", message: "Lecture not found. It may already have been deleted." };
  }
  if (role === "ADMIN") return { allowed: true, reason: "admin" };
  if (role !== "FACULTY") {
    return { allowed: false, status: 403, code: "FORBIDDEN", message: "Only teachers and admins can delete lectures." };
  }
  if (!facultyId || refId(lecture.facultyId) !== refId(facultyId)) {
    return { allowed: false, status: 403, code: "NOT_YOURS", message: "You can only delete your own lectures." };
  }
  if (lecture.status === "ACTIVE") return { allowed: true, reason: "own-running" };
  if (!presentCount) return { allowed: true, reason: "own-empty" };
  return {
    allowed: false,
    status: 403,
    code: "DELETE_NEEDS_ADMIN",
    message: `This lecture already has ${presentCount} student${presentCount === 1 ? "" : "s"} marked present. Ask an admin to delete it.`,
  };
}

const fmtWhen = (d) => {
  if (!d) return "";
  try {
    return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
  } catch {
    return new Date(d).toISOString();
  }
};

/** Human label that survives the deletion: "Topic · CE502 · CE · A · 2024 · 31 Oct 2026, 10:05 am". Pure. */
export function lectureAuditLabel(lecture) {
  if (!lecture) return null;
  const subj = lecture.subjectId?.subjectCode || lecture.subjectId?.subjectName || null;
  const sec = lecture.sectionId;
  const cls = sec && typeof sec === "object" && (sec.name || sec.departmentId) ? classLabel(sec) : null;
  return [lecture.topic, subj, cls, fmtWhen(lecture.startTime)].filter(Boolean).join(" · ").slice(0, 200);
}

/** The sentence the UI shows after a delete. Pure. */
export function describeDeletion(result) {
  const n = result.marksRemoved || 0;
  const p = result.presentRemoved || 0;
  const marks = n === 0 ? "No attendance marks were affected" : `${n} attendance mark${n === 1 ? "" : "s"} removed (${p} present)`;
  return `Lecture deleted. ${marks}. Every percentage and report now excludes it.`;
}

/**
 * Remove the lecture and everything that points at it. Returns the counts.
 * `lecture` should be populated with subjectId / sectionId / facultyId for a
 * readable audit label (plain ids still work).
 */
export async function deleteLectureCascade(lecture, { req = null, counts = null } = {}) {
  const id = lecture._id;
  const marks = counts || (await countLectureMarks(id));

  // 1. attendance rows (the only thing that feeds percentages)
  const att = await Attendance.deleteMany({ lectureSessionId: id });
  // 2. lecture-specific leave applications: forget this lecture, keep the leave
  const leaves = await LeaveApplication.updateMany({ lectureIds: id }, { $pull: { lectureIds: id } });
  // 3. parent-notification log rows about this lecture
  const notes = await NotificationLog.deleteMany({ lectureId: id });
  // 4. the lecture itself — last, so a crash above leaves it visible for a retry
  await LectureSession.deleteOne({ _id: id });

  const result = {
    lectureId: String(id),
    status: lecture.status,
    marksRemoved: att?.deletedCount ?? marks.total,
    presentRemoved: marks.present,
    notPresentRemoved: marks.notPresent,
    leaveApplicationsUpdated: leaves?.modifiedCount ?? 0,
    notificationsRemoved: notes?.deletedCount ?? 0,
  };

  // 5. audit — who deleted what, with the numbers (never throws)
  await recordAudit({
    req,
    entityType: "LECTURE",
    entityId: id,
    action: "DELETE",
    entityLabel: lectureAuditLabel(lecture),
    changes: {
      status: lecture.status,
      facultyId: refId(lecture.facultyId),
      sectionId: refId(lecture.sectionId),
      subjectId: refId(lecture.subjectId),
      startTime: lecture.startTime ? new Date(lecture.startTime).toISOString() : null,
      marksRemoved: result.marksRemoved,
      presentRemoved: result.presentRemoved,
      notPresentRemoved: result.notPresentRemoved,
      leaveApplicationsUpdated: result.leaveApplicationsUpdated,
      notificationsRemoved: result.notificationsRemoved,
    },
  });

  // 6. every cached dashboard / report / history is now stale
  invalidateAll();
  return result;
}
