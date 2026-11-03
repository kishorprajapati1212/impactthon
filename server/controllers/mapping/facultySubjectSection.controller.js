import asyncHandler from "../../utils/asyncHandler.js";
import FacultySubjectSection from "../../models/mapping/FacultySubjectSection.js";
import Section from "../../models/Academics/Section.js";
import LectureSession from "../../models/lecture/LectureSession.js";
import { validateAssignFaculty } from "../../validators/index.js";
import { recordAudit, pickChanged } from "../../utils/audit.js";
import { parseSort, refFilter, numFilter } from "../../utils/listQuery.js";
import { invalidatePrefix } from "../../services/cacheService.js";

const POPULATE = [
  { path: "facultyId", select: "employeeId designation", populate: { path: "userId", select: "name email" } },
  { path: "subjectId", select: "subjectName subjectCode credits semester" },
  { path: "sectionId", select: "name semester batchYear batchEndYear", populate: { path: "departmentId", select: "name code" } },
];
const label = (a) => `${a.facultyId?.userId?.name || a.facultyId?.employeeId || "Faculty"} → ${a.subjectId?.subjectCode || "subject"} → ${a.sectionId?.departmentId?.code || ""} ${a.sectionId?.name || ""}`.trim();

/**
 * POST /faculty-subject-section
 * Body: { facultyId, subjectId, sectionId, academicYear?, semester? }
 * semester defaults to the CLASS's semester (the old UI hard-coded 1, which
 * silently produced wrong assignments); academicYear defaults to this year.
 */
export const createFacultySubjectSection = asyncHandler(async (req, res) => {
  const v = validateAssignFaculty(req.body);
  if (!v.valid) return res.status(400).json({ success: false, code: "VALIDATION", message: v.errors.map(e => e.msg).join(". "), errors: v.errors });
  const { facultyId, subjectId, sectionId, academicYear } = req.body;
  const section = await Section.findById(sectionId).select("semester").lean();
  if (!section) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "That class no longer exists." });
  const semester = req.body.semester ? Number(req.body.semester) : section.semester;
  const year = academicYear ? Number(academicYear) : new Date().getFullYear();
  const exists = await FacultySubjectSection.findOne({ facultyId, subjectId, sectionId, academicYear: year, semester });
  if (exists) {
    if (!exists.isActive) { exists.isActive = true; await exists.save(); }
    else return res.status(400).json({ success: false, code: "ALREADY_EXISTS", message: "This teacher already teaches that subject to that class." });
  }
  const a = exists || await FacultySubjectSection.create({ facultyId, subjectId, sectionId, academicYear: year, semester });
  const populated = await FacultySubjectSection.findById(a._id).populate(POPULATE);
  recordAudit({ req, entityType: "ASSIGNMENT", entityId: a._id, action: exists ? "REACTIVATE" : "CREATE", entityLabel: label(populated), changes: { facultyId, subjectId, sectionId, academicYear: year, semester } });
  invalidatePrefix("adminOverview"); // assignment change → overview matrix stale
  res.status(201).json({ success: true, message: "Assigned successfully", data: populated });
});

export const getFacultyAssignments = asyncHandler(async (req, res) => {
  const a = await FacultySubjectSection.find({ facultyId: req.profileId, isActive: true })
    .populate("subjectId", "subjectName subjectCode credits")
    .populate({ path: "sectionId", select: "name semester batchYear batchEndYear", populate: { path: "departmentId", select: "name code" } })
    .sort({ academicYear: -1, semester: 1 });
  res.json({ success: true, count: a.length, data: a });
});

/** GET /assignments?faculty=&subject=&section=&academicYear=&showInactive=&sortBy=&order= */
export const getAllAssignments = asyncHandler(async (req, res) => {
  const { faculty, subject, section, academicYear, showInactive } = req.query;
  const filter = {};
  if (showInactive !== "true" && showInactive !== "1") filter.isActive = true;
  if (showInactive === "only") filter.isActive = false;
  const fac = refFilter(faculty), sub = refFilter(subject), sec = refFilter(section), year = numFilter(academicYear);
  if (fac !== undefined) filter.facultyId = fac;
  if (sub !== undefined) filter.subjectId = sub;
  if (sec !== undefined) filter.sectionId = sec;
  if (year !== undefined) filter.academicYear = year;
  const sort = parseSort(req.query, ["academicYear", "semester", "createdAt"], { field: "academicYear", order: "desc" });
  const a = await FacultySubjectSection.find(filter).populate(POPULATE).sort({ ...sort, semester: 1 }).lean();
  res.json({ success: true, count: a.length, total: a.length, data: a });
});

export const updateAssignment = asyncHandler(async (req, res) => {
  const assignment = await FacultySubjectSection.findById(req.params.id);
  if (!assignment) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Assignment not found" });
  const before = assignment.toObject();
  const { facultyId, subjectId, sectionId, academicYear, semester, isActive } = req.body;
  if (facultyId !== undefined && facultyId !== "") assignment.facultyId = facultyId;
  if (subjectId !== undefined && subjectId !== "") assignment.subjectId = subjectId;
  if (sectionId !== undefined && sectionId !== "") assignment.sectionId = sectionId;
  if (academicYear !== undefined && academicYear !== "") assignment.academicYear = Number(academicYear);
  if (semester !== undefined && semester !== "") assignment.semester = Number(semester);
  if (isActive !== undefined) assignment.isActive = Boolean(isActive);
  const dup = await FacultySubjectSection.findOne({ _id: { $ne: assignment._id }, facultyId: assignment.facultyId, subjectId: assignment.subjectId, sectionId: assignment.sectionId, academicYear: assignment.academicYear, semester: assignment.semester });
  if (dup) return res.status(400).json({ success: false, code: "ALREADY_EXISTS", message: "An identical teaching assignment already exists." });
  await assignment.save();
  const populated = await FacultySubjectSection.findById(assignment._id).populate(POPULATE);
  const { changes, previous } = pickChanged(before, assignment.toObject(), ["facultyId", "subjectId", "sectionId", "academicYear", "semester", "isActive"]);
  const action = changes.isActive === true && before.isActive === false ? "REACTIVATE" : changes.isActive === false && before.isActive === true ? "DEACTIVATE" : "UPDATE";
  recordAudit({ req, entityType: "ASSIGNMENT", entityId: assignment._id, action, entityLabel: label(populated), changes, previous });
  invalidatePrefix("adminOverview");
  res.json({ success: true, message: "Assignment updated", data: populated });
});

export const deleteAssignment = asyncHandler(async (req, res) => {
  const a = await FacultySubjectSection.findById(req.params.id).populate(POPULATE);
  if (!a) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Assignment not found" });
  a.isActive = false; await a.save();
  recordAudit({ req, entityType: "ASSIGNMENT", entityId: a._id, action: "DEACTIVATE", entityLabel: label(a) });
  invalidatePrefix("adminOverview");
  res.json({ success: true, message: "Assignment deactivated" });
});

/** Refused while lectures were taken under this teacher+subject+class (attendance history). */
export const permanentlyDeleteAssignment = asyncHandler(async (req, res) => {
  const a = await FacultySubjectSection.findById(req.params.id).populate(POPULATE);
  if (!a) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Assignment not found" });
  const lectures = await LectureSession.countDocuments({ facultyId: a.facultyId?._id || a.facultyId, subjectId: a.subjectId?._id || a.subjectId, sectionId: a.sectionId?._id || a.sectionId });
  if (lectures) {
    return res.status(409).json({ success: false, code: "IN_USE", message: `${lectures} lecture${lectures === 1 ? " was" : "s were"} already taken under this assignment. Deactivate it instead so the attendance history stays linked.`, data: { lectures } });
  }
  const lbl = label(a);
  await FacultySubjectSection.deleteOne({ _id: a._id });
  recordAudit({ req, entityType: "ASSIGNMENT", entityId: a._id, action: "DELETE", entityLabel: lbl });
  invalidatePrefix("adminOverview");
  res.json({ success: true, message: "Assignment permanently deleted" });
});
