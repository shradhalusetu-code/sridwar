/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unified Service Cart — Pujas, Sevas, Counselling/Guidance, and Holistic
 * Wellness enrollments selected via the Sankalp Portal (BookNowWizard).
 * Separate from (and additive to) the existing Temple Bazaar `cart` state
 * in App.tsx, which keeps working exactly as before.
 *
 * Persistence model:
 *  - Guests (not logged in): kept ONLY in localStorage (`sd_service_cart`),
 *    so the cart survives refresh/navigation but never leaves the device.
 *  - Logged-in devotees: mirrored to Supabase `cart_items`, scoped to their
 *    own user_id via RLS — isolated per Dharmic ID, available across
 *    devices, and is what "restore my cart after login" reads from.
 *  - On login/signup, `mergeLocalCartIntoAccount` uploads whatever was in
 *    localStorage (a guest may have added items before creating an
 *    account) into Supabase, then clears localStorage so there's a single
 *    source of truth from that point on.
 *
 * Every Supabase call here is defensive (mirrors src/lib/activities.ts):
 * network/DB failures never throw into the UI, they just log and fall back
 * to whatever's already in memory/localStorage.
 */

import { supabase } from "./supabaseClient";
import { ServiceCartItem, ServiceCartCategory } from "../types";

const LOCAL_KEY = "sd_service_cart";
export const MAX_CART_ITEMS = 10;

// ─── localStorage helpers (guest cart) ─────────────────────────────────────

export function getLocalServiceCart(): ServiceCartItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("getLocalServiceCart failed", e);
    return [];
  }
}

function setLocalServiceCart(items: ServiceCartItem[]): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
  } catch (e) {
    console.error("setLocalServiceCart failed", e);
  }
}

export function clearLocalServiceCart(): void {
  try {
    localStorage.removeItem(LOCAL_KEY);
  } catch (e) {
    console.error("clearLocalServiceCart failed", e);
  }
}

// ─── Supabase helpers (logged-in devotee's cart) ───────────────────────────

async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch (e) {
    console.error("serviceCart getCurrentUserId failed", e);
    return null;
  }
}

function rowToItem(row: any): ServiceCartItem {
  return {
    id: row.id,
    category: row.category,
    itemName: row.item_name,
    amount: row.amount,
    details: row.details || {},
    addedAt: row.created_at,
  };
}

export async function fetchAccountServiceCart(): Promise<ServiceCartItem[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from("cart_items")
      .select("id, category, item_name, amount, details, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("fetchAccountServiceCart failed:", error.message);
      return [];
    }
    return (data || []).map(rowToItem);
  } catch (e) {
    console.error("fetchAccountServiceCart failed", e);
    return [];
  }
}

async function insertAccountItem(userId: string, item: Omit<ServiceCartItem, "id" | "addedAt">): Promise<ServiceCartItem | null> {
  try {
    const { data, error } = await supabase
      .from("cart_items")
      .insert({
        user_id: userId,
        category: item.category,
        item_name: item.itemName,
        amount: item.amount,
        details: item.details,
      })
      .select("id, category, item_name, amount, details, created_at")
      .single();
    if (error) {
      // ✅ FIX (2026-08-29 — reported bug: "Add to Cart" failing with no
      // clue why, for multiple different item categories): the previous
      // log line only printed error.message, which for a genuinely missing
      // table read as a generic, unhelpful string. Now logs the Postgres
      // error CODE and hint too — "42P01" specifically means the
      // cart_items table itself doesn't exist yet (run
      // supabase_fix_cart_items_complete.sql), "23514" means a category
      // value isn't in the CHECK constraint, and anything under RLS
      // policy violation points at auth/session, not the schema. This is
      // exactly the fastest way to tell those apart from the browser
      // console next time, instead of guessing blind.
      console.error("insertAccountItem failed:", {
        message: error.message,
        code: (error as { code?: string }).code,
        hint: (error as { hint?: string }).hint,
        details: (error as { details?: string }).details,
      });
      return null;
    }
    return rowToItem(data);
  } catch (e) {
    console.error("insertAccountItem failed", e);
    return null;
  }
}

export async function removeAccountItem(id: string): Promise<void> {
  try {
    const { error } = await supabase.from("cart_items").delete().eq("id", id);
    if (error) console.error("removeAccountItem failed:", error.message);
  } catch (e) {
    console.error("removeAccountItem failed", e);
  }
}

export async function clearAccountCart(userId: string): Promise<void> {
  try {
    const { error } = await supabase.from("cart_items").delete().eq("user_id", userId);
    if (error) console.error("clearAccountCart failed:", error.message);
  } catch (e) {
    console.error("clearAccountCart failed", e);
  }
}

// ─── Unified read (call on load, and right after login) ───────────────────

/** Loads whichever cart is authoritative right now: the account cart if
 *  logged in, otherwise the local/guest cart. Use this to (re)hydrate
 *  App.tsx's cart state on mount and after auth state changes. */
export async function loadServiceCart(): Promise<ServiceCartItem[]> {
  const userId = await getCurrentUserId();
  if (userId) return fetchAccountServiceCart();
  return getLocalServiceCart();
}

/**
 * Call this once, right after a devotee logs in or creates a Dharmic ID.
 * Uploads any items sitting in the guest/localStorage cart into their
 * account (deduped by category+itemName+devoteeName so re-running this
 * — e.g. a second login — never creates duplicate rows), capped at
 * MAX_CART_ITEMS total. Returns the resulting merged cart.
 *
 * Data-safety guarantee: a local item is only ever removed from
 * localStorage once it has been *confirmed* saved to the account (or is
 * already there from a previous merge). Anything that couldn't be synced
 * this time — the 10-item cap was hit, the `cart_items` table/RLS isn't
 * set up yet, or a transient network/DB error — is left in localStorage
 * untouched, so it is never silently lost and a later merge (next login,
 * next app open) will pick it up again automatically.
 */
export async function mergeLocalCartIntoAccount(userId: string): Promise<ServiceCartItem[]> {
  const localItems = getLocalServiceCart();
  if (localItems.length === 0) {
    return fetchAccountServiceCart();
  }

  const existing = await fetchAccountServiceCart();
  const existingKeys = new Set(existing.map((i) => `${i.category}|${i.itemName}|${i.details.devoteeName}|${i.amount}`));

  let remainingSlots = MAX_CART_ITEMS - existing.length;
  const merged = [...existing];
  const unsynced: ServiceCartItem[] = [];

  for (const item of localItems) {
    const key = `${item.category}|${item.itemName}|${item.details.devoteeName}|${item.amount}`;
    if (existingKeys.has(key)) continue; // already restored from a previous merge — safe to drop from local

    if (remainingSlots <= 0) {
      unsynced.push(item); // cap reached — keep it local, don't drop it
      continue;
    }

    const inserted = await insertAccountItem(userId, { category: item.category, itemName: item.itemName, amount: item.amount, details: item.details });
    if (inserted) {
      merged.push(inserted);
      existingKeys.add(key);
      remainingSlots -= 1;
    } else {
      unsynced.push(item); // insert failed (e.g. table/RLS not migrated yet, or a transient error) — keep it local
    }
  }

  if (unsynced.length > 0) {
    setLocalServiceCart(unsynced);
  } else {
    clearLocalServiceCart();
  }

  return merged;
}

// ─── Add / remove (used by BookNowWizard + the cart drawer) ───────────────

export interface AddServiceCartResult {
  ok: boolean;
  /** Populated when ok is false — show this to the devotee (e.g. the
   *  10-item cap message) instead of silently failing. */
  reason?: string;
  items: ServiceCartItem[];
}

/** Adds one Sankalp Portal item to whichever cart is authoritative
 *  (account if logged in, else localStorage), enforcing the 10-item cap
 *  client-side (the cart_items insert trigger enforces it again server-side
 *  as a backstop). Returns the full updated cart either way. */
export async function addServiceCartItem(
  current: ServiceCartItem[],
  newItem: { category: ServiceCartCategory; itemName: string; amount: number; details: ServiceCartItem["details"] }
): Promise<AddServiceCartResult> {
  if (current.length >= MAX_CART_ITEMS) {
    return { ok: false, reason: `Your cart can hold a maximum of ${MAX_CART_ITEMS} items. Please remove an item before adding another.`, items: current };
  }

  const userId = await getCurrentUserId();
  if (userId) {
    const inserted = await insertAccountItem(userId, newItem);
    if (!inserted) {
      // Don't lose the devotee's selection just because the account-side
      // save failed (e.g. a transient network error, or `cart_items`
      // isn't migrated yet in this Supabase project) — stash it in
      // localStorage as a safety net so the next successful
      // mergeLocalCartIntoAccount() (next login/app open) restores it,
      // instead of it silently vanishing.
      const fallbackItem: ServiceCartItem = { ...newItem, id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, addedAt: new Date().toISOString() };
      setLocalServiceCart([...getLocalServiceCart(), fallbackItem]);
      return { ok: false, reason: "Could not save this item to your account cart right now, but it's safely held on this device and will sync automatically once reconnected. Please try again shortly.", items: current };
    }
    return { ok: true, items: [...current, inserted] };
  }

  const localItem: ServiceCartItem = { ...newItem, id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, addedAt: new Date().toISOString() };
  const updated = [...current, localItem];
  setLocalServiceCart(updated);
  return { ok: true, items: updated };
}

/** Removes one item by id from whichever cart is authoritative, returns the
 *  updated list. */
export async function removeServiceCartItem(current: ServiceCartItem[], id: string): Promise<ServiceCartItem[]> {
  const updated = current.filter((i) => i.id !== id);
  const userId = await getCurrentUserId();
  if (userId && !id.startsWith("local-")) {
    await removeAccountItem(id);
  } else {
    setLocalServiceCart(updated);
  }
  return updated;
}

/** Clears the whole cart after a successful checkout. */
export async function clearServiceCart(): Promise<void> {
  const userId = await getCurrentUserId();
  if (userId) {
    await clearAccountCart(userId);
  }
  clearLocalServiceCart();
}

export function serviceCartTotal(items: ServiceCartItem[]): number {
  return items.reduce((sum, i) => sum + i.amount, 0);
}
