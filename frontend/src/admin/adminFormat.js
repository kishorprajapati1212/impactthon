/**
 * Pure formatting helpers for the admin console (unit tested, no React).
 * Every label an admin reads in a table/drawer comes from here so wording
 * is consistent everywhere ("Studying", "Left the college", "2026–30"…).
 */

export const idOf = (v) => (v && typeof v === "object" ? String(v._id || v.id || "") : v ? String(v) : "");

export const dash = (v) => (v === null || v === undefined || v === "" ? "—" : v);

export function batchLabel(section) {
  if (!section) return "—";
  if (section.batchLabel) return section.batchLabel;
  const { batchYear, batchEndYear } = section;
  if (!batchYear) return "—";
  return batchEndYear && batchEndYear > batchYear ? `${batchYear}–${String(batchEndYear).slice(-2)}` : String(batchYear);
}

/** "CSE · A" — how a class is referred to across the console. */
export function classLabel(section, { withSemester = false } = {}) {
  if (!section || typeof section !== "object") return "—";
  const dept = section.departmentId?.code || section.departmentId?.name || "";
  const base = [dept, section.name].filter(Boolean).join(" · ") || "—";
  return withSemester && section.semester ? `${base} · Sem ${section.semester}` : base;
}

export const LIFECYCLE = {
  STUDYING: { label: "Studying", tone: "green" },
  COMPLETED: { label: "Completed course", tone: "blue" },
  LEFT: { label: "Left the college", tone: "amber" },
  TRANSFERRED: { label: "Transferred", tone: "amber" },
  SUSPENDED: { label: "Suspended", tone: "red" },
};

export function lifecycleOf(student) {
  const key = student?.lifecycleStatus || "STUDYING";
  const meta = LIFECYCLE[key] || LIFECYCLE.STUDYING;
  if (key === "STUDYING" && student && student.isActive === false) return { key: "INACTIVE", label: "Deactivated", tone: "slate" };
  return { key, ...meta };
}

export function statusOf(item) {
  return item?.isActive === false ? { label: "Inactive", tone: "slate" } : { label: "Active", tone: "green" };
}

export function personName(item) {
  return item?.userId?.name || item?.name || "Unnamed";
}

export function initials(name = "") {
  return String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
}

export function formatPhone(p) {
  if (!p) return "—";
  const s = String(p).replace(/\D/g, "");
  return s.length === 10 ? `${s.slice(0, 5)} ${s.slice(5)}` : String(p);
}

export function formatDate(d, opts = {}) {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", ...opts });
}

export function formatDateTime(d) {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function timeAgo(d, now = Date.now()) {
  if (!d) return "";
  const diff = Math.max(0, now - new Date(d).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const days = Math.floor(h / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export function mentorName(student) {
  const m = student?.mentorId;
  if (!m || typeof m !== "object") return null;
  return m.userId?.name || m.employeeId || null;
}

export const semesterOptions = Array.from({ length: 16 }, (_, i) => ({ value: i + 1, label: `Semester ${i + 1}` }));

export function percentTone(p) {
  if (p === null || p === undefined) return "slate";
  if (p >= 75) return "green";
  if (p >= 60) return "amber";
  return "red";
}

/** Raw model keys that older audit rows may still carry → plain words. */
const FIELD_WORDS = {
  mentorId: "mentor", sectionId: "class", departmentId: "department", subjectId: "subject", facultyId: "teacher",
  rollNumber: "roll number", parentPhone: "parent phone", parentEmail: "parent email", parentName: "parent name",
  dateOfBirth: "date of birth", batchYear: "batch", batchEndYear: "batch end year", academicYear: "academic year",
  subjectCode: "subject code", subjectName: "subject name", employeeId: "employee ID", experienceYears: "experience",
  lifecycleStatus: "status", admissionYear: "admission year", totalStudents: "student count", hodId: "head of department",
  avatarUrl: "photo", userId: "login",
};
export const fieldWord = (k) => FIELD_WORDS[k] || String(k).replace(/Id$/, "").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();

/** Translate "Updated student “X”: mentorId, phone" → "…: mentor, phone" (rows written before the server did this). */
export function humaniseSummary(summary = "") {
  const i = summary.indexOf(": ");
  if (i === -1) return summary;
  const head = summary.slice(0, i);
  const tail = summary.slice(i + 2).replace(/…$/, "");
  const words = tail.split(",").map((w) => fieldWord(w.trim())).filter(Boolean);
  return `${head}: ${words.join(", ")}${summary.endsWith("…") ? "…" : ""}`;
}

/** Turn an audit row into a feed line. */
export function auditLine(log) {
  const who = log?.changedBy?.name || "An admin";
  const raw = log?.summary || `${(log?.action || "updated").toLowerCase()} ${String(log?.entityType || "record").toLowerCase()}`;
  return { who, what: humaniseSummary(raw), when: log?.createdAt };
}
