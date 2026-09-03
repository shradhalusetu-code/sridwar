/**
 * Sri Dwar — Email Automation: CONFIRMED-PAYMENT POLLER (Webhook fallback)
 * ─────────────────────────────────────────────────────────────────────────
 * NEW FILE. Does not touch Config.gs / EmailSender.gs / EmailTemplates.gs /
 * Webhook.gs / PendingPaymentReminder.gs. Adds ONE new scan to Triggers.gs's
 * Setup() — everything else is unaffected.
 *
 * WHY THIS EXISTS
 * ----------------
 * The intended automatic trigger for "payment marked confirmed -> generate
 * invoice PDF -> email it" was a Supabase Database Webhook (see server.ts's
 * /api/webhooks/supabase/activities-updated route). That feature is
 * currently broken on this Supabase project specifically — creating any
 * Database Webhook fails with "schema 'supabase_functions' does not exist",
 * a known Supabase-side project-provisioning bug, not something wrong in
 * your setup or in server.ts. Pausing/resuming the project did not fix it.
 *
 * This file replaces that trigger with a 5-minute poll instead of an
 * instant push: it asks Supabase directly "which bookings were confirmed
 * recently?" and calls the SAME admin endpoint
 * (/api/admin/certificates/send-booking-confirmation) the Database Webhook
 * would have called. Needs no pg_net, no supabase_functions schema, and no
 * Supabase-side webhook at all — just a normal REST read, the same pattern
 * already proven working by scanForPendingPaymentsUniversal in
 * PendingPaymentReminder.gs.
 *
 * TRADE-OFF: up to a 5-minute delay instead of instant. If the Supabase
 * Database Webhook bug ever gets fixed on Supabase's end, you can switch
 * back to the instant webhook and simply stop installing this trigger —
 * nothing here needs to be un-done, this function just won't be scheduled
 * anymore.
 *
 * WHY "updated_at", NOT "created_at"
 * ----------------------------------------------------------------------
 * activities.created_at is set once, at booking time — a booking made days
 * ago and only just marked confirmed today still has an old created_at, so
 * it can't be used to find "recently confirmed" rows. This requires a
 * companion migration (activities-updated-at-migration.sql, delivered
 * alongside this file) that adds an updated_at column, auto-maintained by a
 * trigger on every row update — including the exact moment you mark
 * payment_status = 'confirmed'. Run that SQL once before this will find
 * anything.
 *
 * DOUBLE SAFETY NET AGAINST DUPLICATE EMAILS
 * ----------------------------------------------------------------------
 * 1. Before calling Render at all, this checks hasAlreadySent_(refId,
 *    "webhook_invoice_booking_confirmed") — the EXACT dedupe key
 *    Webhook.gs's sendBrandedEmail_ already writes once the invoice email
 *    actually sends (see Webhook.gs). If it's already there, this skips
 *    the row entirely — cheap, no network call to Render needed.
 * 2. Even if that check somehow raced past a hasn't-logged-yet-but-already-
 *    in-flight duplicate, certificateService.ts's own idempotency claim
 *    (inside runPipeline, keyed on refId + eventType) makes a second call
 *    for the same refId a safe, fast no-op ("duplicate_skipped") rather
 *    than a second PDF/email. Both layers would have to fail at once for a
 *    duplicate to actually reach a devotee's inbox.
 *
 * ─── ONE-TIME SETUP (do this once, in order) ────────────────────────────
 * 1. Run activities-updated-at-migration.sql once in Supabase SQL Editor.
 * 2. File icon → "+" → Script → paste this whole file in as
 *    "ConfirmedPaymentPoller.gs".
 * 3. Project Settings → Script Properties → add TWO new properties
 *    (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY should already be set from
 *    the earlier pending-payment-reminder setup — this reuses them):
 *      CERTIFICATE_ADMIN_SECRET = the exact same value as Render's
 *                                  CERTIFICATE_ADMIN_SECRET env var
 *      SRIDWAR_ADMIN_API_BASE   = https://sridwar-api.onrender.com
 *                                  (your Render service's base URL, no
 *                                  trailing slash — adjust if it's ever
 *                                  renamed)
 * 4. Replace Triggers.gs with the updated version delivered alongside this
 *    file (already wired in, no manual edits needed), then run Setup()
 *    once.
 */

function scanForNewlyConfirmedPayments() {
  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty("SUPABASE_URL");
  const supabaseKey = props.getProperty("SUPABASE_SERVICE_ROLE_KEY");
  const adminSecret = props.getProperty("CERTIFICATE_ADMIN_SECRET");
  const apiBase = props.getProperty("SRIDWAR_ADMIN_API_BASE");

  if (!supabaseUrl || !supabaseKey || !adminSecret || !apiBase) {
    logError_(
      "scanForNewlyConfirmedPayments",
      new Error(
        "Missing one or more Script Properties (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CERTIFICATE_ADMIN_SECRET, SRIDWAR_ADMIN_API_BASE) — see setup step 3."
      )
    );
    return;
  }

  // Look back further than the 5-minute trigger interval on purpose — if a
  // run is ever late, skipped, or fails partway through, this window still
  // re-covers it on the next successful run. Perfectly safe to overlap:
  // both dedupe layers (see file header) make re-finding an already-handled
  // row a harmless no-op.
  const lookbackMinutes = 30;
  const cutoffIso = new Date(Date.now() - lookbackMinutes * 60 * 1000).toISOString();

  const activitiesUrl =
    supabaseUrl.replace(/\/$/, "") +
    "/rest/v1/activities?select=ref_id,updated_at" +
    "&payment_status=eq.confirmed" +
    "&updated_at=gte." +
    encodeURIComponent(cutoffIso) +
    "&order=updated_at.desc" +
    "&limit=200";

  let rows;
  try {
    const res = UrlFetchApp.fetch(activitiesUrl, {
      method: "get",
      headers: { apikey: supabaseKey, Authorization: "Bearer " + supabaseKey },
      muteHttpExceptions: true,
    });
    if (res.getResponseCode() !== 200) {
      logError_(
        "scanForNewlyConfirmedPayments",
        new Error("Supabase query failed (" + res.getResponseCode() + "): " + res.getContentText())
      );
      return;
    }
    rows = JSON.parse(res.getContentText());
  } catch (err) {
    logError_("scanForNewlyConfirmedPayments", err);
    return;
  }

  if (!rows || !rows.length) return;

  rows.forEach(function (row) {
    try {
      // Layer 1 of the dedupe (see file header) — same key Webhook.gs
      // writes once the invoice email has actually been sent.
      if (typeof hasAlreadySent_ === "function" && hasAlreadySent_(row.ref_id, "webhook_invoice_booking_confirmed")) {
        return;
      }

      const res = UrlFetchApp.fetch(apiBase.replace(/\/$/, "") + "/api/admin/certificates/send-booking-confirmation", {
        method: "post",
        contentType: "application/json",
        headers: { "x-admin-secret": adminSecret },
        payload: JSON.stringify({ refId: row.ref_id }),
        muteHttpExceptions: true,
        // No explicit timeout option — UrlFetchApp doesn't expose one, and
        // Apps Script's own execution time limit (minutes) comfortably
        // covers a slow Render cold-start response, unlike Supabase's
        // Database Webhook feature which enforces its own short timeout.
      });

      const code = res.getResponseCode();
      if (code < 200 || code >= 300) {
        // 400 with code "payment_not_confirmed" can legitimately happen if
        // payment_status flipped back between the query above and this
        // call — not an error worth alerting on. Anything else is logged.
        const body = res.getContentText();
        if (body.indexOf("payment_not_confirmed") === -1) {
          logError_(
            "scanForNewlyConfirmedPayments [" + row.ref_id + "]",
            new Error("Render admin call failed (" + code + "): " + body)
          );
        }
      }
    } catch (err) {
      logError_("scanForNewlyConfirmedPayments [" + row.ref_id + "]", err);
    }
  });
}
