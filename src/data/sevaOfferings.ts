/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ─────────────────────────────────────────────────────────────────────────
// Structured Seva Offerings — reusable data model
// Used by SevaOfferingCard.tsx inside the "Seva Hub & Live Devotional
// Dashboard" section (SevaExperience.tsx). Kept as plain data (no JSX) so
// new sevas can be added, translated, or later swapped for live API/CMS
// data without touching component code.
// ─────────────────────────────────────────────────────────────────────────

export interface SevaPriceOption {
  /** Rupee amount for this option, or "custom" to reveal the custom-amount input. */
  value: number | "custom";
  /** What this specific amount does for this seva, e.g. "Feed 5 cows". */
  label: string;
}

export interface SevaDropdownOption {
  value: string;
  label: string;
}

export interface SevaOffering {
  id: string;
  title: string;
  category: string;
  /** Short devotional description shown on the card. */
  description: string;
  /** What the seva covers / includes. */
  includes: string[];
  /** What the devotee receives once the seva is performed. */
  devoteeReceives: string[];
  /** Label for the amount/option selector, e.g. "Number of cows". */
  dropdownLabel: string;
  priceOptions: SevaPriceOption[];
  customAmountEnabled: boolean;
  certificateTimeline: string;
  ctaLabel: string;
  /** Optional existing project photo. Left null for sevas with no matching
   *  real photo yet, so the card falls back to the icon banner instead of
   *  showing an unrelated/misleading image. */
  imageUrl?: string | null;
}

// Occasion options shared by every seva's common form fields.
export const SEVA_OCCASIONS: SevaDropdownOption[] = [
  { value: "birthday", label: "Birthday" },
  { value: "anniversary", label: "Anniversary" },
  { value: "pitru-memory", label: "Pitru Memory" },
  { value: "gratitude", label: "Gratitude" },
  { value: "health-wellbeing", label: "Health & Wellbeing" },
  { value: "peace-protection", label: "Peace & Protection" },
  { value: "other", label: "Other" },
];

// Reference tier system (₹100 → ₹2,100+) that every seva's priceOptions
// are drawn from. Shown as badges/labels across the seva cards.
export const SEVA_TIERS = [
  { amount: 100, label: "Simple Offering", note: "Small but meaningful participation." },
  { amount: 200, label: "Enhanced Offering", note: "Extra Sankalp, Dhoop, Diya, or more beneficiaries." },
  { amount: 500, label: "Special Offering", note: "Bhog, Diya, Dhoop, camphor, feeding, or expanded seva." },
  { amount: 1100, label: "Premium Devotional Seva", note: "For birthdays, anniversaries, Pitru Memory, gratitude, family Sankalp, or special prayers." },
  { amount: 2100, label: "Maha Seva / Major Offering", note: "For larger seva, festival offerings, feeding more people/cows, or special temple contribution." },
];

export const SEVA_OFFERINGS: SevaOffering[] = [
  {
    id: "seva-gau-feeding",
    title: "Gau Seva / Cow Feeding",
    category: "Gau Seva",
    description: "Offer fresh fodder, jaggery, and roti to sacred cows at our partner Gaushalas — a seva believed to bring prosperity and remove obstacles.",
    includes: ["Fresh fodder, jaggery & roti for the cows sponsored", "Seva performed at a registered Gaushala", "Photo evidence of the feeding"],
    devoteeReceives: ["Digital seva certificate in your name", "Photo evidence shared after completion", "Sankalp recorded with your Gotra"],
    dropdownLabel: "Number of cows",
    priceOptions: [
      { value: 100, label: "Feed 1 cow" },
      { value: 200, label: "Feed 2 cows" },
      { value: 500, label: "Feed 5 cows" },
      { value: 1100, label: "Feed 11 cows" },
      { value: 2100, label: "Special Gau Seva" },
      { value: "custom", label: "Custom Amount" },
    ],
    customAmountEnabled: true,
    certificateTimeline: "Certificate & evidence shared within 24–48 hours of seva completion.",
    ctaLabel: "Offer Gau Seva",
    imageUrl: import.meta.env.BASE_URL + "images/Gau Seva.jpg",
  },
  {
    id: "seva-annadan",
    title: "Annadan / Food Seva",
    category: "Annadan",
    description: "Sponsor sacred meals for devotees and the underprivileged near temple premises — one of the most revered forms of seva in Sanatan Dharma.",
    includes: ["Freshly prepared, temple-blessed meals", "Distribution at temple premises or registered kitchens", "Photo evidence of the distribution"],
    devoteeReceives: ["Digital seva certificate in your name", "Photo evidence shared after completion", "Sankalp recorded with your Gotra"],
    dropdownLabel: "Meal coverage",
    priceOptions: [
      { value: 100, label: "Feed 2 people, one meal" },
      { value: 200, label: "Feed 2 people, two meals" },
      { value: 500, label: "Feed 3 people, three meals" },
      { value: 1100, label: "Feed 11 people" },
      { value: 2100, label: "Feed 21 people" },
      { value: "custom", label: "Custom Amount" },
    ],
    customAmountEnabled: true,
    certificateTimeline: "Certificate & evidence shared within 24–48 hours of seva completion.",
    ctaLabel: "Offer Annadan",
    imageUrl: import.meta.env.BASE_URL + "images/Annadanam Seva.jpg",
  },
  {
    id: "seva-deep-daan",
    title: "Deep Daan / Diya Seva",
    category: "Deep Daan",
    description: "Sponsor sacred lamps (diyas) lit in your name at the temple sanctum, dispelling darkness and inviting divine blessings.",
    includes: ["Ghee/oil diyas lit at the temple", "Diya seva performed during Aarti", "Photo evidence of the lit diyas"],
    devoteeReceives: ["Digital seva certificate in your name", "Photo evidence shared after completion", "Sankalp recorded with your Gotra"],
    dropdownLabel: "Number of diyas",
    priceOptions: [
      { value: 100, label: "1 diya" },
      { value: 200, label: "2 diyas" },
      { value: 500, label: "5 diyas" },
      { value: 1100, label: "11 diyas" },
      { value: "custom", label: "Custom Amount" },
    ],
    customAmountEnabled: true,
    certificateTimeline: "Certificate & evidence shared within 24–48 hours of seva completion.",
    ctaLabel: "Offer Deep Daan",
    imageUrl: import.meta.env.BASE_URL + "images/Diya Lighting.jpg",
  },
  {
    id: "seva-dhoop-camphor",
    title: "Dhoop & Camphor Seva",
    category: "Dhoop & Camphor",
    description: "Sponsor sacred dhoop and camphor offerings during the temple's Aarti — a fragrant seva that purifies the sanctum atmosphere.",
    includes: ["Dhoop / camphor offered during Aarti", "Performed by temple priests as per ritual process", "Photo or short video evidence where available"],
    devoteeReceives: ["Digital seva certificate in your name", "Evidence shared after completion", "Sankalp recorded with your Gotra"],
    dropdownLabel: "Offering type",
    priceOptions: [
      { value: 100, label: "Dhoop offering" },
      { value: 200, label: "Dhoop and camphor" },
      { value: 500, label: "Special fragrance offering" },
      { value: 1100, label: "Full evening Aarti support" },
      { value: "custom", label: "Custom Amount" },
    ],
    customAmountEnabled: true,
    certificateTimeline: "Certificate & evidence shared within 24–48 hours of seva completion.",
    ctaLabel: "Offer Dhoop Seva",
    imageUrl: import.meta.env.BASE_URL + "images/Aarti.jpg",
  },
  {
    id: "seva-flower",
    title: "Flower Seva",
    category: "Flower Seva",
    description: "Offer fresh flowers and tulsi to the deity, or sponsor a garland seva — a simple, fragrant way to express devotion.",
    includes: ["Fresh flowers / tulsi / garland as per option chosen", "Offered directly to the deity during seva", "Photo evidence of the offering"],
    devoteeReceives: ["Digital seva certificate in your name", "Photo evidence shared after completion", "Sankalp recorded with your Gotra"],
    dropdownLabel: "Offering type",
    priceOptions: [
      { value: 100, label: "Small flower offering" },
      { value: 200, label: "Flower and tulsi offering" },
      { value: 500, label: "Special flower basket" },
      { value: 1100, label: "Garland seva" },
      { value: "custom", label: "Custom Amount" },
    ],
    customAmountEnabled: true,
    certificateTimeline: "Certificate & evidence shared within 24–48 hours of seva completion.",
    ctaLabel: "Offer Flower Seva",
    imageUrl: import.meta.env.BASE_URL + "images/Flower.jpg",
  },
  {
    id: "seva-temple-maintenance",
    title: "Temple Maintenance Seva",
    category: "Temple Maintenance",
    description: "Support the daily upkeep of temple premises — cleanliness, lamp oil, and general maintenance so seva can continue uninterrupted.",
    includes: ["Cleaning materials / lamp oil / upkeep support as per option chosen", "Contribution routed to the supported temple's maintenance needs", "Acknowledgement shared after the contribution is recorded"],
    devoteeReceives: ["Digital contribution certificate in your name", "Acknowledgement shared after processing", "Sankalp recorded with your Gotra"],
    dropdownLabel: "Support type",
    priceOptions: [
      { value: 100, label: "Cleaning support" },
      { value: 200, label: "Daily temple support" },
      { value: 500, label: "Lamp / oil / cleanliness support" },
      { value: 1100, label: "One-day temple support" },
      { value: 2100, label: "Special seva contribution" },
      { value: "custom", label: "Custom Amount" },
    ],
    customAmountEnabled: true,
    certificateTimeline: "Acknowledgement shared within 2–3 working days.",
    ctaLabel: "Contribute Seva",
    imageUrl: import.meta.env.BASE_URL + "images/Temple_Maintenance.jpg",
  },
];
