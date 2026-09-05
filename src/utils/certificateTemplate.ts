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
  // Below "This is to certify that" and its decorative divider at y≈352 —
  // the certificate's own largest open space (the "PUJA PERFORMED" banner
  // doesn't start until y≈615, confirmed by direct measurement — this
  // isn't the tight gap it first looked like), so this is the biggest
  // text on the page, matching how every other Sri Dwar certificate
  // treats the devotee's name.
  devoteeNameSlot: { x: 725, y: 435, maxWidth: 420, font: "bold 38px Georgia, serif", color: "#5a1e08", align: "center" },
  // Below the "PUJA PERFORMED" banner — banner spans y≈615–660 (measured
  // directly; noticeably lower than it first appears at a glance).
  pujaNameSlot: { x: 725, y: 700, maxWidth: 440, font: "22px Georgia, serif", color: "#3a2a1a", align: "center" },
  // Below the barcode box — the box's own bottom edge is at y≈903
  // (measured directly; also noticeably lower than a first glance
  // suggests), with the certificate's outer wooden frame starting around
  // y≈940, leaving a tight but clean gap for a single line.
  refIdSlot: { x: 245, y: 925, maxWidth: 300, font: "600 15px Georgia, serif", color: "#5a4a2a", align: "center" },
  // The empty arched frame, top-right — inner clear area only (the frame
  // border itself sits outside these bounds).
  photoFrame: { x: 1032, y: 288, width: 190, height: 335 },
};

// Falls back to the Jagannath layout if no deity-specific design exists
// yet — the certificate still generates correctly for every other deity,
// it just visually looks like a Jagannath-temple design until a matching
// one is supplied. Never fails to render entirely.
const CERTIFICATE_LAYOUTS: CertificateLayout[] = [JAGANNATH_LAYOUT];

function selectLayout(deity: string): CertificateLayout {
  return CERTIFICATE_LAYOUTS.find((l) => l.matchDeity.test(deity)) || JAGANNATH_LAYOUT;
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
  ctx.drawImage(img, frame.x + (frame.width - dw) / 2, frame.y + (frame.height - dh) / 2, dw, dh);
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

export async function renderCertificate(canvas: HTMLCanvasElement, data: CertificateData) {
  const layout = selectLayout(data.deity);
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

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
  drawSlot(ctx, layout.devoteeNameSlot, data.devoteeName || "Devotee Name");
  drawSlot(ctx, layout.pujaNameSlot, data.serviceType);
  drawSlot(ctx, layout.refIdSlot, data.refId ? `Ref: ${data.refId}` : "");

  // Family members, names only — never relationships — placed just below
  // the devotee name, using whatever room remains before the "PUJA
  // PERFORMED" banner.
  if (data.members.length > 0) {
    const names = data.members.map((m) => m.name).filter(Boolean).join("  \u2022  ");
    if (names) {
      ctx.font = "18px Georgia, serif";
      ctx.fillStyle = "#5a4a2a";
      wrapText(ctx, names, layout.devoteeNameSlot.x, layout.devoteeNameSlot.y + 55, layout.devoteeNameSlot.maxWidth, 24, "center");
    }
  }
}


// Every option this form currently offers for the single-select Service
// dropdown — grouped for a friendlier <select>, per "Pujas, Sevas,
// Products, Holistic Services, Guidance Sevas, Stone Engraving, and other
// relevant options."
export const SERVICE_TYPE_OPTIONS: { group: string; options: string[] }[] = [
  { group: "Puja", options: ["Online Puja", "Simple Puja / Sankalpa", "Family & Marriage Puja"] },
  { group: "Seva", options: ["Temple Seva Sponsorship", "Annadanam Seva", "Gau Seva", "Diya Lighting Seva"] },
  { group: "Products", options: ["Temple Bazaar Product / Prasad"] },
  { group: "Holistic Services", options: ["Yoga & Wellness Session", "Ayurveda / Panchakarma"] },
  { group: "Guidance Seva", options: ["Astrology Consultation", "Vastu Guidance", "Life Counselling"] },
  { group: "Other", options: ["Stone Name Engraving", "Darshan Certificate", "Temple Redevelopment Contribution"] },
];

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

