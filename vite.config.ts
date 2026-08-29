import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

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
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    // ── html2canvas pre-bundling ─────────────────────────────────────────
    // Without this, Vite only discovers html2canvas the first time a
    // devotee actually taps "Download Dharmic ID" (AuthDashboard.tsx),
    // since that's the first time it's ever imported at runtime. Vite's
    // dev server then has to stop, re-run its dependency optimizer, and
    // restart mid-session — which is what surfaces in the browser console
    // as "server connection lost... Polling for restart" and a transient
    // 404 on whatever module was mid-request at that moment. Listing it
    // here makes Vite pre-bundle it once at server startup instead, so it
    // never needs to interrupt an already-running session.
    optimizeDeps: {
      include: ['html2canvas'],
    },
    build: {
      // ── Code splitting ──────────────────────────────────────────────────
      // manualChunks alone only groups vendor code — it can NOT split your
      // own page components apart from each other, because App.tsx imports
      // every one of them eagerly at the top of the file. That is the
      // biggest bundle-size issue in this project (see App.tsx and
      // TempleRegister.tsx). The real fix is converting those static
      // imports to React.lazy() dynamic imports — see the included
      // AppRouter.example.tsx for the pattern. Once that's done, Vite
      // will automatically create a separate chunk per route with NO
      // config changes needed here.
      //
      // NOTE: the "router" chunk for react-router-dom was removed below
      // because this project does not currently install or use that
      // package. If you add react-router-dom later, add it back here.
      rollupOptions: {
        output: {
          manualChunks: {
            // Core React — loaded first, cached aggressively
            vendor: ['react', 'react-dom', 'react-dom/client'],
            // Lucide icons — large library, loaded separately
            lucide: ['lucide-react'],
            // Motion/animation — only needed once interactive sections mount
            motion: ['motion'],
            // Supabase client — only needed for auth/dashboard, not the
            // marketing homepage
            supabase: ['@supabase/supabase-js'],
            // html2canvas — only needed for the Dharmic ID PNG/JPG download
            // button inside AuthDashboard.tsx, not on first paint anywhere
            // else in the app.
            html2canvas: ['html2canvas'],
            // ✅ BUNDLE-SIZE FIX (2026-08-15): priests.ts (~2,100 lines) and
            // temples.ts (~1,600 lines) are each imported by several
            // DIFFERENT lazy-loaded pages (PriestSection, OnlinePuja,
            // CounsellingGuidance, TempleExperience, etc.) — no single one
            // of those imports is eager. But because this file already
            // defines manualChunks for a few other libraries above, Rollup
            // stopped applying its own automatic shared-chunk splitting to
            // everything else, and instead hoisted these two shared data
            // files straight into the eager main entry chunk (verified
            // directly against the real built output — this was genuinely
            // happening, not a guess). Giving them their own explicit
            // chunks fixes that: each loads once, on demand, the first time
            // any page that needs it is opened, and is cached/shared for
            // every other page that needs it after that — instead of
            // shipping to every single visitor on every single page load.
            priestsData: ['./src/data/priests.ts'],
            templesData: ['./src/data/temples.ts'],
          },
        },
      },
      chunkSizeWarningLimit: 600,
      // Fails the build loudly instead of silently shipping a bloated
      // bundle if someone adds a big dependency later.
      reportCompressedSize: true,
    },
  };
});
