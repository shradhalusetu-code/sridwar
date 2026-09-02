import { useState } from "react";

// ─── useCertificateReveal ────────────────────────────────────────────────
// Pairs with CertificateRevealModal.tsx — one shared hook so every
// "Download Certificate" button across the app follows the same pattern:
// fetch once, then show the reveal modal with that same blob (Save/Share
// inside the modal reuse it — no second fetch).
//
// Usage in a component:
//   const reveal = useCertificateReveal();
//   <button onClick={() => reveal.open(url, filename)}>Certificate</button>
//   <CertificateRevealModal isOpen={reveal.isOpen} onClose={reveal.close}
//     imageBlob={reveal.imageBlob} filename={reveal.filename} />
export function useCertificateReveal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [filename, setFilename] = useState("");
  const [error, setError] = useState("");

  const open = async (url: string, revealFilename: string) => {
    setError("");
    setIsLoading(true);
    setImageBlob(null);
    setFilename(revealFilename);
    setIsOpen(true); // opens immediately, showing "Preparing…" while the fetch is in flight
    try {
      // ✅ FIX (2026-09-02): the booking write this certificate depends on
      // (recordActivity in BookNowWizard.tsx) is fire-and-forget — it isn't
      // awaited before the devotee can reach the "Download Certificate"
      // button. On a slow connection, or a very fast tap right after the
      // success screen appears, this fetch could reach the server before
      // that write has actually landed in Supabase, and the server
      // correctly (and honestly) returns 404 "No booking found for this
      // reference" — which reads to the devotee as a broken download.
      // One short, silent retry closes that gap cheaply: if the first
      // attempt 404s, wait briefly and try once more before actually
      // showing an error. Any other error (500, network failure) is not
      // retried — retrying those wouldn't help and would only delay a
      // genuine failure message.
      let res = await fetch(url);
      if (res.status === 404) {
        await new Promise((r) => setTimeout(r, 1500));
        res = await fetch(url);
      }
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const blob = await res.blob();
      setImageBlob(blob);
    } catch (e) {
      console.error("Certificate fetch failed:", e);
      setError("Could not load your certificate right now. Please try again shortly, or contact puja@sridwar.com.");
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const close = () => setIsOpen(false);

  return { isOpen, isLoading, imageBlob, filename, error, open, close };
}
