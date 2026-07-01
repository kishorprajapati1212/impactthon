import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Users, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import axiosInstance from "../../utils/axios.js";
import { toast } from "react-toastify";

const SessionHistory = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [detail, setDetail] = useState({});

  useEffect(() => { fetchSessions(); }, []);

  const fetchSessions = async () => {
    try {
      // Use faculty dashboard which returns recentLectures
      const res = await axiosInstance.get("/api/report/faculty/dashboard");
      setSessions(res.data?.data?.recentLectures || []);
    } catch { toast.error("Failed to load session history"); }
    finally { setLoading(false); }
  };

  const loadDetail = async (id) => {
    if (detail[id]) { setExpanded(expanded === id ? null : id); return; }
    try {
      const res = await axiosInstance.get(`/api/report/lecture/${id}/summary`);
      setDetail(d => ({ ...d, [id]: res.data?.data }));
      setExpanded(id);
    } catch { toast.error("Failed to load session detail"); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin"/></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Session History</h2>
      {sessions.length === 0 ? (
        <div className="glass-card p-8 text-center"><Calendar size={48} className="mx-auto text-slate-600 mb-3"/><p className="text-slate-400">No past sessions yet.</p></div>
      ) : sessions.map((s, i) => (
        <motion.div key={s.id||i} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.05 }} className="glass-card overflow-hidden">
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-bold">{s.topic || "Lecture"}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{s.subject} • {s.section}</p>
                <p className="text-xs text-slate-600">{s.date ? new Date(s.date).toLocaleString() : ""}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-bold shrink-0 ${s.status==="COMPLETED"?"bg-emerald-500/10 text-emerald-400":"bg-amber-500/10 text-amber-400"}`}>{s.status}</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-slate-400"><Users size={14}/>{s.presentCount || 0} present</span>
            </div>
            {s.status === "COMPLETED" && (
              <button onClick={() => loadDetail(s.id)} className="w-full mt-3 flex items-center justify-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors py-2 rounded-lg hover:bg-cyan-500/5">
                {expanded === s.id ? <><ChevronUp size={14}/> Hide details</> : <><ChevronDown size={14}/> View attendance</>}
              </button>
            )}
          </div>
          {expanded === s.id && detail[s.id] && (
            <div className="border-t border-slate-700/50 p-4 bg-slate-900/30">
              <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                <div className="bg-slate-800/40 rounded-xl p-3"><p className="text-lg font-bold text-cyan-400">{detail[s.id].summary?.present||0}</p><p className="text-xs text-slate-500">Present</p></div>
                <div className="bg-slate-800/40 rounded-xl p-3"><p className="text-lg font-bold text-slate-300">{detail[s.id].summary?.totalStudents||0}</p><p className="text-xs text-slate-500">Total</p></div>
                <div className="bg-slate-800/40 rounded-xl p-3"><p className="text-lg font-bold text-emerald-400">{detail[s.id].summary?.attendanceRate||0}%</p><p className="text-xs text-slate-500">Rate</p></div>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                {(detail[s.id].students||[]).map((st, j) => (
                  <div key={j} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/30 text-sm">
                    <CheckCircle size={14} className={st.status==="PRESENT"?"text-emerald-400":"text-slate-600"}/>
                    <span className="font-medium">{st.name||"Student"}</span>
                    <span className="text-slate-500 text-xs">{st.rollNumber}</span>
                    <span className={`ml-auto text-xs font-medium ${st.status==="PRESENT"?"text-emerald-400":"text-rose-400"}`}>{st.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};
export default SessionHistory;
