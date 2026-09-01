import { useEffect, useState } from "react";
import { X, Download, Share2 } from "lucide-react";
import { shareOrDownloadBlob } from "../../utils/shareCertificate";

// ─── Certificate Reveal Modal ────────────────────────────────────────────
// ✅ ADDED — the "unboxing" moment (Amazon/Flipkart's delivery-day
// satisfaction, adapted): instead of a certificate JPG silently landing in
// Downloads with no visual moment at all, this shows it with a brief
// reveal animation first — the devotee actually SEES what they received
// before deciding to save or share it. One shared component instead of
// duplicating this in every one of the ~6 places a certificate gets
// downloaded, so the moment feels the same everywhere in the app.
//
// This component receives an already-fetched Blob (the caller already had
// to fetch it once to know the request succeeded) rather than fetching it
// again itself — one network request, not two.

interface CertificateRevealModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageBlob: Blob | null;
  filename: string;
  shareTitle?: string;
  shareText?: string;
}

export default function CertificateRevealModal({
  isOpen,
  onClose,
  imageBlob,
  filename,
  shareTitle = "My Sri Dwar Certificate",
  shareText = "Jai Jagannath! Here is my Certificate from Sri Dwar.",
}: CertificateRevealModalProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [actionError, setActionError] = useState("");

  // Build the object URL once per blob, and clean it up when this modal
  // closes or unmounts — object URLs otherwise leak for the lifetime of
  // the page.
  useEffect(() => {
    if (!imageBlob) return;
    const url = URL.createObjectURL(imageBlob);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageBlob]);

  // The reveal itself — a short delay before the image fades/scales in,
  // so it reads as a deliberate moment rather than instant, jarring pop-in.
  // Resets every time the modal opens so re-opening feels fresh, not stale.
  useEffect(() => {
    if (isOpen && objectUrl) {
      setIsRevealed(false);
      const t = setTimeout(() => setIsRevealed(true), 150);
      return () => clearTimeout(t);
    }
    if (!isOpen) setIsRevealed(false);
  }, [isOpen, objectUrl]);

  if (!isOpen) return null;

  const handleAction = async () => {
    if (!imageBlob) return;
    setActionError("");
    setIsActing(true);
    try {
      const result = await shareOrDownloadBlob(imageBlob, filename, shareTitle, shareText);
      if (result.status === "error") {
        setActionError("Could not save your certificate right now. Please try again shortly.");
      }
    } finally {
      setIsActing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Certificate ready"
    >
      <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-[#042825] border border-white/10 rounded-3xl shadow-2xl z-10 overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#5EEAD4] via-[#FFB347] to-[#5EEAD4]" />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-4 text-white/50 hover:text-white transition-colors p-1 z-20"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-5 pt-8 text-center">
          <p className="text-xs font-bold text-[#FFB347] uppercase tracking-widest mb-3">
            🙏 Your Certificate is Ready
          </p>

          {/* The reveal itself — fades and scales in rather than popping
              in instantly, once objectUrl is actually ready to show. */}
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/20 mb-4 min-h-[180px] flex items-center justify-center">
            {!objectUrl && (
              <div className="py-12 text-white/40 text-xs font-mono">Preparing…</div>
            )}
            {objectUrl && (
              <img
                src={objectUrl}
                alt="Your Sri Dwar certificate"
                className={`w-full h-auto transition-all duration-700 ease-out ${
                  isRevealed ? "opacity-100 scale-100" : "opacity-0 scale-95"
                }`}
              />
            )}
          </div>

          {actionError && (
            <p className="text-[11px] text-red-300 bg-red-950/30 border border-red-500/20 rounded-lg px-2.5 py-1.5 mb-3">
              {actionError}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={!objectUrl || isActing}
              onClick={handleAction}
              className="inline-flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-50 border border-white/15 text-white/80 text-xs font-bold uppercase tracking-wide py-3 rounded-xl transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#5EEAD4]" />
              {isActing ? "Preparing…" : "Save"}
            </button>
            <button
              type="button"
              disabled={!objectUrl || isActing}
              onClick={handleAction}
              className="inline-flex items-center justify-center gap-1.5 bg-[#0F766E]/20 hover:bg-[#0F766E]/40 disabled:opacity-50 border border-[#5EEAD4]/30 text-[#5EEAD4] text-xs font-bold uppercase tracking-wide py-3 rounded-xl transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              {isActing ? "Preparing…" : "Share"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
