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
 * Sends AT MOST ONE reminder per booking, ever — via the SAME
 * Email_Send_Log dedupe every other email in this project already uses
 * (hasAlreadySent_ / sendBrandedEmail_'s own internal check). Uses its own
 * namespaced emailType, "webhook_pending_payment_reminder", so it can never
 * collide with scanForPaymentReminders()'s own "payment_reminder_1" /
 * "payment_reminder_2" values in the same shared log — both systems can run
 * against the same booking without either one double-sending.
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

  const cutoffIso = new Date(Date.now() - CONFIG.PAYMENT_REMINDER_DELAY_HOURS * 60 * 60 * 1000).toISOString();
  const emailType = "webhook_pending_payment_reminder";

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
      // Cheap skip before the extra network round-trip below — sendBrandedEmail_
      // would also catch this via its own internal dedupe check either way, this
      // just avoids the wasted form_submissions lookup for rows already handled.
      if (typeof hasAlreadySent_ === "function" && hasAlreadySent_(row.ref_id, emailType)) return;

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

