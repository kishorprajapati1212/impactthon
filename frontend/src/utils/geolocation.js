/**
 * ── Geolocation helper — fixes the "first scan fails even with permission" bug ──
 *
 * Browsers reject `getCurrentPosition` when GPS has no fix yet (a cold start
 * can take 10–30s). Using `watchPosition` lets us resolve with the *first*
 * fix as soon as it arrives (much faster), and keeps a warm cache so the
 * NEXT scan is instant. We also fall back to the last known position when
 * the cached fix is still fresh.
 */

const WARM_TTL_MS = 60_000; // how long a cached fix stays "reusable"
const MAX_ACCURACY_M = 500; // anything coarser isn't meaningful for geofence

let cache = null; // { latitude, longitude, accuracy, at }
let activeWatch = null;

function persist(entry) {
  try {
    sessionStorage.setItem("attendx_last_gps", JSON.stringify(entry));
  } catch {
    /* ignore */
  }
}

function loadPersisted() {
  try {
    const raw = sessionStorage.getItem("attendx_last_gps");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.latitude || !parsed?.longitude) return null;
    return parsed;
  } catch {
    return null;
  }
}

function bestFix(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a.accuracy <= b.accuracy ? a : b;
}

/**
 * Warm the location cache in the background (called when the scan screen
 * opens, so the GPS fix is usually ready by the time the QR is read).
 *
 * Phase 18: cancellable. The previous one-shot getCurrentPosition could not be
 * stopped, so leaving the scan screen left the browser's location indicator
 * on for up to 15 s. A watch can be cleared, so pass an AbortSignal and the
 * request ends the moment the screen is left.
 */
export function prewarmLocation({ signal, timeoutMs = 15_000 } = {}) {
  if (typeof window === "undefined" || !("geolocation" in navigator)) return Promise.resolve(null);
  if (signal?.aborted) return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    let id = null;
    const finish = (entry) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener?.("abort", onAbort);
      if (id != null) {
        try {
          navigator.geolocation.clearWatch(id);
        } catch {
          /* ignore */
        }
      }
      if (entry) {
        cache = entry;
        persist(entry);
      }
      resolve(entry);
    };
    const onAbort = () => finish(null);
    signal?.addEventListener?.("abort", onAbort, { once: true });
    const timer = setTimeout(() => finish(null), timeoutMs);
    try {
      id = navigator.geolocation.watchPosition(
        (pos) => finish(toEntry(pos)),
        () => finish(null),
        { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30_000 }
      );
    } catch {
      finish(null);
    }
  });
}

function toEntry(pos) {
  if (!pos?.coords) return null;
  const lat = Number(pos.coords.latitude);
  const lon = Number(pos.coords.longitude);
  const acc =
    pos.coords.accuracy != null ? Math.max(0, Math.round(pos.coords.accuracy)) : null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (acc != null && acc > MAX_ACCURACY_M) return null;
  return { latitude: lat, longitude: lon, accuracy: acc, at: Date.now() };
}

/** Synchronous: the warm fix if one is still fresh, else null. */
export function getCachedLocation({ allowPersisted = true } = {}) {
  if (cache && Date.now() - cache.at < WARM_TTL_MS) return cache;
  if (!allowPersisted) return null;
  const persisted = loadPersisted();
  return persisted && Date.now() - persisted.at < WARM_TTL_MS ? persisted : null;
}

/**
 * Ask the browser (without prompting) whether location is allowed.
 * Resolves to "granted" | "prompt" | "denied" | "unsupported".
 * Safari < 16 has no Permissions API → "prompt" (we simply don't know yet).
 */
export async function getLocationPermission() {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) return "unsupported";
  try {
    if (!navigator.permissions?.query) return "prompt";
    const st = await navigator.permissions.query({ name: "geolocation" });
    return st?.state || "prompt";
  } catch {
    return "prompt";
  }
}

/**
 * Subscribe to permission changes (user flips the site setting while the page
 * is open). Returns an unsubscribe function; a no-op where unsupported.
 */
export function watchLocationPermission(onChange) {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) return () => {};
  let status = null;
  const handler = () => onChange?.(status?.state || "prompt");
  navigator.permissions
    .query({ name: "geolocation" })
    .then((st) => {
      status = st;
      st.addEventListener?.("change", handler);
    })
    .catch(() => {});
  return () => {
    try {
      status?.removeEventListener?.("change", handler);
    } catch {
      /* ignore */
    }
  };
}

/**
 * Get the best available location fast.
 * Returns { latitude, longitude, accuracy } or null.
 *
 * @param {object}  opts
 * @param {boolean} opts.allowCached  reuse a fresh fix from this tab (default true)
 * @param {number}  opts.timeoutMs    hard cap for the whole call (default 18 s).
 *        Pass a small value (e.g. 8000) where the UI must not hang — the call
 *        resolves with the best fix seen so far, or null, never later than this.
 * @param {AbortSignal} [opts.signal] abort when the screen that asked is left:
 *        the GPS watch is cleared at once and the call resolves with the best
 *        fix so far (or null). Without this the phone kept searching for a
 *        fix after the student had already navigated away.
 */
export async function getLocationFast({ allowCached = true, timeoutMs = 18_000, signal = null } = {}) {
  if (typeof window === "undefined" || !("geolocation" in navigator)) return null;
  if (signal?.aborted) return cache || (allowCached ? loadPersisted() : null);

  // 1) Warm in-memory cache
  if (cache && Date.now() - cache.at < WARM_TTL_MS) return cache;

  // 2) Persisted session cache (survives tab switches)
  const persisted = loadPersisted();
  if (allowCached && persisted && Date.now() - persisted.at < WARM_TTL_MS) {
    return persisted;
  }

  const cap = Math.max(1_000, Number(timeoutMs) || 18_000);
  // Leave a slice of the budget for the final one-shot attempt
  const oneShotMs = Math.min(6_000, Math.max(800, Math.round(cap * 0.3)));
  const watchMs = Math.max(500, cap - oneShotMs);

  // 3) watchPosition — resolves on FIRST fix (the key cold-start fix)
  return new Promise((resolve) => {
    let settled = false;
    let best = null;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      try {
        navigator.geolocation.clearWatch(id);
      } catch {
        /* ignore */
      }
      clearTimeout(timer);
      signal?.removeEventListener?.("abort", onAbort);
      if (value) {
        cache = value;
        persist(value);
      }
      resolve(value);
    };
    const onAbort = () => finish(best);
    signal?.addEventListener?.("abort", onAbort, { once: true });

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const entry = toEntry(pos);
        if (entry) {
          best = bestFix(best, entry);
          // Accept almost immediately if location is fresh & reasonably accurate
          if (entry.accuracy != null && entry.accuracy <= 80) {
            finish(entry);
          }
        }
      },
      (err) => {
        // Permission/system error → fall back to stale cache rather than failing
        const fallback = cache || (allowCached ? loadPersisted() : null);
        if (fallback) return finish(fallback);
        finish(null);
      },
      { enableHighAccuracy: true, timeout: cap, maximumAge: 0 }
    );

    // Hard timeout — resolve with the best fix seen so far
    const timer = setTimeout(() => {
      if (best) return finish(best);
      // Final one-shot attempt before giving up (some browsers only resolve here)
      const guard = setTimeout(() => finish(best), oneShotMs + 250);
      try {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(guard);
            const entry = toEntry(pos);
            finish(bestFix(best, entry));
          },
          () => {
            clearTimeout(guard);
            finish(best);
          },
          { enableHighAccuracy: true, timeout: oneShotMs, maximumAge: 30_000 }
        );
      } catch {
        clearTimeout(guard);
        finish(best);
      }
    }, watchMs);
  });
}

/** Human <small> — clears warm caches (call after a successful fresh fix). */
export const clearLocationCache = () => {
  cache = null;
  try {
    sessionStorage.removeItem("attendx_last_gps");
  } catch {
    /* ignore */
  }
};

/** Summarise location for UI labels. */
export function locationToText(entry) {
  if (!entry) return "";
  const la = Number(entry.latitude);
  const lo = Number(entry.longitude);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return "";
  const acc =
    entry.accuracy != null ? ` ±${Math.round(entry.accuracy)}m` : "";
  return `${la.toFixed(6)}, ${lo.toFixed(6)}${acc}`;
}
