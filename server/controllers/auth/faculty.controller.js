import bcrypt from "bcryptjs";
import User from "../../models/users/User.js";
import Faculty from "../../models/users/Faculty.js";
import generateToken from "../../utils/generateToken.js";

export const createFaculty = async (req, res, next) => {
  try {
    const { name, email, password, employeeId, departmentId, designation, phone, specialization } = req.body;
    if (await User.findOne({ email })) return res.status(400).json({ success: false, message: "Email already exists" });
    if (await Faculty.findOne({ employeeId })) return res.status(400).json({ success: false, message: "Employee ID already exists" });
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 10), role: "FACULTY" });
    const faculty = await Faculty.create({ userId: user._id, employeeId, departmentId, designation: designation || "Assistant Professor", phone, specialization });
    res.status(201).json({ success: true, message: "Faculty created", data: { _id: user._id, name: user.name, email: user.email, role: user.role, employeeId: faculty.employeeId, token: generateToken(user._id, user.role) } });
  } catch (e) { next(e); }
};

export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password required" });
    const user = await User.findOne({ email, role: "FACULTY" }).select("+password");
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ success: false, message: "Invalid credentials" });
    const faculty = await Faculty.findOne({ userId: user._id }).populate("departmentId", "name code");
    res.json({ success: true, message: "Login successful", data: { _id: user._id, name: user.name, email: user.email, role: user.role, employeeId: faculty?.employeeId, department: faculty?.departmentId, token: generateToken(user._id, user.role) } });
  } catch (e) { next(e); }
};

export const getAllFaculty = async (req, res, next) => {
  try {
    const faculty = await Faculty.find().populate("userId", "name email isActive").populate("departmentId", "name code");
    res.json({ success: true, count: faculty.length, data: faculty });
  } catch (e) { next(e); }
};

export const getFacultyProfile = async (req, res, next) => {
  try {
    const faculty = await Faculty.findOne({ userId: req.user._id }).populate("userId", "name email").populate("departmentId", "name code");
    if (!faculty) return res.status(404).json({ success: false, message: "Faculty profile not found" });
    res.json({ success: true, data: faculty });
  } catch (e) { next(e); }
};
