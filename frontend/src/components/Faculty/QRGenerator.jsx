import { useState, useEffect, useCallback, useRef } from 'react';
import QRCode from 'react-qr-code';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Maximize2, Minimize2, Clock } from 'lucide-react';
import { buildQRString } from '../../utils/qrUtils.js';

/**
 * QRGenerator
 * -----------
 * Props:
 *   sessionToken     — HMAC string received from server at lecture start
 *   lectureSessionId — MongoDB _id of the lecture session
 *   isFullscreen     — bool, parent controls this
 *   onToggleFullscreen — callback
 *
 * Behaviour:
 *   • Calls buildQRString(sessionToken, lectureSessionId) immediately on mount.
 *   • Rebuilds the QR every INTERVAL_MS (5 000 ms = 5 seconds).
 *   • The displayed countdown matches the rebuild interval.
 *   • Student scanner checks ts ≤ 10 s ago — so even if the student scans
 *     right before a rotation the 10 s server window covers it.
 */

const INTERVAL_MS = 5_000; // rotate every 5 seconds

const QRGenerator = ({ sessionToken, lectureSessionId, isFullscreen, onToggleFullscreen }) => {
  const [qrValue,   setQrValue]   = useState('');
  const [countdown, setCountdown] = useState(5);
  const nextRotate  = useRef(Date.now() + INTERVAL_MS);
  const rafId       = useRef(null);

  // Build a fresh QR string and reset the countdown target
  const rotate = useCallback(() => {
    if (!sessionToken || !lectureSessionId) return;
    setQrValue(buildQRString(sessionToken, lectureSessionId));
    nextRotate.current = Date.now() + INTERVAL_MS;
  }, [sessionToken, lectureSessionId]);

  // Use requestAnimationFrame so countdown is always smooth
  useEffect(() => {
    rotate();

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((nextRotate.current - Date.now()) / 1000));
      setCountdown(remaining);
      if (Date.now() >= nextRotate.current) rotate();
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafId.current);
  }, [rotate]);

  if (!sessionToken || !lectureSessionId) return null;

  const size = isFullscreen ? 380 : 210;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-6 text-center select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-lg">Live Attendance QR</h3>
        <button
          onClick={onToggleFullscreen}
          className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
          title={isFullscreen ? 'Exit fullscreen' : 'Show fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>

      {/* QR Code — AnimatePresence gives a tiny fade when value changes */}
      <AnimatePresence mode="wait">
        <motion.div
          key={qrValue}
          initial={{ opacity: 0.6, scale: 0.97 }}
          animate={{ opacity: 1,   scale: 1 }}
          exit={{    opacity: 0,   scale: 0.97 }}
          transition={{ duration: 0.15 }}
          className="bg-white p-4 rounded-2xl inline-block shadow-2xl shadow-cyan-500/20 mb-5"
        >
          {qrValue && (
            <QRCode value={qrValue} size={size} level="H" />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Countdown bar */}
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
          style={{ width: `${(countdown / 5) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Status row */}
      <div className="flex items-center justify-center gap-3 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-slate-400">Live</span>
        </div>
        <span className="text-slate-600">•</span>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Clock size={13} />
          <span>Refreshes in</span>
          <span className="font-mono font-bold text-cyan-400 w-4 text-center">{countdown}</span>
          <span>s</span>
        </div>
        <button
          onClick={rotate}
          title="Force refresh"
          className="ml-1 p-1 rounded hover:bg-slate-800 text-slate-600 hover:text-cyan-400 transition-colors"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      <p className="text-xs text-slate-600 mt-3">
        QR rotates every 5 s — screenshots expire within 10 s
      </p>
    </motion.div>
  );
};

export default QRGenerator;
