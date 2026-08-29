import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      },
      '/book': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      },
      '/queue': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      },
      '/next': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      },
      '/update-status': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      }
    }
  }
});
