/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Homepage Offerings Carousel — data model.
 * Powers HomeCarousel.tsx, a single continuous horizontal carousel shown
 * above the cinematic Hero section.
 *
 * Curated to 11 real, bookable offerings in a specific hand-picked order:
 * the two Armed/Inland Security Forces protection Pujas first, then Basic
 * Sankalp & Mansik Ichha Puja, then Annadan & Deep Daan Seva, then two
 * Counselling & Guidance categories, then a Bazaar product, then two
 * Holistic Wellness yoga sessions. Utility/navigation sections like
 * "Seva Hub & Live Devotional Dashboard" or "Live Darshan" are intentionally
 * excluded: they're app features, not offerings a devotee books, so they
 * don't belong in an offerings carousel.
 *
 * Every image below is reused from an image already shown on that same
 * offering's real page elsewhere in the app (OnlinePuja.tsx, sevaOfferings
 * .ts, bazaarOfferings.ts) — so every card is guaranteed to be high-
 * definition and visually consistent with the page it links to.
 *
 * A tap/click on a card navigates straight to that offering's real page AND
 * deep-links to that exact card (via onNavigate(page, id) -> App.tsx's
 * offeringDeepLinkId -> each destination page's initialHighlightId prop),
 * so the devotee lands scrolled-to and highlighted on the same card they
 * tapped, not just the top of the page. Every `id` below MUST exactly
 * match the real id used on that card's destination page (SIMPLE_PUJAS /
 * SEVA_OFFERINGS / BAZAAR_PRODUCTS / CounsellingGuidance's SERVICES /
 * HolisticWellness's SERVICES) — a mismatched id silently falls back to
 * landing on the page header instead of erroring, so double-check the id
 * against the destination file whenever a card is added or changed here.
 *
 * Kept as plain data (no JSX) so cards can be reordered, translated, or
 * later swapped for live CMS data without touching HomeCarousel.tsx.
 */

export interface CarouselCard {
  id: string;
  /** Card title, matches the real offering's title on its destination page. */
  title: string;
  /** Short, one-line devotional description — keeps every card the same height. */
  description: string;
  image: string;
  /** Which app page this card should route to when tapped/clicked. */
  targetPage: string;
  /** Small pill badge shown on the image, e.g. "Popular Right Now". */
  badge: string;
  /**
   * Optional CSS object-position for the card image. Only needed for
   * source photos that aren't already framed for a landscape crop (e.g.
   * the tall deity portraits below) — keeps the deity murti centred in
   * frame instead of being cropped top/bottom by the card's wider aspect
   * ratio. Defaults to "center" in HomeCarousel.tsx when omitted.
   */
  imagePosition?: string;
}

const img = (name: string) => `${import.meta.env.BASE_URL}images/${name}`;

/**
 * Exactly 11 cards, in this specific hand-picked order. Update/reorder here
 * only; HomeCarousel.tsx renders whatever this array contains.
 */
export const HOME_CAROUSEL_CARDS: CarouselCard[] = [
  // ── Protection Pujas (Simple Pujas page) ────────────────────────────────
  {
    id: "simple-puja-raksha-sankalp-armed-forces",
    title: "Veer Raksha Kavach Puja — For Our Armed Forces",
    description: "A sacred Raksha Kavach Sankalp offered for the safety, strength and safe return of our Army, Navy, and Air Force personnel.",
    image: img("deity_kashtabhanjan_hanuman_1781874800576.jpg"),
    targetPage: "puja",
    badge: "Prayers for Our Forces",
    imagePosition: "center 20%",
  },
  {
    id: "simple-puja-raksha-sankalp-inland-security",
    title: "Seema Prahari Kavach Puja — For Our Inland Security Forces",
    description: "A devotional shield of prayer for the safety, wellbeing and strength of CRPF, BSF, CISF, ITBP and similar forces who guard us day and night.",
    image: img("deity_maa_tarini_1781872917967.jpg"),
    targetPage: "puja",
    badge: "Prayers for Our Guardians",
    imagePosition: "center 20%",
  },

  // ── Pujas ──────────────────────────────────────────────────────────────
  {
    id: "simple-puja-basic-sankalp",
    title: "Basic Sankalp Puja",
    description: "A simple, heartfelt Sankalp offered in your name and Gotra to begin the day with blessings.",
    image: img("deity_jagannath_1781872890111.jpg"),
    targetPage: "puja",
    badge: "Popular Right Now",
    imagePosition: "center 20%",
  },
  {
    id: "simple-puja-mansik-ichha",
    title: "Mansik Ichha Puja",
    description: "A focused Sankalp where your personal wish is respectfully expressed through mantra and Dhoop offering.",
    image: img("deity_lingaraj_1781872903761.jpg"),
    targetPage: "puja",
    badge: "Trending",
    imagePosition: "center 20%",
  },

  // ── Sevas ──────────────────────────────────────────────────────────────
  {
    id: "seva-annadan",
    title: "Annadan / Food Seva",
    description: "Sponsor sacred, temple-blessed meals for devotees and the underprivileged near temple premises.",
    image: img("Annadanam Seva.jpg"),
    targetPage: "seva",
    badge: "Most Preferred",
  },
  {
    id: "seva-deep-daan",
    title: "Deep Daan / Diya Seva",
    description: "Sponsor sacred lamps lit in your name at the temple sanctum, dispelling darkness and inviting blessings.",
    image: img("Diya Lighting.jpg"),
    targetPage: "seva",
    badge: "Suggested",
  },

  // ── Counselling & Guidance ───────────────────────────────────────────────
  {
    id: "marriage-family-planning",
    title: "Marriage & Family Life Planning",
    description: "Preventive, forward-looking guidance for marriage readiness, newly-married adjustment, and family life.",
    image: img("counselling/marriage-family-planning.jpg"),
    targetPage: "counselling",
    badge: "Life Guidance",
  },
  {
    id: "emotional-wellbeing",
    title: "Mental & Emotional Wellbeing",
    description: "A safe, non-judgemental space to talk, understand your emotions, and build everyday emotional strength.",
    image: img("counselling/emotional-wellbeing.jpg"),
    targetPage: "counselling",
    badge: "Compassionate Support",
  },

  // ── Products (Temple Bazaar) ────────────────────────────────────────────
  {
    id: "bazaar-new-bhog",
    title: "Bhog Offerings",
    description: "Sponsor a sacred Bhog offered to the deity on your behalf, shared with devotees as Prasad.",
    image: img("Mahaprasad Seva.jpg"),
    targetPage: "products",
    badge: "Community Choice",
  },

  // ── Holistic Wellness (Yoga Sessions) ───────────────────────────────────
  {
    id: "hatha-yoga",
    title: "Hatha Yoga Session",
    description: "Traditional Hatha yoga in the Sivananda lineage, balancing solar and lunar energies through asana and breath.",
    image: img("Hatha Yoga.jpg"),
    targetPage: "puja",
    badge: "Classical Practice",
  },
  {
    id: "ashtanga-yoga",
    title: "Ashtanga Vinyasa Flow",
    description: "A structured, heat-building practice following Patanjali's eight-limbed path of synchronised breath and movement.",
    image: img("Ashtanga Vinyasa.jpg"),
    targetPage: "puja",
    badge: "Dynamic Practice",
  },
];
