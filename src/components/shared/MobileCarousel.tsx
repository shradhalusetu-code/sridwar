/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MobileCarousel — shared horizontal snap-scroll carousel for the Android
 * app / phone browser, with an unchanged desktop grid alongside it.
 *
 * This is the Temple Bazaar top-6 carousel pattern (TemplateBazaar.tsx —
 * the "Devotional Shopping Offerings" strip) extracted into a reusable
 * wrapper, so every other section adopts the exact same spacing, card
 * sizing, and snap behaviour instead of hand-copying the markup file by
 * file (and quietly drifting from it over time).
 *
 * - Mobile/app (< lg): horizontal snap-scroll strip — exactly
 *   TemplateBazaar's `-mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto
 *   no-scrollbar snap-x snap-mandatory` outer wrapper with a
 *   `flex gap-4 w-max pb-1` inner track and `snap-start shrink-0` cards.
 * - Desktop (lg+): a standard responsive grid. Per the "Android/phone
 *   view only" scope of this work, desktop is otherwise untouched —
 *   this component does not change what desktop already looked like,
 *   it only gives phone/app a real carousel instead of a squeezed grid.
 *
 * Usage:
 *   <MobileCarousel
 *     items={offerings}
 *     getKey={(o) => o.id}
 *     renderItem={(o) => <SomeCard offering={o} .../>}
 *   />
 */

import type { ReactNode } from "react";

interface MobileCarouselProps<T> {
  items: T[];
  getKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
  /** Width of each card in the mobile carousel. Default matches the
   *  Temple Bazaar reference (280px) — wide enough to read a
   *  title/price/description without feeling cramped, narrow enough
   *  that the next card's edge peeks in to signal "swipe for more." */
  cardWidthClassName?: string;
  /** Desktop-only grid column classes (from `lg:` up). Default mirrors
   *  TemplateBazaar's own desktop grid (3 columns). Pass e.g.
   *  "lg:grid-cols-4" for sections that need more columns at desktop
   *  width. */
  desktopGridClassName?: string;
  /** Gap between cards — applies to both the mobile carousel and the
   *  desktop grid, so spacing stays consistent between the two. */
  gapClassName?: string;
  className?: string;
  /** Optional empty state, shown instead of an empty carousel/grid when
   *  `items` is empty. */
  emptyState?: ReactNode;
  /** When true, renders ONLY the mobile/app carousel track — no desktop
   *  grid. For sections where desktop intentionally shows something other
   *  than a card grid of the same items (e.g. OnlinePuja.tsx's detailed
   *  row-list view), so the caller can keep its own desktop markup right
   *  alongside this for the mobile portion only, instead of duplicating
   *  the mobile carousel markup by hand to avoid MobileCarousel forcing a
   *  card grid onto a desktop layout that was never a grid to begin with. */
  mobileOnly?: boolean;
  /** Viewport width the carousel switches to a grid at. Default "lg"
   *  matches every carousel this was originally extracted from. A few
   *  sections (e.g. PriestSection.tsx's "What to Look for" guidance
   *  cards) switch earlier, at "sm" — pass that here to preserve the
   *  exact original breakpoint instead of silently widening/narrowing
   *  when migrated onto this shared component. */
  breakpoint?: "sm" | "lg";
}

export default function MobileCarousel<T>({
  items,
  getKey,
  renderItem,
  cardWidthClassName = "w-[clamp(240px,72vw,420px)]",
  desktopGridClassName = "lg:grid-cols-3",
  gapClassName = "gap-4",
  className = "",
  emptyState,
  mobileOnly = false,
  breakpoint = "lg",
}: MobileCarouselProps<T>) {
  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const hideCarousel = breakpoint === "sm" ? "sm:hidden" : "lg:hidden";
  const showGrid = breakpoint === "sm" ? "sm:grid" : "lg:grid";
  // At the "sm" breakpoint there's no room for an intermediate "2-up on
  // tablet, 3-up on desktop" step between the carousel and the grid — the
  // grid IS what shows from sm upward, so it uses desktopGridClassName
  // directly instead of the extra `sm:grid-cols-2` tier the "lg" variant
  // uses to bridge phone-carousel to desktop-grid.
  const gridColsClassName = breakpoint === "sm" ? desktopGridClassName : `sm:grid-cols-2 ${desktopGridClassName}`;

  if (mobileOnly) {
    return (
      <div className={className}>
        <div className={`${hideCarousel} -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto no-scrollbar snap-x snap-mandatory`}>
          <div className={`flex ${gapClassName} w-max pt-4 pb-1 items-stretch`}>
            {items.map((item, i) => (
              <div key={getKey(item, i)} className={`snap-start shrink-0 h-full [&>*]:h-full flex flex-col ${cardWidthClassName}`}>
                {renderItem(item, i)}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Mobile/app: horizontal snap carousel
          ✅ REAL BUG FOUND (root cause of the Counselling / Holistic
          Wellness / AuthDashboard / Refer & Earn / Referral Dashboard
          uneven-box reports): the desktop grid below (line ~86) always
          forced every rendered card to fill its cell with
          `h-full [&>*]:h-full` — but this mobile/app carousel track never
          had that. `items-stretch` on the track only stretches THIS
          wrapper div to match the tallest sibling in the row; without
          `h-full [&>*]:h-full` telling the arbitrary card returned by
          `renderItem` to actually fill that stretched wrapper, a shorter
          card's content just sits at its own natural height inside a
          taller invisible box — which reads as "the boxes are different
          sizes" exactly like the AYUSH/Yoga wellness cards in the video.
          Every OTHER carousel in the app (Seva, Bazaar, Puja, Priest,
          Referral Plans, etc.) already had this on its own hand-written
          wrapper; this shared component — used by Counselling & Guidance,
          Holistic Wellness, Auth Dashboard, Refer & Earn, and the
          Referral Dashboard panel — was the one place it was missing. */}
      <div className={`${hideCarousel} -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto no-scrollbar snap-x snap-mandatory`}>
        <div className={`flex ${gapClassName} w-max pt-4 pb-1 items-stretch`}>
          {items.map((item, i) => (
            <div key={getKey(item, i)} className={`snap-start shrink-0 h-full [&>*]:h-full flex flex-col ${cardWidthClassName}`}>
              {renderItem(item, i)}
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: unchanged grid */}
      <div className={`hidden ${showGrid} grid-cols-1 ${gridColsClassName} ${gapClassName} items-stretch`}>
        {items.map((item, i) => (
          <div key={getKey(item, i)} className="h-full [&>*]:h-full">{renderItem(item, i)}</div>
        ))}
      </div>
    </div>
  );
}
