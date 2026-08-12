/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, FormEvent } from "react";
import { Check, ChevronRight, Download, RefreshCw, ShieldCheck, Database } from "lucide-react";
import { syncToGoogleForm } from "../utils/googleFormSync";
import { recordActivity } from "../lib/activities";
import UPIPaymentModal from "./UPIPaymentModal";
import SriDwarLogo from "./SriDwarLogo";
import { getDevotionalConfirmation, downloadConfirmationMessage, DevotionalServiceCategory } from "../utils/devotionalMessages";
import { isDiscountPromoVisible, DISCOUNT_TAG } from "../utils/discount";
import { validateName, validateEmail, validatePhone, validateDOB } from "../utils/formValidation";
import { gaBookNowOpen, gaBookingDetailsSubmit, gaCheckoutInitiate, gaBookingComplete, gaCertificateAction } from "../utils/analytics";

interface BookNowWizardProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPujaName?: string;
  defaultPrice?: number;
  /** Which service this booking is for — governs the portal's title, which
   *  fields are collected, and the confirmation wording (see
   *  devotionalMessages.ts and WIZARD_CONTENT below). Defaults to
   *  "puja_seva" (the original, astrology-field Sankalp flow) so every
   *  existing caller that doesn't pass this keeps behaving exactly as
   *  before. Four categories have their own fully dedicated portal content
   *  here: "puja_seva" (Simple Pujas), "counselling_guidance" (Holistic
   *  Wellness Counselling & Guidance), "holistic_wellness" (Yoga/Ayurveda/
   *  Healing enrollment — no Puja/Sankalpa wording, since it's not a
   *  temple ritual), and "seva_offering" (Structured Seva sponsorship —
   *  keeps "Sankalp"/Gotra since sevas genuinely record a Sankalp, but
   *  drops all Puja-specific wording and astrology fields). Other
   *  categories are handled by their own dedicated confirmation screens
   *  elsewhere. */
  category?: Extract<DevotionalServiceCategory, "puja_seva" | "counselling_guidance" | "holistic_wellness" | "seva_offering">;
  onSuccess: (bookedItem: { pujaName: string; sankalpaName: string; price: number; refId: string }) => void;
}

// ─────────────────────────────────────────────────────────────────────────
// Dedicated per-category portal content. Each of the four categories gets
// its own title, tagline, step labels, intro banner, field labels/
// visibility, wish-field copy, and Step 3 acknowledgement wording — so
// Holistic Wellness & Yogic Sciences and Structured Seva Offerings each
// read as their own purpose-built form rather than a relabelled "Puja
// Sankalpa Portal". Only "puja_seva" keeps the astrology fields (DOB,
// Gotra, Moon Sign) since only Simple Pujas need planetary coordinates
// for the Sankalp; "seva_offering" keeps Gotra alone (sevas genuinely
// record "Sankalp with your Gotra" per sevaOfferings.ts) but drops DOB/
// Rashi; "holistic_wellness" drops all three in favour of a Preferred
// Session Date; "counselling_guidance" (unchanged) drops all three too.
// ─────────────────────────────────────────────────────────────────────────
type WizardCategory = "puja_seva" | "counselling_guidance" | "holistic_wellness" | "seva_offering";

interface WizardCopy {
  title: string;
  tagline: string;
  stepLabels: [string, string, string];
  introLabel: string;
  introText: string;
  selectionLabel: string;
  feeLabel: string;
  fields: "astrology" | "gotra_only" | "preferred_date" | "none";
  autofillText: string;
  wishLabel: string;
  wishPlaceholder: string;
  submitLabel: string;
  step3Heading: string;
  cardTitle: string;
  cardIntro: string;
  statusText: string;
  quote: string;
  teamName: string;
  teamSubtitle: string;
  typeLabel: string; // used for the Google Sheet "type"/"details" column so each category is identifiable in the sheet
}

const WIZARD_CONTENT: Record<WizardCategory, WizardCopy> = {
  puja_seva: {
    title: "Puja Sankalpa Portal",
    tagline: "Vedic Rites, Followed Faithfully",
    stepLabels: ["Devotee Sankalpa", "GPay Gateway", "Blessing Cert"],
    introLabel: "🙏 Sanctify Your Rites:",
    introText: "Every ritual requires a heartfelt sankalpa representing your exact birth planetary coordinates, protecting against any distance barriers.",
    selectionLabel: "Puja Selected",
    feeLabel: "Dakshina Offer Fee (₹)",
    fields: "astrology",
    autofillText: "Gotra, Rashi, and family records have been synchronized instantly.",
    wishLabel: "Sankalpa Intent (Your Prayer Wish)",
    wishPlaceholder: "State your personal wish clearly, our pundits will read this during holy mantra recitation...",
    submitLabel: "Proceed to Secure Offering",
    step3Heading: "Sankalpa Request Received!",
    cardTitle: "Sankalpa Request Acknowledgement",
    cardIntro: "This confirms that the sacred Sankalpa (intention) submitted by:",
    statusText: "● Status: Request Received — Awaiting Performance",
    quote: "\"May this sacred intention be carried forward with devotion, for the protection of your home, health, prosperity, and loved ones across all dimensions.\"",
    teamName: "Pundit K. K. Dwivedi",
    teamSubtitle: "Chief Shastri Seal",
    typeLabel: "Puja/Seva Booking",
  },
  counselling_guidance: {
    title: "Guidance Session Portal",
    tagline: "Confidential, Compassionate Support",
    stepLabels: ["Guidance Details", "GPay Gateway", "Confirmation"],
    introLabel: "🙏 Confidential & Compassionate:",
    introText: "Share a little about what you'd like support with, and your chosen Pandit/guidance expert will reach out to confirm your session.",
    selectionLabel: "Guidance Selection",
    feeLabel: "Session Fee (₹)",
    fields: "none",
    autofillText: "Your name and contact details have been synchronized instantly from your Dharmic ID.",
    wishLabel: "Guidance Need / Concern / Support Requirement",
    wishPlaceholder: "Briefly share what you'd like support with — this is shared only with your assigned guidance expert...",
    submitLabel: "Proceed to Secure Offering",
    step3Heading: "Guidance Request Received!",
    cardTitle: "Guidance Request Acknowledgement",
    cardIntro: "This confirms that the confidential guidance request submitted by:",
    statusText: "● Status: Request Received — Awaiting Expert Assignment",
    quote: "\"May this conversation bring clarity, comfort, and strength — with compassion, confidentiality, and care.\"",
    teamName: "Guidance Coordination Team",
    teamSubtitle: "Sri Dwar Dharmic Care",
    typeLabel: "Counselling & Guidance Booking",
  },
  holistic_wellness: {
    title: "Wellness & Yogic Sciences Enrollment",
    tagline: "Holistic Practices, Guided With Care",
    stepLabels: ["Enrollment Details", "GPay Gateway", "Enrollment Confirmed"],
    introLabel: "🧘 Begin Your Practice:",
    introText: "Share your enrollment details and, where relevant, your preferred session date — your assigned instructor or wellness expert will confirm timing and any preparation needed.",
    selectionLabel: "Session / Program Selected",
    feeLabel: "Enrollment Fee (₹)",
    fields: "preferred_date",
    autofillText: "Your name and contact details have been synchronized instantly from your Dharmic ID.",
    wishLabel: "Health Goal / Focus Area (Optional)",
    wishPlaceholder: "Share what you'd like to work on — e.g. flexibility, stress relief, a health condition, or a specific practice you're curious about...",
    submitLabel: "Proceed to Secure Enrollment",
    step3Heading: "Enrollment Received!",
    cardTitle: "Wellness Enrollment Acknowledgement",
    cardIntro: "This confirms that the wellness enrollment submitted by:",
    statusText: "● Status: Enrollment Received — Awaiting Instructor Assignment",
    quote: "\"May your practice bring balance to body, clarity to mind, and steadiness to spirit.\"",
    teamName: "Yogic Sciences & Wellness Team",
    teamSubtitle: "Sri Dwar Wellness Desk",
    typeLabel: "Holistic Wellness & Yogic Sciences Enrollment",
  },
  seva_offering: {
    title: "Seva Sankalp Portal",
    tagline: "Sponsor Seva, Serve With Devotion",
    stepLabels: ["Seva Sankalp Details", "GPay Gateway", "Seva Certificate"],
    introLabel: "🙏 Offer With Devotion:",
    introText: "Every seva sponsorship carries your name and gotra in the Sankalp taken at the temple — a simple, heartfelt way to serve.",
    selectionLabel: "Seva Selected",
    feeLabel: "Seva Dakshina (₹)",
    fields: "gotra_only",
    autofillText: "Gotra and your saved details have been synchronized instantly.",
    wishLabel: "Seva Sankalp Wish (Optional Prayer Intent)",
    wishPlaceholder: "State your personal wish clearly, our pundits will read this during the seva's Sankalp...",
    submitLabel: "Proceed to Secure Offering",
    step3Heading: "Seva Sankalp Received!",
    cardTitle: "Seva Sankalp Acknowledgement",
    cardIntro: "This confirms that the seva Sankalp submitted by:",
    statusText: "● Status: Request Received — Awaiting Seva Performance",
    quote: "\"May this seva you offer bring nourishment, comfort, and protection to all it reaches, and return to you and your family as prosperity and grace.\"",
    teamName: "Seva Coordination Desk",
    teamSubtitle: "Sri Dwar Seva Care",
    typeLabel: "Seva Sankalp Booking",
  },
};

export default function BookNowWizard({ isOpen, onClose, defaultPujaName = "", defaultPrice = 1100, category = "puja_seva", onSuccess }: BookNowWizardProps) {
  const isGuidance = category === "counselling_guidance";
  const isWellness = category === "holistic_wellness";
  const isSeva = category === "seva_offering";
  const copy = WIZARD_CONTENT[category];
  const [step, setStep] = useState(1); // 1: Details, 2: Payment, 3: Request Acknowledgement (NOT a completion certificate — see wizard-success-stage below)
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
  // Only collected/shown for Holistic Wellness enrollments — a Simple
  // Puja/Seva/Guidance date isn't asked here (those are collected earlier,
  // on the offering card itself, or aren't date-based).
  const [preferredSessionDate, setPreferredSessionDate] = useState("");
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
      setPreferredSessionDate("");
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

  const wizardConfirmation = getDevotionalConfirmation({
    category,
    serviceName: pujaName,
    devoteeName,
    refId,
  });

  // Builds the Google Form sync payload for the current category. Keeps the
  // same "puja_booking" formType and 9-field mapping for every category
  // (see googleFormSync.ts _isSevaSubmission — Seva submissions are already
  // routed to the dedicated seva_booking sheet purely by the word "Seva"
  // appearing in the type/details text, which every Seva offering title
  // already contains, so this keeps working without any sync-layer change).
  // Only the visible text differs: Wellness/Guidance send "N/A" for the
  // astrology fields (never a fabricated Gotra/Rashi default) since those
  // fields are neither collected nor relevant for those two categories.
  const buildSyncPayload = (currentRefId: string, paymentStatus: string, amount: number, paymentMethod?: string) => {
    const paymentLine = paymentMethod ? ` | Payment Method: ${paymentMethod}` : "";
    if (isGuidance) {
      return {
        name: devoteeName, email, phone,
        details: `Guidance Selection: ${pujaName} | Session Fee: ₹${amount} | Payment Status: ${paymentStatus}${paymentLine} | Guidance Need / Concern / Support Requirement: ${sankalpWish || "None provided"} | Ref: ${currentRefId}`,
        type: `${copy.typeLabel} - ${pujaName}`,
        fee: amount, intent: sankalpWish,
      };
    }
    if (isWellness) {
      return {
        name: devoteeName, email, phone,
        details: `Session/Program: ${pujaName} | Enrollment Fee: ₹${amount} | Payment Status: ${paymentStatus}${paymentLine} | Preferred Session Date: ${preferredSessionDate || "No preference"} | Health Goal / Focus Area: ${sankalpWish || "None provided"} | Ref: ${currentRefId}`,
        type: `${copy.typeLabel} - ${pujaName}`,
        fee: amount, dob: "N/A", gotra: "N/A — Wellness Enrollment", rashi: "N/A", intent: sankalpWish,
      };
    }
    if (isSeva) {
      return {
        name: devoteeName, email, phone,
        details: `Seva: ${pujaName} | Seva Dakshina: ₹${amount} | Payment Status: ${paymentStatus}${paymentLine} | Gotra: ${gotra || "Shiva Gotra"} | Wish: ${sankalpWish || "None"} | Ref: ${currentRefId}`,
        type: `${copy.typeLabel} - ${pujaName}`,
        fee: amount, dob: "N/A", gotra: gotra || "Shiva Gotra", rashi: "N/A", intent: sankalpWish,
      };
    }
    return {
      name: devoteeName, email, phone,
      details: `Puja: ${pujaName} | Dakshina: ₹${amount} | Payment Status: ${paymentStatus}${paymentLine} | DOB: ${dob || "N/A"} | Gotra: ${gotra || "Shiva Gotra"} | Rashi: ${rashi} | Wish: ${sankalpWish || "None"} | Ref: ${currentRefId}`,
      type: `${copy.typeLabel} - ${pujaName}`,
      fee: amount, dob, gotra: gotra || "Shiva Gotra", rashi, intent: sankalpWish,
    };
  };

  // Step 1 → Step 2: the instant the devotee's details are validated and
  // they proceed toward payment, sync the FIRST (and only "pending") row to
  // Google Forms with their real entered data and a payment status of
  // "Pending — Awaiting Confirmation". This guarantees the lead is captured
  // even if the devotee closes the tab before paying. The Final row (same
  // Ref ID) is sent exactly once more, from handlePaymentConfirmed below,
  // with only the payment/divine contribution details corrected — no duplicate rows.
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
      await syncToGoogleForm("puja_booking", buildSyncPayload(newRefId, "Pending — Awaiting Confirmation", price));
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

  // Payment intent submitted in the UPI modal (NOT yet verified) — sends
  // the ONE Final row for this booking, sharing the same Ref ID, with
  // payment status corrected to "Payment Submitted — Pending Verification"
  // and the real payment method. Only mark a row "Paid — Confirmed" from
  // the admin/reconciliation side once the payment is actually verified.
  const handlePaymentConfirmed = (details: { amount: number; method: "UPI" | "WhatsApp Pay" }) => {
    paymentCompletedRef.current = true; // lock — do not reset to Step 1
    setShowUPI(false);
    setStep(3);
    gaBookingComplete(pujaName, details.amount, refId);
    syncToGoogleForm("puja_booking", buildSyncPayload(refId, "Payment Submitted — Pending Verification", details.amount, details.method));
    // Record into the Supabase activity ledger (no-ops for guests who
    // aren't logged in) so this puja shows up on the devotee's own Profile
    // / Order History page. Status is "pending_verification", not
    // "confirmed" — nobody has actually checked the money landed yet, only
    // that the devotee tapped "I Have Paid" / opened WhatsApp. Flip it to
    // "confirmed" from the admin/reconciliation side once payment is
    // actually verified, or wire up a real payment gateway that reports
    // back automatically.
    recordActivity({
      activityType: isSeva ? "seva" : (isGuidance || isWellness) ? "other" : "puja",
      itemName: pujaName,
      amount: details.amount,
      refId,
      paymentMethod: details.method,
      paymentStatus: "pending_verification",
    });
    // Same confirmation popup as the Bhog/Bazaar (Sankalpa Portal) flow —
    // no fixed timeline/deadline, just an open-ended "confirmation soon".
    alert(`🙏 Jai Jagannath! Your ${pujaName} has been registered. Our pandit team will send you a confirmation soon. Ref: ${refId}`);
    onSuccess({ pujaName, sankalpaName: devoteeName, price: details.amount, refId });
  };

  const handleClose = () => {
    paymentCompletedRef.current = false; // reset for next fresh booking
    isSubmittingRef.current = false;
    onClose();
  };

  // ─── Shared sticky header pieces ────────────────────────────────────────
  // Android fix: the previous plain `env(safe-area-inset-top, 0px)` value is
  // unreliable inside some Android WebViews (Capacitor included) — on
  // Chromium builds older than v140 it silently resolves to 0px even when a
  // real status bar is present (see the matching note in androidSpacing.ts
  // and index.css), so the brand bar rendered flush against — or under —
  // the status bar, which is what clipped/overlapped the "Puja Sankalpa
  // Portal" title and pushed the ✕ button up into the clock/battery row.
  // Reading var(--safe-area-inset-top) first (Capacitor 8.3+ injects the
  // correct value there) with env() and a fixed px fallback keeps this
  // consistent with every other safe-area usage in the app, and the extra
  // +14px buffer guarantees breathing room even in the worst case.
  const Header = (
    <div
      className="shrink-0 bg-[#021816] border-b border-white/10"
      style={{ paddingTop: "calc(var(--safe-area-inset-top, env(safe-area-inset-top, 24px)) + 14px)" }}
    >
      {/* Brand bar — items-start (not items-center) so the ✕ button stays
          pinned to the top-right even if the title/subtitle wrap to extra
          lines on narrow Android widths, instead of drifting/overlapping. */}
      <div className="px-5 pt-2 pb-4 flex items-start justify-between gap-3">
        <div className="flex items-start space-x-3 min-w-0 flex-1">
          <SriDwarLogo iconSize="sm" showTagline={false} variant="colored" useImageOnly={true} className="shrink-0 mt-0.5" />
          {/* min-w-0 is required here — without it, a flex child with long
              text refuses to shrink below its content width and can spill
              out over the ✕ button instead of wrapping. */}
          <div className="min-w-0">
            <h3 className="font-serif text-sm sm:text-base font-bold text-left text-white leading-snug break-words">
              {copy.title}
            </h3>
            <p className="text-[11px] sm:text-[12px] font-mono text-[#FFB347] uppercase tracking-wide sm:tracking-wider text-left leading-snug break-words mt-0.5">
              {copy.tagline}
            </p>
          </div>
        </div>
        <button
          id="close-wizard"
          onClick={handleClose}
          className="text-white hover:text-[#FFB347] p-1.5 bg-white/5 border border-white/10 hover:border-white/20 rounded-full text-xs font-bold w-8 h-8 flex items-center justify-center cursor-pointer shrink-0"
        >✕</button>
      </div>
      <div className="bg-[#021816]/50 border-t border-white/5 px-5 py-3 flex justify-between items-center text-xs font-mono">
        {[
          { n: 1, label: copy.stepLabels[0] },
          { n: 2, label: copy.stepLabels[1] },
          { n: 3, label: copy.stepLabels[2] },
        ].map(({ n, label }, i, arr) => (
          <div key={n} className="flex items-center space-x-1">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[12px] shrink-0 ${step >= n ? "bg-[#FFB347] text-[#021816]" : "bg-white/10 text-white/50"}`}>{n}</span>
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
                  <div className="p-3 bg-white/5 rounded-xl border border-white/15 text-[13px] text-[#5EEAD4] text-left leading-relaxed">
                    <span className="font-bold">{copy.introLabel}</span> {copy.introText}
                  </div>

                  {hasAutofilled && (
                    <div className="bg-teal-950/65 border border-teal-500/35 p-3 rounded-xl flex items-center space-x-2 text-xs text-[#5EEAD4] text-left">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#5EEAD4] animate-pulse shrink-0" />
                      <div>
                        <span className="font-bold text-[#FFB347]">✨ Profile Auto-filled:</span>{" "}
                        <span className="text-white/80">
                          {category === "puja_seva"
                            ? <>Gotra ({gotra}), Rashi ({rashi}), and family records have been synchronized instantly.</>
                            : copy.autofillText}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">{copy.selectionLabel}</label>
                      <input id="wizard-puja-name-input" type="text" value={pujaName} onChange={(e) => setPujaName(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-[#FFB347] font-bold focus:outline-none focus:border-[#5EEAD4] text-left" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">{copy.feeLabel}</label>
                      <input id="wizard-puja-price" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-[#FFB347] font-bold focus:outline-none focus:border-[#5EEAD4] text-left" />
                      {category === "holistic_wellness" && isDiscountPromoVisible("holistic_wellness") && (
                        <p className="text-[11px] font-mono text-[#5EEAD4] mt-1 text-left">🎉 {DISCOUNT_TAG} already applied</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">Devotee Full Name *</label>
                      <input id="wizard-devotee-name" type="text" required placeholder="e.g. Anand Satpathy" value={devoteeName} onChange={(e) => setDevoteeName(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white placeholder-white/20 text-left" />
                    </div>
                    {copy.fields === "astrology" && (
                      <div>
                        <label className="block text-[12px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">DOB (Planetary Calculation)</label>
                        <input id="wizard-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                          className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-[#5EEAD4]" />
                      </div>
                    )}
                    {copy.fields === "preferred_date" && (
                      <div>
                        <label className="block text-[12px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">Preferred Session Date (Optional)</label>
                        <input id="wizard-preferred-session-date" type="date" value={preferredSessionDate} onChange={(e) => setPreferredSessionDate(e.target.value)}
                          className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-[#5EEAD4]" />
                      </div>
                    )}
                  </div>

                  {copy.fields === "astrology" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[12px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">Gotra (type Shiva Gotra if unknown)</label>
                        <input id="wizard-gotra" type="text" placeholder="e.g. Kashyap Gotra" value={gotra} onChange={(e) => setGotra(e.target.value)}
                          className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white placeholder-white/20 text-left" />
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">Moon Sign (Rashi)</label>
                        <select id="wizard-rashi" value={rashi} onChange={(e) => setRashi(e.target.value)}
                          className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-[#5EEAD4] focus:outline-none focus:border-[#5EEAD4] font-semibold">
                          {["Mesh (Aries)","Vrishabh (Taurus)","Mithun (Gemini)","Kark (Cancer)","Simha (Leo)","Kanya (Virgo)","Tula (Libra)","Vrishchik (Scorpio)","Dhanu (Sagittarius)","Makar (Capricorn)","Kumbh (Aquarius)","Meen (Pisces)"].map(r => (
                            <option key={r} value={r} className="bg-[#092320] text-white">{r}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {copy.fields === "gotra_only" && (
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-[12px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">Gotra (type Shiva Gotra if unknown)</label>
                        <input id="wizard-gotra" type="text" placeholder="e.g. Kashyap Gotra" value={gotra} onChange={(e) => setGotra(e.target.value)}
                          className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white placeholder-white/20 text-left" />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">Phone Number * (Mandatory)</label>
                      <input id="wizard-phone" type="tel" required placeholder="Mandatory for SMS receipt" value={phone} onChange={(e) => setPhone(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white placeholder-white/20 text-left" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">Email Address * (Mandatory)</label>
                      <input id="wizard-email" type="email" required placeholder="Mandatory for email receipt" value={email} onChange={(e) => setEmail(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white placeholder-white/20 text-left" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">
                      {copy.wishLabel}
                    </label>
                    <textarea id="wizard-sankalpa-wish" rows={2} value={sankalpWish} onChange={(e) => setSankalpWish(e.target.value)}
                      placeholder={copy.wishPlaceholder}
                      className="w-full text-xs p-3 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white placeholder-white/20 text-left" />
                  </div>

                  <div className="flex items-center space-x-2 text-[12px] font-mono text-[#5EEAD4] bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10">
                    <Database className="w-3.5 h-3.5 fill-[#5EEAD4]/20 text-[#5EEAD4]" />
                    <span>Powered by Sri Dwar Technology</span>
                  </div>

                  <button id="wizard-step1-submit" type="submit" disabled={isSyncingDetails}
                    className="w-full bg-[#FFB347] hover:bg-[#F27D26] disabled:opacity-60 disabled:cursor-not-allowed text-[#021816] font-bold py-3.5 px-5 rounded-2xl text-xs transition-all duration-300 shadow cursor-pointer flex items-center justify-center uppercase tracking-wider">
                    {isSyncingDetails ? "Saving Your Details…" : copy.submitLabel}
                  </button>
                </form>
              )}

              {/* ── STEP 2: Payment summary + UPI trigger ── */}
              {step === 2 && (
                <div className="space-y-6" id="upi-payment-step">
                  <div className="bg-[#021816] p-4 rounded-2xl border border-white/10 space-y-2 text-left">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/50 font-mono">{copy.selectionLabel}:</span>
                      <span className="font-bold text-[#FFB347] truncate max-w-[200px]">{pujaName}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/50 font-mono">Devotee:</span>
                      <span className="font-semibold text-white">{devoteeName}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm pt-2 border-t border-white/5">
                      <span className="font-bold text-[#5EEAD4]">{copy.feeLabel.replace(" (₹)", "")}:</span>
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

              {/* ── STEP 3: Sankalpa Request Acknowledgement ──
                   IMPORTANT: at this point only the devotee's details and
                   payment have been received — the priest has not yet been
                   assigned and the puja has not yet been performed. This
                   screen must never claim the ritual is "done"; it only
                   confirms the request/Sankalpa was recorded and explains
                   what happens next (assignment → performance → evidence →
                   certificate). Keep this consistent with the identical
                   "will be performed… certificate shared within 3 working
                   days" language used in TempleRegister.tsx, ContactUs.tsx
                   and OnlinePuja.tsx. */}
              {step === 3 && (
                <div className="space-y-6 text-center" id="wizard-success-stage">
                  <div className="w-12 h-12 bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                    <Check className="w-6 h-6 text-emerald-400 stroke-[3]" />
                  </div>
                  <h4 className="font-serif text-2xl font-black text-[#5EEAD4]">{copy.step3Heading}</h4>
                  <div id="divine-generated-certificate" className="relative bg-[#021816]/95 border-[10px] border-[#FFB347] p-5 rounded-2xl shadow-xl text-center overflow-hidden border-double">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-gradient-to-b from-[#14B8A6]/20 to-transparent rounded-full" />
                    <div className="absolute right-3 top-3 text-[#FFB347] opacity-10 text-6xl font-serif select-none pointer-events-none">ॐ</div>
                    <div className="space-y-3 relative z-10 text-center">
                      <div className="border-b border-[#FFB347]/30 pb-1.5 inline-flex justify-center">
                        <SriDwarLogo iconSize="sm" showTagline={false} variant="colored" useImageOnly={true} className="justify-center" />
                      </div>
                      <h5 className="font-serif text-xl font-bold italic text-[#5EEAD4]">{copy.cardTitle}</h5>
                      <p className="text-[12px] text-white/50 font-mono">
                        {copy.cardIntro}
                      </p>
                      <h6 className="font-serif text-base font-black text-[#FFB347] border-b border-white/15 inline-block px-4 pb-0.5">{devoteeName}</h6>
                      {isGuidance && (
                        <p className="text-xs text-white/80 font-sans px-2">
                          has been successfully received for: <strong className="text-white">{pujaName}</strong>. Your session is now <strong className="text-[#FFB347]">pending expert assignment and confirmation</strong>.
                        </p>
                      )}
                      {isWellness && (
                        <p className="text-xs text-white/80 font-sans px-2">
                          has been successfully received for: <strong className="text-white">{pujaName}</strong>{preferredSessionDate ? <> for your preferred date of <strong>{preferredSessionDate}</strong></> : null}. Your enrollment is now <strong className="text-[#FFB347]">pending instructor assignment and confirmation</strong>.
                        </p>
                      )}
                      {isSeva && (
                        <p className="text-xs text-white/80 font-sans px-2">
                          has been successfully received for the seva offering: <strong className="text-white">{pujaName}</strong> with Gotra: <strong>{gotra || "Shiva Gotra"}</strong>. Your seva is now <strong className="text-[#FFB347]">pending priest/temple assignment and performance</strong>.
                        </p>
                      )}
                      {!isGuidance && !isWellness && !isSeva && (
                        <p className="text-xs text-white/80 font-sans px-2">
                          has been successfully received for the sacred service: <strong className="text-white">{pujaName}</strong> with Gotra: <strong>{gotra || "Shiva Gotra"}</strong>, Moon Sign: {rashi}. Your puja is now <strong className="text-[#FFB347]">pending priest assignment and performance</strong> at the temple.
                        </p>
                      )}
                      <div className="flex items-center justify-center space-x-1.5 text-[12px] font-mono font-bold text-[#FFB347] bg-[#FFB347]/10 py-1.5 px-3 rounded-full border border-[#FFB347]/30 mx-auto w-fit">
                        <span>{copy.statusText}</span>
                      </div>
                      <p className="text-[13px] text-white/75 font-sans italic leading-relaxed">
                        {copy.quote}
                      </p>
                      <div className="grid grid-cols-2 gap-4 items-center pt-3 border-t border-white/5 text-[11px] font-mono text-white/60">
                        <div className="text-left">
                          <span className="block font-bold">{copy.teamName}</span>
                          <span className="block uppercase text-white/40">{copy.teamSubtitle}</span>
                          <span className="block text-emerald-400 font-black">✓ Request Digitally Logged</span>
                        </div>
                        <div className="text-right">
                          <span className="block font-bold">Shradhalu Private Ltd</span>
                          <span className="block uppercase text-white/40">Reg No: #849302-IN</span>
                          <span className="block text-[#5EEAD4] font-bold">Dharmic Registry Recorded</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left text-xs text-white/90 leading-relaxed">
                    <p>{wizardConfirmation.opening}</p>
                    <p className="mt-2">{wizardConfirmation.blessing}</p>
                  </div>
                  <div className="flex items-start space-x-1.5 text-[12px] font-mono text-emerald-300 bg-emerald-950/20 py-2 px-2.5 rounded-xl border border-emerald-500/20 text-left">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-px" />
                    <span>
                      {isGuidance &&
                        `Reference: ${refId}. Your assigned guidance expert will confirm your session timing directly, and you'll receive a confirmation note once your session is scheduled.`}
                      {isWellness &&
                        `Reference: ${refId}. Your assigned instructor/wellness expert will confirm your session timing directly, and you'll receive an enrollment confirmation once your session is scheduled.`}
                      {isSeva &&
                        `Reference: ${refId}. Once your seva is performed at the supporting temple/Gaushala, you'll receive live updates (where available) and photo evidence, in addition to your Seva Certificate.`}
                      {!isGuidance && !isWellness && !isSeva &&
                        `Reference: ${refId}. Once your puja is performed by the temple priest, you'll receive live updates (where available) and photo/video evidence, in addition to your Sankalpa Certificate.`}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button id="download-confirmation-btn" onClick={() => { gaCertificateAction("download", refId); downloadConfirmationMessage({ category, serviceName: pujaName, devoteeName, refId }); }}
                      className="bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl text-xs transition-all tracking-wider flex items-center justify-center space-x-1 shadow border border-white/10 cursor-pointer">
                      <Download className="w-3.5 h-3.5 text-[#FFB347]" />
                      <span>Download Confirmation</span>
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
