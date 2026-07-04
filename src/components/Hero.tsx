/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from "react";
import { Award, Sparkles, BookOpen, ChevronRight, Check, Heart, ShieldCheck, Database, RefreshCw, Flame } from "lucide-react";
import { Language, TRANSLATIONS } from "../data/translations";
import { PRIEST_PROFILES } from "../data/priests";
import SacredIcon from "./SacredIcon";
import SriDwarLogo from "./SriDwarLogo";
import { syncToGoogleForm, makeSubmissionRef } from "../utils/googleFormSync";
import UPIPaymentModal from "./UPIPaymentModal";
import { validateName, validateEmail, validatePhone, validateAge } from "../utils/formValidation";
import { TEMPLES_LIST } from "../data/temples";
import { gaContactFormStart, gaContactFormSubmit, gaNavClick } from "../utils/analytics";
import { registerBackHandler, unregisterBackHandler } from "../utils/backHandlerStack";
// @ts-ignore
import aerialJagannathPuri from "../assets/images/aerial_jagannath_puri_hero_1781871848760.jpg";

interface HeroProps {
  currentLanguage: Language;
  isAndroidApp?: boolean;
  onNavigate: (page: string) => void;
  onOpenSetuYatra: () => void;
}

export default function Hero({ currentLanguage, isAndroidApp = false, onNavigate, onOpenSetuYatra }: HeroProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Register with the shared Back-button trap while the Darshan Certificate
  // modal is open, so pressing Back (browser or Android hardware) closes
  // the modal / returns to the homepage instead of exiting the site.
  useEffect(() => {
    const id = "hero-darshan-certificate-modal";
    if (isModalOpen) {
      registerBackHandler(id, () => setIsModalOpen(false));
    } else {
      unregisterBackHandler(id);
    }
    return () => unregisterBackHandler(id);
  }, [isModalOpen]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Form fields
  const [name, setName] = useState("");
  const [temple, setTemple] = useState("");
  const [age, setAge] = useState("");
  const [deity, setDeity] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [feedback, setFeedback] = useState("");
  const [membershipTier, setMembershipTier] = useState<number | null>(null);
  const [refId, setRefId] = useState("");
  const [showUPI, setShowUPI] = useState(false);
  const [upiAmount, setUpiAmount] = useState<number | null>(null);

  const t = TRANSLATIONS[currentLanguage];

  const handleOpenCertificateModal = () => {
    setIsModalOpen(true);
    setIsSubmitted(false);
    setMembershipTier(null);
  };

  // Allow other parts of the app (e.g. the footer's "Darshan Certificate"
  // link, which lives outside this component) to open the Sri Dwar Darshan
  // Register modal by dispatching a global event after navigating home.
  useEffect(() => {
    const openFromEvent = () => handleOpenCertificateModal();
    window.addEventListener("sd-open-darshan-register", openFromEvent);
    return () => window.removeEventListener("sd-open-darshan-register", openFromEvent);
  }, []);

  // ── Submit Certificate Request — fires ONE row immediately. If the devotee
  // picked a contribution tier, the row is recorded as "Pending — Awaiting
  // Decision" (not the tier amount) until payment is actually confirmed —
  // see handleDarshanPaymentConfirmed below. If no tier was picked ("Skip
  // for Now"), that's already a final decision, so it's recorded as
  // "Skipped" right away with no further row needed. ──
  const handleSubmitCertificate = async (e: FormEvent) => {
    e.preventDefault();

    // ── Global validation ──────────────────────────────────────────────────
    const nameErr  = validateName(name);
    const emailErr = validateEmail(email);
    const phoneErr = validatePhone(phone);
    const ageErr   = age ? validateAge(age, false) : null;

    if (nameErr)  { alert(nameErr);  return; }
    if (!temple)  { alert("Please select the temple you visited."); return; }
    if (emailErr) { alert(emailErr); return; }
    if (phoneErr) { alert(phoneErr); return; }
    if (!city.trim() || city.trim().length < 2) { alert("Please enter your city."); return; }
    if (ageErr)   { alert(ageErr);   return; }
    // ──────────────────────────────────────────────────────────────────────

    setIsSubmitting(true);
    const newRefId = makeSubmissionRef("CERT");
    setRefId(newRefId);
    const contributionStatus = membershipTier ? "Pending — Awaiting Decision" : "Skipped";

    try {
      await syncToGoogleForm("darshan_certificate", {
        name,
        email,
        phone,
        details: `Temple: ${temple} | Age: ${age || 'N/A'} | Deity: ${deity || 'N/A'} | City: ${city} | Contribution: ${contributionStatus} | Feedback: ${feedback || 'None'} | Ref: ${newRefId}`,
        type: "Darshan Certificate Request",
        temple,
        age: age || undefined,
        deity,
        whatsapp,
        city,
        feedback,
        contribution: contributionStatus,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
      setIsSubmitted(true);
      gaContactFormSubmit(!!phone);
      // ✅ Show UPI if user selected a contribution tier
      if (membershipTier) {
        setUpiAmount(membershipTier);
        setShowUPI(true);
      }
    }
  };

  // Payment confirmed — sends the ONE Final row for this certificate
  // request, with the contribution correctly recorded as the real amount
  // and method paid, sharing the same Ref ID as the initial submission.
  const handleDarshanPaymentConfirmed = async (details: { amount: number; method: "UPI" | "WhatsApp Pay" }) => {
    setShowUPI(false);
    try {
      await syncToGoogleForm("darshan_certificate", {
        name,
        email,
        phone,
        details: `Temple: ${temple} | Age: ${age || 'N/A'} | Deity: ${deity || 'N/A'} | City: ${city} | Contribution: ₹${details.amount} via ${details.method} | Feedback: ${feedback || 'None'} | Ref: ${refId}`,
        type: "Darshan Certificate Request",
        temple,
        age: age || undefined,
        deity,
        whatsapp,
        city,
        feedback,
        contribution: `₹${details.amount}`,
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Trust-bar stats — kept honest on purpose:
  //  - "Priests Network" and "Temples Network" are computed live from the
  //    actual data files, so they can never drift into a false claim as the
  //    business grows or changes (and note: PRIEST_PROFILES currently marks
  //    every priest isVerified: false, so we no longer claim "Verified
  //    Priests" here — that word should only return once a real
  //    verification process is in place and priests.ts reflects it).
  //  - "Languages Supported" is computed from the app's own translations.
  //  - The rest are genuine feature/policy claims (things Sri Dwar actually
  //    does), not fabricated headcounts. Previous versions of this list
  //    included specific-sounding but unverifiable numbers ("10k+ Devotees
  //    Served", "1500+ Devotee Memberships", "12 Global Reps", "2 Festivals
  //    Streamed", separate made-up counts for "Puja Committees" vs "Puja
  //    Mandal") with no backing data anywhere in the codebase. Displaying
  //    fabricated scale metrics like that is a real Play Store / Google
  //    Business "deceptive claims" risk, so they've been removed rather
  //    than just reworded. If you have real, verifiable figures for any of
  //    those, add them back in — just make sure they're numbers you can
  //    substantiate if asked.
  const trustStats = [
    { value: `${PRIEST_PROFILES.length}+`, label: "Priests Network" },
    { value: `${TEMPLES_LIST.length}+`, label: "Temples Network" },
    { value: `${Object.keys(TRANSLATIONS).length}`, label: "Languages Supported" },
    { value: "100%", label: "Secure Offerings" },
    { value: "24/7", label: "Live Ritual Streams" },
    { value: "Free", label: "Temple Registration" },
    { value: "Global", label: "Devotees Welcome" },
    { value: "AI-Powered", label: "Faith-Tech Platform" },
  ];

  return (
    <div
      id="hero-wrapper"
      className={`relative flex flex-col justify-between bg-[#021816] text-white ${isAndroidApp ? "pt-28 pb-12" : "pt-2 pb-6"}`}
      style={{
        // "100vh" not "100svh" — svh is silently dropped on older Android
        // WebView (no collapsing browser chrome inside the app anyway, so
        // vh is accurate here and works on every device).
        minHeight: isAndroidApp ? "100vh" : undefined,
        // "hidden" not "clip" — overflow: clip is unsupported on older
        // Android WebView and gets ignored, letting horizontal overflow
        // through.
        overflowX: "hidden",
        touchAction: "pan-y",
      }}
    >
      
      {/* Cinematic Sacred Banner: aerial Puri Jagannath Temple feel with teal overlays and golden lighting */}
      <div 
        id="hero-cinematic-bg" 
        className="absolute inset-0 bg-cover bg-center pointer-events-none transition-transform duration-1000 filter brightness-45 contrast-[1.03]"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(2, 24, 22, 0.35), rgba(2, 24, 22, 0.8), rgba(2, 24, 22, 1)), url(${aerialJagannathPuri})`
        }}
      />

      {/* Floating Sparkles & Diya lights */}
      <div className="absolute top-1/4 left-10 w-24 h-24 bg-saffron/10 rounded-full filter blur-2xl animate-pulse" />
      <div className="absolute top-1/3 right-10 w-32 h-32 bg-teal-mid/10 rounded-full filter blur-2xl animate-pulse delay-700" />

      {/* Hero Central Content */}
      <div id="hero-main-container" className={`relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-grow flex items-center z-10 ${isAndroidApp ? "pt-8" : "pt-0"}`}>
        <div className="w-full flex justify-center text-center">
          
          {/* Headline and Copy (Centered layout) */}
          <div className={`flex flex-col items-center max-w-4xl mx-auto text-center ${isAndroidApp ? "space-y-6" : "space-y-3"}`}>
            
            {/* Saffron & Teal Badge */}
            <div className="inline-flex items-center space-x-2 bg-white/5 border border-[#5EEAD4]/20 px-3.5 py-1.5 rounded-full text-[#5EEAD4] text-xs font-semibold uppercase tracking-widest animate-fadeIn mx-auto">
              <Sparkles className="w-3.5 h-3.5 text-[#FFB347] fill-[#FFB347]" />
              <span>World's First AI-Powered Faith-Tech Platform</span>
            </div>

            {/* Headline — single line on Android APK; split tagline on website */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-black tracking-tight text-white leading-tight text-center">
              {isAndroidApp ? (
                t.tagline
              ) : (
                <>
                  <span className="block">Faith Beyond Distance.</span>
                  <span className="block text-[#FFB347] mt-1">Blessings Beyond Borders.</span>
                </>
              )}
            </h1>

            {/* Sub-headline */}
            <p className="text-sm sm:text-base text-white/85 font-sans font-normal leading-relaxed max-w-2xl text-center mx-auto">
              Experience sacred rituals, divine temple offerings, and personalized pujas from the most revered temples of India — performed in your name and Gotra with live streaming coordinates.
            </p>

            {/* CTA Option Blocks */}
            <div className={`flex flex-wrap justify-center ${isAndroidApp ? "gap-4 pt-2" : "gap-3 pt-1"}`}>

              {/* 1. Darshan Certificate — teal green */}
              <button
                id="hero-receive-certificate-cta"
                onClick={handleOpenCertificateModal}
                className="bg-[#0F766E] hover:bg-[#0D9488] text-white font-bold text-xs uppercase tracking-widest px-6 py-4 rounded-full shadow-[0_0_18px_rgba(20,184,166,0.35)] hover:shadow-[0_0_24px_rgba(20,184,166,0.55)] transition-all hover:scale-105 flex items-center space-x-2 border border-[#14B8A6]/60 cursor-pointer"
              >
                <Award className="w-4 h-4 text-[#99F6E4]" />
                <span>Receive Darshan Certificate</span>
              </button>

              {/* 2. Setu Yatra Challenge — deep saffron/flame — pulsing attention button */}
              <button
                id="hero-setu-yatra-cta"
                onClick={() => { gaNavClick("setu_yatra_challenge", "hero"); onOpenSetuYatra(); }}
                className="relative bg-gradient-to-r from-[#FF6B00] to-[#FF9900] hover:from-[#FF8C00] hover:to-[#FFB300] text-white font-extrabold text-xs uppercase tracking-widest px-6 py-4 rounded-full transition-all hover:scale-105 flex items-center space-x-2 border border-[#FFD700]/60 cursor-pointer"
                style={{
                  boxShadow: "0 0 20px rgba(255, 107, 0, 0.5), 0 0 40px rgba(255, 107, 0, 0.25)",
                  animation: "setuYatraPulse 2s ease-in-out infinite",
                }}
              >
                {/* Outer glow ring */}
                <span
                  className="absolute inset-0 rounded-full"
                  style={{ animation: "setuYatraRing 2s ease-in-out infinite" }}
                  aria-hidden="true"
                />
                <Flame className="w-4 h-4 text-[#FFD700] shrink-0" style={{ animation: "setuYatraFlicker 1.5s ease-in-out infinite alternate" }} />
                <span>Setu Yatra Challenge</span>
              </button>
            </div>

            {/* Keyframes for the Setu Yatra button pulse — injected once into the document head */}
            <style>{`
              @keyframes setuYatraPulse {
                0%, 100% { box-shadow: 0 0 20px rgba(255,107,0,0.5), 0 0 40px rgba(255,107,0,0.25); transform: scale(1); }
                50%       { box-shadow: 0 0 32px rgba(255,153,0,0.8), 0 0 64px rgba(255,153,0,0.4); transform: scale(1.04); }
              }
              @keyframes setuYatraRing {
                0%, 100% { box-shadow: 0 0 0 0 rgba(255,215,0,0.0); }
                50%       { box-shadow: 0 0 0 6px rgba(255,215,0,0.18); }
              }
              @keyframes setuYatraFlicker {
                0%   { opacity: 1;   transform: rotate(-5deg) scale(1.05); }
                100% { opacity: 0.75; transform: rotate(5deg)  scale(0.95); }
              }
            `}</style>
            
            {/* Secondary note */}
            <div className="text-[11px] text-white/40 font-mono italic text-center">
              * Fast-tracked certifications are managed by our temple partners & Shradhalu Private Ltd.
            </div>
          </div>

        </div>
      </div>

      {/* Floating animated statistics card - Trust Bar Section */}
      <div id="trust-bar-section" className={`relative bg-[#092320]/80 z-10 w-full border-t border-b border-white/10 shadow-lg backdrop-blur-md ${isAndroidApp ? "mt-12 py-6" : "mt-4 py-3"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`grid ${isAndroidApp ? "grid-cols-2" : "grid-cols-3"} sm:grid-cols-4 lg:grid-cols-8 gap-4 text-center items-stretch`}>
            {trustStats.map((stat, i) => (
              <div 
                key={i} 
                id={`stat-card-${i}`}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm transition-transform hover:scale-105"
              >
                <span className="text-lg font-bold text-[#FFB347] font-serif filter drop-shadow">
                  {stat.value}
                </span>
                <span className="text-[10px] text-white/80 font-mono tracking-tight leading-tight break-words mt-1">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SPECIAL INTERACTIVE DARSHAN CERTIFICATE MODAL */}
      {isModalOpen && (
        <div
          id="darshan-modal-portal"
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4 animate-fadeIn"
          style={{ touchAction: "pan-y" }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div
            className="bg-[#092320] border border-white/15 w-full sm:rounded-3xl sm:max-w-xl shadow-2xl animate-slideUp text-white flex flex-col"
            style={{ maxHeight: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Modal Header */}
            <div className="shrink-0 bg-[#021816] text-white px-5 py-4 flex items-center justify-between border-b border-white/10 sm:rounded-t-3xl">
              <div className="flex items-center space-x-3">
                <SriDwarLogo
                  iconSize="sm"
                  showTagline={false}
                  variant="colored"
                  useImageOnly={true}
                  className="shrink-0"
                />
                <div className="text-left">
                  <h3 className="font-serif text-lg font-bold tracking-tight text-white">Sri Dwar Darshan Register</h3>
                  <p className="text-[10px] font-mono text-[#FFB347] uppercase">Handsigned by Revered Pundits</p>
                </div>
              </div>
              <button 
                id="close-certificate-modal"
                onClick={() => setIsModalOpen(false)} 
                className="text-white hover:text-[#FFB347] p-1.5 bg-white/10 rounded-full text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* ── Scrollable body — THE ONLY scroll container on Android ── */}
            <div
              className="flex-1 min-h-0 overflow-y-auto"
              style={{ WebkitOverflowScrolling: "touch", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
            >
            {/* Modal Body: Active Submission Form or Completed Message */}
            {!isSubmitted ? (
              <form onSubmit={handleSubmitCertificate} className="p-6 space-y-4">
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-xs text-[#5EEAD4]">
                  <p className="font-semibold text-left">🙏 Submitting dynamic prayers and details logs:</p>
                  <p className="text-white/70 mt-1 text-left">Fill out the form below to receive a personalized, high-resolution blessed certificate of your visit to download or print.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name field */}
                  <div className="text-left">
                    <label className="block text-xs font-bold text-white/80 mb-1">Devotee Name *</label>
                    <input
                      id="cert-form-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onFocus={() => gaContactFormStart()}
                      placeholder="e.g. Anand Satpathy"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                    />
                  </div>

                  {/* Temple dropdown select */}
                  <div className="text-left">
                    <label className="block text-xs font-bold text-white/80 mb-1">Temple Visited *</label>
                    <select
                      id="cert-form-temple"
                      required
                      value={temple}
                      onChange={(e) => setTemple(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#021816] border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white"
                    >
                      <option value="" className="bg-[#021816]">Select Temple...</option>
                      {TEMPLES_LIST.map((t) => (
                        <option key={t.id} value={t.name} className="bg-[#021816]">{t.name}</option>
                      ))}
                      <option value="Other Temple in India" className="bg-[#021816]">Other Temple — India</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Age field */}
                  <div className="text-left">
                    <label className="block text-xs font-bold text-white/80 mb-1">Age <span className="text-white/40 font-normal">(Optional · 16–100)</span></label>
                    <input
                      id="cert-form-age"
                      type="number"
                      min={16}
                      max={100}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="e.g. 34"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                    />
                  </div>

                  {/* Deity Name */}
                  <div className="text-left">
                    <label className="block text-xs font-bold text-white/80 mb-1">Deity Name</label>
                    <input
                      id="cert-form-deity"
                      type="text"
                      value={deity}
                      onChange={(e) => setDeity(e.target.value)}
                      placeholder="e.g. Shiva, Jagannath, Durga"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Phone Number - MANDATORY */}
                  <div className="text-left">
                    <label className="block text-xs font-bold text-white/80 mb-1">Phone Number * (Mandatory)</label>
                    <input
                      id="cert-form-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Mandatory mobile connection"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                    />
                  </div>

                  {/* WhatsApp Number */}
                  <div className="text-left">
                    <label className="block text-xs font-bold text-white/80 mb-1">WhatsApp Number</label>
                    <input
                      id="cert-form-whatsapp"
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="Optional WhatsApp alerts"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email - MANDATORY */}
                  <div className="text-left">
                    <label className="block text-xs font-bold text-white/80 mb-1">Email Address * (Mandatory)</label>
                    <input
                      id="cert-form-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. name@gmail.com"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                    />
                  </div>

                  {/* City */}
                  <div className="text-left">
                    <label className="block text-xs font-bold text-white/80 mb-1">Devotee City *</label>
                    <input
                      id="cert-form-city"
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Seattle, Mumbai, London"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                    />
                  </div>
                </div>

                {/* Feedback */}
                <div className="text-left">
                  <label className="block text-xs font-bold text-white/80 mb-1">Feedback/Suggestions</label>
                  <textarea
                    id="cert-form-feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={2}
                    placeholder="We appreciate any thoughts on your remote spiritual connection experience..."
                    className="w-full text-xs p-3 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                  />
                </div>

                {/* Optional Darshan Membership Contribution Selection */}
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <span className="block text-xs font-bold text-white/95 mb-2 text-left animate-pulse">
                    🙏 Optional Darshan Membership Contribution
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      id="membership-tier-none"
                      type="button"
                      onClick={() => setMembershipTier(null)}
                      className={`text-left p-3 rounded-xl border text-xs font-medium transition-all ${
                        membershipTier === null 
                          ? "bg-white/10 border-[#5EEAD4] text-[#5EEAD4] shadow-sm" 
                          : "bg-black/20 border-white/10 text-white/70 hover:bg-black/30"
                      }`}
                    >
                      <span className="block font-bold">Skip for Now</span>
                      <span className="block text-[10px] text-white/40">Continue without support</span>
                    </button>

                    <button
                      id="membership-tier-5"
                      type="button"
                      onClick={() => setMembershipTier(5)}
                      className={`text-left p-3 rounded-xl border text-xs font-medium transition-all ${
                        membershipTier === 5 
                          ? "bg-white/10 border-[#5EEAD4] text-[#5EEAD4] shadow-sm" 
                          : "bg-black/20 border-white/10 text-white/70 hover:bg-black/30"
                      }`}
                    >
                      <span className="block font-bold text-saffron">₹5 — member</span>
                      <span className="block text-[10px] text-white/40">Support temple logistics</span>
                    </button>

                    <button
                      id="membership-tier-51"
                      type="button"
                      onClick={() => setMembershipTier(51)}
                      className={`text-left p-3 rounded-xl border text-xs font-medium transition-all ${
                        membershipTier === 51 
                          ? "bg-white/10 border-[#5EEAD4] text-[#5EEAD4] shadow-sm" 
                          : "bg-black/20 border-white/10 text-white/70 hover:bg-black/30"
                      }`}
                    >
                      <span className="block font-bold text-[#FFB347]">₹51 — Supporter</span>
                      <span className="block text-[10px] text-white/40">Help digitize more temples</span>
                    </button>
                  </div>
                </div>

                {/* Real-time sync tracker banner representation */}
                <div className="flex items-center space-x-2 text-[10px] font-mono text-[#5EEAD4] bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                  <Database className="w-3.5 h-3.5 fill-[#5EEAD4]/20 text-[#5EEAD4]" />
                  <span>Powered by Sri Dwar Technology</span>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    id="submit-cert-form"
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-black py-3 px-6 rounded-xl text-xs transition-all tracking-widest uppercase shadow-[0_0_15px_rgba(255,179,71,0.3)] hover:scale-[1.02]"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center space-x-1">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sanctifying Details...</span>
                      </span>
                    ) : (
                      <span>SUBMIT REGISTRATION & GENERATE CERTIFICATE</span>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              // SUBMISSION CONFIRMED POPUP SCREEN
              <div className="p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-[#0F766E]/50 rounded-full flex items-center justify-center mx-auto shadow-inner border border-[#5EEAD4]/35">
                  <Check className="w-8 h-8 text-[#5EEAD4] stroke-[3]" />
                </div>

                <div className="space-y-2">
                  <h4 className="font-serif text-2xl font-bold text-[#5EEAD4]">Blessings Received!</h4>
                  <p className="text-xs text-white/50 uppercase tracking-widest font-mono">Reference ID: {refId}</p>
                </div>

                {/* The Mandatory Confirmation Copy requested by the User */}
                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl text-left text-xs text-white/90 leading-relaxed shadow-sm">
                  <p className="mb-2"><strong>Dear {name},</strong></p>
                  <p className="mb-3">
                    Your request for the Darshan Certificate has been lovingly received by our team of devoted priests and seva coordinators.
                  </p>
                  <p className="mb-4">
                    Like a diya lit with pure intention, your certificate is being handcrafted with sacred blessings and will be delivered to you within 24 hours — straight to your:
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono bg-black/40 p-3 rounded-xl border border-white/10">
                    <div>
                      <span className="block text-base">💬</span>
                      <span className="block font-bold text-emerald-400">WhatsApp</span>
                    </div>
                    <div>
                      <span className="block text-base">✉️</span>
                      <span className="block font-bold text-[#5EEAD4]">Email</span>
                    </div>
                    <div>
                      <span className="block text-base">⏱</span>
                      <span className="block font-bold text-[#FFB347]">Within 24 Hrs</span>
                    </div>
                  </div>
                </div>

                {/* Google Forms Drive Sync report log representation */}
                <div className="flex items-center justify-center space-x-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 py-2 rounded-xl border border-emerald-900/40">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Powered by Sri Dwar Technology</span>
                </div>

                <div className="pt-2">
                  <button
                    id="close-confirmation-modal"
                    onClick={() => setIsModalOpen(false)}
                    className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-bold py-3 rounded-xl text-xs transition-all tracking-wider shadow"
                  >
                    🙏 Jai Jagannath — Close
                  </button>
                </div>
              </div>
            )}

            </div>
          </div>
        </div>
      )}

    {/* UPI Payment Modal for Darshan Certificate contribution */}
    <UPIPaymentModal
      isOpen={showUPI}
      onClose={() => setShowUPI(false)}
      onPaymentConfirmed={handleDarshanPaymentConfirmed}
      amount={upiAmount}
      bookingName="Darshan Certificate Contribution"
      devoteeName={name}
      refId={refId}
    />
    </div>
  );
}
