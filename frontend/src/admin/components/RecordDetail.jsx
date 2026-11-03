import { useEffect, useState } from "react";
import { Pencil, Power, Trash2, GraduationCap, History, Phone, Mail } from "lucide-react";
import api from "../../utils/api.js";
import { Drawer, Button, Pill, KV, Stat, Spinner } from "./ui.jsx";
import { batchLabel, classLabel, formatDate, formatDateTime, formatPhone, lifecycleOf, personName, statusOf, percentTone, auditLine, timeAgo, mentorName } from "../adminFormat.js";

const AUDIT_TYPE = { departments: "DEPARTMENT", subjects: "SUBJECT", classes: "SECTION", faculty: "FACULTY", students: "STUDENT", teaching: "ASSIGNMENT" };
const pick = (r) => (r.status === "fulfilled" ? r.value?.data?.data ?? r.value?.data : null) || null;

/** Everything the admin needs to know about ONE record, with related data. */
async function loadRelated(entityKey, item) {
  const id = item._id;
  const history = api.get(`/api/audit/${AUDIT_TYPE[entityKey]}/${id}?limit=20`);
  switch (entityKey) {
    case "departments": {
      const [sections, subjects, faculty, students, h] = await Promise.allSettled([
        api.get(`/sections?department=${id}&showInactive=true`), api.get(`/subjects?department=${id}&showInactive=true`),
        api.get(`/faculty?department=${id}&limit=500`), api.get(`/students?department=${id}&limit=500`), history,
      ]);
      return { sections: pick(sections) || [], subjects: pick(subjects) || [], faculty: pick(faculty) || [], students: pick(students) || [], history: pick(h) || [] };
    }
    case "subjects": {
      const [assignments, h] = await Promise.allSettled([api.get(`/assignments?subject=${id}&showInactive=true`), history]);
      return { assignments: pick(assignments) || [], history: pick(h) || [] };
    }
    case "classes": {
      const [students, assignments, h] = await Promise.allSettled([api.get(`/students?section=${id}&limit=500&showInactive=true`), api.get(`/assignments?section=${id}&showInactive=true`), history]);
      return { students: pick(students) || [], assignments: pick(assignments) || [], history: pick(h) || [] };
    }
    case "faculty": {
      const [assignments, mentees, h] = await Promise.allSettled([api.get(`/assignments?faculty=${id}&showInactive=true`), api.get(`/students?mentor=${id}&limit=500`), history]);
      return { assignments: pick(assignments) || [], mentees: pick(mentees) || [], history: pick(h) || [] };
    }
    case "students": {
      const [detail, h] = await Promise.allSettled([api.get(`/api/leave/mentor/mentees/${id}/detail`), history]);
      return { detail: pick(detail), history: pick(h) || [] };
    }
    default: {
      const [h] = await Promise.allSettled([history]);
      return { history: pick(h) || [] };
    }
  }
}

const Section = ({ title, count, children }) => (
  <section className="mt-6 first:mt-0">
    <h4 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}{count !== undefined && <span className="rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{count}</span>}</h4>
    {children}
  </section>
);
const List = ({ items, render, empty = "Nothing yet." }) => items?.length ? (
  <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">{items.map((it, i) => <li key={it._id || it.id || i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">{render(it)}</li>)}</ul>
) : <p className="rounded-md border border-dashed border-slate-200 px-3 py-3 text-[13px] text-slate-500 dark:border-slate-800">{empty}</p>;
const Dl = ({ children }) => <dl className="divide-y divide-slate-100 rounded-md border border-slate-200 px-3 dark:divide-slate-800 dark:border-slate-800">{children}</dl>;
const Contact = ({ icon: Icon, value, href }) => value ? <a href={href} className="inline-flex items-center gap-1.5 text-blue-700 hover:underline dark:text-blue-400"><Icon size={13} />{value}</a> : <span className="text-slate-400">-</span>;

function HistoryList({ history }) {
  return (
    <Section title="Change history" count={history?.length || 0}>
      {history?.length ? (
        <ol className="space-y-2">
          {history.map((h) => { const l = auditLine(h); return (
            <li key={h._id} className="flex gap-2.5 text-[13px]">
              <History size={14} className="mt-0.5 shrink-0 text-slate-400" />
              <div className="min-w-0"><p className="text-slate-800 dark:text-slate-100">{l.what}</p><p className="text-xs text-slate-500">{l.who} · {formatDateTime(l.when)} ({timeAgo(l.when)})</p></div>
            </li>); })}
        </ol>
      ) : <p className="text-[13px] text-slate-500">No changes recorded yet. History starts from now.</p>}
    </Section>
  );
}

function Body({ entityKey, item, related }) {
  if (!related) return <Spinner label="Loading details…" />;
  switch (entityKey) {
    case "departments": {
      const active = (xs) => xs.filter((x) => x.isActive !== false);
      return (<>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Classes" value={active(related.sections).length} /><Stat label="Subjects" value={active(related.subjects).length} /><Stat label="Faculty" value={active(related.faculty).length} /><Stat label="Students" value={related.students.length} />
        </div>
        <Section title="About"><Dl><KV label="Code" value={item.code} mono /><KV label="Description" value={item.description} /><KV label="Created" value={formatDate(item.createdAt)} /><KV label="Status" value={<Pill tone={statusOf(item).tone}>{statusOf(item).label}</Pill>} /></Dl></Section>
        <Section title="Classes in this department" count={related.sections.length}><List items={related.sections} render={(s) => <><span>{classLabel(s)} · Sem {s.semester} · Batch {batchLabel(s)}</span><span className="text-xs text-slate-500">{s.studentCount ?? s.totalStudents ?? 0} students</span></>} empty="No classes yet. Create one under Classes." /></Section>
        <Section title="Subjects" count={related.subjects.length}><List items={related.subjects} render={(s) => <><span>{s.subjectName} <span className="text-slate-400">({s.subjectCode})</span></span><span className="text-xs text-slate-500">Sem {s.semester}</span></>} empty="No subjects yet." /></Section>
        <Section title="Faculty" count={related.faculty.length}><List items={related.faculty} render={(f) => <><span>{personName(f)}</span><span className="text-xs text-slate-500">{f.designation}</span></>} empty="No faculty in this department." /></Section>
        <HistoryList history={related.history} />
      </>);
    }
    case "subjects": {
      const act = related.assignments.filter((a) => a.isActive !== false);
      return (<>
        <div className="grid grid-cols-3 gap-2"><Stat label="Semester" value={item.semester} /><Stat label="Credits" value={item.credits} /><Stat label="Teachers" value={new Set(act.map((a) => String(a.facultyId?._id))).size} tone={act.length ? "slate" : "amber"} /></div>
        <Section title="About"><Dl><KV label="Code" value={item.subjectCode} mono /><KV label="Department" value={item.departmentId?.name} /><KV label="Created" value={formatDate(item.createdAt)} /><KV label="Status" value={<Pill tone={statusOf(item).tone}>{statusOf(item).label}</Pill>} /></Dl></Section>
        <Section title="Who teaches this subject" count={act.length}><List items={act} render={(a) => <><span>{a.facultyId?.userId?.name || a.facultyId?.employeeId}</span><span className="text-xs text-slate-500">{classLabel(a.sectionId)} · {a.academicYear}</span></>} empty="No teacher assigned yet. Assign one under “Who teaches what”." /></Section>
        <HistoryList history={related.history} />
      </>);
    }
    case "classes": {
      const studying = related.students.filter((s) => s.isActive !== false);
      const act = related.assignments.filter((a) => a.isActive !== false);
      return (<>
        <div className="grid grid-cols-3 gap-2"><Stat label="Students" value={studying.length} tone={studying.length ? "slate" : "amber"} /><Stat label="Semester" value={item.semester} /><Stat label="Batch" value={batchLabel(item)} /></div>
        <Section title="About"><Dl><KV label="Department" value={item.departmentId?.name} /><KV label="Teachers" value={new Set(act.map((a) => String(a.facultyId?._id))).size} /><KV label="Created" value={formatDate(item.createdAt)} /><KV label="Status" value={<Pill tone={statusOf(item).tone}>{statusOf(item).label}</Pill>} /></Dl></Section>
        <Section title="Subjects & teachers" count={act.length}><List items={act} render={(a) => <><span>{a.subjectId?.subjectName} <span className="text-slate-400">({a.subjectId?.subjectCode})</span></span><span className="text-xs text-slate-500">{a.facultyId?.userId?.name || "-"}</span></>} empty="No teacher assigned to this class yet." /></Section>
        <Section title="Students" count={studying.length}><List items={studying} render={(s) => <><span>{personName(s)} <span className="text-slate-400 font-mono text-xs">{s.rollNumber}</span></span><span className="text-xs text-slate-500">{mentorName(s) ? "Mentor: " + mentorName(s) : "No mentor"}</span></>} empty="No students in this class yet." /></Section>
        <HistoryList history={related.history} />
      </>);
    }
    case "faculty": {
      const act = related.assignments.filter((a) => a.isActive !== false);
      return (<>
        <div className="grid grid-cols-3 gap-2"><Stat label="Teaches" value={act.length} hint="subject and class pairs" /><Stat label="Mentees" value={related.mentees.length} /><Stat label="Since" value={item.joiningYear || "-"} /></div>
        <Section title="Contact"><Dl><KV label="Email" value={<Contact icon={Mail} value={item.userId?.email} href={`mailto:${item.userId?.email}`} />} /><KV label="Mobile" value={<Contact icon={Phone} value={item.phone ? formatPhone(item.phone) : null} href={`tel:${item.phone}`} />} /></Dl></Section>
        <Section title="Profile"><Dl><KV label="Employee ID" value={item.employeeId} mono /><KV label="Department" value={item.departmentId?.name} /><KV label="Designation" value={item.designation} /><KV label="Specialisation" value={item.specialization} /><KV label="Status" value={<Pill tone={statusOf(item).tone}>{statusOf(item).label}</Pill>} /></Dl></Section>
        <Section title="Teaching" count={act.length}><List items={act} render={(a) => <><span>{a.subjectId?.subjectName} <span className="text-slate-400">({a.subjectId?.subjectCode})</span></span><span className="text-xs text-slate-500">{classLabel(a.sectionId)} · {a.academicYear}</span></>} empty="Not teaching anything yet. Assign under “Who teaches what”." /></Section>
        <Section title="Mentees (current)" count={related.mentees.length}><List items={related.mentees} render={(s) => <><span>{personName(s)} <span className="font-mono text-xs text-slate-400">{s.rollNumber}</span></span><span className="text-xs text-slate-500">{s.sectionId ? classLabel(s.sectionId) : "No class"}</span></>} empty="No students assigned to this mentor." /></Section>
        <HistoryList history={related.history} />
      </>);
    }
    case "students": {
      const d = related.detail;
      const l = lifecycleOf(item);
      // Shape of GET /api/leave/mentor/mentees/:id/detail →
      // { student, summary{totalLectures,present,absent,percentage}, subjectBreakdown[], recent[], leaves[] }
      const sum = d?.summary || null;
      const pct = sum ? (sum.totalLectures ? sum.percentage : null) : null;
      const subjects = d?.subjectBreakdown || [];
      const recent = (d?.recent || []).slice(0, 8);
      const leaves = (d?.leaves || []).slice(0, 5);
      const mentors = d?.student?.mentorHistory || [];
      return (<>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Attendance" value={pct === null ? "-" : `${pct}%`} tone={percentTone(pct)} hint={sum ? (sum.totalLectures ? `${sum.present}/${sum.totalLectures} lectures` : "No lectures yet") : undefined} />
          <Stat label="Semester" value={item.semester} />
          <Stat label="Status" value={<Pill tone={l.tone}>{l.label}</Pill>} />
        </div>
        <Section title="Contact"><Dl>
          <KV label="Email" value={<Contact icon={Mail} value={item.userId?.email} href={`mailto:${item.userId?.email}`} />} />
          <KV label="Student mobile" value={<Contact icon={Phone} value={item.phone ? formatPhone(item.phone) : null} href={`tel:${item.phone}`} />} />
          <KV label="Parent / guardian" value={<Contact icon={Phone} value={item.parentPhone ? formatPhone(item.parentPhone) : null} href={`tel:${item.parentPhone}`} />} />
        </Dl></Section>
        <Section title="Academic"><Dl>
          <KV label="Roll number" value={item.rollNumber} mono /><KV label="Department" value={item.departmentId?.name} />
          <KV label="Class" value={item.sectionId ? `${classLabel(item.sectionId)} · Batch ${batchLabel(item.sectionId)}` : null} /><KV label="Enrolled" value={item.enrollmentYear} />
          <KV label="Mentor" value={mentorName(item)} />
          {l.key !== "STUDYING" && l.key !== "INACTIVE" && <KV label="Left on" value={`${formatDate(item.leftAt)}${item.leavingNote ? " · " + item.leavingNote : ""}`} />}
        </Dl></Section>
        {subjects.length > 0 && (
          <Section title="Attendance by subject" count={subjects.length}>
            <ul className="space-y-2">{subjects.map((s, i) => { const p = s.percentage ?? 0; const tone = percentTone(p); const bar = { green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500", slate: "bg-slate-400" }[tone]; return (
              <li key={s.subjectCode || i}><div className="flex items-center justify-between text-[13px]"><span className="truncate">{s.subject || s.subjectName} <span className="text-slate-400">{s.subjectCode}</span></span><span className="tabular-nums font-medium">{p}% <span className="text-xs text-slate-400">({s.present}/{s.total})</span></span></div><div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-1.5 rounded-full ${bar}`} style={{ width: `${Math.min(100, p)}%` }} /></div></li>); })}</ul>
          </Section>)}
        {recent.length > 0 && (
          <Section title="Recent lectures" count={recent.length}><List items={recent} render={(a) => <><span className="truncate">{a.topic || "Lecture"} <span className="text-xs text-slate-400">{a.subjectCode || ""} · {formatDate(a.date)}</span></span><Pill tone={a.status === "PRESENT" || a.status === "LATE" ? "green" : a.status === "LEAVE" || a.status === "EXCUSED" ? "blue" : "red"}>{a.status}</Pill></>} /></Section>)}
        {leaves.length > 0 && (
          <Section title="Recent leave applications" count={leaves.length}><List items={leaves} render={(lv) => <><span className="truncate">{formatDate(lv.date)} · {lv.reason}</span><Pill tone={lv.status === "APPROVED" ? "green" : lv.status === "REJECTED" ? "red" : "amber"}>{lv.status}</Pill></>} /></Section>)}
        {mentors.length > 0 && (
          <Section title="Mentor history" count={mentors.length}><List items={mentors} render={(m) => <><span>{m.mentorName || m.employeeId || "Mentor"}{m.current && <Pill tone="green" className="ml-2">current</Pill>}</span><span className="text-xs text-slate-500">{formatDate(m.from)} → {m.to ? formatDate(m.to) : "now"}</span></>} /></Section>)}
        <HistoryList history={related.history} />
      </>);
    }
    default:
      return (<>
        <Section title="Assignment"><Dl><KV label="Teacher" value={item.facultyId?.userId?.name || item.facultyId?.employeeId} /><KV label="Subject" value={`${item.subjectId?.subjectName || ""} (${item.subjectId?.subjectCode || ""})`} /><KV label="Class" value={classLabel(item.sectionId)} /><KV label="Academic year" value={item.academicYear} /><KV label="Semester" value={item.semester} /><KV label="Status" value={<Pill tone={statusOf(item).tone}>{statusOf(item).label}</Pill>} /><KV label="Created" value={formatDate(item.createdAt)} /></Dl></Section>
        <HistoryList history={related.history} />
      </>);
  }
}

/**
 * RecordDetail - right-hand drawer with the full record, related data and
 * the same real actions as the table (Edit / Status / Deactivate / Delete).
 */
export default function RecordDetail({ open, entity, item, onClose, onEdit, onToggleActive, onDelete, onLifecycle, refreshKey }) {
  const [related, setRelated] = useState(null);
  useEffect(() => {
    if (!open || !item) return undefined;
    let alive = true;
    setRelated(null);
    loadRelated(entity.key, item).then((r) => { if (alive) setRelated(r); }).catch(() => { if (alive) setRelated({ history: [] }); });
    return () => { alive = false; };
  }, [open, item, entity.key, refreshKey]);
  if (!open || !item) return null;
  const inactive = item.isActive === false;
  return (
    <Drawer open={open} onClose={onClose} title={entity.titleOf(item)} subtitle={entity.subtitleOf(item)} width="max-w-2xl"
      footer={<>
        {onLifecycle && <Button variant="outline" icon={GraduationCap} onClick={() => onLifecycle(item)}>Student status</Button>}
        <Button variant="outline" icon={Power} onClick={() => onToggleActive(item)}>{inactive ? "Reactivate" : "Deactivate"}</Button>
        <Button variant="danger" icon={Trash2} onClick={() => onDelete(item)}>Delete</Button>
        <Button variant="primary" icon={Pencil} onClick={() => onEdit(item)}>Edit</Button>
      </>}>
      <Body entityKey={entity.key} item={item} related={related} />
    </Drawer>
  );
}
