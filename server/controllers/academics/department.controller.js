import asyncHandler from "../../utils/asyncHandler.js";
import Department from "../../models/Academics/Department.js";
import { validateCreateDepartment } from "../../validators/index.js";

export const createDepartment = asyncHandler(async (req, res) => {
  const v = validateCreateDepartment(req.body);
  if (!v.valid) return res.status(400).json({ success: false, message: v.errors.map(e => e.msg).join(". "), errors: v.errors });
  const { name, code, description } = req.body;
  const exists = await Department.findOne({ $or: [{ name }, { code: code.toUpperCase() }] });
  if (exists) return res.status(400).json({ success: false, message: "Department name or code already exists" });
  const dept = await Department.create({ name, code: code.toUpperCase(), description });
  res.status(201).json({ success: true, message: "Department created", data: dept });
});

export const getAllDepartments = asyncHandler(async (req, res) => {
  const { sortBy = "name", order = "asc", showInactive = "false" } = req.query;
  const filter = showInactive === "true" ? {} : { isActive: true };
  const dir = order === "desc" ? -1 : 1;
  const depts = await Department.find(filter).sort({ [sortBy]: dir });
  res.json({ success: true, count: depts.length, data: depts });
});

export const getDepartmentById = asyncHandler(async (req, res) => {
  const dept = await Department.findById(req.params.id);
  if (!dept) return res.status(404).json({ success: false, message: "Department not found" });
  res.json({ success: true, data: dept });
});

export const updateDepartment = asyncHandler(async (req, res) => {
  const dept = await Department.findById(req.params.id);
  if (!dept) return res.status(404).json({ success: false, message: "Department not found" });
  const { name, code, description, isActive } = req.body;
  console.log(req.body)
  if (name !== undefined) dept.name = name;
  if (code !== undefined) dept.code = code.toUpperCase();
  if (description !== undefined) dept.description = description;
  if (isActive !== undefined) dept.isActive = isActive;
  await dept.save();
  res.json({ success: true, message: "Department updated", data: dept });
});

export const deleteDepartment = asyncHandler(async (req, res) => {
  const dept = await Department.findById(req.params.id);
  if (!dept) return res.status(404).json({ success: false, message: "Department not found" });
  dept.isActive = false; await dept.save();
  res.json({ success: true, message: "Department deactivated" });
});

export const permanentlyDeleteDepartment = asyncHandler(async (req, res) => {
  const dept = await Department.findByIdAndDelete(req.params.id);
  if (!dept) return res.status(404).json({ success: false, message: "Department not found" });
  res.json({ success: true, message: "Department permanently deleted" });
});
