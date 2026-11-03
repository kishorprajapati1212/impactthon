/**
 * One way to name a class everywhere (API, exports, filenames).
 *
 * A "class" is a Section document. Two classes can share the same division
 * letter (e.g. CE · A · 2024 and CE · A · 2025), so a label is only
 * unambiguous when it carries the department code AND the batch year:
 *
 *   classLabel(section)      → "CE · A · 2024"
 *   classLabelLong(section)  → "CE · A · 2024 · Sem 5"
 *   classSlug(section)       → "CE-A-2024"   (safe for filenames)
 *
 * `section.departmentId` may be populated ({ code, name }) or a bare id;
 * missing parts are simply skipped so the helper never throws.
 */

const SEP = " · ";

function deptCode(section) {
  const d = section?.departmentId;
  if (d && typeof d === "object") return d.code || d.name || null;
  return section?.departmentCode || null;
}

export function classParts(section) {
  if (!section) return { department: null, name: null, batchYear: null, semester: null };
  return {
    department: deptCode(section),
    name: section.name || null,
    batchYear: section.batchYear ?? null,
    semester: section.semester ?? null,
  };
}

export function classLabel(section) {
  const p = classParts(section);
  const label = [p.department, p.name, p.batchYear].filter((x) => x != null && x !== "").join(SEP);
  return label || "Class";
}

export function classLabelLong(section) {
  const p = classParts(section);
  const base = classLabel(section);
  return p.semester != null ? `${base}${SEP}Sem ${p.semester}` : base;
}

export function classSlug(section) {
  const p = classParts(section);
  const slug = [p.department, p.name, p.batchYear]
    .filter((x) => x != null && x !== "")
    .join("-")
    .replace(/[^A-Za-z0-9-]+/g, "");
  return slug || "class";
}

/** "Web Development (CE501)" - subject display used next to a class label. */
export function subjectLabel(subject) {
  if (!subject) return "Subject";
  const name = subject.subjectName || "Subject";
  return subject.subjectCode ? `${name} (${subject.subjectCode})` : name;
}
