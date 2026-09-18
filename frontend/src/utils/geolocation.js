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
 * Warm up GPS in the background (non-blocking). Call on student dashboard
 * mount right after login so the first scan resolves instantly.
 */
export function prewarmLocation() {
  if (typeof window === "undefined" || !("geolocation" in navigator)) return;
  try {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const entry = toEntry(pos);
        if (entry) {
          cache = entry;
          persist(entry);
        }
      },
      () => {
        /* ignore */
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 }
    );
  } catch {
    /* ignore */
  }
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

/**
 * Get the best available location fast.
 * Returns { latitude, longitude, accuracy } or null.
 */
export async function getLocationFast({ allowCached = true } = {}) {
  if (typeof window === "undefined" || !("geolocation" in navigator)) return null;

  // 1) Warm in-memory cache
  if (cache && Date.now() - cache.at < WARM_TTL_MS) return cache;

  // 2) Persisted session cache (survives tab switches)
  const persisted = loadPersisted();
  if (allowCached && persisted && Date.now() - persisted.at < WARM_TTL_MS) {
    return persisted;
  }

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
      if (value) {
        cache = value;
        persist(value);
      }
      resolve(value);
    };

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
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 }
    );

    // Hard timeout — resolve with the best fix seen so far
    const timer = setTimeout(() => {
      // Final one-shot attempt before giving up (some browsers only resolve here)
      try {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const entry = toEntry(pos);
            finish(bestFix(best, entry));
          },
          () => {
            finish(best);
          },
          { enableHighAccuracy: true, timeout: 6_000, maximumAge: 30_000 }
        );
      } catch {
        finish(best);
      }
    }, 18_000);
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
