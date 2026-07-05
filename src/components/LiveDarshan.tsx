/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { TEMPLES_LIST } from "../data/temples";
import { LIVE_DARSHAN_INFO } from "../data/liveDarshan";
import { Heart, MapPin, ChevronRight, ChevronDown, Users } from "lucide-react";

interface LiveDarshanProps {
  onNavigate?: (page: string) => void;
}

export default function LiveDarshan({ onNavigate }: LiveDarshanProps) {
  const [darshanTempleId, setDarshanTempleId] = useState(TEMPLES_LIST[0].id);
  const [darshanDropdownOpen, setDarshanDropdownOpen] = useState(false);

  const darshanTemple = TEMPLES_LIST.find((t) => t.id === darshanTempleId) || TEMPLES_LIST[0];
  const darshanInfo = LIVE_DARSHAN_INFO[darshanTempleId] || LIVE_DARSHAN_INFO[TEMPLES_LIST[0].id];

  return (
    <section
      id="live-darshan-page-section"
      className="pt-8 sm:pt-10 pb-16 sm:pb-20 bg-gradient-to-b from-[#021816] to-[#021816] relative text-white"
      style={{ paddingTop: `calc(env(safe-area-inset-top, 0px) + 80px)` }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Page header */}
        <div className="text-left space-y-2 mb-6">
          <span className="text-xs font-semibold text-[#FFB347]/80 tracking-wider font-mono">Revered shrines network</span>
          <h1 className="text-3xl sm:text-4xl font-serif font-black text-white tracking-tight">
            Live Darshan
          </h1>
        </div>

        {/* VIRTUAL LIVE DARSHAN ROOM SECTION */}
        <div
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start bg-[#092320]/85 rounded-3xl border border-white/10 p-6 md:p-10 shadow-2xl relative overflow-hidden backdrop-blur-md"
          style={{ WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
        >

          {/* Spiritual symbol background decoration */}
          <div className="absolute top-4 right-6 text-white/5 font-serif text-8xl pointer-events-none select-none">
            ॐ
          </div>

          {/* Diya decoration badge */}
          <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-[#FFB347] cursor-pointer glow-diya flex items-center justify-center border-2 border-[#021816]">
            <span className="text-2xl text-[#021816]">🪔</span>
          </div>

          {/* Header row spanning full width: title + temple selector */}
          <div className="lg:col-span-12 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
              <span className="text-xs font-mono text-[#5EEAD4] tracking-wider uppercase font-bold">
                Virtual Live Darshan Room
              </span>
              <span className="bg-amber-500/15 text-amber-300 border border-amber-400/30 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                Feed Updating Soon
              </span>
            </div>

            <h3 className="font-serif text-2xl sm:text-3xl font-black text-white leading-tight">
              Live Sanctified Darshan
            </h3>

            {/* Temple selector dropdown — same pattern as the Featured Temple Experience dropdown */}
            <div className="relative max-w-xl">
              <button
                type="button"
                id="darshan-temple-select"
                onClick={() => setDarshanDropdownOpen((open) => !open)}
                className="w-full flex items-center justify-between text-left pl-4 pr-4 py-3.5 rounded-2xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#062421] text-white shadow-sm"
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <span className="text-sm font-serif select-none" style={{ color: "#FFB347" }}>
                    {darshanTemple.symbol}
                  </span>
                  <div className="truncate">
                    <span className="block font-bold truncate text-white text-xs">{darshanTemple.name}</span>
                    <span className="block text-[10px] text-white/55 truncate">{darshanTemple.deity}</span>
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-white/40 flex-shrink-0 transition-transform ${darshanDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {darshanDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setDarshanDropdownOpen(false)} />
                  <div className="absolute left-0 right-0 mt-2 z-30 max-h-80 overflow-y-auto bg-[#062421] rounded-2xl border border-white/10 shadow-2xl p-2 space-y-1">
                    {TEMPLES_LIST.map((templeObj) => (
                      <button
                        key={templeObj.id}
                        type="button"
                        id={`darshan-select-${templeObj.id}`}
                        onClick={() => {
                          setDarshanTempleId(templeObj.id);
                          setDarshanDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between text-left p-3 rounded-xl text-xs transition-all ${
                          darshanTempleId === templeObj.id
                            ? "bg-gradient-to-r from-[#FFB347]/20 to-[#F27D26]/20 border border-[#FFB347] text-white shadow-md font-semibold"
                            : "text-white/75 hover:bg-white/5 hover:text-[#5EEAD4]"
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 truncate">
                          <span className="text-sm font-serif select-none" style={{ color: darshanTempleId === templeObj.id ? "#FFB347" : "#5EEAD4" }}>
                            {templeObj.symbol}
                          </span>
                          <div className="truncate">
                            <span className="block font-bold truncate text-white">{templeObj.name}</span>
                            <span className="block text-[10px] text-white/55 truncate">{templeObj.deity}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Left side: Live Video screen player (cols 7) */}
          <div className="lg:col-span-7 space-y-4">
            <h4 className="font-serif text-lg sm:text-xl font-bold text-white leading-tight">
              {darshanTemple.name} — Live Sanctified Stream
            </h4>

            <div className="aspect-video w-full rounded-2xl bg-[#021816]/95 overflow-hidden relative border border-white/10 shadow-2xl flex items-center justify-center group">
              {/* Deity Photo */}
              <img
                src={darshanTemple.imageUrl}
                alt={`${darshanTemple.name} — ${darshanTemple.deity} Live Darshan`}
                className="absolute inset-0 w-full h-full object-cover select-none brightness-[0.7] contrast-[1.05] transition-transform duration-1000 ease-out group-hover:scale-[1.02]"
                referrerPolicy="no-referrer"
              />

              {/* Ambient sanctuary glow & smoke layers */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/50 pointer-events-none" />
              <div className="absolute inset-0 bg-yellow-600/5 mix-blend-color-burn pointer-events-none" />

              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-lg text-[9px] font-mono text-white/80 flex items-center space-x-1 border border-white/10 z-10">
                <MapPin className="w-3 h-3 text-[#5EEAD4] shrink-0" />
                <span>{darshanInfo.gps}</span>
              </div>
            </div>
          </div>

          {/* Right side: Detailed notes, timing, interactive actions (cols 5) */}
          <div className="lg:col-span-5 flex flex-col text-left space-y-6">
            <div className="space-y-4">
              <div className="text-xs text-white bg-white/5 px-3.5 py-2 rounded-xl border border-white/10">
                <strong className="text-[#5EEAD4]">Presiding Deity:</strong> {darshanTemple.deity}
              </div>

              <div className="p-4 bg-white/5 rounded-2xl border border-white/15 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-white/85 gap-3">
                  <span className="font-bold shrink-0 flex items-center space-x-1"><MapPin className="w-3.5 h-3.5 text-[#5EEAD4]" /><span>GPS Coordinates:</span></span>
                  <span className="text-white/90 font-semibold text-right">{darshanInfo.gps}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-white/85 gap-3">
                  <span className="font-bold shrink-0 flex items-center space-x-1"><Users className="w-3.5 h-3.5 text-[#5EEAD4]" /><span>Est. Devotees:</span></span>
                  <span className="text-[#FFB347] font-semibold text-right">~{darshanInfo.avgDevotees.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-white/85 gap-3">
                  <span className="font-bold shrink-0">Active Aarti Timing:</span>
                  <span className="text-[#FFB347] font-semibold text-right">{darshanInfo.aartiTiming}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-white/85 gap-3">
                  <span className="font-bold shrink-0">Priests Chanting:</span>
                  <span className="text-[#5EEAD4] font-semibold text-right">{darshanInfo.priestsChanting}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-white/85 gap-3">
                  <span className="font-bold shrink-0">Sanctified Quality:</span>
                  <span className="text-emerald-400 font-semibold text-right">{darshanInfo.sanctifiedQuality}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-white/85 gap-3">
                  <span className="font-bold shrink-0">Feed Availability:</span>
                  <span className="text-white/75 font-semibold text-right">{darshanInfo.availability}</span>
                </div>
              </div>

              <p className="text-xs text-white/70 leading-relaxed">
                {darshanInfo.description}
              </p>

              <div className="relative pl-4 border-l-2 border-[#FFB347]/50 py-1">
                <p className="text-sm text-white/95 leading-relaxed font-sans italic">
                  "{darshanInfo.blessing}"
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {onNavigate && (
                <button
                  id="pathway-watch-live"
                  onClick={() => onNavigate("seva")}
                  className="relative w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-[#FF6B00] to-[#FF9900] hover:from-[#FF8C00] hover:to-[#FFB300] text-white font-extrabold text-xs uppercase tracking-widest py-4 px-6 rounded-full transition-all hover:scale-105 border border-[#FFD700]/60 cursor-pointer"
                  style={{
                    boxShadow: "0 0 20px rgba(255, 107, 0, 0.5), 0 0 40px rgba(255, 107, 0, 0.25)",
                    animation: "sponsorAartiPulse 2s ease-in-out infinite",
                  }}
                >
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{ animation: "sponsorAartiRing 2s ease-in-out infinite" }}
                    aria-hidden="true"
                  />
                  <Heart className="w-4 h-4 text-[#FFD700] shrink-0" style={{ animation: "sponsorAartiFlicker 1.5s ease-in-out infinite alternate" }} />
                  <span>Click Here to Participate & Sponsor Aarti</span>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Keyframes for the Sponsor Aarti button pulse — matches the Setu Yatra Challenge button treatment */}
        <style>{`
          @keyframes sponsorAartiPulse {
            0%, 100% { box-shadow: 0 0 20px rgba(255,107,0,0.5), 0 0 40px rgba(255,107,0,0.25); transform: scale(1); }
            50%       { box-shadow: 0 0 32px rgba(255,153,0,0.8), 0 0 64px rgba(255,153,0,0.4); transform: scale(1.02); }
          }
          @keyframes sponsorAartiRing {
            0%, 100% { box-shadow: 0 0 0 0 rgba(255,215,0,0.0); }
            50%       { box-shadow: 0 0 0 6px rgba(255,215,0,0.18); }
          }
          @keyframes sponsorAartiFlicker {
            0%   { opacity: 1;   transform: rotate(-5deg) scale(1.05); }
            100% { opacity: 0.75; transform: rotate(5deg)  scale(0.95); }
          }
        `}</style>

      </div>
    </section>
  );
}
