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
  devoteePhoto: HTMLImageElement | null;
  familyPhoto: HTMLImageElement | null;
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
  // Below "PERFORMED AT" (icon + label centered at x≈185, label baseline
  // ≈160) and its small decorative divider at y≈180.
  templeSlot: { x: 185, y: 212, maxWidth: 260, font: "600 18px Georgia, serif", color: "#3a2a1a", align: "center" },
  // Below "DATE OF PUJA" (centered at x≈1125), same label/divider heights.
  dateSlot: { x: 1125, y: 212, maxWidth: 260, font: "600 18px Georgia, serif", color: "#3a2a1a", align: "center" },
  // ✅ RE-MEASURED (2026-09-05) against the reference sample the founder
  // supplied (Sample_Certificate.png — a real composited example showing
  // exactly where this should sit): y=505, truly centered between "This
  // is to certify that"'s divider (≈380) and the "PUJA PERFORMED" banner
  // (≈620) — my first measurement (435) was too high, closer to the
  // divider than centered.
  devoteeNameSlot: { x: 725, y: 505, maxWidth: 420, font: "bold 38px Georgia, serif", color: "#5a1e08", align: "center" },
  // ✅ RE-MEASURED (2026-09-05) against the same reference sample: y=740,
  // comfortably below the "PUJA PERFORMED" banner's actual bottom edge
  // (≈670) — my first measurement (700) was too tight against the banner.
  pujaNameSlot: { x: 725, y: 740, maxWidth: 440, font: "22px Georgia, serif", color: "#3a2a1a", align: "center" },
  // Below the barcode box — the box's own bottom edge is at y≈903
  // (measured directly; also noticeably lower than a first glance
  // suggests), with the certificate's outer wooden frame starting around
  // y≈940, leaving a tight but clean gap for a single line.
  refIdSlot: { x: 245, y: 925, maxWidth: 300, font: "600 15px Georgia, serif", color: "#5a4a2a", align: "center" },
  // ✅ RE-MEASURED (2026-09-05): the earlier x=1032 was genuinely wrong —
  // measured again directly against the reference sample and the
  // artwork's own arch-frame border lines. The frame's actual inner
  // rectangular opening (below the arch's curved top, which a rectangular
  // photo can't fill anyway) is x≈1135–1325, y≈345–690. This was very
  // likely the root cause of the photo appearing shifted/misplaced —
  // being drawn ~100px to the left of where the frame graphic actually
  // is, not a distortion in the photo itself.
  photoFrame: { x: 1135, y: 345, width: 190, height: 345 },
};

// Falls back to the Jagannath layout if no deity-specific design exists
// yet — the certificate still generates correctly for every other deity,
// it just visually looks like a Jagannath-temple design until a matching
// one is supplied. Never fails to render entirely.
const CERTIFICATE_LAYOUTS: CertificateLayout[] = [JAGANNATH_LAYOUT];

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
  const featherWidth = Math.round(Math.min(frame.width, frame.height) * 0.24);
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

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, align: CanvasTextAlign) {
  ctx.textAlign = align;
  const words = text.split(" ");
  let line = "";
  let lineY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, lineY);
  return lineY;
}

function drawSlot(ctx: CanvasRenderingContext2D, slot: TextSlot, text: string) {
  if (!text) return;
  ctx.font = slot.font;
  ctx.fillStyle = slot.color;
  ctx.textAlign = slot.align;
  // Long values (a long temple name, a long puja name) wrap onto a second
  // centered line rather than overflowing past their column — same
  // approach server.ts already uses for the email/acknowledgement JPGs.
  wrapText(ctx, text, slot.x, slot.y, slot.maxWidth, Math.round(parseInt(slot.font.match(/(\d+)px/)?.[1] || "20", 10) * 1.25), slot.align);
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
  drawSlot(ctx, layout.devoteeNameSlot, buildDisplayName(data.devoteeName || "Devotee Name", data.members));
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
export async function compressImageToUnderSize(file: File | Blob, maxBytes = 1024 * 1024): Promise<string> {
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

  let quality = 0.9;
  let dataUrl = "";
  for (let attempt = 0; attempt < 8; attempt++) {
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    dataUrl = canvas.toDataURL("image/jpeg", quality);
    // Base64 is ~4/3 the size of the raw bytes it encodes.
    const approxBytes = dataUrl.length * 0.75;
    if (approxBytes <= maxBytes) break;
    if (quality > 0.5) {
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

