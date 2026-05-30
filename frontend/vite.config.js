import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    cors: true,
  },
  define: {
    global: 'globalThis',
    'process.env': '{}',
  },
  resolve: {
    alias: {
      // Polyfill Node.js modules for secrets.js-grempe in the browser
      crypto: 'crypto-browserify',
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    include: ['secrets.js-grempe'],
    esbuildOptions: {
      define: { global: 'globalThis' },
    },
  },
});
