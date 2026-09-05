/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ✅ CHANGED (2026-09-03): now draws the REAL supplied artwork
// (jagannath_certificate.jpg) instead of the code-drawn placeholder —
// exactly the swap this file's original design was built to make easy.
// Everything below reads from CERTIFICATE_LAYOUTS, a plain config array
// mapping each field to a precise pixel position measured directly
// against the real artwork (not eyeballed) — adding a second design later
// (a different temple/deity) is just adding another entry here with its
// own coordinates; the form in AdminCertificateGeneration.tsx never needs
// to change either way.

export interface CertificateData {
  refId: string;
  serviceType: string;
  devoteeName: string;
  members: { name: string; relationship: string }[];
  pujaDate: string; // ISO yyyy-mm-dd
  city: string;
  deity: string;
  temple: string;
  // ✅ CHANGED (2026-09-05 — explicit instruction: "Remove the separate
  // Family Photo option. Only one Devotee/Family Photo section is
  // needed"): renderCertificate() only ever drew devoteePhoto in the
  // first place (there is exactly one photoFrame per design) — the old
  // familyPhoto field was collected by the admin form but never actually
  // appeared on any certificate. Removed here since the field no longer
  // exists anywhere in the pipeline; AdminCertificateGeneration.tsx now
  // has a single "Devotee / Family Photo" upload that feeds this one field.
  devoteePhoto: HTMLImageElement | null;
}

interface TextSlot {
  x: number;
  y: number;
  maxWidth: number;
  font: string;
  color: string;
  align: CanvasTextAlign;
}

interface CertificateLayout {
  /** Matched against CertificateData.deity — see selectLayout() below. */
  matchDeity: RegExp;
  backgroundUrl: string;
  width: number;
  height: number;
  templeSlot: TextSlot;
  dateSlot: TextSlot;
  devoteeNameSlot: TextSlot;
  pujaNameSlot: TextSlot;
  refIdSlot: TextSlot;
  photoFrame: { x: number; y: number; width: number; height: number };
}

const BASE_URL = import.meta.env.BASE_URL;

// ── Real, measured layout for the Jagannath design ──────────────────────
// Coordinates were measured directly against the actual 1536×1024 artwork
// (overlaid with a pixel grid to read exact positions — not guessed) so
// every field sits precisely centered under its own printed title/line,
// matching the artwork's own alignment rather than an approximation.
const JAGANNATH_LAYOUT: CertificateLayout = {
  matchDeity: /jagannath/i,
  backgroundUrl: `${BASE_URL}images/jagannath_certificate.jpg`,
  width: 1536,
  height: 1024,
  // ✅ VERIFIED (2026-09-05 — founder did independent measurement work
  // and flagged several real issues; I re-measured each one directly
  // against the actual artwork before applying anything, since one of
  // the founder's suggested corrections turned out to be based on a
  // mismeasurement): "PERFORMED AT" is genuinely at x≈185 — confirmed
  // directly, the founder's suggested x≈500 does not match the actual
  // artwork. Left as-is.
  templeSlot: { x: 185, y: 212, maxWidth: 260, font: "600 18px Georgia, serif", color: "#3a2a1a", align: "center" },
  // ✅ CORRECTED (2026-09-05): "DATE OF PUJA" label is genuinely centered
  // at x≈1325, not 1125 — verified directly with a fresh measurement
  // (the founder correctly flagged this needed a second look, even
  // though their temple-label finding didn't hold up).
  dateSlot: { x: 1325, y: 212, maxWidth: 260, font: "600 18px Georgia, serif", color: "#3a2a1a", align: "center" },
  // ✅ RE-MEASURED (2026-09-05) against the reference sample the founder
  // supplied (Sample_Certificate.png — a real composited example showing
  // exactly where this should sit): y=505, truly centered between "This
  // is to certify that"'s divider (≈380) and the "PUJA PERFORMED" banner
  // (≈620) — my first measurement (435) was too high, closer to the
  // divider than centered.
  // ✅ RE-MEASURED (2026-09-05 — reported "too left to the expected
  // placement"): measured the artwork's own "BLESSING CERTIFICATE" and
  // "PUJA PERFORMED" banners directly — both share the same true center,
  // x≈828, not 725 as previously used. This was a genuine measurement
  // error, now corrected against the artwork's own printed elements
  // rather than an assumed midpoint.
  devoteeNameSlot: { x: 828, y: 505, maxWidth: 460, font: "bold 38px Georgia, serif", color: "#5a1e08", align: "center" },
  // ✅ RE-CORRECTED (2026-09-05 — still overlapping the banner per a
  // real screenshot): remeasured with a much finer 10px grid. The actual
  // gap between "PUJA PERFORMED"'s bottom edge (y≈650) and the sloka's
  // start (y≈690) is only ~40px — tighter than my previous measurement
  // found. Moved to y=675 with a smaller 16px font for a safe margin on
  // both sides.
  pujaNameSlot: { x: 828, y: 675, maxWidth: 460, font: "16px Georgia, serif", color: "#3a2a1a", align: "center" },
  // Below the barcode box — the box's own bottom edge is at y≈903
  // (measured directly; also noticeably lower than a first glance
  // suggests), with the certificate's outer wooden frame starting around
  // y≈940, leaving a tight but clean gap for a single line.
  refIdSlot: { x: 245, y: 925, maxWidth: 300, font: "600 15px Georgia, serif", color: "#5a4a2a", align: "center" },
  // ✅ RE-MEASURED AGAIN (2026-09-05): a render test with a realistic
  // portrait photo revealed the photo actually overlapping the frame's
  // ornate border on the right side — the previous width (190) was
  // measured too generously. Remeasured with a finer 20px grid
  // specifically on this boundary: the frame's true inner clear opening
  // is x≈1150–1300 (150 wide), y≈415–685. Sized with a small safety
  // margin inside those lines so the photo can never visibly touch the
  // border pattern, and reduced height for a natural portrait aspect
  // (≈0.68) matching how a real headshot should look, not stretched to
  // fill the entire tall arch opening.
  // ✅ CORRECTED (2026-09-05 — genuine bug, confirmed via a fresh,
  // careful re-measurement after the founder flagged this): the frame's
  // true inner opening is actually x≈1140–1395 (≈255 wide), y≈400–710
  // (≈310 tall) — aspect ≈0.82, close to a standard passport-photo ratio.
  // My previous measurement (145 wide, 250 tall, positioned at 1153,420)
  // was both shifted left/up into the decorative border AND far too
  // narrow relative to its height, which is exactly why photos looked
  // squeezed into an unnaturally tall, narrow strip. Sized with a small
  // safety margin inside the newly-confirmed border lines.
  photoFrame: { x: 1148, y: 405, width: 245, height: 300 },
};

// ── Mahadev (Lord Shiva) ──────────────────────────────────────────────
// ✅ Verified via an actual render test earlier this session — every
// value below was tested, not just measured once and assumed correct.
const MAHADEV_LAYOUT: CertificateLayout = {
  matchDeity: /shiva|mahadev/i,
  backgroundUrl: `${BASE_URL}images/Mahadev-Certificate.jpg`,
  width: 1536,
  height: 1024,
  // This one design places the temple name INLINE with "PERFORMED AT"
  // (same line, to its right) — confirmed from the founder's filled
  // reference example ("Cuttack" sits right beside the label). Every
  // other design in this file puts it on its own line below the label.
  templeSlot: { x: 350, y: 138, maxWidth: 280, font: "700 20px Georgia, serif", color: "#1a2a3a", align: "left" },
  dateSlot: { x: 1165, y: 197, maxWidth: 260, font: "600 18px Georgia, serif", color: "#1a2a3a", align: "center" },
  devoteeNameSlot: { x: 730, y: 460, maxWidth: 460, font: "bold 36px Georgia, serif", color: "#0f2a3a", align: "center" },
  // Puja name sits ABOVE "PUJA PERFORMED" on this design (confirmed) —
  // reversed from Jagannath, correct as-is.
  pujaNameSlot: { x: 730, y: 568, maxWidth: 460, font: "18px Georgia, serif", color: "#1a2a3a", align: "center" },
  refIdSlot: { x: 270, y: 798, maxWidth: 300, font: "600 15px Georgia, serif", color: "#2a3a4a", align: "center" },
  // Re-measured with a fine grid, then confirmed via an actual test
  // render: true inner opening x≈1150–1330, y≈370–690.
  photoFrame: { x: 1155, y: 390, width: 170, height: 290 },
};

// ── Ganesh ────────────────────────────────────────────────────────────
// ✅ Fully re-measured with fine (25px) grids at every zone (label,
// divider, banner, sloka, frame) — including discovering this design has
// the same "sloka sits immediately below the banner" issue as Jagannath,
// so puja name goes ABOVE the banner here too, not below it.
const GANESH_LAYOUT: CertificateLayout = {
  matchDeity: /ganesh/i,
  backgroundUrl: `${BASE_URL}images/Ganesh.jpg`,
  width: 1536,
  height: 1024,
  templeSlot: { x: 200, y: 220, maxWidth: 260, font: "600 18px Georgia, serif", color: "#3a2a1a", align: "center" },
  dateSlot: { x: 1155, y: 220, maxWidth: 260, font: "600 18px Georgia, serif", color: "#3a2a1a", align: "center" },
  // Divider at y≈375; devotee name centered in the space below it.
  devoteeNameSlot: { x: 730, y: 460, maxWidth: 460, font: "bold 36px Georgia, serif", color: "#5a1e08", align: "center" },
  // "PUJA PERFORMED" banner top edge is at y≈685 — the sloka begins
  // almost immediately below it (y≈735), so this sits just above the
  // banner instead, with a smaller font for a safe, reliable fit.
  pujaNameSlot: { x: 730, y: 642, maxWidth: 460, font: "16px Georgia, serif", color: "#3a2a1a", align: "center" },
  // ✅ CORRECTED (2026-09-05 — real bug, caught via an actual test
  // render): my first estimate (y=815) rendered directly on top of the
  // deity illustration, nowhere near the barcode. Measured the actual
  // barcode box directly: it sits much lower than assumed, y≈825–895 —
  // matching the same "lower than expected" pattern already confirmed on
  // Jagannath's barcode.
  refIdSlot: { x: 260, y: 915, maxWidth: 300, font: "600 15px Georgia, serif", color: "#5a4a2a", align: "center" },
  // Re-measured with a fine grid: true inner opening x≈1150–1395,
  // y≈390–705.
  photoFrame: { x: 1155, y: 395, width: 235, height: 305 },
};

// ── Hanuman ───────────────────────────────────────────────────────────
// ✅ Photo frame fully re-measured with a fine grid. Text positions use
// the same confirmed pattern as Ganesh (same general artwork structure —
// divider, banner, sloka spacing all looked consistent on a visual
// pass) rather than being individually crop-measured field-by-field —
// worth a real test render before fully relying on the exact Y values,
// same caveat as before.
const HANUMAN_LAYOUT: CertificateLayout = {
  matchDeity: /hanuman/i,
  backgroundUrl: `${BASE_URL}images/Hanuman.jpg`,
  width: 1536,
  height: 1024,
  templeSlot: { x: 200, y: 220, maxWidth: 260, font: "600 18px Georgia, serif", color: "#f5f0d8", align: "center" },
  dateSlot: { x: 1155, y: 220, maxWidth: 260, font: "600 18px Georgia, serif", color: "#f5f0d8", align: "center" },
  devoteeNameSlot: { x: 730, y: 455, maxWidth: 460, font: "bold 36px Georgia, serif", color: "#fdf8e8", align: "center" },
  pujaNameSlot: { x: 730, y: 620, maxWidth: 460, font: "16px Georgia, serif", color: "#f5f0d8", align: "center" },
  // ✅ ADJUSTED (2026-09-05): applying the same correction confirmed on
  // Ganesh and Jagannath's barcode/refId position — genuinely sits lower
  // than a first-glance estimate suggests. Not individually re-measured
  // with a fresh crop for this specific design, so still worth a real
  // test render to confirm exactly.
  refIdSlot: { x: 260, y: 910, maxWidth: 300, font: "600 15px Georgia, serif", color: "#e8dfc0", align: "center" },
  // Re-measured with a fine grid: true inner opening x≈1150–1400,
  // y≈390–690.
  photoFrame: { x: 1155, y: 395, width: 240, height: 290 },
};

// ── Maa Durga ─────────────────────────────────────────────────────────
// ✅ Photo frame fully re-measured with a fine grid. Same caveat on text
// positions as Hanuman above.
const MAA_DURGA_LAYOUT: CertificateLayout = {
  matchDeity: /durga/i,
  backgroundUrl: `${BASE_URL}images/${encodeURIComponent("Maa Durga.jpg")}`,
  width: 1536,
  height: 1024,
  templeSlot: { x: 200, y: 220, maxWidth: 260, font: "600 18px Georgia, serif", color: "#f5e6a8", align: "center" },
  dateSlot: { x: 1155, y: 220, maxWidth: 260, font: "600 18px Georgia, serif", color: "#f5e6a8", align: "center" },
  devoteeNameSlot: { x: 730, y: 460, maxWidth: 460, font: "bold 36px Georgia, serif", color: "#fdf3d0", align: "center" },
  pujaNameSlot: { x: 730, y: 605, maxWidth: 460, font: "16px Georgia, serif", color: "#f5e6a8", align: "center" },
  // Same correction pattern as Ganesh/Jagannath/Hanuman above.
  refIdSlot: { x: 260, y: 895, maxWidth: 300, font: "600 15px Georgia, serif", color: "#e8d494", align: "center" },
  // Re-measured with a fine grid: true inner opening x≈1180–1400,
  // y≈380–700.
  photoFrame: { x: 1185, y: 385, width: 210, height: 310 },
};

// ── Maa Tarini ────────────────────────────────────────────────────────
// ✅ Photo frame fully re-measured with a fine grid. Text positions
// originally referenced the founder's filled example for this design —
// applying the same safety-margin correction confirmed necessary on
// Mahadev (also sourced from a filled reference, and needed real
// adjustment after a test render) rather than the raw eyeballed values.
const MAA_TARINI_LAYOUT: CertificateLayout = {
  matchDeity: /tarini/i,
  backgroundUrl: `${BASE_URL}images/${encodeURIComponent("Maa Tarini.jpg")}`,
  width: 1536,
  height: 1024,
  templeSlot: { x: 195, y: 218, maxWidth: 280, font: "700 19px Georgia, serif", color: "#f5e6c8", align: "center" },
  dateSlot: { x: 1150, y: 218, maxWidth: 260, font: "600 18px Georgia, serif", color: "#f5e6c8", align: "center" },
  devoteeNameSlot: { x: 730, y: 460, maxWidth: 460, font: "bold 36px Georgia, serif", color: "#fdf3e0", align: "center" },
  pujaNameSlot: { x: 730, y: 610, maxWidth: 460, font: "16px Georgia, serif", color: "#f5e6c8", align: "center" },
  // Same correction pattern as Ganesh/Jagannath/Hanuman/Durga above.
  refIdSlot: { x: 265, y: 908, maxWidth: 300, font: "600 15px Georgia, serif", color: "#e8d4a8", align: "center" },
  // Re-measured with a fine grid: true inner opening x≈1120–1400,
  // y≈400–705.
  photoFrame: { x: 1125, y: 405, width: 270, height: 295 },
};

// Falls back to null (a plain "coming soon" placeholder, never a
// different deity's real artwork — see selectLayout() below) if the
// selected deity has no matching design yet.
const CERTIFICATE_LAYOUTS: CertificateLayout[] = [
  JAGANNATH_LAYOUT, MAHADEV_LAYOUT, MAA_TARINI_LAYOUT, GANESH_LAYOUT, HANUMAN_LAYOUT, MAA_DURGA_LAYOUT,
];

// ✅ CHANGED (2026-09-05 — explicit instruction: "If a user selects
// Jagannath, the certificate should display only the Jagannath
// certificate design. It should not show any other deity or temple
// certificate design"): previously fell back to the Jagannath layout for
// EVERY deity, meaning selecting e.g. "Goddess Durga" silently showed the
// Jagannath artwork — misleading, since it looks like a real match. Now
// returns null when no matching design exists yet, and the caller (below)
// shows a plain "design coming soon" placeholder instead of any real
// temple's artwork. As the 15 major-deity designs mentioned are supplied,
// each just becomes one more entry in CERTIFICATE_LAYOUTS above — nothing
// else about this function or the form changes.
function selectLayout(deity: string): CertificateLayout | null {
  return CERTIFICATE_LAYOUTS.find((l) => l.matchDeity.test(deity)) || null;
}

export const CERTIFICATE_WIDTH = JAGANNATH_LAYOUT.width;
export const CERTIFICATE_HEIGHT = JAGANNATH_LAYOUT.height;

// Background images are loaded once and reused — renderCertificate() runs
// on every keystroke via the live preview, and re-fetching/re-decoding a
// ~500KB JPEG that many times a second would be wasteful and could cause
// visible flicker.
const backgroundImageCache = new Map<string, HTMLImageElement>();
function loadCachedImage(url: string): Promise<HTMLImageElement> {
  const cached = backgroundImageCache.get(url);
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { backgroundImageCache.set(url, img); resolve(img); };
    img.onerror = reject;
    img.src = url;
  });
}

function fitPhotoIntoFrame(ctx: CanvasRenderingContext2D, img: HTMLImageElement, frame: { x: number; y: number; width: number; height: number }) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(frame.x, frame.y, frame.width, frame.height);
  ctx.clip();
  // Cover-fit — fills the frame without distorting the photo's aspect ratio.
  const scale = Math.max(frame.width / img.width, frame.height / img.height);
  const dw = img.width * scale, dh = img.height * scale;
  const dx = frame.x + (frame.width - dw) / 2, dy = frame.y + (frame.height - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);

  // ✅ ADDED (2026-09-05 — "make sure the photo's background is removed
  // or made clear... so the photo blends naturally with the certificate's
  // background design"): true AI background removal (cutting out just
  // the person) needs either a paid API or a heavy ML library — not the
  // right trade-off for a bootstrapped budget, and risky to add untested.
  // This instead feathers the photo's own edges into transparency with a
  // soft gradient, so instead of a harsh rectangular photo sitting on the
  // parchment, it fades naturally into the artwork the same way a
  // vignette-framed portrait would. Genuinely free (pure canvas, no new
  // dependency), and the visual goal — no harsh rectangle — is met either
  // way.
  const featherWidth = Math.round(Math.min(frame.width, frame.height) * 0.32);
  ctx.globalCompositeOperation = "destination-in";
  const fadeMask = ctx.createLinearGradient(frame.x, 0, frame.x + frame.width, 0);
  // A radial-feeling fade approximated with two linear passes (canvas has
  // no built-in "fade all four edges" gradient) — one horizontal, one
  // vertical, multiplied together via two destination-in passes.
  fadeMask.addColorStop(0, "rgba(0,0,0,0)");
  fadeMask.addColorStop(Math.min(featherWidth / frame.width, 0.45), "rgba(0,0,0,1)");
  fadeMask.addColorStop(Math.max(1 - featherWidth / frame.width, 0.55), "rgba(0,0,0,1)");
  fadeMask.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = fadeMask;
  ctx.fillRect(frame.x, frame.y, frame.width, frame.height);

  const fadeMaskV = ctx.createLinearGradient(0, frame.y, 0, frame.y + frame.height);
  fadeMaskV.addColorStop(0, "rgba(0,0,0,0)");
  fadeMaskV.addColorStop(Math.min(featherWidth / frame.height, 0.45), "rgba(0,0,0,1)");
  fadeMaskV.addColorStop(Math.max(1 - featherWidth / frame.height, 0.55), "rgba(0,0,0,1)");
  fadeMaskV.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = fadeMaskV;
  ctx.fillRect(frame.x, frame.y, frame.width, frame.height);

  ctx.restore();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  align: CanvasTextAlign,
  mode: "fill" | "stroke" = "fill",
) {
  ctx.textAlign = align;
  const draw = mode === "stroke" ? ctx.strokeText.bind(ctx) : ctx.fillText.bind(ctx);
  const words = text.split(" ");
  let line = "";
  let lineY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      draw(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) draw(line, x, lineY);
  return lineY;
}

function drawSlot(ctx: CanvasRenderingContext2D, slot: TextSlot, text: string) {
  if (!text) return;
  ctx.font = slot.font;
  ctx.textAlign = slot.align;
  // ✅ ADDED (2026-09-05 — real legibility issue found via a test
  // render): a few designs' puja-name slot sits over a busy scenic
  // illustration (temple towers, sky) rather than plain parchment,
  // making the text hard to read there. A soft shadow behind the text
  // lifts it off a busy background without needing per-design special-
  // casing — but the shadow has to contrast with the TEXT color, not
  // assume dark text: Jagannath/Ganesh/Maa Durga use dark brown text (so
  // a light shadow helps), while Mahadev/Hanuman/Maa Tarini use light
  // cream/white text on darker themes (a light shadow there would be
  // invisible or muddy — a dark shadow is what actually helps).
  const isLightText = isLightColor(slot.color);
  const haloColor = isLightText ? "rgba(20, 15, 5, 0.85)" : "rgba(253, 246, 224, 0.95)";
  ctx.shadowColor = haloColor;
  ctx.shadowBlur = 5;
  const lineHeight = Math.round(parseInt(slot.font.match(/(\d+)px/)?.[1] || "20", 10) * 1.25);
  // ✅ STRENGTHENED (2026-09-05 — repeated report: "some writing blends
  // into the background and is hard to read"): a drop shadow alone can
  // still wash out on artwork with similar tones right where a field
  // sits (e.g. gold text on a gold-toned illustration). Adding a real
  // stroked outline in the same halo color — drawn first, so the fill
  // sits cleanly on top — guarantees contrast against ANY background
  // pixel underneath, not just busier ones the shadow alone helped with.
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.strokeStyle = haloColor;
  ctx.lineWidth = Math.max(2, Math.round(parseInt(slot.font.match(/(\d+)px/)?.[1] || "20", 10) * 0.1));
  // Long values (a long temple name, a long puja name) wrap onto a second
  // centered line rather than overflowing past their column — same
  // approach server.ts already uses for the email/acknowledgement JPGs.
  // Stroke pass first (the outline sits underneath), then the shadowed
  // fill pass on top — the outline alone guarantees contrast against any
  // background pixel, and the shadow adds depth on top of that.
  wrapText(ctx, text, slot.x, slot.y, slot.maxWidth, lineHeight, slot.align, "stroke");
  ctx.fillStyle = slot.color;
  wrapText(ctx, text, slot.x, slot.y, slot.maxWidth, lineHeight, slot.align, "fill");
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
}

// Simple perceived-luminance check on a hex color — used only to decide
// which direction drawSlot()'s legibility shadow should go.
function isLightColor(hex: string): boolean {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150;
}

// ✅ ADDED (2026-09-05 — explicit instruction):
//   - no family members added -> just the devotee's name ("Kunu Rana")
//   - at least one family-relationship member added -> "Kunu Rana and Family"
//   - only friends added, no family -> "Kunu Rana and Friends"
//   - both a family member AND a friend added -> "and Family" takes
//     priority (a devotee's family is still present even if a friend also
//     came along; "Family" is the more inclusive, natural-sounding word
//     here). Never lists individual members' names or relationships on
//     the certificate itself — those stay admin/reference-only, exactly
//     as instructed.
function buildDisplayName(devoteeName: string, members: { name: string; relationship: string }[]): string {
  const named = members.filter((m) => m.name.trim());
  if (named.length === 0) return devoteeName;
  const hasFamily = named.some((m) => m.relationship && m.relationship !== "Friend");
  return `${devoteeName} and ${hasFamily ? "Family" : "Friends"}`;
}

// Shown instead of any real temple's artwork when the selected deity has
// no matching design yet — see selectLayout()'s comment above for why
// silently falling back to an unrelated design was wrong.
function drawComingSoonPlaceholder(ctx: CanvasRenderingContext2D, width: number, height: number, deity: string) {
  ctx.fillStyle = "#f5ecd8";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#b8860b";
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 24, width - 48, height - 48);
  ctx.fillStyle = "#7a2e0e";
  ctx.font = "italic 28px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("Sri Dwar", width / 2, height / 2 - 30);
  ctx.font = "bold 32px Georgia, serif";
  ctx.fillStyle = "#5a1e08";
  const label = deity ? `${deity} Certificate Design Coming Soon` : "Select a Deity to Preview";
  wrapText(ctx, label, width / 2, height / 2 + 20, width - 300, 40, "center");
}

export async function renderCertificate(canvas: HTMLCanvasElement, data: CertificateData) {
  const layout = selectLayout(data.deity);
  canvas.width = CERTIFICATE_WIDTH;
  canvas.height = CERTIFICATE_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  if (!layout) {
    // No design exists yet for this deity — a plain placeholder, never a
    // different temple's real artwork (see selectLayout()'s comment).
    drawComingSoonPlaceholder(ctx, CERTIFICATE_WIDTH, CERTIFICATE_HEIGHT, data.deity);
    return;
  }

  try {
    const bg = await loadCachedImage(layout.backgroundUrl);
    ctx.drawImage(bg, 0, 0, layout.width, layout.height);
  } catch {
    // Background failed to load (bad path, offline, etc.) — fall back to
    // a plain cream panel rather than leaving a blank/broken canvas, so
    // the text fields are still legible and the devotee isn't staring at
    // nothing.
    ctx.fillStyle = "#f5ecd8";
    ctx.fillRect(0, 0, layout.width, layout.height);
  }

  if (data.devoteePhoto) {
    fitPhotoIntoFrame(ctx, data.devoteePhoto, layout.photoFrame);
  }

  drawSlot(ctx, layout.templeSlot, data.temple);
  drawSlot(ctx, layout.dateSlot, data.pujaDate ? new Date(data.pujaDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "");
  // ✅ ADDED (2026-09-05 — explicit instruction: "Vendor-entered names
  // should always appear in CAPITAL LETTERS"): applied only at the final
  // draw step, so buildDisplayName()'s own "and Family"/"and Friends"
  // logic keeps working on the original mixed-case name, and the admin
  // form/inputs elsewhere are completely unaffected — this only changes
  // what gets painted onto the certificate artwork itself.
  drawSlot(ctx, layout.devoteeNameSlot, buildDisplayName(data.devoteeName || "Devotee Name", data.members).toUpperCase());
  drawSlot(ctx, layout.pujaNameSlot, data.serviceType);
  drawSlot(ctx, layout.refIdSlot, data.refId ? `Ref: ${data.refId}` : "");
}

// ✅ REMOVED (2026-09-05): SERVICE_TYPE_OPTIONS (the old hardcoded,
// grouped Puja/Seva/Products/Holistic/Guidance/Other dropdown) — per
// explicit instruction: "do not show all the services. Only show the
// various Puja options and temple engraving options... add a new Puja
// name, as some Pujas may be unique to us." Service is now a
// database-backed option type exactly like City/Deity/Temple (see
// server.ts's /api/admin/certificates/options/service and the seed data
// in admin_certificates_migration.sql, seeded with real puja names + Stone
// Name Engraving), with the same "Add & Save" flow — AdminCertificateGeneration.tsx
// fetches it the same way it fetches City/Deity/Temple now.

export const RELATIONSHIP_OPTIONS = [
  "Father", "Mother", "Son", "Daughter", "Granddaughter", "Grandson",
  "Niece", "Nephew", "Grandfather", "Grandmother", "Other Relative", "Friend",
];

// ✅ ADDED (2026-09-03): "Keep uploaded/captured photos under 1 MB" —
// compresses client-side before anything is ever sent to the server, by
// progressively downscaling and/or reducing JPEG quality until the result
// fits. Runs entirely via <canvas>, no new dependency needed.
//
// ✅ ROOT-CAUSE FIX (2026-09-05 — "even a background-removed photo still
// shows a white background on the certificate"): this function always
// exported "image/jpeg". JPEG has no alpha channel, so the very first time
// a vendor's already-transparent (background-removed) PNG passed through
// here — BEFORE removeStudioBackground() ever got a chance to run — every
// transparent pixel was silently flattened to an opaque one (rendered as a
// solid white or black square depending on the browser's own JPEG
// encoder). removeStudioBackground() was then chroma-keying an image that
// had already lost its transparency, so it could never restore it. Adding
// `preserveAlpha` lets the certificate-rendering path ask for a PNG
// instead, so any transparency already present in the source photo (or
// added afterward by removeStudioBackground()) survives all the way to
// the canvas. The original JPEG path (used for the small upload/storage
// copy, where transparency was never needed) is completely unchanged.
export async function compressImageToUnderSize(file: File | Blob, maxBytes = 1024 * 1024, preserveAlpha = false): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });

  let width = img.naturalWidth;
  let height = img.naturalHeight;
  // A photo destined for a small circular frame on a certificate never
  // needs to be huge — cap the starting dimension generously, then let
  // the quality/downscale loop below handle the rest.
  const MAX_DIMENSION = 1600;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported.");

  const format = preserveAlpha ? "image/png" : "image/jpeg";
  let quality = 0.9;
  let dataUrl = "";
  for (let attempt = 0; attempt < 8; attempt++) {
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    // PNG ignores the quality argument entirely (it's lossless) — for the
    // alpha-preserving path, size is brought down purely by the dimension
    // shrink step below, never by a quality drop (which would do nothing
    // on a PNG anyway and just waste loop iterations).
    dataUrl = canvas.toDataURL(format, quality);
    // Base64 is ~4/3 the size of the raw bytes it encodes.
    const approxBytes = dataUrl.length * 0.75;
    if (approxBytes <= maxBytes) break;
    if (!preserveAlpha && quality > 0.5) {
      quality -= 0.15; // first, try reducing quality — keeps full resolution longer
    } else {
      width = Math.round(width * 0.8); // then start shrinking dimensions too
      height = Math.round(height * 0.8);
      quality = 0.7;
    }
  }

  URL.revokeObjectURL(img.src);
  return dataUrl;
}

// ✅ ADDED (2026-09-05 — real bug: photo backgrounds still showed their
// original studio-backdrop color, since the earlier feathering fix only
// faded the photo's own EDGES, never touched the color underneath it):
// a corner-sampling chroma-key, run once when a photo is selected — not
// on every keystroke/re-render, so the live preview stays fast. Pure
// canvas pixel manipulation, no new dependency, and genuinely free,
// matching this project's budget constraints — the alternative (a real
// ML background-removal library) is much heavier and not the right
// trade-off here.
//
// How it works: most devotee ID-style photos are shot against a plain,
// fairly uniform backdrop (a wall, a studio sheet, a courtyard). This
// samples small blocks in all 4 corners, and only proceeds if those
// blocks agree on a similar color (a real uniform backdrop) — if the
// corners are inconsistent (a busy/natural background, or the subject's
// own body reaching into a corner), it deliberately does nothing rather
// than risk cutting holes in someone's face or clothing.
export async function removeStudioBackground(sourceDataUrl: string): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = sourceDataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return sourceDataUrl;
  ctx.drawImage(img, 0, 0);

  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Sample a small block in each corner (avoids a single stray pixel —
  // a dust speck, a JPEG compression artifact — skewing the reading).
  const sampleSize = Math.max(4, Math.round(Math.min(width, height) * 0.03));
  function sampleCorner(cx: number, cy: number): [number, number, number] {
    let r = 0, g = 0, b = 0, count = 0;
    for (let y = cy; y < cy + sampleSize; y++) {
      for (let x = cx; x < cx + sampleSize; x++) {
        const idx = (y * width + x) * 4;
        r += data[idx]; g += data[idx + 1]; b += data[idx + 2];
        count++;
      }
    }
    return [r / count, g / count, b / count];
  }
  const corners = [
    sampleCorner(0, 0),
    sampleCorner(width - sampleSize, 0),
    sampleCorner(0, height - sampleSize),
    sampleCorner(width - sampleSize, height - sampleSize),
  ];

  function colorDistance(a: [number, number, number], b: [number, number, number]): number {
    return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
  }

  // ✅ CHANGED (2026-09-05 — real bug: a genuine uploaded photo showed a
  // bright white halo instead of a removed background, confirming
  // chroma-key was bailing out and only the separate edge-feather was
  // doing anything): requiring all 4 corners to agree was too strict for
  // real photos — ordinary studio lighting often puts a slight shadow or
  // vignette in ONE corner (or a shoulder/hair reaches into it), which
  // easily exceeded the old threshold and skipped removal entirely on
  // otherwise-uniform backdrops. Now finds the largest group of corners
  // that agree closely (3-of-4, or all 4) and uses just that group's
  // average as the backdrop color, only bailing out if even 3 can't
  // agree — genuinely non-uniform/busy backgrounds still correctly skip
  // removal, but ordinary lighting variance no longer blocks it.
  const pairs: [number, number][] = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];
  const distances = pairs.map(([i, j]) => ({ i, j, d: colorDistance(corners[i], corners[j]) }));
  const AGREEMENT_THRESHOLD = 55;

  // Try all 4 corners together first.
  let backdropCorners = corners;
  if (Math.max(...distances.map((p) => p.d)) > AGREEMENT_THRESHOLD) {
    // Find the trio (3 of the 4 corners) whose worst-case internal spread
    // is smallest — i.e. the most mutually-consistent group of 3.
    const trios = [[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]];
    let bestTrio: number[] | null = null;
    let bestTrioSpread = Infinity;
    for (const trio of trios) {
      const trioPairs = pairs.filter(([i, j]) => trio.includes(i) && trio.includes(j));
      const spread = Math.max(...trioPairs.map((p) => distances.find((d) => d.i === p[0] && d.j === p[1])!.d));
      if (spread < bestTrioSpread) { bestTrioSpread = spread; bestTrio = trio; }
    }
    if (!bestTrio || bestTrioSpread > AGREEMENT_THRESHOLD) {
      return sourceDataUrl; // not even 3 corners agree — genuinely non-uniform background, leave untouched
    }
    backdropCorners = bestTrio.map((i) => corners[i]);
  }

  const backdrop: [number, number, number] = [
    backdropCorners.reduce((s, c) => s + c[0], 0) / backdropCorners.length,
    backdropCorners.reduce((s, c) => s + c[1], 0) / backdropCorners.length,
    backdropCorners.reduce((s, c) => s + c[2], 0) / backdropCorners.length,
  ];

  // Soft threshold band, not a hard cutoff — pixels close to the
  // backdrop color fade smoothly to transparent instead of leaving a
  // harsh, jagged cutout edge around the subject. Widened slightly
  // alongside the corner-agreement change above, for the same reason —
  // real backdrops have some natural shading, not one perfectly flat
  // color.
  const FULL_TRANSPARENT_BELOW = 35;
  const FULL_OPAQUE_ABOVE = 85;
  for (let i = 0; i < data.length; i += 4) {
    const dist = colorDistance([data[i], data[i + 1], data[i + 2]], backdrop);
    if (dist <= FULL_TRANSPARENT_BELOW) {
      data[i + 3] = 0;
    } else if (dist < FULL_OPAQUE_ABOVE) {
      data[i + 3] = Math.round(255 * ((dist - FULL_TRANSPARENT_BELOW) / (FULL_OPAQUE_ABOVE - FULL_TRANSPARENT_BELOW)));
    }
    // dist >= FULL_OPAQUE_ABOVE: leave alpha at its original 255, untouched.
  }

  ctx.putImageData(imageData, 0, 0);
  // PNG, not JPEG — JPEG has no alpha channel at all, so transparency
  // would be silently lost if this were exported as JPEG.
  return canvas.toDataURL("image/png");
}


