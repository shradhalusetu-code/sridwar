/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Check, RefreshCw, Smartphone, X } from "lucide-react";
import { buildUpiQrImageUrl, buildUpiLink, PAYEE_NAME } from "../utils/upiConfig";

interface UpiPaymentPopupProps {
  amount: number;
  note: string;
  payeeLabel?: string;
  payeeValue?: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

/**
 * A single, reusable "Pay via UPI" popup.
 * Used by the Darshan Certificate flow, the Temple Bazaar cart checkout,
 * the Dharmic ID temple-contribution step, and the Contact Us donation step.
 *
 * It shows a real scannable QR code (built from your UPI ID in
 * ../utils/upiConfig.ts) plus an "I Have Paid" self-confirmation button —
 * there is no backend on GitHub Pages, so this is a manual confirmation,
 * not an automatic payment-gateway verification.
 */
export default function UpiPaymentPopup({
  amount,
  note,
  payeeLabel,
  payeeValue,
  onConfirm,
  onClose
}: UpiPaymentPopupProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      id="upi-payment-popup-portal"
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="bg-[#092320] rounded-3xl w-full max-w-sm shadow-2xl border border-white/10 overflow-hidden text-white animate-slideUp">
        {/* Header */}
        <div className="bg-[#5F259F] p-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#5F259F] shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h4 className="text-sm font-bold">Pay via UPI</h4>
              <p className="text-[10px] opacity-90">GPay, PhonePe, Paytm, BHIM — all supported</p>
            </div>
          </div>
          <button
            id="upi-popup-close"
            onClick={onClose}
            disabled={isProcessing}
            className="text-white hover:text-[#FFB347] p-1.5 bg-white/10 rounded-full shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-left">
          {payeeLabel && payeeValue && (
            <div className="flex justify-between items-center text-xs bg-[#021816] p-3 rounded-xl border border-white/5">
              <span className="text-white/50 uppercase font-mono shrink-0 pr-2">{payeeLabel}:</span>
              <span className="font-bold text-[#FFB347] truncate text-right">{payeeValue}</span>
            </div>
          )}

          <div className="flex justify-between items-center text-sm bg-[#021816] p-3 rounded-xl border border-white/5">
            <span className="font-bold text-[#5EEAD4]">Receiving Account:</span>
            <span className="font-bold text-white">{PAYEE_NAME}</span>
          </div>

          <div className="flex justify-between items-center text-sm pt-1">
            <span className="font-bold text-[#5EEAD4]">Amount to Pay:</span>
            <span className="font-black text-[#FFB347] font-serif text-lg">₹{amount} INR</span>
          </div>

          {/* Real scannable UPI QR Code */}
          <div className="bg-white p-3 rounded-2xl flex justify-center shadow-lg">
            <img
              src={buildUpiQrImageUrl(amount, note)}
              alt={`UPI QR code to pay ₹${amount}`}
              width={200}
              height={200}
              className="block"
            />
          </div>

          <p className="text-[11px] text-white/60 text-center leading-relaxed">
            📱 Scan the code above with any UPI app. On a phone you can also{" "}
            <a href={buildUpiLink(amount, note)} className="text-[#5EEAD4] underline font-semibold">
              tap here to pay directly
            </a>.
          </p>

          <div className="bg-amber-950/30 border border-amber-500/30 text-amber-200 text-[10px] rounded-xl p-2.5 leading-relaxed">
            ⚠️ After paying, tap "I Have Paid" below. Our team manually verifies UPI payments — keep your
            payment screenshot handy just in case.
          </div>

          <button
            id="upi-popup-confirm-button"
            onClick={handleConfirm}
            disabled={isProcessing}
            className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-bold py-3 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Confirming...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>I Have Paid ₹{amount}</span>
              </>
            )}
          </button>

          <button
            id="upi-popup-cancel-button"
            onClick={onClose}
            disabled={isProcessing}
            className="w-full text-xs text-white/55 hover:text-white py-1 font-bold cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
