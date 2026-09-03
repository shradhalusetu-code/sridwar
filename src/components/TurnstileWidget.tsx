/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ✅ ADDED (2026-09-03): completes the Turnstile bot-protection feature.
// src/utils/turnstile.ts (verifyHuman, setTurnstileToken, TURNSTILE_SITE_KEY)
// already existed, fully designed, with nothing actually rendering a widget
// or feeding it a token — this is that missing piece.
//
// Mounted ONCE, globally, in App.tsx — not per-form. This is deliberate:
// Cloudflare's "Managed" mode (the default, and what this renders) is
// designed to run invisibly for the vast majority of real visitors, silently
// solving in the background the moment the page loads, well before anyone
// reaches a "Submit" button. A single global widget keeps a fresh token
// ready at all times; verifyHuman() (called from googleFormSync.ts) simply
// consumes whatever token is currently available when any form submits,
// rather than every individual form needing its own widget instance.
//
// Renders nothing visible in the common case — Turnstile only shows an
// interactive challenge for the small fraction of sessions its risk engine
// flags as needing one, and even then renders its own compact widget UI,
// not something this component needs to style.

import { useEffect, useRef } from "react";
import { TURNSTILE_SITE_KEY, setTurnstileToken } from "../utils/turnstile";

const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

let scriptLoadPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${TURNSTILE_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Turnstile script failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile script failed to load"));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

export default function TurnstileWidget() {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    // No site key configured — nothing to render. verifyHuman() already
    // handles this same "not configured" case by not blocking submissions,
    // so simply not mounting anything here is consistent, not a gap.
    if (!TURNSTILE_SITE_KEY || !containerRef.current) return;

    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !window.turnstile || !containerRef.current) return;
        const widgetId = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => setTurnstileToken(token),
          "expired-callback": () => setTurnstileToken(null),
          "error-callback": () => setTurnstileToken(null),
          // "Managed" is Turnstile's default and the one this whole
          // feature was designed around (see turnstile.ts) — invisible for
          // real visitors, a real challenge only for suspicious sessions.
          appearance: "interaction-only",
        });
        widgetIdRef.current = widgetId;
        window.__turnstileWidgetId = widgetId;
      })
      .catch((err) => {
        // Script failed to load (network issue, an ad/privacy blocker,
        // etc.) — verifyHuman()'s own "no token became available in time"
        // path already handles this gracefully (fails open), so this is
        // just a console note, not something that needs to interrupt
        // anyone.
        console.warn("[Turnstile] Widget failed to initialize:", err);
      });

    return () => {
      cancelled = true;
      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, []);

  if (!TURNSTILE_SITE_KEY) return null;

  // Fixed, off-screen position rather than display:none — Turnstile (like
  // reCAPTCHA) needs to actually be in the layout to size/render its
  // challenge correctly for the rare visitor who gets one; display:none
  // can prevent that. This keeps it out of the way for everyone else
  // without breaking the challenge case.
  return (
    <div
      ref={containerRef}
      style={{ position: "fixed", bottom: 8, right: 8, zIndex: 40 }}
      aria-hidden="true"
    />
  );
}
