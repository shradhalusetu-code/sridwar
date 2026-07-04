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
import registerDevotteeImg from "../assets/images/Register_devottee.jpg";

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 BANNER — Register Your Native Temple or Puja Committee
// Text LEFT · Register_Priest.jpg (family at temple) RIGHT
// ─────────────────────────────────────────────────────────────────────────────
export function TempleBanner() {
  return (
    <div
      className="w-full rounded-3xl overflow-hidden mb-8"
      style={{
        background: "linear-gradient(135deg, #1a0f00 0%, #2d1a00 40%, #1a1400 100%)",
      }}
    >
      <div className="flex flex-col sm:flex-row" style={{ minHeight: "240px" }}>

        {/* ── LEFT: text ── */}
        <div className="flex-1 flex flex-col justify-center px-7 py-8 sm:px-9">
          <span
            className="inline-flex items-center self-start mb-4 rounded-full px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest"
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
          <p className="mb-5" style={{ fontSize: "clamp(0.85rem, 1.8vw, 1rem)", color: "rgba(255,255,255,0.70)" }}>
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

        {/* ── RIGHT: Register_Priest.jpg (family at temple) ── */}
        <div className="relative sm:w-[46%] w-full" style={{ minHeight: "200px" }}>
          {/* Left-edge fade so image blends into the dark background */}
          <div
            className="absolute inset-y-0 left-0 z-10 hidden sm:block"
            style={{
              width: "72px",
              background: "linear-gradient(to right, #1a0f00, transparent)",
            }}
          />
          <img
            src={registerPriestImg}
            alt="Family at a Hindu temple — Register Your Temple or Puja Committee on Sri Dwar"
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              opacity: 0.93,
            }}
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 BANNER — Find & Register Local Dharmic Experts
// Register_devottee.jpg (priest with devotee) LEFT · Text RIGHT
// ─────────────────────────────────────────────────────────────────────────────
export function DharmicExpertBanner() {
  return (
    <div
      className="w-full rounded-3xl overflow-hidden mb-8"
      style={{
        background: "linear-gradient(135deg, #021816 0%, #041f1a 50%, #021210 100%)",
      }}
    >
      {/* On mobile image stacks below text; on sm+ image is on the left */}
      <div className="flex flex-col-reverse sm:flex-row" style={{ minHeight: "240px" }}>

        {/* ── LEFT: Register_devottee.jpg (priest/guru with devotee) ── */}
        <div className="relative sm:w-[46%] w-full" style={{ minHeight: "200px" }}>
          {/* Right-edge fade so image blends into the dark background */}
          <div
            className="absolute inset-y-0 right-0 z-10 hidden sm:block"
            style={{
              width: "72px",
              background: "linear-gradient(to left, #021816, transparent)",
            }}
          />
          <img
            src={registerDevotteeImg}
            alt="Pandit with devotee performing puja — Register a Dharmic Expert on Sri Dwar"
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              opacity: 0.93,
            }}
            loading="lazy"
            decoding="async"
          />
        </div>

        {/* ── RIGHT: text ── */}
        <div className="flex-1 flex flex-col justify-center px-7 py-8 sm:px-9">
          <span
            className="inline-flex items-center self-start mb-4 rounded-full px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest"
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
          <p className="mb-5" style={{ fontSize: "clamp(0.85rem, 1.8vw, 1rem)", color: "rgba(255,255,255,0.68)" }}>
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
