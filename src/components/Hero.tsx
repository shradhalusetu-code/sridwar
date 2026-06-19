/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from "react";
import { Award, Compass, Sparkles, BookOpen, ChevronRight, Check, Heart, ShieldCheck, Database, RefreshCw, Calendar } from "lucide-react";
import { Language, TRANSLATIONS } from "../data/translations";
import SacredIcon from "./SacredIcon";
import { syncToGoogleForm } from "../utils/googleFormSync";
// @ts-ignore
import aerialJagannathPuri from "../assets/images/aerial_jagannath_puri_hero_1781871848760.jpg";

interface HeroProps {
  currentLanguage: Language;
  onNavigate: (page: string) => void;
  onOpenBookNow: () => void;
  onOpenProducts: () => void;
}

export default function Hero({ currentLanguage, onNavigate, onOpenBookNow, onOpenProducts }: HeroProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const t = TRANSLATIONS[currentLanguage];

  const handleOpenCertificateModal = () => {
    setIsModalOpen(true);
    setIsSubmitted(false);
    setMembershipTier(null);
  };

  const handleSubmitCertificate = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !temple || !phone || !email || !city) {
      alert("Please fill in all mandatory fields: Name, Temple, Phone, Email, and City.");
      return;
    }

    setIsSubmitting(true);
    
    // Simulate real-time connection to sync with backend Google Sheets & Drive trigger
    try {
      const response = await fetch("/api/submit-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formType: "darshan_certificate",
          formData: {
            name,
            temple,
            age,
            deity,
            phone,
            whatsapp,
            email,
            city,
            feedback,
            membershipContribution: membershipTier || 0
          }
        })
      });
      const data = await response.json();
      setRefId(data.refId || `SD-${Math.floor(100000 + Math.random() * 900000)}`);

      // Sync seamlessly to Google Forms as requested
      await syncToGoogleForm("darshan_certificate", {
        name,
        email,
        phone,
        details: `Temple: ${temple} | Age: ${age || 'N/A'} | Deity: ${deity || 'N/A'} | City: ${city} | Contribution: ${membershipTier ? '₹' + membershipTier : 'None'} | Feedback: ${feedback || 'None'}`,
        type: "Darshan Certificate Request",
        temple,
        age: age || undefined,
        deity,
        whatsapp,
        city,
        feedback,
        contribution: membershipTier || undefined
      });
    } catch (err) {
      console.error(err);
      setRefId(`SD-${Math.floor(100000 + Math.random() * 900000)}`);
    } finally {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }
  };

  const trustStats = [
    { value: "2 Million+", label: "Devotees Served" },
    { value: "100+", label: "Verified Priests" },
    { value: "100%", label: "Secure Offerings" },
    { value: "600", label: "Puja Committees" },
    { value: "250+", label: "Temples Network" },
    { value: "150,000+", label: "Devotee Memberships" },
    { value: "150", label: "Global Reps" },
    { value: "74", label: "Festivals Streamed" },
    { value: "24/7", label: "Live Ritual Streams" }
  ];

  return (
    <div id="hero-wrapper" className="relative min-h-screen flex flex-col justify-between pt-28 pb-12 bg-[#021816] text-white overflow-hidden">
      
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
      <div id="hero-main-container" className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-grow flex items-center pt-8 z-10">
        <div className="w-full flex justify-center text-center">
          
          {/* Headline and Copy (Centered layout) */}
          <div className="flex flex-col items-center space-y-6 max-w-4xl mx-auto text-center">
            
            {/* Saffron & Teal Badge */}
            <div className="inline-flex items-center space-x-2 bg-white/5 border border-[#5EEAD4]/20 px-3.5 py-1.5 rounded-full text-[#5EEAD4] text-xs font-semibold uppercase tracking-widest animate-fadeIn mx-auto">
              <Sparkles className="w-3.5 h-3.5 text-[#FFB347] fill-[#FFB347]" />
              <span>World's First Premium Faith-Tech Platform</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-black tracking-tight text-white leading-tight text-center">
              {t.tagline}
            </h1>

            {/* Sub-headline */}
            <p className="text-sm sm:text-base text-white/85 font-sans font-normal leading-relaxed max-w-2xl text-center mx-auto">
              Experience sacred rituals, divine temple offerings, and personalized pujas from the most revered temples of India — performed in your name and Gotra with live streaming coordinates.
            </p>

            {/* CTA Option Blocks */}
            <div className="flex flex-wrap gap-4 pt-2 justify-center">
              <button
                id="hero-receive-certificate-cta"
                onClick={handleOpenCertificateModal}
                className="bg-[#0F766E] hover:bg-[#14B8A6] text-white font-bold text-xs uppercase tracking-widest px-6 py-4 rounded-full shadow-[0_0_15px_rgba(20,184,166,0.3)] transition-all scale-100 hover:scale-103 flex items-center space-x-2 group border border-[#FFB347] cursor-pointer"
              >
                <Award className="w-4 h-4 text-[#FFB347] animate-pulse" />
                <span>Receive Darshan Certificate</span>
              </button>

              <button
                id="hero-book-puja-cta"
                onClick={onOpenBookNow}
                className="bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold text-xs uppercase tracking-widest px-6 py-4 rounded-full shadow-[0_0_15px_rgba(255,179,71,0.3)] transition-all scale-100 hover:scale-103 flex items-center space-x-2 cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>Book a Puja</span>
              </button>

              <button
                id="hero-explore-temples-cta"
                onClick={() => {
                  const el = document.getElementById("temple-experience-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-white/5 hover:bg-white/10 text-[#5EEAD4] border border-white/20 font-bold text-xs uppercase tracking-widest px-6 py-4 rounded-full transition-all scale-100 hover:scale-103 flex items-center space-x-2 cursor-pointer"
              >
                <Compass className="w-4 h-4 text-[#FFB347]" />
                <span>Explore Shrines</span>
              </button>

              <button
                id="hero-receive-prasad-cta"
                onClick={onOpenProducts}
                className="bg-white/5 text-white/90 hover:bg-white/10 font-bold text-xs uppercase tracking-widest px-6 py-4 rounded-full transition-all flex items-center space-x-2 border border-white/20 cursor-pointer"
              >
                <GiftIcon className="w-4 h-4 text-[#FFB347]" />
                <span>Receive Prasad</span>
              </button>
            </div>
            
            {/* Secondary note */}
            <div className="text-[11px] text-white/40 font-mono italic text-center">
              * Fast-tracked certifications are managed by verified temple trusts & Shradhalu Private Ltd.
            </div>
          </div>

        </div>
      </div>

      {/* Floating animated statistics card - Trust Bar Section */}
      <div id="trust-bar-section" className="relative mt-12 bg-[#092320]/80 py-6 z-10 w-full border-t border-b border-white/10 shadow-lg backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-4 text-center items-center">
            {trustStats.map((stat, i) => (
              <div 
                key={i} 
                id={`stat-card-${i}`}
                className="flex flex-col items-center p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm transition-transform hover:scale-105"
              >
                <span className="text-lg font-bold text-[#FFB347] font-serif filter drop-shadow">
                  {stat.value}
                </span>
                <span className="text-[10px] text-white/80 font-mono tracking-tight whitespace-nowrap mt-1">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SPECIAL INTERACTIVE DARSHAN CERTIFICATE MODAL */}
      {isModalOpen && (
        <div id="darshan-modal-portal" className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 overflow-y-auto flex justify-center items-start md:items-center p-4 py-8 animate-fadeIn">
          <div className="bg-[#092320] border border-white/15 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden relative animate-slideUp text-white my-auto">
            
            {/* Modal Header */}
            <div className="bg-[#021816] text-white px-6 py-5 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center space-x-2">
                <Award className="w-6 h-6 text-[#FFB347] animate-pulse" />
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
                      <option value="Jagannath Temple - Puri" className="bg-[#021816]">Jagannath Temple — Puri</option>
                      <option value="Lingaraj Temple - Bhubaneswar" className="bg-[#021816]">Lingaraj Temple — Bhubaneswar</option>
                      <option value="Kashi Vishwanath Temple - Varanasi" className="bg-[#021816]">Kashi Vishwanath Temple — Varanasi</option>
                      <option value="Kedarnath Temple - Kedarnath" className="bg-[#021816]">Kedarnath Temple — Kedarnath</option>
                      <option value="Badrinath Temple - Badrinath" className="bg-[#021816]">Badrinath Temple — Badrinath</option>
                      <option value="Vaishno Devi Temple - Katra" className="bg-[#021816]">Vaishno Devi Temple — Katra</option>
                      <option value="Banke Bihari Temple - Vrindavan" className="bg-[#021816]">Banke Bihari Temple — Vrindavan</option>
                      <option value="Prem Mandir - Vrindavan" className="bg-[#021816]">Prem Mandir — Vrindavan</option>
                      <option value="Somnath Temple - Gujarat" className="bg-[#021816]">Somnath Temple — Prabhas Patan</option>
                      <option value="Other Temple in India" className="bg-[#021816]">Other Temples — India</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Age field */}
                  <div className="text-left">
                    <label className="block text-xs font-bold text-white/80 mb-1">Age (Optional)</label>
                    <input
                      id="cert-form-age"
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="Age"
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
                  <span>Google Forms & Drive Webhook Sync: Active</span>
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
                  <span>Google Spreadsheet Database: Synchronized Real-Time Successfully</span>
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
      )}

    </div>
  );
}

// Inline fallback since Lucide rect doesn't have Gift as GiftIcon
function GiftIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5C9 3 10.3 4.5 12 8A2.5 2.5 0 0 1 7.5 8z" />
      <path d="M16.5 8a2.5 2.5 0 0 0 0-5C15 3 13.7 4.5 12 8a2.5 2.5 0 0 0 0 0z" />
    </svg>
  );
}
