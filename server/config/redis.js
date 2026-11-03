/**
 * Redis Cache Layer  (Optional — graceful fallback if no Redis)
 * ===============================================================
 * Caches frequently-hit MongoDB queries to support 2K+ RPS.
 * If REDIS_URL is empty, all operations silently no-op.
 */

let redis = null;

const getRedis = async () => {
  if (redis !== null) return redis;
  if (!process.env.REDIS_URL) { redis = false; return null; }
  try {
    const { default: Redis } = await import('ioredis');
    const client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: (t) => (t > 3 ? null : Math.min(t * 200, 2000)),
      lazyConnect: true,
    });
    await client.connect();
    redis = client;
    console.log('✅ Redis connected');
    return client;
  } catch (err) {
    console.warn('⚠️ Redis unavailable — running without cache:', err.message);
    redis = false;
    return null;
  }
};

export const cacheGet = async (key) => {
  try { const c = await getRedis(); if (!c) return null; const v = await c.get(key); return v ? JSON.parse(v) : null; } catch { return null; }
};

export const cacheSet = async (key, value, ttl = 300) => {
  try { const c = await getRedis(); if (!c) return; await c.set(key, JSON.stringify(value), 'EX', ttl); } catch {}
};

export const withCache = async (key, ttl, fetchFn) => {
  const cached = await cacheGet(key);
  if (cached !== null) return cached;
  const data = await fetchFn();
  if (data !== null && data !== undefined) await cacheSet(key, data, ttl);
  return data;
};

export default getRedis;
