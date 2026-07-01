/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * backHandlerStack.ts — Sri Dwar
 *
 * App.tsx owns the single, global Back-button trap (see the popstate
 * listener in App.tsx). It already knows how to close overlays/wizards
 * that live in its OWN state (cart, BookNowWizard, Seva modal, etc.).
 *
 * Several components further down the tree manage their own local
 * "step" state for multi-step flows/modals — e.g. the Darshan Certificate
 * modal in Hero.tsx, and the Devotee / Dharmic Expert / Temple
 * registration flows in TempleRegister.tsx. App.tsx has no visibility
 * into that local state, so without this registry, pressing Back while
 * one of those flows is open falls through to the browser's default
 * behaviour and exits the site entirely instead of closing the flow.
 *
 * This module is a tiny last-in-first-out registry: any component that
 * opens a local modal/step-flow registers a handler describing "what
 * Back should do right now" (mirroring whatever its own in-page Back
 * button already does), and unregisters when it returns to its default/
 * closed state or unmounts. App's popstate handler checks this registry
 * before falling back to its own logic.
 */

type BackHandler = () => void;

interface StackEntry {
  id: string;
  handler: BackHandler;
}

let stack: StackEntry[] = [];

/** Register (or update) the Back handler for a given component instance. */
export function registerBackHandler(id: string, handler: BackHandler): void {
  stack = stack.filter((entry) => entry.id !== id);
  stack.push({ id, handler });
}

/** Remove a component's Back handler (call on close / unmount / default state). */
export function unregisterBackHandler(id: string): void {
  stack = stack.filter((entry) => entry.id !== id);
}

/** Whether any local flow currently wants to intercept Back. */
export function hasBackHandlers(): boolean {
  return stack.length > 0;
}

/** Invoke the most-recently-registered handler, if any. Returns true if one was called. */
export function invokeTopBackHandler(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top.handler();
  return true;
}
