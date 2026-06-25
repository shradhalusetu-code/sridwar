/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { DAILY_HOROSCOPES, MANTRAS_OF_THE_DAY, SPIRITUAL_SERVICES_LIST, DIVINE_SANSKRIT_QUOTES } from "../data/spiritualData";
import { Sparkles, Play, Pause, Calendar, Clock, BookOpen, Volume2, ChevronRight, Share2, Star } from "lucide-react";

interface SpiritualConsoleProps {
  onBookService: (serviceName: string) => void;
}

export default function SpiritualConsole({ onBookService }: SpiritualConsoleProps) {
  const [selectedSign, setSelectedSign] = useState("Aries (Mesha)");
  const [currentMantraIndex, setCurrentMantraIndex] = useState(0);
  const [isPlayingMantra, setIsPlayingMantra] = useState(false);
  const [selectedService, setSelectedService] = useState("");
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [countdownString, setCountdownString] = useState("02h 45m 12s");

  const currentHoroscope = DAILY_HOROSCOPES.find((h) => h.sign === selectedSign) || DAILY_HOROSCOPES[0];
  const currentMantra = MANTRAS_OF_THE_DAY[currentMantraIndex];
  const currentQuote = DIVINE_SANSKRIT_QUOTES[quoteIndex];

  // Rotate quotes
  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % DIVINE_SANSKRIT_QUOTES.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  // Aarti Countdown simulator
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const target = new Date();
      target.setHours(19, 0, 0, 0); // Evening Aarti at 7:00 PM
      if (now.getTime() > target.getTime()) {
        target.setDate(target.getDate() + 1);
      }
      const diff = target.getTime() - now.getTime();
      const hrs = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff / (1000 * 60)) % 60);
      const secs = Math.floor((diff / 1000) % 60);
      setCountdownString(
        `${String(hrs).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Web Audio chime generator to simulate sacred Vedic sound
  const handlePlayMantraSound = () => {
    if (isPlayingMantra) {
      setIsPlayingMantra(false);
      return;
    }

    setIsPlayingMantra(true);
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Ring first bell chime
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5 temple frequency
      gain1.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 3.0);
      
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start();
      
      // Ring secondary divine harmony
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.3); // E5
      gain2.gain.setValueAtTime(0.2, audioCtx.currentTime + 0.3);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 3.0);
      
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start();

      setTimeout(() => {
        setIsPlayingMantra(false);
        osc1.stop();
        osc2.stop();
        audioCtx.close();
      }, 3000);
    } catch (err) {
      console.log(err);
      setIsPlayingMantra(false);
    }
  };

  const upcomingFestivals = [
    { name: "Jagannath Deva Ratha Yatra", date: "June 28, 2026", status: "In 10 Days" },
    { name: "Guru Purnima Celebrations", date: "July 29, 2026", status: "In 41 Days" },
    { name: "Sravani Somvar Maha Puja", date: "August 10, 2026", status: "In 53 Days" }
  ];

  return (
    <section 
      id="spiritualicity-console-section" 
      className="py-20 bg-[#021816] text-white relative overflow-hidden"
      style={{ paddingTop: `calc(env(safe-area-inset-top, 0px) + 80px)` }}
    >
      {/* Background Aerial image of Sakhi Gopal Temple with dark overlays */}
      <div className="absolute inset-0 pointer-events-none select-none z-0">
        <img
          src={import.meta.env.BASE_URL + "images/sakhi_gopal_aerial_1781873914842.jpg"}
          alt="Sakhi Gopal Temple Aerial View"
          className="w-full h-full object-cover object-center opacity-15 mix-blend-luminosity scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#021816] via-transparent to-[#021816]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#021816] via-transparent to-[#021816]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Title Block */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold text-[#FFB347]/80 tracking-wider font-mono">Dharmic wisdom lab</span>
          <h2 className="text-3xl font-serif font-black text-white tracking-tight mt-1">
            Vedic Spirituality Console
          </h2>
          <p className="text-xs text-white/70 mt-2">
            Nourish your soul daily with planetary calculations, sacred mantras, calendars, and booking portals for Vedic consultations.
          </p>
          <div className="mt-3 inline-flex items-center space-x-1.5 bg-[#FFB347]/10 border border-[#FFB347]/20 px-3 py-1 rounded-full text-[10px] text-[#FFB347] font-mono">
            <span className="w-1 h-1 rounded-full bg-[#FFB347] animate-pulse" />
            <span>Console Backdrop: Historic Sakhi Gopal Temple, Satyabadi (Aerial)</span>
          </div>
        </div>

        {/* Console Grid Structure */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* L1 Widget: Mantra player (cols 5) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Playable Mantra Container */}
            <div id="mantra-of-the-day-card" className="bg-[#092320] p-6 rounded-3xl border border-white/10 text-left shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFB347]/5 rounded-full filter blur-xl" />
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#5EEAD4] font-bold bg-[#5EEAD4]/10 border border-[#5EEAD4]/20 px-2.5 py-1 rounded-full">
                  Mantra of the Day
                </span>
                <div className="flex space-x-1.5">
                  {MANTRAS_OF_THE_DAY.map((_, i) => (
                    <button
                      key={i}
                      id={`mantra-tab-${i}`}
                      onClick={() => {
                        setCurrentMantraIndex(i);
                        setIsPlayingMantra(false);
                      }}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        currentMantraIndex === i ? "bg-[#FFB347]" : "bg-white/20"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <h4 className="font-serif text-xl font-bold text-white mb-2">
                {currentMantra.text}
              </h4>

              {/* Sanskrit Box */}
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center select-all cursor-pointer hover:bg-white/10 transition-colors mb-3">
                <p className="font-serif text-lg text-[#5EEAD4] font-semibold leading-relaxed tracking-wide">
                  {currentMantra.translation}
                </p>
              </div>

              {/* Spell-out Guide helper */}
              <p className="text-[11px] font-mono text-white/50 mb-4">
                <strong>Correct Pronunciation:</strong> {currentMantra.audioSimText}
              </p>

              <div className="text-xs text-white/70 space-y-1 bg-[#021816]/60 border border-white/5 p-3 rounded-xl mb-4">
                <span className="font-bold text-[#FFB347]">Spiritual Significance:</span>
                <p>{currentMantra.significance}</p>
              </div>

              <div className="flex items-center justify-between">
                <button
                  id="play-temple-bell"
                  onClick={handlePlayMantraSound}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all ${
                    isPlayingMantra 
                      ? "bg-[#FFB347] text-[#021816]" 
                      : "bg-white/5 text-white border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                  <span>{isPlayingMantra ? "🔔 Chime Ringing..." : "🔔 Listen Sacred Chime"}</span>
                </button>

                <span className="text-[10px] font-mono text-white/40">Audio Chime Synth</span>
              </div>
            </div>

            {/* Rotating Sacred Sanskrit Wisdom Card */}
            <div id="sacred-wisdom-card" className="bg-gradient-to-br from-[#092320] to-[#021816] border border-white/10 text-white p-6 rounded-3xl text-left relative overflow-hidden shadow">
              <div className="absolute -bottom-6 -right-6 text-9xl font-serif text-white/5 pointer-events-none select-none">
                ॐ
              </div>
              <span className="text-[9px] uppercase font-mono tracking-widest text-[#FFB347] font-bold">
                Daily Gita Wisdom
              </span>
              <p className="font-serif text-lg font-semibold tracking-wide leading-relaxed my-3 text-[#FFB347] filter drop-shadow">
                {currentQuote.sanskrit}
              </p>
              <p className="text-xs text-white/90 italic font-mono mb-2">
                "{currentQuote.english}"
              </p>
              <span className="text-[10px] font-mono text-white/40 block text-right">— {currentQuote.source}</span>
            </div>

          </div>

          {/* L2 Widget: Daily Horoscope (cols 4) */}
          <div className="lg:col-span-4" id="daily-horoscope-widget">
            <div className="bg-[#092320] p-6 rounded-3xl border border-white/10 text-left shadow-sm h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#FFB347] font-bold bg-[#FFB347]/10 border border-[#FFB347]/20 px-2.5 py-1 rounded-full">
                    Gochara Horoscope
                  </span>
                  <Sparkles className="w-4 h-4 text-[#FFB347] fill-[#FFB347]" />
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-bold text-white/80 mb-1.5">Select Your Moon Sign (Rashi):</label>
                  <select
                    id="horoscope-sign-select"
                    value={selectedSign}
                    onChange={(e) => setSelectedSign(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] font-semibold text-white focus:outline-none focus:border-[#5EEAD4]"
                  >
                    {DAILY_HOROSCOPES.map((horo) => (
                      <option key={horo.sign} value={horo.sign} className="bg-[#092320] text-white">
                        {horo.sign}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4">
                  <p className="text-xs text-white/80 leading-relaxed font-sans border-l-2 border-[#FFB347] pl-3">
                    {currentHoroscope.prediction}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="bg-white/5 border border-white/5 p-2 rounded-xl">
                      <span className="text-white/40 block uppercase">Lucky Color</span>
                      <span className="font-bold text-white">{currentHoroscope.luckyColor}</span>
                    </div>
                    <div className="bg-white/5 border border-white/5 p-2 rounded-xl">
                      <span className="text-white/40 block uppercase">Lucky Number</span>
                      <span className="font-bold text-white">{currentHoroscope.luckyNumber}</span>
                    </div>
                  </div>

                  <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-xs">
                    <span className="font-bold text-[#5EEAD4] block mb-1">Vedic Remedy:</span>
                    <p className="text-white/70 font-sans">{currentHoroscope.remedy}</p>
                  </div>
                </div>
              </div>

              <div className="text-[9px] text-white/45 italic pt-6">
                * Predictions updated daily according to Varanasi ephemeris logs.
              </div>
            </div>
          </div>

          {/* L3 Widget: Upcoming Festivals & Counseling Dropdown (cols 3) */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Live Aarti Countdown */}
            <div id="live-aarti-countdown" className="bg-[#092320] border border-white/10 p-5 rounded-3xl text-left shadow-sm">
              <div className="flex items-center space-x-2 text-red-400 font-bold mb-2">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                <span className="text-xs font-mono uppercase tracking-wider text-red-300">Next Live Evening Aarti</span>
              </div>
              <div className="text-2xl font-mono font-bold text-white tracking-tight mb-1">
                {countdownString}
              </div>
              <p className="text-[10px] text-white/60 font-sans">
                Universal Ganga Evening Aarti live stream starts in 33 holy sites.
              </p>
            </div>

            {/* Festival Calendar Widget */}
            <div id="festival-calendar-widget" className="bg-[#092320] border border-white/10 p-5 rounded-3xl text-left shadow-sm">
              <div className="flex items-center justify-between mb-3.5">
                <span className="text-xs font-bold text-white">Upcoming Festivals</span>
                <Calendar className="w-4 h-4 text-[#5EEAD4]" />
              </div>
              
              <div className="space-y-3">
                {upcomingFestivals.map((fest, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0 text-left">
                    <div>
                      <span className="block text-xs font-bold text-white">{fest.name}</span>
                      <span className="block text-[10px] text-white/50 font-mono">{fest.date}</span>
                    </div>
                    <span className="text-[9px] font-mono bg-[#FFB347]/10 text-[#FFB347] border border-[#FFB347]/20 px-2 py-0.5 rounded-full font-bold">
                      {fest.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Major Vedic Services selector booking */}
            <div id="vedic-services-selector" className="bg-[#092320] border border-white/10 p-5 rounded-3xl text-left shadow-sm">
              <label className="block text-xs font-bold text-white/80 mb-2">Vedic Services Option</label>
              
              <select
                id="counseling-services-select"
                value={selectedService}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedService(val);
                  if (val) {
                    onBookService(val);
                  }
                }}
                className="w-full text-xs p-2.5 rounded-xl border border-white/10 bg-[#021816] text-[#5EEAD4] font-semibold focus:outline-none focus:border-[#5EEAD4]"
              >
                <option value="" className="bg-[#092320] text-white">Select consultation...</option>
                {SPIRITUAL_SERVICES_LIST.map((service, idx) => (
                  <option key={idx} value={service} className="bg-[#092320] text-white">
                    {service}
                  </option>
                ))}
              </select>

              <p className="text-[9px] text-white/45 mt-2">
                Select a Vedic counseling service to register names, Gotras, and schedule a verified astrologer.
              </p>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
