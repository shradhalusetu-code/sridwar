/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useSingleOpen — shared "only one expanded item at a time" coordinator.
 *
 * ROOT CAUSE of the reported bug ("expanded cards/services remain open
 * when another option is selected"): several sections give each card its
 * own independent useState<boolean> for expand/collapse (e.g. Holistic
 * Wellness's ServiceCard, Online Puja's categorized Puja lists,
 * Counselling & Guidance's audience cards). Independent state means card A
 * has no way to know card B just opened, so both stay open at once.
 *
 * This hook lifts that to whichever component renders the list: it owns
 * exactly one open id (or none), and every card asks `isOpen(id)` /
 * calls `toggle(id)` instead of keeping its own boolean. Opening any id
 * automatically closes whichever one was open before, because there is
 * only ever one value to update — the bug becomes structurally impossible
 * instead of separately patched per file.
 *
 * This generalizes a pattern already used CORRECTLY elsewhere in this
 * codebase — TemplateBazaar's `activeNewOfferingId` / BazaarOfferingCard's
 * isActive+onActivate props, and OnlinePuja's `activeSimplePujaId` for
 * Simple Pujas — into a reusable hook instead of hand-rolling the same
 * three lines in every new section.
 *
 * Usage:
 *   const { isOpen, toggle } = useSingleOpen<string>();
 *   ...
 *   <ServiceCard isOpen={isOpen(service.id)} onToggle={() => toggle(service.id)} />
 */

import { useCallback, useState } from "react";

export function useSingleOpen<T extends string = string>(initial: T | null = null) {
  const [openId, setOpenId] = useState<T | null>(initial);

  const isOpen = useCallback((id: T) => openId === id, [openId]);

  /** Opening a new id closes whatever was open before. Toggling the
   *  already-open id closes it (tap again to collapse). */
  const toggle = useCallback((id: T) => {
    setOpenId((prev) => (prev === id ? null : id));
  }, []);

  const open = useCallback((id: T) => setOpenId(id), []);
  const close = useCallback(() => setOpenId(null), []);

  return { openId, isOpen, toggle, open, close, setOpenId };
}

export default useSingleOpen;
