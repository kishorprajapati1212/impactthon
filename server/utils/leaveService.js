import Attendance from "../models/Attendance/Attendance.js";
import LectureSession from "../models/lecture/LectureSession.js";
import { refId } from "./ids.js";
import { invalidatePrefix } from "../services/cacheService.js";
import dayjs from "dayjs";

/**
 * When a mentor APPROVES a leave, convert the matching attendance rows to
 * LEAVE so those lectures stop counting as ABSENT for the student.
 *
 * - FULL    → every lecture of that day
 * - HALF    → FIRST half (before 13:00) or SECOND half (13:00 onward)
 * - LECTURE → only the selected lectureIds
 */
export async function applyLeaveToAttendance(leave) {
  const studentId = refId(leave.studentId);
  const sectionId = refId(leave.sectionId);
  if (!studentId || !sectionId || !leave.date) return { updated: 0 };

  const dayStart = dayjs(leave.date).startOf("day");
  const dayEnd = dayjs(leave.date).endOf("day");

  const query = {
    sectionId,
    startTime: { $gte: dayStart.toDate(), $lte: dayEnd.toDate() },
  };
  if (leave.type === "LECTURE" && leave.lectureIds?.length) {
    query._id = { $in: leave.lectureIds.map(refId).filter(Boolean) };
  }

  const lectures = await LectureSession.find(query).select("_id startTime").lean();

  let targets = lectures;
  if (leave.type === "HALF") {
    targets = lectures.filter((l) => {
      const h = dayjs(l.startTime).hour();
      return leave.halfWhich === "FIRST" ? h < 13 : h >= 13;
    });
  }

  if (!targets.length) return { updated: 0 };

  for (const lec of targets) {
    await Attendance.findOneAndUpdate(
      { lectureSessionId: lec._id, studentId },
      {
        $set: {
          status: "LEAVE",
          markedAt: new Date(),
          markMethod: "AUTO",
          remarks: "Leave approved by mentor",
        },
      },
      { upsert: true }
    );
  }

  // Refresh totalMarked for affected lectures
  const ids = targets.map((l) => l._id);
  const agg = await Attendance.aggregate([
    { $match: { lectureSessionId: { $in: ids }, status: { $in: ["PRESENT", "LATE"] } } },
    { $group: { _id: "$lectureSessionId", n: { $sum: 1 } } },
  ]);
  const byLec = new Map(agg.map((r) => [String(r._id), r.n]));
  await Promise.all(
    ids.map((id) =>
      LectureSession.updateOne({ _id: id }, { totalMarked: byLec.get(String(id)) || 0 })
    )
  );

  // Leave changes a student's report → bust that cache
  invalidatePrefix("studentReport:");

  return { updated: targets.length };
}
