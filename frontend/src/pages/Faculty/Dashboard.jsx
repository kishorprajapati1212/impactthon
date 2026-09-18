import { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  LayoutDashboard,
  QrCode,
  History,
  FileSpreadsheet,
  User,
  LogOut,
  BookOpen,
  Users,
  TrendingUp,
  Radio,
  ArrowRight,
  GraduationCap,
  HeartHandshake,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { logout } from "../../store/authSlice.js";
import LiveSession from "../../components/Faculty/LiveSession.jsx";
import SessionHistory from "../../components/Faculty/SessionHistory.jsx";
import ExcelReports from "../../components/Faculty/ExcelReports.jsx";
import Mentorship from "../../components/Faculty/Mentorship.jsx";
import FacultyProfile from "../../components/Faculty/Profile.jsx";
import ThemeToggle from "../../components/UI/ThemeToggle.jsx";
import api from "../../utils/api.js";

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "session", label: "Live Session", icon: QrCode },
  { id: "history", label: "History", icon: History },
  { id: "mentorship", label: "Mentorship", icon: HeartHandshake },
  { id: "reports", label: "Excel Reports", icon: FileSpreadsheet },
  { id: "profile", label: "Profile", icon: User },
];

const FacultyDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/api/report/faculty/dashboard");
      setStats(res.data?.data || null);
    } catch {
      /* silent — show zeros */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleLogout = () => {
    dispatch(logout());
    toast.info("Logged out");
    navigate("/login");
  };

  const statCards = [
    {
      label: "Total Lectures",
      value: stats?.stats?.totalLectures ?? 0,
      icon: BookOpen,
      accent: "from-cyan-500/15 to-blue-500/10 text-cyan-500",
    },
    {
      label: "Completed",
      value: stats?.stats?.completedLectures ?? 0,
      icon: TrendingUp,
      accent: "from-emerald-500/15 to-teal-500/10 text-emerald-500",
    },
    {
      label: "Active Now",
      value: stats?.stats?.activeLectures ?? 0,
      icon: Radio,
      accent: "from-amber-500/15 to-orange-500/10 text-amber-500",
    },
    {
      label: "Assignments",
      value: stats?.stats?.assignments ?? stats?.assignments?.length ?? 0,
      icon: Users,
      accent: "from-purple-500/15 to-fuchsia-500/10 text-purple-500",
    },
  ];

  const recent = (stats?.recentLectures || []).slice(0, 6);
  const initials =
    user?.name
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "FA";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* ── Sidebar (desktop) ─────────────────────────────────────── */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-30">
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800">
          <span className="text-xl font-black tracking-tight">
            Attend<span className="text-cyan-500">X</span>
          </span>
          <span className="ml-2 text-[10px] uppercase tracking-wider text-slate-400 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5">
            Faculty
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
              <p className="text-sm font-semibold truncate">
                {user?.name || "Faculty"}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {user?.employeeId || user?.email}
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

      {/* ── Header (mobile + desktop) ─────────────────────────────── */}
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

      {/* ── Main ──────────────────────────────────────────────────── */}
      <main className="lg:pl-64 px-4 sm:px-6 py-6 pb-28 lg:pb-6 max-w-5xl mx-auto">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Faculty workspace
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
                Welcome back, {user?.name?.split(" ")[0] || "Professor"} 👋
              </h2>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="card-2026 p-5 animate-pulse">
                    <div className="h-4 w-20 bg-slate-100 dark:bg-slate-800 rounded mb-3" />
                    <div className="h-7 w-12 bg-slate-100 dark:bg-slate-800 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((s, i) => (
                  <div key={i} className="card-2026 p-5">
                    <div
                      className={
                        "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3 " +
                        s.accent
                      }
                    >
                      <s.icon size={20} />
                    </div>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Quick actions */}
            <div className="grid sm:grid-cols-3 gap-3">
              <button
                onClick={() => setActiveTab("session")}
                className="card-2026 card-hover p-5 text-left"
              >
                <QrCode size={22} className="text-cyan-500 mb-2" />
                <p className="font-semibold text-sm">Start Live QR Session</p>
                <p className="text-xs text-slate-500 mt-1">
                  Project a rotating QR for students to scan
                </p>
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className="card-2026 card-hover p-5 text-left"
              >
                <History size={22} className="text-blue-500 mb-2" />
                <p className="font-semibold text-sm">Past Sessions</p>
                <p className="text-xs text-slate-500 mt-1">
                  Review who was present &amp; correct marks
                </p>
              </button>
              <button
                onClick={() => setActiveTab("reports")}
                className="card-2026 card-hover p-5 text-left"
              >
                <FileSpreadsheet size={22} className="text-emerald-500 mb-2" />
                <p className="font-semibold text-sm">Download Excel</p>
                <p className="text-xs text-slate-500 mt-1">
                  Roll no × dates attendance sheets
                </p>
              </button>
            </div>

            {/* Recent sessions */}
            <div className="card-2026 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  Recent Sessions
                </h3>
                <button
                  onClick={() => setActiveTab("history")}
                  className="text-sm text-cyan-500 font-medium inline-flex items-center gap-1"
                >
                  View all <ArrowRight size={14} />
                </button>
              </div>
              {recent.length === 0 ? (
                <div className="text-center py-8">
                  <GraduationCap
                    size={32}
                    className="mx-auto text-slate-300 dark:text-slate-600 mb-2"
                  />
                  <p className="text-sm text-slate-400">
                    No sessions yet — start your first live QR session.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recent.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40"
                    >
                      <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500 font-bold text-xs shrink-0">
                        {(s.subject || "L").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {s.topic || "Lecture"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {s.subject} · {s.section} ·{" "}
                          {s.date ? new Date(s.date).toLocaleDateString() : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-emerald-500">
                          {s.presentCount || 0}
                        </span>
                        <p className="text-[10px] text-slate-400">present</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "session" && <LiveSession />}
        {activeTab === "history" && <SessionHistory />}
        {activeTab === "mentorship" && <Mentorship />}
        {activeTab === "reports" && <ExcelReports />}
        {activeTab === "profile" && <FacultyProfile />}
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

export default FacultyDashboard;
