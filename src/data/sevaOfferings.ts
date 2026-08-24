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

// ✅ IMAGE FIX (Red-Cloth & Coconut / Bhang, Fruits & Confectionery / Brass
// Bell / Custom Temple Offering): these 4 photos live in src/assets/images,
// not public/images, so they can't use the `import.meta.env.BASE_URL +
// "images/Name.jpg"` string pattern the other offerings above use (that
// pattern only resolves files placed in public/images — pointing it at a
// src/assets file 404s and renders as blank space). They need a static
// Vite import instead — see OptimizedImage.tsx's "case 2" for why — which
// is what these four import pairs are for.
import coconutImg from "../assets/images/Coconut.jpg";
import coconutImgWebp from "../assets/images/Coconut.webp";
import bhangImg from "../assets/images/Bhang.jpg";
import bhangImgWebp from "../assets/images/Bhang.webp";
import bellsImg from "../assets/images/Bells.jpg";
import bellsImgWebp from "../assets/images/Bells.webp";
import otherOfferingsImg from "../assets/images/Other_Offerings.jpg";
import otherOfferingsImgWebp from "../assets/images/Other_Offerings.webp";

export interface SevaPriceOption {
  /** Rupee amount for this option, or "custom" to reveal the custom-amount input. */
  value: number | "custom";
  /** What this specific amount does for this seva, e.g. "Feed 5 cows". */
  label: string;
  /** ✅ PRICE/CONTENT SYNC FIX: tier-specific description shown on the card
   *  once this option is selected — replaces the offering-level
   *  `description` so the card text actually reflects what this amount
   *  buys (e.g. "5 diyas" vs "1 diya"), instead of one fixed description
   *  no matter which amount is picked. Optional so existing/base entries
   *  without one fall back to `offering.description`. */
  description?: string;
  /** Appended as one extra bullet under "This seva includes" once this
   *  option is selected. Left undefined where the base `includes` list
   *  alone already describes this tier accurately. */
  extraInclude?: string;
  /** Appended as one extra bullet under "You will receive" once this
   *  option is selected — so certificate/evidence language, not just the
   *  seva's includes, also reflects the selected tier (e.g. higher tiers
   *  mentioning a personal audio/video priest testimony where permitted).
   *  Left undefined where the base `devoteeReceives` list alone already
   *  describes this tier accurately. */
  extraReceive?: string;
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
  /** Only set when `imageUrl` is a statically-imported src/assets image
   *  (Vite fingerprints these into hashed filenames at build time, so the
   *  .jpg → .webp string-replace OptimizedImage does for BASE_URL-based
   *  images won't work). Passed through as OptimizedImage's `webpSrc`. */
  webpImageUrl?: string | null;
  /**
   * Subjects (matched against real priest pujaExpertise/adviceAreas in
   * priests.ts) used to build this offering's "Priest / Expert Selection"
   * dropdown — resolved at render time via getPriestsByKeywords(keywords,
   * 20), the same pattern used by the Simple Pujas cards in OnlinePuja.tsx,
   * so the dropdown always shows at least 20 genuinely relevant priests
   * (verified against the live directory) instead of a fixed hand-typed list.
   */
  priestKeywords: string[];
  /** When true (Custom Temple Offering only), the card also collects a
   *  free-text temple name, location in India, and the temple's known
   *  offering — required before this seva can be offered, since there is
   *  no fixed temple/offering to describe otherwise. */
  customTempleFields?: boolean;
  /** How the banner image fills its fixed-height frame. Default (omitted)
   *  is "cover" — the existing site-wide behaviour (fills the frame,
   *  center-cropping any overflow) used by every offering above. Set to
   *  "contain" only when the source image is a square graphic with text or
   *  detail near its edges (e.g. a title, a labelled diagram) that
   *  center-cropping would cut off — the full image is shown letterboxed
   *  on the site's dark teal background instead. */
  imageFit?: "cover" | "contain";
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

// Section-level disclaimer shown once beneath the Seva Offerings grid —
// same wording pattern as BAZAAR_DISCLAIMER (data/bazaarOfferings.ts) and
// the Simple Pujas disclaimer (components/OnlinePuja.tsx), kept honest and
// non-promissory: no guaranteed outcomes, just process transparency.
export const SEVA_DISCLAIMER =
  "Sevas are performed with devotion as per temple/Gaushala process. Timings may vary depending on temple schedule, festival rush, priest/Gaushala availability, and local logistics. A seva is an act of devotion and does not guarantee any specific outcome.";

// Reference tier system (₹100 → ₹2,100+) that every seva's priceOptions
// are drawn from. Shown as badges/labels across the seva cards.
export const SEVA_TIERS = [
  { amount: 100, label: "Simple Offering", note: "Small but meaningful participation." },
  { amount: 200, label: "Enhanced Offering", note: "Extra Sankalp, Dhoop, Diya, or more beneficiaries." },
  { amount: 500, label: "Special Offering", note: "Bhog, Diya, Dhoop, camphor, feeding, or expanded seva." },
  { amount: 1100, label: "Premium Devotional Seva", note: "For birthdays, anniversaries, Pitru Memory, gratitude, family Sankalp, or special prayers." },
  { amount: 2100, label: "Maha Seva / Major Offering", note: "For larger seva, festival offerings, feeding more people/cows, or special temple divine contribution." },
];

export const SEVA_OFFERINGS: SevaOffering[] = [
  {
    id: "seva-annadan",
    title: "Annadan / Food Seva",
    category: "Annadan",
    description: "Sponsor sacred meals for devotees and the underprivileged near temple premises — one of the most revered forms of seva in Sanatan Dharma.",
    includes: ["Freshly prepared, temple-blessed meals", "Distribution at temple premises or registered kitchens", "Photo evidence of the distribution"],
    devoteeReceives: ["Digital seva certificate in your name", "Your Seva, Your Sacred Connection — wherever the temple or Gaushala permits, we share a blessed photograph of your seva as a cherished remembrance of your offering. Where audio or video recording is allowed, a short glimpse of the ritual may also be shared. At certain ancient and revered temples, strict security and sacred privacy rules may prohibit photography, audio/video recording, or electronic devices — we deeply respect these traditions and never compromise the temple's sanctity. In such circumstances, your devotion is lovingly acknowledged through a signed certificate from the performing priest and, where permitted, a personal audio/video testimony from the priest.", "Sankalp recorded with your Gotra"],
    dropdownLabel: "Meal coverage",
    // ₹100 per person, per meal — consistent across every tier (previously
    // the ₹100/₹200/₹500 tiers implied ₹50-56/person while ₹1,100/₹2,100
    // already used ₹100/person; only the meal-serving counts were
    // recalculated below, no amount was changed).
    priceOptions: [
      { value: 100, label: "Feed 1 person, one meal", description: "Sponsor a single sacred meal for one person near temple premises — a small but complete act of Annadan." },
      { value: 200, label: "Feed 2 people, one meal", description: "Sponsor meals for two people — extending this sacred Annadan a little further.", extraInclude: "Meals are prepared and shared for 2 people instead of 1." },
      { value: 500, label: "Feed 5 people, one meal", description: "Sponsor meals for five people — a fuller Annadan, one of the most revered forms of seva in Sanatan Dharma.", extraInclude: "Meals are prepared and shared for 5 people." },
      { value: 1100, label: "Feed 11 people, one meal", description: "Sponsor meals for eleven people — a Premium Annadan Seva that feeds a small gathering in your name.", extraInclude: "Meals are prepared and shared for 11 people, with your Sankalp read for the full group fed." , extraReceive: "At this tier, where the temple/Gaushala permits, we also share a short personal audio or video testimony from the performing priest along with your certificate — a fuller, more personal remembrance of this seva." },
      { value: 2100, label: "Feed 21 people, one meal", description: "Sponsor meals for twenty-one people — a Maha Annadan, among the most revered and far-reaching forms of seva in Sanatan Dharma.", extraInclude: "Meals are prepared and shared for 21 people, with your Sankalp read for the full group fed." , extraReceive: "At this Maha tier, where the temple/Gaushala permits, we prioritise sharing both a blessed photograph and a short personal audio/video testimony from the performing priest — and where recording is restricted, a detailed signed certificate captures this seva in full." },
      { value: "custom", label: "Custom Amount" },
    ],
    customAmountEnabled: true,
    certificateTimeline: "Certificate & evidence shared within 3-7 working days of seva completion.",
    ctaLabel: "Offer Annadan",
    imageUrl: import.meta.env.BASE_URL + "images/Annadanam Seva.jpg",
    // Verified against the live priest directory: union match count 38.
    priestKeywords: ["wealth", "health", "ancestral", "festival"],
  },
  {
    id: "seva-temple-maintenance",
    title: "Temple Maintenance Seva",
    category: "Temple Maintenance",
    description: "Support the daily upkeep of temple premises — cleanliness, lamp oil, and general maintenance so seva can continue uninterrupted.",
    includes: ["Cleaning materials / lamp oil / upkeep support as per option chosen", "Divine Contribution routed to the supported temple's maintenance needs", "Acknowledgement shared after the divine contribution is recorded"],
    devoteeReceives: ["Digital divine contribution certificate in your name", "Your Seva, Your Sacred Connection — wherever the temple or Gaushala permits, we share a blessed photograph of your divine contribution as a cherished remembrance of your offering. Where audio or video recording is allowed, a short glimpse of the ritual may also be shared. At certain ancient and revered temples, strict security and sacred privacy rules may prohibit photography, audio/video recording, or electronic devices — we deeply respect these traditions and never compromise the temple's sanctity. In such circumstances, your devotion is lovingly acknowledged through a signed certificate from the performing priest and, where permitted, a personal audio/video testimony from the priest.", "Sankalp recorded with your Gotra"],
    dropdownLabel: "Support type",
    priceOptions: [
      { value: 100, label: "Cleaning support", description: "A small divine contribution toward temple cleaning materials — every bit keeps the sanctum ready for daily worship." },
      { value: 200, label: "Daily temple support", description: "A contribution toward a full day's temple upkeep — cleaning, small repairs, and general support.", extraInclude: "Contribution is routed toward a day's general temple upkeep, not cleaning materials alone." },
      { value: 500, label: "Lamp / oil / cleanliness support", description: "A contribution covering lamp oil, cleaning materials and general upkeep together — a fuller Temple Maintenance Seva.", extraInclude: "Contribution covers lamp oil and cleaning materials together, not one alone." },
      { value: 1100, label: "One-day temple support", description: "A Premium contribution covering a full day of temple upkeep — cleaning, lamp oil, and general maintenance needs for that day.", extraInclude: "Contribution is sized to cover a full day of the temple's combined upkeep needs." , extraReceive: "At this tier, where the temple/Gaushala permits, we also share a short personal audio or video testimony from the performing priest along with your certificate — a fuller, more personal remembrance of this seva." },
      { value: 2100, label: "Special seva divine contribution", description: "A Maha divine contribution toward the temple's larger maintenance needs — repairs, upkeep, and continuity of daily seva.", extraInclude: "Contribution is routed toward larger maintenance needs beyond daily upkeep, as guided by the temple." , extraReceive: "At this Maha tier, where the temple/Gaushala permits, we prioritise sharing both a blessed photograph and a short personal audio/video testimony from the performing priest — and where recording is restricted, a detailed signed certificate captures this seva in full." },
      { value: "custom", label: "Custom Amount" },
    ],
    customAmountEnabled: true,
    certificateTimeline: "Acknowledgement shared within 3-7 working days.",
    ctaLabel: "Contribute Seva",
    imageUrl: import.meta.env.BASE_URL + "images/Temple_Maintenance.jpg",
    // Verified against the live priest directory: union match count 44.
    priestKeywords: ["protection", "wealth", "festival"],
  },
  {
    id: "seva-deep-daan",
    title: "Deep Daan / Diya Seva",
    category: "Deep Daan",
    description: "Sponsor sacred lamps (diyas) lit in your name at the temple sanctum, dispelling darkness and inviting divine blessings.",
    includes: ["Ghee/oil diyas lit at the temple", "Diya seva performed during Aarti", "Photo evidence of the lit diyas"],
    devoteeReceives: ["Digital seva certificate in your name", "Your Seva, Your Sacred Connection — wherever the temple or Gaushala permits, we share a blessed photograph of your seva as a cherished remembrance of your offering. Where audio or video recording is allowed, a short glimpse of the ritual may also be shared. At certain ancient and revered temples, strict security and sacred privacy rules may prohibit photography, audio/video recording, or electronic devices — we deeply respect these traditions and never compromise the temple's sanctity. In such circumstances, your devotion is lovingly acknowledged through a signed certificate from the performing priest and, where permitted, a personal audio/video testimony from the priest.", "Sankalp recorded with your Gotra"],
    dropdownLabel: "Number of diyas",
    priceOptions: [
      { value: 100, label: "1 diya", description: "Sponsor one ghee/oil diya lit in your name at the temple sanctum during Aarti." },
      { value: 200, label: "2 diyas", description: "Sponsor two diyas lit in your name — a slightly fuller Deep Daan.", extraInclude: "2 diyas are lit in your name instead of 1." },
      { value: 500, label: "5 diyas", description: "Sponsor five diyas lit in your name — a fuller row of light offered during Aarti.", extraInclude: "5 diyas are lit in your name during Aarti." },
      { value: 1100, label: "11 diyas", description: "Sponsor eleven diyas lit in your name — a Premium Deep Daan, a fuller offering of light dispelling darkness.", extraInclude: "11 diyas are lit in your name, with your Sankalp read for the full offering." , extraReceive: "At this tier, where the temple/Gaushala permits, we also share a short personal audio or video testimony from the performing priest along with your certificate — a fuller, more personal remembrance of this seva." },
      { value: "custom", label: "Custom Amount" },
    ],
    customAmountEnabled: true,
    certificateTimeline: "Certificate & evidence shared within 3-7 working days of seva completion.",
    ctaLabel: "Offer Deep Daan",
    imageUrl: import.meta.env.BASE_URL + "images/Diya Lighting.jpg",
    // Verified against the live priest directory: union match count 41.
    priestKeywords: ["protection", "festival", "health"],
  },
  {
    id: "seva-flower",
    title: "Flower Seva",
    category: "Flower Seva",
    description: "Offer fresh flowers and tulsi to the deity, or sponsor a garland seva — a simple, fragrant way to express devotion.",
    includes: ["Fresh flowers / tulsi / garland as per option chosen", "Offered directly to the deity during seva", "Photo evidence of the offering"],
    devoteeReceives: ["Digital seva certificate in your name", "Your Seva, Your Sacred Connection — wherever the temple or Gaushala permits, we share a blessed photograph of your seva as a cherished remembrance of your offering. Where audio or video recording is allowed, a short glimpse of the ritual may also be shared. At certain ancient and revered temples, strict security and sacred privacy rules may prohibit photography, audio/video recording, or electronic devices — we deeply respect these traditions and never compromise the temple's sanctity. In such circumstances, your devotion is lovingly acknowledged through a signed certificate from the performing priest and, where permitted, a personal audio/video testimony from the priest.", "Sankalp recorded with your Gotra"],
    dropdownLabel: "Offering type",
    priceOptions: [
      { value: 100, label: "Small flower offering", description: "Offer a small, simple bunch of fresh flowers to the deity — a fragrant, humble expression of devotion." },
      { value: 200, label: "Flower and tulsi offering", description: "Offer fresh flowers together with tulsi — a slightly fuller floral offering.", extraInclude: "Tulsi is offered alongside the fresh flowers." },
      { value: 500, label: "Special flower basket", description: "Sponsor a special flower basket offered to the deity — a fuller, more elaborate floral seva.", extraInclude: "A full flower basket is offered instead of a small bunch." },
      { value: 1100, label: "Garland seva", description: "Sponsor a garland seva — a Premium floral offering placed directly on the deity, one of the most personal forms of Flower Seva.", extraInclude: "A garland is offered and placed on the deity, in place of a flower basket." , extraReceive: "At this tier, where the temple/Gaushala permits, we also share a short personal audio or video testimony from the performing priest along with your certificate — a fuller, more personal remembrance of this seva." },
      { value: "custom", label: "Custom Amount" },
    ],
    customAmountEnabled: true,
    certificateTimeline: "Certificate & evidence shared within 3-7 working days of seva completion.",
    ctaLabel: "Offer Flower Seva",
    imageUrl: import.meta.env.BASE_URL + "images/Flower.jpg",
    // Verified against the live priest directory: union match count 50.
    priestKeywords: ["festival", "marriage", "protection"],
  },
  {
    id: "seva-dhoop-camphor",
    title: "Dhoop & Camphor Seva",
    category: "Dhoop & Camphor",
    description: "Sponsor sacred dhoop and camphor offerings during the temple's Aarti — a fragrant seva that purifies the sanctum atmosphere.",
    includes: ["Dhoop / camphor offered during Aarti", "Performed by temple priests as per ritual process", "Photo or short video evidence where available"],
    devoteeReceives: ["Digital seva certificate in your name", "Your Seva, Your Sacred Connection — wherever the temple or Gaushala permits, we share a blessed photograph of your seva as a cherished remembrance of your offering. Where audio or video recording is allowed, a short glimpse of the ritual may also be shared. At certain ancient and revered temples, strict security and sacred privacy rules may prohibit photography, audio/video recording, or electronic devices — we deeply respect these traditions and never compromise the temple's sanctity. In such circumstances, your devotion is lovingly acknowledged through a signed certificate from the performing priest and, where permitted, a personal audio/video testimony from the priest.", "Sankalp recorded with your Gotra"],
    dropdownLabel: "Offering type",
    priceOptions: [
      { value: 100, label: "Dhoop offering", description: "Sponsor a dhoop offering during the temple's Aarti — a fragrant seva that purifies the sanctum atmosphere." },
      { value: 200, label: "Dhoop and camphor", description: "Sponsor dhoop together with camphor during Aarti — a slightly fuller fragrance offering.", extraInclude: "Camphor is offered alongside the dhoop." },
      { value: 500, label: "Special fragrance offering", description: "Sponsor a special fragrance offering — an expanded dhoop and camphor seva during Aarti.", extraInclude: "An expanded set of fragrance offerings is used, beyond dhoop and camphor alone." },
      { value: 1100, label: "Full evening Aarti support", description: "Sponsor full evening Aarti support — a Premium seva covering dhoop, camphor and fragrance offerings through the entire evening Aarti.", extraInclude: "Support covers the entire evening Aarti's dhoop and camphor needs, not a single offering." , extraReceive: "At this tier, where the temple/Gaushala permits, we also share a short personal audio or video testimony from the performing priest along with your certificate — a fuller, more personal remembrance of this seva." },
      { value: "custom", label: "Custom Amount" },
    ],
    customAmountEnabled: true,
    certificateTimeline: "Certificate & evidence shared within 3-7 working days of seva completion.",
    ctaLabel: "Offer Dhoop Seva",
    imageUrl: import.meta.env.BASE_URL + "images/Aarti.jpg",
    // Verified against the live priest directory: union match count 41.
    priestKeywords: ["protection", "festival", "health"],
  },
  // ─── New Seva Offerings ──────────────────────────────────────────────────
  {
    id: "seva-red-cloth-coconut",
    title: "Traditional Red-Cloth & Coconut Offering",
    category: "Red-Cloth & Coconut",
    description: "Offer a traditional red cloth (Lal Chunari) and coconut bundle to the Goddess — a customary Shakti-tradition offering at Ghatgaon Maa Tarini, Tara Tarini, and Maa Samaleswari temples.",
    includes: ["Red cloth (Lal Chunari) and coconut bundle offered at the sanctum", "Offered as per the temple's traditional process", "Photo evidence of the offering"],
    devoteeReceives: ["Digital seva certificate in your name", "Your Seva, Your Sacred Connection — wherever the temple permits, we share a blessed photograph of your seva as a cherished remembrance of your offering. Where audio or video recording is allowed, a short glimpse of the ritual may also be shared. At certain ancient and revered temples, strict security and sacred privacy rules may prohibit photography, audio/video recording, or electronic devices — we deeply respect these traditions and never compromise the temple's sanctity. In such circumstances, your devotion is lovingly acknowledged through a signed certificate from the performing priest and, where permitted, a personal audio/video testimony from the priest.", "Sankalp recorded with your Gotra"],
    dropdownLabel: "Number of bundles",
    priceOptions: [
      { value: 100, label: "1 bundle", description: "Offer one red-cloth and coconut bundle at the temple sanctum." },
      { value: 200, label: "2 bundles", description: "Offer two red-cloth and coconut bundles — a slightly fuller offering.", extraInclude: "2 bundles are offered instead of 1." },
      { value: 500, label: "5 bundles", description: "Offer five red-cloth and coconut bundles — a fuller offering.", extraInclude: "5 bundles are offered at the sanctum." },
      { value: 1100, label: "11 bundles", description: "Offer eleven red-cloth and coconut bundles — a Premium offering.", extraInclude: "11 bundles are offered, with your Sankalp read for the full offering.", extraReceive: "At this tier, where the temple permits, we also share a short personal audio or video testimony from the performing priest along with your certificate — a fuller, more personal remembrance of this seva." },
      { value: "custom", label: "Custom Amount" },
    ],
    customAmountEnabled: true,
    certificateTimeline: "Certificate & evidence shared within 3-7 working days of seva completion.",
    ctaLabel: "Offer Red-Cloth & Coconut",
    // ✅ IMAGE FIX: replaced the old square placeholder graphic with the
    // real landscape photo (imageFit removed so it uses the default
    // "cover" fill instead of being letterboxed as if still square).
    imageUrl: coconutImg,
    webpImageUrl: coconutImgWebp,
    priestKeywords: ["protection", "festival", "wealth"],
  },
  {
    id: "seva-dry-bhang-fruits-confectionery",
    title: "Special Dry Bhang, Fruits & Confectionery Offering",
    category: "Bhang, Fruits & Confectionery",
    description: "Offer dry Bhang (Dhatura/Bel-leaf preparations as per temple custom), fresh fruits, and traditional confectionery to Lord Lingaraj at Lingaraj Temple, Bhubaneswar.",
    // ⚠️ PRICING NOT SPECIFIED IN THE REQUEST: this offering follows the same
    // ₹100/₹200/₹500/₹1100 + custom tier structure as Flower Seva and Dhoop
    // & Camphor Seva above (no linear per-unit rate was given for it). Flag
    // this to update the exact tier amounts if a different rate is intended.
    includes: ["Dry Bhang preparation, fresh fruits, and confectionery offered as per temple custom", "Offered directly to Lord Lingaraj at the sanctum", "Photo evidence of the offering"],
    devoteeReceives: ["Digital seva certificate in your name", "Your Seva, Your Sacred Connection — wherever the temple permits, we share a blessed photograph of your seva as a cherished remembrance of your offering. Where audio or video recording is allowed, a short glimpse of the ritual may also be shared. At certain ancient and revered temples, strict security and sacred privacy rules may prohibit photography, audio/video recording, or electronic devices — we deeply respect these traditions and never compromise the temple's sanctity. In such circumstances, your devotion is lovingly acknowledged through a signed certificate from the performing priest and, where permitted, a personal audio/video testimony from the priest.", "Sankalp recorded with your Gotra"],
    dropdownLabel: "Offering type",
    priceOptions: [
      { value: 100, label: "Small offering", description: "Offer a small, simple bhang, fruit and confectionery offering to Lord Lingaraj." },
      { value: 200, label: "Enhanced offering", description: "Offer an enhanced bhang, fruit and confectionery offering — a slightly fuller offering.", extraInclude: "An enhanced quantity of bhang, fruits and confectionery is offered." },
      { value: 500, label: "Special offering", description: "Sponsor a special, expanded bhang, fruit and confectionery offering to Lord Lingaraj.", extraInclude: "An expanded selection of items is offered, beyond the small/enhanced tiers." },
      { value: 1100, label: "Premium offering", description: "Sponsor a Premium bhang, fruit and confectionery offering — the fullest tier of this seva.", extraInclude: "The fullest selection of bhang, fruits and confectionery is offered, with your Sankalp read for the full offering.", extraReceive: "At this tier, where the temple permits, we also share a short personal audio or video testimony from the performing priest along with your certificate — a fuller, more personal remembrance of this seva." },
      { value: "custom", label: "Custom Amount" },
    ],
    customAmountEnabled: true,
    certificateTimeline: "Certificate & evidence shared within 3-7 working days of seva completion.",
    ctaLabel: "Offer Bhang, Fruits & Confectionery",
    // ✅ IMAGE FIX: replaced the old square placeholder graphic with the
    // real landscape photo (imageFit removed so it uses the default
    // "cover" fill instead of being letterboxed as if still square).
    imageUrl: bhangImg,
    webpImageUrl: bhangImgWebp,
    priestKeywords: ["protection", "festival", "health"],
  },
  {
    id: "seva-brass-bell",
    title: "Brass Bell Offering",
    category: "Brass Bell",
    description: "Sponsor a brass bell (Ghanta) offered at Ghanteswari Temple, Chipilima — dedicated to the temple famed for its thousands of devotional bells.",
    includes: ["Brass bell (Ghanta) offered and hung at the temple", "Offered as per the temple's traditional process", "Photo evidence of the offering"],
    devoteeReceives: ["Digital seva certificate in your name", "Your Seva, Your Sacred Connection — wherever the temple permits, we share a blessed photograph of your seva as a cherished remembrance of your offering. Where audio or video recording is allowed, a short glimpse of the ritual may also be shared. At certain ancient and revered temples, strict security and sacred privacy rules may prohibit photography, audio/video recording, or electronic devices — we deeply respect these traditions and never compromise the temple's sanctity. In such circumstances, your devotion is lovingly acknowledged through a signed certificate from the performing priest and, where permitted, a personal audio/video testimony from the priest.", "Sankalp recorded with your Gotra"],
    dropdownLabel: "Number of bells",
    priceOptions: [
      { value: 50, label: "1 bell", description: "Offer one brass bell (Ghanta) at Ghanteswari Temple, Chipilima." },
      { value: 100, label: "2 bells", description: "Offer two brass bells — a slightly fuller offering.", extraInclude: "2 bells are offered instead of 1." },
      { value: 250, label: "5 bells", description: "Offer five brass bells — a fuller offering.", extraInclude: "5 bells are offered at the temple." },
      { value: 550, label: "11 bells", description: "Offer eleven brass bells — a Premium offering.", extraInclude: "11 bells are offered, with your Sankalp read for the full offering.", extraReceive: "At this tier, where the temple permits, we also share a short personal audio or video testimony from the performing priest along with your certificate — a fuller, more personal remembrance of this seva." },
      { value: "custom", label: "Custom Amount" },
    ],
    customAmountEnabled: true,
    certificateTimeline: "Certificate & evidence shared within 3-7 working days of seva completion.",
    ctaLabel: "Offer Brass Bell",
    // ✅ IMAGE FIX: replaced the old square placeholder graphic with the
    // real landscape photo (imageFit removed so it uses the default
    // "cover" fill instead of being letterboxed as if still square).
    imageUrl: bellsImg,
    webpImageUrl: bellsImgWebp,
    priestKeywords: ["protection", "festival"],
  },
  {
    id: "seva-custom-temple-offering",
    title: "Custom Temple Offering",
    category: "Custom Temple Offering",
    description: "Tell us your temple, its location in India, and its traditional offering — we'll arrange for it to be performed on your behalf, in your name and Gotra.",
    // ⚠️ PRICING NOT SPECIFIED IN THE REQUEST: since the temple and offering
    // vary devotee to devotee, this uses the same base ₹100/₹200/₹500/₹1100
    // + custom tier structure as the rest of Seva Offerings. Flag this if a
    // different rate is intended once the specific temple/offering is known.
    includes: ["Your named temple's traditional offering performed as per the temple's own process", "Coordinated with a priest/sevak familiar with that temple, where available", "Photo evidence of the offering, where the temple permits"],
    devoteeReceives: ["Digital seva certificate in your name", "Your Seva, Your Sacred Connection — wherever the temple permits, we share a blessed photograph of your seva as a cherished remembrance of your offering. Where audio or video recording is allowed, a short glimpse of the ritual may also be shared. At certain ancient and revered temples, strict security and sacred privacy rules may prohibit photography, audio/video recording, or electronic devices — we deeply respect these traditions and never compromise the temple's sanctity. In such circumstances, your devotion is lovingly acknowledged through a signed certificate from the performing priest and, where permitted, a personal audio/video testimony from the priest.", "Sankalp recorded with your Gotra"],
    dropdownLabel: "Offering size",
    priceOptions: [
      { value: 100, label: "Small offering", description: "Sponsor a small, simple offering at your named temple, as per that temple's tradition." },
      { value: 200, label: "Enhanced offering", description: "Sponsor an enhanced offering — a slightly fuller version of your named temple's traditional offering.", extraInclude: "An enhanced quantity/version of the offering is arranged." },
      { value: 500, label: "Special offering", description: "Sponsor a special, expanded version of your named temple's traditional offering.", extraInclude: "An expanded version of the offering is arranged, beyond the small/enhanced tiers." },
      { value: 1100, label: "Premium offering", description: "Sponsor a Premium offering — the fullest tier of your named temple's traditional offering.", extraInclude: "The fullest version of the offering is arranged, with your Sankalp read for the full offering.", extraReceive: "At this tier, where the temple permits, we also share a short personal audio or video testimony from the performing priest along with your certificate — a fuller, more personal remembrance of this seva." },
      { value: "custom", label: "Custom Amount" },
    ],
    customAmountEnabled: true,
    certificateTimeline: "Certificate & evidence shared within 3-7 working days of seva completion.",
    ctaLabel: "Offer Custom Temple Seva",
    // ✅ IMAGE FIX: replaced the old square placeholder graphic with the
    // real landscape photo (imageFit removed so it uses the default
    // "cover" fill instead of being letterboxed as if still square).
    imageUrl: otherOfferingsImg,
    webpImageUrl: otherOfferingsImgWebp,
    priestKeywords: ["protection", "festival", "wealth", "health"],
    customTempleFields: true,
  },
];
