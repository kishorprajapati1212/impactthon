import { useCallback, useEffect, useMemo, useState } from "react";
import { Grid3X3, RefreshCw, ExternalLink, Search } from "lucide-react";
import api, { clearApiCache } from "../../utils/api.js";
import toast from "../../utils/notify.js";
import getFriendlyError from "../../utils/friendlyError.js";
import DataTable from "../components/DataTable.jsx";
import { Button, Panel, Pill, Spinner, EmptyState, inputCls } from "../components/ui.jsx";

/**
 * Teaching & mentor map — two plain tables that answer two plain questions:
 *   1. For every class: which subjects are taught, and by whom?
 *   2. For every mentor: which students do they look after?
 * Data: GET /api/report/admin/overview (classes[], mentors[], summary).
 * Nothing decorative — an admin uses this page to spot gaps (a class with no
 * teacher, a student with no mentor) and jump to the page that fixes them.
 */
export default function TeachingMapPage({ go }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = useCallback(async (fresh = false) => {
    if (fresh) clearApiCache();
    setLoading(true);
    try {
      const r = await api.get("/api/report/admin/overview");
      setData(r.data?.data || null);
    } catch (e) {
      toast.error(getFriendlyError(e, "Could not load the teaching map."));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const needle = q.trim().toLowerCase();
  const classes = useMemo(() => {
    const list = data?.classes || [];
    if (!needle) return list;
    return list.filter((c) =>
      [c.label, c.department, ...(c.subjects || []).flatMap((s) => [s.code, s.name, s.teacher]), ...(c.mentors || [])]
        .filter(Boolean).some((t) => String(t).toLowerCase().includes(needle)));
  }, [data, needle]);

  const mentors = useMemo(() => {
    const list = data?.mentors || [];
    if (!needle) return list;
    return list.filter((m) =>
      [m.name, m.employeeId, ...(m.batches || []).flatMap((b) => b.students.flatMap((s) => [s.name, s.rollNumber, s.classLabel]))]
        .filter(Boolean).some((t) => String(t).toLowerCase().includes(needle)));
  }, [data, needle]);

  const summary = data?.summary;

  const classColumns = [
    { key: "label", label: "Class", primary: true, render: (c) => (
      <div className="min-w-0">
        <p className="font-medium text-slate-900 dark:text-slate-100">{c.label}</p>
        <p className="truncate text-xs text-slate-500">{c.department || "—"}{c.semester != null ? ` · Semester ${c.semester}` : ""}</p>
      </div>
    ) },
    { key: "students", label: "Students", className: "text-center", render: (c) => (
      <div className="text-center">
        <b className="tabular-nums">{c.students}</b>
        {c.studentsWithoutMentor > 0 && <p className="text-xs text-amber-700 dark:text-amber-300">{c.studentsWithoutMentor} without mentor</p>}
      </div>
    ) },
    { key: "subjects", label: "Subjects and who teaches them", render: (c) => c.subjects.length === 0
      ? <Pill tone="amber">No teacher assigned yet</Pill>
      : (
        <ul className="space-y-1">
          {c.subjects.map((s) => (
            <li key={s.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="text-slate-900 dark:text-slate-100">{s.name} <span className="text-slate-500">({s.code})</span></span>
              <span className="text-slate-400">—</span>
              <span className={s.teacher ? "text-slate-700 dark:text-slate-200" : "text-amber-700 dark:text-amber-300"}>{s.teacher || "no teacher"}</span>
            </li>
          ))}
        </ul>
      ) },
    { key: "mentors", label: "Mentors of these students", render: (c) => c.mentors.length ? c.mentors.join(", ") : <span className="text-slate-400">—</span> },
  ];

  const mentorColumns = [
    { key: "name", label: "Mentor", primary: true, render: (m) => (
      <div className="min-w-0">
        <p className="font-medium text-slate-900 dark:text-slate-100">{m.name || m.employeeId}</p>
        <p className="text-xs text-slate-500">{m.employeeId}</p>
      </div>
    ) },
    { key: "count", label: "Students", className: "text-center", render: (m) => <b className="tabular-nums">{m.menteeCount}</b> },
    { key: "students", label: "Who they look after", render: (m) => (
      <ul className="space-y-1.5">
        {m.batches.map((b) => (
          <li key={b.batch} className="text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{b.batch} · {b.count}</p>
            <p className="text-slate-700 dark:text-slate-200">
              {b.students.map((s, i) => (
                <span key={s.id}>{i > 0 ? ", " : ""}{s.name || s.rollNumber}{s.classLabel ? <span className="text-slate-400"> ({s.classLabel})</span> : null}</span>
              ))}
            </p>
          </li>
        ))}
      </ul>
    ) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white sm:flex"><Grid3X3 size={20} /></span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Teaching &amp; mentor map</h1>
            <p className="mt-0.5 max-w-2xl text-[13px] leading-relaxed text-slate-500">Two checks in one place: every class should have a teacher for each subject, and every student should have a mentor. Change anything from <button type="button" className="font-medium text-blue-700 underline-offset-2 hover:underline dark:text-blue-300" onClick={() => go("teaching")}>Who teaches what</button> or <button type="button" className="font-medium text-blue-700 underline-offset-2 hover:underline dark:text-blue-300" onClick={() => go("students")}>Students</button>.</p>
          </div>
        </div>
        <Button variant="outline" icon={RefreshCw} onClick={() => load(true)}>Refresh</Button>
      </div>

      {loading && !data ? <Spinner label="Loading classes and mentors…" /> : !data ? (
        <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><EmptyState title="Nothing to show yet" description="Create classes, subjects and teaching assignments first." /></div>
      ) : (
        <>
          {/* One sentence of status + a search box — no decorative tiles */}
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-700 dark:text-slate-200">
              <b>{summary.sections}</b> classes · <b>{summary.students}</b> students · <b>{summary.assignments}</b> teaching assignments · <b>{summary.mentors}</b> mentors.
              {summary.classesWithoutTeacher > 0 && <span className="text-amber-700 dark:text-amber-300"> {summary.classesWithoutTeacher} class{summary.classesWithoutTeacher === 1 ? " has" : "es have"} no teacher yet.</span>}
              {summary.studentsWithoutMentor > 0 && <span className="text-amber-700 dark:text-amber-300"> {summary.studentsWithoutMentor} student{summary.studentsWithoutMentor === 1 ? " has" : "s have"} no mentor.</span>}
              {!summary.classesWithoutTeacher && !summary.studentsWithoutMentor && <span className="text-emerald-700 dark:text-emerald-300"> Every class has teachers and every student has a mentor.</span>}
            </p>
            <label className="relative block w-full sm:w-72">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} className={`${inputCls} pl-9`} placeholder="Find a class, subject, teacher or student" aria-label="Search the map" />
            </label>
          </div>

          <Panel title="Classes — subjects and teachers" description="One row per class. A class is named department · division · batch, so two divisions from different years are never confused.">
            <DataTable columns={classColumns} items={classes} rowKey={(c) => c.id} emptyTitle={needle ? "No class matches that search" : "No classes yet"}
              renderActions={(c) => <Button size="sm" variant="outline" icon={ExternalLink} onClick={() => go("students", { section: c.id })}>Students</Button>} />
          </Panel>

          <Panel title="Mentors — who looks after whom" description="Students are grouped by batch under their mentor. Students without a mentor are listed on the Dashboard to-do list.">
            <DataTable columns={mentorColumns} items={mentors} rowKey={(m) => m.id} emptyTitle={needle ? "No mentor matches that search" : "No mentor has students yet"}
              emptyDescription={needle ? undefined : "Set a mentor on each student (Students → Edit → Mentor)."}
              renderActions={(m) => <Button size="sm" variant="outline" icon={ExternalLink} onClick={() => go("students", { mentor: m.id })}>Students</Button>} />
          </Panel>
        </>
      )}
    </div>
  );
}
