import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { ArrowLeft, LayoutGrid, Plus } from "lucide-react";
import axiosInstance from "../../utils/axios.js";

const CreateSection = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    axiosInstance.get("/departments").then(r => setDepartments(r.data?.data||[])).catch(()=>{});
  }, []);

  const onSubmit = async (data) => {
    try {
      // Fixed: batchYear (not year), added departmentId and semester
      await axiosInstance.post("/section/create", {
        name: data.name,
        departmentId: data.departmentId,
        semester: parseInt(data.semester),
        batchYear: parseInt(data.batchYear),
      });
      toast.success("Section created!");
      navigate("/admin");
    } catch (err) { toast.error(err.response?.data?.message||"Failed"); }
  };

  return (
    <div className="min-h-screen bg-dark-900 text-slate-50 p-4">
      <div className="relative z-10 max-w-lg mx-auto pt-6">
        <Link to="/admin" className="inline-flex items-center text-slate-400 hover:text-cyan-400 mb-6 text-sm"><ArrowLeft size={16} className="mr-1"/> Back</Link>
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="glass-card p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-3"><LayoutGrid size={28} className="text-amber-400"/></div>
            <h2 className="text-2xl font-bold">Create Section</h2>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Section Name *</label>
              <input {...register("name",{required:"Required"})} className="input-field" placeholder="e.g. Section A"/>
              {errors.name && <p className="text-rose-400 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Department *</label>
              <select {...register("departmentId",{required:"Required"})} className="input-field">
                <option value="">Select Department</option>
                {departments.map(d => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}
              </select>
              {errors.departmentId && <p className="text-rose-400 text-xs mt-1">{errors.departmentId.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Semester *</label>
                <select {...register("semester",{required:"Required"})} className="input-field">
                  {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Sem {s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Batch Year *</label>
                <input type="number" min="2020" max="2030" defaultValue={new Date().getFullYear()} {...register("batchYear",{required:"Required"})} className="input-field" placeholder="e.g. 2024"/>
              </div>
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full flex items-center justify-center gap-2">
              {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><Plus size={18}/> Create Section</>}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};
export default CreateSection;
