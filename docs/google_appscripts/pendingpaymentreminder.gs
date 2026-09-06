/**
 * Sri Dwar — Email Automation: UNIVERSAL PENDING-PAYMENT REMINDER
 * ─────────────────────────────────────────────────────────────────────────
 * NEW FILE. Does not touch Config.gs / EmailSender.gs / EmailTemplates.gs /
 * Webhook.gs. Adds ONE new scan to Triggers.gs's Setup() (see the small
 * addition documented at the bottom of this file) — everything else in
 * Triggers.gs, including the existing scanForPaymentReminders() that covers
 * the 3 booking Sheets, is completely unaffected.
 *
 * WHY THIS EXISTS
 * ----------------
 * scanForPaymentReminders() (Triggers.gs) only ever scanned three specific
 * Google Sheets (Puja, Seva, Darshan Certificate). Every other payment
 * surface on the site — Contact-page donations, temple-issue contributions,
 * testimony/prasad contributions, subscription sign-ups, bazaar orders —
 * writes to Supabase's `activities` table (via recordActivity() in
 * activities.ts) but was NEVER covered by any pending-payment reminder.
 * A devotee who started paying on one of those pages and never completed
 * it would simply never hear from you again.
 *
 * This scan queries Supabase directly instead of a Sheet, so it
 * automatically covers EVERY current and future flow that writes to
 * `activities` — no new spreadsheet ID needs to be wired in each time a new
 * payment surface is added to the site.
 *
 * DEDUPE / SEND LIMIT
 * ----------------------------------------------------------------------
 * ✅ UPDATED (requested behaviour change — max 2 reminders, 24h apart):
 * sends AT MOST CONFIG.PAYMENT_REMINDER_MAX_SENDS (2) reminders per
 * booking, ever, via the SAME Email_Send_Log dedupe every other email in
 * this project already uses (hasAlreadySent_ / sendBrandedEmail_'s own
 * internal check). Reminder 2 additionally requires that reminder 1 was
 * already sent AND that CONFIG.PAYMENT_REMINDER_INTERVAL_HOURS (24h) have
 * passed since reminder 1's own logged send time (_getSentAt_) — the same
 * gating scanForPaymentReminders() in Triggers.gs uses. Uses its own
 * namespaced emailType per attempt, "webhook_pending_payment_reminder_1" /
 * "webhook_pending_payment_reminder_2", so it can never collide with
 * scanForPaymentReminders()'s own "payment_reminder_1" / "payment_
 * reminder_2" values in the same shared log — both systems can run against
 * the same booking without either one double-sending.
 * (Note: rows that already received a reminder under the old, pre-update
 * single emailType "webhook_pending_payment_reminder" are unaffected by
 * this rename — that exact key is simply never dedupe-checked again, so
 * such a row is treated as not-yet-sent-attempt-1 and may receive one
 * fresh reminder under the new numbered key before this 2-reminder cap
 * applies going forward.)
 *
 * WHAT IT SENDS
 * ----------------------------------------------------------------------
 * A plain courtesy notice — "we have not yet received your payment" — never
 * anything implying payment succeeded. This is the "acknowledgement, not a
 * false confirmation" email for abandoned/pending/failed payments.
 *
 * ─── ONE-TIME SETUP (do this once, in order) ────────────────────────────
 * 1. In the Apps Script editor: File icon → "+" → Script → paste this whole
 *    file in as "PendingPaymentReminder.gs".
 * 2. Project Settings → Script Properties → add:
 *      SUPABASE_URL                = the same value as your Render server's
 *                                     SUPABASE_URL env var
 *      SUPABASE_SERVICE_ROLE_KEY   = the same value as your Render server's
 *                                     SUPABASE_SERVICE_ROLE_KEY env var
 *    (Same trust level as CERTIFICATE_ADMIN_SECRET already stored here —
 *    Script Properties are only ever readable by you, the script owner.)
 * 3. Replace Triggers.gs with the updated version delivered alongside this
 *    file (it already includes the "scanForPendingPaymentsUniversal" wiring
 *    — no manual edits needed), then run Setup() once.
 */

function scanForPendingPaymentsUniversal() {
  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty("SUPABASE_URL");
  const supabaseKey = props.getProperty("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    logError_(
      "scanForPendingPaymentsUniversal",
      new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured in Script Properties — see setup step 2.")
    );
    return;
  }

  // Fetches everything old enough for AT LEAST the first reminder;
  // eligibility for a specific attempt (1 or 2) and its own 24h gap is
  // then decided per-row, per-attempt below.
  const cutoffIso = new Date(Date.now() - CONFIG.PAYMENT_REMINDER_DELAY_HOURS * 60 * 60 * 1000).toISOString();

  const activitiesUrl =
    supabaseUrl.replace(/\/$/, "") +
    "/rest/v1/activities?select=ref_id,item_name,payment_status,created_at" +
    "&payment_status=in.(pending_verification,failed)" +
    "&created_at=lte." +
    encodeURIComponent(cutoffIso) +
    "&order=created_at.asc" +
    "&limit=200"; // safety cap per run — hourly cadence means this never backs up

  let rows;
  try {
    const res = UrlFetchApp.fetch(activitiesUrl, {
      method: "get",
      headers: { apikey: supabaseKey, Authorization: "Bearer " + supabaseKey },
      muteHttpExceptions: true,
    });
    if (res.getResponseCode() !== 200) {
      logError_("scanForPendingPaymentsUniversal", new Error("Supabase query failed (" + res.getResponseCode() + "): " + res.getContentText()));
      return;
    }
    rows = JSON.parse(res.getContentText());
  } catch (err) {
    logError_("scanForPendingPaymentsUniversal", err);
    return;
  }

  if (!rows || !rows.length) return;

  rows.forEach(function (row) {
    try {
      const createdAtMs = new Date(row.created_at).getTime();

      // Work out which attempt (if any) is due for this row right now.
      // Mirrors scanForPaymentReminders()'s per-attempt gating in
      // Triggers.gs: attempt 1 is gated off the row's own age, attempt 2
      // is gated off attempt 1's REAL logged send time (24h later), and
      // the loop never sends more than CONFIG.PAYMENT_REMINDER_MAX_SENDS
      // total for the same ref_id.
      let dueEmailType = null;
      for (let attempt = 1; attempt <= CONFIG.PAYMENT_REMINDER_MAX_SENDS; attempt++) {
        const candidateType = "webhook_pending_payment_reminder_" + attempt;
        if (typeof hasAlreadySent_ === "function" && hasAlreadySent_(row.ref_id, candidateType)) continue;

        let earliestAllowedMs;
        if (attempt === 1) {
          earliestAllowedMs = isNaN(createdAtMs) ? 0 : createdAtMs + CONFIG.PAYMENT_REMINDER_DELAY_HOURS * 36e5;
        } else {
          const prevSentAt = _getSentAt_(row.ref_id, "webhook_pending_payment_reminder_" + (attempt - 1));
          if (!prevSentAt) break; // previous reminder hasn't gone out yet — don't skip ahead
          earliestAllowedMs = prevSentAt.getTime() + CONFIG.PAYMENT_REMINDER_INTERVAL_HOURS * 36e5;
        }
        if (Date.now() < earliestAllowedMs) break; // not due yet — try again on a later scan

        dueEmailType = candidateType;
        break;
      }
      if (!dueEmailType) return; // nothing due for this row this pass

      const emailType = dueEmailType;

      const subRes = UrlFetchApp.fetch(
        supabaseUrl.replace(/\/$/, "") +
          "/rest/v1/form_submissions?select=name,email&ref_id=eq." +
          encodeURIComponent(row.ref_id) +
          "&order=created_at.desc&limit=1",
        {
          method: "get",
          headers: { apikey: supabaseKey, Authorization: "Bearer " + supabaseKey },
          muteHttpExceptions: true,
        }
      );
      if (subRes.getResponseCode() !== 200) {
        logError_("scanForPendingPaymentsUniversal [" + row.ref_id + "]", new Error("form_submissions lookup failed: " + subRes.getContentText()));
        return;
      }
      const subs = JSON.parse(subRes.getContentText());
      const sub = subs && subs[0];
      if (!sub || !sub.email) return; // nothing to send to — not an error, just nothing to do for this row

      const name = (sub.name || "").trim() || "Devotee";
      const itemName = (row.item_name || "").trim() || "your request";
      const html =
        '<div style="font-family:Georgia,serif;background:' +
        CONFIG.BRAND.cream +
        ";padding:24px;color:" +
        CONFIG.BRAND.darkGreen +
        ';">' +
        '<h2 style="color:' +
        CONFIG.BRAND.darkGreen +
        ';">We haven\u2019t yet received your payment</h2>' +
        "<p>Dear " +
        name +
        ",</p>" +
        "<p>We noticed your request for <strong>" +
        itemName +
        "</strong> (Reference: " +
        row.ref_id +
        ") is still awaiting payment confirmation.</p>" +
        "<p>If you have already paid, no action is needed \u2014 please allow us a little time to verify it. " +
        "If the payment did not go through, you're welcome to try again from the website.</p>" +
        '<p style="color:' +
        CONFIG.BRAND.textMuted +
        ';font-size:13px;">This is a courtesy reminder only \u2014 it does not confirm that any payment was received. ' +
        "Sri Dwar \u2014 Connect. Contribute. Preserve.</p>" +
        "</div>";

      sendBrandedEmail_({
        to: sub.email,
        subject: "Sri Dwar \u2014 Awaiting Your Payment (" + row.ref_id + ")",
        html: html,
        refId: row.ref_id,
        emailType: emailType,
      });
    } catch (err) {
      logError_("scanForPendingPaymentsUniversal [" + row.ref_id + "]", err);
    }
  });
}

