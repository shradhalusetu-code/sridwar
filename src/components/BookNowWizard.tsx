/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, FormEvent } from "react";
import { Check, ChevronRight, Download, RefreshCw, ShieldCheck, Database } from "lucide-react";
import { syncToGoogleForm } from "../utils/googleFormSync";
import UPIPaymentModal from "./UPIPaymentModal";
import SriDwarLogo from "./SriDwarLogo";
import { isDiscountActive, DISCOUNT_TAG } from "../utils/discount";
import { validateName, validateEmail, validatePhone, validateDOB } from "../utils/formValidation";
import { gaBookNowOpen, gaBookingDetailsSubmit, gaCheckoutInitiate, gaBookingComplete, gaCertificateAction } from "../utils/analytics";

interface BookNowWizardProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPujaName?: string;
  defaultPrice?: number;
  onSuccess: (bookedItem: { pujaName: string; sankalpaName: string; price: number; refId: string }) => void;
}

export default function BookNowWizard({ isOpen, onClose, defaultPujaName = "", defaultPrice = 1100, onSuccess }: BookNowWizardProps) {
  const [step, setStep] = useState(1); // 1: Details, 2: Payment, 3: Certificate
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isSyncingDetails, setIsSyncingDetails] = useState(false);

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
  const [hasAutofilled, setHasAutofilled] = useState(false);

  // Double-submit lock — ref so it fires before re-render
  const isSubmittingRef = useRef(false);
  // Post-payment guard — prevents useEffect resetting Step 3 back to Step 1
  const paymentCompletedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      if (paymentCompletedRef.current) return; // already completed — keep Step 3

      setPujaName(defaultPujaName || "Graha Shanti Maha Puja");
      setPrice(defaultPrice);
      setStep(1);
      gaBookNowOpen(defaultPujaName || "Graha Shanti Maha Puja", defaultPrice);

      const savedProfileStr = localStorage.getItem("sridwar_sacred_profile");
      if (savedProfileStr) {
        try {
          const profile = JSON.parse(savedProfileStr);
          if (profile.name)  { setDevoteeName(profile.name);  setHasAutofilled(true); }
          if (profile.email) { setEmail(profile.email);       setHasAutofilled(true); }
          if (profile.gotra) { setGotra(profile.gotra);       setHasAutofilled(true); }
          if (profile.rashi) { setRashi(profile.rashi);       setHasAutofilled(true); }
          if (profile.phone) { setPhone(profile.phone); }
          if (profile.family?.length) {
            const list = profile.family.map((f: any) => `${f.name} (${f.relation})`).join(", ");
            setSankalpWish(`Sankalpa includes family: ${list}. Please pray for their health and prosperity.`);
          }
        } catch (e) { console.error("Failed to parse sacred profile", e); }
      } else {
        const cachedName  = localStorage.getItem("sd_dev_name");
        const cachedEmail = localStorage.getItem("sd_dev_email");
        if (cachedName)  setDevoteeName(cachedName);
        if (cachedEmail) setEmail(cachedEmail);
      }
    }
  }, [isOpen, defaultPujaName, defaultPrice]);

  if (!isOpen) return null;

  // Step 1 → Step 2: the instant the devotee's details are validated and
  // they proceed toward payment, sync the FIRST (and only "pending") row to
  // Google Forms with their real entered data and a payment status of
  // "Pending — Awaiting Confirmation". This guarantees the lead is captured
  // even if the devotee closes the tab before paying. The Final row (same
  // Ref ID) is sent exactly once more, from handlePaymentConfirmed below,
  // with only the payment/donation details corrected — no duplicate rows.
  const handleNextToPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    const nameErr  = validateName(devoteeName);
    const phoneErr = validatePhone(phone);
    const emailErr = validateEmail(email);
    const dobErr   = validateDOB(dob, false);
    if (nameErr)  { alert(nameErr);  return; }
    if (phoneErr) { alert(phoneErr); return; }
    if (emailErr) { alert(emailErr); return; }
    if (dobErr)   { alert(dobErr);   return; }
    gaBookingDetailsSubmit(pujaName, price);

    isSubmittingRef.current = true;
    setIsSyncingDetails(true);
    const newRefId = `SDP-${Math.floor(100000 + Math.random() * 900000)}`;
    setRefId(newRefId);
    try {
      await syncToGoogleForm("puja_booking", {
        name: devoteeName, email, phone,
        details: `Puja: ${pujaName} | Dakshina: ₹${price} | Payment Status: Pending — Awaiting Confirmation | DOB: ${dob || "N/A"} | Gotra: ${gotra || "Shiva Gotra"} | Rashi: ${rashi} | Wish: ${sankalpWish || "None"} | Ref: ${newRefId}`,
        type: `Puja/Seva Booking - ${pujaName}`,
        fee: price, dob, gotra: gotra || "Shiva Gotra", rashi, intent: sankalpWish,
      });
    } catch (err) {
      console.error(err);
    } finally {
      isSubmittingRef.current = false;
      setIsSyncingDetails(false);
      setStep(2);
    }
  };

  const handleSimulatePayment = () => {
    gaCheckoutInitiate(pujaName, price, "UPI");
    setShowUPI(true);
  };

  // Payment confirmed in the UPI modal — sends the ONE Final row for this
  // booking, sharing the same Ref ID, with payment status corrected to
  // "Paid — Confirmed" and the real payment method.
  const handlePaymentConfirmed = (details: { amount: number; method: "UPI" | "WhatsApp Pay" }) => {
    paymentCompletedRef.current = true; // lock — do not reset to Step 1
    setShowUPI(false);
    setStep(3);
    gaBookingComplete(pujaName, details.amount, refId);
    syncToGoogleForm("puja_booking", {
      name: devoteeName, email, phone,
      details: `Puja: ${pujaName} | Dakshina: ₹${details.amount} | Payment Status: Paid — Confirmed | Payment Method: ${details.method} | DOB: ${dob || "N/A"} | Gotra: ${gotra || "Shiva Gotra"} | Rashi: ${rashi} | Wish: ${sankalpWish || "None"} | Ref: ${refId}`,
      type: `Puja/Seva Booking - ${pujaName}`,
      fee: details.amount, dob, gotra: gotra || "Shiva Gotra", rashi, intent: sankalpWish,
    });
    onSuccess({ pujaName, sankalpaName: devoteeName, price: details.amount, refId });
  };

  const handleClose = () => {
    paymentCompletedRef.current = false; // reset for next fresh booking
    isSubmittingRef.current = false;
    onClose();
  };

  // ─── Shared sticky header pieces ────────────────────────────────────────
  const Header = (
    <div className="shrink-0 bg-[#021816] border-b border-white/10">
      {/* Brand bar */}
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <SriDwarLogo iconSize="sm" showTagline={false} variant="colored" useImageOnly={true} className="shrink-0" />
          <div>
            <h3 className="font-serif text-base font-bold text-left text-white">Puja Sankalpa Portal</h3>
            <p className="text-[10px] font-mono text-[#FFB347] uppercase tracking-wider text-left">Vedic Rites, Followed Faithfully</p>
          </div>
        </div>
        <button
          id="close-wizard"
          onClick={handleClose}
          className="text-white hover:text-[#FFB347] p-1.5 bg-white/5 border border-white/10 hover:border-white/20 rounded-full text-xs font-bold w-7 h-7 flex items-center justify-center cursor-pointer shrink-0"
        >✕</button>
      </div>
      <div className="bg-[#021816]/50 border-t border-white/5 px-5 py-3 flex justify-between items-center text-xs font-mono">
        {[
          { n: 1, label: "Devotee Sankalpa" },
          { n: 2, label: "GPay Gateway" },
          { n: 3, label: "Blessing Cert" },
        ].map(({ n, label }, i, arr) => (
          <div key={n} className="flex items-center space-x-1">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${step >= n ? "bg-[#FFB347] text-[#021816]" : "bg-white/10 text-white/50"}`}>{n}</span>
            <span className={`hidden sm:inline ${step >= n ? "text-[#FFB347] font-bold" : "text-white/40"}`}>{label}</span>
            {i < arr.length - 1 && <ChevronRight className="w-4 h-4 text-white/20 shrink-0 ml-1" />}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/*
        ── Android-safe modal layout ──────────────────────────────────────────
        OUTER: fixed full-screen backdrop, flex column, overflow HIDDEN.
                NO scroll here — prevents the dual-scroll trap on Android WebView.
        INNER card: flex column, fills available height via flex-1.
                    The ONLY scroll container is the form body inside.
        ──────────────────────────────────────────────────────────────────────
      */}
      <div
        id="booking-wizard-portal"
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4 animate-fadeIn"
        style={{ touchAction: "pan-y" }}
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <div
          className="bg-[#092320] w-full sm:rounded-3xl sm:max-w-xl shadow-2xl border border-white/10 animate-slideUp text-white flex flex-col"
          style={{
            // Percentage (not dvh — unsupported on older Android WebView, where the
            // property is silently dropped and the card can grow past the screen)
            // resolves against the fixed inset-0 parent's real, definite height, so
            // it stays correct even as the viewport resizes for the keyboard.
            maxHeight: "100%",
            // On sm+ screens already constrained by p-4 on outer
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Sticky header (never scrolls) ── */}
          {Header}

          {/* ── Scrollable body — THE ONLY scroll container ── */}
          <div
            className="flex-1 min-h-0 overflow-y-auto"
            style={{
              WebkitOverflowScrolling: "touch",
              // Bottom padding clears Android nav bar + extra buffer for submit button
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
            }}
          >
            <div className="p-5 sm:p-6">

              {/* ── STEP 1: Sankalpa Details Form ── */}
              {step === 1 && (
                <form onSubmit={handleNextToPayment} className="space-y-4">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/15 text-[11px] text-[#5EEAD4] text-left leading-relaxed">
                    <span className="font-bold">🙏 Sanctify Your Rites:</span> Every ritual requires a heartfelt sankalpa representing your exact birth planetary coordinates, protecting against any distance barriers.
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
                      <input id="wizard-puja-name-input" type="text" value={pujaName} onChange={(e) => setPujaName(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-[#FFB347] font-bold focus:outline-none focus:border-[#5EEAD4] text-left" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">Dakshina Offer Fee (₹)</label>
                      <input id="wizard-puja-price" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-[#FFB347] font-bold focus:outline-none focus:border-[#5EEAD4] text-left" />
                      {isDiscountActive() && (
                        <p className="text-[9px] font-mono text-[#5EEAD4] mt-1 text-left">🎉 {DISCOUNT_TAG} already applied</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">Devotee Full Name *</label>
                      <input id="wizard-devotee-name" type="text" required placeholder="e.g. Anand Satpathy" value={devoteeName} onChange={(e) => setDevoteeName(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white placeholder-white/20 text-left" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">DOB (Planetary Calculation)</label>
                      <input id="wizard-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-[#5EEAD4]" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">Gotra (type Shiva Gotra if unknown)</label>
                      <input id="wizard-gotra" type="text" placeholder="e.g. Kashyap Gotra" value={gotra} onChange={(e) => setGotra(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white placeholder-white/20 text-left" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">Moon Sign (Rashi)</label>
                      <select id="wizard-rashi" value={rashi} onChange={(e) => setRashi(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-[#5EEAD4] focus:outline-none focus:border-[#5EEAD4] font-semibold">
                        {["Mesh (Aries)","Vrishabh (Taurus)","Mithun (Gemini)","Kark (Cancer)","Simha (Leo)","Kanya (Virgo)","Tula (Libra)","Vrishchik (Scorpio)","Dhanu (Sagittarius)","Makar (Capricorn)","Kumbh (Aquarius)","Meen (Pisces)"].map(r => (
                          <option key={r} value={r} className="bg-[#092320] text-white">{r}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">Phone Number * (Mandatory)</label>
                      <input id="wizard-phone" type="tel" required placeholder="Mandatory for SMS receipt" value={phone} onChange={(e) => setPhone(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white placeholder-white/20 text-left" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">Email Address * (Mandatory)</label>
                      <input id="wizard-email" type="email" required placeholder="Mandatory for email receipt" value={email} onChange={(e) => setEmail(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white placeholder-white/20 text-left" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">Sankalpa Intent (Your Prayer Wish)</label>
                    <textarea id="wizard-sankalpa-wish" rows={2} value={sankalpWish} onChange={(e) => setSankalpWish(e.target.value)}
                      placeholder="State your personal wish clearly, our pundits will read this during holy mantra recitation..."
                      className="w-full text-xs p-3 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white placeholder-white/20 text-left" />
                  </div>

                  <div className="flex items-center space-x-2 text-[10px] font-mono text-[#5EEAD4] bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10">
                    <Database className="w-3.5 h-3.5 fill-[#5EEAD4]/20 text-[#5EEAD4]" />
                    <span>Powered by Sri Dwar Technology</span>
                  </div>

                  <button id="wizard-step1-submit" type="submit" disabled={isSyncingDetails}
                    className="w-full bg-[#FFB347] hover:bg-[#F27D26] disabled:opacity-60 disabled:cursor-not-allowed text-[#021816] font-bold py-3.5 px-5 rounded-2xl text-xs transition-all duration-300 shadow cursor-pointer flex items-center justify-center uppercase tracking-wider">
                    {isSyncingDetails ? "Saving Your Details…" : "Proceed to Secure Offering"}
                  </button>
                </form>
              )}

              {/* ── STEP 2: Payment summary + UPI trigger ── */}
              {step === 2 && (
                <div className="space-y-6" id="upi-payment-step">
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
                    <button id="show-upi-button" onClick={handleSimulatePayment} disabled={isProcessingPayment}
                      className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-bold py-3.5 px-5 rounded-2xl text-xs transition-all shadow flex items-center justify-center space-x-2 cursor-pointer uppercase tracking-wider">
                      {isProcessingPayment
                        ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Preparing Payment...</span></>
                        : <span>Pay ₹{price} via UPI / PhonePe 🙏</span>}
                    </button>
                    <button onClick={() => setStep(1)} disabled={isProcessingPayment}
                      className="w-full text-xs text-white/55 hover:text-white py-2.5 font-bold cursor-pointer">
                      Go Back & Amend Details
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Blessing Certificate ── */}
              {step === 3 && (
                <div className="space-y-6 text-center" id="wizard-success-stage">
                  <div className="w-12 h-12 bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                    <Check className="w-6 h-6 text-emerald-400 stroke-[3]" />
                  </div>
                  <h4 className="font-serif text-2xl font-black text-[#5EEAD4]">Puja Sankalpa Authorized!</h4>
                  <div id="divine-generated-certificate" className="relative bg-[#021816]/95 border-[10px] border-[#FFB347] p-5 rounded-2xl shadow-xl text-center overflow-hidden border-double">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-gradient-to-b from-[#14B8A6]/20 to-transparent rounded-full" />
                    <div className="absolute right-3 top-3 text-[#FFB347] opacity-10 text-6xl font-serif select-none pointer-events-none">ॐ</div>
                    <div className="space-y-3 relative z-10 text-center">
                      <div className="border-b border-[#FFB347]/30 pb-1.5 inline-flex justify-center">
                        <SriDwarLogo iconSize="sm" showTagline={false} variant="colored" useImageOnly={true} className="justify-center" />
                      </div>
                      <h5 className="font-serif text-xl font-bold italic text-[#5EEAD4]">Sacred Sankalpa Patrika</h5>
                      <p className="text-[10px] text-white/50 font-mono">This is to certify that sacred Rites and offering chants of:</p>
                      <h6 className="font-serif text-base font-black text-[#FFB347] border-b border-white/15 inline-block px-4 pb-0.5">{devoteeName}</h6>
                      <p className="text-xs text-white/80 font-sans px-2">
                        have been successfully performed for the sacred service: <strong className="text-white">{pujaName}</strong> with Gotra: <strong>{gotra || "Shiva Gotra"}</strong>, Moon Sign: {rashi}.
                      </p>
                      <p className="text-[11px] text-white/75 font-sans italic leading-relaxed">
                        "May the divine vibrations protect your home, health, prosperity, and loved ones across all dimensions."
                      </p>
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
                  <div className="flex items-center justify-center space-x-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/20 py-2 rounded-xl border border-emerald-500/20">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Powered by Sri Dwar Technology Reference: {refId}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button id="pdf-download-btn" onClick={() => { gaCertificateAction("download", refId); alert("Your premium high-resolution blessed Sankalpa Patrika PDF is compiled and will be dispatched to your WhatsApp within 24 hours!"); }}
                      className="bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl text-xs transition-all tracking-wider flex items-center justify-center space-x-1 shadow border border-white/10 cursor-pointer">
                      <Download className="w-3.5 h-3.5 text-[#FFB347]" />
                      <span>Download patra PDF</span>
                    </button>
                    <button id="close-success-wizard" onClick={handleClose}
                      className="bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold py-3 rounded-xl text-xs transition-all tracking-widest shadow uppercase cursor-pointer">
                      🙏 Close and Pray
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

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
