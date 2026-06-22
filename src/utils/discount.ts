/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sitewide "Book Before July" promotional discount.
 * Change the rate or deadline here and every puja/seva/wellness price
 * across the site updates automatically — the discount also switches
 * itself off once the deadline passes, with no manual cleanup needed.
 */

export const DISCOUNT_RATE = 0.5; // 50% off
export const DISCOUNT_DEADLINE = new Date("2026-07-01T00:00:00+05:30"); // midnight IST, July 1
export const DISCOUNT_TAG = "50% OFF";
export const DISCOUNT_DEADLINE_LABEL = "Book before July";

/** Whether the promotional window is still open. */
export function isDiscountActive(now: Date = new Date()): boolean {
  return now.getTime() < DISCOUNT_DEADLINE.getTime();
}

/** Returns the promo price (rounded) if active, otherwise the original price. */
export function getDiscountedPrice(originalPrice: number, now: Date = new Date()): number {
  return isDiscountActive(now) ? Math.round(originalPrice * (1 - DISCOUNT_RATE)) : originalPrice;
}
