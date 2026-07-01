import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { Home, QrCode, BookOpen, LogOut, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { logout } from "../../store/authSlice.js";
import QRScanner from "../../components/Student/QRScanner.jsx";
import axiosInstance from "../../utils/axios.js";
import { toast } from "react-toastify";

const StudentDashboard = () => {
  const [activeTab, setActiveTab] = useState("home");
  const [attendance, setAttendance] = useState({ summary: {}, subjectBreakdown: [], details: [] });
  const [loading, setLoading] = useState(true);
  const { user } = useSelector(s => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => { fetchAttendance(); }, []);

  const fetchAttendance = async () => {
    try {
      const res = await axiosInstance.get("/api/report/student/my-attendance");
      setAttendance(res.data?.data || { summary: {}, subjectBreakdown: [], details: [] });
    } catch { }
    finally { setLoading(false); }
  };

  const handleLogout = () => { dispatch(logout()); toast.info("Logged out"); navigate("/login"); };

  const tabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "scan", label: "Scan QR", icon: QrCode },
    { id: "subjects", label: "Subjects", icon: BookOpen },
  ];

  const renderHome = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">Hi, {user?.name?.split(" ")[0] || "Student"}!</h2><p className="text-slate-400 text-sm mt-1">Your attendance overview</p></div>
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">{user?.name?.charAt(0)?.toUpperCase()||"S"}</div>
      </div>
      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin"/></div> : (
        <>
          <div className="grid grid-cols-2 gap-4">
            {[
              {label:"Attendance",value:`${attendance.summary?.percentage||0}%`,color:"text-cyan-400"},
              {label:"Total Lectures",value:attendance.summary?.totalLectures||0,color:"text-blue-400"},
              {label:"Present",value:attendance.summary?.present||0,color:"text-emerald-400"},
              {label:"Absent",value:attendance.summary?.absent||0,color:"text-rose-400"},
            ].map((s,i) => (
              <div key={i} className="glass-card p-4">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="glass-card p-5">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-cyan-400"/> Subject Summary</h3>
            {attendance.subjectBreakdown?.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No attendance data yet.</p>
            ) : attendance.subjectBreakdown?.map((sub, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 mb-2">
                <div>
                  <p className="font-medium text-sm">{sub.subject}</p>
                  <p className="text-xs text-slate-500">{sub.present}/{sub.total} classes</p>
                </div>
                <span className={`text-sm font-bold ${(sub.percentage||0)>=75?"text-emerald-400":(sub.percentage||0)>=50?"text-amber-400":"text-rose-400"}`}>{sub.percentage||0}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  const renderSubjects = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Your Subjects</h2>
      {attendance.subjectBreakdown?.length === 0 ? (
        <div className="glass-card p-8 text-center"><BookOpen size={48} className="mx-auto text-slate-600 mb-3"/><p className="text-slate-400">No subjects found yet.</p></div>
      ) : attendance.subjectBreakdown?.map((sub, i) => (
        <motion.div key={i} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.1 }} className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div><h3 className="font-bold">{sub.subject}</h3><p className="text-xs text-slate-500">{sub.subjectCode}</p></div>
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${(sub.percentage||0)>=75?"bg-emerald-500/10 text-emerald-400":(sub.percentage||0)>=50?"bg-amber-500/10 text-amber-400":"bg-rose-500/10 text-rose-400"}`}>{sub.percentage||0}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${(sub.percentage||0)>=75?"bg-emerald-500":(sub.percentage||0)>=50?"bg-amber-500":"bg-rose-500"}`} style={{ width:`${sub.percentage||0}%` }}/>
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-500"><span>Present: {sub.present||0}</span><span>Total: {sub.total||0}</span></div>
        </motion.div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-dark-900 text-slate-50 pb-24">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full"/>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-500/10 blur-[120px] rounded-full"/>
      </div>
      <header className="fixed top-0 left-0 right-0 z-40 glass-nav px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-black tracking-tight">Attend<span className="text-cyan-400">X</span></h1>
        <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-rose-400 transition-colors"><LogOut size={20}/></button>
      </header>
      <main className="relative z-10 pt-16 px-4 max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }} transition={{ duration:0.2 }}>
            {activeTab === "home" && renderHome()}
            {activeTab === "scan" && <QRScanner onBack={() => { setActiveTab("home"); fetchAttendance(); }}/>}
            {activeTab === "subjects" && renderSubjects()}
          </motion.div>
        </AnimatePresence>
      </main>
      <nav className="fixed bottom-0 left-0 right-0 z-40 glass-nav border-t border-slate-700/50">
        <div className="max-w-lg mx-auto flex justify-around px-4 py-2">
          {tabs.map(tab => {
            const Icon = tab.icon; const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-300 ${isActive?"text-cyan-400 bg-cyan-500/10":"text-slate-500 hover:text-slate-300"}`}>
                <Icon size={22}/><span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
export default StudentDashboard;
