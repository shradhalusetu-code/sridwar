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
      const res = await fetch(url);
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
