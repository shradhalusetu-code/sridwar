/**
 * ============================================================================
 * Sri Dwar — Certificate Photo Drive Upload
 * ============================================================================
 * ✅ ADDED (2026-09-03): receives devotee/family certificate photos from
 * server.ts and saves them to Google Drive — deliberately NOT Supabase
 * Storage. Supabase's free tier only includes 1GB of file storage and 5GB
 * of bandwidth/month (verified against Supabase's current pricing before
 * building this), which could realistically be exceeded with real usage
 * and risk either a service pause or a bill — not acceptable for a
 * bootstrapped project on a tight budget. This uses Drive space you
 * already have (20GB, unused) via Apps Script, which runs entirely on
 * Google's free quotas — genuinely $0 either way.
 *
 * DEPLOYMENT — this file needs its own Web App deployment, separate from
 * webhook.gs's:
 *   1. In the Apps Script editor, Deploy -> New deployment
 *   2. Type: Web app
 *   3. Execute as: Me
 *   4. Who has access: Anyone
 *      (this sounds alarming, but note the shared-secret check in
 *      doPost() below — the same protection pattern already used for
 *      EMAIL_WEBHOOK_SECRET elsewhere in this project. "Anyone" here just
 *      means "reachable over the internet without a Google login," not
 *      "unprotected" — Render's server.ts is the only thing that knows
 *      the secret.)
 *   5. Copy the deployment URL into Render's environment as
 *      GAS_DRIVE_UPLOAD_URL
 *   6. Set GAS_DRIVE_UPLOAD_SECRET to any long random string, in BOTH
 *      Render's environment AND this Apps Script project's Script
 *      Properties (same value in both places, same pattern as
 *      RAZORPAY_LINK_SECRET)
 * ============================================================================
 */

const CERTIFICATE_PHOTOS_ROOT_FOLDER_NAME = "Sri Dwar Certificate Photos";

/**
 * Finds (or creates, on first use) the root Drive folder all certificate
 * photos live under, then a per-refId subfolder inside it — "organized
 * using Reference ID, name, date" per the original request: refId is the
 * folder, name/date are baked into the filename itself (see doPost below)
 * since Drive folder names get awkward with special characters a devotee
 * name or date might contain.
 */
function _getOrCreateCertificatePhotoFolder_(refId) {
  const rootFolders = DriveApp.getFoldersByName(CERTIFICATE_PHOTOS_ROOT_FOLDER_NAME);
  const rootFolder = rootFolders.hasNext() ? rootFolders.next() : DriveApp.createFolder(CERTIFICATE_PHOTOS_ROOT_FOLDER_NAME);

  const refFolders = rootFolder.getFoldersByName(refId);
  return refFolders.hasNext() ? refFolders.next() : rootFolder.createFolder(refId);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const { secret, refId, kind, fileName, base64Data, mimeType } = body;

    const configuredSecret = PropertiesService.getScriptProperties().getProperty("GAS_DRIVE_UPLOAD_SECRET");
    if (!configuredSecret || secret !== configuredSecret) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Unauthorized." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (!refId || !kind || !base64Data || !mimeType) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Missing required fields." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const folder = _getOrCreateCertificatePhotoFolder_(refId);
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, fileName || `${kind}.jpg`);
    const file = folder.createFile(blob);

    // "Anyone with the link can view" — needed so the resulting URL can
    // actually be displayed on the certificate preview/print without
    // requiring a Google login. Does NOT make the file publicly
    // searchable or listed anywhere; only reachable by someone who
    // already has the exact link (which only ever lives in your own
    // Supabase database and rendered certificates).
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return ContentService.createTextOutput(JSON.stringify({
      url: `https://drive.google.com/uc?export=view&id=${file.getId()}`,
      fileId: file.getId(),
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    logError_("certificate_photo_drive_upload", String(err));
    return ContentService.createTextOutput(JSON.stringify({ error: "Upload failed: " + err }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
