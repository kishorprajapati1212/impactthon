import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Project IDX / Cloud Workstations need host 0.0.0.0 + open HMR.
// Full Ctrl+click preview URLs are shown in the IDX **Ports** panel
// (not always printed as https://… in the terminal).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const onIdx =
    Boolean(env.IDX_CHANNEL) ||
    Boolean(process.env.IDX_CHANNEL) ||
    Boolean(process.env.WEB_HOST) ||
    /cloudworkstations|workstations/i.test(process.env.HOSTNAME || '');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: '0.0.0.0',
      strictPort: true,
      cors: true,
      allowedHosts: true,
      // On IDX, browser reaches Vite via https proxy on 443
      hmr: onIdx
        ? { clientPort: 443, protocol: 'wss' }
        : { clientPort: 5173 },
    },
    preview: {
      port: 5173,
      host: '0.0.0.0',
      allowedHosts: true,
    },
  };
});
