/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * HomeCarousel — a single continuous, horizontally-scrolling row of 3
 * Pujas, 3 Sevas, and 3 marketplace Products, shown at the top of the
 * homepage above the cinematic Hero section.
 *
 * Every card shows only an image, a title, a short one-line devotional
 * description, and a "Popular Right Now" style badge — no prices, no CTA
 * buttons, no lane tabs, and (intentionally) no section heading/subheading
 * above the row — this section is the carousel itself, nothing else. The
 * whole card is clickable/tappable and routes straight to that offering's
 * real page via the existing onNavigate prop used throughout App.tsx — a
 * tap always lands on that page's own header, never a scroll-to/highlight
 * of a specific card within the page.
 *
 * Navigation is a prev/next arrow pinned to the left and right edge of the
 * carousel itself (overlaid on the row, vertically centered), so devotees
 * can step through cards without reaching for a separate control strip
 * below. There are no pagination dots and no bottom control bar.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import OptimizedImage from "./OptimizedImage";
import { HOME_CAROUSEL_CARDS, CarouselCard } from "../data/homeCarouselOfferings";
import { gaNavClick } from "../utils/analytics";
import { sectionTopPadding } from "../utils/androidSpacing";

interface HomeCarouselProps {
  onNavigate: (page: string) => void;
  /** Since this carousel is the first element on the homepage, it must
   *  supply its own top clearance under the fixed Navbar + Android status
   *  bar on the Capacitor app — <main> only pads for this on web (see
   *  App.tsx `pt-28` vs `pt-0`). Matches the isAndroidApp prop already
   *  passed to Hero / TrustBar from App.tsx. */
  isAndroidApp?: boolean;
}

const AUTO_ROTATE_MS = 4500;
const cards: CarouselCard[] = HOME_CAROUSEL_CARDS;

export default function HomeCarousel({ onNavigate, isAndroidApp = false }: HomeCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  // True only while the carousel is actually on-screen — auto-rotate is
  // paused when it isn't, so it never fires (and never moves any scroll
  // position) while the devotee has scrolled down to a later section.
  const [isVisible, setIsVisible] = useState(true);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against overlapping scrollTo animations. Without this, clicking
  // an arrow (or auto-rotate firing) while a previous smooth-scroll is
  // still in flight lets a second scrollTo start mid-animation — on
  // Android WebView in particular this reliably left the track scrolled to
  // a position that didn't match any card, so the "stuck" arrow appeared to
  // do nothing on the next click.
  //
  // IMPORTANT: the lock used to be released by a single fixed setTimeout
  // (500ms) after every scroll. That was the actual bug behind the report
  // of the carousel feeling "slow and unresponsive" and getting "stuck"
  // at the end instead of looping: a one-card hop finishes well under
  // 500ms, so every ordinary click felt sluggish waiting out the rest of
  // the lock — but the wrap-around jump from the LAST card back to the
  // FIRST is by far the longest scroll distance in the whole carousel, and
  // on slower Android WebView renders it often hadn't finished settling by
  // 500ms. The lock would release early, a queued click (or the next
  // auto-rotate tick) would fire a second scrollTo mid-glide, and the two
  // smooth-scrolls fought each other, leaving the track stopped between
  // cards where no further click could move it — exactly the "stuck at
  // the end" symptom. Below, the lock is released the moment the track's
  // scrollLeft actually stops changing (polled per animation frame), with
  // a generous max-wait as a safety net — fast for short hops, patient
  // for the long wrap-around one.
  const isAnimatingRef = useRef(false);
  const settleRafRef = useRef<number | null>(null);

  const goTo = useCallback((index: number) => {
    const next = ((index % cards.length) + cards.length) % cards.length;
    setActiveIndex(next);
  }, []);

  // Watch whether the carousel section is actually in the viewport, so the
  // auto-rotate interval (and any resulting scroll) only ever runs while
  // it's visible — this is what stops the whole page from being yanked
  // back up to the hero/carousel area while a devotee is scrolled further
  // down reading a later section.
  useEffect(() => {
    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.2 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Scroll the newly-active card into view whenever activeIndex changes,
  // whether that came from an arrow click or auto-rotate.
  //
  // IMPORTANT: this scrolls ONLY the carousel's own horizontal track
  // (trackRef), never the page. A previous version called
  // card.scrollIntoView({ block: "nearest" }) directly — on Android
  // WebView (and some mobile browsers) that call also nudges ANY ancestor
  // scroll container to make the target vertically visible, which is what
  // caused the page to jump back up to the hero section every ~4.5s while
  // a devotee had scrolled further down the homepage. Computing the target
  // scrollLeft manually and calling track.scrollTo() keeps the effect
  // fully contained to the carousel strip.
  useEffect(() => {
    const card = cardRefs.current[activeIndex];
    const track = trackRef.current;
    if (!card || !track) return;
    const cardRect = card.getBoundingClientRect();
    const trackRect = track.getBoundingClientRect();
    const targetLeft = track.scrollLeft + (cardRect.left - trackRect.left);

    // Clamp to the track's actual scrollable range — on the last card the
    // naive left-edge math above can ask for a value past maxScrollLeft,
    // which some Android WebView builds simply refuse to honor, leaving
    // the track visually frozen just short of the final card (the "stuck"
    // arrow devotees were hitting).
    const maxScrollLeft = track.scrollWidth - track.clientWidth;
    const clampedLeft = Math.min(Math.max(0, targetLeft), Math.max(0, maxScrollLeft));

    if (settleRafRef.current) cancelAnimationFrame(settleRafRef.current);

    // Already there (e.g. initial render) — nothing will scroll, so there's
    // no settling to wait for. Skip straight out instead of arming the lock.
    if (Math.abs(track.scrollLeft - clampedLeft) < 1) {
      isAnimatingRef.current = false;
      return;
    }

    isAnimatingRef.current = true;
    track.scrollTo({ left: clampedLeft, behavior: "smooth" });

    // Poll scrollLeft every animation frame and release the lock as soon as
    // it stops moving for a few consecutive frames — this adapts to the
    // actual distance/duration of the glide instead of guessing a fixed
    // delay, so short one-card hops unlock almost immediately and the long
    // last→first wrap-around gets however long it genuinely needs.
    // MAX_SETTLE_WAIT_MS is only a safety net in case a scroll never fires
    // another event (e.g. the browser silently clamps/ignores it).
    const MAX_SETTLE_WAIT_MS = 1200;
    const startedAt = performance.now();
    let lastLeft = track.scrollLeft;
    let stableFrames = 0;

    const poll = () => {
      const current = track.scrollLeft;
      if (Math.abs(current - lastLeft) < 0.5) {
        stableFrames += 1;
      } else {
        stableFrames = 0;
        lastLeft = current;
      }
      const settled = stableFrames >= 3;
      const timedOut = performance.now() - startedAt > MAX_SETTLE_WAIT_MS;
      if (settled || timedOut) {
        isAnimatingRef.current = false;
        settleRafRef.current = null;
        return;
      }
      settleRafRef.current = requestAnimationFrame(poll);
    };
    settleRafRef.current = requestAnimationFrame(poll);
  }, [activeIndex]);

  // Auto-rotate every ~4.5s, paused on hover/touch (so devotees reading a
  // card don't have it scroll away under them) and paused whenever the
  // carousel has scrolled out of view.
  useEffect(() => {
    if (isPaused || !isVisible) return;
    const id = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % cards.length);
    }, AUTO_ROTATE_MS);
    return () => clearInterval(id);
  }, [isPaused, isVisible]);

  // Resume auto-rotate a couple seconds after the last touch interaction.
  // Mobile has no "mouse leave" to resume on, so without this a single tap
  // permanently freezes the carousel.
  const handleTouchStart = () => {
    setIsPaused(true);
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
  };
  const handleTouchEnd = () => {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => setIsPaused(false), 2500);
  };

  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
      if (settleRafRef.current) cancelAnimationFrame(settleRafRef.current);
    };
  }, []);

  // Keep the pagination dots in sync with whatever card is actually
  // centered in view — not just with activeIndex changes driven by the
  // arrows/dots/auto-rotate above. Without this, a devotee who manually
  // swipes or drags the track directly (bypassing goTo entirely) ends up
  // with a dot highlighted that no longer matches the offering actually on
  // screen. Debounced so it only recalculates once the scroll has actually
  // settled, and skipped entirely while our own programmatic scrollTo()
  // (isAnimatingRef) is mid-flight, since that path already sets
  // activeIndex directly and reacting here too would just be redundant.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let settleTimeout: ReturnType<typeof setTimeout> | null = null;

    const syncActiveIndexToScroll = () => {
      if (isAnimatingRef.current) return;
      if (settleTimeout) clearTimeout(settleTimeout);
      settleTimeout = setTimeout(() => {
        // ✅ DOT/ARROW SYNC FIX: this used to find the card whose CENTER was
        // closest to the track's center. That only matches the "active"
        // card when exactly one card fits per screen (narrow phones). On
        // tablets/wider phones — like the screenshot that reported this —
        // 2-3+ cards are visible at once, so the true snapped card (the one
        // whose LEFT edge is flush with the track's left edge, because
        // every card uses `snap-start`, not `snap-center`) is very often a
        // DIFFERENT card than the one nearest the visual center. That
        // mismatch is exactly what made the dots/arrows look "free
        // flowing"/"stuck": the dot would highlight a card that wasn't the
        // one actually snapped at the edge, and an arrow click would then
        // step by one from the WRONG index, producing a jump that looked
        // like a skipped or unresponsive card. Comparing left edges instead
        // matches how the browser's own snap-start engine decides which
        // card is "current", so the dot and the arrows now always agree
        // with what's actually snapped on screen, at every viewport width.
        const trackRect = track.getBoundingClientRect();
        const trackLeft = trackRect.left;
        let closestIndex = 0;
        let closestDistance = Infinity;
        cardRefs.current.forEach((card, i) => {
          if (!card) return;
          const cardRect = card.getBoundingClientRect();
          const distance = Math.abs(cardRect.left - trackLeft);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = i;
          }
        });
        setActiveIndex((prev) => (prev === closestIndex ? prev : closestIndex));
      }, 120);
    };

    track.addEventListener("scroll", syncActiveIndexToScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", syncActiveIndexToScroll);
      if (settleTimeout) clearTimeout(settleTimeout);
    };
  }, []);

  const handleCardClick = (card: CarouselCard) => {
    gaNavClick(`home_carousel_${card.id}`, "home_carousel");
    // Always a plain page navigation — lands on that page's own header,
    // never a scroll-to/highlight of a specific card within the page.
    onNavigate(card.targetPage);
  };

  const handleArrowClick = (direction: "prev" | "next") => {
    // Ignore taps that land mid-animation instead of queuing them — queuing
    // is what produced the "stuck" feeling, since a fast double-tap could
    // start a second scrollTo before the first had settled, leaving the
    // track between two cards with no further click able to move it.
    if (isAnimatingRef.current) return;
    setIsPaused(true);
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => setIsPaused(false), 2500);
    goTo(activeIndex + (direction === "next" ? 1 : -1));
  };

  const handleDotClick = (index: number) => {
    if (isAnimatingRef.current) return;
    setIsPaused(true);
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => setIsPaused(false), 2500);
    goTo(index);
  };

  return (
    <section
      id="home-content-carousel"
      ref={sectionRef}
      className="relative bg-[#021816]"
      aria-label="Popular pujas, sevas, and sacred offerings"
      style={isAndroidApp ? sectionTopPadding(true) : undefined}
    >
      {/* No visible heading/subheading above the row by design — this
          section IS the carousel. pt-6/pt-8 here replaces the spacing the
          removed header block used to provide, so clearance under the
          fixed Navbar (web: <main> pt-28; Android: sectionTopPadding
          above) is unchanged. */}
      <div className="pt-6 sm:pt-8 pb-8 sm:pb-10">
      <div className="relative">
        <div
          ref={trackRef}
          // NOTE: no CSS `scroll-smooth` here on purpose — this track is
          // also scrolled programmatically via track.scrollTo({behavior:
          // "smooth"}) above. Having both the CSS smooth-scroll behavior
          // AND a JS-driven smooth scrollTo active on the same
          // snap-mandatory container is what caused the "stuck" arrows:
          // the two smooth-scroll implementations fought each other on
          // Android WebView and the browser sometimes gave up mid-glide.
          // The JS scrollTo already requests behavior:"smooth" per call,
          // so the CSS property is redundant, not just harmless.
          className="overflow-x-auto no-scrollbar snap-x snap-mandatory"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          {/* max-w-[1600px] mx-auto: on very wide screens, once all cards fit
              within that width, mx-auto centers the whole row instead of
              leaving it pinned to the far-left edge of the browser window;
              when cards overflow (the common case), the auto margins collapse
              to 0 and it scrolls exactly as before. */}
          <div className="flex gap-5 sm:gap-6 px-4 sm:px-6 lg:px-8 pb-1 w-max max-w-[1600px] mx-auto">
            {cards.map((card, i) => (
              <div
                key={card.id}
                ref={(el) => { cardRefs.current[i] = el; }}
                role="button"
                tabIndex={0}
                aria-label={`View ${card.title}`}
                onClick={() => handleCardClick(card)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleCardClick(card);
                  }
                }}
                className="group snap-start shrink-0 w-[260px] sm:w-[320px] lg:w-[360px] xl:w-[380px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4] rounded-2xl"
              >
                {/* Image */}
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                  <OptimizedImage
                    src={card.image}
                    alt={card.title}
                    loading={i < 3 ? "eager" : "lazy"}
                    fetchPriority={i === 0 ? "high" : "auto"}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    style={{ objectPosition: card.imagePosition ?? "center" }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: "linear-gradient(to top, rgba(2,24,22,0.7) 0%, rgba(2,24,22,0) 42%)",
                    }}
                  />
                  <span className="absolute top-3 left-3 text-[12px] sm:text-[13px] font-black uppercase tracking-wide text-[#021816] bg-[#FFB347] px-3 py-1.5 rounded-full shadow">
                    {card.badge}
                  </span>
                </div>

                {/* Title + short devotional description */}
                <div className="mt-3.5">
                  <h3 className="font-serif text-base sm:text-lg font-bold text-white leading-snug line-clamp-1">
                    {card.title}
                  </h3>
                  <p className="mt-1.5 text-xs sm:text-sm text-white/60 leading-relaxed line-clamp-2">
                    {card.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Prev / next — pinned to the left and right edge of the carousel
            itself, vertically centered on the IMAGE only (not the full
            card, which also includes the title/description below it).
            The top offsets below are the exact half-height of each card's
            aspect-[4/3] image at that breakpoint's card width (e.g. a
            320px-wide image is 240px tall, so its center sits at 120px) —
            using the card's full height here would push the arrows down
            into the text and make the row look squeezed/misaligned. */}
        <button
          id="home-carousel-prev"
          aria-label="Previous offering"
          onClick={() => handleArrowClick("prev")}
          className="hidden sm:flex absolute left-2 lg:left-4 top-[120px] lg:top-[135px] xl:top-[143px] -translate-y-1/2 z-10 items-center justify-center p-2.5 lg:p-3 rounded-full bg-[#021816]/70 backdrop-blur-sm border border-white/15 hover:bg-[#021816]/90 hover:border-[#5EEAD4]/40 text-white/85 hover:text-[#5EEAD4] shadow-lg transition-all cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          id="home-carousel-next"
          aria-label="Next offering"
          onClick={() => handleArrowClick("next")}
          className="hidden sm:flex absolute right-2 lg:right-4 top-[120px] lg:top-[135px] xl:top-[143px] -translate-y-1/2 z-10 items-center justify-center p-2.5 lg:p-3 rounded-full bg-[#021816]/70 backdrop-blur-sm border border-white/15 hover:bg-[#021816]/90 hover:border-[#5EEAD4]/40 text-white/85 hover:text-[#5EEAD4] shadow-lg transition-all cursor-pointer"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Compact prev/next for touch screens — sm:hidden mirrors the same
            side-of-carousel placement at a size comfortable for thumbs,
            since the full-size buttons above are hidden below the sm
            breakpoint to avoid crowding narrow mobile cards. Card width
            here is a fixed 260px, so its image is 195px tall — center at
            98px, same reasoning as the buttons above. */}
        <button
          aria-label="Previous offering"
          onClick={() => handleArrowClick("prev")}
          className="sm:hidden absolute left-1 top-[98px] -translate-y-1/2 z-10 flex items-center justify-center p-2 rounded-full bg-[#021816]/70 backdrop-blur-sm border border-white/15 active:bg-[#021816]/90 text-white/85 shadow-lg transition-all cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          aria-label="Next offering"
          onClick={() => handleArrowClick("next")}
          className="sm:hidden absolute right-1 top-[98px] -translate-y-1/2 z-10 flex items-center justify-center p-2 rounded-full bg-[#021816]/70 backdrop-blur-sm border border-white/15 active:bg-[#021816]/90 text-white/85 shadow-lg transition-all cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Dot navigation — sits below the row itself, distinct from the
          prev/next arrows overlaid on the row above. One dot per offering
          so devotees can jump straight to any card, or track position
          while auto-rotating, without relying on the side arrows. */}
      <div
        role="tablist"
        aria-label="Offering navigation"
        className="flex items-center justify-center gap-2 mt-5 sm:mt-6"
      >
        {cards.map((card, i) => (
          <button
            key={card.id}
            role="tab"
            aria-selected={i === activeIndex}
            aria-label={`Go to ${card.title}`}
            onClick={() => handleDotClick(i)}
            className={`h-2 rounded-full transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4] ${
              i === activeIndex
                ? "w-6 bg-[#5EEAD4]"
                : "w-2 bg-white/25 hover:bg-white/40"
            }`}
          />
        ))}
      </div>
      </div>
    </section>
  );
}
