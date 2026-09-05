/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ✅ ADDED (2026-09-03): the certificate renderer, deliberately separated
// from AdminCertificateGeneration.tsx (the form) entirely. This is the
// piece meant to be swapped out once real certificate artwork is ready —
// everything below reads from CERTIFICATE_LAYOUT, a plain config object
// mapping each field to a position/size/style. Replacing the placeholder
// background with real artwork and adjusting these coordinates to match
// is the whole job; the form itself (member rows, dropdowns, photo
// capture) never needs to change. Matches the exact pattern server.ts
// already uses for the JPG certificates it composites server-side (e.g.
// TXN_BILLTO_SLOT and friends) — same idea, just running client-side in a
// <canvas> for a live preview instead of server-side with sharp/resvg.

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

// Canvas size — a comfortable print-quality resolution at a standard
// certificate aspect ratio (roughly A4 landscape). Real artwork, once
// supplied, should be exported at this same resolution (or this constant
// updated to match it) so nothing needs rescaling.
export const CERTIFICATE_WIDTH = 1600;
export const CERTIFICATE_HEIGHT = 1131;

// ── Placeholder artwork ──────────────────────────────────────────────────
// A tasteful, devotional-feeling background drawn entirely in code (warm
// cream base, gold ornamental border, a subtle central motif) — used ONLY
// until real artwork is supplied. No external image file needed for this,
// which also means the live preview never depends on an asset that could
// fail to load.
function drawPlaceholderBackground(ctx: CanvasRenderingContext2D) {
  const w = CERTIFICATE_WIDTH, h = CERTIFICATE_HEIGHT;

  // Warm cream base with a very subtle radial vignette toward the edges.
  const bg = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, w * 0.6);
  bg.addColorStop(0, "#fdf8ee");
  bg.addColorStop(1, "#f5ecd8");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Ornamental double gold border.
  ctx.strokeStyle = "#b8860b";
  ctx.lineWidth = 6;
  ctx.strokeRect(28, 28, w - 56, h - 56);
  ctx.strokeStyle = "#d4a017";
  ctx.lineWidth = 2;
  ctx.strokeRect(44, 44, w - 88, h - 88);

  // Four corner motifs — simple concentric arcs, evoking a temple-carving
  // feel without needing an actual decorative image asset yet.
  const corner = (cx: number, cy: number, flipX: number, flipY: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(flipX, flipY);
    ctx.strokeStyle = "#c9971f";
    ctx.lineWidth = 3;
    for (let r = 18; r <= 54; r += 18) {
      ctx.beginPath();
      ctx.arc(0, 0, r, Math.PI, Math.PI * 1.5);
      ctx.stroke();
    }
    ctx.restore();
  };
  corner(70, 70, 1, 1);
  corner(w - 70, 70, -1, 1);
  corner(70, h - 70, 1, -1);
  corner(w - 70, h - 70, -1, -1);
}

function roundedPhotoFrame(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, size: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  // Cover-fit the image into the circle rather than stretching it.
  const scale = Math.max(size / img.width, size / img.height);
  const dw = img.width * scale, dh = img.height * scale;
  ctx.drawImage(img, x + (size - dw) / 2, y + (size - dh) / 2, dw, dh);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.strokeStyle = "#b8860b";
  ctx.lineWidth = 4;
  ctx.stroke();
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

export function renderCertificate(canvas: HTMLCanvasElement, data: CertificateData) {
  canvas.width = CERTIFICATE_WIDTH;
  canvas.height = CERTIFICATE_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  drawPlaceholderBackground(ctx);

  const w = CERTIFICATE_WIDTH;

  // ── Devotee photo, top-center ──
  if (data.devoteePhoto) {
    roundedPhotoFrame(ctx, data.devoteePhoto, w / 2 - 90, 70, 180);
  }

  // ── Title ──
  ctx.fillStyle = "#7a2e0e";
  ctx.font = "italic 34px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("Sri Dwar", w / 2, 300);
  ctx.font = "bold 52px Georgia, serif";
  ctx.fillStyle = "#5a1e08";
  ctx.fillText("Sankalp Certificate", w / 2, 355);

  // ── Devotional blessing line ──
  ctx.font = "italic 22px Georgia, serif";
  ctx.fillStyle = "#8a6d3b";
  ctx.fillText("\u0950 May this sacred offering bring peace, prosperity, and divine grace \u0950", w / 2, 400);

  // ── This confirms that ──
  ctx.font = "20px Georgia, serif";
  ctx.fillStyle = "#3a2a1a";
  ctx.fillText("This is to certify that the sacred offering below has been performed in the name of", w / 2, 460);

  // ── Devotee name — the largest, most prominent text on the certificate ──
  ctx.font = "bold 46px Georgia, serif";
  ctx.fillStyle = "#5a1e08";
  ctx.fillText(data.devoteeName || "Devotee Name", w / 2, 520);

  // ── Family members, names only — never relationships ──
  if (data.members.length > 0) {
    ctx.font = "22px Georgia, serif";
    ctx.fillStyle = "#5a4a2a";
    const names = data.members.map((m) => m.name).filter(Boolean).join("  \u2022  ");
    wrapText(ctx, names, w / 2, 565, w - 400, 30, "center");
  }

  // ── Service performed ──
  ctx.font = "24px Georgia, serif";
  ctx.fillStyle = "#3a2a1a";
  ctx.textAlign = "center";
  ctx.fillText(data.serviceType || "Sacred Offering", w / 2, 650);

  // ── Detail row: Temple / Deity / City / Date ──
  const detailY = 720;
  const details = [
    ["Temple", data.temple],
    ["Deity", data.deity],
    ["City", data.city],
    ["Date", data.pujaDate ? new Date(data.pujaDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : ""],
  ];
  const colWidth = (w - 200) / details.length;
  details.forEach(([label, value], i) => {
    const x = 100 + colWidth * i + colWidth / 2;
    ctx.font = "bold 14px Georgia, serif";
    ctx.fillStyle = "#8a6d3b";
    ctx.textAlign = "center";
    ctx.fillText(label.toUpperCase(), x, detailY);
    ctx.font = "20px Georgia, serif";
    ctx.fillStyle = "#3a2a1a";
    ctx.fillText(value || "—", x, detailY + 28);
  });

  // ── Family photo, if provided — smaller, lower-right ──
  if (data.familyPhoto) {
    roundedPhotoFrame(ctx, data.familyPhoto, w - 280, CERTIFICATE_HEIGHT - 260, 140);
    ctx.font = "13px Georgia, serif";
    ctx.fillStyle = "#8a6d3b";
    ctx.textAlign = "center";
    ctx.fillText("FAMILY", w - 210, CERTIFICATE_HEIGHT - 100);
  }

  // ── Footer: Reference ID, authenticity seal, issued-by ──
  ctx.textAlign = "left";
  ctx.font = "14px Georgia, serif";
  ctx.fillStyle = "#8a6d3b";
  ctx.fillText(`Reference: ${data.refId}`, 90, CERTIFICATE_HEIGHT - 90);
  ctx.fillText("Issued by Shradhalu Private Limited, on behalf of Sri Dwar", 90, CERTIFICATE_HEIGHT - 66);

  // Simple wax-seal-style circle (placeholder — a real seal graphic can
  // replace this the same way the background can).
  ctx.save();
  ctx.translate(w - 160, CERTIFICATE_HEIGHT - 110);
  ctx.beginPath();
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.fillStyle = "#7a1f1f";
  ctx.fill();
  ctx.strokeStyle = "#5a1414";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#f5ecd8";
  ctx.font = "bold 12px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("SRI", 0, -4);
  ctx.fillText("DWAR", 0, 12);
  ctx.restore();
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

