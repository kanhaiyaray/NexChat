import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  css: {
    postcss: false, // Disable PostCSS to fix build error
  },
  build: {
    chunkSizeWarningLimit: 1000, // ✅ Warning hatao (1000KB limit)
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          clerk: ['@clerk/clerk-react'],
          recharts: ['recharts'],
          socket: ['socket.io-client'],
        }
      }
    }
  }
});