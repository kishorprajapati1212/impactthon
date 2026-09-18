import {
  QrCode,
  MapPin,
  BarChart3,
  ShieldCheck,
  Zap,
  Smartphone,
  FileSpreadsheet,
  Bell,
  Users,
} from "lucide-react";

const features = [
  {
    icon: QrCode,
    title: "Dynamic QR Codes",
    description:
      "QR codes rotate every 5 seconds and expire in ~25s, so screenshots and remote proxies are useless.",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
  {
    icon: MapPin,
    title: "GPS Geofence Verification",
    description:
      "Every scan is cross-checked against the classroom coordinates — students must be physically present.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description:
      "Live attendance trends, department-wise rates and individual student reports at a glance.",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    icon: ShieldCheck,
    title: "Role-Based Access",
    description:
      "Secure, separate dashboards for Admin, Faculty and Students — each with scoped permissions.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: FileSpreadsheet,
    title: "One-click Excel Reports",
    description:
      "Teachers export roll-no × dates sheets with P/A/L/E status, totals and attendance %, by date range.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: Zap,
    title: "Marks in Seconds",
    description:
      "A whole class checks in under a minute. Attendance saves hours of roll-call every week.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    icon: Smartphone,
    title: "Zero Hardware",
    description:
      "Works on any smartphone camera. No fingerprint scanners, RFID cards or biometric devices.",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  {
    icon: Bell,
    title: "Parent Notifications",
    description:
      "Optional instant SMS/email alerts keep parents informed when attendance is marked.",
    color: "text-teal-500",
    bg: "bg-teal-500/10",
  },
  {
    icon: Users,
    title: "Late & Manual Marking",
    description:
      "Faculty can mark late arrivals or correct mistakes in the live session or from history.",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
];

const FeaturesSection = () => (
  <section id="features" className="py-20 px-4 sm:px-6">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-14">
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-500 mb-2">
          Features
        </p>
        <h2 className="text-3xl sm:text-4xl font-black mb-4 text-slate-900 dark:text-slate-50">
          Everything attendance, in one place
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg">
          AttendX eliminates proxy attendance, saves class time and gives
          institutions real-time visibility — without any extra hardware.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map(({ icon: Icon, title, description, color, bg }, i) => (
          <article
            key={i}
            className="card-2026 card-hover p-6"
            aria-label={title}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${bg}`}
            >
              <Icon size={24} className={color} />
            </div>
            <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {description}
            </p>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
