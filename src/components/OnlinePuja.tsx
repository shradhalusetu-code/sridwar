/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { ON_LINE_PUJAS } from "../data/spiritualData";
import { getPriestByDetails } from "../data/priests";
import {
  ShieldAlert, Heart, Briefcase, Award, TrendingUp, Sparkles,
  CheckCircle2, Video, Clock, ChevronDown, X, UserCircle2
} from "lucide-react";
import SacredIcon from "./SacredIcon";
import { gaCategoryFilter, gaBookNowOpen } from "../utils/analytics";
import { getDiscountedPrice, isDiscountActive, DISCOUNT_TAG } from "../utils/discount";

interface OnlinePujaProps {
  onBookNowClick: (pujaName: string, price: number) => void;
  /** Optional — lets the parent app navigate to the dedicated Priest profile page. */
  onViewPriestProfile?: (priestId: string) => void;
}

// ── Category metadata ──────────────────────────────────────────────────────────
const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; dataIds: string[] }> = {
  all:        { label: "All Holy Pujas",       icon: Sparkles,    dataIds: [] },
  health:     { label: "Health & Longevity",   icon: Heart,       dataIds: [] },
  wealth:     { label: "Wealth & Prosperity",  icon: TrendingUp,  dataIds: [] },
  protection: { label: "Protection & Victory", icon: ShieldAlert, dataIds: [] },
  career:     { label: "Career & Business",    icon: Briefcase,   dataIds: [] },
  marriage:   { label: "Family & Marriage",    icon: Award,       dataIds: [] },
};

// Display order for accordion sections
const ACCORDION_ORDER = ["health", "wealth", "protection", "career", "marriage"] as const;
type AccordionCat = typeof ACCORDION_ORDER[number];

// ── Shared dropdown style ──────────────────────────────────────────────────────
const SELECT_CLS =
  "appearance-none bg-[#092320] border border-white/15 text-white/90 text-xs font-semibold " +
  "rounded-xl px-4 py-3 pr-8 w-full focus:outline-none focus:border-[#FFB347]/60 cursor-pointer " +
  "transition-colors hover:border-white/30";

// ── Utility: graceful duration display ────────────────────────────────────────
function displayDuration(d?: string) {
  return d && d.trim() ? d : "Not specified";
}

export default function OnlinePuja({ onBookNowClick, onViewPriestProfile }: OnlinePujaProps) {
  // ── Filter state ─────────────────────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<"all" | AccordionCat>("all");
  const [selectedTemple,   setSelectedTemple]   = useState<string>("all");
  const [selectedPriest,   setSelectedPriest]   = useState<string>("all");

  // ── Accordion open state — all collapsed by default ──────────────────────────
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    health: false, wealth: false, protection: false, career: false, marriage: false,
  });

  // Tracks which sections have EVER been opened. Puja thumbnail images are only
  // mounted into the DOM once a section has been opened at least once — while a
  // section is still collapsed, none of its <img> tags exist yet, so the browser
  // never requests those images. Previously all ~100 puja thumbnails (many
  // pointing at large, shared temple/deity photos) were mounted immediately and
  // only hidden with CSS (max-height: 0), so they were still downloaded on page
  // load even though nothing was visible yet. This was the main cause of slow
  // loading on this section.
  const [openedOnce, setOpenedOnce] = useState<Record<string, boolean>>({});

  const toggleSection = (cat: string) =>
    setOpenSections(prev => {
      const next = !prev[cat];
      if (next) setOpenedOnce(o => (o[cat] ? o : { ...o, [cat]: true }));
      return { ...prev, [cat]: next };
    });

  // ── Derived dropdown options ──────────────────────────────────────────────────
  const uniqueTemples = useMemo(
    () => Array.from(new Set(ON_LINE_PUJAS.map(p => p.templeName))).filter(Boolean).sort(),
    []
  );
  const uniquePriests = useMemo(
    () => Array.from(new Set(ON_LINE_PUJAS.map(p => p.priestDetails))).filter(Boolean).sort(),
    []
  );

  // ── Combined filter ───────────────────────────────────────────────────────────
  const filteredPujas = useMemo(() => {
    return ON_LINE_PUJAS.filter(p => {
      const catMatch    = selectedCategory === "all" || p.category === selectedCategory;
      const templeMatch = selectedTemple   === "all" || p.templeName    === selectedTemple;
      const priestMatch = selectedPriest   === "all" || p.priestDetails === selectedPriest;
      return catMatch && templeMatch && priestMatch;
    });
  }, [selectedCategory, selectedTemple, selectedPriest]);

  // ── Group filtered pujas by category ─────────────────────────────────────────
  const grouped = useMemo(() => {
    const map: Record<string, typeof filteredPujas> = {};
    for (const cat of ACCORDION_ORDER) map[cat] = [];
    for (const puja of filteredPujas) {
      if (ACCORDION_ORDER.includes(puja.category as AccordionCat)) {
        map[puja.category].push(puja);
      } else {
        // Edge: put other categories (festivals, ancestor, graha_shanti…) into the section
        // most semantically close — for the UI we still display them.
        // They won't appear under "all" tab since they're genuinely other types.
        // We surface them in a catch-all by attaching to whichever tab is "all".
      }
    }
    return map;
  }, [filteredPujas]);

  // Pujas that belong to non-accordion categories (festivals, ancestor, graha_shanti, education)
  const otherPujas = useMemo(() => {
    return filteredPujas.filter(
      p => !ACCORDION_ORDER.includes(p.category as AccordionCat)
    );
  }, [filteredPujas]);

  const isAnyFilterActive =
    selectedCategory !== "all" || selectedTemple !== "all" || selectedPriest !== "all";

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleClearAll = () => {
    setSelectedCategory("all");
    setSelectedTemple("all");
    setSelectedPriest("all");
  };

  const handleCategoryChange = (val: string) => {
    setSelectedCategory(val as any);
    gaCategoryFilter(val, "online_puja");
    // Auto-open matching section when a specific category is chosen from dropdown/tab
    if (val !== "all" && ACCORDION_ORDER.includes(val as AccordionCat)) {
      setOpenSections(prev => ({ ...prev, [val]: true }));
      setOpenedOnce(prev => (prev[val] ? prev : { ...prev, [val]: true }));
    }
  };

  return (
    <section id="online-pujas-section" className="py-20 bg-[#021816] text-white" style={{ paddingTop: `calc(env(safe-area-inset-top, 0px) + 80px)` }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Title Block (unchanged) ─────────────────────────────────────────── */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold text-[#FFB347]/80 tracking-wider font-mono">
            Sacred rites online
          </span>
          <h2 className="text-3xl font-serif font-black text-white tracking-tight mt-1">
            Online Pujas & Vedic Rituals
          </h2>
          <p className="text-xs text-white/70 mt-2">
            Schedule a customized remote offering performed inside ancient temple sanctums.
            All prayers are documented via live video recordings and physical Prasad dispatches.
          </p>
        </div>

        {/* ── Filter Dropdown Bar ─────────────────────────────────────────────── */}
        <div className="mb-8 bg-[#092320]/70 border border-white/10 rounded-2xl p-4 flex flex-col gap-4">

          {/* Three equal-width dropdowns — grid keeps them perfectly aligned on all screen sizes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

            {/* Dropdown 1 – Temple */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono uppercase tracking-widest text-[#FFB347]/70 pl-1">
                Select Temple
              </label>
              <div className="relative">
                <select
                  value={selectedTemple}
                  onChange={e => { setSelectedTemple(e.target.value); }}
                  className={SELECT_CLS}
                >
                  <option value="all">All Temples</option>
                  {uniqueTemples.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#FFB347]/60" />
              </div>
            </div>

            {/* Dropdown 2 – Category */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono uppercase tracking-widest text-[#FFB347]/70 pl-1">
                Select Puja Category
              </label>
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={e => handleCategoryChange(e.target.value)}
                  className={SELECT_CLS}
                >
                  <option value="all">All Holy Pujas</option>
                  <option value="health">Health &amp; Longevity</option>
                  <option value="wealth">Wealth &amp; Prosperity</option>
                  <option value="protection">Protection &amp; Victory</option>
                  <option value="career">Career &amp; Business</option>
                  <option value="marriage">Family &amp; Marriage</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#FFB347]/60" />
              </div>
            </div>

            {/* Dropdown 3 – Priest */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono uppercase tracking-widest text-[#FFB347]/70 pl-1">
                Select Priest
              </label>
              <div className="relative">
                <select
                  value={selectedPriest}
                  onChange={e => { setSelectedPriest(e.target.value); }}
                  className={SELECT_CLS}
                >
                  <option value="all">Any Priest</option>
                  {uniquePriests.map(pr => (
                    <option key={pr} value={pr}>{pr}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#FFB347]/60" />
              </div>
            </div>
          </div>

          {/* Result count + Browse priests link + Clear All on one tidy row */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-[11px] text-white/50 font-mono">
                Showing{" "}
                <span className="text-[#5EEAD4] font-bold">{filteredPujas.length}</span>
                {" "}of{" "}
                <span className="text-white/80 font-bold">{ON_LINE_PUJAS.length}</span>
                {" "}pujas
              </span>
              {onViewPriestProfile && (
                <button
                  type="button"
                  onClick={() => onViewPriestProfile("")}
                  className="text-[10px] text-[#5EEAD4] font-mono underline underline-offset-2 hover:text-[#5EEAD4]/80"
                >
                  Browse all priest profiles →
                </button>
              )}
            </div>
            {isAnyFilterActive && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-bold transition-all shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* ── Category Pill Tabs (unchanged, synced with dropdown) ──────────────── */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {Object.entries(CATEGORY_META)
            .filter(([id]) => id !== "all" ? true : true)
            .map(([id, meta]) => {
              const Icon = meta.icon;
              return (
                <button
                  key={id}
                  id={`puja-tab-${id}`}
                  onClick={() => handleCategoryChange(id)}
                  className={`flex items-center space-x-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer min-h-[40px] ${
                    selectedCategory === id
                      ? "bg-[#FFB347] text-[#021816] shadow-md border border-[#FFB347]"
                      : "bg-[#092320] text-white/80 hover:bg-white/5 hover:text-white border border-white/10"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{meta.label}</span>
                </button>
              );
            })}
        </div>

        {/* ── Empty state ───────────────────────────────────────────────────────── */}
        {filteredPujas.length === 0 && (
          <div className="text-center py-16 text-white/40">
            <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold">No pujas match your filters.</p>
            <button
              onClick={handleClearAll}
              className="mt-4 text-xs text-[#FFB347] underline underline-offset-2"
            >
              Clear filters to see all pujas
            </button>
          </div>
        )}

        {/* ── Accordion Sections ────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {ACCORDION_ORDER.map(cat => {
            const pujas = grouped[cat] ?? [];
            // Hide entire section if filtered to zero results
            if (pujas.length === 0) return null;

            const meta = CATEGORY_META[cat];
            const Icon = meta.icon;
            const isOpen = openSections[cat];

            return (
              <div
                key={cat}
                id={`accordion-section-${cat}`}
                className="bg-[#092320] rounded-2xl border border-white/10 overflow-hidden"
              >
                {/* ── Accordion Header ── */}
                <button
                  onClick={() => toggleSection(cat)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left min-h-[60px] hover:bg-white/3 transition-colors group"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      isOpen ? "bg-[#FFB347] text-[#021816]" : "bg-[#FFB347]/10 text-[#FFB347]"
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block font-serif font-black text-white text-sm leading-tight">
                        {meta.label}
                      </span>
                      <span className="block text-[10px] font-mono text-white/40 mt-0.5">
                        {pujas.length} {pujas.length === 1 ? "puja" : "pujas"} available
                      </span>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-[#FFB347]/70 transition-transform duration-300 shrink-0 ${
                      isOpen ? "rotate-180" : "rotate-0"
                    }`}
                  />
                </button>

                {/* ── Accordion Body with smooth animation ── */}
                <div
                  style={{
                    maxHeight: isOpen ? `${pujas.length * 400}px` : "0px",
                    transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    overflow: "hidden",
                  }}
                >
                  <div className="border-t border-white/8 divide-y divide-white/5">
                    {openedOnce[cat] && pujas.map(puja => {
                      const discountedPrice = getDiscountedPrice(puja.price);
                      return (
                        <div
                          key={puja.id}
                          id={`puja-row-${puja.id}`}
                          className="flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-4 hover:bg-white/3 transition-colors"
                        >
                          {/* Thumbnail image */}
                          <div className="shrink-0 w-full sm:w-16 h-24 sm:h-16 rounded-xl overflow-hidden bg-[#021816]/70 border border-white/8">
                            {puja.imageUrl ? (
                              <img
                                src={puja.imageUrl}
                                alt={puja.name}
                                loading="lazy"
                                decoding="async"
                                width={128}
                                height={128}
                                className="w-full h-full object-cover filter brightness-90"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <SacredIcon
                                type={puja.id as any}
                                size="sm"
                                className="w-full h-full border-none"
                              />
                            )}
                          </div>

                          {/* Left: puja info */}
                          <div className="flex-1 min-w-0 space-y-1.5">

                            {/* Puja name + deity badge */}
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-serif font-black text-white text-sm leading-snug">
                                {puja.name}
                              </h3>
                              <span className="text-[9px] uppercase font-mono tracking-widest text-[#5EEAD4] bg-[#5EEAD4]/10 border border-[#5EEAD4]/25 px-2 py-0.5 rounded-full shrink-0">
                                {puja.deityName}
                              </span>
                            </div>

                            {/* Temple */}
                            <p className="text-[10px] font-mono text-[#FFB347]/70">
                              {puja.templeName}
                            </p>

                            {/* Duration row */}
                            <div className="flex flex-wrap items-center gap-3 pt-0.5">
                              <span className="flex items-center gap-1 text-[10px] text-white/50 font-mono">
                                <Clock className="w-3 h-3 text-[#FFB347]/60 shrink-0" />
                                {displayDuration(puja.duration)}
                              </span>
                            </div>

                            {/* Prasad / Video indicators */}
                            <div className="flex items-center gap-4 text-[9px] font-mono text-white/40 pt-0.5">
                              <span className="flex items-center gap-1">
                                <Video className="w-3 h-3 text-emerald-400 shrink-0" />
                                HD Video
                              </span>
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-[#5EEAD4] shrink-0" />
                                {puja.prasadIncluded ? "Prasad Shipped" : "E-Patrika"}
                              </span>
                            </div>

                            {/* Priest details + link to full profile */}
                            {(() => {
                              const priest = getPriestByDetails(puja.priestDetails);
                              return (
                                <div className="flex items-center gap-1.5 pt-0.5">
                                  <UserCircle2 className="w-3 h-3 text-[#FFB347]/60 shrink-0" />
                                  <span className="text-[9px] font-mono text-white/50 truncate">
                                    {puja.priestDetails}
                                  </span>
                                  {priest && onViewPriestProfile && (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); onViewPriestProfile(priest.id); }}
                                      className="text-[9px] font-bold text-[#5EEAD4] hover:underline shrink-0"
                                    >
                                      View Profile
                                    </button>
                                  )}
                                </div>
                              );
                            })()}
                          </div>

                          {/* Right: price + book button */}
                          <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1.5 shrink-0">
                            {/* Price */}
                            <div className="text-right">
                              {isDiscountActive() ? (
                                <>
                                  <span className="block text-[10px] line-through text-white/30 font-mono">
                                    ₹{puja.price}
                                  </span>
                                  <span className="block text-base font-black text-[#5EEAD4] font-serif leading-tight">
                                    ₹{discountedPrice}
                                  </span>
                                  <span className="block text-[9px] text-[#FFB347] font-mono">
                                    {DISCOUNT_TAG}
                                  </span>
                                </>
                              ) : (
                                <span className="block text-base font-black text-white font-serif">
                                  ₹{puja.price}
                                </span>
                              )}
                            </div>

                            {/* Book button */}
                            <button
                              id={`puja-book-btn-${puja.id}`}
                              onClick={() => { gaBookNowOpen(puja.name, discountedPrice); onBookNowClick(puja.name, discountedPrice); }}
                              className="bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold px-5 py-2.5 rounded-xl text-[10px] tracking-widest uppercase transition-colors shadow cursor-pointer whitespace-nowrap min-h-[40px]"
                            >
                              Book Puja
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {/* ── Other category pujas (festivals / ancestor / graha_shanti / education) ── */}
          {otherPujas.length > 0 && (
            <div
              id="accordion-section-other"
              className="bg-[#092320] rounded-2xl border border-white/10 overflow-hidden"
            >
              <button
                onClick={() => toggleSection("other")}
                className="w-full flex items-center justify-between px-6 py-4 text-left min-h-[60px] hover:bg-white/3 transition-colors"
                aria-expanded={!!openSections["other"]}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    openSections["other"] ? "bg-[#FFB347] text-[#021816]" : "bg-[#FFB347]/10 text-[#FFB347]"
                  }`}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block font-serif font-black text-white text-sm leading-tight">
                      Festivals, Ancestral & Graha Shanti
                    </span>
                    <span className="block text-[10px] font-mono text-white/40 mt-0.5">
                      {otherPujas.length} {otherPujas.length === 1 ? "puja" : "pujas"} available
                    </span>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-[#FFB347]/70 transition-transform duration-300 shrink-0 ${
                    openSections["other"] ? "rotate-180" : "rotate-0"
                  }`}
                />
              </button>

              <div
                style={{
                  maxHeight: openSections["other"] ? `${otherPujas.length * 400}px` : "0px",
                  transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  overflow: "hidden",
                }}
              >
                <div className="border-t border-white/8 divide-y divide-white/5">
                  {openedOnce["other"] && otherPujas.map(puja => {
                    const discountedPrice = getDiscountedPrice(puja.price);
                    return (
                      <div
                        key={puja.id}
                        id={`puja-row-${puja.id}`}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-4 hover:bg-white/3 transition-colors"
                      >
                        {/* Thumbnail image */}
                        <div className="shrink-0 w-full sm:w-16 h-24 sm:h-16 rounded-xl overflow-hidden bg-[#021816]/70 border border-white/8">
                          {puja.imageUrl ? (
                            <img
                              src={puja.imageUrl}
                              alt={puja.name}
                              loading="lazy"
                              decoding="async"
                              width={128}
                              height={128}
                              className="w-full h-full object-cover filter brightness-90"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <SacredIcon
                              type={puja.id as any}
                              size="sm"
                              className="w-full h-full border-none"
                            />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-serif font-black text-white text-sm leading-snug">
                              {puja.name}
                            </h3>
                            <span className="text-[9px] uppercase font-mono tracking-widest text-[#5EEAD4] bg-[#5EEAD4]/10 border border-[#5EEAD4]/25 px-2 py-0.5 rounded-full shrink-0">
                              {puja.deityName}
                            </span>
                          </div>
                          <p className="text-[10px] font-mono text-[#FFB347]/70">{puja.templeName}</p>
                          <div className="flex flex-wrap items-center gap-3 pt-0.5">
                            <span className="flex items-center gap-1 text-[10px] text-white/50 font-mono">
                              <Clock className="w-3 h-3 text-[#FFB347]/60 shrink-0" />
                              {displayDuration(puja.duration)}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-[9px] font-mono text-white/40 pt-0.5">
                            <span className="flex items-center gap-1">
                              <Video className="w-3 h-3 text-emerald-400 shrink-0" />
                              HD Video
                            </span>
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-[#5EEAD4] shrink-0" />
                              {puja.prasadIncluded ? "Prasad Shipped" : "E-Patrika"}
                            </span>
                          </div>

                          {/* Priest details + link to full profile */}
                          {(() => {
                            const priest = getPriestByDetails(puja.priestDetails);
                            return (
                              <div className="flex items-center gap-1.5 pt-0.5">
                                <UserCircle2 className="w-3 h-3 text-[#FFB347]/60 shrink-0" />
                                <span className="text-[9px] font-mono text-white/50 truncate">
                                  {puja.priestDetails}
                                </span>
                                {priest && onViewPriestProfile && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onViewPriestProfile(priest.id); }}
                                    className="text-[9px] font-bold text-[#5EEAD4] hover:underline shrink-0"
                                  >
                                    View Profile
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1.5 shrink-0">
                          <div className="text-right">
                            {isDiscountActive() ? (
                              <>
                                <span className="block text-[10px] line-through text-white/30 font-mono">₹{puja.price}</span>
                                <span className="block text-base font-black text-[#5EEAD4] font-serif leading-tight">₹{discountedPrice}</span>
                                <span className="block text-[9px] text-[#FFB347] font-mono">{DISCOUNT_TAG}</span>
                              </>
                            ) : (
                              <span className="block text-base font-black text-white font-serif">₹{puja.price}</span>
                            )}
                          </div>
                          <button
                            id={`puja-book-btn-${puja.id}`}
                            onClick={() => { gaBookNowOpen(puja.name, discountedPrice); onBookNowClick(puja.name, discountedPrice); }}
                            className="bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold px-5 py-2.5 rounded-xl text-[10px] tracking-widest uppercase transition-colors shadow cursor-pointer whitespace-nowrap min-h-[40px]"
                          >
                            Book Puja
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
