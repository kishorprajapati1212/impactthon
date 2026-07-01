import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, QrCode, Users, BarChart3 } from "lucide-react";
const HeroSection = () => {
  const navigate = useNavigate();
  return (
    <section className="relative pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-6">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" /> Smart Attendance System
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-tight mb-6">Attendance <br /><span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Made Simple</span></h1>
            <p className="text-lg text-slate-400 mb-8 max-w-lg leading-relaxed">Modern QR-based attendance tracking for educational institutions. Real-time insights and seamless management.</p>
            <div className="flex flex-wrap gap-4">
              <button onClick={() => navigate("/login")} className="btn-primary flex items-center gap-2">Get Started <ArrowRight size={18} /></button>
              <button onClick={() => navigate("/register")} className="btn-secondary">Create Account</button>
            </div>
            <div className="flex gap-8 mt-10">
              {[{icon:Users,label:"Students",color:"text-cyan-400"},{icon:QrCode,label:"QR Scans",color:"text-blue-400"},{icon:BarChart3,label:"Real-time Data",color:"text-purple-400"}].map((s,i) => (
                <div key={i} className="flex items-center gap-2"><s.icon size={20} className={s.color} /><span className="text-sm font-medium text-slate-300">{s.label}</span></div>
              ))}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="relative">
            <div className="relative z-10 glass-card p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500" /><div className="w-3 h-3 rounded-full bg-amber-500" /><div className="w-3 h-3 rounded-full bg-emerald-500" /></div>
                <span className="text-xs text-slate-500">Live Dashboard</span>
              </div>
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center"><QrCode size={18} className="text-cyan-400" /></div>
                    <div className="flex-1"><div className="h-2.5 w-24 bg-slate-700 rounded mb-1.5" /><div className="h-2 w-16 bg-slate-700/50 rounded" /></div>
                    <div className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">Present</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
export default HeroSection;
