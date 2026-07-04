/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Send, Sparkles, X, RefreshCw } from "lucide-react";
import { gaAIAssistantOpen } from "../utils/analytics";

interface AIAssistantProps {
  currentLanguage: string;
}

// ─── Margadarshak AI — local preset knowledge base ───────────────────────────
// The assistant answers from this curated set of devotional/spiritual
// questions instead of calling a remote AI endpoint, so it always responds
// instantly and never depends on a server-side secret key being configured.
interface PresetQA {
  keywords: string[];
  question: string;
  answer: string;
}

const PRESET_QA: PresetQA[] = [
  {
    keywords: ["founder", "kunu", "rana", "who started", "who made", "who created", "shradhalu"],
    question: "Who is the founder of Sri Dwar?",
    answer: "Sri Dwar was founded by visionary entrepreneur Kunu Rana, under the legal parent Shradhalu Private Limited. It is an AI-powered faith-tech platform built to preserve Vedic culture and make remote temple worship deeply meaningful. 🙏",
  },
  {
    keywords: ["book puja", "book a puja", "how to book", "puja booking", "sankalpa"],
    question: "How do I book a Puja?",
    answer: "You can book a Puja anytime using the 'Book a Puja' button on our homepage or the Online Puja page. Simply choose your ritual, share your Name and Gotra, and our trusted temple Acharyas will perform the Sankalpa on your behalf with live streaming coordinates shared afterward.",
  },
  {
    keywords: ["gotra", "don't know my gotra", "unknown gotra", "no gotra"],
    question: "What if I don't know my Gotra?",
    answer: "No concern at all! If you're unsure of your family's Gotra lineage, you may simply specify 'Shiva Gotra' or 'Kashyap Gotra' — both are considered universal ancestors in Vedic shastra and are fully spiritually compliant for any ritual.",
  },
  {
    keywords: ["live darshan", "live stream", "watch darshan", "aarti stream", "coordinates"],
    question: "How can I watch Live Darshan?",
    answer: "Once your Sankalpa is scheduled, you'll receive real-time Zoom, YouTube Live, or private network coordinates via WhatsApp/email. You can also view live ritual summaries directly in your Devotee Workspace, with a full recording archived for your family.",
  },
  {
    keywords: ["prasad", "receive prasad", "delivery time", "how long shipping", "when will i get"],
    question: "When will I receive my Prasad?",
    answer: "After your ritual is performed, priests sanctify the offerings, which are hermetically packed to preserve freshness and dispatched via express courier with live tracking. Prasad typically reaches your doorstep within 3–5 business days, anywhere in the world.",
  },
  {
    keywords: ["setu yatra", "challenge", "referral", "invite"],
    question: "What is the Setu Yatra Challenge?",
    answer: "The Setu Yatra Challenge invites devotees to add real, checkable entries — temples, puja committees, priests, or dharmic experts — to the Sri Dwar directory. Contributors help build India's trusted digital dharmic network. Look for the glowing 'Setu Yatra Challenge' button on our homepage to join!",
  },
  {
    keywords: ["darshan certificate", "certificate", "darshan register"],
    question: "How do I get a Darshan Certificate?",
    answer: "You can request your personalized, hand-signed Sri Dwar Darshan Certificate by filling in your name, the temple visited, and a few details in the Darshan Register form — available from the homepage and our footer. A high-resolution certificate is generated for you to download or print.",
  },
  {
    keywords: ["seva", "sponsor seva", "gau seva", "annadanam", "diya", "cow feeding"],
    question: "What kinds of Seva can I sponsor?",
    answer: "You can sponsor Annadanam (temple meal distribution), Gau Seva (holy cow feeding), Akhanda Diya (continuous lamp lighting), Vedic education support (Gurukul Dan), and more through our Seva Hub. Every sponsorship is documented with photos and updates.",
  },
  {
    keywords: ["cow", "gau seva timing", "wednesday", "thursday", "planetary"],
    question: "When is the best time to sponsor Gau Seva?",
    answer: "According to Vedic astrology, serving holy cows is especially auspicious on Wednesdays (Mercury), Thursdays (Jupiter), and Saturdays (Rahu/Ketu remedies). A monthly or annual Gau Seva sponsorship helps ensure continuous karmic peace.",
  },
  {
    keywords: ["cancel", "refund", "cancellation policy", "change my booking"],
    question: "What is your cancellation and refund policy?",
    answer: "Cancellations made more than 48 hours before your scheduled Sankalpa are eligible for a full refund or Sri Dwar wallet credit, processed within 5–7 business days. Cancellations within 48 hours may carry a partial priest-engagement fee, since temple time is reserved exclusively in your name.",
  },
  {
    keywords: ["astrology", "astrologer", "jyotish", "kundali", "horoscope"],
    question: "Can I consult a Vedic astrologer?",
    answer: "Yes! Sri Dwar connects you with experienced Jyotish experts for personalized horoscope readings, Kundali matching, and life guidance. You can explore our astrology consultations under Holistic Wellness on the Online Puja page.",
  },
  {
    keywords: ["register temple", "temple registration", "list my temple", "puja committee"],
    question: "How do I register my temple or puja committee?",
    answer: "Scroll to the 'Register Your Temple or Puja Committee' section on our homepage, search for your temple, and if it isn't listed, tap 'Register a New Temple / Puja Committee'. Registration is completely free and securely managed by Sridwar Technology.",
  },
  {
    keywords: ["dharmic expert", "register priest", "pandit", "purohit", "guru", "add a priest"],
    question: "How do I register a priest or dharmic expert?",
    answer: "Head to the 'Register a Dharmic Expert' section on our homepage. You can add pujaris, pandits, gurus, sants, sadhus, purohits, or other dharmic experts — with their consent — so devotees can discover and connect with them.",
  },
  {
    keywords: ["foreign", "international", "nri", "overseas", "abroad", "outside india"],
    question: "Can foreign or NRI devotees use Sri Dwar?",
    answer: "Absolutely. We support bookings from anywhere in the world. Sacred Prasad is cleared through customs-compliant export packaging and shipped internationally to North America, Europe, Southeast Asia, the Middle East, and beyond.",
  },
  {
    keywords: ["payment", "secure", "upi", "card", "safe to pay"],
    question: "Is payment on Sri Dwar secure?",
    answer: "Yes. All dakshina transactions are processed under Shradhalu Private Limited's strict legal audit compliance using standard secured payment gateways. We never store your credit card or bank login credentials on our servers.",
  },
  {
    keywords: ["choose priest", "specific priest", "pick a pandit", "select acharya"],
    question: "Can I choose a specific priest for my Puja?",
    answer: "Our chief senior Acharyas are assigned by default to ensure standard adherence. Devotees selecting Maha Puja tiers can request a specific pandit through the special-instructions field during the Book Now workflow.",
  },
  {
    keywords: ["annadanam pure", "vegetarian", "onion garlic", "temple food"],
    question: "Is the Annadanam food purely vegetarian?",
    answer: "Yes, absolutely. All Annadanam food is prepared exclusively inside official temple kitchens following strict cleanliness codes — no onion or garlic is ever used, only pure cow ghee, organic grains, and traditional Vedic recipes.",
  },
  {
    keywords: ["profile", "sacred profile", "devotee workspace", "family members", "account"],
    question: "What is 'My Sacred Profile'?",
    answer: "My Sacred Profile is your secure spiritual register in the Devotee Workspace. Save your Gotra, Rashi, and family details once, and they'll auto-fill in future bookings — you can even add up to 8 family members for quick, mistake-free Sankalpas.",
  },
  {
    keywords: ["contact", "support", "help", "reach you", "customer care"],
    question: "How can I contact Sri Dwar support?",
    answer: "You can reach our Devotee Care team through the Contact Us page, or via the WhatsApp and social links in our footer. We typically respond within a business day to help with bookings, Prasad tracking, or any other devotional query.",
  },
  {
    keywords: ["temple bazaar", "buy", "shop", "rudraksha", "idol", "store"],
    question: "What can I buy from the Temple Bazaar?",
    answer: "The Temple Bazaar offers vacuum-packed Prasad, Rudraksha malas, brass idols, dhoop, incense, home puja kits, and other sacred items — all sourced with care from trusted temple sources and shipped worldwide.",
  },
];

const suggestionPills = [
  "Who is the founder of Sri Dwar?",
  "How do I book a Puja?",
  "When will I receive my Prasad?",
  "What kinds of Seva can I sponsor?",
];

// ─── Simple keyword-overlap matcher ───────────────────────────────────────────
function findBestAnswer(userText: string): string {
  const normalized = userText.toLowerCase();
  let bestMatch: PresetQA | null = null;
  let bestScore = 0;

  for (const qa of PRESET_QA) {
    let score = 0;
    for (const kw of qa.keywords) {
      if (normalized.includes(kw)) score += kw.split(" ").length; // reward longer/more specific phrases
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = qa;
    }
  }

  if (bestMatch && bestScore > 0) {
    return bestMatch.answer;
  }

  return "Hari Om! 🙏 My guidance is currently limited to Sri Dwar's devotional services — Puja booking, Seva sponsorship, Live Darshan, Prasad delivery, Vedic astrology, and temple/priest registration. Could you try asking a related devotional question? For anything else, our Devotee Care team on the Contact Us page would love to help.";
}

export default function AIAssistant({ currentLanguage }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "model"; text: string }>>([
    { role: "model", text: "Hari Om! 🙏 Welcome to Sri Dwar. I am your 'Dharmic Margadarshak' AI assistant. Ask me questions about Puja bookings, Seva sponsorship, Live Darshan, Prasad delivery, Vedic astrology, or the foundational vision of Kunu Rana!" }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (userText: string) => {
    if (!userText.trim() || isLoading) return;

    const updatedMessages = [...messages, { role: "user" as const, text: userText }];
    setMessages(updatedMessages);
    setInputText("");
    setIsLoading(true);

    // Answer instantly from the local devotional knowledge base — a brief
    // delay keeps the "thinking" indicator feeling natural rather than jarring.
    const replyText = findBestAnswer(userText);
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "model" as const, text: replyText }]);
      setIsLoading(false);
    }, 450);
  };

  return (
    <>
      {/* Floating Sparkly circular button at bottom right corner */}
      <button
        id="ai-floating-trigger"
        onClick={() => { if (!isOpen) gaAIAssistantOpen(); setIsOpen(!isOpen); }}
        className="fixed bottom-6 right-6 z-40 bg-[#092320]/95 backdrop-blur border border-white/20 text-[#5EEAD4] p-4 rounded-full shadow-2xl hover:bg-neutral-900 focus:outline-none transition-transform hover:scale-110 flex items-center justify-center cursor-pointer group"
        style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
        title="Consult AI Margadarshak Guide"
      >
        <Sparkles className="w-5 h-5 text-[#FFB347] animate-pulse group-hover:rotate-12 transition-transform" />
        <span className="hidden group-hover:inline-block ml-1.5 text-xs font-mono font-bold uppercase tracking-wider pr-1">Consult AI Guide</span>
      </button>

      {/* Floating chat card overlay */}
      {isOpen && (
        <div
          id="ai-chat-panel"
          className="fixed bottom-24 right-6 z-40 w-92 max-w-[calc(100vw-32px)] bg-[#092320]/95 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl flex flex-col justify-between overflow-hidden animate-slideUp text-left text-xs text-white"
          style={{ bottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}
        >
          {/* Chat Header */}
          <div className="bg-[#021816]/95 text-white p-4 pb-3 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-[#FFB347] fill-[#FFB347] animate-spin duration-3000" />
              <div>
                <h4 className="font-serif text-sm font-bold tracking-tight">Margadarshak AI</h4>
                <div className="flex items-center space-x-1 text-[9px] text-[#5EEAD4] opacity-90 font-mono uppercase font-bold">
                  <span className="w-1.5 h-1.5 bg-[#5EEAD4] rounded-full animate-ping" />
                  <span>Sri Dwar Spiritual Guide</span>
                </div>
              </div>
            </div>
            <button
              id="close-ai-chat"
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-[#FFB347] p-1 bg-white/10 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Conversation Area */}
          <div className="p-4 flex-grow max-h-[300px] overflow-y-auto space-y-3 bg-[#021816]/90" id="ai-messages-scroller">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fadeIn`}
              >
                <div
                  className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#FFB347] text-[#021816] rounded-tr-none font-sans font-bold text-right"
                      : "bg-[#092320]/90 text-white border border-white/10 rounded-tl-none font-sans text-left"
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 p-3 rounded-2xl rounded-tl-none text-white/50 font-mono text-[10px] space-x-1 flex items-center">
                  <RefreshCw className="w-3 h-3 animate-spin text-[#5EEAD4]" />
                  <span>Chanting mantras for cosmic replies...</span>
                </div>
              </div>
            )}
          </div>

          {/* Suggestions Tray */}
          <div className="px-4 py-2 border-t border-white/5 bg-[#092320]">
            <span className="block text-[9px] text-white/40 font-mono uppercase mb-1">Quick suggestions:</span>
            <div className="flex flex-wrap gap-1.5">
              {suggestionPills.map((pill, idx) => (
                <button
                  key={idx}
                  id={`ai-suggestion-pill-${idx}`}
                  onClick={() => handleSendMessage(pill)}
                  className="bg-white/5 hover:bg-[#5EEAD4]/10 hover:text-[#5EEAD4] text-[10px] text-white/80 px-2.5 py-1 rounded-full border border-white/10 text-left transition-all font-medium"
                >
                  {pill}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Form Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputText);
            }}
            className="flex items-center space-x-2 p-3 bg-[#021816] border-t border-white/10"
          >
            <input
              id="ai-input-box"
              type="text"
              placeholder="Ask Margadarshak anything..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-grow text-xs px-3 py-2 rounded-xl border border-white/10 bg-[#092320] text-white focus:outline-none focus:border-[#5EEAD4] placeholder-white/30 text-left"
            />
            <button
              id="send-ai-message"
              type="submit"
              className="bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] p-2 rounded-xl transition-all shadow"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
