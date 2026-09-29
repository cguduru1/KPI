import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Creates an absolute shortcut straight to your source directory
      '@': path.resolve(__dirname, './src'), 
    },
  },
  optimizeDeps: {
    include: [
      'chart.js',
      'react-chartjs-2',
      'pdfkit',
      'blob-stream'
    ]
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      // Forward all API calls to your backend server
      '/api': {
        target: 'http://localhost:4000', // backend Express server
        changeOrigin: true,
        secure: false
      }
    }
  }
});


