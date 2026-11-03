import { describe, it, expect } from "vitest";
import { buildNavParams, filtersFromParams, NAV_KEYS, FILTER_URL_KEYS, findNav } from "../admin/nav.js";

describe("admin nav URL helpers", () => {
  it("maps the entity class filter (section) to ?class= so it never collides with the page selector", () => {
    const p = buildNavParams("students", { section: "none", mentor: "f1" });
    expect(p.get("section")).toBe("students");
    expect(p.get("class")).toBe("none");
    expect(p.get("mentor")).toBe("f1");
    expect(FILTER_URL_KEYS.section).toBe("class");
  });
  it("never lets an extra overwrite the page selector and drops empty values", () => {
    const p = buildNavParams("teaching", { section: "", faculty: null, subject: undefined, q: "CE2024" });
    expect(p.get("section")).toBe("teaching");
    expect(p.has("class")).toBe(false);
    expect(p.has("faculty")).toBe(false);
    expect(p.get("q")).toBe("CE2024");
  });
  it("reads only real page filters back, ignoring shell keys", () => {
    const params = new URLSearchParams("section=students&class=s1&mentor=none&new=1&q=abc&bogus=1");
    expect(filtersFromParams(params, ["section", "mentor", "department"])).toEqual({ section: "s1", mentor: "none" });
    expect(filtersFromParams(new URLSearchParams("section=teaching"), ["section", "faculty"])).toEqual({});
    NAV_KEYS.forEach((k) => expect(filtersFromParams(new URLSearchParams(`${k}=x`), [k])).toEqual({}));
  });
  it("round-trips: what go() writes, the page reads back", () => {
    const p = buildNavParams("students", { section: "s1", department: "d1" });
    expect(filtersFromParams(p, ["section", "department", "mentor"])).toEqual({ section: "s1", department: "d1" });
  });
  it("findNav resolves aliases and unknown sections safely", () => {
    expect(findNav("analytics").section).toBe("attendance-report");
    expect(findNav("nope").section).toBe("overview");
  });
});
