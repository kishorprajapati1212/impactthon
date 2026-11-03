import { useEffect, useMemo, useReducer } from "react";
import QRCode from "react-qr-code";
import { Link } from "react-router-dom";
import { MapPin, ShieldCheck, ShieldX, ShieldAlert, FileSpreadsheet } from "lucide-react";
import { DEMO_EVENTS } from "../../content/landing.js";
import { Corners, StatusChip } from "./ui.jsx";

const ROTATE_SECONDS = 5;
const VISIBLE_EVENTS = 4;
const RING = 2 * Math.PI * 17; // r = 17

const initial = { secondsLeft: ROTATE_SECONDS, tick: 0 };
const reducer = (s, action) => {
  if (action !== "tick") return s;
  return s.secondsLeft <= 1
    ? { secondsLeft: ROTATE_SECONDS, tick: s.tick + 1 }
    : { ...s, secondsLeft: s.secondsLeft - 1 };
};

const STATUS = {
  present: { tone: "success", label: "Present", Icon: ShieldCheck },
  rejected: { tone: "danger", label: "Rejected", Icon: ShieldX },
  blocked: { tone: "warning", label: "Blocked", Icon: ShieldAlert },
};

/**
 * A faithful miniature of a live AttendX session: the projector QR rotates
 * every 5 s (same cadence as the real product) and a scan feed shows what
 * happens to honest scans, screenshots and out-of-room attempts.
 */
const LiveDemo = () => {
  const [{ secondsLeft, tick }, dispatch] = useReducer(reducer, initial);
  const startedAt = useMemo(() => Date.now(), []);

  useEffect(() => {
    const id = setInterval(() => dispatch("tick"), 1000);
    return () => clearInterval(id);
  }, []);

  const qrValue = `attendx://demo/lecture/304?rotation=${tick}&issued=${startedAt + tick * ROTATE_SECONDS * 1000}`;

  const feed = Array.from({ length: VISIBLE_EVENTS }, (_, i) => {
    const idx = ((tick - i) % DEMO_EVENTS.length + DEMO_EVENTS.length) % DEMO_EVENTS.length;
    return { ...DEMO_EVENTS[idx], key: tick - i };
  });
  const counts = feed.reduce(
    (acc, e) => ({ ...acc, [e.status]: acc[e.status] + 1 }),
    { present: 41, rejected: 1, blocked: 0 },
  );
  const dashOffset = RING * (1 - secondsLeft / ROTATE_SECONDS);

  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      {/* projector card */}
      <div className="card-2026 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">Data Structures · CE-3A</p>
            <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <MapPin size={12} aria-hidden="true" /> Room 304 · geofence 100 m
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        </div>

        <div className="grid gap-0 sm:grid-cols-[auto,1fr]">
          {/* QR with rotation ring */}
          <div className="flex flex-col items-center justify-center gap-3 border-b border-slate-200 p-5 dark:border-slate-800 sm:border-b-0 sm:border-r">
            <div className="relative rounded-xl bg-white p-3 text-cyan-600 shadow-inner ring-1 ring-slate-200 dark:ring-slate-700">
              <Corners inset="-inset-1.5" size="h-5 w-5" />
              <div className="h-[136px] w-[136px] text-slate-900">
                <QRCode value={qrValue} size={136} level="M" bgColor="#ffffff" fgColor="#0f172a" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" className="-rotate-90">
                <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="3" />
                <circle
                  cx="20" cy="20" r="17" fill="none" strokeWidth="3" strokeLinecap="round"
                  className="stroke-cyan-500"
                  strokeDasharray={RING}
                  strokeDashoffset={dashOffset}
                  style={{ transition: secondsLeft === ROTATE_SECONDS ? "none" : "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <span>
                refreshes in {secondsLeft}s
                <span className="block text-[11px] text-slate-400">screenshots expire with it</span>
              </span>
            </div>
          </div>

          {/* scan feed */}
          <div className="min-w-0 p-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Scan feed</p>
            <ul className="space-y-2" aria-live="polite">
              {feed.map((e, i) => {
                const S = STATUS[e.status];
                return (
                  <li
                    key={e.key}
                    className={`flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/60 ${i === 0 ? "lp-rise" : ""}`}
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
                      {e.name[0]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{e.name}</span>
                      <span className="block text-xs leading-snug text-slate-500 dark:text-slate-400">{e.detail}</span>
                    </span>
                    <StatusChip tone={S.tone} className="shrink-0 gap-1">
                      <S.Icon size={12} aria-hidden="true" /> {S.label}
                    </StatusChip>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* faculty strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-center gap-3 font-semibold">
            <span className="text-emerald-700 dark:text-emerald-400">{counts.present} present</span>
            <span className="text-rose-700 dark:text-rose-400">{counts.rejected} rejected</span>
            <span className="text-amber-700 dark:text-amber-400">{counts.blocked} blocked</span>
          </div>
          <Link to="/login" className="inline-flex items-center gap-1.5 font-semibold text-slate-700 hover:text-cyan-700 dark:text-slate-200 dark:hover:text-cyan-400">
            <FileSpreadsheet size={14} aria-hidden="true" /> Export Excel
          </Link>
        </div>
      </div>

    </div>
  );
};

export default LiveDemo;
