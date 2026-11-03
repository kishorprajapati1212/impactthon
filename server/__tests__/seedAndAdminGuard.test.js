import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Seed data: the demo college must be internally consistent ─────────
import {
  PASSWORD, ADMIN, ADMINS, DEPARTMENTS, CLASSES, TEACHERS, SUBJECTS, ASSIGNMENTS, STUDENTS, PARENTS, FORMER_MENTORS,
  CE_A_LECTURES, LEAVES, DEVICE_LOGINS, markFor, usualAttendance,
} from "../seed/data.js";

const unique = (arr) => new Set(arr).size === arr.length;

describe("seed data — Nihal, Jeel, Ritik, Darshit · Sahil, Jatin · a full demo college", () => {
  it("keeps the requested people with simple logins", () => {
    expect(PASSWORD).toBe("123456");
    expect(ADMIN.email).toBe("admin@attendx.com");
    expect(TEACHERS.slice(0, 2).map((t) => t.name)).toEqual(["Sahil", "Jatin"]);
    expect(STUDENTS.slice(0, 4).map((s) => s.name)).toEqual(["Nihal", "Jeel", "Ritik", "Darshit"]);
    expect(STUDENTS.filter((s) => s.mentor === "FAC001").slice(0, 2).map((s) => s.name)).toEqual(["Nihal", "Jeel"]);
    expect(STUDENTS.filter((s) => s.mentor === "FAC002").slice(0, 2).map((s) => s.name)).toEqual(["Ritik", "Darshit"]);
  });

  it("every login is <name>@attendx.com and unique across admins, teachers, students and parents", () => {
    const emails = [...ADMINS.map((a) => a.email), ...TEACHERS.map((t) => t.email), ...STUDENTS.map((s) => s.email), ...PARENTS.map((p) => p.email)];
    expect(unique(emails)).toBe(true);
    expect(emails.every((e) => /^[a-z.]+@attendx\.com$/.test(e))).toBe(true);
    expect(TEACHERS.every((t) => t.email === `${t.name.toLowerCase()}@attendx.com`)).toBe(true);
    expect(STUDENTS.every((s) => s.email === `${s.name.toLowerCase()}@attendx.com`)).toBe(true);
    expect(unique(STUDENTS.map((s) => s.rollNumber))).toBe(true);
    expect(unique(TEACHERS.map((t) => t.employeeId))).toBe(true);
    expect(unique(ADMINS.map((a) => a.employeeId))).toBe(true);
    expect(unique(DEPARTMENTS.map((d) => d.code))).toBe(true);
    expect(unique(SUBJECTS.map((s) => s.code))).toBe(true);
    expect(unique(CLASSES.map((c) => c.key))).toBe(true);
    expect(unique(CLASSES.map((c) => `${c.dept}|${c.name}|${c.batchYear}`))).toBe(true);
  });

  it("has two extra CE classes — same batch other division, and a newer batch — plus at least ten rows for every table", () => {
    const ce = CLASSES.filter((c) => c.dept === "CE");
    expect(ce.map((c) => `${c.name}-${c.batchYear}`)).toEqual(["A-2024", "B-2024", "A-2025"]);
    expect(ce[1].semester).toBe(5); // same batch, different division
    expect(ce[2].semester).toBe(3); // newer batch, earlier semester
    for (const rows of [ADMINS, DEPARTMENTS, CLASSES, TEACHERS, SUBJECTS, ASSIGNMENTS, STUDENTS, PARENTS, LEAVES, DEVICE_LOGINS]) {
      expect(rows.length).toBeGreaterThanOrEqual(10);
    }
    expect(CE_A_LECTURES.length).toBeGreaterThanOrEqual(10);
    expect(TEACHERS.length).toBeGreaterThan(2);
  });

  it("every reference points at something that exists", () => {
    const emp = new Set(TEACHERS.map((t) => t.employeeId));
    const dept = new Set(DEPARTMENTS.map((d) => d.code));
    const cls = new Set(CLASSES.map((c) => c.key));
    const subj = new Set(SUBJECTS.map((s) => s.code));
    const names = new Set(STUDENTS.map((s) => s.name));
    expect(TEACHERS.every((t) => dept.has(t.dept))).toBe(true);
    expect(SUBJECTS.every((s) => dept.has(s.dept))).toBe(true);
    expect(CLASSES.every((c) => dept.has(c.dept))).toBe(true);
    expect(STUDENTS.every((s) => emp.has(s.mentor) && cls.has(s.cls))).toBe(true);
    expect(ASSIGNMENTS.every((a) => emp.has(a.teacher) && subj.has(a.subject) && cls.has(a.cls))).toBe(true);
    // every class has a teacher, every subject is taught, every teacher teaches something
    expect(CLASSES.every((c) => ASSIGNMENTS.some((a) => a.cls === c.key))).toBe(true);
    expect(SUBJECTS.every((s) => ASSIGNMENTS.some((a) => a.subject === s.code))).toBe(true);
    expect(TEACHERS.every((t) => ASSIGNMENTS.some((a) => a.teacher === t.employeeId))).toBe(true);
    // a subject is only assigned to classes of its own department (Applied Sciences teaches every first year) and semester
    expect(ASSIGNMENTS.every((a) => { const s = SUBJECTS.find((x) => x.code === a.subject); const c = CLASSES.find((x) => x.key === a.cls); return (s.dept === c.dept || s.dept === "AS") && s.semester === c.semester; })).toBe(true);
    expect(LEAVES.every((l) => names.has(l.student))).toBe(true);
    expect(DEVICE_LOGINS.every((d) => names.has(d.student))).toBe(true);
    expect(PARENTS.every((p) => names.has(p.student))).toBe(true);
    expect(FORMER_MENTORS.every((f) => names.has(f.student) && emp.has(f.mentor) && f.mentor !== STUDENTS.find((s) => s.name === f.student).mentor)).toBe(true);
  });

  it("CE · A lectures give the documented percentages for the four named students", () => {
    const codes = new Set(SUBJECTS.map((s) => s.code));
    const rolls = new Set(STUDENTS.filter((s) => s.cls === "CE-A-2024").map((s) => s.rollNumber));
    expect(CE_A_LECTURES.every((l) => codes.has(l.subject) && l.present.every((r) => rolls.has(r)) && l.daysAgo > 0)).toBe(true);
    expect(CE_A_LECTURES.every((l) => ASSIGNMENTS.some((a) => a.cls === "CE-A-2024" && a.subject === l.subject))).toBe(true);
    expect(unique(CE_A_LECTURES.map((l) => `${l.daysAgo}@${l.hour}`))).toBe(true); // no two lectures at the same time
    const pct = (roll) => Math.round((CE_A_LECTURES.filter((l) => l.present.includes(roll)).length / CE_A_LECTURES.length) * 100);
    expect(pct("CE2024001")).toBe(100); // Nihal
    expect(pct("CE2024002")).toBe(92);  // Jeel — the one miss is an approved leave → 100 % after the leave is applied
    expect(pct("CE2024004")).toBe(67);  // Darshit
    expect(pct("CE2024003")).toBe(58);  // Ritik → listed under "Students below 75 %"
    expect(LEAVES.find((l) => l.student === "Jeel")).toMatchObject({ status: "APPROVED", daysAgo: 6 });
    expect(CE_A_LECTURES.find((l) => l.daysAgo === 6).present).not.toContain("CE2024002");
  });

  it("generated attendance is deterministic and roughly follows each student's usual percentage", () => {
    expect(markFor(7, 3)).toBe(markFor(7, 3));
    const lectures = 400;
    for (const i of [0, 1, 2, 3, 4]) {
      const present = Array.from({ length: lectures }, (_, j) => markFor(i, j)).filter((m) => m !== "ABSENT").length;
      expect(Math.abs(present / lectures * 100 - usualAttendance(i))).toBeLessThan(8);
    }
    expect(new Set(STUDENTS.map((_, i) => usualAttendance(i))).size).toBeGreaterThan(3); // a real spread, not one number
  });

  it("device logins cover every state the mentor screen can show", () => {
    expect(new Set(DEVICE_LOGINS.map((d) => d.status))).toEqual(new Set(["PENDING", "ACTIVE", "REJECTED", "LOGGED_OUT"]));
    expect(new Set(LEAVES.map((l) => l.status))).toEqual(new Set(["PENDING", "APPROVED", "REJECTED"]));
    expect(new Set(LEAVES.map((l) => l.type))).toEqual(new Set(["FULL", "HALF", "LECTURE"]));
  });
});

// ── /admin/create guard ────────────────────────────────────────────────
vi.mock("../models/users/Admin.js", () => ({ default: { countDocuments: vi.fn() } }));
vi.mock("../middleware/auth.middleware.js", () => ({ default: vi.fn((req, res, next) => { if (!req.headers.authorization) return res.status(401).json({ success: false, message: "Not authorized" }); req.user = req.__user; next(); }) }));
const { default: Admin } = await import("../models/users/Admin.js");
const { adminCreateGuard } = await import("../middleware/firstAdmin.middleware.js");

const mockRes = () => { const r = {}; r.status = vi.fn(() => r); r.json = vi.fn(() => r); return r; };

describe("POST /admin/create guard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lets the very first admin be created without a login (fresh install)", async () => {
    Admin.countDocuments.mockResolvedValue(0);
    const next = vi.fn(); const res = mockRes();
    await adminCreateGuard({ headers: {} }, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("refuses anonymous requests once an admin exists", async () => {
    Admin.countDocuments.mockResolvedValue(1);
    const next = vi.fn(); const res = mockRes();
    await adminCreateGuard({ headers: {} }, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("refuses logged-in non-admins and allows admins", async () => {
    Admin.countDocuments.mockResolvedValue(1);
    let next = vi.fn(); let res = mockRes();
    await adminCreateGuard({ headers: { authorization: "Bearer t" }, __user: { role: "STUDENT" } }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
    next = vi.fn(); res = mockRes();
    await adminCreateGuard({ headers: { authorization: "Bearer t" }, __user: { role: "ADMIN" } }, res, next);
    expect(next).toHaveBeenCalledWith();
  });
});
