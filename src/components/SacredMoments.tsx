/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SacredMoments.tsx — Sri Dwar
 *
 * "Sacred Moments" — Lord Jagannath photo slideshow + Prayer Wall. This used
 * to live inline inside SevaExperience.tsx (the Seva Hub page); it now
 * renders on the Live Darshan page instead, directly below the Darshan
 * Preview card, and is fully self-contained (owns its own slideshow timer,
 * Prayer Wall state, and Google Form sync — no props required from its
 * parent page).
 */

import { useState, useEffect, FormEvent } from "react";
import { Send } from "lucide-react";
import OptimizedImage from "./OptimizedImage";
import { syncToGoogleForm } from "../utils/googleFormSync";
import { DEVOTEE_REVIEWS, DevoteeReview } from "../data/devoteeReviews";

// ─── Temporary feature flag ─────────────────────────────────────────────────
// The Prayer Wall's visible comment list (real devotee reviews + anything a
// visitor has sent) is temporarily hidden on the Sacred Moments card per
// product request, so devotees cannot see them for now. The "Offer your
// prayers or type a mantra..." input + send button stay visible and fully
// functional — a devotee can still offer a prayer, it just isn't shown on
// the page. Nothing is deleted: flip this flag back to true to restore the
// list exactly as it was.
const SHOW_PRAYER_WALL_COMMENTS = false;

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

// The Prayer Wall starts empty — no example devotees or sample messages are
// shown, since these looked like fake/placeholder activity to devotees. It
// fills only with real messages the current visitor sends (plus the
// automated reply), which are also synced to the Google Sheet for the team
// to review.
const INITIAL_CHAT_MESSAGES: { name: string; msg: string; location: string }[] = [];

export default function SacredMoments() {
  const [slideIndex, setSlideIndex] = useState(0);
  const [chatMessages, setChatMessages] = useState(INITIAL_CHAT_MESSAGES);
  const [inputMessage, setInputMessage] = useState("");
  // Shuffled once when the component mounts, so the order stays stable
  // while the user is on the page (won't re-shuffle on every keystroke or
  // re-render) but varies between visits/page loads.
  const [shuffledReviews] = useState(() => shuffleReviews(DEVOTEE_REVIEWS));

  useEffect(() => {
    const t = setInterval(() => setSlideIndex((p) => (p + 1) % JAGANNATH_SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

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
      email: "Live Darshan — Prayer Wall",
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

  return (
    <div className="w-full max-w-2xl mx-auto mt-6 sm:mt-8">
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
          <OptimizedImage
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
            anything the current visitor sends below them. The list below
            has a fixed height sized for ~8-9 compact cards, with the rest
            reachable by scrolling inside it. */}
        <div className="px-4 pb-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3 shrink-0">
            <span className="text-xs font-bold text-white/80">Prayer Wall</span>
            <span className="text-[9px] font-mono text-white/40">Prayers</span>
          </div>
          <p className="text-[10px] text-white/40 -mt-2 mb-2 shrink-0">
            Devotee reviews, plus a private space to offer your own prayer. Your prayer is saved to our records so the team can include it here for other devotees; it is not shared publicly until reviewed. Automated replies are marked "AI-generated".
          </p>

          {/* Messages — fixed height, shows ~8-9 cards at a glance; scroll
              for the rest. line-clamp-2 keeps every card a predictable
              height so that estimate holds regardless of how long an
              individual review is. Temporarily hidden, see
              SHOW_PRAYER_WALL_COMMENTS above — when hidden, no fixed-height
              block is rendered at all, so no empty gap is left above the
              input below. */}
          {SHOW_PRAYER_WALL_COMMENTS && (
            <div
              id="chat-messages-container"
              className="h-[420px] sm:h-[520px] overflow-y-auto space-y-2.5 mb-3 pr-1 text-left"
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
          )}

          {/* Input — "Offer your prayers or type a mantra..." stays visible
              and functional regardless of SHOW_PRAYER_WALL_COMMENTS. */}
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
  );
}
