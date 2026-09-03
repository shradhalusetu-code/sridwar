/**
 * Sri Dwar — Email Automation: TRIGGERS
 * ─────────────────────────────────────────────────────────────────────────
 * Run Setup() ONCE (from the Apps Script editor: select Setup, click Run)
 * after filling in every ID in Config.gs. It wires up:
 *   - one onFormSubmit trigger per response sheet in CONFIG.SHEETS
 *   - one hourly time-driven trigger for payment reminders
 *   - one hourly time-driven safety-net trigger (scanForMissedAcknowledgements)
 *     that catches any acknowledgement-type submission (Inquiry, Temple
 *     Issue Report, Prasad & Prayer Testimony, Temple Registration, Pujari
 *     Registration, etc.) whose onFormSubmit confirmation didn't fire for
 *     any reason — e.g. Setup() not yet re-run after a sheet was added to
 *     CONFIG.SHEETS.ACKNOWLEDGEMENT_SHEETS, or a rare missed trigger event.
 *     This is what closes the gap that let "Raise Temple Issues With
 *     Elected Representatives" submissions land in the sheet with no
 *     confirmation email ever going out. It is fully dedupe-safe (see
 *     hasAlreadySent_ in EmailSender.gs), so it never sends a duplicate for
 *     a row the onFormSubmit trigger already handled.
 * Re-running Setup() is safe — it clears old triggers made by this project
 * before recreating them, so you never end up with duplicates firing twice.
 *
 * ✅ ROOT-CAUSE FIX (duplicate confirmation/pending emails on one booking):
 * Three things combined to produce repeated "Payment confirmed" / "booking
 * received — payment pending" pairs for the same request, roughly every 15
 * minutes:
 *   1. A pending booking got an immediate "payment pending" email at
 *      submission AND another pending-flavoured email later from the
 *      reminder scan — see _handleBookingSheetSubmit_ below.
 *   2. The 15-minute safety-net scan (scanForMissedBookingEmails) re-sent
 *      that same pending notice on every pass for a row it considered
 *      "not yet handled" — see the note in that function below.
 *   3. A row with no explicit "Ref: ..." text fell back to an ID derived
 *      from its physical row number (_getStableRowRef_), so a resynced or
 *      duplicated row for the same booking looked like a brand-new booking
 *      and bypassed dedupe entirely.
 * Fix: a booking now sends AT MOST two emails ever — one confirmation
 * (immediately if already paid, or the moment payment is detected later)
 * and, only if payment is still not confirmed 30 minutes after submission
 * (Config.gs: PAYMENT_REMINDER_DELAY_HOURS), exactly one pending-payment
 * reminder. The fallback ref is now content-based so a resubmitted/synced
 * duplicate of the same booking collapses onto the same dedupe key instead
 * of restarting the whole flow. See diagnoseSriDwarEmailTriggers() below
 * for a related, NOT-automatically-detectable risk: this project having
 * been copied into a second Apps Script project under a different Google
 * account (e.g. during the agrinamo@gmail.com → puja@sridwar.com move)
 * with its own live triggers still running independently.
 *
 * ✅ LATEST FIX (repeat "Payment confirmed (Ref 2026-08-15)"-style emails):
 * the Ref-ID regex in extractRowContext_() below was matching INSIDE words
 * like "Preference" and "Preferred" (e.g. "Puja Date Preference: 2026-08-15"
 * from Simple Pujas, "Preferred Session Date: ..." from Wellness), so it
 * extracted the puja/session DATE as the booking's Ref ID instead of the
 * real "Ref: SDP-XXXXXX" / "Reference: SDR-..." text elsewhere in the same
 * row. Every booking sharing that same preferred date then collapsed onto
 * one identical fake Ref ID, which broke dedupe (hasAlreadySent_ keys on
 * Ref ID + email type) and is what produced repeated/misrouted-looking
 * "Payment confirmed" emails. Fixed by anchoring the regex to a real word
 * boundary so it can no longer match mid-word — see the comment directly
 * above the `ref` regex list in extractRowContext_() for the full detail.
 * Separately, by design: "Counselling & Guidance" (and "Holistic Wellness")
 * bookings have no dedicated Google Form/Sheet of their own (see
 * googleFormSync.ts / BookNowWizard.tsx), so they intentionally land in and
 * are processed by the PUJA_BOOKING sheet/trigger — that is not a bug, it's
 * the only destination configured for them. Seva bookings are correctly
 * detected and routed to the dedicated Seva form/sheet already (see
 * _isSevaSubmission in googleFormSync.ts) and needed no change here.
 */

function Setup() {
  // Wipe only OUR previously-installed triggers (matched by handler
  // function name), never touch triggers made by anything else.
  const ours = [
    "onDevoteeRegistrationSubmit",
    "onPujaBookingSubmit",
    "onSevaBookingSubmit",
    "onDarshanCertificateSubmit",
    "onAcknowledgementFormSubmit",
    "scanForMissedBookingEmails",
    "scanForPaymentReminders",
    "scanForCompletedPujas", // kept here so Setup() cleanly UNINSTALLS any
    // previously-running hourly trigger for this — see note above
    // _install_("Completed Puja/Seva scan (hourly)", ...) below, which is
    // now intentionally NOT called. Function itself is left intact further
    // down in this file, just no longer wired to a trigger.
    "scanForMissedAcknowledgements",
    "scanForPendingPaymentsUniversal", // new — see PendingPaymentReminder.gs;
    // covers every payment flow via Supabase directly, not just the 3
    // booking Sheets scanForPaymentReminders() already covers above.
    "scanForNewlyConfirmedPayments", // new — see ConfirmedPaymentPoller.gs;
    // fallback for the Supabase Database Webhook, which is currently broken
    // on this project ("schema 'supabase_functions' does not exist" —
    // Supabase-side provisioning bug). Polls every 5 minutes instead of
    // firing instantly. Safe to keep running even after/if the webhook
    // bug is ever fixed — its own dedupe makes it a harmless no-op either way.
    "checkForBounces_",
  ];
  ScriptApp.getProjectTriggers().forEach((t) => {
    if (ours.indexOf(t.getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(t);
  });

  // ── Bug fix: one bad/inaccessible spreadsheet ID used to ABORT Setup()
  // partway through, silently leaving every trigger listed AFTER it
  // uninstalled (e.g. if DARSHAN_CERTIFICATE's ID were wrong, Puja and
  // Seva confirmations might work while Darshan Certificate, every
  // Acknowledgement sheet, payment reminders, and certificate-ready
  // emails would NEVER be created — with no error visible anywhere). Each
  // trigger is now created independently: a failure on one is logged and
  // skipped, and every other trigger is still attempted. `results` is
  // reported at the end (and, if anything failed, emailed to
  // CONFIG.ADMIN_ALERT_EMAIL) so a partial failure is never silent again.
  const results = { installed: [], failed: [] };

  function _install_(label, fn) {
    try {
      fn();
      results.installed.push(label);
    } catch (err) {
      results.failed.push(`${label}: ${err && err.message ? err.message : err}`);
      Logger.log(`Setup() FAILED to install trigger for "${label}": ${err}`);
    }
  }

  _install_("Devotee Registration (welcome email)", () =>
    ScriptApp.newTrigger("onDevoteeRegistrationSubmit")
      .forSpreadsheet(CONFIG.SHEETS.DEVOTEE_REGISTRATION.spreadsheetId).onFormSubmit().create()
  );

  _install_("Puja Booking (confirmation email)", () =>
    ScriptApp.newTrigger("onPujaBookingSubmit")
      .forSpreadsheet(CONFIG.SHEETS.PUJA_BOOKING.spreadsheetId).onFormSubmit().create()
  );

  _install_("Seva Booking (confirmation email)", () =>
    ScriptApp.newTrigger("onSevaBookingSubmit")
      .forSpreadsheet(CONFIG.SHEETS.SEVA_BOOKING.spreadsheetId).onFormSubmit().create()
  );

  _install_("Darshan Certificate (confirmation email)", () =>
    ScriptApp.newTrigger("onDarshanCertificateSubmit")
      .forSpreadsheet(CONFIG.SHEETS.DARSHAN_CERTIFICATE.spreadsheetId).onFormSubmit().create()
  );

  CONFIG.SHEETS.ACKNOWLEDGEMENT_SHEETS.forEach((s) => {
    _install_(`Acknowledgement — ${s.label}`, () =>
      ScriptApp.newTrigger("onAcknowledgementFormSubmit")
        .forSpreadsheet(s.spreadsheetId).onFormSubmit().create()
    );
  });

  // Safety-net scan is needed because website/API writes to Sheets do not fire
  // onFormSubmit. It runs every 15 minutes and is fully dedupe-safe.
  _install_("Missed booking/payment scan (every 15 minutes)", () =>
    ScriptApp.newTrigger("scanForMissedBookingEmails").timeBased().everyMinutes(15).create()
  );

  // Payment reminder + completion checks are hourly.
  _install_("Payment Reminder scan (hourly)", () =>
    ScriptApp.newTrigger("scanForPaymentReminders").timeBased().everyHours(1).create()
  );
  // Universal pending-payment reminder — see PendingPaymentReminder.gs.
  // Covers EVERY payment/contribution flow via Supabase directly (Contact
  // donations, temple-issue contributions, testimony contributions,
  // subscriptions, bazaar), not just the 3 booking Sheets the scan above
  // covers. Namespaced dedupe (emailType "webhook_pending_payment_reminder")
  // means these two scans can never double-send for the same booking.
  _install_("Universal pending-payment reminder (hourly)", () =>
    ScriptApp.newTrigger("scanForPendingPaymentsUniversal").timeBased().everyHours(1).create()
  );
  // Confirmed-payment poller — see ConfirmedPaymentPoller.gs. Fallback for
  // the currently-broken Supabase Database Webhook; polls every 5 minutes
  // instead of firing instantly.
  _install_("Confirmed-payment poller (every 5 minutes)", () =>
    ScriptApp.newTrigger("scanForNewlyConfirmedPayments").timeBased().everyMinutes(5).create()
  );
  // ✅ DISABLED (2026-08-15, at Sri Dwar's request): this used to install
  // an hourly Sheets-checkbox → text-only "certificate on its way" email,
  // running fully independently of the website's own PDF-certificate
  // webhook flow (certificateService.ts → Webhook.gs). Because the two
  // paths used different emailType dedupe keys by design, a devotee could
  // receive BOTH this generic text email AND the real PDF certificate
  // email for the same completed booking. Since certificateService.ts's
  // admin-triggered flow is now the authoritative "completion" email (it
  // actually attaches the PDF), this hourly scan is no longer installed.
  // The scanForCompletedPujas() function is left intact further down in
  // this file — nothing was deleted, only its trigger. To re-enable,
  // uncomment the block below and re-run Setup().
  //
  // _install_("Completed Puja/Seva scan (hourly)", () =>
  //   ScriptApp.newTrigger("scanForCompletedPujas").timeBased().everyHours(1).create()
  // );
  // Safety net for every acknowledgement-type form (Inquiry, Temple Issue
  // Report, Prasad & Prayer Testimony, Temple Registration, Pujari
  // Registration, and any sheet added to ACKNOWLEDGEMENT_SHEETS in the
  // future) — see the header comment above for why this exists.
  _install_("Missed Acknowledgement safety net (hourly)", () =>
    ScriptApp.newTrigger("scanForMissedAcknowledgements").timeBased().everyHours(1).create()
  );
  // Daily bounce sweep — reads yesterday's delivery-failure notices and
  // blacklists whatever address each one names, so a devotee's typo'd
  // email stops being retried by any future booking/reminder/certificate
  // email without needing anyone to notice and fix it by hand.
  _install_("Bounce sweep (daily)", () =>
    ScriptApp.newTrigger("checkForBounces_").timeBased().everyDays(1).atHour(3).create()
  );

  const summary = `Sri Dwar email triggers: ${results.installed.length} installed` +
    (results.failed.length ? `, ${results.failed.length} FAILED:\n- ${results.failed.join("\n- ")}` : ", 0 failed.");
  Logger.log(summary);

  // If anything failed, email the admin immediately — this is exactly the
  // kind of silent partial failure that previously meant "some categories
  // (e.g. Seva) send confirmations fine, others (Puja, Darshan
  // Certificate, every Acknowledgement form, payment reminders) never do,"
  // with nothing anywhere to show why. Uses MailApp directly (not
  // sendBrandedEmail_) since this must never be skipped by the dedupe/
  // quota logic built for devotee-facing mail.
  if (results.failed.length) {
    try {
      MailApp.sendEmail({
        to: CONFIG.ADMIN_ALERT_EMAIL,
        subject: `Sri Dwar Setup(): ${results.failed.length} email trigger(s) failed to install`,
        body: `Setup() ran but could NOT install the following trigger(s) — the matching form/category will ` +
          `send NO confirmation emails at all until this is fixed and Setup() is run again:\n\n` +
          `${results.failed.join("\n")}\n\n` +
          `Common causes: the spreadsheet ID in Config.gs is wrong/still a placeholder, or this script's ` +
          `Google account does not have Editor access to that spreadsheet. Successfully installed:\n` +
          `${results.installed.join("\n")}`,
      });
    } catch (e) {
      // Don't let the alert itself block anything further.
    }
  }

  // Best-effort confirmation popup — only works when this script is
  // opened from within a bound Google Sheet's UI. Running it standalone
  // from script.google.com (as you likely just did) has no UI context,
  // so SpreadsheetApp.getUi() throws — that's expected and harmless, all
  // the triggers above have already been installed successfully by this
  // point regardless of whether this alert can show.
  try {
    SpreadsheetApp.getUi().alert(summary);
  } catch (e) {
    Logger.log(summary + " (No UI context to show an alert — this is expected when run from the standalone Apps Script editor.)");
  }
}

/**
 * Run this any time to see, at a glance, exactly which of the expected
 * triggers ARE currently installed and which are missing — without
 * needing to open Triggers (clock icon) in the Apps Script editor and
 * cross-check by hand. If a devotee reports never receiving a
 * confirmation for one category (e.g. Puja, but not Seva), start here:
 * a missing entry below means Setup() either was never run, or failed
 * partway through for that specific trigger (check Logger / the email
 * Setup() sends to CONFIG.ADMIN_ALERT_EMAIL when that happens).
 */
function diagnoseSriDwarEmailTriggers() {
  const expected = [
    "onDevoteeRegistrationSubmit",
    "onPujaBookingSubmit",
    "onSevaBookingSubmit",
    "onDarshanCertificateSubmit",
    "onAcknowledgementFormSubmit",
    "scanForMissedBookingEmails",
    "scanForPaymentReminders",
    // "scanForCompletedPujas" intentionally removed from this "expected"
    // list — it's no longer installed on purpose (see Setup() above), so
    // it should NOT be reported as "missing" by this diagnostic.
    "scanForMissedAcknowledgements",
    "scanForPendingPaymentsUniversal",
    "scanForNewlyConfirmedPayments",
    "checkForBounces_",
  ];
  const installed = ScriptApp.getProjectTriggers().map((t) => t.getHandlerFunction());
  const missing = expected.filter((fn) => installed.indexOf(fn) === -1);
  // onAcknowledgementFormSubmit is expected to appear once PER sheet in
  // ACKNOWLEDGEMENT_SHEETS — a single installed copy isn't necessarily
  // covering all of them, so count separately.
  const ackCount = installed.filter((fn) => fn === "onAcknowledgementFormSubmit").length;

  // DUPLICATE triggers — not just missing ones — are a direct cause of
  // repeated emails: two live copies of the same time-driven trigger (e.g.
  // from Setup() being run under an older version of this file before a
  // handler existed in the cleanup list below) both fire on schedule and
  // both attempt to send. Every handler except onAcknowledgementFormSubmit
  // (intentionally one per sheet) should appear AT MOST once.
  const duplicates = expected
    .filter((fn) => fn !== "onAcknowledgementFormSubmit")
    .filter((fn) => installed.filter((f) => f === fn).length > 1)
    .map((fn) => `${fn} (×${installed.filter((f) => f === fn).length})`);

  let aliasLine = "Sender alias check: see verifySenderAlias_() output above/below.";
  try {
    aliasLine = verifySenderAlias_();
  } catch (e) {
    aliasLine = `Sender alias check failed to run: ${e}`;
  }

  const ownAddress = (function () { try { return Session.getActiveUser().getEmail(); } catch (e) { return "(unavailable)"; } })();

  const lines = [
    `Installed triggers: ${installed.length}`,
    `Missing entirely: ${missing.length ? missing.join(", ") : "none"}`,
    `DUPLICATE (fires more than once, likely cause of repeat emails): ${duplicates.length ? duplicates.join(", ") + " — run Setup() to clear and reinstall cleanly" : "none"}`,
    `Acknowledgement triggers installed: ${ackCount} (expected ${CONFIG.SHEETS.ACKNOWLEDGEMENT_SHEETS.length}, one per sheet in CONFIG.SHEETS.ACKNOWLEDGEMENT_SHEETS)`,
    `Today's send count: ${getDailySentCount_()} / ${CONFIG.MAX_EMAILS_PER_DAY}`,
    ``,
    // ⚠️ CROSS-ACCOUNT BLIND SPOT: ScriptApp.getProjectTriggers() above only
    // sees triggers belonging to THIS Apps Script project, running as the
    // account currently logged in (shown below). If this project was moved
    // from a Gmail account to a Workspace account by copying it into a NEW
    // project rather than transferring ownership of the original one, the
    // OLD project's triggers still exist under the OLD account and are
    // invisible here — this diagnostic will report a perfectly clean 0
    // duplicates while a second, independent copy of this exact automation
    // is still running on the same schedule against the same spreadsheets.
    // That is functionally indistinguishable from a real duplicate-trigger
    // bug from the devotee's side, but no in-script check can detect it —
    // it has to be checked by hand: open script.google.com under EACH
    // Google account this project has ever run under, open the clock icon
    // ("Triggers") for any project bound to these same spreadsheet IDs, and
    // delete every trigger in the one you are retiring.
    `Running as: ${ownAddress}. If this script was ever moved from one Google account to another by copying it (rather than transferring the original project's ownership), manually check script.google.com under BOTH accounts for a second, still-active copy of these triggers — this diagnostic can only see triggers owned by the account it is running as.`,
    ``,
    aliasLine,
  ];
  Logger.log(lines.join("\n"));
  try {
    SpreadsheetApp.getUi().alert(lines.join("\n"));
  } catch (e) {
    // No UI context — Logger.log above is enough; check View → Logs.
  }
  return lines.join("\n");
}

/**
 * Sends one real test email straight to CONFIG.ADMIN_ALERT_EMAIL through
 * the exact same sendBrandedEmail_() choke point every real confirmation
 * uses — but with a fresh, timestamped refId each run so dedupe never
 * blocks it. Run this manually (select the function, click Run) to check
 * whether SENDING itself works, independent of whether a Google Form
 * submission ever reaches Triggers.gs at all. If this email arrives:
 * GmailApp, the "from" alias, and today's quota are all fine, and a
 * missing confirmation for a real booking means the trigger never fired
 * or the row didn't parse as expected (run diagnoseSriDwarEmailTriggers()
 * and check the Email_Errors sheet next). If this email does NOT arrive,
 * run verifySenderAlias_() first (EmailSender.gs) — it directly checks
 * whether CONFIG.SENDER_EMAIL_DEFAULT is a verified "Send As" alias on
 * this script's Google account, which is the single most common cause of
 * every confirmation email failing at once.
 */
function sendTestEmailToAdmin() {
  const refId = "SD-TEST-" + new Date().getTime();
  const ok = sendBrandedEmail_({
    to: CONFIG.ADMIN_ALERT_EMAIL,
    subject: `Sri Dwar test email — ${refId}`,
    html: `<p style="font-family:sans-serif;font-size:14px;">This is a manual test send from <code>sendTestEmailToAdmin()</code> ` +
      `in Triggers.gs, sent at ${new Date().toString()}. If you're reading this, GmailApp sending, the sender alias, ` +
      `and today's quota are all working correctly.</p>`,
    refId: refId,
    emailType: "manual_test",
  });
  const result = ok ? `Test email sent to ${CONFIG.ADMIN_ALERT_EMAIL} — check that inbox now.`
    : `Test email FAILED to send — check the Email_Errors sheet in the Puja Booking spreadsheet for the reason.`;
  Logger.log(result);
  try {
    SpreadsheetApp.getUi().alert(result);
  } catch (e) {
    // No UI context — Logger.log above is enough.
  }
  return result;
}

// ─── Generic row parsing ────────────────────────────────────────────────────
// Handles both plain-column sheets (Devotee Registration) AND sheets where
// Ref/Payment Status/Wish are packed into one free-text "Intent"/"Message"
// column (Puja, Seva, Certificate, and every acknowledgement-only form) —
// matching the embedding pattern already used across BookNowWizard.tsx,
// Hero.tsx, ContactUs.tsx, ReportTempleIssues.tsx, and TempleRegister.tsx
// ("... | Ref: XXXX").

function _normalizeText_(v) {
  return String(v == null ? "" : v).replace(/\s+/g, " ").trim();
}

function _findHeaderIndex_(headers, pattern) {
  for (let i = 0; i < headers.length; i++) {
    if (pattern.test(_normalizeText_(headers[i]))) return i;
  }
  return -1;
}

function _findByHeader_(headers, values, pattern) {
  const idx = _findHeaderIndex_(headers, pattern);
  return idx >= 0 ? values[idx] : "";
}

function _findEmail_(headers, values) {
  // Prefer a real email-address column, but also support common Google Form
  // headings and website-synced sheets where the email is embedded in text.
  const idx = _findHeaderIndex_(headers, /e-?mail|email address|contact email|mail id/i);
  if (idx >= 0) {
    const direct = _normalizeText_(values[idx]);
    const m = direct.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (m) return m[0].trim();
  }
  for (const v of values) {
    const m = _normalizeText_(v).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (m) return m[0].trim();
  }
  return "";
}

function _extractFirstMatch_(text, patterns) {
  for (const re of patterns) {
    const m = String(text).match(re);
    if (m && m[1]) return _normalizeText_(m[1]);
  }
  return "";
}

function _extractStatus_(fullText, headers, values) {
  const direct = _findByHeader_(headers, values, /payment\s*status|payment\s*state|transaction\s*status|order\s*status/i);
  const combined = [direct, fullText].filter(Boolean).join(" | ");
  return _extractFirstMatch_(combined, [
    /Payment\s*Status\s*[:=-]\s*([^|\n\r\[\]]+)/i,
    /Payment\s*State\s*[:=-]\s*([^|\n\r\[\]]+)/i,
    /Transaction\s*Status\s*[:=-]\s*([^|\n\r\[\]]+)/i,
    /Order\s*Status\s*[:=-]\s*([^|\n\r\[\]]+)/i,
  ]) || _normalizeText_(direct);
}

function _isPaidStatus_(status) {
  return /\b(paid|success|successful|succeeded|captured|completed|confirmed|verified|settled)\b/i.test(String(status || ""))
    && !/\b(unpaid|failed|failure|cancelled|canceled|pending|awaiting|processing|refunded|reversed)\b/i.test(String(status || ""));
}

function _isPendingStatus_(status) {
  return /pending|awaiting|processing|unpaid|payment\s*due|not\s*paid/i.test(String(status || ""));
}

// ✅ ADDED (requested behaviour change): distinguishes the two different
// "pending" rows a booking can have —
//   Row 1, written at Step 1→2 (BookNowWizard.tsx handleNextToPayment):
//     "Pending — Awaiting Confirmation" — devotee has filled in details but
//     has NOT tapped "I Have Paid" yet. No payment
//     action has happened. Still handled by the 30-minute
//     scanForPaymentReminders job, unchanged.
//   Row 2, written the instant "I Have Paid" is tapped
//     (UPIPaymentModal.tsx handleConfirmPayment/handleWhatsAppPay via
//     BookNowWizard.tsx handlePaymentConfirmed): "Payment Submitted —
//     Pending Verification" — a real payment action has happened; only our
//     team's verification is outstanding. This is the row that should now
//     get an IMMEDIATE "payment received, under review" email — see
//     _handleBookingSheetSubmit_ and scanForMissedBookingEmails below —
//     and must be excluded from the "please still pay" reminder in
//     scanForPaymentReminders, since a "please pay" nudge would be
//     confusing/wrong for someone who has already paid.
// Matched on the literal word "submitted" rather than hardcoding the exact
// status string, so this still works if that string is ever reworded
// slightly on the client side.
function _isPaymentSubmittedPendingStatus_(status) {
  return /submitted/i.test(String(status || "")) && _isPendingStatus_(status) && !_isPaidStatus_(status);
}

function _isCompletedFlag_(value) {
  const v = _normalizeText_(value).toLowerCase();
  return !!v && !/^(false|no|n|0|pending|not completed|incomplete|cancelled|canceled)$/i.test(v);
}

// ✅ ROOT-CAUSE FIX for duplicate rows re-triggering the same workflow:
// this fallback used to be keyed on (spreadsheetId, sheetName, rowNumber).
// A booking row with no explicit "Ref: ..." text in it (common for
// website-synced rows) got a fallback ID derived purely from its physical
// row position. If Google Forms, a form-edit resync, or a website retry
// ever wrote the SAME booking again as a NEW row (e.g. a form response
// re-submitted, or a webhook retry after a slow response), that new row
// landed at a new row number and therefore got a completely different
// fallback ref — so hasAlreadySent_ never recognised it as the same
// booking and sent a fresh confirmation/pending pair for it. The fallback
// is now keyed on the booking's own CONTENT (email + item + amount),
// bucketed into a 30-minute window using the row's own Timestamp column
// when present. Two genuinely different bookings (different item/amount,
// or the same item ordered again outside that window) still get distinct
// refs; the same booking resubmitted minutes apart now collapses onto the
// same dedupe key instead of being treated as new.
function _getStableRowRef_(spreadsheetId, sheetName, rowNumber, ctx, timestamp) {
  if (ctx && ctx.refId && !/^SD-[0-9a-f]{8}$/i.test(ctx.refId) && !/^SD-ROW-/i.test(ctx.refId)) return ctx.refId;

  let raw;
  if (ctx && ctx.email && (ctx.itemName || ctx.amount)) {
    const ts = timestamp instanceof Date && !isNaN(timestamp.getTime()) ? timestamp : null;
    // Round the timestamp down to a 30-minute bucket so retries/resyncs of
    // the same booking within that window share one identity, while a
    // later, separate booking of the same item does not.
    const bucket = ts ? Math.floor(ts.getTime() / (30 * 60 * 1000)) : "no-ts";
    raw = `${spreadsheetId}|content|${ctx.email.toLowerCase()}|${ctx.itemName || ""}|${ctx.amount || ""}|${bucket}`;
  } else {
    raw = `${spreadsheetId}|${sheetName}|${rowNumber}`;
  }
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, raw);
  return "SD-ROW-" + digest.map(b => (b + 256) % 256).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 12).toUpperCase();
}

function extractRowContext_(headers, values, meta) {
  const fullText = values.map(_normalizeText_).join(" | ");
  // ✅ ROOT-CAUSE FIX (wrong/colliding Ref IDs → repeat "Payment confirmed"
  // emails every ~15 minutes): the Ref pattern below used to be
  // /Ref(?:erence)?\s*[:=-]\s*(...)/i with NO word-boundary anchor. That
  // literal text also matches midway through completely unrelated words —
  // "Puja Date Preference: 2026-08-15" (Simple Pujas / OnlinePuja.tsx) and
  // "Preferred Session Date: ..." (Wellness enrollments) both contain the
  // substring "reference"/"referred" starting one character in ("P-reference",
  // "P-referred"), which the old pattern happily matched — extracting the
  // PUJA DATE itself ("2026-08-15") as the booking's Ref ID instead of the
  // real "Ref: SDP-XXXXXX" that appears later in the same row (it comes from
  // the Sankalpa/Seva/Guidance Intent column, which is the LAST column in
  // the form, so the bogus "Preference:" match — earlier in the row — always
  // won since String.match() returns the first/leftmost match).
  // Effect: every booking made for the same preferred date collapsed onto
  // the identical fake Ref ID ("2026-08-15"), so completely different
  // devotees' bookings were treated as "the same booking" — sometimes
  // wrongly deduped away, sometimes (depending on emailType/order across the
  // 15-minute safety-net scan) re-sent, which is what produced the "Payment
  // confirmed (Ref 2026-08-15)" emails repeating every ~15 minutes.
  // Fix: anchor the match to a real word boundary (\b) before "Ref"/
  // "Reference", so it can only match a standalone "Ref"/"Reference" token
  // (preceded by start-of-string, a space, "|", etc.) and never a substring
  // sitting inside "Preference", "Preferred", "Conference", etc. Every
  // genuine "Ref: SDP-XXXXXX" / "Reference: SDR-XXX-XXXXXX" in the row is
  // still matched exactly as before.
  const ref = _extractFirstMatch_(fullText, [
    /\bRef(?:erence)?\s*[:=-]\s*([A-Za-z0-9][A-Za-z0-9_-]{2,})/i,
    /\bBooking\s*(?:ID|Reference)\s*[:=-]\s*([A-Za-z0-9][A-Za-z0-9_-]{2,})/i,
    /\bCertificate\s*(?:No|Number)\s*[:=-]\s*([A-Za-z0-9][A-Za-z0-9_-]{2,})/i,
  ]);
  const amount = _extractFirstMatch_(fullText, [
    /(?:Amount|Fee|Dakshina|Contribution|Total)\s*[:=-]?\s*₹?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /₹\s*([\d,]+(?:\.\d{1,2})?)/,
  ]) || _normalizeText_(_findByHeader_(headers, values, /amount|fee|dakshina|contribution|total/i));
  const panditName = _extractFirstMatch_(fullText, [
    /Priest\s*\/??\s*Expert\s*Selection\s*[:=-]\s*([^|\[\]]+)/i,
    /(?:Pandit|Pujari|Priest)\s*(?:Name|Selected)?\s*[:=-]\s*([^|\[\]]+)/i,
  ]);

  const ctx = {
    name: _normalizeText_(_findByHeader_(headers, values, /full\s*name|devotee\s*name|customer\s*name/i) || _findByHeader_(headers, values, /^name$/i)),
    email: _findEmail_(headers, values),
    phone: _normalizeText_(_findByHeader_(headers, values, /phone|mobile|whatsapp/i)),
    city: _normalizeText_(_findByHeader_(headers, values, /city|location/i)),
    gotra: _normalizeText_(_findByHeader_(headers, values, /gotra/i)),
    rashi: _normalizeText_(_findByHeader_(headers, values, /rashi|moon sign/i)),
    deity: _normalizeText_(_findByHeader_(headers, values, /deity|god|goddess/i)),
    temple: _normalizeText_(_findByHeader_(headers, values, /temple/i)),
    itemName: _normalizeText_(_findByHeader_(headers, values, /puja selected|seva selected|service selected|service name|puja name|seva name|temple visited/i)),
    panditName: panditName && !/^any approved/i.test(panditName) ? panditName : "",
    formType: _normalizeText_(_findByHeader_(headers, values, /^type$/i) || _findByHeader_(headers, values, /query\s*type|form\s*type/i)),
    refId: ref || "",
    paymentStatus: _extractStatus_(fullText, headers, values),
    amount: amount,
    scheduledDate: _normalizeText_(_findByHeader_(headers, values, /preferred.*date|scheduled.*date|puja.*date|seva.*date|date of puja|date of seva/i)),
    performedDate: _normalizeText_(_findByHeader_(headers, values, /performed.*date|completion.*date|completed.*date|date.*performed/i)),
    rawText: fullText,
  };
  ctx.refId = ctx.refId || (meta ? _getStableRowRef_(meta.spreadsheetId || "", meta.sheetName || "", meta.rowNumber || 0, ctx, meta.timestamp) : "");
  return ctx;
}

function _findRowTimestamp_(headers, values) {
  const idx = _findHeaderIndex_(headers, /^timestamp$/i) !== -1 ? _findHeaderIndex_(headers, /^timestamp$/i) : _findHeaderIndex_(headers, /timestamp/i);
  if (idx === -1) return null;
  const d = new Date(values[idx]);
  return isNaN(d.getTime()) ? null : d;
}

function _getHeadersAndRow_(range) {
  const sheet = range.getSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = sheet.getRange(range.getRow(), 1, 1, sheet.getLastColumn()).getValues()[0];
  return { headers, row };
}

// ─── 1. Welcome ─────────────────────────────────────────────────────────────

// ✅ FIX (2026-08-26): "double entry" cleanup for the Pending→Final
// two-stage submission pattern used by Devotee/Temple/Expert registration
// (see the matching comments in TempleRegister.tsx and Hero.tsx). That
// pattern exists on purpose — it's a safety net so a registration is never
// lost if the devotee closes the tab before finishing the divine
// contribution step — but it means every registration normally leaves TWO
// rows in the sheet (one "Pending — Awaiting Decision" placeholder, one
// real Final row), even when the devotee simply skips the contribution.
// This removes the now-redundant Pending row the instant its matching
// Final row lands, so the sheet keeps exactly one row per registration
// without losing the safety net — the Pending row already did its job
// (capturing the lead) before being cleaned up.
//
// Only ever deletes a row that is BOTH: (a) an exact Ref ID match to the
// row that just landed, and (b) still literally contains the "Pending —
// Awaiting Decision" marker verbatim. It never touches any other row, and
// it only runs when the row that just landed is itself NOT a Pending row
// (so a fresh Pending submission is never mistaken for a Final one).
function _pruneStalePendingSiblingRow_(e) {
  try {
    const sheet = e.range.getSheet();
    const newRowNum = e.range.getRow();
    const data = sheet.getDataRange().getValues();
    const newRow = data[newRowNum - 1];
    if (!newRow) return;

    const newRowText = newRow.map(_normalizeText_).join(" | ");
    if (/Pending\s*[—-]\s*Awaiting Decision/i.test(newRowText)) return; // this IS the pending row — nothing to prune yet

    const refPattern = /\bRef(?:erence)?\s*[:=-]\s*([A-Za-z0-9][A-Za-z0-9_-]{2,})/i;
    const newRef = _extractFirstMatch_(newRowText, [refPattern]);
    if (!newRef) return;

    // Walk bottom-up, skipping the row that just landed, so a deletion
    // never shifts the row number of a still-unchecked row above it.
    for (let r = data.length - 1; r >= 1; r--) {
      if (r === newRowNum - 1) continue;
      const candidateText = data[r].map(_normalizeText_).join(" | ");
      if (!/Pending\s*[—-]\s*Awaiting Decision/i.test(candidateText)) continue;
      const candidateRef = _extractFirstMatch_(candidateText, [refPattern]);
      if (candidateRef && candidateRef === newRef) {
        sheet.deleteRow(r + 1); // +1: data[] is 0-indexed, sheet rows are 1-indexed
        break; // exactly one Pending sibling can ever exist per Ref ID
      }
    }
  } catch (err) {
    logError_("_pruneStalePendingSiblingRow_", err);
  }
}

function onDevoteeRegistrationSubmit(e) {
  try {
    const { headers, row } = _getHeadersAndRow_(e.range);
    // Runs AFTER the read above, not before: the Pending sibling row this
    // deletes always has a lower row number than the row that just landed
    // (it was submitted earlier), so deleting it shifts every row number
    // below it — including this one — up by one. Reading e.range first
    // avoids that shift ever affecting this row's own data.
    _pruneStalePendingSiblingRow_(e);
    const ctx = extractRowContext_(headers, row);
    if (!ctx.email) return;

    const built = buildWelcomeEmail_({
      name: ctx.name || "Devotee",
      city: ctx.city,
      gotra: ctx.gotra,
      rashi: ctx.rashi,
      deity: ctx.deity,
      refId: ctx.refId,
    });

    sendBrandedEmail_({
      to: ctx.email,
      // No emoji in the subject line on purpose: subjects are plain text
      // (not HTML), so the &#128591;-style numeric references used in the
      // HTML body below can't be used here — they'd just show up literally
      // as "&#128591;" to the recipient. A raw emoji character would work
      // for well-behaved tools, but re-introduces the exact encoding risk
      // this whole cleanup was fixing, so subjects stay emoji-free.
      // _safeSubject_() (EmailSender.gs) caps a devotee-supplied name at a
      // safe length before it lands in the subject line — see the
      // subject-length-guard note in EmailSender.gs for why this matters.
      subject: `Welcome to Sri Dwar, ${_safeSubject_(ctx.name) || "Devotee"}!`,
      html: built.html,
      inlineImages: built.inlineImages || undefined,
      refId: ctx.refId,
      emailType: "welcome",
    });
  } catch (err) {
    logError_("onDevoteeRegistrationSubmit", err);
  }
}

// ─── 2. Booking Confirmation (Puja / Seva / Certificate) ──────────────────

// ─── Counselling & Guidance / Holistic Wellness booking-kind detection ─────
// ✅ FIX: Counselling & Guidance and Holistic Wellness bookings share the
// same physical Google Sheet/pipeline as Puja bookings (see BookNowWizard.tsx
// — "Keeps the same 'puja_booking' formType ... for every category"). Every
// email built from this sheet was using buildBookingConfirmationEmail_ /
// buildPaymentReminderEmail_ / buildCertificateReadyEmail_ completely
// unbranched, which hardcode "Sankalp", "sacred rite", "Sankalp offered
// before the deity", and "Digital Puja Certificate" — none of which are
// true for a counselling session or a wellness enrollment, and the
// serviceLabel shown was always the static "Puja" for every row in this
// sheet regardless of what was actually booked. That's a compliance
// violation (confirmation copy must match the actual service) and it was
// live.
//
// ⚠️ CORRECTED DETECTION SOURCE: BookNowWizard.tsx writes its "<typeLabel>
// - <pujaName>" string (e.g. "Counselling & Guidance Booking - Personal
// Guidance & Life Counselling") into the payload's `type` field — but
// googleFormSync.ts's puja_booking config maps THAT field to typeKey
// entry.898437491, which is the live Google Form's "Puja Selected"
// question (see the comment on that mapping). So on the actual sheet, this
// text lands in the "Puja Selected" COLUMN, not a column literally named
// "Type". extractRowContext_ only puts that into ctx.itemName (via its
// /puja selected|seva selected/i header match) — ctx.formType (which only
// matches a column literally named "type"/"query type"/"form type") is
// EMPTY for every row in this sheet. Reading ctx.formType here — which an
// earlier pass of this fix did — would have silently detected nothing,
// ever, in production, while looking correct in code review. Detection
// below reads ctx.itemName (falling back to ctx.formType in case a sheet
// ever does have a real "Type" column), so it matches what's actually on
// the sheet today. Genuine Puja/Seva rows never contain "Counselling" or
// "Holistic Wellness" in their item text, so bookingKind stays undefined
// for them and every existing email they receive is unchanged.
function _bookingKindFromFormType_(formTypeOrItemName) {
  const t = String(formTypeOrItemName || "");
  if (/counselling\s*&?\s*guidance/i.test(t)) return "counselling_guidance";
  if (/holistic\s*wellness/i.test(t)) return "holistic_wellness";
  // ✅ ADDED (requested behaviour change): the free/optional-contribution
  // Darshan Certificate request (Hero.tsx's "Receive Darshan Certificate"
  // modal, DARSHAN_CERTIFICATE sheet) is not a puja/seva a pandit performs
  // — no rite, no audio recording, no "Officiating Pandit" — it's a
  // devotional record of a temple visit the devotee already made. It was
  // previously falling through to the generic ritual copy below
  // ("Digital Puja Certificate and audio recording"), which doesn't apply
  // and doesn't mention the real Temple Visit Certificate at all. See
  // buildBookingConfirmationEmail_'s isTempleVisitCertificate branch.
  if (/darshan certificate/i.test(t)) return "temple_darshan_certificate";
  return undefined;
}

function _bookingLabelFromKind_(kind, fallbackLabel) {
  if (kind === "counselling_guidance") return "Counselling Session";
  if (kind === "holistic_wellness") return "Wellness Enrollment";
  if (kind === "temple_darshan_certificate") return "Temple Visit Certificate";
  return fallbackLabel;
}

function _handleBookingSheetSubmit_(e, serviceLabel, forcedBookingKind) {
  try {
    if (!e || !e.range) throw new Error("Missing spreadsheet form-submit event range.");
    const { headers, row } = _getHeadersAndRow_(e.range);
    const sheet = e.range.getSheet();
    const spreadsheetId = sheet.getParent().getId();
    const ctx = extractRowContext_(headers, row, {
      spreadsheetId: spreadsheetId,
      sheetName: sheet.getName(),
      rowNumber: e.range.getRow(),
      timestamp: _findRowTimestamp_(headers, row),
    });
    if (!ctx.email) {
      logError_(`_handleBookingSheetSubmit_ [${serviceLabel}]`, `No email address found in submitted row ${e.range.getRow()}. Headers: ${headers.join(" | ")}`);
      return false;
    }

    // ✅ FIX (requested behaviour change): a row with NO payment action at
    // all yet (Row 1 — devotee filled details, hasn't tapped "I Have
    // Paid") still sends nothing here; that's the ONE case still deferred
    // to the 30-minute scanForPaymentReminders job, unchanged from before.
    //
    // A row where the devotee HAS just tapped "I Have Paid" (Row 2 —
    // payment SUBMITTED, awaiting our team's verification) now sends an
    // immediate "payment received, under review" email right here instead
    // of waiting — see
    // buildBookingConfirmationEmail_'s isPending branch. This uses its own
    // emailType ("payment_under_review"), separate from "payment_confirmed"
    // and "booking", specifically so it can NEVER block the real
    // confirmation email that fires later once an admin actually verifies
    // the payment (paid=true) — hasAlreadySent_ dedupes each emailType
    // independently, so exactly one "under review" email and, later,
    // exactly one "confirmed" email go out for the same refId — never
    // zero, never a duplicate of either.
    const paid = _isPaidStatus_(ctx.paymentStatus);
    const paymentSubmittedPending = _isPaymentSubmittedPendingStatus_(ctx.paymentStatus);
    const pending = _isPendingStatus_(ctx.paymentStatus);
    if (pending && !paid && !paymentSubmittedPending) return false; // Row 1 — deferred to the 30-minute reminder scan

    const status = ctx.paymentStatus || "Payment status awaiting confirmation";

    // ✅ FIX (2026-08-29 — reported bug: a real Darshan Certificate booking
    // for "Jagannath Temple — Puri" sent the generic ritual/puja email
    // instead of the Temple Visit Certificate one): _bookingKindFromFormType_
    // guesses from item-name TEXT, which only works when that text happens
    // to literally contain the phrase "darshan certificate" — most real
    // temple names never do. But onDarshanCertificateSubmit (below) already
    // KNOWS with certainty which sheet just fired, since it's a trigger
    // bound to that one specific spreadsheet — forcedBookingKind carries
    // that certainty in here directly instead of re-guessing from text.
    // Falls back to the old text-based guess only when no forced kind was
    // given (Puja/Seva bookings, where Counselling/Wellness/genuine-Puja
    // still share one sheet and do need the text check).
    const bookingKind = forcedBookingKind || _bookingKindFromFormType_(ctx.itemName || ctx.formType);
    const resolvedLabel = _bookingLabelFromKind_(bookingKind, serviceLabel);

    const built = buildBookingConfirmationEmail_({
      name: ctx.name || "Devotee",
      serviceLabel: resolvedLabel,
      itemName: ctx.itemName || resolvedLabel,
      gotra: ctx.gotra,
      panditName: ctx.panditName,
      refId: ctx.refId,
      amount: ctx.amount,
      paymentStatus: status,
      bookingKind: bookingKind,
    });

    // ctx.itemName pulls the whole "Puja Selected" cell verbatim, which can
    // be far longer than a short item name — _safeSubject_() truncates it
    // before it's interpolated into a subject line (see EmailSender.gs).
    const safeItemName = _safeSubject_(ctx.itemName) || resolvedLabel;

    // ✅ FIX (2026-08-29 — duplicate-email conflict): "payment_confirmed" is
    // now "webhook_invoice_booking_confirmed" — the EXACT dedupe key
    // Webhook.gs / ConfirmedPaymentPoller.gs already use for the same
    // conceptual notification (see those files' own "EMAIL-TYPE
    // NAMESPACING" comments — they were deliberately given a different key
    // FROM this one specifically so neither system could block the other,
    // which is backwards: it meant a devotee could receive BOTH a
    // Sheets-flow confirmation and a Supabase-poller invoice email for the
    // same payment. Sharing one key here means whichever system's trigger
    // condition is met first (a Sheet row saying "Paid", or Supabase's
    // activities.payment_status flipping to 'confirmed') sends exactly one
    // email; the other is then correctly skipped by hasAlreadySent_,
    // instead of also sending its own. Neither trigger mechanism was
    // removed — an admin using either workflow still works exactly as
    // before, only now capped at one notification per booking. In
    // practice this branch rarely fires today anyway (nothing in the live
    // booking flow currently writes a "Paid" row back to the Sheet — see
    // BookNowWizard.tsx/TemplateBazaar.tsx), so real-world behaviour is
    // unchanged; this closes the risk if that ever changes.
    const paidEmailType = "webhook_invoice_booking_confirmed";
    return sendBrandedEmail_({
      to: ctx.email,
      subject: paid
        ? `Payment confirmed — ${safeItemName} (Ref ${ctx.refId})`
        : paymentSubmittedPending
        ? `Payment received, under review — ${safeItemName} (Ref ${ctx.refId})`
        : `Your ${safeItemName} booking is received — Ref ${ctx.refId}`,
      html: built.html,
      inlineImages: built.inlineImages || undefined,
      refId: ctx.refId,
      // No attachments passed here in any branch — this "under review"
      // email (and the plain "booking received" one) never carries a
      // transaction document/certificate image, by design; only the final
      // certificateService.ts pipeline (once payment is actually verified)
      // attaches anything.
      emailType: paid ? paidEmailType : paymentSubmittedPending ? "payment_under_review" : "booking",
    });
  } catch (err) {
    logError_(`_handleBookingSheetSubmit_ [${serviceLabel}]`, err);
    return false;
  }
}

function onPujaBookingSubmit(e) { _handleBookingSheetSubmit_(e, CONFIG.SHEETS.PUJA_BOOKING.serviceLabel); }
function onSevaBookingSubmit(e) { _handleBookingSheetSubmit_(e, CONFIG.SHEETS.SEVA_BOOKING.serviceLabel); }
// ✅ FIX (2026-08-29): passes "temple_darshan_certificate" explicitly — this
// trigger is bound to the Darshan Certificate spreadsheet specifically, so
// there is no need (and, as the bug report showed, no reliability) in
// re-guessing the booking kind from item-name text inside
// _handleBookingSheetSubmit_. See the fix note there for the full story.
function onDarshanCertificateSubmit(e) { _handleBookingSheetSubmit_(e, CONFIG.SHEETS.DARSHAN_CERTIFICATE.serviceLabel, "temple_darshan_certificate"); }

// ─── 3. Booking/payment safety-net scan ─────────────────────────────────────
// Website/API writes to a Google Sheet do NOT fire a spreadsheet
// onFormSubmit trigger. This scanner is therefore essential: it catches
// rows written by the website even when no Google Form event was generated.
// It is idempotent and will not duplicate an email already recorded in the
// Email_Send_Log sheet.
function scanForMissedBookingEmails() {
  const sheetsToScan = [
    { cfg: CONFIG.SHEETS.PUJA_BOOKING, label: CONFIG.SHEETS.PUJA_BOOKING.serviceLabel },
    { cfg: CONFIG.SHEETS.SEVA_BOOKING, label: CONFIG.SHEETS.SEVA_BOOKING.serviceLabel },
    // ✅ FIX (2026-08-29): forcedKind carries the same certainty
    // onDarshanCertificateSubmit has (this sheet IS Darshan Certificate,
    // no need to guess) into this safety-net scan too — see the fix note
    // on _handleBookingSheetSubmit_ for the full story.
    { cfg: CONFIG.SHEETS.DARSHAN_CERTIFICATE, label: CONFIG.SHEETS.DARSHAN_CERTIFICATE.serviceLabel, forcedKind: "temple_darshan_certificate" },
  ];

  sheetsToScan.forEach(({ cfg, label, forcedKind }) => {
    try {
      const ss = SpreadsheetApp.openById(cfg.spreadsheetId);
      const sheet = ss.getSheetByName(cfg.sheetName) || ss.getSheets()[0];
      const data = sheet.getDataRange().getValues();
      if (data.length < 2) return;
      const headers = data[0];

      for (let r = 1; r < data.length; r++) {
        const ctx = extractRowContext_(headers, data[r], {
          spreadsheetId: cfg.spreadsheetId,
          sheetName: sheet.getName(),
          rowNumber: r + 1,
          timestamp: _findRowTimestamp_(headers, data[r]),
        });
        if (!ctx.email || !ctx.refId) continue;

        const paid = _isPaidStatus_(ctx.paymentStatus);
        const paymentSubmittedPending = _isPaymentSubmittedPendingStatus_(ctx.paymentStatus);
        const pending = _isPendingStatus_(ctx.paymentStatus);
        // ✅ FIX: a genuinely never-attempted-payment row (Row 1) is still
        // skipped here entirely — the one "please pay" notice for that case
        // comes only from scanForPaymentReminders, 30 minutes later. A
        // payment-SUBMITTED-pending row (Row 2 — "I Have Paid" already
        // tapped) is no longer skipped: if the instant onFormSubmit trigger
        // ever missed it (e.g. a website/API write with no Google Forms
        // event), this hourly-ish safety net now still gets the devotee
        // their "payment received, under review" email, deduped by its own
        // "payment_under_review" emailType exactly like every other send
        // in this file.
        if (pending && !paid && !paymentSubmittedPending) continue;
        // ✅ FIX (2026-08-29 — duplicate-email conflict): shares
        // "webhook_invoice_booking_confirmed" with Webhook.gs/
        // ConfirmedPaymentPoller.gs's own dedupe key for the exact same
        // reason as the identical fix in _handleBookingSheetSubmit_ above
        // — see that comment for the full explanation. Keep these two in
        // sync if this ever changes.
        const emailType = paid ? "webhook_invoice_booking_confirmed" : paymentSubmittedPending ? "payment_under_review" : "booking";
        if (hasAlreadySent_(ctx.refId, emailType)) continue;

        // Avoid turning an unrelated/blank row into a customer email.
        if (!ctx.name && !ctx.itemName && !ctx.paymentStatus && !ctx.amount) continue;

        const bookingKind = forcedKind || _bookingKindFromFormType_(ctx.itemName || ctx.formType);
        const resolvedLabel = _bookingLabelFromKind_(bookingKind, label);

        const built = buildBookingConfirmationEmail_({
          name: ctx.name || "Devotee",
          serviceLabel: resolvedLabel,
          itemName: ctx.itemName || resolvedLabel,
          gotra: ctx.gotra,
          panditName: ctx.panditName,
          refId: ctx.refId,
          amount: ctx.amount,
          paymentStatus: ctx.paymentStatus || "Payment status awaiting confirmation",
          bookingKind: bookingKind,
        });

        const safeItemName = _safeSubject_(ctx.itemName) || resolvedLabel;

        // Row 1 (never-attempted-payment, genuinely pending) never reaches
        // here (skipped above) — this is "paid", "payment submitted &
        // under review", or the no-payment-status "neither" case.
        sendBrandedEmail_({
          to: ctx.email,
          subject: paid
            ? `Payment confirmed — ${safeItemName} (Ref ${ctx.refId})`
            : paymentSubmittedPending
            ? `Payment received, under review — ${safeItemName} (Ref ${ctx.refId})`
            : `Your ${safeItemName} booking is received — Ref ${ctx.refId}`,
          html: built.html,
          inlineImages: built.inlineImages || undefined,
          refId: ctx.refId,
          emailType: emailType,
        });
      }
    } catch (err) {
      logError_(`scanForMissedBookingEmails [${label}]`, err);
    }
  });
}

// ─── 3. Payment Reminder (time-driven scan) ────────────────────────────────
// Walks each booking sheet's rows every hour looking for Ref IDs whose
// LATEST row is still "Pending" and at least PAYMENT_REMINDER_DELAY_HOURS
// old (Config.gs: 0.5 = 30 minutes, per the requested behaviour), with no
// "Paid — Confirmed" row yet for that same booking. This is now the ONLY
// place a "payment pending" email is ever sent — see the ✅ ROOT-CAUSE FIX
// notes in _handleBookingSheetSubmit_ and scanForMissedBookingEmails above.
// Dedupe is per-refId via emailType "payment_reminder_1" (capped at
// CONFIG.PAYMENT_REMINDER_MAX_SENDS, currently 1), so this can run hourly
// forever without ever re-sending the same reminder for the same booking.

function scanForPaymentReminders() {
  const sheetsToScan = [
    { cfg: CONFIG.SHEETS.PUJA_BOOKING, label: CONFIG.SHEETS.PUJA_BOOKING.serviceLabel },
    { cfg: CONFIG.SHEETS.SEVA_BOOKING, label: CONFIG.SHEETS.SEVA_BOOKING.serviceLabel },
    // ✅ FIX (2026-08-29): see the identical fix note in
    // scanForMissedBookingEmails above.
    { cfg: CONFIG.SHEETS.DARSHAN_CERTIFICATE, label: CONFIG.SHEETS.DARSHAN_CERTIFICATE.serviceLabel, forcedKind: "temple_darshan_certificate" },
  ];

  sheetsToScan.forEach(({ cfg, label, forcedKind }) => {
    try {
      const ss = SpreadsheetApp.openById(cfg.spreadsheetId);
      const sheet = ss.getSheetByName(cfg.sheetName) || ss.getSheets()[0];
      const data = sheet.getDataRange().getValues();
      if (data.length < 2) return;
      const headers = data[0];
      const timestampColIdx = headers.findIndex((h) => /timestamp/i.test(String(h)));

      // Build latest-row-per-refId map (final rows override pending rows).
      // ✅ ROOT-CAUSE FIX: this used to call extractRowContext_ with NO meta,
      // so a row with no explicit "Ref: ..." text got refId "" and was
      // silently skipped by every reminder scan forever (no fallback ref
      // was ever computed for it here, unlike the other scanners). Passing
      // the same meta (including the row's own timestamp) used everywhere
      // else means a row identified only by its content still gets a
      // reminder, and resolves to the SAME dedupe key that
      // scanForMissedBookingEmails / onFormSubmit already used for it.
      const latestByRef = {};
      for (let r = 1; r < data.length; r++) {
        const rowTimestamp = timestampColIdx >= 0 ? new Date(data[r][timestampColIdx]) : null;
        const ctx = extractRowContext_(headers, data[r], {
          spreadsheetId: cfg.spreadsheetId,
          sheetName: sheet.getName(),
          rowNumber: r + 1,
          timestamp: rowTimestamp,
        });
        if (!ctx.refId) continue;
        const ts = rowTimestamp instanceof Date && !isNaN(rowTimestamp.getTime()) ? rowTimestamp : new Date();
        latestByRef[ctx.refId] = { ctx, ts };
      }

      Object.keys(latestByRef).forEach((refId) => {
        const { ctx, ts } = latestByRef[refId];
        if (!ctx.email || !/pending/i.test(ctx.paymentStatus)) return; // paid, skipped, or no email

        // ✅ FIX (requested behaviour change): a row whose LATEST status is
        // "Payment Submitted — Pending Verification" means the devotee has
        // already tapped "I Have Paid" — they already
        // got (or will get, from _handleBookingSheetSubmit_ /
        // scanForMissedBookingEmails) their own "payment received, under
        // review" email. Sending THIS "please still pay" reminder to them
        // too would be a confusing, wrong duplicate — a nudge to pay
        // something they've already paid. Only a row that never advanced
        // past "Pending — Awaiting Confirmation" (no payment action at all)
        // should ever reach this reminder.
        if (_isPaymentSubmittedPendingStatus_(ctx.paymentStatus)) return;

        // Belt-and-braces: never send a "still pending" reminder for a
        // booking that has already been confirmed (e.g. the latest-row
        // read above is momentarily stale relative to a just-recorded
        // payment_confirmed send elsewhere in the same run).
        if (hasAlreadySent_(refId, "payment_confirmed")) return;

        // Same belt-and-braces guard for the new "under review" email —
        // covers the rare timing edge where this scan's read of the sheet
        // is momentarily stale relative to a just-sent
        // payment_under_review email for the same refId in this same run.
        if (hasAlreadySent_(refId, "payment_under_review")) return;

        const hoursSince = (Date.now() - ts.getTime()) / 36e5;
        if (hoursSince < CONFIG.PAYMENT_REMINDER_DELAY_HOURS) return;

        for (let attempt = 1; attempt <= CONFIG.PAYMENT_REMINDER_MAX_SENDS; attempt++) {
          const emailType = `payment_reminder_${attempt}`;
          if (hasAlreadySent_(refId, emailType)) continue;

          const bookingKind = forcedKind || _bookingKindFromFormType_(ctx.itemName || ctx.formType);
          const resolvedLabel = _bookingLabelFromKind_(bookingKind, label);

          const built = buildPaymentReminderEmail_({
            name: ctx.name || "Devotee",
            serviceLabel: resolvedLabel,
            itemName: ctx.itemName || resolvedLabel,
            refId: refId,
            amount: ctx.amount,
            bookingKind: bookingKind,
          });

          sendBrandedEmail_({
            to: ctx.email,
            subject: `Reminder: payment pending for your ${_safeSubject_(ctx.itemName) || resolvedLabel} (Ref ${refId})`,
            html: built.html,
            inlineImages: built.inlineImages || undefined,
            refId: refId,
            emailType: emailType,
          });
          break; // one reminder per scan pass per refId
        }
      });
    } catch (err) {
      logError_(`scanForPaymentReminders [${label}]`, err);
    }
  });
}

// ─── 4. Certificate Ready ───────────────────────────────────────────────────
// Triggered by a "Puja Completed" checkbox/date column YOU tick by hand once
// the pandit confirms the rite was performed — there's no automated signal
// for "the puja actually happened," so this stays a deliberate human action.
// Add a column literally named "Puja Completed" (TRUE/FALSE checkbox, or any
// non-empty value) to each booking sheet; the hourly scan below picks it up.

function scanForCompletedPujas() {
  const sheetsToScan = [
    { cfg: CONFIG.SHEETS.PUJA_BOOKING, label: CONFIG.SHEETS.PUJA_BOOKING.serviceLabel },
    { cfg: CONFIG.SHEETS.SEVA_BOOKING, label: CONFIG.SHEETS.SEVA_BOOKING.serviceLabel },
    // ✅ FIX (2026-08-29): see the identical fix note in
    // scanForMissedBookingEmails above. In practice a free Darshan
    // Certificate row never has a paid ref, so this scan's paidRefs gate
    // already excludes it almost always — this is a defensive-consistency
    // fix, not a change to observed behaviour.
    { cfg: CONFIG.SHEETS.DARSHAN_CERTIFICATE, label: CONFIG.SHEETS.DARSHAN_CERTIFICATE.serviceLabel, forcedKind: "temple_darshan_certificate" },
  ];

  sheetsToScan.forEach(({ cfg, label, forcedKind }) => {
    try {
      const ss = SpreadsheetApp.openById(cfg.spreadsheetId);
      const sheet = ss.getSheetByName(cfg.sheetName) || ss.getSheets()[0];
      const data = sheet.getDataRange().getValues();
      if (data.length < 2) return;
      const headers = data[0];
      const completedColIdx = headers.findIndex((h) => /puja completed|seva completed|service completed|booking completed|completed|performed/i.test(String(h)));
      if (completedColIdx === -1) return;

      // Build a set of references that have a verified successful payment in
      // ANY row. This handles workflows where the website first writes a
      // pending row and later writes/updates a separate paid row, while the
      // admin marks completion on the original booking row.
      // Same timestamp threading as the other scanners above, so a row
      // without an explicit "Ref: ..." resolves to the SAME fallback
      // content-based ref here as it does everywhere else this row is
      // processed — otherwise this map and the confirmation email's refId
      // could silently disagree for exactly the rows that most need the
      // fallback (see _getStableRowRef_).
      const paidRefs = {};
      for (let r = 1; r < data.length; r++) {
        const c = extractRowContext_(headers, data[r], {
          spreadsheetId: cfg.spreadsheetId,
          sheetName: sheet.getName(),
          rowNumber: r + 1,
          timestamp: _findRowTimestamp_(headers, data[r]),
        });
        if (c.refId && _isPaidStatus_(c.paymentStatus)) paidRefs[c.refId] = true;
      }

      for (let r = 1; r < data.length; r++) {
        const completedFlag = data[r][completedColIdx];
        if (!_isCompletedFlag_(completedFlag)) continue;

        const ctx = extractRowContext_(headers, data[r], {
          spreadsheetId: cfg.spreadsheetId,
          sheetName: sheet.getName(),
          rowNumber: r + 1,
          timestamp: _findRowTimestamp_(headers, data[r]),
        });
        if (!ctx.email || !ctx.refId || !paidRefs[ctx.refId]) continue;

        const performedDate = ctx.performedDate || _normalizeText_(completedFlag) || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Asia/Kolkata", "dd MMM yyyy");
        const bookingKind = forcedKind || _bookingKindFromFormType_(ctx.itemName || ctx.formType);
        const resolvedLabel = _bookingLabelFromKind_(bookingKind, label);
        const built = buildCertificateReadyEmail_({
          name: ctx.name || "Devotee",
          serviceLabel: resolvedLabel,
          itemName: ctx.itemName || resolvedLabel,
          panditName: ctx.panditName,
          performedDate: performedDate,
          deity: ctx.deity,
          temple: ctx.temple,
          refId: ctx.refId,
          bookingKind: bookingKind,
        });

        sendBrandedEmail_({
          to: ctx.email,
          subject: bookingKind
            ? `Your ${_safeSubject_(ctx.itemName) || resolvedLabel} session is complete`
            : `Your ${_safeSubject_(ctx.itemName) || resolvedLabel} is complete — certificate ready`,
          html: built.html,
          inlineImages: built.inlineImages || undefined,
          refId: ctx.refId,
          emailType: "webhook_invoice_certificate_ready",
          // ✅ FIX (2026-08-29 — duplicate-email conflict): was
          // "certificate_ready", which is a DIFFERENT key from the one
          // Webhook.gs/ConfirmedPaymentPoller.gs use ("webhook_invoice_
          // certificate_ready") for the same conceptual "your certificate
          // is ready" notification — meaning an admin marking completion
          // in the Sheet AND completion getting confirmed in Supabase could
          // each independently email the same devotee. Sharing the key
          // means whichever happens first sends the one email; the other
          // is skipped by hasAlreadySent_ (same fix, same reasoning, as
          // the two "payment_confirmed" -> "webhook_invoice_booking_
          // confirmed" changes above in this file). Neither admin
          // workflow — editing the Sheet's completion column, or updating
          // Supabase directly — was removed; both still work exactly as
          // before, just capped at one email per booking between them.
          fromEmail: CONFIG.SENDER_EMAIL_CERTIFICATE,
        });
      }
    } catch (err) {
      logError_(`scanForCompletedPujas [${label}]`, err);
    }
  });
}

// ─── 5. Generic Acknowledgement ─────────────────────────────────────────────
// Covers every sheet in CONFIG.SHEETS.ACKNOWLEDGEMENT_SHEETS: Inquiry,
// Prasad & Prayer Testimony, Temple Registration, Pujari Registration —
// and, as of this fix, the specific forms sharing the "Inquiry" sheet
// (devotee_support/Contact Us, subscription_signup, refund_cancellation_
// request, and temple_issue_report/"Raise Temple Issues With Elected
// Representatives") each now get their OWN accurately-labeled, devotional
// confirmation instead of one generic "Inquiry" reply — or, previously for
// Temple Issue Reports specifically, none at all.

/**
 * Resolves the specific, human-facing form label for one acknowledgement
 * row. Starts from the sheet-level label configured in
 * CONFIG.SHEETS.ACKNOWLEDGEMENT_SHEETS, then — for sheets that multiple
 * website forms share (currently just "Inquiry") — refines it using the
 * row's own "Type" column and, as a fallback, the Ref ID prefix each form
 * generates via makeSubmissionRef() on the website (src/utils/
 * googleFormSync.ts): "SDR-TIR-…" for Temple Issue Reports, "SDR-SUP-…"
 * for general Contact/Support queries, etc. Matching on BOTH keeps this
 * correct even if a form's exact wording in the "Type" column ever
 * changes slightly.
 */
function _resolveAcknowledgementLabel_(baseLabel, ctx) {
  const typeText = String(ctx.formType || "").toLowerCase();
  const refId = String(ctx.refId || "");

  if (/temple\s*\/?\s*culture issue report/.test(typeText) || /^SDR-TIR-/i.test(refId)) {
    return "Temple Issue Report";
  }
  if (/refund|cancellation/.test(typeText) || /^SDR-REFUND-/i.test(refId)) {
    return "Refund / Cancellation Request";
  }
  if (/subscription/.test(typeText)) {
    return "Subscription Signup";
  }
  return baseLabel;
}

/**
 * Shared by both the instant onFormSubmit handler below and the hourly
 * scanForMissedAcknowledgements() safety net, so the two can never drift
 * out of sync with each other. Dedupe (hasAlreadySent_ inside
 * sendBrandedEmail_) means it is always safe to call this for a row that
 * may already have been sent — it silently no-ops in that case.
 */
/**
 * Resolves the "Prasad & Prayer Testimony" sheet's spreadsheet ID by
 * looking it up from CONFIG.SHEETS.ACKNOWLEDGEMENT_SHEETS (matching on the
 * label) instead of hardcoding a second copy of the ID here. That means if
 * this sheet is ever recreated/re-pointed in Config.gs, this exclusion
 * automatically follows — there's exactly one place the ID is defined.
 */
function _prasadTestimonyPrayerWallSheetId_() {
  const match = CONFIG.SHEETS.ACKNOWLEDGEMENT_SHEETS.find((s) => s.label === "Prasad & Prayer Testimony");
  return match ? match.spreadsheetId : null;
}

function _sendAcknowledgementForRow_(spreadsheetId, headers, row) {
  // ✅ FIX (explicit exclusion, per requirement): "Prasad & Prayer
  // Testimony" and "Prayer Wall" submissions must NOT trigger a customer
  // email — they're not important enough to justify the quota, and this
  // sheet is exactly what CONFIG.MAX_EMAILS_PER_DAY / LOW_QUOTA_ALERT
  // exist to protect. Both prasad_testimony and prayer_wall (see
  // googleFormSync.ts) submit to this ONE physical sheet — no email is
  // ever appropriate for a row here.
  //
  // This used to "work" only by accident: DevoteeExperiences.tsx maps the
  // devotee's typed LOCATION into the sheet's Email Address column
  // (`email: newLocation`), and SacredMoments.tsx's Prayer Wall posts are
  // anonymous (`email: "Live Darshan — Prayer Wall"`) — neither is a real
  // email address, so ctx.email came back empty and the `!ctx.email` guard
  // below silently no-opped every time. That's fragile: any future change
  // that starts collecting a real devotee email for testimonials (a
  // plausible, reasonable change on its own) would silently start firing
  // acknowledgement emails again with zero visible symptom. This checks
  // the sheet by ID explicitly instead, so the "no email" behaviour is a
  // real, intentional guarantee — not a side effect of an unrelated field
  // mapping.
  if (spreadsheetId === _prasadTestimonyPrayerWallSheetId_()) return false;

  const ctx = extractRowContext_(headers, row);
  if (!ctx.email || !ctx.refId) return false;

  const match = CONFIG.SHEETS.ACKNOWLEDGEMENT_SHEETS.find((s) => s.spreadsheetId === spreadsheetId);
  const baseLabel = match ? match.label : "enquiry";
  const label = _resolveAcknowledgementLabel_(baseLabel, ctx);

  // ✅ buildAcknowledgementEmail_ now returns { html, inlineImages } instead
  // of a bare HTML string — it fetches the composited Email_Design_Templete.jpg
  // banner (name/reference/form-type already baked into the pixels) and
  // hands back the Blob to embed alongside the markup. See EmailTemplates.gs.
  const built = buildAcknowledgementEmail_({
    name: ctx.name || "Devotee",
    formLabel: label,
    refId: ctx.refId,
  });

  return sendBrandedEmail_({
    to: ctx.email,
    subject: `We've received your ${label} — Sri Dwar`,
    html: built.html,
    inlineImages: built.inlineImages || undefined,
    refId: ctx.refId,
    emailType: "acknowledgement",
  });
}

function onAcknowledgementFormSubmit(e) {
  try {
    const { headers, row } = _getHeadersAndRow_(e.range);
    // See the ordering note in onDevoteeRegistrationSubmit above — must run
    // after the read of e.range above, not before.
    _pruneStalePendingSiblingRow_(e);
    const spreadsheetId = e.range.getSheet().getParent().getId();
    _sendAcknowledgementForRow_(spreadsheetId, headers, row);
  } catch (err) {
    logError_("onAcknowledgementFormSubmit", err);
  }
}

/**
 * Hourly safety net: re-walks every ACKNOWLEDGEMENT_SHEETS sheet and sends
 * a confirmation for any row with a valid email that doesn't have one yet.
 * This is what guarantees a devotee always eventually gets their
 * confirmation even if the instant onFormSubmit trigger above ever missed
 * a row — for example a sheet added to ACKNOWLEDGEMENT_SHEETS before
 * Setup() was re-run, a rare double-fire/edit-conflict, or (the reported
 * issue) "Raise Temple Issues With Elected Representatives" submissions
 * that were landing in the sheet with no confirmation going out. Fully
 * dedupe-safe (hasAlreadySent_ in EmailSender.gs), so re-scanning the same
 * already-confirmed rows every hour never produces a duplicate email.
 */
function scanForMissedAcknowledgements() {
  CONFIG.SHEETS.ACKNOWLEDGEMENT_SHEETS.forEach((cfg) => {
    try {
      const ss = SpreadsheetApp.openById(cfg.spreadsheetId);
      const sheet = ss.getSheetByName(cfg.sheetName) || ss.getSheets()[0];
      const data = sheet.getDataRange().getValues();
      if (data.length < 2) return;
      const headers = data[0];

      for (let r = 1; r < data.length; r++) {
        _sendAcknowledgementForRow_(cfg.spreadsheetId, headers, data[r]);
      }
    } catch (err) {
      logError_(`scanForMissedAcknowledgements [${cfg.label}]`, err);
    }
  });
}


/**
 * REAL END-TO-END EMAIL TEST. Run manually from Apps Script editor.
 * It does not touch booking sheets and uses a fresh reference every run.
 */
function sendDiagnosticEmail_(recipient) {
  const to = String(recipient || CONFIG.ADMIN_ALERT_EMAIL).trim();
  if (!isLikelyValidEmail_(to)) throw new Error(`Invalid test recipient: ${to}`);
  const refId = "SD-DIAG-" + Date.now();
  const ok = sendBrandedEmail_({
    to: to,
    subject: "Sri Dwar email automation test",
    html: `<div style="font-family:Arial,sans-serif;color:#17302e"><h2 style="color:#0c2b26">Sri Dwar Email Test</h2><p>This is a live test of the same email sender used by Puja, Seva, payment and certificate notifications.</p><p><b>Reference:</b> ${refId}</p><p>If this message arrives, outbound email sending is working. If it does not, open Apps Script → Executions and the Email_Errors sheet for the exact error.</p></div>`,
    refId: refId,
    emailType: "diagnostic",
  });
  return ok ? `Sent test email to ${to}` : `Send failed for ${to}. Check Email_Errors and Executions.`;
}

// (Removed: a one-off diagnostic function used to hardcode a real
// customer's email address here. No customer address should ever be
// coded into this project — use sendTestEmailToAdmin() below, or call
// sendDiagnosticEmail_() with no argument, to test against
// CONFIG.ADMIN_ALERT_EMAIL only.)
