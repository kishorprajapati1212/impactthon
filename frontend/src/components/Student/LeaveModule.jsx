import { useState, useEffect, useCallback } from "react";
import {
  CalendarClock,
  Plus,
  X,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  Info,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../utils/api.js";

const TYPE_META = {
  FULL: { label: "Full Day", desc: "Entire day credited on approval" },
  HALF: { label: "Half Day", desc: "First or second half credited" },
  LECTURE: { label: "Lecture-wise", desc: "Only selected lectures credited" },
};

const statusBadge = (status) => {
  if (status === "APPROVED") return "badge-success";
  if (status === "PENDING") return "badge-warning";
  return "badge-danger";
};

const statusIcon = (status) => {
  if (status === "APPROVED") return <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />;
  if (status === "PENDING") return <Clock size={16} className="text-amber-500 shrink-0 mt-0.5" />;
  return <XCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />;
};

const LeaveModule = () => {
  const [view, setView] = useState("list"); // list | apply
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  // apply form state
  const [type, setType] = useState("FULL");
  const [date, setDate] = useState("");
  const [halfWhich, setHalfWhich] = useState("FIRST");
  const [reason, setReason] = useState("");
  const [lectureOptions, setLectureOptions] = useState([]);
  const [lectureIds, setLectureIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchLeaves = useCallback(async () => {
    try {
      const res = await api.get("/api/leave/my");
      setLeaves(res.data?.data || []);
    } catch {
      toast.error("Could not load leave applications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  // Load lecture options when LECTURE type + date both set
  useEffect(() => {
    if (type !== "LECTURE" || !date) {
      setLectureOptions([]);
      return;
    }
    api
      .get("/api/leave/new-options", { params: { date } })
      .then((r) => setLectureOptions(r.data?.data || []))
      .catch(() => setLectureOptions([]));
  }, [type, date]);

  const toggleLecture = (id) => {
    setLectureIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const submit = async () => {
    if (!date) return toast.error("Pick a date");
    if (!reason.trim()) return toast.error("Give a short reason");
    if (type === "LECTURE" && lectureIds.length === 0) {
      return toast.error("Select at least one lecture");
    }
    setSubmitting(true);
    try {
      const res = await api.post("/api/leave/apply", {
        type,
        date,
        reason: reason.trim(),
        halfWhich: type === "HALF" ? halfWhich : undefined,
        lectureIds: type === "LECTURE" ? lectureIds : undefined,
      });
      toast.success(res.data?.message || "Leave submitted to your mentor");
      setView("list");
      setReason("");
      setDate("");
      setLectureIds([]);
      setType("FULL");
      fetchLeaves();
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not submit leave");
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (d) =>
    d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Leave Applications
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Apply for leave — your mentor reviews it and approved leave is
            credited as attendance.
          </p>
        </div>
        <button
          onClick={() => setView(view === "list" ? "apply" : "list")}
          className="btn-primary flex items-center gap-2"
        >
          {view === "list" ? <Plus size={16} /> : <X size={16} />}
          {view === "list" ? "New Leave" : "Back"}
        </button>
      </div>

      {view === "apply" ? (
        <div className="card-2026 p-6 space-y-5">
          <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
            <Info size={14} className="shrink-0 mt-px" />
            <span>
              Approved leave marks that day's attendance as “On Leave”, so it
              does not count against your attendance percentage.
            </span>
          </div>

          {/* Type */}
          <div>
            <label className="input-label">Leave type</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(TYPE_META).map(([key, meta]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setType(key)}
                  className={
                    "p-3 rounded-xl border text-left transition-all " +
                    (type === key
                      ? "border-cyan-500/50 bg-cyan-500/10"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600")
                  }
                >
                  <p
                    className={
                      "text-sm font-semibold " +
                      (type === key
                        ? "text-cyan-600 dark:text-cyan-400"
                        : "text-slate-700 dark:text-slate-300")
                    }
                  >
                    {meta.label}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{meta.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field"
              />
            </div>
            {type === "HALF" && (
              <div>
                <label className="input-label">Which half</label>
                <select
                  value={halfWhich}
                  onChange={(e) => setHalfWhich(e.target.value)}
                  className="input-field"
                >
                  <option value="FIRST">First half (before 1 PM)</option>
                  <option value="SECOND">Second half (1 PM onward)</option>
                </select>
              </div>
            )}
          </div>

          {type === "LECTURE" && (
            <div>
              <label className="input-label">
                Select lectures · {date ? lectureOptions.length : "pick a date first"}
              </label>
              {lectureOptions.length === 0 ? (
                <p className="text-xs text-slate-400 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  {date
                    ? "No lectures found for this date."
                    : "Pick a date to see that day's lectures."}
                </p>
              ) : (
                <div className="space-y-2">
                  {lectureOptions.map((l) => {
                    const on = lectureIds.includes(l.id);
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => toggleLecture(l.id)}
                        className={
                          "w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all " +
                          (on
                            ? "border-cyan-500/50 bg-cyan-500/10"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600")
                        }
                      >
                        <span className="text-sm text-slate-700 dark:text-slate-200">
                          {l.time} — {l.subjectCode || ""} {l.topic || "Lecture"}
                        </span>
                        {on && <CheckCircle size={16} className="text-cyan-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="input-label">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="e.g. Fever — advised rest by doctor"
              className="input-field resize-none"
            />
          </div>

          <button
            onClick={submit}
            disabled={submitting}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={16} />
            )}
            {submitting ? "Submitting…" : "Submit to Mentor"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {loading ? (
            <div className="card-2026 p-8 flex justify-center">
              <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            </div>
          ) : leaves.length === 0 ? (
            <div className="card-2026 p-10 text-center">
              <CalendarClock size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-400">No leave applications yet.</p>
              <button
                onClick={() => setView("apply")}
                className="btn-primary mt-4 inline-flex items-center gap-2"
              >
                <Plus size={16} /> Apply for Leave
              </button>
            </div>
          ) : (
            leaves.map((l) => (
              <div key={l.id} className="card-2026 p-4 flex items-start gap-3">
                {statusIcon(l.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      {TYPE_META[l.type]?.label || l.type}
                      {l.type === "HALF" && l.halfWhich
                        ? ` (${l.halfWhich === "FIRST" ? "1st" : "2nd"} half)`
                        : ""}
                    </p>
                    <span className={`badge shrink-0 ${statusBadge(l.status)}`}>
                      {l.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {fmt(l.date)}
                    {l.type === "LECTURE" && l.lectures?.length
                      ? ` · ${l.lectures.length} lecture(s): ${l.lectures
                          .map((x) => x.time)
                          .join(", ")}`
                      : ""}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                    {l.reason}
                  </p>
                  <div className="text-xs text-slate-400 mt-1.5">
                    {l.mentorName ? (
                      <>Mentor: <span className="font-medium">{l.mentorName}</span></>
                    ) : (
                      "No mentor assigned yet"
                    )}
                    {l.mentorRemark ? (
                      <span className="ml-2 text-cyan-600 dark:text-cyan-400">
                        Remark: “{l.mentorRemark}”
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default LeaveModule;
