/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ─────────────────────────────────────────────────────────────────────────
// Structured Devotional Shopping Offerings — reusable data model
// Used by BazaarOfferingCard.tsx inside the "Temple Bazaar Store" section
// (TemplateBazaar.tsx). Modelled directly on the SevaOffering pattern in
// sevaOfferings.ts (used by Seva Hub & Live Devotional Dashboard), kept as
// plain data (no JSX) so new products can be added, translated, or later
// swapped for live API/CMS data without touching component code.
// ─────────────────────────────────────────────────────────────────────────

export interface BazaarPriceOption {
  /** Rupee amount for this tier, or "custom" to reveal the custom-amount input. */
  value: number | "custom";
  /** Tier name shown in the dropdown, e.g. "Single Bhog Offering". */
  label: string;
}

export interface BazaarSelectOption {
  value: string;
  label: string;
}

export interface BazaarOptionGroup {
  id: string;
  /** Dropdown label, e.g. "Bhog Type", "Mala / Bead Type". */
  label: string;
  choices: BazaarSelectOption[];
}

export interface BazaarAddOn {
  id: string;
  label: string;
  /** Whether choosing this add-on reveals a short free-text input. */
  requiresText?: boolean;
  textPlaceholder?: string;
}

export interface BazaarProduct {
  id: string;
  title: string;
  /** Category group this card belongs to — used for the filter tabs. */
  category: string;
  /** Short devotional description shown on the card. */
  description: string;
  /** What the offering covers / includes. */
  includes: string[];
  /** What the devotee receives once the order/offering is processed. */
  devoteeReceives: string[];
  /** Optional extra dropdown(s), e.g. Bhog Type, Mala Type, Item Type. */
  options: BazaarOptionGroup[];
  priceOptions: BazaarPriceOption[];
  customAmountEnabled: boolean;
  ctaLabels: { primary: string; secondary: string };
  /** Existing project photo. Left null only if no matching real photo is
   *  available yet, so the card falls back to a clean icon placeholder
   *  instead of showing an unrelated/misleading image. */
  imageUrl: string | null;
  /** True = performed/offered at the temple (no shipping address needed).
   *  False = physical item shipped to the devotee's address — the existing
   *  Puja Sankalpa Portal already collects the delivery address for these. */
  isService: boolean;
  badges: string[];
}

// Shared devotional add-ons offered on every product card.
export const BAZAAR_ADDONS: BazaarAddOn[] = [
  { id: "sankalp-name", label: "Add sankalp name", requiresText: true, textPlaceholder: "Name for sankalp" },
  { id: "bless-before-dispatch", label: "Bless before dispatch" },
  { id: "digital-certificate", label: "Add digital certificate" },
  { id: "gift-message", label: "Add gift message", requiresText: true, textPlaceholder: "Your gift message" },
  { id: "send-as-gift", label: "Send as gift" },
  { id: "offer-first-dispatch", label: "Offer first, then dispatch" },
];

// Category labels used for the "Devotional Shopping Offerings" filter tabs.
export const BAZAAR_CATEGORIES: string[] = [
  "Bhog Offerings",
  "Puja Kits",
  "Mala, Beads & Jap Items",
  "Diya, Dhoop & Aarti Items",
  "Prasad & Blessed Items",
];

export const BAZAAR_DELIVERY_NOTE =
  "Some items can be offered in the temple before dispatch. Devotees may choose temple offering, home delivery, or both where available.";

export const BAZAAR_TRUST_COPY =
  "Every devotional item is prepared, offered, packed, or dispatched with respect for temple tradition. Digital confirmation or certificate will be shared wherever applicable.";

export const BAZAAR_DISCLAIMER =
  "Offerings and sevas are performed with devotion as per temple process. Timings may vary depending on temple schedule, festival rush, priest availability, stock availability, dispatch location, and temple rituals.";

export const BAZAAR_CUSTOM_AMOUNT_NOTE = "Custom devotional amount starts from ₹100.";

export const BAZAAR_PRODUCTS: BazaarProduct[] = [
  {
    id: "bazaar-new-bhog",
    title: "Bhog Offerings",
    category: "Bhog Offerings",
    description:
      "Offer sacred bhog to the deity in your name, prepared and offered as per temple tradition — a simple, heartfelt way to begin your devotion.",
    includes: [
      "Bhog prepared and offered to the deity as per temple process",
      "Prasad packed and shared where available for the tier chosen",
      "Digital confirmation shared once the offering is completed",
    ],
    devoteeReceives: [
      "Bhog offered to the deity in your name",
      "Prasad may be marked as offered, where applicable",
      "Digital confirmation / certificate",
    ],
    options: [
      {
        id: "bhog-type",
        label: "Bhog Type",
        choices: [
          { value: "sweet", label: "Sweet Bhog" },
          { value: "khichdi", label: "Khichdi Bhog" },
          { value: "fruit", label: "Fruit Bhog" },
          { value: "mixed", label: "Mixed Bhog" },
        ],
      },
    ],
    priceOptions: [
      { value: 100, label: "Single Bhog Offering" },
      { value: 200, label: "Two Bhog Offerings" },
      { value: 500, label: "Five Bhog Offerings" },
      { value: 1100, label: "Special Bhog Thali" },
      { value: 2100, label: "Maha Bhog Offering" },
      { value: "custom", label: "Custom Bhog Pack" },
    ],
    customAmountEnabled: true,
    ctaLabels: { primary: "Offer in Temple", secondary: "Add to Cart" },
    imageUrl: import.meta.env.BASE_URL + "images/Mahaprasad Seva.jpg",
    isService: true,
    badges: ["Starts at ₹100", "Temple Offering Available", "Digital Confirmation"],
  },
  {
    id: "bazaar-new-puja-kits",
    title: "Puja Kits",
    category: "Puja Kits",
    description:
      "Traditional puja essentials packed together for daily worship or special occasions — everything set for a simple, complete puja at home.",
    includes: [
      "Roli, chawal, kumkum, haldi & akshat from the Mini Puja Kit tier upward",
      "Cotton wick, diya, dhoop & kapoor included from the Daily Puja Kit tier upward",
      "Puja cloth included in the Festival & Premium Vedic Puja Kit tiers",
    ],
    devoteeReceives: [
      "Puja kit packed and dispatched to your address",
      "Items prepared with care as per temple tradition",
      "Digital confirmation shared after dispatch",
    ],
    options: [],
    priceOptions: [
      { value: 100, label: "Mini Puja Kit" },
      { value: 200, label: "Daily Puja Kit" },
      { value: 500, label: "Complete Home Puja Kit" },
      { value: 1100, label: "Festival Puja Kit" },
      { value: 2100, label: "Premium Vedic Puja Kit" },
    ],
    customAmountEnabled: false,
    ctaLabels: { primary: "Buy Now", secondary: "Add to Cart" },
    imageUrl: import.meta.env.BASE_URL + "images/Home Puja Kit.jpg",
    isService: false,
    badges: ["Starts at ₹100", "Digital Confirmation"],
  },
  {
    id: "bazaar-new-mala-beads",
    title: "Mala, Beads & Jap Items",
    category: "Mala, Beads & Jap Items",
    description:
      "Energised beads and malas for daily jap and worship — choose the type and size that suits your practice.",
    includes: [
      "Bead / mala item as per the type and tier selected",
      "Prepared and packed with care before dispatch",
      "Digital confirmation shared after dispatch",
    ],
    devoteeReceives: [
      "Mala / bead item dispatched to your address",
      "Bless-before-dispatch available as an add-on",
      "Digital confirmation shared after dispatch",
    ],
    options: [
      {
        id: "mala-type",
        label: "Mala / Bead Type",
        choices: [
          { value: "tulsi", label: "Tulsi" },
          { value: "rudraksha", label: "Rudraksha" },
          { value: "chandan", label: "Chandan" },
          { value: "sphatik", label: "Sphatik" },
          { value: "jap-mala", label: "Jap Mala" },
          { value: "wrist-mala", label: "Wrist Mala" },
        ],
      },
    ],
    priceOptions: [
      { value: 100, label: "Single energised bead / small jap item" },
      { value: 200, label: "Bead pack" },
      { value: 500, label: "Half mala / small jap mala" },
      { value: 1100, label: "Full mala" },
      { value: 2100, label: "Premium mala" },
      { value: "custom", label: "Custom Selection" },
    ],
    customAmountEnabled: true,
    ctaLabels: { primary: "Buy Now", secondary: "Add to Cart" },
    imageUrl: import.meta.env.BASE_URL + "images/Rudraksha Mala.jpg",
    isService: false,
    badges: ["Starts at ₹100", "Bless Before Dispatch", "Digital Confirmation"],
  },
  {
    id: "bazaar-new-diya-dhoop",
    title: "Diya, Dhoop & Aarti Items",
    category: "Diya, Dhoop & Aarti Items",
    description:
      "Everyday aarti essentials — diyas, dhoop, agarbatti and more — for your home puja and daily aarti.",
    includes: [
      "Diya / dhoop / agarbatti / kapoor as per the tier and item type chosen",
      "Cotton wicks and ghee or oil diyas included in higher tiers",
      "Digital confirmation shared after dispatch",
    ],
    devoteeReceives: [
      "Item dispatched to your address",
      "Bless-before-dispatch available as an add-on",
      "Digital confirmation shared after dispatch",
    ],
    options: [
      {
        id: "diya-item-type",
        label: "Item Type",
        choices: [
          { value: "diya", label: "Diya" },
          { value: "dhoop", label: "Dhoop" },
          { value: "agarbatti", label: "Agarbatti" },
          { value: "kapoor", label: "Kapoor" },
          { value: "cotton-wicks", label: "Cotton Wicks" },
          { value: "ghee-diya", label: "Ghee Diya" },
          { value: "oil-diya", label: "Oil Diya" },
        ],
      },
    ],
    priceOptions: [
      { value: 100, label: "Basic diya / dhoop item" },
      { value: 200, label: "Diya and dhoop combo" },
      { value: 500, label: "Aarti essentials combo" },
      { value: 1100, label: "Monthly puja essentials pack" },
      { value: "custom", label: "Custom Pack" },
    ],
    customAmountEnabled: true,
    ctaLabels: { primary: "Buy Now", secondary: "Add to Cart" },
    imageUrl: import.meta.env.BASE_URL + "images/Aarti.jpg",
    isService: false,
    badges: ["Starts at ₹100", "Digital Confirmation"],
  },
  {
    id: "bazaar-new-prasad-blessed",
    title: "Prasad & Blessed Items",
    category: "Prasad & Blessed Items",
    description:
      "Prasad packs prepared as per temple tradition and packed with care, for you, your family, or as a devotional gift.",
    includes: [
      "Prasad prepared as per temple process for the tier selected",
      "Packed hygienically before dispatch",
      "Digital confirmation shared after dispatch",
    ],
    devoteeReceives: [
      "Prasad pack dispatched to your address",
      "Bless-before-dispatch available as an add-on",
      "Digital confirmation shared after dispatch",
    ],
    options: [],
    priceOptions: [
      { value: 100, label: "Small prasad pack" },
      { value: 200, label: "Family prasad pack" },
      { value: 500, label: "Special prasad pack" },
      { value: 1100, label: "Festival prasad pack" },
      { value: "custom", label: "Custom Pack" },
    ],
    customAmountEnabled: true,
    ctaLabels: { primary: "Buy Now", secondary: "Add to Cart" },
    imageUrl: import.meta.env.BASE_URL + "images/prasad.jpg",
    isService: false,
    badges: ["Starts at ₹100", "Digital Confirmation"],
  },
];
