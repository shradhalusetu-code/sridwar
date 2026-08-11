/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface SyncConfig {
  formUrl: string;
  mappedFields: {
    nameKey: string;
    emailKey: string;
    phoneKey: string;
    detailsKey: string;
    typeKey: string;
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
  // ✅ FIX 7 (re-verified): entry IDs below are matched directly against a
  // REAL submitted row visible in the live Form_Responses sheet screenshot —
  // not inferred from a prefilled-link guess. The previous pass here (which
  // cited a "decoded prefilled link") got Email and Phone backwards and put
  // Rashi's ID under Phone as well — three fields cross-wired against each
  // other. Re-derived from the actual sheet row instead, which is unambiguous:
  //   sent → landed in column          → real entry ID
  //   data.name           → "Puja Selected"        → entry.898437491
  //   extractedTemple     → "Dakshina Offer"        → entry.246622329
  //   data.type (details) → "Devotee Full Name"     → entry.1507238374
  //   data.dob            → "DOB (Planetary Calc.)" → entry.1732902395
  //   old phoneKey value  → "Gotra"                 → entry.1568376464
  //   old cityKey value ("Online Devotee") → "Moon Sign (Rashi)" → entry.21123129
  //   old whatsappKey value (=phone)       → "Phone Number"      → entry.1096450797
  //   data.email           → "Email Address"        → entry.1322524758  (this one was NEVER wrong — it was correct before FIX 7 and the last pass broke it)
  //   data.details          → "Sankalpa Intent"      → entry.1050217824
  //
  // ✅ AUDIT (re-confirmed Aug 2026 directly against the live "PUJA" Google
  // Form, https://docs.google.com/forms/d/1CaBtQkUc-XcQorblYVJAag-5n0dRJ6LAQUzT8ZhHqdI):
  // the form's 9 fields, in order, are exactly Puja Selected → Dakshina
  // Offer → Devotee Full Name → DOB (Planetary Calculation) → Gotra →
  // Moon Sign (Rashi) → Phone Number → Email Address → Sankalpa Intent, and
  // its formResponse endpoint id
  // (1FAIpQLSedSW7HeakeLf1uHMBmu7VU94q26HdjL44rFXkPse8yqGrPKw) matches the
  // formUrl below — confirming this config already points at the correct
  // dedicated Puja form and the field order this file assumes is accurate.
  puja_booking: {
    formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSedSW7HeakeLf1uHMBmu7VU94q26HdjL44rFXkPse8yqGrPKw/formResponse",
    mappedFields: {
      nameKey: "entry.1507238374",   // Devotee Full Name
      emailKey: "entry.1322524758",  // Email Address (was wrongly re-mapped to entry.21123129 in the last pass — reverted)
      phoneKey: "entry.1096450797",  // Phone Number (was wrongly re-mapped to entry.1322524758 in the last pass — corrected)
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
  // ✅ FIX 5: Prayer Wall offerings (Seva Hub → "Sacred Moments" → Prayer Wall).
  // Previously this reused the darshan_certificate form/entry IDs as a
  // placeholder (flagged with a "👉 IMPORTANT" comment), so every Prayer Wall
  // submission landed mixed into the Darshan Certificate sheet instead of
  // having a home of its own.
  // Fixed: Prayer Wall now syncs to the same dedicated Prasad & Prayer
  // Testimony form/sheet as `prasad_testimony` above — Prayer Wall messages
  // are devotee testimonials in spirit, and that form already has its own
  // Name / Location / Service / Story / Rating fields, so this is a real
  // destination rather than a placeholder borrowed from an unrelated flow.
  // The `type` field ("Prayer Wall Offering", set by the caller in
  // SevaExperience.tsx) lands in the Rating column, so Prayer Wall rows are
  // easy to tell apart from actual testimonials when reviewing the sheet.
  prayer_wall: {
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
  // ✅ Refer & Earn subscription signups (SubscriptionSignup.tsx) — services,
  // geography, expertise + plan/billing details, captured before the devotee
  // is routed to the payment gateway. No dedicated Google Form/Sheet exists
  // for this yet, so it intentionally reuses the same form/entry IDs as
  // devotee_support for now (its "details" field already carries the full
  // plan/services/geography/expertise summary, so nothing is lost — it just
  // lands in the same sheet as general inquiries until a dedicated Google
  // Form is created).
  // 👉 IMPORTANT: Once you create a dedicated Google Form for this, replace
  //    formUrl and the entry.XXXXXXXXX values below with the real ones.
  subscription_signup: {
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
  // ✅ Refund / Cancellation requests (RefundRequestModal.tsx, triggered from
  // the "All Account Activity" ledger in AuthDashboard.tsx). No dedicated
  // Google Form/Sheet exists for this yet, so — same pattern already used
  // above for subscription_signup — it reuses the devotee_support form for
  // now. Nothing is lost: the `details` field always includes the booking
  // ref, item, amount, and reason, and the `type` field is fixed to
  // "Refund/Cancellation Request" so these rows are easy to filter out from
  // general inquiries in the sheet.
  // 👉 IMPORTANT: Once you create a dedicated Google Form for refund
  //    requests, replace formUrl and the entry.XXXXXXXXX values below.
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
  // Issues With Elected Representatives"). Previously this formType had NO
  // entry here at all, so every submission silently fell through to
  // getSyncConfig's `DEFAULT_CONFIGS.devotee_support` fallback — it still
  // worked, but that fallback was implicit and would have silently changed
  // behaviour for temple issue reports the moment devotee_support's own
  // config was ever edited for an unrelated reason. Giving it its own named
  // entry makes the destination explicit and independently editable. It
  // reuses the devotee_support form/sheet for now (same reuse pattern as
  // subscription_signup and refund_cancellation_request above) — nothing is
  // lost, since `details` always carries the full category/location/issue/
  // recipients block and `type` is fixed to "Temple/Culture Issue Report —
  // <category>" so these rows are easy to filter out from general inquiries.
  // 👉 IMPORTANT: Once you create a dedicated Google Form for temple/culture
  //    issue reports, replace formUrl and the entry.XXXXXXXXX values below.
  temple_issue_report: {
    formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSfBl9CoaY-CLlEhbsNZkiJTBfmyEGj23yLDAo_LpvADfOsKqQ/formResponse",
    mappedFields: {
      nameKey: "entry.898437491",
      emailKey: "entry.969380068",
      phoneKey: "entry.1486488215",
      detailsKey: "entry.1306645637",
      typeKey: "entry.943423993"
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
  }
) {
  // Deduplication: drop the same submission if fired again within 5 seconds
  if (_isDuplicate(formType, data)) return false;

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
        // ── Puja mapping — VERIFIED against a REAL submitted row in the live
        // Form_Responses sheet (the sheet screenshot), not a prefilled-link
        // guess. The immediately-prior fix pass here had Email and Phone
        // swapped, and Rashi's real ID misassigned to Phone as well — see
        // the worked derivation in DEFAULT_CONFIGS.puja_booking above for
        // exactly how each entry ID was matched to its real column. This
        // also keeps FIX 6's earlier bug fixed (DOB/Gotra/Rashi/Intent/Fee
        // previously had no fallback ID at all and were silently never sent).
        const nameKey = formatEntryKey(env.ENTRY_PUJA_NAME) || "entry.1507238374";   // Devotee Full Name
        const emailKey = formatEntryKey(env.ENTRY_PUJA_EMAIL) || "entry.1322524758"; // Email Address
        const phoneKey = formatEntryKey(env.ENTRY_PUJA_PHONE) || "entry.1096450797"; // Phone Number
        const typeKey = formatEntryKey(env.ENTRY_PUJA_PUJA_TYPE) || formatEntryKey(env.ENTRY_PUJA_SELECTED) || "entry.898437491"; // Puja Selected
        const phoneVal = data.phone;
        const dateKey = formatEntryKey(env.ENTRY_PUJA_DATE) || "entry.1732902395";   // DOB (Planetary Calculation) column doubles as the only date field on this form
        const notesKey = formatEntryKey(env.ENTRY_PUJA_NOTES) || "entry.1050217824"; // Sankalpa Intent
        const dakshinaKey = formatEntryKey(env.ENTRY_PUJA_DAKSHINA) || "entry.246622329"; // Dakshina Offer
        const dobKey = formatEntryKey(env.ENTRY_PUJA_DOB) || dateKey;                // DOB (Planetary Calculation) — same real column as dateKey
        const gotraKey = formatEntryKey(env.ENTRY_PUJA_GOTRA) || "entry.1568376464"; // Gotra
        const rashiKey = formatEntryKey(env.ENTRY_PUJA_RASHI) || "entry.21123129";   // Moon Sign (Rashi)
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

    } else if (formType === "prasad_testimony") {
      // Testimony: name, location, service/puja, story, rating
      formData.append(config.mappedFields.nameKey, data.name);
      formData.append(config.mappedFields.emailKey, data.email || "");
      formData.append(config.mappedFields.phoneKey, data.phone || "");
      formData.append(config.mappedFields.detailsKey, data.details);
      formData.append(config.mappedFields.typeKey, data.type || "5");

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

export function makeSubmissionRef(prefix: string): string {
  return `SDR-${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
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
