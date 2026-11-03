import { describe, it, expect } from "vitest";
import { summariseAttendance, band, GOOD, WATCH } from "../utils/attendanceSummary.js";

const DAY = 86400000;
const now = Date.parse("2026-10-31T10:00:00Z");
const since = now - 30 * DAY;
const prevSince = since - 30 * DAY;

const sections = [{ _id: "s1", name: "A", semester: 3, departmentId: { code: "CSE" } }, { _id: "s2", name: "B", semester: 3, departmentId: { code: "CSE" } }];
const subjects = [{ _id: "su1", subjectCode: "CS201", subjectName: "Data Structures" }, { _id: "su2", subjectCode: "MA201", subjectName: "Maths" }];
const faculty = [{ _id: "f1", employeeId: "FAC001", userId: { name: "Dr. Priya" } }, { _id: "f2", employeeId: "FAC002", userId: { name: "Prof. Amit" } }];
const students = [
  { _id: "st1", rollNumber: "R1", userId: { name: "Rahul" }, sectionId: sections[0], mentorId: { userId: { name: "Dr. Priya" } }, isActive: true, lifecycleStatus: "STUDYING" },
  { _id: "st2", rollNumber: "R2", userId: { name: "Ananya" }, sectionId: sections[0], isActive: true, lifecycleStatus: "STUDYING" },
  { _id: "st3", rollNumber: "R3", userId: { name: "Former" }, sectionId: sections[1], isActive: false, lifecycleStatus: "LEFT" },
];
const lec = (id, sectionId, subjectId, facultyId, daysAgo, status = "COMPLETED") => ({ _id: id, sectionId, subjectId, facultyId, status, startTime: new Date(now - daysAgo * DAY).toISOString() });
const lectures = [
  lec("l1", "s1", "su1", "f1", 2), lec("l2", "s1", "su1", "f1", 3), lec("l3", "s1", "su2", "f2", 9), lec("l4", "s1", "su2", "f2", 10),
  lec("l5", "s2", "su1", "f1", 1),
  lec("lx", "s1", "su1", "f1", 4, "CANCELLED"),      // never counted
  lec("lp1", "s1", "su1", "f1", 40), lec("lp2", "s1", "su1", "f1", 45), // previous period
];
const mark = (lectureSessionId, studentId, status) => ({ lectureSessionId, studentId, status });
const attendances = [
  // Rahul: 4 counted, 1 present → 25 % (at risk)
  mark("l1", "st1", "PRESENT"), mark("l2", "st1", "ABSENT"), mark("l3", "st1", "ABSENT"), mark("l4", "st1", "ABSENT"), mark("l5", "st1", "LEAVE"),
  // Ananya: 4 counted, 4 present (one LATE) → 100 %
  mark("l1", "st2", "PRESENT"), mark("l2", "st2", "LATE"), mark("l3", "st2", "PRESENT"), mark("l4", "st2", "PRESENT"),
  // former student in class B - counted for the class, never listed as at risk
  mark("l5", "st3", "ABSENT"),
  // cancelled lecture marks are ignored
  mark("lx", "st1", "ABSENT"), mark("lx", "st2", "ABSENT"),
  // previous period: 2 of 2 present
  mark("lp1", "st1", "PRESENT"), mark("lp2", "st1", "PRESENT"),
];

const run = (extra = {}) => summariseAttendance({ attendances, lectures, students, sections, subjects, faculty, since, until: now, prevSince, days: 30, ...extra });

describe("attendance report math - one rule everywhere", () => {
  it("bands: 75+ good, 60-74 watch, below 60 low, null none", () => {
    expect(band(75)).toBe("good"); expect(band(74)).toBe("watch"); expect(band(60)).toBe("watch"); expect(band(59)).toBe("low"); expect(band(null)).toBe("none");
    expect(GOOD).toBe(75); expect(WATCH).toBe(60);
  });

  it("overall: present+late over all non-neutral marks, cancelled lectures excluded, compared with previous period", () => {
    const r = run();
    // counted marks in period: Rahul 4 (leave excluded) + Ananya 4 + former 1 = 9 ; present = 1 + 4 = 5
    expect(r.overall).toMatchObject({ counted: 9, present: 5, absent: 4, percentage: 56, band: "low", lectures: 5 });
    expect(r.overall.previous).toEqual({ percentage: 100, lectures: 2 });
    expect(r.overall.change).toBe(-44);
  });

  it("classes, subjects and teachers are listed lowest first with lecture counts", () => {
    const r = run();
    expect(r.classes.map((c) => c.label)).toEqual(["CSE · B", "CSE · A"]); // B = 0 %, A = 62 %
    expect(r.classes[1]).toMatchObject({ students: 2, lectures: 4, percentage: 63, band: "watch", semester: 3 });
    expect(r.subjects[0]).toMatchObject({ code: "MA201", lectures: 2 });
    expect(r.teachers.map((t) => t.name)).toEqual(["Prof. Amit", "Dr. Priya"]);
    expect(r.teachers[1]).toMatchObject({ lectures: 3, employeeId: "FAC001" });
    // two divisions with the same name are told apart by their batch year
    const withBatch = summariseAttendance({ attendances, lectures, students, sections: sections.map((x) => ({ ...x, batchYear: x._id === "s1" ? 2024 : 2025 })), subjects, faculty, since, until: now, prevSince, days: 30 });
    expect(withBatch.classes.map((c) => c.label)).toEqual(["CSE · B · 2025", "CSE · A · 2024"]);
  });

  it("students below 75 %: only active students with at least 3 counted lectures, with class and mentor names", () => {
    const r = run();
    expect(r.studentsAtRisk).toHaveLength(1);
    expect(r.studentsAtRisk[0]).toMatchObject({ name: "Rahul", rollNumber: "R1", classLabel: "CSE · A", mentor: "Dr. Priya", percentage: 25, lectures: 4, band: "low" });
    expect(r.totals).toEqual({ studentsCounted: 3, studentsBelowGood: 1, classesBelowGood: 2 });
  });

  it("week by week covers only the period and never exceeds 13 rows", () => {
    const r = run();
    expect(r.weekly.length).toBeGreaterThanOrEqual(2);
    expect(r.weekly.every((w) => w.label.startsWith("Week of"))).toBe(true);
    expect(r.weekly.reduce((n, w) => n + w.lectures, 0)).toBe(5);
    const all = run({ since: 0, prevSince: null, days: null });
    expect(all.overall.previous).toBeNull(); expect(all.overall.change).toBeNull(); expect(all.period.label).toBe("all time");
    expect(all.weekly.length).toBeLessThanOrEqual(13);
  });

  it("empty data gives nulls, not NaN or crashes", () => {
    const r = summariseAttendance({ since, until: now, prevSince, days: 30 });
    expect(r.overall.percentage).toBeNull(); expect(r.overall.band).toBe("none"); expect(r.classes).toEqual([]); expect(r.studentsAtRisk).toEqual([]);
  });
});
