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

  /*
    NOTE: We intentionally do NOT inject any global touch-action /
    backdrop-blur / overflow-y-auto CSS overrides here.

    A previous version of this file injected `transform: translateZ(0)`
    on every backdrop-blur element and `touch-action: pan-y !important`
    on `*`. That combination promotes blur overlays to their own GPU
    compositing layer AND forces a single global touch-action, which is
    precisely what silently swallows touch/scroll events on Capacitor's
    Android WebView — the modal freezes and bottom buttons become
    unreachable. index.css documents this same finding (see the
    "REMOVED" block there) and already applies the correct, narrowly
    scoped fix via `[id$="-modal"]` / `[id$="-portal"]` selectors.
    Do not re-add a global override here.
  */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);