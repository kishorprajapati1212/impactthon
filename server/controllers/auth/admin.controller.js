import bcrypt from "bcryptjs";
import User from "../../models/users/User.js";
import Admin from "../../models/users/Admin.js";
import generateToken from "../../utils/generateToken.js";

export const createAdmin = async (req, res, next) => {
  try {
    const { name, email, password, employeeId, phone } = req.body;
    if (await User.findOne({ email })) return res.status(400).json({ success: false, message: "Email already exists" });
    if (await Admin.findOne({ employeeId })) return res.status(400).json({ success: false, message: "Employee ID already exists" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword, role: "ADMIN" });
    const admin = await Admin.create({ userId: user._id, employeeId, phone });
    res.status(201).json({ success: true, message: "Admin created", data: { _id: user._id, name: user.name, email: user.email, role: user.role, employeeId: admin.employeeId, token: generateToken(user._id, user.role) } });
  } catch (e) { next(e); }
};

export const loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password required" });
    const user = await User.findOne({ email, role: "ADMIN" }).select("+password");
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ success: false, message: "Invalid credentials" });
    const admin = await Admin.findOne({ userId: user._id });
    res.json({ success: true, message: "Login successful", data: { _id: user._id, name: user.name, email: user.email, role: user.role, employeeId: admin?.employeeId, token: generateToken(user._id, user.role) } });
  } catch (e) { next(e); }
};
