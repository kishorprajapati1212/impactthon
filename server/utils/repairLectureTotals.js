import Attendance from "../models/Attendance/Attendance.js";
import LectureSession from "../models/lecture/LectureSession.js";

/**
 * One-off self-heal for `LectureSession.totalMarked`.
 *
 * Why: until v3.4.0 `finalizeLecturesBulk` refreshed totalMarked with an
 * aggregate whose `$in` list held *strings*; Mongoose does not cast pipeline
 * values, so nothing matched and every finished lecture was reset to 0
 * ("0 present" on the faculty dashboard / history even though students had
 * scanned). The bug is fixed, but databases that already ran the old code
 * still hold zeros - this recount runs once at start-up and repairs them.
 *
 * Cheap: one aggregate over PRESENT/LATE rows + a bulkWrite of the diffs.
 */
export async function repairLectureTotals({ log = console } = {}) {
  const counts = await Attendance.aggregate([
    { $match: { status: { $in: ["PRESENT", "LATE"] } } },
    { $group: { _id: "$lectureSessionId", n: { $sum: 1 } } },
  ]);
  const byLecture = new Map(counts.map((r) => [String(r._id), r.n]));

  const lectures = await LectureSession.find({ status: { $in: ["COMPLETED", "ACTIVE"] } })
    .select("_id totalMarked")
    .lean();

  const ops = [];
  for (const l of lectures) {
    const should = byLecture.get(String(l._id)) || 0;
    if ((l.totalMarked || 0) !== should) {
      ops.push({ updateOne: { filter: { _id: l._id }, update: { $set: { totalMarked: should } } } });
    }
  }
  if (ops.length) {
    await LectureSession.bulkWrite(ops, { ordered: false });
    log.info?.(`[repair] totalMarked corrected on ${ops.length} lecture(s)`);
  }
  return { checked: lectures.length, repaired: ops.length };
}
