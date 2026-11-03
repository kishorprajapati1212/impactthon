/**
 * AttendX notification system - built in-house, no toast library.
 *
 * Why custom: library toasts rendered raw strings (huge html5-qrcode /
 * Axios messages), styled inconsistently, and could stack endlessly.
 * This module guarantees for EVERY message in the app:
 *  - plain text only (HTML stripped), whitespace collapsed
 *  - max 180 characters (long library text is cut, never flooded)
 *  - identical messages within 2.5s are shown once (no spam stacks)
 *  - at most 4 visible at once
 *
 * Usage (drop-in anywhere, no hook needed):
 *   import toast from "../../utils/notify.js";
 *   toast.success("Saved"); toast.error("Could not save. Please try again.");
 *   toast.info("..."); toast.warning("...");
 * <NotificationCenter /> (mounted once in main.jsx) renders them.
 */
export const NOTIFY_EVENT = "attendx:notify";
const MAX_LEN = 180;
const DEDUPE_MS = 2500;
const recent = new Map(); // message+type -> timestamp

export function cleanMessage(input, fallback = "Something went wrong. Please try again.") {
  let text = input == null ? "" : String(input);
  text = text.replace(/<[^>]*>/g, " ");            // strip any HTML
  text = text.replace(/\{[\s\S]*\}/g, " ");          // drop JSON-ish dumps
  text = text.replace(/\s+/g, " ").trim();
  if (!text || /mongo|mongoose|E11000|CastError|at\s+\w+\s+\(|stack/i.test(text)) return fallback;
  if (text.length > MAX_LEN) text = text.slice(0, MAX_LEN - 1).trimEnd() + "…";
  return text;
}

function emit(type, message, options = {}) {
  const text = cleanMessage(message, options.fallback);
  const key = type + ":" + text;
  const now = Date.now();
  if (recent.get(key) && now - recent.get(key) < DEDUPE_MS) return null;
  recent.set(key, now);
  const detail = {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    title: options.title ? cleanMessage(options.title, "") : "",
    message: text,
    duration: options.duration ?? (type === "error" ? 6000 : 4500),
  };
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(NOTIFY_EVENT, { detail }));
  return detail;
}

const toast = {
  success: (m, o) => emit("success", m, o),
  error: (m, o) => emit("error", m, { fallback: "Something went wrong. Please try again.", ...o }),
  info: (m, o) => emit("info", m, o),
  warning: (m, o) => emit("warning", m, o),
};
export const notify = toast;
export default toast;
