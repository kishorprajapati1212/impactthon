import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { ArrowLeft, UserCheck, Plus, Loader2 } from "lucide-react";
import axiosInstance from "../../utils/axios.js";

const AssignFaculty = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [faculty, setFaculty] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      axiosInstance.get("/faculty"),
      axiosInstance.get("/subjects"),
      axiosInstance.get("/sections"),
    ]).then(([fR, sR, secR]) => {
      setFaculty(fR.data?.data || []);
      setSubjects(sR.data?.data || []);
      setSections(secR.data?.data || []);
    }).catch(() => toast.error("Failed to load data"))
    .finally(() => setLoading(false));
  }, []);

  // Faculty model has: { _id, userId: { name, email }, employeeId, designation }
  const getFacultyLabel = f => {
    const name = f.userId?.name || "Unnamed";
    const emp = f.employeeId || "";
    return `${name}${emp ? ` (${emp})` : ""}`;
  };

  const onSubmit = async (data) => {
    try {
      await axiosInstance.post("/faculty-subject-section", {
        facultyId: data.facultyId,
        subjectId: data.subjectId,
        sectionId: data.sectionId,
        academicYear: new Date().getFullYear(),
        semester: 1,
      });
      toast.success("Faculty assigned!");
      navigate("/admin");
    } catch (err) { toast.error(err.response?.data?.message || "Assignment failed"); }
  };

  return (
    <div className="min-h-screen bg-dark-900 text-slate-50 p-4">
      <div className="relative z-10 max-w-lg mx-auto pt-6">
        <Link to="/admin" className="inline-flex items-center text-slate-400 hover:text-cyan-400 mb-6 text-sm"><ArrowLeft size={16} className="mr-1"/> Back</Link>
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="glass-card p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3"><UserCheck size={28} className="text-emerald-400"/></div>
            <h2 className="text-2xl font-bold">Assign Faculty</h2>
            <p className="text-slate-400 text-sm mt-1">Map faculty to a subject and section</p>
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={32} className="text-cyan-400 animate-spin"/></div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Faculty * ({faculty.length})</label>
                <select {...register("facultyId",{required:"Required"})} className="input-field">
                  <option value="">Select Faculty</option>
                  {faculty.map(f => <option key={f._id} value={f._id}>{getFacultyLabel(f)}</option>)}
                </select>
                {errors.facultyId && <p className="text-rose-400 text-xs mt-1">{errors.facultyId.message}</p>}
                {faculty.length===0 && <p className="text-amber-400 text-xs mt-1">No faculty — create faculty accounts first.</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Subject * ({subjects.length})</label>
                <select {...register("subjectId",{required:"Required"})} className="input-field">
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s._id} value={s._id}>{s.subjectName} ({s.subjectCode})</option>)}
                </select>
                {errors.subjectId && <p className="text-rose-400 text-xs mt-1">{errors.subjectId.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Section * ({sections.length})</label>
                <select {...register("sectionId",{required:"Required"})} className="input-field">
                  <option value="">Select Section</option>
                  {sections.map(s => <option key={s._id} value={s._id}>{s.name} — Sem {s.semester} ({s.batchYear})</option>)}
                </select>
                {errors.sectionId && <p className="text-rose-400 text-xs mt-1">{errors.sectionId.message}</p>}
              </div>
              <button type="submit" disabled={isSubmitting||faculty.length===0||subjects.length===0||sections.length===0} className="btn-primary w-full flex items-center justify-center gap-2">
                {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><Plus size={18}/> Assign</>}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
};
export default AssignFaculty;
