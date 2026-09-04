import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const BACKEND = 'http://127.0.0.1:8000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true, ws: true },
      '/ws': { target: BACKEND, changeOrigin: true, ws: true },
    },
  },
  build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 1200 },
});
