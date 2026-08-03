/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sitewide "Summer Special" promotional discount.
 *
 * IMPORTANT: This is now a MANUAL on/off switch (DISCOUNT_ACTIVE), not a
 * deadline. The previous version auto-expired on a fixed date (Aug 1) and
 * silently reverted every puja/seva/wellness price to full price with no
 * live campaign to replace it — devotees who remembered the offer saw a
 * price increase with no explanation. That was a trust problem, not a
 * pricing problem, so the fix is structural: there is no deadline to lapse
 * anymore. The discount stays ON until a human flips DISCOUNT_ACTIVE to
 * false below. Change the rate here and every price across the site
 * updates automatically.
 */

export const DISCOUNT_RATE = 0.20; // 20% off
export const DISCOUNT_TAG = "20% OFF";

// Flip this to false to end the campaign. There is no auto-expiry — the
// discount will keep applying indefinitely until this is changed by hand.
export const DISCOUNT_ACTIVE = true;

/** Whether the promotional window is currently open. */
export function isDiscountActive(_now: Date = new Date()): boolean {
  return DISCOUNT_ACTIVE;
}

/** Returns the promo price (rounded) if active, otherwise the original price. */
export function getDiscountedPrice(originalPrice: number, now: Date = new Date()): number {
  return isDiscountActive(now) ? Math.round(originalPrice * (1 - DISCOUNT_RATE)) : originalPrice;
}
