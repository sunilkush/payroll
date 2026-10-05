import { defineConfig } from 'vite';
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
    maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
    // Page refresh / seedha URL par index.html; /api ko service worker kabhi nahi chhuta
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/api\//],
    cleanupOutdatedCaches: true,
  },
});

export default defineConfig({
  plugins: [react(), pwa],
  server: {
    port: 5173,
    // Dev mein /api calls backend par jaati hain, isliye CORS ki dikkat nahi aati.
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
  build: {
    // Ant Design badi library hai. Use alag file mein rakhne se hamara code badalne par
    // users ko sirf chhoti app file dobara download karni padti hai, library cache se aati hai.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return 'react';
          }
          // Charts (dashboard) aur maps (settings / punch) alag: jo page inhe use nahi karta
          // uske liye ye cache se bahar bhi rahein to app ki baaki files chhoti rehti hain.
          if (/[\\/]node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor|internmap|decimal\.js-light|es-toolkit|immer|reselect|redux|@reduxjs)[\\/]/.test(id)) {
            return 'charts';
          }
          if (/[\\/]node_modules[\\/]leaflet[\\/]/.test(id)) return 'maps';
          return 'vendor'; // antd, icons, dayjs, axios
        },
      },
    },
  },
});
