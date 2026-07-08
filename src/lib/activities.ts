/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unified per-devotee activity ledger (pujas, sevas, bazaar orders, temple
 * contributions) + extended profile (phone, family members), backed by
 * Supabase. This is additive: it does NOT touch Google Form sync anywhere —
 * every syncToGoogleForm(...) call in the codebase stays exactly as-is.
 *
 * Every function here is defensive: if there's no logged-in Supabase session
 * (guest checkout) or the network/DB call fails, these silently no-op /
 * return empty results instead of throwing, so they never block an existing
 * checkout flow.
 */

import { supabase } from "./supabaseClient";

export type ActivityType = "puja" | "seva" | "product" | "contribution" | "temple_registration" | "other" | "darshan_certificate";
export type PaymentStatus = "pending_verification" | "confirmed" | "failed";

export type FormSubmissionType =
  | "contact_us"
  | "testimonial"
  | "darshan_certificate"
  | "devotee_registration"
  | "expert_registration"
  | "temple_committee_registration";

export interface ActivityRecord {
  id: string;
  activityType: ActivityType;
  itemName: string;
  amount: number;
  refId: string;
  paymentMethod?: string | null;
  paymentStatus: PaymentStatus;
  createdAt: string;
}

export interface RecordActivityInput {
  activityType: ActivityType;
  itemName: string;
  amount: number;
  refId: string;
  paymentMethod?: string;
  paymentStatus?: PaymentStatus; // defaults to "pending_verification" until a payment gateway is wired up
  metadata?: Record<string, unknown>;
}

export interface RecordFormSubmissionInput {
  formType: FormSubmissionType;
  name?: string;
  email?: string;
  phone?: string;
  refId?: string;
  payload?: Record<string, unknown>;
}

export interface FamilyMemberRecord {
  id?: string;
  name: string;
  relation: string;
}

export interface ProfileExtra {
  gotra?: string;
  rashi?: string;
  phone?: string;
}

/** Returns the logged-in devotee's Supabase user id, or null for guests. */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch (e) {
    console.error("getCurrentUserId failed", e);
    return null;
  }
}

/**
 * Records a non-monetary form submission (Contact Us, testimonial, Darshan
 * Certificate request, registration details, etc). Unlike recordActivity,
 * this works for guests too — form_submissions.user_id is nullable and the
 * table's insert policy allows anyone, exactly like a public Google Form.
 * Call this ALONGSIDE existing syncToGoogleForm(...) calls, never instead.
 */
export async function recordFormSubmission(input: RecordFormSubmissionInput): Promise<void> {
  try {
    const userId = await getCurrentUserId(); // null for guests — that's fine here
    const { error } = await supabase.from("form_submissions").insert({
      user_id: userId,
      form_type: input.formType,
      name: input.name ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      ref_id: input.refId ?? null,
      payload: input.payload ?? null,
    });
    if (error) console.error("recordFormSubmission insert failed:", error.message);
  } catch (e) {
    console.error("recordFormSubmission failed", e);
  }
}

/**
 * Records one confirmed (or pending-verification) activity against the
 * currently logged-in devotee. Call this ALONGSIDE existing
 * syncToGoogleForm(...) calls, never instead of them. Safe to call for
 * guests (not logged in) — it just no-ops.
 */
export async function recordActivity(input: RecordActivityInput): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return; // guest checkout — nothing to attach this to yet

    const { error } = await supabase.from("activities").insert({
      user_id: userId,
      activity_type: input.activityType,
      item_name: input.itemName,
      amount: input.amount,
      ref_id: input.refId,
      payment_method: input.paymentMethod ?? null,
      payment_status: input.paymentStatus ?? "pending_verification",
      metadata: input.metadata ?? null,
    });
    if (error) console.error("recordActivity insert failed:", error.message);
  } catch (e) {
    console.error("recordActivity failed", e);
  }
}

/** Fetches the full activity ledger for the logged-in devotee, newest first. */
export async function fetchActivities(): Promise<ActivityRecord[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from("activities")
      .select("id, activity_type, item_name, amount, ref_id, payment_method, payment_status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchActivities failed:", error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      activityType: row.activity_type,
      itemName: row.item_name,
      amount: row.amount,
      refId: row.ref_id,
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      createdAt: row.created_at,
    }));
  } catch (e) {
    console.error("fetchActivities failed", e);
    return [];
  }
}

/** Fetches phone/gotra/rashi from the profiles table for the logged-in devotee. */
export async function fetchProfileExtra(): Promise<ProfileExtra | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("gotra, rashi, phone")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("fetchProfileExtra failed:", error.message);
      return null;
    }
    return data ? { gotra: data.gotra, rashi: data.rashi, phone: data.phone } : null;
  } catch (e) {
    console.error("fetchProfileExtra failed", e);
    return null;
  }
}

/** Upserts gotra/rashi/phone onto the devotee's profiles row. */
export async function saveProfileExtra(fields: ProfileExtra): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        gotra: fields.gotra,
        rashi: fields.rashi,
        phone: fields.phone,
      })
      .eq("id", userId);

    if (error) console.error("saveProfileExtra failed:", error.message);
  } catch (e) {
    console.error("saveProfileExtra failed", e);
  }
}

/** Fetches all family members for the logged-in devotee. */
export async function fetchFamilyMembers(): Promise<FamilyMemberRecord[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from("family_members")
      .select("id, name, relation")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("fetchFamilyMembers failed:", error.message);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error("fetchFamilyMembers failed", e);
    return [];
  }
}

/**
 * Replaces the devotee's full family member list in the DB with `members`.
 * Delete-all-then-reinsert is intentional here — the list is small (a
 * handful of rows per devotee) and this mirrors the existing "rewrite the
 * whole profile object" pattern already used for the localStorage cache,
 * so add/remove stay simple and always consistent with what's on screen.
 */
export async function syncFamilyMembers(members: FamilyMemberRecord[]): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const { error: deleteError } = await supabase.from("family_members").delete().eq("user_id", userId);
    if (deleteError) {
      console.error("syncFamilyMembers delete failed:", deleteError.message);
      return;
    }

    if (members.length === 0) return;

    const { error: insertError } = await supabase.from("family_members").insert(
      members.map((m) => ({ user_id: userId, name: m.name, relation: m.relation }))
    );
    if (insertError) console.error("syncFamilyMembers insert failed:", insertError.message);
  } catch (e) {
    console.error("syncFamilyMembers failed", e);
  }
}
