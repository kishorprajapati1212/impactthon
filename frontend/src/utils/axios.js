import axios from "axios";

/**
 * Resolve API base URL for:
 *  - local:     http://localhost:3000
 *  - Docker:    VITE_API_URL at build time
 *  - Project IDX / Cloud Workstations:
 *      browser host like  5173-xxxxx.cloudworkstations.dev
 *      API becomes        3000-xxxxx.cloudworkstations.dev
 */
function resolveApiBase() {
  const envUrl = import.meta.env.VITE_API_URL;
  // Explicit env wins only if not the plain localhost default while on IDX host
  if (typeof window !== "undefined") {
    const host = window.location.hostname || "";
    const proto = window.location.protocol || "https:";

    const isIdxHost =
      host.includes("cloudworkstations.dev") ||
      host.includes("workstations.google") ||
      host.includes(".idx.") ||
      /^(\d+)-/.test(host); // e.g. 5173-firebase-xxx...

    if (isIdxHost) {
      // Replace leading port prefix: 5173-foo → 3000-foo
      let apiHost = host.replace(/^5173-/, "3000-");
      // Some layouts use host without port prefix — keep host, change nothing if already 3000-
      if (apiHost === host && !host.startsWith("3000-")) {
        // Fallback: same hostname, user should set VITE_API_URL to Ports URL for 3000
        if (envUrl && !envUrl.includes("localhost")) return envUrl.replace(/\/$/, "");
      }
      return `${proto}//${apiHost}`.replace(/\/$/, "");
    }
  }

  if (envUrl) return String(envUrl).replace(/\/$/, "");
  return "http://localhost:3000";
}

const BASE = resolveApiBase();

if (typeof window !== "undefined") {
  // Visible in browser console — full clickable-style absolute API URL
  console.info("[AttendX] API base URL →", BASE);
  console.info("[AttendX] Frontend URL →", window.location.origin);
}

const axiosInstance = axios.create({
  baseURL: BASE,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// ── Attach JWT token + device id to every request ──────────────────────
axiosInstance.interceptors.request.use(
  (config) => {
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
export { resolveApiBase };
