/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { X, AlertCircle, ShieldCheck, RefreshCw, ExternalLink } from "lucide-react";
import { syncToGoogleForm, makeSubmissionRef } from "../utils/googleFormSync";
import { recordFormSubmission } from "../lib/activities";

/**
 * ─── Why this exists ────────────────────────────────────────────────────────
 *
 * The Refund & Cancellation Policy (public/refund-policy.html, Section 5 and
 * Section 18) already promises devotees a way to request a cancellation or
 * refund, and spells out exactly what it needs from them: Booking ID,
 * registered mobile/email, payment reference, and a reason. It also says a
 * cancellation only becomes effective "after written confirmation from Sri
 * Dwar" — i.e. this is a REQUEST that a human reviews and confirms, not an
 * automated refund button. There was previously no in-app place to actually
 * submit that request; this modal is that place.
 *
 * ─── How it fits the existing payment/form architecture ────────────────────
 *
 * Every booking on this platform is confirmed the same "submit now, team
 * verifies" way (see UPIPaymentModal.tsx — self-declared UPI/WhatsApp
 * payment, manually confirmed by the team). A refund/cancellation request
 * follows the identical shape, just in reverse, and reuses the exact same
 * three channels every other form on this site already uses so nothing new
 * has to be built or maintained separately:
 *
 *   1. Google Forms sync (syncToGoogleForm) — same mechanism as every other
 *      booking/contact form, lands in your existing Sheets-based workflow.
 *   2. Supabase `form_submissions` (recordFormSubmission) — so the request
 *      shows up in the devotee's own "My Requests & Submissions" ledger in
 *      AuthDashboard.tsx, exactly like a Contact Us message or testimonial.
 *   3. A best-effort POST to /api/refund-request for a server-side audit
 *      log entry (see server.ts) — wrapped in try/catch so a missing/
 *      unreachable backend never blocks the request, since the two channels
 *      above already durably capture it.
 *
 * Then, same as every payment confirmation in this app, it opens a
 * pre-filled WhatsApp message to the team's number so a human sees it
 * immediately instead of only living in a spreadsheet.
 */

const OWNER_WHATSAPP_NUMBER = "919777645062";

export interface RefundRequestBooking {
  refId: string;
  itemName: string;
  amount: number;
  activityType?: string;
  paymentMethod?: string | null;
  createdAt?: string;
}

interface RefundRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: RefundRequestBooking | null;
  devoteeName: string;
  devoteeEmail: string;
  devoteePhone?: string;
  /** Lets the confirmation screen deep-link straight to the Refund & Cancellation Policy section. */
  onOpenLegalDoc?: (doc: string) => void;
  /** Called after a successful submission so the caller can refresh its "My Requests" list. */
  onSubmitted?: () => void;
}

const REASON_OPTIONS = [
  "Booked by mistake / duplicate booking",
  "Unable to attend / schedule conflict",
  "Found a more suitable date or temple",
  "Puja/seva not yet performed — change of mind",
  "Dissatisfied with service received",
  "Other",
];

export default function RefundRequestModal({
  isOpen,
  onClose,
  booking,
  devoteeName,
  devoteeEmail,
  devoteePhone,
  onOpenLegalDoc,
  onSubmitted,
}: RefundRequestModalProps) {
  const [reason, setReason] = useState(REASON_OPTIONS[0]);
  const [notes, setNotes] = useState("");
  const [contactPhone, setContactPhone] = useState(devoteePhone || "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen || !booking) return null;

  const resetAndClose = () => {
    setReason(REASON_OPTIONS[0]);
    setNotes("");
    setErrorMessage("");
    setSubmitted(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (submitting || submitted) return;
    if (!contactPhone || contactPhone.trim().length < 6) {
      setErrorMessage("Please provide a registered mobile number we can reach you on.");
      return;
    }
    setErrorMessage("");
    setSubmitting(true);

    const requestRefId = makeSubmissionRef("REFUND");
    const fullReason = reason === "Other" && notes ? notes : `${reason}${notes ? ` — ${notes}` : ""}`;

    const details =
      `Booking Ref: ${booking.refId} | Item: ${booking.itemName} | ` +
      `Amount Paid: ₹${booking.amount}${booking.paymentMethod ? ` via ${booking.paymentMethod}` : ""} | ` +
      `Reason: ${fullReason} | Request Ref: ${requestRefId}`;

    // 1. Google Forms sync — same channel every other form on the site uses.
    try {
      await syncToGoogleForm("refund_cancellation_request", {
        name: devoteeName,
        email: devoteeEmail,
        phone: contactPhone,
        details,
        type: "Refund/Cancellation Request",
      });
    } catch (err) {
      console.error("[RefundRequestModal] Google Forms sync failed:", err);
      // Non-fatal — Supabase (below) and the WhatsApp alert still carry the request through.
    }

    // 2. Supabase form_submissions — so it shows up in "My Requests & Submissions".
    try {
      await recordFormSubmission({
        formType: "refund_cancellation_request",
        name: devoteeName,
        email: devoteeEmail,
        phone: contactPhone,
        refId: requestRefId,
        payload: {
          bookingRefId: booking.refId,
          itemName: booking.itemName,
          amount: booking.amount,
          activityType: booking.activityType,
          reason: fullReason,
        },
      });
    } catch (err) {
      console.error("[RefundRequestModal] recordFormSubmission failed:", err);
    }

    // 3. Best-effort server-side audit log entry. Never blocks the request —
    // if there's no reachable backend for this deployment, the two channels
    // above have already captured it durably.
    try {
      await fetch("/api/refund-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestRefId,
          bookingRefId: booking.refId,
          itemName: booking.itemName,
          amount: booking.amount,
          devoteeName,
          devoteeEmail,
          devoteePhone: contactPhone,
          reason: fullReason,
        }),
      });
    } catch (err) {
      console.error("[RefundRequestModal] /api/refund-request unreachable, continuing:", err);
    }

    // 4. Notify the team instantly via WhatsApp, same pattern as payment confirmation.
    const waMessage = encodeURIComponent(
      "🙏 Refund / Cancellation Request — Sri Dwar\n\n" +
      "📿 Booking: " + booking.itemName + "\n" +
      "🔖 Booking Ref: " + booking.refId + "\n" +
      "🧾 Request Ref: " + requestRefId + "\n" +
      "👤 Devotee: " + devoteeName + "\n" +
      "📞 Contact: " + contactPhone + "\n" +
      "💰 Amount Paid: ₹" + booking.amount + "\n" +
      "📝 Reason: " + fullReason + "\n\n" +
      "Please review and confirm in writing per our Refund & Cancellation Policy. 🙏"
    );
    window.open("https://wa.me/" + OWNER_WHATSAPP_NUMBER + "?text=" + waMessage, "_blank");

    setSubmitting(false);
    setSubmitted(true);
    onSubmitted?.();
  };

  return (
    <div
      className="fixed inset-0 bg-[#021816]/90 backdrop-blur-md z-[200] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4 animate-fadeIn"
      style={{ touchAction: "pan-y" }}
      onClick={(e) => { if (e.target === e.currentTarget) resetAndClose(); }}
    >
      <div
        className="bg-gradient-to-b from-[#0B2B27] to-[#0F3530] w-full sm:rounded-3xl sm:max-w-sm border border-white/10 shadow-2xl animate-slideUp text-white flex flex-col"
        style={{ maxHeight: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="shrink-0 bg-white/5 px-5 py-4 flex items-center justify-between border-b border-white/10 sm:rounded-t-3xl"
          style={{ paddingTop: "calc(var(--safe-area-inset-top, env(safe-area-inset-top, 24px)) + 1rem)" }}
        >
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-sm font-bold text-white leading-snug break-words">Request Cancellation / Refund</h3>
            <p className="text-[12px] font-mono text-[#FFB347] uppercase tracking-wider leading-snug break-words">Reviewed by our team</p>
          </div>
          <button onClick={resetAndClose} className="text-white/60 hover:text-white p-1.5 bg-white/5 rounded-full border border-white/10 shrink-0 w-8 h-8 flex items-center justify-center ml-2">
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
            {!submitted ? (
              <>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-1">
                  <span className="block text-[12px] font-mono text-white/40 uppercase tracking-widest">Booking</span>
                  <span className="block text-sm font-bold text-white">{booking.itemName}</span>
                  <span className="block text-[12px] text-white/50 font-mono">
                    Ref: {booking.refId} · Paid ₹{booking.amount}{booking.paymentMethod ? ` · ${booking.paymentMethod}` : ""}
                  </span>
                </div>

                <div className="flex items-start space-x-2 bg-[#FFB347]/8 border border-[#FFB347]/20 px-3 py-2.5 rounded-xl text-[12px] text-[#FFB347] font-mono leading-relaxed">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    Submitting this doesn't cancel the booking automatically — our team reviews and confirms every
                    request in writing, per our{" "}
                    <button
                      type="button"
                      onClick={() => onOpenLegalDoc?.("refund")}
                      className="underline underline-offset-2 font-bold"
                    >
                      Refund &amp; Cancellation Policy
                    </button>.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1.5">Reason for request</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white"
                  >
                    {REASON_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="bg-[#0B2B27]">{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1.5">
                    {reason === "Other" ? "Please describe" : "Additional details (optional)"}
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything that helps our team review this faster..."
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1.5">Registered mobile number</label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="e.g. 98765 43210"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                  />
                  <p className="text-[11px] text-white/30 mt-1 font-mono">
                    We'll reach out here and at {devoteeEmail} to confirm.
                  </p>
                </div>

                {errorMessage && (
                  <div className="flex items-start space-x-2 bg-red-950/40 border border-red-500/30 text-red-300 text-xs rounded-xl px-3 py-2.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full bg-[#FFB347] hover:bg-[#F27D26] disabled:opacity-60 text-[#021816] font-extrabold py-4 rounded-xl text-xs transition-all tracking-widest uppercase shadow-lg flex items-center justify-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Request &amp; Notify Sri Dwar 🙏</span>
                  )}
                </button>

                <p className="text-[11px] text-white/20 text-center font-mono pb-1">
                  Approved refunds are typically initiated within 7–15 business days of confirmation.
                </p>
              </>
            ) : (
              <div className="text-center space-y-3 py-2">
                <ShieldCheck className="w-10 h-10 text-[#5EEAD4] mx-auto" />
                <h4 className="font-serif text-base font-bold text-white">Request Received 🙏</h4>
                <p className="text-xs text-white/70 leading-relaxed">
                  Our team has been notified and will confirm the outcome by WhatsApp or email, usually within 2
                  business days. You can track this under "My Requests &amp; Submissions" in your Dharmic ID.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenLegalDoc?.("refund")}
                  className="inline-flex items-center gap-1 text-[12px] text-[#5EEAD4] underline underline-offset-2 font-mono"
                >
                  <span>View full Refund &amp; Cancellation Policy</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
                <button
                  onClick={resetAndClose}
                  className="w-full mt-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 rounded-xl text-xs transition-all"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
