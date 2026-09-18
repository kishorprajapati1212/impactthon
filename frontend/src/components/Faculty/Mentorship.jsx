import { useState, useEffect, useCallback } from "react";
import { Users, CheckCheck, XCircle, Clock, RefreshCw, GraduationCap, Quote, Smartphone, ShieldCheck } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../utils/api.js";

const TYPE_META = {
  FULL: "Full day",
  HALF: "Half day",
  LECTURE: "Lecture-wise",
};

const Mentorship = () => {
  const [tab, setTab] = useState("pending");
  const [pending, setPending] = useState([]);
  const [mentees, setMentees] = useState([]);
  const [logins, setLogins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, m, lg] = await Promise.all([
        api.get("/api/leave/mentor/pending"),
        api.get("/api/leave/mentor/mentees"),
        api.get("/api/device/mentor/pending"),
      ]);
      setPending(p.data?.data || []);
      setMentees(m.data?.data || []);
      setLogins(lg.data?.data || []);
    } catch {
      toast.error("Could not load mentorship data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (id, decision) => {
    setBusyId(id);
    try {
      const res = await api.post(`/api/leave/${id}/decision`, { decision });
      toast.success(res.data?.message || (decision === "APPROVED" ? "Approved" : "Rejected"));
      setPending((prev) => prev.filter((l) => l.id !== id));
    } catch (e) {
      toast.error(e.response?.data?.message || "Decision failed");
    } finally {
      setBusyId(null);
    }
  };

  const decideLogin = async (id, decision) => {
    setBusyId(id);
    try {
      const res = await api.post(`/api/device/${id}/decision`, { decision });
      toast.success(res.data?.message || (decision === "ACCEPT" ? "Login approved" : "Login rejected"));
      setLogins((prev) => prev.filter((l) => l.id !== id));
    } catch (e) {
      toast.error(e.response?.data?.message || "Decision failed");
    } finally {
      setBusyId(null);
    }
  };

  const menteeCount = mentees.length;
  const pendingCount = pending.length;
  const loginCount = logins.length;

  // group mentees batch-wise (by section semester + batch)
  const batchGroups = {};
  for (const m of mentees) {
    const sec = m.sectionId || {};
    const key = `${sec.batchYear ?? "—"} · ${sec.semester ?? "?"}`;
    if (!batchGroups[key]) batchGroups[key] = [];
    batchGroups[key].push(m);
  }
  const batchKeys = Object.keys(batchGroups).sort();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Mentorship
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Review leave applications from your mentees and see who you mentor,
          batch-wise.
        </p>
      </div>

      {/* Tab switch */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setTab("pending")}
          className={
            "flex items-center justify-center gap-2 p-3 rounded-xl font-semibold text-sm border transition-all " +
            (tab === "pending"
              ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-600 dark:text-cyan-400"
              : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300")
          }
        >
          <Clock size={16} /> Leave
          {pendingCount > 0 && (
            <span className="ml-1 bg-amber-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("logins")}
          className={
            "flex items-center justify-center gap-2 p-3 rounded-xl font-semibold text-sm border transition-all " +
            (tab === "logins"
              ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-600 dark:text-cyan-400"
              : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300")
          }
        >
          <Smartphone size={16} /> Logins
          {loginCount > 0 && (
            <span className="ml-1 bg-rose-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5">
              {loginCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("mentees")}
          className={
            "flex items-center justify-center gap-2 p-3 rounded-xl font-semibold text-sm border transition-all " +
            (tab === "mentees"
              ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-600 dark:text-cyan-400"
              : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300")
          }
        >
          <Users size={16} /> Mentees
          <span className="ml-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-full px-2 py-0.5">
            {menteeCount}
          </span>
        </button>
      </div>

      {loading ? (
        <div className="card-2026 p-8 flex justify-center">
          <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      ) : tab === "pending" ? (
        pending.length === 0 ? (
          <div className="card-2026 p-10 text-center">
            <CheckCheck size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-400">No pending leave requests. You're all caught up 🎉</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((l) => (
              <div key={l.id} className="card-2026 p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {l.student?.name || "Student"}
                      <span className="text-slate-400 font-normal ml-2 text-sm">
                        {l.student?.rollNumber}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {l.student?.section ? `Sec ${l.student.section} · ` : ""}
                      Sem {l.student?.semester ?? "?"} ·{" "}
                      {l.date ? new Date(l.date).toLocaleDateString() : ""}
                    </p>
                  </div>
                  <span className="badge badge-warning shrink-0">PENDING</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="badge">{TYPE_META[l.type] || l.type}</span>
                  {l.type === "HALF" && l.halfWhich && (
                    <span className="badge">
                      {l.halfWhich === "FIRST" ? "1st half" : "2nd half"}
                    </span>
                  )}
                  {l.type === "LECTURE" && l.lectures?.length > 0 && (
                    <span className="badge">
                      Lectures: {l.lectures.map((x) => x.time).join(", ")}
                    </span>
                  )}
                </div>

                <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl">
                  <Quote size={14} className="shrink-0 text-slate-400 mt-0.5" />
                  <span>{l.reason}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => decide(l.id, "APPROVED")}
                    disabled={busyId === l.id}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <CheckCheck size={16} /> Approve
                  </button>
                  <button
                    onClick={() => decide(l.id, "REJECTED")}
                    disabled={busyId === l.id}
                    className="btn-danger flex-1 flex items-center justify-center gap-2"
                  >
                    <XCircle size={16} /> Reject
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Approving credits attendance for that day (FULL / the chosen
                  half / selected lectures).
                </p>
              </div>
            ))}
            <button onClick={load} className="btn-secondary w-full flex items-center justify-center gap-2">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        )
      ) : tab === "logins" ? (
        logins.length === 0 ? (
          <div className="card-2026 p-10 text-center">
            <ShieldCheck size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-400">No login requests waiting for approval.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logins.map((l) => (
              <div key={l.id} className="card-2026 p-5 space-y-3 border-rose-500/20">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {l.student?.name || "Student"}
                      <span className="text-slate-400 font-normal ml-2 text-sm">
                        {l.student?.rollNumber}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {l.student?.section ? `Sec ${l.student.section} · ` : ""}
                      {l.createdAt ? new Date(l.createdAt).toLocaleString() : ""}
                    </p>
                  </div>
                  <span className="badge badge-warning shrink-0">PENDING</span>
                </div>

                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-3 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                  <p className="flex items-center gap-2">
                    <Smartphone size={13} className="text-cyan-500 shrink-0" />
                    Device: {l.deviceLabel || "Unknown device"}
                  </p>
                  {l.deviceMeta && (
                    <p className="pl-5 text-slate-400">
                      {[
                        l.deviceMeta.platform,
                        l.deviceMeta.browser,
                        l.deviceMeta.screen,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                  <p className="pl-5 text-slate-400">
                    Fingerprint: {String(l.loginId || "").slice(0, 14)}…
                  </p>
                </div>

                <p className="text-[11px] text-slate-400">
                  Accept to let {l.student?.name || "the student"} use AttendX on
                  this device only. They must login again after logout.
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => decideLogin(l.id, "ACCEPT")}
                    disabled={busyId === l.id}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <CheckCheck size={16} /> Accept login
                  </button>
                  <button
                    onClick={() => decideLogin(l.id, "REJECT")}
                    disabled={busyId === l.id}
                    className="btn-danger flex-1 flex items-center justify-center gap-2"
                  >
                    <XCircle size={16} /> Reject
                  </button>
                </div>
              </div>
            ))}
            <button onClick={load} className="btn-secondary w-full flex items-center justify-center gap-2">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        )
      ) : mentees.length === 0 ? (
        <div className="card-2026 p-10 text-center">
          <GraduationCap size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-400">No mentees assigned to you yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {batchKeys.map((batch) => (
            <div key={batch} className="card-2026 p-5">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
                <Users size={16} className="text-cyan-500" />
                Batch {batch}
                <span className="text-xs font-normal text-slate-400">
                  ({batchGroups[batch].length} mentee{batchGroups[batch].length === 1 ? "" : "s"})
                </span>
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {batchGroups[batch].map((m) => (
                  <div key={m._id} className="flex items-center justify-between py-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">
                        {m.userId?.name || "Unnamed"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {m.rollNumber} · {m.departmentId?.name || "—"}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0 ml-3">
                      {m.userId?.email || ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Mentorship;
