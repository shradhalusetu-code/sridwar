/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import {
  Wallet, ShieldCheck, Sparkles, ChevronRight, ChevronLeft, Trophy,
  Gift, TrendingUp, Check, Flame, Landmark, BookOpen, HeartHandshake, Users, Lock,
} from "lucide-react";
import {
  COMMISSION_STRUCTURE, PLAN_CATEGORIES, PLAN_TIERS_BY_CATEGORY, isDevoteeTier,
  MILESTONE_REWARDS, SEASONAL_CAMPAIGNS, FRAUD_PREVENTION_RULES,
  REFERRAL_CASHBACK_BOOKING_CAP, REFERRAL_CASHBACK_DISCLAIMER,
  isTierUnlocked, tierUnlockRequirementLabel, QUALIFIED_REFERRAL_MIN_BOOKINGS,
  type PlanCategoryId, type DevoteeReferralTier, type ProviderCategoryTier, type ProviderCategoryId,
} from "../data/referralProgram";
import { fetchReferralList } from "../lib/referrals";
import { fetchActivities } from "../lib/activities";
import SubscriptionSignup from "./SubscriptionSignup";

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
}

function PlanTierCard({ tier, billing, onSelect, unlocked, unlockRequirement }: PlanTierCardProps) {
  const isFree = tier.monthlyPrice === 0;
  const priceLabel = billing === "monthly" ? tier.monthlyPriceLabel : tier.annualPriceLabel;

  // Locked tiers are still listed by name, with a real preview of what's
  // included — so devotees and providers can see the full 5-tier ladder
  // ahead of them and what it unlocks — but pricing and the signup CTA
  // stay hidden until the eligibility requirement is met.
  if (!unlocked) {
    const previewLines = isDevoteeTier(tier)
      ? [tier.referralCapacity, tier.milestoneBonusMultiplier]
      : [tier.servicesIncluded, tier.feeModel, tier.commissionEligibility];

    return (
      <div className="relative flex flex-col bg-[#092320]/60 border border-dashed border-white/10 rounded-2xl p-4">
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
      className={`relative flex flex-col bg-[#092320] border rounded-2xl p-4 ${
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
      {isDevoteeTier(tier) && (
        <span className="text-2xl font-serif font-black text-[#FFB347] mt-1.5">{tier.cashbackRatePercent}% Cashback</span>
      )}
      <p className="text-[12px] text-white/50 mt-1 mb-3 leading-snug">{tier.tagline}</p>

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
            {billing === "annual" && (
              <span className="text-[12px] font-bold text-[#5EEAD4] bg-[#5EEAD4]/10 border border-[#5EEAD4]/30 px-2.5 py-1 rounded-full">
                Save with annual billing — up to 60 days free
              </span>
            )}
          </div>

          <p className="text-[13px] text-white/50 mb-3 max-w-2xl">{activeCategoryMeta.intro}</p>

          {activeCategory === "devotee" && (
            <p className="text-[13px] text-white/60 mb-4 max-w-2xl">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {COMMISSION_STRUCTURE.map((tier) => (
              <div key={tier.bookingLabel} className="bg-[#021816] border border-white/10 rounded-2xl p-4 text-center">
                <span className="block text-3xl font-serif font-black text-[#FFB347]">{tier.rate}%</span>
                <span className="block text-xs font-bold text-white uppercase tracking-wide mt-1">{tier.bookingLabel}</span>
                <p className="text-[13px] text-white/55 mt-2 leading-snug">{tier.description}</p>
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

        {/* Trust / Fraud Prevention / Legal strip */}
        <div className="bg-[#092320] border border-white/10 rounded-3xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-[#5EEAD4]" />
            <h2 className="font-serif text-base font-bold text-white">Secure, Fair & Fraud-Protected</h2>
          </div>
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
