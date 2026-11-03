import { describe, it, expect } from "vitest";
import MentorStudentHistory from "../models/mapping/MentorStudentHistory.js";
import Student from "../models/users/Student.js";

describe("MentorStudentHistory — new additive table", () => {
  it("keeps student, mentor, period and end reason", () => {
    const paths = Object.keys(MentorStudentHistory.schema.paths);
    expect(paths).toEqual(expect.arrayContaining(["studentId", "mentorId", "startsAt", "endsAt", "endReason", "assignedBy"]));
  });
  it("end reasons cover leaving college without deleting records", () => {
    const values = MentorStudentHistory.schema.path("endReason").enumValues;
    expect(values).toEqual(expect.arrayContaining(["STUDENT_LEFT", "COURSE_COMPLETED", "TRANSFERRED", "MENTOR_CHANGED"]));
  });
});
describe("Student lifecycle — additive fields, old fields unchanged", () => {
  it("defaults to STUDYING and keeps isActive/mentorId/sectionId", () => {
    const s = new Student({ userId: "507f1f77bcf86cd799439011", rollNumber: "CSE1" });
    expect(s.lifecycleStatus).toBe("STUDYING");
    expect(s.isActive).toBe(true);
    expect(Student.schema.path("mentorId")).toBeTruthy();
    expect(Student.schema.path("sectionId")).toBeTruthy();
    expect(Student.schema.path("rollNumber")).toBeTruthy();
  });
});
