import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, Users, Search, GraduationCap } from "lucide-react";
import api from "../../utils/api.js";

const AllStudents = () => {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/students?limit=500")
      .then(r => setStudents(r.data?.data || []))
      .catch(() => toast.error("Failed to load students"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = search.trim()
    ? students.filter(s => {
        const name = (s.userId?.name || "").toLowerCase();
        const email = (s.userId?.email || "").toLowerCase();
        const roll = (s.rollNumber || "").toLowerCase();
        const q = search.toLowerCase();
        return name.includes(q) || email.includes(q) || roll.includes(q);
      })
    : students;

  return (
    <div className="min-h-screen bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-50 transition-colors p-4">
      <div className="max-w-5xl mx-auto pt-6">
        <Link to="/admin" className="inline-flex items-center text-slate-500 hover:text-cyan-400 mb-6 text-sm transition-colors">
          <ArrowLeft size={16} className="mr-1"/> Back to Admin
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users size={24} className="text-cyan-400"/>
            All Students
            <span className="text-sm font-normal text-slate-500">({filtered.length} of {students.length})</span>
          </h2>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, roll..."
              className="input-field pl-9 py-2 text-sm w-64"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin"/>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <GraduationCap size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3"/>
            <p className="text-slate-500">{search ? "No students match your search." : "No students found."}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((s) => (
              <div key={s._id} className="glass-card p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-400 font-bold shrink-0">
                  {s.userId?.name?.charAt(0)?.toUpperCase() || "S"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-900 dark:text-slate-200 truncate">
                    {s.userId?.name || "Unnamed"}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {s.rollNumber} &bull; {s.userId?.email || "No email"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="badge badge-info">{s.sectionId?.name || "No section"}</span>
                  <p className="text-xs text-slate-500 mt-1">Sem {s.semester}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllStudents;
