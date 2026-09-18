import axiosInstance from "./axios.js";

/**
 * Lightweight response cache (SWR-style) layered on top of axiosInstance.
 *
 * - GET requests are deduped and cached for a short TTL so dashboards,
 *   history and analytics feel instant instead of hammering the API on
 *   every tab switch.
 * - Any write (POST/PUT/DELETE) invalidates the GET cache so data stays
 *   fresh without any manual wiring.
 */

const inFlight = new Map();
const store = new Map();

const TTL_MS = {
  default: 20_000,
  report: 20_000,
  analytics: 120_000,
  filters: 120_000,
};

function ttlFor(method, url) {
  if (method !== "get") return 0;
  if (/analytics|admin/.test(url)) return TTL_MS.analytics;
  if (/filters/.test(url)) return TTL_MS.filters;
  if (/report|dashboard|history/.test(url)) return TTL_MS.report;
  return TTL_MS.default;
}

export function clearApiCache(prefix = "") {
  try {
    for (const key of [...store.keys()]) {
      if (!prefix || key.startsWith(prefix)) store.delete(key);
    }
  } catch {
    /* ignore */
  }
}

function write(method, url, data, config = {}) {
  // Any mutation busts the whole GET cache (simple & always-correct).
  clearApiCache();
  return axiosInstance.request({ ...config, method, url, data });
}

async function cachedGet(url, config = {}) {
  const cacheKey = `get:${url}:${JSON.stringify(config?.params || {})}`;

  // Dedupe identical requests in flight
  if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);

  const hit = store.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) {
    return Promise.resolve(hit.data);
  }

  const p = axiosInstance
    .request({ ...config, method: "get", url })
    .then((res) => {
      // Don't cache blobs or error payloads
      if (res.status === 200 && !(res.data instanceof Blob)) {
        store.set(cacheKey, {
          data: res,
          expiresAt: Date.now() + ttlFor("get", url),
        });
      }
      return res;
    })
    .finally(() => {
      inFlight.delete(cacheKey);
    });

  inFlight.set(cacheKey, p);
  return p;
}

const api = {
  get: (url, config = {}) => cachedGet(url, config),
  post: (url, data, config = {}) => write("post", url, data, config),
  put: (url, data, config = {}) => write("put", url, data, config),
  delete: (url, config = {}) => write("delete", url, undefined, config),
};

export default api;
