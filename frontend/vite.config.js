import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Dev server notes
 *  • API calls are SAME ORIGIN: the app requests `/api/...` and this server
 *    proxies them to the API (default http://127.0.0.1:3000). That is why there
 *    is no CORS to configure — locally, in Docker (nginx does the same job) and
 *    on Project IDX / Firebase Studio, where the browser only ever opens the
 *    5173 preview URL.
 *  • `API_PROXY_TARGET=http://127.0.0.1:4000 npm run dev` if the API runs elsewhere.
 *  • Cloud IDEs reach Vite through an https proxy on 443 → HMR must use wss/443.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const onIdx =
    Boolean(env.IDX_CHANNEL) ||
    Boolean(process.env.IDX_CHANNEL) ||
    Boolean(process.env.WEB_HOST) ||
    Boolean(process.env.MONOSPACE_ENV) ||
    /cloudworkstations|workstations/i.test(process.env.HOSTNAME || '');

  const apiTarget = (process.env.API_PROXY_TARGET || env.API_PROXY_TARGET || 'http://127.0.0.1:3000').replace(/\/+$/, '');
  const proxy = {
    '/api': {
      target: apiTarget,
      changeOrigin: true,
      // keep the /api prefix — the API serves every route under /api as well
    },
  };

  return {
    plugins: [react()],
    // Visible in the login page, the admin sidebar and the console so a stale build is obvious
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    server: {
      port: 5173,
      host: '0.0.0.0',
      strictPort: true,
      cors: true,
      allowedHosts: true,
      proxy,
      // On IDX, browser reaches Vite via https proxy on 443
      hmr: onIdx
        ? { clientPort: 443, protocol: 'wss' }
        : { clientPort: 5173 },
    },
    preview: {
      port: 5173,
      host: '0.0.0.0',
      allowedHosts: true,
      proxy,
    },
  };
});
