import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowRight, Check, LayoutDashboard } from "lucide-react";
import LiveDemo from "./LiveDemo.jsx";

const TRUST = ["No app install", "No biometric hardware", "Works on any phone", "Free to start"];

/**
 * Hero: the promise on the left, the product doing the promise on the right.
 * Decorative backgrounds live INSIDE this section (overflow-hidden here, never
 * on the page root) so anchor links scroll the window, not a wrapper.
 */
const Hero = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((s) => s.auth);
  const dashboardPath = user?.role ? `/${String(user.role).toLowerCase()}` : "/login";

  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-title">
      <div className="lp-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="pointer-events-none absolute -top-40 right-[-10%] h-[520px] w-[520px] rounded-full bg-cyan-500/10 blur-[120px] dark:bg-cyan-500/10" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-32 left-[-10%] h-[420px] w-[420px] rounded-full bg-blue-600/10 blur-[120px] dark:bg-blue-600/15" aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-20 sm:pt-20 sm:pb-28 grid gap-14 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" aria-hidden="true" />
            QR + GPS attendance for colleges &amp; schools
          </p>

          <h1 id="hero-title" className="mt-5 text-4xl sm:text-5xl lg:text-[3.4rem] font-black leading-[1.05] tracking-tight text-slate-900 dark:text-slate-50 text-balance">
            The QR code attendance system that{" "}
            <span className="bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">ends proxy attendance</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
            AttendX marks attendance in about 4 seconds. The teacher shows a rotating QR code on the
            projector, students scan it with their phone, and a GPS check confirms they are in the room.
            Faculty get live counts and Excel sheets, admins get plain reports.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            {isAuthenticated ? (
              <button type="button" onClick={() => navigate(dashboardPath)} className="btn-primary inline-flex items-center justify-center gap-2">
                <LayoutDashboard size={18} /> Open my dashboard
              </button>
            ) : (
              <button type="button" onClick={() => navigate("/login")} className="btn-primary inline-flex items-center justify-center gap-2">
                Get Started <ArrowRight size={18} />
              </button>
            )}
            <a href="#how-it-works" className="btn-secondary inline-flex items-center justify-center gap-2">
              See how it works
            </a>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600 dark:text-slate-400" aria-label="Highlights">
            {TRUST.map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5">
                <Check size={15} className="text-cyan-600 dark:text-cyan-400" aria-hidden="true" /> {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-6 lp-rise">
          <LiveDemo />
        </div>
      </div>
    </section>
  );
};

export default Hero;
