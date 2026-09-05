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
 * ✅ CORRECTED (2026-09-05): this file previously defined its own doPost()
 * and asked you to deploy it as a separate Web App. That was wrong — Apps
 * Script shares ONE global function scope across every .gs file in a
 * project, so a second doPost() here would have silently collided with
 * webhook.gs's, and only one of them would actually have run. This is now
 * just a plain function (_handleCertificatePhotoUpload_), called from
 * webhook.gs's single shared doPost dispatcher — see that file for the
 * routing logic. No separate deployment needed: use your EXISTING
 * EMAIL_WEBHOOK_SECRET-protected deployment URL for this too, just with
 * GAS_DRIVE_UPLOAD_SECRET (a second, independent secret — still checked
 * here, kept separate from EMAIL_WEBHOOK_SECRET so leaking one never
 * exposes the other) and `route: "photo_upload"` in the request body
 * (server.ts already sends this).
 *
 * SETUP (just the Script Property — the deployment already exists):
 *   Project Settings -> Script Properties -> Add:
 *     GAS_DRIVE_UPLOAD_SECRET = <a long random string you invent>
 *   Set the SAME value as an environment variable on Render.
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

function _handleCertificatePhotoUpload_(body) {
  try {
    const { secret, refId, kind, fileName, base64Data, mimeType } = body;

    const configuredSecret = PropertiesService.getScriptProperties().getProperty("GAS_DRIVE_UPLOAD_SECRET");
    if (!configuredSecret || secret !== configuredSecret) {
      return { error: "Unauthorized." };
    }

    if (!refId || !kind || !base64Data || !mimeType) {
      return { error: "Missing required fields." };
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

    return {
      url: `https://drive.google.com/uc?export=view&id=${file.getId()}`,
      fileId: file.getId(),
    };
  } catch (err) {
    logError_("certificate_photo_drive_upload", String(err));
    return { error: "Upload failed: " + err };
  }
}
