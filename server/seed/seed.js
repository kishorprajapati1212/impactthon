/**
 * AttendX — Full Database Seeder
 * Usage: cd server && node seed/seed.js
 *
 * Creates complete demo data for ALL entities.
 * All passwords: pass123
 */

import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import User from "../models/users/User.js";
import Admin from "../models/users/Admin.js";
import Faculty from "../models/users/Faculty.js";
import Student from "../models/users/Student.js";
import Parent from "../models/users/Parent.js";
import Department from "../models/Academics/Department.js";
import Section from "../models/Academics/Section.js";
import Subject from "../models/Academics/Subject.js";
import FacultySubjectSection from "../models/mapping/FacultySubjectSection.js";
import LectureSession from "../models/lecture/LectureSession.js";
import Attendance from "../models/Attendance/Attendance.js";
import LeaveApplication from "../models/leave/LeaveApplication.js";
import StudentSession from "../models/users/StudentSession.js";
import NotificationLog from "../models/users/NotificationLog.js";
import AuditLog from "../models/users/AuditLog.js";
import { applyLeaveToAttendance } from "../utils/leaveService.js";

const URI = process.env.MONGODB_URI;
const SECRET = process.env.JWT_SECRET || "attendx_dev_32_chars!!";
if (!URI) { console.error("❌ MONGODB_URI not set"); process.exit(1); }

const hash = (pw) => bcrypt.hash(pw, 10);
const hmacToken = (id) => crypto.createHmac("sha256", SECRET).update(String(id)).digest("hex");
const PW = "pass123";

// ── DATA ─────────────────────────────────────────────────────────────
const DEPS = [
  { name: "Computer Science & Engineering", code: "CSE" },
  { name: "Information Technology", code: "IT" },
  { name: "Electronics & Communication", code: "ECE" },
  { name: "Mechanical Engineering", code: "ME" },
  { name: "Civil Engineering", code: "CE" },
  { name: "Master of Computer Applications", code: "MCA" },
];

const SECS = [
  { name: "A", dept: "CSE", sem: 1, year: 2026, endYear: 2030 },
  { name: "B", dept: "CSE", sem: 1, year: 2026, endYear: 2030 },
  { name: "A", dept: "CSE", sem: 3, year: 2025, endYear: 2029 },
  { name: "A", dept: "IT",  sem: 1, year: 2026, endYear: 2030 },
  { name: "A", dept: "ECE", sem: 3, year: 2025, endYear: 2029 },
  { name: "B", dept: "ECE", sem: 3, year: 2025, endYear: 2029 },
  { name: "A", dept: "ME",  sem: 5, year: 2024, endYear: 2028 },
  { name: "A", dept: "MCA", sem: 1, year: 2026, endYear: 2028 },
];

const SUBS = [
  { name: "Data Structures & Algorithms", code: "CS201", dept: "CSE", cr: 4, sem: 1 },
  { name: "Database Management Systems", code: "CS301", dept: "CSE", cr: 3, sem: 1 },
  { name: "Operating Systems", code: "CS401", dept: "CSE", cr: 4, sem: 3 },
  { name: "Computer Networks", code: "CS501", dept: "CSE", cr: 3, sem: 3 },
  { name: "Software Engineering", code: "CS601", dept: "CSE", cr: 3, sem: 5 },
  { name: "Web Technology", code: "IT201", dept: "IT", cr: 3, sem: 1 },
  { name: "Cloud Computing", code: "IT301", dept: "IT", cr: 3, sem: 3 },
  { name: "Digital Electronics", code: "EC201", dept: "ECE", cr: 3, sem: 3 },
  { name: "Signals & Systems", code: "EC301", dept: "ECE", cr: 4, sem: 3 },
  { name: "Thermodynamics", code: "ME301", dept: "ME", cr: 4, sem: 5 },
  { name: "Python Programming", code: "CA101", dept: "MCA", cr: 3, sem: 1 },
  { name: "Discrete Mathematics", code: "CA201", dept: "MCA", cr: 3, sem: 1 },
];

// Faculty: firstName, lastName, email, empId, dept, designation
const FACS = [
  { fn: "Rajesh", ln: "Kumar", email: "rajesh.k@attendx.com", emp: "FAC001", dept: "CSE", desig: "Professor", spec: "Algorithms" },
  { fn: "Priya", ln: "Sharma", email: "priya.s@attendx.com", emp: "FAC002", dept: "CSE", desig: "Associate Professor", spec: "Databases" },
  { fn: "Amit", ln: "Patel", email: "amit.p@attendx.com", emp: "FAC003", dept: "IT", desig: "Assistant Professor", spec: "Web Dev" },
  { fn: "Sneha", ln: "Mehta", email: "sneha.m@attendx.com", emp: "FAC004", dept: "ECE", desig: "Professor", spec: "Signals" },
  { fn: "Vikram", ln: "Singh", email: "vikram.s@attendx.com", emp: "FAC005", dept: "ME", desig: "Associate Professor", spec: "Thermal" },
  { fn: "Anjali", ln: "Desai", email: "anjali.d@attendx.com", emp: "FAC006", dept: "MCA", desig: "Professor", spec: "Programming" },
];

// Students: firstName, lastName, roll, secIdx, dept
const STUS = [
  // CSE A Sem 1 2026 — 12 students (realistic class)
  { fn: "Rahul", ln: "Verma", roll: "CSE2024001", sec: 0 },
  { fn: "Ananya", ln: "Gupta", roll: "CSE2024002", sec: 0 },
  { fn: "Siddharth", ln: "Joshi", roll: "CSE2024003", sec: 0 },
  { fn: "Kavya", ln: "Reddy", roll: "CSE2024004", sec: 0 },
  { fn: "Ishaan", ln: "Malhotra", roll: "CSE2024005", sec: 0 },
  { fn: "Diya", ln: "Kapoor", roll: "CSE2024006", sec: 0 },
  { fn: "Aryan", ln: "Bhatt", roll: "CSE2024007", sec: 0 },
  { fn: "Myra", ln: "Singh", roll: "CSE2024008", sec: 0 },
  { fn: "Vivaan", ln: "Chopra", roll: "CSE2024009", sec: 0 },
  { fn: "Anika", ln: "Jain", roll: "CSE2024010", sec: 0 },
  { fn: "Kabir", ln: "Mehta", roll: "CSE2024011", sec: 0 },
  { fn: "Sara", ln: "Khan", roll: "CSE2024012", sec: 0 },
  // CSE B Sem 1
  { fn: "Arjun", ln: "Nair", roll: "CSE2024101", sec: 1 },
  { fn: "Divya", ln: "Patel", roll: "CSE2024102", sec: 1 },
  { fn: "Rohan", ln: "Desai", roll: "CSE2024103", sec: 1 },
  { fn: "Tanvi", ln: "Shah", roll: "CSE2024104", sec: 1 },
  { fn: "Yash", ln: "Pandya", roll: "CSE2024105", sec: 1 },
  { fn: "Nisha", ln: "Trivedi", roll: "CSE2024106", sec: 1 },
  // CSE A Sem 3
  { fn: "Neha", ln: "Sharma", roll: "CSE2023001", sec: 2 },
  { fn: "Karan", ln: "Thakkar", roll: "CSE2023002", sec: 2 },
  { fn: "Meera", ln: "Iyer", roll: "CSE2023003", sec: 2 },
  { fn: "Harsh", ln: "Gohil", roll: "CSE2023004", sec: 2 },
  { fn: "Pooja", ln: "Rana", roll: "CSE2023005", sec: 2 },
  { fn: "Dev", ln: "Solanki", roll: "CSE2023006", sec: 2 },
  // IT A
  { fn: "Vikram", ln: "Rathore", roll: "IT2024001", sec: 3 },
  { fn: "Pooja", ln: "Meena", roll: "IT2024002", sec: 3 },
  { fn: "Amit", ln: "Shah", roll: "IT2024003", sec: 3 },
  { fn: "Rhea", ln: "Bose", roll: "IT2024004", sec: 3 },
  { fn: "Kunal", ln: "Das", roll: "IT2024005", sec: 3 },
  // ECE A
  { fn: "Shweta", ln: "Iyer", roll: "ECE2023001", sec: 4 },
  { fn: "Manish", ln: "Tiwari", roll: "ECE2023002", sec: 4 },
  { fn: "Deepak", ln: "Saxena", roll: "ECE2023003", sec: 4 },
  { fn: "Asha", ln: "Nair", roll: "ECE2023004", sec: 4 },
  // ECE B
  { fn: "Ritu", ln: "Agarwal", roll: "ECE2023101", sec: 5 },
  { fn: "Sameer", ln: "Khan", roll: "ECE2023102", sec: 5 },
  { fn: "Zara", ln: "Ali", roll: "ECE2023103", sec: 5 },
  // ME
  { fn: "Rajat", ln: "Malhotra", roll: "ME2022001", sec: 6 },
  { fn: "Sunil", ln: "Yadav", roll: "ME2022002", sec: 6 },
  { fn: "Om", ln: "Patil", roll: "ME2022003", sec: 6 },
  // MCA
  { fn: "Ritik", ln: "Aed", roll: "MCA2024001", sec: 7 },
  { fn: "Biren", ln: "Bairwa", roll: "MCA2024002", sec: 7 },
  { fn: "Kishor", ln: "Prajapati", roll: "MCA2024003", sec: 7 },
  { fn: "Chandresh", ln: "Patel", roll: "MCA2024004", sec: 7 },
  { fn: "Sejal", ln: "Haveliwala", roll: "MCA2024005", sec: 7 },
  { fn: "Het", ln: "Shah", roll: "MCA2024006", sec: 7 },
];


// Sample leave applications: roll, type, daysAgo (from today), which, reason, status
// Mentor for each student is derived from MENTORS by section index.
const LEAVES = [
  { roll: "CSE2024003", type: "FULL",    da: 4,  reason: "Fever — advised rest by doctor", status: "APPROVED", remark: "Get well soon" },
  { roll: "CSE2024007", type: "HALF",    da: 4,  which: "FIRST", reason: "Dental appointment", status: "APPROVED", remark: "" },
  { roll: "CSE2024005", type: "LECTURE", da: 2,  reason: "Family function", status: "APPROVED", remark: "Okay for one lecture" },
  { roll: "CSE2024009", type: "FULL",    da: 1,  reason: "Outstation — attending a wedding", status: "PENDING", remark: "" },
  { roll: "IT2024002",  type: "HALF",    da: 3,  which: "FIRST", reason: "University sports trials", status: "APPROVED", remark: "" },
  { roll: "MCA2024003", type: "FULL",    da: 5,  reason: "Sick — viral infection", status: "PENDING", remark: "" },
];

// Parents: firstName, lastName, phone, rel, childRolls
const PARS = [
  { fn: "Suresh", ln: "Verma", phone: "9990000001", rel: "FATHER", kids: ["CSE2024001"] },
  { fn: "Sunita", ln: "Gupta", phone: "9990000002", rel: "MOTHER", kids: ["CSE2024002"] },
  { fn: "Mahesh", ln: "Joshi", phone: "9990000003", rel: "FATHER", kids: ["CSE2024003"] },
  { fn: "Lakshmi", ln: "Reddy", phone: "9990000004", rel: "MOTHER", kids: ["CSE2024004"] },
  { fn: "Gopalan", ln: "Nair", phone: "9990000005", rel: "FATHER", kids: ["CSE2024101"] },
  { fn: "Hasmukh", ln: "Patel", phone: "9990000006", rel: "FATHER", kids: ["CSE2024102","CSE2024103"] },
  { fn: "Ramesh", ln: "Sharma", phone: "9990000007", rel: "FATHER", kids: ["CSE2023001"] },
  { fn: "Rekha", ln: "Thakkar", phone: "9990000008", rel: "MOTHER", kids: ["CSE2023002"] },
  { fn: "Devendra", ln: "Rathore", phone: "9990000009", rel: "FATHER", kids: ["IT2024001"] },
  { fn: "Meera", ln: "Meena", phone: "9990000010", rel: "MOTHER", kids: ["IT2024002"] },
  { fn: "RK", ln: "Prajapati", phone: "9990000011", rel: "FATHER", kids: ["MCA2024003"] },
  { fn: "Arvind", ln: "Tiwari", phone: "9990000012", rel: "FATHER", kids: ["ECE2023002","ECE2023101"] },
];

// Mentors: which faculty mentors which section (secIdx -> emp)
// Covered by batch-wise grouping in the admin overview
const MENTORS = {
  0: "FAC001", // CSE-A Sem1 2026 → Rajesh Kumar
  1: "FAC002", // CSE-B Sem1 2026 → Priya Sharma
  2: "FAC001", // CSE-A Sem3 2025 → Rajesh Kumar
  3: "FAC003", // IT-A  Sem1 2026 → Amit Patel
  4: "FAC004", // ECE-A Sem3 2025 → Sneha Mehta
  5: "FAC004", // ECE-B Sem3 2025 → Sneha Mehta
  6: "FAC005", // ME-A  Sem5 2024 → Vikram Singh
  7: "FAC006", // MCA-A Sem1 2026 → Anjali Desai
};

// Assignments: emp, subj, sec-dept, sec-name, sem, year
const ASGN = [
  { emp: "FAC001", sub: "CS201", sd: "CSE", sn: "A", sem: 1, yr: 2026 },
  { emp: "FAC001", sub: "CS401", sd: "CSE", sn: "A", sem: 3, yr: 2025 },
  { emp: "FAC002", sub: "CS301", sd: "CSE", sn: "A", sem: 1, yr: 2026 },
  { emp: "FAC002", sub: "CS301", sd: "CSE", sn: "B", sem: 1, yr: 2026 },
  { emp: "FAC002", sub: "CS501", sd: "CSE", sn: "A", sem: 3, yr: 2025 },
  { emp: "FAC003", sub: "IT201", sd: "IT",  sn: "A", sem: 1, yr: 2026 },
  { emp: "FAC003", sub: "IT301", sd: "IT",  sn: "A", sem: 1, yr: 2026 },
  { emp: "FAC004", sub: "EC201", sd: "ECE", sn: "A", sem: 3, yr: 2025 },
  { emp: "FAC004", sub: "EC201", sd: "ECE", sn: "B", sem: 3, yr: 2025 },
  { emp: "FAC004", sub: "EC301", sd: "ECE", sn: "A", sem: 3, yr: 2025 },
  { emp: "FAC005", sub: "ME301", sd: "ME",  sn: "A", sem: 5, yr: 2024 },
  { emp: "FAC006", sub: "CA101", sd: "MCA", sn: "A", sem: 1, yr: 2026 },
];

// Lectures: assignIdx, topic, daysAgo, presentCount
const LECS = [
  // FAC001 CS201 CSE-A-1-2026 — varied present counts out of 12
  { ai: 0, topic: "Arrays & Linked Lists", da: 28, pc: 10 },
  { ai: 0, topic: "Stacks and Queues", da: 25, pc: 11 },
  { ai: 0, topic: "Binary Trees", da: 21, pc: 9 },
  { ai: 0, topic: "Hash Tables", da: 18, pc: 12 },
  { ai: 0, topic: "Graphs — BFS & DFS", da: 14, pc: 8 },
  { ai: 0, topic: "Heaps & Priority Queues", da: 11, pc: 10 },
  { ai: 0, topic: "Sorting — Quick & Merge", da: 7, pc: 11 },
  { ai: 0, topic: "Dynamic Programming Intro", da: 4, pc: 7 },
  { ai: 0, topic: "Greedy Algorithms", da: 2, pc: 9 },
  { ai: 0, topic: "Revision — Mock Test", da: 1, pc: 10 },
  // FAC001 CS401 CSE-A-3-2025
  { ai: 1, topic: "Process Scheduling", da: 20, pc: 5 },
  { ai: 1, topic: "Memory Paging", da: 15, pc: 4 },
  { ai: 1, topic: "Virtual Memory", da: 10, pc: 6 },
  { ai: 1, topic: "File Systems", da: 6, pc: 5 },
  { ai: 1, topic: "Deadlocks", da: 3, pc: 3 },
  // FAC002 CS301 A
  { ai: 2, topic: "ER Diagrams", da: 16, pc: 9 },
  { ai: 2, topic: "SQL Joins", da: 12, pc: 10 },
  { ai: 2, topic: "Normalization", da: 8, pc: 8 },
  { ai: 2, topic: "Transactions & ACID", da: 5, pc: 11 },
  { ai: 2, topic: "Indexing & B-Trees", da: 2, pc: 9 },
  // FAC002 CS301 B
  { ai: 3, topic: "DBMS Intro", da: 14, pc: 4 },
  { ai: 3, topic: "Relational Algebra", da: 9, pc: 5 },
  { ai: 3, topic: "SQL Basics", da: 4, pc: 6 },
  // FAC002 CS501
  { ai: 4, topic: "OSI Model", da: 11, pc: 5 },
  { ai: 4, topic: "TCP/IP Stack", da: 6, pc: 4 },
  // FAC003 IT201
  { ai: 5, topic: "HTML5 Semantic", da: 13, pc: 4 },
  { ai: 5, topic: "CSS Flexbox & Grid", da: 8, pc: 5 },
  { ai: 5, topic: "JavaScript DOM", da: 3, pc: 3 },
  { ai: 5, topic: "React Basics", da: 1, pc: 4 },
  // FAC004 EC201 A
  { ai: 7, topic: "Boolean Algebra", da: 12, pc: 3 },
  { ai: 7, topic: "Combinational Circuits", da: 7, pc: 4 },
  { ai: 7, topic: "Sequential Logic", da: 2, pc: 2 },
  // FAC006 CA101
  { ai: 11, topic: "Python Basics", da: 10, pc: 5 },
  { ai: 11, topic: "Functions & Modules", da: 5, pc: 4 },
  { ai: 11, topic: "OOP in Python", da: 2, pc: 6 },
];


// ═══════════════════════════════════════════════════════════════════════
async function seed() {
  console.log("\n🌱 AttendX Seeder\n");
  await mongoose.connect(URI);
  console.log("✅ Connected to MongoDB\n");

  const force = process.env.FORCE_SEED === "true" || process.env.FORCE_SEED === "1";
  const existingUsers = await User.countDocuments();
  if (existingUsers > 0 && !force) {
    console.log("ℹ️  Database already has data (" + existingUsers + " users).");
    console.log("   Skipping seed to protect existing Mongo data.");
    console.log("   To wipe + reseed: FORCE_SEED=true node seed/seed.js");
    console.log("");
    console.log("── Credentials (if previously seeded) ──");
    console.log("   password for all demo accounts: pass123");
    console.log("   admin@attendx.com | rajesh.k@attendx.com | cse2024001@attendx.com");
    console.log("");
    await mongoose.disconnect();
    process.exit(0);
  }

  // ── Clear (only when empty or FORCE_SEED) ───────────────────────────
  console.log(force ? "🧹 FORCE_SEED — clearing all collections..." : "🧹 Empty DB — seeding fresh...");
  const models = [User,Admin,Faculty,Student,Parent,Department,Section,Subject,FacultySubjectSection,LectureSession,Attendance,LeaveApplication,StudentSession,NotificationLog,AuditLog];
  for (const M of models) await M.deleteMany({});
  console.log("✅ Cleared\n");

  // ── Admins ──────────────────────────────────────────────────────────
  console.log("👤 Admins...");
  const pw = await hash(PW);
  const a1 = await User.create({ name: "System Admin", email: "admin@attendx.com", password: pw, role: "ADMIN" });
  const a2 = await User.create({ name: "Super Admin", email: "super@attendx.com", password: pw, role: "ADMIN" });
  await Admin.create({ userId: a1._id, employeeId: "ADM001" });
  await Admin.create({ userId: a2._id, employeeId: "ADM002" });
  console.log("   admin@attendx.com / pass123");
  console.log("   super@attendx.com / pass123\n");

  // ── Departments ─────────────────────────────────────────────────────
  const deptMap = {};
  for (const d of DEPS) { const doc = await Department.create(d); deptMap[d.code] = doc; }
  console.log(`   ${DEPS.length} departments\n`);

  // ── Sections ────────────────────────────────────────────────────────
  const secMap = {};
  for (const s of SECS) {
    const doc = await Section.create({ name: s.name, departmentId: deptMap[s.dept]._id, semester: s.sem, batchYear: s.year, batchEndYear: s.endYear });
    secMap[`${s.dept}-${s.name}-${s.sem}-${s.year}`] = doc;
  }
  console.log(`   ${SECS.length} sections\n`);

  function findSec(dept, name, sem, yr) { return secMap[`${dept}-${name}-${sem}-${yr}`]; }

  // ── Subjects ────────────────────────────────────────────────────────
  const subMap = {};
  for (const s of SUBS) { const doc = await Subject.create({ subjectName: s.name, subjectCode: s.code, departmentId: deptMap[s.dept]._id, credits: s.cr, semester: s.sem }); subMap[s.code] = doc; }
  console.log(`   ${SUBS.length} subjects\n`);

  // ── Faculty ─────────────────────────────────────────────────────────
  const facMap = {};
  for (const f of FACS) {
    const name = `${f.fn} ${f.ln}`;
    const user = await User.create({ name, email: f.email, password: pw, role: "FACULTY" });
    const doc = await Faculty.create({ userId: user._id, employeeId: f.emp, departmentId: deptMap[f.dept]._id, designation: f.desig, specialization: f.spec });
    facMap[f.emp] = doc;
  }
  console.log(`   ${FACS.length} faculty\n`);

  // ── Students (with mentor assignment) ───────────────────────────────
  const stuDocs = [];
  const mentorBySecIdx = (idx) => (MENTORS[idx] ? facMap[MENTORS[idx]]?._id || null : null);
  for (const s of STUS) {
    const name = `${s.fn} ${s.ln}`;
    const email = `${s.roll.toLowerCase()}@attendx.com`;
    const user = await User.create({ name, email, password: pw, role: "STUDENT" });
    const sec = SECS[s.sec];
    if (!sec) { console.warn("bad sec idx", s.roll); continue; }
    const secDoc = findSec(sec.dept, sec.name, sec.sem, sec.year);
    const doc = await Student.create({
      userId: user._id,
      rollNumber: s.roll,
      sectionId: secDoc?._id || null,
      departmentId: deptMap[sec.dept]?._id || null,
      mentorId: mentorBySecIdx(s.sec),
      enrollmentYear: sec.year,
      semester: sec.sem,
      isActive: true,
    });
    stuDocs.push(doc);
  }
  // Keep Section.totalStudents accurate (used across the admin UI)
  for (const key of Object.keys(secMap)) {
    const secDoc = secMap[key];
    const n = stuDocs.filter((s) => s.sectionId && s.sectionId.toString() === secDoc._id.toString()).length;
    await Section.findByIdAndUpdate(secDoc._id, { totalStudents: n });
  }
  console.log(`   ${STUS.length} students (mentors assigned batch-wise)\n`);

  // ── Parents ─────────────────────────────────────────────────────────
  const parDocs = [];
  for (const p of PARS) {
    const name = `${p.fn} ${p.ln}`;
    const email = `parent.${p.ln.toLowerCase()}@attendx.com`;
    const user = await User.create({ name, email, password: pw, role: "STUDENT" });
    const kids = [];
    for (const roll of p.kids) {
      const child = stuDocs.find(s => s.rollNumber === roll);
      if (child) { kids.push(child._id); await Student.findByIdAndUpdate(child._id, { parentPhone: p.phone }); }
    }
    const doc = await Parent.create({ userId: user._id, phone: p.phone, relationship: p.rel, children: kids, notificationPrefs: { sms: true, email: true, instant: true } });
    parDocs.push(doc);
  }
  console.log(`   ${PARS.length} parents\n`);

  // ── Assignments ─────────────────────────────────────────────────────
  const asgnDocs = [];
  for (const a of ASGN) {
    const fac = facMap[a.emp]; const sub = subMap[a.sub]; const sec = findSec(a.sd, a.sn, a.sem, a.yr);
    if (fac && sub && sec) { const doc = await FacultySubjectSection.create({ facultyId: fac._id, subjectId: sub._id, sectionId: sec._id, academicYear: a.yr, semester: a.sem }); asgnDocs.push(doc); }
  }
  console.log(`   ${asgnDocs.length} assignments\n`);

  // ── Lectures + Attendance ───────────────────────────────────────────
  console.log("📝 Lectures & Attendance...");
  let attCount = 0, lecCount = 0;
  const secStudents = {};
  const sectionLectures = {}; // secIdString -> [{ id, startTime }]
  const lectureIds = [];
  for (const lec of LECS) {
    const assign = asgnDocs[lec.ai]; if (!assign) continue;
    const a = ASGN[lec.ai]; const sec = findSec(a.sd, a.sn, a.sem, a.yr); if (!sec) continue;
    const ck = sec._id.toString();
    if (!secStudents[ck]) secStudents[ck] = stuDocs.filter(s => s.sectionId && s.sectionId.toString() === sec._id.toString()).map(s => ({ id: s._id, roll: s.rollNumber }));

    const start = new Date(); start.setDate(start.getDate() - lec.da); start.setHours(9, 0, 0, 0);
    const end = new Date(start); end.setMinutes(end.getMinutes() + 50);

    const lecture = await LectureSession.create({ facultyId: assign.facultyId, subjectId: assign.subjectId, sectionId: assign.sectionId, topic: lec.topic, status: lec.da === 0 ? "ACTIVE" : "COMPLETED", startTime: start, endTime: lec.da === 0 ? null : end, sessionToken: lec.da === 0 ? hmacToken("seed_"+lecCount) : null, location: { latitude: 23.0225, longitude: 72.5714, radius: 100 }, totalMarked: lec.pc });
    lectureIds.push(lecture._id);
    if (!sectionLectures[ck]) sectionLectures[ck] = [];
    sectionLectures[ck].push({ id: lecture._id, startTime: start });
    lecCount++;

    const sts = secStudents[ck] || [];
    let presentN = 0;
    // COMPLETED lectures: every student gets PRESENT or ABSENT (realistic %)
    // ACTIVE (da===0): leave unmarked so live QR can be tested — OR mark none
    if (lec.da > 0) {
      for (let i = 0; i < sts.length; i++) {
        const isPresent = i < Math.min(lec.pc, sts.length);
        if (isPresent) presentN++;
        await Attendance.create({
          lectureSessionId: lecture._id,
          studentId: sts[i].id,
          status: isPresent ? "PRESENT" : "ABSENT",
          markedAt: new Date(start.getTime() + (3 + i) * 60000),
          markMethod: isPresent ? "QR" : "AUTO",
        });
        attCount++;
      }
      await LectureSession.findByIdAndUpdate(lecture._id, { totalMarked: presentN });
    }
    console.log(`   ${lec.da===0?"🟢":"✅"} "${lec.topic}" — ${lec.da}d ago — ${presentN || 0}/${sts.length} present (section roster)`);
  }

  // ── Leave applications (student → mentor approval flow) ─────────────
  console.log("🗓️  Leave applications...");
  let leaveCount = 0;
  for (const lv of LEAVES) {
    const stu = stuDocs.find((s) => s.rollNumber === lv.roll);
    if (!stu) { console.warn("   ⚠️ unknown roll in LEAVES:", lv.roll); continue; }
    const leaveDate = new Date();
    leaveDate.setDate(leaveDate.getDate() - lv.da);
    const secLectures = sectionLectures[stu.sectionId?.toString()] || [];

    // LECTURE-type picks the lectures of that day (or the most recent)
    let lectureIds = [];
    if (lv.type === "LECTURE") {
      const dayStart = new Date(leaveDate); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(leaveDate); dayEnd.setHours(23, 59, 59, 999);
      const thatDay = secLectures.filter((l) => l.startTime >= dayStart && l.startTime <= dayEnd);
      lectureIds = (thatDay.length ? thatDay : secLectures.slice(-1)).slice(0, 1).map((l) => l.id);
    }

    const mentorId = stu.mentorId || null;
    const isDecided = lv.status !== "PENDING";
    const dateClean = new Date(leaveDate); dateClean.setHours(0, 0, 0, 0);
    const doc = await LeaveApplication.create({
      studentId: stu._id,
      mentorId,
      sectionId: stu.sectionId || null,
      type: lv.type,
      halfWhich: lv.type === "HALF" ? (lv.which || "FIRST") : undefined,
      date: dateClean,
      lectureIds,
      reason: lv.reason,
      status: lv.status,
      decidedBy: isDecided ? mentorId : null,
      mentorRemark: lv.remark || undefined,
      decidedAt: isDecided ? new Date(leaveDate.getTime() + 4 * 60 * 60 * 1000) : null,
    });
    leaveCount++;

    // APPROVED leave credits attendance via the SAME service the mentor
    // approval endpoint uses (FULL / HALF / LECTURE handled there).
    if (lv.status === "APPROVED" && stu.sectionId) {
      try {
        await applyLeaveToAttendance(doc);
      } catch (e) {
        console.warn("   ⚠️ leave-to-attendance failed for", lv.roll, "—", e.message);
      }
    }
    console.log(`   ${lv.status === "PENDING" ? "🟡" : "🟢"} ${lv.roll} — ${lv.type} leave (${lv.da}d ago) → ${lv.status}`);
  }
  console.log(`   ${leaveCount} leave applications\n`);

  // ── Demo login approval (student → mentor device-bound login) ───────
  console.log("📱 Login approvals (device-bound login)...");
  let sessionCount = 0;
  {
    const demo = stuDocs.find((s) => s.rollNumber === "CSE2024009");
    if (demo?.mentorId) {
      await StudentSession.create({
        studentId: demo._id,
        loginId: "Lseed" + crypto.randomUUID().replace(/-/g, "").slice(0, 10),
        deviceId: "seed_" + crypto.randomUUID().replace(/-/g, ""),
        deviceLabel: "Android · Chrome · 412x915",
        deviceMeta: {
          platform: "Android",
          browser: "Chrome",
          hardwareCores: 8,
          deviceMemory: 8,
          touchPoints: 10,
          screen: "412x915",
          timezone: "Asia/Kolkata",
          language: "en-IN",
        },
        status: "PENDING",
        reason: "NEW_DEVICE",
      });
      sessionCount++;
    }
  }
  console.log(`   ${sessionCount} pending login request(s)\n`);

  // ── Notification logs ───────────────────────────────────────────────
  let notifCount = 0;
  for (const p of parDocs) {
    if (!p.children.length) continue;
    for (let i = 0; i < 2; i++) {
      const cid = p.children[i % p.children.length];
      const st = stuDocs.find(s => s._id.toString() === cid.toString());
      await NotificationLog.create({ parentId: p._id, studentId: cid, lectureId: lectureIds[i % lectureIds.length], subjectName: "Sample", topic: "Lecture", type: "PRESENT", channel: "SMS", status: "SENT", sentAt: new Date(), message: `Dear Parent, ${st?.rollNumber||"Student"} was marked PRESENT. - AttendX` });
      notifCount++;
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────
  const c = {
    admins: await Admin.countDocuments(), faculty: await Faculty.countDocuments(), students: await Student.countDocuments(),
    parents: await Parent.countDocuments(), departments: await Department.countDocuments(), sections: await Section.countDocuments(),
    subjects: await Subject.countDocuments(), assignments: await FacultySubjectSection.countDocuments(),
    lectures: lecCount, attendance: attCount, leaves: leaveCount, notifications: notifCount,
  };

  console.log("\n═══════════════════════════════");
  console.log("  🎉 SEEDING COMPLETE!");
  console.log("═══════════════════════════════");
  console.log(`  Admins:       ${c.admins}`);
  console.log(`  Faculty:      ${c.faculty}`);
  console.log(`  Students:     ${c.students}`);
  console.log(`  Parents:      ${c.parents}`);
  console.log(`  Departments:  ${c.departments}`);
  console.log(`  Sections:     ${c.sections}`);
  console.log(`  Subjects:     ${c.subjects}`);
  console.log(`  Assignments:  ${c.assignments}`);
  console.log(`  Lectures:     ${c.lectures}`);
  console.log(`  Attendance:   ${c.attendance}`);
  console.log(`  Leaves:       ${c.leaves}`);
  console.log(`  Notifications:${c.notifications}`);
  console.log("───────────────────────────────");
  console.log("  🔐 ALL PASSWORDS: pass123");
  console.log("───────────────────────────────");
  console.log("  password for ALL: pass123");
  console.log("  admin@attendx.com          Admin");
  console.log("  rajesh.k@attendx.com       Faculty CSE (CS201) — mentor of CSE-A");
  console.log("  priya.s@attendx.com        Faculty CSE — mentor of CSE-B");
  console.log("  cse2024001@attendx.com     Student CSE-A (has absences)");
  console.log("  cse2024009@attendx.com     Student — has a PENDING leave (test mentor approval)");
  console.log("  cse2024005@attendx.com     Student CSE-A");
  console.log("  mca2024003@attendx.com     Student MCA — has a PENDING leave");
  console.log("═══════════════════════════════\n");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error("❌", err); process.exit(1); });
