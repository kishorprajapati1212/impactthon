import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { ArrowLeft, Building2, Plus } from "lucide-react";
import axiosInstance from "../../utils/axios.js";

const CreateDepartment = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const navigate = useNavigate();
  const onSubmit = async (data) => {
    try { await axiosInstance.post("/department/create", data); toast.success("Department created!"); navigate("/admin"); }
    catch (err) { toast.error(err.response?.data?.message||"Failed"); }
  };
  return (
    <div className="min-h-screen bg-dark-900 text-slate-50 p-4">
      <div className="relative z-10 max-w-lg mx-auto pt-6">
        <Link to="/admin" className="inline-flex items-center text-slate-400 hover:text-cyan-400 mb-6 text-sm"><ArrowLeft size={16} className="mr-1"/> Back</Link>
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="glass-card p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-3"><Building2 size={28} className="text-purple-400"/></div>
            <h2 className="text-2xl font-bold">Create Department</h2>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Department Name *</label>
              <input {...register("name",{required:"Required"})} className="input-field" placeholder="e.g. Computer Science"/>
              {errors.name && <p className="text-rose-400 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Code * (auto-uppercased)</label>
              <input {...register("code",{required:"Required"})} className="input-field" placeholder="e.g. CSE"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</label>
              <textarea {...register("description")} className="input-field min-h-[80px]" placeholder="Brief description..."/>
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full flex items-center justify-center gap-2">
              {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><Plus size={18}/> Create Department</>}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};
export default CreateDepartment;
