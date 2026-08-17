/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CollapsibleSectionProps {
  icon?: ReactNode;
  title: string;
  /** One or two lines always visible, summarising what's inside before the
   *  devotee taps to expand. */
  summary: string;
  /** Full section content — badges, lists, legal links, etc. — only
   *  mounted once expanded. */
  children: ReactNode;
  className?: string;
  /** Desktop (lg+) stays fully expanded by default, matching every other
   *  progressive-disclosure card on the site (Seva/Bazaar offering cards,
   *  plan tier cards) — only phone/tablet collapses by default. */
  defaultExpandedOnDesktop?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────
// Shared "long section" collapse pattern — used for informational blocks
// that don't need a gating checkbox (that's DisclaimerAcknowledge's job):
// Secure/Fair/Fraud-Protected, Important Disclaimer, Dharmic Pathways,
// Dharmic Referral & Cashback, "Honoring Ancient Heritage. Empowering
// Remote Devotion." etc. Keeps these long, mostly-read-once blocks from
// adding unjustified scroll length on mobile while never removing any of
// the underlying content — it's all still there, one tap away.
// ─────────────────────────────────────────────────────────────────────────
export default function CollapsibleSection({
  icon,
  title,
  summary,
  children,
  className = "",
  defaultExpandedOnDesktop = true,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState<boolean>(
    () => defaultExpandedOnDesktop && typeof window !== "undefined" && !!window.matchMedia?.("(min-width: 1024px)")?.matches
  );

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2">
          {icon}
          <h2 className="font-serif text-base font-bold text-white">{title}</h2>
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 text-white/50 shrink-0" /> : <ChevronDown className="w-4 h-4 text-white/50 shrink-0" />}
      </button>

      {!expanded && (
        <p className="text-[12px] text-white/50 leading-relaxed mt-2">{summary}</p>
      )}

      {expanded && <div className="mt-3">{children}</div>}
    </div>
  );
}
