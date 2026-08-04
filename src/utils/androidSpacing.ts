/**
 * androidSpacing.ts
 * Sri Dwar — Android Capacitor spacing utilities
 *
 * Usage in any component:
 *   import { useAndroidPlatform, sectionTopPadding } from "../utils/androidSpacing";
 *   const isAndroid = useAndroidPlatform();
 *   <section style={sectionTopPadding(isAndroid)} ...>
 */

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

/**
 * Returns true when running inside the Capacitor Android WebView.
 *
 * FIX: this used to check for a body class called "platform-android",
 * but main.tsx (see the Capacitor detection block there) actually adds
 * the class "capacitor-android" — the two never matched, so this hook
 * was silently falling back to the User-Agent check every single time.
 * That happened to still work on real Android phones (their UA always
 * contains "android"), which is why the bug stayed hidden — but it
 * would incorrectly report "Android" for any Android *browser* tab of
 * your GitHub Pages site too, and would break the moment the UA check
 * was ever removed. Checking the correct class name first is the
 * actual fix; the UA check stays only as a harmless fallback.
 */
export function useAndroidPlatform(): boolean {
  const [isAndroid, setIsAndroid] = useState(false);
  useEffect(() => {
    // Capacitor's main.tsx adds .capacitor-android to <body>; keep the
    // user-agent check only as a fallback for edge cases.
    const bodyHas = document.body.classList.contains("capacitor-android");
    const uaHas   = /android/i.test(navigator.userAgent);
    setIsAndroid(bodyHas || uaHas);
  }, []);
  return isAndroid;
}

/**
 * Returns an inline style that pads the top of a full-page section
 * so it clears the fixed Navbar + Android status bar.
 *
 * Navbar unscrolled = py-5 logo ~64px.
 * Status bar safe-area is handled via CSS env(); we add an extra 16px buffer.
 *
 * FIX: reads var(--safe-area-inset-top) first, with env() as the fallback.
 * Plain env(safe-area-inset-top) silently returns 0px on Android WebView
 * builds older than Chrome 140 (a known Chromium bug), regardless of
 * `viewport-fit=cover` being set correctly in index.html. Capacitor 8.3+
 * works around this by also injecting the correct value into
 * --safe-area-inset-top — this reads that first and only falls back to
 * plain env() where the variable isn't defined (i.e. on the website,
 * where the fallback is exactly what ran before this fix).
 */
export function sectionTopPadding(isAndroid: boolean): CSSProperties {
  if (!isAndroid) return {};
  return {
    // 96px (not 80px) — measured against the fixed Navbar's actual
    // unscrolled rendered height (safe-area + py-7 top/bottom padding +
    // logo/content ≈ safe-area + 88-90px). 80px left an 8-12px sliver of
    // every first-on-page section (Seva Hub, Temple Bazaar, Online Puja
    // headers) sitting underneath the fixed Navbar on Android, which is
    // what made those headings look "hidden in the header". The extra
    // margin here is intentional so real devices with slightly taller
    // status bars still clear it.
    paddingTop: "calc(var(--safe-area-inset-top, env(safe-area-inset-top, 24px)) + 96px)",
  };
}

/**
 * Reduced vertical padding for sections on Android mobile.
 * Maps common Tailwind py values to mobile-friendly equivalents.
 */
export const androidSectionClass = (base: string, isAndroid: boolean): string => {
  if (!isAndroid) return base;
  return base
    .replace("py-24", "py-10")
    .replace("py-20", "py-10")
    .replace("py-16", "py-8");
};
