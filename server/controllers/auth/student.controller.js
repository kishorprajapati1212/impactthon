import bcrypt from "bcryptjs";
import User from "../../models/users/User.js";
import Student from "../../models/users/Student.js";
import generateToken from "../../utils/generateToken.js";

export const createStudent = async (req, res, next) => {
  try {
    const { name, email, password, rollNumber, sectionId, departmentId, enrollmentYear, semester, phone, parentPhone } = req.body;

    console.log(req.body)

    if (await User.findOne({ email })) return res.status(400).json({ success: false, message: "Email already exists" });
    if (await Student.findOne({ rollNumber: rollNumber?.toUpperCase() })) return res.status(400).json({ success: false, message: "Roll number already exists" });
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 10), role: "STUDENT" });
    const student = await Student.create({ userId: user._id, rollNumber: rollNumber.toUpperCase(), sectionId: sectionId || null, departmentId: departmentId || null, enrollmentYear: enrollmentYear || new Date().getFullYear(), semester: semester || 1, phone, parentPhone });
    res.status(201).json({ success: true, message: "Student created", data: { _id: user._id, name: user.name, email: user.email, role: user.role, rollNumber: student.rollNumber, token: generateToken(user._id, user.role) } });
  } catch (e) { next(e); }
};

export const studentLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password required" });
    const user = await User.findOne({ email, role: "STUDENT" }).select("+password");
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ success: false, message: "Invalid credentials" });
    const student = await Student.findOne({ userId: user._id }).populate("sectionId", "name").populate("departmentId", "name code");
    res.json({ success: true, message: "Login successful", data: { _id: user._id, name: user.name, email: user.email, role: user.role, rollNumber: student?.rollNumber, section: student?.sectionId, department: student?.departmentId, semester: student?.semester, token: generateToken(user._id, user.role) } });
  } catch (e) { next(e); }
};

export const getAllStudents = async (req, res, next) => {
  try {
    const students = await Student.find().populate("userId", "name email isActive").populate("sectionId", "name").populate("departmentId", "name code");
    res.json({ success: true, count: students.length, data: students });
  } catch (e) { next(e); }
};
