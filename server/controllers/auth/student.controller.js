import asyncHandler from "../../utils/asyncHandler.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../../models/users/User.js";
import Student from "../../models/users/Student.js";
import StudentSession from "../../models/users/StudentSession.js";
import Parent from "../../models/users/Parent.js";
import Attendance from "../../models/Attendance/Attendance.js";
import LeaveApplication from "../../models/leave/LeaveApplication.js";
import generateToken from "../../utils/generateToken.js";
import { startMentorship, endMentorship } from "../../utils/mentorshipHistory.js";
import { recordAudit, pickChanged } from "../../utils/audit.js";
import { parsePagination, parseSort, activeFilter, escapeRegex, listEnvelope, refFilter, numFilter } from "../../utils/listQuery.js";
import { recountSections } from "../../utils/sectionCounts.js";
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
const label = (s, user) => `${s.rollNumber} · ${user?.name || s.userId?.name || ""}`.trim();

const STUDENT_POPULATE = [
  { path: "userId", select: "name email isActive" },
  // class carries its department so the UI can always print "CE · A · 2024"
  { path: "sectionId", select: "name semester batchYear batchEndYear departmentId", populate: { path: "departmentId", select: "name code" } },
  { path: "departmentId", select: "name code" },
  { path: "mentorId", select: "employeeId designation", populate: { path: "userId", select: "name email" } },
];

export const createStudent = asyncHandler(async (req, res) => {
  const v = validateCreateStudent({ ...req.body, name: buildName(req.body) });
  if (!v.valid) return res.status(400).json({ success: false, code: "VALIDATION", message: v.errors.map(e => e.msg).join(". "), errors: v.errors });
  const name = buildName(req.body);
  const { email, password, rollNumber, sectionId, departmentId, enrollmentYear, semester, phone, parentPhone, mentorId } = req.body;
  if (await User.findOne({ email })) return res.status(400).json({ success: false, code: "ALREADY_EXISTS", message: "This email is already registered." });
  if (await Student.findOne({ rollNumber: rollNumber.toUpperCase() })) return res.status(400).json({ success: false, code: "ALREADY_EXISTS", message: "This roll number is already in use." });
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 10), role: "STUDENT" });
  const student = await Student.create({ userId: user._id, rollNumber: rollNumber.toUpperCase(), sectionId: sectionId || null, departmentId: departmentId || null, mentorId: mentorId || null, enrollmentYear: enrollmentYear || new Date().getFullYear(), semester: semester || 1, phone: phone || null, parentPhone: parentPhone || null });
  if (student.mentorId) await startMentorship(student, req.user?._id).catch(() => {});
  if (parentPhone) { const ep = await Parent.findOne({ phone: parentPhone }); if (ep && !ep.children.map(c => c.toString()).includes(student._id.toString())) { ep.children.push(student._id); await ep.save(); } }
  await recountSections(student.sectionId);
  recordAudit({ req, entityType: "STUDENT", entityId: student._id, action: "CREATE", entityLabel: label(student, user), changes: { name, email, rollNumber: student.rollNumber, sectionId: student.sectionId, mentorId: student.mentorId, semester: student.semester } });
  invalidatePrefix("adminOverview"); // student/mentor change → overview stale
  res.status(201).json({ success: true, message: "Student created", data: { _id: user._id, studentId: student._id, name, email, role: "STUDENT", rollNumber: student.rollNumber, token: generateToken(user._id, "STUDENT") } });
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

/**
 * GET /students
 *   ?search=      name, email or roll number (case-insensitive)
 *   ?section= ?department= ?semester= ?mentor=   exact filters
 *   ?mentor=none  students without a mentor · ?section=none  students not in any class
 *   ?lifecycle=STUDYING|COMPLETED|LEFT|TRANSFERRED|SUSPENDED
 *   ?showInactive=true  include deactivated / former students
 *   ?sortBy=rollNumber|semester|enrollmentYear|createdAt  ?order=asc|desc
 *   ?page= ?limit=   (default 200 per page, max 500)
 * Response adds total/page/pages next to the old count/data.
 */
export const getAllStudents = asyncHandler(async (req, res) => {
  const { search, section, department, semester, mentor, lifecycle } = req.query;
  const filter = { ...activeFilter(req.query) };
  const sec = refFilter(section), dept = refFilter(department), men = refFilter(mentor), sem = numFilter(semester);
  if (sec !== undefined) filter.sectionId = sec;
  if (dept !== undefined) filter.departmentId = dept;
  if (sem !== undefined) filter.semester = sem;
  if (men !== undefined) filter.mentorId = men;
  if (lifecycle) filter.lifecycleStatus = String(lifecycle).toUpperCase();
  if (search && String(search).trim()) {
    const rx = { $regex: escapeRegex(String(search).trim()), $options: "i" };
    const users = await User.find({ role: "STUDENT", $or: [{ name: rx }, { email: rx }] }).select("_id").lean();
    filter.$or = [{ rollNumber: rx }, { userId: { $in: users.map(u => u._id) } }, { phone: rx }, { parentPhone: rx }];
  }
  const { page, limit, skip } = parsePagination(req.query);
  const sort = parseSort(req.query, ["rollNumber", "semester", "enrollmentYear", "createdAt", "lifecycleStatus"], { field: "rollNumber", order: "asc" });
  const [total, students] = await Promise.all([
    Student.countDocuments(filter),
    Student.find(filter).populate(STUDENT_POPULATE).sort(sort).skip(skip).limit(limit).lean(),
  ]);
  res.json(listEnvelope(students, { total, page, limit }));
});

export const updateStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Student not found" });
  const before = student.toObject();
  const name = buildName(req.body);
  const { email, rollNumber, sectionId, departmentId, enrollmentYear, semester, phone, parentPhone, isActive, mentorId } = req.body;
  const previousMentorId = student.mentorId ? String(student.mentorId) : null;
  if (rollNumber !== undefined && rollNumber !== "") {
    const roll = String(rollNumber).toUpperCase();
    if (roll !== student.rollNumber && await Student.findOne({ rollNumber: roll, _id: { $ne: student._id } })) {
      return res.status(400).json({ success: false, code: "ALREADY_EXISTS", message: "This roll number is already in use." });
    }
    student.rollNumber = roll;
  }
  if (sectionId !== undefined) student.sectionId = sectionId || null;
  if (departmentId !== undefined) student.departmentId = departmentId || null;
  if (mentorId !== undefined) student.mentorId = mentorId || null;
  if (enrollmentYear !== undefined && enrollmentYear !== "") student.enrollmentYear = Number(enrollmentYear);
  if (semester !== undefined && semester !== "") student.semester = Number(semester);
  if (phone !== undefined) student.phone = phone || null;
  if (parentPhone !== undefined) student.parentPhone = parentPhone || null;
  if (isActive !== undefined) student.isActive = Boolean(isActive);
  await student.save();
  // Keep the mentor history table in step with the current mentor pointer.
  const newMentorId = student.mentorId ? String(student.mentorId) : null;
  if (previousMentorId !== newMentorId) {
    if (newMentorId) await startMentorship(student, req.user?._id).catch(() => {});
    else await endMentorship(student._id, "ADMIN_REMOVED").catch(() => {});
  }
  const user = await User.findById(student.userId);
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
  await recountSections(before.sectionId, student.sectionId);
  const { changes, previous } = pickChanged({ ...before, ...userBefore }, { ...student.toObject(), name: user?.name, email: user?.email }, ["name", "email", "rollNumber", "sectionId", "departmentId", "mentorId", "enrollmentYear", "semester", "phone", "parentPhone", "isActive"]);
  const action = changes.isActive === true && before.isActive === false ? "REACTIVATE" : changes.isActive === false && before.isActive === true ? "DEACTIVATE" : "UPDATE";
  recordAudit({ req, entityType: "STUDENT", entityId: student._id, action, entityLabel: label(student, user), changes, previous });
  invalidatePrefix("adminOverview");
  const updated = await Student.findById(student._id).populate(STUDENT_POPULATE);
  res.json({ success: true, message: "Student updated", data: updated });
});

/**
 * POST /student/:id/lifecycle — mark a student Completed / Left / Transferred /
 * Suspended (or back to STUDYING). Nothing is deleted: attendance, leaves and
 * mentor history stay readable, and the mentor keeps the student under
 * "Former mentees". Body: { status, note? }
 */
export const setStudentLifecycle = asyncHandler(async (req, res) => {
  const { status, note } = req.body || {};
  const allowed = ["STUDYING", "COMPLETED", "LEFT", "TRANSFERRED", "SUSPENDED"];
  if (!allowed.includes(status)) return res.status(400).json({ success: false, code: "VALIDATION", message: "Please choose a valid student status." });
  const student = await Student.findById(req.params.id).populate("userId", "name");
  if (!student) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Student not found." });
  const previousStatus = student.lifecycleStatus || "STUDYING";
  student.lifecycleStatus = status;
  if (status === "STUDYING") { student.isActive = true; student.leftAt = null; student.leavingNote = null; }
  else {
    student.isActive = false; student.leftAt = new Date();
    if (note) student.leavingNote = String(note).slice(0, 300);
    const reason = status === "COMPLETED" ? "COURSE_COMPLETED" : status === "TRANSFERRED" ? "TRANSFERRED" : status === "SUSPENDED" ? "SUSPENDED" : "STUDENT_LEFT";
    await endMentorship(student._id, reason).catch(() => {});
    await User.findByIdAndUpdate(student.userId, { isActive: false });
  }
  if (status === "STUDYING") await User.findByIdAndUpdate(student.userId, { isActive: true });
  await student.save();
  await recountSections(student.sectionId);
  recordAudit({ req, entityType: "STUDENT", entityId: student._id, action: status === "STUDYING" ? "REACTIVATE" : "UPDATE", entityLabel: label(student), changes: { lifecycleStatus: status, leavingNote: student.leavingNote || null }, previous: { lifecycleStatus: previousStatus } });
  invalidatePrefix("adminOverview");
  res.json({ success: true, message: status === "STUDYING" ? "Student is studying again." : "Student marked as " + status.toLowerCase() + ". Their records are kept.", data: { id: student._id, lifecycleStatus: student.lifecycleStatus, leftAt: student.leftAt } });
});

export const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id).populate("userId", "name");
  if (!student) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Student not found" });
  student.isActive = false; await student.save();
  await User.findByIdAndUpdate(student.userId, { isActive: false });
  await recountSections(student.sectionId);
  recordAudit({ req, entityType: "STUDENT", entityId: student._id, action: "DEACTIVATE", entityLabel: label(student) });
  invalidatePrefix("adminOverview");
  res.json({ success: true, message: "Student deactivated" });
});

/**
 * Permanent delete is only for records created by mistake. Once a student
 * has attendance or leave history we refuse (409) and point the admin to
 * the Student status action, which keeps every record retrievable.
 */
export const permanentlyDeleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id).populate("userId", "name");
  if (!student) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Student not found" });
  const [attendance, leaves] = await Promise.all([
    Attendance.countDocuments({ studentId: student._id }),
    LeaveApplication.countDocuments({ studentId: student._id }),
  ]);
  if (attendance || leaves) {
    const parts = [attendance && `${attendance} attendance record${attendance === 1 ? "" : "s"}`, leaves && `${leaves} leave application${leaves === 1 ? "" : "s"}`].filter(Boolean);
    return res.status(409).json({ success: false, code: "IN_USE", message: `This student has ${parts.join(" and ")}. Use “Student status” (Left / Completed) instead so the history stays readable.`, data: { attendance, leaves } });
  }
  const lbl = label(student);
  const sectionId = student.sectionId;
  await endMentorship(student._id, "ADMIN_REMOVED").catch(() => {});
  await Student.deleteOne({ _id: student._id });
  await User.findByIdAndDelete(student.userId?._id || student.userId);
  await recountSections(sectionId);
  recordAudit({ req, entityType: "STUDENT", entityId: student._id, action: "DELETE", entityLabel: lbl });
  invalidatePrefix("adminOverview");
  res.json({ success: true, message: "Student permanently deleted" });
});
