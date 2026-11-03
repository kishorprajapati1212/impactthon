import { describe, it, expect } from "vitest";
import { cleanMessage } from "../utils/notify.js";

describe("custom notify - messages are always short & human", () => {
  it("strips HTML and collapses whitespace", () => {
    expect(cleanMessage("<b>Saved</b>   \n successfully")).toBe("Saved successfully");
  });
  it("cuts huge library strings to <=180 chars", () => {
    const out = cleanMessage("x".repeat(600));
    expect(out.length).toBeLessThanOrEqual(180);
  });
  it("never shows raw DB/library text", () => {
    expect(cleanMessage("E11000 duplicate key error collection: users")).toBe("Something went wrong. Please try again.");
    expect(cleanMessage('CastError: Cast to ObjectId failed for value "x" at path "_id"')).toBe("Something went wrong. Please try again.");
  });
  it("drops JSON dumps, keeps normal sentences", () => {
    expect(cleanMessage('{"code":11000,"keyValue":{"email":"a@b.c"}}')).toBe("Something went wrong. Please try again.");
    expect(cleanMessage("Attendance marked successfully!")).toBe("Attendance marked successfully!");
  });
  it("falls back on empty input", () => {
    expect(cleanMessage("")).toBe("Something went wrong. Please try again.");
    expect(cleanMessage(null)).toBe("Something went wrong. Please try again.");
  });
});
