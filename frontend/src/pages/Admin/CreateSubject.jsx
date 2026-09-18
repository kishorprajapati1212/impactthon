import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, BookOpen, Plus } from "lucide-react";
import api from "../../utils/api.js";

const CreateSubject = () => {
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
      await api.post("/subject/create", {
        subjectName: data.subjectName,
        subjectCode: data.subjectCode,
        departmentId: data.departmentId || undefined,
        credits: parseInt(data.credits) || 3,
        semester: parseInt(data.semester) || 1,
      });
      toast.success("Subject created!");
      navigate("/admin");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create subject");
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
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
              <BookOpen size={28} className="text-blue-400"/>
            </div>
            <h2 className="text-2xl font-bold">Create Subject</h2>
            <p className="text-slate-500 text-sm mt-1">Add a new subject to the curriculum</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="input-label">Subject Name *</label>
              <input
                {...register("subjectName", { required: "Subject name is required" })}
                className="input-field"
                placeholder="e.g. Data Structures"
              />
              {errors.subjectName && <p className="text-rose-400 text-xs mt-1">{errors.subjectName.message}</p>}
            </div>

            <div>
              <label className="input-label">Subject Code *</label>
              <input
                {...register("subjectCode", { required: "Code is required" })}
                className="input-field"
                placeholder="e.g. CS201"
              />
              <p className="text-xs text-slate-500 mt-1">Auto-capitalized — "cs201" becomes "CS201"</p>
              {errors.subjectCode && <p className="text-rose-400 text-xs mt-1">{errors.subjectCode.message}</p>}
            </div>

            <div>
              <label className="input-label">Department</label>
              <select {...register("departmentId")} className="input-field">
                <option value="">Select Department (optional)</option>
                {departments.map(d => (
                  <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">Credits</label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  defaultValue="3"
                  {...register("credits")}
                  className="input-field"
                />
              </div>
              <div>
                <label className="input-label">Semester</label>
                <select {...register("semester")} className="input-field" defaultValue="1">
                  {Array.from({ length: 16 }, (_, i) => i + 1).map(s => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
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
                <><Plus size={18}/> Create Subject</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateSubject;
