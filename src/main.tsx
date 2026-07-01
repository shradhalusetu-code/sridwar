import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

/*
 * ── Back-button trap ────────────────────────────────────────────────────────
 * Push a sentinel history entry SYNCHRONOUSLY — before React even mounts —
 * so the trap is in place from the very first millisecond the page is alive.
 * The App.tsx popstate handler then decides whether to go Home or let through.
 * Doing this here (module-level) avoids the React useEffect timing gap.
 */
if (typeof window !== 'undefined' && window.history && window.history.pushState) {
  window.history.pushState({ sdTrap: true }, '', window.location.pathname + window.location.search);
}

/*
 * Detect if we are running inside the Capacitor Android app.
 * window.Capacitor is ONLY present inside the APK — it does not exist
 * on GitHub Pages or any regular browser. This code will NEVER run
 * on your website. It is 100% safe for your deployed domain.
 */
if (
  typeof window !== 'undefined' &&
  (window as any).Capacitor &&
  (window as any).Capacitor.getPlatform() === 'android'
) {
  document.body.classList.add('capacitor-android');

  // Inject scroll fix styles directly into the page.
  // This bypasses the build tool stripping out -webkit- prefixes.
  const style = document.createElement('style');
  style.textContent = `
    /* Fix backdrop-blur elements stealing touch/scroll events */
    .backdrop-blur, .backdrop-blur-sm, .backdrop-blur-md,
    .backdrop-blur-lg, .backdrop-blur-xl, .backdrop-blur-2xl {
      -webkit-backface-visibility: hidden !important;
      backface-visibility: hidden !important;
      -webkit-transform: translateZ(0) !important;
      transform: translateZ(0) !important;
      touch-action: pan-y !important;
      will-change: transform !important;
    }

    /* Fix scrollable inner boxes intercepting finger swipes */
    .overflow-y-auto, .overflow-y-scroll {
      overscroll-behavior: contain !important;
      touch-action: pan-y !important;
      -webkit-overflow-scrolling: touch !important;
    }

    /* Global scroll passthrough safety net */
    * {
      touch-action: pan-y !important;
    }
  `;
  document.head.appendChild(style);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);