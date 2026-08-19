/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CookieConsent.tsx — Sri Dwar tracking-consent banner.
 *
 * Why this exists: index.html loads Google Tag Manager, Google Analytics
 * (gtag.js), and Microsoft Clarity (session-replay/heatmap recording) —
 * but it now only loads them after this banner is accepted (see the
 * `loadSriDwarTrackers()` gate added to index.html). Before this component
 * existed, those trackers fired unconditionally on every page load with no
 * way for a devotee to decline, even though a Cookie Policy page already
 * described them. This banner is what makes that policy actually true.
 *
 * Behaviour:
 *  - Shows once, low down on screen, on first visit (no stored choice yet).
 *  - "Accept" -> stores the choice, calls window.__sridwarLoadTrackers()
 *    (defined in index.html) to start GTM/GA4/Clarity, hides the banner.
 *  - "Decline" -> stores the choice, does NOT load any tracker, hides the
 *    banner. No tracking script is ever fetched for a devotee who declines.
 *  - The X (close) icon just hides the banner for this page load WITHOUT
 *    storing any choice — the devotee is asked again on their next visit,
 *    same as if they'd never seen it. It intentionally does NOT behave
 *    like "Decline": most people tap an X to dismiss, not to make a
 *    deliberate privacy choice, and treating the two the same silently
 *    opted most visitors out of analytics forever the first time they
 *    closed the banner, which is almost certainly why Google Tag Manager
 *    stopped detecting any activity on this container.
 *  - Returning devotees who already chose "Accept" never see this banner
 *    again (index.html loads trackers immediately for them); the same is
 *    true for "Decline" — banner won't re-appear, and trackers stay off.
 *  - ONE-TIME MIGRATION: anyone with "declined" already stored from BEFORE
 *    the X-icon fix above gets asked again exactly once, the same as a
 *    first-time visitor. There's no way to tell, after the fact, whether an
 *    old "declined" value came from a real Decline tap or an X tap — that's
 *    the whole bug — so this treats every pre-fix "declined" as "never
 *    asked", one time only (guarded by DECLINE_MIGRATION_KEY below, so it
 *    can never re-fire and reset a genuine Decline tap made after this fix
 *    shipped).
 *  - Fully self-contained: safe to drop into App.tsx with no other wiring
 *    beyond the <CookieConsent /> tag and this file's import.
 *
 * ✅ FIX — Accept/Decline hidden behind fixed UI (Android app bottom tab
 * bar, in some cases the system gesture-nav bar):
 * This banner and App.tsx's Android-only bottom tab bar (`isAndroidApp &&
 * <nav>...`) are BOTH `position: fixed` at `bottom: 0`. This banner used a
 * higher z-index (300 vs the tab bar's 100), so it always painted ON TOP —
 * it was never literally invisible — but visually it sat flush against the
 * very bottom edge of the screen, directly overlapping "Home / Puja / Seva
 * / Shop / Profile", covering the last ~5-8px of those tap targets and
 * making the whole banister feel jammed into the tab bar with no
 * breathing room, which read as "broken" the same way TempleRegister's
 * footer did before its own Android padding fix. The website (no tab bar)
 * was never affected — its only fixed bottom-edge risk is the phone's own
 * system nav bar / home-indicator, which `env(safe-area-inset-bottom)`
 * already clears.
 * Fix: same pattern already used by the footer and tab bar in App.tsx —
 * on Android, lift this banner clear ABOVE the tab bar's real rendered
 * height (~76px: 8px top padding + 22px icon + 4px gap + ~14px label +
 * 20px bottom padding, plus the safe-area inset) instead of sharing its
 * bottom edge. Off Android, behaviour is unchanged.
 */

import { useEffect, useState } from "react";
import { ShieldCheck, X } from "lucide-react";

// Mirrors the exact check App.tsx uses to decide whether to render its
// Android-only fixed bottom tab bar (main.tsx adds this class before React
// ever mounts, so reading it once here at module scope is safe and always
// in sync with that decision — no UA-sniffing fallback, deliberately, so
// this only activates when that specific tab bar actually exists).
const isSriDwarAndroidApp = (): boolean =>
  typeof document !== "undefined" && document.body.classList.contains("capacitor-android");

const CONSENT_KEY = "sridwar_cookie_consent";
// Guards the one-time migration below — deliberately a SEPARATE key from
// CONSENT_KEY, and index.html is never touched, so the "returning devotee
// who already accepted loads trackers immediately" contract there keeps
// working exactly as before, for both old and newly-migrated visitors.
const DECLINE_MIGRATION_KEY = "sridwar_cookie_consent_x_migration_v1";

declare global {
  interface Window {
    __sridwarLoadTrackers?: () => void;
  }
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const isAndroidApp = isSriDwarAndroidApp();

  useEffect(() => {
    try {
      // ONE-TIME MIGRATION — runs at most once per browser, ever. If this
      // visitor's stored choice is "declined" AND the migration hasn't run
      // for them yet, clear it so they're treated as "never asked" below,
      // same as a first-time visitor. Setting DECLINE_MIGRATION_KEY
      // afterwards (regardless of whether anything needed clearing) means
      // this block can only ever fire once per browser — a real Decline
      // tap made after today will never be touched by it again.
      if (!localStorage.getItem(DECLINE_MIGRATION_KEY)) {
        if (localStorage.getItem(CONSENT_KEY) === "declined") {
          localStorage.removeItem(CONSENT_KEY);
        }
        localStorage.setItem(DECLINE_MIGRATION_KEY, "1");
      }
    } catch (e) {
      // localStorage unavailable — nothing to migrate, skip silently.
    }

    try {
      const existing = localStorage.getItem(CONSENT_KEY);
      if (!existing) {
        // Small delay so the banner doesn't compete with the very first
        // paint / splash — matches how the rest of the app avoids jarring
        // pop-ins on load.
        const t = setTimeout(() => setVisible(true), 800);
        return () => clearTimeout(t);
      }
    } catch (e) {
      // localStorage unavailable — don't block the app, just skip the banner.
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, "accepted");
    } catch (e) { /* ignore */ }
    window.__sridwarLoadTrackers?.();
    setVisible(false);
  };

  const handleDecline = () => {
    try {
      localStorage.setItem(CONSENT_KEY, "declined");
    } catch (e) { /* ignore */ }
    setVisible(false);
  };

  // BUG FIX — this used to be wired to handleDecline(), which meant tapping
  // the X icon silently recorded a PERMANENT "declined" choice in
  // localStorage, exactly like pressing the actual "Decline" button. Most
  // people tap an X to dismiss a banner, not to make a deliberate,
  // considered privacy choice — but this code treated the two identically,
  // and once "declined" was stored, the banner never showed again, so that
  // devotee could never be asked properly and no tracker would ever load
  // for them. This is the most likely reason GTM's diagnostics reported no
  // tag activity for 48 hours straight: X is a far more common reflex tap
  // than either real button, so it was silently opting out most of the
  // traffic that ever saw the banner. Closing via X now just hides the
  // banner for this page load, WITHOUT writing any choice to storage — the
  // devotee is asked again next visit, same as if they'd never seen it.
  // Consent-gating itself (the actual compliance fix) is untouched: no
  // tracker still ever loads without an explicit tap on "Accept".
  const handleDismiss = () => {
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed left-0 right-0 z-[300] p-3 sm:p-4 animate-fadeIn"
      style={
        isAndroidApp
          ? {
              // Clears the fixed Android tab bar entirely instead of
              // sharing its bottom edge — see the FIX note above.
              bottom: "calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 76px)",
            }
          : {
              bottom: 0,
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
            }
      }
      role="dialog"
      aria-live="polite"
      aria-label="Cookie and tracking consent"
    >
      <div className="max-w-2xl mx-auto bg-gradient-to-b from-[#0B2B27] to-[#0F3530] border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-[#5EEAD4] shrink-0 mt-0.5" />
            <p className="text-xs text-white/80 leading-relaxed">
              Sri Dwar uses cookies and similar tools (including analytics and session
              tracking) to understand how devotees use the app and improve it. You can
              accept these, or decline and keep browsing without them.{" "}
              <a href="/cookies" className="text-[#5EEAD4] underline">Cookie Policy</a>
            </p>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Close (you'll be asked again next visit)"
            className="text-white/40 hover:text-white/70 shrink-0 p-3 -m-3"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleDecline}
            className="flex-1 bg-white/5 hover:bg-white/10 text-white/80 font-bold py-2.5 rounded-xl text-[13px] uppercase tracking-wide border border-white/10 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-bold py-2.5 rounded-xl text-[13px] uppercase tracking-wide transition-colors shadow"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
