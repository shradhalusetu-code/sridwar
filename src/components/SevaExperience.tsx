/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from "react";
import { FEATURED_SEVAS } from "../data/spiritualData";
import { Sparkles, Utensils, Flame, BookOpen, ChevronDown, ChevronUp, Star, Sun, Tag, ShieldCheck, HeartHandshake, ArrowRight, Check, AlertCircle, MapPin } from "lucide-react";
import { gaSevaSelect } from "../utils/analytics";
import { getDiscountedPrice, isDiscountPromoVisible, DISCOUNT_TAG } from "../utils/discount";
import { SEVA_OFFERINGS, SEVA_OCCASIONS } from "../data/sevaOfferings";
import { getPriestById, getPriestsByKeywords } from "../data/priests";
import { TEMPLES_LIST } from "../data/temples";
import { validatePincode, validateBookingDate, getMinBookableDateISO } from "../utils/formValidation";
import SevaOfferingCard from "./SevaOfferingCard";
import OptimizedImage from "./OptimizedImage";
import SevaLiveDashboard from "./SevaLiveDashboard";
import MobileCarousel from "./shared/MobileCarousel";
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
    id: "seva-mahaprasad",
    name: "Mahaprasad Distribution",
    significance: "Sponsor distribution of sacred Chhappan Bhog Mahaprasad to pilgrims and underprivileged devotees at Jagannath Puri.",
    impactStat: "Feeds 200+ devotees per sponsorship at Jagannath Puri",
    templeAssociation: "Jagannath Puri",
    // ✅ QUANTITY PRICING (Sponsorship Services update): replaces the fixed
    // amount with a quantity selector — the devotee picks a number of
    // Mahaprasad distributions and the total is quantity × ₹100.
    donationTiers: [{ amount: 100 }],
    pricingMode: "quantity" as const,
    unitPrice: 100,
    unitLabel: "prasad distribution",
    imageUrl: import.meta.env.BASE_URL + "images/Mahaprasad Seva.jpg",
    includes: ["Temple-blessed Mahaprasad distributed to pilgrims/underprivileged devotees at Jagannath Puri", "Distribution coordinated with temple-approved sevaks", "Photo/video evidence where available"],
    devoteeReceives: ["Digital sponsorship certificate in your name", "Evidence shared after completion", "Sankalp recorded with your Gotra"],
    certificateTimeline: "Certificate & evidence shared within 3-7 working days of completion.",
    coverageLabel: "₹100 per Mahaprasad distribution — choose any quantity",
    priestKeywords: ["wealth", "health", "festival"],
  },
  {
    id: "seva-tulsi-vivah",
    name: "Tulsi Vivah Seva",
    significance: "Sacred marriage ceremony of Tulsi plant with Lord Vishnu — an auspicious ritual that removes dosha and blesses families.",
    impactStat: "Conducted during Kartik Maas at Vrindavan & Dwarka temples",
    templeAssociation: "Vrindavan Dham",
    // ✅ DURATION + PANDIT PRICING (Sponsorship Services update): replaces
    // the fixed amount with a duration + number-of-Pandits selector.
    // Base: 10 minutes + 1 Pandit = ₹200; each additional 10-minute block
    // adds ₹200, and each additional Pandit adds ₹200 (rate derived from
    // this seva's own base price via getSevaDurationPanditUnitPrice's
    // shared tier table — see that function for the full table).
    donationTiers: [{ amount: 150 }],
    pricingMode: "duration-pandit" as const,
    unitPrice: 150,
    unitDurationMinutes: 10,
    imageUrl: import.meta.env.BASE_URL + "images/Tulsi Vivah.jpg",
    includes: ["Tulsi Vivah ceremony performed as per temple ritual process, for the duration and number of Pandits sponsored", "Sankalp taken in your name for the family", "Photo/video evidence where available"],
    devoteeReceives: ["Digital seva certificate in your name", "Evidence shared after completion", "Sankalp recorded with your Gotra"],
    certificateTimeline: "Certificate & evidence shared within 3-7 working days of completion.",
    coverageLabel: "₹200 for 10 minutes with 1 Pandit — extend the duration or add Pandits",
    priestKeywords: ["marriage", "family", "festival"],
  },
];

// ── Duration + Pandit pricing bounds & tier rate — Tulsi Vivah Seva only ───
// Mirrors the same fix applied to Online Puja's Health/Wealth/Protection/
// Career/Marriage pujas (see OnlinePuja.tsx getPujaUnitPrice /
// clampPujaDurationUnits / clampPujaPandits) so both duration-pandit
// selectors on the site follow one consistent rule: 1–10 duration blocks
// (10–100 minutes), 1–10 Pandits, and a per-unit rate derived from the
// item's own base price via the same shared tier table.
const SEVA_DURATION_PANDIT_MIN_UNITS = 1;
const SEVA_DURATION_PANDIT_MAX_UNITS = 10;
const SEVA_DURATION_PANDIT_MAX_PANDITS = 10;

function clampSevaDurationPanditUnits(units: number): number {
  return Math.min(SEVA_DURATION_PANDIT_MAX_UNITS, Math.max(SEVA_DURATION_PANDIT_MIN_UNITS, units));
}

function clampSevaDurationPanditPandits(pandits: number): number {
  return Math.min(SEVA_DURATION_PANDIT_MAX_PANDITS, Math.max(1, pandits));
}

//   under ₹2,000            → ₹200 per 10 minutes / per Pandit
//   ₹2,000 – ₹3,000         → ₹250
//   ₹3,000 – ₹4,000         → ₹300
//   ₹4,000 – ₹6,000         → ₹350
//   above ₹6,000            → +₹100 for every further ₹2,000 band above
//                              ₹6,000 (₹6,000–₹8,000 → ₹450, …)
function getSevaDurationPanditUnitPrice(basePrice: number): number {
  if (basePrice <= 2000) return 200;
  if (basePrice <= 3000) return 250;
  if (basePrice <= 4000) return 300;
  if (basePrice <= 6000) return 350;
  const bandsAbove6000 = Math.ceil((basePrice - 6000) / 2000);
  return 350 + bandsAbove6000 * 100;
}

// ── Dynamic "How this is performed · What you receive" content ────────────
// Mirrors OnlinePuja.tsx's getDynamicPujaValueNotes for the same
// duration-pandit pricing model: as a devotee selects more duration or
// more Pandits, the "How this is performed" list grows with additional
// lines explaining the extra devotional value — grounded in this seva's
// own ritual significance, always shown ALONGSIDE the existing includes
// list, never replacing it. Keyed by seva id so each duration-pandit seva
// (today, only Tulsi Vivah Seva) gets its own authentic phrasing.
const SEVA_DYNAMIC_VALUE_NOTES: Record<string, { duration: string; pandits: string }> = {
  "seva-tulsi-vivah": {
    duration:
      "the priest extends the Tulsi Vivah rites with additional mantra recitation and ritual stages — including a fuller Kanyadaan-style vivah sequence — giving the ceremony deeper continuity as per Vaishnav tradition",
    pandits:
      "the sacred marriage ceremony includes simultaneous multi-priest chanting and expanded sankalp coverage, so more family members can be named in the ceremony",
  },
};

/** Returns 0, 1, or 2 additional "How this is performed" lines describing
 *  the extra devotional value of the current duration/Pandit selection,
 *  beyond the seva's base 10-minute/1-Pandit selection. Empty at the
 *  default selection, and empty for any seva without a defined entry
 *  above (so this only ever applies to duration-pandit sevas that opt in). */
function getDynamicSevaValueNotes(sevaId: string, durationUnits: number, pandits: number, durationMinutes: number): string[] {
  const focus = SEVA_DYNAMIC_VALUE_NOTES[sevaId];
  if (!focus) return [];
  const notes: string[] = [];
  if (durationUnits > 1) {
    notes.push(`At ${durationMinutes} minutes, ${focus.duration}.`);
  }
  if (pandits > 1) {
    notes.push(`With ${pandits} Pandits performing together, ${focus.pandits}.`);
  }
  return notes;
}

const renderSevaIcon = (id: string) => {
  switch (id) {
    case "seva-annadanam":   return <Utensils className="w-4 h-4 text-[#FFB347]" />;
    case "seva-diya":        return <Flame className="w-4 h-4 text-orange-500 animate-pulse" fill="currentColor" />;
    case "seva-gurukul":     return <BookOpen className="w-4 h-4 text-cyan-400" />;
    case "seva-mahaprasad":  return <Star className="w-4 h-4 text-yellow-300" />;
    case "seva-tulsi-vivah": return <Sun className="w-4 h-4 text-green-400" />;
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
    donationTiers: Array<{ amount: number; label?: string; description?: string }>;
    imageUrl?: string | null;
    /** How the seva is actually performed and what the devotee receives as
     *  evidence — present on FEATURED_SEVAS (data/spiritualData.ts) but not
     *  on every EXTRA_SEVAS entry. Only rendered when present, so nothing is
     *  ever invented for offerings that don't have it. */
    blessingExplanation?: string;
    /** What this sponsorship includes, shown as a checklist alongside
     *  devoteeReceives — same pattern as SevaOfferingCard's "This seva
     *  includes" / "You will receive" lists. */
    includes?: string[];
    devoteeReceives?: string[];
    certificateTimeline?: string;
    /** One-line "what the charged tier actually covers" stat, e.g. "Feeds
     *  20 Sadhus, one meal". Shown as "Meal Coverage" for Annadanam,
     *  "Coverage" for everything else. */
    coverageLabel?: string;
    priestKeywords?: string[];
    /** "quantity": price = quantity * unitPrice. "duration-pandit": price =
     *  unitPrice * (durationUnits + pandits - 1). Omitted/"tiers" keeps the
     *  original fixed single-price behaviour (donationTiers[0].amount). */
    pricingMode?: "tiers" | "quantity" | "duration-pandit";
    unitPrice?: number;
    unitLabel?: string;
    unitDurationMinutes?: number;
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

  // ─── Quantity / Duration+Pandit dynamic pricing ──────────────────────────
  // Sponsorship Services previously showed one fixed donationTiers[0].amount
  // no matter what. For sevas with pricingMode "quantity" the devotee now
  // picks a count (e.g. number of people/cows/diyas/prasad distributions)
  // and the total is quantity × unitPrice — UNCHANGED, not part of this fix.
  //
  // For "duration-pandit" sevas — today that's only Tulsi Vivah Seva, the
  // sole Sponsorship Services item with this pricingMode — the devotee
  // picks a duration (in unitDurationMinutes blocks, starting at 1 block =
  // 10 minutes) and a number of Pandits. Base is 1 block + 1 Pandit = the
  // per-unit rate, and each additional block OR additional Pandit adds that
  // same rate again: total = unitPrice × (durationUnits + pandits - 1).
  // ✅ MAX-CAP FIX: both durationUnits and pandits had no upper bound before
  // (only a floor of 1) — clamped to 1–10 now, matching Online Puja's same
  // Duration + Pandit model (max 100 minutes / max 10 Pandits).
  // ✅ TIER FIX: the per-unit rate is now derived from the seva's own base
  // price via the same shared tier table Online Puja uses (see
  // getSevaDurationPanditUnitPrice below), instead of trusting the raw
  // unitPrice field directly — for Tulsi Vivah Seva (₹150 base, in the
  // ₹150–₹2,000 tier) this resolves to ₹200 per 10-minute block / per
  // Pandit.
  // Sevas without a pricingMode (or "tiers") are entirely unaffected —
  // baseAmount below just falls back to the original tier.amount.
  const [quantity, setQuantity] = useState(1);
  const [durationUnits, setDurationUnits] = useState(1);
  const [pandits, setPandits] = useState(1);

  const sevaDurationPanditUnitPrice =
    seva.pricingMode === "duration-pandit" ? getSevaDurationPanditUnitPrice(seva.unitPrice ?? tier.amount) : 0;

  const baseAmount =
    seva.pricingMode === "quantity"
      ? quantity * (seva.unitPrice ?? tier.amount)
      : seva.pricingMode === "duration-pandit"
      ? sevaDurationPanditUnitPrice * (durationUnits + pandits - 1)
      : tier.amount;

  // ✅ PRICE-CONSISTENCY FIX: for "quantity" and "duration-pandit" sevas
  // the calculated total shown in the selector (e.g. "₹200 for 10 min, 1
  // Pandit") IS the actual price — it must never be silently discounted
  // behind the devotee's back into a different "Active Seva" badge number
  // (e.g. showing ₹160 at the top while the selector says ₹200). So these
  // two computed pricing modes always show/charge baseAmount as-is. Fixed
  // single-tier sevas (Annadanam, Gau Seva, Akhanda Diya, etc.) are
  // completely unaffected and keep the sitewide 20% discount exactly as
  // before.
  const { display, original } =
    seva.pricingMode === "quantity" || seva.pricingMode === "duration-pandit"
      ? { display: baseAmount, original: null as number | null }
      : getSevaDiscountedPrice(baseAmount);
  const durationMinutes = (seva.unitDurationMinutes ?? 10) * durationUnits;
  const dynamicSevaValueNotes =
    seva.pricingMode === "duration-pandit" ? getDynamicSevaValueNotes(seva.id, durationUnits, pandits, durationMinutes) : [];
  // ─── Compact-by-default "how it's performed" details ────────────────────
  // Mirrors the exact expand/collapse pattern already used by
  // SevaOfferingCard.tsx and BazaarOfferingCard.tsx ("What's included · What
  // you receive"). significance + impactStat stay visible as the compact
  // "why this matters" summary; blessingExplanation and the other donation
  // tier descriptions (both previously collected in data but never
  // rendered anywhere) sit behind this toggle so the price is visibly
  // justified without lengthening the default card. Only rendered when the
  // offering actually has this data — EXTRA_SEVAS entries without it fall
  // back to exactly today's card, unchanged.
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const otherTiers = seva.donationTiers.filter((t) => t.label && t.description);
  const hasExpandableDetails = !!seva.blessingExplanation || !!seva.includes?.length || !!seva.devoteeReceives?.length || otherTiers.length > 0;

  // ─── Preferred Seva Date / Pincode / Temple / Occasion / Priest ────────
  // Sponsorship Services previously skipped straight from "Sponsor Seva" to
  // the Sankalp Portal with only a name + price, unlike the Seva Offerings
  // cards (SevaOfferingCard.tsx) which collect these first. Same pattern
  // replicated here: a "Continue" step reveals the fields, then the actual
  // "Sponsor Seva" submit composes them into the name passed to the Sankalp
  // Portal — nothing here touches BookNowWizard itself, so no other booking
  // flow is affected.
  const [formOpen, setFormOpen] = useState(false);
  const [occasion, setOccasion] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [pincode, setPincode] = useState("");
  const [selectedTempleId, setSelectedTempleId] = useState("");
  const [selectedPriestId, setSelectedPriestId] = useState("");
  const [errors, setErrors] = useState<{ pincode?: string; preferredDate?: string }>({});
  const priestOptions = useMemo(
    () => getPriestsByKeywords(seva.priestKeywords || [], 20),
    [seva.priestKeywords]
  );

  const handleContinueOrSubmit = () => {
    if (!formOpen) { setFormOpen(true); return; }

    const pincodeErr = pincode.trim() ? validatePincode(pincode) : null;
    const preferredDateErr = preferredDate ? validateBookingDate(preferredDate) : null;
    if (pincodeErr || preferredDateErr) {
      setErrors({ pincode: pincodeErr || undefined, preferredDate: preferredDateErr || undefined });
      return;
    }
    setErrors({});

    const occasionLabel = SEVA_OCCASIONS.find((o) => o.value === occasion)?.label;
    const chosenPriest = selectedPriestId ? getPriestById(selectedPriestId) : undefined;
    const chosenTemple = selectedTempleId ? TEMPLES_LIST.find((t) => t.id === selectedTempleId) : undefined;

    const detailParts: string[] = [];
    if (seva.pricingMode === "quantity") {
      detailParts.push(`Quantity: ${quantity} ${seva.unitLabel ?? "unit"}${quantity === 1 ? "" : "s"}`);
    } else if (seva.pricingMode === "duration-pandit") {
      detailParts.push(`Duration: ${durationMinutes} minutes`);
      detailParts.push(`Pandits: ${pandits}`);
    }
    if (occasionLabel) detailParts.push(`Occasion: ${occasionLabel}`);
    if (preferredDate) detailParts.push(`Preferred Date: ${preferredDate}`);
    if (pincode.trim()) detailParts.push(`Pincode: ${pincode.trim()}`);
    detailParts.push(`Temple Selection: ${chosenTemple ? chosenTemple.name : "Any Temple"}`);
    detailParts.push(`Priest/Expert Selection: ${chosenPriest ? chosenPriest.name : "Any approved priest for this seva"}`);

    const composedName = `${seva.name} — ${detailParts.join(", ")}`;
    onSponsor(composedName, display);

    setFormOpen(false);
    setOccasion(""); setPreferredDate(""); setPincode("");
    setSelectedTempleId(""); setSelectedPriestId("");
    setQuantity(1); setDurationUnits(1); setPandits(1);
  };

  return (
    <div
      id={`seva-card-${seva.id}`}
      className={`bg-[#092320] p-5 rounded-3xl border text-left hover:shadow-lg transition-all flex flex-col justify-between text-white h-full ${
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
              <span className="text-[11px] font-mono font-bold text-teal-300 bg-black/40 px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm">
                {seva.templeAssociation}
              </span>
            </div>
            {/* Discount badge on image */}
            {isDiscountPromoVisible("seva") && (
              <div className="absolute top-2 right-2 bg-red-500 text-white text-[11px] font-black px-2 py-0.5 rounded-full tracking-wide">
                {DISCOUNT_TAG}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-20 rounded-2xl mb-4 border border-white/5 bg-gradient-to-br from-[#0D2F2B] to-[#021816] flex items-center justify-between px-4">
            <span className="text-[11px] font-mono font-bold text-teal-300 uppercase tracking-wider">{seva.templeAssociation}</span>
            <div className="p-2 rounded-xl bg-white/5 border border-white/10">{renderSevaIcon(seva.id)}</div>
          </div>
        )}

        {/* Icon + Price row */}
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-white/5 border border-white/15">
              {renderSevaIcon(seva.id)}
            </div>
            <span className="text-[12px] uppercase font-mono tracking-wider text-white/50">Active Seva</span>
          </div>
          <div className="flex flex-col items-end">
            {original && (
              <span className="text-[11px] line-through text-white/35 font-mono">₹{original.toLocaleString("en-IN")}</span>
            )}
            <span className="text-sm font-extrabold text-[#FFB347] font-serif">₹{display.toLocaleString("en-IN")}</span>
          </div>
        </div>

        <h4 className="text-lg font-serif font-bold text-white mb-1">{seva.name}</h4>
        <p className="text-[13px] text-white/70 min-h-[44px] leading-relaxed mb-4">{seva.significance}</p>

        <div className="text-[12px] text-[#5EEAD4] bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10 mb-2">
          <strong className="text-[#FFB347]">Impact:</strong> {seva.impactStat}
        </div>

        {seva.coverageLabel && (
          <div className="text-[12px] text-white/70 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10 mb-4">
            <strong className="text-[#5EEAD4]">{seva.id === "seva-annadanam" ? "Meal Coverage" : "Coverage"}:</strong> {seva.coverageLabel}
          </div>
        )}

        {/* Quantity selector — Annadanam, Gau Seva, Akhanda Diya, Mahaprasad
            Distribution. Same stepper input style as the custom-amount field
            in SevaOfferingCard.tsx (bg-white/5, border-white/12, rounded-xl)
            so it matches the rest of the site. */}
        {seva.pricingMode === "quantity" && (
          <div className="mb-4" onClick={(e) => e.stopPropagation()}>
            <label className="block text-[12px] font-bold text-white/60 uppercase tracking-wide mb-1.5">
              Number of {seva.unitLabel ?? "unit"}s
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-9 h-9 shrink-0 rounded-xl bg-white/5 border border-white/12 text-white text-base font-bold hover:border-[#FFB347]/50 transition-colors"
                aria-label={`Decrease number of ${seva.unitLabel ?? "unit"}s`}
              >
                −
              </button>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full bg-white/5 border border-white/12 rounded-xl px-3.5 py-2 text-xs text-white text-center focus:outline-none focus:border-[#FFB347]/50"
              />
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-9 h-9 shrink-0 rounded-xl bg-white/5 border border-white/12 text-white text-base font-bold hover:border-[#FFB347]/50 transition-colors"
                aria-label={`Increase number of ${seva.unitLabel ?? "unit"}s`}
              >
                +
              </button>
            </div>
            <p className="text-[11px] text-white/40 mt-1">
              ₹{(seva.unitPrice ?? tier.amount).toLocaleString("en-IN")} × {quantity} {seva.unitLabel ?? "unit"}{quantity === 1 ? "" : "s"} = ₹{baseAmount.toLocaleString("en-IN")}
            </p>
          </div>
        )}

        {/* Duration + Pandit selector — Tulsi Vivah Seva only (Navagraha
            Shanti Homa and Akhand Ramayan Path have moved to Online Pujas).
            Base: 10 minutes + 1 Pandit = ₹200; each additional 10-minute
            block or additional Pandit adds ₹200, up to the 100-minute /
            10-Pandit cap. */}
        {seva.pricingMode === "duration-pandit" && (
          <div className="mb-4 space-y-2.5" onClick={(e) => e.stopPropagation()}>
            <div>
              <label className="block text-[12px] font-bold text-white/60 uppercase tracking-wide mb-1.5">
                Duration ({durationMinutes} minutes)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDurationUnits((d) => clampSevaDurationPanditUnits(d - 1))}
                  className="w-9 h-9 shrink-0 rounded-xl bg-white/5 border border-white/12 text-white text-base font-bold hover:border-[#FFB347]/50 transition-colors"
                  aria-label="Decrease duration"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={durationUnits}
                  onChange={(e) => setDurationUnits(clampSevaDurationPanditUnits(parseInt(e.target.value, 10) || 1))}
                  className="w-full bg-white/5 border border-white/12 rounded-xl px-3.5 py-2 text-xs text-white text-center focus:outline-none focus:border-[#FFB347]/50"
                />
                <button
                  type="button"
                  onClick={() => setDurationUnits((d) => clampSevaDurationPanditUnits(d + 1))}
                  className="w-9 h-9 shrink-0 rounded-xl bg-white/5 border border-white/12 text-white text-base font-bold hover:border-[#FFB347]/50 transition-colors"
                  aria-label="Increase duration"
                >
                  +
                </button>
              </div>
              <p className="text-[11px] text-white/40 mt-1">{durationUnits} × {seva.unitDurationMinutes ?? 10}-minute block{durationUnits === 1 ? "" : "s"}</p>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-white/60 uppercase tracking-wide mb-1.5">Number of Pandits</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPandits((p) => clampSevaDurationPanditPandits(p - 1))}
                  className="w-9 h-9 shrink-0 rounded-xl bg-white/5 border border-white/12 text-white text-base font-bold hover:border-[#FFB347]/50 transition-colors"
                  aria-label="Decrease number of Pandits"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={pandits}
                  onChange={(e) => setPandits(clampSevaDurationPanditPandits(parseInt(e.target.value, 10) || 1))}
                  className="w-full bg-white/5 border border-white/12 rounded-xl px-3.5 py-2 text-xs text-white text-center focus:outline-none focus:border-[#FFB347]/50"
                />
                <button
                  type="button"
                  onClick={() => setPandits((p) => clampSevaDurationPanditPandits(p + 1))}
                  className="w-9 h-9 shrink-0 rounded-xl bg-white/5 border border-white/12 text-white text-base font-bold hover:border-[#FFB347]/50 transition-colors"
                  aria-label="Increase number of Pandits"
                >
                  +
                </button>
              </div>
            </div>
            <p className="text-[11px] text-white/40">
              ₹{sevaDurationPanditUnitPrice.toLocaleString("en-IN")} base (10 min, 1 Pandit) + ₹{sevaDurationPanditUnitPrice.toLocaleString("en-IN")} per extra 10 minutes or extra Pandit = ₹{baseAmount.toLocaleString("en-IN")}
            </p>
          </div>
        )}

        {hasExpandableDetails && (
          <>
            <button
              type="button"
              onClick={() => setDetailsExpanded((v) => !v)}
              aria-expanded={detailsExpanded}
              className="flex items-center gap-1 text-[12px] font-bold text-[#5EEAD4] hover:text-[#7FF4DE] uppercase tracking-wide mb-3 -mt-1 transition-colors"
            >
              {detailsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>{detailsExpanded ? "Hide details" : "How this is performed · What you receive"}</span>
            </button>

            {detailsExpanded && (
              <div className="space-y-3 mb-4">
                {seva.blessingExplanation && (
                  <div className="flex items-start space-x-1.5 text-[13px] text-white/70 bg-white/5 px-3 py-2.5 rounded-xl border border-white/10">
                    <Check className="w-3.5 h-3.5 text-[#5EEAD4] flex-shrink-0 mt-0.5" />
                    <span>{seva.blessingExplanation}</span>
                  </div>
                )}
                {!!seva.includes?.length && (
                  <div className="space-y-1.5">
                    <span className="block text-[12px] font-bold text-white/60 uppercase tracking-wide">How this is performed</span>
                    <ul className="space-y-1">
                      {seva.includes.map((item, i) => (
                        <li key={i} className="flex items-start space-x-1.5 text-[13px] text-white/70">
                          <Check className="w-3 h-3 text-[#5EEAD4] flex-shrink-0 mt-0.5" /><span>{item}</span>
                        </li>
                      ))}
                      {/* ✅ DYNAMIC CONTENT: additional lines as duration or
                          Pandits increase — see getDynamicSevaValueNotes.
                          Empty at the 10-min/1-Pandit default, so the
                          original list is exactly what's authored above. */}
                      {dynamicSevaValueNotes.map((note, i) => (
                        <li key={`dyn-${i}`} className="flex items-start space-x-1.5 text-[13px] text-white/70">
                          <Check className="w-3 h-3 text-[#FFB347] flex-shrink-0 mt-0.5" /><span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!!seva.devoteeReceives?.length && (
                  <div className="space-y-1.5">
                    <span className="block text-[12px] font-bold text-white/60 uppercase tracking-wide">What you receive</span>
                    <ul className="space-y-1">
                      {seva.devoteeReceives.map((item, i) => (
                        <li key={i} className="flex items-start space-x-1.5 text-[13px] text-white/70">
                          <Check className="w-3 h-3 text-[#FFB347] flex-shrink-0 mt-0.5" /><span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {otherTiers.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="block text-[12px] font-bold text-white/60 uppercase tracking-wide">Ways to contribute</span>
                    <ul className="space-y-1.5">
                      {otherTiers.map((t, i) => (
                        <li key={i} className="text-[13px] text-white/70">
                          <span className="font-bold text-[#FFB347]">₹{t.amount.toLocaleString("en-IN")} — {t.label}:</span>{" "}
                          {t.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </>
        )}
        {/* Preferred Seva Date / Pincode / Temple Selection / Occasion /
            Priest-Expert Selection — same fields SevaOfferingCard already
            collects for Seva Offerings, previously missing here entirely.
            Only shown once "Continue" is tapped, so the compact card is
            unchanged until a devotee actually intends to sponsor. */}
        {formOpen && (
          <div className="space-y-2.5 mb-4 pt-3 border-t border-white/10">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[12px] font-bold text-white/60 uppercase tracking-wide mb-1">Preferred Seva Date</label>
                <input
                  type="date" value={preferredDate} min={getMinBookableDateISO()}
                  onChange={(e) => { setPreferredDate(e.target.value); if (errors.preferredDate) setErrors((p) => ({ ...p, preferredDate: undefined })); }}
                  className={`w-full bg-white/5 border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none ${
                    errors.preferredDate ? "border-red-400/60 focus:border-red-400" : "border-white/12 focus:border-[#FFB347]/50"
                  }`}
                />
                {errors.preferredDate && (
                  <p className="flex items-center gap-1 text-[12px] text-red-300 mt-1"><AlertCircle className="w-3 h-3 flex-shrink-0" />{errors.preferredDate}</p>
                )}
              </div>
              <div>
                <label className="flex items-center gap-1 text-[12px] font-bold text-white/60 uppercase tracking-wide mb-1">
                  <MapPin className="w-3 h-3 text-[#FFB347]" /> Pincode
                </label>
                <input
                  type="text" inputMode="numeric" value={pincode}
                  onChange={(e) => { setPincode(e.target.value.replace(/\D/g, "")); if (errors.pincode) setErrors((p) => ({ ...p, pincode: undefined })); }}
                  placeholder="6-digit PIN code (optional)"
                  maxLength={6}
                  className={`w-full bg-white/5 border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none ${
                    errors.pincode ? "border-red-400/60 focus:border-red-400" : "border-white/12 focus:border-[#FFB347]/50"
                  }`}
                />
                {errors.pincode && (
                  <p className="flex items-center gap-1 text-[12px] text-red-300 mt-1"><AlertCircle className="w-3 h-3 flex-shrink-0" />{errors.pincode}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-bold text-white/60 uppercase tracking-wide mb-1">Temple Selection</label>
              <div className="relative">
                <select
                  value={selectedTempleId}
                  onChange={(e) => setSelectedTempleId(e.target.value)}
                  className="w-full appearance-none bg-white/5 border border-white/12 rounded-xl pl-3.5 pr-9 py-2.5 text-xs text-white focus:outline-none focus:border-[#FFB347]/50"
                >
                  <option value="" className="bg-[#092320] text-white">Any Temple</option>
                  {[...TEMPLES_LIST].sort((a, b) => a.name.localeCompare(b.name)).map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#092320] text-white">{t.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-bold text-white/60 uppercase tracking-wide mb-1">Occasion</label>
              <div className="relative">
                <select
                  value={occasion} onChange={(e) => setOccasion(e.target.value)}
                  className="w-full appearance-none bg-white/5 border border-white/12 rounded-xl pl-3.5 pr-9 py-2.5 text-xs text-white focus:outline-none focus:border-[#FFB347]/50"
                >
                  <option value="" className="bg-[#092320]">Select occasion (optional)</option>
                  {SEVA_OCCASIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-[#092320]">{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-bold text-white/60 uppercase tracking-wide mb-1">Priest / Expert Selection</label>
              <div className="relative">
                <select
                  value={selectedPriestId}
                  onChange={(e) => setSelectedPriestId(e.target.value)}
                  className="w-full appearance-none bg-white/5 border border-white/12 rounded-xl pl-3.5 pr-9 py-2.5 text-xs text-white focus:outline-none focus:border-[#FFB347]/50"
                >
                  <option value="" className="bg-[#092320] text-white">Any approved priest for this seva</option>
                  {priestOptions.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#092320] text-white">{p.name} — {p.currentCity}, {p.currentState} ({p.yearsExperience} yrs)</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
              </div>
              <p className="text-[11px] text-white/40 mt-1">
                If your chosen Pandit/Priest is unavailable at your preferred time, another approved and equally experienced priest/expert will graciously perform this seva on your behalf.
              </p>
            </div>
            <p className="text-[11px] text-white/40 -mt-1">Your name, gotra, email, phone and Sankalp wish are captured next in the Sankalp Portal.</p>
          </div>
        )}

        {seva.certificateTimeline && (
          <div className="flex items-center space-x-1.5 text-[12px] text-white/50 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-[#5EEAD4] flex-shrink-0" />
            <span>{seva.certificateTimeline}</span>
          </div>
        )}
      </div>

      <button
        id={`sponsor-btn-${seva.id}`}
        onClick={handleContinueOrSubmit}
        className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold py-2.5 rounded-xl text-xs tracking-wider transition-all shadow flex items-center justify-center gap-1.5"
      >
        <Tag className="w-3.5 h-3.5" />
        {formOpen
          ? (isDiscountPromoVisible("seva") ? `SPONSOR SEVA — ${DISCOUNT_TAG} 🙏` : "SPONSOR SEVA 🙏")
          : "CONTINUE"}
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



  // Sponsorship Services visibility — all 5 (FEATURED_SEVAS + EXTRA_SEVAS)
  // now show directly in the carousel/grid on every platform, website and
  // Android app alike. Previously the Android app capped this at the first
  // 2 FEATURED_SEVAS and stranded the other 8 inside a collapsed "More
  // Sacred Sevas" accordion — outside carousel navigation entirely, so a
  // devotee swiping through the carousel on the app could only ever reach
  // 2 of the 10 services. hasHiddenSevas is kept (always false now) so the
  // accordion block below stays inert rather than being ripped out.
  const visibleFeaturedSevas = FEATURED_SEVAS;
  const visibleExtraSevas = EXTRA_SEVAS;
  const hiddenFeaturedSevas: typeof FEATURED_SEVAS = [];
  const hiddenExtraSevas: typeof EXTRA_SEVAS = [];
  const hasHiddenSevas = hiddenFeaturedSevas.length > 0 || hiddenExtraSevas.length > 0;

  return (
    <section id="seva-dashboard-section" className="py-16 bg-[#021816] relative text-white" style={isAndroidApp ? sectionTopPadding(true) : { paddingTop: `calc(var(--safe-area-inset-top, env(safe-area-inset-top, 24px)) + 96px)` }}>
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
            <span className="text-[12px] font-mono text-[#5EEAD4] uppercase tracking-wide bg-[#5EEAD4]/10 border border-[#5EEAD4]/20 px-2.5 py-1 rounded-full">
              All Sevas Start at ₹100
            </span>
          </div>
          {/* ✅ MIGRATED TO SHARED MobileCarousel — this used to be its own
              hand-copied "mobile track + desktop grid" pair, identical in
              shape to five other components' carousels but maintained as a
              separate copy. That's exactly how the Counselling & Guidance /
              Holistic Wellness height-mismatch bug slipped through: one
              copy got a fix, the others didn't. Routing through the shared
              component means a future fix here (or a future audit) only
              has to touch one file, not every carousel in the app. */}
          <MobileCarousel
            items={SEVA_OFFERINGS}
            getKey={(offering) => offering.id}
            cardWidthClassName="w-[clamp(240px,72vw,420px)]"
            renderItem={(offering) => (
              <SevaOfferingCard
                offering={offering}
                isActive={activeOfferingId === offering.id}
                onActivate={() => setActiveOfferingId(offering.id)}
                onOffer={handleOfferSeva}
              />
            )}
          />
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
                <p className="text-[13px] text-white/60 leading-relaxed mt-1.5 max-w-xl">
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
              <span className="text-[12px] font-mono text-red-300 uppercase tracking-wide bg-red-500/10 border border-red-400/20 px-2.5 py-1 rounded-full">
                {DISCOUNT_TAG} All Sevas
              </span>
            )}
          </div>

          {/* ✅ MIGRATED TO SHARED MobileCarousel (see Seva Offerings above
              for why). All 5 Sponsorship Services cards (FEATURED_SEVAS +
              EXTRA_SEVAS) still render here on every platform — website
              and Android app alike; only the wrapper markup changed. */}
          <MobileCarousel
            items={[...visibleFeaturedSevas, ...visibleExtraSevas]}
            getKey={(seva) => seva.id}
            cardWidthClassName="w-[clamp(240px,72vw,420px)]"
            renderItem={(seva) => (
              <SevaCard seva={seva as any} onSponsor={handleSponsor} highlighted={highlightedCardId === seva.id} />
            )}
          />
        </div>

        {/*
          ── Accordion row ──
          hasHiddenSevas is always false now (see visibleFeaturedSevas /
          visibleExtraSevas above) — all 5 Sponsorship Services cards
          render directly in the carousel/grid above on every platform, so
          this block never actually renders. Left in place rather than
          deleted in case a future "too many services to fit" scenario
          needs it again — reactivate by re-introducing a real slice()
          cutoff above.
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
                    <span className="block text-[12px] text-white/50 font-mono mt-0.5">
                      {hiddenFeaturedSevas.length + hiddenExtraSevas.length} additional offerings{isDiscountPromoVisible("seva") ? ` — all ${DISCOUNT_TAG.toLowerCase()}` : ""}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {isDiscountPromoVisible("seva") && (
                    <span className="text-[11px] font-mono text-red-300 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-400/20 hidden sm:inline">
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
        <p className="text-center text-[12px] text-white/35 font-mono mt-8 leading-relaxed max-w-2xl mx-auto">
          Offerings and sevas are performed with devotion as per temple process. Timings may vary depending on temple schedule, festival rush, priest availability, and temple rituals.
        </p>
      </div>

    </section>
  );
}
