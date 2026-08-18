/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useRef, ElementType } from "react";
import {
  MapPin, Award, Star, Users, Languages,
  ArrowLeft, Search, X, BookOpenCheck, MessageCircle,
  HeartHandshake, Eye, Landmark
} from "lucide-react";
import { PRIEST_PROFILES } from "../data/priests";
import { PriestProfile } from "../types";

interface PriestSectionProps {
  /** Optional: pre-select a priest (e.g. coming from the Online Puja priest filter) */
  initialPriestId?: string | null;
  onBack?: () => void;
}

// ── "What to look for" guidance content ──────────────────────────────────────
const GUIDANCE_POINTS: { icon: ElementType; title: string; desc: string }[] = [
  {
    icon: Award,
    title: "Years of Experience",
    desc: "Prefer priests with a proven track record performing the specific puja or ritual you need — more years generally means deeper command of Vedic procedure and timing (muhurat)."
  },
  {
    icon: BookOpenCheck,
    title: "Puja Expertise",
    desc: "Match the priest's specialization (health, wealth, protection, marriage, ancestral rites, etc.) with your actual need — a priest skilled in Graha Shanti may differ from one specializing in Vivah Sanskar."
  },
  {
    icon: MapPin,
    title: "Current City / Temple Location",
    desc: "Check which temple and city the priest is currently serving in — this affects ritual tradition, regional customs, and how Prasad or certificates will be dispatched to you."
  },
  {
    icon: Star,
    title: "Devotee Reviews & Ratings",
    desc: "Read ratings and feedback from other devotees who have booked a puja with that priest before, to gauge reliability, punctuality, and the quality of guidance offered."
  },
  {
    icon: MessageCircle,
    title: "Communication & Language",
    desc: "Choose a priest who can explain rituals, Sankalpa, and remedies clearly in a language you're comfortable with — good communication builds trust during remote/online pujas."
  },
  {
    icon: HeartHandshake,
    title: "Dharmic Knowledge & Advice Areas",
    desc: "Beyond performing rituals, a good priest should be able to offer grounded, scripture-based advice — not superstition — on the specific life area you're seeking blessings for."
  },
];

function StarRating({ rating }: { rating?: number }) {
  // `rating` is intentionally optional (see PriestProfile in types.ts) so we
  // never fabricate a score for a priest without real, aggregated devotee
  // reviews. Render nothing rather than crashing on `undefined.toFixed()`.
  if (rating == null) return null;
  return (
    <span className="flex items-center gap-1 text-[#FFB347] text-xs font-bold">
      <Star className="w-3.5 h-3.5 fill-[#FFB347]" />
      {rating.toFixed(1)}
    </span>
  );
}

// Priests are shown in groups of 30 (Meet Our Priests currently lists 101,
// so 4 groups) — one group visible at a time, with Prev/Next group
// navigation below, instead of every profile mounted at once or endlessly
// appended via "Show More". Search/filter always run against the FULL
// directory (not just the current group) and jump back to group 1 of
// whatever matches, so a search never appears to silently miss someone who
// simply isn't in the currently-viewed group.
const PRIEST_BATCH_SIZE = 30;

export default function PriestSection({ initialPriestId = null, onBack }: PriestSectionProps) {
  const [selectedPriestId, setSelectedPriestId] = useState<string | null>(initialPriestId);
  const [search, setSearch] = useState("");
  const [expertiseFilter, setExpertiseFilter] = useState<string>("all");
  const [priestGroupIndex, setPriestGroupIndex] = useState(0);
  // Anchor used to scroll the freshly-shown section (detail or listing) into
  // view starting at its very top, so the heading / priest name is the first
  // thing visible — instead of leaving the user's previous scroll position
  // in place, which could land them mid-section.
  const topAnchorRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    topAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedPriestId]);

  const allExpertiseTags = useMemo(() => {
    const s = new Set<string>();
    PRIEST_PROFILES.forEach(p => p.pujaExpertise.forEach(e => s.add(e)));
    return Array.from(s).sort();
  }, []);

  const filteredPriests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return PRIEST_PROFILES.filter(p => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.currentCity.toLowerCase().includes(q) ||
        p.templesAssociated.some(t => t.toLowerCase().includes(q));
      const matchesExpertise =
        expertiseFilter === "all" || p.pujaExpertise.includes(expertiseFilter);
      return matchesSearch && matchesExpertise;
    });
  }, [search, expertiseFilter]);

  // Reset back to group 1 whenever the devotee changes what they're
  // searching/filtering for — otherwise a deeper group index could point
  // past the end of a narrower (smaller) result set, or land the devotee
  // on an empty/wrong group after the results underneath them changed.
  useEffect(() => {
    setPriestGroupIndex(0);
  }, [search, expertiseFilter]);

  const totalPriestGroups = Math.max(1, Math.ceil(filteredPriests.length / PRIEST_BATCH_SIZE));

  // Clamp defensively in case filteredPriests shrinks in a way the effect
  // above hasn't caught yet — never lets the group index point past the
  // last real group.
  const clampedGroupIndex = Math.min(priestGroupIndex, totalPriestGroups - 1);

  const visiblePriests = useMemo(
    () => filteredPriests.slice(
      clampedGroupIndex * PRIEST_BATCH_SIZE,
      (clampedGroupIndex + 1) * PRIEST_BATCH_SIZE
    ),
    [filteredPriests, clampedGroupIndex]
  );

  const selectedPriest: PriestProfile | undefined = useMemo(
    () => PRIEST_PROFILES.find(p => p.id === selectedPriestId),
    [selectedPriestId]
  );

  // ── DETAIL VIEW ──────────────────────────────────────────────────────────
  if (selectedPriest) {
    const p = selectedPriest;
    return (
      <section
        ref={topAnchorRef}
        id="priest-detail-section"
        className="py-16 bg-[#021816] text-white min-h-[60vh]"
        style={{ paddingTop: `calc(var(--safe-area-inset-top, env(safe-area-inset-top, 24px)) + 96px)` }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => setSelectedPriestId(null)}
            className="flex items-center gap-2 text-xs font-bold text-white/60 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Priest Directory
          </button>

          <div className="bg-[#062421] border border-white/10 rounded-3xl p-6 sm:p-10 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-serif font-black text-white">{p.name}</h1>
                </div>
                <p className="flex items-center gap-1.5 text-sm text-[#FFB347]/80 font-mono mt-2">
                  <MapPin className="w-3.5 h-3.5" />
                  {p.currentCity}, {p.currentState}
                </p>
              </div>
              <div className="text-right">
                <StarRating rating={p.rating} />
              </div>
            </div>

            {/* Local highlight strip — what makes this priest/temple unique */}
            {(p as PriestProfile & { localHighlight?: string }).localHighlight && (
              <div className="flex items-start gap-3 bg-[#FFB347]/8 border border-[#FFB347]/25 rounded-2xl p-4 mb-8">
                <Landmark className="w-4 h-4 text-[#FFB347] shrink-0 mt-0.5" />
                <p className="text-xs text-[#FFB347]/90 leading-relaxed">
                  {(p as PriestProfile & { localHighlight?: string }).localHighlight}
                </p>
              </div>
            )}

            {/* Key stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <Stat label="Years of Experience" value={`${p.yearsExperience} yrs`} icon={Award} />
              <Stat label="Helping Devotees" value={`${p.yearsHelpingDevotees} yrs`} icon={Users} />
              <Stat label="Languages" value={p.languagesSpoken.length.toString()} icon={Languages} />
              <Stat label="Pujas Offered" value={p.associatedPujaIds.length.toString()} icon={BookOpenCheck} />
            </div>

            {/* Bio — the priest's real experience, not a fabricated booking history */}
            <p className="text-sm text-white/70 leading-relaxed mb-3">{p.bio}</p>
            <p className="text-xs text-white/50 leading-relaxed mb-8 italic">
              Beyond {p.templesAssociated[0]}, {p.name.split(" ").slice(-1)[0]} also conducts various pujas across {p.currentCity} and other cities in India.
            </p>

            <div className="grid sm:grid-cols-2 gap-6 mb-8">
              <InfoBlock title="Puja Expertise" items={p.pujaExpertise} />
              <InfoBlock title="Advice & Specialization Areas" items={p.adviceAreas} />
              <InfoBlock title="Temples Served" items={p.templesAssociated} />
              <InfoBlock title="Deities Served" items={p.deitiesServed} />
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[12px] font-mono uppercase tracking-widest text-white/40 mr-1">
                Languages Spoken:
              </span>
              {p.languagesSpoken.map(l => (
                <span key={l} className="text-[12px] font-mono bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-white/70">
                  {l}
                </span>
              ))}
            </div>

            <p className="text-[12px] text-white/30 font-mono mt-6 pt-4 border-t border-white/10">
              Listed by Sri Dwar as part of the Online Puja priest network. To book a ritual
              with {p.name.split(" ").slice(-1)[0]}, head to the Online Puja section and select this priest from the dropdown.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // ── LISTING VIEW ─────────────────────────────────────────────────────────
  return (
    <section ref={topAnchorRef} id="priest-section" className="py-20 bg-[#021816] text-white" style={{ paddingTop: `calc(var(--safe-area-inset-top, env(safe-area-inset-top, 24px)) + 96px)` }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold text-white/60 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        )}

        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-semibold text-[#FFB347]/80 tracking-wider font-mono">
            Our Vedic Acharyas
          </span>
          <h2 className="text-3xl font-serif font-black text-white tracking-tight mt-1">
            Meet Our Priests
          </h2>
          <p className="text-xs text-white/70 mt-2">
            Every priest on Sri Dwar is a revered pujari with deep experience in their respective devotional
            and ritual domain. Browse experience, regional puja traditions, and devotee-facing details before
            choosing who performs your ritual.
          </p>
        </div>

        {/* ── Guidance: what to look for ──────────────────────────────── */}
        <div className="mb-12 bg-[#062421] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-sm">
          <h3 className="text-lg font-serif font-bold text-[#FFB347] mb-1">
            What to Look for Before Consulting a Priest
          </h3>
          <p className="text-xs text-white/50 mb-6">
            A few things to check before booking a puja or seeking advice, so your ritual is performed
            with sincerity and care.
          </p>
          {/* Mobile/app: horizontal snap carousel — all 6 guidance points fit
              here, same uniform-card pattern used by every other carousel
              on the site (Simple Pujas, Seva Offerings, Bazaar). Desktop
              (sm+) keeps the original static grid, unchanged. */}
          <div className="sm:hidden -mx-4 px-4 overflow-x-auto no-scrollbar snap-x snap-mandatory">
            <div className="flex gap-4 w-max pb-1">
              {GUIDANCE_POINTS.map(g => (
                <div key={g.title} className="snap-start shrink-0 w-[260px] h-[168px] flex flex-col gap-3 bg-[#021816]/50 border border-white/10 rounded-2xl p-4">
                  <div className="shrink-0 w-9 h-9 rounded-xl bg-[#FFB347]/10 border border-[#FFB347]/25 flex items-center justify-center">
                    <g.icon className="w-4.5 h-4.5 text-[#FFB347]" />
                  </div>
                  <div className="min-h-0 overflow-hidden">
                    <h4 className="text-xs font-bold text-white mb-1">{g.title}</h4>
                    <p className="text-[13px] text-white/60 leading-relaxed line-clamp-4">{g.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {GUIDANCE_POINTS.map(g => (
              <div key={g.title} className="flex gap-3">
                <div className="shrink-0 w-9 h-9 rounded-xl bg-[#FFB347]/10 border border-[#FFB347]/25 flex items-center justify-center">
                  <g.icon className="w-4.5 h-4.5 text-[#FFB347]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white mb-1">{g.title}</h4>
                  <p className="text-[13px] text-white/60 leading-relaxed">{g.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Search & filter bar ─────────────────────────────────────── */}
        <div className="mb-8 bg-[#062421] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by priest name, city, or temple…"
              className="w-full bg-[#021816] border border-white/15 text-white/90 text-xs rounded-xl pl-9 pr-8 py-3 focus:outline-none focus:border-[#5EEAD4]/60"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-white/40 hover:text-white" />
              </button>
            )}
          </div>
          <select
            value={expertiseFilter}
            onChange={e => setExpertiseFilter(e.target.value)}
            className="bg-[#021816] border border-white/15 text-white/90 text-xs rounded-xl px-4 py-3 focus:outline-none focus:border-[#5EEAD4]/60 cursor-pointer sm:w-64"
          >
            <option value="all">All Puja Expertise</option>
            {allExpertiseTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>

        <p className="text-[13px] text-white/50 font-mono mb-4">
          Showing <span className="text-[#5EEAD4] font-bold">{visiblePriests.length}</span> of{" "}
          <span className="text-white/80 font-bold">{filteredPriests.length}</span> matching priests
          {filteredPriests.length !== PRIEST_PROFILES.length && (
            <> (out of {PRIEST_PROFILES.length} total)</>
          )}
          {totalPriestGroups > 1 && (
            <> — Group <span className="text-[#5EEAD4] font-bold">{clampedGroupIndex + 1}</span> of{" "}
              <span className="text-white/80 font-bold">{totalPriestGroups}</span></>
          )}
        </p>

        {/* ── Priest cards — shown 30 at a time (see PRIEST_BATCH_SIZE above),
            one group per "page" with Prev/Next navigation below, so devotees
            browse a manageable, uniformly-sized set instead of every one of
            the 101 profiles mounted at once. Mobile/app: horizontal snap
            strip within the current group, same uniform-card pattern used
            across the rest of the site (bare scroll-snap, no per-card dots/
            arrows). Desktop (lg+): unchanged grid, aligned to the app-wide
            card system (bg-[#062421], rounded-2xl, gap-6, scale-on-hover).
            Individual search/filter above always runs against the full
            101-priest directory, not just whatever group is currently
            shown — a match outside the current group still gets found, and
            jumps back to its own group 1. */}
        <div className="lg:hidden -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto no-scrollbar snap-x snap-mandatory">
          <div className="flex gap-4 w-max pb-1">
            {visiblePriests.map(p => (
              <div key={p.id} className="snap-start shrink-0 h-full [&>*]:h-full w-[280px]">
                <PriestCard priest={p} onSelect={() => setSelectedPriestId(p.id)} />
              </div>
            ))}
          </div>
        </div>
        <div className="hidden lg:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visiblePriests.map(p => (
            <PriestCard key={p.id} priest={p} onSelect={() => setSelectedPriestId(p.id)} />
          ))}
        </div>

        {filteredPriests.length === 0 && (
          <div className="text-center py-16 text-white/40 text-xs">
            No priests match your search. Try a different name, city, or expertise.
          </div>
        )}

        {/* Group pager — Prev/Next between groups of 30. No dot row here on
            purpose: with up to 4 groups of 30 priests each, this is page-level
            navigation (which 30 are showing), not a per-card carousel, and
            the "Group X of Y" text above already states position — matches
            the site-wide rule that only the Home carousel gets dot
            indicators, every other carousel/pager stays arrows-only or bare. */}
        {totalPriestGroups > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              type="button"
              aria-label="Previous group of priests"
              onClick={() => {
                setPriestGroupIndex(g => Math.max(0, g - 1));
                topAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              disabled={clampedGroupIndex === 0}
              className="inline-flex items-center gap-2 bg-[#062421] hover:bg-[#0D2F2B] border border-[#5EEAD4]/25 hover:border-[#5EEAD4]/50 disabled:opacity-30 disabled:cursor-not-allowed text-[#5EEAD4] text-xs font-bold px-5 py-3 rounded-full transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Previous 30
            </button>
            <button
              type="button"
              aria-label="Next group of priests"
              onClick={() => {
                setPriestGroupIndex(g => Math.min(totalPriestGroups - 1, g + 1));
                topAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              disabled={clampedGroupIndex === totalPriestGroups - 1}
              className="inline-flex items-center gap-2 bg-[#062421] hover:bg-[#0D2F2B] border border-[#5EEAD4]/25 hover:border-[#5EEAD4]/50 disabled:opacity-30 disabled:cursor-not-allowed text-[#5EEAD4] text-xs font-bold px-5 py-3 rounded-full transition-all"
            >
              Next 30 <ArrowLeft className="w-4 h-4 rotate-180" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// Extracted from the inline grid markup so the exact same card renders
// identically inside both the mobile carousel and the desktop grid above —
// no behaviour or content change from before, just reused in two places.
function PriestCard({ priest: p, onSelect }: { priest: PriestProfile & { localHighlight?: string }; onSelect: () => void }) {
  const highlight = p.localHighlight;
  return (
    <button
      onClick={onSelect}
      className="text-left bg-[#062421] p-5 rounded-2xl border border-white/10 shadow-sm hover:shadow-md hover:border-[#5EEAD4]/30 transition-all group scale-100 hover:scale-103 flex flex-col h-full w-full"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-serif font-black text-white text-sm leading-snug">{p.name}</h3>
      </div>

      <p className="flex items-center gap-1 text-[12px] text-[#FFB347]/80 font-mono mb-1">
        <MapPin className="w-3 h-3" /> {p.currentCity}, {p.currentState}
      </p>

      <p className="text-[12px] text-white/50 font-mono mb-3 line-clamp-1">
        {p.templesAssociated[0]}
      </p>

      <div className="flex items-center gap-4 mb-3">
        <span className="text-[12px] font-mono text-white/60">
          <span className="text-white font-bold">{p.yearsExperience}</span> yrs experience
        </span>
        <StarRating rating={p.rating} />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {p.pujaExpertise.slice(0, 2).map(e => (
          <span key={e} className="text-[11px] font-mono uppercase tracking-wide text-[#5EEAD4] bg-[#5EEAD4]/10 border border-[#5EEAD4]/25 px-2 py-0.5 rounded-full">
            {e}
          </span>
        ))}
      </div>

      {/* Locally-rooted highlight — distinguishes each priest's unique temple role */}
      {highlight && (
        <p className="text-[13px] text-white/65 leading-relaxed mb-4 flex-1 line-clamp-3">
          {highlight}
        </p>
      )}

      <span className="flex items-center gap-1 text-[12px] font-bold text-[#FFB347] group-hover:gap-2 transition-all mt-auto pt-1">
        <Eye className="w-3 h-3" /> View Full Profile
      </span>
    </button>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: ElementType }) {
  return (
    <div className="bg-[#021816]/60 border border-white/10 rounded-xl p-3 text-center">
      <Icon className="w-4 h-4 text-[#FFB347] mx-auto mb-1.5" />
      <p className="text-sm font-black text-white font-serif">{value}</p>
      <p className="text-[11px] font-mono uppercase tracking-widest text-white/40">{label}</p>
    </div>
  );
}

function InfoBlock({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h4 className="text-[12px] font-mono uppercase tracking-widest text-[#FFB347]/70 mb-2">{title}</h4>
      <ul className="space-y-1">
        {items.map(item => (
          <li key={item} className="text-xs text-white/80 flex items-start gap-2">
            <span className="text-[#5EEAD4] mt-0.5">•</span> {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
