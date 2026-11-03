import { describe, it, expect } from "vitest";
import { resolveApiBase, joinApiPath } from "../utils/axios.js";

/**
 * Same-origin API contract: without VITE_API_URL the app calls `/api/...` on
 * its own origin (Vite proxy in dev, nginx in Docker) — no CORS anywhere,
 * including Project IDX / Firebase Studio previews.
 */
describe("API base resolution", () => {
  it("defaults to the same-origin /api prefix", () => {
    expect(resolveApiBase()).toBe("/api");
  });
  it("keeps legacy root routes under the prefix and does not double the /api of API-native routes", () => {
    expect(joinApiPath("/api", "/students")).toBe("/students");                 // → /api/students
    expect(joinApiPath("/api", "/api/report/admin/overview")).toBe("/report/admin/overview"); // → /api/report/…
    expect(joinApiPath("/api", "/api")).toBe("/");
  });
  it("leaves paths untouched when an absolute API host is configured", () => {
    expect(joinApiPath("https://api.example.com", "/api/report/x")).toBe("/api/report/x");
    expect(joinApiPath("https://api.example.com", "/students")).toBe("/students");
  });
});
