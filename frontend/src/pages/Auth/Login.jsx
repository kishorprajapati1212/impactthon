import { useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { Eye, EyeOff, LogIn, Shield, GraduationCap, UserCog } from "lucide-react";
import axiosInstance from "../../utils/axios.js";
import { login } from "../../store/authSlice.js";

const Login = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [role, setRole] = useState("student");
  const [showPass, setShowPass] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const roleConfig = {
    student: { icon: GraduationCap, label: "Student", color: "cyan" },
    faculty: { icon: UserCog, label: "Faculty", color: "blue" },
    admin: { icon: Shield, label: "Admin", color: "purple" },
  };

  const onSubmit = async (data) => {
    try {
      const res = await axiosInstance.post(`/${role}/login`, { email: data.email, password: data.password });
      const payload = res.data?.data || res.data;
      dispatch(login({ token: payload.token, user: { role, id: payload._id, name: payload.name, email: payload.email } }));
      toast.success(`Welcome, ${payload.name}!`);
      navigate(`/${role}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 blur-[120px] rounded-full" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <div className="glass-card p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black tracking-tight mb-2">Attend<span className="text-cyan-400">X</span></h1>
            <p className="text-slate-400">Smart Attendance Management</p>
          </div>
          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Select Role</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(roleConfig).map(([key, { icon: Icon, label, color }]) => (
                <button key={key} type="button" onClick={() => setRole(key)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${role === key ? `border-${color}-500/50 bg-${color}-500/10 text-${color}-400` : "border-slate-700/50 bg-slate-800/40 text-slate-500 hover:border-slate-600"}`}>
                  <Icon size={20} /><span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email</label>
              <input type="email" {...register("email", { required: "Email required" })} className="input-field" placeholder="you@example.com" />
              {errors.email && <p className="text-rose-400 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} {...register("password", { required: "Password required" })} className="input-field pr-12" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"><EyeOff size={18} /></button>
              </div>
              {errors.password && <p className="text-rose-400 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full flex items-center justify-center gap-2">
              {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><LogIn size={18} /> Sign In as {roleConfig[role].label}</>}
            </button>
          </form>
          <p className="text-center text-slate-500 text-sm mt-6">No account? <Link to="/register" className="text-cyan-400 hover:text-cyan-300">Register here</Link></p>
        </div>
      </motion.div>
    </div>
  );
};
export default Login;
