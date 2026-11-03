import { useEffect, useState } from "react";
import { BarChart3, ExternalLink, RefreshCw } from "lucide-react";
import api, { clearApiCache } from "../../utils/api.js";
import toast from "../../utils/notify.js";
import getFriendlyError from "../../utils/friendlyError.js";
import DataTable from "../components/DataTable.jsx";
import { Button, Panel, Pill, Spinner, EmptyState } from "../components/ui.jsx";

const PERIODS = [{ v: "7", label: "Last 7 days", short: "7 days" }, { v: "30", label: "Last 30 days", short: "30 days" }, { v: "90", label: "Last 90 days", short: "90 days" }, { v: "all", label: "All time", short: "All" }];
const BAND = { good: { tone: "green", word: "Good" }, watch: { tone: "amber", word: "Watch" }, low: { tone: "red", word: "Low" }, none: { tone: "slate", word: "No data" } };
const barColor = { good: "bg-emerald-500", watch: "bg-amber-500", low: "bg-red-500", none: "bg-slate-300" };
const fmt = (n) => (n === null || n === undefined ? "—" : `${n}%`);

/** Percentage with a small bar — the same picture for every table. */
function Percent({ value, band }) {
  return (
    <div className="flex min-w-[120px] items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-2 rounded-full ${barColor[band] || barColor.none}`} style={{ width: `${value ?? 0}%` }} /></div>
      <span className="w-10 text-right text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{fmt(value)}</span>
    </div>
  );
}
const Status = ({ band }) => <Pill tone={BAND[band]?.tone || "slate"} dot>{BAND[band]?.word || "No data"}</Pill>;

export default function ReportPage({ go }) {
  const [days, setDays] = useState("30");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async (fresh = false) => {
    setLoading(true);
    try {
      if (fresh) clearApiCache("get:/api/report/admin/attendance-summary");
      const r = await api.get(`/api/report/admin/attendance-summary?days=${days}`);
      setData(r.data?.data || null);
    } catch (e) { toast.error(getFriendlyError(e, "Could not load the attendance report.")); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [days]);

  const periodLabel = PERIODS.find((p) => p.v === days)?.label.toLowerCase() || "this period";
  const o = data?.overall;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white sm:flex"><BarChart3 size={20} /></span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Attendance report</h1>
            <p className="mt-0.5 max-w-2xl text-[13px] leading-relaxed text-slate-500">How many students are turning up. One rule everywhere: <b className="text-slate-700 dark:text-slate-200">75% and above is good</b>, 60–74% needs watching, below 60% is low. Leave and excused days are not counted against a student.</p>
          </div>
        </div>
        <Button variant="outline" icon={RefreshCw} onClick={() => load(true)}>Refresh</Button>
      </div>

      {/* Period — plain segmented buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-medium text-slate-600 dark:text-slate-300">Show:</span>
        <div className="inline-flex overflow-hidden rounded-md border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900" role="tablist" aria-label="Period">
          {PERIODS.map((p) => (
            <button key={p.v} type="button" role="tab" aria-selected={days === p.v} aria-label={p.label} onClick={() => setDays(p.v)}
              className={`h-9 whitespace-nowrap px-3 text-[13px] font-medium transition-colors ${days === p.v ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"}`}><span className="sm:hidden">{p.short}</span><span className="hidden sm:inline">{p.label}</span></button>
          ))}
        </div>
      </div>

      {loading && !data ? <Spinner label="Adding up attendance…" /> : !data || !o || o.lectures === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <EmptyState title={`No lectures in the ${periodLabel}`} description="Attendance shows up here after teachers run QR sessions. Try a longer period." action={days !== "all" && <Button variant="outline" onClick={() => setDays("all")}>Show all time</Button>} />
        </div>
      ) : (
        <>
          {/* Overall — one number, one sentence */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[13px] font-medium text-slate-500">Overall attendance · {periodLabel}</p>
            <div className="mt-1 flex flex-wrap items-end gap-x-4 gap-y-2">
              <span className="text-5xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-white">{fmt(o.percentage)}</span>
              <span className="pb-2"><Status band={o.band} /></span>
            </div>
            <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">
              <b>{o.present}</b> present out of <b>{o.counted}</b> marks in <b>{o.lectures}</b> lecture{o.lectures === 1 ? "" : "s"}.
              {o.previous && o.previous.percentage !== null && (
                <> Previous {periodLabel.replace("last ", "")}: <b>{o.previous.percentage}%</b>{o.change !== null && o.change !== 0 && <> — <span className={o.change > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}>{o.change > 0 ? "up" : "down"} {Math.abs(o.change)} point{Math.abs(o.change) === 1 ? "" : "s"}</span></>}{o.change === 0 && ", no change"}.</>
              )}
            </p>
            <p className="mt-1 text-[13px] text-slate-500">
              {data.totals.classesBelowGood === 0 ? "Every class is at 75% or above." : `${data.totals.classesBelowGood} class${data.totals.classesBelowGood === 1 ? " is" : "es are"} below 75%.`}{" "}
              {data.totals.studentsBelowGood === 0 ? "No student is below 75%." : `${data.totals.studentsBelowGood} student${data.totals.studentsBelowGood === 1 ? " is" : "s are"} below 75% (listed further down).`}
            </p>
          </div>

          {/* Week by week — simple bars */}
          {data.weekly.length > 1 && (
            <Panel title="Week by week" description="Attendance for each week in the period" bodyClassName="px-5 py-4">
              <ul className="space-y-2.5">
                {data.weekly.map((w) => (
                  <li key={w.weekStart} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-sm sm:grid-cols-[150px_1fr_auto]">
                    <span className="truncate text-slate-700 dark:text-slate-200">{w.label}</span>
                    <span className="order-2 text-right text-xs tabular-nums text-slate-500 sm:order-3 sm:w-20">{w.lectures} lecture{w.lectures === 1 ? "" : "s"}</span>
                    <div className="order-3 col-span-2 sm:order-2 sm:col-span-1"><Percent value={w.percentage} band={w.band} /></div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Section title="Classes" description="Lowest attendance first. Click a class to see its students.">
            <DataTable items={data.classes} rowKey={(c) => c.id} onRowClick={(c) => go("students", { section: c.id })} emptyTitle="No class had a lecture in this period"
              columns={[
                { key: "label", label: "Class", primary: true, render: (c) => <span className="font-medium text-slate-900 dark:text-white">{c.label}</span> },
                { key: "sem", label: "Semester", render: (c) => (c.semester ? `Semester ${c.semester}` : "—") },
                { key: "students", label: "Students", className: "tabular-nums", render: (c) => c.students },
                { key: "lectures", label: "Lectures held", className: "tabular-nums", render: (c) => c.lectures },
                { key: "pct", label: "Attendance", render: (c) => <Percent value={c.percentage} band={c.band} /> },
                { key: "status", label: "Status", render: (c) => <Status band={c.band} /> },
              ]} />
          </Section>

          <Section title="Students below 75%" description={`Active students with at least ${data.rule.minLectures} lectures in the period. Their mentor should talk to them first.`}>
            <DataTable items={data.studentsAtRisk} rowKey={(s) => s.id} emptyTitle="No student is below 75%" emptyDescription="Good — nobody needs a follow-up for this period."
              renderActions={(s) => <Button size="sm" variant="outline" icon={ExternalLink} onClick={() => go("students", { q: s.rollNumber })}>Open</Button>}
              columns={[
                { key: "name", label: "Student", primary: true, render: (s) => <div className="min-w-0"><p className="truncate font-medium text-slate-900 dark:text-white">{s.name}</p><p className="font-mono text-xs text-slate-500">{s.rollNumber}</p></div> },
                { key: "class", label: "Class", render: (s) => s.classLabel },
                { key: "mentor", label: "Mentor", render: (s) => s.mentor || <Pill tone="amber">No mentor</Pill> },
                { key: "lectures", label: "Lectures", className: "tabular-nums", render: (s) => `${s.present} of ${s.lectures}` },
                { key: "pct", label: "Attendance", render: (s) => <Percent value={s.percentage} band={s.band} /> },
              ]} />
          </Section>

          <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
            <Section title="Subjects" description="Lowest attendance first.">
              <DataTable items={data.subjects} rowKey={(s) => s.id} emptyTitle="No lectures in this period"
                columns={[
                  { key: "name", label: "Subject", primary: true, render: (s) => <div className="min-w-0"><p className="truncate font-medium text-slate-900 dark:text-white">{s.name}</p><p className="font-mono text-xs text-slate-500">{s.code}</p></div> },
                  { key: "lectures", label: "Lectures", className: "tabular-nums", render: (s) => s.lectures },
                  { key: "pct", label: "Attendance", render: (s) => <Percent value={s.percentage} band={s.band} /> },
                ]} />
            </Section>
            <Section title="Teachers" description="Attendance in the lectures each teacher took. Lowest first.">
              <DataTable items={data.teachers} rowKey={(t) => t.id} emptyTitle="No lectures in this period"
                columns={[
                  { key: "name", label: "Teacher", primary: true, render: (t) => <div className="min-w-0"><p className="truncate font-medium text-slate-900 dark:text-white">{t.name}</p><p className="font-mono text-xs text-slate-500">{t.employeeId}</p></div> },
                  { key: "lectures", label: "Lectures taken", className: "tabular-nums", render: (t) => t.lectures },
                  { key: "pct", label: "Attendance", render: (t) => <Percent value={t.percentage} band={t.band} /> },
                ]} />
            </Section>
          </div>
        </>
      )}
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <section>
      <div className="mb-2 px-0.5">
        <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">{title}</h2>
        {description && <p className="text-[13px] text-slate-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}
