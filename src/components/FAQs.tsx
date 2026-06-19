/*
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.5
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HelpCircle, ChevronDown, ChevronUp, Search, Info, HelpCircleIcon } from "lucide-react";

interface FAQItem {
  id: string;
  category: "Rituals" | "Prasad" | "Platform" | "Account";
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: "faq-1",
    category: "Rituals",
    question: "How do you perform Pujas individually in my name and Gotra?",
    answer: "Every Puja booked on Sri Dwar is a strictly personalized ceremony. We collect your birth coordinate details—such as Devotee Name, Gotra ancestry, and Vedic Rashi—during booking. The certified temple Acharyas and chief priests voice your unique Sankalpa aloud inside the temple sanctorum, invoking celestial blessings specifically on your behalf."
  },
  {
    id: "faq-2",
    category: "Prasad",
    question: "How and when will I receive the sacred Prasad and consecrated items?",
    answer: "Following the successful performance of your ritual, the temple priests sanctify the offerings. The high-grade Dry Fruits, sacred Kumkum, energized threads, and temple-certified Prasad are packaged in specialized hermetic food-grade pouches to prevent degradation. It is dispatched via express courier with live tracking, reaching your doorstep within 3-5 business days."
  },
  {
    id: "faq-3",
    category: "Platform",
    question: "How do I view the virtual Live Darshan coordinating stream?",
    answer: "Once your Sankalpa is scheduled, you will receive real-time updates containing your specific Zoom, YouTube Live, or private network coordinates. You can also view live ritual summaries directly in your Spiritual Console or Devotee Workspace. A full recorded archive is made permanently accessible for family review."
  },
  {
    id: "faq-4",
    category: "Rituals",
    question: "What if I do not know my specific Gotra lineage?",
    answer: "If you are unsure of your family's Gotra ancestry, you may specify 'Shiva Gotra' or 'Kashyap Gotra'. In ancient Vedic shastras, Rishi Kashyap and Lord Shiva are regarded as the universal ancestors of all living souls, making this dynamic option fully spiritually compliant and universally blessed."
  },
  {
    id: "faq-5",
    category: "Platform",
    question: "Is Sri Dwar officially affiliated with the listed temples?",
    answer: "Yes. Sri Dwar is a premium faith-tech platform operated under official service level agreements and legal partnerships with validated temple trusts, apex dharmic authorities, and managing pandas. All actions, dakshinas, and logistics are registered securely under the corporate governance of Shradhalu Private Ltd."
  },
  {
    id: "faq-6",
    category: "Account",
    question: "What is 'My Sacred Profile' and how does it assist my bookings?",
    answer: "The 'My Sacred Profile' section in your Devotee Workspace serves as your secure spiritual register. By saving your phone number, Gotra lineage, Moon Sign Rashi, and family details once, they are auto-populated in a single click during any future puja or seva bookings, ensuring mistake-free Sankalpas."
  },
  {
    id: "faq-7",
    category: "Rituals",
    question: "Can I book a Puja for someone else, like parents or children?",
    answer: "Absolutely. During the booking checkout, you can specify if the ceremony is on behalf of family members. You can input their names, Gotras, and Nakshatras. Our priests will formulate the custom Sankalpa specifically targeting blessings for their well-being, health, or career alignment."
  },
  {
    id: "faq-8",
    category: "Prasad",
    question: "What should I do with the dry Prasad once it arrives at my residence?",
    answer: "Prasad is highly consecrated and should be handled with respect. We recommend consuming the dry sweets or fruits on an empty stomach after bathing. The sacred red threads (Raksha Sutras) should be tied around the right wrist for men and left wrist for women to invite continuous divine shields of protection."
  },
  {
    id: "faq-9",
    category: "Platform",
    question: "How can I verify the authenticity of high-tech live telecasts?",
    answer: "Every streaming link is custom emitted from our direct on-site representative or registered sevayats. To preserve absolute authenticity, the temple panda will clearly call out your registered name, Gotra, and city right in front of the deity prior to beginning the main chants, which will be visible in the live stream or high-definition recording."
  },
  {
    id: "faq-10",
    category: "Rituals",
    question: "What is the spiritual significance of utilizing continuous Akhanda Diya?",
    answer: "An Akhanda Diya represents steady, unceasing spiritual consciousness. Unlike regular lamps, it is never allowed to go out, creating a vortex of positive energy that purifies familial karma, attracts the gaze of divine entities, and creates protective shields for the house."
  },
  {
    id: "faq-11",
    category: "Platform",
    question: "What happens if a ritual cannot be performed on the scheduled tithi due to temple festivals?",
    answer: "Vedic calendars are fluid and sometimes high temple festivals prompt sudden restrictional changes. In such extraordinary cases, your selected ritual is prioritized for the immediately following auspicious day. You are notified securely via WhatsApp and the Devotee Console with revised schedule timings."
  },
  {
    id: "faq-12",
    category: "Account",
    question: "Can I register multiple family members under a single Devotee Profile?",
    answer: "Yes, our 'My Sacred Profile' registry allows you to add up to 8 family members. You can store unique individual Gotras, Rashi, Nakshatras, and relationship markers, allowing you to select different family members instantly for personalized Pujas without re-typing."
  },
  {
    id: "faq-13",
    category: "Rituals",
    question: "How does the 'Vedic Education Support (Gurukul Dan)' operate?",
    answer: "Gurukul Dan directly funds ancient Vedic schools training young brahmacharins under the offline Guru-Shishya tradition. Your sponsorship supports their food, residency, clothing (dhoti), and textbook supplies. The students recite specific blessing mantras mentioning your family lineage daily."
  },
  {
    id: "faq-14",
    category: "Prasad",
    question: "Do you ship sanctified water, like Ganga Jal or spring waters?",
    answer: "Yes. For specific holy shrines (such as Maa Kamakhya's water spring Peetha or Dashashwamedh Ganga Ghat), a hermetically sealed copper or premium plastic vial containing the authentic, filtered holy water is securely bundled into your sacred Prasad kit."
  },
  {
    id: "faq-15",
    category: "Platform",
    question: "How are payments handled under Shradhalu Private Ltd?",
    answer: "All online dakshina transactions are secured using standard payment gateway mechanisms and processed under Shradhalu Private Limited's strict legal audit compliance. We do not store credit card or bank login credentials on our servers."
  },
  {
    id: "faq-16",
    category: "Rituals",
    question: "Can I choose a specific priest to perform my puja?",
    answer: "While we assign our chief verified Acharyas from our temple boards by default to ensure standard adherence, devotees selecting the 'Maha Puja' tiers can request specific specialized pandits through the special instruction input during the Book Now workflow."
  },
  {
    id: "faq-17",
    category: "Prasad",
    question: "Is the food prepared for Annadanam completely pure vegetarian?",
    answer: "Yes, absolutely. The food is cooked exclusively inside the official temple kitchens (bhoga-ghara or bhandara) following rigorous cleanliness codes. No onions or garlic are ever used, utilizing pure cow ghee, organic seasonal grains, and pristine Vedic recipes."
  },
  {
    id: "faq-18",
    category: "Rituals",
    question: "How often should I sponsor a Gau Seva for optimal planetary peace?",
    answer: "According to Vedic Astrology, serving holy cows on Wednesdays (for Mercury), Thursdays (for Jupiter), and Saturdays (for Rahu/Ketu remedies) is highly auspicious. Sponsoring a monthly or annual Gau Seva ensures continuous karmic mitigation and home peace."
  },
  {
    id: "faq-19",
    category: "Platform",
    question: "Can foreign devotees (non-residents of India) utilize Sri Dwar's services?",
    answer: "Yes. We support overseas bookings from around the globe. Sacred Prasads are cleared through custom export packaging regulations and shipped internationally to regions such as North America, Europe, Southeast Asia, and the Middle East."
  },
  {
    id: "faq-20",
    category: "Account",
    question: "What security measures are in place to protect my personal Gotra and birth coordinates?",
    answer: "All personal details, including birth stars, family names, and contact credentials, are encrypted using state-of-the-art secure socket layouts. We do not monetize or publish any devotee coordinate details externally, maintaining highest respect for spiritual privacy."
  },
  {
    id: "faq-21",
    category: "Rituals",
    question: "What is Chandi Archana and when is it recommended?",
    answer: "Chandi Archana is a potent ritual dedicated to Goddess Durga (Maa Chandi) to eliminate enemy blockages, long-standing courtroom hurdles, and physical fears. It is highly recommended during Navratris, Ashtamis, or periods when Mars or Saturn are causing heavy planetary friction."
  }
];

export default function FAQs() {
  const [openId, setOpenId] = useState<string | null>("faq-1");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const toggleAccordion = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  const categories = ["All", "Rituals", "Prasad", "Platform", "Account"];

  const filteredFAQs = FAQ_DATA.filter((item) => {
    const matchesSearch = 
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <section 
      id="faq-accordion-section" 
      className="py-16 bg-[#021816]/95 border-t border-white/15 relative z-10 text-left"
    >
      {/* Decorative background visual elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FFB347]/5 rounded-full blur-[120px] pointer-events-none -translate-x-1/2" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#5EEAD4]/5 rounded-full blur-[120px] pointer-events-none translate-x-1/2" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Block */}
        <div className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center space-x-2 bg-white/5 border border-[#5EEAD4]/20 px-3 py-1 rounded-full text-[#5EEAD4] text-xs font-semibold uppercase tracking-widest">
            <HelpCircle className="w-3.5 h-3.5 text-[#FFB347]" />
            <span>Spiritual Inquiries</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-white leading-tight">
            Frequently Asked Questions
          </h2>
          
          <p className="text-sm text-white/75 font-sans max-w-xl mx-auto leading-relaxed">
            Unraveling the deep Vedic guidelines, logistical transparency, and secure certified devotions provided by Sri Dwar's premium network.
          </p>
        </div>

        {/* Categories & Search Grid */}
        <div className="bg-[#092320] border border-white/10 rounded-2xl p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Category Chips */}
          <div className="flex flex-wrap gap-2 justify-center md:justify-start w-full md:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer border ${
                  activeCategory === cat
                    ? "bg-[#FFB347] text-[#021816] border-[#FFB347]"
                    : "bg-[#021816]/50 text-white/70 border-white/5 hover:text-white hover:border-white/25"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search bar inside */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ritual topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#021816] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-white/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] font-medium"
            />
          </div>
        </div>

        {/* Collapsible Accordion entries */}
        <div id="faq-list-container" className="space-y-3.5">
          {filteredFAQs.length > 0 ? (
            filteredFAQs.map((faq) => {
              const isOpen = openId === faq.id;
              return (
                <div 
                  key={faq.id}
                  id={`accordion-item-${faq.id}`}
                  className={`bg-[#092320]/80 rounded-2xl border transition-all overflow-hidden ${
                    isOpen 
                      ? "border-[#FFB347] shadow-[0_0_15px_rgba(255,179,71,0.08)] bg-[#092421]" 
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(faq.id)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left font-serif text-[15px] font-bold text-white uppercase tracking-wider bg-transparent border-none cursor-pointer group"
                  >
                    <div className="flex items-center space-x-3.5">
                      <span className={`text-xs font-mono font-bold uppercase py-0.5 px-2.5 rounded-lg shrink-0 ${
                        faq.category === "Rituals" ? "bg-orange-950/80 text-orange-400 border border-orange-500/10" :
                        faq.category === "Prasad" ? "bg-yellow-950/80 text-yellow-400 border border-yellow-500/10" :
                        faq.category === "Platform" ? "bg-teal-980 text-[#5EEAD4] border border-[#5EEAD4]/10" :
                        "bg-neutral-900 text-neutral-400 border border-neutral-800"
                      }`}>
                        {faq.category}
                      </span>
                      <span className="group-hover:text-[#5EEAD4] transition-colors leading-snug">{faq.question}</span>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#FFB347] shrink-0 ml-3" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-white/40 shrink-0 ml-3 group-hover:text-[#FFB347]/80 transition-colors" />
                    )}
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-1.5 text-xs sm:text-sm text-white/80 font-sans leading-relaxed border-t border-white/5 flex items-start space-x-2.5">
                          <Info className="w-4 h-4 text-[#FFB347] shrink-0 mt-0.5" />
                          <p className="text-left font-normal text-white/85">{faq.answer}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          ) : (
            <div className="bg-[#092320]/40 rounded-2xl border border-white/5 p-8 text-center space-y-2">
              <span className="text-2xl block text-white/30">🕉️</span>
              <p className="text-xs text-white/40 font-mono italic">
                No matching spiritual topics or ritual questions found.
              </p>
              <button
                type="button"
                onClick={() => { setSearchQuery(""); setActiveCategory("All"); }}
                className="text-xs text-[#5EEAD4] hover:underline font-bold mt-2"
              >
                Reset Filter Settings
              </button>
            </div>
          )}
        </div>

        {/* Micro-legal disclaimer for trust-building */}
        <div className="mt-8 bg-[#092320]/40 border border-white/5 p-4 rounded-2xl flex items-start space-x-3 text-[11px] text-white/55 font-sans leading-relaxed">
          <span className="text-base shrink-0">📜</span>
          <p className="text-left">
            <strong>Gotra & Sankalpa Verification SLA:</strong> All holy names registered on Sri Dwar are entered into physical Sanskrit registries at partnering shrines. If you require specialized astrology birth star analysis (Kundli) for exact nakshatras, consult your customized <strong>Dharmic Margadarshak</strong> sidebar guide immediately.
          </p>
        </div>

      </div>
    </section>
  );
}
