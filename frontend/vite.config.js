import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Dev server notes
 *  • API calls are SAME ORIGIN: the app requests `/api/...` and this server
 *    proxies them to the API (default http://127.0.0.1:3000). That is why there
 *    is no CORS to configure - locally, in Docker (nginx does the same job) and
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
      // keep the /api prefix - the API serves every route under /api as well
    },
  };

  // Absolute canonical / Open Graph URLs in index.html (Google wants absolute
  // URLs). SITE_URL=https://your-domain overrides; Netlify's own URL variable
  // is used automatically; otherwise the current Netlify site.
  const siteUrl = (process.env.SITE_URL || env.SITE_URL || env.VITE_SITE_URL || process.env.URL || 'https://attendex12345.netlify.app').replace(/\/+$/, '');
  const seoHtml = { name: 'attendx-seo-urls', transformIndexHtml: { order: 'pre', handler: (html) => html.split('__SITE_URL__').join(siteUrl) } };

  return {
    plugins: [react(), seoHtml],
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
