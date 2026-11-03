import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, MapPin, CheckCircle2, XCircle, Loader2, RefreshCcw, ShieldCheck } from "lucide-react";
import { getLocationFast } from "../../utils/geolocation.js";

const label = (s) => ({ granted: "Allowed", prompt: "Not asked yet", denied: "Blocked", unsupported: "Not supported", checking: "Checking…", working: "Requesting…" }[s] || s);

/**
 * Permission gate shown BEFORE the camera opens.
 * New students see exactly what is needed, why, and what to tap — no reload.
 * Camera is tested with getUserMedia (tracks stopped immediately) and
 * location with a real GPS fix, so "Allowed" here means scanning will work.
 */
export default function PermissionGate({ onReady, onBack }) {
  const [cam, setCam] = useState("checking");
  const [gps, setGps] = useState("checking");
  // Any GPS request still running when this screen is left is cancelled at once.
  const abortRef = useRef(null);
  useEffect(() => {
    abortRef.current = new AbortController();
    return () => abortRef.current?.abort();
  }, []);

  const queryStates = useCallback(async () => {
    const read = async (name, setter) => {
      try {
        if (!navigator.permissions?.query) { setter("prompt"); return; }
        const st = await navigator.permissions.query({ name });
        setter(st.state);
        st.onchange = () => setter(st.state);
      } catch { setter("prompt"); }
    };
    if (!navigator.mediaDevices?.getUserMedia) setCam("unsupported"); else read("camera", setCam);
    if (!("geolocation" in navigator)) setGps("unsupported"); else read("geolocation", setGps);
  }, []);

  useEffect(() => { queryStates(); }, [queryStates]);

  const requestCamera = async () => {
    setCam("working");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      stream.getTracks().forEach((t) => t.stop());
      setCam("granted");
    } catch (e) {
      setCam(e?.name === "NotAllowedError" ? "denied" : "prompt");
    }
  };

  const requestGps = async () => {
    setGps("working");
    const fix = await getLocationFast({ allowCached: false, signal: abortRef.current?.signal }).catch(() => null);
    if (abortRef.current?.signal.aborted) return;
    if (fix) setGps("granted");
    else {
      // Distinguish blocked vs. just no fix yet
      try {
        const st = await navigator.permissions.query({ name: "geolocation" });
        setGps(st.state === "denied" ? "denied" : "prompt");
      } catch { setGps("prompt"); }
    }
  };

  const ready = cam === "granted" && gps === "granted";
  const Row = ({ icon: Icon, title, why, state, onRequest, requestLabel }) => (
    <div className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center shrink-0"><Icon size={20} /></div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{why}</p>
        {state === "denied" && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 leading-relaxed">
            It is blocked. Tap the lock / tune icon in the address bar → Site settings → set this to
            <b> Allow</b>, then tap <b>Check again</b> below. No need to reload.
          </p>
        )}
        {state === "prompt" && onRequest && (
          <button onClick={onRequest} className="btn-primary text-xs py-2 px-3 mt-2">{requestLabel}</button>
        )}
      </div>
      <span className={"shrink-0 inline-flex items-center gap-1 text-xs font-bold " + (state === "granted" ? "text-emerald-500" : state === "denied" ? "text-rose-500" : "text-slate-400")}>
        {state === "working" || state === "checking" ? <Loader2 size={14} className="animate-spin" /> : state === "granted" ? <CheckCircle2 size={14} /> : state === "denied" ? <XCircle size={14} /> : null}
        {label(state)}
      </span>
    </div>
  );

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="text-center">
        <ShieldCheck size={36} className="mx-auto text-cyan-500 mb-2" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Before you scan</h2>
        <p className="text-sm text-slate-500 mt-1">Attendance needs your camera (to read the QR) and location (to confirm you are in the classroom). Nothing is recorded.</p>
      </div>
      <Row icon={Camera} title="1. Camera" why="Used only to scan the faculty's QR code." state={cam} onRequest={requestCamera} requestLabel="Allow camera" />
      <Row icon={MapPin} title="2. Location" why="Used only at scan time to confirm you are inside the classroom area." state={gps} onRequest={requestGps} requestLabel="Allow location" />
      <button disabled={!ready} onClick={onReady} className="btn-primary w-full disabled:opacity-50">
        {ready ? "Start scanning" : "Allow both to continue"}
      </button>
      <div className="flex gap-2">
        <button onClick={queryStates} className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm"><RefreshCcw size={14} /> Check again</button>
        {onBack && <button onClick={onBack} className="btn-secondary flex-1 text-sm">Back</button>}
      </div>
    </div>
  );
}
