/**
 * TempleRegisterBanners.tsx — Sri Dwar
 * Banner components for the two registration sections.
 * Uses real photography instead of SVG illustrations.
 *
 * Usage:
 *   import { TempleBanner, DharmicExpertBanner } from "./TempleRegisterBanners";
 *
 * Pure presentational — no props, no state, no side effects.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import registerPriestImg from "../assets/images/Register_Priest.jpg";
// @ts-ignore
import registerPriestImgWebp from "../assets/images/Register_Priest.webp";
import registerDevotteeImg from "../assets/images/Register_devottee.jpg";
// @ts-ignore
import registerDevotteeImgWebp from "../assets/images/Register_devottee.webp";
import OptimizedImage from "./OptimizedImage";

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 BANNER — Register Your Native Temple or Puja Committee
// Register_Priest.jpg (family at temple) LEFT · Text RIGHT — image on top on mobile
// ─────────────────────────────────────────────────────────────────────────────
export function TempleBanner() {
  return (
    <div
      className="w-full rounded-3xl overflow-hidden mb-8"
      style={{
        background: "linear-gradient(135deg, #1a0f00 0%, #2d1a00 40%, #1a1400 100%)",
      }}
    >
      <div className="flex flex-col sm:flex-row">

        {/* ── LEFT (top on mobile): Register_Priest.jpg (family at temple) ── */}
        <div className="relative w-full sm:w-[42%] shrink-0" style={{ aspectRatio: "3 / 2" }}>
          <OptimizedImage
            src={registerPriestImg}
            webpSrc={registerPriestImgWebp}
            alt="Family at a Hindu temple — Register Your Temple or Puja Committee on Sri Dwar"
            className="absolute inset-0 h-full w-full"
            style={{
              display: "block",
              objectFit: "contain",
              objectPosition: "center",
            }}
            loading="lazy"
          />
          {/* Right-edge fade so image blends into the text panel on desktop */}
          <div
            className="absolute inset-y-0 right-0 hidden sm:block"
            style={{
              width: "48px",
              background: "linear-gradient(to left, #1a1400, transparent)",
            }}
          />
          {/* Bottom-edge fade so image blends into the text panel on mobile */}
          <div
            className="absolute inset-x-0 bottom-0 sm:hidden"
            style={{
              height: "40px",
              background: "linear-gradient(to top, #1a1400, transparent)",
            }}
          />
        </div>

        {/* ── RIGHT (below on mobile): text ── */}
        <div className="flex-1 flex flex-col justify-center px-6 py-6 sm:px-8 sm:py-7 min-w-0">
          <span
            className="inline-flex items-center self-start mb-3 rounded-full px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest"
            style={{
              background: "rgba(204,119,34,0.12)",
              border: "0.8px solid rgba(204,119,34,0.3)",
              color: "#FFB347",
            }}
          >
            AN INITIATIVE BY SRIDWAR
          </span>

          <p className="font-serif font-bold text-white leading-tight" style={{ fontSize: "clamp(1.2rem, 2.8vw, 1.65rem)" }}>
            Your Temple.
          </p>
          <p className="font-serif font-bold leading-tight mb-3" style={{ fontSize: "clamp(1.2rem, 2.8vw, 1.65rem)", color: "#FFB347" }}>
            Your Community.
          </p>
          <p className="mb-4" style={{ fontSize: "clamp(0.85rem, 1.8vw, 1rem)", color: "rgba(255,255,255,0.70)" }}>
            Find · Register · Connect
          </p>

          <div className="flex flex-wrap gap-2">
            {[
              { icon: "🏛️", label: "Temples & Mandals" },
              { icon: "🆓", label: "Free Listing" },
              { icon: "🔒", label: "Trusted" },
            ].map((c) => (
              <span
                key={c.label}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
                style={{
                  background: "rgba(204,119,34,0.10)",
                  border: "0.8px solid rgba(204,119,34,0.25)",
                  color: "#FFD580",
                }}
              >
                <span>{c.icon}</span>
                <span>{c.label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 BANNER — Find & Register Local Dharmic Experts
// Register_devottee.jpg (priest with devotee) LEFT · Text RIGHT — image on top on mobile
// ─────────────────────────────────────────────────────────────────────────────
export function DharmicExpertBanner() {
  return (
    <div
      className="w-full rounded-3xl overflow-hidden mb-8"
      style={{
        background: "linear-gradient(135deg, #021816 0%, #041f1a 50%, #021210 100%)",
      }}
    >
      {/* Image stacks on top on mobile; image sits on the left on sm+ */}
      <div className="flex flex-col sm:flex-row">

        {/* ── LEFT (top on mobile): Register_devottee.jpg (priest/guru with devotee) ── */}
        <div className="relative w-full sm:w-[42%] shrink-0" style={{ aspectRatio: "3 / 2" }}>
          <OptimizedImage
            src={registerDevotteeImg}
            webpSrc={registerDevotteeImgWebp}
            alt="Pandit with devotee performing puja — Register a Dharmic Expert on Sri Dwar"
            className="absolute inset-0 h-full w-full"
            style={{
              display: "block",
              objectFit: "contain",
              objectPosition: "center",
            }}
            loading="lazy"
          />
          {/* Right-edge fade so image blends into the text panel on desktop */}
          <div
            className="absolute inset-y-0 right-0 hidden sm:block"
            style={{
              width: "48px",
              background: "linear-gradient(to left, #021210, transparent)",
            }}
          />
          {/* Bottom-edge fade so image blends into the text panel on mobile */}
          <div
            className="absolute inset-x-0 bottom-0 sm:hidden"
            style={{
              height: "40px",
              background: "linear-gradient(to top, #021210, transparent)",
            }}
          />
        </div>

        {/* ── RIGHT (below on mobile): text ── */}
        <div className="flex-1 flex flex-col justify-center px-6 py-6 sm:px-8 sm:py-7 min-w-0">
          <span
            className="inline-flex items-center self-start mb-3 rounded-full px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest"
            style={{
              background: "rgba(94,234,212,0.10)",
              border: "0.8px solid rgba(94,234,212,0.28)",
              color: "#5EEAD4",
            }}
          >
            AN INITIATIVE BY SRIDWAR
          </span>

          <p className="font-serif font-bold text-white leading-tight" style={{ fontSize: "clamp(1.2rem, 2.8vw, 1.65rem)" }}>
            Dharmic Wisdom,
          </p>
          <p className="font-serif font-bold leading-tight mb-3" style={{ fontSize: "clamp(1.2rem, 2.8vw, 1.65rem)", color: "#5EEAD4" }}>
            Near You.
          </p>
          <p className="mb-4" style={{ fontSize: "clamp(0.85rem, 1.8vw, 1rem)", color: "rgba(255,255,255,0.68)" }}>
            Pujari · Pandit · Guru · Sant · Sadhu
          </p>

          <div className="flex flex-wrap gap-2">
            {[
              { icon: "✅", label: "Experienced Experts" },
              { icon: "🆓", label: "Free to Register" },
              { icon: "📲", label: "Discoverable" },
            ].map((c) => (
              <span
                key={c.label}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
                style={{
                  background: "rgba(94,234,212,0.08)",
                  border: "0.8px solid rgba(94,234,212,0.22)",
                  color: "#9DECD8",
                }}
              >
                <span>{c.icon}</span>
                <span>{c.label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
