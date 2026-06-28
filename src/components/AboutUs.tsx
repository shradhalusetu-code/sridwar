/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Sparkles, Award, Heart, ShieldCheck, Users } from "lucide-react";
import SacredIcon from "./SacredIcon";

export default function AboutUs() {
  return (
    <section id="about-us-section" className="py-12 bg-[#021816] text-white text-left" style={{ paddingTop: `calc(env(safe-area-inset-top, 0px) + 80px)` }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Banner Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-20 animate-fadeIn">
          {/* Narrative Text (cols 7) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center space-x-2 bg-[#FFB347]/10 border border-[#FFB347]/30 px-3.5 py-1.5 rounded-full text-[#FFB347] text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#FFB347] fill-[#FFB347]" />
              <span>Founded by Kunu Rana — Bridging Faith & Innovation</span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-serif font-black text-white tracking-tight leading-tight">
              Honoring Ancient Heritage. Empowering Remote Devotion.
            </h2>

            <p className="text-sm text-white/80 leading-relaxed font-sans">
              Founded under the legal parent of **Shradhalu Private Limited** by visionary entrepreneur **Kunu Rana**, Sri Dwar is the world’s leading digital faith-tech ecosystem designed to preserve Vedic culture and make remote temple worship deeply authentic.
            </p>

            <blockquote className="border-l-4 border-[#FFB347] pl-5 py-2 text-xs italic font-serif text-white/95 bg-white/5 rounded-r-2xl">
              "We didn't build Sri Dwar to replace physical holy temple visits, but to bridge the spatial divide for elderly parents, sick individuals, and global NRIs. To provide sustainable, transparent financial conduits for traditional priests, local flower-vendors, and indigenous cows."
              <span className="block mt-1 font-sans text-[10px] font-bold text-[#5EEAD4] not-italic uppercase font-mono">— Founder Kunu Rana</span>
            </blockquote>

            <p className="text-sm text-white/80 leading-relaxed font-sans">
              Every Sankalpa we register is legally synchronized using strict compliance, and we maintain immediate payout structures so that a major portion of your Dakshina is transferred directly into verified priest trusts.
            </p>
          </div>

          {/* Graphic/Illustration Image (cols 5) */}
          <div className="lg:col-span-5 relative w-full flex justify-center">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-[#092320] w-full max-w-sm aspect-square">
              <img
                src={import.meta.env.BASE_URL + "images/connect.jpg"}
                alt="Sri Dwar Divine Mission - Sacred Temple Devotion & Priestly Connection"
                className="w-full h-full object-cover rounded-2xl hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              {/* Divine Overlay Accent */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#021816]/90 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10">
                <p className="text-[10px] text-[#FFB347] font-mono uppercase tracking-widest font-bold">Divine Core</p>
                <p className="text-xs text-white/95 font-serif font-semibold">Bridging Global Devotees with Ancient Traditions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Core Values / Impact Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-[#092320] p-6 rounded-3xl border border-white/10 text-left space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5EEAD4]/10 text-[#5EEAD4] flex items-center justify-center font-bold text-lg border border-[#5EEAD4]/20">
              ✓
            </div>
            <h4 className="font-serif text-base font-bold text-white">Scriptural Authenticity</h4>
            <p className="text-xs text-white/70 leading-relaxed">
              We never perform general mass prayers. Every puja is voiced individually with your Gotra and Nakshatra, preserving thousands of years of strict Vedic guidelines.
            </p>
          </div>

          <div className="bg-[#092320] p-6 rounded-3xl border border-white/10 text-left space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFB347]/10 text-[#FFB347] flex items-center justify-center font-bold text-lg border border-[#FFB347]/20">
              ❤
            </div>
            <h4 className="font-serif text-base font-bold text-white">Priest Empowerment</h4>
            <p className="text-xs text-white/70 leading-relaxed">
              We empower over 100+ local Pandits and Gurukuls with technical training, digital tablets, and consistent wages, ensuring their children keep the chanting line active.
            </p>
          </div>

          <div className="bg-[#092320] p-6 rounded-3xl border border-white/10 text-left space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFB347]/10 text-[#FFB347] flex items-center justify-center font-bold text-lg border border-[#FFB347]/20">
              💡
            </div>
            <h4 className="font-serif text-base font-bold text-white">Zero-Leaking Economy</h4>
            <p className="text-xs text-white/70 leading-relaxed">
              Operated under Shradhalu Private Limited, we use secure transaction ledgers and Google Spreadsheet databases for full audit disclosures on how donations are utilized.
            </p>
          </div>

          <div className="bg-[#092320] p-6 rounded-3xl border border-white/10 text-left space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5EEAD4]/10 text-[#5EEAD4] flex items-center justify-center font-bold text-lg border border-[#5EEAD4]/20">
              🌍
            </div>
            <h4 className="font-serif text-base font-bold text-white">PWA Global Ingress</h4>
            <p className="text-xs text-white/70 leading-relaxed">
              Built using top-tier React, with responsive design elements and offline-first service parameters supporting NRIs in Europe, Americas, and East Asia.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
