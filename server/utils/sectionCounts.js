import Student from "../models/users/Student.js";
import { toObjectIds } from "./ids.js";
import Section from "../models/Academics/Section.js";

/**
 * Keep Section.totalStudents truthful.
 *
 * Why: the field existed since day one but was only written by the seeder,
 * so the "Students" column in the admin Classes table went wrong the moment
 * an admin added, moved, or removed a student. Now:
 *  - list endpoints attach a LIVE `studentCount` (what the UI shows), and
 *  - every student write re-counts the affected classes so the stored value
 *    (used by reports/exports) matches too.
 * Only active, currently-studying students are counted.
 */

const ACTIVE_STUDENT = { isActive: true, $or: [{ lifecycleStatus: "STUDYING" }, { lifecycleStatus: { $exists: false } }] };

/** Map<sectionId, count> of active students, optionally for a subset of sections. */
export async function studentCountsBySection(sectionIds = null) {
  const match = { ...ACTIVE_STUDENT, sectionId: { $ne: null } };
  // aggregate() does not cast strings → ObjectId; recountSections passes strings
  if (Array.isArray(sectionIds) && sectionIds.length) match.sectionId = { $in: toObjectIds(sectionIds) };
  const rows = await Student.aggregate([{ $match: match }, { $group: { _id: "$sectionId", n: { $sum: 1 } } }]);
  return new Map(rows.map((r) => [String(r._id), r.n]));
}

/** Recount and persist totalStudents for the given section ids (null/undefined ignored). */
export async function recountSections(...sectionIds) {
  const ids = [...new Set(sectionIds.filter(Boolean).map(String))];
  if (!ids.length) return;
  try {
    const counts = await studentCountsBySection(ids);
    await Promise.all(ids.map((id) => Section.updateOne({ _id: id }, { $set: { totalStudents: counts.get(id) || 0 } })));
  } catch (err) {
    if (process.env.NODE_ENV !== "test") console.warn("[sectionCounts] recount skipped:", err?.message);
  }
}
