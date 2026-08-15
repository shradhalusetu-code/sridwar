/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ✅ BUNDLE-SIZE FIX (2026-08-15): this component renders on every homepage
// load and only ever needed the COUNT of each array (see trustStats below)
// — importing the full PRIEST_PROFILES / TEMPLES_LIST arrays for that was
// pulling ~3,700 lines of full priest/temple data into the eager main
// bundle for two numbers. These lightweight counts are still computed live
// from the real arrays (in priests.ts / temples.ts respectively), so they
// can never drift out of sync — nothing about the "kept honest on purpose"
// behavior documented below changed, only where the count is computed.
import { PRIEST_PROFILES_COUNT } from "../data/priests";
import { TEMPLES_LIST_COUNT } from "../data/temples";
import { TRANSLATIONS } from "../data/translations";

interface TrustBarProps {
  isAndroidApp?: boolean;
}

/**
 * Trust-bar stats — kept honest on purpose:
 *  - "Priests Network" and "Temples Network" are computed live from the
 *    actual data files, so they can never drift into a false claim as the
 *    business grows or changes (and note: PRIEST_PROFILES currently marks
 *    every priest isVerified: false, so we no longer claim "Verified
 *    Priests" here — that word should only return once a real
 *    verification process is in place and priests.ts reflects it).
 *  - "Languages Supported" is computed from the app's own translations.
 *  - "Secure Offerings" intentionally says "Bank-Grade" rather than "100%" —
 *    the Privacy Policy itself (Section 8, Data Security) correctly states
 *    that no internet transmission or storage system can be guaranteed
 *    100% secure, so an unqualified "100% Secure" badge on the homepage
 *    directly contradicted that and read as an absolute, unverifiable claim
 *    — exactly what Play Store review flags as a deceptive-claims risk.
 *  - The rest are genuine feature/policy claims (things Sri Dwar actually
 *    does), not fabricated headcounts.
 *
 * Placed on the homepage after Divine Miracles & Success Stories
 * (DevoteeExperiences), so real devotee stories build trust first and this
 * bar reinforces it with concrete numbers right after.
 */
export default function TrustBar({ isAndroidApp = false }: TrustBarProps) {
  const trustStats = [
    { value: `${PRIEST_PROFILES_COUNT}+`, label: "Priests Network" },
    { value: `${TEMPLES_LIST_COUNT}+`, label: "Temples Network" },
    { value: `${Object.keys(TRANSLATIONS).length}`, label: "Languages Supported" },
    { value: "Bank-Grade", label: "Secure Offerings" },
    { value: "24/7", label: "Live Ritual Streams" },
    { value: "Free", label: "Temple Registration" },
    { value: "Global", label: "Devotees Welcome" },
    { value: "AI-Powered", label: "Faith-Tech Platform" },
  ];

  return (
    <div id="trust-bar-section" className={`relative bg-[#092320]/80 z-10 w-full border-t border-b border-white/10 shadow-lg backdrop-blur-md ${isAndroidApp ? "py-6" : "py-3"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`grid ${isAndroidApp ? "grid-cols-2" : "grid-cols-3"} sm:grid-cols-4 lg:grid-cols-8 gap-4 text-center items-stretch`}>
          {trustStats.map((stat, i) => (
            <div
              key={i}
              id={`stat-card-${i}`}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm transition-transform hover:scale-105"
            >
              <span className="text-lg font-bold text-[#FFB347] font-serif filter drop-shadow">
                {stat.value}
              </span>
              <span className="text-[12px] text-white/80 font-mono tracking-tight leading-tight break-words mt-1">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
