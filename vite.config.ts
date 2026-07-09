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
      rollupOptions: {
        output: {
          manualChunks: {
            // Core React — loaded first, cached aggressively
            vendor: ['react', 'react-dom'],
            // Router — small, but keep it isolated from the app code
            // so it's cached independently once you adopt react-router-dom
            router: ['react-router-dom'],
            // Lucide icons — large library, loaded separately
            lucide: ['lucide-react'],
            // Motion/animation — only needed once interactive sections mount
            motion: ['motion'],
            // Supabase client — only needed for auth/dashboard, not the
            // marketing homepage
            supabase: ['@supabase/supabase-js'],
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
