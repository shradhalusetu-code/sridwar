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
}

export default function MobileCarousel<T>({
  items,
  getKey,
  renderItem,
  cardWidthClassName = "w-[280px]",
  desktopGridClassName = "lg:grid-cols-3",
  gapClassName = "gap-4",
  className = "",
  emptyState,
}: MobileCarouselProps<T>) {
  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={className}>
      {/* Mobile/app: horizontal snap carousel */}
      <div className="lg:hidden -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto no-scrollbar snap-x snap-mandatory">
        <div className={`flex ${gapClassName} w-max pt-4 pb-1 items-stretch`}>
          {items.map((item, i) => (
            <div key={getKey(item, i)} className={`snap-start shrink-0 flex flex-col ${cardWidthClassName}`}>
              {renderItem(item, i)}
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: unchanged grid */}
      <div className={`hidden lg:grid grid-cols-1 sm:grid-cols-2 ${desktopGridClassName} ${gapClassName} items-stretch`}>
        {items.map((item, i) => (
          <div key={getKey(item, i)} className="h-full [&>*]:h-full">{renderItem(item, i)}</div>
        ))}
      </div>
    </div>
  );
}
