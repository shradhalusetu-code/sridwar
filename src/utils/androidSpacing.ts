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

/** Returns true when running inside Capacitor Android WebView */
export function useAndroidPlatform(): boolean {
  const [isAndroid, setIsAndroid] = useState(false);
  useEffect(() => {
    // Capacitor adds .platform-android to <body>; also check user-agent fallback
    const bodyHas = document.body.classList.contains("platform-android");
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
 */
export function sectionTopPadding(isAndroid: boolean): CSSProperties {
  if (!isAndroid) return {};
  return {
    paddingTop: "calc(env(safe-area-inset-top, 24px) + 80px)",
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
