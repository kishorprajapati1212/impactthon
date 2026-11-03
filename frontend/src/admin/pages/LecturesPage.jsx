import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, RefreshCw, Trash2 } from "lucide-react";
import api, { clearApiCache } from "../../utils/api.js";
import toast from "../../utils/notify.js";
import getFriendlyError from "../../utils/friendlyError.js";
import DataTable from "../components/DataTable.jsx";
import FilterBar from "../components/FilterBar.jsx";
import Pagination from "../components/Pagination.jsx";
import { Button, Pill, inputCls } from "../components/ui.jsx";
import { formatDateTime, personName, classLabel, batchLabel } from "../adminFormat.js";
import DeleteLectureDialog from "../../components/UI/DeleteLectureDialog.jsx";

/**
 * Admin → Lectures: every attendance session, running or finished.
 *
 * Why this page exists (Phase 18): a teacher who starts two sessions at once,
 * or one for the wrong class, could end it but never remove it - and a
 * finished lecture keeps counting in every percentage. From here an admin can
 * find the lecture (teacher / class / subject / date / status) and delete it;
 * the dialog shows exactly how many marks go with it.
 */
const STATUS = {
  ACTIVE: { label: "Running", tone: "green" },
  COMPLETED: { label: "Finished", tone: "slate" },
  CANCELLED: { label: "Cancelled", tone: "amber" },
  SCHEDULED: { label: "Scheduled", tone: "blue" },
};

const useDebounced = (value, ms = 300) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
};

export default function LecturesPage({ ctx, initialFilters = {} }) {
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [filters, setFilters] = useState({ status: "", faculty: "", section: "", subject: "", ...initialFilters });
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [sort, setSort] = useState({ field: "startTime", order: "desc" });
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null); // lecture row

  useEffect(() => {
    setPage(1);
  }, [debounced, filters, from, to, limit]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (debounced.trim()) q.set("search", debounced.trim());
      Object.entries(filters).forEach(([k, v]) => {
        if (v) q.set(k, v);
      });
      if (from) q.set("from", from);
      if (to) q.set("to", to);
      q.set("page", String(page));
      q.set("limit", String(limit));
      q.set("sortBy", sort.field);
      q.set("order", sort.order);
      const url = `/admin/lectures?${q.toString()}`;
      clearApiCache(`get:${url}`);
      const r = await api.get(url);
      setRows(r.data?.data || []);
      setMeta({ total: r.data?.total || 0, pages: r.data?.pages || 1 });
    } catch (e) {
      toast.error(getFriendlyError(e, "Could not load lectures."));
    } finally {
      setLoading(false);
    }
  }, [debounced, filters, from, to, page, limit, sort]);

  useEffect(() => {
    load();
  }, [load]);

  const filterDefs = useMemo(
    () => [
      { key: "status", label: "Status", options: Object.entries(STATUS).filter(([k]) => k === "ACTIVE" || k === "COMPLETED").map(([value, s]) => ({ value, label: s.label })) },
      { key: "faculty", label: "Teacher", options: (ctx?.faculty || []).map((f) => ({ value: f._id, label: `${personName(f)} (${f.employeeId})` })) },
      { key: "section", label: "Class", options: (ctx?.sections || []).map((s) => ({ value: s._id, label: `${classLabel(s)} · Sem ${s.semester} · Batch ${batchLabel(s)}` })) },
      { key: "subject", label: "Subject", options: (ctx?.subjects || []).map((s) => ({ value: s._id, label: `${s.subjectName} (${s.subjectCode})` })) },
    ].map((f) => ({ ...f, value: filters[f.key] || "", onChange: (v) => setFilters((s) => ({ ...s, [f.key]: v })) })),
    [ctx, filters]
  );

  const clearAll = () => {
    setSearch("");
    setFilters({ status: "", faculty: "", section: "", subject: "" });
    setFrom("");
    setTo("");
  };
  const hasAny = debounced || from || to || Object.values(filters).some(Boolean);

  const columns = [
    {
      key: "startTime",
      label: "When",
      sortField: "startTime",
      render: (l) => (
        <div className="whitespace-nowrap">
          <p className="font-medium text-slate-900 dark:text-slate-100">{formatDateTime(l.startTime)}</p>
          <p className="text-xs text-slate-500">{l.status === "ACTIVE" ? `running ${l.durationMin} min` : l.durationMin != null ? `${l.durationMin} min` : "-"}</p>
        </div>
      ),
    },
    {
      key: "topic",
      label: "Lecture",
      primary: true,
      sortField: "topic",
      render: (l) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900 dark:text-slate-100">{l.topic}</p>
          <p className="truncate text-xs text-slate-500">
            {l.subject}
            {l.subjectCode ? ` (${l.subjectCode})` : ""}
          </p>
        </div>
      ),
    },
    { key: "faculty", label: "Teacher", render: (l) => l.faculty || "-" },
    { key: "class", label: "Class", className: "whitespace-nowrap", render: (l) => l.classLabel || l.section || "-" },
    { key: "status", label: "Status", sortField: "status", render: (l) => <Pill tone={STATUS[l.status]?.tone || "slate"} dot>{STATUS[l.status]?.label || l.status}</Pill> },
    {
      key: "present",
      label: "Present / class",
      className: "text-center",
      sortField: "totalMarked",
      render: (l) => (
        <span className="tabular-nums">
          <b>{l.presentCount || 0}</b>
          <span className="text-slate-400"> / {l.rosterSize ?? "-"}</span>
          {l.rosterSize ? <span className="ml-1 text-xs text-slate-500">({l.attendanceRate}%)</span> : null}
        </span>
      ),
    },
    { key: "marks", label: "Marks saved", hideOn: "lg", className: "text-center", render: (l) => <span className="tabular-nums text-slate-600 dark:text-slate-300">{l.marksTotal || 0}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white sm:flex">
            <CalendarClock size={20} />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Lectures</h1>
            <p className="mt-0.5 max-w-2xl text-[13px] text-slate-500">
              Every attendance session, running or finished. Delete one that was started by mistake. Its marks are removed and every percentage updates.
            </p>
          </div>
        </div>
        <Button variant="outline" icon={RefreshCw} onClick={load}>
          Refresh
        </Button>
      </div>

      <FilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search by topic…"
        filters={filterDefs}
        onClear={hasAny ? clearAll : undefined}
        resultText={loading ? "" : `${meta.total} lecture${meta.total === 1 ? "" : "s"}${hasAny ? " match" : ""}`}
      />
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-slate-600 dark:text-slate-300">
        <label className="flex items-center gap-2">
          From <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={inputCls + " h-9 w-auto"} aria-label="From date" />
        </label>
        <label className="flex items-center gap-2">
          To <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={inputCls + " h-9 w-auto"} aria-label="To date" />
        </label>
      </div>

      <DataTable
        columns={columns}
        items={rows}
        loading={loading}
        rowKey={(l) => l.id}
        sort={sort}
        onSort={(field) => setSort((s) => ({ field, order: s.field === field && s.order === "desc" ? "asc" : "desc" }))}
        emptyTitle={hasAny ? "No lectures match" : "No lectures yet"}
        emptyDescription={hasAny ? "Try a different search, date range or clear the filters." : "When a teacher starts a QR attendance session it appears here."}
        renderActions={(l) => (
          <Button size="sm" variant="danger" icon={Trash2} onClick={() => setDeleting(l)} aria-label={`Delete lecture ${l.topic}`}>
            Delete
          </Button>
        )}
        footer={<Pagination page={page} pages={meta.pages} total={meta.total} limit={limit} onPage={setPage} onLimit={setLimit} />}
      />

      <DeleteLectureDialog open={!!deleting} lectureId={deleting?.id} onClose={() => setDeleting(null)} onDeleted={() => load()} />
    </div>
  );
}
