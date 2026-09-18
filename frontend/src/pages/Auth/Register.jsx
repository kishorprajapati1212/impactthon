import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, UserPlus, GraduationCap, UserCog, Shield } from "lucide-react";
import api from "../../utils/api.js";

const Register = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm();
  const [activeRole, setActiveRole] = useState("student");
  const [sections, setSections] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [serverError, setServerError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get("/sections"),
      api.get("/departments"),
      api.get("/faculty"),
    ]).then(([secRes, deptRes, facRes]) => {
      setSections(secRes.data?.data || []);
      setDepartments(deptRes.data?.data || []);
      setFaculty(facRes.data?.data || []);
    }).catch(() => {});
  }, []);

  const roleTabs = [
    { key: "student", icon: GraduationCap, label: "Student" },
    { key: "faculty", icon: UserCog, label: "Faculty" },
    { key: "admin", icon: Shield, label: "Admin" },
  ];

  const onSubmit = async (data) => {
    setServerError("");
    let payload = {};

    if (activeRole === "student") {
      payload = {
        name: [data.firstName, data.lastName].filter(Boolean).join(" ").trim(),
        email: data.email,
        password: data.password,
        rollNumber: data.rollNumber,
        sectionId: data.sectionId || undefined,
        departmentId: data.departmentId || undefined,
        mentorId: data.mentorId || undefined,
        enrollmentYear: data.enrollmentYear ? parseInt(data.enrollmentYear) : undefined,
        semester: data.semester ? parseInt(data.semester) : undefined,
        phone: data.phone || undefined,
        parentPhone: data.parentPhone || undefined,
      };
    } else if (activeRole === "faculty") {
      payload = {
        name: data.name,
        email: data.email,
        password: data.password,
        employeeId: data.employeeId,
        departmentId: data.departmentId || undefined,
        designation: data.designation || undefined,
        phone: data.phone || undefined,
        specialization: data.specialization || undefined,
      };
    } else if (activeRole === "admin") {
      payload = {
        name: data.name,
        email: data.email,
        password: data.password,
        employeeId: data.employeeId,
        phone: data.phone || undefined,
      };
    }

    try {
      await api.post("/" + activeRole + "/create", payload);
      toast.success("Account created!");
      navigate("/login");
    } catch (err) {
      const msg = err.response?.data?.message || "Registration failed";
      setServerError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-dark-900 flex items-center justify-center p-4 relative overflow-hidden transition-colors">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/5 dark:bg-blue-600/10 blur-[120px] rounded-full" />
      <div className="w-full max-w-lg relative z-10">
        <Link to="/admin" className="inline-flex items-center text-slate-500 hover:text-cyan-400 mb-4 text-sm transition-colors">
          <ArrowLeft size={16} className="mr-1" /> Back to Admin
        </Link>

        <div className="glass-card p-8 shadow-2xl">
          <h1 className="text-3xl font-black mb-6 text-center text-slate-900 dark:text-slate-50">Create Account</h1>

          {/* Role selector */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {roleTabs.map(({ key, icon: Icon, label }) => {
              const isActive = activeRole === key;
              return (
                <button key={key} type="button" onClick={() => { setActiveRole(key); setServerError(""); }}
                  className={"flex flex-col items-center gap-1 p-3 rounded-xl border transition-all duration-200 " + (isActive
                    ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400"
                    : "border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/40 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600")}>
                  <Icon size={18} /><span className="text-xs font-medium">{label}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <p className="text-rose-400 text-sm text-center">{serverError}</p>
              </div>
            )}

            {/* Name */}
            {activeRole === "student" ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">First Name *</label>
                  <input {...register("firstName", { required: "Required" })} className="input-field" placeholder="John" />
                  {errors.firstName && <p className="text-rose-400 text-xs mt-1">{errors.firstName.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Last Name *</label>
                  <input {...register("lastName", { required: "Required" })} className="input-field" placeholder="Doe" />
                  {errors.lastName && <p className="text-rose-400 text-xs mt-1">{errors.lastName.message}</p>}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Full Name *</label>
                <input {...register("name", { required: "Name is required" })} className="input-field" placeholder="Dr. Full Name" />
                {errors.name && <p className="text-rose-400 text-xs mt-1">{errors.name.message}</p>}
              </div>
            )}

            {/* Email + Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email *</label>
              <input type="email" {...register("email", { required: "Email is required" })} className="input-field" placeholder="email@example.com" autoComplete="email" />
              {errors.email && <p className="text-rose-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Password *</label>
              <input type="password" {...register("password", { required: "Password is required", minLength: { value: 6, message: "Min 6 characters" } })} className="input-field" placeholder="Min 6 characters" autoComplete="new-password" />
              {errors.password && <p className="text-rose-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            {/* Student fields */}
            {activeRole === "student" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Roll Number *</label>
                  <input {...register("rollNumber", { required: "Roll number is required" })} className="input-field" placeholder="e.g. CS2024001" />
                  {errors.rollNumber && <p className="text-rose-400 text-xs mt-1">{errors.rollNumber.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Enrollment Year</label>
                    <input type="number" {...register("enrollmentYear")} className="input-field" placeholder={String(new Date().getFullYear())} defaultValue={new Date().getFullYear()} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Semester</label>
                    <select {...register("semester")} className="input-field" defaultValue="1">
                      {Array.from({ length: 16 }, (_, i) => i + 1).map(s => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Section</label>
                  <select {...register("sectionId")} className="input-field">
                    <option value="">Select Section</option>
                    {sections.map(s => (
                      <option key={s._id} value={s._id}>{s.departmentId?.name || ""} - {s.name} Sem {s.semester} Batch {s.batchLabel || s.batchYear}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Department</label>
                  <select {...register("departmentId")} className="input-field">
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Mentor (Faculty)</label>
                  <select {...register("mentorId")} className="input-field">
                    <option value="">No mentor yet</option>
                    {faculty.map(f => <option key={f._id} value={f._id}>{f.userId?.name || f.employeeId} ({f.employeeId})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Phone</label>
                    <input {...register("phone")} className="input-field" placeholder="9876543210" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Parent Phone</label>
                    <input {...register("parentPhone")} className="input-field" placeholder="9876543211" />
                  </div>
                </div>
              </>
            )}

            {/* Faculty fields */}
            {activeRole === "faculty" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Employee ID *</label>
                  <input {...register("employeeId", { required: "Employee ID is required" })} className="input-field" placeholder="e.g. FAC001" />
                  {errors.employeeId && <p className="text-rose-400 text-xs mt-1">{errors.employeeId.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Department</label>
                  <select {...register("departmentId")} className="input-field">
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Designation</label>
                    <input {...register("designation")} className="input-field" placeholder="Assistant Professor" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Phone</label>
                    <input {...register("phone")} className="input-field" placeholder="9876543210" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Specialization</label>
                  <input {...register("specialization")} className="input-field" placeholder="e.g. Algorithms, Database Systems" />
                </div>
              </>
            )}

            {/* Admin fields */}
            {activeRole === "admin" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Employee ID *</label>
                  <input {...register("employeeId", { required: "Employee ID is required" })} className="input-field" placeholder="e.g. ADM001" />
                  {errors.employeeId && <p className="text-rose-400 text-xs mt-1">{errors.employeeId.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Phone</label>
                  <input {...register("phone")} className="input-field" placeholder="9876543210" />
                </div>
              </>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
              {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><UserPlus size={18} /> Create {activeRole} Account</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
export default Register;
