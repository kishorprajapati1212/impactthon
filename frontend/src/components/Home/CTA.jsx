import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
const CTA = () => {
  const navigate = useNavigate();
  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="glass-card p-10 sm:p-16 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 blur-[100px] rounded-full" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-6"><Sparkles size={14} /> Get Started Today</div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Transform <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Attendance?</span></h2>
            <p className="text-slate-400 max-w-xl mx-auto mb-8">Join students and faculty already using AttendX to streamline attendance with real-time location verification.</p>
            <button onClick={() => navigate("/login")} className="btn-primary inline-flex items-center gap-2">Start Using AttendX <ArrowRight size={18} /></button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
export default CTA;
