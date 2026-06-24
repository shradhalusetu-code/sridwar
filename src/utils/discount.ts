/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sitewide "Summer Special" promotional discount.
 * Change the rate or deadline here and every puja/seva/wellness price
 * across the site updates automatically — the discount also switches
 * itself off once the deadline passes, with no manual cleanup needed.
 */

export const DISCOUNT_RATE = 0.30; // 30% off
export const DISCOUNT_DEADLINE = new Date("2026-08-01T00:00:00+05:30"); // midnight IST, Aug 1 (covers "until July 31st")
export const DISCOUNT_TAG = "30% OFF";
export const DISCOUNT_DEADLINE_LABEL = "Offer valid until July 31st";

/** Whether the promotional window is still open. */
export function isDiscountActive(now: Date = new Date()): boolean {
  return now.getTime() < DISCOUNT_DEADLINE.getTime();
}

/** Returns the promo price (rounded) if active, otherwise the original price. */
export function getDiscountedPrice(originalPrice: number, now: Date = new Date()): number {
  return isDiscountActive(now) ? Math.round(originalPrice * (1 - DISCOUNT_RATE)) : originalPrice;
}
