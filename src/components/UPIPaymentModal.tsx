/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { X, Check, Copy, ShieldCheck, RefreshCw } from "lucide-react";
// @ts-ignore
import upiQR from "../assets/images/Sridwar.png";

interface UPIPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentConfirmed: () => void;
  amount: number | null;
  bookingName: string;
  devoteeName: string;
  refId: string;
  allowCustomAmount?: boolean;
  minAmount?: number;
  maxAmount?: number;
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
}: UPIPaymentModalProps) {
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [customAmount, setCustomAmount] = useState<number | "">(amount || "");

  if (!isOpen) return null;

  const upiId = "sridwar@phonepe"; // ✅ Updated to Sridwar
  const displayAmount = allowCustomAmount ? customAmount : amount;

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmPayment = () => {
    if (allowCustomAmount && (!customAmount || Number(customAmount) < minAmount)) {
      alert(`Minimum contribution is ₹${minAmount}`);
      return;
    }
    setConfirmed(true);
    setTimeout(() => {
      onPaymentConfirmed();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[70] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#092320] rounded-3xl w-full max-w-sm border border-white/10 shadow-2xl overflow-hidden animate-slideUp">

        {/* Header */}
        <div className="bg-[#021816] px-5 py-4 flex items-center justify-between border-b border-white/10">
          <div>
            <h3 className="font-serif text-sm font-bold text-white">Complete Your Sacred Offering</h3>
            <p className="text-[10px] font-mono text-[#FFB347] uppercase tracking-wider">PhonePe · GPay · Paytm · BHIM</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white p-1.5 bg-white/5 rounded-full border border-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Amount */}
          <div className="bg-[#021816] rounded-2xl p-4 border border-white/10 text-center space-y-1">
            <span className="block text-[10px] font-mono text-white/40 uppercase tracking-widest">{bookingName}</span>
            {allowCustomAmount ? (
              <div className="space-y-2">
                <p className="text-[10px] text-white/50">Enter your contribution amount</p>
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-xl font-black text-[#FFB347]">₹</span>
                  <input
                    type="number"
                    min={minAmount}
                    max={maxAmount}
                    value={customAmount}
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

          {/* QR Code */}
          <div className="flex flex-col items-center space-y-2">
            <span className="text-[10px] text-white/50 font-mono uppercase tracking-wider">Scan with any UPI app</span>
            <div className="bg-white p-3 rounded-2xl shadow-lg border-4 border-[#FFB347]">
              <img src={upiQR} alt="Sri Dwar UPI QR Code — Sridwar" className="w-44 h-44 object-contain" />
            </div>
            <p className="text-[9px] text-white/30 font-mono">Receiving account: <span className="text-white/60 font-bold">Sridwar</span></p>
          </div>

          {/* UPI ID Copy */}
          <div className="flex items-center justify-between bg-[#021816] px-4 py-3 rounded-xl border border-white/10">
            <div>
              <span className="block text-[9px] text-white/40 font-mono uppercase">UPI ID · Sridwar</span>
              <span className="text-sm font-bold text-white font-mono">{upiId}</span>
            </div>
            <button
              onClick={handleCopyUPI}
              className="flex items-center space-x-1 bg-[#FFB347]/10 hover:bg-[#FFB347]/20 text-[#FFB347] px-3 py-1.5 rounded-lg text-[10px] font-bold border border-[#FFB347]/20 transition-all"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? "Copied!" : "Copy"}</span>
            </button>
          </div>

          {/* Devotee */}
          <div className="text-[10px] text-white/40 font-mono text-center">
            Booking for: <span className="text-white/70 font-bold">{devoteeName}</span>
          </div>

          {/* Acknowledgement note */}
          <div className="flex items-start space-x-2 bg-emerald-950/30 border border-emerald-500/20 px-3 py-2.5 rounded-xl text-[10px] text-emerald-300 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>An acknowledgement certificate will be shared with you on your WhatsApp & Email within 24 hours. 🙏</span>
          </div>

          {/* Confirm */}
          {!confirmed ? (
            <button
              onClick={handleConfirmPayment}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 rounded-xl text-xs transition-all tracking-widest uppercase shadow flex items-center justify-center space-x-2"
            >
              <Check className="w-4 h-4" />
              <span>I Have Completed the Payment 🙏</span>
            </button>
          ) : (
            <div className="w-full bg-emerald-900/40 border border-emerald-500/30 text-emerald-400 font-bold py-3.5 rounded-xl text-xs flex items-center justify-center space-x-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Blessing Activated! Confirming...</span>
            </div>
          )}

          <p className="text-[9px] text-white/25 text-center font-mono">
            After payment, our team will verify and confirm your booking within 2 hours via WhatsApp & Email.
          </p>
        </div>
      </div>
    </div>
  );
}
