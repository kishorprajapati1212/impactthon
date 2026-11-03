import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";

/**
 * Deleting a lecture is the most sensitive action in AttendX: it removes
 * attendance marks. These tests pin down (1) who may do it, (2) the exact
 * cascade — every collection that references a lecture is cleaned, children
 * first, lecture last — and (3) that the deletion is audited with counts.
 */

const calls = [];
const mk = (name, ret) => vi.fn(async (...args) => { calls.push([name, ...args]); return ret; });

vi.mock("../models/Attendance/Attendance.js", () => ({ default: { deleteMany: mk("Attendance.deleteMany", { deletedCount: 7 }), aggregate: vi.fn(async () => []), countDocuments: vi.fn(async () => 0) } }));
vi.mock("../models/leave/LeaveApplication.js", () => ({ default: { updateMany: mk("LeaveApplication.updateMany", { modifiedCount: 2 }), countDocuments: vi.fn(async () => 2) } }));
vi.mock("../models/users/NotificationLog.js", () => ({ default: { deleteMany: mk("NotificationLog.deleteMany", { deletedCount: 3 }), countDocuments: vi.fn(async () => 3) } }));
vi.mock("../models/lecture/LectureSession.js", () => ({ default: { deleteOne: mk("LectureSession.deleteOne", { deletedCount: 1 }) } }));
vi.mock("../utils/audit.js", () => ({ recordAudit: mk("recordAudit", null) }));
vi.mock("../services/cacheService.js", () => ({ invalidateAll: vi.fn(() => calls.push(["invalidateAll"])) }));

const { lectureDeletePolicy, lectureAuditLabel, describeDeletion, deleteLectureCascade } = await import("../utils/deleteLecture.js");
const { recordAudit } = await import("../utils/audit.js");

const facultyA = new mongoose.Types.ObjectId();
const facultyB = new mongoose.Types.ObjectId();
const lectureId = new mongoose.Types.ObjectId();
const lecture = {
  _id: lectureId,
  topic: "Transactions & ACID",
  status: "COMPLETED",
  startTime: new Date("2026-10-31T04:35:00.000Z"),
  facultyId: { _id: facultyA, employeeId: "FAC001", userId: { name: "Sahil" } },
  subjectId: { _id: new mongoose.Types.ObjectId(), subjectCode: "CE502", subjectName: "DBMS" },
  sectionId: { _id: new mongoose.Types.ObjectId(), name: "A", batchYear: 2024, departmentId: { code: "CE" } },
};

beforeEach(() => { calls.length = 0; });

describe("lectureDeletePolicy — who may delete which lecture", () => {
  it("admin may delete any lecture, running or finished, with or without presence", () => {
    expect(lectureDeletePolicy({ role: "ADMIN", lecture, presentCount: 40 }).allowed).toBe(true);
    expect(lectureDeletePolicy({ role: "ADMIN", lecture: { ...lecture, status: "ACTIVE" }, presentCount: 0 }).allowed).toBe(true);
  });
  it("a teacher may delete their own lecture while it is running (the 'started two at once' case)", () => {
    const p = lectureDeletePolicy({ role: "FACULTY", facultyId: facultyA, lecture: { ...lecture, status: "ACTIVE" }, presentCount: 12 });
    expect(p).toMatchObject({ allowed: true, reason: "own-running" });
  });
  it("a teacher may delete their own finished lecture only when nobody was marked present", () => {
    expect(lectureDeletePolicy({ role: "FACULTY", facultyId: facultyA, lecture, presentCount: 0 }).allowed).toBe(true);
    const refused = lectureDeletePolicy({ role: "FACULTY", facultyId: facultyA, lecture, presentCount: 3 });
    expect(refused.allowed).toBe(false);
    expect(refused.status).toBe(403);
    expect(refused.code).toBe("DELETE_NEEDS_ADMIN");
    expect(refused.message).toMatch(/3 students marked present/);
    expect(lectureDeletePolicy({ role: "FACULTY", facultyId: facultyA, lecture, presentCount: 1 }).message).toMatch(/1 student marked present/);
  });
  it("a teacher can never delete another teacher's lecture; students and missing lectures are refused", () => {
    expect(lectureDeletePolicy({ role: "FACULTY", facultyId: facultyB, lecture: { ...lecture, status: "ACTIVE" } })).toMatchObject({ allowed: false, status: 403, code: "NOT_YOURS" });
    expect(lectureDeletePolicy({ role: "STUDENT", lecture })).toMatchObject({ allowed: false, status: 403, code: "FORBIDDEN" });
    expect(lectureDeletePolicy({ role: "ADMIN", lecture: null })).toMatchObject({ allowed: false, status: 404, code: "NOT_FOUND" });
  });
});

describe("audit label and result sentence", () => {
  it("keeps topic, subject, class and start time in one readable label (it must survive the deletion)", () => {
    const label = lectureAuditLabel(lecture);
    expect(label).toContain("Transactions & ACID");
    expect(label).toContain("CE502");
    expect(label).toContain("CE · A · 2024");
    expect(label).toMatch(/31 Oct 2026/);
    expect(lectureAuditLabel({ _id: lectureId, topic: "Plain", facultyId: facultyA, sectionId: lecture.sectionId._id, subjectId: lecture.subjectId._id })).toBe("Plain");
  });
  it("tells the user exactly what happened", () => {
    expect(describeDeletion({ marksRemoved: 0 })).toMatch(/No attendance marks were affected/);
    expect(describeDeletion({ marksRemoved: 1, presentRemoved: 1 })).toMatch(/1 attendance mark removed \(1 present\)/);
    expect(describeDeletion({ marksRemoved: 58, presentRemoved: 41 })).toMatch(/58 attendance marks removed \(41 present\)/);
  });
});

describe("deleteLectureCascade — every table that references the lecture is cleaned, in order", () => {
  it("deletes marks, pulls the id from leave applications, removes notification rows, then the lecture, then audits", async () => {
    const counts = { PRESENT: 5, LATE: 0, ABSENT: 2, EXCUSED: 0, LEAVE: 0, total: 7, present: 5, notPresent: 2 };
    const req = { user: { _id: new mongoose.Types.ObjectId(), role: "ADMIN" } };
    const result = await deleteLectureCascade(lecture, { req, counts });

    expect(calls.map((c) => c[0])).toEqual([
      "Attendance.deleteMany",
      "LeaveApplication.updateMany",
      "NotificationLog.deleteMany",
      "LectureSession.deleteOne",
      "recordAudit",
      "invalidateAll",
    ]);
    expect(calls[0][1]).toEqual({ lectureSessionId: lectureId });
    expect(calls[1][1]).toEqual({ lectureIds: lectureId });
    expect(calls[1][2]).toEqual({ $pull: { lectureIds: lectureId } });
    expect(calls[2][1]).toEqual({ lectureId });
    expect(calls[3][1]).toEqual({ _id: lectureId });

    expect(result).toMatchObject({
      lectureId: String(lectureId),
      status: "COMPLETED",
      marksRemoved: 7,
      presentRemoved: 5,
      notPresentRemoved: 2,
      leaveApplicationsUpdated: 2,
      notificationsRemoved: 3,
    });

    const audit = recordAudit.mock.calls[0][0];
    expect(audit).toMatchObject({ req, entityType: "LECTURE", entityId: lectureId, action: "DELETE" });
    expect(audit.entityLabel).toContain("Transactions & ACID");
    expect(audit.changes).toMatchObject({ status: "COMPLETED", marksRemoved: 7, presentRemoved: 5, notificationsRemoved: 3, leaveApplicationsUpdated: 2, facultyId: String(facultyA) });
  });
});

describe("AuditLog model accepts the new LECTURE entity type", () => {
  it("LECTURE is a valid entityType (additive enum change, see MODELS.md §13)", async () => {
    vi.doUnmock("../models/users/AuditLog.js");
    const { default: AuditLog } = await import("../models/users/AuditLog.js");
    const enumValues = AuditLog.schema.path("entityType").enumValues;
    expect(enumValues).toContain("LECTURE");
    expect(enumValues).toEqual(expect.arrayContaining(["STUDENT", "FACULTY", "ASSIGNMENT", "DEPARTMENT", "SUBJECT", "SECTION"]));
  });
});
