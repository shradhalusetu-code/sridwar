/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shared "Stone-Name Engraving" content — the single source of truth for
 * how this devotional initiative is described across the site, so wording
 * never drifts between the Contact form, Auth Dashboard, Temple/Devotee
 * Registration, Report an Issue, the Darshan Certificate flow, and the
 * homepage.
 *
 * IMPORTANT — where to use <StoneEngravingNote>:
 * Only render this (with its image) at a point where a devotee is being
 * offered a VOLUNTARY contribution with selectable amounts (i.e. there is
 * a "Skip" option alongside amount tiers). Never render it on a screen
 * where the devotee is simply paying a fixed price for a specific puja,
 * seva, counselling/wellness session, subscription, or bazaar/bhog
 * product — those are direct purchases, not a voluntary contribution, and
 * showing this image there would misleadingly suggest the purchase itself
 * is what earns the engraving.
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import OptimizedImage from "./OptimizedImage";
// @ts-ignore
import stoneEngravingImg from "../assets/images/Stone_Name_Engraving.jpg";
// @ts-ignore
import stoneEngravingImgWebp from "../assets/images/Stone_Name_Engraving.webp";

const ALT_TEXT =
  "Stone slabs engraved with devotees' names placed along a temple pathway, including a temple still under construction — the real Sri Dwar stone-name engraving initiative";

/** Full explanatory copy — used everywhere the initiative is described (see
 * STONE_ENGRAVING_COMPACT_TEXT below for why "full" and "compact" now share
 * one wording). Wording updated 2026-08-27. */
export const STONE_ENGRAVING_FULL_TEXT =
  "A devotee's name can become a quiet, lasting part of a temple's story. Through this ongoing Seva, contributions above ₹200 include the opportunity for your name to be lovingly inscribed on a stone slab and placed within the premises of a temple we serve — even while the temple is still under construction. To keep this offering within reach of every devotee, a shared slab carries 50+ names; contributions above ₹1,000 are placed on a more exclusive slab carrying only 10 names. Each slab represents approximately ₹5,000 of actual Seva — from the stone itself to engraving, polishing, placement and masonry — and is supported entirely through devotee contributions. When your name is placed, we share real photographs and, where possible, a short video on YouTube, so that you can witness the place your devotion has found.";

/** ✅ WORDING UNIFICATION (2026-08-27): "compact" used to be a shorter,
 * lighter-detail version of this copy for tight modal/in-form spaces. Per
 * request, every place this initiative is described — including those
 * tight spaces — must now carry the exact same devotional wording (the
 * ₹200/₹1,000 thresholds, 50+/10-name slabs, ~₹5,000 Seva cost, photo/video
 * proof, all of it), so there is no version of this message that reads as
 * a lesser summary. Kept as its own export (rather than deleting the
 * "compact" variant) purely so existing call sites' `variant="compact"`
 * props keep working — both variants now render identical text, sourced
 * from the single STONE_ENGRAVING_FULL_TEXT constant above so the wording
 * can never drift between the two. */
export const STONE_ENGRAVING_COMPACT_TEXT = STONE_ENGRAVING_FULL_TEXT;

/** Repeat-participation note — for panels a returning devotee is likely to see again. */
export const STONE_ENGRAVING_REPEAT_TEXT =
  "Every return to Sri Dwar — for another contribution, Seva, Puja or Bazaar order — can become another opportunity for your name to be lovingly placed at a different temple, carrying your devotional connection a little farther. Where your details already match an inscription in our records, we simply cherish that existing connection rather than repeating it.";

interface StoneEngravingNoteProps {
  /** "full" (default) and "compact" now render the same devotional wording
   *  (see STONE_ENGRAVING_COMPACT_TEXT above) — the prop is kept so
   *  existing call sites don't need to change. */
  variant?: "full" | "compact";
  /** Append the repeat-participation line — use on panels a devotee may return to more than once. */
  showRepeatNote?: boolean;
  /** Optional heading shown above the note (kept short/subtle by design). */
  title?: string;
  className?: string;
  /** ✅ ADDED (2026-08-29 — Profile page audit): when true, the body text
   *  starts collapsed behind a one-line teaser + "Read More" toggle instead
   *  of always rendering in full — for tight spaces like the Profile
   *  page's "Support Our Mission" panel, where the full devotional
   *  paragraph (plus the repeat-participation note) was pushing the short,
   *  scannable summary the rest of that page uses everywhere else.
   *  Defaults to false so every other existing call site (Contact,
   *  Report an Issue, UPI modal, Hero, etc.) is completely unaffected. */
  collapsible?: boolean;
}

/** Short, single-line teaser shown in place of the full body text when collapsible and collapsed. */
const STONE_ENGRAVING_TEASER =
  "Contributions above ₹200 can include your name engraved on a stone slab at a temple we serve.";

/**
 * Compact, image-led card describing the stone-name engraving initiative.
 * Meant to sit naturally beside/below a voluntary-contribution amount
 * selector — see the usage note above for where this belongs.
 */
export default function StoneEngravingNote({
  variant = "full",
  showRepeatNote = false,
  title,
  className = "",
  collapsible = false,
}: StoneEngravingNoteProps) {
  const bodyText = variant === "full" ? STONE_ENGRAVING_FULL_TEXT : STONE_ENGRAVING_COMPACT_TEXT;
  const [expanded, setExpanded] = useState(false);
  const showFullBody = !collapsible || expanded;

  return (
    <div
      className={`flex flex-col gap-3 bg-white/5 border border-white/10 rounded-2xl p-3 text-left ${className}`}
    >
      <div className="space-y-1">
        {title && (
          <span className="block text-xs font-bold text-[#FFB347]">{title}</span>
        )}
        <p className="text-[11px] text-white/60 leading-relaxed">
          {showFullBody ? (
            <>
              {bodyText}
              {showRepeatNote && <> {STONE_ENGRAVING_REPEAT_TEXT}</>}
            </>
          ) : (
            STONE_ENGRAVING_TEASER
          )}
        </p>
        {collapsible && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FFB347] hover:text-[#FFC97A] transition-colors pt-0.5"
          >
            {expanded ? "Show less" : "Read More"}
            <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {/* ✅ IMAGE LAYOUT FIX (2026-08-27): previously sat beside the text in a
          `sm:flex-row` layout at a near-square w-40/h-36 (160×144px) size —
          on every screen at/above the `sm` breakpoint this squeezed a
          landscape photo into a portrait/square-ish box, visibly distorting
          it, unlike the correctly-proportioned homepage section below. Now
          placed BELOW the disclaimer text (never beside it, at any
          breakpoint) and sized by a fixed 16:9 landscape aspect ratio at
          full card width, so it always renders large, clearly landscape,
          and undistorted — scaling naturally with the width of whichever
          card/section it's embedded in (Contact, Auth Dashboard, Report an
          Issue, Hero, UPI Payment Modal, Diya Circle) instead of a fixed
          pixel box. `max-h` caps it on very wide cards so it still reads as
          a proportioned photo rather than an oversized banner. */}
      <OptimizedImage
        src={stoneEngravingImg}
        webpSrc={stoneEngravingImgWebp}
        alt={ALT_TEXT}
        loading="lazy"
        className="block w-full aspect-[16/9] max-h-72 rounded-xl object-cover border border-white/10"
      />
    </div>
  );
}

/**
 * Full homepage section — large image, title, a devotional Sanskrit/English
 * quote, and a collapsible full explanation, meant to be placed once on the
 * homepage (above Devotee Experiences) so every visitor understands this
 * initiative before they ever reach a contribution screen.
 *
 * ✅ COLLAPSIBLE (2026-08-27): the full explanation used to always render in
 * full, which took up too much space and front-loaded more detail than a
 * first-time visitor needs. Now only the title, Sanskrit quote, and a short
 * one-line teaser show by default; the complete explanation (with the
 * repeat-participation note) is tucked behind a "Read the full details"
 * toggle.
 */
export function StoneEngravingHomeSection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="bg-[#021816] py-14 sm:py-20 px-4 sm:px-6 border-y border-white/5">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 md:gap-12 items-center">
        {/* ✅ IMAGE-VISIBILITY FIX (2026-08-27): given an explicit,
            generous fixed height (independent of how tall the text column
            next to it happens to be, especially now that the text
            collapses by default) so it reads as a large, prominent,
            section-cover-style image rather than shrinking to match a
            short collapsed teaser. Left-center title placement (below)
            already sits to the left of this image on desktop via the
            order classes, with the whole row vertically centered by the
            grid's `items-center`. */}
        <div className="order-1 md:order-2 rounded-3xl overflow-hidden border border-white/10 shadow-2xl aspect-[4/3] md:aspect-auto md:h-[420px]">
          <OptimizedImage
            src={stoneEngravingImg}
            webpSrc={stoneEngravingImgWebp}
            alt={ALT_TEXT}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="space-y-4 text-white text-left order-2 md:order-1">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold">
            Your Name, Engraved in Stone
          </h2>
          <blockquote className="border-l-2 border-[#FFB347]/50 pl-4 italic">
            <p className="text-white/80 text-base sm:text-lg">परोपकाराय सतां विभूतयः</p>
            <p className="text-[13px] text-white/50 not-italic mt-1">
              "Paropakārāya satāṁ vibhūtayaḥ" — "The prosperity of the virtuous exists for the welfare of others." (Kalidasa, Raghuvamsha)
            </p>
          </blockquote>

          <p className="text-sm text-white/70 leading-relaxed">
            A devotee's name can become a quiet, lasting part of a temple's story — through this ongoing Seva, your name can find a lasting home in stone.
          </p>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#FFB347] hover:text-[#FFC97A] transition-colors"
          >
            {expanded ? "Show less" : "Read the full details"}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>

          {expanded && (
            <p className="text-sm text-white/70 leading-relaxed animate-slideUp">
              {STONE_ENGRAVING_FULL_TEXT} {STONE_ENGRAVING_REPEAT_TEXT}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
