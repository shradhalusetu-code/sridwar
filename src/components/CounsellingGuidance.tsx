/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CounsellingGuidance.tsx
 * Sri Dwar — dedicated "Counselling & Guidance" page.
 *
 * Real URL: https://sridwar.com/Counselling (see PAGE_PATHS in App.tsx).
 * Reachable from Seva → "More Sacred Sevas" (SevaExperience.tsx) and from a
 * homepage entry point (App.tsx home section) via onNavigate("counselling").
 *
 * Positioning, deliberately: this is personal / spiritual / informational
 * guidance from experienced Pandits and Dharmic experts — never medical,
 * legal, psychiatric, or clinical therapy, never a diagnosis, and never a
 * guaranteed outcome. Every service description below is written to explain
 * what a conversation may help someone understand or work through, not to
 * promise a cure, a fix, or a result. The disclaimer block near the top and
 * the full one near the bottom both say this plainly and are not optional
 * decoration — keep them if this file is ever edited further.
 *
 * No photography is wired in yet (real images will be supplied later) — every
 * visual here is built from icons, gradients and colour, exactly like
 * ReferralPlans.tsx and FAQs.tsx already do elsewhere in the app. Swapping in
 * real photos later just means adding an <OptimizedImage> inside a card's
 * icon-chip wrapper; no structural change needed.
 */

import { ReactNode, useState } from "react";
import {
  ChevronLeft, ChevronRight, ArrowRight, Compass, Brain, HeartHandshake, Users,
  GraduationCap, Briefcase, Gem, Scale, Sunset, HelpCircle, ShieldCheck, Lock,
  Clock, PhoneCall, Sparkles, Check, Heart, CalendarClock, Repeat, Hourglass, Pill,
  ChevronDown, Tag, UserCheck, X, Star, Languages,
} from "lucide-react";
import OptimizedImage from "./OptimizedImage";
import { PRIEST_PROFILES } from "../data/priests";

// Artwork for each of the 10 guidance areas — compressed and converted to
// WebP (with a matching JPEG fallback for OptimizedImage). Kept as the
// full, uncropped square frame from the source artwork in
// Counselling_Images.zip and rendered with object-contain (see
// ServiceCard below) so every detail in the image stays visible — nothing
// cropped or squeezed.
// @ts-ignore
import personalGuidanceImg from "../assets/images/counselling/personal-guidance.jpg";
// @ts-ignore
import personalGuidanceImgWebp from "../assets/images/counselling/personal-guidance.webp";
// @ts-ignore
import emotionalWellbeingImg from "../assets/images/counselling/emotional-wellbeing.jpg";
// @ts-ignore
import emotionalWellbeingImgWebp from "../assets/images/counselling/emotional-wellbeing.webp";
// @ts-ignore
import relationshipCoupleImg from "../assets/images/counselling/relationship-couple.jpg";
// @ts-ignore
import relationshipCoupleImgWebp from "../assets/images/counselling/relationship-couple.webp";
// @ts-ignore
import familyParentingImg from "../assets/images/counselling/family-parenting.jpg";
// @ts-ignore
import familyParentingImgWebp from "../assets/images/counselling/family-parenting.webp";
// @ts-ignore
import studentYouthImg from "../assets/images/counselling/student-youth.jpg";
// @ts-ignore
import studentYouthImgWebp from "../assets/images/counselling/student-youth.webp";
// @ts-ignore
import educationCareerImg from "../assets/images/counselling/education-career.jpg";
// @ts-ignore
import educationCareerImgWebp from "../assets/images/counselling/education-career.webp";
// @ts-ignore
import marriageFamilyPlanningImg from "../assets/images/counselling/marriage-family-planning.jpg";
// @ts-ignore
import marriageFamilyPlanningImgWebp from "../assets/images/counselling/marriage-family-planning.webp";
// @ts-ignore
import workLifeBalanceImg from "../assets/images/counselling/work-life-balance.jpg";
// @ts-ignore
import workLifeBalanceImgWebp from "../assets/images/counselling/work-life-balance.webp";
// @ts-ignore
import lifeTransitionsSeniorImg from "../assets/images/counselling/life-transitions-senior.jpg";
// @ts-ignore
import lifeTransitionsSeniorImgWebp from "../assets/images/counselling/life-transitions-senior.webp";
// @ts-ignore
import everydayConsultationImg from "../assets/images/counselling/everyday-consultation.jpg";
// @ts-ignore
import everydayConsultationImgWebp from "../assets/images/counselling/everyday-consultation.webp";

// ─── Types ────────────────────────────────────────────────────────────────

/** General, non-clinical guidance on how a support journey in this area
 *  typically unfolds. These are informational starting points only — see
 *  the disclaimer blocks on this page — an expert may recommend more or
 *  fewer sessions once they understand your specific situation. */
interface SessionPlan {
  sessions: string;
  duration: string;
  frequency: string;
  timeframe: string;
}

interface GuidanceService {
  id: string;
  icon: ReactNode;
  color: string;
  bg: string;
  border: string;
  title: string;
  forWhom: string;
  tagline: string;
  description: string;
  /** "A session may help you..." — kept to what a conversation can realistically
   *  offer (clarity, a plan, a calmer perspective) — never a clinical claim. */
  mayHelpWith: string[];
  image: string;
  imageWebp: string;
  sessionPlan: SessionPlan;
}

interface SessionFormat {
  id: string;
  name: string;
  duration: string;
  price: number;
  bestFor: string;
  highlight?: boolean;
  /** Custom/hourly plan — priced per hour rather than a flat total; see
   *  its dedicated rendering branch in the pricing grid below. */
  isCustom?: boolean;
  /** A short, italic supporting line shown under `bestFor`, same purpose
   *  and length across all four formats — keeps every card's content
   *  equally full so no card is left with visibly emptier space than the
   *  others when the grid stretches every row to the tallest card. */
  note: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────

const SERVICES: GuidanceService[] = [
  {
    id: "personal-guidance",
    icon: <Compass className="w-5 h-5" />,
    color: "#FFB347",
    bg: "rgba(255,179,71,0.10)",
    border: "rgba(255,179,71,0.25)",
    title: "Personal Guidance & Life Counselling",
    forWhom: "For Everyone",
    tagline: "Understand yourself. Navigate life.",
    description:
      "Talk to an experienced expert about what is happening in your life, understand your situation more clearly, and think through a practical way forward.",
    mayHelpWith: [
      "Feeling confused or stuck about a decision",
      "Low self-confidence or self-understanding",
      "Building better habits and everyday motivation",
      "Adjusting to a big life change",
    ],
    image: personalGuidanceImg,
    imageWebp: personalGuidanceImgWebp,
    sessionPlan: {
      sessions: "3–6 sessions",
      duration: "40–45 min each",
      frequency: "Weekly",
      timeframe: "3–6 weeks",
    },
  },
  {
    id: "emotional-wellbeing",
    icon: <Brain className="w-5 h-5" />,
    color: "#C4B5FD",
    bg: "rgba(196,181,253,0.10)",
    border: "rgba(196,181,253,0.25)",
    title: "Mental & Emotional Wellbeing",
    forWhom: "Children · Teens · Adults · Seniors",
    tagline: "Manage emotions. Build resilience.",
    description:
      "A safe, non-judgemental space to talk, understand your emotions, manage everyday stress, and build emotional strength — alongside your existing care, not instead of it.",
    mayHelpWith: [
      "Everyday stress, worry, or feeling overwhelmed",
      "Anger, low confidence, or burnout",
      "Loneliness and general emotional resilience",
      "Coping with a difficult situation",
    ],
    image: emotionalWellbeingImg,
    imageWebp: emotionalWellbeingImgWebp,
    sessionPlan: {
      sessions: "4–8 sessions",
      duration: "40–45 min each",
      frequency: "Weekly",
      timeframe: "1–2 months",
    },
  },
  {
    id: "relationship-couple",
    icon: <HeartHandshake className="w-5 h-5" />,
    color: "#5EEAD4",
    bg: "rgba(94,234,212,0.10)",
    border: "rgba(94,234,212,0.25)",
    title: "Relationship & Couple Guidance",
    forWhom: "Couples · Individuals Dating",
    tagline: "Understand each other. Build stronger relationships.",
    description:
      "Marriage, couple, and relationship guidance in one place — communication, trust, compatibility, conflict, intimacy, and reconciliation — with a focus on bringing people closer together.",
    mayHelpWith: [
      "Communication problems and repeated conflict",
      "Trust, compatibility, and emotional connection",
      "Pre-marriage relationship questions",
      "Separation or reconciliation conversations",
    ],
    image: relationshipCoupleImg,
    imageWebp: relationshipCoupleImgWebp,
    sessionPlan: {
      sessions: "4–8 sessions",
      duration: "60 min, together as a couple",
      frequency: "Weekly or bi-weekly",
      timeframe: "1–3 months",
    },
  },
  {
    id: "family-parenting",
    icon: <Users className="w-5 h-5" />,
    color: "#86EFAC",
    bg: "rgba(134,239,172,0.10)",
    border: "rgba(134,239,172,0.25)",
    title: "Family & Parenting Guidance",
    forWhom: "Parents · Families",
    tagline: "Create healthier family relationships.",
    description:
      "Guidance for parents and families to understand one another, manage disagreements, and build healthier family relationships — including in-law and joint-family matters.",
    mayHelpWith: [
      "Parent-child relationships and teenage behaviour",
      "In-law or joint-family disagreements",
      "Sibling relationships and generational gaps",
      "Caring for ageing parents",
    ],
    image: familyParentingImg,
    imageWebp: familyParentingImgWebp,
    sessionPlan: {
      sessions: "3–6 sessions",
      duration: "60 min, family format",
      frequency: "Bi-weekly",
      timeframe: "1–3 months",
    },
  },
  {
    id: "student-youth",
    icon: <GraduationCap className="w-5 h-5" />,
    color: "#FCA5A5",
    bg: "rgba(252,165,165,0.10)",
    border: "rgba(252,165,165,0.25)",
    title: "Student & Youth Guidance",
    forWhom: "Students · Young Adults",
    tagline: "Navigate studies, growing up, and young adulthood.",
    description:
      "A trusted space for students and young people to talk about studies, friendships, confidence, family, emotions, and the everyday challenges of growing up.",
    mayHelpWith: [
      "Exam pressure, study habits, and concentration",
      "Friendships, peer pressure, and bullying",
      "Confidence and identity as a young adult",
      "Family and academic expectations",
    ],
    image: studentYouthImg,
    imageWebp: studentYouthImgWebp,
    sessionPlan: {
      sessions: "3–5 sessions",
      duration: "40–45 min each",
      frequency: "Weekly, aligned to the academic calendar",
      timeframe: "3–8 weeks",
    },
  },
  {
    id: "education-career",
    icon: <Briefcase className="w-5 h-5" />,
    color: "#93C5FD",
    bg: "rgba(147,197,253,0.10)",
    border: "rgba(147,197,253,0.25)",
    title: "Education, Career & Life Direction",
    forWhom: "Students to Professionals",
    tagline: "Make clearer decisions about your future.",
    description:
      "Guidance to think through education, career, and work decisions — from choosing a stream or college to changing careers or considering entrepreneurship.",
    mayHelpWith: [
      "Stream, subject, or college selection",
      "Career uncertainty or a first job decision",
      "Career change or promotion decisions",
      "Thinking through entrepreneurship",
    ],
    image: educationCareerImg,
    imageWebp: educationCareerImgWebp,
    sessionPlan: {
      sessions: "2–4 sessions",
      duration: "40–45 min each",
      frequency: "1–2 weeks apart",
      timeframe: "2–6 weeks",
    },
  },
  {
    id: "marriage-family-planning",
    icon: <Gem className="w-5 h-5" />,
    color: "#FFB347",
    bg: "rgba(255,179,71,0.10)",
    border: "rgba(255,179,71,0.25)",
    title: "Marriage & Family Life Planning",
    forWhom: "Before & Newly Married Couples",
    tagline: "Prepare for marriage and every stage of family life.",
    description:
      "Preventive, forward-looking guidance for marriage readiness, newly-married adjustment, and family planning conversations — not something sought only when things are difficult.",
    mayHelpWith: [
      "Marriage readiness and shared expectations",
      "Newly-married adjustment and family boundaries",
      "Conversations around parenthood preparation",
      "Balancing work, family roles, and finances",
    ],
    image: marriageFamilyPlanningImg,
    imageWebp: marriageFamilyPlanningImgWebp,
    sessionPlan: {
      sessions: "3–5 sessions",
      duration: "40–60 min each",
      frequency: "Bi-weekly, timed around key milestones",
      timeframe: "1–2 months",
    },
  },
  {
    id: "work-life-balance",
    icon: <Scale className="w-5 h-5" />,
    color: "#5EEAD4",
    bg: "rgba(94,234,212,0.10)",
    border: "rgba(94,234,212,0.25)",
    title: "Work, Professional & Life Balance",
    forWhom: "Working Professionals",
    tagline: "Handle professional pressure without losing personal wellbeing.",
    description:
      "For the adult who says \"everything is fine, but I am exhausted.\" Guidance on workplace stress, professional relationships, and balancing career with personal life.",
    mayHelpWith: [
      "Workplace stress and burnout",
      "Boss or colleague relationship difficulties",
      "Work-life balance and time/priority conflicts",
      "Entrepreneurship-related pressure",
    ],
    image: workLifeBalanceImg,
    imageWebp: workLifeBalanceImgWebp,
    sessionPlan: {
      sessions: "3–6 sessions",
      duration: "40–45 min each",
      frequency: "Weekly or bi-weekly",
      timeframe: "1–2 months",
    },
  },
  {
    id: "life-transitions-senior",
    icon: <Sunset className="w-5 h-5" />,
    color: "#C4B5FD",
    bg: "rgba(196,181,253,0.10)",
    border: "rgba(196,181,253,0.25)",
    title: "Life Transitions & Senior Guidance",
    forWhom: "Seniors · Families Supporting Them",
    tagline: "Support through retirement, ageing, and later life.",
    description:
      "Support and guidance through retirement, ageing, loneliness, changing family roles, and other important transitions — a space to talk about this new phase of life, not \"therapy\".",
    mayHelpWith: [
      "Adjusting to retirement or an empty nest",
      "Loneliness or a sense of loss of purpose",
      "Changing family roles and caregiving",
      "Staying socially and emotionally connected",
    ],
    image: lifeTransitionsSeniorImg,
    imageWebp: lifeTransitionsSeniorImgWebp,
    sessionPlan: {
      sessions: "4–8 sessions",
      duration: "40–45 min each (family may join)",
      frequency: "Weekly or bi-weekly",
      timeframe: "1–3 months, ongoing support available",
    },
  },
  {
    id: "everyday-consultation",
    icon: <HelpCircle className="w-5 h-5" />,
    color: "#86EFAC",
    bg: "rgba(134,239,172,0.10)",
    border: "rgba(134,239,172,0.25)",
    title: "Everyday Advice & Expert Consultation",
    forWhom: "Everyone",
    tagline: "When you simply need someone experienced to talk to.",
    description:
      "When life presents a difficult question, speak with an experienced expert who can listen, understand the situation, and help you think through your options — no problem is too small.",
    mayHelpWith: [
      "\"Should I take this job / move cities?\"",
      "\"How do I approach this conversation?\"",
      "\"I need a second opinion on a family matter.\"",
      "Anything that doesn't fit neatly into a category above",
    ],
    image: everydayConsultationImg,
    imageWebp: everydayConsultationImgWebp,
    sessionPlan: {
      sessions: "1–2 sessions",
      duration: "20 min quick call or 40–45 min standard",
      frequency: "One-time, or as needed",
      timeframe: "Often resolved within the same week",
    },
  },
];

// Affordable, transparent, flat-fee formats — deliberately simple (3 tiers)
// rather than a different price per service above, so cost is never a
// barrier to starting a conversation. Every service card below points here.
const SESSION_FORMATS: SessionFormat[] = [
  {
    id: "quick-call",
    name: "Quick Guidance Call",
    duration: "20 minutes",
    price: 299,
    bestFor: "A focused question, a second opinion, or a first conversation to see if this is right for you.",
    note: "Best as a starting point — if your situation needs more time, your expert will suggest a Standard Session or the Custom Guidance Plan next.",
  },
  {
    id: "standard-session",
    name: "Standard Guidance Session",
    duration: "40–45 minutes",
    price: 599,
    bestFor: "The most-booked format — enough time to talk through a situation in real depth.",
    highlight: true,
    note: "Suits most one-on-one guidance areas on this page — book directly, or start with a Quick Call first if you'd rather test the fit.",
  },
  {
    id: "family-couple-session",
    name: "Family / Couple Session",
    duration: "60 minutes",
    price: 899,
    bestFor: "For 2–3 participants together — couples, parent-and-child, or a small family conversation.",
    note: "Everyone joins the same call — useful when shared context matters, such as Relationship, Family & Parenting, or Marriage guidance.",
  },
  {
    id: "custom-plan",
    name: "Custom Guidance Plan",
    duration: "Flexible — billed per hour",
    price: 199,
    bestFor: "For situations that need more than one or two sessions, spread across several hours of support.",
    isCustom: true,
    note: "Hourly rate starts from ₹199 and is confirmed once you select a guidance area — total cost = confirmed rate × number of hours required, agreed with your expert before you pay. You can adjust the amount in the next step.",
  },
];

// Each chip links straight to the matching card in the "10 Guidance Areas"
// grid below (see the matching `id` on ServiceCard's wrapper) rather than
// back to the homepage.
const WHO_ITS_FOR: { label: string; serviceId: string }[] = [
  { label: "Individuals", serviceId: "personal-guidance" },
  { label: "Students & Youth", serviceId: "student-youth" },
  { label: "Couples", serviceId: "relationship-couple" },
  { label: "Families & Parents", serviceId: "family-parenting" },
  { label: "Professionals", serviceId: "work-life-balance" },
  { label: "Seniors", serviceId: "life-transitions-senior" },
];

const HOW_IT_WORKS = [
  {
    title: "Choose your focus area",
    desc: "Pick whichever of the 10 areas below matches what's on your mind — or start with Everyday Consultation if you're not sure.",
  },
  {
    title: "Pick a format & time",
    desc: "Choose a Quick Call, Standard Session, or Family/Couple Session, and a time that works for you.",
  },
  {
    title: "Talk, confidentially",
    desc: "Speak by phone or video call with an experienced Pandit or Dharmic expert in a private, judgement-free space.",
  },
];

// ── Guidance counselors ─────────────────────────────────────────────────────
// Drawn directly from the existing priest/pujari directory (PRIEST_PROFILES,
// data/priests.ts) — no new/invented profiles. Only entries that actually
// list advice/guidance specializations (adviceAreas) are offered here, since
// those are the ones equipped to hold a guidance conversation rather than
// just perform a puja. Deduplicated by name so the same real person isn't
// offered twice under two directory entries.
interface GuidanceCounselor {
  id: string;
  name: string;
  expertise: string;
  location: string;
  yearsExperience: number;
  languages: string[];
}

const GUIDANCE_COUNSELORS: GuidanceCounselor[] = (() => {
  const seen = new Set<string>();
  const list: GuidanceCounselor[] = [];
  for (const p of PRIEST_PROFILES) {
    if (!p.adviceAreas || p.adviceAreas.length === 0) continue;
    if (seen.has(p.name)) continue;
    seen.add(p.name);
    list.push({
      id: p.id,
      name: p.name,
      expertise: p.adviceAreas[0],
      location: `${p.currentCity}, ${p.currentState}`,
      yearsExperience: p.yearsExperience,
      languages: p.languagesSpoken,
    });
  }
  return list;
})();

// ─── Small building blocks ─────────────────────────────────────────────────

function ServiceCard({ service, onBook, selectedCounselor, onChooseCounselor }: {
  service: GuidanceService;
  onBook: (title: string) => void;
  selectedCounselor: GuidanceCounselor | null;
  onChooseCounselor: () => void;
}) {
  return (
    <div
      id={service.id}
      className="scroll-mt-24 flex flex-col bg-[#092320] border rounded-3xl overflow-hidden h-full"
      style={{ borderColor: service.border }}
    >
      {/* Full, uncropped artwork — nothing cut off. Compressed and served
          as WebP with a JPEG fallback; object-contain plus a square
          container (matching the source image's own 1:1 ratio) means the
          whole image is always visible with no cropping or stretching. */}
      <div className="relative w-full aspect-square overflow-hidden bg-[#021816]">
        <OptimizedImage
          src={service.image}
          webpSrc={service.imageWebp}
          alt={`${service.title} — ${service.tagline}`}
          className="w-full h-full object-contain"
          loading="lazy"
        />
        <span className="absolute top-2.5 right-2.5 text-[9px] font-mono font-bold text-white/80 uppercase tracking-wide bg-black/40 backdrop-blur-sm border border-white/15 rounded-full px-2 py-1">
          {service.forWhom}
        </span>
      </div>

      <div className="flex flex-col flex-1 p-5">
        <div
          className="w-11 h-11 -mt-9 mb-3 rounded-2xl flex items-center justify-center shrink-0 relative shadow-lg"
          style={{ background: service.bg, border: `1px solid ${service.border}`, color: service.color, backdropFilter: "blur(6px)" }}
        >
          {service.icon}
        </div>

        <h3 className="font-serif text-base font-bold text-white leading-snug">{service.title}</h3>
        <p className="text-[11px] font-semibold mt-1" style={{ color: service.color }}>{service.tagline}</p>
        <p className="text-[11px] text-white/60 leading-relaxed mt-2">{service.description}</p>

        <div className="mt-3 pt-3 border-t border-white/8">
          <span className="text-[9px] font-mono font-bold text-white/35 uppercase tracking-wide">A session may help you think through</span>
          <ul className="mt-1.5 space-y-1">
            {service.mayHelpWith.map((point) => (
              <li key={point} className="text-[10.5px] text-white/65 leading-snug flex gap-1.5">
                <Check className="w-3 h-3 shrink-0 mt-0.5" style={{ color: service.color }} />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recommended session plan — general, non-clinical starting point.
            See the disclaimer blocks on this page: complexity can mean more
            sessions or a longer timeframe than shown here. */}
        <div className="mt-3 pt-3 border-t border-white/8 flex-1">
          <span className="text-[9px] font-mono font-bold text-white/35 uppercase tracking-wide">Typical support plan</span>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
            <div className="flex items-start gap-1.5">
              <Repeat className="w-3 h-3 shrink-0 mt-0.5 text-white/40" />
              <div>
                <div className="text-[10px] text-white/75 font-semibold leading-snug">{service.sessionPlan.sessions}</div>
                <div className="text-[9px] text-white/40 leading-snug">Recommended sessions</div>
              </div>
            </div>
            <div className="flex items-start gap-1.5">
              <Clock className="w-3 h-3 shrink-0 mt-0.5 text-white/40" />
              <div>
                <div className="text-[10px] text-white/75 font-semibold leading-snug">{service.sessionPlan.duration}</div>
                <div className="text-[9px] text-white/40 leading-snug">Session duration</div>
              </div>
            </div>
            <div className="flex items-start gap-1.5">
              <CalendarClock className="w-3 h-3 shrink-0 mt-0.5 text-white/40" />
              <div>
                <div className="text-[10px] text-white/75 font-semibold leading-snug">{service.sessionPlan.frequency}</div>
                <div className="text-[9px] text-white/40 leading-snug">Frequency</div>
              </div>
            </div>
            <div className="flex items-start gap-1.5">
              <Hourglass className="w-3 h-3 shrink-0 mt-0.5 text-white/40" />
              <div>
                <div className="text-[10px] text-white/75 font-semibold leading-snug">{service.sessionPlan.timeframe}</div>
                <div className="text-[9px] text-white/40 leading-snug">Overall timeframe</div>
              </div>
            </div>
          </div>
          <p className="text-[9.5px] text-white/35 leading-snug mt-2 italic">
            General starting point only — more complex or layered situations may need longer support.
          </p>
        </div>

        {/* Choose Your Counselor — same shared selection everywhere */}
        <button
          type="button"
          onClick={onChooseCounselor}
          className="mt-3 w-full inline-flex items-center gap-2 text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#5EEAD4]/40 rounded-xl px-3 py-2 transition-colors"
        >
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            style={{ background: service.bg, border: `1px solid ${service.border}`, color: service.color }}
          >
            <UserCheck className="w-3.5 h-3.5" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[9px] font-mono font-bold text-white/40 uppercase tracking-wide">Choose Your Counselor</span>
            <span className="block text-[11px] font-semibold text-white truncate">
              {selectedCounselor ? selectedCounselor.name : "Any available expert"}
            </span>
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-white/30 shrink-0" />
        </button>

        <button
          onClick={() => onBook(service.title)}
          className="mt-2 w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2.5 rounded-xl border transition-all hover:text-[#021816]"
          style={{ borderColor: service.border, color: service.color, background: "transparent" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = service.color; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          Explore Guidance <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

// On the Android app, only this many of the 10 Guidance Area cards show up
// front — the rest sit behind the "Show N More Guidance Areas" accordion
// below (same collapse pattern as HolisticWellness.tsx), since 10 full
// cards is a lot of vertical scroll inside a native app shell. On the
// website there is no such limit — every guidance area is always visible,
// since the site scrolls freely and devotees browsing on desktop/mobile web
// benefit from seeing everything at a glance.
const ANDROID_VISIBLE_COUNT = 3;

interface CounsellingGuidanceProps {
  onNavigate: (page: string) => void;
  /** Opens the existing booking wizard (BookNowWizard) with a pre-filled
   *  label and price — same pattern as HolisticWellness's onBookService. */
  onBookSession: (label: string, price: number) => void;
  /** True only inside the Capacitor Android app shell — see isAndroidApp in
   *  App.tsx. Controls how many of the 10 Guidance Areas render up front
   *  (see ANDROID_VISIBLE_COUNT above). Defaults to false so this component
   *  still renders its full, always-visible-website behaviour if a caller
   *  forgets to pass it. */
  isAndroidApp?: boolean;
}

export default function CounsellingGuidance({ onNavigate, onBookSession, isAndroidApp = false }: CounsellingGuidanceProps) {
  const [guidanceAccordionOpen, setGuidanceAccordionOpen] = useState(false);

  // ── "Choose Your Counselor" ────────────────────────────────────────────
  // A single, shared counselor selection used consistently across every one
  // of the 10 Guidance Areas — pulled straight from the existing priest
  // directory (PRIEST_PROFILES in data/priests.ts), filtered to entries that
  // actually list guidance/advice specializations. Picking a counselor from
  // any card opens the same picker and updates the same state, so whichever
  // Pandit/Pujari/expert a devotee chooses is reflected everywhere. Purely
  // additive — the booking wizard itself, its fields, and its flow are
  // untouched; the chosen counselor's name is just appended to the label
  // already passed to onBookSession.
  const counselors = GUIDANCE_COUNSELORS;
  const [selectedCounselorId, setSelectedCounselorId] = useState<string | null>(null);
  const [isCounselorPickerOpen, setIsCounselorPickerOpen] = useState(false);
  const selectedCounselor = counselors.find((c) => c.id === selectedCounselorId) ?? null;

  const visibleServices = isAndroidApp ? SERVICES.slice(0, ANDROID_VISIBLE_COUNT) : SERVICES;
  const hiddenServices = isAndroidApp ? SERVICES.slice(ANDROID_VISIBLE_COUNT) : [];
  const hasHiddenServices = hiddenServices.length > 0;

  const handleBookService = (title: string) => {
    // Every service card books the Standard Guidance Session by default —
    // the person can choose a different format lower down, or the team can
    // adjust duration/price after the initial conversation if needed.
    const standard = SESSION_FORMATS.find((f) => f.id === "standard-session")!;
    const label = selectedCounselor
      ? `Counselling & Guidance: ${title} — with ${selectedCounselor.name}`
      : `Counselling & Guidance: ${title}`;
    onBookSession(label, standard.price);
  };

  const handleBookFormat = (format: SessionFormat) => {
    onBookSession(`Counselling & Guidance — ${format.name}`, format.price);
  };

  // Used by the hero's "Explore the 10 Guidance Areas" / "See Session
  // Pricing" buttons below. Plain <a href="#..."> fragment links can be
  // unreliable inside the Capacitor Android WebView shell, so both buttons
  // now scroll explicitly via scrollIntoView — this also opens the Guidance
  // Areas accordion first (Android only) so the target section is actually
  // in the DOM and fully visible before scrolling to it.
  const scrollToSection = (id: string) => {
    if (id === "guidance-services" && isAndroidApp) setGuidanceAccordionOpen(true);
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, id === "guidance-services" && isAndroidApp ? 100 : 0);
    return () => window.clearTimeout(timer);
  };

  // Same idea as scrollToSection, but for the "Who it's for" chips, which
  // link to an individual card's id rather than a whole section — opens the
  // Guidance Areas accordion first (Android only) if that card is currently
  // hidden inside it.
  const scrollToChip = (serviceId: string) => {
    const isHidden = isAndroidApp && hiddenServices.some((s) => s.id === serviceId);
    if (isHidden) setGuidanceAccordionOpen(true);
    const timer = window.setTimeout(() => {
      document.getElementById(serviceId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, isHidden ? 100 : 0);
    return () => window.clearTimeout(timer);
  };

  return (
    <section
      className="pb-16 bg-gradient-to-b from-[#021816] to-[#021816] relative text-white min-h-screen"
      style={{
        paddingTop: "calc(var(--safe-area-inset-top, env(safe-area-inset-top, 24px)) + 96px)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 6rem)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Breadcrumb */}
        <button
          onClick={() => onNavigate("home")}
          className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white mb-4 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back to Home
        </button>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          {/* The site header already shows the Sri Dwar brand logo on every
              page, so it is intentionally NOT repeated here — this section
              opens straight with the page title, per its own tag line
              instead of a duplicate logo. */}
          <span className="inline-block text-[10px] font-mono font-bold text-[#5EEAD4]/80 uppercase tracking-widest mb-3">
            A Sri Dwar Guidance Service
          </span>

          <h1 className="text-3xl sm:text-4xl font-serif font-black text-white tracking-tight leading-tight">
            Counselling & Guidance
          </h1>
          <p className="text-sm text-white/70 mt-3 leading-relaxed">
            Affordable, accessible personal and family guidance — for individuals, students, couples, families,
            parents, professionals and seniors — from experienced Pandits and Dharmic experts who listen with
            patience and compassion, and who focus on strengthening families and resolving differences, never
            on creating separation.
          </p>

          {/* Who it's for chips — each links straight to its matching card
              in the "10 Guidance Areas" grid below. */}
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {WHO_ITS_FOR.map((w) => (
              <button
                key={w.label}
                type="button"
                onClick={() => scrollToChip(w.serviceId)}
                className="text-[10px] font-semibold text-white/70 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 hover:text-[#5EEAD4] hover:border-[#5EEAD4]/40 hover:bg-[#5EEAD4]/10 transition-colors"
              >
                {w.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <button
              type="button"
              onClick={() => scrollToSection("guidance-services")}
              className="relative inline-flex items-center gap-1.5 bg-gradient-to-r from-[#B45309] via-[#F59E0B] to-[#FCD34D] hover:from-[#D97706] hover:via-[#FBBF24] hover:to-[#FDE68A] text-[#021816] font-extrabold text-xs uppercase tracking-widest px-5 py-3 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 border border-[#FDE68A]/70 shadow-[0_0_16px_rgba(245,158,11,0.45)] hover:shadow-[0_0_24px_rgba(252,211,77,0.65)]"
            >
              <Compass className="w-3.5 h-3.5" />
              Explore the 10 Guidance Areas <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("guidance-pricing")}
              className="inline-flex items-center gap-1.5 bg-[#0F766E]/20 border border-[#5EEAD4]/40 hover:bg-[#0F766E]/40 hover:border-[#5EEAD4]/70 text-[#5EEAD4] hover:text-[#99F6E4] font-bold text-xs uppercase tracking-widest px-5 py-3 rounded-full transition-all duration-300 hover:scale-105"
            >
              <Tag className="w-3.5 h-3.5" />
              See Session Pricing
            </button>
          </div>

          {/* Short pointer down to the full disclaimer at the bottom of the
              page — deliberately just one line linking there, rather than
              repeating any of its wording here, so the "not medical /
              psychiatric / legal, no medication advice" language lives in
              exactly one place (see "Important Disclaimer" near the bottom). */}
          <button
            type="button"
            onClick={() => scrollToSection("full-disclaimer")}
            className="inline-flex items-center gap-1.5 text-[10.5px] text-white/45 hover:text-[#FFB347] underline underline-offset-2 mt-5 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> This is spiritual & personal guidance, not medical or clinical treatment — see full disclaimer below
          </button>
        </div>

        {/* ── How it works ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={step.title} className="bg-[#092320] border border-white/10 rounded-2xl p-4">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#5EEAD4]/15 border border-[#5EEAD4]/30 text-[#5EEAD4] text-[10px] font-black mb-2.5">
                {i + 1}
              </span>
              <h3 className="text-xs font-bold text-white mb-1">{step.title}</h3>
              <p className="text-[10.5px] text-white/55 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* ── 10 Guidance Areas ────────────────────────────────────────── */}
        <div id="guidance-services" className="scroll-mt-24 mb-12">
          <div className="text-center max-w-xl mx-auto mb-6">
            <span className="text-[10px] font-mono font-bold text-[#FFB347]/80 uppercase tracking-widest">10 Guidance Areas</span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white mt-1.5">What Would You Like Help With?</h2>
            <p className="text-[11px] text-white/50 mt-2">
              Not sure which fits? "Everyday Advice & Expert Consultation" is a good place to start — a
              Dharmic expert will help point you the right way.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleServices.map((service) => (
              <ServiceCard key={service.id} service={service} onBook={handleBookService} selectedCounselor={selectedCounselor} onChooseCounselor={() => setIsCounselorPickerOpen(true)} />
            ))}
          </div>

          {/* Android-only accordion for the remaining guidance areas — same
              collapse pattern as HolisticWellness.tsx. Never rendered on the
              website, since hiddenServices is always empty there. */}
          {hasHiddenServices && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setGuidanceAccordionOpen((prev) => !prev)}
                className="w-full flex items-center justify-between px-6 py-4 rounded-2xl border transition-all duration-300"
                style={{
                  background: guidanceAccordionOpen ? "rgba(255,179,71,0.07)" : "rgba(255,255,255,0.03)",
                  borderColor: guidanceAccordionOpen ? "rgba(255,179,71,0.25)" : "rgba(255,255,255,0.08)",
                }}
                aria-expanded={guidanceAccordionOpen}
              >
                <span className="text-sm font-bold text-white">
                  {guidanceAccordionOpen ? "Hide Additional Guidance Areas" : `Show ${hiddenServices.length} More Guidance Areas`}
                </span>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shrink-0"
                  style={{
                    background: guidanceAccordionOpen ? "rgba(255,179,71,0.15)" : "rgba(255,255,255,0.05)",
                    color: guidanceAccordionOpen ? "#FFB347" : "rgba(255,255,255,0.35)",
                    transform: guidanceAccordionOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>

              {guidanceAccordionOpen && (
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {hiddenServices.map((service) => (
                    <ServiceCard key={service.id} service={service} onBook={handleBookService} selectedCounselor={selectedCounselor} onChooseCounselor={() => setIsCounselorPickerOpen(true)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Pricing / session formats ────────────────────────────────── */}
        <div id="guidance-pricing" className="scroll-mt-24 mb-12">
          <div className="text-center max-w-xl mx-auto mb-6">
            <span className="text-[10px] font-mono font-bold text-[#5EEAD4]/80 uppercase tracking-widest">Simple, Affordable Pricing</span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white mt-1.5">
              Your Session, Your Pricing, You Decide What to Pay.
            </h2>
            <p className="text-[11px] text-white/50 mt-2 max-w-lg mx-auto">
              Pick the format that fits your situation — a quick call, a standard session, a family/couple
              session, or a custom multi-hour plan — the same transparent pricing applies across all 10 guidance
              areas, kept deliberately low so cost is never the reason someone doesn't reach out.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SESSION_FORMATS.map((format) => (
              <div
                key={format.id}
                className={`relative flex flex-col bg-[#092320] border rounded-3xl p-5 ${
                  format.highlight ? "border-[#FFB347] shadow-lg shadow-[#FFB347]/10" : "border-white/10"
                }`}
              >
                {format.highlight && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#FFB347] text-[#021816] text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                    Most Booked
                  </span>
                )}
                {format.isCustom && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#5EEAD4] text-[#021816] text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                    Pay By The Hour
                  </span>
                )}
                <div className="flex items-center gap-1.5 text-white/50 mb-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-mono uppercase tracking-wide">{format.duration}</span>
                </div>
                <h3 className="font-serif text-base font-bold text-white">{format.name}</h3>
                <span className="text-2xl font-serif font-black text-[#FFB347] mt-1">
                  {format.isCustom && <span className="text-xs font-sans font-bold text-white/40 mr-1">From</span>}
                  ₹{format.price.toLocaleString("en-IN")}{format.isCustom && <span className="text-xs font-sans font-bold text-white/40"> / hour</span>}
                </span>
                <p className="text-[11px] text-white/55 leading-relaxed mt-2">{format.bestFor}</p>
                {/* Every card now carries a `note` line (not just Custom
                    previously), so all four cards hold an equal depth of
                    information and no card is left looking emptier than
                    the others once the grid row stretches to match the
                    tallest card. flex-1 keeps the button pinned to the
                    same baseline across all four regardless of how long
                    each card's text runs. */}
                <p className="text-[10px] text-white/40 leading-relaxed mt-1.5 italic flex-1">{format.note}</p>
                {/* Identical style, dimensions, spacing, and click
                    behaviour on all four cards — only the label text
                    differs (Custom books a quote instead of a fixed
                    session), and the "Most Booked" / "Pay By The Hour"
                    badges above already do the job of visually
                    distinguishing a card, so the button itself no longer
                    needs to. */}
                <button
                  onClick={() => handleBookFormat(format)}
                  className="mt-4 w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2.5 rounded-xl border border-[#FFB347]/40 text-[#FFB347] hover:bg-[#FFB347] hover:text-[#021816] transition-all"
                >
                  <PhoneCall className="w-3.5 h-3.5" /> {format.isCustom ? "Get Custom Pricing" : "Book This Session"}
                </button>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-white/35 text-center mt-4 italic">
            Prices shown are per session (or starting from ₹199/hour for the Custom Guidance Plan, based on the
            guidance area selected) and may vary slightly by expert availability and language. No hidden fees.
          </p>
        </div>

        {/* ── Trust strip ──────────────────────────────────────────────── */}
        <div className="bg-[#092320] border border-white/10 rounded-3xl p-5 sm:p-6 mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-[#FFB347]" />
            <h2 className="font-serif text-lg font-bold text-white">Guided by Patient, Compassionate Experts</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                icon: <Heart className="w-4 h-4" />,
                title: "Strengthening, Not Separating",
                desc: "Every expert is chosen for a genuine commitment to strengthening families and resolving differences — never to encouraging separation.",
              },
              {
                icon: <Lock className="w-4 h-4" />,
                title: "Confidential & Judgement-Free",
                desc: "What you share stays private. Sessions are conducted respectfully, without judgement, at your pace.",
              },
              {
                icon: <ShieldCheck className="w-4 h-4" />,
                title: "Experienced Dharmic Experts",
                desc: "Every session is led by an experienced Pandit or Dharmic expert in their respective field of guidance.",
              },
              {
                icon: <PhoneCall className="w-4 h-4" />,
                title: "Simple Phone or Video Calls",
                desc: "No app to install — join by a simple phone or video call at your scheduled time.",
              },
            ].map((f) => (
              <div key={f.title} className="bg-[#021816] border border-white/8 rounded-2xl p-4">
                <div className="w-8 h-8 rounded-xl bg-[#5EEAD4]/10 border border-[#5EEAD4]/20 flex items-center justify-center text-[#5EEAD4] mb-2.5">
                  {f.icon}
                </div>
                <h4 className="text-xs font-bold text-white mb-1">{f.title}</h4>
                <p className="text-[10.5px] text-white/55 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Full disclaimer ──────────────────────────────────────────── */}
        <div id="full-disclaimer" className="scroll-mt-24 bg-[#021816] border border-[#FFB347]/25 rounded-3xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-[#FFB347]" />
            <h2 className="font-serif text-base font-bold text-white">Important Disclaimer</h2>
          </div>
          <div className="space-y-2 text-[11px] text-white/60 leading-relaxed">
            <p>
              Counselling & Guidance sessions on Sri Dwar are offered in good faith by experienced Pandits and
              Dharmic experts as informational, spiritual, and personal guidance. They are intended to help you
              understand your situation, reflect on it, and think through possible ways forward.
            </p>
            <p>
              These sessions are <strong className="text-white/80">not</strong> medical, psychiatric, legal, or
              clinical treatment or therapy. They do not diagnose, treat, or cure any medical or mental health
              condition, and Sri Dwar does not guarantee any specific outcome, resolution, or result from any
              session. Where a matter is clinical, severe, or an emergency, please consult a qualified doctor,
              licensed mental-health professional, lawyer, or the appropriate emergency service — a guidance
              session is not a substitute for that care.
            </p>
            <p className="flex items-start gap-2">
              <Pill className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#FFB347]" />
              <span>
                <strong className="text-white/80">No medication or medical advice is ever given.</strong> Every
                session on Sri Dwar is strictly limited to wellbeing, counselling, and personal/spiritual
                guidance. If an expert offers a comment or suggestion that falls outside this scope — for
                example, anything that sounds medical, legal, or financial — please treat it as informal opinion
                only and independently verify it with a qualified, licensed professional before acting on it.
              </span>
            </p>
            <p>
              The "recommended sessions, duration, frequency, and timeframe" shown against each guidance area is a
              general, informational starting point, not a clinical treatment plan or a promise of resolution by
              that date — situations that are more complex or layered than usual may reasonably need more
              sessions or a longer period of support, and your expert may revise this after your first
              conversation. The Custom Guidance Plan exists specifically for that longer-support case.
            </p>
            <p>
              By booking a session, you acknowledge that Sri Dwar and its associated experts are providing
              guidance in good faith, based on their experience and Dharmic knowledge, and that the final
              decisions in your personal, family, or professional life remain entirely your own.
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-white/8 flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
              onClick={() => onNavigate("contact")}
              className="text-[#FFB347] font-bold underline underline-offset-2 hover:text-white text-[11px] flex items-center gap-1"
            >
              Have questions first? Contact us <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

      </div>

      {/* ── Choose Your Counselor picker — shared across every offering ── */}
      {isCounselorPickerOpen && (
        <div
          className="fixed inset-0 z-[200] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4 animate-fadeIn"
          style={{ touchAction: "pan-y" }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsCounselorPickerOpen(false); }}
        >
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsCounselorPickerOpen(false)} />
          <div
            className="relative w-full sm:max-w-lg bg-[#042825] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 flex flex-col overflow-hidden"
            style={{ maxHeight: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#5EEAD4] via-[#FFB347] to-[#5EEAD4] z-10" />
            <button
              onClick={() => setIsCounselorPickerOpen(false)}
              className="absolute right-4 text-white/50 hover:text-white transition-colors p-1 z-10"
              style={{ top: "calc(var(--safe-area-inset-top, env(safe-area-inset-top, 24px)) + 1rem)" }}
              aria-label="Close counselor picker"
            >
              <X className="w-5 h-5" />
            </button>

            <div
              className="p-6 pb-3 shrink-0"
              style={{ paddingTop: "calc(var(--safe-area-inset-top, env(safe-area-inset-top, 24px)) + 1.5rem)" }}
            >
              <h3 className="font-serif text-xl font-bold text-white text-center">Choose Your Counselor</h3>
              <p className="text-xs text-white/60 text-center max-w-sm mx-auto mt-1.5">
                Pick an available, experienced Pandit, Pujari, or Dharmic guidance expert from our directory. Your
                choice applies across every Guidance Area.
              </p>
            </div>

            <div
              className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 space-y-2"
              style={{
                WebkitOverflowScrolling: "touch",
                paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)",
              }}
            >
              <button
                type="button"
                onClick={() => { setSelectedCounselorId(null); setIsCounselorPickerOpen(false); }}
                className={`w-full text-left flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors ${
                  !selectedCounselorId ? "bg-[#5EEAD4]/10 border-[#5EEAD4]/50" : "bg-white/5 border-white/10 hover:border-white/25"
                }`}
              >
                <span className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-white/70" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-bold text-white">Any available expert</span>
                  <span className="block text-[10px] text-white/50">Sri Dwar will assign a suitable counselor</span>
                </span>
                {!selectedCounselorId && <Check className="w-4 h-4 text-[#5EEAD4] shrink-0" />}
              </button>

              {GUIDANCE_COUNSELORS.map((c) => {
                const active = c.id === selectedCounselorId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setSelectedCounselorId(c.id); setIsCounselorPickerOpen(false); }}
                    className={`w-full text-left flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors ${
                      active ? "bg-[#5EEAD4]/10 border-[#5EEAD4]/50" : "bg-white/5 border-white/10 hover:border-white/25"
                    }`}
                  >
                    <span className="w-9 h-9 rounded-full bg-[#FFB347]/15 border border-[#FFB347]/30 flex items-center justify-center shrink-0 text-[#FFB347]">
                      <UserCheck className="w-4 h-4" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-bold text-white truncate">{c.name}</span>
                      <span className="block text-[10px] text-white/50 truncate">{c.expertise} · {c.location}</span>
                      <span className="flex items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center gap-0.5 text-[9px] text-white/40">
                          <Star className="w-2.5 h-2.5" /> {c.yearsExperience} yrs
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-[9px] text-white/40 truncate">
                          <Languages className="w-2.5 h-2.5 shrink-0" /> {c.languages.join(", ")}
                        </span>
                      </span>
                    </span>
                    {active && <Check className="w-4 h-4 text-[#5EEAD4] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
