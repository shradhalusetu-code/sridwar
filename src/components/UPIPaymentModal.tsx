/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { X, Check, Copy, ShieldCheck, RefreshCw } from "lucide-react";
import { buildUpiQrImageUrl, buildUpiLink, PAYEE_NAME } from "../utils/upiConfig";

interface UPIPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Called once payment is confirmed — either via "I Have Paid" (UPI/QR) or
   * "Pay via WhatsApp". Receives the actual confirmed amount (custom or
   * fixed) and which method was used, so the caller's final Google Sync row
   * can record an accurate donation/payment status — never "Skipped" once a
   * real payment action has happened.
   */
  onPaymentConfirmed: (details: { amount: number; method: "UPI" | "WhatsApp Pay" }) => void;
  amount: number | null;
  bookingName: string;
  devoteeName: string;
  refId: string;
  allowCustomAmount?: boolean;
  minAmount?: number;
  maxAmount?: number;
  /** Optional label shown above the amount row (e.g. "Order Items") */
  payeeLabel?: string;
  /** Optional value shown next to payeeLabel (e.g. "3 item(s)") */
  payeeValue?: string;
}

export default function UPIPaymentModal({
  isOpen,
  onClose,
  onPaymentConfirmed,
  amount,
  bookingName,
  devoteeName,
  refId,
  allowCustomAmount = false,
  minAmount = 5,
  maxAmount = 1000,
  payeeLabel,
  payeeValue,
}: UPIPaymentModalProps) {
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [customAmount, setCustomAmount] = useState<number | "">(amount || "");

  if (!isOpen) return null;

  const upiId = "sridwar@upi";
  const WHATSAPP_NUMBER = "919777645062";
  const effectiveAmount = allowCustomAmount ? (customAmount || minAmount) : (amount || 0);

  // "Pay via WhatsApp" is a real payment-intent action, not just an
  // informational link — opening it means the devotee has committed to
  // paying via WhatsApp instead of the QR/UPI button. So it now also
  // confirms the booking (method: "WhatsApp Pay"), same as "I Have Paid"
  // does for the UPI/QR path, instead of silently leaving the record
  // showing no confirmation at all.
  const handleWhatsAppPay = () => {
    if (allowCustomAmount && (!customAmount || Number(customAmount) < minAmount)) {
      alert("Minimum contribution is ₹" + minAmount);
      return;
    }
    const message = encodeURIComponent(
      "🙏 Jai Jagannath! I would like to make a UPI payment for:\n\n" +
      "📿 Service: " + bookingName + "\n" +
      "👤 Name: " + devoteeName + "\n" +
      "💰 Amount: ₹" + effectiveAmount + "\n" +
      "🔖 Ref ID: " + refId + "\n\n" +
      "Please confirm my booking after payment. 🙏"
    );
    window.open("https://wa.me/" + WHATSAPP_NUMBER + "?text=" + message, "_blank");
    setConfirmed(true);
    sendOwnerWhatsAppAlert("WhatsApp Pay");
    setTimeout(() => { onPaymentConfirmed({ amount: Number(effectiveAmount), method: "WhatsApp Pay" }); }, 1500);
  };

  const sendOwnerWhatsAppAlert = (method: "UPI" | "WhatsApp Pay") => {
    const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const message = encodeURIComponent(
      "🔔 *NEW PAYMENT RECEIVED — Sri Dwar*\n\n" +
      "📿 *Service:* " + bookingName + "\n" +
      "👤 *Devotee:* " + devoteeName + "\n" +
      "💰 *Amount:* ₹" + effectiveAmount + "\n" +
      "💳 *Method:* " + method + "\n" +
      "🔖 *Ref ID:* " + refId + "\n" +
      "🕐 *Time:* " + now + " IST\n\n" +
      "Please verify UPI payment and confirm booking. 🙏"
    );
    window.open("https://wa.me/" + WHATSAPP_NUMBER + "?text=" + message, "_blank");
  };

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmPayment = () => {
    if (confirmed) return; // guard against double-tap before re-render
    if (allowCustomAmount && (!customAmount || Number(customAmount) < minAmount)) {
      alert("Minimum contribution is ₹" + minAmount);
      return;
    }
    setConfirmed(true);
    sendOwnerWhatsAppAlert("UPI");
    setTimeout(() => { onPaymentConfirmed({ amount: Number(effectiveAmount), method: "UPI" }); }, 1500);
  };

  return (
    /*
      ── Android-safe modal layout ─────────────────────────────────────────
      Same single-scroll-container pattern as BookNowWizard.
      Outer overlay: flex column, overflow HIDDEN — no scroll here.
      Inner card: flex column, max-height 100dvh.
      Body: flex-1, min-h-0, overflow-y-auto — the ONLY scroll container.
      ─────────────────────────────────────────────────────────────────────
      Styling note: uses the same translucent "glass-panel" surfaces and
      teal/gold palette as the rest of Sri Dwar (e.g. the Temple/Committee
      donation step) instead of solid near-black blocks, so this payment
      screen reads as part of the same smooth visual language site-wide.
    */
    <div
      className="fixed inset-0 bg-[#021816]/90 backdrop-blur-md z-[70] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4 animate-fadeIn"
      style={{ touchAction: "pan-y" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-gradient-to-b from-[#0B2B27] to-[#0F3530] w-full sm:rounded-3xl sm:max-w-sm border border-white/10 shadow-2xl animate-slideUp text-white flex flex-col"
        style={{ maxHeight: "100dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Sticky header ── */}
        <div className="shrink-0 bg-white/5 px-5 py-4 flex items-center justify-between border-b border-white/10 sm:rounded-t-3xl">
          <div>
            <h3 className="font-serif text-sm font-bold text-white">Complete Your Sacred Offering</h3>
            <p className="text-[10px] font-mono text-[#FFB347] uppercase tracking-wider">PhonePe · GPay · Paytm · BHIM</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white p-1.5 bg-white/5 rounded-full border border-white/10 shrink-0">
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
              <span className="block text-[10px] font-mono text-white/40 uppercase tracking-widest">{bookingName}</span>
              {allowCustomAmount ? (
                <div className="space-y-2">
                  <p className="text-[10px] text-white/50">Enter your contribution amount</p>
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-xl font-black text-[#FFB347]">₹</span>
                    <input
                      type="number" min={minAmount} max={maxAmount} value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value === "" ? "" : Math.min(maxAmount, Math.max(minAmount, Number(e.target.value))))}
                      className="w-28 text-center text-2xl font-black bg-transparent text-[#FFB347] border-b-2 border-[#FFB347]/50 focus:outline-none focus:border-[#FFB347]"
                      placeholder="51"
                    />
                  </div>
                  <p className="text-[9px] text-white/30 font-mono">Min ₹{minAmount} · Max ₹{maxAmount}</p>
                </div>
              ) : (
                <span className="text-3xl font-black font-serif text-[#FFB347]">₹{amount}</span>
              )}
              <span className="block text-[10px] text-white/30 font-mono">Ref: {refId}</span>
            </div>

            {/* Dynamic UPI QR Code */}
            <div className="flex flex-col items-center space-y-2">
              <span className="text-[10px] text-white/50 font-mono uppercase tracking-wider">📱 Scan QR with PhonePe · GPay · Paytm · BHIM</span>
              <div className="bg-white p-3 rounded-2xl shadow-xl border-4 border-[#FFB347]">
                <img
                  src={buildUpiQrImageUrl(effectiveAmount, bookingName)}
                  alt={`UPI QR code to pay ₹${effectiveAmount}`}
                  width={192}
                  height={192}
                  className="w-48 h-48 object-contain select-none"
                  draggable={false}
                />
              </div>
              <p className="text-[9px] text-white/30 font-mono text-center">
                Receiving account: <span className="text-white/60 font-bold">{PAYEE_NAME}</span>
              </p>
              <p className="text-[11px] text-white/55 text-center leading-relaxed">
                On a phone you can also{" "}
                <a href={buildUpiLink(effectiveAmount, bookingName)} className="text-[#5EEAD4] underline font-semibold">
                  tap here to pay directly
                </a>.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] text-white/30 font-mono">OR</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <button onClick={handleWhatsAppPay}
              className="w-full flex items-center justify-center space-x-2 bg-[#25D366] hover:bg-[#1ebe59] text-white font-bold py-3.5 rounded-xl text-xs transition-all tracking-wide shadow-lg">
              <span className="text-lg">💬</span>
              <div className="text-left">
                <span className="block font-extrabold">Pay via WhatsApp</span>
                <span className="block text-[9px] font-normal opacity-80">Opens WhatsApp with payment details</span>
              </div>
            </button>

            <div className="flex items-center justify-between bg-white/5 px-4 py-3 rounded-xl border border-white/10">
              <div>
                <span className="block text-[9px] text-white/40 font-mono uppercase">UPI ID · Sridwar</span>
                <span className="text-sm font-bold text-white font-mono">{upiId}</span>
              </div>
              <button onClick={handleCopyUPI}
                className="flex items-center space-x-1 bg-[#FFB347]/10 hover:bg-[#FFB347]/20 text-[#FFB347] px-3 py-1.5 rounded-lg text-[10px] font-bold border border-[#FFB347]/20 transition-all">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied!" : "Copy UPI"}</span>
              </button>
            </div>

            <div className="text-[10px] text-white/40 font-mono text-center">
              Booking for: <span className="text-white/70 font-bold">{devoteeName}</span>
            </div>

            <div className="flex items-start space-x-2 bg-[#5EEAD4]/8 border border-[#5EEAD4]/20 px-3 py-2.5 rounded-xl text-[10px] text-[#5EEAD4] font-mono">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>An acknowledgement certificate will be shared with you on WhatsApp & Email within 24 hours of payment confirmation. 🙏</span>
            </div>

            {!confirmed ? (
              <button onClick={handleConfirmPayment}
                className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold py-4 rounded-xl text-xs transition-all tracking-widest uppercase shadow-lg flex items-center justify-center space-x-2">
                <Check className="w-4 h-4" />
                <div className="text-left">
                  <span className="block">I Have Paid — Notify Sri Dwar 🙏</span>
                  <span className="block text-[9px] font-normal opacity-70 normal-case tracking-normal">Sends instant WhatsApp alert to our team</span>
                </div>
              </button>
            ) : (
              <div className="w-full bg-[#5EEAD4]/12 border border-[#5EEAD4]/30 text-[#5EEAD4] font-bold py-4 rounded-xl text-xs flex items-center justify-center space-x-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Blessing Activated! Sri Dwar notified...</span>
              </div>
            )}

            <p className="text-[9px] text-white/20 text-center font-mono pb-1">
              Our team confirms bookings within 2 hours via WhatsApp & Email. 🙏
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}
