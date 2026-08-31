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

// @ts-ignore — same pattern as SriDwarLogo.tsx; Vite resolves this to a URL string.
import sriDwarLogoPng from "../assets/images/sridwar-logo.png";
// ✅ ADDED — same real, already-live website QR artwork used everywhere else
// on the site (src/assets/images/SridwarQR.jpg), for the confirmation PDF's
// footer contact block. Bundled by Vite exactly like the logo import above,
// so — unlike a server-side fs.readFileSync — there is no separate deploy
// path to get wrong; if this import resolves, the asset exists.
// @ts-ignore — same pattern as the logo import above.
import sriDwarQrPng from "../assets/images/SridwarQR.jpg";
import { isNativeAndroidApp } from "./shareUrl";

export type DevotionalServiceCategory =
  | "darshan_certificate"
  | "puja_seva"
  | "counselling_guidance"
  | "holistic_wellness"
  | "seva_offering"
  | "temple_contribution"
  | "bazaar_order"
  | "subscription"
  | "support_contribution"
  // ✅ ADDED 2026-08-27: dedicated category for a successful Stone-Name
  // Engraving contribution (the voluntary add-on described in
  // StoneEngravingNote.tsx), so its confirmation reads as the humble
  // devotional offering it is — never generic "seva" copy, and never
  // implying it was a fixed-price purchase.
  | "stone_name_engraving";

interface DevotionalMessageInput {
  category: DevotionalServiceCategory;
  /** The specific thing they paid for, e.g. "Rudrabhishek Seva", "Jagannath Temple Darshan Certificate", "Annadanam Seva at Puri" */
  serviceName: string;
  devoteeName: string;
  refId: string;
  // ✅ ADDED (2026-08-31 — professional-PDF pass): optional payment/
  // transaction amount, in rupees. Shown as a real "Amount Paid" line in
  // the confirmation PDF's main section when provided, so the document
  // actually functions as a payment record for the categories where a
  // payment was made — left undefined (and simply omitted from the PDF)
  // for pure inquiries/testimonials where no payment occurred, which is
  // the honest thing to show rather than a fabricated "₹0".
  amount?: number;
  // ✅ ADDED (2026-08-31): free-text "Submitted As" label — e.g. "Devotee",
  // "Dharmic Expert / Pandit" — for registration-style submissions where
  // the category itself doesn't already say who submitted the form. Left
  // undefined (and omitted from the PDF) for every category where it
  // wouldn't add information beyond what serviceName already states.
  submittedAs?: string;
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
  stone_name_engraving: (s) =>
    `Your humble contribution toward ${s} has been received with folded hands by our team.`,
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
  stone_name_engraving:
    "This is a voluntary act of devotion, not a purchase — your name will be lovingly inscribed on a stone slab and placed within a temple we serve, and we'll share real photographs (and, where possible, a short video) once it is placed.",
};

// ─── Service-specific PDF disclaimers ───────────────────────────────────────
// One line per category, placed at the bottom of the confirmation PDF above
// the footer band. Each is specific to what that PDF actually is (a request/
// payment receipt — never the priest-issued certificate) and to that
// service's real nature. Deliberately no medical/legal/guaranteed-outcome
// language anywhere, per compliance requirements — counselling_guidance and
// holistic_wellness explicitly disclaim being a substitute for professional
// medical/psychiatric/legal care rather than implying any such claim.
const DISCLAIMER_BY_CATEGORY: Record<DevotionalServiceCategory, string> = {
  darshan_certificate:
    "This document lovingly confirms your request only — it is not the Darshan Certificate itself. Your certificate is prepared separately, with care, by our priests, and delivered once the darshan/puja process is complete; timing may naturally vary with temple schedule and priest availability.",
  puja_seva:
    "This document confirms your Sankalpa and payment only — it is not proof that the ritual has been performed. Your Sankalpa Certificate of performance is lovingly issued separately, once the puja/seva is carried out as per temple process, priest availability, and temple schedule.",
  counselling_guidance:
    "This document confirms your request only. Counselling & Guidance sessions offer spiritual and emotional support and are not a substitute for professional medical, psychiatric, or legal advice. The exact session timing and specific outcome cannot be guaranteed.",
  holistic_wellness:
    "This document confirms your enrollment only. These are guided yogic/wellness practices, not medical treatment — we humbly invite you to consult a qualified physician for any health condition, before or during participation.",
  seva_offering:
    "This document confirms your Seva Sankalp and payment only — it is not proof that the seva has been performed. Your Seva Certificate of performance is lovingly issued separately, once the seva is carried out as per temple process, priest availability, and temple schedule.",
  temple_contribution:
    "This document confirms your contribution only. A separate acknowledgement letter is issued by our team with care; processing time may naturally vary with volume and temple schedule.",
  bazaar_order:
    "This document confirms your order only — it is not a dispatch or delivery guarantee. Dispatch timing may vary with item availability, packing, and courier schedules.",
  subscription:
    "This document confirms your membership contribution only. Your welcome letter and any associated benefits are sent separately, with care.",
  support_contribution:
    "This document confirms your offering only. A separate acknowledgement is lovingly sent by our team; no specific outcome is implied or guaranteed.",
  stone_name_engraving:
    "This document confirms your voluntary Stone-Name Engraving contribution only. Placement timing depends on the temple's construction/masonry schedule; a shared slab carries 50+ names, and slabs for contributions above Rs. 1,000 carry only 10 names.",
};

// ─── Sanskrit shloka + related-services note + Stone-Name Engraving line ────
// Mirrors the same additions made to the Google Apps Script email templates
// (see emailtemplates.gs's SHLOKA / _relatedServicesNote_ /
// _stoneEngravingFooterNote_) so the in-app downloadable confirmation
// (text + PDF) carries the same devotional footer as the emailed
// confirmation for the same event. One curated shloka per category, not one
// quote reused everywhere.
const SHLOKA_BY_CATEGORY: Record<
  DevotionalServiceCategory,
  { sa: string; translit: string; translitAscii: string; en: string }
> = {
  darshan_certificate: {
    sa: "यो मां पश्यति सर्वत्र सर्वं च मयि पश्यति",
    translit: "Yo māṁ paśyati sarvatra sarvaṁ ca mayi paśyati",
    translitAscii: "Yo mam pashyati sarvatra sarvam cha mayi pashyati",
    en: '"One who sees Me everywhere, and sees everything in Me." — Bhagavad Gita 6.30',
  },
  puja_seva: {
    sa: "पत्रं पुष्पं फलं तोयं यो मे भक्त्या प्रयच्छति",
    translit: "Patraṁ puṣpaṁ phalaṁ toyaṁ yo me bhaktyā prayācchati",
    translitAscii: "Patram pushpam phalam toyam yo me bhaktya prayachchati",
    en: '"Whoever offers Me a leaf, a flower, a fruit, or water with devotion, I accept it." — Bhagavad Gita 9.26',
  },
  counselling_guidance: {
    sa: "उद्धरेदात्मनात्मानं नात्मानमवसादयेत्",
    translit: "Uddhared ātmanātmānaṁ nātmānam avasādayet",
    translitAscii: "Uddhared atmanatmanam natmanam avasadayet",
    en: '"Lift yourself by your own self; do not let yourself be weighed down." — Bhagavad Gita 6.5',
  },
  holistic_wellness: {
    sa: "उद्धरेदात्मनात्मानं नात्मानमवसादयेत्",
    translit: "Uddhared ātmanātmānaṁ nātmānam avasādayet",
    translitAscii: "Uddhared atmanatmanam natmanam avasadayet",
    en: '"Lift yourself by your own self; do not let yourself be weighed down." — Bhagavad Gita 6.5',
  },
  seva_offering: {
    sa: "तस्मादसक्तः सततं कार्यं कर्म समाचर",
    translit: "Tasmād asaktaḥ satataṁ kāryaṁ karma samācara",
    translitAscii: "Tasmad asaktah satatam karyam karma samachara",
    en: '"Therefore, without attachment, perform your duty at all times." — Bhagavad Gita 3.19',
  },
  temple_contribution: {
    sa: "वसुधैव कुटुम्बकम्",
    translit: "Vasudhaiva Kuṭumbakam",
    translitAscii: "Vasudhaiva Kutumbakam",
    en: '"The whole world is one family." — Maha Upanishad',
  },
  bazaar_order: {
    sa: "शुभस्य शीघ्रम्",
    translit: "Śubhasya śīghram",
    translitAscii: "Shubhasya shighram",
    en: '"An auspicious act should be done swiftly." — traditional Sanskrit subhashita',
  },
  subscription: {
    sa: "शुभस्य शीघ्रम्",
    translit: "Śubhasya śīghram",
    translitAscii: "Shubhasya shighram",
    en: '"An auspicious act should be done swiftly." — traditional Sanskrit subhashita',
  },
  support_contribution: {
    sa: "असतो मा सद्गमय",
    translit: "Asato mā sad gamaya",
    translitAscii: "Asato ma sad gamaya",
    en: '"Lead me from the unreal to the real." — Brihadaranyaka Upanishad 1.3.28',
  },
  stone_name_engraving: {
    sa: "परोपकाराय सतां विभूतयः",
    translit: "Paropakārāya satāṁ vibhūtayaḥ",
    translitAscii: "Paropakaraya satam vibhutayah",
    en: '"The prosperity of the virtuous exists for the welfare of others." — Kalidasa, Raghuvamsha',
  },
};

/**
 * Short, non-promotional note naming three of Sri Dwar's primary offerings.
 * Shared verbatim in spirit with emailtemplates.gs's _relatedServicesNote_.
 */
const RELATED_SERVICES_NOTE =
  "Whenever your heart calls you back, Sri Dwar is also here for the Veer Raksha Kavach Puja (a rite of protection and courage), the Traditional Red-Cloth & Coconut Offering at the temple of your choice, and the Stone-Name Engraving Seva — each offered with the same care as this one.";

/**
 * Subtle, always-voluntary Stone-Name Engraving mention for the confirmation
 * text/PDF, matching the site's own wording (STONE_ENGRAVING_COMPACT_TEXT in
 * StoneEngravingNote.tsx). Not shown when the category IS
 * stone_name_engraving itself — the main blessing text already covers it in
 * full there, and repeating it would read as redundant, not devotional.
 */
function stoneEngravingFooterLine(category: DevotionalServiceCategory): string {
  if (category === "stone_name_engraving") return "";
  return "Separately, and entirely by choice, some devotees also take part in our Stone-Name Engraving Seva: contributions above Rs. 200 include the opportunity for a name to be lovingly inscribed on a stone slab placed within a temple we serve. This is never a condition of anything above — sridwar.com has the full details.";
}

/** Structured pieces, for screens that render the message with their own styling (e.g. Hero.tsx's card layout). */
export function getDevotionalConfirmation({ category, serviceName, devoteeName, refId }: DevotionalMessageInput) {
  const shloka = SHLOKA_BY_CATEGORY[category];
  return {
    greeting: `Dear ${devoteeName},`,
    opening: OPENING_BY_CATEGORY[category](serviceName),
    blessing: BLESSING_BY_CATEGORY[category],
    refLine: `Reference ID: ${refId}`,
    // ✅ ADDED 2026-08-27 — additive fields only; existing callers that
    // destructure just {greeting, opening, blessing, refLine} are unaffected.
    shlokaSanskrit: shloka.sa,
    shlokaTranslit: shloka.translit,
    shlokaTranslitAscii: shloka.translitAscii,
    shlokaEnglish: shloka.en,
    relatedServicesNote: RELATED_SERVICES_NOTE,
    stoneEngravingNote: stoneEngravingFooterLine(category),
  };
}

/** Plain-text version, for the downloadable confirmation file and the clipboard-copy fallback. */
export function getDevotionalConfirmationText(input: DevotionalMessageInput): string {
  const {
    greeting,
    opening,
    blessing,
    refLine,
    shlokaSanskrit,
    shlokaTranslit,
    shlokaEnglish,
    relatedServicesNote,
    stoneEngravingNote,
  } = getDevotionalConfirmation(input);
  const lines = [
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
    shlokaSanskrit,
    shlokaTranslit,
    shlokaEnglish,
    "",
    relatedServicesNote,
  ];
  if (stoneEngravingNote) {
    lines.push("", stoneEngravingNote);
  }
  lines.push("", "— Sri Dwar (Shradhalu Private Limited)");
  return lines.join("\n");
}

/** Matches certificateService.ts's formatRupees so every Sri Dwar document shows amounts the same way. */
function formatRupeesForPdf(n: number): string {
  return `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Category-appropriate label for the amount line — "Amount Paid" only where a real payment (not a voluntary/undetermined contribution) occurred. */
const AMOUNT_LABEL_BY_CATEGORY: Record<DevotionalServiceCategory, string> = {
  darshan_certificate: "Amount Paid",
  puja_seva: "Amount Paid",
  counselling_guidance: "Amount Paid",
  holistic_wellness: "Amount Paid",
  seva_offering: "Amount Paid",
  temple_contribution: "Contribution Amount",
  bazaar_order: "Amount Paid",
  subscription: "Plan Amount",
  support_contribution: "Contribution Amount",
  stone_name_engraving: "Contribution Amount",
};

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

// ─── Preload pdf-lib the moment this module is first evaluated ─────────────
// ✅ ROOT-CAUSE FIX — "Download Confirmation" going completely silent:
// buildConfirmationPdfBytes() used to call `await import("pdf-lib")` for the
// FIRST time only once the devotee actually tapped the button. On a first
// visit that chunk has never been fetched, so that await could take a real,
// visible amount of time (a network round-trip on a phone, sometimes 500ms+).
// That delay sits BEFORE downloadConfirmationMessage() ever reaches
// navigator.share() below — and the Web Share API only works while it's
// still inside the click's "user activation" window. Once that window
// expires mid-await, nav.share() throws (not an AbortError, so it fell
// through silently) and the code moved on to the classic <a download> path —
// which, per the note below, ALSO does nothing inside the Capacitor Android
// WebView. Net effect for exactly the devotee this whole fix was written
// for (first-time visitor, on the Android app): both real download paths
// could fail back-to-back, so this async gap was undermining the very fix
// meant to solve it.
// Fix: kick off the pdf-lib import as a background side effect the instant
// this module loads (i.e. as soon as the success screen's component chunk
// is imported — well before the devotee reaches the "Download Confirmation"
// button, let alone taps it), and reuse that same in-flight/resolved
// promise here. By click time the module is normally already cached, so
// building the PDF is just fast, synchronous-ish CPU work and
// navigator.share() gets called close enough to the tap to keep its user
// activation intact.
let pdfLibPromise: Promise<typeof import("pdf-lib")> | null = null;
function warmPdfLib() {
  if (!pdfLibPromise) pdfLibPromise = import("pdf-lib");
  return pdfLibPromise;
}
if (typeof window !== "undefined") warmPdfLib();

// Same eager-warm reasoning as pdf-lib above, applied to the logo image:
// fetching+decoding it must NOT happen for the first time inside the
// devotee's click handler, or it reintroduces the exact user-activation
// race the pdf-lib preload above was written to avoid. `sriDwarLogoPng` is
// a same-origin bundled asset (see SriDwarLogo.tsx), so this fetch never
// touches the network after the first page load and never hits a CORS
// issue the way fetching Config.gs's Google Drive-hosted logoUrl would.
let logoBytesPromise: Promise<ArrayBuffer> | null = null;
function warmLogoBytes() {
  if (!logoBytesPromise) {
    logoBytesPromise = fetch(sriDwarLogoPng).then((r) => r.arrayBuffer());
  }
  return logoBytesPromise;
}
if (typeof window !== "undefined") warmLogoBytes();

// Same eager-warm reasoning again, applied to the QR artwork.
let qrBytesPromise: Promise<ArrayBuffer> | null = null;
function warmQrBytes() {
  if (!qrBytesPromise) {
    qrBytesPromise = fetch(sriDwarQrPng).then((r) => r.arrayBuffer());
  }
  return qrBytesPromise;
}
if (typeof window !== "undefined") warmQrBytes();

// ─── Confirmation PDF (client-side receipt — NOT the priest-issued certificate) ─
// Reuses the same brand palette as Config.gs / certificateService.ts so the
// receipt looks consistent with every other Sri Dwar document, but this is
// deliberately a small, generic confirmation layout — no temple seals, no
// priest signature, no ritual-specific claims — because none of those are
// true of this document.
async function buildConfirmationPdfBytes(input: DevotionalMessageInput): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await warmPdfLib();

  const darkGreen = rgb(0x0c / 255, 0x2b / 255, 0x26 / 255);
  const saffron = rgb(0xe8 / 255, 0xa3 / 255, 0x3d / 255);
  const textMuted = rgb(0x6b / 255, 0x7a / 255, 0x76 / 255);
  const ink = rgb(0x17 / 255, 0x30 / 255, 0x2e / 255);
  const white = rgb(1, 1, 1);
  const cream = rgb(0xfb / 255, 0xf6 / 255, 0xec / 255); // matches Config.gs BRAND.cream

  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);
  const margin = 56;
  const maxWidth = width - margin * 2;
  const headerTop = 841.89;

  // ✅ ADDED (2026-08-31 — professional-PDF pass): a restrained full-page
  // hairline frame, matching the "generous whitespace band" premium
  // certificates use (same visual language as certificateService.ts's
  // drawFrame) — gives this everyday confirmation receipt the same crisp,
  // deliberately-designed edge a corporate PDF (invoice, boarding pass,
  // bank statement) has, instead of text simply running to the page edge.
  // Drawn LAST (see bottom of this function, just before doc.save()) so
  // the header/footer color bands below don't paint over its top/bottom
  // edges.
  const frameMargin = 18;

  // Header — the real logo asset (see SriDwarLogo.tsx) is a navy/gold mark
  // on a TRANSPARENT background, designed for light surfaces. It would be
  // unreadable stamped onto the dark green band the old text-only header
  // used, so the header is now cream/white with the logo sitting on it,
  // and a thin saffron rule marks the boundary — same accent-line language
  // the page already uses under "Sacred Confirmation" below.
  const headerHeight = 70;
  page.drawRectangle({ x: 0, y: headerTop - headerHeight, width, height: headerHeight, color: cream });
  page.drawRectangle({ x: 0, y: headerTop - headerHeight, width, height: 3, color: saffron });

  // ✅ ADDED (2026-08-31): a small, tasteful Om roundel — a restrained
  // Dharmic visual mark in the header, alongside the logo, rather than
  // relying on the logo alone to carry the document's cultural identity.
  // Drawn as vector paths (not an embedded image) so it never depends on
  // an asset file existing. Deliberately small and placed in the header's
  // top-right corner — an accent, not competing with the logo or title.
  const omX = width - margin - 16;
  const omY = headerTop - headerHeight / 2;
  page.drawEllipse({ x: omX, y: omY, xScale: 17, yScale: 17, borderColor: saffron, borderWidth: 1, color: cream });
  page.drawText("Om", { x: omX - font.widthOfTextAtSize("Om", 6) / 2, y: omY + 8, size: 6, font: italic, color: textMuted });
  page.drawEllipse({ x: omX, y: omY, xScale: 3, yScale: 3, color: saffron });
  page.drawText("SHRI", { x: omX - bold.widthOfTextAtSize("SHRI", 5.5) / 2, y: omY - 6, size: 5.5, font: bold, color: darkGreen });

  // Falls back to the old dark-green text wordmark if the logo fetch/embed
  // ever fails, so a network hiccup can't break the whole PDF — the devotee
  // still gets a valid confirmation either way.
  let logoDrawn = false;
  try {
    const logoBytes = await warmLogoBytes();
    const logoImage = await doc.embedPng(logoBytes);
    const logoDisplayHeight = 36;
    const logoDisplayWidth = (logoImage.width / logoImage.height) * logoDisplayHeight;
    page.drawImage(logoImage, {
      x: margin,
      y: headerTop - headerHeight / 2 - logoDisplayHeight / 2,
      width: logoDisplayWidth,
      height: logoDisplayHeight,
    });
    logoDrawn = true;
  } catch {
    // fall through
  }

  if (!logoDrawn) {
    page.drawText("Sri Dwar", { x: margin, y: headerTop - 30, size: 20, font: bold, color: darkGreen });
    page.drawText("Connect. Contribute. Preserve.", {
      x: margin,
      y: headerTop - 46,
      size: 8,
      font,
      color: textMuted,
    });
  }

  let y = headerTop - headerHeight - 26;
  page.drawText("Sacred Confirmation", { x: margin, y, size: 18, font: bold, color: darkGreen });
  y -= 22;
  page.drawRectangle({ x: margin, y, width: 40, height: 2, color: saffron });
  y -= 26;

  const {
    greeting,
    opening,
    blessing,
    refLine,
    shlokaTranslitAscii,
    shlokaEnglish,
    relatedServicesNote,
    stoneEngravingNote,
  } = getDevotionalConfirmation(input);

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
  if (input.submittedAs) {
    drawParagraph(`Submitted As: ${input.submittedAs}`, 10, 16, bold, textMuted);
  }
  if (typeof input.amount === "number" && input.amount > 0) {
    drawParagraph(`${AMOUNT_LABEL_BY_CATEGORY[input.category]}: ${formatRupeesForPdf(input.amount)}`, 10, 16, bold, textMuted);
  }
  y -= 6;
  drawParagraph(greeting, 12, 18, bold, ink);
  y -= 4;
  drawParagraph(opening, 11, 16);
  y -= 8;
  drawParagraph(blessing, 11, 16, font, textMuted);
  y -= 16;
  drawParagraph("Om Namah Shivaya. May Lord Jagannath bless your home.", 11, 16, bold, darkGreen);

  // Sanskrit shloka — PDF-safe: pdf-lib's StandardFonts use WinAnsi
  // encoding, which CANNOT render Devanagari glyphs or IAST diacritics
  // (verified: throws at render time, same class of bug as the ₹ symbol
  // documented in certificateService.ts's formatRupees). So the PDF prints
  // an ASCII-only transliteration + the English meaning; the full
  // Devanagari + IAST transliteration is still shown in the plain-text
  // confirmation (getDevotionalConfirmationText) and any in-app card that
  // renders shlokaSanskrit/shlokaTranslit directly as normal Unicode text.
  y -= 14;
  page.drawRectangle({ x: margin, y: y + 10, width: 3, height: 30, color: saffron });
  drawParagraph(shlokaTranslitAscii, 10, 14, italic, darkGreen);
  drawParagraph(shlokaEnglish, 9, 13, font, textMuted);

  y -= 8;
  drawParagraph(relatedServicesNote, 9, 13, font, textMuted);

  if (stoneEngravingNote) {
    y -= 4;
    drawParagraph(stoneEngravingNote, 9, 13, italic, textMuted);
  }

  // Service-specific disclaimer — placed just above the footer band, small
  // and italic so it's clearly legible but doesn't compete visually with
  // the devotional message above it.
  y -= 20;
  page.drawRectangle({ x: margin, y: y + 14, width: maxWidth, height: 0.75, color: textMuted });
  y -= 4;
  const disclaimer = DISCLAIMER_BY_CATEGORY[input.category];
  drawParagraph(disclaimer, 8, 11, italic, textMuted);

  // ✅ ADDED — contact/social block + website QR, directly above the footer
  // band, using the exact same real handles as certificateService.ts's
  // invoice PDF (Instagram/Facebook/YouTube/WhatsApp published in
  // Navbar.tsx) so every downloadable Sri Dwar document — this in-app
  // confirmation and the emailed invoice alike — ends the same way.
  // Deliberately no phone number, matching every other Sri Dwar contact
  // surface. QR is optional/defensive: a failed embed just skips the image,
  // never the rest of the PDF.
  y -= 8;
  const qrSize = 42;
  let contactTextWidth = maxWidth;
  try {
    const qrBytes = await warmQrBytes();
    const qrImage = await doc.embedJpg(qrBytes);
    contactTextWidth = maxWidth - qrSize - 10;
    const qrX = width - margin - qrSize;
    const qrY = y - qrSize + 8;
    page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
    const scanLabel = "Scan to visit";
    const scanLabelWidth = font.widthOfTextAtSize(scanLabel, 6);
    page.drawText(scanLabel, { x: qrX + qrSize / 2 - scanLabelWidth / 2, y: qrY - 8, size: 6, font, color: textMuted });
  } catch {
    // Corrupt/unexpected asset — never let a bad QR embed break this PDF.
  }
  const contactLine = "WhatsApp: wa.me/message/325QR2O5II3IH1 · Instagram / Facebook / YouTube: @sridwar";
  for (const line of wrapText(contactLine, 8, font)) {
    if (font.widthOfTextAtSize(line, 8) > contactTextWidth) break; // defensive — never overlaps the QR
    page.drawText(line, { x: margin, y, size: 8, font, color: textMuted });
    y -= 11;
  }

  // Footer
  page.drawRectangle({ x: 0, y: 0, width, height: 50, color: darkGreen });
  page.drawText("Shradhalu Private Limited · sridwar.com · puja@sridwar.com", {
    x: margin,
    y: 22,
    size: 8,
    font,
    color: white,
  });

  // Full-page hairline frame — drawn last so its top/bottom edges sit on
  // top of the header/footer color bands rather than being painted over
  // by them. See the fix note above the `frameMargin` declaration.
  page.drawRectangle({
    x: frameMargin,
    y: frameMargin,
    width: width - frameMargin * 2,
    height: height - frameMargin * 2,
    borderColor: saffron,
    borderWidth: 0.75,
  });

  return doc.save();
}

/**
 * Writes the PDF/text file directly into the app's Documents directory using
 * the real native Capacitor Filesystem plugin, then offers (but doesn't
 * require) the native share sheet on top. Returns false — never throws — on
 * any failure, so the caller always has a safe fallback path.
 *
 * Directory.Documents is used deliberately over a shared "Downloads" folder:
 * on Android 10+ (API 29+, scoped storage) it does NOT require the
 * WRITE_EXTERNAL_STORAGE permission, so this needed no AndroidManifest
 * permission changes and no new Play Store data-safety disclosure — it's the
 * app's own sandboxed-but-persistent Documents area, which the devotee can
 * still reach via a file manager or the share-sheet step below.
 */
async function tryNativeAndroidSaveAndShare(fileBlob: Blob, filename: string): Promise<boolean> {
  try {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);

    const base64Data = await blobToBase64(fileBlob);
    const writeResult = await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory: Directory.Documents,
      recursive: true,
    });

    try {
      await Share.share({
        title: "Sri Dwar Confirmation",
        text: `Sri Dwar confirmation — Reference ${filename}`,
        url: writeResult.uri,
      });
    } catch {
      // Devotee dismissed the share sheet, or sharing isn't available on
      // this device — the file is already safely written either way, so
      // this is NOT treated as a failure.
    }

    return true;
  } catch {
    return false; // caller falls through to the existing web cascade
  }
}

/** Blob -> raw base64 (no "data:...;base64," prefix), as Filesystem.writeFile expects. */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
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

  // 0) Native Android app — write the PDF straight to the device's own
  //    Documents folder via the real Capacitor Filesystem plugin, then offer
  //    the native share sheet too. This is the actual production fix for
  //    "the confirmation PDF cannot be genuinely downloaded from the Android
  //    app/tablet — instead users are given a clipboard-copy option": a
  //    direct native file write is far more reliable inside a Capacitor
  //    WebView than the browser-level Web Share API (step 1 below), which
  //    depends on the specific Android System WebView build's own Web Share
  //    Level 2 (files) support and can silently fail/fall through on some
  //    devices — exactly the pattern that was landing devotees on the
  //    clipboard fallback.
  //    SAFETY: wrapped so this can NEVER make things worse than before. If
  //    the currently-installed Android app was built before the
  //    @capacitor/filesystem / @capacitor/share plugins were added (i.e. no
  //    new AAB has been uploaded yet), the native call below throws and this
  //    silently falls through to step 1, so nothing regresses until you
  //    upload the new AAB — see delivery notes.
  if (isNativeAndroidApp()) {
    const saved = await tryNativeAndroidSaveAndShare(fileBlob, filename);
    if (saved) {
      showConfirmationToast("🙏 Your Sacred Confirmation has been saved to your device.");
      return;
    }
    // Falls through to the same cascade every other platform uses below.
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
