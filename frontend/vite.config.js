import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// vite config for satyaraksha frontend
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    cors: true,
  },
  define: {
    // some libraries expect "global" to exist (its a node thing)
    global: 'globalThis',
  },
  resolve: {
    alias: {
      // secrets.js-grempe does require("crypto") internally
      // but in the browser we dont need the full crypto-browserify package
      // this shim just provides getRandomValues which is all it actually uses
      crypto: path.resolve(__dirname, 'src/lib/crypto-shim.js'),
    },
  },
  optimizeDeps: {
    // pre-bundle secrets.js so it works properly in the browser
    include: ['secrets.js-grempe'],
  },
});
