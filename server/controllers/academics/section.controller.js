import asyncHandler from "../../utils/asyncHandler.js";
import Section from "../../models/Academics/Section.js";
import Student from "../../models/users/Student.js";
import FacultySubjectSection from "../../models/mapping/FacultySubjectSection.js";
import LectureSession from "../../models/lecture/LectureSession.js";
import { validateCreateSection } from "../../validators/index.js";
import { recordAudit, pickChanged } from "../../utils/audit.js";
import { parseSort, activeFilter, refFilter, numFilter } from "../../utils/listQuery.js";
import { studentCountsBySection } from "../../utils/sectionCounts.js";
import { invalidatePrefix } from "../../services/cacheService.js";

const label = (s) => `${s.departmentId?.code || ""} ${s.name} · Sem ${s.semester} · ${s.batchYear}`.trim();

export const createSection = asyncHandler(async (req, res) => {
  const v = validateCreateSection(req.body);
  if (!v.valid) return res.status(400).json({ success: false, code: "VALIDATION", message: v.errors.map(e => e.msg).join(". "), errors: v.errors });
  const { name, departmentId, semester, batchYear, batchEndYear } = req.body;
  if (batchEndYear && Number(batchEndYear) <= Number(batchYear)) {
    return res.status(400).json({ success: false, code: "VALIDATION", message: "Batch end year must be after the start year." });
  }
  const exists = await Section.findOne({ name, departmentId, semester, batchYear });
  if (exists) return res.status(400).json({ success: false, code: "ALREADY_EXISTS", message: "This class already exists for that department, semester and batch." });
  const section = await Section.create({ name, departmentId, semester, batchYear, batchEndYear: batchEndYear || null });
  const populated = await Section.findById(section._id).populate("departmentId", "name code");
  recordAudit({ req, entityType: "SECTION", entityId: section._id, action: "CREATE", entityLabel: label(populated), changes: { name, semester, batchYear } });
  invalidatePrefix("adminOverview");
  res.status(201).json({ success: true, message: "Class created", data: populated });
});

/**
 * GET /sections?showInactive=&department=&semester=&batchYear=&sortBy=&order=
 * Every row carries a LIVE `studentCount` (active students in that class) so
 * the admin table is never stale, whatever `totalStudents` says.
 */
export const getAllSections = asyncHandler(async (req, res) => {
  const filter = { ...activeFilter(req.query) };
  const dept = refFilter(req.query.department), sem = numFilter(req.query.semester), batch = numFilter(req.query.batchYear);
  if (dept !== undefined) filter.departmentId = dept;
  if (sem !== undefined) filter.semester = sem;
  if (batch !== undefined) filter.batchYear = batch;
  const sort = parseSort(req.query, ["name", "semester", "batchYear", "createdAt", "totalStudents"], { field: "batchYear", order: "desc" });
  const sections = await Section.find(filter).populate("departmentId", "name code").sort(sort).lean();
  const counts = await studentCountsBySection(sections.map((s) => s._id));
  for (const s of sections) {
    s.studentCount = counts.get(String(s._id)) || 0;
    // lean() skips virtuals — rebuild batchLabel ("2026-30") so clients keep working.
    s.batchLabel = s.batchEndYear && s.batchEndYear > s.batchYear ? `${s.batchYear}-${String(s.batchEndYear).slice(-2)}` : String(s.batchYear);
  }
  res.json({ success: true, count: sections.length, total: sections.length, data: sections });
});

export const updateSection = asyncHandler(async (req, res) => {
  const section = await Section.findById(req.params.id);
  if (!section) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Class not found" });
  const before = section.toObject();
  const { name, departmentId, semester, batchYear, batchEndYear, isActive } = req.body;
  if (name !== undefined) section.name = name;
  if (departmentId !== undefined && departmentId !== "") section.departmentId = departmentId;
  if (semester !== undefined && semester !== "") section.semester = Number(semester);
  if (batchYear !== undefined && batchYear !== "") section.batchYear = Number(batchYear);
  if (batchEndYear !== undefined) section.batchEndYear = batchEndYear ? Number(batchEndYear) : null;
  if (isActive !== undefined) section.isActive = Boolean(isActive);
  if (section.batchEndYear && section.batchEndYear <= section.batchYear) {
    return res.status(400).json({ success: false, code: "VALIDATION", message: "Batch end year must be after the start year." });
  }
  await section.save();
  const populated = await Section.findById(section._id).populate("departmentId", "name code");
  const { changes, previous } = pickChanged(before, section.toObject(), ["name", "departmentId", "semester", "batchYear", "batchEndYear", "isActive"]);
  const action = changes.isActive === true && before.isActive === false ? "REACTIVATE" : changes.isActive === false && before.isActive === true ? "DEACTIVATE" : "UPDATE";
  recordAudit({ req, entityType: "SECTION", entityId: section._id, action, entityLabel: label(populated), changes, previous });
  invalidatePrefix("adminOverview");
  res.json({ success: true, message: "Class updated", data: populated });
});

export const deleteSection = asyncHandler(async (req, res) => {
  const section = await Section.findById(req.params.id).populate("departmentId", "name code");
  if (!section) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Class not found" });
  section.isActive = false; await section.save();
  recordAudit({ req, entityType: "SECTION", entityId: section._id, action: "DEACTIVATE", entityLabel: label(section) });
  invalidatePrefix("adminOverview");
  res.json({ success: true, message: "Class deactivated" });
});

/** Refused while students, teaching assignments or lectures still reference the class. */
export const permanentlyDeleteSection = asyncHandler(async (req, res) => {
  const section = await Section.findById(req.params.id).populate("departmentId", "name code");
  if (!section) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Class not found" });
  const [students, assignments, lectures] = await Promise.all([
    Student.countDocuments({ sectionId: section._id }),
    FacultySubjectSection.countDocuments({ sectionId: section._id }),
    LectureSession.countDocuments({ sectionId: section._id }),
  ]);
  if (students || assignments || lectures) {
    const parts = [students && `${students} student${students === 1 ? "" : "s"}`, assignments && `${assignments} teaching assignment${assignments === 1 ? "" : "s"}`, lectures && `${lectures} lecture${lectures === 1 ? "" : "s"}`].filter(Boolean);
    return res.status(409).json({ success: false, code: "IN_USE", message: `This class still has ${parts.join(", ")}. Move the students first, or deactivate the class instead.`, data: { students, assignments, lectures } });
  }
  await Section.deleteOne({ _id: section._id });
  recordAudit({ req, entityType: "SECTION", entityId: section._id, action: "DELETE", entityLabel: label(section) });
  invalidatePrefix("adminOverview");
  res.json({ success: true, message: "Class permanently deleted" });
});
