/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from "react";
import { FEATURED_SEVAS } from "../data/spiritualData";
import { Heart, Send, Sparkles, Utensils, Flame, BookOpen, ChevronDown, ChevronUp, Droplets, Star, Sun, Moon, Tag, ShieldCheck } from "lucide-react";
import { gaSevaSelect } from "../utils/analytics";
import { syncToGoogleForm } from "../utils/googleFormSync";
import { DEVOTEE_REVIEWS, DevoteeReview } from "../data/devoteeReviews";
import { getDiscountedPrice, isDiscountActive, DISCOUNT_TAG } from "../utils/discount";
import { SEVA_OFFERINGS } from "../data/sevaOfferings";
import SevaOfferingCard from "./SevaOfferingCard";
import SevaLiveDashboard from "./SevaLiveDashboard";

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

// Shuffles the devotee reviews so they don't render in the same fixed
// (roughly alphabetical-by-first-letter) order every time, and nudges any
// two consecutive entries that happen to start with the same letter apart
// from each other, so the list doesn't visually read as "grouped by letter".
function shuffleReviews(reviews: DevoteeReview[]): DevoteeReview[] {
  const arr = [...reviews];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  for (let i = 1; i < arr.length; i++) {
    if (arr[i].name[0].toLowerCase() === arr[i - 1].name[0].toLowerCase()) {
      const swapIndex = arr.findIndex(
        (r, idx) => idx > i && r.name[0].toLowerCase() !== arr[i - 1].name[0].toLowerCase()
      );
      if (swapIndex !== -1) {
        [arr[i], arr[swapIndex]] = [arr[swapIndex], arr[i]];
      }
    }
  }
  return arr;
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

// Lord Jagannath live feed photo slideshow — using existing project images
const JAGANNATH_SLIDES = [
  {
    img: import.meta.env.BASE_URL + "images/Aarti.jpg",
    title: "Jagannath Mangal Aarti — Puri",
    desc: "Sacred morning aarti performed live at Jagannath Temple, Puri.",
  },
  {
    img: import.meta.env.BASE_URL + "images/Mahaprasad Seva.jpg",
    title: "Chhappan Bhog Naivedya Seva",
    desc: "56-item sacred food offering to Lord Jagannath — live from the sanctum.",
  },
  {
    img: import.meta.env.BASE_URL + "images/Diya Lighting.jpg",
    title: "Akhanda Diya Lighting Seva",
    desc: "Sacred lamps glowing continuously at the temple premises.",
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
// discount (see utils/discount.ts) is applied here at render time.
const getSevaDiscountedPrice = (amount: number): { display: number; original: number | null } => {
  return isDiscountActive()
    ? { display: getDiscountedPrice(amount), original: amount }
    : { display: amount, original: null };
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
}

function SevaCard({ seva, onSponsor }: SevaCardProps) {
  const tier = seva.donationTiers[0];
  const { display, original } = getSevaDiscountedPrice(tier.amount);

  return (
    <div
      id={`seva-card-${seva.id}`}
      className="bg-[#092320] p-5 rounded-3xl border border-white/10 text-left hover:shadow-lg hover:border-[#5EEAD4]/20 transition-all flex flex-col justify-between text-white"
    >
      <div>
        {/* Temple image */}
        {seva.imageUrl ? (
          <div className="w-full aspect-[3/2] rounded-2xl overflow-hidden mb-4 border border-white/5 relative">
            <img
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
            {isDiscountActive() && (
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
        {isDiscountActive() ? `SPONSOR SEVA — ${DISCOUNT_TAG} 🙏` : "SPONSOR SEVA 🙏"}
      </button>
    </div>
  );
}

interface SevaExperienceProps {
  onSponsorSeva: (sevaName: string, price: number) => void;
}

// The Prayer Wall starts empty — no example devotees or sample messages are
// shown, since these looked like fake/placeholder activity to devotees. It
// fills only with real messages the current visitor sends (plus the
// automated reply), which are also synced to the Google Sheet for the team
// to review.
const INITIAL_CHAT_MESSAGES: { name: string; msg: string; location: string }[] = [];

// Note: the sample "Illustrative activity" ticker (fake example sponsorships
// like "Example: a devotee sponsored Gau Seva") has been removed — it looked
// like fake/misleading live activity to devotees.

export default function SevaExperience({ onSponsorSeva }: SevaExperienceProps) {
  const [chatMessages, setChatMessages] = useState(INITIAL_CHAT_MESSAGES);
  const [inputMessage, setInputMessage] = useState("");
  // Note: UPI/Details state removed — Sponsor Seva now routes through
  // the Puja Sankalpa Portal (BookNowWizard) via onSponsorSeva prop.
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [activeOfferingId, setActiveOfferingId] = useState<string | null>(null);
  // Offered sevas (this device, most recent first), shown at the top of the
  // Live Devotional Dashboard's "Recent Seva Completed" list so a devotee's
  // own seva stays visibly reflected there even after returning to the page.
  // Note: this only feeds the dashboard — the Structured Seva Offering
  // cards themselves are never hidden after offering, since a devotee may
  // want to offer the same seva again for a different person, cow, etc.
  const [sessionRecentSevas, setSessionRecentSevas] = useState<{ seva: string; devotee: string; status: "Pending" }[]>(
    () => loadCompletedSevas().reverse().map((r) => ({ seva: r.seva, devotee: r.devotee, status: "Pending" as const }))
  );
  // Shuffled once when the component mounts, so the order stays stable
  // while the user is on the page (won't re-shuffle on every keystroke or
  // re-render) but varies between visits/page loads.
  const [shuffledReviews] = useState(() => shuffleReviews(DEVOTEE_REVIEWS));



  useEffect(() => {
    const t = setInterval(() => setSlideIndex((p) => (p + 1) % JAGANNATH_SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

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



  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    const offeredPrayer = inputMessage.trim();
    setChatMessages((prev) => [...prev, { name: "You", msg: offeredPrayer, location: "Only visible to you" }]);
    setInputMessage("");

    // Every prayer offered here is synced to the Google Sheet inside your
    // Google Drive (via the "prayer_wall" form config in googleFormSync.ts,
    // which now points at its own dedicated Prasad & Prayer Testimony
    // sheet), so the team can review it, confirm it's from a real devotee,
    // and choose which ones to feature in the Sacred Moments gallery.
    syncToGoogleForm("prayer_wall", {
      name: "Devotee (Prayer Wall)",
      email: "Seva Hub — Prayer Wall",
      phone: "",
      details: offeredPrayer,
      type: "Prayer Wall Offering"
    }).catch((err) => console.error("Prayer Wall sync error:", err));

    setTimeout(() => {
      const replies = [
        "Shubh Sankalpa! May your wishes be fulfilled by the Divine.",
        "Om Namah Shivaya. The puja vibrations are truly celestial.",
        "Jai Jagannath! Your name & Gotra has been registered safely.",
      ];
      // Clearly labeled as an automated response — not a real priest — so
      // devotees aren't misled into thinking a real person replied live.
      setChatMessages((prev) => [...prev, { name: "Sri Dwar Prayer Assistant (Automated)", msg: replies[Math.floor(Math.random() * replies.length)], location: "AI-generated" }]);
    }, 2000);
  };

  const slide = JAGANNATH_SLIDES[slideIndex];

  // Devotee Reviews, reshaped to the same {name, msg, location} card shape as
  // the Prayer Wall's own messages, so they render as one continuous,
  // scrollable list of real devotee names + city + message cards — followed
  // by anything the current visitor sends on the Prayer Wall below them.
  const reviewCards = shuffledReviews.map((r) => ({
    name: r.name,
    msg: r.message,
    location: r.city,
  }));
  const prayerWallCards = [...reviewCards, ...chatMessages];

  return (
    <section id="seva-dashboard-section" className="py-16 bg-[#021816] relative text-white" style={{ paddingTop: `calc(env(safe-area-inset-top, 0px) + 80px)` }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="text-xs font-semibold text-[#5EEAD4]/80 tracking-wider font-mono uppercase">Sacred community giving</span>
          <h2 className="text-3xl font-serif font-black text-white tracking-tight mt-1">
            Seva Hub & Live Devotional Dashboard
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

        {/* Live Devotional Dashboard */}
        <SevaLiveDashboard extraRecentSevas={sessionRecentSevas} />

        {/*
          ── Main 2-column row ──
          The Sponsorship Services column (4 always-visible cards) and the
          Sacred Moments column are laid out independently now (lg:items-start,
          not lg:items-stretch). Stretching used to force this row's height to
          match Sacred Moments' full, unclamped review list, which pushed
          Sponsorship Services to stretch far taller than its own content and
          left big empty gaps. Instead, the review list below has its own
          fixed, capped height (shows ~8-9 reviews, scrolls for the rest), so
          the Sacred Moments card sizes naturally to its own content and
          Sponsorship Services is never artificially stretched.
        */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 lg:items-start">

          {/* LEFT: Sponsorship Services — col-span-7 */}
          <div className="lg:col-span-7 flex flex-col gap-4">

            {/* Heading row */}
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl font-bold text-white">Sponsorship Services</h3>
              {isDiscountActive() && (
                <span className="text-[10px] font-mono text-red-300 uppercase tracking-wide bg-red-500/10 border border-red-400/20 px-2.5 py-1 rounded-full">
                  {DISCOUNT_TAG} All Sevas
                </span>
              )}
            </div>

            {/* Always-visible: first 4 FEATURED_SEVAS in 2×2 grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FEATURED_SEVAS.slice(0, 4).map((seva) => (
                <SevaCard key={seva.id} seva={seva} onSponsor={handleSponsor} />
              ))}
            </div>
          </div>

          {/* RIGHT: Live Feed + Chat — col-span-5, sticky top. Sized by its
              own content (see the fixed-height review list below), not
              stretched to match the Sponsorship Services column. */}
          <div className="lg:col-span-5 lg:sticky lg:top-20 mt-2 lg:mt-0">
            <div className="flex flex-col bg-[#092320] rounded-3xl border border-white/10 overflow-hidden shadow-md text-white">

              {/* Photo gallery header — this is a rotating slideshow of temple
                  photos, not a live video feed, so it is labeled honestly. */}
              <div className="px-4 pt-4 pb-2 flex items-center justify-between shrink-0">
                <h3 className="font-serif text-base font-bold text-white">Sacred Moments</h3>
                <div className="bg-white/10 text-white/80 text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1 uppercase border border-white/10">
                  Gallery
                </div>
              </div>

              {/* Lord Jagannath photo slideshow */}
              <div className="relative mx-4 mb-4 rounded-2xl overflow-hidden shrink-0" style={{ aspectRatio: "16/9" }}>
                <img
                  key={slideIndex}
                  src={slide.img}
                  alt={slide.title}
                  className="w-full h-full object-cover transition-opacity duration-700"
                />
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#021816]/90 via-transparent to-[#021816]/20" />
                {/* Slide caption */}
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <h4 className="font-serif text-sm font-bold text-white drop-shadow">{slide.title}</h4>
                  <p className="text-[10px] text-white/80 mt-0.5 drop-shadow">{slide.desc}</p>
                </div>
                {/* Slide dots */}
                <div className="absolute top-2 right-2 flex gap-1">
                  {JAGANNATH_SLIDES.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setSlideIndex(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${i === slideIndex ? "bg-[#FFB347] w-4" : "bg-white/40"}`}
                    />
                  ))}
                </div>
              </div>

              {/* Devotee Chat — a card list: real devotee reviews first, then
                  anything the current visitor sends below them. The list
                  below has a fixed height sized for ~8-9 compact cards, with
                  the rest reachable by scrolling inside it — it no longer
                  grows to fit all reviews, which is what was inflating the
                  whole card and forcing Sponsorship Services to stretch. */}
              <div className="px-4 pb-4 flex flex-col">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3 shrink-0">
                  <span className="text-xs font-bold text-white/80">Prayer Wall</span>
                  <span className="text-[9px] font-mono text-white/40">Prayers</span>
                </div>
                <p className="text-[10px] text-white/40 -mt-2 mb-2 shrink-0">
                  Devotee reviews, plus a private space to offer your own prayer. Your prayer is saved to our records so the team can include it here for other devotees; it is not shared publicly until reviewed. Automated replies are marked "AI-generated".
                </p>

                {/* Messages — fixed height, shows ~8-9 cards at a glance;
                    scroll for the rest. line-clamp-2 keeps every card a
                    predictable height so that estimate holds regardless of
                    how long an individual review is. */}
                <div
                  id="chat-messages-container"
                  className="h-[640px] overflow-y-auto space-y-2.5 mb-3 pr-1 text-left"
                >
                  {prayerWallCards.map((msg, i) => (
                    <div key={i} className="text-xs bg-white/5 p-2.5 rounded-2xl border border-white/10">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-[#5EEAD4]">{msg.name}</span>
                        <span className="text-[9px] text-white/40 font-mono">{msg.location}</span>
                      </div>
                      <p className="text-white/80 line-clamp-2">{msg.msg}</p>
                    </div>
                  ))}
                </div>

                {/* Input */}
                <form onSubmit={handleSendMessage} className="flex gap-2 shrink-0">
                  <input
                    id="chat-input-box"
                    type="text"
                    placeholder="Offer your prayers or type a mantra..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    className="flex-grow text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white placeholder-white/40"
                  />
                  <button
                    id="send-chat-message"
                    type="submit"
                    className="bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] p-2.5 rounded-xl transition-all shadow shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>

            </div>
          </div>

        </div>

        {/*
          ── Accordion row ──
          Deliberately a separate grid row (same lg:col-span-7 width as the
          Sponsorship Services column above) so that opening "More Sacred
          Sevas" only grows content that lives BELOW the equal-height
          Sponsorship/Live Feed row — it never resizes or shifts that row,
          keeping the overall dashboard size fixed and stable on toggle.
        */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 mt-4">
          <div className="lg:col-span-7">
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
                      {FEATURED_SEVAS.slice(4).length + EXTRA_SEVAS.length} additional offerings{isDiscountActive() ? ` — all ${DISCOUNT_TAG.toLowerCase()}` : ""}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {isDiscountActive() && (
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
                    {FEATURED_SEVAS.slice(4).map((seva) => (
                      <SevaCard key={seva.id} seva={seva} onSponsor={handleSponsor} />
                    ))}
                    {EXTRA_SEVAS.map((seva) => (
                      <SevaCard key={seva.id} seva={seva as any} onSponsor={handleSponsor} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-[10px] text-white/35 font-mono mt-8 leading-relaxed max-w-2xl mx-auto">
          Offerings and sevas are performed with devotion as per temple process. Timings may vary depending on temple schedule, festival rush, priest availability, and temple rituals.
        </p>
      </div>

    </section>
  );
}
