/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  Devotional post-payment confirmation messages
 * ============================================================
 * Every screen that confirms a completed payment (puja/seva booking,
 * Darshan Certificate divine contribution, temple/priest registration
 * contribution, bazaar order, membership, etc.) should use this shared
 * helper instead of writing its own confirmation copy. This keeps the
 * tone consistent site-wide while still producing a message that names
 * the actual service the devotee paid for — never a generic "Thank you
 * for your payment."
 *
 * Deliberately NOT used for anything claiming a CERTIFICATE is available
 * immediately — no service on Sri Dwar generates the real, priest/temple
 * Puja/Seva/Darshan Certificate at the moment of payment; those are always
 * handcrafted after the rite is actually performed and sent within 3–7
 * working days (see certificateService.ts, which is a separate,
 * deliberately not-yet-wired-up pipeline for that document — do not call
 * it from here). What THIS file produces is a much smaller "Sacred
 * Confirmation" receipt — proof the request/payment was received, with
 * the reference ID — never described to the devotee as "your certificate".
 *
 * ✅ FIX — "Download Confirmation" did nothing on tap:
 * downloadConfirmationMessage() used to ONLY build a Blob + an off-DOM
 * <a download> it clicked programmatically. That technique has no
 * built-in fallback, and it silently fails with zero visible feedback in
 * two situations this project actually hits:
 *   1. Inside the Capacitor Android app. capacitor.config.ts's `server.url`
 *      means the app is just Chrome's WebView loading the live site — and
 *      Android WebView does not implement a download manager for
 *      `blob:` URLs the way a normal browser tab does. The `a.click()`
 *      call succeeds with no error, so nothing in the old code could even
 *      have detected the failure; it just looked like the button was
 *      dead.
 *   2. Some in-app/embedded mobile browsers (e.g. opened from inside
 *      WhatsApp, Instagram, Facebook) apply similar restrictions.
 * Fix, in order, each with a real success signal so the devotee is never
 * left staring at nothing:
 *   1. Web Share API (`navigator.share`) — this IS supported by the
 *      Chrome WebView Capacitor uses, and hands the file to Android's own
 *      native share sheet ("Save to Files", Drive, WhatsApp, Gmail, …),
 *      which is the most reliable path on a phone. This is tried first.
 *   2. Classic Blob + <a download> — unchanged from before, kept as the
 *      fallback for desktop and any mobile browser tab where it already
 *      worked fine.
 *   3. Clipboard copy + an on-screen confirmation toast — last resort if
 *      both above are unavailable/blocked, so the devotee still walks
 *      away with their confirmation text and a clear "it worked" signal
 *      instead of silence.
 * Also switched the downloaded file from plain .txt to a small branded
 * PDF (pdf-lib is already a project dependency, used the same way
 * server-side in certificateService.ts) — still just the confirmation
 * receipt described above, not the priest-issued certificate.
 * ============================================================
 */

export type DevotionalServiceCategory =
  | "darshan_certificate"
  | "puja_seva"
  | "counselling_guidance"
  | "holistic_wellness"
  | "seva_offering"
  | "temple_contribution"
  | "bazaar_order"
  | "subscription"
  | "support_contribution";

interface DevotionalMessageInput {
  category: DevotionalServiceCategory;
  /** The specific thing they paid for, e.g. "Rudrabhishek Seva", "Jagannath Temple Darshan Certificate", "Annadanam Seva at Puri" */
  serviceName: string;
  devoteeName: string;
  refId: string;
}

const OPENING_BY_CATEGORY: Record<DevotionalServiceCategory, (serviceName: string) => string> = {
  darshan_certificate: (s) =>
    `Your request for the ${s} has been lovingly received by our team of devoted priests and seva coordinators.`,
  puja_seva: (s) =>
    `Your Sankalpa for ${s} has been lovingly received by our team of devoted priests and seva coordinators.`,
  counselling_guidance: (s) =>
    `Your request for ${s} has been warmly and confidentially received by our guidance coordination team.`,
  holistic_wellness: (s) =>
    `Your enrollment for ${s} has been warmly received by our Yogic Sciences & Wellness team.`,
  seva_offering: (s) =>
    `Your Seva Sankalp for ${s} has been lovingly received by our team of devoted priests and seva coordinators.`,
  temple_contribution: (s) =>
    `Your divine contribution toward ${s} has been lovingly received by our team of devoted priests and seva coordinators.`,
  bazaar_order: (s) =>
    `Your order for ${s} has been lovingly received by our team of devoted priests and seva coordinators.`,
  subscription: (s) =>
    `Your ${s} contribution has been lovingly received by our team of devoted priests and seva coordinators.`,
  support_contribution: (s) =>
    `Your offering for ${s} has been lovingly received by our team of devoted priests and seva coordinators.`,
};

const BLESSING_BY_CATEGORY: Record<DevotionalServiceCategory, string> = {
  darshan_certificate:
    "Like a diya lit with pure intention, your certificate is being handcrafted with sacred blessings and will be delivered to you within 3–7 working days — straight to your email or WhatsApp.",
  puja_seva:
    "Like the flame of a diya carried with unwavering devotion, your ritual is now being prepared with full reverence at the temple, and your Sankalpa Certificate of performance will reach you within 3–7 working days — straight to your email or WhatsApp.",
  counselling_guidance:
    "Your chosen Pandit or Dharmic guidance expert is reviewing your request with care, and will personally reach out to confirm your session timing within 3–7 working days — straight to your email or WhatsApp. Everything you've shared stays confidential.",
  holistic_wellness:
    "Like a lamp of steady practice, your session is being scheduled with care by our Yogic Sciences & Wellness team, and your enrollment confirmation will reach you within 3–7 working days — straight to your email or WhatsApp.",
  seva_offering:
    "Like the flame of a diya carried with unwavering devotion, your seva is now being prepared with full reverence at the temple, and your Seva Certificate of performance will reach you within 3–7 working days — straight to your email or WhatsApp.",
  temple_contribution:
    "Like a diya lit with pure intention, your acknowledgement letter is being handcrafted with sacred blessings and will be delivered to you within 3–7 working days — straight to your email or WhatsApp.",
  bazaar_order:
    "Like a diya lit with pure intention, your sacred items are being prepared and packed with blessings, and your dispatch confirmation will reach you within 3–7 working days — straight to your email or WhatsApp.",
  subscription:
    "Like a diya lit with pure intention, your membership welcome letter is being prepared with sacred blessings and will be delivered to you within 3–7 working days — straight to your email or WhatsApp.",
  support_contribution:
    "Like a diya lit with pure intention, your acknowledgement is being handcrafted with sacred blessings and will be delivered to you within 3–7 working days — straight to your email or WhatsApp.",
};

/** Structured pieces, for screens that render the message with their own styling (e.g. Hero.tsx's card layout). */
export function getDevotionalConfirmation({ category, serviceName, devoteeName, refId }: DevotionalMessageInput) {
  return {
    greeting: `Dear ${devoteeName},`,
    opening: OPENING_BY_CATEGORY[category](serviceName),
    blessing: BLESSING_BY_CATEGORY[category],
    refLine: `Reference ID: ${refId}`,
  };
}

/** Plain-text version, for the downloadable confirmation file and the clipboard-copy fallback. */
export function getDevotionalConfirmationText(input: DevotionalMessageInput): string {
  const { greeting, opening, blessing, refLine } = getDevotionalConfirmation(input);
  return [
    "🙏 Sri Dwar — Sacred Confirmation 🙏",
    "",
    refLine,
    "",
    greeting,
    "",
    opening,
    "",
    blessing,
    "",
    "Om Namah Shivaya. May Lord Jagannath bless your home.",
    "",
    "— Sri Dwar (Shradhalu Private Limited)",
  ].join("\n");
}

// ─── Small self-contained toast (no dependency on any app-wide toast system) ─
// Gives the devotee a visible, positive signal for whichever download path
// actually succeeded — the whole point of this fix is that tapping the
// button never again looks like it did nothing.
function showConfirmationToast(message: string): void {
  if (typeof document === "undefined") return;
  try {
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.setAttribute("role", "status");
    toast.style.position = "fixed";
    toast.style.top = "calc(env(safe-area-inset-top, 0px) + 16px)";
    toast.style.left = "50%";
    toast.style.transform = "translateX(-50%)";
    toast.style.zIndex = "400";
    toast.style.maxWidth = "calc(100vw - 32px)";
    toast.style.background = "linear-gradient(180deg, #0B2B27, #0F3530)";
    toast.style.color = "#ffffff";
    toast.style.border = "1px solid rgba(255,255,255,0.15)";
    toast.style.borderRadius = "12px";
    toast.style.padding = "10px 16px";
    toast.style.fontSize = "12px";
    toast.style.fontFamily = "inherit";
    toast.style.boxShadow = "0 10px 30px rgba(0,0,0,0.35)";
    toast.style.textAlign = "center";
    toast.style.transition = "opacity 0.3s ease";
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 350);
    }, 3200);
  } catch {
    // If even the toast fails, there's nothing further to do — the
    // clipboard/download side effect (if any) already happened.
  }
}

// ─── Confirmation PDF (client-side receipt — NOT the priest-issued certificate) ─
// Reuses the same brand palette as Config.gs / certificateService.ts so the
// receipt looks consistent with every other Sri Dwar document, but this is
// deliberately a small, generic confirmation layout — no temple seals, no
// priest signature, no ritual-specific claims — because none of those are
// true of this document.
async function buildConfirmationPdfBytes(input: DevotionalMessageInput): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const darkGreen = rgb(0x0c / 255, 0x2b / 255, 0x26 / 255);
  const saffron = rgb(0xe8 / 255, 0xa3 / 255, 0x3d / 255);
  const textMuted = rgb(0x6b / 255, 0x7a / 255, 0x76 / 255);
  const ink = rgb(0x17 / 255, 0x30 / 255, 0x2e / 255);
  const white = rgb(1, 1, 1);

  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const { width } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const margin = 56;
  const maxWidth = width - margin * 2;

  // Header band
  page.drawRectangle({ x: 0, y: 792, width, height: 50, color: darkGreen });
  page.drawText("Sri Dwar", { x: margin, y: 810, size: 20, font: bold, color: white });
  page.drawText("Connect. Contribute. Preserve.", {
    x: margin,
    y: 796,
    size: 8,
    font,
    color: rgb(0xaf / 255, 0xf8 / 255, 0xec / 255),
  });

  let y = 750;
  page.drawText("Sacred Confirmation", { x: margin, y, size: 18, font: bold, color: darkGreen });
  y -= 22;
  page.drawRectangle({ x: margin, y, width: 40, height: 2, color: saffron });
  y -= 26;

  const { greeting, opening, blessing, refLine } = getDevotionalConfirmation(input);

  function wrapText(text: string, size: number, useFont = font): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (useFont.widthOfTextAtSize(candidate, size) > maxWidth) {
        if (line) lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function drawParagraph(text: string, size: number, lineGap: number, useFont = font, color = ink) {
    for (const line of wrapText(text, size, useFont)) {
      page.drawText(line, { x: margin, y, size, font: useFont, color });
      y -= lineGap;
    }
  }

  drawParagraph(refLine, 10, 16, bold, textMuted);
  y -= 6;
  drawParagraph(greeting, 12, 18, bold, ink);
  y -= 4;
  drawParagraph(opening, 11, 16);
  y -= 8;
  drawParagraph(blessing, 11, 16, font, textMuted);
  y -= 16;
  drawParagraph("Om Namah Shivaya. May Lord Jagannath bless your home.", 11, 16, bold, darkGreen);

  // Footer
  page.drawRectangle({ x: 0, y: 0, width, height: 50, color: darkGreen });
  page.drawText("Shradhalu Private Limited · sridwar.com · puja@sridwar.com", {
    x: margin,
    y: 22,
    size: 8,
    font,
    color: white,
  });

  return doc.save();
}

/**
 * Delivers the confirmation receipt to the devotee, trying the most
 * reliable method first and always ending with a visible signal — never
 * silently doing nothing. Safe to call without awaiting from an onClick
 * handler, same as before.
 */
export async function downloadConfirmationMessage(input: DevotionalMessageInput): Promise<void> {
  const text = getDevotionalConfirmationText(input);
  const filenameBase = `SriDwar-Confirmation-${input.refId}`;

  let fileBlob: Blob;
  let filename: string;
  try {
    const pdfBytes = await buildConfirmationPdfBytes(input);
    fileBlob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
    filename = `${filenameBase}.pdf`;
  } catch {
    // PDF generation failed for any reason (e.g. dynamic import blocked) —
    // fall back to the plain-text receipt rather than failing entirely.
    fileBlob = new Blob([text], { type: "text/plain;charset=utf-8" });
    filename = `${filenameBase}.txt`;
  }

  // 1) Native share sheet — most reliable inside the Capacitor Android app,
  //    where a blob <a download> click is silently unsupported.
  const nav = typeof navigator !== "undefined" ? (navigator as Navigator & {
    share?: (data: ShareData) => Promise<void>;
    canShare?: (data: ShareData) => boolean;
  }) : undefined;

  if (nav?.share) {
    try {
      const file = new File([fileBlob], filename, { type: fileBlob.type });
      const shareData: ShareData & { files?: File[] } = {
        files: [file],
        title: "Sri Dwar Confirmation",
        text: `Sri Dwar confirmation — Reference ${input.refId}`,
      };
      if (!nav.canShare || nav.canShare(shareData)) {
        await nav.share(shareData);
        showConfirmationToast("🙏 Your Sacred Confirmation is ready to save or share.");
        return;
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return; // devotee cancelled the share sheet — not a failure
      // Any other error — fall through to the next method.
    }
  }

  // 2) Classic browser download — the original, working method on desktop
  //    and most mobile browser tabs.
  try {
    const url = URL.createObjectURL(fileBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    showConfirmationToast("🙏 Your Sacred Confirmation is downloading.");
    return;
  } catch {
    // fall through to the last resort
  }

  // 3) Last resort — copy to clipboard so the devotee always gets
  //    something, with a visible confirmation instead of silence.
  try {
    await navigator.clipboard.writeText(text);
    showConfirmationToast("🙏 Copied your Sacred Confirmation to the clipboard.");
  } catch {
    showConfirmationToast(`Please note Reference ID ${input.refId}. Email puja@sridwar.com if you need this resent.`);
  }
}
