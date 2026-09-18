
async function logAudit(entityType, entityId, changedBy, action, changes, prev) {
  try {
    const { default: AuditLog } = await import("../../models/users/AuditLog.js");
    await AuditLog.create({ entityType, entityId, changedBy, action, changes, previousValues: prev || {} });
  } catch {}
}
import asyncHandler from "../../utils/asyncHandler.js";
import bcrypt from "bcryptjs";
import User from "../../models/users/User.js";
import Faculty from "../../models/users/Faculty.js";
import generateToken from "../../utils/generateToken.js";
import { validateCreateFaculty } from "../../validators/index.js";

function buildName(body) {
  if (body.name) return body.name.trim();
  const parts = [body.firstName, body.lastName].filter(Boolean);
  return parts.length ? parts.join(" ") : "";
}

export const createFaculty = asyncHandler(async (req, res) => {
  const v = validateCreateFaculty(req.body);
  if (!v.valid) return res.status(400).json({ success: false, message: v.errors.map(e => e.msg).join(". "), errors: v.errors });
  const name = buildName(req.body);
  const { email, password, employeeId, departmentId, designation, phone, specialization } = req.body;
  if (await User.findOne({ email })) return res.status(400).json({ success: false, message: "Email already exists" });
  if (await Faculty.findOne({ employeeId })) return res.status(400).json({ success: false, message: "Employee ID already exists" });
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 10), role: "FACULTY" });
  const faculty = await Faculty.create({ userId: user._id, employeeId, departmentId, designation: designation || "Assistant Professor", phone, specialization });
  res.status(201).json({ success: true, message: "Faculty created", data: { _id: user._id, name, email, role: "FACULTY", employeeId, token: generateToken(user._id, "FACULTY") } });
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: "Email and password required" });
  const user = await User.findOne({ email, role: "FACULTY" }).select("+password");
  if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ success: false, message: "Invalid credentials" });
  const faculty = await Faculty.findOne({ userId: user._id }).populate("departmentId", "name code");
  res.json({ success: true, message: "Login successful", data: { _id: user._id, name: user.name, email: user.email, role: user.role, employeeId: faculty?.employeeId, department: faculty?.departmentId, token: generateToken(user._id, user.role) } });
});

export const getAllFaculty = asyncHandler(async (req, res) => {
  const { search, department, sortBy = "createdAt", order = "desc", showInactive = "false" } = req.query;
  const filter = {};
  if (showInactive !== "true") filter.isActive = true;
  if (department) filter.departmentId = department;
  let query = Faculty.find(filter);
  if (search) {
    const users = await User.find({ name: { $regex: search, $options: "i" }, role: "FACULTY" }).select("_id");
    query = Faculty.find({ ...filter, $or: [{ userId: { $in: users.map(u => u._id) } }, { employeeId: { $regex: search, $options: "i" } }] });
  }
  const dir = order === "desc" ? -1 : 1;
  const faculty = await query.populate("userId", "name email isActive").populate("departmentId", "name code").sort({ [sortBy]: dir }).skip(0).limit(200);
  res.json({ success: true, count: faculty.length, data: faculty });
});

export const getFacultyProfile = asyncHandler(async (req, res) => {
  const faculty = await Faculty.findOne({ userId: req.user._id }).populate("userId", "name email").populate("departmentId", "name code");
  if (!faculty) return res.status(404).json({ success: false, message: "Faculty profile not found" });
  res.json({ success: true, data: faculty });
});

export const updateFaculty = asyncHandler(async (req, res) => {
  const faculty = await Faculty.findById(req.params.id);
  if (!faculty) return res.status(404).json({ success: false, message: "Faculty not found" });
  const name = buildName(req.body);
  const { email, departmentId, designation, phone, specialization, joiningYear, isActive } = req.body;
  if (departmentId !== undefined) faculty.departmentId = departmentId;
  if (designation !== undefined) faculty.designation = designation;
  if (phone !== undefined) faculty.phone = phone;
  if (specialization !== undefined) faculty.specialization = specialization;
  if (joiningYear !== undefined) faculty.joiningYear = joiningYear;
  if (isActive !== undefined) faculty.isActive = isActive;
  await faculty.save();
  logAudit("FACULTY", faculty._id, req.user._id, "UPDATE", req.body, {});
  if (name || email) {
    const user = await User.findById(faculty.userId);
    if (user) { if (name) user.name = name; if (email) user.email = email; await user.save(); }
  }
  const updated = await Faculty.findById(faculty._id).populate("userId", "name email").populate("departmentId", "name code");
  res.json({ success: true, message: "Faculty updated", data: updated });
});

export const deleteFaculty = asyncHandler(async (req, res) => {
  const faculty = await Faculty.findById(req.params.id);
  if (!faculty) return res.status(404).json({ success: false, message: "Faculty not found" });
  faculty.isActive = false; await faculty.save();
  logAudit("FACULTY", faculty._id, req.user._id, "UPDATE", req.body, {});
  await User.findByIdAndUpdate(faculty.userId, { isActive: false });
  res.json({ success: true, message: "Faculty deactivated" });
});

export const permanentlyDeleteFaculty = asyncHandler(async (req, res) => {
  const faculty = await Faculty.findByIdAndDelete(req.params.id);
  if (!faculty) return res.status(404).json({ success: false, message: "Faculty not found" });
  await User.findByIdAndDelete(faculty.userId);
  res.json({ success: true, message: "Faculty permanently deleted" });
});
