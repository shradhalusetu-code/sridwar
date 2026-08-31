/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  Share / Download Certificate — native-first, with safe fallbacks
 * ============================================================
 * Every certificate/receipt/ID download button on the site (Hero.tsx's
 * Darshan Certificate, AuthDashboard.tsx's Temple Visit / Service /
 * Receipt / General certificates and Dharmic ID, BookNowWizard.tsx,
 * TemplateBazaar.tsx, TempleRegister.tsx, ContactUs.tsx,
 * DevoteeExperiences.tsx) now goes through the SAME shared cascade here,
 * so behavior — and the fallback when a given method isn't available —
 * is identical everywhere instead of ten slightly different hand-rolled
 * implementations.
 *
 * ✅ ROOT-CAUSE FIX (certificate downloads failing on phones/tablets):
 * every "Download" button used to go straight to the classic
 * blob → object-URL → `<a download>` trick with NO fallback. That trick
 * is unreliable/silently-broken in exactly the contexts devotees actually
 * use this app in:
 *  - The Capacitor Android app is a WebView (see capacitor.config.ts —
 *    `server.url` loads the live site inside a WebView, it is not a
 *    plain mobile browser tab). Android System WebView does not
 *    reliably wire a `blob:` URL `<a download>` click to the system
 *    Download Manager — this is the exact same failure mode already
 *    diagnosed and fixed for the confirmation PDF in
 *    devotionalMessages.ts's downloadConfirmationMessage() ("the
 *    confirmation PDF cannot be genuinely downloaded from the Android
 *    app/tablet"). Every certificate JPG download button had the same
 *    bug, just never got the same fix applied to it.
 *  - Some mobile browsers' in-app/embedded webviews (e.g. opened from a
 *    social app) have the same limitation.
 *
 * The fix mirrors the exact cascade already proven for the confirmation
 * PDF, in priority order:
 *  1. Native Android app: write the file straight to the device's own
 *     Documents folder via the real Capacitor Filesystem plugin (no
 *     WRITE_EXTERNAL_STORAGE permission needed on Android 10+ scoped
 *     storage), then offer the native share sheet on top. SAFETY: if the
 *     currently-installed app predates the @capacitor/filesystem /
 *     @capacitor/share plugins (no new AAB uploaded yet), this throws
 *     and silently falls through to step 2 below — never worse than
 *     before.
 *  2. Web Share API with file support (navigator.share + canShare) —
 *     works in many mobile browser tabs (iOS Safari, Chrome/Android)
 *     even outside the native app.
 *  3. Classic `<a download>` — the original method, kept as the final
 *     fallback for desktop and any browser where 1–2 aren't available.
 *
 * A user-cancelled share sheet (tapping outside it / hitting Cancel)
 * throws a DOMException named "AbortError" — that is normal, expected
 * behavior, not a failure, so callers should not show an error message
 * for it (see the `cancelled` status below).
 */

import { isNativeAndroidApp } from "./shareUrl";

export type ShareCertificateStatus = "shared" | "downloaded" | "cancelled" | "error";

export interface ShareCertificateResult {
  status: ShareCertificateStatus;
  message?: string;
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}

/** Blob -> raw base64 (no "data:...;base64," prefix), as Filesystem.writeFile expects. */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Writes the file directly into the app's Documents directory using the
 * real native Capacitor Filesystem plugin, then offers (but doesn't
 * require) the native share sheet on top. Returns false — never throws —
 * on any failure, so the caller always has a safe fallback path. Same
 * approach as devotionalMessages.ts's tryNativeAndroidSaveAndShare, kept
 * as a separate copy here since this module is the one every certificate
 * button already imports from (avoids a cross-module dependency for what
 * is otherwise a self-contained, tiny helper).
 */
async function tryNativeAndroidSaveAndShare(
  blob: Blob,
  filename: string,
  shareTitle: string,
  shareText?: string
): Promise<boolean> {
  try {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);

    const base64Data = await blobToBase64(blob);
    const writeResult = await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory: Directory.Documents,
      recursive: true,
    });

    try {
      await Share.share({ title: shareTitle, text: shareText, url: writeResult.uri });
    } catch {
      // Devotee dismissed the share sheet, or sharing isn't available on
      // this device — the file is already safely written either way, so
      // this is NOT treated as a failure.
    }

    return true;
  } catch {
    return false; // caller falls through to the existing web cascade
  }
}

/**
 * Shares (or, if unsupported, downloads) an already-available Blob — used
 * directly by the Dharmic ID button, whose image is generated client-side
 * via html2canvas-pro rather than fetched from the server.
 */
export async function shareOrDownloadBlob(
  blob: Blob,
  filename: string,
  shareTitle: string,
  shareText?: string
): Promise<ShareCertificateResult> {
  try {
    if (isNativeAndroidApp()) {
      const saved = await tryNativeAndroidSaveAndShare(blob, filename, shareTitle, shareText);
      if (saved) return { status: "shared" };
      // Falls through to the same web cascade every other platform uses.
    }

    const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
    const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { canShare?: (data?: ShareData) => boolean }) : undefined;
    const canFileShare = !!nav && typeof nav.share === "function" && typeof nav.canShare === "function" && nav.canShare({ files: [file] });

    if (canFileShare) {
      await nav!.share({ files: [file], title: shareTitle, text: shareText });
      return { status: "shared" };
    }

    triggerBrowserDownload(blob, filename);
    return { status: "downloaded" };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      // Devotee opened the share sheet and closed it without picking an
      // app — not an error, nothing to show.
      return { status: "cancelled" };
    }
    console.error("Share Certificate failed:", err);
    return { status: "error", message: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Fetches a certificate JPG from a server route (same relative-fetch
 * pattern every Download/Share button already uses) and shares/downloads
 * it via the same native-first cascade as shareOrDownloadBlob above. This
 * is the one function every Download AND Share Certificate button across
 * the app should call — replacing the old pattern of Share buttons
 * calling this while Download buttons hand-rolled their own plain
 * `<a download>`-only implementation with no native-Android fallback.
 */
export async function fetchAndShareCertificate(
  url: string,
  filename: string,
  shareTitle: string,
  shareText?: string
): Promise<ShareCertificateResult> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Server responded ${res.status}`);
  }
  const blob = await res.blob();
  return shareOrDownloadBlob(blob, filename, shareTitle, shareText);
}

