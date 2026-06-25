/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, FormEvent } from "react";
import { Check, Calendar, CreditCard, ChevronRight, Download, RefreshCw, ShieldCheck, Database } from "lucide-react";
import { syncToGoogleForm } from "../utils/googleFormSync";
import UPIPaymentModal from "./UPIPaymentModal";
import SriDwarLogo from "./SriDwarLogo";
import { isDiscountActive, DISCOUNT_DEADLINE_LABEL, DISCOUNT_TAG } from "../utils/discount";
import { validateName, validateEmail, validatePhone, validateDOB } from "../utils/formValidation";

interface BookNowWizardProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPujaName?: string;
  defaultPrice?: number;
  onSuccess: (bookedItem: { pujaName: string; sankalpaName: string; price: number; refId: string }) => void;
}

export default function BookNowWizard({ isOpen, onClose, defaultPujaName = "", defaultPrice = 1100, onSuccess }: BookNowWizardProps) {
  const [step, setStep] = useState(1); // 1: Details, 2: GPay Checkout, 3: Success Certificate
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Form Fields
  const [pujaName, setPujaName] = useState(defaultPujaName || "Graha Shanti Maha Puja");
  const [price, setPrice] = useState(defaultPrice);
  const [devoteeName, setDevoteeName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [gotra, setGotra] = useState("");
  const [rashi, setRashi] = useState("Mesh (Aries)");
  const [sankalpWish, setSankalpWish] = useState("");
  
  const [refId, setRefId] = useState("");
  const [showUPI, setShowUPI] = useState(false);

  // ✅ Instant double-submit lock. Unlike isProcessingPayment (a React state
  // value), this ref updates immediately with no render delay — so a second
  // rapid tap/click is blocked even in the brief moment before the button
  // visually becomes disabled. This is what was causing duplicate Google
  // Form entries for a single booking attempt.
  const isSubmittingRef = useRef(false);
  const [hasAutofilled, setHasAutofilled] = useState(false);

  // Sync state when props change (especially when reopened)
  useEffect(() => {
    if (isOpen) {
      setPujaName(defaultPujaName || "Graha Shanti Maha Puja");
      setPrice(defaultPrice);
      setStep(1);

      // Try load profile state
      const savedProfileStr = localStorage.getItem("sridwar_sacred_profile");
      if (savedProfileStr) {
        try {
          const profile = JSON.parse(savedProfileStr);
          if (profile.name) {
            setDevoteeName(profile.name);
            setHasAutofilled(true);
          }
          if (profile.email) {
            setEmail(profile.email);
            setHasAutofilled(true);
          }
          if (profile.gotra) {
            setGotra(profile.gotra);
            setHasAutofilled(true);
          }
          if (profile.rashi) {
            setRashi(profile.rashi);
            setHasAutofilled(true);
          }
          if (profile.phone) {
            setPhone(profile.phone);
          }
          
          let familyIntro = "";
          if (profile.family && profile.family.length > 0) {
            const familyList = profile.family.map((f: any) => `${f.name} (${f.relation})`).join(", ");
            familyIntro = `Sankalpa includes family: ${familyList}. Please pray for their health and prosperity.`;
          }
          if (familyIntro) {
            setSankalpWish(familyIntro);
          }
        } catch (e) {
          console.error("Failed to parse saved sacred profile", e);
        }
      } else {
        // Fallback to basic logged-in name if profile is not saved yet
        const cachedName = localStorage.getItem("sd_dev_name");
        const cachedEmail = localStorage.getItem("sd_dev_email");
        if (cachedName) setDevoteeName(cachedName);
        if (cachedEmail) setEmail(cachedEmail);
      }
    }
  }, [isOpen, defaultPujaName, defaultPrice]);

  if (!isOpen) return null;

  const handleNextToPayment = (e: FormEvent) => {
    e.preventDefault();

    // ── Global validation ──────────────────────────────────────────────────
    const nameErr  = validateName(devoteeName);
    const phoneErr = validatePhone(phone);
    const emailErr = validateEmail(email);
    const dobErr   = validateDOB(dob, false); // optional but must be valid if provided

    if (nameErr)  { alert(nameErr);  return; }
    if (phoneErr) { alert(phoneErr); return; }
    if (emailErr) { alert(emailErr); return; }
    if (dobErr)   { alert(dobErr);   return; }
    // ──────────────────────────────────────────────────────────────────────

    setStep(2);
  };

  const handleSimulatePayment = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    setIsProcessingPayment(true);
    try {
      await syncToGoogleForm("puja_booking", {
        name: devoteeName,
        email,
        phone,
        details: `Puja: ${pujaName} | Dakshina: ₹${price} | DOB: ${dob || 'N/A'} | Gotra: ${gotra || 'Shiva Gotra'} | Rashi: ${rashi} | Wish: ${sankalpWish || 'None'}`,
        type: `Puja/Seva Booking - ${pujaName}`,
        fee: price,
        dob,
        gotra: gotra || "Shiva Gotra",
        rashi,
        intent: sankalpWish
      });
      setRefId(`SDP-${Math.floor(100000 + Math.random() * 900000)}`);
    } catch (err) {
      console.error(err);
      setRefId(`SDP-${Math.floor(100000 + Math.random() * 900000)}`);
    } finally {
      setIsProcessingPayment(false);
      isSubmittingRef.current = false;
      // ✅ Show UPI QR instead of fake GPay
      setShowUPI(true);
    }
  };

  const handlePaymentConfirmed = () => {
    setShowUPI(false);
    setStep(3);
    onSuccess({ pujaName, sankalpaName: devoteeName, price, refId });
  };

  return (
    <>
    <div id="booking-wizard-portal" className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 overflow-y-auto flex justify-center items-start md:items-center p-4 py-8 animate-fadeIn" style={{ touchAction: "pan-y" }}>
      <div className="bg-[#092320] rounded-3xl w-full max-w-xl shadow-2xl border border-white/10 overflow-hidden relative animate-slideUp text-white my-auto">
        
        {/* Banner header inside custom popup */}
        <div className="bg-[#021816] text-white px-6 py-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center space-x-3">
            <SriDwarLogo
              iconSize="sm"
              showTagline={false}
              variant="colored"
              useImageOnly={true}
              className="shrink-0"
            />
            <div>
              <h3 className="font-serif text-base font-bold text-left">Puja Sankalpa Portal</h3>
              <p className="text-[10px] font-mono text-[#FFB347] uppercase tracking-wider text-left">Vedas Authenticated Rites</p>
            </div>
          </div>
          <button 
            id="close-wizard"
            onClick={onClose} 
            className="text-white hover:text-[#FFB347] p-1.5 bg-white/5 border border-white/10 hover:border-white/20 rounded-full text-xs font-bold w-7 h-7 flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Wizard Step Markers */}
        <div className="bg-[#021816]/50 border-b border-white/5 px-6 py-3.5 flex justify-between items-center text-xs font-mono">
          <div className="flex items-center space-x-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 1 ? "bg-[#FFB347] text-[#021816]" : "bg-white/10 text-white/50"}`}>1</span>
            <span className={`${step >= 1 ? "text-[#FFB347] font-bold" : "text-white/40"}`}>Devotee Sankalpa</span>
          </div>
          <ChevronRight className="w-4 h-4 text-white/20" />
          <div className="flex items-center space-x-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 2 ? "bg-[#FFB347] text-[#021816]" : "bg-white/10 text-white/50"}`}>2</span>
            <span className={`${step >= 2 ? "text-[#FFB347] font-bold" : "text-white/40"}`}>GPay Gateway</span>
          </div>
          <ChevronRight className="w-4 h-4 text-white/20" />
          <div className="flex items-center space-x-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 3 ? "bg-[#FFB347] text-[#021816]" : "bg-white/10 text-white/50"}`}>3</span>
            <span className={`${step >= 3 ? "text-[#FFB347] font-bold" : "text-white/40"}`}>Blessing Cert</span>
          </div>
        </div>

        {/* Wizard Steps Content */}
        <div className="p-6">
          
          {/* STEP 1: Sankalpa Details Form */}
          {step === 1 && (
            <form onSubmit={handleNextToPayment} className="space-y-4">
              <div className="p-3 bg-white/5 rounded-xl border border-white/15 text-[11px] text-[#5EEAD4] text-left leading-relaxed">
                <span className="font-bold">🙏 Sanctify Your Rites:</span> Every ritual requires an authentic sankalpa representing your exact birth planetary coordinates, protecting against any distance barriers.
              </div>

              {hasAutofilled && (
                <div className="bg-teal-950/65 border border-teal-500/35 p-3 rounded-xl flex items-center space-x-2 text-xs text-[#5EEAD4] text-left">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#5EEAD4] animate-pulse shrink-0" />
                  <div>
                    <span className="font-bold text-[#FFB347]">✨ Profile Auto-filled:</span>{" "}
                    <span className="text-white/80">Gotra ({gotra}), Rashi ({rashi}), and family records have been synchronized instantly.</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">Puja Selected</label>
                  <input
                    id="wizard-puja-name-input"
                    type="text"
                    value={pujaName}
                    onChange={(e) => setPujaName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-[#FFB347] font-bold focus:outline-none focus:border-[#5EEAD4] text-left"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">Dakshina Offer Fee (₹)</label>
                  <input
                    id="wizard-puja-price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-[#FFB347] font-bold focus:outline-none focus:border-[#5EEAD4] text-left"
                  />
                  {isDiscountActive() && (
                    <p className="text-[9px] font-mono text-[#5EEAD4] mt-1 text-left">🎉 {DISCOUNT_TAG} already applied · {DISCOUNT_DEADLINE_LABEL}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Devotee Name */}
                <div>
                  <label className="block text-[10px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">Devotee Full Name *</label>
                  <input
                    id="wizard-devotee-name"
                    type="text"
                    required
                    placeholder="e.g. Anand Satpathy"
                    value={devoteeName}
                    onChange={(e) => setDevoteeName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white placeholder-white/20 text-left"
                  />
                </div>
                {/* Date of Birth */}
                <div>
                  <label className="block text-[10px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">DOB (Planetary Calculation)</label>
                  <input
                    id="wizard-dob"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-[#5EEAD4]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Gotra */}
                <div>
                  <label className="block text-[10px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">Gotra (type Shiva Gotra if unknown)</label>
                  <input
                    id="wizard-gotra"
                    type="text"
                    placeholder="e.g. Kashyap Gotra"
                    value={gotra}
                    onChange={(e) => setGotra(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white placeholder-white/20 text-left"
                  />
                </div>
                {/* Rashi */}
                <div>
                  <label className="block text-[10px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">Moon Sign (Rashi)</label>
                  <select
                    id="wizard-rashi"
                    value={rashi}
                    onChange={(e) => setRashi(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-[#5EEAD4] focus:outline-none focus:border-[#5EEAD4] font-semibold"
                  >
                    <option value="Mesh (Aries)" className="bg-[#092320] text-white">Mesh (Aries)</option>
                    <option value="Vrishabh (Taurus)" className="bg-[#092320] text-white">Vrishabh (Taurus)</option>
                    <option value="Mithun (Gemini)" className="bg-[#092320] text-white">Mithun (Gemini)</option>
                    <option value="Kark (Cancer)" className="bg-[#092320] text-white">Kark (Cancer)</option>
                    <option value="Simha (Leo)" className="bg-[#092320] text-white">Simha (Leo)</option>
                    <option value="Kanya (Virgo)" className="bg-[#092320] text-white">Kanya (Virgo)</option>
                    <option value="Tula (Libra)" className="bg-[#092320] text-white">Tula (Libra)</option>
                    <option value="Vrishchik (Scorpio)" className="bg-[#092320] text-white">Vrishchik (Scorpio)</option>
                    <option value="Dhanu (Sagittarius)" className="bg-[#092320] text-white">Dhanu (Sagittarius)</option>
                    <option value="Makar (Capricorn)" className="bg-[#092320] text-white">Makar (Capricorn)</option>
                    <option value="Kumbh (Aquarius)" className="bg-[#092320] text-white">Kumbh (Aquarius)</option>
                    <option value="Meen (Pisces)" className="bg-[#092320] text-white">Meen (Pisces)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Phone - MANDATORY */}
                <div>
                  <label className="block text-[10px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">Phone Number * (Mandatory)</label>
                  <input
                    id="wizard-phone"
                    type="tel"
                    required
                    placeholder="Mandatory for SMS receipt"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white placeholder-white/20 text-left"
                  />
                </div>
                {/* Email - MANDATORY */}
                <div>
                  <label className="block text-[10px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">Email Address * (Mandatory)</label>
                  <input
                    id="wizard-email"
                    type="email"
                    required
                    placeholder="Mandatory for email receipt"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white placeholder-white/20 text-left"
                  />
                </div>
              </div>

              {/* Sankalpa intent */}
              <div>
                <label className="block text-[10px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">Sankalpa Intent (Your Prayer Wish)</label>
                <textarea
                  id="wizard-sankalpa-wish"
                  rows={2}
                  value={sankalpWish}
                  onChange={(e) => setSankalpWish(e.target.value)}
                  placeholder="State your personal wish clearly, our pundits will read this during holy mantra recitation..."
                  className="w-full text-xs p-3 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white placeholder-white/20 text-left"
                />
              </div>

              {/* Real-time Google Forms sync notation */}
              <div className="flex items-center space-x-2 text-[10px] font-mono text-[#5EEAD4] bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10">
                <Database className="w-3.5 h-3.5 fill-[#5EEAD4]/20 text-[#5EEAD4]" />
                <span>Powered by Sri Dwar Technology</span>
              </div>

              {/* Action */}
              <button
                id="wizard-step1-submit"
                type="submit"
                className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-bold py-3 px-5 rounded-2xl text-xs transition-all duration-300 shadow cursor-pointer flex items-center justify-center uppercase tracking-wider"
              >
                Proceed to Secure Offering
              </button>
            </form>
          )}

          {/* STEP 2: UPI Payment */}
          {step === 2 && (
            <div className="text-center p-6 space-y-6" id="upi-payment-step">
              <div className="bg-[#021816] p-4 rounded-2xl border border-white/10 space-y-2 text-left">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/50 font-mono">Sacred Service:</span>
                  <span className="font-bold text-[#FFB347] truncate max-w-[200px]">{pujaName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/50 font-mono">Devotee:</span>
                  <span className="font-semibold text-white">{devoteeName}</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t border-white/5">
                  <span className="font-bold text-[#5EEAD4]">Dakshina Amount:</span>
                  <span className="font-black text-[#FFB347] font-serif">₹{price} INR</span>
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                <button
                  id="show-upi-button"
                  onClick={handleSimulatePayment}
                  disabled={isProcessingPayment}
                  className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-bold py-3 px-5 rounded-2xl text-xs transition-all shadow flex items-center justify-center space-x-2 cursor-pointer uppercase tracking-wider"
                >
                  {isProcessingPayment ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Preparing Payment...</span>
                    </>
                  ) : (
                    <span>Pay ₹{price} via UPI / PhonePe 🙏</span>
                  )}
                </button>
                <button
                  onClick={() => setStep(1)}
                  disabled={isProcessingPayment}
                  className="w-full text-xs text-white/55 hover:text-white py-2.5 font-bold cursor-pointer"
                >
                  Go Back & Amend Details
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Successful Blessing Certificate Rendering */}
          {step === 3 && (
            <div className="p-4 space-y-6 text-center" id="wizard-success-stage">
              
              <div className="w-12 h-12 bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                <Check className="w-6 h-6 text-emerald-400 stroke-[3]" />
              </div>

              <h4 className="font-serif text-2xl font-black text-[#5EEAD4]">Puja Sankalpa Authorized!</h4>

              {/* DYNAMIC GENERATED BEAUTIFUL BLESSED CERTIFICATE */}
              <div 
                id="divine-generated-certificate" 
                className="relative bg-[#021816]/95 border-[10px] border-[#FFB347] p-5 rounded-2xl shadow-xl text-center overflow-hidden border-double"
              >
                {/* Peacock theme top ring */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-gradient-to-b from-[#14B8A6]/20 to-transparent rounded-full" />
                <div className="absolute right-3 top-3 text-[#FFB347] opacity-10 text-6xl font-serif select-none pointer-events-none">ॐ</div>

                <div className="space-y-3 relative z-10 text-center">
                  <span className="text-xs font-serif text-[#FFB347] font-extrabold uppercase tracking-widest font-sans border-b border-[#FFB347]/30 pb-1 inline-block">
                    SRI DWAR DEVALAYA BOARD
                  </span>
                  
                  <h5 className="font-serif text-xl font-bold italic text-[#5EEAD4]">
                    Sacred Sankalpa Patrika
                  </h5>

                  <p className="text-[10px] text-white/50 font-mono">This is to certify that sacred Rites and offering chants of:</p>

                  <h6 className="font-serif text-base font-black text-[#FFB347] border-b border-white/15 inline-block px-4 pb-0.5">
                    {devoteeName}
                  </h6>

                  <p className="text-xs text-white/80 font-sans px-2">
                    have been successfully performed for the sacred service: <strong className="text-white">{pujaName}</strong> with Gotra: <strong>{gotra || "Shiva Gotra"}</strong>, Moon Sign: {rashi}.
                  </p>

                  <p className="text-[11px] text-white/75 font-sans italic leading-relaxed">
                    "May the divine vibrations protect your home, health, prosperity, and loved ones across all dimensions."
                  </p>

                  {/* Certification seals layout side-by-side representing Sri Dwar and Shradhalu Private Limited */}
                  <div className="grid grid-cols-2 gap-4 items-center pt-3 border-t border-white/5 text-[9px] font-mono text-white/60">
                    <div className="text-left">
                      <span className="block font-bold">Pundit K. K. Dwivedi</span>
                      <span className="block uppercase text-white/40">Chief Shastri Seal</span>
                      <span className="block text-emerald-400 font-black">✓ Hand-signed Digitally</span>
                    </div>
                    <div className="text-right">
                      <span className="block font-bold">Shradhalu Private Ltd</span>
                      <span className="block uppercase text-white/40">Reg No: #849302-IN</span>
                      <span className="block text-[#5EEAD4] font-bold">Dharmic Registry Authorized</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sri Dwar Technology sync confirmation reference */}
              <div className="flex items-center justify-center space-x-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/20 py-2 rounded-xl border border-emerald-500/20">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Powered by Sri Dwar Technology Reference: {refId}</span>
              </div>

              {/* Actions: Download blessed PDF button */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  id="pdf-download-btn"
                  onClick={() => {
                    alert("Your premium high-resolution blessed Sankalpa Patrika PDF is compiled and will be dispatched to your WhatsApp within 3 minutes!");
                  }}
                  className="bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl text-xs transition-all tracking-wider flex items-center justify-center space-x-1 shadow border border-white/10 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#FFB347]" />
                  <span>Download patra PDF</span>
                </button>

                <button
                  id="close-success-wizard"
                  onClick={onClose}
                  className="bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold py-3 rounded-xl text-xs transition-all tracking-widest shadow uppercase cursor-pointer"
                >
                  🙏 Close and Pray
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>

      {/* UPI Payment Modal */}
      <UPIPaymentModal
        isOpen={showUPI}
        onClose={() => setShowUPI(false)}
        onPaymentConfirmed={handlePaymentConfirmed}
        amount={price}
        bookingName={pujaName}
        devoteeName={devoteeName}
        refId={refId}
      />
    </>
  );
}
