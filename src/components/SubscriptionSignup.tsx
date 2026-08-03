/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Subscription Signup — the flow that runs when a devotee/pujari/mandal/
 * yoga guru/dharmic expert/seva provider taps a plan CTA in ReferAndEarn.tsx.
 *
 *   Step 1 (Details)  → services/activities, geography, expertise/background,
 *                        plus contact details. Captured to Supabase
 *                        (form_submissions) AND synced to Google Forms the
 *                        instant "Continue" is tapped — exactly like every
 *                        other multi-step flow in the app (BookNowWizard,
 *                        TempleRegister) — so the lead is never lost even if
 *                        the devotee closes the tab before paying.
 *   Step 2 (Payment)  → routes to Sri Dwar's payment gateway (UPIPaymentModal
 *                        — the same UPI/PhonePe/GPay/Paytm gateway used by
 *                        every other checkout in the app) pre-filled with the
 *                        correct amount for the selected plan + billing
 *                        cycle. Free-tier plans (₹0) skip this step entirely
 *                        and activate immediately.
 *   Step 3 (Confirmed)→ success screen; WhatsApp + Google Forms + Supabase
 *                        activities ledger + the Dharmic ID referral profile
 *                        (subscription_tier/billing_cycle) are all updated.
 *
 * This is purely additive: it doesn't touch puja/seva booking, temple
 * registration, or any existing referral-dashboard code paths.
 */

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ChevronRight, Check, ShieldCheck, MapPin, Sparkles } from "lucide-react";
import SriDwarLogo from "./SriDwarLogo";
import UPIPaymentModal from "./UPIPaymentModal";
import { syncToGoogleForm } from "../utils/googleFormSync";
import { recordFormSubmission, recordActivity } from "../lib/activities";
import { activateSubscriptionTier, type SubscriptionTierId } from "../lib/referrals";
import { isDevoteeTier, type PlanCategoryId, type DevoteeReferralTier, type ProviderCategoryTier } from "../data/referralProgram";
import { validateName, validateEmail, validatePhone, validatePincode, firstError } from "../utils/formValidation";
import { gaEvent } from "../utils/analytics";

const OWNER_WHATSAPP_NUMBER = "919777645062";

const SERVICE_OPTIONS: Record<PlanCategoryId, string[]> = {
  devotee: ["Puja Bookings", "Seva & Contributions", "Live Darshan", "Prasad Delivery", "Astrology Consultations", "Community Events"],
  pujari: ["Home Visit Pujas", "Temple Rituals", "Weddings & Muhurat", "Yagna & Havan", "Griha Pravesh", "Satyanarayan Katha"],
  mandal: ["Festival Events", "Pandal Organizing", "Processions", "Sponsorship Drives", "Volunteer Coordination", "Prasad Distribution"],
  yogaguru: ["Group Classes", "Personalized Programs", "Retreats", "Teacher Training", "Meditation Sessions", "Corporate Wellness"],
  expert: ["Astrology Readings", "Vastu Consultation", "Numerology", "Spiritual Counseling", "Palmistry", "Kundali Matching"],
  seva: ["Annadanam Drives", "Prasad Distribution", "Disaster Relief", "Volunteer Coordination", "Contribution Collection", "Community Welfare"],
};

const SERVICES_LABEL: Record<PlanCategoryId, string> = {
  devotee: "What will you mainly refer or share? (optional)",
  pujari: "Services You'll Offer *",
  mandal: "Events & Activities You'll List *",
  yogaguru: "Classes & Programs You'll Offer *",
  expert: "Consultations You'll Offer *",
  seva: "Seva Activities You'll Run *",
};

const EXPERTISE_LABEL: Record<PlanCategoryId, string> = {
  devotee: "Tell us a bit about yourself (optional)",
  pujari: "Your priestly experience & specializations (years practicing, traditions, languages)",
  mandal: "Your mandal's history & typical festival scale (years active, typical footfall)",
  yogaguru: "Your yoga certifications, lineage & specialties",
  expert: "Your consulting background & credentials",
  seva: "Your NGO/seva group's focus, registration status & typical scale",
};

const EXPERTISE_PLACEHOLDER: Record<PlanCategoryId, string> = {
  devotee: "e.g. Active in my local puja mandal, share updates with family & friends...",
  pujari: "e.g. 12 years as a Vedic priest, trained in Odia & Sanskrit traditions...",
  mandal: "e.g. Running Durga Puja celebrations since 2015, avg. 2,000 footfall/day...",
  yogaguru: "e.g. RYT-500 certified, 8 years teaching Hatha & Vinyasa...",
  expert: "e.g. Jyotish Acharya, 15 years of Vedic astrology consulting...",
  seva: "e.g. Registered NGO since 2018, serve ~500 families/month across 3 blocks...",
};

type Step = 1 | 2 | 3;
type BillingCycle = "monthly" | "annual";

interface SubscriptionSignupProps {
  isOpen: boolean;
  onClose: () => void;
  category: PlanCategoryId;
  categoryLabel: string;
  tier: DevoteeReferralTier | ProviderCategoryTier;
  billing: BillingCycle;
  userProfile?: { name: string; email: string };
}

export default function SubscriptionSignup({
  isOpen, onClose, category, categoryLabel, tier, billing, userProfile,
}: SubscriptionSignupProps) {
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");
  const [expertise, setExpertise] = useState("");
  const [refId, setRefId] = useState("");
  const [isSyncingDetails, setIsSyncingDetails] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const isSubmittingRef = useRef(false);
  const finalizedRef = useRef(false); // prevents double-finalization (Free path + UPI callback racing)

  const isFree = tier.monthlyPrice === 0;
  const amount = billing === "monthly" ? tier.monthlyPrice : tier.annualPrice;
  const priceLabel = billing === "monthly" ? tier.monthlyPriceLabel : tier.annualPriceLabel;

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setName(userProfile?.name || "");
      setEmail(userProfile?.email || "");
      setPhone("");
      setSelectedServices([]);
      setCity(""); setStateName(""); setPincode(""); setExpertise("");
      setRefId("");
      setIsSyncingDetails(false);
      setShowPayment(false);
      isSubmittingRef.current = false;
      finalizedRef.current = false;
      gaEvent("subscription_signup_open", { category, tier_id: tier.id, billing });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tier.id, billing]);

  if (!isOpen) return null;

  const toggleService = (svc: string) => {
    setSelectedServices((prev) => prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]);
  };

  const geoLine = `${city}${stateName ? ", " + stateName : ""}${pincode ? " - " + pincode : ""}`;
  const servicesLine = selectedServices.join(", ") || "Not specified";

  // Step 1 → Step 2 (or straight to activation for a free plan): the instant
  // details are validated, sync a "Pending" row to Google Forms + Supabase so
  // the lead is captured even if the devotee closes the tab before paying —
  // same convention as BookNowWizard's "submit now, finalize later" pattern.
  const handleDetailsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;

    const err = firstError(
      validateName(name),
      validateEmail(email),
      validatePhone(phone),
      city.trim() ? null : "City is required.",
      stateName.trim() ? null : "State is required.",
      pincode ? validatePincode(pincode) : null,
      !isDevoteeTier(tier) && selectedServices.length === 0 ? "Please select at least one service." : null,
    );
    if (err) { alert(err); return; }

    gaEvent("subscription_details_submit", { category, tier_id: tier.id, billing });

    isSubmittingRef.current = true;
    setIsSyncingDetails(true);
    const newRefId = `SDS-${Math.floor(100000 + Math.random() * 900000)}`;
    setRefId(newRefId);

    const pendingDetails =
      `Plan: ${tier.name} (${categoryLabel}) | Billing: ${billing} | Price: ${priceLabel} | ` +
      `Services: ${servicesLine} | Geography: ${geoLine} | Expertise: ${expertise || "N/A"} | ` +
      `Payment Status: Pending — Awaiting ${isFree ? "Activation" : "Payment"} | Ref: ${newRefId}`;

    try {
      await Promise.all([
        recordFormSubmission({
          formType: "subscription_signup",
          name, email, phone,
          refId: newRefId,
          payload: {
            category, tierId: tier.id, tierName: tier.name, billing, priceLabel,
            services: selectedServices, city, state: stateName, pincode, expertise,
            status: "pending",
          },
        }),
        syncToGoogleForm("subscription_signup", {
          name, email, phone,
          details: pendingDetails,
          type: `Subscription - ${categoryLabel} - ${tier.name}`,
          city, fee: amount,
        }),
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      isSubmittingRef.current = false;
      setIsSyncingDetails(false);
    }

    if (isFree) {
      await finalizeSubscription({ amount: 0, method: "Free Plan" });
      setStep(3);
    } else {
      setStep(2);
    }
  };

  const sendFreeTierOwnerAlert = () => {
    const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const message = encodeURIComponent(
      "🔔 *NEW FREE PLAN ACTIVATED — Sri Dwar*\n\n" +
      "📿 *Plan:* " + tier.name + " (" + categoryLabel + ")\n" +
      "👤 *Name:* " + name + "\n" +
      "📞 *Phone:* " + phone + "\n" +
      "📍 *Location:* " + geoLine + "\n" +
      "🔖 *Ref ID:* " + refId + "\n" +
      "🕐 *Time:* " + now + " IST\n\n" +
      "Please review their profile and welcome them. 🙏"
    );
    window.open("https://wa.me/" + OWNER_WHATSAPP_NUMBER + "?text=" + message, "_blank");
  };

  // Shared by both the free-plan instant-activation path and the UPI
  // "payment confirmed" callback below — writes the ONE final row/record for
  // this subscription. WhatsApp confirmation for PAID plans already happens
  // inside UPIPaymentModal itself (untouched); for FREE plans there is no
  // payment step, so this sends its own owner-facing WhatsApp alert instead.
  const finalizeSubscription = async (details: { amount: number; method: string }) => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;

    gaEvent("subscription_complete", { category, tier_id: tier.id, billing, amount: details.amount, method: details.method });

    const finalDetails =
      `Plan: ${tier.name} (${categoryLabel}) | Billing: ${billing} | Amount: ₹${details.amount} | ` +
      `Services: ${servicesLine} | Geography: ${geoLine} | Expertise: ${expertise || "N/A"} | ` +
      `Payment Status: ${details.amount > 0 ? "Paid — Confirmed" : "Activated — Free Plan"} | ` +
      `Payment Method: ${details.method} | Ref: ${refId}`;

    try {
      await syncToGoogleForm("subscription_signup", {
        name, email, phone,
        details: finalDetails,
        type: `Subscription - ${categoryLabel} - ${tier.name}`,
        city, fee: details.amount,
      });
    } catch (err) {
      console.error(err);
    }

    await recordActivity({
      activityType: "subscription",
      itemName: `${tier.name} (${categoryLabel})`,
      amount: details.amount,
      refId,
      paymentMethod: details.method,
      paymentStatus: "confirmed",
      metadata: { category, tierId: tier.id, billing, services: selectedServices, city, state: stateName, pincode, expertise },
    });

    // Links the purchased plan onto the devotee's Dharmic ID / Referral
    // Dashboard (participant_type + subscription_tier + billing_cycle).
    // No-ops safely for guests — the Google Forms + activities rows above
    // already captured the sale either way.
    await activateSubscriptionTier(category, tier.id as SubscriptionTierId, billing);

    if (details.amount === 0) {
      sendFreeTierOwnerAlert();
    }
  };

  // Step 2 → routes to Sri Dwar's payment gateway for the CORRECT amount —
  // the monthly or annual price of the plan the devotee actually selected.
  const handleGoToPaymentGateway = () => {
    gaEvent("subscription_checkout_initiate", { category, tier_id: tier.id, billing, amount });
    setShowPayment(true);
  };

  const handlePaymentConfirmed = async (details: { amount: number; method: "UPI" | "WhatsApp Pay" }) => {
    setShowPayment(false);
    await finalizeSubscription(details);
    setStep(3);
  };

  const handleClose = () => {
    isSubmittingRef.current = false;
    onClose();
  };

  const Header = (
    <div className="shrink-0 bg-[#021816] border-b border-white/10">
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0">
          <SriDwarLogo iconSize="sm" showTagline={false} variant="colored" useImageOnly={true} className="shrink-0" />
          <div className="min-w-0">
            <h3 className="font-serif text-base font-bold text-left text-white truncate">{tier.name}</h3>
            <p className="text-[10px] font-mono text-[#FFB347] uppercase tracking-wider text-left truncate">{categoryLabel} · {priceLabel}</p>
          </div>
        </div>
        <button onClick={handleClose} className="text-white hover:text-[#FFB347] p-1.5 bg-white/5 border border-white/10 hover:border-white/20 rounded-full text-xs font-bold w-7 h-7 flex items-center justify-center cursor-pointer shrink-0">✕</button>
      </div>
      <div className="bg-[#021816]/50 border-t border-white/5 px-5 py-3 flex justify-between items-center text-xs font-mono">
        {[
          { n: 1, label: "Your Details" },
          { n: 2, label: isFree ? "Activation" : "Payment Gateway" },
          { n: 3, label: "Confirmed" },
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
      <div
        id="subscription-signup-portal"
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4 animate-fadeIn"
        style={{ touchAction: "pan-y" }}
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <div
          className="bg-[#092320] w-full sm:rounded-3xl sm:max-w-xl shadow-2xl border border-white/10 animate-slideUp text-white flex flex-col"
          style={{ maxHeight: "100%" }}
          onClick={(e) => e.stopPropagation()}
        >
          {Header}

          <div
            className="flex-1 min-h-0 overflow-y-auto"
            style={{ WebkitOverflowScrolling: "touch", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
          >
            <div className="p-5 sm:p-6">

              {/* ── STEP 1: Services, Geography & Expertise details form ── */}
              {step === 1 && (
                <form onSubmit={handleDetailsSubmit} className="space-y-4">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/15 text-[11px] text-[#5EEAD4] text-left leading-relaxed">
                    <span className="font-bold">🙏 A few details first:</span> This helps devotees find you for the right services, in the right place — then you'll be routed straight to payment.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">Full Name *</label>
                      <input type="text" required placeholder="e.g. Anand Satpathy" value={name} onChange={(e) => setName(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white placeholder-white/20 text-left" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">Phone / WhatsApp *</label>
                      <input type="tel" required placeholder="10-digit mobile number" value={phone} onChange={(e) => setPhone(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white placeholder-white/20 text-left" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">Email Address *</label>
                    <input type="email" required placeholder="Mandatory for your receipt & confirmation" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white placeholder-white/20 text-left" />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-white/80 uppercase tracking-wide mb-2 text-left flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#FFB347]" /> {SERVICES_LABEL[category]}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {SERVICE_OPTIONS[category].map((svc) => (
                        <label key={svc} className={`flex items-center gap-2 text-[11px] px-3 py-2 rounded-xl border cursor-pointer transition-all ${selectedServices.includes(svc) ? "bg-[#FFB347]/10 border-[#FFB347]/50 text-[#FFB347]" : "bg-[#021816] border-white/10 text-white/70 hover:border-white/25"}`}>
                          <input type="checkbox" checked={selectedServices.includes(svc)} onChange={() => toggleService(svc)} className="accent-[#FFB347] w-3.5 h-3.5 shrink-0" />
                          {svc}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-white/80 uppercase tracking-wide mb-2 text-left flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#5EEAD4]" /> Your Geography
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input type="text" required placeholder="City *" value={city} onChange={(e) => setCity(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white placeholder-white/20 text-left" />
                      <input type="text" required placeholder="State *" value={stateName} onChange={(e) => setStateName(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white placeholder-white/20 text-left" />
                      <input type="text" placeholder="PIN Code (optional)" value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white placeholder-white/20 text-left" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">{EXPERTISE_LABEL[category]}</label>
                    <textarea rows={3} value={expertise} onChange={(e) => setExpertise(e.target.value)}
                      placeholder={EXPERTISE_PLACEHOLDER[category]}
                      className="w-full text-xs p-3 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white placeholder-white/20 text-left" />
                  </div>

                  <button type="submit" disabled={isSyncingDetails}
                    className="w-full bg-[#FFB347] hover:bg-[#F27D26] disabled:opacity-60 disabled:cursor-not-allowed text-[#021816] font-bold py-3.5 px-5 rounded-2xl text-xs transition-all duration-300 shadow cursor-pointer flex items-center justify-center uppercase tracking-wider">
                    {isSyncingDetails ? "Saving Your Details…" : isFree ? "Continue — Activate Free Plan" : "Continue to Payment Gateway"}
                  </button>
                </form>
              )}

              {/* ── STEP 2: Payment gateway summary + redirect ── */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="bg-[#021816] p-4 rounded-2xl border border-white/10 space-y-2 text-left">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/50 font-mono">Plan:</span>
                      <span className="font-bold text-[#FFB347] truncate max-w-[200px]">{tier.name} ({categoryLabel})</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/50 font-mono">Billing Cycle:</span>
                      <span className="font-semibold text-white capitalize">{billing}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/50 font-mono">Applicant:</span>
                      <span className="font-semibold text-white">{name}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm pt-2 border-t border-white/5">
                      <span className="font-bold text-[#5EEAD4]">Amount Due:</span>
                      <span className="font-black text-[#FFB347] font-serif">₹{amount} INR</span>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <button onClick={handleGoToPaymentGateway}
                      className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-bold py-3.5 px-5 rounded-2xl text-xs transition-all shadow flex items-center justify-center space-x-2 cursor-pointer uppercase tracking-wider">
                      <span>Pay ₹{amount} via UPI / PhonePe 🙏</span>
                    </button>
                    <button onClick={() => setStep(1)}
                      className="w-full text-xs text-white/55 hover:text-white py-2.5 font-bold cursor-pointer">
                      Go Back & Amend Details
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Confirmed ── */}
              {step === 3 && (
                <div className="space-y-6 text-center">
                  <div className="w-12 h-12 bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                    <Check className="w-6 h-6 text-emerald-400 stroke-[3]" />
                  </div>
                  <h4 className="font-serif text-2xl font-black text-[#5EEAD4]">
                    {isFree ? "Plan Activated!" : "Subscription Confirmed!"}
                  </h4>
                  <p className="text-xs text-white/70 max-w-sm mx-auto leading-relaxed">
                    Your <span className="text-[#FFB347] font-bold">{tier.name}</span> ({categoryLabel}) plan for{" "}
                    <span className="text-white font-bold">{name}</span> in {geoLine} is now on record.
                  </p>
                  <div className="flex items-center justify-center space-x-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/20 py-2 rounded-xl border border-emerald-500/20">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Reference: {refId}</span>
                  </div>
                  <p className="text-[10px] text-white/40 font-mono">
                    Our team confirms and activates every plan within 2 hours via WhatsApp & Email. 🙏
                  </p>
                  <button onClick={handleClose}
                    className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold py-3.5 rounded-xl text-xs transition-all tracking-widest shadow uppercase cursor-pointer">
                    🙏 Close
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      <UPIPaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onPaymentConfirmed={handlePaymentConfirmed}
        amount={amount}
        bookingName={`${tier.name} (${categoryLabel} — ${billing === "monthly" ? "Monthly" : "Annual"})`}
        devoteeName={name}
        refId={refId}
      />
    </>
  );
}
