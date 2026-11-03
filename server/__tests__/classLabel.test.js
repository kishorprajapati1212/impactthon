import { describe, it, expect } from "vitest";
import mongoose from "mongoose";
import { classLabel, classLabelLong, classSlug, subjectLabel } from "../utils/classLabel.js";
import { toObjectIds } from "../utils/ids.js";

const sec = { name: "A", batchYear: 2024, semester: 5, departmentId: { code: "CE", name: "Computer Engineering" } };

describe("classLabel helpers (one unambiguous class name everywhere)", () => {
  it("includes department code, division and batch", () => {
    expect(classLabel(sec)).toBe("CE · A · 2024");
    expect(classLabelLong(sec)).toBe("CE · A · 2024 · Sem 5");
  });
  it("distinguishes two classes that share a division letter", () => {
    expect(classLabel({ ...sec, batchYear: 2025 })).not.toBe(classLabel(sec));
  });
  it("falls back gracefully when parts are missing", () => {
    expect(classLabel({ name: "B" })).toBe("B");
    expect(classLabel(null)).toBe("Class");
    expect(classLabel({ name: "A", departmentId: "64b000000000000000000000" })).toBe("A");
  });
  it("builds a filename-safe slug", () => {
    expect(classSlug(sec)).toBe("CE-A-2024");
    expect(classSlug({ name: "A/B", batchYear: 2024, departmentId: { code: "C E" } })).toBe("CE-AB-2024");
  });
  it("formats subjects as name (code)", () => {
    expect(subjectLabel({ subjectName: "Web Development", subjectCode: "CE501" })).toBe("Web Development (CE501)");
    expect(subjectLabel({ subjectName: "Maths" })).toBe("Maths");
  });
});

describe("toObjectIds (aggregate() does not cast strings)", () => {
  it("turns strings, ObjectIds and populated docs into ObjectIds", () => {
    const id = new mongoose.Types.ObjectId();
    const out = toObjectIds([String(id), id, { _id: id }, "not-an-id", null]);
    expect(out).toHaveLength(3);
    out.forEach((v) => expect(v).toBeInstanceOf(mongoose.Types.ObjectId));
    expect(String(out[0])).toBe(String(id));
  });
});
