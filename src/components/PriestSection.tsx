/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
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
const GUIDANCE_POINTS: { icon: React.ElementType; title: string; desc: string }[] = [
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
    desc: "Check which temple and city the priest is currently associated with — this affects ritual tradition, regional customs, and how Prasad or certificates will be dispatched to you."
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

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-1 text-[#FFB347] text-xs font-bold">
      <Star className="w-3.5 h-3.5 fill-[#FFB347]" />
      {rating.toFixed(1)}
    </span>
  );
}

export default function PriestSection({ initialPriestId = null, onBack }: PriestSectionProps) {
  const [selectedPriestId, setSelectedPriestId] = useState<string | null>(initialPriestId);
  const [search, setSearch] = useState("");
  const [expertiseFilter, setExpertiseFilter] = useState<string>("all");

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

  const selectedPriest: PriestProfile | undefined = useMemo(
    () => PRIEST_PROFILES.find(p => p.id === selectedPriestId),
    [selectedPriestId]
  );

  // ── DETAIL VIEW ──────────────────────────────────────────────────────────
  if (selectedPriest) {
    const p = selectedPriest;
    return (
      <section id="priest-detail-section" className="py-16 bg-[#021816] text-white min-h-[60vh]">
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
                <p className="text-[10px] text-white/40 font-mono mt-1">
                  {p.devoteesServedApprox.toLocaleString("en-IN")}+ devotees served
                </p>
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

            {/* Bio */}
            <p className="text-sm text-white/70 leading-relaxed mb-8">{p.bio}</p>

            <div className="grid sm:grid-cols-2 gap-6 mb-8">
              <InfoBlock title="Puja Expertise" items={p.pujaExpertise} />
              <InfoBlock title="Advice & Specialization Areas" items={p.adviceAreas} />
              <InfoBlock title="Temples Associated" items={p.templesAssociated} />
              <InfoBlock title="Deities Served" items={p.deitiesServed} />
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 mr-1">
                Languages Spoken:
              </span>
              {p.languagesSpoken.map(l => (
                <span key={l} className="text-[10px] font-mono bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-white/70">
                  {l}
                </span>
              ))}
            </div>

            <p className="text-[10px] text-white/30 font-mono mt-6 pt-4 border-t border-white/10">
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
    <section id="priest-section" className="py-20 bg-[#021816] text-white" style={{ paddingTop: `calc(env(safe-area-inset-top, 0px) + 80px)` }}>
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
            Every priest on Sri Dwar is a local Brahmin priest associated with their temple.
            Browse experience, regional puja traditions, and devotee-facing details before choosing who
            performs your ritual.
          </p>
        </div>

        {/* ── Guidance: what to look for ──────────────────────────────── */}
        <div className="mb-12 bg-[#062421] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-sm">
          <h3 className="text-lg font-serif font-bold text-[#FFB347] mb-1">
            What to Look for Before Consulting a Priest
          </h3>
          <p className="text-xs text-white/50 mb-6">
            A few things to check before booking a puja or seeking advice, so your ritual is performed
            with authenticity and care.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {GUIDANCE_POINTS.map(g => (
              <div key={g.title} className="flex gap-3">
                <div className="shrink-0 w-9 h-9 rounded-xl bg-[#FFB347]/10 border border-[#FFB347]/25 flex items-center justify-center">
                  <g.icon className="w-4.5 h-4.5 text-[#FFB347]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white mb-1">{g.title}</h4>
                  <p className="text-[11px] text-white/60 leading-relaxed">{g.desc}</p>
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

        <p className="text-[11px] text-white/50 font-mono mb-4">
          Showing <span className="text-[#5EEAD4] font-bold">{filteredPriests.length}</span> of{" "}
          <span className="text-white/80 font-bold">{PRIEST_PROFILES.length}</span> priests
        </p>

        {/* ── Priest cards grid (aligned to the app-wide card system: bg-[#062421], rounded-2xl, gap-6, scale-on-hover) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPriests.map(p => {
            const highlight = (p as PriestProfile & { localHighlight?: string }).localHighlight;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPriestId(p.id)}
                className="text-left bg-[#062421] p-5 rounded-2xl border border-white/10 shadow-sm hover:shadow-md hover:border-[#5EEAD4]/30 transition-all group scale-100 hover:scale-103 flex flex-col h-full"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-serif font-black text-white text-sm leading-snug">{p.name}</h3>
                </div>

                <p className="flex items-center gap-1 text-[10px] text-[#FFB347]/80 font-mono mb-1">
                  <MapPin className="w-3 h-3" /> {p.currentCity}, {p.currentState}
                </p>

                <p className="text-[10px] text-white/50 font-mono mb-3 line-clamp-1">
                  {p.templesAssociated[0]}
                </p>

                <div className="flex items-center gap-4 mb-3">
                  <span className="text-[10px] font-mono text-white/60">
                    <span className="text-white font-bold">{p.yearsExperience}</span> yrs experience
                  </span>
                  <StarRating rating={p.rating} />
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {p.pujaExpertise.slice(0, 2).map(e => (
                    <span key={e} className="text-[9px] font-mono uppercase tracking-wide text-[#5EEAD4] bg-[#5EEAD4]/10 border border-[#5EEAD4]/25 px-2 py-0.5 rounded-full">
                      {e}
                    </span>
                  ))}
                </div>

                {/* Locally-rooted highlight — distinguishes each priest's unique temple role */}
                {highlight && (
                  <p className="text-[11px] text-white/65 leading-relaxed mb-4 flex-1">
                    {highlight}
                  </p>
                )}

                <span className="flex items-center gap-1 text-[10px] font-bold text-[#FFB347] group-hover:gap-2 transition-all mt-auto pt-1">
                  <Eye className="w-3 h-3" /> View Full Profile
                </span>
              </button>
            );
          })}

          {filteredPriests.length === 0 && (
            <div className="col-span-full text-center py-16 text-white/40 text-xs">
              No priests match your search. Try a different name, city, or expertise.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="bg-[#021816]/60 border border-white/10 rounded-xl p-3 text-center">
      <Icon className="w-4 h-4 text-[#FFB347] mx-auto mb-1.5" />
      <p className="text-sm font-black text-white font-serif">{value}</p>
      <p className="text-[9px] font-mono uppercase tracking-widest text-white/40">{label}</p>
    </div>
  );
}

function InfoBlock({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h4 className="text-[10px] font-mono uppercase tracking-widest text-[#FFB347]/70 mb-2">{title}</h4>
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
