/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import {
  Share2, Users, Wallet, ShieldCheck, Sparkles, ChevronRight, Trophy,
  Gift, TrendingUp, BadgeCheck, Check, Flame, Landmark, BookOpen, HeartHandshake,
} from "lucide-react";
import {
  COMMISSION_STRUCTURE, PLAN_CATEGORIES, PLAN_TIERS_BY_CATEGORY, isDevoteeTier,
  MILESTONE_REWARDS, SEASONAL_CAMPAIGNS, FRAUD_PREVENTION_RULES,
  type PlanCategoryId, type DevoteeReferralTier, type ProviderCategoryTier,
} from "../data/referralProgram";
import SubscriptionSignup from "./SubscriptionSignup";

const CATEGORY_ICONS = { Users, Flame, Landmark, Sparkles, BookOpen, HeartHandshake } as const;

type BillingCycle = "monthly" | "annual";

interface PlanTierCardProps {
  tier: DevoteeReferralTier | ProviderCategoryTier;
  billing: BillingCycle;
  onSelect: () => void;
}

function PlanTierCard({ tier, billing, onSelect }: PlanTierCardProps) {
  const isFree = tier.monthlyPrice === 0;
  const priceLabel = billing === "monthly" ? tier.monthlyPriceLabel : tier.annualPriceLabel;

  return (
    <div
      className={`relative flex flex-col bg-[#092320] border rounded-2xl p-4 ${
        tier.highlight ? "border-[#FFB347] shadow-lg shadow-[#FFB347]/10" : isFree ? "border-[#5EEAD4]/50 shadow-lg shadow-[#5EEAD4]/10" : "border-white/10"
      }`}
    >
      {tier.highlight && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#FFB347] text-[#021816] text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
          Most Popular
        </span>
      )}
      {!tier.highlight && isFree && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#5EEAD4] text-[#021816] text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
          Free Forever
        </span>
      )}

      <span className="font-serif text-base font-bold text-white">{tier.name}</span>
      <span className={`text-lg font-serif font-black mt-0.5 ${isFree ? "text-[#5EEAD4]" : "text-[#FFB347]"}`}>{priceLabel}</span>
      {!isFree && billing === "annual" && (
        <span className="text-[9px] text-[#5EEAD4] font-semibold">{tier.annualSavingsLabel}</span>
      )}
      <p className="text-[10px] text-white/50 mt-1 mb-3 leading-snug">{tier.tagline}</p>

      <div className="space-y-1.5 text-[10px] text-white/70 flex-1">
        {isDevoteeTier(tier) ? (
          <>
            <div className="flex gap-1.5"><Wallet className="w-3 h-3 text-[#FFB347] shrink-0 mt-0.5" /><span>{tier.networkCommissionRate}</span></div>
            <div className="flex gap-1.5"><Check className="w-3 h-3 text-[#5EEAD4] shrink-0 mt-0.5" /><span>{tier.referralCapacity}</span></div>
            <div className="flex gap-1.5"><Trophy className="w-3 h-3 text-[#5EEAD4] shrink-0 mt-0.5" /><span>{tier.milestoneBonusMultiplier}</span></div>
            <div className="flex gap-1.5"><Check className="w-3 h-3 text-[#5EEAD4] shrink-0 mt-0.5" /><span>{tier.payoutSpeed}</span></div>
            <div className="flex gap-1.5"><Check className="w-3 h-3 text-[#5EEAD4] shrink-0 mt-0.5" /><span>{tier.referralSupport}</span></div>
          </>
        ) : (
          <>
            <div className="flex gap-1.5"><Check className="w-3 h-3 text-[#5EEAD4] shrink-0 mt-0.5" /><span>{tier.servicesIncluded}</span></div>
            <div className="flex gap-1.5"><Check className="w-3 h-3 text-[#5EEAD4] shrink-0 mt-0.5" /><span>{tier.feeModel}</span></div>
            <div className="flex gap-1.5"><Check className="w-3 h-3 text-[#5EEAD4] shrink-0 mt-0.5" /><span>{tier.customerReach}</span></div>
            <div className="flex gap-1.5"><Wallet className="w-3 h-3 text-[#FFB347] shrink-0 mt-0.5" /><span>{tier.commissionEligibility}</span></div>
            <div className="flex gap-1.5"><Check className="w-3 h-3 text-[#5EEAD4] shrink-0 mt-0.5" /><span>{tier.referralRewards}</span></div>
            <div className="flex gap-1.5"><Check className="w-3 h-3 text-[#5EEAD4] shrink-0 mt-0.5" /><span>{tier.analytics} analytics</span></div>
            <div className="flex gap-1.5"><Check className="w-3 h-3 text-[#5EEAD4] shrink-0 mt-0.5" /><span>{tier.payoutSpeed}</span></div>
            {tier.priorityListing && <div className="flex gap-1.5"><Check className="w-3 h-3 text-[#5EEAD4] shrink-0 mt-0.5" /><span>Priority listing</span></div>}
            {tier.premiumVisibility && <div className="flex gap-1.5"><Check className="w-3 h-3 text-[#5EEAD4] shrink-0 mt-0.5" /><span>Premium profile visibility</span></div>}
            {tier.verifiedBadge && <div className="flex gap-1.5"><BadgeCheck className="w-3 h-3 text-[#FFB347] shrink-0 mt-0.5" /><span>Verified badge</span></div>}
            {tier.marketingTools && <div className="flex gap-1.5"><Check className="w-3 h-3 text-[#5EEAD4] shrink-0 mt-0.5" /><span>Marketing tools</span></div>}
          </>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
        {(isDevoteeTier(tier) ? tier.bonusPerks : tier.exclusiveBenefits).slice(0, 2).map((b) => (
          <span key={b} className="block text-[9px] text-white/45 leading-snug">✦ {b}</span>
        ))}
      </div>

      <button
        onClick={onSelect}
        className={`mt-3 w-full text-center text-[11px] font-bold px-3 py-2 rounded-full transition-all ${
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

interface ReferAndEarnProps {
  onNavigate: (page: string) => void;
  onOpenLegalDoc: (doc: string) => void;
  userProfile?: { name: string; email: string };
}

export default function ReferAndEarn({ onNavigate, onOpenLegalDoc, userProfile }: ReferAndEarnProps) {
  const [activeCategory, setActiveCategory] = useState<PlanCategoryId>("devotee");
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const [activeSignup, setActiveSignup] = useState<{ tier: DevoteeReferralTier | ProviderCategoryTier; billing: BillingCycle } | null>(null);

  const activeCategoryMeta = PLAN_CATEGORIES.find((c) => c.id === activeCategory) ?? PLAN_CATEGORIES[0];
  const activeTiers = PLAN_TIERS_BY_CATEGORY[activeCategory];

  const howItWorks = [
    { icon: Users, title: "Get Your Dharmic ID", desc: "Every devotee, pujari, puja mandal, yoga guru, dharmic expert, or seva provider already has (or can create) a unique Dharmic ID and referral link." },
    { icon: Share2, title: "Share Your Link", desc: "Invite family, friends, devotees, followers, or fellow experts via WhatsApp, social media, or in person." },
    { icon: Sparkles, title: "They Book a Service", desc: "Any puja, seva, donation, product, or consultation booked by them — online, offline, web, or app — stays linked to your Dharmic ID." },
    { icon: Wallet, title: "You Earn, Permanently", desc: "Earn 10% on their 1st booking, 5% on the 2nd, and 3% on every booking after that — for as long as they stay linked to you." },
  ];

  return (
    <section
      id="refer-earn-section"
      className="pb-8 sm:pb-10 pt-8 sm:pt-10 bg-gradient-to-b from-[#021816] to-[#021816] relative text-white scroll-mt-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6">
          <div className="text-left space-y-2">
            <span className="text-xs font-semibold text-[#FFB347]/80 tracking-wider font-mono">Dharmic referral & earning ecosystem</span>
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-white tracking-tight">
              Refer, Earn & Grow with Dharma
            </h2>
            <p className="text-sm text-white/70 max-w-2xl">
              Invite the people in your life to Sri Dwar using your unique Dharmic ID. Every genuine booking they make stays
              permanently linked to you — puja after puja, season after season.
            </p>
          </div>
          <button
            id="refer-earn-get-link-cta"
            onClick={() => onNavigate("login")}
            className="mt-4 md:mt-0 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#FFB347] to-[#FF8A00] text-[#021816] text-sm font-bold px-5 py-3 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            Get My Referral Link
          </button>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {howItWorks.map((step, i) => (
            <div key={step.title} className="bg-[#092320] border border-white/10 rounded-2xl p-4 relative overflow-hidden">
              <span className="absolute top-2 right-3 text-3xl font-serif font-black text-white/5">{i + 1}</span>
              <step.icon className="w-5 h-5 text-[#5EEAD4] mb-2" />
              <h3 className="font-serif text-sm font-bold text-white mb-1">{step.title}</h3>
              <p className="text-[11px] text-white/60 leading-snug">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Commission Structure */}
        <div className="bg-[#092320] border border-[#FFB347]/20 rounded-3xl p-5 sm:p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-[#FFB347]" />
            <h3 className="font-serif text-lg font-bold text-white">Your Commission, Every Time They Book</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {COMMISSION_STRUCTURE.map((tier) => (
              <div key={tier.bookingLabel} className="bg-[#021816] border border-white/10 rounded-2xl p-4 text-center">
                <span className="block text-3xl font-serif font-black text-[#FFB347]">{tier.rate}%</span>
                <span className="block text-xs font-bold text-white uppercase tracking-wide mt-1">{tier.bookingLabel}</span>
                <p className="text-[11px] text-white/55 mt-2 leading-snug">{tier.description}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-white/40 mt-4 italic">
            Commission percentages reset per referred devotee and apply to eligible, paid bookings only. Higher subscription
            tiers unlock boosted commission percentages — see plans below.
          </p>
        </div>

        {/* Milestones & Seasonal Campaigns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
          <div className="bg-[#092320] border border-white/10 rounded-3xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5 text-[#5EEAD4]" />
              <h3 className="font-serif text-base font-bold text-white">Milestone Rewards</h3>
            </div>
            <div className="space-y-2.5">
              {MILESTONE_REWARDS.map((m) => (
                <div key={m.title} className="flex items-start gap-3 bg-[#021816] border border-white/5 rounded-xl p-3">
                  <span className="text-xl leading-none">{m.icon}</span>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block">{m.title}</span>
                    <span className="text-[10px] text-white/50 block">{m.requirement}</span>
                    <span className="text-[10px] text-[#FFB347] font-semibold block mt-0.5">{m.reward}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#092320] border border-white/10 rounded-3xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-5 h-5 text-[#5EEAD4]" />
              <h3 className="font-serif text-base font-bold text-white">Seasonal Campaigns & Grand Prizes</h3>
            </div>
            <div className="space-y-2.5">
              {SEASONAL_CAMPAIGNS.map((c) => (
                <div key={c.name} className="bg-[#021816] border border-white/5 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{c.name}</span>
                    <span className="text-[9px] font-mono text-[#FFB347] bg-[#FFB347]/10 px-2 py-0.5 rounded-full border border-[#FFB347]/20">{c.window}</span>
                  </div>
                  <p className="text-[10px] text-white/55 mt-1 leading-snug">{c.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Subscription Plans — six fully separate plan systems */}
        <div className="mb-6">
          <h3 className="font-serif text-lg font-bold text-white mb-3">{activeCategoryMeta.planLabel}</h3>

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
              <span className="text-[10px] font-bold text-[#5EEAD4] bg-[#5EEAD4]/10 border border-[#5EEAD4]/30 px-2.5 py-1 rounded-full">
                2 months free on every paid plan
              </span>
            )}
          </div>

          <p className="text-[11px] text-white/50 mb-3 max-w-2xl">{activeCategoryMeta.intro}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {activeTiers.map((tier) => (
              <PlanTierCard key={tier.id} tier={tier} billing={billing} onSelect={() => setActiveSignup({ tier, billing })} />
            ))}
          </div>

          <p className="text-[10px] text-white/40 mt-3 italic">
            {activeCategory === "devotee"
              ? "Referral bonus and commission figures are good-faith average estimates based on platform activity, not guaranteed income. Subscription fees are service fees for platform benefits, not an investment."
              : "Lead, fee, and opportunity figures are good-faith average estimates based on platform activity, not guaranteed income. Subscription fees are service fees for platform benefits, not an investment."}
          </p>
        </div>

        {/* Trust / Fraud Prevention / Legal strip */}
        <div className="bg-[#092320] border border-white/10 rounded-3xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-[#5EEAD4]" />
            <h3 className="font-serif text-base font-bold text-white">Secure, Fair & Fraud-Protected</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 mb-4">
            {FRAUD_PREVENTION_RULES.map((r) => (
              <div key={r.title} className="bg-[#021816] border border-white/5 rounded-xl p-3">
                <span className="text-[10px] font-bold text-white block mb-1">{r.title}</span>
                <span className="text-[9px] text-white/50 leading-snug block">{r.description}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]">
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
