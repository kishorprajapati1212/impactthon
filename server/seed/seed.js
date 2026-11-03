/**
 * AttendX - database seeder (a complete, readable demo college)
 *
 *   node seed/seed.js                    → seeds only if the database is empty
 *   FORCE_SEED=true node seed/seed.js    → WIPES every collection, then seeds
 *   SEED_HISTORY=false …                 → accounts + classes only (no lectures,
 *                                          leaves, device logins, notifications, audit)
 *
 * All the data lives in ./data.js. Every password is 123456 and every person
 * logs in as <firstname>@attendx.com:
 *   Admins    admin@  principal@  registrar@  examcell@  …  (10 office accounts)
 *   Teachers  sahil@  jatin@  meet@  priya@  kiran@  …     (12)
 *   Students  nihal@  jeel@  ritik@  darshit@  …            (58, in 11 classes)
 *
 * Every table ends up with at least ten rows, so each admin screen has
 * something real to show. The four named students keep exact numbers:
 * Nihal 100 %, Jeel 100 % (one approved leave), Darshit 67 %, Ritik 58 %.
 */

import dotenv from "dotenv";
dotenv.config();
import { pathToFileURL } from "url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import User from "../models/users/User.js";
import Admin from "../models/users/Admin.js";
import Faculty from "../models/users/Faculty.js";
import Student from "../models/users/Student.js";
import Parent from "../models/users/Parent.js";
import Department from "../models/Academics/Department.js";
import Section from "../models/Academics/Section.js";
import Subject from "../models/Academics/Subject.js";
import FacultySubjectSection from "../models/mapping/FacultySubjectSection.js";
import MentorStudentHistory from "../models/mapping/MentorStudentHistory.js";
import LectureSession from "../models/lecture/LectureSession.js";
import Attendance from "../models/Attendance/Attendance.js";
import LeaveApplication from "../models/leave/LeaveApplication.js";
import StudentSession from "../models/users/StudentSession.js";
import NotificationLog from "../models/users/NotificationLog.js";
import AuditLog from "../models/users/AuditLog.js";
import { applyLeaveToAttendance } from "../utils/leaveService.js";
import { describeAudit } from "../utils/audit.js";
import { generateSessionToken } from "../utils/generateQR.js";
import {
  PASSWORD, ADMINS, ADMIN, DEPARTMENTS, CLASSES, TEACHERS, SUBJECTS, ASSIGNMENTS, STUDENTS, FORMER_MENTORS,
  CE_A_LECTURES, CANCELLED_LECTURE, LIVE_LECTURE, GENERATED_DAYS, LEAVES, DEVICE_LOGINS, PARENTS, markFor,
} from "./data.js";

export * from "./data.js";

// Classroom used for the GPS proof on seeded lectures (Ahmedabad)
const CLASSROOM = { latitude: 23.0225, longitude: 72.5714, radius: 100 };
const NEARBY = { latitude: CLASSROOM.latitude + 0.0001, longitude: CLASSROOM.longitude + 0.0001, accuracy: 8 };

const dayAt = (daysAgo, hour) => { const d = new Date(); d.setDate(d.getDate() - daysAgo); d.setHours(hour, 0, 0, 0); return d; };
const minutesAgo = (m) => new Date(Date.now() - m * 60000);
const sha = (s) => { let h = 0x811c9dc5; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0; return h.toString(16).padStart(8, "0").repeat(8); };

const NAMED_ROLLS = ["CE2024001", "CE2024002", "CE2024003", "CE2024004"]; // Nihal, Jeel, Ritik, Darshit

// ═══════════════════════════════════════════════════════════════════════
/** CLI entry: connects, seeds, prints logins, exits. */
export async function seed() {
  const URI = process.env.MONGODB_URI;
  if (!URI) { console.error("❌ MONGODB_URI not set"); process.exit(1); }
  console.log("\n🌱 AttendX seeder\n");
  await mongoose.connect(URI);
  console.log("✅ Connected to MongoDB");

  const force = ["true", "1", "yes"].includes(String(process.env.FORCE_SEED).toLowerCase());
  const withHistory = !["false", "0", "no"].includes(String(process.env.SEED_HISTORY).toLowerCase());
  const result = await seedDatabase({ force, withHistory });
  if (!result.seeded) {
    console.log(`ℹ️  Database already has data (${result.existingUsers} users). Nothing changed.`);
    console.log("   To wipe everything and load the demo college:  FORCE_SEED=true node seed/seed.js");
  }
  printCredentials();
  await mongoose.disconnect();
  process.exit(0);
}

/**
 * Seed on an ALREADY OPEN mongoose connection. Used by the CLI above and by the
 * API itself when AUTO_SEED=true (then only if the database is empty - the API
 * never wipes data). Returns { seeded, existingUsers }.
 */
export async function seedDatabase({ force = false, withHistory = true } = {}) {
  const existingUsers = await User.countDocuments();
  if (existingUsers > 0 && !force) return { seeded: false, existingUsers };

  // ── Wipe every collection (indexes are kept) ──────────────────────
  console.log(force ? "🧹 FORCE_SEED: deleting ALL existing data…" : "🧹 Empty database: loading demo college…");
  const models = [User, Admin, Faculty, Student, Parent, Department, Section, Subject, FacultySubjectSection, MentorStudentHistory,
    LectureSession, Attendance, LeaveApplication, StudentSession, NotificationLog, AuditLog];
  for (const M of models) await M.deleteMany({});

  const pw = await bcrypt.hash(PASSWORD, 10);
  const year = new Date().getFullYear();

  // ── Admin / office accounts ───────────────────────────────────────
  let adminUser = null;
  for (const a of ADMINS) {
    const user = await User.create({ name: a.name, email: a.email, password: pw, role: "ADMIN" });
    await Admin.create({ userId: user._id, employeeId: a.employeeId, phone: a.phone });
    if (!adminUser) adminUser = user; // admin@attendx.com - the account that "did" the seeded audit entries
  }

  // ── Departments, classes, subjects ────────────────────────────────
  const deptByCode = {};
  for (const d of DEPARTMENTS) deptByCode[d.code] = await Department.create({ name: d.name, code: d.code, description: d.description });

  const classByKey = {};
  for (const c of CLASSES) {
    classByKey[c.key] = await Section.create({
      name: c.name, departmentId: deptByCode[c.dept]._id, semester: c.semester, batchYear: c.batchYear, batchEndYear: c.batchEndYear,
      totalStudents: STUDENTS.filter((s) => s.cls === c.key).length,
    });
  }

  const subjectByCode = {};
  for (const s of SUBJECTS) {
    subjectByCode[s.code] = await Subject.create({ subjectName: s.name, subjectCode: s.code, departmentId: deptByCode[s.dept]._id, credits: s.credits, semester: s.semester });
  }

  // ── Teachers ──────────────────────────────────────────────────────
  const facultyByEmp = {};
  for (const t of TEACHERS) {
    const user = await User.create({ name: t.name, email: t.email, password: pw, role: "FACULTY" });
    facultyByEmp[t.employeeId] = await Faculty.create({
      userId: user._id, employeeId: t.employeeId, departmentId: deptByCode[t.dept]._id, designation: t.designation,
      specialization: t.specialization, phone: t.phone, joiningYear: t.joiningYear,
    });
  }

  // ── Who teaches what ──────────────────────────────────────────────
  const assignments = []; // { ...ASSIGNMENT, doc }
  for (const a of ASSIGNMENTS) {
    const cls = CLASSES.find((c) => c.key === a.cls);
    const doc = await FacultySubjectSection.create({
      facultyId: facultyByEmp[a.teacher]._id, subjectId: subjectByCode[a.subject]._id, sectionId: classByKey[a.cls]._id, academicYear: year, semester: cls.semester,
    });
    assignments.push({ ...a, doc });
  }
  const assignmentFor = (cls, subject) => assignments.find((a) => a.cls === cls && a.subject === subject);

  // ── Students (+ current mentor row, + former-mentor rows) ─────────
  const studentByName = {};
  const studentIndex = {}; // name → position in STUDENTS (drives deterministic attendance)
  STUDENTS.forEach((s, i) => { studentIndex[s.name] = i; });
  for (const s of STUDENTS) {
    const cls = CLASSES.find((c) => c.key === s.cls);
    const user = await User.create({ name: s.name, email: s.email, password: pw, role: "STUDENT" });
    const mentor = facultyByEmp[s.mentor];
    const doc = await Student.create({
      userId: user._id, rollNumber: s.rollNumber, sectionId: classByKey[s.cls]._id, departmentId: deptByCode[cls.dept]._id, mentorId: mentor._id,
      enrollmentYear: cls.batchYear, semester: cls.semester, phone: s.phone, parentPhone: s.parentPhone, isActive: true, lifecycleStatus: "STUDYING",
    });
    const former = FORMER_MENTORS.find((f) => f.student === s.name);
    if (former) {
      await MentorStudentHistory.create({ studentId: doc._id, mentorId: facultyByEmp[former.mentor]._id, assignedBy: adminUser._id, startsAt: new Date(former.from), endsAt: new Date(former.to), endReason: "MENTOR_CHANGED" });
    }
    await MentorStudentHistory.create({ studentId: doc._id, mentorId: mentor._id, assignedBy: adminUser._id, startsAt: former ? new Date(new Date(former.to).getTime() + 86400000) : new Date(cls.batchYear, 6, 1) });
    studentByName[s.name] = doc;
  }
  const classmates = (clsKey) => STUDENTS.filter((s) => s.cls === clsKey);

  // ── Parents (phone alerts go to them) ─────────────────────────────
  const parentByStudent = {};
  for (const p of PARENTS) {
    const child = studentByName[p.student];
    const user = await User.create({ name: p.name, email: p.email, password: pw, role: "STUDENT" }); // User has no PARENT role; parents never log in
    parentByStudent[p.student] = await Parent.create({ userId: user._id, phone: STUDENTS[studentIndex[p.student]].parentPhone, relationship: p.relationship, children: [child._id] });
  }

  const counts = { lectures: 0, marks: 0, leaves: 0, logins: 0, notifications: 0, audit: 0 };
  if (withHistory) {
    // ── Lectures + attendance ───────────────────────────────────────
    const lectures = []; // { doc, cls, subject, start, end } - COMPLETED ones only
    let lectureNo = 0;
    /**
     * Create one lecture and mark every student of the class.
     *  presentRolls  → these rolls are PRESENT, everyone else ABSENT …
     *  onlyRolls     → … but only for these rolls; the rest use the usual generator
     */
    const createLecture = async ({ cls, subject, topic, start, status = "COMPLETED", presentRolls = null, onlyRolls = null, minutes = 50 }) => {
      const a = assignmentFor(cls, subject);
      const end = status === "COMPLETED" ? new Date(start.getTime() + minutes * 60000) : null;
      const doc = await LectureSession.create({
        facultyId: a.doc.facultyId, subjectId: a.doc.subjectId, sectionId: classByKey[cls]._id, topic, status,
        startTime: start, endTime: end, location: { ...CLASSROOM, hasGps: true },
      });
      counts.lectures++;
      const idx = lectureNo++;
      if (status === "CANCELLED") return doc;
      let marked = 0;
      for (const s of classmates(cls)) {
        const explicit = presentRolls && (!onlyRolls || onlyRolls.includes(s.rollNumber));
        const mark = explicit ? (presentRolls.includes(s.rollNumber) ? "PRESENT" : "ABSENT") : markFor(studentIndex[s.name], idx);
        if (status === "ACTIVE" && mark === "ABSENT") continue; // nobody is absent while the lecture is still running
        const present = mark !== "ABSENT";
        await Attendance.create({
          lectureSessionId: doc._id, studentId: studentByName[s.name]._id, status: mark,
          markedAt: present ? new Date(start.getTime() + (mark === "LATE" ? 12 : 3) * 60000) : end, markMethod: present ? "QR" : "AUTO",
          location: present ? NEARBY : undefined,
        });
        counts.marks++;
        if (present) marked++;
      }
      doc.totalMarked = marked;
      await doc.save();
      if (status === "COMPLETED") lectures.push({ doc, cls, subject, start, end });
      return doc;
    };

    // Class CE · A (2024): hand-written lectures - Nihal, Jeel, Ritik, Darshit follow the list, their classmates the generator
    for (const l of CE_A_LECTURES) {
      await createLecture({ cls: "CE-A-2024", subject: l.subject, topic: l.topic, start: dayAt(l.daysAgo, l.hour), presentRolls: l.present, onlyRolls: NAMED_ROLLS });
    }
    // Every other teaching assignment: one lecture per topic over the last three weeks
    for (const a of assignments) {
      if (a.cls === "CE-A-2024") continue;
      const subj = SUBJECTS.find((s) => s.code === a.subject);
      const slot = assignments.filter((x) => x.cls === a.cls).indexOf(a); // different subjects of a class sit in different hours
      const classSlot = CLASSES.findIndex((c) => c.key === a.cls);
      const hour = 9 + ((classSlot + slot * 2) % 7);
      const days = GENERATED_DAYS.slice(0, subj.topics.length);
      for (let i = 0; i < days.length; i++) {
        await createLecture({ cls: a.cls, subject: a.subject, topic: subj.topics[i], start: dayAt(days[i], hour) });
      }
    }
    // One cancelled lecture, one lecture running right now
    await createLecture({ cls: CANCELLED_LECTURE.cls, subject: CANCELLED_LECTURE.subject, topic: CANCELLED_LECTURE.topic, start: dayAt(CANCELLED_LECTURE.daysAgo, CANCELLED_LECTURE.hour), status: "CANCELLED" });
    const liveRolls = classmates(LIVE_LECTURE.cls).slice(0, LIVE_LECTURE.presentCount).map((s) => s.rollNumber);
    const live = await createLecture({ cls: LIVE_LECTURE.cls, subject: LIVE_LECTURE.subject, topic: LIVE_LECTURE.topic, start: minutesAgo(LIVE_LECTURE.minutesAgo), status: "ACTIVE", presentRolls: liveRolls });
    if (process.env.JWT_SECRET) { live.sessionToken = generateSessionToken(live._id); await live.save(); }

    // ── Leave applications (student → mentor) ───────────────────────
    const lecturesOf = (clsKey) => lectures.filter((l) => l.cls === clsKey);
    for (const lv of LEAVES) {
      const stu = studentByName[lv.student];
      const meta = STUDENTS[studentIndex[lv.student]];
      const date = dayAt(lv.daysAgo, 0);
      const decided = lv.status !== "PENDING";
      let lectureIds = [];
      if (lv.type === "LECTURE") {
        const sameDay = lecturesOf(meta.cls).filter((l) => l.start.toDateString() === date.toDateString());
        const pick = sameDay.length ? sameDay : lecturesOf(meta.cls).slice(-1);
        lectureIds = pick.map((l) => l.doc._id);
      }
      const leave = await LeaveApplication.create({
        studentId: stu._id, mentorId: stu.mentorId, sectionId: stu.sectionId, type: lv.type, halfWhich: lv.halfWhich || "FIRST", lectureIds, date, reason: lv.reason, status: lv.status,
        decidedBy: decided ? stu.mentorId : null, mentorRemark: lv.remark || null, decidedAt: decided ? new Date(date.getTime() - 12 * 3600000) : null,
      });
      if (lv.status === "APPROVED") await applyLeaveToAttendance(leave); // ABSENT → LEAVE, same code path the mentor uses
      counts.leaves++;
    }

    // ── Student device logins (what the mentor approves) ────────────
    for (const dl of DEVICE_LOGINS) {
      const stu = studentByName[dl.student];
      const when = minutesAgo(dl.minutesAgo);
      const decided = dl.status !== "PENDING";
      const deviceId = sha(`${dl.student}|${dl.device}|${dl.screen}`);
      await StudentSession.create({
        studentId: stu._id, loginId: `Lseed${String(counts.logins + 1).padStart(3, "0")}${sha(dl.student).slice(0, 8)}`,
        deviceId, fingerprint: deviceId, deviceLabel: dl.device,
        deviceMeta: { platform: dl.platform, browser: dl.browser, hardwareCores: 8, deviceMemory: 4, touchPoints: dl.platform === "Windows" ? null : 5, screen: dl.screen, timezone: "Asia/Kolkata", language: "en-IN" },
        status: dl.status, reason: dl.status === "ACTIVE" ? "KNOWN_DEVICE" : "NEW_DEVICE",
        decidedBy: decided ? stu.mentorId : null, decidedAt: decided ? new Date(when.getTime() + 2 * 60000) : null, remark: dl.remark || null,
        lastSeenAt: dl.status === "ACTIVE" ? minutesAgo(3) : when, createdAt: when, updatedAt: when,
      });
      counts.logins++;
    }

    // ── Parent notifications (one per CE · A lecture result) ────────
    const ceA = lecturesOf("CE-A-2024");
    for (const p of PARENTS) {
      const parent = parentByStudent[p.student];
      const stu = studentByName[p.student];
      const meta = STUDENTS[studentIndex[p.student]];
      const recent = lecturesOf(meta.cls).slice(-2); // their last two lectures
      for (const l of recent) {
        const mark = await Attendance.findOne({ lectureSessionId: l.doc._id, studentId: stu._id }).lean();
        const subj = SUBJECTS.find((s) => s.code === l.subject);
        const type = mark && (mark.status === "PRESENT" || mark.status === "LATE") ? "PRESENT" : "ABSENT";
        await NotificationLog.create({
          parentId: parent._id, studentId: stu._id, lectureId: l.doc._id, type, channel: "SMS",
          status: counts.notifications === 4 ? "FAILED" : "SENT", sentAt: new Date(l.end.getTime() + 5 * 60000),
          message: `${p.student} was ${type === "PRESENT" ? "present" : mark?.status === "LEAVE" ? "on approved leave" : "absent"} in ${subj.name} (${l.start.toLocaleDateString("en-IN")}).`,
          createdAt: new Date(l.end.getTime() + 5 * 60000),
        });
        counts.notifications++;
      }
    }
    if (ceA.length) {
      await NotificationLog.create({
        parentId: parentByStudent.Ritik._id, studentId: studentByName.Ritik._id, lectureId: ceA[ceA.length - 1].doc._id, type: "LOW_ATTENDANCE_WARNING", channel: "BOTH", status: "SENT",
        sentAt: minutesAgo(90), message: "Ritik's attendance is 58 %, below the 75 % requirement. Please meet mentor Jatin.", createdAt: minutesAgo(90),
      });
      counts.notifications++;
    }

    // ── Audit trail (what the admin office did while setting this up) ─
    const audit = async (daysBack, action, entityType, entityId, entityLabel, changes = {}, previousValues = {}) => {
      await AuditLog.create({
        entityType, entityId, entityLabel, changedBy: adminUser._id, action, changes, previousValues,
        summary: describeAudit({ action, entityType, entityLabel, changes }), createdAt: dayAt(daysBack, 10 + (counts.audit % 6)),
      });
      counts.audit++;
    };
    const ce = deptByCode.CE, ceA24 = classByKey["CE-A-2024"], ceB24 = classByKey["CE-B-2024"], ceA25 = classByKey["CE-A-2025"];
    await audit(30, "CREATE", "DEPARTMENT", ce._id, "Computer Engineering (CE)", { name: ce.name, code: ce.code });
    await audit(30, "CREATE", "DEPARTMENT", deptByCode.IT._id, "Information Technology (IT)", { name: "Information Technology", code: "IT" });
    await audit(29, "CREATE", "SECTION", ceA24._id, "CE · A · 2024", { name: "A", semester: 5, batchYear: 2024 });
    await audit(29, "CREATE", "SECTION", ceB24._id, "CE · B · 2024", { name: "B", semester: 5, batchYear: 2024 });
    await audit(28, "CREATE", "SECTION", ceA25._id, "CE · A · 2025", { name: "A", semester: 3, batchYear: 2025 });
    await audit(27, "CREATE", "SUBJECT", subjectByCode.CE501._id, "CE501 · Web Development", { subjectName: "Web Development", subjectCode: "CE501", credits: 4 });
    await audit(26, "CREATE", "FACULTY", facultyByEmp.FAC001._id, "FAC001 · Sahil", { name: "Sahil", designation: "Assistant Professor" });
    await audit(26, "CREATE", "FACULTY", facultyByEmp.FAC003._id, "FAC003 · Meet", { name: "Meet", designation: "Associate Professor" });
    await audit(25, "CREATE", "ASSIGNMENT", assignmentFor("CE-A-2024", "CE501").doc._id, "Sahil → Web Development → CE · A · 2024", { academicYear: year });
    await audit(24, "CREATE", "STUDENT", studentByName.Nihal._id, "CE2024001 · Nihal", { rollNumber: "CE2024001", name: "Nihal" });
    await audit(20, "UPDATE", "STUDENT", studentByName.Ritik._id, "CE2024003 · Ritik", { mentorId: String(facultyByEmp.FAC002._id) }, { mentorId: String(facultyByEmp.FAC001._id) });
    await audit(15, "UPDATE", "STUDENT", studentByName.Yash._id, "CE2024101 · Yash", { mentorId: String(facultyByEmp.FAC003._id) }, { mentorId: String(facultyByEmp.FAC001._id) });
    await audit(9, "UPDATE", "SUBJECT", subjectByCode.CE503._id, "CE503 · Operating Systems", { credits: 3 }, { credits: 4 });
    await audit(4, "UPDATE", "FACULTY", facultyByEmp.FAC002._id, "FAC002 · Jatin", { phone: TEACHERS[1].phone }, { phone: "9800000999" });
  }

  console.log(
    `✅ Seeded: ${ADMINS.length} admins · ${TEACHERS.length} teachers · ${STUDENTS.length} students · ${PARENTS.length} parents · ${DEPARTMENTS.length} departments · ${CLASSES.length} classes · ${SUBJECTS.length} subjects · ${ASSIGNMENTS.length} teaching assignments` +
    (withHistory ? ` · ${counts.lectures} lectures · ${counts.marks} attendance marks · ${counts.leaves} leave applications · ${counts.logins} device logins · ${counts.notifications} parent notifications · ${counts.audit} audit entries` : " · (no history - SEED_HISTORY=false)"),
  );
  return { seeded: true, existingUsers };
}

function printCredentials() {
  const mentorName = (emp) => TEACHERS.find((t) => t.employeeId === emp)?.name;
  console.log("\n──────────── LOGINS (password for everyone: " + PASSWORD + ") ────────────");
  console.log(`  Admin    ${ADMIN.email.padEnd(24)} (+ ${ADMINS.length - 1} office accounts: ${ADMINS.slice(1).map((a) => a.email.split("@")[0] + "@").join(" ")})`);
  for (const t of TEACHERS) console.log(`  Teacher  ${t.email.padEnd(24)} ${t.name.padEnd(8)} ${t.dept}`);
  for (const s of STUDENTS.filter((x) => x.cls === "CE-A-2024")) console.log(`  Student  ${s.email.padEnd(24)} ${s.name.padEnd(8)} CE · A 2024  (${s.rollNumber}, mentor ${mentorName(s.mentor)})`);
  console.log(`  …and ${STUDENTS.length - 8} more students. Every student is <firstname>@attendx.com, e.g. yash@ (CE · B 2024), dev@ (CE · A 2025), ankit@ (IT · A 2024)`);
  console.log("  Student logins need the mentor's (or an admin's) one-tap approval. Open the mentor's account in another tab.");
  console.log("  UI: http://127.0.0.1:5173   API: http://127.0.0.1:3000/health");
  console.log("──────────────────────────────────────────────────────────────────────\n");
}

// Run only when executed directly (tests import the data without touching a database)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed().catch((err) => { console.error("❌ Seed failed:", err.message); process.exit(1); });
}
