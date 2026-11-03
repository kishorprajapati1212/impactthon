import axios from "axios";

/**
 * Where the browser sends API calls.
 *
 *  Default - SAME ORIGIN, path prefix `/api`:
 *    the page at https://host/… calls https://host/api/students and the
 *    server that served the page forwards it to the API:
 *      • `npm run dev` / `vite preview` → Vite proxy (vite.config.js)
 *      • Docker                        → nginx `location /api/` (nginx.conf)
 *    No cross-origin request is ever made, so there is nothing for CORS or a
 *    cloud IDE's per-port auth proxy (Project IDX / Firebase Studio, Codespaces)
 *    to block.
 *
 *  Override - `VITE_API_URL=https://api.example.com` at build time when the API
 *    is deliberately hosted somewhere else (then the API must allow that origin).
 */
export function resolveApiBase() {
  const envUrl = String(import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");
  return envUrl || "/api";
}

const BASE = resolveApiBase();

/**
 * The server exposes every route both at the root and under /api, and its own
 * report/leave/device/audit routes already start with /api/. When the base is
 * the `/api` prefix, strip a leading `/api` from such paths so the browser asks
 * for `/api/report/…` instead of `/api/api/report/…` (both work; one is tidy).
 */
export function joinApiPath(base, url = "") {
  if (/\/api$/.test(base) && /^\/api(\/|$)/.test(url)) return url.replace(/^\/api/, "") || "/";
  return url;
}

if (typeof window !== "undefined") {
  console.info("[AttendX] API base →", BASE === "/api" ? `${window.location.origin}/api (same origin)` : BASE);
}

const axiosInstance = axios.create({
  baseURL: BASE,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// ── Attach JWT token + device id to every request ──────────────────────
axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof config.url === "string" && !/^https?:\/\//i.test(config.url)) {
      config.url = joinApiPath(BASE, config.url);
    }
    try {
      const stored = JSON.parse(localStorage.getItem("attendx_user") || "{}");
      if (stored.token) {
        config.headers.Authorization = `Bearer ${stored.token}`;
      }
    } catch {
      // ignore
    }
    try {
      const deviceId = localStorage.getItem("attendx_device_id");
      if (deviceId) config.headers["X-Device-Id"] = deviceId;
    } catch {
      // ignore
    }
    return config;
  },
  (err) => Promise.reject(err)
);

// ── Handle 401 globally ────────────────────────────────────────────────
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginPage = window.location.pathname === "/login";
    const isRegisterPage = window.location.pathname === "/register";
    const code = error.response?.data?.code;

    if (error.response?.status === 401 && !isLoginPage && !isRegisterPage) {
      // Preserve the server's reason so the login screen can explain it
      try {
        sessionStorage.setItem(
          "attendx_interrupt",
          JSON.stringify({
            code: code || "SESSION_EXPIRED",
            message:
              error.response?.data?.message ||
              "Your session ended. Please login again.",
            at: Date.now(),
          })
        );
      } catch {
        /* ignore */
      }
      localStorage.removeItem("attendx_user");
      window.location.href = "/login";
      return new Promise(() => {}); // halt promise chain; page is navigating
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
