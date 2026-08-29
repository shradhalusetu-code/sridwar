/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TempleCoordinates {
  lat: number;
  lng: number;
}

export interface AartiTimings {
  morning: string;
  afternoon: string;
  evening: string;
  note?: string; // used when exact published timings are not publicly confirmed / vary seasonally
}

export interface Temple {
  id: string;
  name: string;
  city: string;
  state: string;
  deity: string;
  story: string;
  deityInfo: string;
  timings: string;
  rituals: string[]; // "Authorized Rituals" — 10-15 rituals actually performed at the temple
  imageUrl: string;
  symbol: string; // Sanskrit/sacred characters or shorthand
  coordinates: TempleCoordinates; // verified approximate GPS location of the temple
  history: string; // "Holy Pilgrimage Narrative & History" — 100+ word researched account
  aartiTimings: AartiTimings; // morning / afternoon / evening aarti schedule
  sampleOfferings: string[]; // "Sample Rituals & Offerings" — 10-15 offerings devotees can sponsor
  priestInfo: string; // information about the priests who perform pujas at this temple
}

export interface Seva {
  id: string;
  name: string;
  templeAssociation: string;
  significance: string;
  blessingExplanation: string;
  impactStat: string;
  donationTiers: { amount: number; label: string; description: string }[];
  imageUrl?: string;
  // ── Optional fields below (added for Sponsorship Services parity audit) ──
  // All optional so nothing that already builds a Seva object without them
  // (e.g. any older data or test fixture) breaks. Mirrors the same
  // fields SevaOffering already has in data/sevaOfferings.ts.
  /** What this sponsorship actually includes/covers, shown as a checklist. */
  includes?: string[];
  /** What the devotee receives once the seva/sponsorship is performed. */
  devoteeReceives?: string[];
  /** e.g. "Certificate & evidence shared within 3-7 working days." */
  certificateTimeline?: string;
  /** One-line summary of what the charged tier actually covers, e.g.
   *  "Feeds 20 Sadhus, one meal" — shown as "Meal Coverage"/"Coverage". */
  coverageLabel?: string;
  /** Keywords matched against priests.ts pujaExpertise/adviceAreas to build
   *  this offering's Priest/Expert Selection dropdown — same pattern used
   *  by SEVA_OFFERINGS in data/sevaOfferings.ts. */
  priestKeywords?: string[];
  // ── Dynamic pricing modes (Sponsorship Services quantity/duration pricing) ──
  // Defaults to "tiers" (existing behaviour: donationTiers[0] is the shown
  // price) when omitted, so every Seva object that doesn't set this is
  // completely unaffected.
  /** "quantity": price = quantity * unitPrice, devotee picks a quantity.
   *  "duration-pandit": price = unitPrice * (durationUnits + pandits - 1),
   *  devotee picks a duration (in unitDurationMinutes blocks) and a pandit
   *  count. Omit (or "tiers") for the original fixed/tiered behaviour. */
  pricingMode?: "tiers" | "quantity" | "duration-pandit";
  /** Rupee amount per unit (per person/cow/diya/prasad for "quantity" mode,
   *  or the shared ₹150 base/increment for "duration-pandit" mode). */
  unitPrice?: number;
  /** Singular label for one unit, e.g. "person", "cow", "diya", "prasad
   *  distribution" — used to build the quantity field's helper text. */
  unitLabel?: string;
  /** Minutes represented by one duration increment in "duration-pandit"
   *  mode (10, per spec). */
  unitDurationMinutes?: number;
}

export interface Puja {
  id: string;
  name: string;
  category: "health" | "wealth" | "protection" | "career" | "marriage" | "education" | "festivals" | "graha_shanti" | "ancestor";
  templeName: string;
  deityName: string;
  benefits: string;
  priestDetails: string;
  videoAvailable: boolean;
  prasadIncluded: boolean;
  /** Default/base price for pujas without pricingMode set — used as-is,
   *  unaffected. For pujas with pricingMode "duration-pandit", this value
   *  is used ONLY to pick the puja's pricing tier (see OnlinePuja.tsx's
   *  getPujaUnitPrice) — it is never added into or multiplied against the
   *  actual charged total, which is computed purely from the tiered unit
   *  rate (see computePujaBaseAmount). */
  price: number;
  imageUrl: string;
  duration?: string;
  materialsIncluded?: string[];
  // ── Dynamic Duration + Pandit pricing (Online Puja categories: Health &
  // Longevity, Wealth & Prosperity, Protection & Victory, Career &
  // Business, Family & Marriage, and Festivals/Ancestral/Graha Shanti —
  // i.e. festivals, ancestor, graha_shanti, education) ────────────────────
  // Mirrors the Seva interface's pricingMode field/naming. Both now use the
  // same additive, unit-rate-only formula — see OnlinePuja.tsx's
  // computePujaBaseAmount. Omitted entirely (undefined) for any puja that
  // keeps its old fixed `price` — e.g. Akhand Ramayan Path, whose
  // "Multi-day recitation" duration doesn't fit a linear per-block rate —
  // and for any future puja in the same situation.
  /** "duration-pandit": total = unitPrice × (durationUnits + pandits − 1),
   *  where durationUnits is how many unitDurationMinutes blocks the
   *  devotee selects (default 1, i.e. 10 minutes) and pandits is the
   *  number of Pandits selected (default 1) — so the default selection
   *  always totals exactly 1 × unitPrice. Omitted = original fixed
   *  `price` behaviour, unaffected. */
  pricingMode?: "duration-pandit";
  /** Legacy field, no longer read by the price calculation — the charged
   *  rate now always comes from OnlinePuja.tsx's shared tier table (see
   *  getPujaUnitPrice), keyed off `price` above. Left in place only so
   *  existing spiritualData.ts records don't need every occurrence
   *  removed. */
  unitPrice?: number;
  /** Minutes represented by one duration block (10, per spec). */
  unitDurationMinutes?: number;
}

export interface PriestProfile {
  id: string;                      // dedicated profile id, used for detail view lookup
  priestDetails: string;           // exact string match to Puja.priestDetails — keeps existing flow intact
  name: string;
  yearsExperience: number;         // years of experience performing pujas/rituals
  yearsHelpingDevotees: number;    // years actively helping devotees with puja & religious activities
  currentCity: string;
  currentState: string;
  templesAssociated: string[];
  deitiesServed: string[];
  pujaExpertise: string[];         // puja specializations
  adviceAreas: string[];           // advice/specialization areas devotees can consult on
  languagesSpoken: string[];
  bio: string;
  isVerified: boolean;
  // rating and devoteesServedApprox were removed as required fields: they
  // used to hold a per-priest star rating (4.5–4.9) and a "devotees served"
  // headcount that were invented placeholder numbers, not real review data,
  // yet were displayed in PriestSection.tsx next to copy telling devotees
  // to "read ratings and feedback from other devotees" — i.e. fabricated
  // numbers presented as genuine reviews. Left optional (rather than
  // deleted outright) in case a real review/rating system is wired up
  // later; until then, no priest profile sets them and the UI no longer
  // renders them.
  rating?: number;                 // out of 5 — only set this from real, aggregated devotee reviews
  devoteesServedApprox?: number;   // only set this from a real, countable figure
  associatedPujaIds: string[];     // links back to ON_LINE_PUJAS entries
}

export interface Product {
  id: string;
  name: string;
  category: "prasad" | "rudraksha" | "incense" | "diyas" | "jewellery" | "books" | "kits" | "hampers";
  templeStory: string;
  significance: string;
  authenticity: string;
  blessings: string;
  price: number;
  imageUrl: string;
  rating: number;
  deliveryTimeline: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

// ─────────────────────────────────────────────────────────────────────────
// Unified Service Cart (Pujas, Sevas, Counselling/Guidance, Holistic
// Wellness, and any other Sankalp-Portal-driven paid service). Added
// alongside the existing Product-based CartItem above (Temple Bazaar) —
// nothing about CartItem/Product changes, this is purely additive so the
// Bazaar cart keeps working exactly as before. See src/lib/serviceCart.ts
// for the add/remove/merge/persist logic that produces and consumes these.
// ─────────────────────────────────────────────────────────────────────────
// ✅ BAZAAR SANKALP PORTAL CART FIX: added "bazaar_order" so Temple Bazaar
// Store items (both the legacy "Current Offerings" catalogue and the
// Devotional Shopping Offerings — Bhog, Puja Kits, Mala/Beads/Jap, Diya/
// Dhoop/Aarti, Prasad & Blessed Items) can be added to the SAME unified,
// account-synced, 10-item-capped Sankalp Portal cart that Pujas/Sevas/
// Guidance/Wellness already use — instead of the old page-local,
// never-persisted "Devotional Shopping cart" that TemplateBazaar used to
// keep in its own component state. See TemplateBazaar.tsx's Sankalpa
// Portal modal for where this is produced.
export type ServiceCartCategory = "puja_seva" | "counselling_guidance" | "holistic_wellness" | "seva_offering" | "bazaar_order";

export interface ServiceCartItem {
  /** Stable id for this cart row — used for removal, React keys, and as the
   *  Supabase cart_items.id once synced (uuid string either way). */
  id: string;
  category: ServiceCartCategory;
  /** Human-readable name of the Puja/Seva/session selected, e.g.
   *  "Graha Shanti Maha Puja". Shown in the cart drawer and checkout. */
  itemName: string;
  /** Final amount for this single item (already reflects any quantity/
   *  duration/pandit-count pricing computed on the offering card/wizard —
   *  the cart itself never recomputes pricing). */
  amount: number;
  /** Every devotee/Sankalp detail collected in the Sankalp Portal for this
   *  item, kept together so it round-trips to Google Sheets + Supabase
   *  unchanged when checkout finally runs. Optional fields are omitted
   *  per-category exactly as BookNowWizard already only collects a subset
   *  per category (see WIZARD_CONTENT[category].fields). */
  details: {
    devoteeName: string;
    phone: string;
    email: string;
    dob?: string;
    gotra?: string;
    rashi?: string;
    sankalpWish?: string;
    preferredSessionDate?: string;
    /** Delivery details — only populated for physical (non-service)
     *  Temple Bazaar / Devotional Shopping items added via the Sankalpa
     *  Portal. Omitted for every Puja/Seva/Guidance/Wellness item and for
     *  temple-performed (isService) Bazaar offerings, exactly like the
     *  other optional fields above. */
    address?: string;
    pincode?: string;
  };
  /** When this row was added to the cart (client-generated, ISO string). */
  addedAt: string;
}

export interface DevoteeProfile {
  name: string;
  gotra: string;
  primaryDeity: string;
  visitedTemples: string[];
  dharmicID: string;
  joinedAt: string;
  donationHistory: { id: string; date: string; purpose: string; amount: number; type: string }[];
}

export interface Mantra {
  text: string;
  translation: string;
  significance: string;
  audioSimText: string;
}

export interface DailyHoroscope {
  sign: string;
  prediction: string;
  luckyNumber: number;
  luckyColor: string;
  remedy: string;
}
