/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from "react";
import { FEATURED_SEVAS } from "../data/spiritualData";
import { Heart, Users, MessageSquare, Send, Sparkles, AlertCircle, RefreshCw, Utensils, Flame, BookOpen } from "lucide-react";
import SacredIcon from "./SacredIcon";
import UPIPaymentModal from "./UPIPaymentModal";
import { getDiscountedPrice, isDiscountActive, DISCOUNT_DEADLINE_LABEL } from "../utils/discount";

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
    default:
      return <Sparkles className="w-4 h-4 text-yellow-400" />;
  }
};

interface SevaExperienceProps {
  onSponsorSeva: (sevaName: string, price: number) => void;
}

export default function SevaExperience({ onSponsorSeva }: SevaExperienceProps) {
  const [chatMessages, setChatMessages] = useState<Array<{ name: string; msg: string; location: string }>>([
    { name: "Ananya Misra", msg: "Har Har Mahadev! Booked Rudrabhishek for my parents' anniversary.", location: "Bhubaneswar, Odisha" },
    { name: "Rajesh K.", msg: "Chanting Sri Ram Jai Ram. Sponsored cow feeding at Varanasi.", location: "San Jose, CA" },
    { name: "Preeti Goyal", msg: "So peaceful to watch the Mahapuja happening live at Badrinath.", location: "London, UK" }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [showUPI, setShowUPI] = useState(false);
  const [upiAmount, setUpiAmount] = useState(0);
  const [upiSevaName, setUpiSevaName] = useState("");
  const [upiRefId, setUpiRefId] = useState("");
  const [tickerIndex, setTickerIndex] = useState(0);

  // Global scrolling bookings simulated live ticker
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

    // Simulate priest/devotee auto response sometimes for realism
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
    <section id="seva-dashboard-section" className="py-20 bg-[#021816] relative text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Global Live Ticker Bar */}
        <div id="booking-ticker-bar" className="bg-[#FFB347]/10 border border-[#FFB347]/30 py-3 rounded-2xl mb-12 flex items-center justify-between px-6 overflow-hidden">
          <div className="flex items-center space-x-2 text-[#FFB347] uppercase tracking-widest font-mono text-[10px] font-bold shrink-0 text-left">
            <span className="w-2.5 h-2.5 bg-[#FFB347] rounded-full animate-ping" />
            <span>Devotional Ticker</span>
          </div>
          <div className="w-full text-center text-xs text-white font-medium tracking-wide italic select-none">
            {liveTickers[tickerIndex]}
          </div>
          <span className="text-[10px] text-white/45 font-mono hidden sm:inline shrink-0">Updated Real-Time</span>
        </div>

        {/* Header Block */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold text-[#5EEAD4]/80 tracking-wider font-mono">Sacred community giving</span>
          <h2 className="text-3xl font-serif font-black text-white tracking-tight mt-1">
            Seva Hub & Live Devotional Dashboard
          </h2>
          <p className="text-xs text-white/70 mt-2">
            Participate in active charity rituals like feeding holy cows, distributing hot meals (Annadanam), or lighting sacred Akhanda Diyas.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Active Seva Sponsorships List (cols 7) */}
          <div className="lg:col-span-7 space-y-6">
            <h3 className="font-serif text-xl font-bold text-white text-left mb-2">Sponsorship Services</h3>
            {isDiscountActive() && (
              <p className="text-[10px] font-mono text-[#FFB347]/80 text-left -mt-1 mb-2 uppercase tracking-wide">
                🎉 50% OFF all sevas — {DISCOUNT_DEADLINE_LABEL}
              </p>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FEATURED_SEVAS.map((seva) => (
                <div
                  key={seva.id}
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
                    onClick={() => {
                      setUpiSevaName(seva.name);
                      setUpiAmount(getDiscountedPrice(seva.donationTiers[0].amount));
                      setUpiRefId("SDV-" + Math.floor(100000 + Math.random() * 900000));
                      setShowUPI(true);
                    }}
                    className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold py-2.5 rounded-xl text-xs tracking-wider transition-all shadow"
                  >
                    {isDiscountActive() ? `SPONSOR SEVA — 50% OFF 🙏` : "SPONSOR SEVA 🙏"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Live Virtual Video + Live Devotee Chat Dashboard Area (cols 5) */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-[#092320] rounded-3xl border border-white/10 overflow-hidden shadow-md text-white">
            
            {/* Live Video placeholder with Live blinking dot overlay */}
            <div className="relative aspect-video bg-[#021816] overflow-hidden flex items-center justify-center">
              <img
                src="https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&q=80&w=1000"
                alt="Ayodhya Gausala Aerial View"
                className="absolute inset-0 w-full h-full object-cover opacity-75"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#092320]/95 via-[#092320]/45 to-transparent" />
              
              <div className="absolute top-4 left-4 bg-red-500 text-white text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full flex items-center space-x-1 uppercase z-10">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                <span>Live Feed</span>
              </div>

              <div className="absolute bottom-4 left-4 text-left text-white z-10">
                <h4 className="font-serif text-sm font-bold">Ayodhya Gausala Seva Ritual</h4>
                <p className="text-[10px] opacity-80">Serving organic feeds to 108 indigenous Gir cows.</p>
              </div>
            </div>

            {/* Interactive Chat Console */}
            <div className="p-4 flex-grow flex flex-col justify-between min-h-[280px]">
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                  <span className="text-xs font-bold text-white/80">Prabhuji prayer Chat Rooms</span>
                  <div className="flex items-center space-x-1 text-[10px] font-mono text-emerald-400 font-bold">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span>8,495 Devotees online</span>
                  </div>
                </div>

                {/* Messages Box */}
                <div 
                  id="chat-messages-container"
                  className="space-y-2.5 max-h-[180px] overflow-y-auto mb-4 pr-1 scrollbar-thin text-left"
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
              </div>

              {/* Chat Send Form */}
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input
                  id="chat-input-box"
                  type="text"
                  placeholder="Offer your prayers or type a mantra..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-grow text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white placeholder-white/40 text-left"
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
      {/* UPI Payment Modal for Seva Sponsorship */}
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
