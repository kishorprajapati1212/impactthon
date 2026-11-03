import { useState, useEffect, useCallback } from "react";
import { classLabel } from "../../utils/classLabel.js";
import { Users, CheckCheck, XCircle, Clock, RefreshCw, GraduationCap, Quote, Smartphone, ShieldCheck } from "lucide-react";
import toast from "../../utils/notify.js";
import api from "../../utils/api.js";
import getFriendlyError from "../../utils/friendlyError.js";

const TYPE_META = {
  FULL: "Full day",
  HALF: "Half day",
  LECTURE: "Lecture-wise",
};

const Mentorship = () => {
  const [tab, setTab] = useState("pending");
  const [pending, setPending] = useState([]);
  const [mentees, setMentees] = useState([]);
  const [former, setFormer] = useState([]);
  const [logins, setLogins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, m, lg, fm] = await Promise.all([
        api.get("/api/leave/mentor/pending"),
        api.get("/api/leave/mentor/mentees"),
        api.get("/api/device/mentor/pending"),
        api.get("/api/leave/mentor/former-mentees").catch(() => ({ data: { data: [] } })),
      ]);
      setPending(p.data?.data || []);
      setMentees(m.data?.data || []);
      setLogins(lg.data?.data || []);
      setFormer(fm.data?.data || []);
    } catch {
      toast.error("Could not load mentorship data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openMentee = async (id) => {
    setDetailLoading(true);
    try {
      const r = await api.get(`/api/leave/mentor/mentees/${id}/detail`);
      setDetail(r.data?.data || null);
    } catch (e) { toast.error(getFriendlyError(e, "Could not load this student.")); }
    finally { setDetailLoading(false); }
  };

  const decide = async (id, decision) => {
    setBusyId(id);
    try {
      const res = await api.post(`/api/leave/${id}/decision`, { decision });
      toast.success(res.data?.message || (decision === "APPROVED" ? "Approved" : "Rejected"));
      setPending((prev) => prev.filter((l) => l.id !== id));
    } catch (e) {
      toast.error(getFriendlyError(e, "That could not be done. Please try again."));
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
      toast.error(getFriendlyError(e, "That could not be done. Please try again."));
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
    const key = `${sec.batchYear ?? "-"} · ${sec.semester ?? "?"}`;
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
          “Mentees” are the students you guide. Review their leave and login
          requests, open any student for their full record, and find them
          again under Former students even after they leave.
        </p>
      </div>

      {/* Tab switch */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
          <Users size={16} /> My students
          <span className="ml-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-full px-2 py-0.5">
            {menteeCount}
          </span>
        </button>
        <button
          onClick={() => setTab("former")}
          className={
            "flex items-center justify-center gap-2 p-3 rounded-xl font-semibold text-sm border transition-all " +
            (tab === "former"
              ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-600 dark:text-cyan-400"
              : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300")
          }
        >
          <GraduationCap size={16} /> Former students
          <span className="ml-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-full px-2 py-0.5">
            {former.length}
          </span>
        </button>
      </div>

      {loading ? (
        <div className="card-2026 p-8 flex justify-center">
          <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      ) : tab === "former" ? (
        former.length === 0 ? (
          <div className="card-2026 p-10 text-center">
            <GraduationCap size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-400">No former students yet. Students you mentored who complete, transfer or leave will stay listed here with their full record.</p>
          </div>
        ) : (
          <div className="card-2026 p-5">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1">Former students ({former.length})</h3>
            <p className="text-xs text-slate-400 mb-2">They are no longer studying under you, but nothing was deleted. Tap anyone to see attendance, subjects and leave history.</p>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {former.map((m) => (
                <button type="button" onClick={() => openMentee(m._id)} key={m._id} className="w-full flex items-center justify-between py-2.5 text-left rounded-lg px-2 -mx-2 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">{m.userId?.name || "Unnamed"}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{m.rollNumber} · {m.sectionId ? classLabel({ ...m.sectionId, departmentId: m.sectionId.departmentId || m.departmentId }) : "No class"}{m.sectionId?.semester != null ? ` · Sem ${m.sectionId.semester}` : ""}</p>
                  </div>
                  <span className="text-xs shrink-0 ml-3 font-semibold text-amber-500">{m.lifecycleStatus === "COMPLETED" ? "Completed" : m.lifecycleStatus === "LEFT" ? "Left college" : (m.lifecycleStatus || "Former")}</span>
                </button>
              ))}
            </div>
          </div>
        )
      ) : tab === "pending" ? (
        pending.length === 0 ? (
          <div className="card-2026 p-10 text-center">
            <CheckCheck size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400">No pending leave requests. You're all caught up.</p>
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
                      {l.student?.classLabel || l.student?.section ? `${l.student.classLabel || `Class ${l.student.section}`} · ` : ""}
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
                      {l.student?.classLabel || l.student?.section ? `${l.student.classLabel || `Class ${l.student.section}`} · ` : ""}
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
          {detailLoading && <div className="card-2026 p-6 text-center text-sm text-slate-400">Loading student details…</div>}
          {detail && (
            <div className="card-2026 p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">{detail.student.name || "Student"}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{detail.student.rollNumber} · {detail.student.classLabel || (detail.student.section ? classLabel(detail.student.section) : "No class")} · Sem {detail.student.semester ?? "-"} · {detail.student.department || ""}</p>
                  <p className="text-xs text-slate-400">{detail.student.email || ""}{detail.student.phone ? ` · ${detail.student.phone}` : ""}{detail.student.parentPhone ? ` · Parent: ${detail.student.parentPhone}` : ""}</p>
                  {detail.student.lifecycleStatus && detail.student.lifecycleStatus !== "STUDYING" && (
                    <p className="text-xs font-semibold text-amber-500 mt-1">{detail.student.lifecycleStatus === "LEFT" ? "Left the college" : detail.student.lifecycleStatus === "COMPLETED" ? "Course completed" : detail.student.lifecycleStatus}{detail.student.leftAt ? ` · ${new Date(detail.student.leftAt).toLocaleDateString()}` : ""}{detail.student.leavingNote ? ` · ${detail.student.leavingNote}` : ""}</p>
                  )}
                </div>
                <button onClick={() => setDetail(null)} className="btn-secondary text-xs py-1.5 px-3">Close</button>
              </div>
              <div className="grid grid-cols-4 gap-3 text-center">
                {[{l:"Attendance",v:detail.summary.percentage+"%"},{l:"Present",v:detail.summary.present},{l:"Absent",v:detail.summary.absent},{l:"Lectures",v:detail.summary.totalLectures}].map((x,i)=>(
                  <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40"><p className="font-bold text-slate-900 dark:text-slate-100">{x.v}</p><p className="text-[11px] uppercase tracking-wider text-slate-400">{x.l}</p></div>
                ))}
              </div>
              {(detail.subjectBreakdown||[]).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Subject-wise attendance</p>
                  {detail.subjectBreakdown.map((s,i)=>(
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1"><span className="text-slate-700 dark:text-slate-200">{s.subject} {s.subjectCode?`(${s.subjectCode})`:""}</span><span className="font-bold">{s.present}/{s.total} · {s.percentage}%</span></div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className={"h-full rounded-full "+(s.percentage>=75?"bg-emerald-500":s.percentage>=50?"bg-amber-500":"bg-rose-500")} style={{width: Math.min(100,s.percentage)+"%"}} /></div>
                    </div>
                  ))}
                </div>
              )}
              {(detail.recent||[]).length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Recent lectures</p>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {detail.recent.map((r,i)=>(
                      <div key={i} className="flex justify-between gap-2 text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                        <span className="truncate text-slate-700 dark:text-slate-200">{r.subject}: {r.topic}</span>
                        <span className="shrink-0 font-bold">{r.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(detail.student.mentorHistory||[]).length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Mentor history: who guided this student</p>
                  <div className="space-y-1.5">
                    {detail.student.mentorHistory.map((h,i)=>(
                      <div key={i} className="flex justify-between gap-2 text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-slate-700 dark:text-slate-200 font-medium">{h.mentorName || "Mentor"}{h.current ? " (current mentor)" : ""}</span>
                        <span className="text-slate-400 shrink-0">{new Date(h.from).toLocaleDateString()} → {h.to ? new Date(h.to).toLocaleDateString() : "now"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(detail.leaves||[]).length > 0 && (
                <p className="text-xs text-slate-400">Leaves: {detail.leaves.map(l=>`${new Date(l.date).toLocaleDateString()} (${l.status})`).join(" · ")}</p>
              )}
            </div>
          )}
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
                  <button type="button" onClick={() => openMentee(m._id)} key={m._id} className="w-full flex items-center justify-between py-2 text-left rounded-lg px-2 -mx-2 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">
                        {m.userId?.name || "Unnamed"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {m.rollNumber} · {m.departmentId?.name || "-"}
                      </p>
                    </div>
                    <span className="text-xs text-cyan-500 shrink-0 ml-3 font-semibold">View details →</span>
                  </button>
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
