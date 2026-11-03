import asyncHandler from "../../utils/asyncHandler.js";
import Department from "../../models/Academics/Department.js";
import Section from "../../models/Academics/Section.js";
import Subject from "../../models/Academics/Subject.js";
import Faculty from "../../models/users/Faculty.js";
import Student from "../../models/users/Student.js";
import { validateCreateDepartment } from "../../validators/index.js";
import { recordAudit, pickChanged } from "../../utils/audit.js";
import { parseSort, activeFilter } from "../../utils/listQuery.js";

const label = (d) => `${d.code} · ${d.name}`;

/** How many records still point at this department (for counts + delete guard). */
async function departmentUsage(id) {
  const [sections, subjects, faculty, students] = await Promise.all([
    Section.countDocuments({ departmentId: id }),
    Subject.countDocuments({ departmentId: id }),
    Faculty.countDocuments({ departmentId: id }),
    Student.countDocuments({ departmentId: id }),
  ]);
  return { sections, subjects, faculty, students };
}

export const createDepartment = asyncHandler(async (req, res) => {
  const v = validateCreateDepartment(req.body);
  if (!v.valid) return res.status(400).json({ success: false, code: "VALIDATION", message: v.errors.map(e => e.msg).join(". "), errors: v.errors });
  const { name, code, description } = req.body;
  const exists = await Department.findOne({ $or: [{ name }, { code: code.toUpperCase() }] });
  if (exists) return res.status(400).json({ success: false, code: "ALREADY_EXISTS", message: "A department with this name or code already exists." });
  const dept = await Department.create({ name, code: code.toUpperCase(), description: description || null });
  recordAudit({ req, entityType: "DEPARTMENT", entityId: dept._id, action: "CREATE", entityLabel: label(dept), changes: { name, code: dept.code } });
  res.status(201).json({ success: true, message: "Department created", data: dept });
});

/**
 * GET /departments?showInactive=&sortBy=&order=&withCounts=1
 * withCounts=1 adds { counts: { sections, subjects, faculty, students } } per
 * department (one aggregation per collection, not one query per row).
 */
export const getAllDepartments = asyncHandler(async (req, res) => {
  const filter = activeFilter(req.query);
  const sort = parseSort(req.query, ["name", "code", "createdAt", "isActive"], { field: "name", order: "asc" });
  const depts = await Department.find(filter).sort(sort).lean();
  if (req.query.withCounts === "1" || req.query.withCounts === "true") {
    const group = (Model, extra = {}) => Model.aggregate([{ $match: { departmentId: { $ne: null }, ...extra } }, { $group: { _id: "$departmentId", n: { $sum: 1 } } }]);
    const [sec, sub, fac, stu] = await Promise.all([
      group(Section, { isActive: true }), group(Subject, { isActive: true }), group(Faculty, { isActive: true }), group(Student, { isActive: true }),
    ]);
    const toMap = (rows) => new Map(rows.map((r) => [String(r._id), r.n]));
    const m = { sections: toMap(sec), subjects: toMap(sub), faculty: toMap(fac), students: toMap(stu) };
    for (const d of depts) {
      const k = String(d._id);
      d.counts = { sections: m.sections.get(k) || 0, subjects: m.subjects.get(k) || 0, faculty: m.faculty.get(k) || 0, students: m.students.get(k) || 0 };
    }
  }
  res.json({ success: true, count: depts.length, total: depts.length, data: depts });
});

export const getDepartmentById = asyncHandler(async (req, res) => {
  const dept = await Department.findById(req.params.id).lean();
  if (!dept) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Department not found" });
  dept.counts = await departmentUsage(dept._id);
  res.json({ success: true, data: dept });
});

export const updateDepartment = asyncHandler(async (req, res) => {
  const dept = await Department.findById(req.params.id);
  if (!dept) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Department not found" });
  const before = dept.toObject();
  const { name, code, description, isActive } = req.body;
  if (name !== undefined) dept.name = name;
  if (code !== undefined) dept.code = String(code).toUpperCase();
  if (description !== undefined) dept.description = description || null;
  if (isActive !== undefined) dept.isActive = Boolean(isActive);
  await dept.save();
  const { changes, previous } = pickChanged(before, dept.toObject(), ["name", "code", "description", "isActive"]);
  const action = changes.isActive === true && before.isActive === false ? "REACTIVATE" : changes.isActive === false && before.isActive === true ? "DEACTIVATE" : "UPDATE";
  recordAudit({ req, entityType: "DEPARTMENT", entityId: dept._id, action, entityLabel: label(dept), changes, previous });
  res.json({ success: true, message: "Department updated", data: dept });
});

export const deleteDepartment = asyncHandler(async (req, res) => {
  const dept = await Department.findById(req.params.id);
  if (!dept) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Department not found" });
  dept.isActive = false; await dept.save();
  recordAudit({ req, entityType: "DEPARTMENT", entityId: dept._id, action: "DEACTIVATE", entityLabel: label(dept) });
  res.json({ success: true, message: "Department deactivated" });
});

/**
 * Permanent delete is refused while classes, subjects, faculty or students
 * still belong to the department - otherwise they would point at nothing.
 */
export const permanentlyDeleteDepartment = asyncHandler(async (req, res) => {
  const dept = await Department.findById(req.params.id);
  if (!dept) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Department not found" });
  const usage = await departmentUsage(dept._id);
  const inUse = Object.entries(usage).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k === "sections" ? "class" + (n === 1 ? "" : "es") : k}`);
  if (inUse.length) {
    return res.status(409).json({ success: false, code: "IN_USE", message: `This department still has ${inUse.join(", ")}. Move or delete those first, or just deactivate the department.`, data: usage });
  }
  await Department.deleteOne({ _id: dept._id });
  recordAudit({ req, entityType: "DEPARTMENT", entityId: dept._id, action: "DELETE", entityLabel: label(dept) });
  res.json({ success: true, message: "Department permanently deleted" });
});
