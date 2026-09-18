import { QrCode, ScanLine, CheckCircle, BarChart3 } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: QrCode,
    title: "Faculty Generates QR",
    description:
      "The teacher starts a live lecture and a secure QR appears, refreshing every 5 seconds on the projector or screen.",
    color: "text-cyan-500",
  },
  {
    number: "02",
    icon: ScanLine,
    title: "Student Scans QR",
    description:
      "Each student opens the app and points their phone camera at the code — recognition takes under a second.",
    color: "text-blue-500",
  },
  {
    number: "03",
    icon: CheckCircle,
    title: "GPS + QR Verified",
    description:
      "AttendX validates the QR signature and the student's live GPS against the classroom geofence before accepting.",
    color: "text-emerald-500",
  },
  {
    number: "04",
    icon: BarChart3,
    title: "Attendance Recorded",
    description:
      "Attendance is stored instantly with coordinates. Faculty and admins see live reports, analytics and Excel export.",
    color: "text-purple-500",
  },
];

const HowItWorksSection = () => (
  <section
    id="how-it-works"
    className="py-20 px-4 sm:px-6 bg-white dark:bg-slate-900/40 border-y border-slate-200 dark:border-slate-800"
  >
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-14">
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-500 mb-2">
          How it works
        </p>
        <h2 className="text-3xl sm:text-4xl font-black mb-4 text-slate-900 dark:text-slate-50">
          Four steps, thirty seconds
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg">
          From lecture start to complete attendance record — no roll call, no
          paperwork.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {steps.map(({ number, icon: Icon, title, description, color }, i) => (
          <div key={i} className="card-2026 p-6 text-center relative">
            <span className="absolute top-3 right-5 text-5xl font-black text-slate-100 dark:text-slate-800 select-none">
              {number}
            </span>
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 relative z-10">
              <Icon size={26} className={color} />
            </div>
            <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-slate-100 relative z-10">
              {title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed relative z-10">
              {description}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
