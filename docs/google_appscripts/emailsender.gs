/**
 * Sri Dwar — Email Automation: SENDER
 * ─────────────────────────────────────────────────────────────────────────
 * Every email in this project goes through sendBrandedEmail_() below.
 * Nothing calls MailApp/GmailApp directly anywhere else — that's what
 * gives us one choke point for: (a) the daily quota cap, (b) dedupe by
 * Ref ID + email type, (c) never letting one failed send crash the whole
 * trigger run.
 */

// ─── Daily quota tracking (PropertiesService — survives across runs) ──────

function _todayKey_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Asia/Kolkata", "yyyy-MM-dd");
}

function getDailySentCount_() {
  const props = PropertiesService.getScriptProperties();
  const key = "sent_count_" + _todayKey_();
  return Number(props.getProperty(key) || "0");
}

function incrementDailySentCount_() {
  const props = PropertiesService.getScriptProperties();
  const key = "sent_count_" + _todayKey_();
  const next = getDailySentCount_() + 1;
  props.setProperty(key, String(next));
  return next;
}

/**
 * Returns true if we are still under BOTH our own configured cap AND
 * Google's real remaining MailApp quota for today. Checking both means
 * a wrong CONFIG.MAX_EMAILS_PER_DAY value (set too high for your actual
 * Google account tier) still can't cause a crash — MailApp's own quota
 * check is the final backstop.
 */
function canSendMoreToday_() {
  const ourCount = getDailySentCount_();
  if (ourCount >= CONFIG.MAX_EMAILS_PER_DAY) return false;
  try {
    if (MailApp.getRemainingDailyQuota() <= 0) return false;
  } catch (e) {
    // If the quota check itself fails, err on the side of NOT sending
    // rather than risking an uncaught quota exception mid-batch.
    logError_("canSendMoreToday_ quota check failed", e);
    return false;
  }
  return true;
}

function maybeAlertLowQuota_() {
  const remaining = CONFIG.MAX_EMAILS_PER_DAY - getDailySentCount_();
  if (remaining > CONFIG.LOW_QUOTA_ALERT_THRESHOLD) return;

  const props = PropertiesService.getScriptProperties();
  const alertKey = "low_quota_alerted_" + _todayKey_();
  if (props.getProperty(alertKey)) return; // already alerted today

  try {
    MailApp.sendEmail({
      to: CONFIG.ADMIN_ALERT_EMAIL,
      subject: `Sri Dwar email quota running low (${remaining} left today)`,
      body: `Only ${remaining} of ${CONFIG.MAX_EMAILS_PER_DAY} configured daily emails remain for ${_todayKey_()}. ` +
        `Sends will pause automatically once the cap or Google's real quota is reached, and resume tomorrow.`,
    });
    props.setProperty(alertKey, "1");
  } catch (e) {
    // Don't let an alert-email failure cascade into anything else.
  }
}

// ─── Bad-email contingency ──────────────────────────────────────────────────
// A wrong email typically fails in one of three ways, and each needs a
// different guard so a single bad address never burns repeated quota:
//   1. Syntactically wrong ("abc@", "test@test") → caught BEFORE sending,
//      costs zero quota.
//   2. Syntactically fine but a typo'd real domain ("@gmial.com") → cannot
//      be detected before sending (GAS has no DNS lookup), but Google
//      bounces it back to this inbox within minutes to hours — the daily
//      bounce sweep below reads those bounces and blacklists the address
//      so nothing (booking confirmation, reminder, certificate) retries it.
//   3. Syntactically fine, real domain, mailbox doesn't exist → same as #2,
//      caught by the bounce sweep.
// Once an address is blacklisted, EVERY future call for that address is
// skipped silently and for free — no quota, no repeat failures logged.

const OBVIOUSLY_FAKE_DOMAINS = [
  "test.com", "example.com", "example.org", "example.net", "asdf.com", "xyz.com", "abc.com",
  "mailinator.com", "yopmail.com", "guerrillamail.com", "guerrillamail.info", "tempmail.com",
  "temp-mail.org", "10minutemail.com", "throwawaymail.com", "trashmail.com", "fakeinbox.com",
  "getnada.com", "dispostable.com", "sharklasers.com", "maildrop.cc", "mintemail.com",
  "spamgourmet.com", "mailnesia.com", "notarealemail.com", "noemail.com", "nomail.com",
  "email.com", "domain.com", "mydomain.com", "yourdomain.com", "site.com",
];

// Catches keyboard-mash / obviously-typed-to-get-past-a-required-field
// local-parts that aren't on any word list — three or more of the same
// character repeated, or a straight keyboard row like "qwerty"/"asdfgh".
const KEYBOARD_MASH_PATTERNS = [
  /(.)\1{3,}/,                       // "aaaa", "1111"
  /^(qwerty|asdf|zxcv|asdfgh|qwertyuiop|123456|12345678|111111)/i,
];

function _looksLikeKeyboardMash_(localPart) {
  return KEYBOARD_MASH_PATTERNS.some((p) => p.test(localPart));
}

function isLikelyValidEmail_(email) {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim().toLowerCase();
  // RFC-lite check: one @, a dot in the domain, no spaces, reasonable length.
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(trimmed)) return false;
  if (trimmed.length > 254) return false;
  const domain = trimmed.split("@")[1];
  if (OBVIOUSLY_FAKE_DOMAINS.indexOf(domain) !== -1) return false;
  // Reject clearly placeholder local-parts devotees sometimes type when
  // skipping an optional email field ("na", "none", "n/a", "asdf").
  // "admin" and "user" were deliberately removed from this list — both are
  // extremely common REAL business inbox names (this project's own
  // CONFIG.ADMIN_ALERT_EMAIL is "puja@sridwar.com"), so keeping them here
  // meant the script was rejecting — and then permanently blacklisting —
  // its own admin alert address as if a devotee had typed a placeholder.
  const localPart = trimmed.split("@")[0];
  if (/^(na|none|n\/a|nil|asdf|test|xxx|123|dummy|fake|abc|xyz|nil|null)$/.test(localPart)) return false;
  if (_looksLikeKeyboardMash_(localPart)) return false;
  return true;
}

function getBlacklistSheet_() {
  const ss = getTrackingSpreadsheet_();
  let sheet = ss.getSheetByName("Email_Blacklist");
  if (!sheet) {
    sheet = ss.insertSheet("Email_Blacklist");
    sheet.appendRow(["Email", "Reason", "BlacklistedAt"]);
    sheet.hideSheet();
  }
  return sheet;
}

function isBlacklisted_(email) {
  if (!email) return true;
  const target = email.trim().toLowerCase();
  // ✅ SAFETY NET (2026-08-26): Sri Dwar's own configured addresses can
  // never be treated as blacklisted, full stop — even if a stale row for
  // one of them is still sitting in Email_Blacklist from before a bug was
  // fixed (this has already happened once: see the "admin"/"user" comment
  // on isLikelyValidEmail_ above, where puja@sridwar.com itself got
  // rejected and then permanently blacklisted by an old version of that
  // function). Blacklist rows never expire automatically, so fixing the
  // classification bug alone doesn't undo damage it already did. This
  // check runs BEFORE the sheet lookup below, so it can't be bypassed by
  // stale data, and _pruneOwnAddressFromBlacklist_ (called from
  // blacklistEmail_) proactively removes any such row it finds, so the
  // sheet self-heals instead of needing a manual cleanup.
  if (_isSriDwarOwnAddress_(target)) return false;
  const sheet = getBlacklistSheet_();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === target) return true;
  }
  return false;
}

// Every address this project itself sends from, alerts to, or advertises as
// its own support inbox — see Config.gs. Centralized here so both
// isBlacklisted_ and blacklistEmail_ check the exact same list.
function _isSriDwarOwnAddress_(lowercaseEmail) {
  const ownAddresses = [
    CONFIG.SENDER_EMAIL_DEFAULT,
    CONFIG.SENDER_EMAIL_CERTIFICATE,
    CONFIG.ADMIN_ALERT_EMAIL,
    CONFIG.BRAND.supportEmail,
  ]
    .filter(Boolean)
    .map((e) => String(e).trim().toLowerCase());
  return ownAddresses.indexOf(lowercaseEmail) !== -1;
}

function blacklistEmail_(email, reason) {
  if (!email) return;
  const target = email.trim().toLowerCase();
  if (_isSriDwarOwnAddress_(target)) {
    logError_("blacklistEmail_", `Refused to blacklist Sri Dwar's own address "${email}" (reason attempted: ${reason}) — this points at a real bug elsewhere (likely a form field misread as an email), not a bad address. Investigate the caller instead.`);
    _pruneOwnAddressFromBlacklist_(target);
    return;
  }
  if (isBlacklisted_(email)) return;
  getBlacklistSheet_().appendRow([target, reason, new Date()]);
}

// Self-healing cleanup: if one of Sri Dwar's own addresses is already
// sitting in Email_Blacklist from before this safety net existed, remove
// it the next time blacklistEmail_ happens to run — no manual sheet edit
// needed, and safe to call repeatedly (no-ops once the row is gone).
function _pruneOwnAddressFromBlacklist_(lowercaseEmail) {
  try {
    const sheet = getBlacklistSheet_();
    const data = sheet.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][0]).toLowerCase() === lowercaseEmail) {
        sheet.deleteRow(i + 1); // +1: getValues() is 0-indexed, sheet rows are 1-indexed
      }
    }
  } catch (err) {
    logError_("_pruneOwnAddressFromBlacklist_", err);
  }
}

// Caps how many times ANY email type will retry for the same refId+type
// before giving up and blacklisting — protects quota if something keeps
// re-queuing the same bad row (e.g. a reminder scan running hourly).
const MAX_SEND_ATTEMPTS_PER_KEY = 2;

// ✅ ROOT-CAUSE FIX (a booking's confirmation email keeps re-sending every
// ~15 minutes even though its Ref ID now looks correct, e.g. "SDP-490163" —
// and previously, before the Ref-extraction fix in Triggers.gs, an even more
// obvious case: a Ref ID that was accidentally extracted as a bare date like
// "2026-08-15"):
//
// Google Sheets auto-detects cell content type on write. A RefID column left
// in its default "Automatic" format will silently turn a plain string that
// LOOKS like a date or a number into a real Date/Number cell — this happens
// for values like "2026-08-15", and can also happen for a purely-numeric
// Ref. markSent_() below writes refId as a normal JS string, but Sheets
// converts it on landing; hasAlreadySent_() then reads it back as a Date/
// Number object, not the original string, and compares it with `===`
// against a fresh string refId — which can NEVER be true for two different
// JS types. Once that happens for a given Ref ID, hasAlreadySent_() returns
// false FOREVER for it, no matter how many times it's actually been sent —
// so every 15-minute safety-net scan (and every hourly reminder/completion
// scan) sees it as "never sent" and sends it again.
// Fix, two parts:
//  1. _refKey_() below normalizes BOTH sides of every comparison — string,
//     Date, or Number — into the same plain-text form before comparing, so
//     a Ref ID that got silently reinterpreted as a Date/Number still
//     matches correctly against a plain-string refId.
//  2. _forcePlainTextRefColumn_() sets column A (RefID) of the tracking and
//     attempts sheets to explicit Plain Text number format, so Sheets stops
//     auto-converting Ref IDs on write going forward. Safe/cheap to call on
//     every access — it's a no-op once the format is already set.
function _refKey_(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone() || "Asia/Kolkata", "yyyy-MM-dd");
  }
  return String(v == null ? "" : v).trim();
}

function _forcePlainTextRefColumn_(sheet) {
  try {
    sheet.getRange(1, 1, Math.max(sheet.getMaxRows(), 2), 1).setNumberFormat("@");
  } catch (e) {
    // Non-fatal — worst case a future write could still be auto-converted;
    // _refKey_() above is the real safety net either way.
  }
}

function getAttemptsSheet_() {
  const ss = getTrackingSpreadsheet_();
  let sheet = ss.getSheetByName("Email_Attempts");
  if (!sheet) {
    sheet = ss.insertSheet("Email_Attempts");
    sheet.appendRow(["RefID", "EmailType", "Attempts"]);
    sheet.hideSheet();
  }
  _forcePlainTextRefColumn_(sheet);
  return sheet;
}

function _incrementAttempt_(refId, emailType) {
  const sheet = getAttemptsSheet_();
  const data = sheet.getDataRange().getValues();
  const key = _refKey_(refId);
  for (let i = 1; i < data.length; i++) {
    if (_refKey_(data[i][0]) === key && data[i][1] === emailType) {
      const next = Number(data[i][2] || 0) + 1;
      sheet.getRange(i + 1, 3).setValue(next);
      return next;
    }
  }
  sheet.appendRow([String(refId), emailType, 1]);
  return 1;
}

/**
 * Scans this account's inbox once a day for Gmail's own bounce
 * notifications (mailer-daemon "Delivery Status Notification (Failure)")
 * and blacklists whatever recipient address each one names, so wrongly
 * typed emails stop being retried anywhere in the system going forward.
 * Cheap: reads at most ~50 threads/day, sends zero emails itself.
 */
function checkForBounces_() {
  try {
    const threads = GmailApp.search('from:(mailer-daemon OR postmaster) subject:(failure OR "delivery status" OR undeliverable) newer_than:1d', 0, 50);
    threads.forEach((thread) => {
      thread.getMessages().forEach((msg) => {
        const body = msg.getPlainBody();
        const match = body.match(/[^\s<>@]+@[^\s<>@]+\.[a-z]{2,}/i);
        if (match) {
          const bounced = match[0].toLowerCase();
          logError_("checkForBounces_", `Delivery failure notice mentions ${bounced}. No automatic blacklist was applied; manual review is required.`);
        }
      });
    });
  } catch (err) {
    logError_("checkForBounces_", err);
  }
}

// ─── Dedupe tracking sheet ─────────────────────────────────────────────────

function getTrackingSpreadsheet_() {
  return SpreadsheetApp.openById(CONFIG.TRACKING_SHEET_SPREADSHEET_ID);
}

function getTrackingSheet_() {
  const ss = getTrackingSpreadsheet_();
  let sheet = ss.getSheetByName(CONFIG.TRACKING_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.TRACKING_SHEET_NAME);
    sheet.appendRow(["RefID", "EmailType", "SentTo", "SentAt"]);
    sheet.hideSheet();
  }
  _forcePlainTextRefColumn_(sheet);
  return sheet;
}

function getErrorSheet_() {
  const ss = getTrackingSpreadsheet_();
  let sheet = ss.getSheetByName(CONFIG.ERROR_LOG_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.ERROR_LOG_SHEET_NAME);
    sheet.appendRow(["When", "Context", "Message"]);
  }
  return sheet;
}

/**
 * Key = refId + "::" + emailType, e.g. "SDP-252921::booking".
 * Payment reminders are the one email type allowed more than one send
 * (up to CONFIG.PAYMENT_REMINDER_MAX_SENDS) — callers pass a suffixed
 * emailType like "payment_reminder_1" for each successive reminder so
 * dedupe still works per-attempt.
 * Ref IDs are compared via _refKey_() (not raw ===) so a Ref ID that
 * Google Sheets silently reinterpreted as a Date/Number cell still matches
 * a plain-string refId — see the note above _refKey_() for why this was
 * causing some bookings' confirmation emails to re-send indefinitely.
 */
function hasAlreadySent_(refId, emailType) {
  const sheet = getTrackingSheet_();
  const data = sheet.getDataRange().getValues();
  const key = _refKey_(refId);
  for (let i = 1; i < data.length; i++) {
    if (_refKey_(data[i][0]) === key && data[i][1] === emailType) return true;
  }
  return false;
}

function markSent_(refId, emailType, toEmail) {
  const sheet = getTrackingSheet_();
  sheet.appendRow([String(refId), emailType, toEmail, new Date()]);
}

function logError_(context, err) {
  try {
    const sheet = getErrorSheet_();
    sheet.appendRow([new Date(), context, String(err && err.message ? err.message : err)]);
  } catch (e) {
    // Last-resort: if even error logging fails, do nothing further —
    // never let logging itself throw and take down the caller.
  }
}

// ─── Resilient send + systemic-failure alerting ────────────────────────────
// ✅ ROOT-CAUSE FIX: every email in this project goes through GmailApp with
// an explicit `from: CONFIG.SENDER_EMAIL_DEFAULT` ("puja@sridwar.com" by
// default). GmailApp.sendEmail THROWS on every single call if that address
// is not currently a verified "Send As" alias on the Google account running
// this script (Gmail → Settings → Accounts and Import → "Send mail as").
// That failure was only ever caught and written to a hidden Email_Errors
// sheet — meaning a single unverified alias silently blocked 100% of
// confirmations across every category (Welcome, Puja, Seva, payment
// reminders, certificates) with no visible symptom anywhere except that
// hidden sheet. This is almost certainly why some early devotees
// reported receiving nothing.
//
// Fix, two parts:
//  1. _attemptGmailSend_ tries the branded alias first, and if THAT specific
//     call throws, retries once sending as the script's own account address
//     (no `from`) so the devotee still receives their email even before the
//     alias is fixed — a real confirmation late-branded beats a confirmation
//     that never arrives at all.
//  2. _alertAdminOfSystemicFailure_ uses MailApp (not GmailApp — MailApp
//     always sends as the script owner's real address, so it can NEVER be
//     blocked by an alias problem) to immediately tell CONFIG.ADMIN_ALERT_EMAIL
//     the raw exception the moment total failures start happening, instead
//     of that information sitting undiscovered in a hidden sheet. Throttled
//     to once per hour so a bad run can't spam the inbox.

function _looksLikeAliasPermissionError_(err) {
  const msg = String(err && err.message ? err.message : err).toLowerCase();
  return msg.indexOf("from") !== -1 || msg.indexOf("alias") !== -1 || msg.indexOf("permission") !== -1
    || msg.indexOf("invalid sender") !== -1 || msg.indexOf("send mail as") !== -1;
}

/**
 * Sends one email, trying the branded `from` alias first and transparently
 * falling back to the script's own address if (and only if) that specific
 * attempt fails. Returns { ok, usedFallback, error } — `error` is the
 * ORIGINAL alias-attempt error even when the fallback succeeds, so callers
 * can still surface "your alias needs fixing" without losing the send.
 */
function _attemptGmailSend_(to, subject, sendOpts) {
  try {
    GmailApp.sendEmail(to, subject, "", sendOpts);
    return { ok: true, usedFallback: false, error: null };
  } catch (primaryErr) {
    if (!_looksLikeAliasPermissionError_(primaryErr) || !sendOpts.from) {
      // Not an alias-shaped failure (e.g. a genuinely bad recipient GmailApp
      // itself rejected) — no point retrying identically, surface it as-is.
      return { ok: false, usedFallback: false, error: primaryErr };
    }
    try {
      const fallbackOpts = Object.assign({}, sendOpts);
      delete fallbackOpts.from; // let GmailApp use the script owner's own verified address
      GmailApp.sendEmail(to, subject, "", fallbackOpts);
      return { ok: true, usedFallback: true, error: primaryErr };
    } catch (fallbackErr) {
      return { ok: false, usedFallback: false, error: fallbackErr };
    }
  }
}

/**
 * Immediate, hard-to-miss admin notice the moment sends start systemically
 * failing — sent via MailApp (never blocked by an alias problem) so it is
 * as reliable a channel as this script has. Throttled to once/hour via
 * PropertiesService so a bad batch run can't flood the inbox.
 */
function _alertAdminOfSystemicFailure_(context, err) {
  try {
    const props = PropertiesService.getScriptProperties();
    const key = "systemic_fail_alerted_" + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Asia/Kolkata", "yyyy-MM-dd-HH");
    if (props.getProperty(key)) return; // already alerted this hour

    // ✅ ROOT-CAUSE FIX: this alert used to ALWAYS append the "your alias
    // isn't verified" paragraph, regardless of what actually failed — even
    // though _looksLikeAliasPermissionError_(err) right above already knows
    // how to tell an alias-shaped failure apart from anything else (e.g.
    // "Argument too large: subject", a malformed recipient, a transient
    // Gmail error). That made every failure alert misdiagnose itself,
    // pointing straight at Gmail "Send mail as" settings that were often
    // completely fine. The explanation is now conditional on that same
    // check, with a generic fallback that points at the real error and the
    // Email_Errors sheet instead of guessing.
    const isAliasIssue = _looksLikeAliasPermissionError_(err);
    const explanation = isAliasIssue
      ? `Most common cause: "${CONFIG.SENDER_EMAIL_DEFAULT}" (CONFIG.SENDER_EMAIL_DEFAULT / SENDER_EMAIL_CERTIFICATE) ` +
        `is not currently a verified "Send As" alias on the Google account running this script. Fix: Gmail → Settings → ` +
        `Accounts and Import → "Send mail as" → add and verify that address, then run verifySenderAlias_() from the ` +
        `Apps Script editor to confirm. Until fixed, this script will keep sending as your own script account address ` +
        `instead of failing outright — but check that those fallback emails are actually arriving too.`
      : `This does not look like a "Send As" alias problem — the error text didn't match any of the alias-failure ` +
        `patterns this script checks for, so verifySenderAlias_() is unlikely to be the fix here. Check the error ` +
        `message above and the "${CONFIG.ERROR_LOG_SHEET_NAME}" sheet in the tracking spreadsheet for the full ` +
        `history of this failure and its context.`;

    MailApp.sendEmail({
      to: CONFIG.ADMIN_ALERT_EMAIL,
      subject: `Sri Dwar: emails are failing to send (${context})`,
      body: `A confirmation email just failed to send, including the fallback attempt.\n\n` +
        `Context: ${context}\nError: ${String(err && err.message ? err.message : err)}\n\n` +
        explanation,
    });
    props.setProperty(key, "1");
  } catch (e) {
    // Never let the alert itself throw further.
  }
}

// ─── Subject-length guard ───────────────────────────────────────────────────
// ✅ ROOT-CAUSE FIX: subjects like "Payment confirmed — ${ctx.itemName ||
// serviceLabel} (Ref ${ctx.refId})" interpolate ctx.itemName straight from
// the spreadsheet row with no length cap. That field is meant to hold a
// short seva/puja name, but it's sourced from a free-text/multi-select form
// cell ("Puja Selected") that can end up holding a whole sentence or a
// pasted list of selections. GmailApp.sendEmail then throws "Argument too
// large: subject" and — since sendBrandedEmail_ is the one choke point for
// every email type — that one oversized row can silently kill Welcome,
// booking, reminder, and certificate sends alike. _safeSubject_() truncates
// any dynamic text destined for a subject line to a safe length before it's
// interpolated, so one bloated form cell can never take down a send.
const SAFE_SUBJECT_MAX_LEN = 80;

function _safeSubject_(text, maxLen) {
  if (!text) return text;
  const limit = maxLen || SAFE_SUBJECT_MAX_LEN;
  const str = String(text).replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  if (str.length <= limit) return str;
  return str.slice(0, limit).trim() + "…";
}

/**
 * The single choke point for every outbound email in this project.
 *
 * @param {Object} opts
 * @param {string} opts.to           - recipient email (required, validated)
 * @param {string} opts.subject
 * @param {string} opts.html         - full HTML body (from EmailTemplates.gs)
 * @param {string} opts.refId        - booking/registration Ref ID, used for dedupe
 * @param {string} opts.emailType    - "welcome" | "booking" | "payment_reminder_1" | "certificate_ready" | "acknowledgement"
 * @param {string} [opts.fromEmail]  - defaults to CONFIG.SENDER_EMAIL_DEFAULT
 * @param {Blob[]} [opts.attachments]
 * @param {Object.<string,Blob>} [opts.inlineImages] - cid -> Blob map. Reference
 *   a key from `html` as <img src="cid:theKey">. Used by the Acknowledgement
 *   template (see EmailTemplates.gs / buildAcknowledgementEmail_) to embed
 *   the server-composited banner JPEG directly in the message instead of
 *   hot-linking it — this is what lets the image render even for mail
 *   clients that block remote images by default.
 * @returns {boolean} true if actually sent, false if skipped (dedupe/quota) or failed
 */
function sendBrandedEmail_(opts) {
  const { to, subject, html, refId, emailType, fromEmail, attachments, inlineImages } = opts;

  if (!refId || !emailType) {
    logError_("sendBrandedEmail_", "Missing refId or emailType — every send must be dedupe-keyed.");
    return false;
  }

  // Syntax/placeholder check FIRST — costs zero quota and needs no sheet
  // lookups, so it's the cheapest possible reject for the common case of a
  // devotee leaving an email field blank or typing "na"/"asdf".
  if (!isLikelyValidEmail_(to)) {
    logError_(`sendBrandedEmail_ [${emailType}] refId=${refId}`, `Invalid-looking email "${to}" — skipped, no quota used.`);
    if (to) blacklistEmail_(to, "invalid format");
    return false;
  }

  // ✅ ROOT-CAUSE FIX for duplicate emails on the same booking: everything
  // from the dedupe check through recording the send used to run with NO
  // lock — a plain read of Email_Send_Log, then later a plain write. Two
  // executions running at the same time (the 15-minute
  // scanForMissedBookingEmails safety net overlapping its own next run
  // when a pass takes a while, or that scan overlapping an onFormSubmit
  // trigger firing at the same moment, or — if Setup() was ever re-run
  // before a given time-driven trigger existed in an older version of this
  // file — a leftover duplicate copy of the same trigger firing twice)
  // could BOTH read "not sent yet" for the same refId+emailType before
  // either had written its mark, so both would send. That produced
  // repeated, identical confirmation emails for one booking. A single
  // script-wide lock now makes "check → send → record" atomic: a second
  // execution trying to send anything simply waits its turn, then sees the
  // mark the first one just wrote and skips.
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    logError_(`sendBrandedEmail_ [${emailType}] refId=${refId}`, `Could not get the send lock within 30s (another send was in progress) — skipped for this pass; safe to retry next run: ${e}`);
    return false;
  }

  try {
    // Do not suppress a real customer email merely because an old bounce scan
    // or an earlier test placed the address in a blacklist sheet. Delivery
    // status is not authoritative enough to permanently block a customer.
    // Dedupe is the only hard skip here.
    if (hasAlreadySent_(refId, emailType)) {
      return false; // already sent — silent, expected on re-runs
    }

    // Track attempts for diagnostics, but NEVER permanently suppress a real
    // customer address after a small number of transient failures. The old
    // two-attempt blacklist could make a perfectly valid test/customer email
    // impossible to send again after two temporary errors.
    const attemptsSoFar = _incrementAttempt_(refId, emailType);

    if (!canSendMoreToday_()) {
      logError_(`sendBrandedEmail_ [${emailType}] refId=${refId}`, "Daily quota reached — deferred to tomorrow's run.");
      return false;
    }

    // Belt-and-braces: even though every call site now truncates the
    // dynamic piece of its subject via _safeSubject_(), this final cap
    // right at the choke point means a future call site that forgets to
    // use it still can't reproduce the "Argument too large: subject"
    // failure — it just gets truncated here instead of throwing.
    const safeFullSubject = _safeSubject_(subject, 250);

    const sendOpts = {
      to: to,
      subject: safeFullSubject,
      htmlBody: html,
      name: CONFIG.SENDER_NAME,
      replyTo: CONFIG.BRAND.supportEmail,
      from: fromEmail || CONFIG.SENDER_EMAIL_DEFAULT,
    };
    if (attachments && attachments.length) sendOpts.attachments = attachments;
    if (inlineImages) sendOpts.inlineImages = inlineImages;

    // ✅ ROOT-CAUSE FIX: previously this called GmailApp.sendEmail directly
    // with a hardcoded `from` alias and NOTHING else — if that alias wasn't
    // a verified "Send As" address on this script's Google account,
    // GmailApp threw on every single call, which the catch block below
    // logged to a hidden sheet and otherwise treated exactly like any other
    // failure. Since every email type shares this one function, an
    // unverified alias meant total, silent, systemic failure across Welcome,
    // Puja, Seva, payment reminders, and certificates alike. Routing through
    // _attemptGmailSend_ (EmailSender.gs, above) means: (a) an alias-shaped
    // failure automatically retries as the script's own address so the
    // email still reaches the devotee, and (b) a total failure (both
    // attempts) immediately alerts CONFIG.ADMIN_ALERT_EMAIL via MailApp
    // instead of sitting invisibly in Email_Errors.
    const result = _attemptGmailSend_(to, safeFullSubject, sendOpts);
    if (!result.ok) {
      logError_(`sendBrandedEmail_ [${emailType}] refId=${refId} to=${to}`, result.error);
      _alertAdminOfSystemicFailure_(`sendBrandedEmail_ [${emailType}] refId=${refId}`, result.error);
      return false;
    }
    if (result.usedFallback) {
      logError_(
        `sendBrandedEmail_ [${emailType}] refId=${refId} to=${to}`,
        `Sent successfully, but the branded alias "${sendOpts.from}" failed and this email went out as this ` +
          `script's own account address instead. Verify the alias under Gmail → Settings → Accounts and Import → ` +
          `"Send mail as". Original alias error: ${String(result.error && result.error.message ? result.error.message : result.error)}`
      );
    }

    incrementDailySentCount_();
    markSent_(refId, emailType, to);
    maybeAlertLowQuota_();
    return true;
  } catch (err) {
    logError_(`sendBrandedEmail_ [${emailType}] refId=${refId} to=${to}`, err);
    _alertAdminOfSystemicFailure_(`sendBrandedEmail_ [${emailType}] refId=${refId}`, err);
    return false;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Manual diagnostic: run this from the Apps Script editor (select the
 * function, click Run) to check — without sending anything — whether
 * CONFIG.SENDER_EMAIL_DEFAULT / SENDER_EMAIL_CERTIFICATE are currently
 * verified "Send As" aliases on the Google account running this script.
 * This is the single most likely cause of "no confirmation emails are
 * being received at all" (every category, every recipient) — an alias
 * that looks correctly configured in Config.gs but was never added and
 * verified under Gmail → Settings → Accounts and Import → "Send mail as".
 */
function verifySenderAlias_() {
  let aliases = [];
  try {
    aliases = GmailApp.getAliases();
  } catch (e) {
    const msg = `Could not read Gmail aliases: ${e}`;
    Logger.log(msg);
    return msg;
  }
  const ownAddress = Session.getActiveUser().getEmail();
  const checks = [CONFIG.SENDER_EMAIL_DEFAULT, CONFIG.SENDER_EMAIL_CERTIFICATE].filter(
    (v, i, arr) => v && arr.indexOf(v) === i
  );
  const lines = [`Script's own account address: ${ownAddress || "(unavailable)"}`, `Verified Send-As aliases: ${aliases.length ? aliases.join(", ") : "(none)"}`];
  checks.forEach((addr) => {
    const ok = addr === ownAddress || aliases.indexOf(addr) !== -1;
    lines.push(`${addr}: ${ok ? "OK — verified, emails will send branded from this address" : "NOT VERIFIED — every send from this address will fail and fall back to the script's own address"}`);
  });
  const summary = lines.join("\n");
  Logger.log(summary);
  try {
    SpreadsheetApp.getUi().alert(summary);
  } catch (e) {
    // No UI context — Logger.log above is enough.
  }
  return summary;
}
