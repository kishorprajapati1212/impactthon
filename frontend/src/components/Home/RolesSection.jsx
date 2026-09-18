import { Shield, UserCog, GraduationCap } from "lucide-react";

const roles = [
  {
    icon: Shield,
    title: "For Admins",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    points: [
      "Full academics control — departments, subjects, sections, faculty",
      "Institution-wide analytics and department-wise rates",
      "Force-end stuck sessions from a single panel",
    ],
  },
  {
    icon: UserCog,
    title: "For Faculty",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    points: [
      "Start live rotating QR sessions in two taps",
      "Manual late / excused marking right from the roster",
      "One-click Excel attendance sheets by date range",
    ],
  },
  {
    icon: GraduationCap,
    title: "For Students",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    points: [
      "Scan QR from any smartphone — no app install",
      "Real-time subject-wise attendance percentage",
      "Clear history with present / absent / late status",
    ],
  },
];

const RolesSection = () => (
  <section id="roles" className="py-20 px-4 sm:px-6">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-14">
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-500 mb-2">
          Built for everyone
        </p>
        <h2 className="text-3xl sm:text-4xl font-black mb-4 text-slate-900 dark:text-slate-50">
          One system, three role-based dashboards
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {roles.map(({ icon: Icon, title, color, bg, points }, i) => (
          <div key={i} className="card-2026 card-hover p-6">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${bg}`}>
              <Icon size={24} className={color} />
            </div>
            <h3 className="font-bold text-lg mb-3 text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            <ul className="space-y-2">
              {points.map((p, j) => (
                <li
                  key={j}
                  className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"
                >
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default RolesSection;
