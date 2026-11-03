import AuditLog from "../models/users/AuditLog.js";

/**
 * Audit trail helper — "who changed what, when" for every admin action.
 *
 * Why: a college admin console must be accountable. Before this helper only
 * faculty updates were logged (and with the raw request body, password
 * included). Now every create / update / deactivate / reactivate / delete on
 * departments, subjects, classes, faculty, students and teaching assignments
 * writes one row, with secrets stripped and a human sentence (`summary`) the
 * dashboard can show directly in "Recent activity".
 *
 * recordAudit NEVER throws — an audit failure must not break the request.
 */

const SECRET_KEYS = new Set(["password", "token", "confirmPassword", "oldPassword", "newPassword"]);

/** Remove secrets and unserialisable values from a change-set. Pure. */
export function sanitizeAuditChanges(changes) {
  if (!changes || typeof changes !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(changes)) {
    if (SECRET_KEYS.has(k)) continue;
    if (v === undefined || typeof v === "function") continue;
    out[k] = v && typeof v === "object" && v._id ? String(v._id) : v;
  }
  return out;
}

/**
 * Compare two plain objects and keep only keys whose value really changed.
 * Returns { changes, previous } ready to store. Pure.
 */
export function pickChanged(before = {}, after = {}, keys = Object.keys(after)) {
  const changes = {};
  const previous = {};
  for (const k of keys) {
    if (!(k in after)) continue;
    const a = after[k];
    const b = before[k];
    const norm = (x) => (x && typeof x === "object" && x._id ? String(x._id) : x instanceof Date ? x.toISOString() : x ?? null);
    if (norm(a) === norm(b)) continue;
    changes[k] = norm(a);
    previous[k] = norm(b);
  }
  return { changes, previous };
}

/** Human sentence for the activity feed. Pure. */
/** Model field → words an admin would use (the feed must never show raw keys). */
export const FIELD_WORDS = {
  mentorId: "mentor", sectionId: "class", departmentId: "department", subjectId: "subject", facultyId: "teacher",
  rollNumber: "roll number", phone: "phone", parentPhone: "parent phone", parentEmail: "parent email", parentName: "parent name",
  email: "email", name: "name", dateOfBirth: "date of birth", gender: "gender", address: "address", semester: "semester",
  batchYear: "batch", batchEndYear: "batch end year", academicYear: "academic year", credits: "credits", subjectCode: "subject code",
  subjectName: "subject name", code: "code", designation: "designation", employeeId: "employee ID", qualification: "qualification",
  specialization: "specialization", experienceYears: "experience", lifecycleStatus: "status", admissionYear: "admission year",
  totalStudents: "student count", hodId: "head of department", password: "password", avatarUrl: "photo", userId: "login",
  marksRemoved: "attendance marks removed", presentRemoved: "present marks removed", notPresentRemoved: "absent marks removed",
  leaveApplicationsUpdated: "leave applications updated", notificationsRemoved: "parent notifications removed", startTime: "start time", status: "status",
};
export const fieldWord = (k) => FIELD_WORDS[k] || String(k).replace(/Id$/, "").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();

export function describeAudit({ action, entityType, entityLabel, changes = {} }) {
  const noun = { DEPARTMENT: "department", SUBJECT: "subject", SECTION: "class", FACULTY: "faculty member", STUDENT: "student", ASSIGNMENT: "teaching assignment", LECTURE: "lecture" }[entityType] || "record";
  const label = entityLabel ? ` “${entityLabel}”` : "";
  const keys = Object.keys(changes).filter((k) => k !== "isActive").map(fieldWord);
  switch (action) {
    case "CREATE": return `Added ${noun}${label}`;
    case "DEACTIVATE": return `Deactivated ${noun}${label}`;
    case "REACTIVATE": return `Reactivated ${noun}${label}`;
    case "DELETE": return `Permanently deleted ${noun}${label}`;
    default: return keys.length ? `Updated ${noun}${label}: ${keys.slice(0, 4).join(", ")}${keys.length > 4 ? "…" : ""}` : `Updated ${noun}${label}`;
  }
}

/**
 * Write one audit row. Safe to call without awaiting.
 * @param {object} p
 * @param {import("express").Request} p.req   current request (for req.user)
 * @param {"DEPARTMENT"|"SUBJECT"|"SECTION"|"FACULTY"|"STUDENT"|"ASSIGNMENT"|"LECTURE"} p.entityType
 * @param {string|object} p.entityId
 * @param {"CREATE"|"UPDATE"|"DEACTIVATE"|"REACTIVATE"|"DELETE"} p.action
 * @param {string} [p.entityLabel]  e.g. "CSE2024001 · Rahul Verma" — survives deletion
 * @param {object} [p.changes]
 * @param {object} [p.previous]
 */
export async function recordAudit({ req, entityType, entityId, action, entityLabel = null, changes = {}, previous = {} }) {
  try {
    const changedBy = req?.user?._id;
    if (!changedBy || !entityId) return null;
    const clean = sanitizeAuditChanges(changes);
    return await AuditLog.create({
      entityType,
      entityId,
      changedBy,
      action,
      entityLabel: entityLabel ? String(entityLabel).slice(0, 200) : null,
      summary: describeAudit({ action, entityType, entityLabel, changes: clean }).slice(0, 300),
      changes: clean,
      previousValues: sanitizeAuditChanges(previous),
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "test") console.warn("[audit] skipped:", err?.message);
    return null;
  }
}
