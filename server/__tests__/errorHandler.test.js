import { describe, it, expect, vi } from "vitest";
import errorHandler from "../middleware/errorHandler.js";
function run(err, statusCode = 200) {
  const res = { statusCode, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
  vi.spyOn(console, "error").mockImplementation(() => {});
  errorHandler(err, { method: "GET", originalUrl: "/x" }, res, () => {});
  console.error.mockRestore();
  return res;
}
describe("errorHandler - no raw DB errors to users", () => {
  it("duplicate key -> short human message, no E11000", () => {
    const r = run({ code: 11000, keyValue: { email: "a@b.c" }, message: "E11000 duplicate key error collection: users index" });
    expect(r.statusCode).toBe(409); expect(r.body.code).toBe("ALREADY_EXISTS");
    expect(r.body.message).not.toMatch(/E11000|mongo/i); expect(r.body.stack).toBeUndefined();
  });
  it("CastError -> friendly not-found, no hex dump", () => {
    const r = run({ name: "CastError", value: "xyz", message: 'Cast to ObjectId failed for value "xyz"' });
    expect(r.statusCode).toBe(400); expect(r.body.message).not.toMatch(/ObjectId|Cast/);
  });
  it("unknown 500 -> generic message, never err.message/stack", () => {
    const r = run(new Error("MongoServerError: connection pool exploded at 10.0.0.5"));
    expect(r.statusCode).toBe(500); expect(r.body.message).not.toMatch(/Mongo|10\.0\.0/); expect(r.body.stack).toBeUndefined();
  });
  it("ValidationError -> fill-required style message", () => {
    const r = run({ name: "ValidationError", errors: { name: { kind: "required", message: "Path `name` is required." } } });
    expect(r.statusCode).toBe(400); expect(r.body.message).not.toMatch(/Path/);
  });
});
