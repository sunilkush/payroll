import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
