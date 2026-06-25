/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { TEMPLES_LIST } from "../data/temples";
import { Temple } from "../types";
import deityJagannath from "../assets/images/deity_jagannath_1781872890111.jpg";
import { Search, Compass, BookOpen, Clock, Heart, Sparkles, Check, Wifi, WifiOff, MapPin, ChevronRight, ChevronDown } from "lucide-react";
import SacredIcon from "./SacredIcon";

interface TempleExperienceProps {
  onBookPuja: (templeName: string, deityName: string) => void;
  onExploreTemple: (temple: Temple) => void;
  onNavigate?: (page: string) => void;
}

export default function TempleExperience({ onBookPuja, onExploreTemple, onNavigate }: TempleExperienceProps) {
  const [selectedTempleId, setSelectedTempleId] = useState(TEMPLES_LIST[0].id);
  const [searchPhrase, setSearchPhrase] = useState("");
  const [offlineMode, setOfflineMode] = useState(false);
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
    { title: "Select Temple & City", desc: "Choose from 33 verified major temples across the holy sub-continent." },
    { title: "Choose Ritual & Visit", desc: "Select specific Pujas, Aarti sponsorships, or virtual offering bundles." },
    { title: "Add Name & Sankalp", desc: "Specify name, Gotra, birth star, and personal prayer context for the priests." },
    { title: "Receive Video", desc: "Get high-clarity video captures of the Sankalpa and final Aarti chanting." },
    { title: "Blessings & Prasad", desc: "Authentic physical Prasad and holy threads shipped eco-wrapped to your door." },
    { title: "Receive Certificate", desc: "Download the handsigned Darshan Certificate with authentic seals." },
    { title: "Share Feedback", desc: "Submit suggestions to empower global temple community preservation." }
  ];

  return (
    <section 
      id="temple-experience-section" 
      className="py-20 bg-gradient-to-b from-[#021816] to-[#021816] relative text-white"
      style={{ paddingTop: `calc(env(safe-area-inset-top, 0px) + 80px)` }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Block Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6">
          <div className="text-left space-y-2">
            <span className="text-xs font-semibold text-[#FFB347]/80 tracking-wider font-mono">Revered shrines network</span>
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-white tracking-tight">
              Featured Temple Experience
            </h2>
            <p className="text-sm text-white/70 max-w-xl">
              Select or search from 33 of India’s most physically and spiritually potent shrines to start your remote devotion.
            </p>
          </div>

          {/* Interactive Offline Mode Toggle */}
          <div 
            id="offline-connection-toggle"
            className="mt-6 md:mt-0 flex items-center bg-white/5 p-2.5 rounded-2xl shadow-sm border border-white/10"
          >
            <div className="flex flex-col mr-4 text-right">
              <span className="text-xs font-bold text-white">Pilgrim Offline Mode</span>
              <span className="text-[10px] text-white/55 font-mono">
                {offlineMode ? "Active: Cached Local Scriptures" : "Connected: Cloud Streams Active"}
              </span>
            </div>
            <button
               id="toggle-offline-mode"
               type="button"
               onClick={() => {
                 setOfflineMode(!offlineMode);
               }}
               className={`p-2.5 rounded-xl transition-all ${
                 offlineMode 
                   ? "bg-amber-500/20 text-amber-300 animate-pulse border border-amber-300/40" 
                   : "bg-white/5 text-[#5EEAD4] border border-white/10 hover:bg-white/10"
               }`}
               title="Toggle Offline Mode for remote mountain pilgrimages"
            >
              {offlineMode ? <WifiOff className="w-5 h-5" /> : <Wifi className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Search Console & Droplist */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Temple Navigation Drawer (cols 4) */}
          <div className="lg:col-span-4 flex flex-col space-y-4 h-full">
            
            {/* Search Input */}
            <div className="relative">
              <input
                id="temple-search"
                type="text"
                placeholder="Search 33 Holy Temples..."
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
              className="hidden lg:block flex-grow lg:h-0 overflow-y-auto bg-[#092320]/80 rounded-2xl border border-white/10 p-2 space-y-1 shadow-sm min-h-[380px]"
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

            {/* Offline Alert representation if active */}
            {offlineMode && (
              <div id="offline-mode-alert" className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-xs text-amber-200 flex space-x-2 animate-fadeIn text-left">
                <WifiOff className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-left">
                  <span className="font-bold block text-white">Offline Mode Activated</span>
                  <span className="text-white/70 block mt-0.5">
                    Sri Dwar has pre-fetched the full catalog and holy specifications of these 33 shrines so you can continue to draft Pujas, read history, and chant mantras under zero network conditions. Forms will automatically sync once your connection is restored.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Active Temple Spotlight Panel Showcase (cols 8) */}
          <div id="temple-carousel" className="lg:col-span-8 h-full">
            <div className="w-full h-full bg-[#092320] rounded-3xl shadow-xl overflow-hidden border border-white/10 grid grid-cols-1 md:grid-cols-12 min-h-[460px]">
                            {/* Left Column: Image (cols 5) */}
              <div className="md:col-span-5 relative min-h-[300px] md:min-h-full bg-[#021816] border-r border-white/10 overflow-hidden group">
                {/* Deity Photo */}
                <img
                  src={selectedTemple.imageUrl}
                  alt={`${selectedTemple.name} Deity`}
                  referrerPolicy="no-referrer"
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
              </div>

              {/* Right Column: Complete Specifications (cols 7) */}
              <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between text-left">
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

                  <p className="text-xs text-white/70 leading-relaxed">
                    {selectedTemple.story}
                  </p>

                  <div className="space-y-2 text-left">
                    <span className="block text-xs font-bold text-white/80">Sacred timings:</span>
                    <div className="flex items-center space-x-1.5 text-xs text-white/75">
                      <Clock className="w-4 h-4 text-[#5EEAD4]" />
                      <span>{selectedTemple.timings}</span>
                    </div>
                  </div>

                  {/* Available Rituals */}
                  <div className="space-y-1.5">
                    <span className="block text-xs font-bold text-white/80">Sample rituals & offerings:</span>
                    <div className="flex flex-wrap gap-2">
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
                </div>

                {/* Engagement CTAs */}
                <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row gap-3">
                  <button
                    id={`spotlight-book-${selectedTemple.id}`}
                    onClick={() => onBookPuja(selectedTemple.name, selectedTemple.deity)}
                    className="flex-1 bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold py-3.5 px-5 rounded-xl text-xs transition-all tracking-widest uppercase shadow-[0_0_15px_rgba(255,179,71,0.35)]"
                  >
                    BOOK PUJA NOW
                  </button>
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

        {/* VIRTUAL LIVE DARSHAN ROOM SECTION */}
        <div id="live-darshan-section" className="mt-6 pt-6 border-t border-white/10">
          <div
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#092320]/85 rounded-3xl border border-white/10 p-6 md:p-10 shadow-2xl relative overflow-hidden backdrop-blur-md"
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

            {/* Left side: Live Video screen player (cols 7) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-[#5EEAD4] rounded-full animate-ping" />
                <span className="text-xs font-mono text-[#5EEAD4] tracking-wider uppercase font-bold">
                  Virtual Live Darshan Room
                </span>
                <span className="bg-red-600/20 text-red-400 border border-red-500/30 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md animate-pulse">
                  Live Stream
                </span>
              </div>

              <h3 className="font-serif text-2xl sm:text-3xl font-black text-white leading-tight">
                Jagannath Mandir Live Sanctified Stream
              </h3>

              <div className="aspect-video w-full rounded-2xl bg-[#021816]/95 overflow-hidden relative border border-white/10 shadow-2xl flex items-center justify-center group">
                {/* Deity Photo of Jagannath, Balabhadra and Subhadra */}
                <img
                  src={deityJagannath}
                  alt="Lord Jagannath, Balabhadra, and Devi Subhadra Live Darshan"
                  className="absolute inset-0 w-full h-full object-cover select-none brightness-[0.85] contrast-[1.05] transition-transform duration-1000 ease-out group-hover:scale-[1.02]"
                  referrerPolicy="no-referrer"
                />

                {/* Ambient sanctuary glow & smoke layers */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/35 pointer-events-none" />
                <div className="absolute inset-0 bg-yellow-600/5 mix-blend-color-burn pointer-events-none" />

                {/* High tech/mystic gold security scanning/overlay effect */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.18)_50%),_linear-gradient(90deg,_rgba(255,179,71,0.02),_rgba(94,234,212,0.01),_rgba(255,179,71,0.02))] bg-[length:100%_4px,_6px_100%] pointer-events-none opacity-40" />

                {/* Active live feed diagnostics label */}
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-lg text-[9px] font-mono text-[#5EEAD4] flex items-center space-x-1.5 border border-white/10 z-10">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="font-bold">LIVEDARSHAN_PURI_CAM_A</span>
                </div>

                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-lg text-[9px] font-mono text-white/80 flex items-center space-x-1 border border-white/10 z-10">
                  <span>GPS: 19.8049° N, 85.8178° E</span>
                </div>
                
                {/* Overlay live indicator bar */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex items-end justify-between p-4 z-10 pointer-events-none">
                  <div className="flex items-center space-x-2 text-white">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping mr-1" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">12,492 Devotees Connected</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#5EEAD4] bg-[#021816]/80 px-2 py-1 rounded border border-[#5EEAD4]/20">1080p Sanctified Feed</span>
                </div>
              </div>
            </div>

            {/* Right side: Detailed notes, timing, interactive actions (cols 5) */}
            <div className="lg:col-span-5 p-2 flex flex-col justify-between text-left space-y-6 h-full">
              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/15 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-white/85">
                    <span className="font-bold">Active Aarti Timing:</span>
                    <span className="text-[#FFB347] font-semibold">Evening Sandhya Aarti (Sringar Alati)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/85">
                    <span className="font-bold">Priests Chanting:</span>
                    <span className="text-[#5EEAD4] font-semibold">Verified Shri Jagannath Sevayats</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/85">
                    <span className="font-bold">Sanctified Quality:</span>
                    <span className="text-emerald-400 font-semibold">Real-Time Pratyaksha Darshan</span>
                  </div>
                </div>

                <div className="relative pl-4 border-l-2 border-[#FFB347]/50 py-1">
                  <p className="text-sm text-white/95 leading-relaxed font-sans italic">
                    "May the light of Lord Jagannath purify your energy field, wipe away all worldly anxieties, and guide your path in total spiritual surrender."
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-[11px] font-mono text-[#FFB347] flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block mr-1.5" />
                  <span>State: Safe Real-time Tunneling Active</span>
                </div>

                {onNavigate && (
                  <button 
                    id="pathway-watch-live"
                    onClick={() => onNavigate("seva")} 
                    className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-[#FFB347] to-[#e08e2f] text-[#021816] font-bold text-xs uppercase tracking-widest py-4 px-6 rounded-xl shadow-lg transition-transform hover:scale-[1.01] hover:opacity-95 cursor-pointer"
                  >
                    <span>Click Here to Participate & Sponsor Aarti</span>
                    <ChevronRight className="w-4 h-4 shrink-0" />
                  </button>
                )}
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
              From initiating a sacred vow (Sankalp) near your screen, to receiving certified physical Prasad from India's greatest shrines.
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
