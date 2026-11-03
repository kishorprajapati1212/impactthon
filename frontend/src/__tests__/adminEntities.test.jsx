import { describe, it, expect } from "vitest";
import { ENTITIES, ENTITY_KEYS } from "../admin/entities.jsx";

/**
 * Field contract — mirrors the Mongoose schemas in server/models.
 * If a form field is added here that the model does not have (the exact
 * mistake the old UI made with `description` on subjects/classes), this
 * test fails. Keep both lists in sync with MODELS.md.
 */
const MODEL_FIELDS = {
  departments: ["name", "code", "description", "isActive"],
  subjects: ["subjectName", "subjectCode", "departmentId", "credits", "semester", "isActive"],
  classes: ["name", "departmentId", "semester", "batchYear", "batchEndYear", "totalStudents", "isActive"],
  // Faculty + its linked User account (name/email/password live on User)
  faculty: ["name", "email", "password", "employeeId", "departmentId", "designation", "phone", "specialization", "joiningYear", "isActive"],
  students: ["name", "email", "password", "rollNumber", "sectionId", "departmentId", "mentorId", "enrollmentYear", "semester", "phone", "parentPhone", "isActive", "lifecycleStatus", "leftAt", "leavingNote"],
  teaching: ["facultyId", "subjectId", "sectionId", "academicYear", "semester", "isActive"],
};

const ctx = {
  departments: [{ _id: "d1", name: "Computer Science & Engineering", code: "CSE", isActive: true }],
  sections: [{ _id: "s1", name: "A", semester: 3, batchYear: 2024, departmentId: { _id: "d1", code: "CSE" }, isActive: true }],
  faculty: [{ _id: "f1", employeeId: "FAC001", userId: { name: "Dr. Priya Sharma" }, isActive: true }],
  subjects: [{ _id: "su1", subjectName: "Data Structures", subjectCode: "CS201", isActive: true }],
};

describe("admin entities — every UI field exists on the model", () => {
  it("covers the six admin-managed records", () => {
    expect(ENTITY_KEYS.sort()).toEqual(Object.keys(MODEL_FIELDS).sort());
  });

  for (const key of Object.keys(MODEL_FIELDS)) {
    it(`${key}: form fields ⊆ model fields and payload keys ⊆ model fields`, () => {
      const e = ENTITIES[key];
      const fields = e.fields(ctx);
      for (const f of fields) expect(MODEL_FIELDS[key], `${key}.${f.key} is not a model field`).toContain(f.key);
      // Build a payload from a filled form and make sure no unknown key is sent
      const values = Object.fromEntries(fields.map((f) => [f.key, f.type === "toggle" ? true : f.type === "number" ? "2024" : f.type === "select" ? "1" : f.type === "tel" ? "9876543210" : f.type === "email" ? "a@b.co" : "value"]));
      for (const mode of ["create", "edit"]) {
        const payload = e.toPayload(values, mode);
        for (const k of Object.keys(payload)) expect(MODEL_FIELDS[key], `${key} payload key ${k}`).toContain(k);
      }
    });
  }

  it("description is only offered for Departments (the only model that has it)", () => {
    expect(ENTITIES.departments.fields(ctx).some((f) => f.key === "description")).toBe(true);
    expect(ENTITIES.subjects.fields(ctx).some((f) => f.key === "description")).toBe(false);
    expect(ENTITIES.classes.fields(ctx).some((f) => f.key === "description")).toBe(false);
  });

  it("students: phone and parent phone are both visible in the table and editable in the form", () => {
    const cols = ENTITIES.students.columns.map((c) => c.key);
    expect(cols).toContain("phone");
    const keys = ENTITIES.students.fields(ctx).map((f) => f.key);
    expect(keys).toEqual(expect.arrayContaining(["phone", "parentPhone", "mentorId", "sectionId", "rollNumber"]));
  });

  it("passwords and immutable ids are only sent on create", () => {
    const v = { name: "Rahul Verma", email: "Rahul@College.edu", rollNumber: "cse2026001", password: "secret1", semester: "3", enrollmentYear: "2026", phone: "", parentPhone: "9876543210", isActive: true };
    const create = ENTITIES.students.toPayload(v, "create");
    const edit = ENTITIES.students.toPayload(v, "edit");
    expect(create.password).toBe("secret1");
    expect(edit.password).toBeUndefined();
    expect(create.email).toBe("rahul@college.edu");
    expect(create.rollNumber).toBe("CSE2026001");
    expect(create.semester).toBe(3);
    expect(create.phone).toBeNull(); // empty string → null, never ""
    expect(create.parentPhone).toBe("9876543210");

    const f = ENTITIES.faculty.toPayload({ name: "Dr. X", email: "x@c.edu", employeeId: "FAC9", password: "secret1", designation: "Lecturer" }, "edit");
    expect(f.employeeId).toBeUndefined(); expect(f.password).toBeUndefined();
  });

  it("teaching assignment leaves semester blank so the server takes it from the class", () => {
    const p = ENTITIES.teaching.toPayload({ facultyId: "f1", subjectId: "su1", sectionId: "s1", academicYear: "2026", semester: "" });
    expect(p.semester).toBeUndefined();
    expect(p.academicYear).toBe(2026);
  });

  it("every entity has a labelled Edit/Delete-capable API surface and a human title", () => {
    for (const key of ENTITY_KEYS) {
      const e = ENTITIES[key];
      expect(typeof e.api.update("id")).toBe("string");
      expect(typeof e.api.deactivate("id")).toBe("string");
      expect(e.api.permanent("id")).toMatch(/\/permanent$/);
      expect(e.columns.some((c) => c.primary)).toBe(true);
      expect(typeof e.titleOf).toBe("function"); expect(typeof e.subtitleOf).toBe("function");
    }
  });

  it("option builders hide inactive records but keep them in lookups", () => {
    const c2 = { ...ctx, departments: [...ctx.departments, { _id: "d2", name: "Old Dept", code: "OLD", isActive: false }] };
    const opts = ENTITIES.subjects.fields(c2).find((f) => f.key === "departmentId").options();
    expect(opts.map((o) => o.value)).toEqual(["d1"]);
  });
});
