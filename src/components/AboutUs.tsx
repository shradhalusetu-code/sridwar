/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, ReactNode } from "react";
import { Sparkles, Award, Heart, ShieldCheck, Users, Linkedin, ArrowUpRight, ChevronDown } from "lucide-react";
import SacredIcon from "./SacredIcon";
import kunuPhoto from "../assets/images/Kunu.jpg";
import harmohanPhoto from "../assets/images/Harmohan.jpg";

interface Founder {
  id: string;
  name: string;
  initials: string;
  title: string;
  bio: string;
  pills: { icon: ReactNode; label: string }[];
  photo: string;
  linkedin: string;
}

const FOUNDERS: Founder[] = [
  {
    id: "kunu-rana",
    name: "Kunu Rana",
    initials: "KR",
    title: "Founder & CEO — Shradhalu Private Limited",
    bio: "Kunu built Sri Dwar to close the distance between devotees and their temples — pairing proprietary faith-tech with a deep respect for Vedic tradition, so that a Sankalpa performed for someone thousands of miles away feels every bit as real as standing at the sanctum door.",
    pills: [
      { icon: <Sparkles className="w-3.5 h-3.5 text-[#5EEAD4]" />, label: "Architect of Sri Dwar Technology" },
      { icon: <Heart className="w-3.5 h-3.5 text-[#FFB347]" />, label: "100+ Priests Empowered" },
      { icon: <Award className="w-3.5 h-3.5 text-[#5EEAD4]" />, label: "Serving Devotees Worldwide" },
    ],
    photo: kunuPhoto,
    linkedin: "https://www.linkedin.com/in/kunurana/",
  },
  {
    id: "harmohan-rana",
    name: "Harmohan Rana",
    initials: "HR",
    title: "Co-Founder — Shradhalu Private Limited",
    bio: "Harmohan brings the discipline and vision that turns Sri Dwar's mission into a lasting institution — steering the platform's growth while staying rooted in the same commitment to tradition and priest welfare that inspired its founding.",
    pills: [
      { icon: <Sparkles className="w-3.5 h-3.5 text-[#5EEAD4]" />, label: "Co-Founder, Sri Dwar" },
      { icon: <Heart className="w-3.5 h-3.5 text-[#FFB347]" />, label: "Champion of Priest Welfare" },
      { icon: <Award className="w-3.5 h-3.5 text-[#5EEAD4]" />, label: "Building for the Long Term" },
    ],
    photo: harmohanPhoto,
    linkedin: "https://www.linkedin.com/in/harmohan-rana/",
  },
];

function FounderCard({ founder }: { founder: Founder }) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="relative rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#092320] via-[#092320] to-[#021816] p-6 sm:p-8 shadow-2xl overflow-hidden h-full">
      {/* Watermark Om, purely decorative */}
      <span
        aria-hidden="true"
        className="pointer-events-none select-none absolute -right-6 -top-10 text-[10rem] sm:text-[12rem] font-serif text-white/[0.03] leading-none"
      >
        ॐ
      </span>

      <div className="relative flex flex-col items-center text-center gap-5">
        {/* Photo + Halo */}
        <div className="relative w-72 h-72 sm:w-80 sm:h-80 shrink-0">
          {/* Rotating dotted halo, evokes a japamala (prayer bead) ring */}
          <svg
            aria-hidden="true"
            viewBox="0 0 200 200"
            className="absolute inset-[-14px] w-[calc(100%+28px)] h-[calc(100%+28px)] animate-halo-spin"
          >
            <circle
              cx="100" cy="100" r="96"
              fill="none"
              stroke="#5EEAD4"
              strokeOpacity="0.55"
              strokeWidth="2.5"
              strokeDasharray="1 11.5"
              strokeLinecap="round"
            />
          </svg>

          <div className="absolute inset-0 rounded-full glow-gold bg-[#092320] overflow-hidden">
            {!imgFailed ? (
              <img
                src={founder.photo}
                alt={`${founder.name}, ${founder.title.split(" — ")[0]} of Sri Dwar`}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                loading="lazy"
                decoding="async"
                width={320}
                height={320}
                className="w-full h-full object-contain rounded-full border-4 border-[#FFB347]"
              />
            ) : (
              <div className="w-full h-full rounded-full border-4 border-[#FFB347] bg-[#0F766E]/40 flex items-center justify-center">
                <span className="font-serif text-3xl font-black text-[#FFB347]">{founder.initials}</span>
              </div>
            )}
          </div>

          {/* Founder badge */}
          <div className="absolute bottom-2 right-2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#FFB347] border-4 border-[#092320] flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-5 h-5 text-[#021816]" strokeWidth={2.75} />
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3">
          <div>
            <h3 className="text-2xl sm:text-3xl font-serif font-black text-white tracking-tight">
              {founder.name}
            </h3>
            <p className="text-[11px] sm:text-xs font-mono uppercase tracking-widest text-[#FFB347] font-bold mt-1.5">
              {founder.title}
            </p>
          </div>

          <p className="text-sm text-white/80 leading-relaxed font-sans">
            {founder.bio}
          </p>

          {/* Key detail pills */}
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            {founder.pills.map((pill, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-[11px] text-white/85 font-sans"
              >
                {pill.icon}
                {pill.label}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div className="pt-2">
            <a
              href={founder.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#FFB347] hover:bg-[#F27D26] active:scale-[0.98] transition-all text-[#021816] font-sans font-bold text-sm px-5 py-2.5 rounded-full shadow-lg"
            >
              <Linkedin className="w-4 h-4" strokeWidth={2.5} />
              Connect on LinkedIn
              <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.75} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function FounderProfile({ onNavigate }: { onNavigate?: (page: string) => void }) {
  return (
    <div className="relative mb-14 sm:mb-16 animate-fadeIn">
      {/* Eyebrow */}
      <div className="inline-flex items-center space-x-2 bg-[#5EEAD4]/10 border border-[#5EEAD4]/30 px-3.5 py-1.5 rounded-full text-[#5EEAD4] text-xs font-semibold uppercase tracking-wider mb-6">
        <Users className="w-3.5 h-3.5" />
        <span>Meet the Founders</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {FOUNDERS.map((founder) => (
          <FounderCard key={founder.id} founder={founder} />
        ))}
      </div>

      <div className="flex justify-center pt-6">
        <button
          type="button"
          onClick={() => onNavigate?.("founder-story")}
          className="inline-flex items-center gap-1.5 text-white/70 hover:text-white transition-colors font-sans text-sm px-2 py-2"
        >
          Read the founders&apos; full story
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface AboutUsProps {
  onNavigate?: (page: string) => void;
}

export default function AboutUs({ onNavigate }: AboutUsProps) {
  return (
    <section id="about-us-section" className="py-12 bg-[#021816] text-white text-left" style={{ paddingTop: `calc(env(safe-area-inset-top, 0px) + 80px)` }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Founder Profile */}
        <FounderProfile onNavigate={onNavigate} />

        {/* World's One of the First AI-Powered Faith-Tech Platforms Badge */}
        <div className="flex justify-center mb-14 sm:mb-16 -mt-6">
          <div className="inline-flex items-center space-x-2 bg-white/5 border border-[#5EEAD4]/20 px-3.5 py-1.5 rounded-full text-[#5EEAD4] text-xs font-semibold uppercase tracking-widest animate-fadeIn">
            <Sparkles className="w-3.5 h-3.5 text-[#FFB347] fill-[#FFB347]" />
            <span>World's One of the First AI-Powered Faith-Tech Platforms</span>
          </div>
        </div>

        {/* Banner Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-20 animate-fadeIn">
          {/* Narrative Text (cols 7) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center space-x-2 bg-[#FFB347]/10 border border-[#FFB347]/30 px-3.5 py-1.5 rounded-full text-[#FFB347] text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#FFB347] fill-[#FFB347]" />
              <span>Founded by Kunu Rana — Bridging Faith & Innovation</span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-serif font-black text-white tracking-tight leading-tight">
              Honoring Ancient Heritage. Empowering Remote Devotion.
            </h2>

            <p className="text-sm text-white/80 leading-relaxed font-sans">
              Founded under the legal parent of <strong className="text-white font-semibold">Shradhalu Private Limited</strong> by visionary entrepreneur <strong className="text-white font-semibold">Kunu Rana</strong>, Sri Dwar is an AI-powered faith-tech platform built on proprietary Sri Dwar technology, designed to preserve Vedic culture and make remote temple worship feel deeply meaningful.
            </p>

            <blockquote className="border-l-4 border-[#FFB347] pl-5 py-2 text-xs italic font-serif text-white/95 bg-white/5 rounded-r-2xl">
              "We didn't build Sri Dwar to replace physical holy temple visits, but to bridge the spatial divide for elderly parents, sick individuals, and global NRIs — and to provide sustainable, transparent financial conduits for traditional priests, local flower vendors, and indigenous cows."
              <span className="block mt-1 font-sans text-[10px] font-bold text-[#5EEAD4] not-italic uppercase font-mono">— Founder Kunu Rana</span>
            </blockquote>

            <p className="text-sm text-white/80 leading-relaxed font-sans">
              Every Sankalpa we register is synchronized through Sri Dwar's secure compliance systems, with immediate payout structures ensuring a major portion of your Dakshina is transferred directly to the priests and temples performing your ritual.
            </p>
          </div>

          {/* Graphic/Illustration Image (cols 5) */}
          <div className="lg:col-span-5 relative w-full flex justify-center">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-[#092320] w-full max-w-sm aspect-square">
              <img
                src={import.meta.env.BASE_URL + "images/connect.jpg"}
                alt="Sri Dwar Divine Mission - Sacred Temple Devotion & Priestly Connection"
                loading="lazy"
                decoding="async"
                width={480}
                height={480}
                className="w-full h-full object-cover rounded-2xl hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              {/* Divine Overlay Accent */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#021816]/90 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10">
                <p className="text-[10px] text-[#FFB347] font-mono uppercase tracking-widest font-bold">Divine Core</p>
                <p className="text-xs text-white/95 font-serif font-semibold">Bridging Global Devotees with Ancient Traditions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Core Values / Impact Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-[#092320] p-6 rounded-3xl border border-white/10 text-left space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5EEAD4]/10 text-[#5EEAD4] flex items-center justify-center font-bold text-lg border border-[#5EEAD4]/20">
              ✓
            </div>
            <h4 className="font-serif text-base font-bold text-white">Rooted in Scripture</h4>
            <p className="text-xs text-white/70 leading-relaxed">
              No mass prayers, ever. Every puja is voiced individually with your Gotra and Nakshatra, faithfully preserving thousands of years of strict Vedic tradition.
            </p>
          </div>

          <div className="bg-[#092320] p-6 rounded-3xl border border-white/10 text-left space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFB347]/10 text-[#FFB347] flex items-center justify-center font-bold text-lg border border-[#FFB347]/20">
              ❤
            </div>
            <h4 className="font-serif text-base font-bold text-white">Priest Empowerment</h4>
            <p className="text-xs text-white/70 leading-relaxed">
              We empower 100+ local pandits and gurukuls with technical training, digital tools, and consistent wages — keeping the chanting tradition alive for the next generation.
            </p>
          </div>

          <div className="bg-[#092320] p-6 rounded-3xl border border-white/10 text-left space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFB347]/10 text-[#FFB347] flex items-center justify-center font-bold text-lg border border-[#FFB347]/20">
              💡
            </div>
            <h4 className="font-serif text-base font-bold text-white">Zero-Leaking Economy</h4>
            <p className="text-xs text-white/70 leading-relaxed">
              Operated under Shradhalu Private Limited, we use secure transaction ledgers and a Sri Dwar-managed database for full audit disclosures on how every contribution is utilized.
            </p>
          </div>

          <div className="bg-[#092320] p-6 rounded-3xl border border-white/10 text-left space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5EEAD4]/10 text-[#5EEAD4] flex items-center justify-center font-bold text-lg border border-[#5EEAD4]/20">
              🌍
            </div>
            <h4 className="font-serif text-base font-bold text-white">Global, Always On</h4>
            <p className="text-xs text-white/70 leading-relaxed">
              Built on a fast, responsive, offline-friendly platform — so devotees across Europe, the Americas, and East Asia can connect with Indian temples anytime, from anywhere.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
