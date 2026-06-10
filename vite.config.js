import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ── Custom Rollup plugin to strip console.log (keep error/warn) ─────────────
function stripConsoleLog() {
  return {
    name: 'strip-console-log',
    transform(code, id) {
      // Only process JS/TS files, skip node_modules
      if (!/\.[jt]sx?$/.test(id) || id.includes('node_modules')) return null;
      if (!code.includes('console.log')) return null;

      // Conservative regex: only strip simple console.log calls with string/simple args
      // This avoids accidentally breaking code with nested parens or complex expressions
      const lines = code.split('\n');
      const filtered = lines.filter(line => {
        const trimmed = line.trim();
        // Remove lines that are purely console.log statements
        return !(/^console\.log\s*\(.*\);?\s*$/.test(trimmed));
      });

      const newCode = filtered.join('\n');
      if (newCode !== code) {
        return { code: newCode, map: null };
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    stripConsoleLog(),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Raise warning threshold — we know admin is large, warning is noise
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // ── React core — loaded by everyone, cache forever ──────────────────
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }

          // ── Firebase — split into sub-packages so only what's used loads ───
          if (id.includes('node_modules/firebase/auth') ||
              id.includes('node_modules/@firebase/auth')) {
            return 'firebase-auth';
          }
          if (id.includes('node_modules/firebase/firestore') ||
              id.includes('node_modules/@firebase/firestore')) {
            return 'firebase-firestore';
          }
          if (id.includes('node_modules/firebase/storage') ||
              id.includes('node_modules/@firebase/storage')) {
            return 'firebase-storage';
          }
          if (id.includes('node_modules/firebase/functions') ||
              id.includes('node_modules/@firebase/functions')) {
            return 'firebase-functions';
          }
          if (id.includes('node_modules/firebase') ||
              id.includes('node_modules/@firebase')) {
            return 'firebase-core';
          }

          // ── Payment — only needed on portal/checkout pages ──────────────────
          if (id.includes('node_modules/react-paystack')) {
            return 'vendor-payment';
          }

          // ── Animation — framer-motion, only load when needed ────────────────
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-motion';
          }

          // ── Charts — only on admin dashboard ────────────────────────────────
          if (id.includes('node_modules/recharts') ||
              id.includes('node_modules/d3-')) {
            return 'vendor-charts';
          }

          // ── Icons — lucide is large, isolate it ─────────────────────────────
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }

          // ── PDF / jsPDF ──────────────────────────────────────────────────────
          if (id.includes('node_modules/jspdf') ||
              id.includes('node_modules/html2canvas')) {
            return 'vendor-pdf';
          }

          // ── Everything else in node_modules ─────────────────────────────────
          if (id.includes('node_modules/')) {
            return 'vendor-misc';
          }
        },
      },
    },
  },
  // Speed up dev server
  optimizeDeps: {
    include: ['react', 'react-dom', 'firebase/app', 'firebase/auth', 'firebase/firestore'],
  },
})
