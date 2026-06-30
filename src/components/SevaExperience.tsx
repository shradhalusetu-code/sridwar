/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { FEATURED_SEVAS } from "../data/spiritualData";
import { Heart, Send, Sparkles, Utensils, Flame, BookOpen, ChevronDown, ChevronUp, Droplets, Star, Sun, Moon, Tag } from "lucide-react";
import { gaSevaSelect } from "../utils/analytics";



// ─── Market-researched prices with 50% off applied ─────────────────────────
// Market avg → Sri Dwar price (50% off market avg, rounded to auspicious ₹)
// Rudrabhishek:    market ₹2,200 → 50% off = ₹1,100
// Mahaprasad Dist: market ₹2,000 → 50% off = ₹1,000
// Tulsi Vivah:     market ₹900  → 50% off = ₹450
// Navagraha Homa:  market ₹8,000 → 50% off = ₹4,000
// Akhand Ramayan:  market ₹8,500 → 50% off = ₹4,250
// Gomata Puja:     market ₹1,100 → 50% off = ₹550

const EXTRA_SEVAS = [
  {
    id: "seva-rudrabhishek",
    name: "Rudrabhishek Puja",
    significance: "Sacred abhishek of Shivalinga with Panchamrit, Gangajal & bilva leaves with Vedic Rudra chanting by qualified pandits.",
    impactStat: "Performed at Kashi Vishwanath & Lingaraj Mandir, Bhubaneswar",
    templeAssociation: "Kashi Vishwanath",
    donationTiers: [{ amount: 1100, mrp: 2200 }],
    imageUrl: import.meta.env.BASE_URL + "images/Rudrabhishek Puja.jpg",
  },
  {
    id: "seva-mahaprasad",
    name: "Mahaprasad Distribution",
    significance: "Sponsor distribution of sacred Chhappan Bhog Mahaprasad to pilgrims and underprivileged devotees at Jagannath Puri.",
    impactStat: "Feeds 200+ devotees per sponsorship at Jagannath Puri",
    templeAssociation: "Jagannath Puri",
    donationTiers: [{ amount: 1000, mrp: 2000 }],
    imageUrl: import.meta.env.BASE_URL + "images/Mahaprasad Seva.jpg",
  },
  {
    id: "seva-tulsi-vivah",
    name: "Tulsi Vivah Seva",
    significance: "Sacred marriage ceremony of Tulsi plant with Lord Vishnu — an auspicious ritual that removes dosha and blesses families.",
    impactStat: "Conducted during Kartik Maas at Vrindavan & Dwarka temples",
    templeAssociation: "Vrindavan Dham",
    donationTiers: [{ amount: 450, mrp: 900 }],
    imageUrl: import.meta.env.BASE_URL + "images/Tulsi Vivah.jpg",
  },
  {
    id: "seva-navagraha",
    name: "Navagraha Shanti Homa",
    significance: "Nine-planet pacification homa to remove planetary doshas, improve fortune, health and career using specific samidha and herbal offerings.",
    impactStat: "Performed by Jyotish-trained Acharyas at Ujjain Mahakaleshwar",
    templeAssociation: "Mahakaleshwar, Ujjain",
    donationTiers: [{ amount: 4000, mrp: 8000 }],
    imageUrl: import.meta.env.BASE_URL + "images/Navagraha.jpg",
  },
  {
    id: "seva-akhand-path",
    name: "Akhand Ramayan Path",
    significance: "Uninterrupted 24-hour recitation of the complete Valmiki Ramayana by a team of trained pandits to bring peace and blessings.",
    impactStat: "Organised at Ram Janmabhoomi, Ayodhya for devotee sankalpa",
    templeAssociation: "Ram Janmabhoomi, Ayodhya",
    donationTiers: [{ amount: 4250, mrp: 8500 }],
    imageUrl: import.meta.env.BASE_URL + "images/Akhand Ramayan.jpg",
  },
  {
    id: "seva-gomata-puja",
    name: "Gomata Puja & Feeding",
    significance: "Ceremonial worship and feeding of sacred desi cows with tulsi, jaggery and sesame — performed on your behalf with photo proof.",
    impactStat: "Done at certified Gaushalas in Mathura & Vrindavan",
    templeAssociation: "Mathura Gaushala",
    donationTiers: [{ amount: 550, mrp: 1100 }],
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

// Compute 50% off from MRP (or fall back to amount as already-discounted)
const getSevaDiscountedPrice = (amount: number, mrp?: number): { display: number; original: number | null } => {
  if (mrp) return { display: amount, original: mrp };
  // FEATURED_SEVAS pass only amount — treat as MRP, show 50% off
  const half = Math.round(amount / 2);
  return { display: half, original: amount };
};

interface SevaCardProps {
  seva: {
    id: string;
    name: string;
    significance: string;
    impactStat: string;
    templeAssociation: string;
    donationTiers: Array<{ amount: number; mrp?: number; label?: string }>;
    imageUrl?: string | null;
  };
  onSponsor: (name: string, price: number) => void;
}

function SevaCard({ seva, onSponsor }: SevaCardProps) {
  const tier = seva.donationTiers[0];
  const { display, original } = getSevaDiscountedPrice(tier.amount, tier.mrp);

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
            {/* 50% OFF badge on image */}
            <div className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full tracking-wide">
              50% OFF
            </div>
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
        SPONSOR SEVA — 50% OFF 🙏
      </button>
    </div>
  );
}

interface SevaExperienceProps {
  onSponsorSeva: (sevaName: string, price: number) => void;
}

const INITIAL_CHAT_MESSAGES = [
  { name: "Ananya Misra",    msg: "Har Har Mahadev! Booked Rudrabhishek for my parents' anniversary.", location: "Bhubaneswar, Odisha" },
  { name: "Rajesh K.",       msg: "Chanting Sri Ram Jai Ram. Sponsored cow feeding at Varanasi.",       location: "San Jose, CA" },
  { name: "Preeti Goyal",    msg: "So peaceful to watch the Mahapuja happening live at Badrinath.",     location: "London, UK" },
  { name: "Dr. Amit Varma",  msg: "Sponsored Ayodhya Gausala seva — verified photos within hours!",    location: "Chicago, USA" },
  { name: "Sandeep Patnaik", msg: "Chhappan Bhog at Puri on my daughter's birthday. Live stream divine.", location: "Cuttack, Odisha" },
  { name: "Meera Nair",      msg: "Gifted Sanskrit Gurukul book kits — children holding stamped kits!", location: "Ernakulam, Kerala" },
  { name: "Vikram Aditya",   msg: "Shani Taila Abhishekam live audio was pristine. Thread arrived sealed.", location: "Mumbai, MH" },
  { name: "Rohan Sharma",    msg: "Kashi Rudrabhishek with father's gotra brought immense peace.",      location: "New Delhi" },
  { name: "Rajeshwari D.",   msg: "Maa Kamakhya Archana — priest reciting my Gotra over spring. Moving.", location: "Pune, MH" },
  { name: "Swati Sen",       msg: "Om Namah Shivaya 🙏 Lighting Akhanda Diya for my mother's health.", location: "Kolkata, WB" },
  { name: "Srinivas Rao",    msg: "Jai Jagannath! Puri Vishesh Seva — certificate on WhatsApp in 24 hrs.", location: "Hyderabad, TS" },
  { name: "Preeya Patel",    msg: "Annadanam at Kashi — may all sadhus be fed today 🙏",               location: "London, UK" },
];

const LIVE_TICKERS = [
  "Anurag Sharma (San Francisco) sponsored Gau Seva 🐄",
  "Preeya Patel (London) sponsored Annadanam 🍚",
  "Vikramaditya (New Delhi) booked Lingaraj Abhishek 🔱",
  "Swati Sen (Kolkata) sponsored Akhanda Diya 🔥",
  "Srinivas Rao (Hyderabad) sponsored Mahaprasad Distribution 🍱",
  "Amit K. Rana (Seattle) booked Puri Jagannath Vishesh Seva 🐚",
];

export default function SevaExperience({ onSponsorSeva }: SevaExperienceProps) {
  const [chatMessages, setChatMessages] = useState(INITIAL_CHAT_MESSAGES);
  const [inputMessage, setInputMessage] = useState("");
  // Note: UPI/Details state removed — Sponsor Seva now routes through
  // the Puja Sankalpa Portal (BookNowWizard) via onSponsorSeva prop.
  const [tickerIndex, setTickerIndex] = useState(0);
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);



  useEffect(() => {
    const t = setInterval(() => setTickerIndex((p) => (p + 1) % LIVE_TICKERS.length), 4500);
    return () => clearInterval(t);
  }, []);

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



  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    setChatMessages((prev) => [...prev, { name: "You (Devotee)", msg: inputMessage.trim(), location: "Your Mandala" }]);
    setInputMessage("");
    setTimeout(() => {
      const replies = [
        "Shubh Sankalpa! May your wishes be fulfilled by the Divine.",
        "Om Namah Shivaya. The puja vibrations are truly celestial.",
        "Jai Jagannath! Your name & Gotra has been registered safely.",
      ];
      setChatMessages((prev) => [...prev, { name: "Pandit Shastri", msg: replies[Math.floor(Math.random() * replies.length)], location: "Puri Shrinand Kendra" }]);
    }, 2000);
  };

  const slide = JAGANNATH_SLIDES[slideIndex];

  return (
    <section id="seva-dashboard-section" className="py-16 bg-[#021816] relative text-white" style={{ paddingTop: `calc(env(safe-area-inset-top, 0px) + 80px)` }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Live Ticker Bar */}
        <div className="bg-[#FFB347]/10 border border-[#FFB347]/30 py-3 rounded-2xl mb-8 flex items-center justify-between px-4 sm:px-6 overflow-hidden gap-3">
          <div className="flex items-center space-x-2 text-[#FFB347] uppercase tracking-widest font-mono text-[10px] font-bold shrink-0">
            <span className="w-2.5 h-2.5 bg-[#FFB347] rounded-full animate-ping" />
            <span className="hidden sm:inline">Devotional Ticker</span>
            <span className="sm:hidden">Live</span>
          </div>
          <div className="flex-1 text-center text-xs text-white font-medium tracking-wide italic select-none truncate">
            {LIVE_TICKERS[tickerIndex]}
          </div>
          <span className="text-[10px] text-white/45 font-mono hidden sm:inline shrink-0">Real-Time</span>
        </div>

        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="text-xs font-semibold text-[#5EEAD4]/80 tracking-wider font-mono uppercase">Sacred community giving</span>
          <h2 className="text-3xl font-serif font-black text-white tracking-tight mt-1">
            Seva Hub & Live Devotional Dashboard
          </h2>
          <p className="text-xs text-white/70 mt-2 leading-relaxed">
            Participate in active charity rituals — feed holy cows, distribute Annadanam meals, or light sacred Akhanda Diyas at renowned temples across India.
          </p>
          {/* Global 50% OFF banner */}
          <div className="inline-flex items-center gap-2 mt-3 bg-red-500/15 border border-red-400/30 text-red-300 text-xs font-bold px-4 py-1.5 rounded-full">
            <Tag className="w-3.5 h-3.5" />
            🎉 50% OFF on all Seva Sponsorships — Limited Period Offer
          </div>
        </div>

        {/* ── Main 2-column grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

          {/* LEFT: Sponsorship Services — col-span-7 */}
          <div className="lg:col-span-7 flex flex-col gap-4">

            {/* Heading row */}
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl font-bold text-white">Sponsorship Services</h3>
              <span className="text-[10px] font-mono text-red-300 uppercase tracking-wide bg-red-500/10 border border-red-400/20 px-2.5 py-1 rounded-full">
                50% OFF All Sevas
              </span>
            </div>

            {/* Always-visible: first 4 FEATURED_SEVAS in 2×2 grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FEATURED_SEVAS.slice(0, 4).map((seva) => (
                <SevaCard key={seva.id} seva={seva} onSponsor={handleSponsor} />
              ))}
            </div>

            {/* Accordion for remaining sevas */}
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
                      {FEATURED_SEVAS.slice(4).length + EXTRA_SEVAS.length} additional offerings — all 50% off
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[9px] font-mono text-red-300 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-400/20 hidden sm:inline">
                    50% OFF
                  </span>
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

          {/* RIGHT: Live Feed + Chat — col-span-5, sticky top */}
          <div className="lg:col-span-5 lg:sticky lg:top-20 mt-2 lg:mt-0">
            <div className="flex flex-col bg-[#092320] rounded-3xl border border-white/10 overflow-hidden shadow-md text-white min-h-[520px]">

              {/* Live Feed header */}
              <div className="px-4 pt-4 pb-2 flex items-center justify-between shrink-0">
                <h3 className="font-serif text-base font-bold text-white">Live Feed</h3>
                <div className="bg-red-500 text-white text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1 uppercase">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                  Live
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

              {/* Devotee Chat */}
              <div className="px-4 pb-4 flex flex-col flex-1 min-h-0">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3 shrink-0">
                  <span className="text-xs font-bold text-white/80">Prabhuji Prayer Chat Rooms</span>
                  <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    8,495 Devotees online
                  </div>
                </div>

                {/* Messages */}
                <div
                  id="chat-messages-container"
                  className="flex-1 overflow-y-auto space-y-2.5 mb-3 pr-1 text-left"
                  style={{ minHeight: "160px", maxHeight: "320px" }}
                >
                  {chatMessages.map((msg, i) => (
                    <div key={i} className="text-xs bg-white/5 p-2.5 rounded-2xl border border-white/10">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-[#5EEAD4]">{msg.name}</span>
                        <span className="text-[9px] text-white/40 font-mono">{msg.location}</span>
                      </div>
                      <p className="text-white/80">{msg.msg}</p>
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
      </div>

    </section>
  );
}
