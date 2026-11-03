import { useEffect, useState, useRef, useCallback } from "react";
import toast from "../../utils/notify.js";
import {
  X,
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  Camera,
  CameraOff,
  MapPin,
  RefreshCcw,
  Loader2,
  ZoomIn,
  Flashlight,
  FlashlightOff,
  SwitchCamera,
  PauseCircle,
  Minus,
  Plus,
  Move,
} from "lucide-react";
import api from "../../utils/api.js";
import { getLocationFast, prewarmLocation, locationToText } from "../../utils/geolocation.js";
import { verifyQRLocally } from "../../utils/qrUtils.js";
import PermissionGate from "./PermissionGate.jsx";
import getFriendlyError from "../../utils/friendlyError.js";
import useQrCamera, { describeCameraError, ZOOM_MIN, ZOOM_STEP } from "./useQrCamera.js";
import useZoomGestures from "./useZoomGestures.js";

const ZOOM_PRESETS = [1, 2, 3];
const HINT_MS = 7000;

/**
 * Student QR scanner (Phase 18 rewrite).
 *
 * The camera, zoom and decoding live in useQrCamera; this component is the
 * flow: permissions → scanning → verifying (GPS + server) → result.
 * Leaving this screen in any way (tab, back, browser background) releases the
 * camera and cancels the GPS request immediately.
 */
const QRScanner = ({ onBack }) => {
  const [phase, setPhase] = useState("permission"); // permission | scanning | loading | success | error
  const [message, setMessage] = useState("");
  const [coordsText, setCoordsText] = useState("");
  const [markResult, setMarkResult] = useState(null);
  const processedRef = useRef(false);
  const mountedRef = useRef(true);
  const gpsAbortRef = useRef(null);
  const [hintVisible, setHintVisible] = useState(true);

  // GPS: warm a fix while the camera opens; cancel everything on unmount.
  useEffect(() => {
    mountedRef.current = true;
    gpsAbortRef.current = new AbortController();
    prewarmLocation({ signal: gpsAbortRef.current.signal });
    return () => {
      mountedRef.current = false;
      gpsAbortRef.current?.abort();
    };
  }, []);

  const handleScan = useCallback(async (rawText) => {
    if (processedRef.current) return;
    processedRef.current = true;
    setPhase("loading"); // ← camera stops here (active becomes false)
    setMessage("Verifying QR and your location…");
    setCoordsText("");

    try {
      // Cheap local sanity check first — don't spend a GPS fix on a dead QR
      const local = verifyQRLocally(rawText);
      if (!local.valid) {
        setPhase("error");
        setMessage(local.message);
        return;
      }

      const location = await getLocationFast({ allowCached: true, signal: gpsAbortRef.current?.signal });
      if (!mountedRef.current) return;
      setCoordsText(locationToText(location));

      if (!location) {
        setPhase("error");
        setMessage(
          "We couldn't get a GPS fix yet. Make sure Location/GPS is ON and set to High accuracy, then tap Try Again. Your permission is already granted — it usually just needs a few seconds of clear sky."
        );
        return;
      }

      const res = await api.post("/student/mark", { qrData: rawText.trim(), location }, { timeout: 25000 });
      if (!mountedRef.current) return;

      setMarkResult({
        status: res.data?.data?.status || "PRESENT",
        message: res.data?.message || "Attendance marked present!",
        coordsText: locationToText(res.data?.data?.location || location),
      });
      setPhase("success");
      toast.success("Attendance marked!");
    } catch (err) {
      if (!mountedRef.current) return;
      setPhase("error");
      const code = err.response?.data?.code;
      const dist = err.response?.data?.data?.distanceMeters;
      let msg = getFriendlyError(err, "Could not mark attendance. Please try again.");
      if (code === "GEOFENCE" && dist != null) msg = `You seem to be about ${Math.round(dist)}m from the classroom. Move inside and scan again.`;
      if (code === "ALREADY_MARKED") {
        setPhase("success");
        setMarkResult({ status: "PRESENT", message: msg });
        return;
      }
      setMessage(msg);
      toast.error(msg);
    }
  }, []);

  const cam = useQrCamera({ active: phase === "scanning", onDecode: handleScan });
  const { videoRef, status, zoom, setZoom, zoomBy, torch, toggleTorch, cameras, switchCamera } = cam;

  const beginScanning = () => {
    processedRef.current = false;
    setMessage("");
    setMarkResult(null);
    setPhase("scanning");
  };

  // Zoom gestures on the preview: pinch, one-finger drag up/down, double-tap,
  // wheel and keyboard — the same moves as the phone's own camera app.
  const gestures = useZoomGestures({ enabled: status === "running", zoom, setZoom });

  // "Far away? drag up / pinch" hint: shown when the camera opens, gone after
  // a few seconds or as soon as the student zooms.
  useEffect(() => {
    if (status !== "running") return undefined;
    setHintVisible(true);
    const t = setTimeout(() => setHintVisible(false), HINT_MS);
    return () => clearTimeout(t);
  }, [status]);
  useEffect(() => {
    if (gestures.used || zoom.value > 1.05) setHintVisible(false);
  }, [gestures.used, zoom.value]);

  // ── Result screens ────────────────────────────────────────────────
  if (phase === "success" || phase === "error") {
    const ok = phase === "success";
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="card-2026 p-8 text-center max-w-sm w-full">
          <div className={"w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 " + (ok ? "bg-emerald-500/15" : "bg-rose-500/15")}>
            {ok ? <CheckCircle2 size={44} className="text-emerald-500" /> : <AlertTriangle size={44} className="text-rose-500" />}
          </div>
          <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-slate-100">{ok ? "Marked Present!" : "Could Not Mark"}</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-5 leading-relaxed">{ok ? markResult?.message : message}</p>

          {(markResult?.coordsText || coordsText) && (
            <div className="mb-5 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-500/80 mb-1 flex items-center justify-center gap-1">
                <MapPin size={11} /> Your GPS coordinates
              </p>
              <p className="text-xs font-mono text-cyan-600 dark:text-cyan-300">{markResult?.coordsText || coordsText}</p>
            </div>
          )}

          {ok ? (
            <button onClick={onBack} className="btn-primary w-full">
              Back to Dashboard
            </button>
          ) : (
            <div className="space-y-2">
              <button onClick={() => setPhase("permission")} className="btn-primary w-full flex items-center justify-center gap-2">
                <RefreshCcw size={16} /> Try Again
              </button>
              <button onClick={onBack} className="btn-secondary w-full">
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Verifying ─────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
        <Loader2 size={40} className="text-cyan-500 animate-spin" />
        <div className="text-center">
          <p className="font-semibold text-slate-800 dark:text-slate-200 text-lg">{message}</p>
          <div className="flex items-center justify-center gap-1.5 text-sm text-slate-500 mt-2">
            <MapPin size={14} className="text-cyan-500" />
            <span>{coordsText ? `Locked: ${coordsText}` : "Acquiring GPS…"}</span>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "permission") {
    return <PermissionGate onBack={onBack} onReady={beginScanning} />;
  }

  const header = (
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-50">
        <ScanLine size={22} className="text-cyan-500" /> Scan QR Code
      </h2>
      <button type="button" onClick={onBack} aria-label="Close scanner" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
        <X size={20} />
      </button>
    </div>
  );

  // ── Camera error ──────────────────────────────────────────────────
  if (status === "error") {
    return (
      <div className="space-y-4">
        {header}
        <div className="card-2026 p-8 text-center">
          <CameraOff size={48} className="mx-auto text-rose-500 mb-4" />
          <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-slate-100">Camera Required</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-5">{describeCameraError(cam.error)}</p>
          <button onClick={() => setPhase("permission")} className="btn-primary flex items-center gap-2 mx-auto">
            <Camera size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const running = status === "running";
  const cameraOpen = status === "starting" || status === "running" || status === "paused";
  const zoomKind = zoom.hardware != null && zoom.digital <= 1.001 ? "camera zoom" : zoom.hardware != null && zoom.hardware > 1 ? "camera + digital zoom" : "digital zoom";
  const zoomPct = Math.round(((zoom.value - ZOOM_MIN) / Math.max(0.01, zoom.max - ZOOM_MIN)) * 100);
  const atMin = zoom.value <= ZOOM_MIN + 0.001;
  const atMax = zoom.value >= zoom.max - 0.001;

  // ── Active scanner ────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {header}

      <div className="card-2026 p-2" data-testid="zoom-controls">
        <div
          ref={gestures.ref}
          {...gestures.handlers}
          tabIndex={0}
          role="group"
          aria-label="Camera preview. Drag up or down, pinch, or use plus and minus to zoom."
          className={`on-dark relative w-full overflow-hidden rounded-2xl bg-slate-950 touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${gestures.dragging ? "cursor-grabbing" : "cursor-ns-resize"}`}
          style={{ aspectRatio: "1 / 1", maxHeight: "72vh" }}
        >
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            aria-label="Camera preview"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            style={{ transform: `scale(${zoom.digital})`, transformOrigin: "center", transition: gestures.dragging ? "none" : "transform 120ms ease-out" }}
          />

          {/* Scan frame — the centre square is exactly what gets decoded */}
          {running && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
              <div className="relative h-[62%] w-[62%]">
                {["top-0 left-0 border-t-4 border-l-4 rounded-tl-xl", "top-0 right-0 border-t-4 border-r-4 rounded-tr-xl", "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl", "bottom-0 right-0 border-b-4 border-r-4 rounded-br-xl"].map((c) => (
                  <span key={c} className={`absolute h-7 w-7 border-cyan-400 ${c}`} />
                ))}
                <span className="absolute left-2 right-2 top-1/2 h-0.5 -translate-y-1/2 bg-cyan-400/70 animate-pulse" />
              </div>
            </div>
          )}

          {status === "starting" && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/70">
              <Loader2 size={28} className="text-cyan-400 animate-spin" />
              <span className="text-xs text-slate-300">Opening camera…</span>
            </div>
          )}
          {status === "paused" && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/80 px-6 text-center">
              <PauseCircle size={28} className="text-slate-300" />
              <span className="text-sm font-medium text-slate-100">Camera paused</span>
              <span className="text-xs text-slate-400">It switches off while this tab is in the background and resumes when you return.</span>
            </div>
          )}

          {/* Hint: how to zoom when the code is far away */}
          {running && hintVisible && (
            <div className="pointer-events-none absolute left-3 right-14 top-3 flex items-center gap-2 rounded-xl bg-slate-900/80 px-3 py-2 text-xs font-medium text-white shadow-md" role="status">
              <Move size={14} className="shrink-0 text-cyan-300" />
              <span>Far from the screen? Drag up on the camera, pinch, or tap + to zoom in.</span>
            </div>
          )}

          {running && (
            <div className="absolute right-3 top-3 flex flex-col gap-2">
              {torch.supported && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={async () => {
                    if (!(await toggleTorch())) toast.error("The flashlight could not be switched.");
                  }}
                  aria-pressed={torch.on}
                  aria-label={torch.on ? "Turn flashlight off" : "Turn flashlight on"}
                  className={`rounded-full p-2.5 shadow-md ${torch.on ? "bg-amber-400 text-slate-900" : "bg-slate-900/70 text-white"}`}
                >
                  {torch.on ? <FlashlightOff size={18} /> : <Flashlight size={18} />}
                </button>
              )}
              {cameras.length > 1 && (
                <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={switchCamera} aria-label="Switch camera" className="rounded-full bg-slate-900/70 p-2.5 text-white shadow-md">
                  <SwitchCamera size={18} />
                </button>
              )}
            </div>
          )}

          {/* Zoom bar — on the camera itself, like a phone camera app */}
          {cameraOpen && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/50 to-transparent px-3 pb-3 pt-10">
              <div className="mb-2 flex items-center justify-center" aria-live="polite">
                <span className="rounded-full bg-white px-3 py-1 text-sm font-bold tabular-nums text-slate-900 shadow">{zoom.value.toFixed(1)}×</span>
              </div>
              {/* only the controls themselves swallow the pointer — dragging anywhere else on the preview zooms */}
              <div className="pointer-events-auto flex items-center gap-3" onPointerDown={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  aria-label="Zoom out"
                  onClick={() => zoomBy(-0.5)}
                  disabled={!running || atMin}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-md active:scale-95 disabled:opacity-40"
                >
                  <Minus size={22} strokeWidth={2.5} />
                </button>
                <input
                  type="range"
                  aria-label="Camera zoom"
                  min={ZOOM_MIN}
                  max={zoom.max}
                  step={ZOOM_STEP}
                  value={zoom.value}
                  disabled={!running}
                  onChange={(e) => setZoom(e.target.value)}
                  className="zoom-range w-full"
                  style={{ "--fill": `${zoomPct}%` }}
                />
                <button
                  type="button"
                  aria-label="Zoom in"
                  onClick={() => zoomBy(0.5)}
                  disabled={!running || atMax}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-md active:scale-95 disabled:opacity-40"
                >
                  <Plus size={22} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Presets + what kind of zoom this is */}
        {cameraOpen && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-1 pt-3">
            <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
              <ZoomIn size={14} className="text-cyan-600 dark:text-cyan-400" />
              <span>
                Zoom {zoom.value.toFixed(1)}× <span className="text-slate-500">· {zoomKind} · up to {zoom.max}×</span>
              </span>
            </div>
            <div className="flex gap-1.5" role="group" aria-label="Zoom presets">
              {ZOOM_PRESETS.filter((v) => v <= zoom.max).map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={!running}
                  onClick={() => setZoom(v)}
                  className={`min-w-[2.75rem] rounded-lg border px-2.5 py-1.5 text-sm font-semibold ${Math.abs(zoom.value - v) < 0.05 ? "border-cyan-600 bg-cyan-50 text-cyan-700 dark:border-cyan-400 dark:bg-cyan-500/10 dark:text-cyan-300" : "border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300"}`}
                >
                  {v}×
                </button>
              ))}
              <button
                type="button"
                disabled={!running}
                onClick={() => setZoom(zoom.max)}
                className={`min-w-[2.75rem] rounded-lg border px-2.5 py-1.5 text-sm font-semibold ${atMax ? "border-cyan-600 bg-cyan-50 text-cyan-700 dark:border-cyan-400 dark:bg-cyan-500/10 dark:text-cyan-300" : "border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300"}`}
              >
                Max
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card-2026 p-4 flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
        <MapPin size={16} className="text-cyan-500 shrink-0 mt-0.5" />
        <span>
          Point the camera at the QR code on your teacher's screen and keep it inside the frame. Far from the screen? <strong className="font-semibold text-slate-800 dark:text-slate-200">Drag up on the camera, pinch, or tap +</strong> — zooming makes the code easier to read, not just bigger. Double-tap jumps between 1× and 2×. Your location is checked so only students in the room are marked present.
        </span>
      </div>

      <p className="text-center text-slate-500 text-xs">The code changes every 5 seconds — scan the one on screen now.</p>
    </div>
  );
};

export default QRScanner;
