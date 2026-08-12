/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { FEATURED_SEVAS } from "../data/spiritualData";
import { Heart, Sparkles, Utensils, Flame, BookOpen, ChevronDown, ChevronUp, Droplets, Star, Sun, Moon, Tag, ShieldCheck, HeartHandshake, ArrowRight } from "lucide-react";
import { gaSevaSelect } from "../utils/analytics";
import { getDiscountedPrice, isDiscountPromoVisible, DISCOUNT_TAG } from "../utils/discount";
import { SEVA_OFFERINGS } from "../data/sevaOfferings";
import SevaOfferingCard from "./SevaOfferingCard";
import OptimizedImage from "./OptimizedImage";
import SevaLiveDashboard from "./SevaLiveDashboard";
import { sectionTopPadding } from "../utils/androidSpacing";

// ─── Temporary feature flag ─────────────────────────────────────────────────
// The Live Devotional Dashboard (its "Upcoming Seva Slots" and "Recent Seva
// Completed" panels) is temporarily disabled on the Seva page per product
// request. Everything it depends on — the SevaLiveDashboard component file,
// the sessionRecentSevas tracking below, loadCompletedSevas/persistence, and
// the handleOfferSeva wiring — is left fully intact so this can be turned
// back on later by simply flipping this flag back to true. No files were
// removed and no functionality was deleted.
const SHOW_SEVA_LIVE_DASHBOARD = false;

// ─── Persisted "completed seva offering" records ───────────────────────────
// These power ONLY the Live Devotional Dashboard's "Recent Seva Completed"
// list — the Structured Seva Offering cards (Gau Seva, Annadan, etc.) are
// never hidden or shrunk after offering, since a devotee may want to offer
// the same seva again for a different person, cow, occasion, etc. Without
// this persistence, a devotee's own recently-offered seva would disappear
// from the dashboard as soon as this component unmounts (e.g. navigating
// away and back, or reopening the app) since it only lived in memory.
// Saved to localStorage using the same pattern as the devotee profile
// cache in BookNowWizard/TempleRegister.
const COMPLETED_SEVAS_KEY = "sridwar_completed_sevas";

interface CompletedSevaRecord {
  offeringId: string;
  seva: string;
  devotee: string;
  ts: number;
}

function loadCompletedSevas(): CompletedSevaRecord[] {
  try {
    const raw = localStorage.getItem(COMPLETED_SEVAS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to load saved seva offerings", e);
    return [];
  }
}

function saveCompletedSeva(record: CompletedSevaRecord) {
  try {
    const existing = loadCompletedSevas();
    // Keep only the most recent 20 so this never grows unbounded.
    const updated = [...existing, record].slice(-20);
    localStorage.setItem(COMPLETED_SEVAS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save seva offering", e);
  }
}

// ─── Sevas below use `amount` as the pre-discount base price (same
// convention as FEATURED_SEVAS' donationTiers) — the 20% sitewide discount
// is applied at render time via getDiscountedPrice, so this value should
// NOT be pre-discounted.
const EXTRA_SEVAS = [
  {
    id: "seva-rudrabhishek",
    name: "Rudrabhishek Puja",
    significance: "Sacred abhishek of Shivalinga with Panchamrit, Gangajal & bilva leaves with Vedic Rudra chanting by qualified pandits.",
    impactStat: "Performed at Kashi Vishwanath & Lingaraj Mandir, Bhubaneswar",
    templeAssociation: "Kashi Vishwanath",
    donationTiers: [{ amount: 3300 }],
    imageUrl: import.meta.env.BASE_URL + "images/Rudrabhishek Puja.jpg",
  },
  {
    id: "seva-mahaprasad",
    name: "Mahaprasad Distribution",
    significance: "Sponsor distribution of sacred Chhappan Bhog Mahaprasad to pilgrims and underprivileged devotees at Jagannath Puri.",
    impactStat: "Feeds 200+ devotees per sponsorship at Jagannath Puri",
    templeAssociation: "Jagannath Puri",
    donationTiers: [{ amount: 3000 }],
    imageUrl: import.meta.env.BASE_URL + "images/Mahaprasad Seva.jpg",
  },
  {
    id: "seva-tulsi-vivah",
    name: "Tulsi Vivah Seva",
    significance: "Sacred marriage ceremony of Tulsi plant with Lord Vishnu — an auspicious ritual that removes dosha and blesses families.",
    impactStat: "Conducted during Kartik Maas at Vrindavan & Dwarka temples",
    templeAssociation: "Vrindavan Dham",
    donationTiers: [{ amount: 1350 }],
    imageUrl: import.meta.env.BASE_URL + "images/Tulsi Vivah.jpg",
  },
  {
    id: "seva-navagraha",
    name: "Navagraha Shanti Homa",
    significance: "Nine-planet pacification homa to remove planetary doshas, improve fortune, health and career using specific samidha and herbal offerings.",
    impactStat: "Performed by Jyotish-trained Acharyas at Ujjain Mahakaleshwar",
    templeAssociation: "Mahakaleshwar, Ujjain",
    donationTiers: [{ amount: 12000 }],
    imageUrl: import.meta.env.BASE_URL + "images/Navagraha.jpg",
  },
  {
    id: "seva-akhand-path",
    name: "Akhand Ramayan Path",
    significance: "Uninterrupted 24-hour recitation of the complete Valmiki Ramayana by a team of trained pandits to bring peace and blessings.",
    impactStat: "Organised at Ram Janmabhoomi, Ayodhya for devotee sankalpa",
    templeAssociation: "Ram Janmabhoomi, Ayodhya",
    donationTiers: [{ amount: 12750 }],
    imageUrl: import.meta.env.BASE_URL + "images/Akhand Ramayan.jpg",
  },
  {
    id: "seva-gomata-puja",
    name: "Gomata Puja & Feeding",
    significance: "Ceremonial worship and feeding of sacred desi cows with tulsi, jaggery and sesame — performed on your behalf with photo proof.",
    impactStat: "Done at registered Gaushalas in Mathura & Vrindavan",
    templeAssociation: "Mathura Gaushala",
    donationTiers: [{ amount: 2000 }],
    imageUrl: import.meta.env.BASE_URL + "images/Gaushala.jpg",
  },
];

const renderSevaIcon = (id: string) => {
  switch (id) {
    case "seva-annadanam":   return <Utensils className="w-4 h-4 text-[#FFB347]" />;
    case "seva-cow":         return <Heart className="w-4 h-4 text-emerald-400" fill="currentColor" />;
    case "seva-diya":        return <Flame className="w-4 h-4 text-orange-500 animate-pulse" fill="currentColor" />;
    case "seva-gurukul":     return <BookOpen className="w-4 h-4 text-cyan-400" />;
    case "seva-rudrabhishek":return <Droplets className="w-4 h-4 text-blue-400" />;
    case "seva-mahaprasad":  return <Star className="w-4 h-4 text-yellow-300" />;
    case "seva-tulsi-vivah": return <Sun className="w-4 h-4 text-green-400" />;
    case "seva-navagraha":   return <Moon className="w-4 h-4 text-violet-400" />;
    case "seva-akhand-path": return <BookOpen className="w-4 h-4 text-orange-300" />;
    case "seva-gomata-puja": return <Heart className="w-4 h-4 text-pink-400" fill="currentColor" />;
    default:                 return <Sparkles className="w-4 h-4 text-yellow-400" />;
  }
};

// donationTiers store the pre-discount base price; the sitewide 20%
// discount (see utils/discount.ts) is still applied here at render time —
// getDiscountedPrice() is unchanged and keeps computing the real charged
// amount. Only the "original" (pre-discount, strikethrough) value is now
// gated behind isDiscountPromoVisible("seva"), which is currently off, so
// Seva cards show their discounted price as the plain, permanent price
// with no strikethrough or "20% OFF" wording. Flip that category flag in
// utils/discount.ts to bring the strikethrough back.
const getSevaDiscountedPrice = (amount: number): { display: number; original: number | null } => {
  return isDiscountPromoVisible("seva")
    ? { display: getDiscountedPrice(amount), original: amount }
    : { display: getDiscountedPrice(amount), original: null };
};

interface SevaCardProps {
  seva: {
    id: string;
    name: string;
    significance: string;
    impactStat: string;
    templeAssociation: string;
    donationTiers: Array<{ amount: number; label?: string }>;
    imageUrl?: string | null;
  };
  onSponsor: (name: string, price: number) => void;
  /** Optional — true when this card is the deep-link target arriving from
   *  elsewhere in the app (e.g. the homepage carousel). Reuses the same
   *  border/shadow treatment SimplePujaCard and BazaarOfferingCard already
   *  use for their own "selected" state, so it matches the rest of the site. */
  highlighted?: boolean;
}

function SevaCard({ seva, onSponsor, highlighted = false }: SevaCardProps) {
  const tier = seva.donationTiers[0];
  const { display, original } = getSevaDiscountedPrice(tier.amount);

  return (
    <div
      id={`seva-card-${seva.id}`}
      className={`bg-[#092320] p-5 rounded-3xl border text-left hover:shadow-lg transition-all flex flex-col justify-between text-white ${
        highlighted ? "border-[#FFB347]/60 shadow-lg shadow-[#FFB347]/10" : "border-white/10 hover:border-[#5EEAD4]/20"
      }`}
    >
      <div>
        {/* Temple image */}
        {seva.imageUrl ? (
          <div className="w-full aspect-[3/2] rounded-2xl overflow-hidden mb-4 border border-white/5 relative">
            <OptimizedImage
              src={seva.imageUrl}
              alt={seva.name}
              className="w-full h-full object-cover select-none filter brightness-90"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#021816]/90 to-transparent p-2">
              <span className="text-[9px] font-mono font-bold text-teal-300 bg-black/40 px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm">
                {seva.templeAssociation}
              </span>
            </div>
            {/* Discount badge on image */}
            {isDiscountPromoVisible("seva") && (
              <div className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full tracking-wide">
                {DISCOUNT_TAG}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-20 rounded-2xl mb-4 border border-white/5 bg-gradient-to-br from-[#0D2F2B] to-[#021816] flex items-center justify-between px-4">
            <span className="text-[9px] font-mono font-bold text-teal-300 uppercase tracking-wider">{seva.templeAssociation}</span>
            <div className="p-2 rounded-xl bg-white/5 border border-white/10">{renderSevaIcon(seva.id)}</div>
          </div>
        )}

        {/* Icon + Price row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-white/5 border border-white/15">
              {renderSevaIcon(seva.id)}
            </div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-white/50">Active Seva</span>
          </div>
          <div className="flex flex-col items-end">
            {original && (
              <span className="text-[9px] line-through text-white/35 font-mono">₹{original.toLocaleString("en-IN")}</span>
            )}
            <span className="text-sm font-extrabold text-[#FFB347] font-serif">₹{display.toLocaleString("en-IN")}</span>
          </div>
        </div>

        <h4 className="text-base font-serif font-bold text-white mb-1">{seva.name}</h4>
        <p className="text-[11px] text-white/70 min-h-[44px] leading-relaxed mb-4">{seva.significance}</p>

        <div className="text-[10px] text-[#5EEAD4] bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10 mb-4">
          <strong className="text-[#FFB347]">Impact:</strong> {seva.impactStat}
        </div>
      </div>

      <button
        id={`sponsor-btn-${seva.id}`}
        onClick={() => onSponsor(seva.name, display)}
        className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold py-2.5 rounded-xl text-xs tracking-wider transition-all shadow flex items-center justify-center gap-1.5"
      >
        <Tag className="w-3.5 h-3.5" />
        {isDiscountPromoVisible("seva") ? `SPONSOR SEVA — ${DISCOUNT_TAG} 🙏` : "SPONSOR SEVA 🙏"}
      </button>
    </div>
  );
}

interface SevaExperienceProps {
  onSponsorSeva: (sevaName: string, price: number) => void;
  /** Optional — when set (e.g. arriving from the homepage carousel), the
   *  matching seva card is highlighted and scrolled into view on mount, and
   *  the "Additional Offerings" accordion is auto-expanded if the target
   *  lives inside it. The special id "seva-dashboard-section" just scrolls
   *  to the Seva Hub & Live Devotional Dashboard section itself. Any other
   *  unmatched id is silently ignored. */
  initialHighlightId?: string | null;
  /** Since this page can be the very first thing rendered under <main>
   *  (which drops its own top padding on the Android app so every page can
   *  size its own clearance), this section must supply enough top padding
   *  itself to clear the fixed Navbar + Android status bar — otherwise the
   *  "Seva Hub" heading renders partly underneath the fixed header. Matches
   *  the isAndroidApp prop already passed to Hero / TrustBar / HomeCarousel
   *  from App.tsx. */
  isAndroidApp?: boolean;
  /** Optional — lets the "Counselling & Guidance" card inside "More Sacred
   *  Sevas" below route to the dedicated Counselling page (App.tsx passes
   *  its handleNavigate here). Optional + guarded with `?.()` at the call
   *  site so this component still renders safely if a caller doesn't wire
   *  it up. */
  onNavigate?: (page: string) => void;
  /** Optional — lets the "Sponsor" CTA (moved here from the header, below
   *  the Seva Hub heading) open the same quick "Divine Seva Sponsorship"
   *  modal the header button used to open. Guarded with `?.()` so this
   *  still renders safely if a caller doesn't wire it up. */
  onOpenSevaModal?: () => void;
}

// Note: the sample "Illustrative activity" ticker (fake example sponsorships
// like "Example: a devotee sponsored Gau Seva") has been removed — it looked
// like fake/misleading live activity to devotees.

export default function SevaExperience({ onSponsorSeva, initialHighlightId = null, isAndroidApp = false, onNavigate, onOpenSevaModal }: SevaExperienceProps) {
  // Note: UPI/Details state removed — Sponsor Seva now routes through
  // the Puja Sankalpa Portal (BookNowWizard) via onSponsorSeva prop.
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [activeOfferingId, setActiveOfferingId] = useState<string | null>(null);
  // Drives the highlighted border on whichever SevaCard matches
  // initialHighlightId below — separate from activeOfferingId (which is
  // SEVA_OFFERINGS' own "selected for sponsorship" state) so a deep-link
  // never accidentally opens a booking form on arrival.
  const [highlightedCardId, setHighlightedCardId] = useState<string | null>(null);
  // Offered sevas (this device, most recent first), shown at the top of the
  // Live Devotional Dashboard's "Recent Seva Completed" list so a devotee's
  // own seva stays visibly reflected there even after returning to the page.
  // Note: this only feeds the dashboard — the Structured Seva Offering
  // cards themselves are never hidden after offering, since a devotee may
  // want to offer the same seva again for a different person, cow, etc.
  const [sessionRecentSevas, setSessionRecentSevas] = useState<{ seva: string; devotee: string; status: "Pending" }[]>(
    () => loadCompletedSevas().reverse().map((r) => ({ seva: r.seva, devotee: r.devotee, status: "Pending" as const }))
  );

  // Deep-link from the homepage carousel (or anywhere else that passes
  // initialHighlightId). Runs once per mount; SevaExperience is unmounted/
  // remounted whenever currentPage changes in App.tsx, so a fresh id always
  // re-triggers this correctly.
  useEffect(() => {
    if (!initialHighlightId) return;

    // Special case: the carousel's "Seva Hub & Live Devotional Dashboard"
    // card targets the section itself, not a single seva card.
    if (initialHighlightId === "seva-dashboard-section") {
      const timer = setTimeout(() => {
        document.getElementById("seva-dashboard-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
      return () => clearTimeout(timer);
    }

    const allSevas = [...FEATURED_SEVAS, ...EXTRA_SEVAS];
    const match = allSevas.find((s) => s.id === initialHighlightId);
    if (!match) return;

    setHighlightedCardId(match.id);
    // Always-visible cards are FEATURED_SEVAS.slice(0, 4) — everything else
    // (FEATURED_SEVAS.slice(4) and all of EXTRA_SEVAS) only exists in the
    // DOM once the "Additional Offerings" accordion is open.
    const isAlwaysVisible = FEATURED_SEVAS.slice(0, 4).some((s) => s.id === match.id);
    if (!isAlwaysVisible) setAccordionOpen(true);

    const timer = setTimeout(() => {
      document.getElementById(`seva-card-${match.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, isAlwaysVisible ? 150 : 250); // extra delay when the accordion has to expand first
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialHighlightId]);

  const handleSponsor = (name: string, amount: number) => {
    // Route to the full Puja Sankalpa Portal (BookNowWizard) which collects
    // devotee data, syncs to Google Forms, and then opens the UPI payment
    // flow — all in one consistent flow used across the rest of the site.
    gaSevaSelect(name, amount);
    onSponsorSeva(name, amount);
  };

  // Structured Seva Offering cards call this with an already-composed,
  // human-readable seva name (title + selected option + devotee details) —
  // it plugs straight into the same handleSponsor pipeline used by the
  // existing Sponsorship Services cards, so checkout, GA events, and the
  // Puja Sankalpa Portal all keep working unchanged.
  const handleOfferSeva = (offeringId: string, composedName: string, amount: number, devoteeName: string) => {
    handleSponsor(composedName, amount);
    const sevaLabel = composedName.split(" — ")[0];
    const devoteeLabel = devoteeName ? `Devotee — ${devoteeName}` : "Devotee";
    setSessionRecentSevas((prev) => [{ seva: sevaLabel, devotee: devoteeLabel, status: "Pending" }, ...prev]);
    saveCompletedSeva({ offeringId, seva: sevaLabel, devotee: devoteeLabel, ts: Date.now() });
    if (activeOfferingId === offeringId) setActiveOfferingId(null);
  };



  // Sponsorship Services visibility — Android app shows only the first 2
  // FEATURED_SEVAS up front (everything else, including all of EXTRA_SEVAS,
  // stays inside the "More Sacred Sevas" accordion below). The website has
  // no such limit since it scrolls freely, so it shows every Sponsorship
  // Services card (all of FEATURED_SEVAS + EXTRA_SEVAS) up front, with
  // nothing left to hide in the accordion.
  const visibleFeaturedSevas = isAndroidApp ? FEATURED_SEVAS.slice(0, 2) : FEATURED_SEVAS;
  const visibleExtraSevas = isAndroidApp ? [] : EXTRA_SEVAS;
  const hiddenFeaturedSevas = isAndroidApp ? FEATURED_SEVAS.slice(2) : [];
  const hiddenExtraSevas = isAndroidApp ? EXTRA_SEVAS : [];
  const hasHiddenSevas = hiddenFeaturedSevas.length > 0 || hiddenExtraSevas.length > 0;

  return (
    <section id="seva-dashboard-section" className="py-16 bg-[#021816] relative text-white" style={isAndroidApp ? sectionTopPadding(true) : { paddingTop: `calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 80px)` }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="text-xs font-semibold text-[#5EEAD4]/80 tracking-wider font-mono uppercase">Sacred community giving</span>
          <h2 className="text-3xl font-serif font-black text-white tracking-tight mt-1">
            {SHOW_SEVA_LIVE_DASHBOARD ? "Seva Hub & Live Devotional Dashboard" : "Seva Hub"}
          </h2>
          <p className="text-xs text-white/70 mt-2 leading-relaxed">
            Participate in active charity rituals — feed holy cows, distribute Annadanam meals, or light sacred Akhanda Diyas at renowned temples across India.
          </p>
        </div>

        {/* Trust note — devotional transparency about how seva & certificates work */}
        <div className="flex items-start space-x-2.5 text-xs text-white/70 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 mb-6 max-w-3xl mx-auto">
          <ShieldCheck className="w-4 h-4 text-[#5EEAD4] flex-shrink-0 mt-0.5" />
          <span>Your seva is performed with devotion and recorded digitally. After completion, you will receive a digital certificate/evidence for your seva.</span>
        </div>

        {/* Sponsor CTA lives in the header navbar now (see Navbar.tsx),
            next to Counselling and Add Temple, instead of down here. */}
        {/* Seva Offerings — tiered from ₹100 upward */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-xl font-bold text-white">Seva Offerings</h3>
            <span className="text-[10px] font-mono text-[#5EEAD4] uppercase tracking-wide bg-[#5EEAD4]/10 border border-[#5EEAD4]/20 px-2.5 py-1 rounded-full">
              All Sevas Start at ₹100
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SEVA_OFFERINGS.map((offering) => (
              <SevaOfferingCard
                key={offering.id}
                offering={offering}
                isActive={activeOfferingId === offering.id}
                onActivate={() => setActiveOfferingId(offering.id)}
                onOffer={handleOfferSeva}
              />
            ))}
          </div>
        </div>

        {/* Live Devotional Dashboard — temporarily disabled, see
            SHOW_SEVA_LIVE_DASHBOARD above. Flip that flag to true to bring
            back "Upcoming Seva Slots" and "Recent Seva Completed" with no
            other changes needed. */}
        {SHOW_SEVA_LIVE_DASHBOARD && <SevaLiveDashboard extraRecentSevas={sessionRecentSevas} />}

        {/*
          ── Counselling & Guidance ──
          Moved above Sacred Moments / Sponsorship Services (was previously
          a thin banner below both). Rebuilt as a full-width card, identical
          on the website and the Android app, so it carries enough visual
          weight to open this part of the page rather than looking like an
          afterthought — a plain "button-only" banner would have looked
          sparse sitting first. On desktop the icon/copy sit beside the CTA
          in one row so the full section width is used with no dead space;
          on mobile everything stacks. Routes to the dedicated Counselling
          page via onNavigate — guarded with `?.()` so this still renders
          safely even if a future caller forgets to wire the prop.
          Copy is deliberately wellbeing/spiritual-guidance language only —
          no medical, healthcare, legal, or "guaranteed outcome" wording —
          consistent with the full disclaimer on the Counselling page.
        */}
        <div className="bg-gradient-to-r from-[#092320] to-[#0D2F2B] border border-[#5EEAD4]/25 rounded-3xl p-5 sm:p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-[#5EEAD4]/12 border border-[#5EEAD4]/25 flex items-center justify-center shrink-0">
                <HeartHandshake className="w-6 h-6 text-[#5EEAD4]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-serif text-lg font-bold text-white">Counselling & Guidance</h3>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed mt-1.5 max-w-xl">
                  Confidential, wellbeing-oriented guidance for individuals, students, couples, families,
                  professionals & seniors — from experienced Pandits and Dharmic experts, offered in good faith as
                  personal and spiritual guidance, never as medical, psychiatric, or legal advice, and with no
                  guaranteed outcome.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate?.("counselling")}
              className="shrink-0 w-full lg:w-auto inline-flex items-center justify-center gap-1.5 bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold text-xs px-5 py-3 rounded-full transition-all shadow"
            >
              Explore Guidance <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/*
          ── Sponsorship Services ──
          Previously sat in a 2-column row beside the "Sacred Moments" card.
          Sacred Moments has moved to the Live Darshan page (directly below
          Darshan Preview) per product request, so this now renders as a
          single full-width block on both the website and the Android app —
          avoiding the empty half-column gap that would otherwise be left
          behind, and matching project preference to merge/simplify rather
          than leave orphaned layout structure in place. All Sponsorship
          Services cards (FEATURED_SEVAS + EXTRA_SEVAS on the website; the
          first 2 FEATURED_SEVAS on the Android app, the rest inside "More
          Sacred Sevas" below) render in the same evenly-spaced grid used
          before.
        */}
        <div className="flex flex-col gap-4">

          {/* Heading row */}
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-xl font-bold text-white">Sponsorship Services</h3>
            {isDiscountPromoVisible("seva") && (
              <span className="text-[10px] font-mono text-red-300 uppercase tracking-wide bg-red-500/10 border border-red-400/20 px-2.5 py-1 rounded-full">
                {DISCOUNT_TAG} All Sevas
              </span>
            )}
          </div>

          {/* Always-visible: on Android, first 2 FEATURED_SEVAS only —
              everything else lives in "More Sacred Sevas" below, not
              deleted. On the website, every Sponsorship Services card
              (all FEATURED_SEVAS + EXTRA_SEVAS) shows here directly, in a
              3-column grid on large screens so the wider, single-column
              layout fills up evenly instead of leaving gaps. */}
          <div className={isAndroidApp ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"}>
            {visibleFeaturedSevas.map((seva) => (
              <SevaCard key={seva.id} seva={seva} onSponsor={handleSponsor} highlighted={highlightedCardId === seva.id} />
            ))}
            {visibleExtraSevas.map((seva) => (
              <SevaCard key={seva.id} seva={seva as any} onSponsor={handleSponsor} highlighted={highlightedCardId === seva.id} />
            ))}
          </div>
        </div>

        {/*
          ── Accordion row ──
          Full width now (previously constrained to lg:col-span-7 to match
          the Sponsorship Services column beside Sacred Moments, which no
          longer sits next to it — see the comment above). On the website
          this whole block never renders — hasHiddenSevas is always false
          there since every Sponsorship Services card already shows above.
          On the Android app it renders as before, holding everything past
          the first 2 FEATURED_SEVAS.
        */}
        {hasHiddenSevas && (
          <div className="mt-4">
            <div className="border border-white/10 rounded-2xl overflow-hidden">
              <button
                onClick={() => setAccordionOpen((p) => !p)}
                className="w-full flex items-center justify-between px-5 py-4 bg-[#092320] hover:bg-[#0D2F2B] transition-colors text-left"
                aria-expanded={accordionOpen}
              >
                <div className="flex items-center space-x-3">
                  <Sparkles className="w-4 h-4 text-[#FFB347]" />
                  <div>
                    <span className="text-sm font-bold text-white font-serif">More Sacred Sevas</span>
                    <span className="block text-[10px] text-white/50 font-mono mt-0.5">
                      {hiddenFeaturedSevas.length + hiddenExtraSevas.length} additional offerings{isDiscountPromoVisible("seva") ? ` — all ${DISCOUNT_TAG.toLowerCase()}` : ""}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {isDiscountPromoVisible("seva") && (
                    <span className="text-[9px] font-mono text-red-300 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-400/20 hidden sm:inline">
                      {DISCOUNT_TAG}
                    </span>
                  )}
                  <div className="p-1.5 rounded-lg bg-white/5 border border-white/10">
                    {accordionOpen
                      ? <ChevronUp className="w-4 h-4 text-[#5EEAD4]" />
                      : <ChevronDown className="w-4 h-4 text-[#5EEAD4]" />}
                  </div>
                </div>
              </button>

              {accordionOpen && (
                <div className="bg-[#021816] p-4 border-t border-white/10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {hiddenFeaturedSevas.map((seva) => (
                      <SevaCard key={seva.id} seva={seva} onSponsor={handleSponsor} highlighted={highlightedCardId === seva.id} />
                    ))}
                    {hiddenExtraSevas.map((seva) => (
                      <SevaCard key={seva.id} seva={seva as any} onSponsor={handleSponsor} highlighted={highlightedCardId === seva.id} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-[10px] text-white/35 font-mono mt-8 leading-relaxed max-w-2xl mx-auto">
          Offerings and sevas are performed with devotion as per temple process. Timings may vary depending on temple schedule, festival rush, priest availability, and temple rituals.
        </p>
      </div>

    </section>
  );
}
