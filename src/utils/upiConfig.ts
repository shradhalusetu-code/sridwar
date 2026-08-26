/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  ✏️  EDIT THIS FILE TO SET UP YOUR OWN UPI PAYMENTS
 * ============================================================
 *
 * 1. UPI_ID         -> Your own UPI ID (e.g. "yourname@upi", "9876543210@ybl").
 *                       This is the ID people will pay money TO.
 * 2. PAYEE_NAME     -> The name shown to the payer in their UPI app
 *                       (keep it short, no special characters).
 *
 * That's it — you do NOT need to touch any other file to change
 * where the money goes. Just edit the two lines below, save,
 * commit, and push to GitHub. See README section "How to deploy"
 * for the exact steps.
 * ============================================================
 */

import QRCode from "qrcode";

export const UPI_ID = "sridwar@axisbank"; // ✅ Your real UPI ID (decoded from your latest QR code)
export const PAYEE_NAME = "Kunu Rana"; // Shown in the payer's UPI app

/**
 * Builds a standard UPI deep-link ("upi://pay?...") that any UPI app
 * (GPay, PhonePe, Paytm, BHIM, etc.) understands when scanned.
 *
 * am = amount, pn = payee name, tn = transaction note, cu = currency
 */
export function buildUpiLink(amount: number, note: string): string {
  const params = new URLSearchParams({
    pa: UPI_ID,
    pn: PAYEE_NAME,
    am: amount > 0 ? String(amount) : "1",
    cu: "INR",
    tn: note.slice(0, 50), // UPI apps truncate long notes anyway
  });
  return `upi://pay?${params.toString()}`;
}

/**
 * ✅ FIX (2026-08-26): the UPI QR code used to be an <img> pointed at
 * https://api.qrserver.com/... — a free third-party image-generation
 * service with no SLA, no status page, and no uptime guarantee. When that
 * service is slow, rate-limited, or unreachable on a given network, the
 * <img> simply fails to load and the devotee sees a blank white box with a
 * broken-image icon instead of a scannable QR code — exactly what was
 * reported on the Redmi Pad. Because the whole payment screen depended on
 * one uncontrolled external endpoint, this could silently block payment
 * for any devotee, on any device, any time that service had a bad moment.
 *
 * This now generates the QR code entirely in the browser using the
 * "qrcode" npm package (see package.json) — no network call, no external
 * service, nothing that can be "down". Returns a data: URL that can be
 * dropped straight into an <img src>. The encoded UPI payment content
 * (pa/pn/am/cu/tn) is unchanged — only how the image pixels are produced
 * changed, not what the QR code says or where the money goes.
 */
export async function buildUpiQrDataUrl(amount: number, note: string): Promise<string> {
  const upiLink = buildUpiLink(amount, note);
  return QRCode.toDataURL(upiLink, {
    width: 520, // 2x the 260px on-screen size, so it stays crisp on retina/high-DPI tablets
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#021816", light: "#FFFFFF" },
  });
}
