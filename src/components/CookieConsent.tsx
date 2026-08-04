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
 *  - Returning devotees who already chose "Accept" never see this banner
 *    again (index.html loads trackers immediately for them); the same is
 *    true for "Decline" — banner won't re-appear, and trackers stay off.
 *  - Fully self-contained: safe to drop into App.tsx with no other wiring
 *    beyond the <CookieConsent /> tag and this file's import.
 */

import { useEffect, useState } from "react";
import { ShieldCheck, X } from "lucide-react";

const CONSENT_KEY = "sridwar_cookie_consent";

declare global {
  interface Window {
    __sridwarLoadTrackers?: () => void;
  }
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
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

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[300] p-3 sm:p-4 animate-fadeIn"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
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
            onClick={handleDecline}
            aria-label="Close and decline"
            className="text-white/40 hover:text-white/70 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleDecline}
            className="flex-1 bg-white/5 hover:bg-white/10 text-white/80 font-bold py-2.5 rounded-xl text-[11px] uppercase tracking-wide border border-white/10 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-bold py-2.5 rounded-xl text-[11px] uppercase tracking-wide transition-colors shadow"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
