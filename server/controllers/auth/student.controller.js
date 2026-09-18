import asyncHandler from "../../utils/asyncHandler.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../../models/users/User.js";
import Student from "../../models/users/Student.js";
import StudentSession from "../../models/users/StudentSession.js";
import Parent from "../../models/users/Parent.js";
import generateToken from "../../utils/generateToken.js";
import { validateCreateStudent } from "../../validators/index.js";
import { invalidatePrefix } from "../../services/cacheService.js";
import {
  deriveDeviceId,
  fallbackDeviceId,
  sanitizeMeta,
} from "../../services/deviceAuthService.js";

function buildName(body) {
  if (body.name) return body.name.trim();
  const parts = [body.firstName, body.lastName].filter(Boolean);
  return parts.length ? parts.join(" ") : "";
}

export const createStudent = asyncHandler(async (req, res) => {
  const v = validateCreateStudent(req.body);
  if (!v.valid) return res.status(400).json({ success: false, message: v.errors.map(e => e.msg).join(". "), errors: v.errors });
  const name = buildName(req.body);
  const { email, password, rollNumber, sectionId, departmentId, enrollmentYear, semester, phone, parentPhone, mentorId } = req.body;
  if (await User.findOne({ email })) return res.status(400).json({ success: false, message: "Email already exists" });
  if (await Student.findOne({ rollNumber: rollNumber.toUpperCase() })) return res.status(400).json({ success: false, message: "Roll number already exists" });
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 10), role: "STUDENT" });
  const student = await Student.create({ userId: user._id, rollNumber: rollNumber.toUpperCase(), sectionId: sectionId || null, departmentId: departmentId || null, mentorId: mentorId || null, enrollmentYear: enrollmentYear || new Date().getFullYear(), semester: semester || 1, phone, parentPhone });
  if (parentPhone) { const ep = await Parent.findOne({ phone: parentPhone }); if (ep && !ep.children.map(c => c.toString()).includes(student._id.toString())) { ep.children.push(student._id); await ep.save(); } }
  invalidatePrefix("adminOverview"); // student/mentor change → overview stale
  res.status(201).json({ success: true, message: "Student created", data: { _id: user._id, name, email, role: "STUDENT", rollNumber: student.rollNumber, token: generateToken(user._id, "STUDENT") } });
});

export const studentLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: "Email and password required" });
  const user = await User.findOne({ email, role: "STUDENT" }).select("+password");
  if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ success: false, message: "Invalid credentials" });
  const student = await Student.findOne({ userId: user._id })
    .populate("sectionId", "name batchYear batchEndYear")
    .populate("departmentId", "name code")
    .populate({ path: "mentorId", select: "employeeId", populate: { path: "userId", select: "name" } });

  // ── Continue a device session where approval is still pending ──────
  // (Student re-opened the page while waiting, or re-logged in with the
  //  remembered loginId so we can reconnect them to the same decision.)
  if (req.body.loginId) {
    const status = await StudentSession.findOne({
      loginId: req.body.loginId,
      studentId: student._id,
    });
    if (status) {
      if (status.status === "ACTIVE" && status.deviceId) {
        res.json({
          success: true,
          message: "Welcome back!",
          data: {
            _id: user._id, name: user.name, email: user.email, role: user.role,
            rollNumber: student.rollNumber, section: student.sectionId,
            department: student.departmentId, semester: student.semester,
            mentor: student.mentorId,
            token: generateToken(user._id, user.role, status.loginId),
          },
        });
        return;
      }
      res.status(403).json({
        success: false,
        code: "AUTH_APPROVAL_PENDING",
        message:
          status.status === "PENDING"
            ? "Your login is still waiting for your mentor's approval."
            : status.status === "REJECTED"
              ? "This login was rejected by your mentor."
              : "You are logged out — login again; your mentor will confirm your device.",
        data: { loginId: status.loginId },
      });
      return;
    }
  }

  // ── EVERY fresh login requires mentor approval (one-time login) ────
  // Per requirement: once a student logs out, the next login must be accepted
  // by the mentor — regardless of whether it is the same device. The device
  // fingerprint is still stored in the table and the accepted session is
  // BOUND to that device, which stops a friend's phone from reusing it.
  const failsafe =
    process.env.STUDENT_LOGIN_AUTO_APPROVE === "true" ||
    process.env.STUDENT_LOGIN_AUTO_APPROVE === "1";
  const trusted = failsafe && !student.mentorId; // only when explicitly enabled AND no mentor

  const clientDeviceId =
    typeof req.body.deviceId === "string" && req.body.deviceId.length >= 16
      ? req.body.deviceId
      : null;
  const deviceId =
    clientDeviceId ||
    deriveDeviceId(req.body.attestation) ||
    fallbackDeviceId(user.email, req.body.meta);
  const loginId = `L${Date.now().toString(36)}${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;

  // Close any still-ACTIVE session for this student before the new decision
  await StudentSession.updateMany(
    { studentId: student._id, status: "ACTIVE" },
    { status: "LOGGED_OUT" }
  );

  await StudentSession.create({
    studentId: student._id,
    loginId,
    deviceId,
    deviceLabel: req.body.meta?.deviceLabel || req.body.meta?.platform || "Student device",
    fingerprint: deviceId,
    deviceMeta: sanitizeMeta(req.body.meta),
    status: trusted ? "ACTIVE" : "PENDING",
    reason: trusted ? "KNOWN_DEVICE" : "NEW_DEVICE",
  });

  if (trusted) {
    return res.json({
      success: true,
      message: "Login successful",
      data: {
        _id: user._id, name: user.name, email: user.email, role: user.role,
        rollNumber: student.rollNumber, section: student.sectionId,
        department: student.departmentId, semester: student.semester,
        mentor: student.mentorId,
        token: generateToken(user._id, user.role, loginId),
      },
    });
  }

  return res.status(202).json({
    success: true,
    code: "AUTH_APPROVAL_PENDING",
    message:
      student.mentorId
        ? "Login sent to your mentor for approval. Wait on this screen — it unlocks as soon as they accept."
        : "Login submitted (you have no mentor assigned yet — an admin can approve it).",
    data: {
      loginId,
      role: user.role,
      rollNumber: student.rollNumber,
      mentor: student.mentorId
        ? { name: student.mentorId.userId?.name, employeeId: student.mentorId.employeeId }
        : null,
    },
  });
});

/**
 * POST /student/logout — drop the trust for this loginId.
 * After this, the NEXT login must be re-approved by the mentor.
 * (Optional body: { loginId } — read from token if absent.)
 */
export const studentLogout = asyncHandler(async (req, res) => {
  let loginId = req.body?.loginId;
  if (!loginId) {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    if (token) {
      const { default: jwt } = await import("jsonwebtoken");
      try { loginId = jwt.verify(token, process.env.JWT_SECRET).loginId; } catch { /* ignore */ }
    }
  }
  if (loginId) {
    await StudentSession.updateOne(
      { loginId },
      { status: "LOGGED_OUT" }
    );
  }
  res.json({
    success: true,
    message:
      "Logged out. Your next login on this device must be approved by your mentor.",
  });
});

/**
 * POST /student/approval/status
 * Student polls this after submitting a login that is awaiting mentor approval.
 * Body: { loginId }. Returns { approved, rejected, pending, token, data }.
 */
export const studentApprovalStatus = asyncHandler(async (req, res) => {
  const { loginId } = req.body || {};
  if (!loginId) return res.status(400).json({ success: false, message: "loginId required" });

  const session = await StudentSession.findOne({ loginId });
  if (!session) {
    return res.json({ success: true, approved: false, rejected: false, pending: false, message: "Session not found" });
  }

  if (session.status === "ACTIVE") {
    const user = await User.findById((await Student.findById(session.studentId))?.userId);
    const student = await Student.findById(session.studentId)
      .populate("sectionId", "name batchYear batchEndYear")
      .populate("departmentId", "name code")
      .populate({ path: "mentorId", select: "employeeId", populate: { path: "userId", select: "name" } });
    return res.json({
      success: true,
      approved: true,
      rejected: false,
      pending: false,
      data: {
        _id: user?._id, name: user?.name, email: user?.email, role: user?.role,
        rollNumber: student?.rollNumber, section: student?.sectionId,
        department: student?.departmentId, semester: student?.semester,
        mentor: student?.mentorId,
        token: generateToken(user?._id, "STUDENT", loginId),
      },
    });
  }
  if (session.status === "REJECTED") {
    return res.json({ success: true, approved: false, rejected: true, pending: false, message: "Your mentor rejected this login." });
  }
  return res.json({ success: true, approved: false, rejected: false, pending: true, message: "Waiting for mentor approval…" });
});

export const getAllStudents = asyncHandler(async (req, res) => {
  const { search, section, department, sortBy = "rollNumber", order = "asc", showInactive = "false" } = req.query;
  const filter = {};
  if (showInactive !== "true") filter.isActive = true;
  if (section) filter.sectionId = section;
  if (department) filter.departmentId = department;
  if (search) filter.rollNumber = { $regex: search, $options: "i" };
  const dir = order === "desc" ? -1 : 1;
  const students = await Student.find(filter).populate("userId", "name email isActive").populate("sectionId", "name batchYear batchEndYear").populate("departmentId", "name code").populate({ path: "mentorId", select: "employeeId", populate: { path: "userId", select: "name" } }).sort({ [sortBy]: dir }).skip(0).limit(200);
  res.json({ success: true, count: students.length, data: students });
});

export const updateStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ success: false, message: "Student not found" });
  const name = buildName(req.body);
  const { email, rollNumber, sectionId, departmentId, enrollmentYear, semester, phone, parentPhone, isActive, mentorId } = req.body;
  if (rollNumber !== undefined) student.rollNumber = rollNumber.toUpperCase();
  if (sectionId !== undefined) student.sectionId = sectionId;
  if (departmentId !== undefined) student.departmentId = departmentId;
  if (mentorId !== undefined) student.mentorId = mentorId || null;
  if (enrollmentYear !== undefined) student.enrollmentYear = enrollmentYear;
  if (semester !== undefined) student.semester = semester;
  if (phone !== undefined) student.phone = phone;
  if (parentPhone !== undefined) student.parentPhone = parentPhone;
  if (isActive !== undefined) student.isActive = isActive;
  await student.save();
  if (name || email) { const user = await User.findById(student.userId); if (user) { if (name) user.name = name; if (email) user.email = email; await user.save(); } }
  invalidatePrefix("adminOverview");
  const updated = await Student.findById(student._id).populate("userId", "name email").populate("sectionId", "name batchYear batchEndYear").populate("departmentId", "name code").populate({ path: "mentorId", select: "employeeId", populate: { path: "userId", select: "name" } });
  res.json({ success: true, message: "Student updated", data: updated });
});

export const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ success: false, message: "Student not found" });
  student.isActive = false; await student.save();
  await User.findByIdAndUpdate(student.userId, { isActive: false });
  res.json({ success: true, message: "Student deactivated" });
});

export const permanentlyDeleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findByIdAndDelete(req.params.id);
  if (!student) return res.status(404).json({ success: false, message: "Student not found" });
  await User.findByIdAndDelete(student.userId);
  res.json({ success: true, message: "Student permanently deleted" });
});

// Track changes
async function logAudit(entityType, entityId, changedBy, action, changes, prev) {
  try {
    const { default: AuditLog } = await import("../../models/users/AuditLog.js");
    await AuditLog.create({ entityType, entityId, changedBy, action, changes, previousValues: prev });
  } catch {}
}

// Override update with audit logging
const originalUpdate = updateStudent;
// We need a different approach - wrap at route level
