import { LayoutDashboard, Building2, BookOpen, Users, UserCog, GraduationCap, Link2, Radio, Smartphone, Grid3X3, BarChart3, CalendarClock } from "lucide-react";

/**
 * Sidebar navigation — plain words, grouped the way an admin thinks:
 * "set up the college" → "manage people" → "what is happening now" → "reports".
 * `section` is the URL value (?section=students) so every page is linkable.
 */
export const NAV = [
  { group: "Overview", items: [
    { section: "overview", label: "Dashboard", icon: LayoutDashboard, title: "Dashboard", hint: "Today at a glance — what needs attention and what is happening now" },
  ] },
  { group: "Academic setup", items: [
    { section: "departments", label: "Departments", icon: Building2, entity: "departments" },
    { section: "subjects", label: "Subjects", icon: BookOpen, entity: "subjects" },
    { section: "classes", label: "Classes", icon: Users, entity: "classes" },
    { section: "teaching", label: "Who teaches what", icon: Link2, entity: "teaching" },
  ] },
  { group: "People", items: [
    { section: "faculty", label: "Faculty", icon: UserCog, entity: "faculty" },
    { section: "students", label: "Students", icon: GraduationCap, entity: "students" },
  ] },
  { group: "Happening now", items: [
    { section: "live", label: "Lectures running now", icon: Radio, title: "Lectures running now", hint: "Live attendance sessions across all teachers. End a stuck session from here." },
    { section: "lectures", label: "Lectures", icon: CalendarClock, title: "Lectures", hint: "Every attendance session, running or finished. Delete one that was started by mistake.", filterKeys: ["faculty", "section", "subject", "status"] },
    { section: "approvals", label: "Login approvals", icon: Smartphone, title: "Student login approvals", hint: "Students waiting for a new-device login to be approved. Mentors usually do this; you can step in." },
  ] },
  { group: "Reports", items: [
    { section: "attendance-report", label: "Attendance report", icon: BarChart3, title: "Attendance report", hint: "Overall attendance, and which classes, students, subjects and teachers are below 75%." },
    { section: "overview-matrix", label: "Teaching & mentor map", icon: Grid3X3, title: "Teaching & mentor map", hint: "Which teacher takes which subject for which class, and which mentor looks after which students." },
  ] },
];

export const NAV_ITEMS = NAV.flatMap((g) => g.items);
/** Old URLs keep working (bookmarks, docs). */
export const SECTION_ALIASES = { analytics: "attendance-report", dashboard: "overview" };
export const findNav = (section) => NAV_ITEMS.find((i) => i.section === (SECTION_ALIASES[section] || section)) || NAV_ITEMS[0];

/* ------------------------------------------------------------------ */
/* URL helpers                                                          */
/* ------------------------------------------------------------------ */

/**
 * Query keys owned by the shell. They must never be read back as a page
 * filter — otherwise `?section=students` (the page selector) is sent to the
 * API as the Students page's *class* filter (`GET /students?section=students`
 * → 400 "record not found" and an empty table). That exact bug shipped once.
 */
export const NAV_KEYS = new Set(["section", "new", "q"]);

/**
 * Entity filter key ↔ URL key. The API calls the class filter `section`
 * (it is the Section model), but `?section=` already selects the page, so the
 * class filter travels in the URL as `class`.
 */
export const FILTER_URL_KEYS = { section: "class" };
const URL_FILTER_KEYS = Object.fromEntries(Object.entries(FILTER_URL_KEYS).map(([k, v]) => [v, k]));

/** Build the query string for `go(section, extra)`; `extra` uses entity filter keys. */
export function buildNavParams(next, extra = {}) {
  const p = new URLSearchParams();
  p.set("section", next);
  Object.entries(extra).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    const urlKey = FILTER_URL_KEYS[k] || k;
    if (urlKey === "section") return; // the page selector is set above and never overwritten
    p.set(urlKey, String(v));
  });
  return p;
}

/**
 * Read page filters back from the URL. Only keys the page actually filters by
 * are returned (as entity filter keys), and shell keys are always ignored.
 */
export function filtersFromParams(params, filterKeys = []) {
  const allowed = new Set(filterKeys);
  const out = {};
  params.forEach((v, urlKey) => {
    if (!v || NAV_KEYS.has(urlKey)) return;
    const key = URL_FILTER_KEYS[urlKey] || urlKey;
    if (allowed.has(key)) out[key] = v;
  });
  return out;
}
