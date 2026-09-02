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
// ✅ HOMEPAGE-ONLY IMAGE SWAP (see StoneEngravingHomeSection below): used
// ONLY in the homepage "Your Name, Engraved in Stone" section. Every other
// place this initiative appears (Contact, Auth Dashboard, Report an Issue,
// UPI Payment Modal, Diya Circle, etc. via <StoneEngravingNote>) keeps using
// stoneEngravingImg/-Webp above, unchanged.
// @ts-ignore
import yourNameImg from "../assets/images/Your_Name.jpg";
// @ts-ignore
import yourNameImgWebp from "../assets/images/Your_Name.webp";

const ALT_TEXT =
  "Stone slabs engraved with devotees' names placed along a temple pathway, including a temple still under construction — the real Sri Dwar stone-name engraving initiative";

/** Alt text for the homepage-only image (yourNameImg), which has its own
 * baked-in "Your Name. Your Legacy. Eternally Engraved in Divine Presence."
 * headline and example engraved names, unlike the plain photo used in
 * <StoneEngravingNote> elsewhere. */
const HOME_ALT_TEXT =
  "\"Your Name. Your Legacy. Eternally Engraved in Divine Presence.\" — a grandmother and grandson reading devotees' names engraved on a temple wall, beneath a large Shiva statue at dusk";

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
      {/* ✅ FIX (2026-09-02 — reported: image cropped, information not
          fully visible): forcing a 16:9 box via aspect-[16/9] never matched
          this image's real 3:2 proportions, so object-cover was cropping
          it to fill that mismatched shape. Removed the forced aspect ratio
          entirely — h-auto lets the image display at its own true
          proportions (full width, no cropping possible), with max-h-72
          kept only as a safety cap on very wide cards. object-contain is
          now redundant once nothing forces a mismatched box, but kept as
          a harmless safety net. */}
      <OptimizedImage
        src={stoneEngravingImg}
        webpSrc={stoneEngravingImgWebp}
        alt={ALT_TEXT}
        loading="lazy"
        className="block w-full h-auto max-h-72 rounded-xl object-contain border border-white/10"
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
 *
 * ✅ ADDED — "Add Your Name to the Sacred Wall" CTA (directly below the
 * "Read the full details" toggle): takes the devotee straight to the
 * Devotee Registration & Support form (ContactUs.tsx) with its Inquiry
 * Type pre-set to the matching "Place Your Name in Divine Presence"
 * option, via the same onNavigate(page, offeringId) pattern already used
 * elsewhere in App.tsx (see HomeCarousel / OnlinePuja's
 * initialHighlightId). `onNavigate` is optional so this component still
 * renders safely if a future caller omits it — the CTA simply won't show.
 */
interface StoneEngravingHomeSectionProps {
  onNavigate?: (page: string, offeringId?: string) => void;
}

export function StoneEngravingHomeSection({ onNavigate }: StoneEngravingHomeSectionProps = {}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="bg-[#021816] py-14 sm:py-20 px-4 sm:px-6 border-y border-white/5">
      {/* Keyframes for the "Add Your Name to the Sacred Wall" CTA glow —
          same pop-style treatment as TempleExperience.tsx's "BOOK RITES
          NOW" / "PRIEST DIRECTORY" buttons, in a distinct gold/bronze
          palette (rather than reusing their orange/teal) so this reads as
          its own devotional moment rather than a duplicate booking CTA. */}
      <style>{`
        @keyframes stoneCtaPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255,215,0,0.45), 0 0 40px rgba(184,134,11,0.25); transform: scale(1); }
          50%       { box-shadow: 0 0 32px rgba(255,215,0,0.75), 0 0 64px rgba(184,134,11,0.4); transform: scale(1.02); }
        }
        @keyframes stoneCtaRing {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,215,0,0.0); }
          50%       { box-shadow: 0 0 0 6px rgba(255,215,0,0.18); }
        }
      `}</style>
      {/* ✅ REDESIGNED (2026-09-02 — reported: letterbox bars look wrong;
          wanted full-bleed like the Hero video section's background, with
          info overlaid, but Shiva/grandmother/child/stone-wall text must
          all stay visible): switched from a 2-column (text-left,
          boxed-image-right) layout to a single full-width, full-bleed
          image — same absolute-fill object-cover pattern Hero.tsx already
          uses for its own background (`absolute inset-0 w-full h-full
          object-cover`), not object-contain.
          This image's real content genuinely spans nearly its entire
          1536×1024 frame — Shiva sits at the far left (~x=150), the
          engraved stone wall runs to the far right edge (~x=1536) — so
          there is very little safe horizontal margin to crop. aspect-[3/2]
          (mobile) up to aspect-[2/1] (desktop) stays close enough to the
          image's own native 3:2 ratio that cropping only ever trims a
          sliver of empty sky at the top and decorative ground at the
          bottom — never the statue, the grandmother, the child, or any of
          the engraved names. Verified by rendering this and visually
          confirming all four are intact (see delivery notes).
          The CTA is overlaid in a bottom gradient scrim — the one part of
          the photo that's genuinely empty (stone pathway), so it never
          sits on top of a face or a name. The fuller heading/shloka/
          paragraph text moved BELOW the image instead of overlaid on it —
          overlaying that much text across the image would have meant
          darkening enough of it to make Shiva/the grandmother/the names
          hard to see again, the exact problem being fixed. */}
      <div className="max-w-5xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl aspect-[3/2]">
          <OptimizedImage
            src={yourNameImg}
            webpSrc={yourNameImgWebp}
            alt={HOME_ALT_TEXT}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* ✅ FIX (same-session correction, 2nd pass): at mobile widths
              this image renders quite short in absolute pixels (aspect-3/2
              genuinely shows the whole photo, verified — but a 390px-wide
              screen only gets ~260px of height for it), so the same small
              overlay that worked fine on desktop (verified: Shiva,
              grandmother, child, and all three names fully visible) ended
              up covering most of that short strip — hiding the
              grandmother/child/names behind the text panel entirely.
              Overlay now only appears from sm: (≥640px) up, where the
              image is tall enough in real pixels for it to sit in the
              empty pathway area without covering anyone. On mobile the
              heading/CTA sit in their own block BELOW the now-uncovered,
              fully visible image instead. */}
          <div className="hidden sm:block absolute inset-x-0 bottom-0 h-[16%] bg-gradient-to-t from-black/90 to-transparent" />
          <div className="hidden sm:flex absolute inset-x-0 bottom-0 p-4 sm:p-5 flex-row items-end justify-between gap-2">
            <div>
              <h2 className="font-serif text-base sm:text-xl font-bold text-white drop-shadow-lg">
                Your Name, Engraved in Stone
              </h2>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#FFD700] hover:text-[#FFE55C] transition-colors mt-0.5"
              >
                {expanded ? "Show less" : "Read the full details"}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
              </button>
            </div>
            {onNavigate && (
              <button
                type="button"
                id="stone-engraving-cta"
                onClick={() => onNavigate("contact", "stone-name-engraving")}
                className="relative shrink-0 inline-flex items-center justify-center bg-gradient-to-r from-[#B8860B] to-[#FFD700] hover:from-[#CD9B1D] hover:to-[#FFE55C] text-[#021816] font-extrabold py-2.5 px-4 rounded-xl text-[10px] sm:text-[11px] transition-all hover:scale-105 tracking-widest uppercase border border-[#FFD700]/70 cursor-pointer"
                style={{
                  boxShadow: "0 0 20px rgba(255, 215, 0, 0.45), 0 0 40px rgba(184, 134, 11, 0.25)",
                  animation: "stoneCtaPulse 2s ease-in-out infinite",
                }}
              >
                <span
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  style={{ animation: "stoneCtaRing 2s ease-in-out infinite" }}
                  aria-hidden="true"
                />
                Add Your Name to the Sacred Wall
              </button>
            )}
          </div>
        </div>

        {/* Mobile-only: same heading/CTA, below the (now fully visible,
            uncovered) image instead of overlaid on it. */}
        <div className="sm:hidden mt-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-bold text-white">
              Your Name, Engraved in Stone
            </h2>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#FFB347] hover:text-[#FFC97A] transition-colors mt-0.5"
            >
              {expanded ? "Show less" : "Read the full details"}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>
        {onNavigate && (
          <button
            type="button"
            id="stone-engraving-cta-mobile"
            onClick={() => onNavigate("contact", "stone-name-engraving")}
            className="sm:hidden relative w-full mt-3 inline-flex items-center justify-center bg-gradient-to-r from-[#B8860B] to-[#FFD700] hover:from-[#CD9B1D] hover:to-[#FFE55C] text-[#021816] font-extrabold py-3.5 rounded-xl text-xs transition-all tracking-widest uppercase border border-[#FFD700]/70 cursor-pointer"
            style={{
              boxShadow: "0 0 20px rgba(255, 215, 0, 0.45), 0 0 40px rgba(184, 134, 11, 0.25)",
              animation: "stoneCtaPulse 2s ease-in-out infinite",
            }}
          >
            <span
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{ animation: "stoneCtaRing 2s ease-in-out infinite" }}
              aria-hidden="true"
            />
            Add Your Name to the Sacred Wall
          </button>
        )}

        <div className="mt-6 space-y-4 text-white text-left max-w-2xl mx-auto text-center sm:text-left">
          <blockquote className="border-l-2 border-[#FFB347]/50 pl-4 italic">
            <p className="text-white/80 text-base sm:text-lg">परोपकाराय सतां विभूतयः</p>
            <p className="text-[13px] text-white/50 not-italic mt-1">
              "Paropakārāya satāṁ vibhūtayaḥ" — "The prosperity of the virtuous exists for the welfare of others." (Kalidasa, Raghuvamsha)
            </p>
          </blockquote>

          <p className="text-sm text-white/70 leading-relaxed">
            A devotee's name can become a quiet, lasting part of a temple's story — through this ongoing Seva, your name can find a lasting home in stone.
          </p>

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
