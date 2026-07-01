import { motion } from "framer-motion";
import { UserPlus, QrCode, ScanLine, BarChart3 } from "lucide-react";
const steps = [
  {icon:UserPlus,title:"Register Users",desc:"Admin creates accounts for students and faculty with proper section and department assignment."},
  {icon:QrCode,title:"Start Session",desc:"Faculty starts a lecture — server generates a signed token. QR refreshes every 10 seconds."},
  {icon:ScanLine,title:"Scan & Verify",desc:"Student scans QR. Location is verified against the classroom. Attendance marked instantly."},
  {icon:BarChart3,title:"View Reports",desc:"See live count during session. After ending, view a map of all student scan locations."},
];
const HowItWorksSection = () => (
  <section id="how-it-works" className="py-20 px-4 sm:px-6">
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">How It <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Works</span></h2>
        <p className="text-slate-400 max-w-2xl mx-auto">Four steps to secure, location-verified attendance.</p>
      </motion.div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((s,i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i*0.15 }}>
            <div className="glass-card p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <s.icon size={28} className="text-cyan-400" />
              </div>
              <div className="text-xs font-bold text-cyan-400 mb-2">Step {i+1}</div>
              <h3 className="text-lg font-bold mb-2">{s.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);
export default HowItWorksSection;
