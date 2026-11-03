import { useState, useEffect, useRef, useCallback } from "react";
import toast from "../../utils/notify.js";
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
  MapPinOff,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import api from "../../utils/api.js";
import getFriendlyError from "../../utils/friendlyError.js";
import {
  getLocationFast,
  getCachedLocation,
  getLocationPermission,
  watchLocationPermission,
  prewarmLocation,
} from "../../utils/geolocation.js";
import { classLabel, classLabelLong, subjectLabel } from "../../utils/classLabel.js";
import QRGenerator from "./QRGenerator.jsx";
import AttendanceMap from "./AttendanceMap.jsx";
import DeleteLectureDialog from "../UI/DeleteLectureDialog.jsx";

const SESSION_KEY = "attendx_active_session";
const OFFSET_KEY = "attendx_server_offset";
/** Never make a teacher wait longer than this for a GPS fix when starting. */
const START_LOCATION_WAIT_MS = 8_000;

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
  const [deleteOpen, setDeleteOpen] = useState(false); // "started by mistake" → delete the running session
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
  // Location readiness for the start form: "checking" | "granted" | "prompt" | "denied" | "unsupported"
  const [locPerm, setLocPerm] = useState("checking");
  const [locFix, setLocFix] = useState(() => getCachedLocation());
  const [locBusy, setLocBusy] = useState(false);
  const [startPhase, setStartPhase] = useState(null); // null | "locating" | "starting"
  const skipLocationRef = useRef(null); // resolver that lets "Start without location" cut the wait short

  const refreshLocation = useCallback(async () => {
    setLocBusy(true);
    try {
      const fix = await prewarmLocation();
      if (fix) setLocFix(fix);
      setLocPerm(await getLocationPermission());
    } finally {
      setLocBusy(false);
    }
  }, []);

  // When the teacher reaches the start form, find out (without prompting)
  // whether location is allowed and warm the GPS so Start is instant.
  useEffect(() => {
    if (step !== "setup") return undefined;
    let alive = true;
    getLocationPermission().then((perm) => {
      if (!alive) return;
      setLocPerm(perm);
      if (perm === "granted" && !getCachedLocation()) refreshLocation();
    });
    const unsub = watchLocationPermission((perm) => {
      if (!alive) return;
      setLocPerm(perm);
      if (perm === "granted") refreshLocation();
    });
    return () => { alive = false; unsub(); };
  }, [step, refreshLocation]);

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
        subject: server.subject,
        section: server.section,
        classLabel: server.classLabel || classLabel(server.section),
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
    } catch (err) {
      // 404 while polling = the lecture no longer exists (an admin deleted it).
      if (err?.response?.status === 404) {
        clearSession();
        setActiveSession(null);
        setSessionResult(null);
        setAttendanceList([]);
        setAllStudents([]);
        setLiveSummary(null);
        setStep("select");
        toast.info("This session was deleted by an admin. Start a new one if needed.");
      }
    }
  }, [activeSession]);

  /** The running session was started by mistake and has just been deleted. */
  const afterSessionDeleted = () => {
    clearSession();
    setActiveSession(null);
    setSessionResult(null);
    setAttendanceList([]);
    setAllStudents([]);
    setLiveSummary(null);
    setElapsed(0);
    setStep("select");
  };

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

  /** Resolve the classroom location without ever hanging the Start button. */
  const resolveStartLocation = async ({ withLocation }) => {
    if (!withLocation || locPerm === "denied" || locPerm === "unsupported") return null;
    const cached = getCachedLocation();
    if (cached) return cached;
    setStartPhase("locating");
    const skip = new Promise((resolve) => { skipLocationRef.current = resolve; });
    try {
      return await Promise.race([
        getLocationFast({ allowCached: true, timeoutMs: START_LOCATION_WAIT_MS }).catch(() => null),
        skip,
      ]);
    } finally {
      skipLocationRef.current = null;
    }
  };

  const startSession = async ({ withLocation = true } = {}) => {
    if (!topic.trim()) {
      toast.error("Please enter a lecture topic");
      return;
    }
    setLoading(true);
    try {
      // A GPS fix lets the server check that students are in the room. It is
      // optional: if location is blocked, slow (> 8 s) or skipped, the lecture
      // still starts and students simply scan without the distance check.
      const position = await resolveStartLocation({ withLocation });
      setStartPhase("starting");
      if (position) setLocFix(position);
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
        subject: selectedAssignment.subjectId,
        section: selectedAssignment.sectionId,
        classLabel: classLabel(selectedAssignment.sectionId),
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
      if (position) toast.success("Session started. Students must be near your location to scan.");
      else toast.info("Session started without a location — students can scan from anywhere.");
    } catch (err) {
      toast.error(getFriendlyError(err, "Could not start the session."));
    } finally {
      setLoading(false);
      setStartPhase(null);
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
        toast.error(getFriendlyError(err, "Could not end the session."));
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
      toast.error(getFriendlyError(err, "Could not mark this student."));
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
          classLabelLong(a.sectionId) +
          " " +
          (a.sectionId?.departmentId?.name || "")
        ).toLowerCase();
        const q = assignmentSearch.toLowerCase();
        return subj.includes(q) || sec.includes(q);
      })
    : assignments;

  const getSubjectName = (a) => a?.subjectId?.subjectName || "Unknown Subject";
  /** "Web Development (CE501) · CE · A · 2024" for the running / ended session. */
  const sessionContextLine = (lec) => {
    const subj = lec?.subject || activeSession?.subject || selectedAssignment?.subjectId;
    const sec = lec?.section || activeSession?.section || selectedAssignment?.sectionId;
    const label = lec?.classLabel || activeSession?.classLabel || classLabel(sec);
    const parts = [subj ? subjectLabel(subj) : null, label && label !== "Class" ? label : null];
    return parts.filter(Boolean).join(" · ");
  };

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
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              Session Ended
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5 break-words">
              {sessionContextLine(sessionResult?.lecture)}
              {(sessionResult?.lecture?.topic || activeSession?.topic)
                ? ` — ${sessionResult?.lecture?.topic || activeSession?.topic}`
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={resetAll}
            className="btn-primary text-sm py-2 px-4 flex items-center gap-2 shrink-0"
          >
            <RotateCcw size={14} /> Start New
          </button>
        </div>

        {!sessionResult && (
          <div className="glass-card p-5 text-center">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Session ended, but the result could not be loaded.</p>
            <p className="text-sm text-slate-500 mt-1">Your attendance is saved. Check this session in History to see the full roster and map.</p>
          </div>
        )}
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

        {/* Map is shown for EVERY ended session: with GPS it draws pins,
            without GPS AttendanceMap explains what is missing. */}
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
                        <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono mt-0.5 inline-flex items-center gap-1">
                          <MapPin size={10} /> {Number(s.location.latitude).toFixed(5)}, {Number(s.location.longitude).toFixed(5)}
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
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              Live Session
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm mt-0.5 break-words">
              {sessionContextLine(null)}
              {activeSession.topic ? ` — ${activeSession.topic}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={endSession}
            disabled={loading}
            className="btn-danger text-sm py-2 px-4 flex items-center gap-2 shrink-0 whitespace-nowrap"
          >
            <Square size={14} /> {loading ? "Ending…" : "End Session"}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Started this session by mistake (wrong class, or two at once)? Delete it instead of ending it — ending would save everyone as absent.</span>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 px-2.5 py-1.5 font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10 shrink-0 whitespace-nowrap"
          >
            <Trash2 size={13} /> Delete this session
          </button>
        </div>
        <DeleteLectureDialog
          open={deleteOpen}
          lectureId={activeSession.lectureSessionId}
          onClose={() => setDeleteOpen(false)}
          onDeleted={afterSessionDeleted}
        />

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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <UserPlus size={18} className="text-cyan-500" />
              Manual attendance
            </h3>
            <button
              type="button"
              onClick={() => setShowManual((v) => !v)}
              className="btn-secondary text-sm py-2 px-3 w-full sm:w-auto"
            >
              {showManual ? "Hide" : "Mark a late student"}
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Student arrived late or the QR failed? Mark them Present or Late here. Only you can do this.
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
          className="inline-flex items-center gap-1 text-sm font-medium text-cyan-700 hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-300"
        >
          <ArrowLeft size={16} /> Back to my classes
        </button>
        <div className="glass-card p-6 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
              Class
            </p>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
              {subjectLabel(selectedAssignment.subjectId)}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {classLabelLong(selectedAssignment.sectionId)}
              {selectedAssignment.sectionId?.departmentId?.name
                ? ` · ${selectedAssignment.sectionId.departmentId.name}`
                : ""}
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
          {/* Location status — the teacher always knows what will happen on Start */}
          <LocationStatus
            perm={locPerm}
            fix={locFix}
            busy={locBusy}
            onAllow={refreshLocation}
          />

          <button
            type="button"
            disabled={loading}
            onClick={() => startSession({ withLocation: true })}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
            {startPhase === "locating"
              ? "Getting your location…"
              : startPhase === "starting"
                ? "Starting…"
                : "Start Live QR Session"}
          </button>
          {startPhase === "locating" ? (
            <button
              type="button"
              onClick={() => skipLocationRef.current?.(null)}
              className="w-full text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              Taking too long? Start without location
            </button>
          ) : !loading && (locPerm === "prompt" || locPerm === "denied" || locPerm === "unsupported") ? (
            <button
              type="button"
              onClick={() => startSession({ withLocation: false })}
              className="w-full text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              Start without location
            </button>
          ) : null}
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
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Choose the class you are about to teach. Classes are named department · division · batch.
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
          placeholder="Search by subject, class or batch…"
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
          <p className="text-slate-500 dark:text-slate-400">
            You have no classes yet. Ask the admin to assign you a subject and class.
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
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {a.subjectId?.subjectCode ? `${a.subjectId.subjectCode} · ` : ""}
                    {classLabelLong(a.sectionId)}
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

/** One-line location readiness row shown above the Start button. */
function LocationStatus({ perm, fix, busy, onAllow }) {
  const base = "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm";
  if (perm === "checking") {
    return (
      <div className={`${base} border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300`}>
        <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin" />
        <p>Checking location permission…</p>
      </div>
    );
  }
  if (perm === "unsupported") {
    return (
      <div className={`${base} border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300`}>
        <MapPinOff size={16} className="mt-0.5 shrink-0" />
        <p>This browser cannot share a location. The session will start without a distance check.</p>
      </div>
    );
  }
  if (perm === "denied") {
    return (
      <div className={`${base} border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200`}>
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">Location is blocked for this site.</p>
          <p className="mt-0.5 text-xs leading-relaxed">
            You can still start — students will scan without the distance check. To allow it: tap the lock or
            site-settings icon next to the address, set Location to Allow, then come back here.
          </p>
        </div>
      </div>
    );
  }
  if (fix) {
    return (
      <div className={`${base} border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200`}>
        <MapPin size={16} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">Location ready{fix.accuracy != null ? ` (±${Math.round(fix.accuracy)} m)` : ""}.</p>
          <p className="mt-0.5 text-xs">Students will need to be near you to scan.</p>
        </div>
        <button type="button" onClick={onAllow} disabled={busy} className="shrink-0 text-xs font-medium underline-offset-2 hover:underline disabled:opacity-50">
          {busy ? "Updating…" : "Refresh"}
        </button>
      </div>
    );
  }
  if (perm === "granted" || busy) {
    return (
      <div className={`${base} border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300`}>
        <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin" />
        <p>Finding your location… Start is not blocked; if it takes longer than 8 seconds the session starts without it.</p>
      </div>
    );
  }
  // "prompt": the browser has not asked yet
  return (
    <div className={`${base} border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300`}>
      <MapPin size={16} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">Share your location so only students in the room can scan.</p>
        <p className="mt-0.5 text-xs">The browser will ask once. Optional — you can start without it.</p>
      </div>
      <button type="button" onClick={onAllow} className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
        Allow location
      </button>
    </div>
  );
}

export default LiveSession;
