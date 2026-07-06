/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { TEMPLES_LIST } from "../data/temples";
import { Temple } from "../types";
import { Search, Clock, Sparkles, MapPin, ChevronDown, Sunrise, Sun, Sunset, Navigation, UserCircle2 } from "lucide-react";

interface TempleExperienceProps {
  onBookPuja: (templeName: string, deityName: string) => void;
  onExploreTemple: (temple: Temple) => void;
  onNavigate?: (page: string) => void;
}

export default function TempleExperience({ onBookPuja, onExploreTemple, onNavigate }: TempleExperienceProps) {
  const [selectedTempleId, setSelectedTempleId] = useState(TEMPLES_LIST[0].id);
  const [searchPhrase, setSearchPhrase] = useState("");
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);

  const selectedTemple = TEMPLES_LIST.find((t) => t.id === selectedTempleId) || TEMPLES_LIST[0];

  // Filter temples based on search phrase
  const filteredTemples = TEMPLES_LIST.filter(
    (t) =>
      t.name.toLowerCase().includes(searchPhrase.toLowerCase()) ||
      t.city.toLowerCase().includes(searchPhrase.toLowerCase()) ||
      t.state.toLowerCase().includes(searchPhrase.toLowerCase()) ||
      t.deity.toLowerCase().includes(searchPhrase.toLowerCase())
  );

  const steps = [
    { title: "Select Temple & City", desc: `Choose from ${TEMPLES_LIST.length} major temples across the holy sub-continent.` },
    { title: "Choose Ritual & Visit", desc: "Select specific Pujas, Aarti sponsorships, or virtual offering bundles." },
    { title: "Add Name & Sankalp", desc: "Specify name, Gotra, birth star, and personal prayer context for the priests." },
    { title: "Receive Video", desc: "Get high-clarity video captures of the Sankalpa and final Aarti chanting." },
    { title: "Blessings & Prasad", desc: "Physical Prasad and holy threads shipped eco-wrapped to your door." },
    { title: "Receive Certificate", desc: "Download the handsigned Darshan Certificate with temple seals." },
    { title: "Share Feedback", desc: "Submit suggestions to empower global temple community preservation." }
  ];

  const formatCoordinate = (value: number, axis: "lat" | "lng") => {
    const direction = axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
    return `${Math.abs(value).toFixed(4)}° ${direction}`;
  };

  return (
    <section 
      id="temple-experience-section" 
      className="pb-8 sm:pb-10 pt-8 sm:pt-10 bg-gradient-to-b from-[#021816] to-[#021816] relative text-white scroll-mt-20"
    >
      {/* Keyframes for the pop-style CTA buttons — matches the Setu Yatra Challenge button treatment */}
      <style>{`
        @keyframes templeCtaPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255,107,0,0.5), 0 0 40px rgba(255,107,0,0.25); transform: scale(1); }
          50%       { box-shadow: 0 0 32px rgba(255,153,0,0.8), 0 0 64px rgba(255,153,0,0.4); transform: scale(1.02); }
        }
        @keyframes templeCtaRing {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,215,0,0.0); }
          50%       { box-shadow: 0 0 0 6px rgba(255,215,0,0.18); }
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Block Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6">
          <div className="text-left space-y-2">
            <span className="text-xs font-semibold text-[#FFB347]/80 tracking-wider font-mono">Revered shrines network</span>
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-white tracking-tight">
              Featured Temple Experience
            </h2>
            <p className="text-sm text-white/70 max-w-xl">
              Explore India's most divine shrines and begin your devotional experience with a single selection.
            </p>
            {onNavigate && (
              <button
                id="header-watch-live-darshan"
                onClick={() => onNavigate("live-darshan")}
                className="inline-flex items-center space-x-2 bg-white/5 hover:bg-white/10 border border-amber-400/30 text-amber-300 text-xs font-bold px-3.5 py-2 rounded-full transition-all"
              >
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                <span>Watch Live Darshan</span>
                <ChevronRightIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Search Console & Droplist */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Temple Navigation Drawer (cols 4) */}
          <div className="lg:col-span-3 flex flex-col space-y-4 h-full">
            
            {/* Search Input */}
            <div className="relative">
              <input
                id="temple-search"
                type="text"
                placeholder="Search Holy Temples..."
                value={searchPhrase}
                onChange={(e) => setSearchPhrase(e.target.value)}
                className="w-full text-xs pl-10 pr-4 py-3 rounded-2xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#092320] text-white placeholder-white/45 shadow-sm"
              />
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-white/40" />
            </div>

            {/* Mobile/Tablet Temple Dropdown - replaces the long scrollable list on smaller screens */}
            <div className="relative lg:hidden">
              <button
                type="button"
                id="temple-select-mobile"
                onClick={() => setMobileDropdownOpen((open) => !open)}
                className="w-full flex items-center justify-between text-left pl-4 pr-4 py-3.5 rounded-2xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#092320] text-white shadow-sm"
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <span className="text-sm font-serif select-none" style={{ color: "#FFB347" }}>
                    {selectedTemple.symbol}
                  </span>
                  <div className="truncate">
                    <span className="block font-bold truncate text-white text-xs">{selectedTemple.name}</span>
                    <span className="block text-[10px] text-white/55 truncate">
                      {selectedTemple.city}, {selectedTemple.state}
                    </span>
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-white/40 flex-shrink-0 transition-transform ${mobileDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {mobileDropdownOpen && (
                <>
                  {/* Invisible backdrop closes the dropdown on outside tap */}
                  <div className="fixed inset-0 z-20" onClick={() => setMobileDropdownOpen(false)} />

                  <div className="absolute left-0 right-0 mt-2 z-30 max-h-72 overflow-y-auto bg-[#092320] rounded-2xl border border-white/10 shadow-2xl p-2 space-y-1">
                    {filteredTemples.length > 0 ? (
                      filteredTemples.map((templeObj) => (
                        <button
                          key={templeObj.id}
                          type="button"
                          onClick={() => {
                            setSelectedTempleId(templeObj.id);
                            setMobileDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between text-left p-3 rounded-xl text-xs transition-all ${
                            selectedTempleId === templeObj.id
                              ? "bg-gradient-to-r from-[#FFB347]/20 to-[#F27D26]/20 border border-[#FFB347] text-white shadow-md font-semibold"
                              : "text-white/75 hover:bg-white/5 hover:text-[#5EEAD4]"
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 truncate">
                            <span className="text-sm font-serif select-none" style={{ color: selectedTempleId === templeObj.id ? "#FFB347" : "#5EEAD4" }}>
                              {templeObj.symbol}
                            </span>
                            <div className="truncate">
                              <span className="block font-bold truncate text-white">{templeObj.name}</span>
                              <span className="block text-[10px] text-white/55 truncate">
                                {templeObj.city}, {templeObj.state}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="text-center text-xs text-white/45 py-6">No holy shrines match your query.</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* List selector (desktop / large screens only) */}
            <div 
              id="temple-list-drawer"
              className="hidden lg:block flex-grow lg:h-0 overflow-y-auto bg-[#092320]/80 rounded-2xl border border-white/10 p-2 space-y-1 shadow-sm min-h-[320px]"
              style={{ overscrollBehavior: 'contain', touchAction: 'pan-y' }}
            >
              {filteredTemples.length > 0 ? (
                filteredTemples.map((templeObj) => (
                  <button
                    key={templeObj.id}
                    id={`select-temple-${templeObj.id}`}
                    onClick={() => setSelectedTempleId(templeObj.id)}
                    className={`w-full flex items-center justify-between text-left p-3 rounded-xl text-xs transition-all ${
                      selectedTempleId === templeObj.id
                        ? "bg-gradient-to-r from-[#FFB347]/20 to-[#F27D26]/20 border border-[#FFB347] text-white shadow-md font-semibold"
                        : "text-white/75 hover:bg-white/5 hover:text-[#5EEAD4]"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <span className="text-sm font-serif select-none" style={{ color: selectedTempleId === templeObj.id ? "#FFB347" : "#5EEAD4" }}>
                        {templeObj.symbol}
                      </span>
                      <div className="truncate">
                        <span className="block font-bold truncate text-white">{templeObj.name}</span>
                        <span className="block text-[10px] text-white/55 truncate">
                          {templeObj.city}, {templeObj.state}
                        </span>
                      </div>
                    </div>
                    <ChevronRightIcon className="w-3.5 h-3.5 opacity-60" />
                  </button>
                ))
              ) : (
                <p className="text-center text-xs text-white/45 py-6">No holy shrines match your query.</p>
              )}
            </div>
          </div>

          {/* Active Temple Spotlight Panel Showcase (cols 8) */}
          <div id="temple-carousel" className="lg:col-span-9 h-full">
            <div className="w-full h-full bg-[#092320] rounded-3xl shadow-xl overflow-hidden border border-white/10 grid grid-cols-1 md:grid-cols-12 md:h-[560px]">
                            {/* Left Column: Image (cols 6) */}
              <div className="md:col-span-6 relative min-h-[300px] md:h-full bg-[#021816] border-r border-white/10 overflow-hidden group">
                {/* Deity Photo */}
                <img
                  src={selectedTemple.imageUrl}
                  alt={`${selectedTemple.name} Deity`}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover select-none brightness-95 contrast-[1.05] transition-transform duration-700 ease-out group-hover:scale-105"
                />

                {/* Ambient Deep Dark Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#021816]/95 via-transparent to-[#021816]/40" />

                {/* Symbol Float Badge */}
                <div className="absolute top-4 left-4 w-11 h-11 rounded-xl bg-[#021816]/90 backdrop-blur shadow-lg flex items-center justify-center border border-white/10 transition-all group-hover:border-[#FFB347]/40">
                  <span className="text-lg font-serif text-[#FFB347]">{selectedTemple.symbol}</span>
                </div>

                {/* State Tag */}
                <div className="absolute bottom-4 left-4 bg-[#021816]/95 backdrop-blur-md border border-white/15 text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-full flex items-center space-x-1.5 shadow-md">
                  <MapPin className="w-3 h-3 text-[#FFB347]" />
                  <span>{selectedTemple.state}, India</span>
                </div>

                {/* GPS Coordinates Tag */}
                <div className="absolute bottom-4 right-4 bg-[#021816]/95 backdrop-blur-md border border-white/15 text-white/90 text-[9px] font-mono font-semibold px-2.5 py-1.5 rounded-full flex items-center space-x-1.5 shadow-md">
                  <Navigation className="w-3 h-3 text-[#5EEAD4]" />
                  <span>
                    {formatCoordinate(selectedTemple.coordinates.lat, "lat")}, {formatCoordinate(selectedTemple.coordinates.lng, "lng")}
                  </span>
                </div>
              </div>

              {/* Right Column: Complete Specifications (cols 7) */}
              <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between text-left md:h-full md:overflow-y-auto no-scrollbar">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-[#FFB347] fill-[#FFB347]" />
                    <span className="text-xs font-bold text-[#5EEAD4] uppercase tracking-wider font-mono">Spotlight Shrine</span>
                  </div>

                  <h3 className="text-2xl font-serif font-black text-white leading-tight">
                    {selectedTemple.name}
                  </h3>

                  <div className="text-xs text-white bg-white/5 px-3.5 py-2 rounded-xl border border-white/10">
                    <strong className="text-[#5EEAD4]">Presiding Deity:</strong> {selectedTemple.deity}
                  </div>

                  {/* Holy Pilgrimage Narrative & History */}
                  <div className="space-y-1.5">
                    <span className="block text-xs font-bold text-white/80">Holy Pilgrimage Narrative & History:</span>
                    <p className="text-xs text-white/70 leading-relaxed max-h-40 overflow-y-auto pr-1">
                      {selectedTemple.history}
                    </p>
                  </div>

                  {/* Aarti Timings */}
                  <div className="space-y-2 text-left">
                    <span className="block text-xs font-bold text-white/80">Aarti timings:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="flex items-start space-x-1.5 text-[11px] text-white/75 bg-white/5 border border-white/10 rounded-lg px-2.5 py-2">
                        <Sunrise className="w-3.5 h-3.5 text-[#FFB347] flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="block font-bold text-white/85">Morning</span>
                          <span className="block text-white/65">{selectedTemple.aartiTimings.morning}</span>
                        </div>
                      </div>
                      <div className="flex items-start space-x-1.5 text-[11px] text-white/75 bg-white/5 border border-white/10 rounded-lg px-2.5 py-2">
                        <Sun className="w-3.5 h-3.5 text-[#FFB347] flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="block font-bold text-white/85">Afternoon</span>
                          <span className="block text-white/65">{selectedTemple.aartiTimings.afternoon}</span>
                        </div>
                      </div>
                      <div className="flex items-start space-x-1.5 text-[11px] text-white/75 bg-white/5 border border-white/10 rounded-lg px-2.5 py-2">
                        <Sunset className="w-3.5 h-3.5 text-[#5EEAD4] flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="block font-bold text-white/85">Evening</span>
                          <span className="block text-white/65">{selectedTemple.aartiTimings.evening}</span>
                        </div>
                      </div>
                    </div>
                    {selectedTemple.aartiTimings.note && (
                      <p className="text-[10px] text-white/45 italic flex items-start space-x-1">
                        <Clock className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        <span>{selectedTemple.aartiTimings.note}</span>
                      </p>
                    )}
                  </div>

                  {/* Authorized Rituals */}
                  <div className="space-y-1.5">
                    <span className="block text-xs font-bold text-white/80">Authorized rituals:</span>
                    <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1">
                      {selectedTemple.rituals.map((ritual, idx) => (
                        <span
                          key={idx}
                          className="bg-white/5 text-white/80 text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-white/15"
                        >
                          {ritual}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Sample Rituals & Offerings */}
                  <div className="space-y-1.5">
                    <span className="block text-xs font-bold text-white/80">Sample rituals & offerings:</span>
                    <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1">
                      {selectedTemple.sampleOfferings.map((offering, idx) => (
                        <span
                          key={idx}
                          className="bg-[#FFB347]/10 text-[#FFB347] text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-[#FFB347]/25"
                        >
                          {offering}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Priest Information */}
                  <div className="flex items-start space-x-2 text-xs text-white/70 bg-white/5 px-3.5 py-2.5 rounded-xl border border-white/10">
                    <UserCircle2 className="w-4 h-4 text-[#5EEAD4] flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="block font-bold text-white/85 mb-0.5">Priest information:</span>
                      <span className="block text-white/65 leading-relaxed">{selectedTemple.priestInfo}</span>
                    </div>
                  </div>
                </div>

                {/* Engagement CTAs */}
                <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row gap-3">
                  <button
                    id={`spotlight-book-${selectedTemple.id}`}
                    onClick={() => onBookPuja(selectedTemple.name, selectedTemple.deity)}
                    className="relative flex-1 bg-gradient-to-r from-[#FF6B00] to-[#FF9900] hover:from-[#FF8C00] hover:to-[#FFB300] text-white font-extrabold py-3.5 px-5 rounded-xl text-xs transition-all hover:scale-105 tracking-widest uppercase border border-[#FFD700]/60 cursor-pointer"
                    style={{
                      boxShadow: "0 0 20px rgba(255, 107, 0, 0.5), 0 0 40px rgba(255, 107, 0, 0.25)",
                      animation: "templeCtaPulse 2s ease-in-out infinite",
                    }}
                  >
                    <span
                      className="absolute inset-0 rounded-xl pointer-events-none"
                      style={{ animation: "templeCtaRing 2s ease-in-out infinite" }}
                      aria-hidden="true"
                    />
                    BOOK RITES NOW
                  </button>
                  {onNavigate && (
                    <button
                      id={`spotlight-priest-directory-${selectedTemple.id}`}
                      onClick={() => onNavigate("priests")}
                      className="relative flex-1 bg-gradient-to-r from-[#0F766E] to-[#14B8A6] hover:from-[#0D9488] hover:to-[#2DD4BF] text-white font-extrabold py-3.5 px-5 rounded-xl text-xs transition-all hover:scale-105 tracking-widest uppercase border border-[#5EEAD4]/60 cursor-pointer"
                      style={{
                        boxShadow: "0 0 20px rgba(20, 184, 166, 0.5), 0 0 40px rgba(20, 184, 166, 0.25)",
                        animation: "templeCtaPulse 2s ease-in-out infinite",
                      }}
                    >
                      <span
                        className="absolute inset-0 rounded-xl pointer-events-none"
                        style={{ animation: "templeCtaRing 2s ease-in-out infinite" }}
                        aria-hidden="true"
                      />
                      PRIEST DIRECTORY
                    </button>
                  )}
                  <button
                    id={`spotlight-explore-${selectedTemple.id}`}
                    onClick={() => onExploreTemple(selectedTemple)}
                    className="flex-1 border border-white/10 text-white hover:bg-white/5 font-bold py-3.5 px-5 rounded-xl text-xs transition-all tracking-widest uppercase"
                  >
                    EXPLORE HISTORY
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* HOW IT WORKS SECTION (7-step journey) */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="text-xs font-semibold text-[#FFB347]/80 tracking-wider font-mono">Dharmic pathways</span>
            <h2 className="text-3xl font-serif font-black text-white tracking-tight mt-1">
              Your 7-Step Spiritual Journey
            </h2>
            <p className="text-xs text-white/70 mt-2">
              From initiating a sacred vow (Sankalp) near your screen, to receiving physical Prasad from India's greatest shrines.
            </p>
          </div>

          <div className="relative" id="journey-timeline">
            {/* Connector line for desktop - placed behind the cards with z-0 */}
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-[#5EEAD4]/20 via-[#FFB347]/50 to-[#5EEAD4]/20 hidden lg:block -translate-y-1/2 z-0" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-6 relative">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  id={`journey-step-${idx}`}
                  className="bg-[#062421] p-5 rounded-2xl border border-white/10 text-left relative z-10 shadow-sm hover:shadow-md hover:border-[#5EEAD4]/30 transition-all group scale-100 hover:scale-103"
                >
                  {/* Glowing step identifier */}
                  <div className="w-9 h-9 rounded-full bg-[#021816] text-[#FFB347] border border-[#FFB347] flex items-center justify-center font-bold font-serif text-sm absolute -top-4 left-4 shadow-md group-hover:bg-[#FFB347] group-hover:text-[#021816] transition-colors">
                    {idx + 1}
                  </div>

                  <h4 className="font-serif text-sm font-bold text-white mt-2 mb-1.5 text-left">
                    {step.title}
                  </h4>
                  <p className="text-[11px] text-white/60 leading-relaxed font-sans text-left">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

function ChevronRightIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
