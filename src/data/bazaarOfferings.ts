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
  /** ✅ PRICE/CONTENT SYNC FIX: tier-specific description shown on the card
   *  once this tier is selected — replaces the product-level `description`
   *  so the card text reflects what this amount actually buys, instead of
   *  one fixed description regardless of tier. Optional so entries without
   *  one fall back to `product.description`. */
  description?: string;
  /** Appended as one extra bullet under "This includes" once this tier is
   *  selected. Left undefined where the base `includes` list alone already
   *  describes this tier accurately. */
  extraInclude?: string;
  /** Appended as one extra bullet under "You will receive" once this tier
   *  is selected — so certificate/evidence language, not just the item's
   *  includes, also reflects the selected tier. Left undefined where the
   *  base `devoteeReceives` list alone already describes this tier
   *  accurately. */
  extraReceive?: string;
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
  /**
   * Subjects (matched against real priest pujaExpertise/adviceAreas in
   * priests.ts) used to build this offering's "Priest / Expert Selection"
   * dropdown — resolved at render time via getPriestsByKeywords(keywords,
   * 20), the same pattern used by the Simple Pujas cards in OnlinePuja.tsx
   * and the Structured Seva Offering cards, so the dropdown always shows at
   * least 20 genuinely relevant priests (verified against the live
   * directory) instead of a fixed hand-typed list.
   */
  priestKeywords: string[];
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
      "Your Bhog, Your Sacred Connection — wherever the temple permits, we share a blessed photograph of your bhog offering as a cherished remembrance of your devotion. Where audio or video recording is allowed, a short glimpse of the offering may also be shared. At certain ancient and revered temples, strict security and sacred privacy rules may prohibit photography, audio/video recording, or electronic devices — we deeply respect these traditions and never compromise the temple's sanctity. In such circumstances, your devotion is lovingly acknowledged through a signed digital confirmation/certificate from the temple and, where permitted, a personal audio/video testimony.",
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
      { value: 100, label: "Single Bhog Offering", description: "A single sacred bhog offered to the deity in your name — a simple, heartfelt way to begin your devotion." },
      { value: 200, label: "Two Bhog Offerings", description: "Two bhog offerings made together — a slightly fuller devotional gesture.", extraInclude: "Two separate bhog offerings are prepared and offered, instead of one." },
      { value: 500, label: "Five Bhog Offerings", description: "Five bhog offerings prepared and offered together — a fuller devotional gesture in your name.", extraInclude: "Five bhog offerings are prepared and offered together." },
      { value: 1100, label: "Special Bhog Thali", description: "A Special Bhog Thali — a fuller, more elaborate spread of bhog items offered together as a Premium devotional gesture.", extraInclude: "A full thali of bhog items is prepared and offered together, rather than a single item.", extraReceive: "At this tier, where the temple permits, we also prioritise sharing a short personal audio/video glimpse of the offering alongside your confirmation — a fuller remembrance of this Special Bhog Thali." },
      { value: 2100, label: "Maha Bhog Offering", description: "A Maha Bhog Offering — the most elaborate bhog spread offered to the deity in your name, prepared with the temple's fullest attention.", extraInclude: "An elaborate Maha Bhog spread is prepared and offered, with the temple's fullest attention.", extraReceive: "At this Maha tier, where the temple permits, we prioritise sharing both a blessed photograph and a short personal audio/video glimpse — and where recording is restricted, a detailed signed certificate captures this offering in full." },
      { value: "custom", label: "Custom Bhog Pack" },
    ],
    customAmountEnabled: true,
    ctaLabels: { primary: "Offer in Temple", secondary: "Add to Cart" },
    imageUrl: import.meta.env.BASE_URL + "images/Mahaprasad Seva.jpg",
    isService: true,
    badges: ["Temple Offering Available", "Digital Confirmation"],
    // Verified against the live priest directory: union match count 33.
    priestKeywords: ["festival", "health", "wealth"],
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
      "Digital confirmation shared after dispatch, with an option to add a sankalp-blessing certificate at checkout",
    ],
    options: [
      {
        id: "puja-kit-focus",
        label: "Kit Type",
        choices: [
          { value: "daily-worship", label: "Daily Worship Kit" },
          { value: "festival-special", label: "Festival / Special Occasion Kit" },
          { value: "griha-pravesh", label: "Griha Pravesh / New Home Kit" },
          { value: "satyanarayan", label: "Satyanarayan Puja Kit" },
        ],
      },
    ],
    priceOptions: [
      { value: 100, label: "Mini Puja Kit", description: "A Mini Puja Kit with the basic essentials — roli, chawal, kumkum, haldi and akshat — for a simple daily puja." },
      { value: 200, label: "Daily Puja Kit", description: "A Daily Puja Kit adding a cotton wick, diya, dhoop and kapoor to the basics — everything for a complete daily puja at home.", extraInclude: "Cotton wick, diya, dhoop and kapoor are added to the basic items." },
      { value: 500, label: "Complete Home Puja Kit", description: "A Complete Home Puja Kit — every essential item packed together for a fuller home puja setup.", extraInclude: "All essential puja items are packed together as a complete home set." },
      { value: 1100, label: "Festival Puja Kit", description: "A Festival Puja Kit including a puja cloth alongside the complete set of essentials, suited for festival and special-occasion worship.", extraInclude: "A puja cloth is included alongside the complete set of essentials.", extraReceive: "At this tier, a printed sankalp-blessing card prepared in your name is packed inside the kit, alongside the digital confirmation." },
      { value: 2100, label: "Premium Vedic Puja Kit", description: "A Premium Vedic Puja Kit — the fullest, most complete set of traditional items, packed with extra care for elaborate worship.", extraInclude: "The fullest set of traditional puja items is packed together, with extra care for elaborate worship.", extraReceive: "At this Premium tier, the kit is packed alongside a signed priest certificate confirming it was blessed before dispatch (add \"Bless before dispatch\" below to include this)." },
    ],
    customAmountEnabled: false,
    ctaLabels: { primary: "Buy Now", secondary: "Add to Cart" },
    imageUrl: import.meta.env.BASE_URL + "images/Home Puja Kit.jpg",
    isService: false,
    badges: ["Digital Confirmation"],
    // Verified against the live priest directory: union match count 41.
    priestKeywords: ["festival", "protection", "health"],
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
      { value: 100, label: "Single energised bead / small jap item", description: "A single energised bead or small jap item, prepared and packed with care." },
      { value: 200, label: "Bead pack", description: "A pack of energised beads — a slightly fuller selection for daily jap.", extraInclude: "A pack of beads is prepared instead of a single bead." },
      { value: 500, label: "Half mala / small jap mala", description: "A half mala or small jap mala — a fuller string for regular jap and worship.", extraInclude: "A half mala / small jap mala is prepared, rather than loose beads." },
      { value: 1100, label: "Full mala", description: "A full mala — a Premium, complete string suited for daily jap and worship practice.", extraInclude: "A complete, full mala is prepared and packed with care.", extraReceive: "At this tier, choosing 'Bless before dispatch' includes a short note from the priest on the mala's blessing, alongside your digital confirmation." },
      { value: 2100, label: "Premium mala", description: "A Premium mala — the finest quality mala prepared with extra care, suited for devotees seeking a deeper daily practice.", extraInclude: "The finest quality mala is selected and prepared with extra care.", extraReceive: "At this Premium tier, where the blessing temple permits, a blessed photograph of the mala before dispatch is shared as a keepsake alongside your digital confirmation." },
      { value: "custom", label: "Custom Selection" },
    ],
    customAmountEnabled: true,
    ctaLabels: { primary: "Buy Now", secondary: "Add to Cart" },
    imageUrl: import.meta.env.BASE_URL + "images/Rudraksha Mala.jpg",
    isService: false,
    badges: ["Bless Before Dispatch", "Digital Confirmation"],
    // Verified against the live priest directory: union match count 41.
    priestKeywords: ["health", "protection", "festival"],
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
      { value: 100, label: "Basic diya / dhoop item", description: "A basic diya or dhoop item for your daily home puja and aarti." },
      { value: 200, label: "Diya and dhoop combo", description: "A diya and dhoop combo — a slightly fuller set for daily aarti.", extraInclude: "A diya is packed together with dhoop, instead of one item alone." },
      { value: 500, label: "Aarti essentials combo", description: "An Aarti essentials combo — diya, dhoop, agarbatti and kapoor packed together for a complete daily aarti.", extraInclude: "Diya, dhoop, agarbatti and kapoor are packed together as a complete aarti set." },
      { value: 1100, label: "Monthly puja essentials pack", description: "A Monthly Puja Essentials Pack — a Premium supply of diya, dhoop and aarti items to last through the month.", extraInclude: "A month's supply of diya, dhoop and aarti items is packed together.", extraReceive: "At this tier, a printed monthly aarti checklist is included with your digital confirmation, so nothing runs short before the next pack arrives." },
      { value: "custom", label: "Custom Pack" },
    ],
    customAmountEnabled: true,
    ctaLabels: { primary: "Buy Now", secondary: "Add to Cart" },
    imageUrl: import.meta.env.BASE_URL + "images/Aarti.jpg",
    isService: false,
    badges: ["Digital Confirmation"],
    // Verified against the live priest directory: union match count 28.
    priestKeywords: ["festival", "protection"],
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
      "Digital confirmation shared after dispatch — and where 'Bless before dispatch' is chosen, a note on the temple's photography/recording rules is shared honestly rather than assumed",
    ],
    options: [
      {
        id: "prasad-type",
        label: "Prasad Type",
        choices: [
          { value: "sweet-prasad", label: "Sweet Prasad" },
          { value: "dry-fruit-prasad", label: "Dry Fruit Prasad" },
          { value: "mixed-prasad", label: "Mixed Prasad" },
          { value: "temple-special", label: "Temple's Special Prasad" },
        ],
      },
    ],
    priceOptions: [
      { value: 100, label: "Small prasad pack", description: "A small prasad pack, prepared as per temple tradition and packed with care." },
      { value: 200, label: "Family prasad pack", description: "A family prasad pack — a fuller portion prepared for sharing at home.", extraInclude: "A larger, family-sized portion is prepared instead of a small pack." },
      { value: 500, label: "Special prasad pack", description: "A special prasad pack with a fuller selection of items, prepared with extra care.", extraInclude: "A fuller selection of prasad items is prepared and packed together." },
      { value: 1100, label: "Festival prasad pack", description: "A Festival prasad pack — a Premium, more elaborate selection prepared for festival occasions and gifting.", extraInclude: "An elaborate festival-occasion selection of prasad items is prepared and packed together.", extraReceive: "At this tier, where 'Bless before dispatch' is chosen and the temple permits, a blessed photograph of the pack before dispatch is shared alongside your digital confirmation." },
      { value: "custom", label: "Custom Pack" },
    ],
    customAmountEnabled: true,
    ctaLabels: { primary: "Buy Now", secondary: "Add to Cart" },
    imageUrl: import.meta.env.BASE_URL + "images/prasad.jpg",
    isService: false,
    badges: ["Digital Confirmation"],
    // Verified against the live priest directory: union match count 33.
    priestKeywords: ["festival", "wealth", "health"],
  },
];
