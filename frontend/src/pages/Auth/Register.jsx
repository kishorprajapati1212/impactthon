import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { ArrowLeft, UserPlus, GraduationCap, UserCog, Shield } from "lucide-react";
import axiosInstance from "../../utils/axios.js";

const Register = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [role, setRole] = useState("student");
  const [sections, setSections] = useState([]);
  const [departments, setDepartments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([axiosInstance.get("/sections"), axiosInstance.get("/departments")])
      .then(([s, d]) => { setSections(s.data?.data || []); setDepartments(d.data?.data || []); })
      .catch(() => {});
  }, []);

  const onSubmit = async (data) => {
    try {
      // Fix field names before sending
      const payload = {
        name: role === "student" ? `${data.firstName} ${data.lastName}` : data.name,
        email: data.email,
        password: data.password,
        ...(role === "student" && { rollNumber: data.rollNumber, sectionId: data.sectionId, departmentId: data.departmentId }),
        ...(role === "faculty" && { employeeId: data.employeeId, departmentId: data.departmentId }),
        ...(role === "admin" && { employeeId: data.employeeId }),
      };
      
      // Log payload ritik
      console.log(payload)

      await axiosInstance.post(`/${role}/create`, payload);
      toast.success("Account created!");
      navigate("/login");
    } catch (err) { toast.error(err.response?.data?.message || "Registration failed"); }
  };

  const roleConfig = { student: { icon: GraduationCap, label: "Student" }, faculty: { icon: UserCog, label: "Faculty" }, admin: { icon: Shield, label: "Admin" } };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg relative z-10">
        <Link to="/login" className="inline-flex items-center text-slate-400 hover:text-cyan-400 mb-4 text-sm"><ArrowLeft size={16} className="mr-1" /> Back</Link>
        <div className="glass-card p-8 shadow-2xl">
          <h1 className="text-3xl font-black mb-6 text-center">Create Account</h1>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {Object.entries(roleConfig).map(([key, { icon: Icon, label }]) => (
              <button key={key} type="button" onClick={() => setRole(key)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${role === key ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400" : "border-slate-700/50 bg-slate-800/40 text-slate-500"}`}>
                <Icon size={18} /><span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {role === "student" ? (
              <div className="grid grid-cols-2 gap-3">
                <div><label className="input-label">First Name</label><input {...register("firstName", { required: true })} className="input-field" placeholder="John" /></div>
                <div><label className="input-label">Last Name</label><input {...register("lastName", { required: true })} className="input-field" placeholder="Doe" /></div>
              </div>
            ) : (
              <div><label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Full Name</label><input {...register("name", { required: true })} className="input-field" placeholder="Full name" /></div>
            )}
            <div><label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Email</label><input type="email" {...register("email", { required: true })} className="input-field" placeholder="email@example.com" /></div>
            <div><label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Password</label><input type="password" {...register("password", { required: true, minLength: 6 })} className="input-field" placeholder="Min 6 chars" /></div>
            {role === "student" && (
              <>
                <div><label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Roll Number</label><input {...register("rollNumber", { required: true })} className="input-field" placeholder="e.g. CS2024001" /></div>
                <div><label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Section</label>
                  <select {...register("sectionId")} className="input-field">
                    <option value="">Select Section</option>
                    {sections.map(s => <option key={s._id} value={s._id}>{s.name} — Sem {s.semester} ({s.batchYear})</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Department</label>
                  <select {...register("departmentId")} className="input-field">
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}
                  </select>
                </div>
              </>
            )}
            {(role === "faculty" || role === "admin") && (
              <div><label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Employee ID</label><input {...register("employeeId", { required: true })} className="input-field" placeholder="e.g. FAC001" /></div>
            )}
            {role === "faculty" && (
              <div><label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Department</label>
                <select {...register("departmentId")} className="input-field">
                  <option value="">Select Department</option>
                  {departments.map(d => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}
                </select>
              </div>
            )}
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
              {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><UserPlus size={18} /> Create Account</>}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
export default Register;
