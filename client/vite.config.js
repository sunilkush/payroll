import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// PWA: app phone / desktop par install ho sakta hai aur uska dhancha (HTML, JS, CSS) offline bhi
// khulta hai. API ka data jaan-boojhkar cache NAHI hota: salary / attendance hamesha server se
// taaza aani chahiye, aur punch ke liye network zaroori hai.
const pwa = VitePWA({
  registerType: 'autoUpdate', // naya build aate hi agli baar khulne par apne aap update
  includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
  manifest: {
    name: 'PayRoster',
    short_name: 'PayRoster',
    description: 'Attendance, leave and payroll for your company.',
    lang: 'en',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    theme_color: '#4f46e5',
    background_color: '#f6f7f9',
    icons: [
      { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
    // Landing page ke bade screenshot app ke offline cache mein nahi: login hue user ko inki zaroorat nahi.
    globIgnores: ['**/landing-*.png'],
    maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
    // Page refresh / seedha URL par index.html; /api ko service worker kabhi nahi chhuta
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/api\//],
    cleanupOutdatedCaches: true,
  },
});

export default defineConfig(({ mode }) => {
  // Dev server ki settings client/.env se (dekho .env.example); na likho to default.
  const env = loadEnv(mode, process.cwd(), '');
  const devPort = Number(env.VITE_DEV_PORT) || 5173;
  const apiTarget = env.VITE_DEV_API_TARGET || 'http://localhost:5000';

  // Vercel par sirf frontend hota hai; backend ka URL na diya ho to har API call Vercel par hi jati
  // aur app chupchaap kaam nahi karta. Isliye build yahin rok do, saaf message ke saath.
  if (env.VERCEL && !/^https?:\/\//.test(env.VITE_API_URL || '')) {
    throw new Error(
      'VITE_API_URL is not set. In Vercel > Settings > Environment Variables add VITE_API_URL with your backend URL (e.g. https://your-api.onrender.com) and redeploy.'
    );
  }

  return {
  plugins: [react(), pwa],
  server: {
    port: devPort,
    // Dev mein /api calls backend par jaati hain, isliye CORS ki dikkat nahi aati.
    proxy: {
      '/api': apiTarget,
    },
  },
  build: {
    // Modern browsers: chhota output (arrow functions, optional chaining bina polyfill).
    target: 'es2020',
    // Har lazy-loaded page ka CSS alag: pehle page ke saath hi aata hai, baaki nahi.
    cssCodeSplit: true,
    // Ant Design badi library hai. Use alag file mein rakhne se hamara code badalne par
    // users ko sirf chhoti app file dobara download karni padti hai, library cache se aati hai.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[/\\]node_modules[/\\](react|react-dom|react-router|react-router-dom|scheduler)[/\\]/.test(id)) {
            return 'react';
          }
          // Charts (dashboard) aur maps (settings / punch) alag: jo page inhe use nahi karta
          // uske liye ye cache se bahar bhi rahein to app ki baaki files chhoti rehti hain.
          if (/[/\\]node_modules[/\\](recharts|d3-[^/\\]+|victory-vendor|internmap|decimal\.js-light|es-toolkit|immer|reselect|redux|@reduxjs)[/\\]/.test(id)) {
            return 'charts';
          }
          if (/[/\\]node_modules[/\\]leaflet[/\\]/.test(id)) return 'maps';
          // Ant Design icons bade hain (~500KB+), alag rakhne se vendor chunk chhota rehta hai.
          if (/[/\\]node_modules[/\\]@ant-design[/\\]icons[/\\]/.test(id)) return 'antd-icons';
          // QR scanner/generator sirf specific pages mein lagta hai
          if (/[/\\]node_modules[/\\](qr-scanner|qrcode)[/\\]/.test(id)) return 'qr';
          return 'vendor'; // antd, dayjs, axios
        },
      },
    },
  },
  };
});
