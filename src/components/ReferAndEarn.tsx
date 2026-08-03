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
    { icon: Sparkles, title: "They Book a Service", desc: "Any puja, seva, contribution, product, or consultation booked by them — online, offline, web, or app — stays linked to your Dharmic ID." },
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
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <button
              id="refer-earn-get-link-cta"
              onClick={() => onNavigate("login")}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#FFB347] to-[#FF8A00] text-[#021816] text-sm font-bold px-5 py-3 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Get My Referral Link
            </button>
            <button
              id="refer-earn-view-plans-cta"
              onClick={() => onNavigate("plans")}
              className="inline-flex items-center justify-center gap-1.5 border border-[#FFB347]/40 text-[#FFB347] text-sm font-bold px-5 py-3 rounded-full hover:bg-[#FFB347] hover:text-[#021816] transition-all"
            >
              See Full Plans, Rewards & Cashback Details
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
              <p className="text-[11px] text-white/60 leading-snug">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
