/**
 * ── In-process response cache (with optional Redis layer) ─────────────
 *
 * Fellows like dashboards, analytics, and filter lists run heavy Mongo
 * queries for the SAME data on every page load. This caches those
 * responses for a short TTL so the app feels instant, while invalidation
 * hooks refresh things right after a lecture starts/ends or a student marks.
 *
 * - Memory cache is ALWAYS on (works with zero infra).
 * - Redis (optional) is charged via config/redis.js if REDIS_URL is set,
 *   for multi-instance deployments.
 *
 * Keys are namespaced with a prefix ("faculty:", "student:", "report:")
 * so callers can invalidate whole groups cheaply.
 */

const __buckets = new Map(); // key -> { value, expiresAt }

function now() {
  return Date.now();
}

/** Store a value (JSON-serialisable) under key for ttl seconds. */
export async function cacheSet(key, value, ttl = 30) {
  if (key == null) return;
  const sec = Math.max(1, Number(ttl) || 30);
  try {
    __buckets.set(String(key), { value, expiresAt: now() + sec * 1000 });
  } catch {
    /* ignore */
  }

  // Best-effort Redis mirror (graceful no-op when Redis is absent)
  try {
    const { cacheSet: redisSet } = await import("../config/redis.js");
    await redisSet("axcache:" + key, value, sec);
  } catch {
    /* ignore */
  }
}

/** Read a cached value if fresh, otherwise null. */
export async function cacheGet(key) {
  if (key == null) return null;
  try {
    const hit = __buckets.get(String(key));
    if (hit && hit.expiresAt > now()) return hit.value;
    if (hit) __buckets.delete(String(key));
  } catch {
    /* ignore */
  }

  // Fall through to Redis if memory missed
  try {
    const { cacheGet: redisGet } = await import("../config/redis.js");
    const v = await redisGet("axcache:" + key);
    if (v !== null && v !== undefined) {
      __buckets.set(String(key), { value: v, expiresAt: now() + 30_000 });
      return v;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Drop every key starting with `prefix`. */
export function invalidatePrefix(prefix = "") {
  const p = String(prefix);
  try {
    for (const key of [...__buckets.keys()]) {
      if (!p || key.startsWith(p)) __buckets.delete(key);
    }
  } catch {
    /* ignore */
  }
}

/** Drop everything. */
export const invalidateAll = () => invalidatePrefix("");

export default { cacheGet, cacheSet, invalidatePrefix, invalidateAll };
