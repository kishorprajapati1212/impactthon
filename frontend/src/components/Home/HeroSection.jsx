import { useNavigate } from "react-router-dom";
import { ArrowRight, QrCode, MapPin, ShieldCheck, Zap } from "lucide-react";
import QRCode from "react-qr-code";

const HeroSection = () => {
  const navigate = useNavigate();

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
                onClick={() => navigate("/login")}
                className="btn-primary inline-flex items-center gap-2"
              >
                Get Started <ArrowRight size={18} />
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
          <div className="relative max-w-md mx-auto w-full">
            <div className="card-2026 p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Live session
                  </span>
                </div>
                <span className="text-xs text-slate-400">refreshes every 5s</span>
              </div>

              <div className="flex justify-center mb-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-200">
                  <QRCode
                    value="AttendX — demo QR — attendance simplified"
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

            {/* Floating accent chips */}
            <div className="absolute -top-5 -right-5 card-2026 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-lg">
              🎯 Proxy-proof
            </div>
            <div className="absolute -bottom-5 -left-5 card-2026 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-lg">
              📊 Excel reports built-in
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
