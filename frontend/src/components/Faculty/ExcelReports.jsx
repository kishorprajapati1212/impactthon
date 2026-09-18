import { useState, useEffect, useMemo, useCallback } from "react";
import { Download, FileSpreadsheet, FileText, Info, Search, Users, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../utils/api.js";

/**
 * Faculty Excel export — human-friendly sheets navigable by enrollment/roll
 * number, plus a true .xlsx download (and CSV fallback).
 */
const ExcelReports = () => {
  const [options, setOptions] = useState({ assignmentPairs: [] });
  const [pair, setPair] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);

  // roster navigation state
  const [roster, setRoster] = useState(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterSearch, setRosterSearch] = useState("");

  useEffect(() => {
    api
      .get("/api/report/faculty/history/filters")
      .then((r) => setOptions(r.data?.data || { assignmentPairs: [] }))
      .catch(() => {});
  }, []);

  const selected = useMemo(() => {
    if (pair !== "all") {
      const [subjectId, sectionId] = pair.split("|");
      return { subjectId, sectionId };
    }
    return null;
  }, [pair]);

  const loadRoster = useCallback(async () => {
    if (!selected?.subjectId || !selected?.sectionId) return;
    setRosterLoading(true);
    setRoster(null);
    try {
      const r = await api.get("/api/report/faculty/subject-roster", {
        params: { subjectId: selected.subjectId, sectionId: selected.sectionId },
      });
      setRoster(r.data?.data || null);
    } catch {
      toast.error("Could not load the class roster");
    } finally {
      setRosterLoading(false);
    }
  }, [selected?.subjectId, selected?.sectionId]);

  const buildUrl = (ext) =>
    `/api/report/faculty/attendance-sheet.${ext}?subjectId=${selected.subjectId}&sectionId=${selected.sectionId}${
      from ? `&from=${from}` : ""
    }${to ? `&to=${to}` : ""}`;

  const download = async (ext) => {
    if (!selected?.subjectId || !selected?.sectionId) {
      toast.error("Choose a class first");
      return;
    }
    setBusy(true);
    try {
      const res = await api.get(buildUrl(ext), { responseType: "blob" });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AttendX_sheet_${selected.subjectId}_${from || "all"}_${
        to || "all"
      }.${ext}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`${ext.toUpperCase()} downloaded — opens in Excel`);
    } catch {
      toast.error(`Could not generate the ${ext.toUpperCase()} file`);
    } finally {
      setBusy(false);
    }
  };

  const filteredRoster = rosterSearch.trim()
    ? (roster?.students || []).filter(
        (s) =>
          (s.rollNumber || "").toLowerCase().includes(rosterSearch.toLowerCase()) ||
          (s.name || "").toLowerCase().includes(rosterSearch.toLowerCase())
      )
    : roster?.students || [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Excel Reports
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Attendance sheets with human-friendly columns — navigable by
          enrollment number, downloadable as real Excel (.xlsx) or CSV.
        </p>
      </div>

      <div className="card-2026 p-6 space-y-5">
        <div className="flex items-start gap-3">
          <FileSpreadsheet size={22} className="text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
              Attendance sheet generator
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
              Columns: enrollment no · student name · one column per lecture
              (P/A/L/LV/E) · Present / Late / Absent / On Leave counts · total
              classes · attendance %.
            </p>
          </div>
        </div>

        <div>
          <label className="input-label">Class (subject · section)</label>
          <select
            value={pair}
            onChange={(e) => setPair(e.target.value)}
            className="input-field"
          >
            <option value="all">Choose a class…</option>
            {(options.assignmentPairs || []).map((p) => (
              <option
                key={`${p.subjectId}|${p.sectionId}`}
                value={`${p.subjectId}|${p.sectionId}`}
              >
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">From date</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="input-label">To date</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="input-field"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => download("xlsx")}
            disabled={busy || !selected}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Download size={16} />
            {busy ? "Generating…" : "Download Excel (.xlsx)"}
          </button>
          <button
            onClick={() => download("csv")}
            disabled={busy || !selected}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <FileText size={16} />
            Download CSV
          </button>
        </div>

        <p className="text-xs text-slate-500 flex items-start gap-1.5">
          <Info size={14} className="shrink-0 mt-px" />
          Leave dates empty for the full semester. The .xlsx has two sheets:
          “Attendance Register” and “Summary”.
        </p>
      </div>

      {/* ── Roster navigation ─────────────────────────────────────── */}
      <div className="card-2026 p-6 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-cyan-500" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100">
              Browse by Enrollment No
            </h3>
          </div>
          <button
            onClick={loadRoster}
            disabled={!selected || rosterLoading}
            className="btn-secondary text-sm py-2 px-4 flex items-center gap-2"
          >
            {rosterLoading ? (
              <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-500 rounded-full animate-spin" />
            ) : (
              <Users size={14} />
            )}
            {roster ? "Reload roster" : "Show class roster"}
          </button>
        </div>

        {!selected ? (
          <p className="text-xs text-slate-400">
            Pick a class above to inspect its students and their attendance.
          </p>
        ) : roster ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  placeholder="Search by enrollment or name…"
                  className="input-field pl-9 py-2 text-sm"
                />
              </div>
            </div>

            <div className="text-xs text-slate-400">
              {roster.subject?.name} ({roster.subject?.code}) · Sec {roster.section?.name} ·{" "}
              {roster.totalSessions} classes · {roster.students?.length || 0} students
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {filteredRoster.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">
                  No students match “{rosterSearch}”.
                </p>
              ) : (
                filteredRoster.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                        {s.rollNumber} · {s.name || "Unnamed"}
                      </p>
                      <p className="text-xs text-slate-400">{s.email || ""}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <span
                        className={
                          "text-sm font-bold " +
                          ((s.percentage || 0) >= 75
                            ? "text-emerald-500"
                            : (s.percentage || 0) >= 50
                              ? "text-amber-500"
                              : "text-rose-500")
                        }
                      >
                        {s.percentage ?? 0}%
                      </span>
                      <p className="text-[10px] text-slate-400">
                        {s.present}/{s.total} present
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ArrowLeft size={14} />
            Click “Show class roster” to browse students by enrollment number.
          </div>
        )}
      </div>
    </div>
  );
};

export default ExcelReports;
