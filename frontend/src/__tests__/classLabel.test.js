import { describe, it, expect } from "vitest";
import { classLabel, classLabelLong, subjectLabel, assignmentLabel, classSlug } from "../utils/classLabel.js";

const sec = { name: "A", batchYear: 2024, semester: 5, departmentId: { code: "CE", name: "Computer Engineering" } };

describe("classLabel (faculty & student apps)", () => {
  it("always includes department, division and batch", () => {
    expect(classLabel(sec)).toBe("CE · A · 2024");
    expect(classLabelLong(sec)).toBe("CE · A · 2024 · Sem 5");
  });
  it("prefers a server-provided label and never prints a raw id", () => {
    expect(classLabel({ classLabel: "IT · B · 2025" })).toBe("IT · B · 2025");
    expect(classLabel("64b000000000000000000000")).toBe("Class");
    expect(classLabel(null)).toBe("Class");
  });
  it("labels a teaching assignment as subject (code) · class", () => {
    expect(assignmentLabel({ subjectId: { subjectName: "Web Development", subjectCode: "CE501" }, sectionId: sec }))
      .toBe("Web Development (CE501) · CE · A · 2024 · Sem 5");
    expect(subjectLabel({ name: "Maths", code: "MA101" })).toBe("Maths (MA101)");
  });
  it("builds a filename-safe slug", () => {
    expect(classSlug(sec)).toBe("CE-A-2024");
  });
});
