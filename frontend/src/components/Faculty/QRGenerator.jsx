import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import QRCode from "react-qr-code";
import { RefreshCw, Maximize2, Minimize2, Clock, Sun } from "lucide-react";
import { buildQRString } from "../../utils/qrUtils.js";
import { useTheme } from "../../context/ThemeContext.jsx";

const INTERVAL_MS = 5000;

/**
 * High-contrast QR for classroom projection / phone cameras.
 * Fullscreen forces pure white UI (overrides dark theme) for max scan reliability.
 */
const QRGenerator = ({
  sessionToken,
  lectureSessionId,
  serverTimeOffset = 0,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const { isDark } = useTheme();
  const [qrValue, setQrValue] = useState("");
  const [countdown, setCountdown] = useState(5);
  const [progress, setProgress] = useState(1); // 1 → 0 within each 5 s rotation
  const [vw, setVw] = useState(
    typeof window !== "undefined" ? window.innerWidth : 400
  );
  const [vh, setVh] = useState(
    typeof window !== "undefined" ? window.innerHeight : 700
  );
  const nextRotate = useRef(Date.now() + INTERVAL_MS);
  const timerRef = useRef(null);
  const prevDarkRef = useRef(null);

  // Track viewport for large QR on big screens
  useEffect(() => {
    const onResize = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Fullscreen → force white (light) theme for scannability; restore after
  useEffect(() => {
    const root = document.documentElement;
    if (isFullscreen) {
      prevDarkRef.current = root.classList.contains("dark");
      root.classList.remove("dark");
      root.classList.add("light");
      root.classList.add("qr-project-mode");
      // Prevent body scroll / dull overlays
      document.body.style.overflow = "hidden";
      document.body.style.background = "#ffffff";
    } else {
      root.classList.remove("qr-project-mode");
      document.body.style.overflow = "";
      document.body.style.background = "";
      if (prevDarkRef.current) {
        root.classList.add("dark");
        root.classList.remove("light");
      } else if (prevDarkRef.current === false) {
        root.classList.add("light");
        root.classList.remove("dark");
      } else {
        // restore from app theme
        if (isDark) {
          root.classList.add("dark");
          root.classList.remove("light");
        } else {
          root.classList.add("light");
          root.classList.remove("dark");
        }
      }
    }
    return () => {
      root.classList.remove("qr-project-mode");
      document.body.style.overflow = "";
      document.body.style.background = "";
      // On unmount restore user theme
      if (isDark) {
        root.classList.add("dark");
        root.classList.remove("light");
      }
    };
  }, [isFullscreen, isDark]);

  // Escape exits fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onToggleFullscreen?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen, onToggleFullscreen]);

  const rotate = useCallback(() => {
    if (!sessionToken || !lectureSessionId) return;
    setQrValue(
      buildQRString(sessionToken, lectureSessionId, serverTimeOffset)
    );
    nextRotate.current = Date.now() + INTERVAL_MS;
    setCountdown(5);
    setProgress(1);
  }, [sessionToken, lectureSessionId, serverTimeOffset]);

  // Stable interval (not rAF - avoids thrash / blur on some GPUs)
  useEffect(() => {
    rotate();
    timerRef.current = setInterval(() => {
      const leftMs = Math.max(0, nextRotate.current - Date.now());
      setCountdown(Math.ceil(leftMs / 1000));
      setProgress(leftMs / INTERVAL_MS); // fractional → the bar drains smoothly, not in 1 s jumps
      if (Date.now() >= nextRotate.current) rotate();
    }, 200);
    return () => clearInterval(timerRef.current);
  }, [rotate]);

  // QR pixel size: large in project mode, crisp integer sizes
  const qrSize = useMemo(() => {
    if (isFullscreen) {
      // Leave room for header/footer chrome; max edge of usable square
      const edge = Math.min(vw, vh) - (vw < 480 ? 48 : 120);
      return Math.max(280, Math.min(Math.floor(edge), 720));
    }
    return 220;
  }, [isFullscreen, vw, vh]);

  // Quiet zone around the modules (also the plate's padding)
  const plateGap = isFullscreen ? Math.max(16, Math.round(qrSize * 0.08)) : 20;

  if (!sessionToken || !lectureSessionId) return null;

  // Pure black modules on pure white - best for dull projectors / phone cams
  const qrFg = "#000000";
  const qrBg = "#FFFFFF";

  const shell = isFullscreen
    ? "fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-3 sm:p-6 select-none"
    : "glass-card p-6 text-center select-none";

  return (
    <div className={shell}>
      {/* Header */}
      <div
        className={`w-full max-w-3xl flex items-center justify-between mb-3 sm:mb-5 ${
          isFullscreen ? "text-slate-900" : ""
        }`}
      >
        <div className="text-left min-w-0">
          <h3
            className={`font-bold truncate ${
              isFullscreen
                ? "text-lg sm:text-2xl text-slate-900"
                : "text-lg text-slate-900 dark:text-slate-100"
            }`}
          >
            Live Attendance QR
          </h3>
          {isFullscreen && (
            <p className="text-xs sm:text-sm text-slate-600 flex items-center gap-1.5 mt-0.5">
              <Sun size={14} className="text-amber-500" />
              Projection mode: maximum contrast white screen
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleFullscreen}
          className={`p-2.5 rounded-xl transition-colors shrink-0 ${
            isFullscreen
              ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-cyan-400"
          }`}
          title={isFullscreen ? "Exit fullscreen (Esc)" : "Project QR large"}
        >
          {isFullscreen ? <Minimize2 size={22} /> : <Maximize2 size={18} />}
        </button>
      </div>

      {/* Card mode: the countdown bar spans the FULL width of the card (it is a
          block child of the card, so it follows the card on every screen size).
          Projector mode: the column is exactly as wide as the QR plate so the
          bar lines up with the QR edge-to-edge. */}
      <div
        className="mx-auto flex flex-col items-stretch w-full"
        style={{ width: isFullscreen ? qrSize + 2 * plateGap : "100%", maxWidth: "100%" }}
      >
      {/* QR plate - thick quiet zone helps phone cameras */}
      <div
        className="bg-white shadow-none mx-auto"
        style={{
          padding: plateGap,
          width: qrSize + 2 * plateGap,
          maxWidth: "100%",
          boxSizing: "border-box",
          borderRadius: isFullscreen ? 12 : 16,
          border: isFullscreen ? "1px solid #e2e8f0" : undefined,
          // Force GPU-friendly crisp edges (avoid blurry CSS scale)
          imageRendering: "pixelated",
        }}
      >
        {qrValue && (
          <QRCode
            value={qrValue}
            size={qrSize}
            level="H"
            bgColor={qrBg}
            fgColor={qrFg}
            style={{
              height: "auto",
              maxWidth: "100%",
              width: qrSize,
              display: "block",
            }}
          />
        )}
      </div>

      {/* Countdown */}
      <div className="w-full mt-4 sm:mt-5">
        <div
          className={`w-full h-2 rounded-full overflow-hidden mb-3 ${
            isFullscreen ? "bg-slate-200" : "bg-slate-200 dark:bg-slate-700"
          }`}
          role="progressbar"
          aria-label="Time until the QR code refreshes"
          aria-valuemin={0}
          aria-valuemax={5}
          aria-valuenow={countdown}
        >
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transition-[width] duration-200 ease-linear"
            style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
          />
        </div>

        <div
          className={`flex items-center justify-center gap-3 text-sm flex-wrap ${
            isFullscreen ? "text-slate-700" : "text-slate-400"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium">Live</span>
          </div>
          <span className="opacity-40">•</span>
          <div className="flex items-center gap-1.5">
            <Clock size={14} />
            <span>Refresh in</span>
            <span
              className={`font-mono font-bold w-4 text-center ${
                isFullscreen ? "text-blue-600" : "text-cyan-400"
              }`}
            >
              {countdown}
            </span>
            <span>s</span>
          </div>
          <button
            type="button"
            onClick={rotate}
            title="Force refresh QR"
            className={`p-1.5 rounded-lg transition-colors ${
              isFullscreen
                ? "hover:bg-slate-100 text-slate-600"
                : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-cyan-400"
            }`}
          >
            <RefreshCw size={14} />
          </button>
        </div>

        <p
          className={`text-center text-xs mt-3 ${
            isFullscreen ? "text-slate-500" : "text-slate-400"
          }`}
        >
          {isFullscreen
            ? "Students: hold the phone steady and fill the frame with the code."
            : "The code changes every 5 seconds. Tap the expand icon to project it."}
        </p>

        {isFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="mt-4 mx-auto block text-sm font-semibold text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline"
          >
            Exit projection mode (Esc)
          </button>
        )}
      </div>
      </div>
    </div>
  );
};

export default QRGenerator;
