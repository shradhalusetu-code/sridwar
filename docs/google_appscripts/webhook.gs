/**
 * Sri Dwar — Email Automation: WEBHOOK
 * ─────────────────────────────────────────────────────────────────────────
 * NEW FILE. Does not touch Config.gs / EmailSender.gs / EmailTemplates.gs /
 * Triggers.gs. Those keep working exactly as they do today (Google Sheets →
 * timer → email), completely unaffected by this file.
 *
 * WHAT THIS FILE ADDS
 * --------------------
 * A Web App entry point (doPost) that the website's own server
 * (certificateService.ts, via dispatchEmail()) calls to send ONE email with
 * a PDF invoice/certificate attached. This is the missing piece — without
 * this file, that pipeline generates and stores the PDF but has nowhere to
 * send the email, and silently reports "skipped".
 *
 * It reuses sendBrandedEmail_() from EmailSender.gs — the SAME quota cap,
 * dedupe log, bounce/blacklist handling, and alias-fallback logic that every
 * other email in this project already goes through. Nothing new is
 * duplicated.
 *
 * EMAIL-TYPE NAMESPACING (important — read before changing)
 * ------------------------------------------------------------------------
 * The Google-Sheets-driven flow already uses emailType "certificate_ready"
 * for its own certificate email. If this webhook reused that exact string,
 * the shared Email_Send_Log dedupe (keyed on refId + emailType) could block
 * ONE of the two systems from sending for the same booking, depending on
 * which fires first. To make that collision structurally impossible, this
 * webhook uses its own distinct, prefixed emailType values:
 *   - "webhook_invoice_booking_confirmed"
 *   - "webhook_invoice_certificate_ready"
 * Do not rename these to match the Sheets-flow values.
 *
 * ─── ONE-TIME SETUP (do this once, in order) ────────────────────────────
 * 1. In the Apps Script editor: File icon (left sidebar) → "+" → Script →
 *    paste this whole file in as "Webhook.gs".
 * 2. Project Settings (gear icon, left sidebar) → "Script Properties" →
 *    "Add script property" → Name: EMAIL_WEBHOOK_SECRET, Value: a long
 *    random string you invent (e.g. generate one at
 *    https://1password.com/password-generator, 32+ characters). This is
 *    the ONLY thing standing between this URL and anyone on the internet
 *    being able to send email through your account — Apps Script Web Apps
 *    cannot read custom HTTP headers, so the secret has to travel inside
 *    the JSON body instead, and this check is what enforces it below.
 * 3. Deploy → New deployment → type "Web app" →
 *      Execute as: Me (your account)
 *      Who has access: Anyone
 *    (Anyone = anyone who has the URL, not "anyone can browse it" — nobody
 *    can do anything without the exact EMAIL_WEBHOOK_SECRET from step 2.)
 * 4. Copy the "Web app URL" it gives you (ends in /exec). That is your
 *    GAS_EMAIL_WEBHOOK_URL — you'll set it as an environment variable on
 *    your website's server (see certificateService.ts changes).
 * 5. If you ever edit this file again, you must create a NEW deployment
 *    version (Deploy → Manage deployments → edit (pencil) → Version: New
 *    version → Deploy) or the live URL keeps running the OLD code.
 */

// ✅ CHANGED (2026-09-05): this is now a DISPATCHER, not a single-purpose
// handler. Apps Script shares ONE global function scope across every .gs
// file in a project — only one function named `doPost` can exist at all,
// no matter how many separate "Web app" deployments you create pointing
// at this same project. Two newer files (certificatePhotoDrive.gs,
// certificateGenerationSync.gs) were each given their OWN `doPost`,
// which would have silently collided with this one and each other —
// caught before either was actually deployed. All three now share this
// one entry point, routed by a `route` field in the request body. Any
// request with NO `route` field falls through to the original
// invoice-email behavour below, unchanged — so nothing that already
// calls this webhook needs to change.
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return _webhookJsonResponse_({ ok: false, error: "No request body." });
    }
    var body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return _webhookJsonResponse_({ ok: false, error: "Body was not valid JSON." });
    }

    if (body.route === "photo_upload") {
      return _webhookJsonResponse_(_handleCertificatePhotoUpload_(body));
    }
    if (body.route === "certificate_sync") {
      return _webhookJsonResponse_(_handleCertificateGenerationSync_(body));
    }
    if (body.route === "share_certificate") {
      return _webhookJsonResponse_(_handleShareCertificateEmail_(body));
    }
    return _handleInvoiceEmailWebhook_(body);
  } catch (err) {
    try {
      if (typeof logError_ === "function") {
        logError_("Webhook.gs doPost", err);
      }
    } catch (logErr) {
      // Never let a logging failure hide the real error from the response.
    }
    return _webhookJsonResponse_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

// The original webhook behaviour, unchanged in substance — only extracted
// into its own named function so doPost above can dispatch to it.
function _handleInvoiceEmailWebhook_(body) {
  try {
    // ── Secret check FIRST — costs nothing and rejects everything else. ──
    var configuredSecret = PropertiesService.getScriptProperties().getProperty("EMAIL_WEBHOOK_SECRET");
    if (!configuredSecret) {
      // Fails CLOSED: if you forgot step 2 of setup, this refuses every
      // request rather than silently accepting unauthenticated ones.
      return _webhookJsonResponse_({ ok: false, error: "EMAIL_WEBHOOK_SECRET not configured on this script." });
    }
    if (!body.secret || body.secret !== configuredSecret) {
      return _webhookJsonResponse_({ ok: false, error: "Unauthorized." });
    }

    // ── Required fields ──────────────────────────────────────────────────
    var required = ["to", "subject", "bodyHtml", "attachmentBase64", "attachmentFilename", "refId", "emailType"];
    for (var i = 0; i < required.length; i++) {
      if (!body[required[i]]) {
        return _webhookJsonResponse_({ ok: false, error: "Missing required field: " + required[i] });
      }
    }

    // Belt-and-braces: this webhook must only ever be used for the two
    // namespaced types documented above — never for "certificate_ready",
    // "booking", "welcome", etc. (those belong to the Sheets-driven flow).
    var allowedEmailTypes = ["webhook_invoice_booking_confirmed", "webhook_invoice_certificate_ready"];
    if (allowedEmailTypes.indexOf(body.emailType) === -1) {
      return _webhookJsonResponse_({
        ok: false,
        error: "emailType must be one of: " + allowedEmailTypes.join(", "),
      });
    }

    // ── Build the PDF attachment from base64 ─────────────────────────────
    var pdfBytes;
    try {
      pdfBytes = Utilities.base64Decode(body.attachmentBase64);
    } catch (decodeErr) {
      return _webhookJsonResponse_({ ok: false, error: "attachmentBase64 could not be decoded." });
    }
    if (!pdfBytes || !pdfBytes.length) {
      return _webhookJsonResponse_({ ok: false, error: "Decoded attachment was empty." });
    }
    var pdfBlob = Utilities.newBlob(pdfBytes, "application/pdf", body.attachmentFilename);

    // ── Send, via the SAME choke point every other email in this project
    //    uses — same quota cap, same dedupe log, same bounce/alias handling.
    var sent = sendBrandedEmail_({
      to: body.to,
      subject: body.subject,
      html: body.bodyHtml,
      refId: body.refId,
      emailType: body.emailType,
      attachments: [pdfBlob],
    });

    return _webhookJsonResponse_({ ok: true, sent: sent });
  } catch (err) {
    try {
      if (typeof logError_ === "function") {
        logError_("Webhook.gs _handleInvoiceEmailWebhook_", err);
      }
    } catch (logErr) {
      // Never let a logging failure hide the real error from the response.
    }
    return _webhookJsonResponse_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}


/**
 * GET requests always fail — this endpoint only accepts POST. Visiting the
 * URL in a browser (which sends GET) will show this instead of an error
 * page, which is useful for confirming the deployment URL is live at all.
 */
function doGet(e) {
  return _webhookJsonResponse_({ ok: false, error: "This endpoint only accepts POST requests." });
}

function _webhookJsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
