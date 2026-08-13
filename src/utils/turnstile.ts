/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Public Site Key — safe to ship in the client bundle. This is exactly what
// Cloudflare means by "safe to expose in your frontend code": it identifies
// which Turnstile widget to render, it cannot be used to verify anything on
// its own (that requires the Secret Key, which never leaves server.ts).
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as
  | string
  | undefined;

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    __turnstileWidgetId?: string;
  }
}

let _currentToken: string | null = null;

/** Called by TurnstileWidget.tsx whenever the widget solves or refreshes. */
export function setTurnstileToken(token: string | null) {
  _currentToken = token;
}

/**
 * Waits briefly for a Turnstile token to be ready. In "Managed" mode this
 * resolves almost immediately for real visitors — the wait only matters for
 * the rare case where Cloudflare's risk engine is still evaluating the
 * session, or a visible challenge is being solved.
 */
async function waitForToken(timeoutMs = 8000): Promise<string | null> {
  const start = Date.now();
  while (!_currentToken && Date.now() - start < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return _currentToken;
}

/**
 * The one shared gate every Google Forms submission goes through — called
 * from syncToGoogleForm / postPendingRow / postFinalRow in
 * googleFormSync.ts. No individual form component needs to know this
 * exists or call it directly.
 *
 * IMPORTANT — two different failure modes, two different responses:
 *
 *   1. The verification BACKEND isn't reachable (server.ts isn't deployed
 *      anywhere yet — e.g. this site runs on GitHub Pages, which is
 *      static-only and has no server.ts running at all — or it's
 *      temporarily down). This is an infrastructure gap, not a signal that
 *      the visitor is a bot. Blocking every real devotee's booking/contact/
 *      seva submission over a backend that doesn't exist yet would be far
 *      worse than temporarily skipping verification, so this case FAILS
 *      OPEN (returns true, submission proceeds) with a console warning.
 *
 *   2. The verification backend IS reachable and responds with a genuine
 *      "success: false" (a real token rejected by Cloudflare's siteverify).
 *      This is real bot protection working correctly, so this case FAILS
 *      CLOSED (returns false, submission blocked) as before.
 *
 * Practically: today, with server.ts undeployed, every form on the site
 * behaves exactly as it did before Turnstile was added — nothing changes
 * for your customers. The day server.ts is deployed somewhere (Supabase
 * Edge Function, small Node host, Render, etc.) with TURNSTILE_SECRET_KEY
 * set, this route starts returning real 200/403 JSON and case 2 takes
 * over automatically — real protection turns on with no further code
 * change needed here.
 */
export async function verifyHuman(): Promise<boolean> {
  if (!TURNSTILE_SITE_KEY) {
    // No site key configured — nothing to verify against. Don't block
    // submissions over a feature that was never turned on.
    return true;
  }

  const token = await waitForToken();
  if (!token) {
    // No token became available in time (e.g. Turnstile's own script
    // failed to load, or the challenge is still pending). Don't block a
    // real devotee's submission over that — soft-fail, not a rejection.
    console.warn("[Turnstile] No token became available in time — allowing submission through unverified.");
    return true;
  }

  try {
    const res = await fetch("/api/verify-turnstile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
      // Covers the "server.ts isn't deployed yet" case: on GitHub Pages
      // (or any static-only host) this request 404s instead of reaching a
      // real Express route. Also covers a deployed-but-misconfigured
      // backend (e.g. TURNSTILE_SECRET_KEY missing -> 500). Either way,
      // this is "verification unavailable," not "visitor rejected."
      console.warn(
        `[Turnstile] Verification endpoint returned ${res.status} — likely not deployed yet. Allowing submission through unverified.`
      );
      return true;
    }

    const data = await res.json();
    return Boolean(data?.success);
  } catch (err) {
    // Network failure, CORS, or a non-JSON response (e.g. a static host's
    // 404 fallback page) landing here — same reasoning as the !res.ok
    // branch above: treat as "verification unavailable," not "rejected."
    console.warn("[Turnstile] Verification request failed — allowing submission through unverified:", err);
    return true;
  } finally {
    // Consume + refresh regardless of outcome — a used or rejected token
    // must never be reused for the next attempt (tokens are single-use).
    setTurnstileToken(null);
    if (typeof window !== "undefined" && window.turnstile && window.__turnstileWidgetId) {
      window.turnstile.reset(window.__turnstileWidgetId);
    }
  }
}
