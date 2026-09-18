import asyncHandler from "../../utils/asyncHandler.js";
import Section from "../../models/Academics/Section.js";
import { validateCreateSection } from "../../validators/index.js";

export const createSection = asyncHandler(async (req, res) => {
  const v = validateCreateSection(req.body);
  if (!v.valid) return res.status(400).json({ success: false, message: v.errors.map(e => e.msg).join(". "), errors: v.errors });
  const { name, departmentId, semester, batchYear, batchEndYear } = req.body;
  const exists = await Section.findOne({ name, departmentId, semester, batchYear });
  if (exists) return res.status(400).json({ success: false, message: "Section already exists" });
  const section = await Section.create({ name, departmentId, semester, batchYear, batchEndYear: batchEndYear || null });
  res.status(201).json({ success: true, message: "Section created", data: section });
});

export const getAllSections = asyncHandler(async (req, res) => {
  const { sortBy = "batchYear", order = "desc", showInactive = "false", department } = req.query;
  const filter = {};
  if (showInactive !== "true") filter.isActive = true;
  if (department) filter.departmentId = department;
  const dir = order === "desc" ? -1 : 1;
  const sections = await Section.find(filter).populate("departmentId", "name code").sort({ [sortBy]: dir });
  res.json({ success: true, count: sections.length, data: sections });
});

export const updateSection = asyncHandler(async (req, res) => {
  const section = await Section.findById(req.params.id);
  if (!section) return res.status(404).json({ success: false, message: "Section not found" });
  const { name, departmentId, semester, batchYear, batchEndYear, isActive } = req.body;
  if (name !== undefined) section.name = name;
  if (departmentId !== undefined) section.departmentId = departmentId;
  if (semester !== undefined) section.semester = semester;
  if (batchYear !== undefined) section.batchYear = batchYear;
  if (batchEndYear !== undefined) section.batchEndYear = batchEndYear || null;
  if (isActive !== undefined) section.isActive = isActive;
  await section.save();
  res.json({ success: true, message: "Section updated", data: section });
});

export const deleteSection = asyncHandler(async (req, res) => {
  const section = await Section.findById(req.params.id);
  if (!section) return res.status(404).json({ success: false, message: "Section not found" });
  section.isActive = false; await section.save();
  res.json({ success: true, message: "Section deactivated" });
});

export const permanentlyDeleteSection = asyncHandler(async (req, res) => {
  const section = await Section.findByIdAndDelete(req.params.id);
  if (!section) return res.status(404).json({ success: false, message: "Section not found" });
  res.json({ success: true, message: "Section permanently deleted" });
});
