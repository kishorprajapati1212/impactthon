import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { ArrowLeft, Users, Search, GraduationCap } from "lucide-react";
import axiosInstance from "../../utils/axios.js";

const AllStudents = () => {
  const [students, setStudents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStudents(); }, []);
  useEffect(() => {
    const t = search.toLowerCase();
    setFiltered(students.filter(s => {
      const name = s.userId?.name || "";
      const email = s.userId?.email || "";
      const roll = s.rollNumber || "";
      return name.toLowerCase().includes(t) || email.toLowerCase().includes(t) || roll.toLowerCase().includes(t);
    }));
  }, [search, students]);

  const fetchStudents = async () => {
    try {
      const res = await axiosInstance.get("/students");
      setStudents(res.data?.data || []);
      setFiltered(res.data?.data || []);
    } catch { toast.error("Failed to load students"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-dark-900 text-slate-50 p-4">
      <div className="relative z-10 max-w-4xl mx-auto pt-6">
        <Link to="/admin" className="inline-flex items-center text-slate-400 hover:text-cyan-400 mb-6 text-sm"><ArrowLeft size={16} className="mr-1"/> Back</Link>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2"><Users size={24} className="text-cyan-400"/> All Students ({students.length})</h2>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, roll..." className="input-field pl-9 py-2 text-sm w-64"/>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin"/></div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-8 text-center"><GraduationCap size={48} className="mx-auto text-slate-600 mb-3"/><p className="text-slate-400">No students found.</p></div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((s, i) => (
              <motion.div key={s._id||i} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.02 }} className="glass-card p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-400 font-bold shrink-0">
                  {s.userId?.name?.charAt(0)?.toUpperCase()||"S"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{s.userId?.name||"Unnamed"}</p>
                  <p className="text-xs text-slate-500 truncate">{s.userId?.email} • {s.rollNumber}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs text-slate-400 bg-slate-800/60 px-2 py-1 rounded-lg">{s.sectionId?.name||"No section"}</span>
                  <p className="text-xs text-slate-600 mt-1">Sem {s.semester}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default AllStudents;
