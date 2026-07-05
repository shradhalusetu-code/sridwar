/*
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Search } from "lucide-react";

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
    answer: "Every Puja booked on Sri Dwar is a strictly personalized ceremony. We collect your birth coordinate details—such as Devotee Name, Gotra ancestry, and Vedic Rashi—during booking. Our temple Acharyas and chief priests voice your unique Sankalpa aloud inside the temple sanctorum, invoking celestial blessings specifically on your behalf."
  },
  {
    id: "faq-2",
    category: "Prasad",
    question: "How and when will I receive the sacred Prasad and consecrated items?",
    answer: "Following the successful performance of your ritual, the temple priests sanctify the offerings. The high-grade Dry Fruits, sacred Kumkum, energized threads, and temple Prasad are packaged in specialized hermetic food-grade pouches to prevent degradation. It is dispatched via express courier with live tracking, reaching your doorstep within 3-5 business days."
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
    answer: "Yes. Sri Dwar is an AI-powered faith-tech platform operated under official service level agreements and legal partnerships with validated temple trusts, apex dharmic authorities, and managing pandas. All actions, dakshinas, and logistics are registered securely under the corporate governance of Shradhalu Private Ltd."
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
    question: "How can I be confident about the live telecasts?",
    answer: "Every streaming link is custom emitted from our direct on-site representative or registered sevayats. To keep things personal and traceable, the temple panda will clearly call out your registered name, Gotra, and city right in front of the deity prior to beginning the main chants, which will be visible in the live stream or high-definition recording."
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
    answer: "Yes. For specific holy shrines (such as Maa Kamakhya's water spring Peetha or Dashashwamedh Ganga Ghat), a hermetically sealed copper or premium plastic vial containing filtered holy water is securely bundled into your sacred Prasad kit."
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
    answer: "While we assign our chief senior Acharyas by default to ensure standard adherence, devotees selecting the 'Maha Puja' tiers can request specific specialized pandits through the special instruction input during the Book Now workflow."
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
  },
  {
    id: "faq-22",
    category: "Platform",
    question: "What is your cancellation and refund policy if my plans change after booking a Puja?",
    answer: "We understand devotional plans can shift. Cancellations made more than 48 hours before the scheduled Sankalpa are eligible for a full refund to your original payment method or as Sri Dwar wallet credit, processed within 5-7 business days. Cancellations within 48 hours of the ritual may carry a partial priest-engagement fee, since temple slots and Acharya time are reserved exclusively in your name."
  },
  {
    id: "faq-23",
    category: "Platform",
    question: "How can I track the real-time status of my Puja, from booking confirmation to Prasad delivery?",
    answer: "Your Devotee Workspace includes a dedicated Order Timeline for every booking, showing live milestones: Sankalpa Confirmed, Priest Assigned, Ritual Performed, Prasad Dispatched, and Out for Delivery. You will also receive automated WhatsApp and email updates at each stage, along with the courier's live tracking link once Prasad ships."
  },
  {
    id: "faq-24",
    category: "Rituals",
    question: "How far in advance should I book a Puja, especially around major festivals like Diwali or Navratri?",
    answer: "We recommend booking at least 5-7 days ahead for standard rituals. During high-demand festival windows such as Navratri, Diwali, or Maha Shivratri, temple Acharya slots fill quickly, so booking 2-3 weeks in advance is strongly advised to secure your preferred date, time, and priest availability."
  },
  {
    id: "faq-25",
    category: "Account",
    question: "Can I gift a Puja booking to a friend or family member living in another city or country?",
    answer: "Yes. During checkout, select 'Gift this Sankalpa' and enter the recipient's name and contact details. They will receive a personalized notification confirming the ritual performed in their honor, along with access to the Live Darshan stream and recording, even if the Prasad ships to your own address instead."
  },
  {
    id: "faq-26",
    category: "Platform",
    question: "In which languages can I communicate with customer support and receive Sankalpa confirmations?",
    answer: "Our Devotee Support desk currently assists in English, Hindi, Odia, Telugu, and Tamil over chat, email, and WhatsApp. Sankalpa confirmations and ritual notifications can also be requested in Sanskrit transliteration alongside your chosen regional language."
  },
  {
    id: "faq-27",
    category: "Rituals",
    question: "Will I receive an official donation receipt for Annadanam or Gurukul Dan sponsorships for tax purposes?",
    answer: "Yes. Charitable sevas like Annadanam and Gurukul Dan, when routed through our registered partner trusts, generate an official donation receipt sent to your registered email within 7 working days, which may be eligible for tax exemption under applicable regional charitable-donation provisions. We recommend confirming eligibility with your tax advisor."
  },
  {
    id: "faq-28",
    category: "Platform",
    question: "Is there a dedicated Sri Dwar mobile app, or do I need to use the website only?",
    answer: "Sri Dwar is fully accessible through your mobile browser with no installation required, optimized for a smooth booking, live-streaming, and Devotee Workspace experience. A dedicated native app for iOS and Android is currently in development for added offline access and push notifications."
  },
  {
    id: "faq-29",
    category: "Platform",
    question: "How are Live Darshan timings adjusted for devotees watching from different countries and time zones?",
    answer: "All scheduled ritual and Live Darshan times are originally set in Indian Standard Time (IST) to match temple sanctum hours. Your Devotee Workspace automatically converts and displays these timings in your local time zone, and reminder notifications account for the conversion so you never miss the live stream."
  },
  {
    id: "faq-30",
    category: "Rituals",
    question: "What happens if my assigned priest is unavailable on the scheduled ritual date?",
    answer: "In rare cases of priest unavailability due to illness or unforeseen temple duties, our temple coordination team immediately assigns an equally experienced Acharya of the same lineage and tradition to perform your ritual at the original scheduled time, ensuring your Sankalpa is never delayed."
  },
  {
    id: "faq-31",
    category: "Platform",
    question: "Do you offer bulk or corporate CSR puja packages for organizations and community groups?",
    answer: "Yes. We support bulk Sankalpa bookings for corporate CSR initiatives, community welfare drives, and group family functions, including consolidated billing, dedicated account management, and customized Annadanam or Gurukul Dan sponsorship bundles. Reach out to our Devotee Support team to set up a tailored organizational plan."
  }
];

export default function FAQs() {
  const [selectedFaqId, setSelectedFaqId] = useState<string | null>("faq-1");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const categories = ["All", "Rituals", "Prasad", "Platform", "Account"];

  const filteredFAQs = FAQ_DATA.filter((item) => {
    const matchesSearch = 
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const selectedFaq = filteredFAQs.find((item) => item.id === selectedFaqId) || filteredFAQs[0] || null;

  const categoryBadgeClass = (category: string) =>
    category === "Rituals" ? "bg-orange-950/80 text-orange-400 border border-orange-500/10" :
    category === "Prasad" ? "bg-yellow-950/80 text-yellow-400 border border-yellow-500/10" :
    category === "Platform" ? "bg-teal-980 text-[#5EEAD4] border border-[#5EEAD4]/10" :
    "bg-neutral-900 text-neutral-400 border border-neutral-800";

  // Temple & Hindu-themed emojis for each FAQ category — used instead of
  // generic UI icons so the section feels warm and on-brand.
  const categoryEmoji = (category: string) =>
    category === "Rituals" ? "🔱" :
    category === "Prasad" ? "🪔" :
    category === "Platform" ? "🛕" :
    "🪷"; // Account

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
            <span className="text-sm leading-none">🛕</span>
            <span>Spiritual Inquiries</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-white leading-tight">
            Frequently Asked Questions
          </h2>
          
          <p className="text-sm text-white/75 font-sans max-w-xl mx-auto leading-relaxed">
            Unraveling the deep Vedic guidelines, logistical transparency, and secure, respectful devotions provided by Sri Dwar's premium network.
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

        {/* Question Dropdown Selector (desktop + mobile) */}
        <div className="relative mb-4">
          <button
            type="button"
            id="faq-select-trigger"
            onClick={() => setDropdownOpen((open) => !open)}
            className="w-full flex items-center justify-between gap-3 text-left px-5 py-4 rounded-2xl border border-white/10 bg-[#092320] hover:border-white/20 focus:outline-none focus:border-[#5EEAD4] transition-all"
          >
            <div className="flex items-center space-x-3.5 min-w-0">
              {selectedFaq && (
                <span className={`text-xs font-mono font-bold uppercase py-0.5 px-2.5 rounded-lg shrink-0 ${categoryBadgeClass(selectedFaq.category)}`}>
                  {selectedFaq.category}
                </span>
              )}
              <span className="font-serif text-sm sm:text-[15px] font-bold text-white tracking-wide truncate">
                {selectedFaq ? selectedFaq.question : "No matching questions"}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-white/40 shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {dropdownOpen && (
            <>
              {/* Invisible backdrop closes the dropdown on outside click */}
              <div className="fixed inset-0 z-20" onClick={() => setDropdownOpen(false)} />

              <div
                id="faq-list-container"
                className="absolute left-0 right-0 mt-2 z-30 max-h-96 overflow-y-auto bg-[#092320] rounded-2xl border border-white/10 shadow-2xl p-2 space-y-1"
              >
                {filteredFAQs.length > 0 ? (
                  filteredFAQs.map((faq) => (
                    <button
                      key={faq.id}
                      type="button"
                      id={`faq-option-${faq.id}`}
                      onClick={() => {
                        setSelectedFaqId(faq.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 text-left p-3 rounded-xl text-xs transition-all ${
                        selectedFaq?.id === faq.id
                          ? "bg-gradient-to-r from-[#FFB347]/20 to-[#F27D26]/20 border border-[#FFB347] text-white shadow-md font-semibold"
                          : "text-white/75 hover:bg-white/5 hover:text-[#5EEAD4]"
                      }`}
                    >
                      <span className={`text-[10px] font-mono font-bold uppercase py-0.5 px-2 rounded-lg shrink-0 ${categoryBadgeClass(faq.category)}`}>
                        {faq.category}
                      </span>
                      <span className="truncate">{faq.question}</span>
                    </button>
                  ))
                ) : (
                  <p className="text-center text-xs text-white/45 py-6">No matching spiritual topics or ritual questions found.</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Selected Answer Panel */}
        <AnimatePresence mode="wait">
          {selectedFaq ? (
            <motion.div
              key={selectedFaq.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="bg-[#092421] rounded-2xl border border-[#FFB347] shadow-[0_0_15px_rgba(255,179,71,0.08)] px-5 py-5"
            >
              <div className="flex items-start space-x-2.5">
                <span className="text-base leading-none shrink-0 mt-0.5">{categoryEmoji(selectedFaq.category)}</span>
                <p className="text-left font-normal text-xs sm:text-sm text-white/85 leading-relaxed">{selectedFaq.answer}</p>
              </div>
            </motion.div>
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
        </AnimatePresence>

        {/* Micro-legal disclaimer for trust-building */}
        <div className="mt-8 bg-[#092320]/40 border border-white/5 p-4 rounded-2xl flex items-start space-x-3 text-[11px] text-white/55 font-sans leading-relaxed">
          <span className="text-base shrink-0">📜</span>
          <p className="text-left">
            <strong>Gotra & Sankalpa Verification SLA:</strong> All holy names registered on Sri Dwar are entered into physical Sanskrit registries at partnering shrines. If you require specialized astrology birth star analysis (Kundli) for exact nakshatras, consult your customized <strong>Dharmic Margadarshak</strong> sidebar guide immediately.
          </p>
        </div>

        {/* General disclaimer — FAQ content subject to change */}
        <div className="mt-4 bg-[#092320]/40 border border-white/5 p-4 rounded-2xl flex items-start space-x-3 text-[11px] text-white/55 font-sans leading-relaxed">
          <span className="text-base shrink-0">🙏</span>
          <p className="text-left">
            <strong>Disclaimer:</strong> The information shared above is provided in good faith for general devotee guidance and reflects our current rituals, processes, and policies as accurately as possible. Temple timings, priest availability, Vedic procedures, pricing, shipping schedules, and platform features may evolve due to festival calendars, temple-trust directives, or operational requirements, and Sri Dwar (Shradhalu Private Limited) reserves the right to update, amend, or discontinue any term, service detail, or policy referenced in this FAQ section at its discretion. Where reasonably possible, devotees will be notified of material changes in advance via the registered email, WhatsApp, or the Devotee Console; however, continued use of the platform after such updates are published shall constitute acceptance of the revised terms. For the most current details on any specific booking, ritual, or seva, please reach out to our Devotee Care desk before proceeding.
          </p>
        </div>

      </div>
    </section>
  );
}
