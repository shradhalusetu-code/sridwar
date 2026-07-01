/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ─── Why this file exists ───────────────────────────────────────────────────
 * Inside the Capacitor Android app, the WebView serves the bundled site from
 * an internal origin (https://localhost) because capacitor.config.ts does not
 * set server.hostname. That's fine for rendering the app — but it means any
 * code that builds a link from `window.location.origin` / `window.location.href`
 * (e.g. "Share this page", "Copy link") ends up producing a localhost URL,
 * which is meaningless to anyone outside the device.
 *
 * On the real website (sridwar.com or any GitHub Pages preview), window.location
 * is already correct and should be used as-is.
 *
 * These helpers detect the native Android app the same way main.tsx / App.tsx
 * already do (the `capacitor-android` class on <body>) and, only in that case,
 * swap in the public production domain instead of the internal origin.
 */

export const PRODUCTION_ORIGIN = "https://sridwar.com";

/** True only inside the Capacitor Android APK — never on the deployed website. */
export function isNativeAndroidApp(): boolean {
  if (typeof document !== "undefined" && document.body?.classList.contains("capacitor-android")) {
    return true;
  }
  // Fallback check in case the class hasn't been applied yet for any reason.
  return (
    typeof window !== "undefined" &&
    !!(window as any).Capacitor &&
    typeof (window as any).Capacitor.getPlatform === "function" &&
    (window as any).Capacitor.getPlatform() === "android"
  );
}

/**
 * Returns the origin that should be used when building a link meant to be
 * shared outside the app/browser (WhatsApp, clipboard, native share sheet, etc).
 * - Inside the Android app: always the public production domain.
 * - On the web (localhost dev, GitHub Pages preview, or the live site): the
 *   real current origin, so preview deployments still share their own URL.
 */
export function getShareOrigin(): string {
  if (isNativeAndroidApp()) return PRODUCTION_ORIGIN;
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return PRODUCTION_ORIGIN;
}

/**
 * Builds a full shareable URL. Inside the Android app there's no meaningful
 * path to preserve (the app doesn't have real routes/query strings the way a
 * browser tab does), so we always point back to the public site root. On the
 * web, the current path + search is preserved so deep links keep working.
 */
export function getShareUrl(): string {
  if (isNativeAndroidApp()) {
    return `${PRODUCTION_ORIGIN}/`;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}${window.location.pathname}${window.location.search}`;
  }
  return `${PRODUCTION_ORIGIN}/`;
}
