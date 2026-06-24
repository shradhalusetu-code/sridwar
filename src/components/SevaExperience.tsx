/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from "react";
import { FEATURED_SEVAS } from "../data/spiritualData";
import { Heart, Send, Sparkles, Utensils, Flame, BookOpen, ChevronDown, ChevronUp, Droplets, Star, Sun, Moon } from "lucide-react";
import UPIPaymentModal from "./UPIPaymentModal";
import { getDiscountedPrice, isDiscountActive, DISCOUNT_DEADLINE_LABEL } from "../utils/discount";

// ─── 6 additional seva offerings (accordion extras) ───────────────────────────
const EXTRA_SEVAS = [
  {
    id: "seva-rudrabhishek",
    name: "Rudrabhishek Puja",
    significance: "Sacred abhishek of Shivalinga with Panchamrit, Gangajal & bilva leaves with Vedic Rudra chanting by qualified pandits.",
    impactStat: "Performed at Kashi Vishwanath & Lingaraj Mandir, Bhubaneswar",
    templeAssociation: "Kashi Vishwanath",
    donationTiers: [{ amount: 1100 }],
    imageUrl: null,
    icon: "rudrabhishek",
  },
  {
    id: "seva-mahaprasad",
    name: "Mahaprasad Distribution",
    significance: "Sponsor distribution of sacred Chhappan Bhog Mahaprasad to pilgrims and underprivileged devotees at temple premises.",
    impactStat: "Feeds 200+ devotees per sponsorship at Jagannath Puri",
    templeAssociation: "Jagannath Puri",
    donationTiers: [{ amount: 2100 }],
    imageUrl: null,
    icon: "mahaprasad",
  },
  {
    id: "seva-tulsi-vivah",
    name: "Tulsi Vivah Seva",
    significance: "Sacred marriage ceremony of Tulsi plant with Lord Vishnu — an auspicious ritual that removes dosha and blesses families.",
    impactStat: "Conducted during Kartik Maas at Vrindavan & Dwarka temples",
    templeAssociation: "Vrindavan Dham",
    donationTiers: [{ amount: 551 }],
    imageUrl: null,
    icon: "tulsi",
  },
  {
    id: "seva-navagraha",
    name: "Navagraha Shanti Homa",
    significance: "Nine-planet pacification homa to remove planetary doshas, improve fortune, health and career using specific samidha and herbal offerings.",
    impactStat: "Performed by Jyotish-trained Acharyas at Ujjain Mahakaleshwar",
    templeAssociation: "Mahakaleshwar, Ujjain",
    donationTiers: [{ amount: 3100 }],
    imageUrl: null,
    icon: "navagraha",
  },
  {
    id: "seva-akhand-path",
    name: "Akhand Ramayan Path",
    significance: "Uninterrupted 24-hour recitation of the complete Valmiki Ramayana by a team of trained pandits to bring peace and blessings.",
    impactStat: "Organised at Ram Janmabhoomi, Ayodhya for devotee sankalpa",
    templeAssociation: "Ram Janmabhoomi, Ayodhya",
    donationTiers: [{ amount: 5100 }],
    imageUrl: null,
    icon: "path",
  },
  {
    id: "seva-gomata-puja",
    name: "Gomata Puja & Feeding",
    significance: "Ceremonial worship and feeding of sacred desi cows with tulsi, jaggery and sesame — performed on your behalf with photo proof.",
    impactStat: "Done at certified Gaushalas in Mathura & Vrindavan",
    templeAssociation: "Mathura Gaushala",
    donationTiers: [{ amount: 750 }],
    imageUrl: null,
    icon: "gomata",
  },
];

const renderSevaIcon = (id: string) => {
  switch (id) {
    case "seva-annadanam":
      return <Utensils className="w-4 h-4 text-[#FFB347]" />;
    case "seva-cow":
      return <Heart className="w-4 h-4 text-emerald-400" fill="currentColor" />;
    case "seva-diya":
      return <Flame className="w-4 h-4 text-orange-500 animate-pulse" fill="currentColor" />;
    case "seva-gurukul":
      return <BookOpen className="w-4 h-4 text-cyan-400" />;
    case "seva-rudrabhishek":
      return <Droplets className="w-4 h-4 text-blue-400" />;
    case "seva-mahaprasad":
      return <Star className="w-4 h-4 text-yellow-300" />;
    case "seva-tulsi-vivah":
      return <Sun className="w-4 h-4 text-green-400" />;
    case "seva-navagraha":
      return <Moon className="w-4 h-4 text-violet-400" />;
    case "seva-akhand-path":
      return <BookOpen className="w-4 h-4 text-orange-300" />;
    case "seva-gomata-puja":
      return <Heart className="w-4 h-4 text-pink-400" fill="currentColor" />;
    default:
      return <Sparkles className="w-4 h-4 text-yellow-400" />;
  }
};

interface SevaExperienceProps {
  onSponsorSeva: (sevaName: string, price: number) => void;
}

const INITIAL_CHAT_MESSAGES = [
  { name: "Ananya Misra", msg: "Har Har Mahadev! Booked Rudrabhishek for my parents' anniversary.", location: "Bhubaneswar, Odisha" },
  { name: "Rajesh K.", msg: "Chanting Sri Ram Jai Ram. Sponsored cow feeding at Varanasi.", location: "San Jose, CA" },
  { name: "Preeti Goyal", msg: "So peaceful to watch the Mahapuja happening live at Badrinath.", location: "London, UK" },
  { name: "Dr. Amit Varma", msg: "Sponsored Ayodhya Gausala seva from Chicago — verified photos received within hours!", location: "Chicago, USA" },
  { name: "Sandeep Patnaik", msg: "Chhappan Bhog at Puri on my daughter's birthday. Live stream was divine.", location: "Cuttack, Odisha" },
  { name: "Meera Nair", msg: "Gifted Sanskrit Gurukul book kits — children holding stamped kits in the photos!", location: "Ernakulam, Kerala" },
  { name: "Vikram Aditya", msg: "Shani Taila Abhishekam live audio was pristine. Sacred thread arrived sealed.", location: "Mumbai, MH" },
  { name: "Rohan Sharma", msg: "Kashi Rudrabhishek Sankalpa with father's gotra brought immense peace to our family.", location: "New Delhi" },
  { name: "Rajeshwari D.", msg: "Maa Kamakhya Archana — priest reciting my Gotra over the spring was deeply moving.", location: "Pune, MH" },
  { name: "Swati Sen", msg: "Om Namah Shivaya 🙏 Lighting Akhanda Diya for my mother's health.", location: "Kolkata, WB" },
  { name: "Srinivas Rao", msg: "Jai Jagannath! Puri Vishesh Seva booked — certificate on WhatsApp within 24 hrs.", location: "Hyderabad, TS" },
  { name: "Preeya Patel", msg: "Annadanam sponsorship at Kashi — may all sadhus be fed today.", location: "London, UK" },
];

// Reusable seva card component
function SevaCard({
  seva,
  onSponsor,
}: {
  seva: { id: string; name: string; significance: string; impactStat: string; templeAssociation: string; donationTiers: { amount: number }[]; imageUrl?: string | null };
  onSponsor: (name: string, amount: number) => void;
}) {
  return (
    <div
      id={`seva-card-${seva.id}`}
      className="bg-[#092320] p-5 rounded-3xl border border-white/10 text-left hover:shadow-lg hover:border-[#5EEAD4]/20 transition-all flex flex-col justify-between text-white"
    >
      <div>
        {seva.imageUrl && (
          <div className="w-full h-32 rounded-2xl overflow-hidden mb-4 border border-white/5 relative">
            <img
              src={seva.imageUrl}
              alt={seva.name}
              className="w-full h-full object-cover select-none filter brightness-95"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#021816]/90 to-transparent p-2">
              <span className="text-[9px] font-mono font-bold text-teal-300 bg-black/40 px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-xs">
                {seva.templeAssociation}
              </span>
            </div>
          </div>
        )}

        {!seva.imageUrl && (
          <div className="w-full h-20 rounded-2xl mb-4 border border-white/5 bg-gradient-to-br from-[#0D2F2B] to-[#021816] flex items-center justify-between px-4">
            <span className="text-[9px] font-mono font-bold text-teal-300 uppercase tracking-wider">
              {seva.templeAssociation}
            </span>
            <div className="p-2 rounded-xl bg-white/5 border border-white/10">
              {renderSevaIcon(seva.id)}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-white/5 border border-white/15 flex items-center justify-center">
              {renderSevaIcon(seva.id)}
            </div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-white/50">Active Seva</span>
          </div>
          {isDiscountActive() ? (
            <div className="flex flex-col items-end">
              <span className="text-[9px] line-through text-white/35 font-mono">₹{seva.donationTiers[0].amount}</span>
              <span className="text-xs font-bold text-[#FFB347] font-serif">₹{getDiscountedPrice(seva.donationTiers[0].amount)}</span>
            </div>
          ) : (
            <span className="text-xs font-bold text-[#FFB347] font-serif">₹{seva.donationTiers[0].amount}</span>
          )}
        </div>

        <h4 className="text-base font-serif font-bold text-white mb-1">{seva.name}</h4>
        <p className="text-[11px] text-white/70 min-h-[44px] leading-relaxed mb-4">
          {seva.significance}
        </p>

        <div className="text-[10px] text-[#5EEAD4] bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10 mb-4">
          <strong className="text-[#FFB347]">Impact Area:</strong> {seva.impactStat}
        </div>
      </div>

      <button
        id={`sponsor-btn-${seva.id}`}
        onClick={() => onSponsor(seva.name, getDiscountedPrice(seva.donationTiers[0].amount))}
        className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold py-2.5 rounded-xl text-xs tracking-wider transition-all shadow"
      >
        {isDiscountActive() ? `SPONSOR SEVA — 50% OFF 🙏` : "SPONSOR SEVA 🙏"}
      </button>
    </div>
  );
}

export default function SevaExperience({ onSponsorSeva }: SevaExperienceProps) {
  const [chatMessages, setChatMessages] = useState<Array<{ name: string; msg: string; location: string }>>(INITIAL_CHAT_MESSAGES);
  const [inputMessage, setInputMessage] = useState("");
  const [showUPI, setShowUPI] = useState(false);
  const [upiAmount, setUpiAmount] = useState(0);
  const [upiSevaName, setUpiSevaName] = useState("");
  const [upiRefId, setUpiRefId] = useState("");
  const [tickerIndex, setTickerIndex] = useState(0);
  const [accordionOpen, setAccordionOpen] = useState(false);

  const liveTickers = [
    "Anurag Sharma (San Francisco) sponsored Gau Seva 🐄",
    "Preeya Patel (London) sponsored Annadanam 🍚",
    "Vikramaditya (New Delhi) booked Lingaraj Abhishek 🔱",
    "Swati Sen (Kolkata) sponsored Akhanda Diya 🔥",
    "Srinivas Rao (Hyderabad) sponsored Mahaprasad Distribution 🍱",
    "Amit K. Rana (Seattle) booked Puri Jagannath Vishesh Seva 🐚"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % liveTickers.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const handleSponsor = (name: string, amount: number) => {
    setUpiSevaName(name);
    setUpiAmount(amount);
    setUpiRefId("SDV-" + Math.floor(100000 + Math.random() * 900000));
    setShowUPI(true);
  };

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMsg = {
      name: "You (Devotee)",
      msg: inputMessage.trim(),
      location: "Your Secure Mandala"
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setInputMessage("");

    setTimeout(() => {
      const reactions = [
        "Shubh Sankalpa! May your wishes be fulfilled by the Divine.",
        "Om Namah Shivaya. The puja vibrations are truly celestial.",
        "Jai Jagannath! Your name Gotra has been registered safely."
      ];
      const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
      setChatMessages((prev) => [
        ...prev,
        { name: "Pandit Shastri", msg: randomReaction, location: "Puri Shrinand Kendra" }
      ]);
    }, 2000);
  };

  return (
    <section id="seva-dashboard-section" className="py-16 bg-[#021816] relative text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Global Live Ticker Bar */}
        <div id="booking-ticker-bar" className="bg-[#FFB347]/10 border border-[#FFB347]/30 py-3 rounded-2xl mb-8 flex items-center justify-between px-4 sm:px-6 overflow-hidden gap-3">
          <div className="flex items-center space-x-2 text-[#FFB347] uppercase tracking-widest font-mono text-[10px] font-bold shrink-0">
            <span className="w-2.5 h-2.5 bg-[#FFB347] rounded-full animate-ping" />
            <span className="hidden sm:inline">Devotional Ticker</span>
            <span className="sm:hidden">Live</span>
          </div>
          <div className="flex-1 text-center text-xs text-white font-medium tracking-wide italic select-none truncate">
            {liveTickers[tickerIndex]}
          </div>
          <span className="text-[10px] text-white/45 font-mono hidden sm:inline shrink-0">Updated Real-Time</span>
        </div>

        {/* Header Block */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="text-xs font-semibold text-[#5EEAD4]/80 tracking-wider font-mono">Sacred community giving</span>
          <h2 className="text-3xl font-serif font-black text-white tracking-tight mt-1">
            Seva Hub & Live Devotional Dashboard
          </h2>
          <p className="text-xs text-white/70 mt-2">
            Participate in active charity rituals like feeding holy cows, distributing hot meals (Annadanam), or lighting sacred Akhanda Diyas.
          </p>
        </div>

        {/* Main 2-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

          {/* ── LEFT: Sponsorship Services (cols 7) ── */}
          <div className="lg:col-span-7">

            {/* Section heading */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif text-xl font-bold text-white">Sponsorship Services</h3>
              {isDiscountActive() && (
                <span className="text-[10px] font-mono text-[#FFB347]/90 uppercase tracking-wide bg-[#FFB347]/10 border border-[#FFB347]/20 px-2.5 py-1 rounded-full">
                  🎉 50% OFF — {DISCOUNT_DEADLINE_LABEL}
                </span>
              )}
            </div>

            {/* Always-visible 4 cards (2×2 grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {FEATURED_SEVAS.slice(0, 4).map((seva) => (
                <SevaCard key={seva.id} seva={seva} onSponsor={handleSponsor} />
              ))}
            </div>

            {/* Accordion: remaining FEATURED + all EXTRA sevas */}
            <div className="border border-white/10 rounded-2xl overflow-hidden">
              {/* Accordion toggle button */}
              <button
                onClick={() => setAccordionOpen((prev) => !prev)}
                className="w-full flex items-center justify-between px-5 py-4 bg-[#092320] hover:bg-[#0D2F2B] transition-colors text-left"
                aria-expanded={accordionOpen}
              >
                <div className="flex items-center space-x-3">
                  <Sparkles className="w-4 h-4 text-[#FFB347]" />
                  <div>
                    <span className="text-sm font-bold text-white font-serif">More Sacred Sevas</span>
                    <span className="block text-[10px] text-white/50 font-mono mt-0.5">
                      {FEATURED_SEVAS.slice(4).length + EXTRA_SEVAS.length} additional offerings available
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {isDiscountActive() && (
                    <span className="text-[9px] font-mono text-[#FFB347] bg-[#FFB347]/10 px-2 py-0.5 rounded-full border border-[#FFB347]/20 hidden sm:inline">
                      50% OFF
                    </span>
                  )}
                  <div className="p-1.5 rounded-lg bg-white/5 border border-white/10">
                    {accordionOpen
                      ? <ChevronUp className="w-4 h-4 text-[#5EEAD4]" />
                      : <ChevronDown className="w-4 h-4 text-[#5EEAD4]" />
                    }
                  </div>
                </div>
              </button>

              {/* Accordion body */}
              {accordionOpen && (
                <div className="bg-[#021816] p-4 border-t border-white/10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Remaining FEATURED_SEVAS beyond the first 4 */}
                    {FEATURED_SEVAS.slice(4).map((seva) => (
                      <SevaCard key={seva.id} seva={seva} onSponsor={handleSponsor} />
                    ))}
                    {/* All 6 EXTRA_SEVAS */}
                    {EXTRA_SEVAS.map((seva) => (
                      <SevaCard key={seva.id} seva={seva as any} onSponsor={handleSponsor} />
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* ── RIGHT: Live Feed + Devotee Chat (cols 5) ── */}
          <div className="lg:col-span-5 flex flex-col bg-[#092320] rounded-3xl border border-white/10 overflow-hidden shadow-md text-white">

            {/* Live Feed label */}
            <div className="px-4 pt-4 pb-2 flex items-center justify-between shrink-0">
              <h3 className="font-serif text-base font-bold text-white">Live Feed</h3>
              <div className="bg-red-500 text-white text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full flex items-center space-x-1 uppercase">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                <span>Live</span>
              </div>
            </div>

            {/* Live video placeholder — no external image */}
            <div className="relative mx-4 mb-4 rounded-2xl overflow-hidden shrink-0" style={{ aspectRatio: "16/9" }}>
              <div className="absolute inset-0 bg-gradient-to-br from-[#0D2F2B] via-[#051F1C] to-[#021816] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-[#FFB347]/20 border border-[#FFB347]/30 flex items-center justify-center">
                    <Flame className="w-6 h-6 text-[#FFB347] animate-pulse" fill="currentColor" />
                  </div>
                  <p className="text-[10px] text-white/60 font-mono">Live stream loading...</p>
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#092320]/95 to-transparent p-3">
                <h4 className="font-serif text-sm font-bold text-white">Ayodhya Gausala Seva Ritual</h4>
                <p className="text-[10px] text-white/70 mt-0.5">Serving organic feeds to 108 indigenous Gir cows.</p>
              </div>
            </div>

            {/* Interactive Devotee Chat */}
            <div className="px-4 pb-4 flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3 shrink-0">
                <span className="text-xs font-bold text-white/80">Prabhuji Prayer Chat Rooms</span>
                <div className="flex items-center space-x-1 text-[10px] font-mono text-emerald-400 font-bold">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span>8,495 Devotees online</span>
                </div>
              </div>

              {/* Messages box */}
              <div
                id="chat-messages-container"
                className="flex-1 min-h-[200px] max-h-[280px] lg:max-h-[340px] overflow-y-auto space-y-2.5 mb-3 pr-1 scrollbar-thin text-left"
              >
                {chatMessages.map((msg, i) => (
                  <div key={i} className="text-xs bg-white/5 p-2.5 rounded-2xl border border-white/10">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-[#5EEAD4]">{msg.name}</span>
                      <span className="text-[9px] text-white/40 font-mono font-medium">{msg.location}</span>
                    </div>
                    <p className="text-white/80 font-sans">{msg.msg}</p>
                  </div>
                ))}
              </div>

              {/* Chat input */}
              <form onSubmit={handleSendMessage} className="flex space-x-2 shrink-0">
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

      {/* UPI Payment Modal */}
      <UPIPaymentModal
        isOpen={showUPI}
        onClose={() => setShowUPI(false)}
        onPaymentConfirmed={() => {
          setShowUPI(false);
          onSponsorSeva(upiSevaName, upiAmount);
        }}
        amount={upiAmount}
        bookingName={upiSevaName}
        devoteeName="Devotee"
        refId={upiRefId}
      />
    </section>
  );
}
