import asyncHandler from "../../utils/asyncHandler.js";
import FacultySubjectSection from "../../models/mapping/FacultySubjectSection.js";
import { validateAssignFaculty } from "../../validators/index.js";
import { invalidatePrefix } from "../../services/cacheService.js";

export const createFacultySubjectSection = asyncHandler(async (req, res) => {
  const v = validateAssignFaculty(req.body);
  if (!v.valid) return res.status(400).json({ success: false, message: v.errors.map(e => e.msg).join(". "), errors: v.errors });
  const { facultyId, subjectId, sectionId, academicYear, semester } = req.body;
  const year = academicYear || new Date().getFullYear();
  const exists = await FacultySubjectSection.findOne({ facultyId, subjectId, sectionId, academicYear: year, semester });
  if (exists) return res.status(400).json({ success: false, message: "Assignment already exists" });
  const a = await FacultySubjectSection.create({ facultyId, subjectId, sectionId, academicYear: year, semester });
  const populated = await FacultySubjectSection.findById(a._id)
    .populate({ path: "facultyId", populate: { path: "userId", select: "name email" } })
    .populate("subjectId", "subjectName subjectCode")
    .populate({ path: "sectionId", select: "name semester batchYear batchEndYear", populate: { path: "departmentId", select: "name code" } });
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

export const getAllAssignments = asyncHandler(async (req, res) => {
  const { sortBy = "academicYear", order = "desc" } = req.query;
  const dir = order === "desc" ? -1 : 1;
  const a = await FacultySubjectSection.find()
    .populate({ path: "facultyId", populate: { path: "userId", select: "name email" } })
    .populate("subjectId", "subjectName subjectCode")
    .populate({ path: "sectionId", select: "name semester batchYear batchEndYear", populate: { path: "departmentId", select: "name code" } })
    .sort({ [sortBy]: dir, semester: 1 });
  res.json({ success: true, count: a.length, data: a });
});

export const updateAssignment = asyncHandler(async (req, res) => {
  const assignment = await FacultySubjectSection.findById(req.params.id);
  if (!assignment) return res.status(404).json({ success: false, message: "Assignment not found" });
  const { facultyId, subjectId, sectionId, academicYear, semester, isActive } = req.body;
  if (facultyId !== undefined) assignment.facultyId = facultyId;
  if (subjectId !== undefined) assignment.subjectId = subjectId;
  if (sectionId !== undefined) assignment.sectionId = sectionId;
  if (academicYear !== undefined) assignment.academicYear = academicYear;
  if (semester !== undefined) assignment.semester = semester;
  if (isActive !== undefined) assignment.isActive = isActive;
  await assignment.save();
  invalidatePrefix("adminOverview");
  const populated = await FacultySubjectSection.findById(assignment._id)
    .populate({ path: "facultyId", populate: { path: "userId", select: "name email" } })
    .populate("subjectId", "subjectName subjectCode")
    .populate({ path: "sectionId", select: "name semester batchYear batchEndYear", populate: { path: "departmentId", select: "name code" } });
  res.json({ success: true, message: "Assignment updated", data: populated });
});

export const deleteAssignment = asyncHandler(async (req, res) => {
  const a = await FacultySubjectSection.findById(req.params.id);
  if (!a) return res.status(404).json({ success: false, message: "Assignment not found" });
  a.isActive = false; await a.save();
  invalidatePrefix("adminOverview");
  res.json({ success: true, message: "Assignment deactivated" });
});

export const permanentlyDeleteAssignment = asyncHandler(async (req, res) => {
  const a = await FacultySubjectSection.findByIdAndDelete(req.params.id);
  if (!a) return res.status(404).json({ success: false, message: "Assignment not found" });
  res.json({ success: true, message: "Assignment permanently deleted" });
});
