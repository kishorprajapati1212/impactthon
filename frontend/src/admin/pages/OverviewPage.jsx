import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import api, { clearApiCache } from "../../utils/api.js";
import { Panel, Button, Pill, Spinner } from "../components/ui.jsx";
import { auditLine, timeAgo, idOf } from "../adminFormat.js";

const list = (r) => (r.status === "fulfilled" ? r.value?.data?.data || [] : []);
const total = (r) => (r.status === "fulfilled" ? r.value?.data?.total ?? r.value?.data?.count ?? 0 : 0);
const one = (n, singular, plural) => `${n} ${n === 1 ? singular : plural}`;

/**
 * Dashboard — written for an admin who has never used the system:
 * plain sentences, one button per line, nothing decorative.
 *   1. What to do (setup steps that are missing + problems that block attendance)
 *   2. Right now (lectures running, logins waiting)
 *   3. Attendance in the last 30 days
 *   4. Your college in numbers · recent changes
 */
export default function OverviewPage({ go }) {
  const [snap, setSnap] = useState(null);

  useEffect(() => {
    let alive = true;
    clearApiCache("get:/admin/active-lectures"); clearApiCache("get:/api/device/admin/pending");
    Promise.allSettled([
      api.get("/departments"), api.get("/subjects?withCounts=1"), api.get("/sections"), api.get("/faculty?limit=1"),
      api.get("/students?limit=1"), api.get("/students?mentor=none&limit=1"), api.get("/students?section=none&limit=1"),
      api.get("/assignments"), api.get("/admin/active-lectures"), api.get("/api/device/admin/pending"),
      api.get("/api/report/admin/attendance-summary?days=30"), api.get("/api/audit?limit=5"),
    ]).then(([de, su, se, fa, st, noMentor, noClass, as, live, logins, report, audits]) => {
      if (!alive) return;
      setSnap({
        departments: list(de), subjects: list(su), sections: list(se), facultyTotal: total(fa), studentsTotal: total(st),
        noMentor: total(noMentor), noClass: total(noClass), assignments: list(as), live: list(live), logins: list(logins),
        report: report.status === "fulfilled" ? report.value?.data?.data || null : null, audits: list(audits),
      });
    });
    return () => { alive = false; };
  }, []);

  const todo = useMemo(() => {
    if (!snap) return [];
    const activeAssign = snap.assignments.filter((a) => a.isActive !== false);
    const taughtSections = new Set(activeAssign.map((a) => idOf(a.sectionId)));
    const subjectsNoTeacher = snap.subjects.filter((s) => !s.teacherCount).length;
    const classesNoTeacher = snap.sections.filter((s) => !taughtSections.has(String(s._id))).length;
    const emptyClasses = snap.sections.filter((s) => !(s.studentCount ?? s.totalStudents)).length;
    const items = [];
    if (!snap.departments.length) items.push({ text: "Add your departments.", why: "Subjects, classes, faculty and students all belong to a department.", button: "Add department", to: ["departments", { new: 1 }] });
    if (!snap.subjects.length) items.push({ text: "Add the subjects that are taught.", why: "A lecture is always for one subject.", button: "Add subject", to: ["subjects", { new: 1 }] });
    if (!snap.sections.length) items.push({ text: "Create your classes.", why: "A class is the group of students who sit together, e.g. CSE · A.", button: "Add class", to: ["classes", { new: 1 }] });
    if (!snap.facultyTotal) items.push({ text: "Add faculty accounts.", why: "Teachers take attendance; mentors approve leave and logins.", button: "Add faculty", to: ["faculty", { new: 1 }] });
    if (!snap.studentsTotal) items.push({ text: "Add students.", why: "Each student needs a class and a mentor.", button: "Add student", to: ["students", { new: 1 }] });
    if (snap.subjects.length && snap.facultyTotal && subjectsNoTeacher) items.push({ text: `${one(subjectsNoTeacher, "subject has", "subjects have")} no teacher.`, why: `No lecture can be started for ${subjectsNoTeacher === 1 ? "it" : "them"} until a teacher is assigned.`, button: "Assign a teacher", to: ["teaching", { new: 1 }] });
    if (snap.sections.length && snap.facultyTotal && classesNoTeacher) items.push({ text: `${one(classesNoTeacher, "class has", "classes have")} no teacher yet.`, why: `Students in ${classesNoTeacher === 1 ? "it" : "them"} have nothing to attend.`, button: "Who teaches what", to: ["teaching"] });
    if (snap.noClass) items.push({ text: `${one(snap.noClass, "student is", "students are")} not in any class.`, why: "They cannot be marked present in any lecture.", button: "Show them", to: ["students", { section: "none" }] });
    if (snap.noMentor) items.push({ text: `${one(snap.noMentor, "student has", "students have")} no mentor.`, why: "Their leave requests and new-device logins cannot be approved.", button: "Show them", to: ["students", { mentor: "none" }] });
    if (snap.studentsTotal && emptyClasses) items.push({ text: `${one(emptyClasses, "class has", "classes have")} no students.`, why: `Add students to ${emptyClasses === 1 ? "it, or deactivate it if it is" : "them, or deactivate the ones"} not used.`, button: "Open classes", to: ["classes"] });
    if (snap.logins.length) items.push({ text: `${one(snap.logins.length, "student is", "students are")} waiting for login approval.`, why: "Their mentor normally approves; you can do it when the mentor is away.", button: "Approve now", to: ["approvals"] });
    return items;
  }, [snap]);

  if (!snap) return <Spinner label="Loading…" />;
  const r = snap.report;
  const o = r?.overall;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
        <p className="mt-0.5 text-[13px] text-slate-500">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · Everything that needs doing is listed below. Use the menu on the left to manage records.</p>
      </div>

      {/* 1. What to do */}
      <Panel title="What to do" actions={<Pill tone={todo.length ? "amber" : "green"}>{todo.length ? `${todo.length} to do` : "Nothing to do"}</Pill>}>
        {todo.length === 0 ? (
          <div className="flex items-center gap-2.5 px-5 py-5 text-sm text-emerald-700 dark:text-emerald-400"><CheckCircle2 size={18} /> Everything is set up. Every student has a class and a mentor, every subject has a teacher, and nothing is waiting for approval.</div>
        ) : (
          <ol className="divide-y divide-slate-100 dark:divide-slate-800">
            {todo.map((t, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{i + 1}</span>
                <div className="min-w-0 flex-1 basis-64">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{t.text}</p>
                  <p className="text-[13px] text-slate-500">{t.why}</p>
                </div>
                <Button variant={i === 0 ? "primary" : "outline"} onClick={() => go(...t.to)}>{t.button}</Button>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      {/* 2. Right now */}
      <Panel title="Right now">
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${snap.live.length ? "bg-emerald-500" : "bg-slate-300"}`} />
            <p className="min-w-0 flex-1 basis-64 text-sm text-slate-900 dark:text-white">{snap.live.length ? <><b>{one(snap.live.length, "lecture is", "lectures are")}</b> running now{snap.live.length <= 3 && <span className="text-slate-500"> — {snap.live.map((l) => `${l.faculty} · ${l.subject} · ${l.classLabel || `Class ${l.section}`}`).join("; ")}</span>}.</> : "No lecture is running at the moment."}</p>
            <Button variant="outline" onClick={() => go("live")}>See lectures</Button>
          </li>
          <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${snap.logins.length ? "bg-amber-500" : "bg-slate-300"}`} />
            <p className="min-w-0 flex-1 basis-64 text-sm text-slate-900 dark:text-white">{snap.logins.length ? <><b>{one(snap.logins.length, "student is", "students are")}</b> waiting for a login approval.</> : "No student is waiting for a login approval."}</p>
            <Button variant="outline" onClick={() => go("approvals")}>Login approvals</Button>
          </li>
        </ul>
      </Panel>

      {/* 3. Attendance, last 30 days */}
      <Panel title="Attendance in the last 30 days" actions={<Button size="sm" variant="outline" onClick={() => go("attendance-report")}>Open full report</Button>}>
        <div className="px-5 py-4">
          {!o || !o.lectures ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">No lectures were held in the last 30 days, so there is nothing to report yet.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="text-4xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-white">{o.percentage}%</span>
              <div className="text-sm text-slate-700 dark:text-slate-200">
                <p><Pill tone={o.band === "good" ? "green" : o.band === "watch" ? "amber" : "red"} dot>{o.band === "good" ? "Good" : o.band === "watch" ? "Needs watching" : "Low"}</Pill> <span className="ml-2">{o.present} present out of {o.counted} marks in {one(o.lectures, "lecture", "lectures")}.</span></p>
                <p className="mt-1 text-[13px] text-slate-500">{r.totals.classesBelowGood ? `${one(r.totals.classesBelowGood, "class is", "classes are")} below 75%.` : "Every class is at 75% or above."} {r.totals.studentsBelowGood ? `${one(r.totals.studentsBelowGood, "student is", "students are")} below 75%.` : "No student is below 75%."} 75% and above counts as good.</p>
              </div>
            </div>
          )}
        </div>
      </Panel>

      {/* 4. Numbers + recent changes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Your college">
          <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {[
              ["Students", snap.studentsTotal, "students"], ["Faculty", snap.facultyTotal, "faculty"], ["Classes", snap.sections.length, "classes"],
              ["Subjects", snap.subjects.length, "subjects"], ["Departments", snap.departments.length, "departments"], ["Teaching assignments", snap.assignments.filter((a) => a.isActive !== false).length, "teaching"],
            ].map(([label, n, section]) => (
              <li key={label}><button type="button" onClick={() => go(section)} className="flex w-full items-center justify-between px-5 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"><span className="text-slate-700 dark:text-slate-200">{label}</span><span className="font-semibold tabular-nums text-slate-900 dark:text-white">{n}</span></button></li>
            ))}
          </ul>
        </Panel>
        <Panel title="Recent changes" description="The last things an admin changed">
          {snap.audits.length === 0 ? <p className="px-5 py-4 text-sm text-slate-500">Nothing yet. Every add, edit and delete will be listed here.</p> : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {snap.audits.map((a) => { const l = auditLine(a); return <li key={a._id} className="px-5 py-2.5 text-sm"><p className="text-slate-900 dark:text-white">{l.what}</p><p className="text-xs text-slate-500">{l.who} · {timeAgo(l.when)}</p></li>; })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
