/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ✅ ADDED (2026-09-05): "Recognized By" — a horizontal-scroll carousel of
// official recognition logos, placed on the homepage right below Devotee
// Experiences (Divine Miracles & Success Stories), per explicit
// instruction. Logo-only, no text labels under each — the logos
// themselves already carry their own name/branding, so a duplicate label
// underneath would be visual clutter, not clarity.
//
// All 6 source images already ship with a dark background matching this
// site's own theme (someone clearly prepared them for exactly this use),
// so they're used directly, full-bleed within each card — no white-chip
// wrapper needed the way a plain white-background logo (like the
// Razorpay footer badge) requires.
//
// DPIIT_India.jpg itself already contains both the DPIIT emblem AND the
// official "#startupindia" mark in one image — so 6 images correctly
// cover all 7 required recognitions (DPIIT + Startup India share one
// card, since that's literally how the government's own combined
// logo presents them).

import { useRef } from "react";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import dpiitStartupIndia from "../assets/images/DPIIT_India.jpg";
import digitalIndia from "../assets/images/Digital_India.jpg";
import fssai from "../assets/images/Fssai_India.jpg";
import gem from "../assets/images/GEM_India.jpg";
import msme from "../assets/images/MSME.jpg";
import startupOdisha from "../assets/images/startup_odisha.jpg";

const RECOGNITIONS: { id: string; src: string; alt: string }[] = [
  { id: "dpiit-startupindia", src: dpiitStartupIndia, alt: "DPIIT — Startup India" },
  { id: "startup-odisha", src: startupOdisha, alt: "Startup Odisha" },
  { id: "digital-india", src: digitalIndia, alt: "Digital India" },
  { id: "fssai", src: fssai, alt: "FSSAI" },
  { id: "msme", src: msme, alt: "MSME / Udyam Registration" },
  { id: "gem", src: gem, alt: "GeM Registration" },
];

export default function RecognizedBy() {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollByCard = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector("[data-card]") as HTMLElement | null;
    const step = (card?.offsetWidth || 280) + 20; // card width + gap
    track.scrollBy({ left: step * direction, behavior: "smooth" });
  };

  return (
    <section className="bg-[#021816] py-10 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#FFB347]" />
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-white">Recognized &amp; Trusted By</h2>
          </div>
          {/* Desktop-only arrow controls — mobile relies on natural swipe,
              matching every other horizontal-scroll section on this site. */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button" onClick={() => scrollByCard(-1)} aria-label="Scroll left"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button" onClick={() => scrollByCard(1)} aria-label="Scroll right"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Same horizontal snap-scroll pattern already established
            elsewhere on this site (Temple Bazaar, TemplateBazaar.tsx) —
            deliberately kept as a real scrollable carousel on every
            screen size (not a static desktop grid), since the request
            was specifically for a carousel users scroll through. */}
        <div
          ref={trackRef}
          className="flex gap-5 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 sm:-mx-6 px-4 sm:px-6 pb-1"
        >
          {RECOGNITIONS.map((r) => (
            <div
              key={r.id} data-card
              className="snap-start shrink-0 w-[220px] sm:w-[260px] aspect-[4/3] bg-black/20 border border-white/10 rounded-2xl p-5 flex items-center justify-center hover:border-[#5EEAD4]/30 transition-all"
            >
              <img src={r.src} alt={r.alt} className="w-full h-full object-contain" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
