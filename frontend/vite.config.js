import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    cors: true,
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      // secrets.js-grempe does require("crypto"); the browser-native
      // crypto.getRandomValues path is all it needs — avoid the heavy
      // crypto-browserify chain (readable-stream/process) that breaks in-browser.
      crypto: path.resolve(__dirname, 'src/lib/crypto-shim.js'),
    },
  },
  optimizeDeps: {
    include: ['secrets.js-grempe'],
  },
});
