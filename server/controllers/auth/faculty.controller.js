import asyncHandler from "../../utils/asyncHandler.js";
import bcrypt from "bcryptjs";
import User from "../../models/users/User.js";
import Faculty from "../../models/users/Faculty.js";
import Student from "../../models/users/Student.js";
import FacultySubjectSection from "../../models/mapping/FacultySubjectSection.js";
import LectureSession from "../../models/lecture/LectureSession.js";
import generateToken from "../../utils/generateToken.js";
import { validateCreateFaculty } from "../../validators/index.js";
import { recordAudit, pickChanged } from "../../utils/audit.js";
import { parsePagination, parseSort, activeFilter, escapeRegex, listEnvelope, refFilter } from "../../utils/listQuery.js";
import { invalidatePrefix } from "../../services/cacheService.js";

function buildName(body) {
  if (body.name) return body.name.trim();
  const parts = [body.firstName, body.lastName].filter(Boolean);
  return parts.length ? parts.join(" ") : "";
}
const label = (f, user) => `${f.employeeId} · ${user?.name || f.userId?.name || ""}`.trim();

export const createFaculty = asyncHandler(async (req, res) => {
  const v = validateCreateFaculty({ ...req.body, name: buildName(req.body) });
  if (!v.valid) return res.status(400).json({ success: false, code: "VALIDATION", message: v.errors.map(e => e.msg).join(". "), errors: v.errors });
  const name = buildName(req.body);
  const { email, password, employeeId, departmentId, designation, phone, specialization, joiningYear } = req.body;
  if (await User.findOne({ email })) return res.status(400).json({ success: false, code: "ALREADY_EXISTS", message: "This email is already registered." });
  if (await Faculty.findOne({ employeeId })) return res.status(400).json({ success: false, code: "ALREADY_EXISTS", message: "This employee ID is already in use." });
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 10), role: "FACULTY" });
  const faculty = await Faculty.create({ userId: user._id, employeeId, departmentId: departmentId || null, designation: designation || "Assistant Professor", phone: phone || null, specialization: specialization || null, joiningYear: joiningYear || undefined });
  recordAudit({ req, entityType: "FACULTY", entityId: faculty._id, action: "CREATE", entityLabel: label(faculty, user), changes: { name, email, employeeId, departmentId: departmentId || null, designation: faculty.designation } });
  invalidatePrefix("adminOverview");
  res.status(201).json({ success: true, message: "Faculty created", data: { _id: user._id, facultyId: faculty._id, name, email, role: "FACULTY", employeeId, token: generateToken(user._id, "FACULTY") } });
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: "Email and password required" });
  const user = await User.findOne({ email, role: "FACULTY" }).select("+password");
  if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ success: false, message: "Invalid credentials" });
  const faculty = await Faculty.findOne({ userId: user._id }).populate("departmentId", "name code");
  res.json({ success: true, message: "Login successful", data: { _id: user._id, name: user.name, email: user.email, role: user.role, employeeId: faculty?.employeeId, department: faculty?.departmentId, token: generateToken(user._id, user.role) } });
});

/**
 * GET /faculty?search=&department=&showInactive=&sortBy=&order=&page=&limit=
 * search matches name, email or employee ID. Paginated (default 200/page).
 */
export const getAllFaculty = asyncHandler(async (req, res) => {
  const { search, department } = req.query;
  const filter = { ...activeFilter(req.query) };
  const dept = refFilter(department);
  if (dept !== undefined) filter.departmentId = dept;
  if (search && String(search).trim()) {
    const rx = { $regex: escapeRegex(String(search).trim()), $options: "i" };
    const users = await User.find({ role: "FACULTY", $or: [{ name: rx }, { email: rx }] }).select("_id").lean();
    filter.$or = [{ userId: { $in: users.map(u => u._id) } }, { employeeId: rx }];
  }
  const { page, limit, skip } = parsePagination(req.query);
  const sort = parseSort(req.query, ["createdAt", "employeeId", "designation", "joiningYear"], { field: "createdAt", order: "desc" });
  const [total, faculty] = await Promise.all([
    Faculty.countDocuments(filter),
    Faculty.find(filter).populate("userId", "name email isActive").populate("departmentId", "name code").sort(sort).skip(skip).limit(limit).lean(),
  ]);
  res.json(listEnvelope(faculty, { total, page, limit }));
});

export const getFacultyProfile = asyncHandler(async (req, res) => {
  const faculty = await Faculty.findOne({ userId: req.user._id }).populate("userId", "name email").populate("departmentId", "name code");
  if (!faculty) return res.status(404).json({ success: false, message: "Faculty profile not found" });
  res.json({ success: true, data: faculty });
});

export const updateFaculty = asyncHandler(async (req, res) => {
  const faculty = await Faculty.findById(req.params.id);
  if (!faculty) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Faculty not found" });
  const before = faculty.toObject();
  const name = buildName(req.body);
  const { email, departmentId, designation, phone, specialization, joiningYear, isActive } = req.body;
  if (departmentId !== undefined) faculty.departmentId = departmentId || null;
  if (designation !== undefined) faculty.designation = designation || "Assistant Professor";
  if (phone !== undefined) faculty.phone = phone || null;
  if (specialization !== undefined) faculty.specialization = specialization || null;
  if (joiningYear !== undefined && joiningYear !== "") faculty.joiningYear = Number(joiningYear);
  if (isActive !== undefined) faculty.isActive = Boolean(isActive);
  await faculty.save();
  const user = await User.findById(faculty.userId);
  const userBefore = user ? { name: user.name, email: user.email } : {};
  if (user) {
    if (name) user.name = name;
    if (email && email !== user.email) {
      if (await User.findOne({ email, _id: { $ne: user._id } })) return res.status(400).json({ success: false, code: "ALREADY_EXISTS", message: "This email is already registered to someone else." });
      user.email = email;
    }
    if (isActive !== undefined) user.isActive = Boolean(isActive);
    await user.save();
  }
  const { changes, previous } = pickChanged({ ...before, ...userBefore }, { ...faculty.toObject(), name: user?.name, email: user?.email }, ["name", "email", "departmentId", "designation", "phone", "specialization", "joiningYear", "isActive"]);
  const action = changes.isActive === true && before.isActive === false ? "REACTIVATE" : changes.isActive === false && before.isActive === true ? "DEACTIVATE" : "UPDATE";
  recordAudit({ req, entityType: "FACULTY", entityId: faculty._id, action, entityLabel: label(faculty, user), changes, previous });
  invalidatePrefix("adminOverview");
  const updated = await Faculty.findById(faculty._id).populate("userId", "name email isActive").populate("departmentId", "name code");
  res.json({ success: true, message: "Faculty updated", data: updated });
});

export const deleteFaculty = asyncHandler(async (req, res) => {
  const faculty = await Faculty.findById(req.params.id).populate("userId", "name");
  if (!faculty) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Faculty not found" });
  faculty.isActive = false; await faculty.save();
  await User.findByIdAndUpdate(faculty.userId, { isActive: false });
  recordAudit({ req, entityType: "FACULTY", entityId: faculty._id, action: "DEACTIVATE", entityLabel: label(faculty) });
  invalidatePrefix("adminOverview");
  res.json({ success: true, message: "Faculty deactivated" });
});

/**
 * Permanent delete is refused while the faculty member still has teaching
 * assignments, lectures (attendance history) or current mentees.
 */
export const permanentlyDeleteFaculty = asyncHandler(async (req, res) => {
  const faculty = await Faculty.findById(req.params.id).populate("userId", "name");
  if (!faculty) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Faculty not found" });
  const [assignments, lectures, mentees] = await Promise.all([
    FacultySubjectSection.countDocuments({ facultyId: faculty._id }),
    LectureSession.countDocuments({ facultyId: faculty._id }),
    Student.countDocuments({ mentorId: faculty._id }),
  ]);
  if (assignments || lectures || mentees) {
    const parts = [assignments && `${assignments} teaching assignment${assignments === 1 ? "" : "s"}`, lectures && `${lectures} lecture${lectures === 1 ? "" : "s"} with attendance`, mentees && `${mentees} mentee${mentees === 1 ? "" : "s"}`].filter(Boolean);
    return res.status(409).json({ success: false, code: "IN_USE", message: `This faculty member still has ${parts.join(", ")}. Reassign those first, or deactivate the account instead.`, data: { assignments, lectures, mentees } });
  }
  const lbl = label(faculty);
  await Faculty.deleteOne({ _id: faculty._id });
  await User.findByIdAndDelete(faculty.userId?._id || faculty.userId);
  recordAudit({ req, entityType: "FACULTY", entityId: faculty._id, action: "DELETE", entityLabel: lbl });
  invalidatePrefix("adminOverview");
  res.json({ success: true, message: "Faculty permanently deleted" });
});
