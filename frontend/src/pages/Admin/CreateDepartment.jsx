import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, Building2, Plus } from "lucide-react";
import api from "../../utils/api.js";

const CreateDepartment = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      await api.post("/department/create", data);
      toast.success("Department created!");
      navigate("/admin");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create department");
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-50 transition-colors p-4">
      <div className="max-w-lg mx-auto pt-6">
        <Link to="/admin" className="inline-flex items-center text-slate-500 hover:text-cyan-400 mb-6 text-sm transition-colors">
          <ArrowLeft size={16} className="mr-1"/> Back to Admin
        </Link>

        <div className="glass-card p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
              <Building2 size={28} className="text-purple-400"/>
            </div>
            <h2 className="text-2xl font-bold">Create Department</h2>
            <p className="text-slate-500 text-sm mt-1">Add a new academic department</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="input-label">Department Name *</label>
              <input
                {...register("name", { required: "Department name is required" })}
                className="input-field"
                placeholder="e.g. Computer Science"
              />
              {errors.name && <p className="text-rose-400 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="input-label">Department Code *</label>
              <input
                {...register("code", { required: "Code is required" })}
                className="input-field"
                placeholder="e.g. CSE"
              />
              <p className="text-xs text-slate-500 mt-1">Code is auto-capitalized: "cse" becomes "CSE"</p>
              {errors.code && <p className="text-rose-400 text-xs mt-1">{errors.code.message}</p>}
            </div>

            <div>
              <label className="input-label">Description (optional)</label>
              <textarea
                {...register("description")}
                className="input-field min-h-[80px]"
                placeholder="Brief description of the department..."
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              ) : (
                <><Plus size={18}/> Create Department</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateDepartment;
