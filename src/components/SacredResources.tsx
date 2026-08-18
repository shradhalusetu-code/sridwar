/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, ReactNode } from "react";
import { ChevronDown, Sparkles, Flame, BookOpen, Sun, Moon, Music2 } from "lucide-react";
import OptimizedImage from "./OptimizedImage";

const MANTRAS = [
  "JAGANNATH MANTRA",
  "RADHA MANTRA",
  "NARAYAN MANTRA",
  "KALI MANTRA",
  "AGNI MANTRA",
  "SHAKTI MANTRA",
  "HANUMAN MOOL MANTRA",
  "GAYATRI MANTRA",
  "MAHA MRITYUNJAYA MANTRA",
  "GANESH MANTRA",
  "SHIVA MANTRA",
  "VISHNU MANTRA",
  "LAKSHMI MANTRA",
  "SARASWATI MANTRA",
  "DURGA MANTRA",
  "KRISHNA MANTRA",
  "RAMA MANTRA",
  "SURYA MANTRA",
  "NAVGRAHA SHANTI MANTRA",
  "KUBER MANTRA",
  "DHANVANTARI MANTRA",
  "SHANI MANTRA"
];

const AARTIS = [
  "MAHAPRABHU JAGANNATH AARTI",
  "CHINTPURNI AARTI",
  "BHAGAVAD GITA AARTI",
  "ANNAPURNA AARTI",
  "OM JAI JAGDISH HARE AARTI",
  "MAA TARINI AARTI",
  "GANESH AARTI",
  "KAALI AARTI",
  "VISHWAKARMA AARTI",
  "SHIV AARTI",
  "LAKSHMI AARTI",
  "DURGA AARTI",
  "SARASWATI AARTI",
  "HANUMAN AARTI",
  "RAM AARTI",
  "KRISHNA AARTI",
  "VISHNU AARTI",
  "SHANI AARTI",
  "SANTOSHI MAA AARTI",
  "AYYAPPA AARTI",
  "NAVADURGA AARTI",
  "BALAJI AARTI",
  "KARTIKEYA AARTI",
  "SAI BABA AARTI"
];

const CHALISAS = [
  "JAGANNATH CHALISA",
  "HANUMAN CHALISA",
  "SARASWATI CHALISA",
  "SHIV CHALISA",
  "RAM CHALISA",
  "CHAMUNDA CHALISA",
  "SANTOSHI CHALISA",
  "KAALI CHALISA",
  "DURGA CHALISA",
  "GANESH CHALISA",
  "KRISHNA CHALISA",
  "LAKSHMI CHALISA",
  "VISHNU CHALISA",
  "SHANI CHALISA",
  "SURYA CHALISA",
  "NAVGRAHA CHALISA",
  "VISHWAKARMA CHALISA",
  "AYYAPPA CHALISA",
  "BAJRANG BAAN",
  "GAYATRI CHALISA",
  "RADHA CHALISA",
  "BRAHMA CHALISA",
  "KUBER CHALISA"
];

const STOTRAMS = [
  "VISHNU SAHASRANAMA STOTRAM",
  "LALITA SAHASRANAMA STOTRAM",
  "SHIVA TANDAVA STOTRAM",
  "RAM RAKSHA STOTRAM",
  "KANAKADHARA STOTRAM",
  "ADITYA HRIDAYAM STOTRAM",
  "ANNAPURNA STOTRAM",
  "BHAVANI ASHTAKAM",
  "KALABHAIRAVA ASHTAKAM",
  "SARASWATI STOTRAM",
  "HANUMAN STOTRAM",
  "SHRI SUKTAM",
  "MAHISHASURA MARDINI STOTRAM",
  "KRISHNA ASHTAKAM",
  "GURU STOTRAM",
  "NAVAGRAHA STOTRAM",
  "SHANI STOTRAM",
  "AYYAPPA SHARANAM STOTRAM",
  "VENKATESWARA SUPRABHATAM",
  "RUDRASHTAKAM",
  "GANGA STOTRAM",
  "KALI STOTRAM",
  "MEENAKSHI STOTRAM",
  "SUBRAMANYA BHUJANGAM"
];

const CITIES = [
  "PURI",
  "BHUBANESHWAR",
  "VARANASI",
  "MUMBAI",
  "NEW DELHI",
  "KOLKATA",
  "CHENNAI",
  "BENGALURU",
  "HYDERABAD",
  "AHMEDABAD",
  "HARORA",
  "PUNE",
  "HARIDWAR",
  "JAIPUR",
  "LUCKNOW",
  "AYODHYA",
  "MATHURA",
  "RISHIKESH",
  "AMRITSAR",
  "NASHIK",
  "UJJAIN",
  "TIRUPATI",
  "MADURAI",
  "GUWAHATI",
  "PATNA",
  "BHOPAL",
  "SURAT",
  "KANPUR"
];

interface DropdownGroupProps {
  label: string;
  icon: ReactNode;
  options: string[];
  placeholderNote: (selected: string) => string;
  imageUrl?: string;
}

function DropdownGroup({ label, icon, options, placeholderNote, imageUrl }: DropdownGroupProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(options[0]);

  return (
    <div
      className={`bg-[#092320]/80 rounded-2xl border border-white/10 h-full flex flex-col relative transition-[z-index] ${
        // When this card's list is open, lift the WHOLE card (not just the
        // dropdown) above its siblings. Previously only the dropdown itself
        // carried a z-index, but its stacking context is compared against
        // sibling *cards* in DOM order — so a card lower in the grid (e.g.
        // Bhajan/Stotram, Sun Rise, Moon Rise) could still paint on top of
        // an open dropdown from a card above it, making the open list look
        // "hidden" or blocked/clipped by the row underneath.
        open ? "z-40" : "z-0"
      }`}
    >
      {imageUrl && (
        <div className="w-full aspect-[3/2] overflow-hidden rounded-t-2xl">
          <OptimizedImage
            src={imageUrl}
            alt={label}
            loading="lazy"
            width={480}
            height={320}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-5 flex flex-col flex-1">
      <div className="flex items-center space-x-2 mb-3">
        {icon}
        <h4 className="font-serif text-sm font-bold text-[#FFB347] uppercase tracking-wider">{label}</h4>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-3 text-left px-4 py-3 rounded-xl border border-white/10 bg-[#021816] hover:border-white/20 focus:outline-none focus:border-[#5EEAD4] transition-all"
        >
          <span className="text-xs sm:text-sm font-semibold text-white truncate">{selected}</span>
          <ChevronDown className={`w-4 h-4 text-white/40 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <>
            {/* Invisible backdrop closes the dropdown on outside click */}
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />

            {/* Outer wrapper clips the rounded corners; the inner div is the
                actual scroll area, bounded to a viewport-relative height
                (not a fixed max-h-72) so long lists like Bhajan/Stotram
                always have room to scroll instead of getting visually cut
                off. overscroll-contain + stopped touchmove propagation
                ensure swiping the list on Android/iOS scrolls the list
                itself instead of the page grabbing the gesture. */}
            <div className="absolute left-0 right-0 mt-2 z-40 rounded-xl border border-white/10 bg-[#021816] shadow-2xl overflow-hidden">
              <div
                className="max-h-[45vh] sm:max-h-80 overflow-y-auto overscroll-contain p-1.5 space-y-1"
                style={{ WebkitOverflowScrolling: "touch" }}
                onTouchMove={(e) => e.stopPropagation()}
              >
                {options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setSelected(opt);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all ${
                      selected === opt
                        ? "bg-gradient-to-r from-[#FFB347]/20 to-[#F27D26]/20 border border-[#FFB347] text-white font-semibold"
                        : "text-white/75 hover:bg-white/5 hover:text-[#5EEAD4]"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {/* Fade + bounce-chevron scroll indicator — only for lists
                  tall enough to need scrolling, so devotees on both web and
                  the Android app can see at a glance that more options sit
                  below the fold. */}
              {options.length > 6 && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#021816] to-transparent flex items-end justify-center pb-1">
                  <ChevronDown className="w-3.5 h-3.5 text-white/60 animate-bounce" />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <p className="text-[13px] text-white/50 italic mt-3 leading-relaxed">{placeholderNote(selected)}</p>
      </div>
    </div>
  );
}

export default function SacredResources() {
  return (
    <section id="sacred-daily-tools" className="py-10 bg-[#021816] border-t border-white/10 text-left relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="text-xs font-semibold text-[#FFB347]/80 tracking-wider font-mono uppercase">
            Daily devotion tools
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-white tracking-tight">
            Mantras, Aartis, Chalisas, Bhajans/Stotrams &amp; Sacred Timings
          </h2>
          <p className="text-xs text-white/60">
            Pick a deity, ritual, or city below — full chanting guides, audio, and live timings are rolling out soon.
          </p>
        </div>

        {/* Mobile/app: horizontal snap carousel — all 6 Daily Devotion tool
            cards fit here, matching the Seva Offerings / Bazaar Offerings /
            Simple Pujas carousel pattern used elsewhere. Desktop (lg+):
            unchanged grid. */}
        <div className="lg:hidden -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto no-scrollbar snap-x snap-mandatory">
          <div className="flex gap-5 w-max pb-1">
            <div className="snap-start shrink-0 w-[260px]">
              <DropdownGroup
                label="Mantra"
                icon={<Sparkles className="w-4 h-4 text-[#5EEAD4]" />}
                options={MANTRAS}
                imageUrl={import.meta.env.BASE_URL + "images/Mantra.jpg"}
                placeholderNote={(s) => `🙏 ${s} selected. Full chanting guide & audio will be available here soon.`}
              />
            </div>
            <div className="snap-start shrink-0 w-[260px]">
              <DropdownGroup
                label="Aarti"
                icon={<Flame className="w-4 h-4 text-[#5EEAD4]" />}
                options={AARTIS}
                imageUrl={import.meta.env.BASE_URL + "images/Aarti.jpg"}
                placeholderNote={(s) => `🙏 ${s} selected. Full lyrics & audio will be available here soon.`}
              />
            </div>
            <div className="snap-start shrink-0 w-[260px]">
              <DropdownGroup
                label="Chalisa"
                icon={<BookOpen className="w-4 h-4 text-[#5EEAD4]" />}
                options={CHALISAS}
                imageUrl={import.meta.env.BASE_URL + "images/Chalisa.jpg"}
                placeholderNote={(s) => `🙏 ${s} selected. Full verses & audio will be available here soon.`}
              />
            </div>
            <div className="snap-start shrink-0 w-[260px]">
              <DropdownGroup
                label="Bhajan/Stotram"
                icon={<Music2 className="w-4 h-4 text-[#5EEAD4]" />}
                options={STOTRAMS}
                imageUrl={import.meta.env.BASE_URL + "images/Stotram.jpg"}
                placeholderNote={(s) => `🙏 ${s} selected. Full lyrics & audio will be available here soon.`}
              />
            </div>
            <div className="snap-start shrink-0 w-[260px]">
              <DropdownGroup
                label="Sun Rise & Sun Set Timings"
                icon={<Sun className="w-4 h-4 text-[#5EEAD4]" />}
                options={CITIES}
                imageUrl={import.meta.env.BASE_URL + "images/Sun Rise.jpg"}
                placeholderNote={(s) => `Sunrise & sunset timings for ${s} will appear here once live astronomy data is connected.`}
              />
            </div>
            <div className="snap-start shrink-0 w-[260px]">
              <DropdownGroup
                label="Moon Rise & Moon Set Timings"
                icon={<Moon className="w-4 h-4 text-[#5EEAD4]" />}
                options={CITIES}
                imageUrl={import.meta.env.BASE_URL + "images/Moon Rise.jpg"}
                placeholderNote={(s) => `Moonrise & moonset timings for ${s} will appear here once live astronomy data is connected.`}
              />
            </div>
          </div>
        </div>

        <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <DropdownGroup
            label="Mantra"
            icon={<Sparkles className="w-4 h-4 text-[#5EEAD4]" />}
            options={MANTRAS}
            imageUrl={import.meta.env.BASE_URL + "images/Mantra.jpg"}
            placeholderNote={(s) => `🙏 ${s} selected. Full chanting guide & audio will be available here soon.`}
          />
          <DropdownGroup
            label="Aarti"
            icon={<Flame className="w-4 h-4 text-[#5EEAD4]" />}
            options={AARTIS}
            imageUrl={import.meta.env.BASE_URL + "images/Aarti.jpg"}
            placeholderNote={(s) => `🙏 ${s} selected. Full lyrics & audio will be available here soon.`}
          />
          <DropdownGroup
            label="Chalisa"
            icon={<BookOpen className="w-4 h-4 text-[#5EEAD4]" />}
            options={CHALISAS}
            imageUrl={import.meta.env.BASE_URL + "images/Chalisa.jpg"}
            placeholderNote={(s) => `🙏 ${s} selected. Full verses & audio will be available here soon.`}
          />
          <DropdownGroup
            label="Bhajan/Stotram"
            icon={<Music2 className="w-4 h-4 text-[#5EEAD4]" />}
            options={STOTRAMS}
            imageUrl={import.meta.env.BASE_URL + "images/Stotram.jpg"}
            placeholderNote={(s) => `🙏 ${s} selected. Full lyrics & audio will be available here soon.`}
          />
          <DropdownGroup
            label="Sun Rise & Sun Set Timings"
            icon={<Sun className="w-4 h-4 text-[#5EEAD4]" />}
            options={CITIES}
            imageUrl={import.meta.env.BASE_URL + "images/Sun Rise.jpg"}
            placeholderNote={(s) => `Sunrise & sunset timings for ${s} will appear here once live astronomy data is connected.`}
          />
          <DropdownGroup
            label="Moon Rise & Moon Set Timings"
            icon={<Moon className="w-4 h-4 text-[#5EEAD4]" />}
            options={CITIES}
            imageUrl={import.meta.env.BASE_URL + "images/Moon Rise.jpg"}
            placeholderNote={(s) => `Moonrise & moonset timings for ${s} will appear here once live astronomy data is connected.`}
          />
        </div>
      </div>
    </section>
  );
}
