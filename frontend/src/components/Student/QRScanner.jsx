import { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { X, ScanLine, CheckCircle, AlertCircle, Camera, CameraOff, MapPin, Clock } from 'lucide-react';
import axiosInstance from '../../utils/axios.js';
import { verifyQRLocally } from '../../utils/qrUtils.js';

/**
 * QRScanner  (Student)
 * --------------------
 * Flow:
 *  1. Camera opens with Html5Qrcode.
 *  2. On decode → verifyQRLocally(rawText):
 *       • Decodes base64url JSON  { token, lectureSessionId, ts }
 *       • Checks:  Date.now() - ts  ≤ 10 000 ms   (proxy-proof window)
 *       • If ts > 10 s ago → rejected immediately, no network call.
 *  3. If local check passes → get GPS position.
 *  4. POST /student/mark  { qrData: rawText, location: { lat, lon } }
 *     Server re-checks HMAC + ts window (±10 s) + geofence.
 *  5. Show success / error card.
 */

const QRScanner = ({ onBack }) => {
  const [phase, setPhase]         = useState('scanning'); // scanning | loading | success | error
  const [message, setMessage]     = useState('');
  const [cameraErr, setCameraErr] = useState(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [tsWarning, setTsWarning] = useState('');   // live "QR age" warning
  const scannerRef   = useRef(null);
  const processedRef = useRef(false);
  const ageInterval  = useRef(null);
  const lastTs       = useRef(null);
  const startTokenRef = useRef(0); // guards against overlapping startScanner() calls

  // ── Helper: normalize any thrown value into a readable string ──────────
  // html5-qrcode / getUserMedia can reject with DOMException, a plain
  // string, or an object without a `.message` property. Without this,
  // `err.message` prints the literal text "undefined".
  const describeError = (err) => {
    if (!err) return 'Unknown error';
    if (typeof err === 'string') return err;
    if (err.message) return err.message;
    if (err.name) return err.name;
    try {
      return JSON.stringify(err);
    } catch {
      return 'Unknown error';
    }
  };

  // ── Stop scanner ─────────────────────────────────────────────────────────
  // Releases the html5-qrcode instance AND explicitly stops any lingering
  // MediaStream tracks. Some browsers don't fully release the camera via
  // scanner.stop() alone, which silently blocks the next start() call.
  const stopScanner = useCallback(async () => {
    clearInterval(ageInterval.current);
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      try { await scannerRef.current.clear(); } catch {}
      scannerRef.current = null;
    }
    // Extra safety net: kill any lingering video tracks left in the DOM
    // node in case html5-qrcode's own stop() didn't fully release them.
    try {
      const video = document.querySelector('#qr-reader video');
      if (video?.srcObject) {
        video.srcObject.getTracks().forEach((t) => t.stop());
        video.srcObject = null;
      }
    } catch {}
  }, []);

  // ── Start scanner ────────────────────────────────────────────────────────
  const startScanner = useCallback(async () => {
    // Each call gets a unique token. If a newer call starts before this one
    // finishes, this one's result is discarded — prevents two overlapping
    // start attempts (e.g. rapid retry taps) from racing each other and
    // leaving the UI stuck on the spinner.
    const myToken = ++startTokenRef.current;

    processedRef.current = false;
    setPhase('scanning');
    setTsWarning('');
    lastTs.current = null;
    setCameraErr(null);
    setHasCamera(false);

    try {
      // Make sure any previous instance is fully stopped/cleared before
      // requesting the camera again. Re-requesting the camera while a
      // previous getUserMedia stream/track is still being released is
      // the most common cause of "Could not start camera: undefined".
      await stopScanner();
      if (myToken !== startTokenRef.current) return; // a newer start() superseded this one

      // Confirm at least one camera device is actually available.
      // In some environments (e.g. cloud/VM dev workstations) permission
      // can be "granted" but zero devices are enumerable — start() would
      // otherwise throw a non-standard error object in that case.
      const devices = await Html5Qrcode.getCameras();
      if (myToken !== startTokenRef.current) return;
      if (!devices || devices.length === 0) {
        setCameraErr(
          'No camera device was found. If you are using a remote/cloud dev ' +
          'environment, make sure your browser has access to a real camera ' +
          '(check chrome://settings/content/camera) and that no other tab ' +
          'or app is currently using it.'
        );
        return;
      }

      // Small delay lets the browser fully release any prior camera
      // handle before we ask for it again — avoids the start() race.
      await new Promise((r) => setTimeout(r, 400));
      if (myToken !== startTokenRef.current) return;

      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      // Prefer an explicit device id (more reliable than facingMode in
      // many desktop browsers and VMs, where "environment" may not
      // resolve to any device at all). Fall back to facingMode.
      const preferredCamera =
        devices.find((d) => /back|rear|environment/i.test(d.label))?.id ||
        devices[0].id;

      // Size the scan box relative to the viewfinder's actual rendered
      // width instead of a flat 260px, so it stays visually centered and
      // proportional inside the fixed aspect-ratio container at any
      // screen size (mobile, tablet, desktop).
      const viewfinderEl = document.getElementById('qr-reader');
      const renderedWidth = viewfinderEl?.clientWidth || 280;
      const boxSize = Math.round(Math.min(renderedWidth * 0.7, 280));

      // ── Hard timeout around scanner.start() ──────────────────────────
      // html5-qrcode's start() can hang indefinitely (no resolve, no
      // reject) if a previous camera track hasn't fully released yet.
      // Racing it against a timeout guarantees the UI always reaches
      // either "camera open" or "camera error" instead of spinning
      // forever and forcing a page refresh.
      const startPromise = scanner.start(
        preferredCamera,
        { fps: 15, qrbox: { width: boxSize, height: boxSize } },
        (rawText) => {
          if (processedRef.current) return;
          processedRef.current = true;
          handleScan(rawText);
        },
        () => { /* ignore decode errors — normal while aiming */ }
      );

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Camera took too long to start. Tap retry.')),
          6000
        )
      );

      await Promise.race([startPromise, timeoutPromise]);

      if (myToken !== startTokenRef.current) {
        // A newer attempt superseded this one while we were waiting —
        // tear down what we just opened instead of leaving it dangling.
        try { await scanner.stop(); } catch {}
        try { await scanner.clear(); } catch {}
        return;
      }

      setHasCamera(true);
    } catch (err) {
      if (myToken !== startTokenRef.current) return;
      setCameraErr('Could not start camera: ' + describeError(err));
    }
  }, [stopScanner]); // eslint-disable-line

  useEffect(() => {
    startScanner();
    return () => { stopScanner(); };
  }, []); // eslint-disable-line

  // ── Live age warning (updates every 500 ms once a ts is seen) ───────────
  // When the scanner detects the QR but before the student taps anything,
  // we show how stale it is in real-time so they know to wait for a refresh.
  useEffect(() => {
    ageInterval.current = setInterval(() => {
      if (!lastTs.current) return;
      const age = Date.now() - lastTs.current;
      if (age > 8_000) setTsWarning('QR is about to expire — wait for the next one!');
      else if (age > 5_000) setTsWarning(`QR is ${Math.round(age/1000)}s old`);
      else setTsWarning('');
    }, 500);
    return () => clearInterval(ageInterval.current);
  }, []);

  // ── Core scan handler ────────────────────────────────────────────────────
  const handleScan = async (rawText) => {
    await stopScanner();
    setPhase('loading');

    // ── Step 1: Frontend timestamp check (proxy-proof) ────────────────────
    const localCheck = verifyQRLocally(rawText);
    if (!localCheck.valid) {
      setPhase('error');
      setMessage(localCheck.message);
      return;
    }

    // ── Step 2: Get GPS ───────────────────────────────────────────────────
    let location = null;
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, {
          enableHighAccuracy: true,
          timeout: 10_000,
          maximumAge: 0,
        })
      );
      location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    } catch {
      setPhase('error');
      setMessage('Location permission is required. Please enable GPS and try again.');
      return;
    }

    // ── Step 3: POST to server ────────────────────────────────────────────
    try {
      const res = await axiosInstance.post('/student/mark', {
        qrData: rawText,
        location,
      });
      setPhase('success');
      setMessage(res.data?.message || 'Attendance marked successfully!');
      toast.success('Attendance marked! ✓');
    } catch (err) {
      setPhase('error');
      setMessage(err.response?.data?.message || 'Failed to mark attendance');
      toast.error(err.response?.data?.message || 'Error marking attendance');
    }
  };

  const retry = () => {
    setPhase('scanning');
    setMessage('');
    setCameraErr(null);
    setTsWarning('');
    startScanner();
  };

  // ── Render: result cards ─────────────────────────────────────────────────
  if (phase === 'success' || phase === 'error') {
    const ok = phase === 'success';
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-card p-8 text-center max-w-sm w-full"
        >
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${ok ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
            {ok
              ? <CheckCircle size={44} className="text-emerald-400" />
              : <AlertCircle size={44} className="text-rose-400" />}
          </div>
          <h3 className="text-xl font-bold mb-2">{ok ? 'Marked Present!' : 'Could Not Mark'}</h3>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">{message}</p>
          {ok ? (
            <button onClick={onBack} className="btn-primary w-full">Back to Dashboard</button>
          ) : (
            <div className="space-y-2">
              <button onClick={retry} className="btn-primary w-full">Try Again</button>
              <button onClick={onBack} className="btn-secondary w-full">Cancel</button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // ── Render: loading ────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
        <div className="w-14 h-14 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
        <div className="text-center">
          <p className="font-semibold text-slate-200 text-lg">Verifying attendance…</p>
          <div className="flex items-center justify-center gap-1.5 text-sm text-slate-400 mt-1">
            <MapPin size={14} className="text-cyan-400" />
            <span>Checking your GPS location</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: camera error ───────────────────────────────────────────────
  if (cameraErr) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ScanLine size={22} className="text-cyan-400" /> Scan QR
          </h2>
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400"><X size={20} /></button>
        </div>
        <div className="glass-card p-8 text-center">
          <CameraOff size={48} className="mx-auto text-rose-400 mb-4" />
          <h3 className="text-lg font-bold mb-2">Camera Required</h3>
          <p className="text-slate-400 text-sm mb-4">{cameraErr}</p>
          <button onClick={retry} className="btn-primary flex items-center gap-2 mx-auto">
            <Camera size={18} /> Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Render: active scanner ─────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ScanLine size={22} className="text-cyan-400" /> Scan QR Code
        </h2>
        <button
          onClick={() => { stopScanner(); onBack(); }}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Live timestamp warning */}
      <AnimatePresence>
        {tsWarning && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm"
          >
            <Clock size={14} />
            <span>{tsWarning}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera viewfinder */}
      <div className="glass-card p-3">
        <div
          className="relative w-full overflow-hidden rounded-2xl bg-slate-950"
          style={{ aspectRatio: '1 / 1', maxHeight: '70vh' }}
        >
          {/* html5-qrcode injects its own <video> + <canvas> inside this div.
              We can't pass className/style to those injected elements directly,
              so we scope-style them here to fill and crop to this fixed box
              instead of stretching to their native camera aspect ratio. */}
          <style>{`
            #qr-reader {
              width: 100% !important;
              height: 100% !important;
            }
            #qr-reader video {
              width: 100% !important;
              height: 100% !important;
              object-fit: cover !important;
              border-radius: 1rem;
            }
            #qr-reader > div {
              border: none !important;
            }
            #qr-reader img {
              display: none !important;
            }
          `}</style>
          <div id="qr-reader" className="absolute inset-0" />
          {!hasCamera && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/60">
              <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
              <span className="text-xs text-slate-400">Opening camera…</span>
            </div>
          )}
        </div>
      </div>

      {/* Info strip */}
      <div className="glass-card p-3 flex items-start gap-2 text-sm text-slate-400">
        <MapPin size={15} className="text-cyan-400 shrink-0 mt-0.5" />
        <span>Your GPS location will be captured and verified against the classroom (within 100 m)</span>
      </div>

      <p className="text-center text-slate-500 text-xs">
        Point at the QR shown by your faculty · QR is valid for 10 seconds after generation
      </p>
    </div>
  );
};

export default QRScanner;

// ---------------------------------------------------------------------------------------
// ----------------------------Orignl---------------------------------------------------
// import { useEffect, useState, useRef, useCallback } from 'react';
// import { Html5Qrcode } from 'html5-qrcode';
// import { motion, AnimatePresence } from 'framer-motion';
// import { toast } from 'react-toastify';
// import { X, ScanLine, CheckCircle, AlertCircle, Camera, CameraOff, MapPin, Clock } from 'lucide-react';
// import axiosInstance from '../../utils/axios.js';
// import { verifyQRLocally } from '../../utils/qrUtils.js';

// /**
//  * QRScanner  (Student)
//  * --------------------
//  * Flow:
//  *  1. Camera opens with Html5Qrcode.
//  *  2. On decode → verifyQRLocally(rawText):
//  *       • Decodes base64url JSON  { token, lectureSessionId, ts }
//  *       • Checks:  Date.now() - ts  ≤ 10 000 ms   (proxy-proof window)
//  *       • If ts > 10 s ago → rejected immediately, no network call.
//  *  3. If local check passes → get GPS position.
//  *  4. POST /student/mark  { qrData: rawText, location: { lat, lon } }
//  *     Server re-checks HMAC + ts window (±10 s) + geofence.
//  *  5. Show success / error card.
//  */

// const QRScanner = ({ onBack }) => {
//   const [phase, setPhase]         = useState('scanning'); // scanning | loading | success | error
//   const [message, setMessage]     = useState('');
//   const [cameraErr, setCameraErr] = useState(null);
//   const [hasCamera, setHasCamera] = useState(false);
//   const [tsWarning, setTsWarning] = useState('');   // live "QR age" warning
//   const scannerRef   = useRef(null);
//   const processedRef = useRef(false);
//   const ageInterval  = useRef(null);
//   const lastTs       = useRef(null);

//   // ── Helper: normalize any thrown value into a readable string ──────────
//   // html5-qrcode / getUserMedia can reject with DOMException, a plain
//   // string, or an object without a `.message` property. Without this,
//   // `err.message` prints the literal text "undefined".
//   const describeError = (err) => {
//     if (!err) return 'Unknown error';
//     if (typeof err === 'string') return err;
//     if (err.message) return err.message;
//     if (err.name) return err.name;
//     try {
//       return JSON.stringify(err);
//     } catch {
//       return 'Unknown error';
//     }
//   };

//   // ── Start scanner ────────────────────────────────────────────────────────
//   const startScanner = useCallback(async () => {
//     processedRef.current = false;
//     setPhase('scanning');
//     setTsWarning('');
//     lastTs.current = null;
//     setCameraErr(null);
//     setHasCamera(false);

//     try {
//       // Make sure any previous instance is fully stopped/cleared before
//       // requesting the camera again. Re-requesting the camera while a
//       // previous getUserMedia stream/track is still being released is
//       // the most common cause of "Could not start camera: undefined".
//       if (scannerRef.current) {
//         try { await scannerRef.current.stop(); } catch {}
//         try { await scannerRef.current.clear(); } catch {}
//         scannerRef.current = null;
//       }

//       // Confirm at least one camera device is actually available.
//       // In some environments (e.g. cloud/VM dev workstations) permission
//       // can be "granted" but zero devices are enumerable — start() would
//       // otherwise throw a non-standard error object in that case.
//       const devices = await Html5Qrcode.getCameras();
//       if (!devices || devices.length === 0) {
//         setCameraErr(
//           'No camera device was found. If you are using a remote/cloud dev ' +
//           'environment, make sure your browser has access to a real camera ' +
//           '(check chrome://settings/content/camera) and that no other tab ' +
//           'or app is currently using it.'
//         );
//         return;
//       }

//       // Small delay lets the browser fully release any prior camera
//       // handle before we ask for it again — avoids the start() race.
//       await new Promise((r) => setTimeout(r, 250));

//       const scanner = new Html5Qrcode('qr-reader');
//       scannerRef.current = scanner;

//       // Prefer an explicit device id (more reliable than facingMode in
//       // many desktop browsers and VMs, where "environment" may not
//       // resolve to any device at all). Fall back to facingMode.
//       const preferredCamera =
//         devices.find((d) => /back|rear|environment/i.test(d.label))?.id ||
//         devices[0].id;

//       // Size the scan box relative to the viewfinder's actual rendered
//       // width instead of a flat 260px, so it stays visually centered and
//       // proportional inside the fixed aspect-ratio container at any
//       // screen size (mobile, tablet, desktop).
//       const viewfinderEl = document.getElementById('qr-reader');
//       const renderedWidth = viewfinderEl?.clientWidth || 280;
//       const boxSize = Math.round(Math.min(renderedWidth * 0.7, 280));

//       await scanner.start(
//         preferredCamera,
//         { fps: 15, qrbox: { width: boxSize, height: boxSize } },
//         (rawText) => {
//           if (processedRef.current) return;
//           processedRef.current = true;
//           handleScan(rawText);
//         },
//         () => { /* ignore decode errors — normal while aiming */ }
//       );

//       setHasCamera(true);
//     } catch (err) {
//       setCameraErr('Could not start camera: ' + describeError(err));
//     }
//   }, []); // eslint-disable-line

//   const stopScanner = useCallback(async () => {
//     clearInterval(ageInterval.current);
//     if (scannerRef.current) {
//       try { await scannerRef.current.stop(); } catch {}
//       try { await scannerRef.current.clear(); } catch {}
//       scannerRef.current = null;
//     }
//   }, []);

//   useEffect(() => {
//     startScanner();
//     return () => { stopScanner(); };
//   }, []); // eslint-disable-line

//   // ── Live age warning (updates every 500 ms once a ts is seen) ───────────
//   // When the scanner detects the QR but before the student taps anything,
//   // we show how stale it is in real-time so they know to wait for a refresh.
//   useEffect(() => {
//     ageInterval.current = setInterval(() => {
//       if (!lastTs.current) return;
//       const age = Date.now() - lastTs.current;
//       if (age > 8_000) setTsWarning('QR is about to expire — wait for the next one!');
//       else if (age > 5_000) setTsWarning(`QR is ${Math.round(age/1000)}s old`);
//       else setTsWarning('');
//     }, 500);
//     return () => clearInterval(ageInterval.current);
//   }, []);

//   // ── Core scan handler ────────────────────────────────────────────────────
//   const handleScan = async (rawText) => {
//     await stopScanner();
//     setPhase('loading');

//     // ── Step 1: Frontend timestamp check (proxy-proof) ────────────────────
//     const localCheck = verifyQRLocally(rawText);
//     if (!localCheck.valid) {
//       setPhase('error');
//       setMessage(localCheck.message);
//       return;
//     }

//     // ── Step 2: Get GPS ───────────────────────────────────────────────────
//     let location = null;
//     try {
//       const pos = await new Promise((res, rej) =>
//         navigator.geolocation.getCurrentPosition(res, rej, {
//           enableHighAccuracy: true,
//           timeout: 10_000,
//           maximumAge: 0,
//         })
//       );
//       location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
//     } catch {
//       setPhase('error');
//       setMessage('Location permission is required. Please enable GPS and try again.');
//       return;
//     }

//     // ── Step 3: POST to server ────────────────────────────────────────────
//     try {
//       const res = await axiosInstance.post('/student/mark', {
//         qrData: rawText,
//         location,
//       });
//       setPhase('success');
//       setMessage(res.data?.message || 'Attendance marked successfully!');
//       toast.success('Attendance marked! ✓');
//     } catch (err) {
//       setPhase('error');
//       setMessage(err.response?.data?.message || 'Failed to mark attendance');
//       toast.error(err.response?.data?.message || 'Error marking attendance');
//     }
//   };

//   const retry = () => {
//     setPhase('scanning');
//     setMessage('');
//     setCameraErr(null);
//     setTsWarning('');
//     startScanner();
//   };

//   // ── Render: result cards ─────────────────────────────────────────────────
//   if (phase === 'success' || phase === 'error') {
//     const ok = phase === 'success';
//     return (
//       <div className="flex flex-col items-center justify-center min-h-[60vh]">
//         <motion.div
//           initial={{ scale: 0.8, opacity: 0 }}
//           animate={{ scale: 1, opacity: 1 }}
//           className="glass-card p-8 text-center max-w-sm w-full"
//         >
//           <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${ok ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
//             {ok
//               ? <CheckCircle size={44} className="text-emerald-400" />
//               : <AlertCircle size={44} className="text-rose-400" />}
//           </div>
//           <h3 className="text-xl font-bold mb-2">{ok ? 'Marked Present!' : 'Could Not Mark'}</h3>
//           <p className="text-slate-400 text-sm mb-6 leading-relaxed">{message}</p>
//           {ok ? (
//             <button onClick={onBack} className="btn-primary w-full">Back to Dashboard</button>
//           ) : (
//             <div className="space-y-2">
//               <button onClick={retry} className="btn-primary w-full">Try Again</button>
//               <button onClick={onBack} className="btn-secondary w-full">Cancel</button>
//             </div>
//           )}
//         </motion.div>
//       </div>
//     );
//   }

//   // ── Render: loading ────────────────────────────────────────────────────
//   if (phase === 'loading') {
//     return (
//       <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
//         <div className="w-14 h-14 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
//         <div className="text-center">
//           <p className="font-semibold text-slate-200 text-lg">Verifying attendance…</p>
//           <div className="flex items-center justify-center gap-1.5 text-sm text-slate-400 mt-1">
//             <MapPin size={14} className="text-cyan-400" />
//             <span>Checking your GPS location</span>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // ── Render: camera error ───────────────────────────────────────────────
//   if (cameraErr) {
//     return (
//       <div className="space-y-4">
//         <div className="flex items-center justify-between">
//           <h2 className="text-xl font-bold flex items-center gap-2">
//             <ScanLine size={22} className="text-cyan-400" /> Scan QR
//           </h2>
//           <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400"><X size={20} /></button>
//         </div>
//         <div className="glass-card p-8 text-center">
//           <CameraOff size={48} className="mx-auto text-rose-400 mb-4" />
//           <h3 className="text-lg font-bold mb-2">Camera Required</h3>
//           <p className="text-slate-400 text-sm mb-4">{cameraErr}</p>
//           <button onClick={retry} className="btn-primary flex items-center gap-2 mx-auto">
//             <Camera size={18} /> Retry
//           </button>
//         </div>
//       </div>
//     );
//   }

//   // ── Render: active scanner ─────────────────────────────────────────────
//   return (
//     <div className="space-y-4">
//       <div className="flex items-center justify-between">
//         <h2 className="text-xl font-bold flex items-center gap-2">
//           <ScanLine size={22} className="text-cyan-400" /> Scan QR Code
//         </h2>
//         <button
//           onClick={() => { stopScanner(); onBack(); }}
//           className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
//         >
//           <X size={20} />
//         </button>
//       </div>

//       {/* Live timestamp warning */}
//       <AnimatePresence>
//         {tsWarning && (
//           <motion.div
//             initial={{ opacity: 0, y: -8 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -8 }}
//             className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm"
//           >
//             <Clock size={14} />
//             <span>{tsWarning}</span>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* Camera viewfinder */}
//       <div className="glass-card p-3">
//         <div
//           className="relative w-full overflow-hidden rounded-2xl bg-slate-950"
//           style={{ aspectRatio: '1 / 1', maxHeight: '70vh' }}
//         >
//           {/* html5-qrcode injects its own <video> + <canvas> inside this div.
//               We can't pass className/style to those injected elements directly,
//               so we scope-style them here to fill and crop to this fixed box
//               instead of stretching to their native camera aspect ratio. */}
//           <style>{`
//             #qr-reader {
//               width: 100% !important;
//               height: 100% !important;
//             }
//             #qr-reader video {
//               width: 100% !important;
//               height: 100% !important;
//               object-fit: cover !important;
//               border-radius: 1rem;
//             }
//             #qr-reader > div {
//               border: none !important;
//             }
//             #qr-reader img {
//               display: none !important;
//             }
//           `}</style>
//           <div id="qr-reader" className="absolute inset-0" />
//           {!hasCamera && (
//             <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60">
//               <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Info strip */}
//       <div className="glass-card p-3 flex items-start gap-2 text-sm text-slate-400">
//         <MapPin size={15} className="text-cyan-400 shrink-0 mt-0.5" />
//         <span>Your GPS location will be captured and verified against the classroom (within 100 m)</span>
//       </div>

//       <p className="text-center text-slate-500 text-xs">
//         Point at the QR shown by your faculty · QR is valid for 10 seconds after generation
//       </p>
//     </div>
//   );
// };

// export default QRScanner;