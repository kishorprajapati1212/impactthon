import { useCallback, useEffect, useRef, useState } from "react";
import { createQrDecoder } from "../../utils/qrDecoder.js";

/**
 * useQrCamera — the student scanner's camera, owned end to end (Phase 18).
 *
 * Guarantees:
 *  • The camera is released the moment the scanner is no longer wanted:
 *    unmount, tab/page change, `active=false`, the browser tab going to the
 *    background (visibilitychange / pagehide). Every async step checks the
 *    session that started it, so a `getUserMedia` that resolves *after* the
 *    user already left is stopped immediately instead of leaking a live
 *    camera (the "camera light stays on" bug).
 *  • Zoom always exists. Hardware zoom is used when the camera exposes it
 *    (most Android phones); on top of that — or instead of it (iPhones,
 *    laptops) — a digital zoom crops the centre of each frame *before*
 *    decoding, so zooming really does help read a small code on a
 *    projector, not just enlarge the preview.
 *  • Decoding uses the native BarcodeDetector when available, else jsQR.
 */

export const ZOOM_MIN = 1;
export const ZOOM_MAX_DIGITAL = 4;
export const ZOOM_MAX_HARDWARE = 8; // ignore absurd hardware ranges (some report 100×)
export const ZOOM_STEP = 0.1;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round1 = (v) => Math.round(v * 10) / 10;

/** Usable hardware zoom range from a MediaTrackCapabilities object, or null. Pure. */
export function hardwareZoomRange(caps) {
  const z = caps?.zoom;
  if (!z || typeof z !== "object") return null;
  const min = Number(z.min);
  const max = Number(z.max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;
  const lo = Math.max(ZOOM_MIN, min); // 0.5× ultra-wide is useless for reading a code
  const hi = Math.min(ZOOM_MAX_HARDWARE, max);
  if (hi <= lo) return null;
  return { min: lo, max: hi, step: Number(z.step) > 0 ? Number(z.step) : ZOOM_STEP };
}

/** The slider's upper bound: at least 4× digital, more when the hardware goes further. Pure. */
export function maxZoom(hw) {
  return Math.max(ZOOM_MAX_DIGITAL, hw?.max || ZOOM_MIN);
}

/**
 * Split a requested zoom into the hardware part (sent to the camera) and the
 * digital part (centre crop applied before decoding + CSS scale). Pure.
 *   no hardware zoom:   3×  → { hardware: 1,   digital: 3 }
 *   hardware up to 2×:  3×  → { hardware: 2,   digital: 1.5 }
 *   hardware up to 8×:  3×  → { hardware: 3,   digital: 1 }
 */
export function splitZoom(requested, hw) {
  const total = round1(clamp(Number(requested) || ZOOM_MIN, ZOOM_MIN, maxZoom(hw)));
  if (!hw) return { total, hardware: ZOOM_MIN, digital: total };
  const hardware = clamp(total, hw.min, hw.max);
  const digital = Math.round((total / hardware) * 1000) / 1000;
  return { total, hardware, digital: Math.max(1, digital) };
}

/**
 * Centre square crop of a video frame for a digital zoom factor. Pure.
 * At 1× a big frame is scaled *down* to `maxSide` (cheap to decode). When the
 * student zooms, the smaller crop is scaled *up* to `maxSide`: a far-away code
 * that is only ~2 px per module in the raw frame becomes ~5 px per module,
 * which is what the finder-pattern search and binariser need. This is why
 * zooming makes a distant code readable instead of merely bigger.
 */
export function cropForZoom(videoWidth, videoHeight, digital, maxSide = 640) {
  const z = Math.max(1, digital || 1);
  const side = Math.min(videoWidth, videoHeight) / z;
  const size = z > 1.001 ? maxSide : Math.max(1, Math.min(maxSide, Math.round(side)));
  return { sx: (videoWidth - side) / 2, sy: (videoHeight - side) / 2, side, size };
}

/** Short human reason for a getUserMedia failure. Pure. */
export function describeCameraError(err) {
  const name = err?.name || "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Camera is blocked. Use the lock icon in the address bar to allow the camera, then try again.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No usable camera was found on this device.";
  if (name === "NotReadableError" || name === "AbortError") return "Your camera is busy in another app or tab. Close it and try again.";
  if (name === "TypeError" && typeof navigator !== "undefined" && !navigator.mediaDevices?.getUserMedia) return "This browser cannot open the camera. Please use Chrome or Safari over HTTPS.";
  return "The camera could not be started. Please try again.";
}

let sessionCounter = 0;

export default function useQrCamera({ active = false, onDecode, fps = 10, decodeSize = 640 } = {}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const sessionRef = useRef(null); // { id, cancelled, stream, track, timer }
  const decoderRef = useRef(null);
  const activeRef = useRef(active);
  const onDecodeRef = useRef(onDecode);
  const hwRef = useRef(null); // hardware zoom range of the running track
  const digitalRef = useRef(1); // crop factor read by the decode loop
  const deviceRef = useRef(null); // explicitly chosen camera (after "switch camera")

  const [status, setStatus] = useState("idle"); // idle | starting | running | paused | error
  const [error, setError] = useState(null);
  const [engine, setEngine] = useState(null);
  const [zoom, setZoomState] = useState({ value: ZOOM_MIN, min: ZOOM_MIN, max: ZOOM_MAX_DIGITAL, hardware: null, digital: 1 });
  const [torch, setTorch] = useState({ supported: false, on: false });
  const [cameras, setCameras] = useState([]);

  useEffect(() => {
    onDecodeRef.current = onDecode;
  }, [onDecode]);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  /** Release everything belonging to the current session. Safe to call repeatedly. */
  const stop = useCallback(() => {
    const s = sessionRef.current;
    sessionRef.current = null;
    if (s) {
      s.cancelled = true;
      clearTimeout(s.timer);
      try {
        s.stream?.getTracks().forEach((t) => t.stop());
      } catch {
        /* ignore */
      }
    }
    const video = videoRef.current;
    if (video) {
      try {
        video.pause();
      } catch {
        /* ignore */
      }
      video.srcObject = null;
    }
    hwRef.current = null;
    setTorch({ supported: false, on: false });
  }, []);

  // Hardware zoom is pushed to the camera "latest value wins": a pinch or a
  // drag produces dozens of values per second and applyConstraints is slow on
  // many phones — queueing every one of them would make the zoom lag behind
  // the finger. The digital part (crop + CSS scale) is applied instantly.
  const hwPendingRef = useRef(null);
  const hwBusyRef = useRef(false);
  const pushHardwareZoom = useCallback(async (track, value) => {
    hwPendingRef.current = value;
    if (hwBusyRef.current) return;
    hwBusyRef.current = true;
    try {
      while (hwPendingRef.current != null && sessionRef.current?.track === track) {
        const v = hwPendingRef.current;
        hwPendingRef.current = null;
        try {
          await track.applyConstraints({ advanced: [{ zoom: v }] });
        } catch {
          /* the camera refused the value — the digital part still applies */
        }
      }
    } finally {
      hwBusyRef.current = false;
    }
  }, []);

  const applyZoom = useCallback(
    async (requested) => {
      const hw = hwRef.current;
      const { total, hardware, digital } = splitZoom(requested, hw);
      digitalRef.current = digital;
      setZoomState({ value: total, min: ZOOM_MIN, max: maxZoom(hw), hardware: hw ? hardware : null, digital });
      const track = sessionRef.current?.track;
      if (hw && track) await pushHardwareZoom(track, hardware);
      return total;
    },
    [pushHardwareZoom]
  );

  const zoomRef = useRef(ZOOM_MIN);
  useEffect(() => {
    zoomRef.current = zoom.value;
  }, [zoom.value]);
  const zoomBy = useCallback((delta) => applyZoom((zoomRef.current || ZOOM_MIN) + delta), [applyZoom]);

  const toggleTorch = useCallback(async () => {
    const track = sessionRef.current?.track;
    if (!track) return false;
    const on = !torch.on;
    try {
      await track.applyConstraints({ advanced: [{ torch: on }] });
      setTorch({ supported: true, on });
      return true;
    } catch {
      return false;
    }
  }, [torch.on]);

  const loop = useCallback(
    (session) => {
      const interval = Math.max(50, Math.round(1000 / fps));
      let busy = false;
      const tick = async () => {
        if (session.cancelled) return;
        session.timer = setTimeout(tick, interval);
        if (busy) return;
        const video = videoRef.current;
        const decoder = decoderRef.current;
        if (!video || !decoder || video.readyState < 2) return; // HAVE_CURRENT_DATA
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (!vw || !vh) return;
        busy = true;
        try {
          const canvas = canvasRef.current || (canvasRef.current = document.createElement("canvas"));
          const { sx, sy, side, size } = cropForZoom(vw, vh, digitalRef.current, decodeSize);
          if (canvas.width !== size) canvas.width = size;
          if (canvas.height !== size) canvas.height = size;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size);
          const text = await decoder.decode(canvas);
          if (text && !session.cancelled) onDecodeRef.current?.(text);
        } catch {
          /* a bad frame is skipped */
        } finally {
          busy = false;
        }
      };
      tick();
    },
    [fps, decodeSize]
  );

  const listCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter((d) => d.kind === "videoinput").map((d, i) => ({ id: d.deviceId, label: d.label || `Camera ${i + 1}` }));
      setCameras(cams);
    } catch {
      /* ignore */
    }
  }, []);

  const start = useCallback(async () => {
    stop();
    const session = { id: ++sessionCounter, cancelled: false, stream: null, track: null, timer: 0 };
    sessionRef.current = session;
    setStatus("starting");
    setError(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new TypeError("getUserMedia unavailable");
      if (!decoderRef.current) decoderRef.current = await createQrDecoder();
      if (session.cancelled) return;
      setEngine(decoderRef.current.engine);

      const video = { width: { ideal: 1920 }, height: { ideal: 1080 } };
      if (deviceRef.current) video.deviceId = { exact: deviceRef.current };
      else video.facingMode = { ideal: "environment" };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video });
      } catch (e) {
        if (deviceRef.current && (e?.name === "OverconstrainedError" || e?.name === "NotFoundError")) {
          deviceRef.current = null; // the remembered camera is gone — fall back to the default
          stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" } } });
        } else throw e;
      }

      // The user may have left while the permission prompt / camera start was pending.
      if (session.cancelled || sessionRef.current !== session) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      session.stream = stream;
      session.track = stream.getVideoTracks()[0] || null;

      const el = videoRef.current;
      if (!el) {
        stop();
        return;
      }
      el.srcObject = stream;
      el.muted = true;
      el.setAttribute("playsinline", "true");
      el.setAttribute("autoplay", "true");
      try {
        await el.play();
      } catch {
        /* autoplay policies — the stream still renders once the user interacts */
      }
      if (session.cancelled) return;

      // Hardware controls (zoom / torch) — only what this track really supports.
      let caps = null;
      try {
        caps = session.track?.getCapabilities?.() || null;
      } catch {
        caps = null;
      }
      hwRef.current = hardwareZoomRange(caps);
      setTorch({ supported: !!caps?.torch, on: false });
      // Continuous autofocus where the camera offers it — a code on a far
      // projector needs refocusing after every zoom change.
      if (Array.isArray(caps?.focusMode) && caps.focusMode.includes("continuous")) {
        session.track.applyConstraints({ advanced: [{ focusMode: "continuous" }] }).catch(() => {});
      }
      // Start at 1× (some cameras remember the last app's zoom). Not awaited:
      // a slow applyConstraints must never keep the scanner in "opening".
      applyZoom(ZOOM_MIN);
      listCameras();
      if (session.cancelled) return;
      setStatus("running");
      loop(session);
    } catch (e) {
      if (session.cancelled) return;
      stop();
      setError(e);
      setStatus("error");
    }
  }, [stop, applyZoom, listCameras, loop]);

  const switchCamera = useCallback(async () => {
    if (cameras.length < 2) return;
    const current = sessionRef.current?.track?.getSettings?.().deviceId || deviceRef.current;
    const idx = cameras.findIndex((c) => c.id === current);
    deviceRef.current = cameras[(idx + 1) % cameras.length].id;
    await start();
  }, [cameras, start]);

  // Start/stop with `active`; always stop on unmount.
  useEffect(() => {
    if (active) start();
    else {
      stop();
      setStatus("idle");
    }
    return () => stop();
  }, [active, start, stop]);

  // Background tab / app switch: release the camera; resume when the user comes back.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (sessionRef.current) {
          stop();
          setStatus("paused");
        }
      } else if (activeRef.current && !sessionRef.current) {
        start();
      }
    };
    const onPageHide = () => stop();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [start, stop]);

  return {
    videoRef,
    status,
    error,
    engine,
    zoom,
    setZoom: applyZoom,
    zoomBy,
    torch,
    toggleTorch,
    cameras,
    switchCamera,
    restart: start,
    stop,
  };
}
