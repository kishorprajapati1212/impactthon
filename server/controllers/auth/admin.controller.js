import asyncHandler from "../../utils/asyncHandler.js";
import bcrypt from "bcryptjs";
import User from "../../models/users/User.js";
import Admin from "../../models/users/Admin.js";
import generateToken from "../../utils/generateToken.js";
import { validateCreateAdmin } from "../../validators/index.js";

function buildName(body) {
  if (body.name) return body.name.trim();
  const parts = [body.firstName, body.lastName].filter(Boolean);
  return parts.length ? parts.join(" ") : "";
}

export const createAdmin = asyncHandler(async (req, res) => {
  const v = validateCreateAdmin(req.body);
  if (!v.valid) return res.status(400).json({ success: false, message: v.errors.map(e => e.msg).join(". "), errors: v.errors });
  const name = buildName(req.body);
  const { email, password, employeeId, phone } = req.body;
  if (await User.findOne({ email })) return res.status(400).json({ success: false, message: "Email already exists" });
  if (await Admin.findOne({ employeeId })) return res.status(400).json({ success: false, message: "Employee ID already exists" });
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 10), role: "ADMIN" });
  const admin = await Admin.create({ userId: user._id, employeeId, phone });
  res.status(201).json({ success: true, message: "Admin created", data: { _id: user._id, name, email, role: "ADMIN", employeeId: admin.employeeId, token: generateToken(user._id, "ADMIN") } });
});

export const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: "Email and password required" });
  const user = await User.findOne({ email, role: "ADMIN" }).select("+password");
  if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ success: false, message: "Invalid credentials" });
  const admin = await Admin.findOne({ userId: user._id });
  res.json({ success: true, message: "Login successful", data: { _id: user._id, name: user.name, email: user.email, role: user.role, employeeId: admin?.employeeId, token: generateToken(user._id, user.role) } });
});
