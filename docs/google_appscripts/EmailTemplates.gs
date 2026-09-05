/**
 * Sri Dwar — Email Automation: TEMPLATES
 * ─────────────────────────────────────────────────────────────────────────
 * Plain HTML strings (table-based, inline-styled) so they render correctly
 * in Gmail/Outlook/mobile mail apps — no external CSS, no JS. Styled to
 * match the Booking Confirmation / Darshan Certificate reference designs:
 * dark green header, saffron/gold accents, cream card body.
 *
 * EMOJI ENCODING: every emoji in the HTML bodies below is written as an
 * HTML numeric character reference (see the EMOJI map right below this
 * comment), never as a raw emoji character in the source. Raw multi-byte
 * emoji in this file were previously showing up as "������" in delivered
 * mail (visible whenever this .gs file passed through a tool/editor that
 * mis-handled its UTF-8 encoding before GmailApp ever sent it). Numeric
 * character references are plain ASCII in the source, so they survive
 * that round-trip intact and the mail client renders the correct glyph on
 * the other end. If a future edit needs a new emoji, look up its numeric
 * reference (e.g. via unicode-table.com) rather than pasting the emoji
 * character directly into this file.
 *
 * DEVOTIONAL CONFIRMATION COPY: every template below (Welcome, Booking
 * Confirmation, Payment Reminder, Certificate Ready, and every flavor of
 * Acknowledgement) ends with the same shared blessing line via
 * _blessingClosing_() — "May Prabhu Jagannath and Mahadev bless you and
 * your family forever." — so every Sri Dwar confirmation feels like it
 * comes from one warm, consistent, devotional voice, no matter which
 * website form triggered it.
 */
const EMOJI = {
  prayer: "&#128591;",   // folded-hands / "pray" emoji
  lightning: "&#9889;",  // lightning-bolt emoji
  om: "&#2384;",          // Om symbol (Devanagari)
};

/**
 * ─── Shared social links footer ─────────────────────────────────────────
 * ✅ FIX (missing footer social links, all email templates): every email
 * builder in this file ends with the "With folded hands, Team Sri Dwar"
 * blessing line, but only two places (_wrapEmailHtml_'s footer, and
 * buildWelcomeEmail_/buildAcknowledgementEmail_'s footer) had ANY links at
 * all — and even _wrapEmailHtml_'s own inline SOCIAL_LINKS only had
 * Facebook/YouTube/LinkedIn (missing Twitter/X, WhatsApp, Instagram), and
 * its Facebook URL ("SridwarSetu") didn't even match the live website's
 * actual Facebook page. buildBookingConfirmationEmail_,
 * buildPaymentReminderEmail_, and buildCertificateReadyEmail_ had NO
 * links in their footer whatsoever — exactly the templates devotees see
 * most often (booking confirmation / payment reminder / certificate
 * ready).
 *
 * URLs below are copied from the live website's own footer/Navbar.tsx
 * (the current source of truth), not re-guessed:
 *   Facebook  — https://www.facebook.com/sridwar
 *   Twitter/X — https://x.com/Sri_Dwar
 *   LinkedIn  — https://www.linkedin.com/company/sri-dwar
 *   WhatsApp  — https://wa.me/message/325QR2O5II3IH1
 *   Instagram — https://www.instagram.com/sri_dwar/
 *   YouTube   — https://www.youtube.com/@SriDwar
 *
 * Deliverability: plain text links (no tracking redirects, no URL
 * shorteners, no hidden/mismatched anchor text, all pointing at the
 * brand's own verified social profiles and sridwar.com) — the same low-risk
 * pattern already used for the website/support-email links every template
 * already had, just extended to the other platforms. This is the same
 * "plain footer text links to your own verified profiles" pattern used by
 * major transactional senders (e.g. Amazon order emails) specifically
 * because it does NOT trip spam heuristics — those look for large numbers
 * of unrelated third-party links, mismatched display/href text, or link
 * shorteners, none of which apply here.
 */
const SOCIAL_LINKS = {
  facebook: "https://www.facebook.com/sridwar",
  twitter: "https://x.com/Sri_Dwar",
  linkedin: "https://www.linkedin.com/company/sri-dwar",
  whatsapp: "https://wa.me/message/325QR2O5II3IH1",
  instagram: "https://www.instagram.com/sri_dwar/",
  youtube: "https://www.youtube.com/@SriDwar",
};

/**
 * Renders the full social-links row — Website already appears on its own
 * line right above this in every template (unchanged), so this adds the
 * six platform links below it. Called at the very end of every email
 * template's footer, right after the "With folded hands" blessing line.
 */
function _socialLinksFooter_() {
  const b = CONFIG.BRAND;
  return `
    <div style="font-size:11px;margin-top:8px;">
      <a href="${SOCIAL_LINKS.facebook}" style="color:${b.gold};text-decoration:underline;">Facebook</a>
      &nbsp;&middot;&nbsp; <a href="${SOCIAL_LINKS.twitter}" style="color:${b.gold};text-decoration:underline;">Twitter/X</a>
      &nbsp;&middot;&nbsp; <a href="${SOCIAL_LINKS.instagram}" style="color:${b.gold};text-decoration:underline;">Instagram</a>
      &nbsp;&middot;&nbsp; <a href="${SOCIAL_LINKS.youtube}" style="color:${b.gold};text-decoration:underline;">YouTube</a>
      &nbsp;&middot;&nbsp; <a href="${SOCIAL_LINKS.linkedin}" style="color:${b.gold};text-decoration:underline;">LinkedIn</a>
      &nbsp;&middot;&nbsp; <a href="${SOCIAL_LINKS.whatsapp}" style="color:${b.gold};text-decoration:underline;">WhatsApp</a>
    </div>`;
}

/**
 * ✅ ADDED (2026-09-05 — brand-consistency audit, explicit instruction:
 * "every email... consistently includes our company branding, including
 * the logo, header, footer, company details, disclaimer"):
 *
 * Before this, the "Shradhalu Private Limited · Jajpur Road, Odisha,
 * India" legal-entity line only existed in ONE template
 * (buildAcknowledgementEmail_) — Welcome, Booking Confirmation, Payment
 * Reminder, and Certificate Ready all sent without it, and Booking
 * Confirmation / Payment Reminder didn't even have a website link in
 * their footer at all. Rather than hand-edit five slightly-different
 * footer blocks (real risk of making them drift further apart), this is
 * one shared helper now dropped into every template's footer, right
 * before _socialLinksFooter_() — so the same website link, support
 * email, and company legal line appear in identical wording/styling on
 * every outbound Sri Dwar email from here on. Only this file changed;
 * no template's own copy, disclaimer, or layout was touched otherwise.
 */
function _brandFooterLine_() {
  const b = CONFIG.BRAND;
  return `
    <div style="color:#c9d6d2;font-size:11px;margin-bottom:6px;">
      <a href="${b.website}" style="color:${b.gold};text-decoration:underline;">${b.website.replace('https://', '')}</a>
      &nbsp;&middot;&nbsp; <a href="mailto:${b.supportEmail}" style="color:${b.gold};text-decoration:underline;">${b.supportEmail}</a>
    </div>
    <div style="color:#9fb2ad;font-size:10px;margin-bottom:8px;">
      Shradhalu Private Limited &middot; Jajpur Road, Odisha, India
    </div>`;
}

/**
 * ─── Plain, image-free panel system ─────────────────────────────────────
 * ✅ ROOT-CAUSE FIX (2026-08-29): every template in this file used to draw
 * its header wordmark, greeting, detail boxes, and shloka/footer notes as
 * HTML text CSS-absolutely-positioned on top of a background <img> (the
 * PALM_LEAF_ASSETS "plank" crops). That technique is not reliably
 * supported by Gmail or Outlook — it's what produced the garbled/
 * overlapping "SRI DWAR" header text and blank/solid-colour sections
 * devotees were seeing across the Welcome, Puja/Seva/Darshan booking
 * confirmation, payment reminder, and certificate-ready emails. (The
 * Acknowledgement/Inquiry template was fixed first, using a different
 * approach — a single server-composited JPEG — because that one template
 * has a real designed reference image to match; these other templates
 * never had one, so the fix here is simpler: stop overlaying text on
 * images at all.)
 *
 * Every "band" below is now a plain, bordered, cream-coloured HTML panel —
 * no image anywhere in the structure, so nothing can ever misposition,
 * double-render, or fail to load again. The warm, manuscript-inspired
 * identity (colours, Georgia serif, folded-hands/om accents already in
 * EMOJI) is preserved; only the risky image-plus-overlay technique is gone.
 *
 * _motifBand_ and _greetingBand_ keep their EXACT original function
 * signatures on purpose — every existing call site across this file
 * (Welcome, Booking Confirmation, Payment Reminder, Certificate Ready, and
 * _devotionalFooter_'s shloka/related-services/stone-engraving notes) still
 * passes an image URL as the first argument. That argument is now simply
 * ignored, so none of those call sites needed to change.
 */
const PANEL_CREAM = "#fbf3e2";
const PANEL_BORDER = "rgba(232,163,61,0.45)";

// Kept only so the many existing `_motifBand_(PALM_LEAF_ASSETS.xxx, ...)`
// call sites throughout this file (shloka/related-services/stone-engraving
// notes, every builder's detail box) don't each need editing — the actual
// URLs are never read anymore; _motifBand_ ignores its first argument
// entirely. Do not add new image-based bands here; see the fix note above.
const PALM_LEAF_ASSETS = {
  header: null, body: null, footer: null, deity: null, flower: null, diya: null, om: null, lotus: null,
};

function _motifBand_(_unusedImgUrl, innerHtml) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
    <tr><td style="background:${PANEL_CREAM};border:1px solid ${PANEL_BORDER};border-radius:10px;padding:18px 20px;">
      ${innerHtml}
    </td></tr>
  </table>`;
}

/** Greeting line — same plain cream-panel treatment as every other band. */
function _greetingBand_(greetingHtml) {
  return _motifBand_(null, greetingHtml);
}

function _wrapEmailHtml_(innerHtml, preheader) {
  const b = CONFIG.BRAND;
  return `
  <div style="background:${b.darkGreen};padding:28px 14px;font-family:Georgia,'Times New Roman',serif;">
    <span style="display:none;font-size:1px;color:${b.darkGreen};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader || ""}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">

          <!-- Header: plain text wordmark, no image — can never misrender. -->
          <tr><td style="padding:8px 12px 20px;text-align:center;">
            <div style="font-size:28px;font-weight:bold;color:${b.gold};letter-spacing:2px;">${b.name.toUpperCase()}</div>
            <div style="font-size:11px;color:${b.gold};letter-spacing:2px;text-transform:uppercase;margin-top:4px;opacity:0.85;">${b.tagline}</div>
          </td></tr>

          <!-- Content card: solid cream panel. Every builder's innerHtml (unchanged) renders inside it. -->
          <tr><td style="background:${PANEL_CREAM};border-radius:14px;padding:30px 28px;">
            ${innerHtml}
          </td></tr>

          <!-- Footer: plain text on the same dark-green theme background — matches the site, never black, no white boxes. -->
          <tr><td style="padding:22px 16px 8px;text-align:center;">
            <div style="color:${b.gold};font-size:13px;margin-bottom:8px;">${EMOJI.prayer} With folded hands and heartfelt blessings, Team ${b.name}</div>
            ${_brandFooterLine_()}
            ${_socialLinksFooter_()}
          </td></tr>

        </table>
      </td></tr>
    </table>
  </div>`;
}

function _detailRow_(label, value) {
  if (!value) return "";
  return `
  <tr>
    <td style="padding:9px 0;border-bottom:1px solid rgba(43,24,6,0.25);color:#5a3d1a;font-size:13px;width:42%;">${label}</td>
    <td style="padding:9px 0;border-bottom:1px solid rgba(43,24,6,0.25);color:#2b1806;font-size:14px;font-weight:700;">${value}</td>
  </tr>`;
}

function _detailBox_(rows) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0;">
    ${rows}
  </table>`;
}

function _ctaButton_(label, url) {
  if (!url) return "";
  // ✅ FIX (2026-09-02): this table had no width/centering at all — it
  // rendered as a small, auto-sized button sitting wherever the browser's
  // default block-level table placement put it (effectively pinned to one
  // side), never actually centered or matching the width of the content
  // above it. Now spans the full width of its container and centers its
  // own label text, matching the way every other CTA-style element in
  // these templates (the transaction image, the acknowledgement panel)
  // already fills the same column width. align="center" is kept alongside
  // the CSS margin for older email clients (Outlook desktop) that ignore
  // CSS centering on block elements but still honor the legacy HTML
  // attribute.
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" align="center" style="margin:22px 0;">
    <tr><td style="background:${CONFIG.BRAND.saffron};border-radius:8px;text-align:center;">
      <a href="${url}" style="display:block;width:100%;box-sizing:border-box;padding:14px 26px;color:#1a1a1a;font-weight:bold;font-size:14px;text-decoration:none;font-family:Georgia,serif;text-align:center;">${label}</a>
    </td></tr>
  </table>`;
}

/**
 * ─── Shared devotional footer: Sanskrit shloka + "3 other services" note +
 * voluntary Stone-Name Engraving mention ─────────────────────────────────
 * Added 2026-08-27 to every email template below, right above
 * _blessingClosing_(). One curated, contextually-relevant shloka per
 * email "flavor" (never one generic quote reused everywhere), a short,
 * non-promotional note pointing to three primary offerings, and a subtle,
 * humble, always-voluntary mention of the Stone-Name Engraving Seva whose
 * wording is kept consistent with the site's own single source of truth for
 * this initiative (see src/components/StoneEngravingNote.tsx —
 * STONE_ENGRAVING_COMPACT_TEXT). This block never claims a purchase itself
 * earns an engraving; it only ever describes it as a separate, optional,
 * voluntary contribution.
 */
const SHLOKA = {
  welcome: {
    sa: "&#2309;&#2340;&#2367;&#2341;&#2367;&#2342;&#2375;&#2357;&#2379; &#2349;&#2357;",
    translit: "Atithi Devo Bhava",
    en: "\u201CTreat the guest as God.\u201D — Taittiriya Upanishad 1.11.2. You are welcomed into the Sri Dwar family exactly so.",
  },
  puja: {
    sa: "&#2346;&#2340;&#2381;&#2352;&#2306; &#2346;&#2369;&#2359;&#2381;&#2346;&#2306; &#2347;&#2354;&#2306; &#2340;&#2379;&#2351;&#2306; &#2351;&#2379; &#2350;&#2375; &#2349;&#2325;&#2381;&#2340;&#2381;&#2351;&#2366; &#2346;&#2381;&#2352;&#2351;&#2330;&#2381;&#2331;&#2340;&#2367;",
    translit: "Patra\u1E43 pu\u1E63pa\u1E43 phala\u1E43 toya\u1E43 yo me bhakty\u0101 pray\u0101cchati",
    en: "\u201CWhoever offers Me a leaf, a flower, a fruit, or water with devotion, I accept it.\u201D — Bhagavad Gita 9.26. Devotion, not grandeur, is what a Sankalp truly carries.",
  },
  seva: {
    sa: "&#2340;&#2360;&#2381;&#2350;&#2366;&#2342;&#2360;&#2325;&#2381;&#2340;&#2307; &#2360;&#2340;&#2340;&#2306; &#2325;&#2366;&#2352;&#2381;&#2351;&#2306; &#2325;&#2352;&#2381;&#2350; &#2360;&#2350;&#2366;&#2330;&#2352;",
    translit: "Tasm\u0101d asakta\u1E25 satata\u1E43 k\u0101rya\u1E43 karma sam\u0101cara",
    en: "\u201CTherefore, without attachment, perform your duty at all times.\u201D — Bhagavad Gita 3.19. May this seva be offered in that same selfless spirit.",
  },
  darshan: {
    sa: "&#2351;&#2379; &#2350;&#2366;&#2306; &#2346;&#2358;&#2381;&#2351;&#2340;&#2367; &#2360;&#2352;&#2381;&#2357;&#2340;&#2381;&#2352; &#2360;&#2352;&#2381;&#2357;&#2306; &#2330; &#2350;&#2351;&#2367; &#2346;&#2358;&#2381;&#2351;&#2340;&#2367;",
    translit: "Yo m\u0101\u1E43 pa\u015Byati sarvatra sarva\u1E43 ca mayi pa\u015Byati",
    en: "\u201COne who sees Me everywhere, and sees everything in Me.\u201D — Bhagavad Gita 6.30. May this darshan bring exactly that vision.",
  },
  certificate_ready: {
    sa: "&#2360;&#2352;&#2381;&#2357;&#2375; &#2349;&#2357;&#2344;&#2381;&#2340;&#2369; &#2360;&#2369;&#2326;&#2367;&#2344;&#2307;",
    translit: "Sarve Bhavantu Sukhina\u1E25",
    en: "\u201CMay all beings be happy.\u201D — Brihadaranyaka Upanishad. May the completion of this rite carry that blessing outward to your whole family.",
  },
  wellbeing: {
    sa: "&#2313;&#2342;&#2381;&#2343;&#2352;&#2375;&#2342;&#2366;&#2340;&#2381;&#2350;&#2344;&#2366;&#2340;&#2381;&#2350;&#2366;&#2344;&#2306; &#2344;&#2366;&#2340;&#2381;&#2350;&#2366;&#2344;&#2350;&#2357;&#2360;&#2366;&#2342;&#2351;&#2375;&#2340;&#2381;",
    translit: "Uddhared \u0101tman\u0101tm\u0101na\u1E43 n\u0101tm\u0101nam avas\u0101dayet",
    en: "\u201CLift yourself by your own self; do not let yourself be weighed down.\u201D — Bhagavad Gita 6.5. A gentle companion for your guidance/wellness journey.",
  },
  inquiry: {
    sa: "&#2309;&#2360;&#2340;&#2379; &#2350;&#2366; &#2360;&#2342;&#2381;&#2327;&#2350;&#2351;",
    translit: "Asato m\u0101 sad gamaya",
    en: "\u201CLead me from the unreal to the real.\u201D — Brihadaranyaka Upanishad 1.3.28. We're grateful you reached out, and glad to help you find clarity.",
  },
  testimony: {
    sa: "&#2350;&#2344;&#2381;&#2350;&#2344;&#2366; &#2349;&#2357; &#2350;&#2342;&#2381;&#2349;&#2325;&#2381;&#2340;&#2379;",
    translit: "Man-man\u0101 bhava mad-bhakto",
    en: "\u201CFix your mind on Me, be devoted to Me.\u201D — Bhagavad Gita 9.34. Thank you for sharing your bhakti with the Sri Dwar family.",
  },
  temple_registration: {
    sa: "&#2357;&#2360;&#2369;&#2343;&#2376;&#2357; &#2325;&#2369;&#2335;&#2369;&#2350;&#2381;&#2348;&#2325;&#2350;&#2381;",
    translit: "Vasudhaiva Ku\u1E6Dumbakam",
    en: "\u201CThe whole world is one family.\u201D — Maha Upanishad. Thank you for helping widen that family's circle of temples.",
  },
  pujari_registration: {
    sa: "&#2360;&#2381;&#2357;&#2325;&#2352;&#2381;&#2350;&#2339;&#2366; &#2340;&#2350;&#2349;&#2381;&#2351;&#2352;&#2381;&#2330;&#2381;&#2351; &#2360;&#2367;&#2342;&#2381;&#2343;&#2367;&#2306; &#2357;&#2367;&#2344;&#2381;&#2342;&#2340;&#2367; &#2350;&#2366;&#2344;&#2357;&#2307;",
    translit: "Svakarma\u1E47\u0101 tam abhyarcya siddhi\u1E43 vindati m\u0101nava\u1E25",
    en: "\u201CBy worshipping Him through one's own natural duty, one attains perfection.\u201D — Bhagavad Gita 18.46. Gratitude for offering your seva to this path.",
  },
  refund: {
    sa: "&#2360;&#2369;&#2326;&#2342;&#2369;&#2307;&#2326;&#2375; &#2360;&#2350;&#2375; &#2325;&#2371;&#2340;&#2381;&#2357;&#2366; &#2354;&#2366;&#2349;&#2366;&#2354;&#2366;&#2349;&#2380; &#2332;&#2351;&#2366;&#2332;&#2351;&#2380;",
    translit: "Sukha-du\u1E25khe same k\u1E5Btv\u0101 l\u0101bh\u0101l\u0101bhau jay\u0101jayau",
    en: "\u201CTreating joy and sorrow, gain and loss, alike.\u201D — Bhagavad Gita 2.38. We hope to resolve this for you with the same evenness of heart.",
  },
  subscription: {
    sa: "&#2358;&#2369;&#2349;&#2360;&#2381;&#2351; &#2358;&#2368;&#2328;&#2381;&#2352;&#2350;&#2381;",
    translit: "\u015Aubhasya \u015B\u012Bghram",
    en: "\u201CAn auspicious act should be done swiftly.\u201D — traditional Sanskrit subhashita. We'll be in touch soon.",
  },
  temple_issue: {
    sa: "&#2351;&#2342;&#2381;&#2351;&#2342;&#2366;&#2330;&#2352;&#2340;&#2367; &#2358;&#2381;&#2352;&#2375;&#2359;&#2381;&#2336;&#2360;&#2381;&#2340;&#2340;&#2381;&#2340;&#2342;&#2375;&#2357;&#2375;&#2340;&#2352;&#2379; &#2332;&#2344;&#2307;",
    translit: "Yad yad \u0101carati \u015Bre\u1E63\u1E6Dhas tat tad evetaro jana\u1E25",
    en: "\u201CWhatever a noble person does, others follow.\u201D — Bhagavad Gita 3.21. Thank you for standing up for our shared temples and traditions.",
  },
  reminder: {
    sa: "&#2313;&#2342;&#2381;&#2351;&#2350;&#2375;&#2344; &#2361;&#2367; &#2360;&#2367;&#2343;&#2381;&#2351;&#2344;&#2381;&#2340;&#2367; &#2325;&#2366;&#2352;&#2381;&#2351;&#2366;&#2339;&#2367; &#2344; &#2350;&#2344;&#2379;&#2352;&#2341;&#2376;&#2307;",
    translit: "Udyamena hi sidhyanti k\u0101ry\u0101\u1E47i na manorathai\u1E25",
    en: "\u201CTasks are accomplished through effort, not through mere wishes.\u201D — traditional subhashita (Panchatantra). A gentle nudge, offered with warmth, not worry.",
  },
};

function _shlokaBlock_(key) {
  const s = SHLOKA[key] || SHLOKA.inquiry;
  return `
    <div style="text-align:center;">
      <div style="font-size:16px;color:#2b1806;font-weight:bold;">${s.sa}</div>
      <div style="font-size:11px;color:#5a3d1a;font-style:italic;margin-top:2px;">${s.translit}</div>
      <div style="font-size:12px;color:#3a2812;margin-top:6px;line-height:1.6;">${s.en}</div>
    </div>`;
}

/**
 * Brief, non-promotional note naming three of Sri Dwar's primary offerings —
 * shown once near the bottom of every email so a devotee who came for one
 * reason quietly learns what else is here, without being sold to.
 */
function _relatedServicesNote_() {
  return `
    <div style="font-size:12px;color:#3a2812;line-height:1.7;text-align:center;">
      Whenever your heart calls you back, Sri Dwar is also here for the <b>Veer Raksha Kavach Puja</b> (a rite of
      protection and courage), the <b>Traditional Red-Cloth &amp; Coconut Offering</b> at the temple of your choice,
      and the <b>Stone-Name Engraving Seva</b> described below — each offered with the same care as this one.
    </div>`;
}

/**
 * Subtle, humble, always-voluntary mention of the Stone-Name Engraving
 * initiative. `tone` varies the opening line so this doesn't read as one
 * copy-pasted paragraph across every email type; the core devotional
 * wording (₹200/₹1,000 thresholds, shared vs. exclusive slab, ~₹5,000 Seva
 * cost) matches STONE_ENGRAVING_COMPACT_TEXT on the website so nothing
 * drifts between the site and this email. NEVER implies the current
 * purchase/enquiry itself earns an engraving.
 */
const STONE_ENGRAVING_LEAD_BY_TONE = {
  ritual: "As your Sankalp is carried forward, some devotees also choose to let their name find a lasting home in stone.",
  contribution: "Alongside this offering, some devotees also choose our ongoing Stone-Name Engraving Seva.",
  welcome: "As you begin your journey with Sri Dwar, you may one day like to know of our Stone-Name Engraving Seva.",
  certificate: "Now that this rite is complete, some devotees choose to also let their name find a lasting home in stone.",
  acknowledgement: "Separately, and entirely by choice, some devotees also take part in our Stone-Name Engraving Seva.",
  reminder: "No pressure at all — but once your Sankalp is confirmed, you're welcome to also explore our Stone-Name Engraving Seva.",
};
function _stoneEngravingFooterNote_(tone) {
  const lead = STONE_ENGRAVING_LEAD_BY_TONE[tone] || STONE_ENGRAVING_LEAD_BY_TONE.acknowledgement;
  return `
    <div style="font-size:11px;color:#4a3418;line-height:1.7;text-align:center;">
      ${EMOJI.om} ${lead} Contributions above &#8377;200 include the opportunity for a devotee's name to be lovingly
      inscribed on a stone slab placed within a temple we serve; contributions above &#8377;1,000 are placed on a
      more exclusive slab. This remains entirely voluntary, and never a condition of anything above. Read more at
      <a href="${CONFIG.BRAND.website}" style="color:#7a3d0a;font-weight:bold;">${CONFIG.BRAND.website.replace('https://','')}</a>.
    </div>`;
}

/**
 * Convenience wrapper: shloka + related-services note + Stone-Name
 * Engraving note, each in its own motif band (diya / om / lotus, straight
 * off the manuscript) — call once per template, right before
 * _blessingClosing_().
 */
function _devotionalFooter_(shlokaKey, engravingTone) {
  return `${_motifBand_(PALM_LEAF_ASSETS.diya, _shlokaBlock_(shlokaKey))}${_motifBand_(PALM_LEAF_ASSETS.om, _relatedServicesNote_())}${_motifBand_(PALM_LEAF_ASSETS.lotus, _stoneEngravingFooterNote_(engravingTone))}`;
}

/**
 * Shared devotional closing block, appended near the bottom of every email
 * template in this file (Welcome, Booking Confirmation, Payment Reminder,
 * Certificate Ready, and every Acknowledgement variant below) so the same
 * warm, Hindu-tradition-rooted blessing appears consistently no matter
 * which of the website's forms triggered the email. Kept as one function so
 * the wording only ever needs to change in a single place.
 */
function _blessingClosing_() {
  return `
    <div style="margin-top:22px;padding-top:16px;border-top:1px solid rgba(43,24,6,0.25);text-align:center;">
      <div style="font-size:13px;color:#2b1806;font-weight:bold;font-style:italic;line-height:1.6;">
        ${EMOJI.prayer} May Prabhu Jagannath and Mahadev bless you and your family forever.
      </div>
    </div>`;
}

/**
 * "Complete Your Sankalp" button — links directly to Sri Dwar's Razorpay
 * hosted payment page (razorpay.me/@sridwar), where the devotee can pay by
 * card, UPI, or netbanking without needing to log in first.
 * ✅ FIX (2026-09-02): previously linked to the plain website homepage
 * (see the old comment this replaced) under an older design where the
 * devotee was expected to log in and find their pending payment
 * themselves — genuinely confusing, and reported as a real devotee-facing
 * bug ("still shows Pay Now... doesn't take me to pay"). Now goes straight
 * to a real payment destination.
 * IMPORTANT: razorpay.me/@sridwar is a fixed link with no amount or
 * reference pre-filled — Razorpay's hosted page will ask the devotee to
 * enter the amount themselves. This is the correct behavior only until a
 * dedicated per-booking payment link (created via server.ts using the
 * refId, so the exact amount is pre-filled and non-editable) replaces it —
 * see the note on /api/razorpay/create-order in server.ts for the natural
 * next step here.
 */
/**
 * Creates a real, per-booking Razorpay Payment Link via server.ts (which
 * calls Razorpay's own API using the account's key/secret — never done
 * directly from Apps Script) with the exact amount and reference locked
 * in, so the devotee never has to type an amount themselves. Falls back to
 * the static https://razorpay.me/@sridwar link — with an amount devotees
 * do have to enter themselves — on ANY failure (network, cold-start
 * timeout, misconfiguration): a slightly less convenient working link
 * beats a broken one in the reminder email that most needs to actually get
 * someone to pay.
 * ✅ WIRED UP (2026-09-03): the server-side endpoint for this
 * (/api/razorpay/create-payment-link) already existed but was never
 * actually called from here — this function was still generating the
 * plain static link only. Same retry/cold-start handling as
 * _fetchCertificateImageBlob_ above.
 */
function _createRazorpayPaymentLink_(refId, amount, name, email, phone) {
  const apiBase = PropertiesService.getScriptProperties().getProperty("SRIDWAR_ADMIN_API_BASE");
  const linkSecret = PropertiesService.getScriptProperties().getProperty("RAZORPAY_LINK_SECRET");
  const FALLBACK_URL = "https://razorpay.me/@sridwar";
  if (!apiBase || !linkSecret || !refId || !amount) return FALLBACK_URL;

  const url = apiBase.replace(/\/$/, "") + "/api/razorpay/create-payment-link";
  const payload = {
    refId: refId,
    amount: amount,
    name: name || "Devotee",
    email: email || undefined,
    phone: phone || undefined,
    description: "Sri Dwar — Sankalp Offering (Ref " + refId + ")",
  };

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        headers: { "x-razorpay-link-secret": linkSecret },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
      });
      if (res.getResponseCode() === 200) {
        const data = JSON.parse(res.getContentText());
        if (data && data.short_url) return data.short_url;
      }
      logError_("razorpay_payment_link", "Attempt " + attempt + ": HTTP " + res.getResponseCode() + " from " + url);
    } catch (e) {
      logError_("razorpay_payment_link", "Attempt " + attempt + ": " + e);
    }
    if (attempt === 1) Utilities.sleep(8000); // matches the longer cold-start-tolerant wait used elsewhere in this file
  }
  return FALLBACK_URL; // never leave the email with no working way to pay
}

/**
 * "Complete Your Sankalp" button — links to a real, per-booking Razorpay
 * Payment Link with the exact amount pre-filled and locked (via
 * _createRazorpayPaymentLink_ above), so the devotee can pay by card, UPI,
 * or netbanking without needing to log in OR type an amount in themselves.
 * Falls back to the static razorpay.me/@sridwar link automatically if
 * link creation fails for any reason.
 */
function _payNowButton_(refId, amount, name, email, phone) {
  const url = refId && amount
    ? _createRazorpayPaymentLink_(refId, amount, name, email, phone)
    : "https://razorpay.me/@sridwar";
  return _ctaButton_("Complete Your Sankalp", url);
}

/**
 * Fetches a server-composited certificate/receipt image (Temple Visit,
 * Service Certificate, Transaction) by URL and returns a named Blob ready
 * for sendBrandedEmail_'s inlineImages, or null if the fetch failed —
 * callers fall back to a plain-text version rather than blocking the email
 * entirely. Shared by every image-based template below so there is exactly
 * one fetch-and-log implementation, not one copy per template.
 */
// ✅ FIX (2026-08-29 — real root cause found for the reported "email shows
// plain text instead of the certificate image" bug): this fetched exactly
// once, no retry. The Node server (Render free tier) spins down after a
// period of no traffic and can take 30–60+ seconds to wake back up on the
// next request — long enough to exceed UrlFetchApp's timeout on that
// first call. The devotee's actual screenshot showing this happening at
// 12:34 AM (a quiet-traffic hour) matches a cold-start failure exactly.
// One retry after a short pause is enough: by the second attempt the
// server has finished waking up and responds quickly, so the email gets
// the real composited image instead of falling back to plain text.
// Utilities.sleep() blocks synchronously, which is fine here — Apps
// Script's email-sending functions are already synchronous end to end.
// ✅ FIX (2026-09-03 — reported bug: emails arriving without their
// certificate/transaction image, falling back to plain text): this used
// to make 2 attempts with only a 4-second gap between them. Render's free
// tier can take 30-60 seconds to wake from a cold start (documented
// elsewhere in this file and in confirmedpaymentpoller.gs) — a devotee's
// payment-reminder or booking-confirmation email firing while the server
// was asleep would fail BOTH attempts well before the server ever
// finished waking up, and silently fall back to text-only. Now makes 3
// attempts with a longer, increasing wait (8s, then 20s) — comfortably
// covers a genuine cold start while still finishing well within Apps
// Script's execution time limits. The real, permanent fix is keeping the
// server from going idle in the first place (see the keep-alive ping
// workflow, separate from this file) — this is the safety net for
// whenever that isn't enough on its own.
function _fetchCertificateImageBlob_(url, blobName, logContext) {
  if (!url) return null;
  const RETRY_WAITS_MS = [8000, 20000]; // gaps between attempts 1→2 and 2→3
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (res.getResponseCode() === 200) {
        return res.getBlob().setName(blobName);
      }
      logError_(logContext, `Attempt ${attempt}: HTTP ${res.getResponseCode()} from ${url}`);
    } catch (e) {
      logError_(logContext, `Attempt ${attempt}: ${e}`);
    }
    if (attempt < 3) {
      Utilities.sleep(RETRY_WAITS_MS[attempt - 1]); // give a cold-starting server real time to wake up before retrying
    }
  }
  return null;
}

/** Builds the /api/certificates/transaction/:refId URL (server.ts) — reads the same SRIDWAR_ADMIN_API_BASE Script Property every other image-fetch in this file uses. */
function _transactionImageUrl_(refId) {
  const apiBase = PropertiesService.getScriptProperties().getProperty("SRIDWAR_ADMIN_API_BASE");
  if (!apiBase || !refId) return null;
  return apiBase.replace(/\/$/, "") + "/api/certificates/transaction/" + encodeURIComponent(refId);
}

/** Builds the /api/certificates/service/:refId URL (server.ts). Returns null-image (403) until completion_status='completed' in Supabase — the caller's fallback text handles that gracefully, same as any other fetch failure. */
function _serviceCertificateImageUrl_(refId) {
  const apiBase = PropertiesService.getScriptProperties().getProperty("SRIDWAR_ADMIN_API_BASE");
  if (!apiBase || !refId) return null;
  return apiBase.replace(/\/$/, "") + "/api/certificates/service/" + encodeURIComponent(refId);
}

/** Builds the /api/email/inquiry-banner URL (server.ts) — same endpoint buildAcknowledgementEmail_ uses, reused here for Welcome since both share the Email_Design_Templete.jpg artwork. */
function _generalBannerImageUrl_(name, refId, label) {
  const apiBase = PropertiesService.getScriptProperties().getProperty("SRIDWAR_ADMIN_API_BASE");
  if (!apiBase) return null;
  const base = apiBase.replace(/\/$/, "");
  const qs = [
    "name=" + encodeURIComponent(name || ""),
    "ref=" + encodeURIComponent(refId || ""),
    "label=" + encodeURIComponent(label || ""),
  ].join("&");
  return base + "/api/email/inquiry-banner?" + qs;
}

/**
 * Centers one certificate/receipt image (or, if the fetch failed, a plain
 * text summary built from fallbackLines) inside the same dark-green,
 * image-free-background wrapper every other template in this file already
 * uses. footerHtml is everything that is NOT printed on the image itself —
 * extra fields, buttons, disclaimer, blessing — always rendered BELOW the
 * image, never composited into it.
 */
function _imageCenteredEmail_(imageBlob, cid, altTitle, fallbackLines, footerHtml) {
  const imageBlock = imageBlob
    ? `<img src="cid:${cid}" width="470" alt="${_escapeHtml_(altTitle)}" style="display:block;width:100%;max-width:470px;height:auto;border:0;outline:none;margin:0 auto;border-radius:10px;" />`
    : `<div style="background:${PANEL_CREAM};border-radius:10px;padding:26px 20px;text-align:center;">
         ${fallbackLines.map((line) => `<div style="font-size:13px;color:#3a2812;margin-top:6px;">${line}</div>`).join("")}
       </div>`;

  const html = `
    <div style="background:${CONFIG.BRAND.darkGreen};padding:28px 14px;font-family:Georgia,'Times New Roman',serif;">
      <div style="max-width:470px;margin:0 auto;">${imageBlock}</div>
      ${footerHtml}
    </div>`;

  return { html: html, inlineImages: imageBlob ? { [cid]: imageBlob } : null };
}

// ─── 1. Welcome to Sri Dwar ─────────────────────────────────────────────────
// Uses the same Email_Design_Templete.jpg artwork and endpoint as the
// Acknowledgement email (buildAcknowledgementEmail_) — both are "general"
// notifications sharing one design. Only name/reference/label are baked
// into the image; City/Gotra/Rashi/Deity of Devotion aren't printed on
// that artwork, so they're shown in the footer below it instead.
function buildWelcomeEmail_(d) {
  // d: { name, city, gotra, rashi, deity, refId }
  const bannerUrl = _generalBannerImageUrl_(d.name, d.refId, "Welcome");
  const imageBlob = _fetchCertificateImageBlob_(bannerUrl, "welcomeBanner", "buildWelcomeEmail_ image fetch");

  const fallbackLines = [
    `<b style="font-size:18px;">Jai Jagannath, ${_escapeHtml_(d.name)}!</b> ${EMOJI.prayer}`,
    d.refId ? `Reference: <b>${_escapeHtml_(d.refId)}</b>` : "",
  ].filter(Boolean);

  const detailRows =
    _detailRow_("City", d.city) +
    _detailRow_("Gotra", d.gotra) +
    _detailRow_("Rashi", d.rashi) +
    _detailRow_("Deity of Devotion", d.deity);

  const footerHtml = `
    <div style="max-width:470px;margin:18px auto 0;color:#e8f0ee;font-size:14px;line-height:1.6;">
      Welcome to Sri Dwar — your sacred digital doorway to temples, pujas, and priests across India.
      Your devotee profile has been created and your details are safely noted for every future Sankalp.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:470px;margin:16px auto 0;">
      <tr><td style="background:${PANEL_CREAM};border:1px solid ${PANEL_BORDER};border-radius:10px;padding:16px 18px;">
        ${detailRows}
      </td></tr>
    </table>
    <div style="max-width:470px;margin:14px auto 0;color:#e8f0ee;font-size:13px;line-height:1.6;">
      From here you can book Online Pujas, sponsor a Seva, request a Darshan Certificate, or simply explore
      temples from home. Any questions at all — we're here for you.
    </div>
    <div style="max-width:470px;margin:14px auto 0;text-align:center;">
      ${_ctaButton_("Explore Sri Dwar", CONFIG.BRAND.website)}
    </div>
    <div style="max-width:470px;margin:20px auto 0;padding-top:14px;border-top:1px solid rgba(244,197,99,0.25);text-align:center;">
      <div style="font-size:13px;color:${CONFIG.BRAND.gold};font-weight:bold;">${EMOJI.prayer} With folded hands, Team ${CONFIG.BRAND.name}</div>
      <div style="margin-top:8px;">${_brandFooterLine_()}</div>
      ${_socialLinksFooter_()}
    </div>
  `;

  return _imageCenteredEmail_(imageBlob, "welcomeBanner", "Sri Dwar — Welcome", fallbackLines, footerHtml);
}

// ─── 2. Booking Confirmation (matches the reference "Sankalp received" design) ──
// Service-specific disclaimer swapped in below for counselling/wellness
// bookings — the plain CONFIG.SERVICE_DISCLAIMER text talks about "temple
// process" and "priest availability", which doesn't apply to those two.
const NON_RITUAL_SERVICE_DISCLAIMER = {
  counselling_guidance:
    "Counselling & Guidance sessions offer spiritual and emotional support and are not a substitute for professional medical, psychiatric, or legal advice. Session timing depends on your chosen expert's availability. If a payment is later found to be unsuccessful, duplicate, or not properly processed, a refund will be initiated wherever applicable.",
  holistic_wellness:
    "These are guided yogic/wellness practices, not medical treatment. Please consult a qualified physician for any health condition before or during participation. Session timing depends on instructor availability. If a payment is later found to be unsuccessful, duplicate, or not properly processed, a refund will be initiated wherever applicable.",
};

function buildBookingConfirmationEmail_(d) {
  // d: { name, serviceLabel, itemName, panditName, refId, amount, paymentStatus, bookingKind }
  //
  // ✅ FIX (requested behaviour change): Triggers.gs now only ever calls
  // this template in two situations — payment already confirmed, or the
  // devotee has just tapped "I Have Paid" (payment SUBMITTED, awaiting our
  // team's verification). The genuinely never-attempted-payment case is
  // handled entirely by buildPaymentReminderEmail_ and never reaches this
  // function.
  const isPending = /pending/i.test(d.paymentStatus || "");

  // ✅ FIX: Counselling & Guidance / Holistic Wellness bookings land in this
  // same template via the shared Puja sheet/pipeline (see
  // _bookingKindFromFormType_ in Triggers.gs) but are not a ritual — no
  // Sankalp, no deity, no pandit, no certificate. Genuine Puja/Seva/
  // Certificate rows (d.bookingKind undefined) fall through to the
  // original copy below, completely unchanged.
  const isNonRitual = d.bookingKind === "counselling_guidance" || d.bookingKind === "holistic_wellness";

  // The Darshan Certificate flow (Hero.tsx "Receive Darshan Certificate"
  // modal) is a free devotional record of a temple visit the devotee
  // already made — no payment, no transaction, so it has NOTHING to do
  // with the Transaction Completed artwork below. It keeps its own plain,
  // image-free confirmation (unchanged) with a "Log In to Download" link
  // to the actual Temple Visit Certificate on their profile.
  const isTempleCert = d.bookingKind === "temple_darshan_certificate";

  if (isTempleCert) {
    const inner = `
      ${_greetingBand_(`<div style="font-size:20px;color:#2b1806;font-weight:bold;text-align:center;">Namaste! ${EMOJI.prayer}</div>`)}
      <div style="font-size:14px;color:#3a2812;line-height:1.6;margin-bottom:6px;">
        Your Temple Visit Certificate request for <b>${d.itemName || "the temple you visited"}</b> has been received at Sri Dwar.
      </div>
      ${_motifBand_(PALM_LEAF_ASSETS.flower, _detailBox_(
        _detailRow_("Temple Visited", d.itemName) +
        _detailRow_("Devotee Name", d.name) +
        _detailRow_("Booking Reference", d.refId)
      ))}
      <div style="font-size:13px;color:#3a2812;line-height:1.7;margin-top:18px;">
        <b>What happens next:</b> your certificate is being prepared and will be ready to download from your Sri Dwar
        profile — log in at sridwar.com (website or app) and look under your Dharmic ID for "My Requests &
        Submissions." We'll also email you again once it's ready. If you chose a divine contribution alongside this
        request, thank you — that is recorded and confirmed separately.
      </div>
      ${_ctaButton_("Log In to Download", CONFIG.BRAND.website)}
      <div style="font-size:11px;color:${CONFIG.BRAND.textMuted};line-height:1.6;margin-top:14px;">
        This certificate is a devotional record of your sacred temple visit, prepared with care by Sri Dwar. It is
        not a government document or legal certificate.
      </div>
      ${_devotionalFooter_("darshan", "ritual")}
      ${_blessingClosing_()}
    `;
    return {
      html: _wrapEmailHtml_(inner, `Your certificate request for ${d.itemName || d.serviceLabel} has been received — Ref ${d.refId}.`),
      inlineImages: null,
    };
  }

  // ─── Every other booking kind (Puja/Seva/Counselling/Wellness): uses the
  // real Trasancation_Completed.jpg artwork, fetched fresh at send time —
  // its own Payment Method field already reads the real method once
  // confirmed, or "Payment is still pending" while under review (see
  // loadAndRenderTransactionJpeg in server.ts). Fields already printed on
  // that image (name, service, reference, date, amount, payment method)
  // are never repeated below; only what the image has no room for
  // (Officiating Pandit) and the "what happens next" narrative go in the
  // footer beneath it. No UPI QR code anywhere.
  const statusLabel = isPending ? "Under Review" : (d.paymentStatus || "Confirmed");
  const statusColor = isPending ? "#8a5a12" : "#166534";
  const statusBg = isPending ? "rgba(253,243,223,0.9)" : "rgba(234,250,240,0.9)";

  const receivedLine = isNonRitual
    ? (d.bookingKind === "counselling_guidance"
        ? `Your request for <b>${_escapeHtml_(d.itemName || d.serviceLabel)}</b> has been warmly and confidentially received by our guidance coordination team.`
        : `Your enrollment for <b>${_escapeHtml_(d.itemName || d.serviceLabel)}</b> has been received by our wellness team.`)
    : `Your Sankalp for the <b>${_escapeHtml_(d.itemName || d.serviceLabel)}</b> has been received at Sri Dwar.`;

  const whatsNextLine = isPending
    ? `your payment is now with our team for verification — this is usually quick. If there's ever a delay in
      confirming it, we will notify you directly; there's nothing further you need to do right now. Once verified,
      ${isNonRitual ? "your session will be confirmed" : "your rite will be performed in your name by our officiating pandit"} exactly as requested.`
    : isNonRitual
    ? (d.bookingKind === "counselling_guidance"
        ? `Your chosen Pandit or Dharmic guidance expert is reviewing your request with care, and will personally
      reach out to confirm your session timing within 3–7 working days — straight to your email or WhatsApp.
      Everything you've shared stays confidential.`
        : `Our wellness team is reviewing your enrollment and will personally reach out to confirm your session/program
      timing within 3–7 working days, straight to your email or WhatsApp.`)
    : `your rite is scheduled to be performed in your name by our officiating pandit,
      with your Sankalp offered before the deity as received. Once completed, you'll receive a Digital Puja
      Certificate and audio recording for your remembrance.`;

  const disclaimerText = isNonRitual ? NON_RITUAL_SERVICE_DISCLAIMER[d.bookingKind] : CONFIG.SERVICE_DISCLAIMER;

  const imageUrl = _transactionImageUrl_(d.refId);
  const imageBlob = _fetchCertificateImageBlob_(imageUrl, "transactionReceipt", "buildBookingConfirmationEmail_ image fetch");

  const fallbackLines = [
    `<b>${_escapeHtml_(d.itemName || d.serviceLabel)}</b>`,
    `Reference: <b>${_escapeHtml_(d.refId)}</b>`,
    `Payment Status: <b>${_escapeHtml_(statusLabel)}</b>`,
  ];

  // Officiating Pandit isn't a field printed on Trasancation_Completed.jpg
  // (Bill To / Invoice / Reference / Date / Description / Amount /
  // Subtotal / Total Paid / Payment Method only) — shown here instead,
  // only for genuine ritual bookings that have one.
  const extraFieldsHtml = (!isNonRitual && d.panditName)
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:470px;margin:14px auto 0;">
         <tr><td style="background:${PANEL_CREAM};border:1px solid ${PANEL_BORDER};border-radius:10px;padding:14px 18px;">
           ${_detailRow_("Officiating Pandit", d.panditName)}
         </td></tr>
       </table>`
    : "";

  const footerHtml = `
    <div style="max-width:470px;margin:16px auto 0;text-align:center;">
      <span style="display:inline-block;background:${statusBg};color:${statusColor};font-size:12px;font-weight:bold;padding:6px 14px;border-radius:20px;">
        Payment Status: ${_escapeHtml_(statusLabel)}
      </span>
    </div>
    <div style="max-width:470px;margin:14px auto 0;color:#e8f0ee;font-size:13px;line-height:1.6;">
      ${receivedLine}
    </div>
    ${extraFieldsHtml}
    <div style="max-width:470px;margin:14px auto 0;color:#c9d6d2;font-size:13px;line-height:1.7;">
      <b style="color:#e8f0ee;">What happens next:</b> ${whatsNextLine}
    </div>
    ${isPending ? `<div style="max-width:470px;margin:14px auto 0;text-align:center;">${_payNowButton_(d.refId, d.amount, d.name)}</div>` : ""}
    <div style="max-width:470px;margin:12px auto 0;color:#9fb2ad;font-size:11px;line-height:1.6;">
      ${disclaimerText}
    </div>
    <div style="max-width:470px;margin:16px auto 0;padding-top:14px;border-top:1px solid rgba(244,197,99,0.25);text-align:center;">
      <div style="font-size:13px;color:${CONFIG.BRAND.gold};font-weight:bold;">${EMOJI.prayer} With folded hands, Team ${CONFIG.BRAND.name}</div>
      <div style="margin-top:8px;">${_brandFooterLine_()}</div>
      ${_socialLinksFooter_()}
    </div>
  `;

  return _imageCenteredEmail_(imageBlob, "transactionReceipt", "Sri Dwar Transaction Confirmation", fallbackLines, footerHtml);
}

// ─── 3. Payment Reminder ────────────────────────────────────────────────────
// Uses the real Trasancation_Completed.jpg artwork — fetched fresh at send
// time, so its own Payment Method field already reads "Payment is still
// pending" (see loadAndRenderTransactionJpeg in server.ts). Every field this
// email used to show in a detail box (service, reference, amount) is
// already printed on that image; nothing here duplicates it. No UPI QR
// code anywhere — just a plain "Pay Now" button below the image, linking to
// the devotee's own Sri Dwar profile.
function buildPaymentReminderEmail_(d) {
  // d: same shape as booking confirmation, plus bookingKind
  const isNonRitual = d.bookingKind === "counselling_guidance" || d.bookingKind === "holistic_wellness";
  const bodyLine = isNonRitual
    ? `Dear ${_escapeHtml_(d.name)}, your request for <b>${_escapeHtml_(d.itemName || d.serviceLabel)}</b> is still awaiting
      payment confirmation. Once received, our team will proceed to confirm your session as planned.`
    : `Dear ${_escapeHtml_(d.name)}, your Sankalp for the <b>${_escapeHtml_(d.itemName || d.serviceLabel)}</b> is still awaiting
      payment confirmation. Once received, your pandit will proceed with the sacred rite as planned.`;
  const disclaimerText = isNonRitual ? NON_RITUAL_SERVICE_DISCLAIMER[d.bookingKind] : CONFIG.SERVICE_DISCLAIMER;

  const imageUrl = _transactionImageUrl_(d.refId);
  const imageBlob = _fetchCertificateImageBlob_(imageUrl, "transactionReceipt", "buildPaymentReminderEmail_ image fetch");

  const fallbackLines = [
    `<b>${_escapeHtml_(d.itemName || d.serviceLabel)}</b>`,
    `Reference: <b>${_escapeHtml_(d.refId)}</b>`,
    d.amount ? `Amount Due: <b>&#8377;${_escapeHtml_(String(d.amount))}</b>` : "",
  ].filter(Boolean);

  const footerHtml = `
    <div style="max-width:470px;margin:18px auto 0;color:#e8f0ee;font-size:13px;line-height:1.7;">
      ${bodyLine}
    </div>
    <div style="max-width:470px;margin:14px auto 0;text-align:center;">
      ${_payNowButton_(d.refId, d.amount, d.name)}
    </div>
    <div style="max-width:470px;margin:14px auto 0;color:#c9d6d2;font-size:12px;line-height:1.6;">
      If you've already paid, please disregard this note — it may simply have crossed paths with your payment.
      Reach us any time at ${CONFIG.BRAND.supportEmail}.
    </div>
    <div style="max-width:470px;margin:12px auto 0;color:#9fb2ad;font-size:11px;line-height:1.6;">
      ${disclaimerText}
    </div>
    <div style="max-width:470px;margin:16px auto 0;padding-top:14px;border-top:1px solid rgba(244,197,99,0.25);text-align:center;">
      <div style="font-size:13px;color:${CONFIG.BRAND.gold};font-weight:bold;">${EMOJI.prayer} With folded hands, Team ${CONFIG.BRAND.name}</div>
      <div style="margin-top:8px;">${_brandFooterLine_()}</div>
      ${_socialLinksFooter_()}
    </div>
  `;

  return _imageCenteredEmail_(imageBlob, "transactionReceipt", "Sri Dwar Transaction Confirmation", fallbackLines, footerHtml);
}

// ─── 4. Certificate Ready / Puja Completed ─────────────────────────────────
function buildCertificateReadyEmail_(d) {
  // d: { name, serviceLabel, itemName, panditName, refId, bookingKind, deity, temple, performedDate }
  // ✅ FIX: no certificate, deity, or pandit exists for a counselling
  // session or wellness enrollment — see buildBookingConfirmationEmail_
  // above for the full explanation. Genuine Puja/Seva rows (bookingKind
  // undefined) get the real Service_Certificate.jpg artwork below instead.
  const isNonRitual = d.bookingKind === "counselling_guidance" || d.bookingKind === "holistic_wellness";

  if (isNonRitual) {
    const inner = `
      ${_greetingBand_(`<div style="font-size:20px;color:#2b1806;font-weight:bold;text-align:center;">Namaste, ${d.name}! ${EMOJI.prayer}</div>`)}
      <div style="font-size:14px;color:#3a2812;line-height:1.6;margin:16px 0 6px;">
        Your <b>${d.itemName || d.serviceLabel}</b>${d.panditName ? ` with ${d.panditName}` : ""} has been marked complete.
        We hope it brought you clarity, comfort, and strength.
      </div>
      ${_motifBand_(PALM_LEAF_ASSETS.flower, _detailBox_(
        _detailRow_(d.serviceLabel || "Service", d.itemName) +
        _detailRow_(d.bookingKind === "counselling_guidance" ? "Guide / Expert" : "Instructor", d.panditName) +
        _detailRow_("Completed", d.performedDate) +
        _detailRow_("Booking Reference", d.refId)
      ))}
      <div style="font-size:11px;color:#5a3d1a;line-height:1.6;margin-top:14px;">
        ${NON_RITUAL_SERVICE_DISCLAIMER[d.bookingKind]}
      </div>
      ${_devotionalFooter_("wellbeing", "certificate")}
      ${_blessingClosing_()}
    `;
    return {
      html: _wrapEmailHtml_(inner, `Your ${d.itemName || d.serviceLabel} session is complete, Ref ${d.refId}.`),
      inlineImages: null,
    };
  }

  // ─── Genuine Puja/Seva: uses the real Service_Certificate.jpg artwork —
  // fetched fresh at send time (only reachable once completion_status =
  // 'completed' in Supabase; see /api/certificates/service/:refId in
  // server.ts, which refuses to render before then). Only what's actually
  // printed on that image (name, service, date) is baked in; Deity,
  // Temple, and Officiating Pandit have no room on that artwork, so they
  // go in the footer below it, matching the "only image fields in the
  // image, everything else near the disclaimer" design.
  const imageUrl = _serviceCertificateImageUrl_(d.refId);
  const imageBlob = _fetchCertificateImageBlob_(imageUrl, "serviceCertificate", "buildCertificateReadyEmail_ image fetch");

  const fallbackLines = [
    `<b>${_escapeHtml_(d.itemName || d.serviceLabel)}</b> — completed`,
    `Reference: <b>${_escapeHtml_(d.refId)}</b>`,
  ];

  const extraDetailRows =
    _detailRow_("Deity", d.deity) +
    _detailRow_("Temple", d.temple) +
    _detailRow_("Officiating Pandit", d.panditName) +
    _detailRow_("Performed Date", d.performedDate) +
    _detailRow_("Booking Reference", d.refId);

  const footerHtml = `
    <div style="max-width:470px;margin:18px auto 0;color:#e8f0ee;font-size:14px;line-height:1.6;">
      Wonderful news — your <b>${_escapeHtml_(d.itemName || d.serviceLabel)}</b> has been performed in your name${d.panditName ? ` by ${_escapeHtml_(d.panditName)}` : ""},
      with your Sankalp offered before the deity.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:470px;margin:14px auto 0;">
      <tr><td style="background:${PANEL_CREAM};border:1px solid ${PANEL_BORDER};border-radius:10px;padding:16px 18px;">
        ${extraDetailRows}
      </td></tr>
    </table>
    <div style="max-width:470px;margin:14px auto 0;text-align:center;">
      ${_ctaButton_("Download Your Certificate", CONFIG.BRAND.website)}
    </div>
    <div style="max-width:470px;margin:20px auto 0;padding-top:14px;border-top:1px solid rgba(244,197,99,0.25);text-align:center;">
      <div style="font-size:13px;color:${CONFIG.BRAND.gold};font-weight:bold;">${EMOJI.prayer} With folded hands, Team ${CONFIG.BRAND.name}</div>
      <div style="margin-top:8px;">${_brandFooterLine_()}</div>
      ${_socialLinksFooter_()}
    </div>
  `;

  return _imageCenteredEmail_(imageBlob, "serviceCertificate", "Sri Dwar Service Certificate", fallbackLines, footerHtml);
}

// ─── 5. Generic Acknowledgement / Enquiry Received ─────────────────────────
// Several distinct website forms currently post into ONE shared Google
// Form/Sheet each (see CONFIG.SHEETS.ACKNOWLEDGEMENT_SHEETS in Config.gs,
// and — for the "Inquiry" sheet specifically — src/utils/googleFormSync.ts,
// where devotee_support, subscription_signup, refund_cancellation_request,
// AND temple_issue_report ["Raise Temple Issues With Elected
// Representatives"] all currently reuse the same physical form/sheet until
// each gets its own dedicated Google Form). ACK_COPY below gives each of
// those a distinct, unique, devotional confirmation message — keyed by the
// specific formLabel that Triggers.gs now resolves per-row (see
// _resolveAcknowledgementLabel_ in Triggers.gs) — instead of every one of
// them silently reading as a generic "Inquiry" reply.
const ACK_COPY = {
  "Sacred Certificate Generated": {
    greeting: (name) => `Jai Jagannath, ${name}! `,
    intro: `Your Sri Dwar Blessing Certificate has been generated with devotion, commemorating your sacred
      offering. This certificate is a keepsake of your Sankalp, ready to be preserved and cherished.`,
    followUp: `If you'd like a fresh copy shared with you again at any time, simply reach out to our team —
      we're glad to preserve this memory for you.`,
  },
  "Temple Issue Report": {
    greeting: (name) => `Your Voice Has Been Heard, ${name}! `,
    intro: `Thank you for stepping forward to protect what our ancestors preserved. Your report about a
      temple, puja committee, pandal, mandal, or festival has been received at Sri Dwar's Devotee Civic Desk
      and, where you've chosen recipients, shared onward toward the local, district, state, or national
      representatives you selected.`,
    followUp: `Sri Dwar will provide updates on the status of your report as we hear back — thank you for
      standing up for our shared temples, traditions, and dharma.`,
  },
  "Prasad & Prayer Testimony": {
    greeting: (name) => `Hari Om, ${name}! `,
    intro: `Thank you for sharing your Prasad and Prayer experience with the Sri Dwar family. Every
      testimony of faith you send us is read with reverence and cherished as part of our shared devotion.`,
    followUp: `Sri Dwar will provide updates on the status of your testimony, including if it is ever
      featured — we're grateful you took a moment to share your bhakti with us.`,
  },
  "Temple Registration": {
    greeting: (name) => `Namaste, ${name}! `,
    intro: `Thank you for registering your temple with Sri Dwar. Your submission has been received, and our
      team will carefully review the details you've shared.`,
    followUp: `Sri Dwar will provide updates on the status of your temple's registration as we move it
      forward.`,
  },
  "Pujari Registration": {
    greeting: (name) => `Namaskaram, ${name}! `,
    intro: `Thank you for offering your services as a Pujari through Sri Dwar. Your registration has been
      received with respect for your years of dedication to seva.`,
    followUp: `Sri Dwar will provide updates on the status of your registration as our team reviews it.`,
  },
  "Refund / Cancellation Request": {
    greeting: (name) => `Namaste, ${name}! `,
    intro: `Your refund/cancellation request has been received at Sri Dwar and logged for our team's careful
      review.`,
    followUp: `Sri Dwar will provide updates on the status of your request as it is processed.`,
  },
  "Subscription Signup": {
    greeting: (name) => `Jai Jagannath, ${name}! `,
    intro: `Thank you for your interest in a Sri Dwar subscription. Your details have been received and our
      team will be in touch.`,
    followUp: `Sri Dwar will provide updates on the status of your inquiry soon.`,
  },
};
const ACK_COPY_DEFAULT = {
  greeting: (name) => `Jai Jagannath, ${name}! `,
  intro: `Thank you for reaching out to Sri Dwar. Your message has been received with care, and our team
    will review it closely.`,
  followUp: `Sri Dwar will provide updates on the status of your inquiry as we work on it.`,
};

// Per-formLabel shloka selection so each acknowledgement flavor gets its own
// contextually-relevant verse rather than one quote reused everywhere.
const ACK_SHLOKA_KEY = {
  "Temple Issue Report": "temple_issue",
  "Prasad & Prayer Testimony": "testimony",
  "Temple Registration": "temple_registration",
  "Pujari Registration": "pujari_registration",
  "Refund / Cancellation Request": "refund",
  "Subscription Signup": "subscription",
};

function _escapeHtml_(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Builds the /api/email/inquiry-banner URL (see server.ts) that renders
 * Email_Design_Templete.jpg with the devotee's first name, Reference ID,
 * and form-type label baked directly into the JPEG pixels — no CSS
 * positioning at send time, which is what the old PALM_LEAF_ASSETS/
 * _tiledBodyBand_ system below this function relied on and is why it
 * rendered as garbled overlapping text / solid-colour blanks in Gmail.
 * Reads the same SRIDWAR_ADMIN_API_BASE Script Property that
 * ConfirmedPaymentPoller.gs already requires (Render URL, e.g.
 * https://sridwar-api.onrender.com) so there's only one place this base
 * URL is ever configured.
 */
function _acknowledgementBannerUrl_(name, refId, formLabel) {
  const apiBase = PropertiesService.getScriptProperties().getProperty("SRIDWAR_ADMIN_API_BASE");
  if (!apiBase) return null;
  const base = apiBase.replace(/\/$/, "");
  const qs = [
    "name=" + encodeURIComponent(name || ""),
    "ref=" + encodeURIComponent(refId || ""),
    "label=" + encodeURIComponent(formLabel || ""),
  ].join("&");
  return base + "/api/email/inquiry-banner?" + qs;
}

/**
 * "We've received your ___" email. Uses a dedicated, fully composited
 * Email_Design_Templete.jpg artwork, fetched pre-rendered with this
 * devotee's data already baked in and embedded as a real inline (cid)
 * image attachment — not hot-linked, so it still shows even for mail
 * clients that block remote images by default, and not absolutely
 * positioned, so it can't misrender the way the old header band did.
 *
 * The per-form-type ACK_COPY intro/follow-up paragraphs (Temple Issue
 * Report, Refund Request, etc.) are kept as plain HTML text below the
 * image rather than folded into it: the artwork only has room for one
 * generic paragraph, and six form types each have distinct, more useful
 * wording that would otherwise be lost.
 *
 * Returns { html, inlineImages } — NOT a bare HTML string, since
 * GmailApp needs the actual image Blob alongside the markup that
 * references it via cid:. Update the call site in Triggers.gs
 * (_sendAcknowledgementForRow_) if this function's shape ever changes.
 */
function buildAcknowledgementEmail_(d) {
  // d: { name, formLabel, refId }
  const copy = ACK_COPY[d.formLabel] || ACK_COPY_DEFAULT;

  // ✅ FIX (2026-08-29): now goes through the same _fetchCertificateImageBlob_
  // helper every other image-based template uses — it used to have its own
  // separate, one-shot (no retry) fetch here, which is exactly what let a
  // cold-starting server fall through to the text-only fallback below more
  // often than it needed to. See the fix note on _fetchCertificateImageBlob_
  // for the full explanation.
  const bannerUrl = _acknowledgementBannerUrl_(d.name, d.refId, d.formLabel);
  const bannerBlob = _fetchCertificateImageBlob_(bannerUrl, "sridwar-acknowledgement.jpg", "buildAcknowledgementEmail_ banner fetch");

  // Fallback keeps the SAME information (name/reference/form type) as
  // plain text if the banner image couldn't be fetched, so a devotee
  // still gets a complete, correct email even during a banner-server outage.
  const imageBlock = bannerBlob
    ? `<img src="cid:acknowledgementBanner" width="470" alt="Sri Dwar" style="display:block;width:100%;max-width:470px;height:auto;border:0;outline:none;margin:0 auto;border-radius:10px;" />`
    : `<div style="background:${CONFIG.BRAND.cream};border-radius:10px;padding:28px 20px;text-align:center;">
         <div style="font-size:20px;color:#2b1806;font-weight:bold;">Jai Jagannath, ${_escapeHtml_(d.name)}! ${EMOJI.prayer}</div>
         <div style="font-size:13px;color:#3a2812;margin-top:10px;">
           Reference: <b>${_escapeHtml_(d.refId)}</b><br/>Submitted As: <b>${_escapeHtml_(d.formLabel)}</b>
         </div>
       </div>`;

  const inner = `
    <div style="max-width:470px;margin:0 auto;">${imageBlock}</div>
    <div style="max-width:470px;margin:14px auto 0;font-family:Georgia,'Times New Roman',serif;color:#e8f0ee;font-size:12px;line-height:1.6;text-align:center;">
      Reference: <b>${_escapeHtml_(d.refId)}</b> &nbsp;&middot;&nbsp; Submitted As: <b>${_escapeHtml_(d.formLabel)}</b>
    </div>
    <div style="max-width:470px;margin:14px auto 0;font-family:Georgia,'Times New Roman',serif;color:#e8f0ee;font-size:13px;line-height:1.7;">
      ${copy.intro}
    </div>
    <div style="max-width:470px;margin:12px auto 0;font-family:Georgia,'Times New Roman',serif;color:#c9d6d2;font-size:12px;line-height:1.7;">
      ${copy.followUp} We typically respond within 24–48 hours; if this needs urgent attention, simply reply
      directly to this email.
    </div>
    <div style="max-width:470px;margin:20px auto 0;padding-top:14px;border-top:1px solid rgba(244,197,99,0.25);font-family:Georgia,'Times New Roman',serif;color:#9fb2ad;font-size:11px;line-height:1.7;text-align:center;">
      Shradhalu Private Limited &middot; Jajpur Road, Odisha, India<br/>
      <a href="${CONFIG.BRAND.website}" style="color:${CONFIG.BRAND.gold};text-decoration:underline;">${CONFIG.BRAND.website.replace('https://','')}</a>
      &nbsp;&middot;&nbsp;
      <a href="mailto:${CONFIG.BRAND.supportEmail}" style="color:${CONFIG.BRAND.gold};text-decoration:underline;">${CONFIG.BRAND.supportEmail}</a>
      ${_socialLinksFooter_()}
    </div>
  `;

  // Solid brand-dark-green background (matches the site theme, never
  // black, no white boxes) — the email-safe Georgia/Times/serif stack is
  // used throughout, same as every other template in this file.
  const html = `
    <div style="background:${CONFIG.BRAND.darkGreen};padding:28px 14px;font-family:Georgia,'Times New Roman',serif;">
      ${inner}
    </div>`;

  return {
    html: html,
    inlineImages: bannerBlob ? { acknowledgementBanner: bannerBlob } : null,
  };
}
