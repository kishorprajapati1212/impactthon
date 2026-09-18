import asyncHandler from "../../utils/asyncHandler.js";
import Subject from "../../models/Academics/Subject.js";
import { validateCreateSubject } from "../../validators/index.js";

export const createSubject = asyncHandler(async (req, res) => {
  const v = validateCreateSubject(req.body);
  if (!v.valid) return res.status(400).json({ success: false, message: v.errors.map(e => e.msg).join(". "), errors: v.errors });
  const { subjectName, subjectCode, departmentId, credits, semester } = req.body;
  const exists = await Subject.findOne({ subjectCode: subjectCode.toUpperCase() });
  if (exists) return res.status(400).json({ success: false, message: "Subject code already exists" });
  const sub = await Subject.create({ subjectName, subjectCode: subjectCode.toUpperCase(), departmentId: departmentId || null, credits: credits || 3, semester: semester || 1 });
  res.status(201).json({ success: true, message: "Subject created", data: sub });
});

export const getAllSubjects = asyncHandler(async (req, res) => {
  const { sortBy = "subjectName", order = "asc", showInactive = "false", department } = req.query;
  const filter = {};
  if (showInactive !== "true") filter.isActive = true;
  if (department) filter.departmentId = department;
  const dir = order === "desc" ? -1 : 1;
  const subs = await Subject.find(filter).populate("departmentId", "name code").sort({ [sortBy]: dir });
  res.json({ success: true, count: subs.length, data: subs });
});

export const updateSubject = asyncHandler(async (req, res) => {
  const sub = await Subject.findById(req.params.id);
  if (!sub) return res.status(404).json({ success: false, message: "Subject not found" });
  const { subjectName, subjectCode, departmentId, credits, semester, isActive } = req.body;
  if (subjectName !== undefined) sub.subjectName = subjectName;
  if (subjectCode !== undefined) sub.subjectCode = subjectCode.toUpperCase();
  if (departmentId !== undefined) sub.departmentId = departmentId || null;
  if (credits !== undefined) sub.credits = credits;
  if (semester !== undefined) sub.semester = semester;
  if (isActive !== undefined) sub.isActive = isActive;
  await sub.save();
  res.json({ success: true, message: "Subject updated", data: sub });
});

export const deleteSubject = asyncHandler(async (req, res) => {
  const sub = await Subject.findById(req.params.id);
  if (!sub) return res.status(404).json({ success: false, message: "Subject not found" });
  sub.isActive = false; await sub.save();
  res.json({ success: true, message: "Subject deactivated" });
});

export const permanentlyDeleteSubject = asyncHandler(async (req, res) => {
  const sub = await Subject.findByIdAndDelete(req.params.id);
  if (!sub) return res.status(404).json({ success: false, message: "Subject not found" });
  res.json({ success: true, message: "Subject permanently deleted" });
});
