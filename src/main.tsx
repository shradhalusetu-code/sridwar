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
 *
 * ── ROUTING FIX ──────────────────────────────────────────────────────────
 * This MUST include window.location.hash. Devotees land here from every
 * "Continue" button on the static SEO pages in /public (puja.html,
 * seva.html, bazaar.html, darshan.html, about/index.html, contact/index.html,
 * founder-story/index.html, priests/index.html) via links like "/#puja",
 * "/#seva", "/#products", "/#live-darshan", etc. Those pages intentionally
 * link to a hash instead of a clean path (see the comment above the
 * "Hash-based deep link" block in App.tsx for why).
 *
 * pushState() fully replaces the current URL with whatever string you pass
 * it. The previous version of this trap pushed only
 * `window.location.pathname + window.location.search`, which OMITS the
 * hash — so the very first thing that happened on every page load was the
 * "#puja"/"#seva"/"#products"/"#live-darshan"/"#about"/etc. fragment being
 * silently erased from the address bar, synchronously, before React even
 * mounted. By the time App.tsx's deep-link useEffect ran and checked
 * window.location.hash to decide which section to open, the hash was
 * already gone and it always fell through to Home. This is why every
 * redirect button on the static /public pages appeared to do nothing (or
 * bounced back to Home) instead of opening Seva, Puja, Bazaar, Darshan,
 * etc. Keeping the hash here fixes it for every page at once.
 */
if (typeof window !== 'undefined' && window.history && window.history.pushState) {
  window.history.pushState(
    { sdTrap: true },
    '',
    window.location.pathname + window.location.search + window.location.hash
  );
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