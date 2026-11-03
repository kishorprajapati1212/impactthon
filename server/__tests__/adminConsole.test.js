import { describe, it, expect } from "vitest";
import { parsePagination, parseSort, activeFilter, escapeRegex, listEnvelope, refFilter, numFilter } from "../utils/listQuery.js";
import { sanitizeAuditChanges, pickChanged, describeAudit } from "../utils/audit.js";
import AuditLog from "../models/users/AuditLog.js";
import Student from "../models/users/Student.js";
import Faculty from "../models/users/Faculty.js";
import Section from "../models/Academics/Section.js";
import Subject from "../models/Academics/Subject.js";
import Department from "../models/Academics/Department.js";

describe("listQuery — pagination & sorting for admin tables", () => {
  it("defaults keep the old behaviour (first page, 200 rows)", () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 200, skip: 0 });
  });
  it("honours page/limit and caps the limit", () => {
    expect(parsePagination({ page: "3", limit: "25" })).toEqual({ page: 3, limit: 25, skip: 50 });
    expect(parsePagination({ limit: "99999" }).limit).toBe(500);
    expect(parsePagination({ page: "-2", limit: "abc" })).toEqual({ page: 1, limit: 200, skip: 0 });
  });
  it("only sorts on whitelisted fields", () => {
    expect(parseSort({ sortBy: "rollNumber", order: "desc" }, ["rollNumber"])).toEqual({ rollNumber: -1 });
    expect(parseSort({ sortBy: "password", order: "asc" }, ["rollNumber"], { field: "createdAt", order: "desc" })).toEqual({ createdAt: -1 });
  });
  it("activeFilter hides inactive rows unless asked", () => {
    expect(activeFilter({})).toEqual({ isActive: true });
    expect(activeFilter({ showInactive: "true" })).toEqual({});
  });
  it("escapes regex metacharacters in search text", () => {
    expect(escapeRegex("a.b*c(d)")).toBe("a\\.b\\*c\\(d\\)");
  });
  it("list envelope keeps count/data and adds total/page/pages", () => {
    const env = listEnvelope([1, 2], { total: 45, page: 2, limit: 20 });
    expect(env).toMatchObject({ success: true, count: 2, total: 45, page: 2, pages: 3, limit: 20, data: [1, 2] });
  });
});

describe("audit helper — accountable, secret-free history", () => {
  it("never stores passwords or tokens", () => {
    expect(sanitizeAuditChanges({ name: "A", password: "x", token: "t", email: "e" })).toEqual({ name: "A", email: "e" });
  });
  it("records only the fields that actually changed", () => {
    const { changes, previous } = pickChanged({ name: "Old", semester: 1, phone: null }, { name: "New", semester: 1, phone: "9700000001" }, ["name", "semester", "phone"]);
    expect(changes).toEqual({ name: "New", phone: "9700000001" });
    expect(previous).toEqual({ name: "Old", phone: null });
  });
  it("writes a human sentence for the activity feed", () => {
    expect(describeAudit({ action: "CREATE", entityType: "SECTION", entityLabel: "CSE A · Sem 1 · 2026" })).toBe("Added class “CSE A · Sem 1 · 2026”");
    expect(describeAudit({ action: "UPDATE", entityType: "STUDENT", entityLabel: "CSE2024001 · Rahul", changes: { phone: "9", semester: 2 } })).toBe("Updated student “CSE2024001 · Rahul”: phone, semester");
    expect(describeAudit({ action: "DELETE", entityType: "DEPARTMENT", entityLabel: "CE · Civil" })).toBe("Permanently deleted department “CE · Civil”");
    // raw model keys never reach the admin feed
    expect(describeAudit({ action: "UPDATE", entityType: "STUDENT", entityLabel: "X", changes: { mentorId: "f1", sectionId: "s1", parentPhone: "9", someNewField: 1 } })).toBe("Updated student “X”: mentor, class, parent phone, some new field");
  });
  it("AuditLog accepts academic records too (additive enum + label/summary)", () => {
    const values = AuditLog.schema.path("entityType").enumValues;
    expect(values).toEqual(expect.arrayContaining(["DEPARTMENT", "SUBJECT", "SECTION", "STUDENT", "FACULTY", "ASSIGNMENT"]));
    expect(AuditLog.schema.path("entityLabel")).toBeTruthy();
    expect(AuditLog.schema.path("summary")).toBeTruthy();
  });
});

describe("admin console ↔ model field contract", () => {
  it("students carry contact numbers the admin table must show", () => {
    expect(Student.schema.path("phone")).toBeTruthy();
    expect(Student.schema.path("parentPhone")).toBeTruthy();
    expect(Faculty.schema.path("phone")).toBeTruthy();
  });
  it("only Department has a description — Subject and Section must not pretend to", () => {
    expect(Department.schema.path("description")).toBeTruthy();
    expect(Subject.schema.path("description")).toBeUndefined();
    expect(Section.schema.path("description")).toBeUndefined();
  });
  it("no model field was renamed or removed", () => {
    expect(Object.keys(Student.schema.paths)).toEqual(expect.arrayContaining(["userId", "rollNumber", "sectionId", "departmentId", "mentorId", "enrollmentYear", "semester", "phone", "parentPhone", "isActive", "lifecycleStatus"]));
    expect(Object.keys(Section.schema.paths)).toEqual(expect.arrayContaining(["name", "departmentId", "semester", "batchYear", "batchEndYear", "totalStudents", "isActive"]));
  });
});

describe("validators — names an admin really types", () => {
  it("accepts real department, subject and class names", async () => {
    const v = await import("../validators/index.js");
    expect(v.validateCreateDepartment({ name: "Computer Science & Engineering", code: "CSE" }).valid).toBe(true);
    expect(v.validateCreateSubject({ subjectName: "Data Structures - II (Lab)", subjectCode: "CS202L" }).valid).toBe(true);
    expect(v.validateCreateSection({ name: "A", departmentId: "507f1f77bcf86cd799439011", semester: 1, batchYear: 2026 }).valid).toBe(true);
    expect(v.validateCreateFaculty({ name: "Dr. A. P. J. Abdul Kalam", email: "apj@x.com", password: "pass123", employeeId: "FAC9" }).valid).toBe(true);
  });
  it("still rejects junk", async () => {
    const v = await import("../validators/index.js");
    expect(v.validateCreateDepartment({ name: "<script>", code: "CSE" }).valid).toBe(false);
    expect(v.validateCreateSection({ name: "", departmentId: "507f1f77bcf86cd799439011", semester: 1, batchYear: 2026 }).valid).toBe(false);
    expect(v.validateCreateStudent({ name: "Ok Name", email: "a@b.co", password: "pass123", rollNumber: "R1", phone: "12345" }).valid).toBe(false);
  });
});

describe("listQuery — reference filters never break a table", () => {
  it("accepts ids and the 'none' sentinel", () => {
    expect(refFilter("64b0000000000000000000a1")).toBe("64b0000000000000000000a1");
    expect(refFilter("none")).toBeNull();
    expect(refFilter(" NONE ")).toBeNull();
  });
  it("ignores stale or foreign values instead of throwing INVALID_ID", () => {
    expect(refFilter("students")).toBeUndefined();     // old build sent ?section=students
    expect(refFilter("teaching-map")).toBeUndefined(); // 12 chars: would pass isValidObjectId
    expect(refFilter("")).toBeUndefined();
    expect(refFilter(undefined)).toBeUndefined();
  });
  it("numFilter only passes finite numbers", () => {
    expect(numFilter("5")).toBe(5);
    expect(numFilter("abc")).toBeUndefined();
    expect(numFilter("")).toBeUndefined();
  });
});
