import { describe, it, expect } from "vitest";
import { idOf, dash, batchLabel, classLabel, lifecycleOf, statusOf, personName, initials, formatPhone, formatDate, timeAgo, mentorName, percentTone, auditLine, semesterOptions } from "../admin/adminFormat.js";

describe("adminFormat: labels the admin console shows", () => {
  it("idOf accepts populated docs, raw ids and nulls", () => {
    expect(idOf({ _id: "abc" })).toBe("abc");
    expect(idOf("abc")).toBe("abc");
    expect(idOf(null)).toBe("");
  });

  it("dash shows an em dash for empty values only", () => {
    expect(dash("")).toBe("-"); expect(dash(null)).toBe("-"); expect(dash(0)).toBe(0); expect(dash("x")).toBe("x");
  });

  it("batchLabel prefers the server label, else builds 2024-28", () => {
    expect(batchLabel({ batchLabel: "2024-28" })).toBe("2024-28");
    expect(batchLabel({ batchYear: 2024, batchEndYear: 2028 })).toBe("2024-28");
    expect(batchLabel({ batchYear: 2024 })).toBe("2024");
    expect(batchLabel(null)).toBe("-");
  });

  it("classLabel reads 'CSE · A' with optional semester", () => {
    const sec = { name: "A", semester: 3, departmentId: { code: "CSE", name: "Computer Science" } };
    expect(classLabel(sec)).toBe("CSE · A");
    expect(classLabel(sec, { withSemester: true })).toBe("CSE · A · Sem 3");
    expect(classLabel("5f0")).toBe("-"); // unpopulated id → never shows a raw ObjectId
  });

  it("lifecycleOf distinguishes studying / deactivated / left", () => {
    expect(lifecycleOf({ lifecycleStatus: "STUDYING", isActive: true }).label).toBe("Studying");
    expect(lifecycleOf({ lifecycleStatus: "STUDYING", isActive: false }).label).toBe("Deactivated");
    expect(lifecycleOf({ lifecycleStatus: "LEFT", isActive: false }).label).toBe("Left the college");
    expect(lifecycleOf({}).label).toBe("Studying");
    expect(statusOf({ isActive: false }).label).toBe("Inactive");
  });

  it("personName / initials / mentorName never leak ids", () => {
    expect(personName({ userId: { name: "Dr. Priya Sharma" } })).toBe("Dr. Priya Sharma");
    expect(personName({})).toBe("Unnamed");
    expect(initials("Priya Sharma")).toBe("PS");
    expect(initials("")).toBe("?");
    expect(mentorName({ mentorId: { userId: { name: "Dr. Amit" } } })).toBe("Dr. Amit");
    expect(mentorName({ mentorId: "64f0" })).toBeNull();
    expect(mentorName({})).toBeNull();
  });

  it("formatPhone groups Indian mobiles as 98765 43210", () => {
    expect(formatPhone("9876543210")).toBe("98765 43210");
    expect(formatPhone("+91 98765 43210")).toBe("+91 98765 43210"); // not 10 digits → untouched
    expect(formatPhone(null)).toBe("-");
  });

  it("formatDate / timeAgo tolerate bad input", () => {
    expect(formatDate(null)).toBe("-");
    expect(formatDate("not a date")).toBe("-");
    const now = Date.parse("2026-10-31T10:00:00Z");
    expect(timeAgo("2026-10-31T09:59:40Z", now)).toBe("just now");
    expect(timeAgo("2026-10-31T09:30:00Z", now)).toBe("30 min ago");
    expect(timeAgo("2026-10-31T07:00:00Z", now)).toBe("3 hr ago");
    expect(timeAgo("2026-10-30T07:00:00Z", now)).toBe("yesterday");
    expect(timeAgo("2026-10-20T07:00:00Z", now)).toBe("11 days ago");
  });

  it("percentTone follows the 75 / 60 attendance thresholds", () => {
    expect(percentTone(80)).toBe("green"); expect(percentTone(75)).toBe("green");
    expect(percentTone(65)).toBe("amber"); expect(percentTone(40)).toBe("red"); expect(percentTone(null)).toBe("slate");
  });

  it("auditLine turns raw model keys from older rows into plain words", () => {
    const l = auditLine({ summary: "Updated student “CE2024003 · Ritik”: mentorId, phone, sectionId…", changedBy: { name: "Admin" } });
    expect(l.what).toBe("Updated student “CE2024003 · Ritik”: mentor, phone, class…");
    expect(auditLine({ summary: "Added student “X”" }).what).toBe("Added student “X”");
  });

  it("auditLine prefers the server summary and names the admin", () => {
    const l = auditLine({ summary: "Added student Rahul Verma (CSE2026001)", changedBy: { name: "Admin User" }, createdAt: "2026-10-31" });
    expect(l.what).toBe("Added student Rahul Verma (CSE2026001)");
    expect(l.who).toBe("Admin User");
    expect(auditLine({ action: "DELETE", entityType: "SECTION" }).what).toBe("delete section");
  });

  it("offers 16 semesters", () => { expect(semesterOptions).toHaveLength(16); expect(semesterOptions[0]).toEqual({ value: 1, label: "Semester 1" }); });
});
