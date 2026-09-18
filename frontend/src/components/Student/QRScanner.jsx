import { useEffect, useState, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "react-toastify";
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
} from "lucide-react";
import api from "../../utils/api.js";
import { getLocationFast, prewarmLocation, locationToText } from "../../utils/geolocation.js";
import { verifyQRLocally } from "../../utils/qrUtils.js";

const describeError = (err) => {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (err.code === 1) return "Permission denied — allow camera access in your browser settings.";
  if (err.code === 2) return "Camera is busy in another app or tab.";
  if (err.code === 3) return "Browser rejected the camera hardware error.";
  if (err.message) return err.message;
  if (err.name) return err.name;
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
};

const QRScanner = ({ onBack }) => {
  const [phase, setPhase] = useState("scanning");
  const [message, setMessage] = useState("");
  const [cameraErr, setCameraErr] = useState(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [coordsText, setCoordsText] = useState("");
  const [markResult, setMarkResult] = useState(null);
  const scannerRef = useRef(null);
  const processedRef = useRef(false);
  const tokenRef = useRef(0);

  // Warm GPS in the background while the camera boots — the single biggest
  // fix for "first scan gives error even though permission is granted".
  useEffect(() => {
    prewarmLocation();
  }, []);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        /* ignore */
      }
      try {
        await scannerRef.current.clear();
      } catch {
        /* ignore */
      }
      scannerRef.current = null;
    }
  }, []);

  const startScanner = useCallback(async () => {
    const myToken = ++tokenRef.current;
    processedRef.current = false;
    setPhase("scanning");
    setCameraErr(null);
    setHasCamera(false);

    try {
      await stopScanner();
      if (myToken !== tokenRef.current) return;

      const devices = await Html5Qrcode.getCameras();
      if (myToken !== tokenRef.current) return;

      if (!devices || devices.length === 0) {
        setCameraErr(
          "No camera found. Check browser permissions and confirm your device has a working camera."
        );
        return;
      }

      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      const backCamera =
        devices.find((d) => /back|rear|environment/i.test(d.label))?.id ||
        devices[0].id;

      const el = document.getElementById("qr-reader");
      const width = el?.clientWidth || 280;
      const boxSize = Math.round(Math.min(width * 0.72, 280));

      await scanner.start(
        backCamera,
        {
          fps: 15,
          qrbox: { width: boxSize, height: boxSize },
          aspectRatio: 1,
          disableFlip: false,
          videoConstraints: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        (rawText) => {
          if (processedRef.current) return;
          processedRef.current = true;
          handleScan(rawText);
        },
        () => {}
      );

      if (myToken !== tokenRef.current) {
        try {
          await scanner.stop();
        } catch {
          /* ignore */
        }
        return;
      }

      setHasCamera(true);
    } catch (err) {
      if (myToken !== tokenRef.current) return;
      setCameraErr("Could not start camera: " + describeError(err));
    }
  }, [stopScanner]);

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScan = async (rawText) => {
    await stopScanner();
    setPhase("loading");
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

      // Fast GPS — warm cache, then first-fix watch (no cold-start failure)
      const location = await getLocationFast({ allowCached: true });
      setCoordsText(locationToText(location));

      if (!location) {
        setPhase("error");
        setMessage(
          "We couldn't get a GPS fix yet. Make sure Location/GPS is ON and set to High accuracy, then tap Try Again. Your permission is already granted — it usually just needs a few seconds of clear sky."
        );
        return;
      }

      const res = await api.post(
        "/student/mark",
        { qrData: rawText.trim(), location },
        { timeout: 25000 }
      );

      setMarkResult({
        status: res.data?.data?.status || "PRESENT",
        message: res.data?.message || "Attendance marked present!",
        coordsText: locationToText(res.data?.data?.location || location),
      });
      setPhase("success");
      toast.success("Attendance marked!");
    } catch (err) {
      setPhase("error");
      const data = err.response?.data;
      const code = data?.code;
      let msg =
        data?.message || err.message || "Could not mark attendance. Please try again.";

      if (code === "QR_EXPIRED") {
        msg += " Tip: the faculty QR changes every 5 seconds — scan the current one.";
      } else if (code === "GEOFENCE") {
        const dist = data?.data?.distanceMeters;
        msg +=
          (dist != null ? ` (you are ~${Math.round(dist)}m away). ` : " ") +
          "Move inside the classroom area and scan again.";
      } else if (code === "WINDOW_CLOSED") {
        msg += " Faculty can still mark you Present manually.";
      } else if (code === "ALREADY_MARKED") {
        // Friendliest outcome
      } else if (!err.response) {
        msg = "Network error — check your connection and tap Try Again.";
      }

      setMessage(msg);
      toast.error(typeof msg === "string" ? msg.slice(0, 140) : "Scan failed");
    }
  };

  const retry = () => {
    setPhase("scanning");
    setMessage("");
    setCameraErr(null);
    setMarkResult(null);
    startScanner();
  };

  // ── Result screens ────────────────────────────────────────────────
  if (phase === "success" || phase === "error") {
    const ok = phase === "success";
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="card-2026 p-8 text-center max-w-sm w-full">
          <div
            className={
              "w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 " +
              (ok ? "bg-emerald-500/15" : "bg-rose-500/15")
            }
          >
            {ok ? (
              <CheckCircle2 size={44} className="text-emerald-500" />
            ) : (
              <AlertTriangle size={44} className="text-rose-500" />
            )}
          </div>
          <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-slate-100">
            {ok ? "Marked Present!" : "Could Not Mark"}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-5 leading-relaxed">
            {ok ? markResult?.message : message}
          </p>

          {(markResult?.coordsText || coordsText) && (
            <div className="mb-5 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-500/80 mb-1 flex items-center justify-center gap-1">
                <MapPin size={11} /> Your GPS coordinates
              </p>
              <p className="text-xs font-mono text-cyan-600 dark:text-cyan-300">
                {markResult?.coordsText || coordsText}
              </p>
            </div>
          )}

          {ok ? (
            <button onClick={onBack} className="btn-primary w-full">
              Back to Dashboard
            </button>
          ) : (
            <div className="space-y-2">
              <button onClick={retry} className="btn-primary w-full flex items-center justify-center gap-2">
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

  // ── Loading ───────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
        <Loader2 size={40} className="text-cyan-500 animate-spin" />
        <div className="text-center">
          <p className="font-semibold text-slate-800 dark:text-slate-200 text-lg">
            {message}
          </p>
          <div className="flex items-center justify-center gap-1.5 text-sm text-slate-500 mt-2">
            <MapPin size={14} className="text-cyan-500" />
            <span>
              {coordsText ? `Locked: ${coordsText}` : "Acquiring GPS…"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── Camera error ──────────────────────────────────────────────────
  if (cameraErr) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-50">
            <ScanLine size={22} className="text-cyan-500" /> Scan QR
          </h2>
          <button
            onClick={() => {
              stopScanner();
              onBack();
            }}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <X size={20} />
          </button>
        </div>
        <div className="card-2026 p-8 text-center">
          <CameraOff size={48} className="mx-auto text-rose-500 mb-4" />
          <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-slate-100">
            Camera Required
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-5">{cameraErr}</p>
          <button onClick={retry} className="btn-primary flex items-center gap-2 mx-auto">
            <Camera size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Active scanner ────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-50">
          <ScanLine size={22} className="text-cyan-500" /> Scan QR Code
        </h2>
        <button
          onClick={() => {
            stopScanner();
            onBack();
          }}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
        >
          <X size={20} />
        </button>
      </div>

      <div className="card-2026 p-2">
        <div
          className="relative w-full overflow-hidden rounded-2xl bg-slate-950"
          style={{ aspectRatio: "1 / 1", maxHeight: "72vh" }}
        >
          <style>{`#qr-reader{width:100%!important;height:100%!important}#qr-reader video{width:100%!important;height:100%!important;object-fit:cover!important;border-radius:1rem}#qr-reader>div{border:none!important}#qr-reader img{display:none!important}`}</style>
          <div id="qr-reader" className="absolute inset-0" />
          {!hasCamera && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/70">
              <Loader2 size={28} className="text-cyan-400 animate-spin" />
              <span className="text-xs text-slate-300">Opening camera…</span>
            </div>
          )}
        </div>
      </div>

      <div className="card-2026 p-4 flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
        <MapPin size={16} className="text-cyan-500 shrink-0 mt-0.5" />
        <span>
          Your GPS location is verified against the classroom geofence. Point
          your camera at the live QR on the faculty screen and hold steady.
        </span>
      </div>

      <p className="text-center text-slate-500 text-xs">
        QR refreshes every 5s · valid ~25s · scan the live code
      </p>
    </div>
  );
};

export default QRScanner;
