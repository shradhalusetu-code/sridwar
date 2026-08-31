/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  Share Certificate — native share sheet, with a safe fallback
 * ============================================================
 * Every certificate/receipt/ID download button on the site (Hero.tsx's
 * Darshan Certificate, AuthDashboard.tsx's Temple Visit / Service /
 * Receipt / General certificates and Dharmic ID, and the new Register
 * Temple acknowledgement certificate) now sits next to a matching
 * "Share Certificate" button. Both call this same shared helper so the
 * behavior — and the fallback when the native share sheet isn't
 * available — is identical everywhere instead of five slightly different
 * hand-rolled implementations.
 *
 * How it works:
 *  1. Fetches the JPG (or accepts an already-generated Blob, for the
 *     Dharmic ID's client-side html2canvas image).
 *  2. Wraps it in a real File and, ONLY if the browser both exposes
 *     navigator.share AND navigator.canShare({ files }) reports it can
 *     actually share that file (this is how iOS Safari, Chrome/Android,
 *     and the Capacitor WebView all advertise file-sharing support —
 *     desktop Chrome/Firefox typically do not, and correctly fall
 *     through to the second branch below), opens the OS-native share
 *     sheet with the real JPG attached — not a link, not the page URL.
 *  3. If file sharing isn't available on this browser/device, silently
 *     falls back to the exact same blob → object-URL → <a download>
 *     technique every Download button already uses, so the person still
 *     gets the file either way — this is the "safe fallback where
 *     unsupported" the Share button needs, not a dead end or an error.
 *
 * A user-cancelled share sheet (tapping outside it / hitting Cancel)
 * throws a DOMException named "AbortError" — that is normal, expected
 * behavior, not a failure, so callers should not show an error message
 * for it (see the `cancelled` status below).
 */

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
 * pattern every Download button already uses) and shares/downloads it.
 * This is the one most Share Certificate buttons across the app will
 * call directly.
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
