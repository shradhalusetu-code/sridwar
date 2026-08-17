/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { ShieldCheck, ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from "lucide-react";

interface DisclaimerAcknowledgeProps {
  /** One short sentence always visible, e.g. "Sevas are performed with
   *  devotion as per temple process — read the full terms before offering." */
  summary: string;
  /** Full disclaimer text, only shown once the devotee taps "Read full details". */
  details: string;
  /** Controlled checkbox state — lives in the parent so it can gate submit
   *  actions (e.g. disabling a card's CTA) without prop-drilling this
   *  component's internals. */
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Shown next to the checkbox. Defaults to a generic acknowledgement line. */
  checkboxLabel?: string;
  /** Set once a submit was attempted without acknowledging, to surface an
   *  inline validation message instead of a silent no-op. Cleared by the
   *  parent as soon as the checkbox is ticked. */
  showRequiredError?: boolean;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Shared collapse+checkbox pattern for every contribution/donation/paid
// offering surface (Seva, Bazaar, Sponsorship, Simple Pujas, Counselling,
// etc.) — previously each section either showed its full disclaimer
// paragraph permanently expanded (adding unjustified scroll length on
// mobile) or, in a few places, had no acknowledgement gate at all before a
// devotee could submit. This component gives every one of those surfaces
// the same short summary + expandable full text + required checkbox,
// so nothing is skimmed past by accident and nothing gets accepted
// silently on the devotee's behalf.
//
// ✅ COLLAPSED-BY-DEFAULT FIX (2026-08-17): the one-line `summary` sentence
// (e.g. "Sevas are performed with devotion as per temple/Gaushala
// process...") used to render permanently, on every single card in a grid
// of six — repeating an almost-identical sentence six times down the page
// and reading as visual noise. The whole block now collapses behind a
// single compact "Disclaimer" row by default; tapping it reveals the
// summary, the existing "Read full details" toggle, and the checkbox.
// Nothing about the checkbox's gating behaviour changed — it's still
// required before the parent lets the devotee submit — but a devotee no
// longer has to scan the same paragraph on every card just to find it.
// If a submit is attempted before the box is ticked (showRequiredError),
// this auto-opens so the validation message is never hidden behind a
// collapsed row the devotee has to guess to tap.
// ─────────────────────────────────────────────────────────────────────────
export default function DisclaimerAcknowledge({
  summary,
  details,
  checked,
  onCheckedChange,
  checkboxLabel = "I have read and understand the above before proceeding.",
  showRequiredError = false,
  className = "",
}: DisclaimerAcknowledgeProps) {
  const [open, setOpen] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  // Force the row open if a submit was attempted without ticking the box —
  // otherwise the "please tick" message would be trapped behind a collapsed
  // row the devotee has no reason to reopen.
  useEffect(() => {
    if (showRequiredError) setOpen(true);
  }, [showRequiredError]);

  return (
    <div className={`bg-white/5 border border-white/10 rounded-2xl overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left"
      >
        {checked ? (
          <CheckCircle2 className="w-4 h-4 text-[#5EEAD4] flex-shrink-0" />
        ) : (
          <ShieldCheck className={`w-4 h-4 flex-shrink-0 ${showRequiredError ? "text-red-300" : "text-[#5EEAD4]"}`} />
        )}
        <span className={`flex-1 min-w-0 text-[12px] font-semibold truncate ${showRequiredError && !checked ? "text-red-300" : "text-white/75"}`}>
          {checked ? "Disclaimer acknowledged" : "Disclaimer — tap to read & confirm"}
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-white/40 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-3.5 pt-0.5">
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#5EEAD4] flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-white/65 leading-relaxed">{summary}</p>
              <button
                type="button"
                onClick={() => setDetailsExpanded((v) => !v)}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#5EEAD4] mt-1"
                aria-expanded={detailsExpanded}
              >
                {detailsExpanded ? "Hide full details" : "Read full details"}
                {detailsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {detailsExpanded && (
                <p className="text-[11px] text-white/45 font-mono leading-relaxed mt-2 pt-2 border-t border-white/10">
                  {details}
                </p>
              )}
            </div>
          </div>

          <label className="flex items-start gap-2 mt-3 pt-3 border-t border-white/10 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => onCheckedChange(e.target.checked)}
              className="mt-0.5 w-3.5 h-3.5 accent-[#FFB347] flex-shrink-0 cursor-pointer"
            />
            <span className="text-[12px] text-white/70 leading-snug">{checkboxLabel}</span>
          </label>

          {showRequiredError && !checked && (
            <p className="flex items-center gap-1 text-[12px] text-red-300 mt-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              Please tick the box above to confirm before proceeding.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
