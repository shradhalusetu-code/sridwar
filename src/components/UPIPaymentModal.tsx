/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { X, Check, Copy, ShieldCheck, RefreshCw, Gift, Sparkles, AlertTriangle, CreditCard, Lock } from "lucide-react";
import { buildUpiQrDataUrl, buildUpiLink, UPI_ID } from "../utils/upiConfig";
import {
  RAZORPAY_KEY_ID,
  isRazorpayConfigured,
  loadRazorpayCheckoutScript,
  createRazorpayOrder,
  verifyRazorpayPayment,
  openRazorpayCheckout,
} from "../utils/razorpayConfig";
import { isNativeAndroidApp } from "../utils/shareUrl";
import CollapsibleSection from "./CollapsibleSection";
import DisclaimerAcknowledge from "./DisclaimerAcknowledge";
import StoneEngravingNote, { STONE_ENGRAVING_COMPACT_TEXT, STONE_ENGRAVING_REPEAT_TEXT } from "./StoneEngravingNote";

// ─────────────────────────────────────────────────────────────────────────
// ✅ CONTRIBUTION-BENEFITS UPDATE: this modal is the single shared payment
// surface for every contribution-structured action on the site (Puja, Seva,
// Guidance, Wellness, Divine Contributions, and Temple Bazaar/Bhog — see the
// note on onPaymentConfirmed above), so it's the right single place to
// honestly explain what a contribution unlocks, at every amount, without
// repeating this logic in every calling component. Benefits are genuine,
// non-exaggerated and cumulative — every tier keeps what the tier below it
// already offers. Never blocks payment and never implies a guaranteed
// spiritual outcome; only describes real platform-side benefits.
//
// ✅ STONE-NAME ENGRAVING (2026-08-27): deliberately NOT listed here. This
// function's output is shared by every caller of this modal — including
// fixed-price Puja/Seva/Counselling/Wellness bookings (BookNowWizard),
// Subscriptions, and Bazaar/Bhog product orders — none of which are a
// voluntary contribution. The stone-name engraving is only shown via the
// gated `isVoluntaryContribution` prop below (see StoneEngravingNote),
// never folded into this generic benefits list, so a devotee simply paying
// for a puja or a bazaar item is never told their fixed-price payment
// earns an engraving.
// ─────────────────────────────────────────────────────────────────────────
function getContributionBenefits(amount: number): string[] {
  const benefits: string[] = [];
  if (amount >= 5) {
    benefits.push("Auto-eligibility for seasonal campaigns and grand-prize draws run on the platform");
  }
  if (amount >= 50) {
    benefits.push("A small cashback reward credited to your Sri Dwar account on this contribution");
    benefits.push("Progress recorded toward milestone rewards as your total contributions grow");
  }
  if (amount >= 100) {
    benefits.push("Eligibility toward pilgrimage-related opportunities offered periodically to regular devotees");
    benefits.push("Priority consideration for milestone rewards at higher contribution levels");
  }
  return benefits;
}

// ✅ CONTRIBUTION-DISCLAIMER SAFETY NET: this modal is the single shared
// payment surface every contribution-structured flow on the site funnels
// through — including flows that don't yet have their own card-level
// disclaimer (Puja, Counselling, Testimony/Prayer Wall contributions,
// Subscriptions, etc.). Card-level gates (Seva, Bazaar) are the primary,
// convenient place a devotee ticks this; this is the backstop that makes
// sure no payment path is ever missing an acknowledgement, no matter which
// page or form led here.
//
const PAYMENT_DISCLAIMER =
  "With gratitude, your payment/request has been received and submitted for gentle verification by our team — your Seva/Puja will be processed shortly once this is complete, usually within 2 hours. Sevas, pujas and offerings are lovingly performed with devotion as per temple/priest process; timings may naturally vary. Contribution benefits (cashback, milestones, pilgrimage eligibility, campaign entries) are heartfelt platform benefits linked to real, paid bookings, offered warmly as encouragement — not a guarantee of any spiritual outcome, and not an investment or money-circulation scheme. If a payment is later found to be unsuccessful, duplicate, or not properly processed, a refund will be initiated wherever applicable.";

// ✅ STONE-NAME ENGRAVING (2026-08-27): a short addendum appended to the
// disclaimer ONLY when `isVoluntaryContribution` is true (see below) —
// the base PAYMENT_DISCLAIMER above stays exactly as it was, since it is
// shown for every payment through this modal, including fixed-price
// Puja/Seva/Bazaar/Subscription purchases that must never mention the
// engraving. Wording is shared with the rest of the site via
// StoneEngravingNote so it can never drift out of sync. Includes the
// repeat-participation/duplicate-avoidance line too, since this disclaimer
// is itself a payment-related area a devotee may see more than once.
const STONE_ENGRAVING_DISCLAIMER_ADDENDUM = " " + STONE_ENGRAVING_COMPACT_TEXT + " " + STONE_ENGRAVING_REPEAT_TEXT;

interface UPIPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Called once the devotee has SUBMITTED a payment intent via "I Have
   * Paid" (UPI/QR). This does NOT mean the payment has been verified —
   * nobody on the Sri Dwar side has checked the money actually landed
   * yet, only that the devotee tapped the button. Callers should record
   * this as a pending/awaiting-verification state (never "Paid —
   * Confirmed") and only mark a booking as truly confirmed, and notify
   * the devotee accordingly, once payment is actually verified on the
   * admin/reconciliation side. Receives the amount (custom or fixed) so
   * the caller's Google Sync row can still record it accurately.
   *
   * ✅ WHATSAPP-AS-PAYMENT REMOVED (2026-08-29): WhatsApp is no longer
   * offered as a way to PAY — it was previously possible to "pay" by
   * simply opening a WhatsApp chat, which is not an actual payment
   * method (PhonePe/GPay/Paytm/BHIM via UPI are). WhatsApp is still used
   * site-wide as a CONFIRMATION channel (the team notifies devotees of
   * verified bookings over WhatsApp & Email) — that is unchanged and
   * unrelated to this callback. `method` is therefore now always "UPI".
   *
   * This one component is the shared payment-intent trigger for every
   * payment-structured service on the site — Puja, Seva, Guidance/
   * Counselling, Holistic Wellness, Contributions/Divine Contributions, and
   * Temple Bazaar/Bhog Offerings all render this same modal, so the
   * "pending verification" behaviour below applies uniformly to all of
   * them without needing to be duplicated per category.
   */
  onPaymentConfirmed: (details: { amount: number; method: "UPI" }) => void;
  amount: number | null;
  bookingName: string;
  devoteeName: string;
  /** ✅ FIX (2026-09-03 — reported bug: Razorpay's checkout asks for phone
   *  number and email again, right after the devotee already gave them in
   *  this app's own form one step earlier). Optional so every existing
   *  caller keeps compiling untouched, but every caller that already
   *  collects a phone number (nearly all of them — it's mandatory in
   *  BookNowWizard, AuthDashboard's Divine Contribution flow, etc.) should
   *  pass it through here, straight into Razorpay's own `prefill.contact`/
   *  `prefill.email`, so that screen is skipped or pre-filled entirely
   *  instead of asking a second time. */
  devoteePhone?: string;
  devoteeEmail?: string;
  refId: string;
  allowCustomAmount?: boolean;
  minAmount?: number;
  maxAmount?: number;
  /** Optional label shown above the amount row (e.g. "Order Items") */
  payeeLabel?: string;
  /** Optional value shown next to payeeLabel (e.g. "3 item(s)") */
  payeeValue?: string;
  /** ✅ DISCLAIMER CONSOLIDATION: set true when the calling flow already
   *  showed and gated its own disclaimer one step earlier (e.g. Puja/Seva/
   *  Guidance/Wellness all gate at BookNowWizard's "Details" step before
   *  ever reaching this payment modal). Prevents a devotee from reading and
   *  ticking the same acknowledgement twice for one booking. Defaults to
   *  false so every caller that doesn't have an earlier gate (Divine
   *  Contributions, Subscriptions, Testimony/Prayer Wall, etc.) keeps this
   *  modal's disclaimer as its sole, required safety net — unchanged. */
  skipDisclaimer?: boolean;
  /** ✅ STONE-NAME ENGRAVING (2026-08-27): set true ONLY when this specific
   *  call is a voluntary contribution with no fixed price attached (e.g.
   *  DevoteeExperiences' optional post-testimony contribution, which has
   *  no earlier pre-screen of its own and relies on this modal's own
   *  amount picker). Defaults to false so every fixed-price caller — Puja/
   *  Seva/Counselling/Wellness (BookNowWizard), Subscriptions
   *  (SubscriptionSignup), and Bazaar/Bhog orders (TemplateBazaar) — never
   *  shows stone-engraving content for what is simply a paid purchase.
   *  Flows that already show their own dedicated contribution screen with
   *  this same content before ever opening this modal (ContactUs,
   *  ReportTempleIssues, AuthDashboard, TempleRegister, Hero's Darshan
   *  Membership contribution) intentionally leave this false too, so the
   *  content isn't shown twice for one contribution. */
  isVoluntaryContribution?: boolean;
  /** ✅ CLEAN CHECKOUT (2026-09-02): devotional label for the primary pay
   *  button — e.g. "Offer Your Seva Now" for a Seva booking. Defaults to a
   *  generic devotional phrase since this one modal is shared across Puja,
   *  Seva, Guidance, Wellness, Bazaar and Contributions — only pass a
   *  specific one where the booking type is unambiguous. */
  payButtonLabel?: string;
}

// ✅ CLEAN CHECKOUT (2026-09-02): the manual UPI QR / Copy-UPI-ID / "I Have
// Paid" flow is intentionally no longer shown in the live payment portal —
// having two competing "how do I pay" paths side by side next to a real
// gateway checkout read as cluttered/unprofessional; every major consumer
// checkout (Amazon, Shopify, Flipkart) shows exactly ONE primary pay
// action, not a menu of methods to choose between.
//
// The code below is deliberately KEPT, not deleted — flip this back to
// true (or see the automatic fallback below) to bring it back instantly if
// Razorpay is ever unreachable, without writing any of this again.
const SHOW_MANUAL_UPI_FALLBACK = false;

export default function UPIPaymentModal({
  isOpen,
  onClose,
  onPaymentConfirmed,
  amount,
  bookingName,
  devoteeName,
  devoteePhone,
  devoteeEmail,
  refId,
  allowCustomAmount = false,
  minAmount = 5,
  maxAmount = 1000,
  payeeLabel,
  payeeValue,
  skipDisclaimer = false,
  isVoluntaryContribution = false,
  payButtonLabel = "Complete Your Offering Securely",
}: UPIPaymentModalProps) {
  const [copied, setCopied] = useState(false);
  // NOTE: "submitted" means the devotee tapped "I Have Paid" — i.e. a
  // payment-intent notification went out to the Sri Dwar team. It does
  // NOT mean the payment has been verified. Do not rename this back to
  // "confirmed" — that wording previously led the UI (and, downstream,
  // the Google Sheet status text some callers wrote) to imply the
  // booking/payment was already confirmed the instant this button was
  // tapped, before anyone had actually checked the money landed.
  const [submitted, setSubmitted] = useState(false);
  const [customAmount, setCustomAmount] = useState<number | "">(amount || "");
  // ✅ CONTRIBUTION-DISCLAIMER SAFETY NET: required before "I Have Paid"
  // can proceed. Resets to unticked each time the modal opens fresh, same
  // as the rest of this component's local state (isOpen guard below).
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [showDisclaimerError, setShowDisclaimerError] = useState(false);
  // ✅ RAZORPAY (2026-09-02): real, gateway-verified payments alongside the
  // manual UPI QR flow below — see razorpayConfig.ts and server.ts.
  // razorpaySucceeded is tracked separately from `submitted` (both end up
  // true once a payment goes through either path) purely so the final
  // status block below can show an accurate message per path — "verified
  // instantly by Razorpay" vs "submitted, pending our team's manual check".
  const [razorpayLoading, setRazorpayLoading] = useState(false);
  const [razorpayError, setRazorpayError] = useState<string | null>(null);
  const [razorpaySucceeded, setRazorpaySucceeded] = useState(false);
  // ✅ FIX (2026-08-26): QR is now generated locally (see upiConfig.ts) —
  // this holds the resulting data: URL. Starts null so the modal can show
  // a brief loading placeholder instead of a blank gap while it's
  // generated (generation is fast/synchronous-feeling, but still async).
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrGenerationFailed, setQrGenerationFailed] = useState(false);

  const WHATSAPP_NUMBER = "919777645062";
  const effectiveAmount = allowCustomAmount ? (customAmount || minAmount) : (amount || 0);
  // ✅ CLEAN CHECKOUT (2026-09-02): the manual UPI flow only ever renders as
  // a genuine fallback — either the site owner has deliberately switched it
  // back on (SHOW_MANUAL_UPI_FALLBACK), or Razorpay itself isn't configured
  // in this environment. It is never shown at the same time as the
  // Razorpay button.
  const showManualFallback = SHOW_MANUAL_UPI_FALLBACK || !isRazorpayConfigured;

  // ✅ DIRECT-PAY GATING (2026-08-29): the "tap here to pay directly" link
  // below fires a `upi://pay...` deep link, which only does anything
  // useful where a UPI app (PhonePe/GPay/Paytm/BHIM) can actually catch
  // it — inside the Android app shell, or a phone/tablet's mobile browser.
  // On a laptop/desktop browser there is no UPI app to hand the link to,
  // so it either does nothing or triggers a confusing "how do you want to
  // open this?" dialog. Reuses the same 1024px desktop breakpoint already
  // used elsewhere on the site (see ReferralPlans.tsx, SevaOfferingCard.tsx,
  // CounsellingGuidance.tsx, AboutUs.tsx) so "desktop" means the same thing
  // everywhere. The QR code above is unaffected by this — scanning a QR
  // with a phone camera works fine from a desktop screen too.
  const canUseDirectPayLink =
    typeof window !== "undefined" &&
    (isNativeAndroidApp() || !window.matchMedia?.("(min-width: 1024px)")?.matches);

  // ✅ FIX (2026-08-16): reconciliation gap. The UPI transaction note (the
  // "tn" field inside upi://pay...) used to be just bookingName ("Rudrabhishek
  // Puja", "Sri Dwar Temple Divine Contribution", etc.) — with no ref_id in
  // it anywhere. Since payment is verified manually against a bank/UPI
  // statement (see certificateService.ts's own comments on this), the admin
  // team had no way to match an incoming payment to a specific Supabase
  // `activities` row except by amount + rough timestamp — unreliable
  // whenever two devotees pay a similar amount around the same time.
  // refId is put FIRST, not appended after bookingName, because
  // buildUpiLink()/buildUpiQrDataUrl() (upiConfig.ts) truncate the note to
  // 50 characters — a long service name could otherwise push the ref ID
  // past that limit and drop the one piece of text that actually matters
  // for reconciliation. This ONLY changes what appears in the UPI app's
  // note/QR code; the on-screen "Ref: {refId}" line, the WhatsApp message,
  // and every other use of `bookingName` elsewhere in this file (both
  // still reference the original, unprefixed value) are unchanged.
  const upiTransactionNote = `Ref:${refId} - ${bookingName}`;

  // ✅ FIX (2026-08-26): generate the QR locally whenever the amount/note
  // it encodes changes (e.g. devotee edits a custom contribution amount).
  // Must run unconditionally on every render (React hook rules), which is
  // why the `if (!isOpen) return null` guard below sits AFTER every hook
  // in this component, not before — moving it earlier would call hooks
  // conditionally and break re-renders once the modal opens more than once.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setQrGenerationFailed(false);
    buildUpiQrDataUrl(effectiveAmount, upiTransactionNote)
      .then((url) => { if (!cancelled) setQrDataUrl(url); })
      .catch((err) => {
        console.error("UPI QR generation failed:", err);
        if (!cancelled) setQrGenerationFailed(true);
      });
    return () => { cancelled = true; };
  }, [isOpen, effectiveAmount, upiTransactionNote]);

  // ✅ FIX (2026-09-03 — reported bug: Razorpay Checkout takes 5-10 seconds
  // to actually open after tapping Pay): loadRazorpayCheckoutScript() used
  // to only ever be called inside handlePayWithRazorpay, i.e. AFTER the
  // devotee had already tapped Pay — meaning that tap was the first moment
  // the ~150KB checkout.js script started downloading, and Checkout
  // couldn't open until it finished. This modal is on screen for several
  // seconds before anyone taps Pay (reading the amount, the "contribution
  // also brings you" panel, etc.) — genuinely idle time the script can
  // download during instead. Preloading here means the script is usually
  // already cached by the time Pay is tapped, so opening Checkout is
  // effectively instant; loadRazorpayCheckoutScript()'s own promise-cache
  // (see razorpayConfig.ts) means this never double-loads it even if the
  // devotee taps Pay before this finishes. Silently ignored if it fails —
  // handlePayWithRazorpay's own call is still the real, user-facing
  // attempt and surfaces a proper error if the script genuinely can't load.
  useEffect(() => {
    if (!isOpen || showManualFallback) return;
    loadRazorpayCheckoutScript().catch(() => { /* handlePayWithRazorpay will retry and surface the real error */ });
  }, [isOpen]);

  if (!isOpen) return null;

  // ✅ WHATSAPP-AS-PAYMENT REMOVED (2026-08-29): there used to be a "Pay
  // via WhatsApp" button here that let a devotee "pay" simply by opening
  // a WhatsApp chat — that is not a real payment method and has been
  // removed everywhere on the site (this modal is the single shared
  // payment surface for every payment-structured flow — see the notes at
  // the top of this file). WhatsApp remains in use below only as an
  // internal notification channel (alerting the Sri Dwar team that a
  // payment intent needs verification) and, elsewhere on the site, as a
  // devotee-facing CONFIRMATION channel once a booking is actually
  // verified — neither of those is a payment method.
  // ✅ RAZORPAY (2026-09-02): accepts an optional Razorpay payment ID. When
  // present, the alert is worded as an already-verified payment (no manual
  // check needed) instead of the original "pending verification" wording —
  // the no-arg call sites (the manual UPI "I Have Paid" path, unchanged
  // below) keep exactly their original message.
  const sendOwnerWhatsAppAlert = (razorpayPaymentId?: string) => {
    const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const message = encodeURIComponent(
      (razorpayPaymentId
        ? "✅ *PAYMENT VERIFIED — Sri Dwar (Razorpay)*\n\n"
        : "🔔 *PAYMENT PENDING VERIFICATION — Sri Dwar*\n\n") +
      "📿 *Service:* " + bookingName + "\n" +
      "👤 *Devotee:* " + devoteeName + "\n" +
      "💰 *Amount:* ₹" + effectiveAmount + "\n" +
      "💳 *Method:* " + (razorpayPaymentId ? "Razorpay" : "UPI") + "\n" +
      "🔖 *Ref ID:* " + refId + "\n" +
      (razorpayPaymentId ? "🧾 *Payment ID:* " + razorpayPaymentId + "\n" : "") +
      "🕐 *Time:* " + now + " IST\n\n" +
      (razorpayPaymentId
        ? "This payment has already been verified automatically by Razorpay — no manual check needed. 🙏"
        : "Devotee has submitted this payment — please verify it landed before confirming the booking. 🙏")
    );
    window.open("https://wa.me/" + WHATSAPP_NUMBER + "?text=" + message, "_blank");
  };

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ✅ RAZORPAY (2026-09-02): shared by both the manual "I Have Paid" button
  // and the new "Pay Now" (Razorpay) button below — same amount/disclaimer
  // checks apply to either path. Extracted out of handleConfirmPayment
  // without changing its own behavior.
  const validateBeforePayment = (): boolean => {
    if (allowCustomAmount && (!customAmount || Number(customAmount) < minAmount)) {
      alert("Minimum divine contribution is ₹" + minAmount);
      return false;
    }
    if (!skipDisclaimer && !disclaimerAccepted) {
      setShowDisclaimerError(true);
      document.getElementById("upi-disclaimer-acknowledge")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    return true;
  };

  const handleConfirmPayment = () => {
    if (submitted) return; // guard against double-tap before re-render
    if (!validateBeforePayment()) return;
    setSubmitted(true);
    sendOwnerWhatsAppAlert();
    // ✅ IMMEDIATE ACKNOWLEDGEMENT (2026-08-29): fire onPaymentConfirmed
    // right away instead of waiting on any manual/admin step — this is
    // what flips the UI below into the "🙏 Payment Noted — Verification
    // Pending" state and lets every caller (BookNowWizard, Subscription
    // Signup, Temple Bazaar, Divine Contributions, etc.) show the devotee
    // an immediate "received" acknowledgement without making them wait
    // for the team to manually verify the money first. The short delay
    // is purely a UI beat so the button's own tap animation/state change
    // is visible before the parent unmounts this modal — it is not a
    // wait for verification.
    setTimeout(() => { onPaymentConfirmed({ amount: Number(effectiveAmount), method: "UPI" }); }, 1500);
  };

  // ✅ RAZORPAY (2026-09-02): opens Razorpay Checkout for cards/UPI/
  // netbanking/wallets, backed by a server-created Order and a
  // server-side signature check (see razorpayConfig.ts + server.ts).
  // On success this calls the EXACT SAME onPaymentConfirmed({ amount,
  // method: "UPI" }) contract as the manual path above — deliberately —
  // so every one of this modal's 14 call sites across the app (booking
  // wizard, subscriptions, bazaar, contributions, etc.) keeps working
  // completely unchanged; only this file needed to change.
  const handlePayWithRazorpay = async () => {
    if (submitted || razorpaySucceeded || razorpayLoading) return;
    if (!validateBeforePayment()) return;

    setRazorpayError(null);
    setRazorpayLoading(true);
    try {
      await loadRazorpayCheckoutScript();
      const order = await createRazorpayOrder({
        amount: Number(effectiveAmount),
        refId,
        bookingName,
        devoteeName,
      });

      openRazorpayCheckout(
        {
          key: RAZORPAY_KEY_ID,
          amount: order.amount,
          currency: order.currency,
          order_id: order.order_id,
          name: "Sri Dwar",
          description: bookingName,
          prefill: {
            name: devoteeName,
            // ✅ FIX (2026-09-03): previously only `name` was ever prefilled,
            // so Razorpay's own checkout screen always asked the devotee to
            // type their phone number and email AGAIN, right after they'd
            // already given both in this app's own form. Both are optional
            // props (see UPIPaymentModalProps above) — omitted entirely
            // (rather than sent as empty strings) for the handful of callers
            // that don't collect one, so Razorpay's own validation doesn't
            // choke on a blank prefilled field.
            ...(devoteePhone ? { contact: devoteePhone } : {}),
            ...(devoteeEmail ? { email: devoteeEmail } : {}),
          },
          notes: { refId },
          theme: { color: "#FFB347" },
          handler: async (response) => {
            try {
              const verified = await verifyRazorpayPayment({
                ...response,
                refId,
                amount: Number(effectiveAmount),
                bookingName,
                devoteeName,
              });
              if (!verified) {
                setRazorpayError("We couldn't verify this payment. If money was deducted, please contact us with your Ref ID — do not pay again.");
                setRazorpayLoading(false);
                return;
              }
              setRazorpaySucceeded(true);
              setSubmitted(true);
              // ✅ CLEAN CHECKOUT (2026-09-02): no forced WhatsApp popup here
              // anymore. Razorpay's signature check above is the actual
              // verification — the team no longer needs a manual "please go
              // check this landed" ping (that alert existed for the
              // self-reported manual-UPI flow, where nothing was verified
              // automatically). server.ts's /api/razorpay/verify-payment
              // already writes an audit-log entry for every verified
              // payment, which is the durable record the team needs;
              // sendOwnerWhatsAppAlert() is kept, unused here, for the
              // manual-fallback path below. A devotee should never have
              // their own browser/app yanked into WhatsApp as a side effect
              // of paying — sharing a confirmation is something THEY choose
              // to do afterward (see the Download/Share buttons already on
              // their Dashboard and booking confirmation screens), not
              // something that happens to them.
              setTimeout(() => { onPaymentConfirmed({ amount: Number(effectiveAmount), method: "UPI" }); }, 1200);
            } catch {
              setRazorpayError("We couldn't verify this payment. If money was deducted, please contact us with your Ref ID — do not pay again.");
              setRazorpayLoading(false);
            }
          },
          modal: { ondismiss: () => setRazorpayLoading(false) },
        },
        (message) => { setRazorpayError(message); setRazorpayLoading(false); }
      );
    } catch (err: any) {
      setRazorpayError(err?.message || "Could not start payment. Please try again in a moment, or contact us if this continues.");
      setRazorpayLoading(false);
    }
  };

  return (
    /*
      ── Android-safe modal layout ─────────────────────────────────────────
      Same single-scroll-container pattern as BookNowWizard.
      Outer overlay: flex column, overflow HIDDEN — no scroll here.
      Inner card: flex column, max-height 100% (of the fixed inset-0 parent —
      not dvh, which is silently dropped on older Android WebView).
      Body: flex-1, min-h-0, overflow-y-auto — the ONLY scroll container.
      ─────────────────────────────────────────────────────────────────────
      Styling note: uses the same translucent "glass-panel" surfaces and
      teal/gold palette as the rest of Sri Dwar (e.g. the Temple/Committee
      divine contribution step) instead of solid near-black blocks, so this payment
      screen reads as part of the same smooth visual language site-wide.
    */
    <div
      className="fixed inset-0 bg-[#021816]/90 backdrop-blur-md z-[200] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4 animate-fadeIn"
      style={{ touchAction: "pan-y" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-gradient-to-b from-[#0B2B27] to-[#0F3530] w-full sm:rounded-3xl sm:max-w-sm lg:max-w-lg border border-white/10 shadow-2xl animate-slideUp text-white flex flex-col"
        style={{ maxHeight: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Sticky header ── */}
        <div
          className="shrink-0 bg-white/5 px-5 py-4 flex items-center justify-between border-b border-white/10 sm:rounded-t-3xl"
          style={{ paddingTop: "calc(var(--safe-area-inset-top, env(safe-area-inset-top, 24px)) + 1rem)" }}
        >
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-sm font-bold text-white leading-snug break-words">Complete Your Sacred Offering</h3>
            {/* ✅ CLEAN CHECKOUT (2026-09-02): this used to always say "PhonePe
                · GPay · Paytm · BHIM" even when Razorpay (which also accepts
                cards and netbanking, not just UPI apps) is the only method
                actually shown below — inaccurate as soon as Razorpay went
                live. Now reflects whichever path is actually showing. */}
            <p className="text-[12px] font-mono text-[#FFB347] uppercase tracking-wider leading-snug break-words">
              {showManualFallback ? "PhonePe · GPay · Paytm · BHIM" : "Cards · UPI · Netbanking — Secured by Razorpay"}
            </p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white p-1.5 bg-white/5 rounded-full border border-white/10 shrink-0 w-8 h-8 flex items-center justify-center ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div
          className="flex-1 min-h-0 overflow-y-auto"
          style={{
            WebkitOverflowScrolling: "touch",
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
          }}
        >
          <div className="p-5 space-y-4">

            {/* Optional payee summary row */}
            {payeeLabel && payeeValue && (
              <div className="flex justify-between items-center text-xs bg-white/5 p-3 rounded-xl border border-white/10">
                <span className="text-white/50 uppercase font-mono shrink-0 pr-2">{payeeLabel}:</span>
                <span className="font-bold text-[#FFB347] truncate text-right">{payeeValue}</span>
              </div>
            )}

            {/* Amount Display */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-center space-y-1">
              <span className="block text-[12px] font-mono text-white/40 uppercase tracking-widest">{bookingName}</span>
              {allowCustomAmount ? (
                <div className="space-y-2">
                  <p className="text-[12px] text-white/50">Enter your divine contribution amount</p>
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-xl font-black text-[#FFB347]">₹</span>
                    <input
                      type="number" min={minAmount} max={maxAmount} value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value === "" ? "" : Math.min(maxAmount, Math.max(minAmount, Number(e.target.value))))}
                      className="w-28 text-center text-2xl font-black bg-transparent text-[#FFB347] border-b-2 border-[#FFB347]/50 focus:outline-none focus:border-[#FFB347]"
                      placeholder="51"
                    />
                  </div>
                  <p className="text-[11px] text-white/30 font-mono">Min ₹{minAmount} · Max ₹{maxAmount}</p>
                </div>
              ) : (
                <span className="text-3xl font-black font-serif text-[#FFB347]">₹{amount}</span>
              )}
              <span className="block text-[12px] text-white/30 font-mono">Ref: {refId}</span>
            </div>

            {/* ✅ CONTRIBUTION-BENEFITS UPDATE: honest, non-exaggerated,
                amount-linked benefits — updates live as a custom amount is
                typed, so the devotee always sees what THIS contribution
                genuinely unlocks rather than a generic promotional list.
                Collapsed to one summary line by default (CollapsibleSection)
                per the "mention it, then let them expand" pattern used for
                every contribution section site-wide. */}
            {getContributionBenefits(Number(effectiveAmount) || 0).length > 0 && (
              <div className="bg-[#FFB347]/8 border border-[#FFB347]/25 rounded-xl px-3.5 py-3">
                <CollapsibleSection
                  defaultExpandedOnDesktop={false}
                  icon={<Gift className="w-3.5 h-3.5 text-[#FFB347]" />}
                  title="Your contribution also brings you"
                  summary={`This ₹${effectiveAmount || 0} contribution unlocks ${getContributionBenefits(Number(effectiveAmount) || 0).length} genuine platform benefit${getContributionBenefits(Number(effectiveAmount) || 0).length > 1 ? "s" : ""} — tap to see them.`}
                >
                  <ul className="space-y-1">
                    {getContributionBenefits(Number(effectiveAmount) || 0).map((b) => (
                      <li key={b} className="flex items-start gap-1.5 text-[12px] text-white/70 leading-snug">
                        <Sparkles className="w-3 h-3 text-[#FFB347] shrink-0 mt-0.5" /><span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-white/35 leading-snug pt-1.5">
                    These are heartfelt platform blessings, offered in appreciation of your generosity — not a promise of any specific spiritual outcome, guaranteed income, or investment return. The more you're moved to offer, the more of these humble blessings unfold — see Refer & Earn for full details.
                  </p>
                </CollapsibleSection>
              </div>
            )}

            {/* ✅ STONE-NAME ENGRAVING (2026-08-27): only shown when this
                specific call is a genuine voluntary contribution with no
                fixed price of its own (see isVoluntaryContribution prop
                doc above) — never for a fixed-price Puja/Seva/Bazaar/
                Subscription purchase. Reuses the shared StoneEngravingNote
                component so the wording/thresholds can never drift out of
                sync with the rest of the site. */}
            {isVoluntaryContribution && <StoneEngravingNote variant="compact" showRepeatNote />}

            {/* Required acknowledgement — gates "I Have Paid" below. This
                is the safety-net checkbox for any
                flow that reaches payment without its own earlier disclaimer
                gate (Divine Contributions, Subscriptions, Testimony/Prayer
                Wall, etc.). Flows that already gate one step earlier — Puja,
                Seva, Counselling & Guidance, and Holistic Wellness, all at
                BookNowWizard's "Details" step — pass skipDisclaimer so a
                devotee isn't asked to read and tick the same acknowledgement
                twice for one booking. */}
            {!skipDisclaimer && (
              <div id="upi-disclaimer-acknowledge">
                <DisclaimerAcknowledge
                  summary={
                    isVoluntaryContribution
                      ? "With gratitude, your payment is gently verified by our team before your booking is confirmed, and — for contributions above ₹200 — your name is engraved in stone at a temple as a lasting mark of devotion; kindly read the full details before proceeding."
                      : "With gratitude, your payment is received and gently verified by our team before your booking is confirmed — kindly read the full details before proceeding."
                  }
                  details={isVoluntaryContribution ? PAYMENT_DISCLAIMER + STONE_ENGRAVING_DISCLAIMER_ADDENDUM : PAYMENT_DISCLAIMER}
                  checked={disclaimerAccepted}
                  onCheckedChange={(v) => { setDisclaimerAccepted(v); if (v) setShowDisclaimerError(false); }}
                  checkboxLabel="I understand and accept the above before completing payment."
                  showRequiredError={showDisclaimerError}
                />
              </div>
            )}

            {/* ✅ RAZORPAY (2026-09-02): primary, gateway-verified payment
                path — cards/UPI/netbanking/wallets via Razorpay Checkout.
                Hidden automatically if VITE_RAZORPAY_KEY_ID isn't set
                (isRazorpayConfigured), so an unconfigured environment
                falls back to exactly the original manual-UPI-only modal
                instead of showing a button that would fail. Hidden after
                `submitted` (either path) alongside the rest of the "how to
                pay" UI below, to prevent a devotee paying twice. */}
            {isRazorpayConfigured && !submitted && (
              <div className="space-y-1.5">
                <button
                  onClick={handlePayWithRazorpay}
                  disabled={razorpayLoading}
                  className="w-full bg-[#5EEAD4] hover:bg-[#4dd8c2] disabled:opacity-60 text-[#021816] font-extrabold py-4 rounded-xl text-xs transition-all tracking-widest uppercase shadow-lg flex items-center justify-center space-x-2"
                >
                  {razorpayLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Opening secure checkout…</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <div className="text-left">
                        <span className="block">{payButtonLabel} — ₹{effectiveAmount}</span>
                        <span className="block text-[11px] font-normal opacity-70 normal-case tracking-normal">Cards · UPI · Netbanking — secured by Razorpay</span>
                      </div>
                    </>
                  )}
                </button>
                {razorpayError && (
                  <p className="text-[11px] text-[#F27D26] text-center leading-relaxed px-1">{razorpayError}</p>
                )}
                {/* ✅ FIX (2026-09-03 — reported: too small/hard to read):
                    was w-3 icon + text-[10px] at 30% opacity — genuinely
                    hard to read at that size. Enlarged the icon, text, and
                    contrast so this reads clearly as a real trust signal
                    next to the pay action, not barely-visible fine print. */}
                <div className="flex items-center justify-center space-x-2 pt-1">
                  <Lock className="w-5 h-5 text-[#5EEAD4]" />
                  <span className="text-sm text-white/70 font-mono uppercase tracking-wider font-bold">Secured by Razorpay</span>
                </div>
              </div>
            )}

            {/* ✅ CLEAN CHECKOUT (2026-09-02): showManualFallback is true only
                when Razorpay genuinely isn't configured/reachable — never
                shown side-by-side with the Razorpay button. Previously this
                divider was gated on isRazorpayConfigured but the QR section
                right below it was NOT (see the next comment) — meaning both
                payment methods were showing at once whenever Razorpay was
                configured, which is exactly the cluttered "two ways to pay"
                look this whole change removes. */}
            {showManualFallback && !submitted && (
              <div className="flex items-center space-x-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[12px] text-white/30 font-mono">PAY VIA UPI</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
            )}

            {/* Everything below (QR code, Copy UPI, "I Have Paid") is the
                original manual-UPI flow. It is intentionally NOT shown in
                the live payment portal anymore when Razorpay is configured
                — see SHOW_MANUAL_UPI_FALLBACK above. It still exists as an
                automatic fallback if Razorpay is ever unreachable/
                unconfigured, so a devotee is never left with zero ways to
                pay. Hidden once `submitted` is true (either path) so a
                devotee can't attempt to pay twice for one booking.
                ✅ BUG FIXED (2026-09-02): this block used to render on
                `!submitted` alone, with no isRazorpayConfigured check at
                all — meaning it showed at the same time as the Razorpay
                button whenever Razorpay WAS configured, not only as a
                fallback. */}
            {showManualFallback && !submitted && (
            <>
            {/* Dynamic UPI QR Code — generated locally in-browser (see
                upiConfig.ts), no external image service to fail. */}
            <div className="flex flex-col items-center space-y-2">
              <span className="text-[12px] text-white/50 font-mono uppercase tracking-wider">📱 Scan QR with PhonePe · GPay · Paytm · BHIM</span>
              <div className="bg-white p-3 rounded-2xl shadow-xl border-4 border-[#FFB347] w-48 h-48 flex items-center justify-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`UPI QR code to pay ₹${effectiveAmount}`}
                    width={192}
                    height={192}
                    className="w-full h-full object-contain select-none"
                    draggable={false}
                  />
                ) : qrGenerationFailed ? (
                  // Extremely unlikely (generation is local, no network) —
                  // but if it ever happens, don't leave a blank box: point
                  // the devotee straight at the working alternatives
                  // already on this screen (direct pay link where shown,
                  // or Copy UPI ID below) instead of a dead end.
                  <div className="text-center px-2">
                    <AlertTriangle className="w-6 h-6 text-[#F27D26] mx-auto mb-1" />
                    <span className="text-[11px] text-[#021816]/70 font-mono leading-snug block">
                      {canUseDirectPayLink
                        ? 'QR couldn\'t load — use "tap here to pay" below or Copy UPI ID'
                        : "QR couldn't load — use Copy UPI ID below"}
                    </span>
                  </div>
                ) : (
                  <RefreshCw className="w-6 h-6 text-[#021816]/30 animate-spin" />
                )}
              </div>
              {/* ✅ DIRECT-PAY GATING (2026-08-29): only shown inside the
                  Android app or a mobile/tablet browser, where a UPI app
                  is actually present to catch this deep link — see
                  canUseDirectPayLink above. Hidden on desktop/laptop
                  browsers, where PhonePe/GPay/Paytm/BHIM aren't available
                  to open it. */}
              {canUseDirectPayLink && (
                <p className="text-[13px] text-white/55 text-center leading-relaxed">
                  On a phone you can also{" "}
                  <a href={buildUpiLink(effectiveAmount, upiTransactionNote)} className="text-[#5EEAD4] underline font-semibold">
                    tap here to pay directly
                  </a>.
                </p>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[12px] text-white/30 font-mono">OR</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <div className="flex items-center justify-between bg-white/5 px-4 py-3 rounded-xl border border-white/10">
              <div>
                <span className="block text-[11px] text-white/40 font-mono uppercase">UPI ID · Sridwar</span>
                <span className="text-sm font-bold text-white font-mono">{UPI_ID}</span>
              </div>
              <button onClick={handleCopyUPI}
                className="flex items-center space-x-1 bg-[#FFB347]/10 hover:bg-[#FFB347]/20 text-[#FFB347] px-3 py-1.5 rounded-lg text-[12px] font-bold border border-[#FFB347]/20 transition-all">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied!" : "Copy UPI"}</span>
              </button>
            </div>
            </>
            )}

            <div className="text-[12px] text-white/40 font-mono text-center">
              Booking for: <span className="text-white/70 font-bold">{devoteeName}</span>
            </div>

            {/* ✅ CLEAN CHECKOUT (2026-09-02): this box's wording now depends
                on which path actually happened. Razorpay is verified
                instantly (the signature check above), so telling a devotee
                "3 working days" and pointing them at WhatsApp — copy that
                only ever made sense for the old manually-reviewed path — was
                inaccurate and needlessly slow-sounding for what's now the
                normal case. The devotee's certificate/confirmation is still
                delivered by email automatically (unchanged, server-side);
                this only fixes what the devotee is TOLD will happen. */}
            <div className="flex items-start space-x-2 bg-[#5EEAD4]/8 border border-[#5EEAD4]/20 px-3 py-2.5 rounded-xl text-[12px] text-[#5EEAD4] font-mono">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                {razorpaySucceeded
                  ? "Your payment is confirmed. A confirmation email is on its way, and your certificate will be available to download from your Dashboard once it's ready. 🙏"
                  : "An acknowledgement certificate will be shared with you on WhatsApp & Email within 3 working days of payment confirmation. 🙏"}
              </span>
            </div>

            {/* ✅ CLEAN CHECKOUT (2026-09-02): the "I Have Paid" button and
                its "Verification Pending" status only ever apply to the
                manual-UPI path — this used to render on `!submitted` alone
                with no showManualFallback check, so it would appear even
                with the manual QR section above it hidden, as an orphaned
                button with nothing for it to confirm. Now: Razorpay success
                shows its own clean confirmation only; the manual path below
                is unchanged. */}
            {razorpaySucceeded ? (
              <div className="w-full bg-[#5EEAD4]/12 border border-[#5EEAD4]/30 text-[#5EEAD4] font-bold py-4 rounded-xl text-xs flex items-center justify-center space-x-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>✅ Payment Verified via Razorpay</span>
              </div>
            ) : showManualFallback && !submitted ? (
              <button onClick={handleConfirmPayment}
                className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold py-4 rounded-xl text-xs transition-all tracking-widest uppercase shadow-lg flex items-center justify-center space-x-2">
                <Check className="w-4 h-4" />
                <div className="text-left">
                  <span className="block">I Have Paid — Notify Sri Dwar 🙏</span>
                  <span className="block text-[11px] font-normal opacity-70 normal-case tracking-normal">Sends instant WhatsApp alert to our team</span>
                </div>
              </button>
            ) : showManualFallback ? (
              <div className="w-full bg-[#5EEAD4]/12 border border-[#5EEAD4]/30 text-[#5EEAD4] font-bold py-4 rounded-xl text-xs flex items-center justify-center space-x-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>🙏 Payment Noted — Verification Pending</span>
              </div>
            ) : null}

            <p className="text-[11px] text-white/20 text-center font-mono pb-1">
              {razorpaySucceeded
                ? "You can download or share your confirmation anytime from your Dashboard. 🙏"
                : "Our team confirms bookings within 2 hours via WhatsApp & Email. 🙏"}
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}
