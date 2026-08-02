/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Refer, Earn & Grow with Dharma" — data-access layer for the referral
 * profile, referral list, commissions and payouts. Mirrors the defensive
 * pattern used throughout lib/activities.ts: every function is safe to call
 * for a guest (no session) or before supabase_schema_referrals.sql has been
 * run — it will simply return an empty/default result instead of throwing,
 * so the Referral Dashboard never breaks the rest of the Dharmic ID page.
 *
 * Money-moving writes (commissions, ledger balance, kyc_status) are NOT
 * performed from here on purpose — see supabase_schema_referrals.sql for
 * why that must happen from a service-role backend function instead.
 */

import { supabase } from "./supabaseClient";
import { getCurrentUserId } from "./activities";

// Six fully separate plan systems share this one profile column — see
// data/referralProgram.ts for the full tier definitions per category.
export type SubscriptionTierId =
  | "none"
  | "diya" | "kalash" | "shankh" | "trishul" | "chakra"                      // Devotee Referral Circles
  | "shishya" | "purohit" | "acharya" | "mahant" | "rajguru"                 // Pujari (Pundit) Service Paths
  | "aarambh" | "utsav" | "mahotsav" | "rajotsav" | "samrat"                 // Puja Mandal Sangh Plans
  | "sadhak" | "yogi" | "siddha" | "rishi" | "maharishi"                     // Yoga Guru Marg Plans
  | "gyani" | "vidwan" | "shastri" | "vachaspati" | "mahopadhyay"            // Dharmic Expert Peeth Plans
  | "sevak" | "karyakarta" | "sanchalak" | "pramukh" | "mahasevak";          // Seva Provider Seva Plans
export type ParticipantType = "devotee" | "pujari" | "mandal" | "yogaguru" | "expert" | "seva";

export interface ReferralProfile {
  userId: string;
  dharmicRefCode: string;
  participantType: ParticipantType;
  subscriptionTier: SubscriptionTierId;
  billingCycle: "monthly" | "annual";
  termsAcceptedAt: string | null;
  kycStatus: "not_required" | "pending" | "verified" | "rejected";
  lifetimeCommission: number;
  ledgerBalance: number;
}

export interface ReferralListItem {
  id: string;
  referredName: string | null;
  referredEmail: string | null;
  referredPhone: string | null;
  contactConsent: boolean;
  bookingCount: number;
  status: "active" | "inactive" | "flagged_fraud";
  attributedAt: string;
}

export interface PayoutRecord {
  id: string;
  amount: number;
  status: "requested" | "processing" | "paid" | "rejected";
  requestedAt: string;
  processedAt: string | null;
}

/** Deterministic, human-shareable referral code derived from a Dharmic ID / user id. */
export function buildReferralCode(seed: string): string {
  const clean = seed.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const shortHash = Array.from(seed).reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7).toString(36).toUpperCase().slice(0, 4);
  return `SD-${clean.slice(0, 6) || "DEVOTEE"}-${shortHash}`;
}

export function buildReferralLink(code: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://sridwar.com";
  return `${origin}/?ref=${code}`;
}

/** Fetches (or lazily creates) the logged-in user's referral profile. */
export async function fetchOrCreateReferralProfile(fallbackSeed: string): Promise<ReferralProfile | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const { data: existing, error: fetchError } = await supabase
      .from("referral_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
      console.error("fetchOrCreateReferralProfile select failed:", fetchError.message);
      return null;
    }

    if (existing) {
      return {
        userId: existing.user_id,
        dharmicRefCode: existing.dharmic_ref_code,
        participantType: existing.participant_type,
        subscriptionTier: existing.subscription_tier,
        billingCycle: existing.billing_cycle ?? "monthly",
        termsAcceptedAt: existing.terms_accepted_at,
        kycStatus: existing.kyc_status,
        lifetimeCommission: Number(existing.lifetime_commission ?? 0),
        ledgerBalance: Number(existing.ledger_balance ?? 0),
      };
    }

    const code = buildReferralCode(fallbackSeed || userId);
    const { data: created, error: insertError } = await supabase
      .from("referral_profiles")
      .insert({ user_id: userId, dharmic_ref_code: code })
      .select("*")
      .single();

    if (insertError) {
      console.error("fetchOrCreateReferralProfile insert failed:", insertError.message);
      // Still hand back a usable in-memory profile so the dashboard can render
      // the referral link even if the migration hasn't been run yet.
      return {
        userId,
        dharmicRefCode: code,
        participantType: "devotee",
        subscriptionTier: "none",
        billingCycle: "monthly",
        termsAcceptedAt: null,
        kycStatus: "not_required",
        lifetimeCommission: 0,
        ledgerBalance: 0,
      };
    }

    return {
      userId: created.user_id,
      dharmicRefCode: created.dharmic_ref_code,
      participantType: created.participant_type,
      subscriptionTier: created.subscription_tier,
      billingCycle: created.billing_cycle ?? "monthly",
      termsAcceptedAt: created.terms_accepted_at,
      kycStatus: created.kyc_status,
      lifetimeCommission: Number(created.lifetime_commission ?? 0),
      ledgerBalance: Number(created.ledger_balance ?? 0),
    };
  } catch (e) {
    console.error("fetchOrCreateReferralProfile failed", e);
    return null;
  }
}

/**
 * Called once a subscription payment is confirmed (or a free-tier plan is
 * activated) from SubscriptionSignup.tsx. Upserts the chosen plan onto the
 * logged-in devotee's referral profile so the Referral Dashboard's
 * "Subscription Status" reflects it immediately — participant_type,
 * subscription_tier, billing_cycle, and a fresh subscription_expires_at
 * (1 month or 1 year out from now).
 *
 * Guests (no Supabase session) are skipped entirely — same defensive
 * pattern as every other function in this file — since referral_profiles is
 * keyed off auth.users(id). The Google Forms row + activities ledger entry
 * that SubscriptionSignup.tsx also writes still capture the sale either way,
 * so nothing is lost for a guest purchase.
 */
export async function activateSubscriptionTier(
  participantType: ParticipantType,
  subscriptionTier: SubscriptionTierId,
  billingCycle: "monthly" | "annual"
): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return; // guest checkout — activities/Google Forms already captured the sale

    // Ensure a referral_profiles row (with its unique dharmic_ref_code)
    // already exists before updating it — a devotee may subscribe before
    // ever opening their Dharmic ID / Referral Dashboard for the first time.
    await fetchOrCreateReferralProfile(`${participantType}-${userId}`);

    const now = new Date();
    const expires = new Date(now);
    if (billingCycle === "annual") expires.setFullYear(expires.getFullYear() + 1);
    else expires.setMonth(expires.getMonth() + 1);

    const { error } = await supabase
      .from("referral_profiles")
      .update({
        participant_type: participantType,
        subscription_tier: subscriptionTier,
        billing_cycle: billingCycle,
        subscription_started_at: now.toISOString(),
        subscription_expires_at: expires.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("user_id", userId);

    if (error) console.error("activateSubscriptionTier update failed:", error.message);
  } catch (e) {
    console.error("activateSubscriptionTier failed", e);
  }
}

/** Records acceptance of the Refer & Earn Program Terms (required before the link is shareable). */
export async function acceptReferralTerms(termsVersion: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;
    const { error } = await supabase
      .from("referral_profiles")
      .update({ terms_accepted_at: new Date().toISOString(), terms_version: termsVersion, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    if (error) {
      console.error("acceptReferralTerms failed:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("acceptReferralTerms failed", e);
    return false;
  }
}

export async function fetchReferralList(): Promise<ReferralListItem[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];
    const { data, error } = await supabase
      .from("referrals")
      .select("*")
      .eq("referrer_user_id", userId)
      .order("attributed_at", { ascending: false });
    if (error) {
      console.error("fetchReferralList failed:", error.message);
      return [];
    }
    return (data || []).map((r: any) => ({
      id: r.id,
      referredName: r.referred_name,
      referredEmail: r.contact_consent ? r.referred_email : null,
      referredPhone: r.contact_consent ? r.referred_phone : null,
      contactConsent: r.contact_consent,
      bookingCount: r.booking_count,
      status: r.status,
      attributedAt: r.attributed_at,
    }));
  } catch (e) {
    console.error("fetchReferralList failed", e);
    return [];
  }
}

export async function fetchPayoutHistory(): Promise<PayoutRecord[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];
    const { data, error } = await supabase
      .from("payouts")
      .select("*")
      .eq("user_id", userId)
      .order("requested_at", { ascending: false });
    if (error) {
      console.error("fetchPayoutHistory failed:", error.message);
      return [];
    }
    return (data || []).map((p: any) => ({
      id: p.id,
      amount: Number(p.amount),
      status: p.status,
      requestedAt: p.requested_at,
      processedAt: p.processed_at,
    }));
  } catch (e) {
    console.error("fetchPayoutHistory failed", e);
    return [];
  }
}

/** Requests a payout of the current ledger balance. Actual settlement happens server-side. */
export async function requestPayout(amount: number): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;
    const { error } = await supabase.from("payouts").insert({ user_id: userId, amount });
    if (error) {
      console.error("requestPayout failed:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("requestPayout failed", e);
    return false;
  }
}
