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

/**
 * Per-category promotional VISIBILITY — deliberately separate from the
 * price MATH above. getDiscountedPrice()/isDiscountActive() keep working
 * exactly as before for every category (so the underlying rate, on/off
 * switch, and calculation are all still fully intact for future use).
 * This map only controls whether the "20% OFF" badge / strikethrough /
 * promotional wording is ever RENDERED for a given category.
 *
 * Currently only Holistic Wellness & Yogic Sciences keeps the promotional
 * UI. Puja, Seva, Darshan, Devotional Shopping/Products, Counselling &
 * Guidance, and every other category now display getDiscountedPrice() as
 * their plain, permanent price with no "20% OFF" messaging — the discount
 * is still being applied under the hood, it's just no longer advertised as
 * a promotion for these categories. To bring the promotional UI back for
 * any of them later, flip its entry below to true — no other code changes
 * are needed, since every call site already reads through this map.
 */
export type DiscountUiCategory =
  | "holistic_wellness"
  | "puja"
  | "seva"
  | "darshan"
  | "bazaar"
  | "counselling_guidance";

export const DISCOUNT_UI_VISIBLE_CATEGORIES: Record<DiscountUiCategory, boolean> = {
  holistic_wellness: true,
  puja: false,
  seva: false,
  darshan: false,
  bazaar: false,
  counselling_guidance: false,
};

/**
 * Whether the "20% OFF" badge/strikethrough/promotional wording should be
 * shown for a specific category right now. True only when BOTH the
 * sitewide switch (DISCOUNT_ACTIVE) is on AND that category is still
 * opted into promotional messaging in DISCOUNT_UI_VISIBLE_CATEGORIES
 * above. The discounted price itself (getDiscountedPrice) is unaffected
 * either way — it keeps being calculated and charged as before.
 */
export function isDiscountPromoVisible(category: DiscountUiCategory, now: Date = new Date()): boolean {
  return isDiscountActive(now) && DISCOUNT_UI_VISIBLE_CATEGORIES[category] === true;
}
