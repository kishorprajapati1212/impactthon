import Department from "../../models/Academics/Department.js";
export const createDepartment = async (req, res, next) => {
  try {
    const { name, code, description } = req.body;
    if (await Department.findOne({ $or: [{ name }, { code: code?.toUpperCase() }] })) return res.status(400).json({ success: false, message: "Department name or code already exists" });
    const dept = await Department.create({ name, code: code.toUpperCase(), description });
    res.status(201).json({ success: true, message: "Department created", data: dept });
  } catch (e) { next(e); }
};
export const getAllDepartments = async (req, res, next) => {
  try {
    const depts = await Department.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, count: depts.length, data: depts });
  } catch (e) { next(e); }
};
export const getDepartmentById = async (req, res, next) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ success: false, message: "Department not found" });
    res.json({ success: true, data: dept });
  } catch (e) { next(e); }
};
