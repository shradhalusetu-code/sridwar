/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Share2, Users, Wallet, Sparkles, ChevronRight } from "lucide-react";

interface ReferAndEarnProps {
  onNavigate: (page: string) => void;
}

/**
 * Homepage teaser for the Dharmic Referral & Cashback Ecosystem. Shows the
 * devotional pitch and the "how it works" steps, then routes everything
 * deeper — cashback rates, tier plans, milestone rewards, seasonal
 * campaigns, fraud protection, and the cashback disclaimer — to the
 * dedicated Plans page at onNavigate("plans"). Keeps the homepage short and
 * fast (and avoids showing the cashback-rate breakdown twice) while the
 * Plans page carries the full detail.
 */
export default function ReferAndEarn({ onNavigate }: ReferAndEarnProps) {
  const howItWorks = [
    { icon: Users, title: "Get Your Dharmic ID", desc: "Every devotee, pujari, puja mandal, yoga guru, dharmic expert, or seva provider already has (or can create) a unique Dharmic ID and referral link." },
    { icon: Share2, title: "Share Your Link", desc: "Invite family, friends, devotees, followers, or fellow experts via WhatsApp, social media, or in person." },
    { icon: Sparkles, title: "They Book a Service", desc: "Any puja, seva, divine contribution, product, or consultation booked by them — online, offline, web, or app — stays linked to your Dharmic ID." },
    { icon: Wallet, title: "Your Cashback", desc: "Earn cashback on their 1st booking, more on the 2nd, and ongoing cashback up to their 8th successful booking — see the full tier rates on the Plans page." },
  ];

  return (
    <section
      id="refer-earn-section"
      className="pb-8 sm:pb-10 pt-3 sm:pt-4 bg-gradient-to-b from-[#021816] to-[#021816] relative text-white scroll-mt-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div className="text-left space-y-2">
            <span className="text-xs font-semibold text-[#FFB347]/80 tracking-wider font-mono">Dharmic referral & cashback ecosystem</span>
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-white tracking-tight">
              Refer, Earn & Grow with Dharma
            </h2>
            <p className="text-sm text-white/70 max-w-2xl">
              Invite the people in your life to Sri Dwar using your unique Dharmic ID. Every genuine booking they make stays
              linked to you, and earns you cashback up to their 8th successful booking.
            </p>
            {/* ✅ CONTRIBUTION-BENEFITS UPDATE: the homepage teaser previously
                only mentioned referral cashback, leaving the direct
                contribution-benefit ladder (seasonal campaigns, pilgrimage
                eligibility, milestone rewards) undiscoverable unless a
                devotee already knew to open the Plans page. One honest,
                short line here — full detail stays on the Plans page. */}
            <p className="text-[13px] text-white/50 max-w-2xl">
              Your own contributions count too — as little as ₹5 makes you eligible for seasonal campaigns, ₹50+ starts earning cashback and milestone progress, and ₹100+ adds eligibility toward pilgrimage-related opportunities.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <button
              id="refer-earn-get-link-cta"
              onClick={() => onNavigate("login")}
              className="relative inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#065F46] via-[#059669] to-[#FFB347] hover:from-[#047857] hover:via-[#10B981] hover:to-[#FFC670] text-white text-xs font-extrabold uppercase tracking-widest px-5 py-3 rounded-full border border-[#6EE7B7]/50 shadow-[0_0_16px_rgba(5,150,105,0.45)] hover:shadow-[0_0_24px_rgba(16,185,129,0.6)] hover:-translate-y-0.5 transition-all duration-300"
            >
              <Wallet className="w-4 h-4 text-[#D1FAE5] shrink-0" />
              Get My Referral Link
            </button>
            <button
              id="refer-earn-view-plans-cta"
              onClick={() => onNavigate("plans")}
              className="inline-flex items-center justify-center gap-1.5 bg-[#FFB347]/10 border border-[#FFB347]/40 text-[#FFB347] hover:bg-[#FFB347] hover:text-[#021816] text-xs font-extrabold uppercase tracking-widest px-5 py-3 rounded-full transition-all duration-300 hover:scale-105"
            >
              <Sparkles className="w-3.5 h-3.5" />
              See Full Plans & Rewards
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {howItWorks.map((step, i) => (
            <div key={step.title} className="bg-[#092320] border border-white/10 rounded-2xl p-4 relative overflow-hidden">
              <span className="absolute top-2 right-3 text-3xl font-serif font-black text-white/5">{i + 1}</span>
              <step.icon className="w-5 h-5 text-[#5EEAD4] mb-2" />
              <h3 className="font-serif text-sm font-bold text-white mb-1">{step.title}</h3>
              <p className="text-[13px] text-white/60 leading-snug">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
