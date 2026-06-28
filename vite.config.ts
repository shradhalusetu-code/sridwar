import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      // ── Code splitting: splits JS into smaller chunks so the browser
      //    only loads what it needs on the first screen ──
      rollupOptions: {
        output: {
          manualChunks: {
            // Core React — loaded first, cached aggressively
            vendor: ['react', 'react-dom'],
            // Lucide icons — large library, loaded separately
            lucide: ['lucide-react'],
          },
        },
      },
      // ── Reduce chunk size warnings threshold ──
      chunkSizeWarningLimit: 600,
    },
  };
});
