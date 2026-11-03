import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowRight, QrCode, MapPin, ShieldCheck, Zap, Target, FileSpreadsheet } from "lucide-react";
import QRCode from "react-qr-code";

const ROTATE_SECONDS = 5;

const HeroSection = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((s) => s.auth);
  const startPath = isAuthenticated && user?.role ? `/${String(user.role).toLowerCase()}` : "/login";

  // The demo QR really rotates, exactly like a live session does
  const [tick, setTick] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(ROTATE_SECONDS);
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { setTick((t) => t + 1); return ROTATE_SECONDS; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const proofPoints = [
    { icon: QrCode, label: "Rotating QR — no screenshots", color: "text-cyan-500" },
    { icon: MapPin, label: "GPS geofence on every scan", color: "text-emerald-500" },
    { icon: ShieldCheck, label: "Proxy-proof marking", color: "text-blue-500" },
  ];

  return (
    <section className="relative pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* ── Left: Copy ───────────────────────────────────────── */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-semibold mb-6">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
              Smart QR Attendance System · 2026
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6 text-slate-900 dark:text-slate-50">
              Attendance{" "}
              <span className="bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
                without proxies
              </span>
              , paper or queues
            </h1>

            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-lg leading-relaxed">
              AttendX turns any classroom into a 30-second check-in. Faculty
              project a live rotating QR, students scan with their phone, and
              GPS + geofence verification proves they were really there —
              with analytics and Excel reports included.
            </p>

            <div className="flex flex-wrap gap-4 mb-10">
              <button
                type="button"
                onClick={() => navigate(startPath)}
                className="btn-primary inline-flex items-center gap-2"
              >
                {isAuthenticated ? "Open my dashboard" : "Get Started"} <ArrowRight size={18} />
              </button>
              <a
                href="#how-it-works"
                className="btn-secondary inline-flex items-center gap-2"
              >
                See how it works
              </a>
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-3">
              {proofPoints.map(({ icon: Icon, label, color }, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Icon size={18} className={color} />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Live QR demo ──────────────────────────────── */}
          <div className="relative max-w-md mx-auto w-full pt-4 pb-4 sm:pt-0 sm:pb-0">
            <div className="card-2026 p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Live session
                  </span>
                </div>
                <span className="text-xs text-slate-400" aria-live="off">
                  refreshes in {secondsLeft}s
                </span>
              </div>

              <div className="flex justify-center mb-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-200">
                  <QRCode
                    value={`AttendX demo QR · rotation ${tick + 1} · this code is not a real session`}
                    size={180}
                    level="H"
                    fgColor="#0f172a"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-500">
                    <MapPin size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-emerald-500">
                      GPS verified
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      23.022505, 72.571400 ±6m
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/15 flex items-center justify-center text-cyan-500">
                    <Zap size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                      Marked present
                    </p>
                    <p className="text-[11px] text-slate-500">
                      in under 30 seconds
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating accent chips — kept inside the viewport on phones */}
            <div className="absolute top-0 right-2 sm:-top-5 sm:-right-5 card-2026 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-lg inline-flex items-center gap-1.5">
              <Target size={14} className="text-cyan-500" /> Proxy-proof
            </div>
            <div className="absolute bottom-0 left-2 sm:-bottom-5 sm:-left-5 card-2026 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-lg inline-flex items-center gap-1.5">
              <FileSpreadsheet size={14} className="text-emerald-500" /> Excel reports built-in
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
