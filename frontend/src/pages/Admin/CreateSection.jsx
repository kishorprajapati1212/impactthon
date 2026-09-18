import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, LayoutGrid, Plus } from "lucide-react";
import api from "../../utils/api.js";

const currentYear = new Date().getFullYear();

const CreateSection = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    api.get("/departments")
      .then(r => setDepartments(r.data?.data || []))
      .catch(() => {});
  }, []);

  const onSubmit = async (data) => {
    try {
      await api.post("/section/create", {
        name: data.name,
        departmentId: data.departmentId,
        semester: parseInt(data.semester),
        batchYear: parseInt(data.batchYear),
      });
      toast.success("Section created!");
      navigate("/admin");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create section");
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
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
              <LayoutGrid size={28} className="text-amber-400"/>
            </div>
            <h2 className="text-2xl font-bold">Create Section</h2>
            <p className="text-slate-500 text-sm mt-1">Add a new class section</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="input-label">Section Name *</label>
              <input
                {...register("name", { required: "Section name is required" })}
                className="input-field"
                placeholder="e.g. Section A"
              />
              {errors.name && <p className="text-rose-400 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="input-label">Department *</label>
              <select
                {...register("departmentId", { required: "Department is required" })}
                className="input-field"
              >
                <option value="">Select Department</option>
                {departments.map(d => (
                  <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                ))}
              </select>
              {errors.departmentId && <p className="text-rose-400 text-xs mt-1">{errors.departmentId.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">Semester *</label>
                <select
                  {...register("semester", { required: "Semester is required" })}
                  className="input-field"
                >
                  {Array.from({ length: 16 }, (_, i) => i + 1).map(s => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
                {errors.semester && <p className="text-rose-400 text-xs mt-1">{errors.semester.message}</p>}
              </div>

              <div>
                <label className="input-label">Batch Year *</label>
                <input
                  type="number"
                  min="2000"
                  max={currentYear + 10}
                  defaultValue={currentYear}
                  {...register("batchYear", { required: "Batch year is required" })}
                  className="input-field"
                  placeholder={`e.g. ${currentYear}`}
                />
                {errors.batchYear && <p className="text-rose-400 text-xs mt-1">{errors.batchYear.message}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              ) : (
                <><Plus size={18}/> Create Section</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateSection;
