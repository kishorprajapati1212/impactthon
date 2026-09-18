import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "react-toastify";
import {
  Play,
  Square,
  Users,
  Clock,
  BookOpen,
  ChevronRight,
  MapPin,
  CheckCircle,
  RotateCcw,
  Search,
  XCircle,
  UserPlus,
} from "lucide-react";
import api from "../../utils/api.js";
import { getLocationFast } from "../../utils/geolocation.js";
import QRGenerator from "./QRGenerator.jsx";
import AttendanceMap from "./AttendanceMap.jsx";

const SESSION_KEY = "attendx_active_session";
const OFFSET_KEY = "attendx_server_offset";

function saveSession(data) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch {}
}
function loadSession() {
  try {
    const v = sessionStorage.getItem(SESSION_KEY);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}
function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(OFFSET_KEY);
  } catch {}
}

const LiveSession = () => {
  const saved = loadSession();
  const [step, setStep] = useState(saved ? "active" : "select");
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [topic, setTopic] = useState("");
  const [window_, setWindow_] = useState(15);
  const [activeSession, setActiveSession] = useState(saved);
  const [loading, setLoading] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [attendanceList, setAttendanceList] = useState([]); // PRESENT rows only for display
  const [allStudents, setAllStudents] = useState([]); // full roster for manual mark
  const [liveSummary, setLiveSummary] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sessionResult, setSessionResult] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const [manualSearch, setManualSearch] = useState("");
  const [markingId, setMarkingId] = useState(null);
  const [serverTimeOffset, setServerTimeOffset] = useState(() => {
    try {
      return parseInt(sessionStorage.getItem(OFFSET_KEY) || "0", 10);
    } catch {
      return 0;
    }
  });
  const elapsedRef = useRef(null);
  const pollRef = useRef(null);
  const [assignmentSearch, setAssignmentSearch] = useState("");

  useEffect(() => {
    fetchAssignments();
    reconcileServerSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Clear stale local session if admin force-ended or server has no ACTIVE */
  const reconcileServerSession = async () => {
    try {
      const r = await api.get("/lecture/my-active");
      const server = r.data?.data;
      const local = loadSession();
      if (!server) {
        // No active on server — wipe local ghost session
        if (local) {
          clearSession();
          setActiveSession(null);
          setStep("select");
          setSessionResult(null);
        }
        return;
      }
      // Server has active — prefer server truth
      const offset = Date.now() - (server.serverTime || Date.now());
      setServerTimeOffset(offset);
      try {
        sessionStorage.setItem(OFFSET_KEY, String(offset));
      } catch {}
      const sessionData = {
        lectureSessionId: server.lectureSessionId,
        sessionToken: server.sessionToken,
        topic: server.topic,
        startTime: server.startTime,
        status: server.status,
        location: server.location,
        attendanceWindow: server.attendanceWindow,
        serverTime: server.serverTime,
      };
      saveSession(sessionData);
      setActiveSession(sessionData);
      setStep("active");
    } catch {
      /* offline — keep local */
    }
  };

  const fetchAttendanceStatus = useCallback(async () => {
    if (!activeSession?.lectureSessionId) return;
    try {
      const r = await api.get(
        `/lecture/${activeSession.lectureSessionId}`
      );
      const d = r.data?.data;
      setLiveSummary(d?.summary || null);
      const students = d?.students || [];
      setAllStudents(students);
      // Present-only list for the live "who scanned" panel
      const presentOnly = students.filter(
        (s) => s.status === "PRESENT" || s.status === "LATE"
      );
      setAttendanceList(
        presentOnly.length
          ? presentOnly
          : (d?.attendances || []).filter(
              (a) => a.status === "PRESENT" || a.status === "LATE"
            )
      );
    } catch {}
  }, [activeSession]);

  useEffect(() => {
    if (!activeSession) return;
    const start = new Date(activeSession.startTime).getTime();
    setElapsed(Math.floor((Date.now() - start) / 1000));
    elapsedRef.current = setInterval(
      () =>
        setElapsed(
          Math.floor(
            (Date.now() - new Date(activeSession.startTime).getTime()) / 1000
          )
        ),
      1000
    );
    pollRef.current = setInterval(fetchAttendanceStatus, 5000);
    fetchAttendanceStatus();
    return () => {
      clearInterval(elapsedRef.current);
      clearInterval(pollRef.current);
    };
  }, [activeSession, fetchAttendanceStatus]);

  const fetchAssignments = async () => {
    setLoadingAssignments(true);
    try {
      const r = await api.get("/faculty/assignments");
      setAssignments(r.data?.data || []);
    } catch {
      toast.error("Failed to load assignments");
    } finally {
      setLoadingAssignments(false);
    }
  };

  const startSession = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a lecture topic");
      return;
    }
    setLoading(true);
    try {
      // Warm-cache GPS first; if unavailable, still allow starting the
      // session WITHOUT classroom coordinates (students scan without
      // geofence then, but the lecture is never blocked).
      const position = await getLocationFast({ allowCached: true }).catch(
        () => null
      );
      const body = {
        subjectId:
          selectedAssignment.subjectId?._id || selectedAssignment.subjectId,
        sectionId:
          selectedAssignment.sectionId?._id || selectedAssignment.sectionId,
        topic: topic.trim(),
        attendanceWindow: window_,
        location: position
          ? {
              latitude: position.latitude,
              longitude: position.longitude,
              accuracy: position.accuracy ?? null,
              radius: 100,
            }
          : undefined,
      };
      const res = await api.post("/lecture/start", body);
      const data = res.data?.data;
      const offset = Date.now() - (data.serverTime || Date.now());
      setServerTimeOffset(offset);
      try {
        sessionStorage.setItem(OFFSET_KEY, String(offset));
      } catch {}
      const sessionData = {
        ...data,
        startTime: data.startTime || new Date().toISOString(),
      };
      clearSession();
      saveSession(sessionData);
      setActiveSession(sessionData);
      setElapsed(0);
      setAttendanceList([]);
      setAllStudents([]);
      setLiveSummary(null);
      setShowManual(false);
      setStep("active");
      toast.success("Session started!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const endSession = async () => {
    if (!activeSession) return;
    setLoading(true);
    const id = activeSession.lectureSessionId;
    try {
      await api.post("/lecture/end", { lectureSessionId: id });
      try {
        const r = await api.get(`/lecture/${id}`);
        setSessionResult(r.data?.data || null);
      } catch {
        setSessionResult(null);
      }
      toast.success("Session ended — absents saved for students");
    } catch (err) {
      // If admin already force-ended, still clear local UI
      const msg = err.response?.data?.message || "";
      if (err.response?.status === 404 || /already ended/i.test(msg)) {
        toast.info("Session was already ended");
        try {
          const r = await api.get(`/lecture/${id}`);
          setSessionResult(r.data?.data || null);
        } catch {
          setSessionResult(null);
        }
      } else {
        toast.error(msg || "Failed to end session");
        setLoading(false);
        return;
      }
    }
    clearSession();
    setActiveSession(null);
    setStep("ended");
    setLoading(false);
  };

  const manualMark = async (studentId, status) => {
    if (!activeSession?.lectureSessionId || !studentId) return;
    setMarkingId(String(studentId));
    try {
      const res = await api.post(
        `/lecture/${activeSession.lectureSessionId}/manual-mark`,
        { studentId, status }
      );
      toast.success(res.data?.message || `Marked ${status}`);
      await fetchAttendanceStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not mark");
    } finally {
      setMarkingId(null);
    }
  };

  const resetAll = () => {
    clearSession();
    setStep("select");
    setSelectedAssignment(null);
    setTopic("");
    setWindow_(15);
    setActiveSession(null);
    setElapsed(0);
    setAttendanceList([]);
    setAllStudents([]);
    setLiveSummary(null);
    setSessionResult(null);
    setIsFullscreen(false);
    setShowManual(false);
    setServerTimeOffset(0);
  };

  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const filteredAssignments = assignmentSearch.trim()
    ? assignments.filter((a) => {
        const subj = (
          (a.subjectId?.subjectName || "") +
          " " +
          (a.subjectId?.subjectCode || "")
        ).toLowerCase();
        const sec = (
          (a.sectionId?.name || "") +
          " " +
          (a.sectionId?.departmentId?.name || "")
        ).toLowerCase();
        const q = assignmentSearch.toLowerCase();
        return subj.includes(q) || sec.includes(q);
      })
    : assignments;

  const getSubjectName = (a) => a?.subjectId?.subjectName || "Unknown Subject";
  const getSectionName = (a) => a?.sectionId?.name || "Unknown Section";

  // Students not yet present — for manual late mark panel
  const needManual = allStudents.filter(
    (s) => s.status !== "PRESENT" && s.status !== "LATE" && s.status !== "EXCUSED"
  );
  const manualFiltered = manualSearch.trim()
    ? needManual.filter((s) => {
        const q = manualSearch.toLowerCase();
        return (
          (s.name || "").toLowerCase().includes(q) ||
          (s.rollNumber || "").toLowerCase().includes(q)
        );
      })
    : needManual;

  // ── ENDED ─────────────────────────────────────────────────────────
  // Rule: if present === 0 → show summary only (NO student detail lists)
  //       if present  > 0 → show ONLY present students' details
  if (step === "ended") {
    const sm = sessionResult?.summary || {};
    const presentCount = sm.present || 0;
    const presentStudents = (sessionResult?.students || []).filter(
      (s) => s.status === "PRESENT" || s.status === "LATE"
    );

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Session Ended
          </h2>
          <button
            type="button"
            onClick={resetAll}
            className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
          >
            <RotateCcw size={14} /> Start New
          </button>
        </div>

        <div className="glass-card p-5">
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-cyan-400">
                {sm.present ?? 0}
              </p>
              <p className="text-xs text-slate-400">Present</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-rose-400">
                {sm.absent ?? 0}
              </p>
              <p className="text-xs text-slate-400">Absent</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                {sm.totalStudents ?? 0}
              </p>
              <p className="text-xs text-slate-400">Total</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">
                {sm.attendanceRate ?? 0}%
              </p>
              <p className="text-xs text-slate-400">Rate</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 text-center mt-4">
            All unmarked students were saved as <span className="text-rose-400 font-semibold">ABSENT</span> on their accounts.
          </p>
          {presentCount > 0 && (
            <p className="text-xs text-center text-cyan-500/90 mt-2 font-medium">
              Scroll down for map pins of everyone who scanned with GPS.
            </p>
          )}
        </div>

        {sessionResult?.lecture?.location?.latitude != null && (
          <AttendanceMap
            title="Where present students scanned"
            classroom={sessionResult?.lecture?.location}
            students={[
              ...((sessionResult?.students || []).filter(
                (s) => s.status === "PRESENT" || s.status === "LATE"
              )),
              ...((sessionResult?.attendances || []).filter(
                (a) => a.status === "PRESENT" || a.status === "LATE"
              )),
            ]}
          />
        )}

        {presentCount > 0 && (
          <>
            <div className="glass-card p-4">
              <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <CheckCircle size={16} className="text-emerald-400" /> Present
                Students ({presentCount})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
                {presentStudents.map((s, i) => (
                  <div
                    key={s.id || i}
                    className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">
                      {s.name?.charAt(0) || "S"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {s.name || "Student"}
                      </p>
                      <p className="text-xs text-slate-400">{s.rollNumber}</p>
                      {s.location?.latitude != null && (
                        <p className="text-[10px] text-cyan-500/80 font-mono mt-0.5">
                          📍 {Number(s.location.latitude).toFixed(5)}, {Number(s.location.longitude).toFixed(5)}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[10px] font-bold ${s.status === "LATE" ? "text-amber-400" : "text-emerald-400"}`}>
                        {s.status}
                      </span>
                      <p className="text-xs text-slate-400">
                        {s.markedAt
                          ? new Date(s.markedAt).toLocaleTimeString()
                          : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {presentCount === 0 && (
          <div className="glass-card p-6 text-center">
            <XCircle size={40} className="mx-auto text-rose-400/80 mb-3" />
            <p className="font-semibold text-slate-800 dark:text-slate-100">
              No one was present
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Entire class marked absent. No student detail list is shown when present is 0.
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── ACTIVE ────────────────────────────────────────────────────────
  if (step === "active" && activeSession) {
    // Fullscreen QR: only the projector view (no other chrome)
    if (isFullscreen) {
      return (
        <QRGenerator
          sessionToken={activeSession.sessionToken}
          lectureSessionId={activeSession.lectureSessionId}
          serverTimeOffset={serverTimeOffset}
          isFullscreen={true}
          onToggleFullscreen={() => setIsFullscreen(false)}
        />
      );
    }
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              Live Session
            </h2>
            <p className="text-slate-400 text-sm mt-0.5">{activeSession.topic}</p>
          </div>
          <button
            type="button"
            onClick={endSession}
            disabled={loading}
            className="btn-danger text-sm py-2 px-4 flex items-center gap-2"
          >
            <Square size={14} /> {loading ? "Ending…" : "End Session"}
          </button>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Clock size={16} className="text-cyan-400" />
              <span className="font-mono font-bold text-lg">{fmt(elapsed)}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Users size={16} className="text-emerald-400" />
              <span className="font-bold text-lg">
                {liveSummary?.present ?? attendanceList.length} present
              </span>
            </div>
          </div>
          {liveSummary && (
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
              <span>
                <span className="text-slate-700 dark:text-slate-300 font-semibold">
                  {liveSummary.totalStudents}
                </span>{" "}
                enrolled
              </span>
              <span>
                <span className="text-rose-400 font-semibold">
                  {(liveSummary.totalStudents || 0) - (liveSummary.present || 0)}
                </span>{" "}
                not yet marked
              </span>
              <span>
                Rate{" "}
                <span className="text-cyan-400 font-semibold">
                  {liveSummary.attendanceRate ?? 0}%
                </span>
              </span>
            </div>
          )}
        </div>

        <QRGenerator
          sessionToken={activeSession.sessionToken}
          lectureSessionId={activeSession.lectureSessionId}
          serverTimeOffset={serverTimeOffset}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen((v) => !v)}
        />

        {/* ── MANUAL ATTENDANCE (faculty only — late students) ── */}
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <UserPlus size={18} className="text-cyan-400" />
              Manual attendance
            </h3>
            <button
              type="button"
              onClick={() => setShowManual((v) => !v)}
              className="btn-secondary text-sm py-2 px-3"
            >
              {showManual ? "Hide" : "Mark late student"}
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Student arrived late or QR failed? Mark them Present / Late here. Only you (faculty) can do this.
          </p>

          {showManual && (
            <>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  placeholder="Search name or roll number…"
                  className="input-field pl-9 py-2.5 text-sm"
                />
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
                {manualFiltered.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-6">
                    {needManual.length === 0
                      ? "Everyone is already marked present."
                      : "No match."}
                  </p>
                ) : (
                  manualFiltered.map((s) => {
                    const busy = markingId === String(s.id);
                    return (
                      <div
                        key={s.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                            {s.name?.charAt(0) || "S"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {s.name || "Student"}
                            </p>
                            <p className="text-xs text-slate-400 font-mono">
                              {s.rollNumber}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => manualMark(s.id, "PRESENT")}
                            className="text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-40"
                          >
                            {busy ? "…" : "Present"}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => manualMark(s.id, "LATE")}
                            className="text-xs font-semibold px-3 py-2 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 disabled:opacity-40"
                          >
                            Late
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => manualMark(s.id, "EXCUSED")}
                            className="text-xs font-semibold px-3 py-2 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/30 hover:bg-sky-500/25 disabled:opacity-40"
                          >
                            Excused
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Present-only live list */}
        <div className="glass-card p-4">
          <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <CheckCircle size={16} className="text-emerald-400" />
            Present now ({attendanceList.length})
          </h3>
          {attendanceList.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              No one present yet. Waiting for QR scans or manual mark…
            </p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
              {attendanceList.map((a, i) => {
                const name = a.name || a.student?.name || "Student";
                const roll = a.rollNumber || a.student?.rollNumber || "";
                const t = a.markedAt;
                return (
                  <div
                    key={a.id || i}
                    className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">
                      {name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{name}</p>
                      <p className="text-xs text-slate-400">{roll}</p>
                    </div>
                    <span className="text-xs text-slate-400">
                      {t ? new Date(t).toLocaleTimeString() : a.status || "P"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── SETUP ─────────────────────────────────────────────────────────
  if (step === "setup" && selectedAssignment) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => setStep("select")}
          className="text-sm text-cyan-400 font-medium"
        >
          ← Back
        </button>
        <div className="glass-card p-6 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
              Assignment
            </p>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
              {getSubjectName(selectedAssignment)}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {selectedAssignment.subjectId?.subjectCode} · Section{" "}
              {getSectionName(selectedAssignment)} · Sem{" "}
              {selectedAssignment.sectionId?.semester}
            </p>
          </div>
          <div>
            <label className="input-label">Lecture topic *</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="input-field"
              placeholder="e.g. Arrays & Linked Lists"
            />
          </div>
          <div>
            <label className="input-label">Attendance window (minutes)</label>
            <input
              type="number"
              min={5}
              max={120}
              value={window_}
              onChange={(e) => setWindow_(Number(e.target.value) || 15)}
              className="input-field"
            />
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={startSession}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Play size={18} /> {loading ? "Starting…" : "Start Live QR Session"}
          </button>
        </div>
      </div>
    );
  }

  // ── SELECT ────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          Start Session
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Choose one of your assigned classes
        </p>
      </div>

      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={assignmentSearch}
          onChange={(e) => setAssignmentSearch(e.target.value)}
          placeholder="Search subject or section…"
          className="input-field pl-10"
        />
      </div>

      {loadingAssignments ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <BookOpen
            size={48}
            className="mx-auto text-slate-300 dark:text-slate-600 mb-3"
          />
          <p className="text-slate-400">
            No assignments. Ask admin to assign subject + section.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAssignments.map((a) => (
            <button
              key={a._id}
              type="button"
              onClick={() => {
                setSelectedAssignment(a);
                setStep("setup");
              }}
              className="w-full glass-card p-4 flex items-center justify-between gap-3 text-left hover:border-cyan-500/40 transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0">
                  <BookOpen size={20} className="text-cyan-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                    {getSubjectName(a)}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {a.subjectId?.subjectCode} · {getSectionName(a)} ·{" "}
                    {a.sectionId?.departmentId?.name || ""} Sem{" "}
                    {a.sectionId?.semester} · Batch {a.sectionId?.batchYear}
                  </p>
                </div>
              </div>
              <ChevronRight
                size={16}
                className="text-slate-300 dark:text-slate-600 group-hover:text-cyan-400 shrink-0"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};


export default LiveSession;
