import asyncHandler from "../../utils/asyncHandler.js";
import Subject from "../../models/Academics/Subject.js";
import FacultySubjectSection from "../../models/mapping/FacultySubjectSection.js";
import LectureSession from "../../models/lecture/LectureSession.js";
import { validateCreateSubject } from "../../validators/index.js";
import { recordAudit, pickChanged } from "../../utils/audit.js";
import { parseSort, activeFilter, refFilter } from "../../utils/listQuery.js";
import { invalidatePrefix } from "../../services/cacheService.js";

const label = (s) => `${s.subjectCode} · ${s.subjectName}`;

export const createSubject = asyncHandler(async (req, res) => {
  const v = validateCreateSubject(req.body);
  if (!v.valid) return res.status(400).json({ success: false, code: "VALIDATION", message: v.errors.map(e => e.msg).join(". "), errors: v.errors });
  const { subjectName, subjectCode, departmentId, credits, semester } = req.body;
  const exists = await Subject.findOne({ subjectCode: subjectCode.toUpperCase() });
  if (exists) return res.status(400).json({ success: false, code: "ALREADY_EXISTS", message: "A subject with this code already exists." });
  const sub = await Subject.create({ subjectName, subjectCode: subjectCode.toUpperCase(), departmentId: departmentId || null, credits: credits || 3, semester: semester || 1 });
  recordAudit({ req, entityType: "SUBJECT", entityId: sub._id, action: "CREATE", entityLabel: label(sub), changes: { subjectName, subjectCode: sub.subjectCode, semester: sub.semester, credits: sub.credits } });
  invalidatePrefix("adminOverview");
  res.status(201).json({ success: true, message: "Subject created", data: sub });
});

/**
 * GET /subjects?showInactive=&department=&semester=&sortBy=&order=&withCounts=1
 * withCounts=1 adds teacherCount (distinct faculty with an active assignment)
 * and classCount (distinct classes it is taught to).
 */
export const getAllSubjects = asyncHandler(async (req, res) => {
  const filter = { ...activeFilter(req.query) };
  const dept = refFilter(req.query.department);
  if (dept !== undefined) filter.departmentId = dept;
  if (req.query.semester) filter.semester = Number(req.query.semester);
  const sort = parseSort(req.query, ["subjectName", "subjectCode", "semester", "credits", "createdAt"], { field: "subjectName", order: "asc" });
  const subs = await Subject.find(filter).populate("departmentId", "name code").sort(sort).lean();
  if (req.query.withCounts === "1" || req.query.withCounts === "true") {
    const rows = await FacultySubjectSection.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$subjectId", teachers: { $addToSet: "$facultyId" }, classes: { $addToSet: "$sectionId" } } },
    ]);
    const m = new Map(rows.map((r) => [String(r._id), { teacherCount: r.teachers.length, classCount: r.classes.length }]));
    for (const s of subs) { const c = m.get(String(s._id)); s.teacherCount = c?.teacherCount || 0; s.classCount = c?.classCount || 0; }
  }
  res.json({ success: true, count: subs.length, total: subs.length, data: subs });
});

export const updateSubject = asyncHandler(async (req, res) => {
  const sub = await Subject.findById(req.params.id);
  if (!sub) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Subject not found" });
  const before = sub.toObject();
  const { subjectName, subjectCode, departmentId, credits, semester, isActive } = req.body;
  if (subjectName !== undefined) sub.subjectName = subjectName;
  if (subjectCode !== undefined) sub.subjectCode = String(subjectCode).toUpperCase();
  if (departmentId !== undefined) sub.departmentId = departmentId || null;
  if (credits !== undefined && credits !== "") sub.credits = Number(credits);
  if (semester !== undefined && semester !== "") sub.semester = Number(semester);
  if (isActive !== undefined) sub.isActive = Boolean(isActive);
  await sub.save();
  const { changes, previous } = pickChanged(before, sub.toObject(), ["subjectName", "subjectCode", "departmentId", "credits", "semester", "isActive"]);
  const action = changes.isActive === true && before.isActive === false ? "REACTIVATE" : changes.isActive === false && before.isActive === true ? "DEACTIVATE" : "UPDATE";
  recordAudit({ req, entityType: "SUBJECT", entityId: sub._id, action, entityLabel: label(sub), changes, previous });
  invalidatePrefix("adminOverview");
  const populated = await Subject.findById(sub._id).populate("departmentId", "name code");
  res.json({ success: true, message: "Subject updated", data: populated });
});

export const deleteSubject = asyncHandler(async (req, res) => {
  const sub = await Subject.findById(req.params.id);
  if (!sub) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Subject not found" });
  sub.isActive = false; await sub.save();
  recordAudit({ req, entityType: "SUBJECT", entityId: sub._id, action: "DEACTIVATE", entityLabel: label(sub) });
  invalidatePrefix("adminOverview");
  res.json({ success: true, message: "Subject deactivated" });
});

/** Refused while teaching assignments or lectures reference the subject. */
export const permanentlyDeleteSubject = asyncHandler(async (req, res) => {
  const sub = await Subject.findById(req.params.id);
  if (!sub) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Subject not found" });
  const [assignments, lectures] = await Promise.all([
    FacultySubjectSection.countDocuments({ subjectId: sub._id }),
    LectureSession.countDocuments({ subjectId: sub._id }),
  ]);
  if (assignments || lectures) {
    const parts = [assignments && `${assignments} teaching assignment${assignments === 1 ? "" : "s"}`, lectures && `${lectures} lecture${lectures === 1 ? "" : "s"} with attendance`].filter(Boolean);
    return res.status(409).json({ success: false, code: "IN_USE", message: `This subject still has ${parts.join(" and ")}. Deactivate it instead so history stays readable.`, data: { assignments, lectures } });
  }
  await Subject.deleteOne({ _id: sub._id });
  recordAudit({ req, entityType: "SUBJECT", entityId: sub._id, action: "DELETE", entityLabel: label(sub) });
  invalidatePrefix("adminOverview");
  res.json({ success: true, message: "Subject permanently deleted" });
});
