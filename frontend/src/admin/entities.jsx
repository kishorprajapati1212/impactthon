import { Building2, BookOpen, Users, UserCog, GraduationCap, Link2 } from "lucide-react";
import { Pill } from "./components/ui.jsx";
import { batchLabel, classLabel, dash, formatPhone, lifecycleOf, mentorName, personName, semesterOptions, statusOf, formatDate } from "./adminFormat.js";

/* ──────────────────────────────────────────────────────────────────────────
   ENTITY CONFIG — one object per record type the admin manages.
   Every column / field below maps to a REAL model field (see MODELS.md →
   "Admin console ↔ model field map"). Nothing here invents data.
   ────────────────────────────────────────────────────────────────────────── */

const PHONE = { value: /^[6-9]\d{9}$/, message: "Enter a 10-digit Indian mobile number" };
const EMAIL = { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email address" };
const thisYear = new Date().getFullYear();

const Title = ({ main, sub, mono }) => (
  <div className="min-w-0 max-w-[280px] 2xl:max-w-[360px]">
    <p className={`truncate font-medium text-slate-900 dark:text-slate-100 ${mono ? "font-mono text-[13px]" : ""}`}>{main}</p>
    {sub ? <p className="truncate text-xs text-slate-500">{sub}</p> : null}
  </div>
);
const Code = ({ children }) => <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{children}</span>;
const Num = ({ n }) => <span className={`tabular-nums ${!n ? "text-slate-400" : "font-medium"}`}>{n || 0}</span>;
const StatusCell = ({ item }) => { const s = statusOf(item); return <Pill tone={s.tone} dot>{s.label}</Pill>; };

const deptOptions = (ctx) => (ctx.departments || []).filter((d) => d.isActive !== false).map((d) => ({ value: d._id, label: `${d.name} (${d.code})` }));
const sectionOptions = (ctx) => (ctx.sections || []).filter((s) => s.isActive !== false).map((s) => ({ value: s._id, label: `${classLabel(s)} · Sem ${s.semester} · Batch ${batchLabel(s)}` }));
const facultyOptions = (ctx) => (ctx.faculty || []).filter((f) => f.isActive !== false).map((f) => ({ value: f._id, label: `${personName(f)} (${f.employeeId})` }));
const subjectOptions = (ctx) => (ctx.subjects || []).filter((s) => s.isActive !== false).map((s) => ({ value: s._id, label: `${s.subjectName} (${s.subjectCode}) · Sem ${s.semester}` }));
const refId = (v) => (v && typeof v === "object" ? v._id : v) || "";
const num = (v) => (v === "" || v === undefined || v === null ? undefined : Number(v));
const str = (v) => (v === undefined ? undefined : String(v ?? "").trim());

export const ENTITIES = {
  /* ── Departments ─────────────────────────────────────────────────── */
  departments: {
    key: "departments", singular: "Department", plural: "Departments", icon: Building2,
    description: "Academic departments such as Computer Science or Mechanical. Everything else — subjects, classes, faculty, students — belongs to a department.",
    api: { list: "/departments", create: "/department/create", update: (id) => `/department/${id}`, deactivate: (id) => `/department/${id}`, permanent: (id) => `/department/${id}/permanent` },
    listParams: { withCounts: 1 }, clientPaginated: true,
    searchPlaceholder: "Search by name or code…", searchKeys: (i) => [i.name, i.code, i.description],
    sort: [{ field: "name", label: "Name" }, { field: "code", label: "Code" }, { field: "createdAt", label: "Created" }],
    columns: [
      { key: "name", label: "Department", primary: true, sortField: "name", render: (i) => <Title main={i.name} sub={i.description || "No description added"} /> },
      { key: "code", label: "Code", sortField: "code", render: (i) => <Code>{i.code}</Code> },
      { key: "classes", label: "Classes", className: "text-center", render: (i) => <Num n={i.counts?.sections} /> },
      { key: "subjects", label: "Subjects", className: "text-center", render: (i) => <Num n={i.counts?.subjects} /> },
      { key: "faculty", label: "Faculty", className: "text-center", render: (i) => <Num n={i.counts?.faculty} /> },
      { key: "students", label: "Students", className: "text-center", render: (i) => <Num n={i.counts?.students} /> },
      { key: "status", label: "Status", render: (i) => <StatusCell item={i} /> },
    ],
    fields: () => [
      { key: "name", label: "Department name", type: "text", required: true, placeholder: "e.g. Computer Science & Engineering", span: 2 },
      { key: "code", label: "Short code", type: "text", required: true, placeholder: "e.g. CSE", help: "2–10 letters/digits. Saved in capitals.", pattern: { value: /^[A-Za-z0-9]{2,10}$/, message: "2–10 letters or digits, no spaces" } },
      { key: "isActive", label: "Status", type: "toggle", editOnly: true, toggleLabel: "Active (visible in all dropdowns)" },
      { key: "description", label: "Description", type: "textarea", placeholder: "Optional — what this department offers", help: "Shown under the name in this table." },
    ],
    toForm: (i) => ({ name: i.name, code: i.code, description: i.description || "", isActive: i.isActive !== false }),
    toPayload: (v) => ({ name: str(v.name), code: str(v.code)?.toUpperCase(), description: str(v.description) || null, ...(v.isActive !== undefined ? { isActive: !!v.isActive } : {}) }),
    titleOf: (i) => i.name, subtitleOf: (i) => `Code ${i.code}`,
  },

  /* ── Subjects ────────────────────────────────────────────────────── */
  subjects: {
    key: "subjects", singular: "Subject", plural: "Subjects", icon: BookOpen,
    description: "Subjects taught in each semester, with their code and credits. A teacher is connected to a subject under “Who teaches what”.",
    api: { list: "/subjects", create: "/subject/create", update: (id) => `/subject/${id}`, deactivate: (id) => `/subject/${id}`, permanent: (id) => `/subject/${id}/permanent` },
    listParams: { withCounts: 1 }, clientPaginated: true,
    searchPlaceholder: "Search by subject name or code…", searchKeys: (i) => [i.subjectName, i.subjectCode, i.departmentId?.name, i.departmentId?.code],
    filters: (ctx) => [
      { key: "department", label: "Department", options: deptOptions(ctx) },
      { key: "semester", label: "Semester", options: semesterOptions.map((o) => ({ value: String(o.value), label: o.label })) },
    ],
    sort: [{ field: "subjectName", label: "Name" }, { field: "subjectCode", label: "Code" }, { field: "semester", label: "Semester" }, { field: "credits", label: "Credits" }],
    columns: [
      { key: "name", label: "Subject", primary: true, sortField: "subjectName", render: (i) => <Title main={i.subjectName} sub={i.departmentId ? `${i.departmentId.name}` : "No department"} /> },
      { key: "code", label: "Code", sortField: "subjectCode", render: (i) => <Code>{i.subjectCode}</Code> },
      { key: "semester", label: "Semester", sortField: "semester", render: (i) => `Sem ${dash(i.semester)}` },
      { key: "credits", label: "Credits", sortField: "credits", className: "text-center", render: (i) => <Num n={i.credits} /> },
      { key: "teachers", label: "Teachers", className: "text-center", hideOn: "md", render: (i) => i.teacherCount ? <Num n={i.teacherCount} /> : <Pill tone="amber">None yet</Pill> },
      { key: "classes", label: "Classes", className: "text-center", hideOn: "lg", render: (i) => <Num n={i.classCount} /> },
      { key: "status", label: "Status", render: (i) => <StatusCell item={i} /> },
    ],
    fields: (ctx) => [
      { key: "subjectName", label: "Subject name", type: "text", required: true, placeholder: "e.g. Data Structures", span: 2 },
      { key: "subjectCode", label: "Subject code", type: "text", required: true, placeholder: "e.g. CS201", help: "Unique, 2–15 letters/digits.", pattern: { value: /^[A-Za-z0-9]{2,15}$/, message: "2–15 letters or digits" } },
      { key: "departmentId", label: "Department", type: "select", options: () => deptOptions(ctx), placeholder: "Select department" },
      { key: "semester", label: "Semester", type: "select", required: true, options: semesterOptions.map((o) => ({ value: String(o.value), label: o.label })), default: "1" },
      { key: "credits", label: "Credits", type: "number", required: true, min: 1, max: 15, default: "3" },
      { key: "isActive", label: "Status", type: "toggle", editOnly: true, toggleLabel: "Active (teachers can be assigned)" },
    ],
    toForm: (i) => ({ subjectName: i.subjectName, subjectCode: i.subjectCode, departmentId: refId(i.departmentId), semester: String(i.semester || 1), credits: String(i.credits ?? 3), isActive: i.isActive !== false }),
    toPayload: (v) => ({ subjectName: str(v.subjectName), subjectCode: str(v.subjectCode)?.toUpperCase(), departmentId: v.departmentId || null, semester: num(v.semester), credits: num(v.credits), ...(v.isActive !== undefined ? { isActive: !!v.isActive } : {}) }),
    titleOf: (i) => i.subjectName, subtitleOf: (i) => `${i.subjectCode} · Semester ${i.semester} · ${i.credits} credits`,
  },

  /* ── Classes (Section model) ─────────────────────────────────────── */
  classes: {
    key: "classes", singular: "Class", plural: "Classes", icon: Users,
    description: "A class (section) is the group of students who sit together — e.g. CSE · A, Semester 1, Batch 2026–30. Students and teaching assignments attach to a class.",
    api: { list: "/sections", create: "/section/create", update: (id) => `/section/${id}`, deactivate: (id) => `/section/${id}`, permanent: (id) => `/section/${id}/permanent` },
    clientPaginated: true,
    searchPlaceholder: "Search by class, department or batch…", searchKeys: (i) => [i.name, i.departmentId?.name, i.departmentId?.code, batchLabel(i), `sem ${i.semester}`],
    filters: (ctx) => [
      { key: "department", label: "Department", options: deptOptions(ctx) },
      { key: "semester", label: "Semester", options: semesterOptions.map((o) => ({ value: String(o.value), label: o.label })) },
    ],
    sort: [{ field: "batchYear", label: "Batch" }, { field: "semester", label: "Semester" }, { field: "name", label: "Name" }],
    columns: [
      { key: "class", label: "Class", primary: true, sortField: "name", render: (i) => <Title main={classLabel(i)} sub={i.departmentId?.name || "No department"} /> },
      { key: "semester", label: "Semester", sortField: "semester", render: (i) => `Semester ${dash(i.semester)}` },
      { key: "batch", label: "Batch", sortField: "batchYear", render: (i) => batchLabel(i) },
      { key: "students", label: "Students", className: "text-center", render: (i) => { const n = i.studentCount ?? i.totalStudents; return n ? <Num n={n} /> : <Pill tone="amber">Empty</Pill>; } },
      { key: "status", label: "Status", render: (i) => <StatusCell item={i} /> },
    ],
    fields: (ctx) => [
      { key: "departmentId", label: "Department", type: "select", required: true, options: () => deptOptions(ctx), placeholder: "Select department", span: 2 },
      { key: "name", label: "Class name", type: "text", required: true, placeholder: "e.g. A", help: "Just the class letter/name — the department is shown with it automatically.", pattern: { value: /^[A-Za-z0-9][A-Za-z0-9\s-]{0,49}$/, message: "Letters, digits, spaces or hyphen" } },
      { key: "semester", label: "Current semester", type: "select", required: true, options: semesterOptions.map((o) => ({ value: String(o.value), label: o.label })), default: "1" },
      { key: "batchYear", label: "Batch start year", type: "number", required: true, min: 2000, max: thisYear + 10, default: String(thisYear), help: "Year the batch joined." },
      { key: "batchEndYear", label: "Batch end year", type: "number", min: 2001, max: thisYear + 16, placeholder: `e.g. ${thisYear + 4}`, help: "Optional — expected graduation year." },
      { key: "isActive", label: "Status", type: "toggle", editOnly: true, toggleLabel: "Active (students can be added)" },
    ],
    toForm: (i) => ({ departmentId: refId(i.departmentId), name: i.name, semester: String(i.semester || 1), batchYear: String(i.batchYear || thisYear), batchEndYear: i.batchEndYear ? String(i.batchEndYear) : "", isActive: i.isActive !== false }),
    toPayload: (v) => ({ departmentId: v.departmentId, name: str(v.name), semester: num(v.semester), batchYear: num(v.batchYear), batchEndYear: v.batchEndYear ? Number(v.batchEndYear) : null, ...(v.isActive !== undefined ? { isActive: !!v.isActive } : {}) }),
    titleOf: (i) => `Class ${classLabel(i)}`, subtitleOf: (i) => `Semester ${i.semester} · Batch ${batchLabel(i)}`,
  },

  /* ── Faculty ─────────────────────────────────────────────────────── */
  faculty: {
    key: "faculty", singular: "Faculty member", plural: "Faculty", pluralNoun: "faculty members", icon: UserCog,
    description: "Teachers and mentors. A faculty member takes attendance for the classes assigned to them and approves leave / logins for the students they mentor.",
    api: { list: "/faculty", create: "/faculty/create", update: (id) => `/faculty/${id}`, deactivate: (id) => `/faculty/${id}`, permanent: (id) => `/faculty/${id}/permanent` },
    serverSearch: true,
    searchPlaceholder: "Search by name, email or employee ID…",
    filters: (ctx) => [{ key: "department", label: "Department", options: deptOptions(ctx) }],
    sort: [{ field: "createdAt", label: "Newest" }, { field: "employeeId", label: "Employee ID" }, { field: "designation", label: "Designation" }],
    columns: [
      { key: "name", label: "Faculty member", primary: true, render: (i) => <Title main={personName(i)} sub={i.userId?.email} /> },
      { key: "emp", label: "Employee ID", sortField: "employeeId", className: "whitespace-nowrap", render: (i) => <Code>{i.employeeId}</Code> },
      { key: "dept", label: "Department", render: (i) => dash(i.departmentId?.name) },
      { key: "desig", label: "Designation", sortField: "designation", hideOn: "md", render: (i) => dash(i.designation) },
      { key: "phone", label: "Phone", className: "whitespace-nowrap", render: (i) => <span className="tabular-nums">{formatPhone(i.phone)}</span> },
      { key: "status", label: "Status", render: (i) => <StatusCell item={i} /> },
    ],
    fields: (ctx) => [
      { key: "name", label: "Full name", type: "text", required: true, placeholder: "e.g. Dr. Priya Sharma", pattern: { value: /^[A-Za-z][A-Za-z\s.'-]{1,99}$/, message: "Letters, spaces and dots only" } },
      { key: "employeeId", label: "Employee ID", type: "text", required: true, readOnlyOnEdit: true, placeholder: "e.g. FAC007", pattern: { value: /^[A-Za-z0-9-]{2,30}$/, message: "2–30 letters/digits" } },
      { key: "email", label: "Email (login)", type: "email", required: true, placeholder: "name@college.edu", pattern: EMAIL },
      { key: "password", label: "Temporary password", type: "password", required: true, createOnly: true, minLength: 6, help: "Share it with the teacher; they can change it later." },
      { key: "departmentId", label: "Department", type: "select", options: () => deptOptions(ctx), placeholder: "Select department" },
      { key: "designation", label: "Designation", type: "select", options: ["Professor", "Associate Professor", "Assistant Professor", "Lecturer", "Lab Instructor", "Head of Department", "Visiting Faculty"].map((d) => ({ value: d, label: d })), default: "Assistant Professor", placeholder: "Select designation" },
      { key: "phone", label: "Mobile number", type: "tel", placeholder: "10-digit mobile", pattern: PHONE },
      { key: "joiningYear", label: "Joining year", type: "number", min: 1970, max: thisYear, placeholder: String(thisYear) },
      { key: "specialization", label: "Specialisation", type: "text", placeholder: "e.g. Databases, Machine Learning", span: 2 },
      { key: "isActive", label: "Status", type: "toggle", editOnly: true, toggleLabel: "Active (can log in and take attendance)" },
    ],
    toForm: (i) => ({ name: personName(i), employeeId: i.employeeId, email: i.userId?.email || "", departmentId: refId(i.departmentId), designation: i.designation || "", phone: i.phone || "", joiningYear: i.joiningYear ? String(i.joiningYear) : "", specialization: i.specialization || "", isActive: i.isActive !== false }),
    toPayload: (v, mode) => ({ name: str(v.name), email: str(v.email)?.toLowerCase(), ...(mode === "create" ? { employeeId: str(v.employeeId), password: v.password } : {}), departmentId: v.departmentId || null, designation: v.designation || undefined, phone: str(v.phone) || null, joiningYear: num(v.joiningYear), specialization: str(v.specialization) || null, ...(v.isActive !== undefined ? { isActive: !!v.isActive } : {}) }),
    titleOf: (i) => personName(i), subtitleOf: (i) => `${i.employeeId} · ${i.designation || "Faculty"}${i.departmentId?.name ? " · " + i.departmentId.name : ""}`,
  },

  /* ── Students ────────────────────────────────────────────────────── */
  students: {
    key: "students", singular: "Student", plural: "Students", icon: GraduationCap,
    description: "Every student, the class they sit in, their mentor and how to contact them or their parent. Use “Student status” when someone completes the course or leaves — nothing is deleted.",
    api: { list: "/students", create: "/student/create", update: (id) => `/student/${id}`, deactivate: (id) => `/student/${id}`, permanent: (id) => `/student/${id}/permanent`, lifecycle: (id) => `/student/${id}/lifecycle` },
    serverSearch: true,
    searchPlaceholder: "Search by name, roll number, email or phone…",
    filters: (ctx) => [
      { key: "department", label: "Department", options: deptOptions(ctx) },
      { key: "section", label: "Class", options: [{ value: "none", label: "Not in any class" }, ...sectionOptions(ctx)] },
      { key: "semester", label: "Semester", options: semesterOptions.map((o) => ({ value: String(o.value), label: o.label })) },
      { key: "mentor", label: "Mentor", options: [{ value: "none", label: "No mentor assigned" }, ...facultyOptions(ctx)] },
    ],
    sort: [{ field: "rollNumber", label: "Roll number" }, { field: "semester", label: "Semester" }, { field: "enrollmentYear", label: "Enrolled" }, { field: "createdAt", label: "Newest" }],
    columns: [
      { key: "name", label: "Student", primary: true, render: (i) => <Title main={personName(i)} sub={i.userId?.email} /> },
      { key: "roll", label: "Roll number", sortField: "rollNumber", className: "whitespace-nowrap", render: (i) => <Code>{i.rollNumber}</Code> },
      { key: "class", label: "Class", render: (i) => <Title main={i.sectionId ? classLabel(i.sectionId) : <span className="text-amber-600">No class</span>} sub={`Sem ${dash(i.semester)}${i.sectionId?.batchYear ? " · Batch " + batchLabel(i.sectionId) : i.departmentId?.code ? " · " + i.departmentId.code : ""}`} /> },
      { key: "mentor", label: "Mentor", render: (i) => mentorName(i) || <Pill tone="amber">Not assigned</Pill> },
      { key: "phone", label: "Contact", className: "whitespace-nowrap", render: (i) => (
          <div className="text-[13px] leading-5 tabular-nums">
            <p>{i.phone ? formatPhone(i.phone) : <span className="text-slate-400">No phone</span>}</p>
            <p className="text-xs text-slate-500">Parent: {i.parentPhone ? formatPhone(i.parentPhone) : "—"}</p>
          </div>
        ) },
      { key: "status", label: "Status", className: "whitespace-nowrap", render: (i) => { const l = lifecycleOf(i); return <Pill tone={l.tone} dot>{l.label}</Pill>; } },
    ],
    fields: (ctx) => [
      { key: "name", label: "Full name", type: "text", required: true, placeholder: "e.g. Rahul Verma", pattern: { value: /^[A-Za-z][A-Za-z\s.'-]{1,99}$/, message: "Letters, spaces and dots only" } },
      { key: "rollNumber", label: "Roll number", type: "text", required: true, placeholder: "e.g. CSE2026001", help: "Unique. Saved in capitals.", pattern: { value: /^[A-Za-z0-9/-]{3,30}$/, message: "3–30 letters/digits" } },
      { key: "email", label: "Email (login)", type: "email", required: true, placeholder: "roll@college.edu", pattern: EMAIL },
      { key: "password", label: "Temporary password", type: "password", required: true, createOnly: true, minLength: 6, help: "Share it with the student." },
      { key: "departmentId", label: "Department", type: "select", options: () => deptOptions(ctx), placeholder: "Select department" },
      { key: "sectionId", label: "Class", type: "select", options: () => sectionOptions(ctx), placeholder: "Select class", help: "Without a class the student cannot be marked present." },
      { key: "semester", label: "Current semester", type: "select", required: true, options: semesterOptions.map((o) => ({ value: String(o.value), label: o.label })), default: "1" },
      { key: "enrollmentYear", label: "Enrollment year", type: "number", min: 2000, max: thisYear + 1, default: String(thisYear) },
      { key: "mentorId", label: "Mentor (faculty)", type: "select", options: () => facultyOptions(ctx), placeholder: "No mentor yet", help: "Approves this student's leave and new-device logins." },
      { key: "phone", label: "Student mobile", type: "tel", placeholder: "10-digit mobile", pattern: PHONE },
      { key: "parentPhone", label: "Parent / guardian mobile", type: "tel", placeholder: "10-digit mobile", pattern: PHONE, help: "Used for absence alerts." },
      { key: "isActive", label: "Login", type: "toggle", editOnly: true, toggleLabel: "Active (student can log in)" },
    ],
    toForm: (i) => ({ name: personName(i), rollNumber: i.rollNumber, email: i.userId?.email || "", departmentId: refId(i.departmentId), sectionId: refId(i.sectionId), semester: String(i.semester || 1), enrollmentYear: i.enrollmentYear ? String(i.enrollmentYear) : "", mentorId: refId(i.mentorId), phone: i.phone || "", parentPhone: i.parentPhone || "", isActive: i.isActive !== false }),
    toPayload: (v, mode) => ({ name: str(v.name), email: str(v.email)?.toLowerCase(), rollNumber: str(v.rollNumber)?.toUpperCase(), ...(mode === "create" ? { password: v.password } : {}), departmentId: v.departmentId || null, sectionId: v.sectionId || null, mentorId: v.mentorId || null, semester: num(v.semester), enrollmentYear: num(v.enrollmentYear), phone: str(v.phone) || null, parentPhone: str(v.parentPhone) || null, ...(v.isActive !== undefined ? { isActive: !!v.isActive } : {}) }),
    titleOf: (i) => personName(i), subtitleOf: (i) => `${i.rollNumber}${i.sectionId ? " · " + classLabel(i.sectionId) : ""} · Semester ${i.semester}`,
  },

  /* ── Teaching assignments (FacultySubjectSection model) ──────────── */
  teaching: {
    key: "teaching", singular: "Teaching assignment", plural: "Who teaches what", pluralNoun: "teaching assignments", icon: Link2,
    description: "Connect a teacher to a subject for one class. A teacher can only start a lecture (and students can only be marked present) for the subject–class pairs listed here.",
    api: { list: "/assignments", create: "/faculty-subject-section", update: (id) => `/assignment/${id}`, deactivate: (id) => `/assignment/${id}`, permanent: (id) => `/assignment/${id}/permanent` },
    clientPaginated: true, showInactiveParam: "showInactive",
    searchPlaceholder: "Search by teacher, subject or class…", searchKeys: (i) => [i.facultyId?.userId?.name, i.facultyId?.employeeId, i.subjectId?.subjectName, i.subjectId?.subjectCode, i.sectionId?.name, i.sectionId?.departmentId?.code, i.sectionId?.departmentId?.name],
    filters: (ctx) => [
      { key: "faculty", label: "Teacher", options: facultyOptions(ctx) },
      { key: "subject", label: "Subject", options: subjectOptions(ctx) },
      { key: "section", label: "Class", options: sectionOptions(ctx) },
    ],
    sort: [{ field: "academicYear", label: "Academic year" }, { field: "semester", label: "Semester" }, { field: "createdAt", label: "Newest" }],
    columns: [
      { key: "faculty", label: "Teacher", primary: true, render: (i) => <Title main={i.facultyId?.userId?.name || i.facultyId?.employeeId || "Unknown"} sub={i.facultyId?.employeeId} /> },
      { key: "subject", label: "Teaches", render: (i) => <Title main={i.subjectId?.subjectName || "—"} sub={i.subjectId?.subjectCode} /> },
      { key: "class", label: "To class", render: (i) => <Title main={classLabel(i.sectionId)} sub={i.sectionId ? `Batch ${batchLabel(i.sectionId)}` : ""} /> },
      { key: "term", label: "Term", sortField: "academicYear", render: (i) => `${i.academicYear || "—"} · Sem ${dash(i.semester)}` },
      { key: "status", label: "Status", render: (i) => <StatusCell item={i} /> },
    ],
    fields: (ctx) => [
      { key: "facultyId", label: "Teacher", type: "select", required: true, options: () => facultyOptions(ctx), placeholder: "Select teacher", span: 2 },
      { key: "subjectId", label: "Subject", type: "select", required: true, options: () => subjectOptions(ctx), placeholder: "Select subject", span: 2 },
      { key: "sectionId", label: "Class", type: "select", required: true, options: () => sectionOptions(ctx), placeholder: "Select class", span: 2, help: "The semester is taken from the class automatically unless you set it below." },
      { key: "academicYear", label: "Academic year", type: "number", min: 2000, max: thisYear + 2, default: String(thisYear) },
      { key: "semester", label: "Semester", type: "select", options: semesterOptions.map((o) => ({ value: String(o.value), label: o.label })), placeholder: "Same as the class" },
      { key: "isActive", label: "Status", type: "toggle", editOnly: true, toggleLabel: "Active (teacher can start lectures)" },
    ],
    toForm: (i) => ({ facultyId: refId(i.facultyId), subjectId: refId(i.subjectId), sectionId: refId(i.sectionId), academicYear: String(i.academicYear || thisYear), semester: i.semester ? String(i.semester) : "", isActive: i.isActive !== false }),
    toPayload: (v) => ({ facultyId: v.facultyId, subjectId: v.subjectId, sectionId: v.sectionId, academicYear: num(v.academicYear), semester: num(v.semester), ...(v.isActive !== undefined ? { isActive: !!v.isActive } : {}) }),
    titleOf: (i) => `${i.facultyId?.userId?.name || "Teacher"} → ${i.subjectId?.subjectCode || "subject"}`, subtitleOf: (i) => `${i.subjectId?.subjectName || ""} · ${classLabel(i.sectionId)} · ${i.academicYear} Sem ${i.semester}`,
  },
};

export const ENTITY_KEYS = Object.keys(ENTITIES);
