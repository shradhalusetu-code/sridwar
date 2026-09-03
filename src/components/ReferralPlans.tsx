/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import {
  Wallet, ShieldCheck, Sparkles, ChevronRight, ChevronLeft, Trophy,
  Gift, TrendingUp, Check, Flame, Landmark, BookOpen, HeartHandshake, Users, Lock, Heart,
} from "lucide-react";
import {
  COMMISSION_STRUCTURE, PLAN_CATEGORIES, PLAN_TIERS_BY_CATEGORY, isDevoteeTier,
  MILESTONE_REWARDS, SEASONAL_CAMPAIGNS, FRAUD_PREVENTION_RULES,
  REFERRAL_CASHBACK_BOOKING_CAP, REFERRAL_CASHBACK_DISCLAIMER,
  isTierUnlocked, tierUnlockRequirementLabel, QUALIFIED_REFERRAL_MIN_BOOKINGS,
  type PlanCategoryId, type DevoteeReferralTier, type ProviderCategoryTier, type ProviderCategoryId,
} from "../data/referralProgram";
import { fetchReferralList } from "../lib/referrals";
import { fetchActivities, recordActivity, recordFormSubmission } from "../lib/activities";
import { syncToGoogleForm, makeSubmissionRef } from "../utils/googleFormSync";
import { downloadConfirmationMessage } from "../utils/devotionalMessages";
import { validateName, validateEmail, validatePhone, firstError } from "../utils/formValidation";
import { gaDonationInitiate } from "../utils/analytics";
import SubscriptionSignup from "./SubscriptionSignup";
import CollapsibleSection from "./CollapsibleSection";
import StoneEngravingNote from "./StoneEngravingNote";
import UPIPaymentModal from "./UPIPaymentModal";

const CATEGORY_ICONS = { Users, Flame, Landmark, Sparkles, BookOpen, HeartHandshake } as const;

// Both the Milestone Rewards list and the Seasonal Campaigns list share this
// exact height + scroll behaviour so the two cards always line up with
// identical dimensions, alignment, and spacing — no matter how many
// campaigns are added later. Milestone Rewards currently has exactly 5
// entries, so it fills this height naturally with no empty space; Seasonal
// Campaigns shows its first 5 (the flagship + most current/recurring ones)
// and reveals the rest through the same internal scroll area.
const REWARD_LIST_HEIGHT = "420px";
const VISIBLE_CAMPAIGN_COUNT = 5;

type BillingCycle = "monthly" | "annual";

interface PlanTierCardProps {
  tier: DevoteeReferralTier | ProviderCategoryTier;
  billing: BillingCycle;
  onSelect: () => void;
  unlocked: boolean;
  unlockRequirement: string;
  /** Only used by the Diya Circle voluntary-contribution block below, to
   *  attribute a logged-in devotee's name on the UPI payment screen — the
   *  contribution itself works fine for guests too (devoteeName falls back
   *  to "Devotee"). */
  userProfile?: { name: string; email: string };
}

// Uniform-height card for the 3 "Your Cashback, Every Time They Book"
// tiers — flex-col + flex-1 description so the tallest tier's copy never
// makes that card taller than its siblings in the carousel/grid row.
function CashbackTierCard({ tier }: { tier: import("../data/referralProgram").CommissionTier }) {
  return (
    <div className="bg-[#021816] border border-white/10 rounded-2xl p-4 text-center flex flex-col h-full">
      <span className="block text-3xl font-serif font-black text-[#FFB347]">{tier.rate}%</span>
      <span className="block text-xs font-bold text-white uppercase tracking-wide mt-1">{tier.bookingLabel}</span>
      <p className="text-[13px] text-white/55 mt-2 leading-snug flex-1">{tier.description}</p>
    </div>
  );
}

function PlanTierCard({ tier, billing, onSelect, unlocked, unlockRequirement, userProfile }: PlanTierCardProps) {
  const isFree = tier.monthlyPrice === 0;
  const priceLabel = billing === "monthly" ? tier.monthlyPriceLabel : tier.annualPriceLabel;
  // ─── Compact-by-default card (mobile/tablet) — Stage 5 ──────────────────
  // Same progressive-disclosure pattern as SevaOfferingCard.tsx /
  // BazaarOfferingCard.tsx / AboutUs.tsx's FounderCard: name → primary
  // benefit → price → one key highlight → "Explore" up front on phone/
  // tablet; the full feature list, bonus perks, and the real signup/CTA
  // button sit behind a tap. Desktop (lg+) always renders the full card,
  // exactly as before.
  const [expanded, setExpanded] = useState<boolean>(
    () => typeof window !== "undefined" && !!window.matchMedia?.("(min-width: 1024px)")?.matches
  );
  // Single "key highlight" line for the collapsed view — the same first
  // fact already used in the full feature list below, never new copy.
  const keyHighlight = isDevoteeTier(tier) ? tier.referralCapacity : tier.servicesIncluded;

  // ✅ DIYA CIRCLE VOLUNTARY CONTRIBUTION (2026-08-27): a lightweight,
  // self-contained "wish to contribute voluntarily?" option — same amount
  // tiers, custom-amount input, and Stone-Name Engraving note used on the
  // Contact page — added ONLY to the Diya Circle card (see the gated
  // render block below).
  //
  // ✅ GOOGLE FORM SYNC PARITY (2026-08-27): now wired into the exact same
  // Google Forms/Apps Script sync every other voluntary-contribution flow
  // on the site uses — reusing the existing "customer_contact" sync
  // category (the same one ContactUs.tsx's own "Divine Contribution"
  // block already syncs through) rather than inventing a new form/sheet
  // category, exactly as requested. That keeps the Apps Script message
  // content, email notifications, and sheet mapping identical to Contact's
  // — no separate backend change needed. A "Pending" row is sent the
  // instant a devotee taps "Contribute" (name/email/phone + amount, before
  // payment), and the ONE Final row (sharing the same Ref ID) is sent once
  // the payment intent is submitted — same pending→final convention used
  // by Contact, Report an Issue, and Auth Dashboard's contribution flows.
  // recordFormSubmission (Supabase form_submissions ledger) and
  // recordActivity (Supabase activities ledger, drives
  // certificateService.ts's confirmation/PDF pipeline) both fire
  // alongside the sync, matching every other contribution flow.
  const [showDiyaContribute, setShowDiyaContribute] = useState(false);
  const [diyaName, setDiyaName] = useState(userProfile?.name || "");
  const [diyaEmail, setDiyaEmail] = useState(userProfile?.email || "");
  const [diyaPhone, setDiyaPhone] = useState("");
  const [diyaAmount, setDiyaAmount] = useState<number | null>(null);
  const [showDiyaUPI, setShowDiyaUPI] = useState(false);
  const [diyaContributed, setDiyaContributed] = useState<{ amount: number; method: string } | null>(null);
  const diyaRefIdRef = useRef(makeSubmissionRef("DIYA"));

  // Step 1 — "Contribute" tapped: validate details, sync the Pending row to
  // Google Forms + Supabase (same as every other contribution flow), then
  // open the UPI payment portal.
  const handleDiyaContributeStart = () => {
    const err = firstError(validateName(diyaName), validateEmail(diyaEmail), validatePhone(diyaPhone));
    if (err) { alert(err); return; }
    if (!diyaAmount || diyaAmount < 5) { alert("Minimum divine contribution is ₹5"); return; }

    gaDonationInitiate(diyaAmount);

    syncToGoogleForm("customer_contact", {
      name: diyaName, email: diyaEmail, phone: diyaPhone,
      type: "Diya Circle Voluntary Contribution",
      details: `Diya Circle devotee wishes to support Sri Dwar's temples. [Contribution: Pending — Awaiting Decision, Amount: ₹${diyaAmount}] [Ref: ${diyaRefIdRef.current}]`,
    }).catch((err) => console.error("Diya Circle pending sync error:", err));

    recordFormSubmission({
      formType: "contact_us",
      name: diyaName, email: diyaEmail, phone: diyaPhone,
      refId: diyaRefIdRef.current,
      payload: { source: "diya_circle", amount: diyaAmount, contribution: "pending", status: "pending" },
    });

    setShowDiyaUPI(true);
  };

  const handleDiyaContributionPaid = (details: { amount: number; method: "UPI" | "WhatsApp Pay" }) => {
    syncToGoogleForm("customer_contact", {
      name: diyaName, email: diyaEmail, phone: diyaPhone,
      type: "Diya Circle Voluntary Contribution",
      details: `Diya Circle devotee wishes to support Sri Dwar's temples. [Contribution: ₹${details.amount} via ${details.method}] [Ref: ${diyaRefIdRef.current}]`,
    }).catch((err) => console.error("Diya Circle final sync error:", err));

    recordFormSubmission({
      formType: "contact_us",
      name: diyaName, email: diyaEmail, phone: diyaPhone,
      refId: diyaRefIdRef.current,
      payload: { source: "diya_circle", amount: details.amount, contribution: `₹${details.amount} via ${details.method}` },
    });

    recordActivity({
      activityType: "contribution",
      itemName: "Diya Circle Voluntary Contribution",
      amount: details.amount,
      refId: diyaRefIdRef.current,
      paymentMethod: details.method,
      paymentStatus: "pending_verification",
    });
    setShowDiyaUPI(false);
    setDiyaContributed({ amount: details.amount, method: details.method });
  };

  // Locked tiers are still listed by name, with a real preview of what's
  // included — so devotees and providers can see the full 5-tier ladder
  // ahead of them and what it unlocks — but pricing and the signup CTA
  // stay hidden until the eligibility requirement is met.
  if (!unlocked) {
    const previewLines = isDevoteeTier(tier)
      ? [tier.referralCapacity, tier.milestoneBonusMultiplier]
      : [tier.servicesIncluded, tier.feeModel, tier.commissionEligibility];

    return (
      <div className="relative flex flex-col flex-1 bg-[#092320]/60 border border-dashed border-white/10 rounded-2xl p-4">
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-white/30" />
          <span className="font-serif text-base font-bold text-white/60">{tier.name}</span>
        </div>
        {isDevoteeTier(tier) && (
          <span className="block text-2xl font-serif font-black text-white/30 mt-1.5 text-left">{tier.cashbackRatePercent}% Cashback</span>
        )}
        <p className="text-[12px] text-white/35 mt-1 mb-3 leading-snug">{tier.tagline}</p>

        <div className="space-y-1.5 text-[12px] text-white/45 flex-1">
          {previewLines.map((line) => (
            <div key={line} className="flex gap-1.5"><Check className="w-3 h-3 text-white/25 shrink-0 mt-0.5" /><span>{line}</span></div>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t border-white/5 text-center">
          <span className="block text-[11px] text-[#FFB347]/70 font-semibold leading-snug mb-2">{unlockRequirement}</span>
          <span className="inline-block text-[11px] font-bold text-white/30 uppercase tracking-wide border border-white/10 rounded-full px-2.5 py-1">
            Locked — pricing revealed on unlock
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col flex-1 bg-[#092320] border rounded-2xl p-4 ${
        tier.highlight ? "border-[#FFB347] shadow-lg shadow-[#FFB347]/10" : isFree ? "border-[#5EEAD4]/50 shadow-lg shadow-[#5EEAD4]/10" : "border-white/10"
      }`}
    >
      {tier.highlight && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#FFB347] text-[#021816] text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
          Most Popular
        </span>
      )}
      {!tier.highlight && isFree && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#5EEAD4] text-[#021816] text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
          Always Free
        </span>
      )}

      <span className="font-serif text-base font-bold text-white">{tier.name}</span>
      <span className={`text-lg font-serif font-black mt-0.5 ${isFree ? "text-[#5EEAD4]" : "text-[#FFB347]"}`}>{priceLabel}</span>
      {!isFree && billing === "annual" && (
        <span className="text-[11px] text-[#5EEAD4] font-semibold">{tier.annualSavingsLabel}</span>
      )}
      {/* ✅ CONTRIBUTION-BENEFITS UPDATE: annual plans previously only showed
          a "days free" discount label — no explanation of what extra VALUE
          (beyond the discount) an annual subscriber gets over a monthly
          one. Shown only for provider tiers that define annualExtraBenefit
          (currently the 5-Tier Pujari Service Paths) so the monthly vs.
          annual choice is obviously and meaningfully different, not just a
          price discount. */}
      {!isFree && billing === "annual" && !isDevoteeTier(tier) && tier.annualExtraBenefit && (
        <p className="text-[11px] text-white/45 leading-snug mt-1 mb-1.5 border-l-2 border-[#5EEAD4]/40 pl-2">
          <span className="text-[#5EEAD4] font-semibold">Annual-only: </span>{tier.annualExtraBenefit}
        </p>
      )}
      {isDevoteeTier(tier) && (
        <span className="text-2xl font-serif font-black text-[#FFB347] mt-1.5">{tier.cashbackRatePercent}% Cashback</span>
      )}
      <p className="text-[12px] text-white/50 mt-1 mb-3 leading-snug">{tier.tagline}</p>

      {/* Collapsed summary — phone/tablet only, before expansion.
          ✅ UNIFORM-HEIGHT FIX: this used to be a plain (non-flex) block,
          so its "Explore" button sat directly after the highlight line
          with no filler. The locked-tier card above it anchors its footer
          badge to the bottom via a `flex-1` spacer; this collapsed card
          had no equivalent, so under the same stretched row height, the
          locked cards' filler landed ABOVE their badge (pushing it down
          to match) while this card's leftover space landed as plain
          background BELOW its button — the exact mismatch behind the
          "Diya Circle looks fine, Kalash/Shankh Circle have a huge gap"
          symptom. Making this a `flex-1 flex flex-col` and anchoring
          "Explore" with `mt-auto` gives it the identical bottom-anchored
          behavior as the locked-card variant, so every card in the row
          distributes its stretched height the same way. */}
      {!expanded && (
        <div className="lg:hidden flex flex-col flex-1">
          <div className="flex gap-1.5 text-[12px] text-white/70 mb-3">
            <Check className="w-3 h-3 text-[#5EEAD4] shrink-0 mt-0.5" /><span>{keyHighlight}</span>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-expanded={expanded}
            className={`w-full text-center text-[13px] font-bold px-3 py-2 rounded-full transition-all mt-auto ${
              isFree
                ? "bg-[#5EEAD4] text-[#021816] border border-[#5EEAD4] hover:opacity-90"
                : "border border-[#FFB347]/40 text-[#FFB347] hover:bg-[#FFB347] hover:text-[#021816]"
            }`}
          >
            Explore
          </button>
        </div>
      )}

      {/* Full feature list, bonus perks & real signup CTA — always visible
          on desktop (lg:block), shown on phone/tablet only once expanded. */}
      <div className={`${expanded ? "block" : "hidden"} lg:block`}>
      <div className="space-y-1.5 text-[12px] text-white/70 flex-1">
        {isDevoteeTier(tier) ? (
          <>
            <div className="flex gap-1.5"><Wallet className="w-3 h-3 text-[#FFB347] shrink-0 mt-0.5" /><span>{tier.referralCapacity}</span></div>
            <div className="flex gap-1.5"><Trophy className="w-3 h-3 text-[#5EEAD4] shrink-0 mt-0.5" /><span>{tier.milestoneBonusMultiplier}</span></div>
            <div className="flex gap-1.5"><Check className="w-3 h-3 text-[#5EEAD4] shrink-0 mt-0.5" /><span>{tier.payoutSpeed}</span></div>
            <div className="flex gap-1.5"><Check className="w-3 h-3 text-[#5EEAD4] shrink-0 mt-0.5" /><span>{tier.referralSupport}</span></div>
          </>
        ) : (
          <>
            {/* Simplified into a short, category-specific service list rather
                than a dense multi-row comparison table — full detail (reach,
                analytics tier, payout speed, support) is still shown in the
                signup modal once a devotee/provider picks this tier. */}
            <div className="flex gap-1.5"><Check className="w-3 h-3 text-[#5EEAD4] shrink-0 mt-0.5" /><span>{tier.servicesIncluded}</span></div>
            <div className="flex gap-1.5"><Wallet className="w-3 h-3 text-[#FFB347] shrink-0 mt-0.5" /><span>{tier.feeModel}</span></div>
            <div className="flex gap-1.5"><Wallet className="w-3 h-3 text-[#FFB347] shrink-0 mt-0.5" /><span>{tier.commissionEligibility}</span></div>
            {(tier.priorityListing || tier.premiumVisibility || tier.verifiedBadge || tier.marketingTools) && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {tier.priorityListing && <span className="text-[11px] font-semibold text-[#5EEAD4] bg-[#5EEAD4]/10 border border-[#5EEAD4]/20 rounded-full px-1.5 py-0.5">Priority listing</span>}
                {tier.premiumVisibility && <span className="text-[11px] font-semibold text-[#5EEAD4] bg-[#5EEAD4]/10 border border-[#5EEAD4]/20 rounded-full px-1.5 py-0.5">Premium visibility</span>}
                {tier.verifiedBadge && <span className="text-[11px] font-semibold text-[#FFB347] bg-[#FFB347]/10 border border-[#FFB347]/20 rounded-full px-1.5 py-0.5">Verified badge</span>}
                {tier.marketingTools && <span className="text-[11px] font-semibold text-[#5EEAD4] bg-[#5EEAD4]/10 border border-[#5EEAD4]/20 rounded-full px-1.5 py-0.5">Marketing tools</span>}
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
        {(isDevoteeTier(tier) ? tier.bonusPerks : tier.exclusiveBenefits).slice(0, 3).map((b) => (
          <span key={b} className="block text-[11px] text-white/45 leading-snug">✦ {b}</span>
        ))}
      </div>

      <button
        onClick={onSelect}
        className={`mt-3 w-full text-center text-[13px] font-bold px-3 py-2 rounded-full transition-all ${
          isFree
            ? "bg-[#5EEAD4] text-[#021816] border border-[#5EEAD4] hover:opacity-90"
            : "border border-[#FFB347]/40 text-[#FFB347] hover:bg-[#FFB347] hover:text-[#021816]"
        }`}
      >
        {tier.ctaLabel}
      </button>

      {/* ✅ DIYA CIRCLE VOLUNTARY CONTRIBUTION (2026-08-27): only for the
          free, entry-level Diya Circle devotee tier — same voluntary-
          contribution amounts, custom-amount input, and Stone-Name
          Engraving note as the Contact page, so a devotee who wants to
          support Sri Dwar's temples right away (before ever booking
          anything) can do so from here too. */}
      {isDevoteeTier(tier) && tier.id === "diya" && (
        <div className="mt-3 pt-3 border-t border-white/5">
          {showDiyaUPI && (
            <UPIPaymentModal
              isOpen={showDiyaUPI}
              onClose={() => setShowDiyaUPI(false)}
              onPaymentConfirmed={handleDiyaContributionPaid}
              amount={diyaAmount}
              bookingName="Diya Circle Voluntary Contribution"
              devoteeName={diyaName || "Devotee"}
              refId={diyaRefIdRef.current}
              allowCustomAmount={true}
              minAmount={5}
              maxAmount={1000}
              isVoluntaryContribution={true}
            />
          )}

          {diyaContributed ? (
            <div className="space-y-2 text-center">
              <p className="text-[12px] text-[#5EEAD4] font-semibold leading-snug">
                🙏 Contribution of ₹{diyaContributed.amount} noted — thank you for lighting this diya.
              </p>
              <button
                type="button"
                onClick={() =>
                  downloadConfirmationMessage({
                    category: "support_contribution",
                    serviceName: "Diya Circle Voluntary Contribution",
                    devoteeName: diyaName,
                    refId: diyaRefIdRef.current,
                    amount: diyaContributed?.amount,
                  })
                }
                className="w-full flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/15 text-[#5EEAD4] font-bold py-2 rounded-lg text-[11px] transition-all tracking-wide uppercase"
              >Download Confirmation</button>
            </div>
          ) : showDiyaContribute ? (
            <div className="space-y-2.5 animate-slideUp">
              <p className="text-[11px] text-white/55 leading-relaxed">
                Wish to support Sri Dwar's temples right away, even before your first booking? Every diya lit here helps.
              </p>

              <StoneEngravingNote variant="compact" showRepeatNote className="text-left" />

              {/* Name / Email / Phone — required so this contribution can sync
                  to Google Forms exactly like every other contribution flow
                  on the site (Contact, Report an Issue, Auth Dashboard),
                  even for a guest devotee with no logged-in profile. */}
              <input
                type="text"
                placeholder="Full Name *"
                value={diyaName}
                onChange={(e) => setDiyaName(e.target.value)}
                className="w-full text-[11px] px-2.5 py-2 rounded-lg border border-white/10 bg-[#021816] text-white focus:outline-none focus:border-[#FFB347] placeholder-white/30"
              />
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="email"
                  placeholder="Email *"
                  value={diyaEmail}
                  onChange={(e) => setDiyaEmail(e.target.value)}
                  className="text-[11px] px-2.5 py-2 rounded-lg border border-white/10 bg-[#021816] text-white focus:outline-none focus:border-[#FFB347] placeholder-white/30"
                />
                <input
                  type="tel"
                  placeholder="Phone *"
                  value={diyaPhone}
                  onChange={(e) => setDiyaPhone(e.target.value)}
                  className="text-[11px] px-2.5 py-2 rounded-lg border border-white/10 bg-[#021816] text-white focus:outline-none focus:border-[#FFB347] placeholder-white/30"
                />
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {[51, 101, 251].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDiyaAmount(amt)}
                    className={`text-[11px] py-2 rounded-lg border font-bold transition-all ${
                      diyaAmount === amt ? "bg-white/10 border-[#FFB347] text-[#FFB347]" : "bg-black/20 border-white/10 text-white/70 hover:bg-black/30"
                    }`}
                  >₹{amt}</button>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-white/50 text-[11px]">₹</span>
                <input
                  type="number"
                  min={5}
                  max={1000}
                  placeholder="Custom amount (₹5–₹1000)"
                  value={diyaAmount || ""}
                  onChange={(e) => setDiyaAmount(Math.min(1000, Math.max(5, Number(e.target.value))))}
                  className="flex-1 text-[11px] px-2.5 py-2 rounded-lg border border-white/10 bg-[#021816] text-white focus:outline-none focus:border-[#FFB347] placeholder-white/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setShowDiyaContribute(false); setDiyaAmount(null); }}
                  className="bg-white/5 hover:bg-white/10 text-white/70 font-semibold py-2 rounded-lg text-[11px] border border-white/10 transition-all"
                >Cancel</button>
                <button
                  type="button"
                  onClick={handleDiyaContributeStart}
                  disabled={!diyaAmount}
                  className="bg-[#FFB347] hover:bg-[#F27D26] disabled:bg-white/10 disabled:text-white/30 text-[#021816] font-extrabold py-2 rounded-lg text-[11px] uppercase tracking-wide transition-all"
                >Contribute 🙏</button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDiyaContribute(true)}
              className="w-full flex items-center justify-center gap-1.5 text-[12px] font-semibold text-[#FFB347]/90 hover:text-[#FFB347] py-1.5"
            >
              <Heart className="w-3.5 h-3.5" /> Wish to contribute voluntarily?
            </button>
          )}
        </div>
      )}

      {/* Collapse back — phone/tablet only */}
      <button
        type="button"
        onClick={() => setExpanded(false)}
        aria-expanded={expanded}
        className="lg:hidden w-full text-center text-[12px] font-semibold text-white/45 hover:text-white/70 mt-2 pt-1"
      >
        Show less
      </button>
      </div>
    </div>
  );
}

interface ReferralPlansProps {
  onNavigate: (page: string) => void;
  onOpenLegalDoc: (doc: string) => void;
  userProfile?: { name: string; email: string };
  /** Opens the "Setu Yatra Challenge" promo modal (owned by App.tsx / the
   *  OfferPopup component) — the same modal the homepage Hero button used
   *  to open before the button moved here. */
  onOpenSetuYatra: () => void;
}

/**
 * Dedicated Plans page for the Dharmic Referral & Cashback Ecosystem.
 * Holds every deep-detail section that used to live inline on the homepage:
 * cashback structure, milestone rewards, seasonal campaigns, the six 5-tier
 * subscription ladders, fraud protection, and the cashback disclaimer.
 */
export default function ReferralPlans({ onNavigate, onOpenLegalDoc, userProfile, onOpenSetuYatra }: ReferralPlansProps) {
  const [activeCategory, setActiveCategory] = useState<PlanCategoryId>("devotee");
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const [activeSignup, setActiveSignup] = useState<{ tier: DevoteeReferralTier | ProviderCategoryTier; billing: BillingCycle } | null>(null);
  const [showAllCampaigns, setShowAllCampaigns] = useState(false);

  // Drives the 5-tier unlock ladder below. Guests and brand-new users get 0
  // here, so they see only their entry tier. This never throws and never
  // blocks page render.
  //
  // For the "devotee" category, the unlock count is the devotee's OWN
  // engagement score — their own confirmed pujas/sevas/divine contributions —
  // fetched via lib/activities.fetchActivities. It is never a referral or
  // recruitment count. For the five provider categories, the unlock count
  // is verified referred devotees (genuine customers the provider brought
  // to the platform, each with 2+ bookings), fetched via
  // lib/referrals.fetchReferralList — providers are no longer gated on
  // recruiting other paying professionals.
  const [devoteeEngagementScore, setDevoteeEngagementScore] = useState(0);
  const [qualifiedReferredDevoteeCount, setQualifiedReferredDevoteeCount] = useState(0);
  useEffect(() => {
    let cancelled = false;

    fetchActivities().then((records) => {
      if (cancelled) return;
      const confirmedCount = records.filter((r) => r.paymentStatus === "confirmed").length;
      setDevoteeEngagementScore(confirmedCount);
    });

    fetchReferralList().then((list) => {
      if (cancelled) return;
      const devoteeCount = list.filter(
        (r) => r.status === "active" && r.referredParticipantType === "devotee" && r.bookingCount >= QUALIFIED_REFERRAL_MIN_BOOKINGS
      ).length;
      setQualifiedReferredDevoteeCount(devoteeCount);
    });

    return () => { cancelled = true; };
  }, []);

  const activeCategoryMeta = PLAN_CATEGORIES.find((c) => c.id === activeCategory) ?? PLAN_CATEGORIES[0];
  const activeTiers = PLAN_TIERS_BY_CATEGORY[activeCategory];

  return (
    <section
      className="pb-14 bg-gradient-to-b from-[#021816] to-[#021816] relative text-white min-h-screen"
      style={{ paddingTop: `calc(var(--safe-area-inset-top, env(safe-area-inset-top, 24px)) + 96px)` }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Breadcrumb / page header */}
        <button
          onClick={() => onNavigate("home")}
          className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white mb-4 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back to Home
        </button>

        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="text-xs font-semibold text-[#FFB347]/80 tracking-wider font-mono">Dharmic referral & cashback ecosystem</span>
          <h1 className="text-3xl sm:text-4xl font-serif font-black text-white tracking-tight">
            Plans, Rewards & Cashback Details
          </h1>
          <p className="text-sm text-white/70">
            Everything you need to choose your circle or service path — tier-by-tier cashback rates, milestone rewards,
            seasonal campaigns, fraud protection, and the full terms behind every rupee you earn.
          </p>
        </div>

        {/* Subscription Plans — six fully separate plan systems, shown first
            so devotees can pick their circle/path before the deeper detail
            (cashback structure, milestones, campaigns) below. */}
        <div className="mb-8">
          <h2 className="font-serif text-lg font-bold text-white mb-3">{activeCategoryMeta.planLabel}</h2>

          {/* Category tabs */}
          <div className="flex flex-wrap gap-2 mb-3">
            {PLAN_CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.icon];
              const active = cat.id === activeCategory;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    active ? "bg-[#FFB347] text-[#021816] border-[#FFB347]" : "bg-[#092320] text-white/60 border-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cat.tabLabel}
                </button>
              );
            })}
          </div>

          {/* Monthly / Annual toggle */}
          <div className="flex items-center gap-2 mb-4">
            <div className="inline-flex bg-[#092320] border border-white/10 rounded-full p-1">
              <button
                onClick={() => setBilling("monthly")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${billing === "monthly" ? "bg-white text-[#021816]" : "text-white/50 hover:text-white"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling("annual")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${billing === "annual" ? "bg-white text-[#021816]" : "text-white/50 hover:text-white"}`}
              >
                Annual
              </button>
            </div>
            {/* ✅ "Save with annual billing — up to N days free" banner
                removed entirely, per request — no longer shown for any
                category (Devotees, Pujaris, Puja Mandals, Yoga Gurus,
                Dharmic Experts, Seva Providers). Each tier's own card still
                shows its real annualSavingsLabel (e.g. "45 days free") when
                Annual is selected, so that per-tier detail is unaffected. */}
          </div>

          <p className="text-[13px] text-white/50 mb-3 max-w-2xl md:max-w-none">{activeCategoryMeta.intro}</p>

          {activeCategory === "devotee" && (
            <p className="text-[13px] text-white/60 mb-4 max-w-2xl md:max-w-none">
              On top of your standard booking cashback, each Devotee Referral Circle tier earns an{" "}
              <span className="font-black text-[#FFB347]">additional</span> referral cashback:{" "}
              {(activeTiers as DevoteeReferralTier[]).map((tier, i, arr) => (
                <span key={tier.id}>
                  <span className="font-black text-[#FFB347]">{tier.cashbackRatePercent}%</span>
                  {i < arr.length - 1 ? (i === arr.length - 2 ? ", and " : ", ") : ""}
                </span>
              ))}{" "}
              across the five tiers.
            </p>
          )}

          {/* Mobile/app: horizontal snap carousel — matches the Seva
              Offerings / Bazaar Offerings carousel pattern. Desktop (lg+):
              unchanged 5-column grid.
              ✅ HEIGHT-MISMATCH FIX v3 (Diya Circle vs Kalash Circle) —
              supersedes the v2 note that used to be here. v2 restored
              `h-full [&>*]:h-full` on the theory that this track was the
              one deviating from every other carousel's working pattern.
              That theory has since been directly disproven in
              shared/MobileCarousel.tsx (2026-09-01/02, verified with real
              rendered measurements): `h-full` on a wrapper whose parent
              track has no explicit height (auto, sized to `w-max` +
              `overflow-x-auto`) creates a percentage-of-auto-height
              container, which is self-referential/indeterminate — browsers
              resolve it by falling back to each item's own natural content
              height, silently defeating `items-stretch`, which is already
              the complete, correct fix on its own. This track was never
              migrated to match that finding after PlanTierCard's own
              `flex-1` root was added, so it was carrying BOTH the
              currently-correct mechanism (items-stretch + flex-1) AND the
              disproven one (h-full) at the same time — the second one
              actively undoing the first. Removed `h-full [&>*]:h-full`
              here so this track matches shared/MobileCarousel.tsx's
              verified-correct pattern; `flex-1` on PlanTierCard's root
              (unchanged) is what actually fills the now-correctly-resolved
              stretched height. */}
          <div className="lg:hidden -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto no-scrollbar snap-x snap-mandatory">
            <div className="flex gap-3 w-max pt-4 pb-1 items-stretch">
              {activeTiers.map((tier, index) => {
                const qualifiedCount = activeCategory === "devotee" ? devoteeEngagementScore : qualifiedReferredDevoteeCount;
                return (
                  <div key={tier.id} className="snap-start shrink-0 flex flex-col w-[clamp(210px,62vw,360px)]">
                    <PlanTierCard
                      tier={tier}
                      billing={billing}
                      onSelect={() => setActiveSignup({ tier, billing })}
                      unlocked={isTierUnlocked(activeCategory, index, qualifiedCount)}
                      unlockRequirement={tierUnlockRequirementLabel(activeCategory, index)}
                      userProfile={userProfile}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="hidden lg:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {activeTiers.map((tier, index) => {
              const qualifiedCount = activeCategory === "devotee" ? devoteeEngagementScore : qualifiedReferredDevoteeCount;
              return (
                <PlanTierCard
                  key={tier.id}
                  tier={tier}
                  billing={billing}
                  onSelect={() => setActiveSignup({ tier, billing })}
                  unlocked={isTierUnlocked(activeCategory, index, qualifiedCount)}
                  unlockRequirement={tierUnlockRequirementLabel(activeCategory, index)}
                  userProfile={userProfile}
                />
              );
            })}
          </div>

          <p className="text-[12px] text-white/40 mt-3 italic">
            {activeCategory === "devotee"
              ? "The Devotee Circles are always free — there is no subscription fee at any tier. Referral cashback and bonus figures are good-faith average estimates based on platform activity, not guaranteed income."
              : "Lead, fee, and opportunity figures are good-faith average estimates based on platform activity, not guaranteed income. Subscription fees are service fees for platform benefits, not an investment."}
          </p>
          <p className="text-[12px] text-white/40 mt-1 italic">
            {activeCategory === "devotee"
              ? "New devotees start on the first Circle. Higher Circles unlock automatically as your own genuine bookings and verified community divine contributions grow — never by recruiting other people or paying for a higher tier."
              : "New providers start on the first tier of each ladder. Higher tiers unlock automatically as verified referred devotees (genuine customers) grow — no separate application needed."}
          </p>
        </div>

        {/* Cashback Structure */}
        <div className="bg-[#092320] border border-[#FFB347]/20 rounded-3xl p-5 sm:p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-[#FFB347]" />
            <h2 className="font-serif text-lg font-bold text-white">Your Cashback, Every Time They Book</h2>
          </div>
          {/* Mobile/app: horizontal snap carousel — same Temple Bazaar top-6
              pattern used across the site, so all 3 cashback tier cards
              render at a fixed uniform width/height. Desktop (lg+):
              unchanged 3-column grid.
              ✅ Same h-full [&>*]:h-full removal as the tier carousel above
              — CashbackTierCard already carries its own `flex flex-col
              h-full`, so `items-stretch` on the track alone is sufficient
              (see shared/MobileCarousel.tsx). */}
          <div className="sm:hidden -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto no-scrollbar snap-x snap-mandatory">
            <div className="flex gap-3 w-max pt-4 pb-1 items-stretch">
              {COMMISSION_STRUCTURE.map((tier) => (
                <div key={tier.bookingLabel} className="snap-start shrink-0 w-[clamp(170px,52vw,300px)]">
                  <CashbackTierCard tier={tier} />
                </div>
              ))}
            </div>
          </div>
          <div className="hidden sm:grid grid-cols-3 gap-3 items-stretch">
            {COMMISSION_STRUCTURE.map((tier) => (
              <div key={tier.bookingLabel}>
                <CashbackTierCard tier={tier} />
              </div>
            ))}
          </div>
          <p className="text-[12px] text-white/40 mt-4 italic">
            Cashback percentages reset per referred devotee, apply to eligible, paid bookings only, and stop accruing after that
            devotee's {REFERRAL_CASHBACK_BOOKING_CAP}th successful booking. Higher subscription tiers unlock boosted cashback percentages —
            see plans above.
          </p>
        </div>

        {/* Milestones & Seasonal Campaigns — identical card dimensions, alignment & spacing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8 items-stretch">
          <div className="bg-[#092320] border border-white/10 rounded-3xl p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5 text-[#5EEAD4]" />
              <h2 className="font-serif text-base font-bold text-white">Milestone Rewards</h2>
            </div>
            <div className="space-y-2.5 overflow-y-auto pr-1" style={{ maxHeight: REWARD_LIST_HEIGHT }}>
              {MILESTONE_REWARDS.map((m) => (
                <div key={m.title} className="flex items-start gap-3 bg-[#021816] border border-white/5 rounded-xl p-3 min-h-[68px]">
                  <span className="text-xl leading-none">{m.icon}</span>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block">{m.title}</span>
                    <span className="text-[12px] text-white/50 block line-clamp-2">{m.requirement}</span>
                    <span className="text-[12px] text-[#FFB347] font-semibold block mt-0.5">{m.reward}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#092320] border border-white/10 rounded-3xl p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-[#5EEAD4]" />
                <h2 className="font-serif text-base font-bold text-white">Seasonal Campaigns & Grand Prizes</h2>
              </div>
              <span className="text-[11px] text-white/40 font-mono">
                {showAllCampaigns ? `All ${SEASONAL_CAMPAIGNS.length}` : `${VISIBLE_CAMPAIGN_COUNT} of ${SEASONAL_CAMPAIGNS.length}`}
              </span>
            </div>
            <div
              className="space-y-2.5 overflow-y-auto pr-1"
              style={{ maxHeight: REWARD_LIST_HEIGHT }}
              onScroll={(e) => {
                if (!showAllCampaigns && e.currentTarget.scrollTop > 4) setShowAllCampaigns(true);
              }}
            >
              {(showAllCampaigns ? SEASONAL_CAMPAIGNS : SEASONAL_CAMPAIGNS.slice(0, VISIBLE_CAMPAIGN_COUNT)).map((c) => (
                <div key={c.name} className="bg-[#021816] border border-white/5 rounded-xl p-3 min-h-[68px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white">{c.name}</span>
                    <span className="text-[11px] font-mono text-[#FFB347] bg-[#FFB347]/10 px-2 py-0.5 rounded-full border border-[#FFB347]/20 shrink-0">{c.window}</span>
                  </div>
                  <p className="text-[12px] text-white/55 mt-1 leading-snug line-clamp-2">{c.description}</p>
                </div>
              ))}
              {!showAllCampaigns && SEASONAL_CAMPAIGNS.length > VISIBLE_CAMPAIGN_COUNT && (
                <button
                  onClick={() => setShowAllCampaigns(true)}
                  className="w-full text-center text-[12px] font-bold text-[#FFB347] hover:text-white py-2 rounded-xl border border-dashed border-[#FFB347]/30 hover:border-[#FFB347]/60 transition-colors"
                >
                  Scroll or tap to see {SEASONAL_CAMPAIGNS.length - VISIBLE_CAMPAIGN_COUNT} more campaigns
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Trust / Fraud Prevention / Legal strip — collapsed by default on
            phone/tablet (CollapsibleSection), fully expanded on desktop,
            same as every other long section on this page. */}
        <div className="bg-[#092320] border border-white/10 rounded-3xl p-5 sm:p-6">
          <CollapsibleSection
            icon={<ShieldCheck className="w-5 h-5 text-[#5EEAD4]" />}
            title="Secure, Fair & Fraud-Protected"
            summary="One person, one Dharmic ID; cashback only on real, paid bookings; KYC above payout thresholds; consent-gated contact sharing; manual + automated review. Tap to read the full fraud-protection rules and cashback disclaimer."
          >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 mb-4">
            {FRAUD_PREVENTION_RULES.map((r) => (
              <div key={r.title} className="bg-[#021816] border border-white/5 rounded-xl p-3">
                <span className="text-[12px] font-bold text-white block mb-1">{r.title}</span>
                <span className="text-[11px] text-white/50 leading-snug block">{r.description}</span>
              </div>
            ))}
          </div>

          <div className="bg-[#021816] border border-[#FFB347]/20 rounded-2xl p-4 mb-4">
            <span className="text-[12px] font-bold text-[#FFB347] block mb-1.5 uppercase tracking-wide">{REFERRAL_CASHBACK_DISCLAIMER.title}</span>
            <ul className="space-y-1">
              {REFERRAL_CASHBACK_DISCLAIMER.points.map((point) => (
                <li key={point} className="text-[11px] text-white/50 leading-snug flex gap-1.5">
                  <span className="text-[#FFB347]/60">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
            <span className="text-white/50">Every Dharmic ID's referral data is protected under our:</span>
            <button onClick={() => onOpenLegalDoc("referral")} className="text-[#FFB347] font-bold underline underline-offset-2 hover:text-white flex items-center gap-1">
              Refer & Earn Program Terms <ChevronRight className="w-3 h-3" />
            </button>
            <button onClick={() => onOpenLegalDoc("privacy")} className="text-[#FFB347] font-bold underline underline-offset-2 hover:text-white flex items-center gap-1">
              Privacy Policy <ChevronRight className="w-3 h-3" />
            </button>
            <button onClick={() => onOpenLegalDoc("disclaimer")} className="text-[#FFB347] font-bold underline underline-offset-2 hover:text-white flex items-center gap-1">
              Legal Disclaimer <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          </CollapsibleSection>
        </div>

        {/* Setu Yatra Challenge — moved here from the homepage Hero, same
            button, same pulsing saffron/flame treatment, same modal
            (OfferPopup, owned by App.tsx). Just relocated below Plans,
            Rewards & Cashback Details, not redesigned. */}
        <div className="flex justify-center mt-8">
          <button
            id="plans-setu-yatra-cta"
            onClick={onOpenSetuYatra}
            className="relative bg-gradient-to-r from-[#3730A3] via-[#6D28D9] to-[#7C3AED] hover:from-[#4338CA] hover:via-[#7C3AED] hover:to-[#8B5CF6] text-white font-extrabold text-xs uppercase tracking-widest px-6 py-4 rounded-full transition-all hover:scale-105 flex items-center space-x-2 border border-[#C4B5FD]/60 cursor-pointer"
            style={{
              boxShadow: "0 0 20px rgba(109, 40, 217, 0.5), 0 0 40px rgba(124, 58, 237, 0.25)",
              animation: "setuYatraPulse 2s ease-in-out infinite",
            }}
          >
            {/* Outer glow ring */}
            <span
              className="absolute inset-0 rounded-full"
              style={{ animation: "setuYatraRing 2s ease-in-out infinite" }}
              aria-hidden="true"
            />
            <Landmark className="w-4 h-4 text-[#C4B5FD] shrink-0" style={{ animation: "setuYatraFlicker 1.5s ease-in-out infinite alternate" }} />
            <span>Setu Yatra Challenge</span>
          </button>
        </div>

        {/* Keyframes for the Setu Yatra button pulse — same animation the
            homepage Hero button used, injected once into the document head. */}
        <style>{`
          @keyframes setuYatraPulse {
            0%, 100% { box-shadow: 0 0 20px rgba(109,40,217,0.5), 0 0 40px rgba(124,58,237,0.25); transform: scale(1); }
            50%       { box-shadow: 0 0 32px rgba(139,92,246,0.8), 0 0 64px rgba(139,92,246,0.4); transform: scale(1.04); }
          }
          @keyframes setuYatraRing {
            0%, 100% { box-shadow: 0 0 0 0 rgba(196,181,253,0.0); }
            50%       { box-shadow: 0 0 0 6px rgba(196,181,253,0.18); }
          }
          @keyframes setuYatraFlicker {
            0%   { opacity: 1;   transform: rotate(-5deg) scale(1.05); }
            100% { opacity: 0.75; transform: rotate(5deg)  scale(0.95); }
          }
        `}</style>
      </div>

      {activeSignup && (
        <SubscriptionSignup
          isOpen={!!activeSignup}
          onClose={() => setActiveSignup(null)}
          category={activeCategory}
          categoryLabel={activeCategoryMeta.tabLabel}
          tier={activeSignup.tier}
          billing={activeSignup.billing}
          userProfile={userProfile}
        />
      )}
    </section>
  );
}
