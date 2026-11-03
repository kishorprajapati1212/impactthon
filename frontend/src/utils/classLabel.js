/**
 * One way to name a class in the faculty & student apps (mirrors
 * server/utils/classLabel.js):  "CE · A · 2024"  — department code,
 * division, batch year. Two divisions from different years share a letter,
 * so the batch is never optional.
 */
const SEP = " · ";

const dept = (section) => {
  const d = section?.departmentId;
  if (d && typeof d === "object") return d.code || d.name || null;
  return section?.departmentCode || null;
};

/** "CE · A · 2024" (falls back to whatever parts exist; never a raw id). */
export function classLabel(section) {
  if (!section || typeof section !== "object") return "Class";
  if (section.classLabel) return section.classLabel;
  const parts = [dept(section), section.name, section.batchYear].filter((x) => x != null && x !== "");
  return parts.join(SEP) || "Class";
}

/** "CE · A · 2024 · Sem 5" */
export function classLabelLong(section) {
  const base = classLabel(section);
  return section && section.semester != null ? `${base}${SEP}Sem ${section.semester}` : base;
}

/** "Web Development (CE501)" */
export function subjectLabel(subject) {
  if (!subject || typeof subject !== "object") return "Subject";
  const name = subject.subjectName || subject.name || "Subject";
  const code = subject.subjectCode || subject.code;
  return code ? `${name} (${code})` : name;
}

/** "Web Development (CE501) · CE · A · 2024 · Sem 5" — a teaching assignment. */
export function assignmentLabel(a) {
  if (!a) return "";
  return `${subjectLabel(a.subjectId)}${SEP}${classLabelLong(a.sectionId)}`;
}

/** Filename-safe "CE-A-2024". */
export function classSlug(section) {
  if (!section || typeof section !== "object") return "class";
  const slug = [dept(section), section.name, section.batchYear]
    .filter((x) => x != null && x !== "")
    .join("-")
    .replace(/[^A-Za-z0-9-]+/g, "");
  return slug || "class";
}
