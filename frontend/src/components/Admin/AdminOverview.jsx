import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, ArrowUpRight, CheckCircle2, Circle, Radio, Search, ShieldCheck, Smartphone, UserX, BookX, Users } from "lucide-react";

const idOf = (v) => (v && typeof v === "object" ? String(v._id || v.id || "") : String(v || ""));
const Panel = ({ children, className = "" }) => (
  <section className={"rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_1px_2px_rgba(16,24,40,0.06)] " + className}>{children}</section>
);
const PanelHead = ({ title, sub, action }) => (
  <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
    <div><h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">{title}</h3>{sub && <p className="text-[13px] text-slate-500 mt-0.5">{sub}</p>}</div>{action}
  </div>
);

/** Professional admin overview: attention queue, setup progress, live ops, people finder. */
export default function AdminOverview({ counts, snapshot, onGoTab }) {
  const [q, setQ] = useState("");
  const students = snapshot.students || [], faculty = snapshot.faculty || [], subjects = snapshot.subjects || [],
    sections = snapshot.sections || [], assignments = snapshot.assignments || [], active = snapshot.active || [], logins = snapshot.logins || [];
  const assignedSubjectIds = new Set(assignments.map((a) => idOf(a.subjectId)));
  const sectionStudentCounts = useMemo(() => { const m = new Map(); students.forEach((s) => { const k = idOf(s.sectionId); if (k) m.set(k, (m.get(k) || 0) + 1); }); return m; }, [students]);

  const attention = [
    { icon: UserX, n: students.filter((s) => !s.mentorId).length, label: "students have no mentor", hint: "Assign a mentor so leave and login approvals work.", tab: "students", tone: "bg-rose-50 text-rose-600 dark:bg-rose-500/10" },
    { icon: Users, n: students.filter((s) => !s.sectionId).length, label: "students are not in any class", hint: "Without a class they cannot attend lectures.", tab: "students", tone: "bg-rose-50 text-rose-600 dark:bg-rose-500/10" },
    { icon: BookX, n: subjects.filter((s) => !assignedSubjectIds.has(String(s._id))).length, label: "subjects have no teacher assigned", hint: "Decide who teaches these before lectures start.", tab: "assignments", tone: "bg-amber-50 text-amber-600 dark:bg-amber-500/10" },
    { icon: Users, n: sections.filter((s) => !(sectionStudentCounts.get(String(s._id)) || s.totalStudents)).length, label: "classes have no students yet", hint: "Register students or move them into these classes.", tab: "sections", tone: "bg-amber-50 text-amber-600 dark:bg-amber-500/10" },
  ].filter((a) => a.n > 0);

  const setup = [
    { done: (counts.departments || 0) > 0, label: "Create departments", tab: "departments" },
    { done: subjects.length > 0, label: "Add subjects", tab: "subjects" },
    { done: sections.length > 0, label: "Create classes", tab: "sections" },
    { done: faculty.length > 0, label: "Register faculty", tab: "faculty" },
    { done: students.length > 0, label: "Register students", tab: "students" },
    { done: assignments.length > 0, label: "Decide who teaches what", tab: "assignments" },
    { done: students.length > 0 && students.every((s) => s.mentorId), label: "Give every student a mentor", tab: "students" },
  ];
  const doneCount = setup.filter((s) => s.done).length;
  const setupPct = Math.round((doneCount / setup.length) * 100);
  const ring = 2 * Math.PI * 34;

  const people = useMemo(() => {
    const needle = q.trim().toLowerCase(); if (!needle) return [];
    const hit = (x) => JSON.stringify(x).toLowerCase().includes(needle);
    return [
      ...students.filter(hit).slice(0, 4).map((s) => ({ role: "Student", name: s.userId?.name || "Student", meta: `${s.rollNumber || ""} · Class ${s.sectionId?.name || "—"} · Mentor: ${s.mentorId?.userId?.name || "not assigned"}`, tab: "students" })),
      ...faculty.filter(hit).slice(0, 4).map((f) => ({ role: "Faculty", name: f.userId?.name || "Faculty", meta: `${f.employeeId || ""} · ${f.departmentId?.name || "No department"}`, tab: "faculty" })),
    ].slice(0, 6);
  }, [q, students, faculty]);

  return (
    <div className="grid xl:grid-cols-3 gap-4 items-start">
      <div className="xl:col-span-2 space-y-4">
        <Panel>
          <PanelHead title="Needs your attention" sub="Issues that will block attendance or approvals if left alone"
            action={<span className="badge badge-warning">{attention.length} open</span>} />
          {attention.length === 0 ? (
            <div className="mx-5 mb-5 flex gap-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3.5 text-sm text-emerald-700 dark:text-emerald-400"><ShieldCheck size={18} className="shrink-0" /> Everything is set up correctly. There is nothing waiting on you.</div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800">
              {attention.map((a, i) => (
                <li key={i}>
                  <button onClick={() => onGoTab(a.tab)} className="w-full flex items-center gap-3.5 px-5 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <span className={"w-9 h-9 rounded-lg flex items-center justify-center shrink-0 " + a.tone}><a.icon size={17} /></span>
                    <span className="flex-1 min-w-0"><span className="block text-sm text-slate-700 dark:text-slate-200"><b className="font-semibold text-slate-900 dark:text-white">{a.n}</b> {a.label}</span><span className="block text-[13px] text-slate-400 truncate">{a.hint}</span></span>
                    <span className="inline-flex items-center gap-1 text-[13px] font-medium text-indigo-600 shrink-0">Fix <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" /></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHead title="Find a person" sub="Search students and faculty by name, roll number, employee ID or email" />
          <div className="px-5 pb-5">
            <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Start typing…" className="input-field pl-9" aria-label="Find a person" /></div>
            {q.trim() && (people.length === 0 ? <p className="text-sm text-slate-400 mt-3">No one matches “{q}”.</p> : (
              <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
                {people.map((person, i) => (
                  <li key={i}><button onClick={() => onGoTab(person.tab)} className="w-full flex items-center gap-3 py-2.5 text-left group">
                    <span className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">{person.name.charAt(0).toUpperCase()}</span>
                    <span className="flex-1 min-w-0"><span className="block text-sm font-medium truncate">{person.name} <span className="ml-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{person.role}</span></span><span className="block text-xs text-slate-400 truncate">{person.meta}</span></span>
                    <ArrowUpRight size={15} className="text-slate-300 group-hover:text-indigo-600 shrink-0" />
                  </button></li>
                ))}
              </ul>
            ))}
          </div>
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel className="p-5">
          <div className="flex items-center gap-4">
            <div className="relative w-[84px] h-[84px] shrink-0">
              <svg viewBox="0 0 84 84" className="w-[84px] h-[84px] -rotate-90">
                <circle cx="42" cy="42" r="34" fill="none" strokeWidth="8" className="stroke-slate-100 dark:stroke-slate-800" />
                <circle cx="42" cy="42" r="34" fill="none" strokeWidth="8" strokeLinecap="round" stroke="#4f46e5" strokeDasharray={`${(setupPct / 100) * ring} ${ring}`} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">{setupPct}%</span>
            </div>
            <div><h3 className="text-[15px] font-semibold">College setup</h3><p className="text-[13px] text-slate-500 mt-0.5">{doneCount} of {setup.length} steps done. Work top to bottom.</p></div>
          </div>
          <ol className="mt-4 space-y-0.5">
            {setup.map((s, i) => (
              <li key={i}><button onClick={() => onGoTab(s.tab)} className="w-full flex items-center gap-2.5 rounded-lg px-2 py-[7px] text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 group">
                {s.done ? <CheckCircle2 size={17} className="text-emerald-500 shrink-0" /> : <Circle size={17} className="text-slate-300 shrink-0" />}
                <span className={s.done ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 font-medium"}>{i + 1}. {s.label}</span>
              </button></li>
            ))}
          </ol>
        </Panel>

        <Panel className="p-5">
          <h3 className="text-[15px] font-semibold flex items-center gap-2"><Radio size={16} className="text-emerald-500" /> Happening now</h3>
          <div className="mt-3 space-y-2">
            <button onClick={() => onGoTab("active")} className="w-full flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 px-3.5 py-3 text-left hover:border-indigo-300 transition-colors">
              <span className="text-sm"><b className="block text-base">{active.length}</b><span className="text-slate-400 text-xs">lectures running now</span></span><ArrowRight size={15} className="text-slate-300" />
            </button>
            <button onClick={() => onGoTab("logins")} className="w-full flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 px-3.5 py-3 text-left hover:border-indigo-300 transition-colors">
              <span className="text-sm flex items-start gap-2"><Smartphone size={16} className="text-indigo-500 mt-0.5" /><span><b className="block text-base">{logins.length}</b><span className="text-slate-400 text-xs">login approvals waiting</span></span></span><ArrowRight size={15} className="text-slate-300" />
            </button>
            {active.slice(0, 3).map((l) => (
              <p key={l.id} className="text-xs text-slate-400 truncate px-1">● {l.topic} — {l.subject || "Lecture"} · {l.presentCount || 0} marked</p>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
