/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Homepage Offerings Carousel — data model.
 * Powers HomeCarousel.tsx, a single continuous horizontal carousel shown
 * above the cinematic Hero section.
 *
 * Curated to exactly 9 real, bookable offerings — 3 Pujas, 3 Sevas, and
 * 3 marketplace Products — in that order. Utility/navigation sections like
 * "Seva Hub & Live Devotional Dashboard" or "Live Darshan" are intentionally
 * excluded: they're app features, not offerings a devotee books, so they
 * don't belong in an offerings carousel.
 *
 * Every image below is reused from an image already shown on that same
 * offering's real page elsewhere in the app (OnlinePuja.tsx, sevaOfferings
 * .ts, bazaarOfferings.ts) — so every card is guaranteed to be high-
 * definition and visually consistent with the page it links to.
 *
 * A tap/click on a card navigates straight to that offering's real page
 * (via the existing onNavigate prop) and lands on that page's own header —
 * it does not scroll to or highlight a specific card within the page.
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
 * Exactly 9 cards — 3 Pujas, then 3 Sevas, then 3 Products. Update/reorder
 * here only; HomeCarousel.tsx renders whatever this array contains.
 */
export const HOME_CAROUSEL_CARDS: CarouselCard[] = [
  // ── Pujas ──────────────────────────────────────────────────────────────
  {
    id: "basic-sankalp-puja",
    title: "Basic Sankalp Puja",
    description: "A simple, heartfelt Sankalp offered in your name and Gotra to begin the day with blessings.",
    image: img("deity_jagannath_1781872890111.jpg"),
    targetPage: "puja",
    badge: "Popular Right Now",
    imagePosition: "center 20%",
  },
  {
    id: "mansik-ichha-puja",
    title: "Mansik Ichha Puja",
    description: "A focused Sankalp where your personal wish is respectfully expressed through mantra and Dhoop offering.",
    image: img("deity_lingaraj_1781872903761.jpg"),
    targetPage: "puja",
    badge: "Trending",
    imagePosition: "center 20%",
  },
  {
    id: "sampoorna-bhog-deep-puja",
    title: "Sampoorna Bhog & Deep Puja",
    description: "A complete evening Aarti with Bhog offering and Deep rituals for prosperity and peace.",
    image: img("deity_kashi_vishwanath_1781874522891.jpg"),
    targetPage: "puja",
    badge: "Devotee Favorite",
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
  {
    id: "seva-temple-maintenance",
    title: "Temple Maintenance Seva",
    description: "Support the daily upkeep of temple premises — cleanliness, lamp oil, and general maintenance.",
    image: img("Temple_Maintenance.jpg"),
    targetPage: "seva",
    badge: "Trending Today",
  },

  // ── Products (Temple Bazaar) ────────────────────────────────────────────
  {
    id: "bazaar-bhog-offerings",
    title: "Bhog Offerings",
    description: "Sponsor a sacred Bhog offered to the deity on your behalf, shared with devotees as Prasad.",
    image: img("Mahaprasad Seva.jpg"),
    targetPage: "products",
    badge: "Community Choice",
  },
  {
    id: "bazaar-puja-kits",
    title: "Puja Kits",
    description: "Curated home Puja Kits with everything needed to perform rituals with your family, delivered to your door.",
    image: img("Home Puja Kit.jpg"),
    targetPage: "products",
    badge: "Most Loved",
  },
  {
    id: "bazaar-prasad-blessed",
    title: "Prasad & Blessed Items",
    description: "Temple-blessed Prasad and sacred keepsakes, sanctified during rituals and shipped with care.",
    image: img("Mahaprasad Kit.jpg"),
    targetPage: "products",
    badge: "Highly Rated",
  },
];
