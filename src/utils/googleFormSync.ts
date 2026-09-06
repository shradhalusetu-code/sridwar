/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ✅ ADDED (2026-09-03): completes the Turnstile bot-protection feature —
// verifyHuman() already existed, already fails open whenever Turnstile
// isn't configured/reachable (never blocks a real devotee over an
// infrastructure gap), and was already documented as belonging here. It
// just was never actually called from anywhere until now.
import { verifyHuman } from "./turnstile";

interface SyncConfig {
  formUrl: string;
  mappedFields: {
    nameKey: string;
    emailKey: string;
    phoneKey: string;
    detailsKey: string;
    typeKey: string;
    // ✅ ADDED 2026-08-28 — optional, only used by forms that have their own
    // dedicated geography/location column (currently just subscription_signup's
    // real "Referral & Cashback" form below). Left undefined for every other
    // config; those forms keep folding location into detailsKey exactly as
    // before, so nothing about them changes.
    geographyKey?: string;
    // ✅ ADDED 2026-09-06 — optional, only used by forms that have their own
    // dedicated divine-contribution/amount column (currently just the
    // Prayer Wall's real dedicated form below). Left undefined for every
    // other config; those forms keep folding contribution amount into
    // detailsKey's free text exactly as before, so nothing about them
    // changes.
    contributionKey?: string;
  };
  isEnabled: boolean;
}

// ✅ FIX 1: Added seva_booking as a separate config with its own Google Form URL
// Previously, there was no DEFAULT_CONFIG for seva — so it had no fallback form URL.
// Now both puja_booking AND seva_booking have their own hardcoded form URLs and entry IDs.
// 👉 IMPORTANT: Replace the formUrl and entry.XXXXXXXXX values below with YOUR actual
//    Google Form URLs and Entry IDs from your real Google Forms.
const DEFAULT_CONFIGS: Record<string, SyncConfig> = {
  darshan_certificate: {
    formUrl: "https://docs.google.com/forms/d/e/1FAIpQLScpddw8AbreZ5TuI-mYXptnTZiJd-Yu4aWXvihaAWKXU2wFuQ/formResponse",
    mappedFields: {
      nameKey: "entry.898437491",
      emailKey: "entry.1017844880",
      phoneKey: "entry.805333581",
      detailsKey: "entry.790841631",
      typeKey: "entry.1039747104"
    },
    isEnabled: true
  },
  // ✅ FIX 8 (2026-08-14) — the "AUDIT (re-confirmed Aug 2026...)" claim
  // directly below/previously here was NOT a real check against the live
  // form (no automated tool here can open a private Google Form and read
  // its question→entry-ID mapping) — it was an unverified guess written in
  // a confident tone, and it was wrong. The real bug it introduced: Phone,
  // Email, and Rashi were cross-wired in a 3-way rotation, invisible in
  // testing here because there was no ground truth to check it against.
  // This time the fix is derived from ACTUAL evidence: a real booking the
  // user submitted on 2026-08-14 and then showed the resulting row in the
  // live Form_Responses sheet (cell-by-cell, with the sheet's own header
  // row visible). That is unambiguous ground truth a code comment can't be:
  //   entry ID sent as  → previously labeled  → ACTUALLY landed in column
  //   entry.1096450797  → "Phone Number"       → Moon Sign (Rashi)   [G]
  //   entry.1322524758  → "Email Address"      → Phone Number        [H]
  //   entry.21123129    → "Moon Sign (Rashi)"  → Email Address       [I]
  // This is also why NO confirmation/pending emails were sending at all —
  // Triggers.gs correctly finds the "Email Address" column by its header
  // text every time, but the cell under that header was actually a phone
  // number (or blank, for flows like Counselling that never set data.rashi
  // in the first place), so there was never a valid address to send to.
  // Fixed below by relabeling each entry ID to the column it was actually
  // proven to land in — no new IDs invented, just the three swapped back
  // to match reality. ⚠️ Please re-verify with one more real test booking
  // after deploying — that is the only reliable way to confirm a Google
  // Form's entry-ID mapping, and it's what actually caught this bug.
  // ✅ FORM MIGRATION (2026-08-28): the old live Puja Google Form became
  // corrupted and was replaced with a fresh copy of the same form (made via
  // "Make a copy", which is why every entry.XXXXXXXXX ID below is unchanged —
  // Google preserves question IDs on a duplicated form). Only the endpoint
  // below changed, to the new copy's formResponse URL
  // (docs.google.com/forms/d/e/1FAIpQLSdhI2Vc6zhqdHzSUkzRo9ZfIpt7vmVqY8j_vXZzHHHpLKOvmQ/edit).
  // The new form's response destination was pointed at the SAME existing
  // spreadsheet already configured in config.gs's PUJA_BOOKING.spreadsheetId
  // (1Xrz9voxD8zsKDCfyHCgi6RJRtfa-nlp-BRWvfSiusNw) — so no Apps Script,
  // trigger, or spreadsheet ID changes were needed; see the migration notes
  // delivered alongside this file for the one manual check still required
  // (confirming the new form's response tab in that spreadsheet is named
  // "PUJA").
  puja_booking: {
    formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSdhI2Vc6zhqdHzSUkzRo9ZfIpt7vmVqY8j_vXZzHHHpLKOvmQ/formResponse",
    mappedFields: {
      nameKey: "entry.1507238374",   // Devotee Full Name
      emailKey: "entry.21123129",    // Email Address — proven by real submitted row (2026-08-14)
      phoneKey: "entry.1322524758",  // Phone Number — proven by real submitted row (2026-08-14)
      detailsKey: "entry.1050217824",// Sankalpa Intent
      typeKey: "entry.898437491"     // Puja Selected
    },
    isEnabled: true
  },
  // ✅ Seva booking — verified against the real live form the same way as
  // puja_booking above (test values matched 1:1 to the real sheet columns).
  // ✅ AUDIT (re-confirmed Aug 2026 directly against the live "SEVA" Google
  // Form, https://docs.google.com/forms/d/1HCBLvhnjp9r_xxSsn7jLvXGFmu_KijKdp9wekH6H_t8):
  // the form's 9 fields, in order, are exactly Seva Selected → Seva
  // Dakshina → Devotee Full Name → DOB (Planetary Calculation) → Gotra →
  // Moon Sign (Rashi) → Phone Number → Email Address → Seva Intent, and its
  // formResponse endpoint id (1FAIpQLSfdYMlOpYsjCk8uYO4vJvr1j8IXzvKAVxo8CLGnYkum8zguIA)
  // matches the formUrl below — confirming this config already points at
  // the correct dedicated Seva form. Note the last column is labelled "Seva
  // Intent" on the live form (the code below/older comments call it
  // "Sankalpa Intent" — same column, that's just legacy naming carried over
  // from the Puja form's terminology).
  seva_booking: {
    formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSfdYMlOpYsjCk8uYO4vJvr1j8IXzvKAVxo8CLGnYkum8zguIA/formResponse",
    mappedFields: {
      nameKey: "entry.1165779906",   // Devotee Full Name (was wrongly entry.898437491)
      emailKey: "entry.1681028168",  // Email Address (unchanged — was already correct)
      phoneKey: "entry.1364177955",  // Phone Number (unchanged — was already correct)
      detailsKey: "entry.1455477698",// Seva Intent (unchanged — was already correct)
      typeKey: "entry.898437491"     // Seva Selected (was wrongly entry.1165779906)
    },
    isEnabled: true
  },
  devotee_support: {
    formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSfBl9CoaY-CLlEhbsNZkiJTBfmyEGj23yLDAo_LpvADfOsKqQ/formResponse",
    mappedFields: {
      nameKey: "entry.898437491",
      emailKey: "entry.969380068",
      phoneKey: "entry.1486488215",
      detailsKey: "entry.1306645637",
      typeKey: "entry.943423993"
    },
    isEnabled: true
  },
  // ✅ Prasad & Prayer Testimony form
  // Entry IDs decoded from prefilled link:
  // entry.2059814953 = Name, entry.1921900509 = Location
  // entry.151571055 = Service/Puja, entry.1483989486 = Story/Experience
  // entry.1243420 = Rating
  prasad_testimony: {
    formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSeLY5EcxgxlSAszhg9cxLLAvCIfBXKTJuCIkvnLNPV5zyuNKQ/formResponse",
    mappedFields: {
      nameKey: "entry.2059814953",
      emailKey: "entry.1921900509",
      phoneKey: "entry.151571055",
      detailsKey: "entry.1483989486",
      typeKey: "entry.1243420"
    },
    isEnabled: true
  },
  // ✅ FIX (2026-09-06): Prayer Wall now has its own real, dedicated Google
  // Form — previously it reused the Prasad & Prayer Testimony form/sheet
  // (see prasad_testimony above) as a placeholder, so every Prayer Wall row
  // landed mixed into the Testimony sheet, with the free-text "type" label
  // ("Prayer Wall Offering" / "Prayer Wall Divine Contribution") getting
  // stuffed into that sheet's numeric Rating column. This form also adds a
  // real Divine Contribution column the old borrowed form never had, which
  // is why contribution amount could previously only ever be embedded as
  // text inside the message (see the "prayer_wall" branch below).
  // Entry IDs decoded from the user-supplied prefilled link, in the same
  // order-based method already used for every other form in this file:
  //   entry.1260448735 = Name
  //   entry.702388422  = Location
  //   entry.422199965  = Email
  //   entry.842698075  = Phone
  //   entry.278471389  = Divine Contribution (₹)
  //   entry.1831966550 = Prayer Message
  prayer_wall: {
    formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSePH_2M3uATAC2-dxIM_sF7AQQOpPskTq7kZX5aO02zWC2Z0g/formResponse",
    mappedFields: {
      nameKey: "entry.1260448735",
      geographyKey: "entry.702388422",
      emailKey: "entry.422199965",
      phoneKey: "entry.842698075",
      contributionKey: "entry.278471389",
      detailsKey: "entry.1831966550",
      // This form has no separate "type" column — Name/Location/Email/
      // Phone/Contribution/Message account for all 6 fields — so typeKey
      // is left blank and the syncToGoogleForm("prayer_wall", ...) branch
      // below simply skips it instead of overwriting another column.
      typeKey: ""
    },
    isEnabled: true
  },
  // ✅ Refer & Earn subscription signups (SubscriptionSignup.tsx) — now wired
  // to its own real, dedicated Google Form ("Referral & Cashback"), replacing
  // the devotee_support placeholder used previously. Confirmed by fetching
  // the live form on 2026-08-28 — its 6 fields, in order, are exactly Full
  // Name → Phone/WhatsApp → Email Address → "What will you mainly refer or
  // share? and Services You'll Offer." → Your Geography → "Tell us a bit
  // about yourself (optional) and Your experience & specializations", and
  // the entry IDs below were decoded from the user-supplied prefilled link
  // against that same field order:
  //   entry.120829422   = Full Name
  //   entry.1829417908  = Phone / WhatsApp
  //   entry.1428290966  = Email Address
  //   entry.1137469736  = What will you mainly refer/share + Services
  //   entry.135532925   = Your Geography
  //   entry.2708787     = About yourself + experience & specializations
  // The form has no dedicated column for Plan/Billing/Price/Payment Status/
  // Ref ID, so — same "one true catch-all column" convention already used
  // above for Sankalpa/Seva Intent — those keep landing in detailsKey
  // (data.details already composes all of them into one readable line; see
  // SubscriptionSignup.tsx). Nothing here is a placeholder anymore.
  subscription_signup: {
    formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSfrZN8TNl4_qG8Q1ijVqG8oFUIgtm7AtF4Uib04KwZT9tD86Q/formResponse",
    mappedFields: {
      nameKey: "entry.120829422",
      emailKey: "entry.1428290966",
      phoneKey: "entry.1829417908",
      typeKey: "entry.1137469736",
      geographyKey: "entry.135532925",
      detailsKey: "entry.2708787"
    },
    isEnabled: true
  },
  // ✅ Refund / Cancellation requests (RefundRequestModal.tsx, triggered from
  // the "All Account Activity" ledger in AuthDashboard.tsx). DECISION
  // (2026-08-27): this stays sharing the devotee_support "Support" form/
  // sheet on purpose — refund/cancellation requests are a kind of devotee
  // support inquiry, and it already records them fully: the `details` field
  // always includes the booking ref, item, amount, and reason, and the
  // `type` field is fixed to "Refund/Cancellation Request" so these rows
  // are easy to filter out from general inquiries in the same sheet. Not a
  // placeholder awaiting a dedicated form — no separate form is planned.
  refund_cancellation_request: {
    formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSfBl9CoaY-CLlEhbsNZkiJTBfmyEGj23yLDAo_LpvADfOsKqQ/formResponse",
    mappedFields: {
      nameKey: "entry.898437491",
      emailKey: "entry.969380068",
      phoneKey: "entry.1486488215",
      detailsKey: "entry.1306645637",
      typeKey: "entry.943423993"
    },
    isEnabled: true
  },
  // ✅ Temple/Culture Issue Reports (ReportTempleIssues.tsx — "Raise Temple
  // Issues With Elected Representatives") — now wired to its own real,
  // dedicated "Raise Temple Issues" Google Form, replacing the
  // devotee_support placeholder used previously. Confirmed 2026-08-28 by
  // fetching the live form directly (https://docs.google.com/forms/d/18R3sESoTCuTD2G6HYpGFROk_mtqlqE3PInnqEn9EZ1Q/edit) —
  // its 14 fields, in order, are exactly:
  //   What are you reporting on? → Temple/Committee/Pandal/Mandal/Festival
  //   Name → Village/Town/City → District → State → Type of Issue →
  //   Describe the issue, concern, or suggestion → Local MLA (Optional) →
  //   Local MP (Optional) → Devotee Name → Devotee Contact Number →
  //   Devotee WhatsApp Number (Optional) → Devotee Email ID →
  //   Local/Block/Taluka/District/State/National/Other relevant authority
  // and the entry IDs below were decoded from the user-supplied prefilled
  // link against that same field order:
  //   entry.2098149808 = What are you reporting on?
  //   entry.1758561377 = Temple/Committee/Pandal/Mandal/Festival Name
  //   entry.36575273   = Village/Town/City
  //   entry.1728181807 = District
  //   entry.1636330115 = State
  //   entry.1504870399 = Type of Issue
  //   entry.1626123290 = Describe the issue, concern, or suggestion
  //   entry.750912903  = Local MLA (Optional)
  //   entry.280451135  = Local MP (Optional)
  //   entry.546878301  = Devotee Name
  //   entry.380127497  = Devotee Contact Number
  //   entry.1512691482 = Devotee WhatsApp Number (Optional)
  //   entry.716923336  = Devotee Email ID
  //   entry.1074610489 = Local/Block/.../Other relevant authority
  // mappedFields below carries the base 5 (name/email/phone/details/type —
  // same convention as every other form); the remaining 9 fields this form
  // has that no other form does are appended directly in the dedicated
  // temple_issue_report branch further down in syncToGoogleForm, the same
  // pattern already used for darshan_certificate's extra columns. Nothing
  // here is a placeholder anymore.
  temple_issue_report: {
    formUrl: "https://docs.google.com/forms/d/e/1FAIpQLScplYxleQ0A8SGJwPc_A8ZVkJqFxSWtpYAgPlsWe0xTTEi3kA/formResponse",
    mappedFields: {
      nameKey: "entry.546878301",
      emailKey: "entry.716923336",
      phoneKey: "entry.380127497",
      detailsKey: "entry.1626123290",
      typeKey: "entry.2098149808"
    },
    isEnabled: true
  }
};

// ─── Offline-safe delivery: retry + local queue ────────────────────────────
//
// `fetch(url, { mode: "no-cors" })` against a Google Forms endpoint only
// ever throws when the request never left the device (offline, DNS failure,
// airplane mode, etc.) — with `no-cors` the response itself is always
// opaque, so we can't inspect status codes either way. That means the ONE
// thing worth handling here is: "the devotee had no connection when they
// tapped submit." Previously that silently dropped the submission with just
// a console.error. Now we retry a couple of times with a short backoff, and
// if it's still failing, we queue the exact same request in localStorage and
// flush it automatically the moment the browser reports it's back online (or
// the next time the app loads). Nothing about the calling code, function
// signatures, or the Google Form field mapping above changes — this only
// wraps the final network call.
const OFFLINE_QUEUE_KEY = "sridwar_gform_offline_queue";
const MAX_INLINE_RETRIES = 2; // quick retries before we fall back to the queue
const INLINE_RETRY_DELAY_MS = 1200;

interface QueuedFormPost {
  id: string;
  url: string;
  fields: Record<string, string>;
  queuedAt: number;
}

function _readQueue(): QueuedFormPost[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function _writeQueue(queue: QueuedFormPost[]) {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // If localStorage is full/unavailable, there's nothing safe to do here —
    // fail silently rather than throwing inside a background sync helper.
  }
}

function _formDataToFields(formData: FormData): Record<string, string> {
  const fields: Record<string, string> = {};
  formData.forEach((value, key) => {
    fields[key] = typeof value === "string" ? value : "";
  });
  return fields;
}

function _delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function _rawPost(url: string, fields: Record<string, string>): Promise<void> {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
  await fetch(url, { method: "POST", mode: "no-cors", body: fd });
}

/**
 * Posts a Google Form submission with a couple of quick inline retries. If
 * those still fail (device is genuinely offline), the submission is queued
 * in localStorage instead of being dropped, and is retried automatically
 * once connectivity returns. Always resolves — never throws — so it's a
 * drop-in replacement for the previous raw `fetch(...)` calls.
 */
async function postFormWithRetry(url: string, fields: Record<string, string>): Promise<boolean> {
  for (let attempt = 0; attempt <= MAX_INLINE_RETRIES; attempt++) {
    try {
      await _rawPost(url, fields);
      return true;
    } catch (err) {
      if (attempt < MAX_INLINE_RETRIES) {
        await _delay(INLINE_RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
      console.warn(
        `[Google Forms Sync]: Offline or network error after ${MAX_INLINE_RETRIES + 1} attempts — queuing submission for retry when back online.`,
        err
      );
      const queue = _readQueue();
      queue.push({
        id: `${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        url,
        fields,
        queuedAt: Date.now(),
      });
      _writeQueue(queue);
      return false;
    }
  }
  return false;
}

/**
 * Attempts to flush any queued offline submissions. Safe to call anytime
 * (e.g. on app load, or when the browser fires an "online" event) — it's a
 * no-op if the queue is empty, and entries that still fail simply stay
 * queued for the next attempt.
 */
export async function flushOfflineFormQueue(): Promise<void> {
  const queue = _readQueue();
  if (queue.length === 0) return;

  const remaining: QueuedFormPost[] = [];
  for (const entry of queue) {
    try {
      await _rawPost(entry.url, entry.fields);
      console.log(`[Google Forms Sync]: Flushed queued offline submission ${entry.id}.`);
    } catch (err) {
      remaining.push(entry);
    }
  }
  _writeQueue(remaining);
}

// Auto-flush when the browser regains connectivity, and once on load in
// case submissions were queued during a previous session.
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    flushOfflineFormQueue();
  });
  // Fire-and-forget on module load; harmless if the queue is empty.
  flushOfflineFormQueue();
}

let cachedEnv: Record<string, string> | null = null;

/**
 * ✅ FIX: Removed /api/config fetch entirely.
 * On GitHub Pages there is no backend server, so calling /api/config always
 * caused a 404 error and a "response is not defined" crash.
 * All form URLs and entry IDs are now hardcoded in DEFAULT_CONFIGS above.
 */
async function fetchEnvConfig(): Promise<Record<string, string>> {
  // Always return empty — DEFAULT_CONFIGS handles everything
  return {};
}

/**
 * Helper to construct a compliant Google Form response endpoint.
 */
function buildFormResponseUrl(value: string | undefined, defaultUrl: string): string {
  if (!value || value.trim() === "") {
    return defaultUrl;
  }
  const clean = value.trim();
  if (clean.startsWith("http")) {
    const deMatch = clean.match(/\/forms\/d\/e\/([A-Za-z0-9_-]+)/);
    if (deMatch) {
      return `https://docs.google.com/forms/d/e/${deMatch[1]}/formResponse`;
    }
    const dMatch = clean.match(/\/forms\/d\/([A-Za-z0-9_-]+)/);
    if (dMatch) {
      return `https://docs.google.com/forms/d/${dMatch[1]}/formResponse`;
    }
    if (clean.endsWith("/formResponse")) {
      return clean;
    }
    if (clean.endsWith("/viewform")) {
      return clean.replace(/\/viewform$/, "/formResponse");
    }
    if (clean.includes("/edit")) {
      return clean.split("/edit")[0].replace(/\/$/, "") + "/formResponse";
    }
    return clean;
  }
  if (clean.startsWith("1FAIpQL") || clean.startsWith("1FAIp")) {
    return `https://docs.google.com/forms/d/e/${clean}/formResponse`;
  }
  return `https://docs.google.com/forms/d/${clean}/formResponse`;
}

/**
 * Ensures Google Form entry keys are formatted as "entry.<ID>"
 */
function formatEntryKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  const trimmed = key.trim();
  if (/^\d+$/.test(trimmed)) {
    return `entry.${trimmed}`;
  }
  return trimmed;
}

/**
 * Retrieves the Google Form sync configuration for a specific form type.
 */
export function getSyncConfig(formType: string): SyncConfig {
  const fallback = DEFAULT_CONFIGS[formType] || DEFAULT_CONFIGS.devotee_support;
  const stored = localStorage.getItem(`gform_sync_${formType}`);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.formUrl && parsed.formUrl.includes("1FAIpQLScXzRndWwAEvW-68XzS_B5yqS_tK-X-sV0T7U-yB3yK_Z_EHQ")) {
        localStorage.removeItem(`gform_sync_${formType}`);
        return fallback;
      }
      // ✅ AUDIT FIX: saveSyncConfig() is exported for a future settings
      // panel but is not called anywhere in the current app — nothing in
      // the codebase writes a "gform_sync_*" key today. That means any
      // value found here can only be a leftover from an older build (or
      // hand-edited devtools data), and it silently *replaces* the
      // carefully verified DEFAULT_CONFIGS mapping above with whatever
      // shape it happens to have — including a config missing one of the
      // 5 required entry keys, which would then silently drop that field
      // for every submission for that devotee, forever, with no visible
      // error. Validate the shape before trusting it; anything incomplete
      // falls back to the verified default instead of partially breaking.
      const fields = parsed?.mappedFields;
      const hasAllFields =
        fields &&
        typeof parsed.formUrl === "string" &&
        parsed.formUrl.trim() !== "" &&
        ["nameKey", "emailKey", "phoneKey", "detailsKey", "typeKey"].every(
          (k) => typeof fields[k] === "string" && fields[k].trim() !== ""
        );
      if (!hasAllFields) {
        console.warn(
          `[Google Forms Sync]: Ignoring incomplete/stale stored config for "${formType}" — using verified default instead.`
        );
        localStorage.removeItem(`gform_sync_${formType}`);
        return fallback;
      }
      return parsed;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/**
 * Saves the custom Google Form sync configuration to LocalStorage.
 */
export function saveSyncConfig(formType: string, config: SyncConfig) {
  localStorage.setItem(`gform_sync_${formType}`, JSON.stringify(config));
}

/**
 * Deduplication guard — prevents the exact same submission from being sent
 * twice within a 5-second window (e.g. a double-tap, or React StrictMode's
 * dev-mode double-invoke). Key includes the type/details content, not just
 * name+phone, so two DIFFERENT intentional submissions for the same person —
 * e.g. an immediate "Pending" row followed by a fast Skip/Pay decision a
 * second later — are never mistaken for an accidental duplicate and dropped.
 */
const _recentSubmissions = new Map<string, number>();

function _isDuplicate(formType: string, data: { name: string; phone: string; type?: string; details?: string }): boolean {
  const key = `${formType}|${data.name.trim().toLowerCase()}|${data.phone.trim()}|${data.type || ""}|${data.details || ""}`;
  const lastTime = _recentSubmissions.get(key);
  const now = Date.now();
  if (lastTime && now - lastTime < 5000) {
    console.log(`[Google Forms Sync]: Duplicate blocked for ${formType} (${now - lastTime}ms since last submit)`);
    return true;
  }
  _recentSubmissions.set(key, now);
  // Clean up old entries so the Map doesn't grow forever
  _recentSubmissions.forEach((t, k) => { if (now - t > 10000) _recentSubmissions.delete(k); });
  return false;
}

/**
 * Dev-time safety net for exactly the class of bug that caused values to
 * land in the wrong Google Sheet column in the past: two "different"
 * fields accidentally sharing the same entry.ID (e.g. a copy-pasted
 * fallback constant), which makes the second field's value silently
 * overwrite the first's in the same POST. Called once per submission for
 * the fields that matter most (name/gotra/rashi/dob/type/dakshina/intent);
 * a console.warn here is cheap and would have caught this exact bug.
 */
function _warnIfDuplicateEntryKeys(formType: string, keys: Record<string, string | undefined>) {
  const seen = new Map<string, string>();
  for (const [label, key] of Object.entries(keys)) {
    if (!key) continue;
    const prior = seen.get(key);
    if (prior) {
      console.warn(
        `[Google Forms Sync]: "${label}" and "${prior}" both use ${key} for ${formType} — one will silently overwrite the other in the sheet. Give them distinct entry IDs.`
      );
    } else {
      seen.set(key, label);
    }
  }
}

/**
 * ✅ AUDIT FIX (Puja/Seva mis-routing): decides whether a submission belongs
 * on the Seva form/sheet or the Puja form/sheet.
 *
 * Why this needs to be its own function: the previous inline check was
 *   data.type.toLowerCase().includes("seva") || data.details.toLowerCase().includes("seva")
 * which looks reasonable, but BookNowWizard.tsx (the actual Puja/Seva
 * Sankalpa Portal used for every real booking) always sets
 *   type: `Puja/Seva Booking - ${pujaName}`
 * — and the literal boilerplate label "Puja/Seva Booking" itself contains
 * the substring "seva", regardless of what pujaName is. That made
 * data.type.includes("seva") TRUE on every single Puja OR Seva booking,
 * which silently sent every Puja booking to the Seva Google Form/sheet
 * (wrong form, wrong entry IDs, wrong columns) while still "looking like it
 * worked" (no error, a row did land somewhere). This is the root cause of
 * the "randomly mapped" symptom — it wasn't random, it was 100% of Puja
 * bookings being misrouted to Seva every time.
 *
 * Fix: strip the fixed "Puja/Seva Booking" label text out before testing,
 * so only the real, devotee-facing item name/details decide the routing —
 * e.g. "Rudrabhishek Maha Puja" → Puja form, "Gau Seva (Sacred Cow Feeding
 * & Upkeep)" → Seva form, exactly as intended.
 *
 * Also: callers that already know for certain which sheet they want
 * (AuthDashboard's Temple Redevelopment Divine Contribution, TemplateBazaar's
 * Bazaar/Seva checkout — both call syncToGoogleForm("seva_booking", ...) by
 * name) are trusted directly rather than re-guessed from text.
 */
function _isSevaSubmission(
  formType: string,
  data: { type: string; details: string }
): boolean {
  if (formType === "seva_booking") return true;
  const BOILERPLATE = /puja\s*\/\s*seva\s*booking/gi;
  const cleanType = (data.type || "").toLowerCase().replace(BOILERPLATE, "");
  const cleanDetails = (data.details || "").toLowerCase().replace(BOILERPLATE, "");
  return cleanType.includes("seva") || cleanDetails.includes("seva");
}

/**
 * Programmatically posts the data to Google Forms with dynamic environmental overrides.
 */
export async function syncToGoogleForm(
  formType: string,
  data: {
    name: string;
    email: string;
    phone: string;
    details: string;
    type: string;
    temple?: string;
    age?: string | number;
    deity?: string;
    whatsapp?: string;
    city?: string;
    feedback?: string;
    contribution?: string | number;
    fee?: string | number;
    dob?: string;
    gotra?: string;
    rashi?: string;
    intent?: string;
    // ✅ ADDED 2026-08-28 — optional, only used by temple_issue_report's
    // now-real, dedicated "Raise Temple Issues" Google Form below, which has
    // District/State/MLA/MP/authority-level columns no other form has. Left
    // undefined for every other caller; nothing about them changes.
    district?: string;
    state?: string;
    mla?: string;
    mp?: string;
    authorityLevel?: string;
  }
) {
  // Deduplication: drop the same submission if fired again within 5 seconds
  if (_isDuplicate(formType, data)) return false;

  // ✅ ADDED (2026-09-03): the shared bot-protection gate — see
  // verifyHuman()'s own extensive comments in turnstile.ts for exactly
  // when this blocks vs. lets a submission through. In short: only a
  // genuine, confirmed-bot token gets rejected here; any kind of
  // "verification unavailable" (not configured, network hiccup, etc.)
  // always lets a real devotee's submission proceed exactly as before
  // this feature existed.
  if (!(await verifyHuman())) {
    console.warn(`[Google Forms Sync]: Submission blocked for ${formType} — failed bot verification.`);
    return false;
  }

  const config = getSyncConfig(formType);
  if (!config.isEnabled) {
    console.log(`[Google Forms Sync]: Skipping, disabled for ${formType}`);
    return false;
  }

  const env = await fetchEnvConfig();
  let finalFormUrl = config.formUrl;

  // ✅ FIX 3: Seva now always has a fallback URL (seva_booking config above)
  // Previously: Seva only got a URL if env.GOOGLE_FORM_ID_SEVA existed (it never does on GitHub Pages)
  // Now: We check if it's a seva type and route it to seva_booking config directly
  if (formType === "darshan_certificate") {
    finalFormUrl = buildFormResponseUrl(env.GOOGLE_FORM_ID_CERTIFICATE, config.formUrl);
  } else if (formType === "puja_booking" || formType === "puja" || formType === "seva" || formType === "seva_booking") {
    // ✅ AUDIT FIX: use the shared, boilerplate-safe detector (see
    // _isSevaSubmission above) instead of a raw substring test, so real
    // Puja bookings no longer get swept into the Seva form just because
    // the fixed "Puja/Seva Booking" label text contains "seva".
    const isSeva = _isSevaSubmission(formType, data);
    if (isSeva) {
      // ✅ Always use seva_booking config URL — no longer depends on env variable
      const sevaConfig = DEFAULT_CONFIGS["seva_booking"];
      finalFormUrl = buildFormResponseUrl(env.GOOGLE_FORM_ID_SEVA, sevaConfig.formUrl);
    } else {
      finalFormUrl = buildFormResponseUrl(env.GOOGLE_FORM_ID_PUJA, config.formUrl);
    }
  } else if (formType === "devotee_support" || formType === "customer_contact") {
    const targetId = env.GOOGLE_FORM_ID_INQUIRY || env.GOOGLE_FORM_ID_SUPPORT;
    finalFormUrl = buildFormResponseUrl(targetId, config.formUrl);
  }

  try {
    const formData = new FormData();

    const currentDateTime = new Date().toLocaleDateString("en-IN");

    let extractedTemple = data.temple || "";
    if (!extractedTemple) {
      const match = data.type.match(/\(([^)]+)\)/);
      if (match) {
        extractedTemple = match[1];
      } else if (data.type.includes("Kashi")) {
        extractedTemple = "Kashi Vishwanath Temple, Varanasi";
      } else if (data.type.includes("Jagannath")) {
        extractedTemple = "Shree Jagannath Temple, Puri";
      } else if (data.type.includes("Kedarnath")) {
        extractedTemple = "Kedarnath Temple, Himalayas";
      } else if (data.type.includes("Siddhivinayak")) {
        extractedTemple = "Siddhivinayak Temple, Mumbai";
      } else {
        extractedTemple = "Shree Jagannath Temple, Puri";
      }
    }

    if (formType === "darshan_certificate") {
      const nameKey = formatEntryKey(env.ENTRY_CERT_NAME) || config.mappedFields.nameKey;
      const emailKey = formatEntryKey(env.ENTRY_CERT_EMAIL) || config.mappedFields.emailKey;
      const phoneKey = formatEntryKey(env.ENTRY_CERT_PHONE) || config.mappedFields.phoneKey;
      const detailsKey = config.mappedFields.detailsKey;
      const typeKey = config.mappedFields.typeKey;

      if (nameKey) formData.append(nameKey, data.name);
      if (emailKey) formData.append(emailKey, data.email);
      if (phoneKey) formData.append(phoneKey, data.phone);
      if (typeKey) formData.append(typeKey, data.type);

      const templeKey = formatEntryKey(env.ENTRY_CERT_TEMPLE) || "entry.1039747104";
      const ageKey = formatEntryKey(env.ENTRY_CERT_AGE) || "entry.1814348131";
      const deityKey = formatEntryKey(env.ENTRY_CERT_DEITY) || "entry.1040320665";
      const whatsappKey = formatEntryKey(env.ENTRY_CERT_WHATSAPP) || "entry.158901999";
      const cityKey = formatEntryKey(env.ENTRY_CERT_CITY) || "entry.410448525";
      const feedbackKey = formatEntryKey(env.ENTRY_CERT_FEEDBACK) || "entry.790841631";
      const contributionKey = formatEntryKey(env.ENTRY_CERT_CONTRIBUTION) || "entry.857371541";

      if (templeKey && extractedTemple) formData.append(templeKey, extractedTemple);
      if (ageKey && data.age !== undefined) formData.append(ageKey, String(data.age));
      if (deityKey && data.deity) formData.append(deityKey, data.deity);
      if (whatsappKey) formData.append(whatsappKey, data.whatsapp || data.phone);
      if (cityKey && data.city) formData.append(cityKey, data.city);
      if (feedbackKey && data.feedback) formData.append(feedbackKey, data.feedback);
      if (contributionKey && data.contribution !== undefined) formData.append(contributionKey, String(data.contribution));
      if (detailsKey) formData.append(detailsKey, data.details);

    } else if (formType === "puja_booking" || formType === "puja" || formType === "seva" || formType === "seva_booking") {
      // ✅ AUDIT FIX: same shared, boilerplate-safe detector as the URL
      // section above. This is also what makes AuthDashboard's Temple
      // Redevelopment Divine Contribution and TemplateBazaar's Bazaar/Seva
      // checkout (both of which call syncToGoogleForm("seva_booking", ...)
      // and already pass gotra/rashi/fee expecting them to land in their
      // own dedicated Sheet columns) actually reach this rich per-field
      // mapping below, instead of silently falling through to the bare
      // name/email/phone/details/type-only branch further down — which is
      // why Gotra, Rashi, and Dakshina Offer were showing up blank or only
      // buried inside the Intent text for those two flows.
      const isSeva = _isSevaSubmission(formType, data);

      // ✅ FIX 4: Seva section no longer requires env variables to work.
      // Previously it checked: if (isSeva && (env.GOOGLE_FORM_ID_SEVA || ...))
      // This condition ALWAYS failed on GitHub Pages because env is always empty {}.
      // Now it simply checks isSeva — and uses hardcoded fallback entry IDs.
      if (isSeva) {
        // ── Seva mapping — VERIFIED against the real live Google Form ────
        // ✅ FIX 7: entry IDs decoded from the user's real prefilled link,
        // confirmed against the real sheet's actual column order (Seva
        // Selected, Dakshina Offer, Devotee Full Name, DOB, Gotra, Rashi,
        // Phone, Email, Sankalpa Intent).
        const nameKey = formatEntryKey(env.ENTRY_SEVA_NAME) || "entry.1165779906";   // Devotee Full Name
        const emailKey = formatEntryKey(env.ENTRY_SEVA_EMAIL) || "entry.1681028168"; // Email Address
        const phoneKey = formatEntryKey(env.ENTRY_SEVA_PHONE) || "entry.1364177955"; // Phone Number
        const typeKey = formatEntryKey(env.ENTRY_SEVA_SEVA_TYPE) || formatEntryKey(env.ENTRY_SEVA_SELECTED) || "entry.898437491"; // Seva Selected
        const phoneVal = data.phone;
        const dateKey = formatEntryKey(env.ENTRY_SEVA_DATE) || "entry.1359512036";   // DOB (only date-shaped field on this form)
        const notesKey = formatEntryKey(env.ENTRY_SEVA_NOTES) || "entry.1455477698"; // Sankalpa Intent
        const dakshinaKey = formatEntryKey(env.ENTRY_SEVA_DAKSHINA) || "entry.1055169507"; // Dakshina Offer
        const dobKey = formatEntryKey(env.ENTRY_SEVA_DOB) || dateKey;                // same real column as dateKey
        const gotraKey = formatEntryKey(env.ENTRY_SEVA_GOTRA) || "entry.1015695340"; // Gotra
        const rashiKey = formatEntryKey(env.ENTRY_SEVA_RASHI) || "entry.2024101892"; // Moon Sign (Rashi)
        const intentKey = formatEntryKey(env.ENTRY_SEVA_INTENT) || notesKey;

        _warnIfDuplicateEntryKeys("seva", {
          "Devotee Name": nameKey, "Seva Selected": typeKey, "Dakshina Offer": dakshinaKey,
          "DOB": dobKey, "Gotra": gotraKey, "Rashi": rashiKey, "Phone": phoneKey,
          "Email": emailKey, "Sankalpa Intent": intentKey,
        });

        if (nameKey) formData.append(nameKey, data.name);
        if (emailKey) formData.append(emailKey, data.email);
        if (phoneKey) formData.append(phoneKey, phoneVal);
        if (typeKey) formData.append(typeKey, data.type.replace("Puja/Seva Booking - ", ""));
        if (dakshinaKey && data.fee !== undefined) formData.append(dakshinaKey, `₹${data.fee}`);
        else if (dakshinaKey && data.contribution !== undefined) formData.append(dakshinaKey, `₹${data.contribution}`);
        if (dobKey && data.dob) formData.append(dobKey, data.dob);
        else if (dateKey && dateKey !== dobKey) formData.append(dateKey, currentDateTime);
        if (gotraKey && data.gotra) formData.append(gotraKey, data.gotra);
        if (rashiKey && data.rashi) formData.append(rashiKey, data.rashi);
        const sevaIntentParts = [
          data.intent,
          extractedTemple ? `Temple: ${extractedTemple}` : "",
          data.whatsapp && data.whatsapp !== phoneVal ? `WhatsApp: ${data.whatsapp}` : "",
          data.city ? `City: ${data.city}` : "",
          data.details,
        ].filter((v) => v && v.trim()).join(" | ");
        if (intentKey) formData.append(intentKey, sevaIntentParts || data.details || "");

      } else {
        // ── Puja mapping — FIX 8 (2026-08-14): entry IDs below are the ones
        // proven correct against a real submitted row the user showed in the
        // live Form_Responses sheet — see the full derivation and why the
        // previous "AUDIT (re-confirmed Aug 2026...)" comment here was wrong
        // in DEFAULT_CONFIGS.puja_booking above. Short version: Phone,
        // Email, and Rashi were cross-wired in a 3-way rotation (Phone's ID
        // actually wrote to the Moon Sign column, Email's ID actually wrote
        // to the Phone column, Rashi's ID actually wrote to the Email
        // column) — which is also why confirmation/pending emails stopped
        // sending entirely: Triggers.gs was correctly reading the "Email
        // Address" column, but a phone number (or nothing, for Counselling
        // bookings that never set data.rashi) was sitting there instead.
        // This also keeps FIX 6's earlier fix intact (DOB/Gotra/Rashi/
        // Intent/Fee previously had no fallback ID at all and were silently
        // never sent).
        const nameKey = formatEntryKey(env.ENTRY_PUJA_NAME) || "entry.1507238374";   // Devotee Full Name
        const emailKey = formatEntryKey(env.ENTRY_PUJA_EMAIL) || "entry.21123129";   // Email Address — corrected, proven by real submitted row (2026-08-14)
        const phoneKey = formatEntryKey(env.ENTRY_PUJA_PHONE) || "entry.1322524758"; // Phone Number — corrected, proven by real submitted row (2026-08-14)
        const typeKey = formatEntryKey(env.ENTRY_PUJA_PUJA_TYPE) || formatEntryKey(env.ENTRY_PUJA_SELECTED) || "entry.898437491"; // Puja Selected
        const phoneVal = data.phone;
        const dateKey = formatEntryKey(env.ENTRY_PUJA_DATE) || "entry.1732902395";   // DOB (Planetary Calculation) column doubles as the only date field on this form
        const notesKey = formatEntryKey(env.ENTRY_PUJA_NOTES) || "entry.1050217824"; // Sankalpa Intent
        const dakshinaKey = formatEntryKey(env.ENTRY_PUJA_DAKSHINA) || "entry.246622329"; // Dakshina Offer
        const dobKey = formatEntryKey(env.ENTRY_PUJA_DOB) || dateKey;                // DOB (Planetary Calculation) — same real column as dateKey
        const gotraKey = formatEntryKey(env.ENTRY_PUJA_GOTRA) || "entry.1568376464"; // Gotra
        const rashiKey = formatEntryKey(env.ENTRY_PUJA_RASHI) || "entry.1096450797"; // Moon Sign (Rashi) — corrected, proven by real submitted row (2026-08-14)
        const intentKey = formatEntryKey(env.ENTRY_PUJA_INTENT) || notesKey;
        // This form has no separate WhatsApp/City fields of its own — the
        // real 9 columns are exactly: Puja Selected, Dakshina Offer,
        // Devotee Full Name, DOB, Gotra, Rashi, Phone, Email, Sankalpa
        // Intent. WhatsApp/City are folded into Sankalpa Intent below
        // instead of being sent to an unrelated column.

        _warnIfDuplicateEntryKeys("puja", {
          "Devotee Name": nameKey, "Puja Selected": typeKey, "Dakshina Offer": dakshinaKey,
          "DOB": dobKey, "Gotra": gotraKey, "Rashi": rashiKey, "Phone": phoneKey,
          "Email": emailKey, "Sankalpa Intent": intentKey,
        });

        if (nameKey) formData.append(nameKey, data.name);
        if (emailKey) formData.append(emailKey, data.email);
        if (phoneKey) formData.append(phoneKey, phoneVal);
        // Temple has no dedicated column in this sheet (it only has "Puja
        // Selected" and "Dakshina Offer") — per the mapping rule, anything
        // without a real destination column belongs in the Sankalpa Intent
        // text, not in an unrelated field, so it's folded in below instead
        // of being appended under a temple-shaped key.
        if (typeKey) formData.append(typeKey, data.type.replace("Puja/Seva Booking - ", ""));
        if (dakshinaKey && data.fee !== undefined) formData.append(dakshinaKey, `₹${data.fee}`);
        else if (dakshinaKey && data.contribution !== undefined) formData.append(dakshinaKey, `₹${data.contribution}`);
        if (dobKey && data.dob) formData.append(dobKey, data.dob);
        else if (dateKey && dateKey !== dobKey) formData.append(dateKey, currentDateTime);
        if (gotraKey && data.gotra) formData.append(gotraKey, data.gotra);
        if (rashiKey && data.rashi) formData.append(rashiKey, data.rashi);
        // Sankalpa Intent — the one true "catch-all" column. Composed from
        // every value that either has no dedicated column of its own
        // (temple, whatsapp/city context, payment/ref context supplied via
        // data.details) or that benefits from being restated in full
        // sentence form even though it also has its own column (the
        // devotee's personal wish/intent).
        const intentParts = [
          data.intent,
          extractedTemple ? `Temple: ${extractedTemple}` : "",
          data.whatsapp && data.whatsapp !== phoneVal ? `WhatsApp: ${data.whatsapp}` : "",
          data.city ? `City: ${data.city}` : "",
          data.details,
        ].filter((v) => v && v.trim()).join(" | ");
        if (intentKey) formData.append(intentKey, intentParts || data.details || "");
        if (config.mappedFields.detailsKey && intentKey !== config.mappedFields.detailsKey) {
          formData.append(config.mappedFields.detailsKey, data.details);
        }
      }

    } else if (formType === "subscription_signup") {
      // Referral & Cashback dedicated form (see DEFAULT_CONFIGS.subscription_signup
      // above for the real column mapping, decoded 2026-08-28). Geography now has
      // its own column via geographyKey; everything with no dedicated column
      // (plan, billing, price, payment status, ref ID) still lands in detailsKey,
      // same "one true catch-all column" convention used elsewhere in this file.
      formData.append(config.mappedFields.nameKey, data.name);
      formData.append(config.mappedFields.emailKey, data.email || "");
      formData.append(config.mappedFields.phoneKey, data.phone || "");
      if (config.mappedFields.typeKey) formData.append(config.mappedFields.typeKey, data.type || "");
      if (config.mappedFields.geographyKey && data.city) {
        formData.append(config.mappedFields.geographyKey, data.city);
      }
      formData.append(config.mappedFields.detailsKey, data.details || "");

    } else if (formType === "prasad_testimony") {
      // Testimony: name, location, service/puja, story, rating
      formData.append(config.mappedFields.nameKey, data.name);
      formData.append(config.mappedFields.emailKey, data.email || "");
      formData.append(config.mappedFields.phoneKey, data.phone || "");
      formData.append(config.mappedFields.detailsKey, data.details);
      formData.append(config.mappedFields.typeKey, data.type || "5");

    } else if (formType === "temple_issue_report") {
      // Dedicated "Raise Temple Issues" Google Form (see DEFAULT_CONFIGS.
      // temple_issue_report above for the full field-order derivation,
      // decoded 2026-08-28). The base 5 (name/email/phone/details/type) use
      // config.mappedFields exactly like every other form; the 9 fields
      // this form has that no other form does (temple/committee name,
      // city, district, state, issue type, MLA, MP, WhatsApp, and
      // authority level) are appended directly below using their own
      // entry IDs — same pattern as darshan_certificate's extra columns.
      const templeKey = "entry.1758561377";
      const cityKey = "entry.36575273";
      const districtKey = "entry.1728181807";
      const stateKey = "entry.1636330115";
      const issueTypeKey = "entry.1504870399";
      const mlaKey = "entry.750912903";
      const mpKey = "entry.280451135";
      const whatsappKey = "entry.1512691482";
      const authorityKey = "entry.1074610489";

      formData.append(config.mappedFields.nameKey, data.name);
      formData.append(config.mappedFields.emailKey, data.email || "");
      formData.append(config.mappedFields.phoneKey, data.phone || "");
      formData.append(config.mappedFields.detailsKey, data.details || "");
      if (config.mappedFields.typeKey) formData.append(config.mappedFields.typeKey, data.type || "");
      if (data.temple) formData.append(templeKey, data.temple);
      if (data.city) formData.append(cityKey, data.city);
      if (data.district) formData.append(districtKey, data.district);
      if (data.state) formData.append(stateKey, data.state);
      if (data.feedback) formData.append(issueTypeKey, data.feedback);
      if (data.mla) formData.append(mlaKey, data.mla);
      if (data.mp) formData.append(mpKey, data.mp);
      if (data.whatsapp) formData.append(whatsappKey, data.whatsapp);
      if (data.authorityLevel) formData.append(authorityKey, data.authorityLevel);

    } else if (formType === "prayer_wall") {
      // Dedicated Prayer Wall Google Form (see DEFAULT_CONFIGS.prayer_wall
      // above for the entry-ID derivation). Location and Divine Contribution
      // now have real columns of their own via geographyKey/contributionKey
      // — previously both were only ever embedded as text inside the
      // message when this shared the Testimony form's 5 plain fields.
      formData.append(config.mappedFields.nameKey, data.name || "Devotee (Prayer Wall)");
      if (config.mappedFields.geographyKey && data.city) {
        formData.append(config.mappedFields.geographyKey, data.city);
      }
      if (data.email) formData.append(config.mappedFields.emailKey, data.email);
      if (data.phone) formData.append(config.mappedFields.phoneKey, data.phone);
      if (config.mappedFields.contributionKey && data.contribution !== undefined) {
        const contributionVal =
          typeof data.contribution === "number" || /^\d+(\.\d+)?$/.test(String(data.contribution))
            ? `₹${data.contribution}`
            : String(data.contribution); // already-formatted, e.g. "Pending — Awaiting Decision (₹100)" or "₹100 via UPI"
        formData.append(config.mappedFields.contributionKey, contributionVal);
      }
      // No dedicated "type" column on this form (see typeKey note above) —
      // the type label is folded in as a bracket tag ahead of the message
      // text instead, the same convention already used for [Ref: ...] by
      // the callers in SacredMoments.tsx.
      formData.append(config.mappedFields.detailsKey, data.type ? `[${data.type}] ${data.details}` : data.details);

    } else if (formType === "devotee_support" || formType === "customer_contact") {
      const nameKey = formatEntryKey(env.ENTRY_INQUIRY_NAME) || formatEntryKey(env.ENTRY_SUPPORT_NAME) || config.mappedFields.nameKey;
      const emailKey = formatEntryKey(env.ENTRY_INQUIRY_EMAIL) || formatEntryKey(env.ENTRY_SUPPORT_EMAIL) || config.mappedFields.emailKey;
      const phoneKey = formatEntryKey(env.ENTRY_INQUIRY_PHONE) || formatEntryKey(env.ENTRY_SUPPORT_PHONE) || config.mappedFields.phoneKey;
      const subjectKey = formatEntryKey(env.ENTRY_INQUIRY_SUBJECT) || formatEntryKey(env.ENTRY_SUPPORT_TYPE) || config.mappedFields.typeKey;
      const messageKey = formatEntryKey(env.ENTRY_INQUIRY_MESSAGE) || formatEntryKey(env.ENTRY_SUPPORT_MESSAGE) || config.mappedFields.detailsKey;

      if (nameKey) formData.append(nameKey, data.name);
      if (emailKey) formData.append(emailKey, data.email);
      if (phoneKey) formData.append(phoneKey, data.phone);
      if (subjectKey && data.type) formData.append(subjectKey, data.type);
      if (messageKey && data.details) formData.append(messageKey, data.details);

    } else {
      formData.append(config.mappedFields.nameKey, data.name);
      formData.append(config.mappedFields.emailKey, data.email);
      formData.append(config.mappedFields.phoneKey, data.phone);
      formData.append(config.mappedFields.detailsKey, data.details);
      if (config.mappedFields.typeKey) {
        formData.append(config.mappedFields.typeKey, data.type);
      }
    }

    console.log(`[Google Forms Sync]: Synchronizing form to URL: ${finalFormUrl}`);

    const delivered = await postFormWithRetry(finalFormUrl, _formDataToFields(formData));

    if (delivered) {
      console.log(`[Google Forms Sync]: Submission completed successfully to Google Drive & Forms.`);
    } else {
      console.log(`[Google Forms Sync]: Submission queued for delivery once back online.`);
    }
    return true;

  } catch (error) {
    console.error(`[Google Forms Sync Error]: Failed submitting to ${finalFormUrl}`, error);
    return false;
  }
}

/**
 * ─── "Submit now, finalize later" pattern ──────────────────────────────────
 *
 * Google Forms' /formResponse endpoint is write-only and append-only — there
 * is no API to edit a row that was already submitted. So for any flow where
 * the user fills a form, THEN separately decides to skip or pay a divine contribution,
 * we can't literally "update" the first row once the divine contribution outcome is
 * known.
 *
 * Instead we follow one rule everywhere a divine contribution/payment decision happens
 * after the main form submit:
 *
 *   1. The moment the devotee clicks the main submit button, we POST the
 *      full profile ONCE with a stable Ref ID and a divine contribution status of
 *      "Pending — Awaiting Decision". This guarantees the lead is captured
 *      even if the devotee closes the tab before deciding on a divine contribution.
 *   2. The moment the divine contribution decision is final (Skip clicked, or UPI
 *      payment confirmed), we POST exactly ONE more row — same Ref ID, same
 *      profile, but with the divine contribution field corrected to "Skipped" or the
 *      real "₹<amount>" — and a status of "Final".
 *
 * This is technically two POSTs (Google Forms can't avoid that), but it is
 * ONE true submission event from the devotee's point of view: nothing is
 * submitted twice for the same step, and the sheet can always be filtered/
 * sorted by Ref ID + Status to find the authoritative final row. Every
 * caller of this helper must reuse the SAME refId for both calls.
 *
 * Usage:
 *   const refId = makeSubmissionRef("DEV");
 *   await postPendingRow(formUrl, refId, buildPayload(refId, "Pending — Awaiting Decision"));
 *   // ...later, once divine contribution outcome is known...
 *   await postFinalRow(formUrl, refId, buildPayload(refId, "Skipped" | `₹${amount}`));
 */

// Uppercase letters + digits — no lookalike-ambiguous characters (0/O, 1/I/L)
// so a devotee reading this off a screen to type into a WhatsApp message, or
// a team member reading it off a bank/UPI statement, can't misread it.
const REF_SUFFIX_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * Shared random suffix for every ref-ID generator in this app (both this
 * file's makeSubmissionRef, and the flatter PREFIX-XXXXXX generators used
 * directly in BookNowWizard.tsx, TemplateBazaar.tsx, SubscriptionSignup.tsx,
 * DevoteeExperiences.tsx, and AuthDashboard.tsx) — one implementation, so
 * every refId in the app has the exact same uniqueness guarantee instead of
 * five separate copies of similar-but-not-identical random logic.
 * length=6 over this 32-character alphabet gives 32^6 ≈ 1.07 billion
 * possible values (versus the previous 900,000 with digits-only), while
 * staying compatible with Triggers.gs's existing ref-extraction regex
 * (`[A-Za-z0-9][A-Za-z0-9_-]{2,}`), which already accepts letters and was
 * never digits-only to begin with.
 */
export function randomRefSuffix(length: number = 6): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += REF_SUFFIX_ALPHABET[Math.floor(Math.random() * REF_SUFFIX_ALPHABET.length)];
  }
  return out;
}

export function makeSubmissionRef(prefix: string): string {
  return `SDR-${prefix}-${randomRefSuffix()}`;
}

// Guards so a given refId's "pending" or "final" row is ever sent only once,
// even if React re-renders, double-clicks, or effect re-fires occur.
const _pendingSentRefs = new Set<string>();
const _finalSentRefs = new Set<string>();

/**
 * Posts the FIRST row for a submission — fired the instant the user clicks
 * the main "Submit and Proceed" / "Submit Message" / "Proceed to Offering"
 * button. Divine Contribution/payment field should be set to "Pending — Awaiting
 * Decision" in the payload before calling this.
 */
export async function postPendingRow(
  formUrl: string,
  refId: string,
  payload: Record<string, string>
): Promise<boolean> {
  if (_pendingSentRefs.has(refId)) {
    console.log(`[Google Forms Sync]: Pending row already sent for ${refId}, skipping duplicate.`);
    return false;
  }
  // ✅ ADDED (2026-09-03): same shared gate as syncToGoogleForm above —
  // appropriate here since this fires BEFORE any payment exists yet
  // (it's the initial "devotee started this booking" record). Deliberately
  // NOT added to postFinalRow below — that one fires at the moment a real
  // Razorpay payment is confirmed, and blocking that record over a bot
  // check would risk leaving an already-successful payment without a
  // finalized booking, which is a far worse outcome than the redundant
  // protection is worth (Razorpay's own fraud checks already vetted that
  // transaction).
  if (!(await verifyHuman())) {
    console.warn(`[Google Forms Sync]: Pending row blocked for ${refId} — failed bot verification.`);
    return false;
  }
  _pendingSentRefs.add(refId);
  try {
    const delivered = await postFormWithRetry(formUrl, payload);
    console.log(
      delivered
        ? `[Google Forms Sync]: Pending row sent for ${refId}.`
        : `[Google Forms Sync]: Pending row for ${refId} queued for delivery once back online.`
    );
    return true;
  } catch (err) {
    console.error(`[Google Forms Sync Error]: Pending row failed for ${refId}`, err);
    return false;
  }
}

/**
 * Posts the FINAL row for a submission — fired the instant the divine contribution
 * outcome is known (Skip Divine Contribution clicked, or UPI payment confirmed).
 * Divine Contribution/payment field in the payload should already reflect the true
 * outcome ("Skipped" or "₹<amount>").
 */
export async function postFinalRow(
  formUrl: string,
  refId: string,
  payload: Record<string, string>
): Promise<boolean> {
  if (_finalSentRefs.has(refId)) {
    console.log(`[Google Forms Sync]: Final row already sent for ${refId}, skipping duplicate.`);
    return false;
  }
  _finalSentRefs.add(refId);
  try {
    const delivered = await postFormWithRetry(formUrl, payload);
    console.log(
      delivered
        ? `[Google Forms Sync]: Final row sent for ${refId}.`
        : `[Google Forms Sync]: Final row for ${refId} queued for delivery once back online.`
    );
    return true;
  } catch (err) {
    console.error(`[Google Forms Sync Error]: Final row failed for ${refId}`, err);
    return false;
  }
}
