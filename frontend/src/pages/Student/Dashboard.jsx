import { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Home,
  QrCode,
  BookOpen,
  History,
  LogOut,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  CalendarClock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { logout } from "../../store/authSlice.js";
import QRScanner from "../../components/Student/QRScanner.jsx";
import LeaveModule from "../../components/Student/LeaveModule.jsx";
import ThemeToggle from "../../components/UI/ThemeToggle.jsx";
import api from "../../utils/api.js";
import { prewarmLocation } from "../../utils/geolocation.js";

const statusBadge = (status) => {
  if (status === "PRESENT" || status === "LATE") return "badge-success";
  if (status === "PENDING") return "badge-warning";
  if (status === "LEAVE") return "badge-info";
  if (status === "EXCUSED") return "badge-info";
  return "badge-danger";
};

const statusLabel = (status) => {
  if (status === "LEAVE") return "On Leave";
  if (status === "EXCUSED") return "Excused";
  return status;
};

const NAV = [
  { id: "home", label: "Home", icon: Home },
  { id: "scan", label: "Scan QR", icon: QrCode },
  { id: "subjects", label: "Subjects", icon: BookOpen },
  { id: "leave", label: "Leave", icon: CalendarClock },
  { id: "history", label: "History", icon: History },
];

const StudentDashboard = () => {
  const [activeTab, setActiveTab] = useState("home");
  const [attendance, setAttendance] = useState({
    summary: {},
    subjectBreakdown: [],
    details: [],
  });
  const [loading, setLoading] = useState(true);
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const fetchAttendance = useCallback(async () => {
    try {
      const res = await api.get("/api/report/student/my-attendance");
      setAttendance(
        res.data?.data || { summary: {}, subjectBreakdown: [], details: [] }
      );
    } catch {
      toast.error("Could not load attendance");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttendance();
    // Warm the GPS fix right after login so the first scan never fails.
    prewarmLocation();
  }, [fetchAttendance]);

  const handleLogout = () => {
    // Tell the server to drop this device session so the NEXT login needs
    // the mentor's approval again (device-bound one-time login).
    api.post("/student/logout", {}).catch(() => {});
    dispatch(logout());
    toast.info("Logged out — next login needs your mentor's approval");
    navigate("/login");
  };

  const summary = attendance.summary || {};
  const breakdown = attendance.subjectBreakdown || [];
  const details = attendance.details || [];

  const initials =
    user?.name
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "ST";

  const pct = summary.percentage ?? 0;

  const renderHome = () => (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Student workspace
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
          Hi, {user?.name?.split(" ")[0] || "Student"} 👋
        </h2>
      </div>

      {loading ? (
        <div className="card-2026 p-8 flex justify-center">
          <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Overall attendance ring card */}
          <div className="card-2026 p-6 flex items-center gap-6">
            <div className="relative w-28 h-28 shrink-0">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  strokeWidth="10"
                  className="stroke-slate-100 dark:stroke-slate-800"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  strokeWidth="10"
                  strokeLinecap="round"
                  stroke={pct >= 75 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#f43f5e"}
                  strokeDasharray={`${(pct / 100) * 263.9} 263.9`}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black">{pct}%</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400">
                  attendance
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 flex-1 text-center">
              {[
                { l: "Lectures", v: summary.totalLectures ?? 0, c: "text-slate-700 dark:text-slate-200" },
                { l: "Present", v: summary.present ?? 0, c: "text-emerald-500" },
                { l: "Absent", v: summary.absent ?? 0, c: "text-rose-500" },
              ].map((s, i) => (
                <div key={i}>
                  <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400">
                    {s.l}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Scan CTA */}
          <button
            onClick={() => setActiveTab("scan")}
            className="w-full card-2026 card-hover p-6 text-center bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border-cyan-500/30"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-cyan-500/30">
              <QrCode size={26} />
            </div>
            <p className="font-bold text-lg text-slate-900 dark:text-slate-100">
              Scan QR for Attendance
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              GPS is pre-warmed · just point your camera at the live QR
            </p>
          </button>

          {/* Subject summary */}
          <div className="card-2026 p-5">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <TrendingUp size={18} className="text-cyan-500" /> Subject Summary
            </h3>
            {breakdown.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">
                No attendance data yet.
              </p>
            ) : (
              breakdown.map((sub, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 mb-2"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                      {sub.subject}
                    </p>
                    <p className="text-xs text-slate-500">
                      Present {sub.present}/{sub.total} · Absent {sub.absent || 0}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold shrink-0 ${
                      (sub.percentage || 0) >= 75
                        ? "text-emerald-500"
                        : (sub.percentage || 0) >= 50
                          ? "text-amber-500"
                          : "text-rose-500"
                    }`}
                  >
                    {sub.percentage || 0}%
                  </span>
                </div>
              ))
            )}
          </div>

          {details.filter((d) => d.status === "ABSENT").length > 0 && (
            <div className="card-2026 p-5 border-rose-500/20">
              <h3 className="font-bold text-sm mb-3 text-rose-500 flex items-center gap-2">
                <XCircle size={16} /> Recent absences
              </h3>
              <div className="space-y-2">
                {details
                  .filter((d) => d.status === "ABSENT")
                  .slice(0, 6)
                  .map((d, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-xs p-2.5 rounded-lg bg-rose-500/5"
                    >
                      <span className="text-slate-700 dark:text-slate-300">
                        {d.subject} — {d.topic}
                      </span>
                      <span className="text-slate-400 shrink-0 ml-2">
                        {d.date ? new Date(d.date).toLocaleDateString() : ""}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderSubjects = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
        Your Subjects
      </h2>
      {breakdown.length === 0 ? (
        <div className="card-2026 p-8 text-center">
          <BookOpen
            size={48}
            className="mx-auto text-slate-300 dark:text-slate-600 mb-3"
          />
          <p className="text-slate-400">No subjects found yet.</p>
        </div>
      ) : (
        breakdown.map((sub, i) => (
          <div key={i} className="card-2026 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  {sub.subject}
                </h3>
                <p className="text-xs text-slate-400">{sub.subjectCode}</p>
              </div>
              <span
                className={`badge ${
                  (sub.percentage || 0) >= 75
                    ? "badge-success"
                    : (sub.percentage || 0) >= 50
                      ? "badge-warning"
                      : "badge-danger"
                }`}
              >
                {sub.percentage || 0}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (sub.percentage || 0) >= 75
                    ? "bg-emerald-500"
                    : (sub.percentage || 0) >= 50
                      ? "bg-amber-500"
                      : "bg-rose-500"
                }`}
                style={{ width: `${Math.min(100, sub.percentage || 0)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-400">
              <span>Present: {sub.present || 0}</span>
              <span>Absent: {sub.absent || 0}</span>
              <span>Total: {sub.total || 0}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
        Lecture history
      </h2>
      <p className="text-xs text-slate-400">
        Every class for your section — present and absent.
      </p>
      {details.length === 0 ? (
        <div className="card-2026 p-8 text-center text-slate-400">
          No lectures yet.
        </div>
      ) : (
        details.map((d, i) => (
          <div key={i} className="card-2026 p-4 flex items-start gap-3">
            {d.status === "PRESENT" || d.status === "LATE" ? (
              <CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5" />
            ) : d.status === "PENDING" ? (
              <Clock size={18} className="text-amber-500 shrink-0 mt-0.5" />
            ) : d.status === "LEAVE" || d.status === "EXCUSED" ? (
              <CalendarClock size={18} className="text-cyan-500 shrink-0 mt-0.5" />
            ) : (
              <XCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                  {d.topic || "Lecture"}
                </p>
                <span className={`badge shrink-0 ${statusBadge(d.status)}`}>
                  {statusLabel(d.status)}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {d.subject} {d.subjectCode ? `· ${d.subjectCode}` : ""}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {d.date ? new Date(d.date).toLocaleString() : ""}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const CurrentView = () => {
    if (activeTab === "home") return renderHome();
    if (activeTab === "scan")
      return (
        <QRScanner
          onBack={() => {
            setActiveTab("home");
            fetchAttendance();
          }}
        />
      );
    if (activeTab === "subjects") return renderSubjects();
    if (activeTab === "leave") return <LeaveModule />;
    if (activeTab === "history") return renderHistory();
    return renderHome();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* ── Sidebar (desktop) ─────────────────────────────────────── */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-30">
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800">
          <span className="text-xl font-black tracking-tight">
            Attend<span className="text-cyan-500">X</span>
          </span>
          <span className="ml-2 text-[10px] uppercase tracking-wider text-slate-400 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5">
            Student
          </span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors " +
                  (active
                    ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800")
                }
              >
                <Icon size={18} className={active ? "text-cyan-500" : ""} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">
                {user?.rollNumber || user?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
              title="Logout"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      <header className="lg:pl-64 sticky top-0 z-20 surface-nav h-16 flex items-center px-4 sm:px-6">
        <h1 className="lg:hidden text-xl font-black tracking-tight">
          Attend<span className="text-cyan-500">X</span>
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="lg:pl-64 px-4 sm:px-6 py-6 pb-28 lg:pb-6 max-w-3xl mx-auto">
        <CurrentView />
      </main>

      {/* ── Bottom nav (mobile) ───────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 surface-nav border-t border-slate-200 dark:border-slate-800">
        <div className="flex justify-around px-2 py-1.5">
          {NAV.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={
                  "flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl min-w-[60px] transition-colors " +
                  (active
                    ? "text-cyan-500"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300")
                }
              >
                <Icon size={20} />
                <span className="text-[10px] font-semibold">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default StudentDashboard;
