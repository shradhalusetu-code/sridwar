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

export const UPI_ID = "kunu1995@ibl"; // ✅ Your real UPI ID (decoded from your QR code)
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
 * Builds a URL to a free QR-code image generator service, encoding the
 * UPI link above. No npm package, no backend, no API key needed — this
 * works perfectly on a static GitHub Pages site.
 */
export function buildUpiQrImageUrl(amount: number, note: string): string {
  const upiLink = buildUpiLink(amount, note);
  const encoded = encodeURIComponent(upiLink);
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encoded}`;
}
