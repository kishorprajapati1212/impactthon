import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { Play, Square, Users, Clock, BookOpen, ChevronRight, MapPin, CheckCircle } from "lucide-react";
import axiosInstance from "../../utils/axios.js";
import QRGenerator from "./QRGenerator.jsx";

const LiveSession = () => {
  const [step, setStep] = useState("select"); // select | form | active | ended
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [topic, setTopic] = useState("");
  const [window_, setWindow_] = useState(15);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [attendanceList, setAttendanceList] = useState([]);
  const [liveSummary, setLiveSummary] = useState(null); // { totalStudents, present, absent, attendanceRate }
  const [elapsed, setElapsed] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sessionResult, setSessionResult] = useState(null);
  const elapsedRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    fetchAssignments();
  }, []);

  useEffect(() => {
    if (activeSession) {
      elapsedRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
      pollRef.current = setInterval(fetchAttendanceStatus, 5000);
      fetchAttendanceStatus();
    }
    return () => {
      clearInterval(elapsedRef.current);
      clearInterval(pollRef.current);
    };
  }, [activeSession]);

  const fetchAssignments = async () => {
    setLoadingAssignments(true);
    try {
      const res = await axiosInstance.get("/faculty/assignments");
      setAssignments(res.data?.data || []);
    } catch { toast.error("Failed to load assignments"); }
    finally { setLoadingAssignments(false); }
  };

  const fetchAttendanceStatus = async () => {
    if (!activeSession) return;
    try {
      const res = await axiosInstance.get(`/lecture/${activeSession.lectureSessionId}`);
      const list = res.data?.data?.attendances || [];
      setAttendanceList(list);
      setLiveSummary(res.data?.data?.summary || null);
    } catch (e) { console.error(e); }
  };

  const startSession = async () => {
    if (!topic.trim()) { toast.error("Please enter a lecture topic"); return; }
    setLoading(true);
    try {
      // Get location
      const position = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 })
      ).catch(() => null);

      const body = {
        subjectId: selectedAssignment.subjectId?._id || selectedAssignment.subjectId,
        sectionId: selectedAssignment.sectionId?._id || selectedAssignment.sectionId,
        topic: topic.trim(),
        attendanceWindow: window_,
        location: position ? {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          radius: 100,
        } : undefined,
      };

      const res = await axiosInstance.post("/lecture/start", body);
      const data = res.data?.data;
      setActiveSession(data);
      setElapsed(0);
      setAttendanceList([]);
      setLiveSummary(null);
      setStep("active");
      toast.success("Session started!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to start session");
    } finally { setLoading(false); }
  };

  const endSession = async () => {
    if (!activeSession) return;
    setLoading(true);
    try {
      await axiosInstance.post("/lecture/end", { lectureSessionId: activeSession.lectureSessionId });
      // Fetch final attendance for map
      try {
        const res = await axiosInstance.get(`/lecture/${activeSession.lectureSessionId}`);
        setSessionResult(res.data?.data);
      } catch {}
      setStep("ended");
      toast.success("Session ended!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to end session");
    } finally { setLoading(false); }
  };

  const resetAll = () => {
    setStep("select");
    setSelectedAssignment(null);
    setTopic("");
    setWindow_(15);
    setActiveSession(null);
    setElapsed(0);
    setAttendanceList([]);
    setLiveSummary(null);
    setSessionResult(null);
    setIsFullscreen(false);
  };

  const fmt = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const getSubjectName = a => a.subjectId?.subjectName || "Unknown Subject";
  const getSectionName = a => a.sectionId?.name || "Unknown Section";

  // ── ENDED: post-session map ────────────────────────────────────────────────
  if (step === "ended" && sessionResult) {
    const classroom = sessionResult.lecture?.location;
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Session Ended</h2>
          <button onClick={resetAll} className="btn-primary text-sm py-2 px-4">Start New</button>
        </div>
        <div className="glass-card p-5">
          <div className="grid grid-cols-4 gap-3 text-center">
            <div><p className="text-2xl font-bold text-cyan-400">{sessionResult.summary?.present || 0}</p><p className="text-xs text-slate-400">Present</p></div>
            <div><p className="text-2xl font-bold text-rose-400">{sessionResult.summary?.absent || 0}</p><p className="text-xs text-slate-400">Absent</p></div>
            <div><p className="text-2xl font-bold text-slate-300">{sessionResult.summary?.totalStudents || 0}</p><p className="text-xs text-slate-400">Total</p></div>
            <div><p className="text-2xl font-bold text-emerald-400">{sessionResult.summary?.attendanceRate || 0}%</p><p className="text-xs text-slate-400">Rate</p></div>
          </div>
        </div>
        {/* Attendance map — loaded via Leaflet CDN */}
        <AttendanceMap classroom={classroom} students={sessionResult.attendances || []} />
        {/* Present students */}
        <div className="glass-card p-4">
          <h3 className="font-bold mb-3 flex items-center gap-2"><CheckCircle size={16} className="text-emerald-400"/> Present Students ({sessionResult.summary?.present || 0})</h3>
          {(sessionResult.attendances || []).length === 0 ? <p className="text-slate-500 text-sm text-center py-4">No attendance records</p> : (
            <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
              {(sessionResult.attendances || []).map((a, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/40">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">{a.student?.name?.charAt(0) || "S"}</div>
                  <div className="flex-1"><p className="text-sm font-medium">{a.student?.name || "Student"}</p><p className="text-xs text-slate-500">{a.student?.rollNumber}</p></div>
                  <span className="text-xs text-slate-500">{a.markedAt ? new Date(a.markedAt).toLocaleTimeString() : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Absent students */}
        <div className="glass-card p-4">
          <h3 className="font-bold mb-3 flex items-center gap-2 text-rose-400"><Users size={16}/> Absent Students ({sessionResult.summary?.absent || 0})</h3>
          {(sessionResult.absentees || []).length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">
              {sessionResult.summary?.totalStudents ? "Everyone showed up! 🎉" : "No section roster found to compare against."}
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
              {sessionResult.absentees.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-rose-500/5 border border-rose-500/10">
                  <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 text-xs font-bold">{s.name?.charAt(0) || "S"}</div>
                  <div className="flex-1"><p className="text-sm font-medium">{s.name || "Student"}</p><p className="text-xs text-slate-500">{s.rollNumber}</p></div>
                  <span className="text-xs text-rose-400 font-medium">Absent</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── ACTIVE session ─────────────────────────────────────────────────────────
  if (step === "active" && activeSession) {
    return (
      <div className="space-y-5">
        {isFullscreen ? (
          <div className="fixed inset-0 z-50 bg-dark-900 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md text-center mb-6">
              <p className="text-slate-400 text-sm">{getSubjectName(selectedAssignment)} • {getSectionName(selectedAssignment)}</p>
              <p className="font-bold text-lg mt-1">{activeSession.topic}</p>
            </div>
            <QRGenerator sessionToken={activeSession.sessionToken} lectureSessionId={activeSession.lectureSessionId} isFullscreen={true} onToggleFullscreen={() => setIsFullscreen(false)} />
            <button onClick={endSession} disabled={loading} className="mt-8 px-8 py-3 rounded-xl border border-rose-500 text-rose-400 hover:bg-rose-500/10 font-semibold flex items-center gap-2 transition-all">
              <Square size={16}/> End Session
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Live Session</h2>
              <button onClick={endSession} disabled={loading} className="text-sm py-2 px-4 rounded-xl border border-rose-500/50 text-rose-400 hover:bg-rose-500/10 font-semibold flex items-center gap-2 transition-all">
                <Square size={14}/> End
              </button>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300"><Clock size={16} className="text-cyan-400"/><span className="font-mono font-bold text-lg">{fmt(elapsed)}</span></div>
                <div className="flex items-center gap-2 text-slate-300"><Users size={16} className="text-emerald-400"/><span className="font-bold text-lg">{attendanceList.length} present</span></div>
              </div>
              {liveSummary && (
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                  <span><span className="text-slate-300 font-semibold">{liveSummary.totalStudents}</span> enrolled</span>
                  <span><span className="text-rose-400 font-semibold">{liveSummary.absent}</span> not yet marked</span>
                </div>
              )}
              <p className="text-xs text-slate-500 mt-2 truncate">{activeSession.topic} • {getSubjectName(selectedAssignment)}</p>
            </div>
            <QRGenerator sessionToken={activeSession.sessionToken} lectureSessionId={activeSession.lectureSessionId} isFullscreen={false} onToggleFullscreen={() => setIsFullscreen(true)} />
            {attendanceList.length > 0 && (
              <div className="glass-card p-4">
                <h3 className="font-semibold mb-3 text-sm text-slate-300">Present ({attendanceList.length})</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                  {attendanceList.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/40 text-sm">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">{a.student?.name?.charAt(0) || "S"}</div>
                      <span className="font-medium">{a.student?.name || "Student"}</span>
                      <span className="text-slate-500 text-xs ml-auto">{a.student?.rollNumber}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ── FORM: topic + window ───────────────────────────────────────────────────
  if (step === "form") {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setStep("select")} className="text-slate-400 hover:text-white text-sm">← Back</button>
          <h2 className="text-xl font-bold">Session Details</h2>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center"><BookOpen size={18} className="text-cyan-400"/></div>
          <div>
            <p className="font-semibold text-sm">{getSubjectName(selectedAssignment)}</p>
            <p className="text-xs text-slate-500">{getSectionName(selectedAssignment)}</p>
          </div>
        </div>
        <div className="glass-card p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Lecture Topic *</label>
            <input value={topic} onChange={e => setTopic(e.target.value)} className="input-field" placeholder="e.g. Introduction to Trees" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Attendance Window (minutes)</label>
            <select value={window_} onChange={e => setWindow_(+e.target.value)} className="input-field">
              {[5,10,15,20,30,45,60].map(m => <option key={m} value={m}>{m} minutes</option>)}
            </select>
            <p className="text-xs text-slate-600 mt-1">Students can mark within this time after session starts</p>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
            <MapPin size={14} className="text-cyan-400 shrink-0"/>
            <p className="text-xs text-slate-400">Your current location will be captured as the classroom. Students must be within 100m to mark attendance.</p>
          </div>
        </div>
        <button onClick={startSession} disabled={loading || !topic.trim()} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><Play size={18}/> Start Session</>}
        </button>
      </div>
    );
  }

  // ── SELECT assignment ──────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">Start Lecture</h2>
      <div className="glass-card p-5">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Select Subject / Section</label>
        {loadingAssignments ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin"/></div>
        ) : assignments.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">No assignments. Ask admin to assign you to a subject.</p>
        ) : (
          <div className="space-y-2">
            {assignments.map((a, i) => (
              <button key={i} onClick={() => { setSelectedAssignment(a); setStep("form"); }}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-700/50 bg-slate-800/40 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all text-left group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                    <BookOpen size={18} className="text-cyan-400"/>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{getSubjectName(a)}</p>
                    <p className="text-xs text-slate-500">{getSectionName(a)} • Sem {a.sectionId?.semester}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-600 group-hover:text-cyan-400 transition-colors"/>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Leaflet Map (CDN, no npm dep needed) ──────────────────────────────────────
const AttendanceMap = ({ classroom, students }) => {
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  useEffect(() => {
    if (!classroom?.latitude || !classroom?.longitude) return;
    if (leafletRef.current) return;
    const init = async () => {
      if (!window.L) {
        const link = document.createElement("link");
        link.rel = "stylesheet"; link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
        await new Promise(res => { const s = document.createElement("script"); s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; s.onload = res; document.head.appendChild(s); });
      }
      const L = window.L;
      const map = L.map(mapRef.current).setView([classroom.latitude, classroom.longitude], 17);
      leafletRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OSM", maxZoom: 19 }).addTo(map);
      const classIcon = L.divIcon({ className:"", html:`<div style="background:#06b6d4;width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(6,182,212,0.7)"></div>`, iconSize:[22,22], iconAnchor:[11,11] });
      L.marker([classroom.latitude, classroom.longitude], { icon: classIcon }).addTo(map).bindPopup("<b>📍 Classroom</b>").openPopup();
      L.circle([classroom.latitude, classroom.longitude], { radius: classroom.radius||100, color:"#06b6d4", fillColor:"#06b6d4", fillOpacity:0.08, weight:2, dashArray:"6 4" }).addTo(map);
      students.forEach(s => {
        if (!s.location?.latitude || !s.location?.longitude) return;
        const icon = L.divIcon({ className:"", html:`<div style="background:#22c55e;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 6px rgba(34,197,94,0.6)"></div>`, iconSize:[14,14], iconAnchor:[7,7] });
        L.marker([s.location.latitude, s.location.longitude], { icon }).addTo(map)
          .bindPopup(`<b>${s.student?.name||"Student"}</b><br>${s.student?.rollNumber||""}<br>${s.markedAt?new Date(s.markedAt).toLocaleTimeString():""}`);
      });
    };
    init();
    return () => { if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null; } };
  }, [classroom, students]);

  if (!classroom?.latitude) return (
    <div className="glass-card p-6 text-center text-slate-500">
      <MapPin size={32} className="mx-auto mb-2 opacity-40"/>
      <p className="text-sm">No location data — faculty location was not captured</p>
    </div>
  );
  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-slate-700/50 flex items-center gap-2">
        <MapPin size={16} className="text-cyan-400"/><h3 className="font-bold">Attendance Map</h3>
        <div className="ml-auto flex gap-3 text-xs text-slate-400">
          <span><span className="inline-block w-2 h-2 rounded-full bg-cyan-400 mr-1"/>Classroom</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1"/>Student</span>
        </div>
      </div>
      <div ref={mapRef} style={{ height: 320 }}/>
    </div>
  );
};

export default LiveSession;