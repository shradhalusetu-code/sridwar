/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, FormEvent } from "react";
import html2canvas from "html2canvas-pro";
import { User, ShieldCheck, Mail, Phone, Calendar, RefreshCw, LogOut, Award, Layers, Plus, Trash2, Save, Lock, AlertCircle, UserPlus, LogIn, Landmark, Utensils, Armchair, Hammer, FileCheck, Pencil, Download, Share2, Flame, Droplets, Shield, Heart, Sparkles, Sun, Music, BookOpen, Flower2 } from "lucide-react";
import { Language, TRANSLATIONS } from "../data/translations";
import { TEMPLES_LIST } from "../data/temples";
import { supabase } from "../lib/supabaseClient";
import SriDwarLogo from "./SriDwarLogo";
import OptimizedImage from "./OptimizedImage";
import dharmicIdBg from "../assets/images/Dharmic_ID.jpg";
// @ts-ignore
import dharmicIdBgWebp from "../assets/images/Dharmic_ID.webp";
import sridwarQR from "../assets/images/SridwarQR.jpg";
// @ts-ignore
import sridwarQRWebp from "../assets/images/SridwarQR.webp";
import UPIPaymentModal from "./UPIPaymentModal";
import StoneEngravingNote, { STONE_ENGRAVING_REPEAT_TEXT } from "./StoneEngravingNote";
import ReferralDashboardPanel from "./ReferralDashboardPanel";
import MobileCarousel from "./shared/MobileCarousel";
import { syncToGoogleForm, randomRefSuffix } from "../utils/googleFormSync";
import { gaRegistrationSubmit, gaLogin, gaDonationInitiate } from "../utils/analytics";
import { shareOrDownloadBlob } from "../utils/shareCertificate";
import { useCertificateReveal } from "./shared/useCertificateReveal";
import CertificateRevealModal from "./shared/CertificateRevealModal";
import {
  recordActivity, fetchProfileExtra, saveProfileExtra,
  fetchFamilyMembers, syncFamilyMembers,
  fetchActivities, fetchFormSubmissions,
  ActivityRecord, FormSubmissionRecord,
} from "../lib/activities";

interface FamilyMember {
  name: string;
  relation: string;
}

// ─── Password policy ────────────────────────────────────────────────────────
// One rule, one message, used everywhere a devotee sets/changes a password
// (Signup, and "Save New Password" during forgot-password recovery). Kept
// deliberately short per product requirement — no long character-class
// checklist shown to the devotee, just this single sentence.
//
// ✅ FIX (2026-08-31 — matches the required exact user-facing wording): this
// previously read "...include one capital letter, small letters, and
// numbers" and enforced a case-specific rule (required BOTH an uppercase AND
// a lowercase letter) that isn't part of the spec. The required message is
// exactly "Password must be 8–14 characters and include letters and
// numbers." — i.e. length 8–14, at least one letter (any case) and at least
// one number. Rejecting a devotee's password for missing an uppercase
// letter, when the message never told them that rule existed, was silently
// blocking valid signups/password-resets.
const PASSWORD_ERROR_MESSAGE =
  "Password must be 8–14 characters and include letters and numbers.";
function isValidPassword(pw: string): boolean {
  return (
    pw.length >= 8 &&
    pw.length <= 14 &&
    /[A-Za-z]/.test(pw) &&
    /[0-9]/.test(pw)
  );
}

// ─── Dharmic ID card date helpers ───────────────────────────────────────────
// "Registered" must be the devotee's REAL Supabase account-creation date
// (auth.users.created_at — always present, no extra DB column needed), and
// "Valid Till" is calculated dynamically as the 108th Shiva Monday (Somvar)
// counting forward from that date — never hard-coded.
function formatDharmicIdDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Returns the date of the Nth Monday counting forward from `start` (the
 * first Monday on/after `start` counts as Monday #1). Pure calendar
 * arithmetic — no external library, no fixed offsets — so it stays correct
 * for any registration date, in any year, leap years included.
 */
function nthMondayFrom(start: Date, count: number): Date {
  const d = new Date(start.getTime());
  const day = d.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
  const daysUntilFirstMonday = (8 - day) % 7; // 0 if `start` is already a Monday
  d.setDate(d.getDate() + daysUntilFirstMonday);
  d.setDate(d.getDate() + (count - 1) * 7);
  return d;
}

const SHIVA_MONDAY_VALIDITY_COUNT = 108;

interface AuthDashboardProps {
  currentLanguage: Language;
  isLoggedIn: boolean;
  onLoginSuccess: (name: string, email: string) => void;
  onLogout: () => void;
  userProfile: { name: string; email: string };
  bookedItems: Array<{ pujaName: string; price: number; refId: string; date: string }>;
  onOpenLegalDoc?: (doc: string) => void;
  // ✅ ADDED — "Book Again" from a past Puja/Seva activity.
  onBookAgain?: (pujaName: string, price: number) => void;
}

export default function AuthDashboard({
  currentLanguage,
  isLoggedIn,
  onLoginSuccess,
  onLogout,
  userProfile,
  bookedItems,
  onOpenLegalDoc,
  onBookAgain
}: AuthDashboardProps) {
  const [userNameField, setUserNameField] = useState("");
  const [userEmailField, setUserEmailField] = useState("");
  const [userGotra, setUserGotra] = useState("Vatsasa Gotra");
  const [userRashi, setUserRashi] = useState("Dhanu (Sagittarius)");
  // ✅ ADDED — "Manage Subscriptions" preference center. Every new devotee
  // is auto-subscribed at signup (see supabase_add_subscription_preferences.sql
  // — the database column defaults handle this, no signup code changed).
  // This state just mirrors the devotee's own row so they can review/turn
  // categories off later, the same relationship Gmail's "Manage
  // Subscriptions" has to your inbox. Booking confirmations, payment
  // receipts, and certificate-ready emails are transactional — never
  // included here, never optional, exactly like Amazon's order emails.
  const [subscriptionPrefs, setSubscriptionPrefs] = useState({
    subscribe_puja_reminders: true,
    subscribe_devotional_content: true,
    subscribe_temple_updates: true,
    subscribe_referral_program: true,
  });
  const [isSavingSubscriptionPrefs, setIsSavingSubscriptionPrefs] = useState(false);
  const [subscriptionPrefsError, setSubscriptionPrefsError] = useState("");
  const toggleSubscriptionPref = async (key: keyof typeof subscriptionPrefs) => {
    const nextValue = !subscriptionPrefs[key];
    const previous = subscriptionPrefs;
    setSubscriptionPrefs((prev) => ({ ...prev, [key]: nextValue })); // optimistic — feels instant
    setSubscriptionPrefsError("");
    setIsSavingSubscriptionPrefs(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").update({ [key]: nextValue }).eq("id", userData.user.id);
      if (error) throw error;
    } catch (e) {
      console.error("Could not save subscription preference:", e);
      setSubscriptionPrefs(previous); // roll back the optimistic update
      setSubscriptionPrefsError("Could not save your preference right now. Please try again.");
    } finally {
      setIsSavingSubscriptionPrefs(false);
    }
  };
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Real Supabase email/password authentication
  const [authFormMode, setAuthFormMode] = useState<"signup" | "signin">("signup");
  const [passwordField, setPasswordField] = useState("");
  const [authErrorMessage, setAuthErrorMessage] = useState("");
  // Forgot-password flow. Supabase sends a password-reset email with a
  // link back to "?page=login" (see handleSendResetEmail below), which
  // App.tsx's existing deep-link handling uses to open this component
  // directly. Recovery mode is then detected two ways — see the two
  // useEffects further down for why both exist.
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState("");
  const [isPasswordRecoveryMode, setIsPasswordRecoveryMode] = useState(false);
  const [newPasswordField, setNewPasswordField] = useState("");
  const [confirmNewPasswordField, setConfirmNewPasswordField] = useState("");
  const [isSavingNewPassword, setIsSavingNewPassword] = useState(false);
  const [newPasswordError, setNewPasswordError] = useState("");
  const [newPasswordSuccess, setNewPasswordSuccess] = useState(false);
  // True once we've asked a brand-new devotee to confirm their email —
  // shown instead of the form until they switch back to "Log In".
  const [signupNeedsConfirmation, setSignupNeedsConfirmation] = useState(false);
  // "Resend verification email" — the safety net that guarantees a devotee
  // is never permanently blocked out of their Dharmic ID just because one
  // particular email attempt didn't land in their inbox (spam filters,
  // corporate mail gateways, or a first send that genuinely got lost).
  // Works on every platform since it calls the same Supabase endpoint the
  // website already uses.
  const [isResendingConfirmation, setIsResendingConfirmation] = useState(false);
  const [resendCooldownActive, setResendCooldownActive] = useState(false);
  const [resendConfirmationMessage, setResendConfirmationMessage] = useState("");
  const [resendConfirmationError, setResendConfirmationError] = useState("");

  // Self-service account deletion (danger zone) — works for any logged-in
  // devotee, on both the website and the Android app, since both run this
  // same component. Requires the devotee to type "Delete" to confirm, then
  // calls the backend (which uses the Supabase service role to verify the
  // devotee's own session token and permanently remove their account and
  // data) before signing them out locally.
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [deleteAccountConfirmText, setDeleteAccountConfirmText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState("");
  const [deleteAccountSuccess, setDeleteAccountSuccess] = useState(false);

  // Dharmic ID generation step + temple-redevelopment divine contribution step
  const [authStep, setAuthStep] = useState<"login" | "contribute">("login");
  const [pendingLogin, setPendingLogin] = useState<{ name: string; email: string } | null>(null);
  const [selectedTempleId, setSelectedTempleId] = useState("");
  const [customMandapName, setCustomMandapName] = useState("");
  const [customMandapAddress, setCustomMandapAddress] = useState("");
  const [contributionAmount, setContributionAmount] = useState<number>(0);
  const [isContributionPaymentOpen, setIsContributionPaymentOpen] = useState(false);

  // Puja Sankalpa Portal (step between Contribute click and payment)
  const [showSankalpaForm, setShowSankalpaForm] = useState(false);
  const [sankalpaPhone, setSankalpaPhone] = useState("");
  const [sankalpaGotra, setSankalpaGotra] = useState("");
  // ✅ FIX (2026-09-02 — reported bug: devotee stuck with a blank, locked
  // "Devotee Name" field): this field used to be `readOnly`, showing only
  // `pendingLogin?.name` with no way to type anything if that was empty —
  // which happens for any account that never had a display name saved
  // (common for OTP/guest-style logins). The Gotra field right below it
  // already used the correct pattern (editable, pre-filled, but never
  // locked); Devotee Name now matches it exactly.
  const [sankalpaName, setSankalpaName] = useState("");
  const [sankalpaIntent, setSankalpaIntent] = useState("");
  const [contributionRefId, setContributionRefId] = useState("");

  // My Sacred Profile states
  // No placeholder/generic family members are pre-populated here. The
  // Dharmic ID should only ever show family members the devotee has
  // actually entered themselves via "Add family member" below.
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRelation, setNewMemberRelation] = useState("Spouse");
  const [saveProfileSuccess, setSaveProfileSuccess] = useState(false);
  const [userPhone, setUserPhone] = useState("");
  // Editable copy of the devotee's display name — the card shows
  // userProfile.name (owned by App.tsx), but "My Sacred Profile" lets the
  // devotee correct a typo'd name and push the fix back up via
  // onLoginSuccess (safe to call again while already logged in — it just
  // refreshes name/email state, matching how it's already used elsewhere).
  const [editableName, setEditableName] = useState(userProfile.name);
  useEffect(() => {
    setEditableName(userProfile.name);
  }, [userProfile.name]);
  // Real Supabase account-creation timestamp (auth.users.created_at) for
  // the Dharmic ID card's "Registered" date and the dynamically-calculated
  // "Valid Till" (108 Shiva Mondays from registration).
  const [accountCreatedAt, setAccountCreatedAt] = useState<string | null>(null);
  const [dharmicIdDownloadError, setDharmicIdDownloadError] = useState("");
  const [isDownloadingDharmicId, setIsDownloadingDharmicId] = useState(false);

  // Full synced activity ledger (all pujas/sevas/products/divine contributions/
  // registrations, with real payment status) + non-monetary form
  // submissions (Contact Us, testimonials, Darshan Certificate requests,
  // registrations) for the logged-in devotee — read directly from Supabase
  // so "My Sacred Profile" reflects the devotee's complete account
  // activity on any device, not just this browser's session.
  const [activityRecords, setActivityRecords] = useState<ActivityRecord[]>([]);
  const [formSubmissions, setFormSubmissions] = useState<FormSubmissionRecord[]>([]);

  // ── Ledger pagination ───────────────────────────────────────────────────
  // ✅ CHANGED (Profile ledger fix): both "My Spiritual Transactions Ledger"
  // (bookedItems) and "All Account Activity" (activityRecords) now show only
  // their latest 2 entries by default — was 6 — with everything else
  // collapsed behind "Show more". Each "Show more" tap still reveals 10 more
  // at a time, unchanged. A single shared constant, so both sections always
  // stay in sync with each other.
  const LEDGER_CAROUSEL_COUNT = 2;
  const LEDGER_PAGE_SIZE = 10;
  const [bookedLedgerVisible, setBookedLedgerVisible] = useState(LEDGER_CAROUSEL_COUNT);
  const [activityLedgerVisible, setActivityLedgerVisible] = useState(LEDGER_CAROUSEL_COUNT);

  // ✅ ADDED (Profile ledger fix) — "Delete" for a pending/failed activity.
  // activities is an intentionally append-only Supabase table (no update/
  // delete policy for regular users — see supabase_schema.sql and the
  // "Pay Now retry" comment below), so this can never actually delete the
  // real audit record — nor should it, since Sri Dwar's team still needs it
  // for reconciliation even if a devotee abandons the payment. Instead this
  // just hides that record from THIS device's view from now on (persisted
  // to localStorage, same pattern as sridwar_sacred_profile above), which
  // is what a devotee asking to "delete a pending payment" actually wants:
  // one less stuck-looking card cluttering their own Profile.
  const PENDING_DISMISS_KEY = "sridwar_dismissed_pending_activities";
  const [dismissedActivityIds, setDismissedActivityIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(PENDING_DISMISS_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });
  const handleDismissPendingActivity = (rec: ActivityRecord) => {
    const ok = window.confirm(
      `Remove "${rec.itemName}" from your list? This only removes it from your view here — if any amount was actually deducted, please contact Sri Dwar instead of retrying, rather than deleting this.`
    );
    if (!ok) return;
    setDismissedActivityIds((prev) => {
      const next = new Set(prev);
      next.add(rec.id);
      try {
        localStorage.setItem(PENDING_DISMISS_KEY, JSON.stringify(Array.from(next)));
      } catch {
        // Best-effort — if storage is unavailable/full, the dismiss still
        // applies for the rest of this session via React state above.
      }
      return next;
    });
  };

  // ── "Pay Now" retry for a pending/failed "All Account Activity" row ──────
  // activities is an intentionally append-only ledger from the devotee's own
  // browser (see supabase_schema.sql: "No update/delete policy for regular
  // users on purpose") — a devotee's session can never flip their own row to
  // "confirmed" directly, only Sri Dwar's team can, after verifying the UTR.
  // So "Pay Now" does NOT edit the existing row; it reopens the same UPI
  // modal for the same item/amount under a fresh Ref ID and inserts a new
  // "pending_verification" activity (via the existing recordActivity(),
  // exactly like every other payment on the site already does), tagged with
  // retryOfRefId so the original row can be traced if needed. The devotee
  // then sees both the original and the new attempt in their ledger.
  const [retryPaymentTarget, setRetryPaymentTarget] = useState<ActivityRecord | null>(null);
  const [showRetryUPI, setShowRetryUPI] = useState(false);
  const [retryRefId, setRetryRefId] = useState("");

  // "How your support is used" 5-point impact summary, under "Support Our
  // Mission" — collapsed by default so the panel stays short/scannable like
  // every other progressive-disclosure block on this page; expands via
  // "Read More" exactly like StoneEngravingNote's own teaser pattern above it.
  const [showImpactDetails, setShowImpactDetails] = useState(false);

  const handleOpenRetryPayment = (rec: ActivityRecord) => {
    setRetryPaymentTarget(rec);
    setRetryRefId(`SDP-${randomRefSuffix()}`);
    setShowRetryUPI(true);
  };

  const handleRetryPaymentConfirmed = async (details: { amount: number; method: "UPI" }) => {
    if (!retryPaymentTarget) return;
    // ✅ FIX (this pass): every other payment path on this page
    // (finalizeContribution above) — and every checkout in BookNowWizard/
    // TemplateBazaar/App.tsx — calls syncToGoogleForm() ALONGSIDE
    // recordActivity(), because the Google Sheet is what the team's actual
    // manual-verification/reconciliation pipeline (confirmedpaymentpoller.gs,
    // triggers.gs) reads — Supabase's activities table only powers this
    // Profile page's own display. A first pass at this retry button called
    // recordActivity() alone, which would have made a retried payment appear
    // to the devotee here as "Pending Verification" while never actually
    // reaching the team who verifies and confirms it. Fixed by syncing here
    // too, exactly like finalizeContribution does.
    try {
      await syncToGoogleForm("puja_booking", {
        name: userProfile.name || "Devotee",
        email: userProfile.email || "",
        phone: userPhone || "",
        gotra: userGotra || undefined,
        rashi: userRashi || undefined,
        type: `${ACTIVITY_TYPE_LABELS[retryPaymentTarget.activityType] || "Offering"} — ${retryPaymentTarget.itemName}`,
        details: `Item: ${retryPaymentTarget.itemName} | Amount: ₹${details.amount} | Payment Status: Payment Submitted — Pending Verification (Retry) | Payment Method: ${details.method} | Original Ref: ${retryPaymentTarget.refId} | Ref: ${retryRefId}`,
        fee: details.amount,
        whatsapp: userPhone || "",
      });
    } catch (err) {
      console.error(err);
    }
    const newRecord: ActivityRecord = {
      id: `retry-${retryRefId}`,
      activityType: retryPaymentTarget.activityType,
      itemName: retryPaymentTarget.itemName,
      amount: details.amount,
      refId: retryRefId,
      paymentMethod: details.method,
      paymentStatus: "pending_verification",
      createdAt: new Date().toISOString(),
    };
    await recordActivity({
      activityType: retryPaymentTarget.activityType,
      itemName: retryPaymentTarget.itemName,
      amount: details.amount,
      refId: retryRefId,
      paymentMethod: details.method,
      paymentStatus: "pending_verification",
      metadata: { retryOfRefId: retryPaymentTarget.refId },
    });
    setActivityRecords((prev) => [newRecord, ...prev]);
    setShowRetryUPI(false);
    setRetryPaymentTarget(null);
  };

  // Post-login "Contribute / Donate" panel — lets an already-logged-in
  // devotee start a new temple divine contribution from their Profile page,
  // reusing the same temple/amount selection + Sankalpa + UPI payment flow
  // used during first-time Dharmic ID generation.
  const [showPostLoginContribute, setShowPostLoginContribute] = useState(false);
  const [postLoginContributionSuccess, setPostLoginContributionSuccess] = useState(false);

  // Sync profile details on mount or auth state change.
  // Supabase is the source of truth (so the Dharmic ID looks the same on
  // any device); localStorage is read first only as an instant-paint cache
  // while the DB fetch is in flight, then overwritten once real data lands.
  useEffect(() => {
    if (isLoggedIn) {
      const savedProfileStr = localStorage.getItem("sridwar_sacred_profile");
      if (savedProfileStr) {
        try {
          const profile = JSON.parse(savedProfileStr);
          if (profile.gotra) setUserGotra(profile.gotra);
          if (profile.rashi) setUserRashi(profile.rashi);
          if (profile.phone) setUserPhone(profile.phone);
          if (profile.family) setFamilyMembers(profile.family);
        } catch (e) {
          console.error("Failed to parse saved profile", e);
        }
      }

      // Real account-creation date, straight from Supabase Auth — always
      // present on every user, no extra migration needed, and identical on
      // every device/platform since it's read from the server, not cached
      // locally.
      supabase.auth.getUser().then(({ data }) => {
        if (data.user?.created_at) setAccountCreatedAt(data.user.created_at);
      });

      // Now reconcile against the real Supabase record.
      Promise.all([
        fetchProfileExtra(),
        fetchFamilyMembers(),
        fetchActivities(),
        fetchFormSubmissions(),
      ]).then(([extra, family, activities, submissions]) => {
        if (extra) {
          if (extra.gotra) setUserGotra(extra.gotra);
          if (extra.rashi) setUserRashi(extra.rashi);
          if (extra.phone) setUserPhone(extra.phone);
          setSubscriptionPrefs({
            subscribe_puja_reminders: extra.subscribe_puja_reminders ?? true,
            subscribe_devotional_content: extra.subscribe_devotional_content ?? true,
            subscribe_temple_updates: extra.subscribe_temple_updates ?? true,
            subscribe_referral_program: extra.subscribe_referral_program ?? true,
          });
        }
        // Only overwrite the family list if the DB actually has rows —
        // an empty DB result on a first-time fetch (e.g. right after
        // signup, before "family_members" table has synced) shouldn't
        // wipe out what's already showing from the localStorage cache.
        if (family.length > 0) {
          setFamilyMembers(family.map((f) => ({ name: f.name, relation: f.relation })));
        }
        setActivityRecords(activities);
        setFormSubmissions(submissions);
      });
    } else {
      // Reset the Dharmic ID generation flow back to the start after logout
      setAuthStep("login");
      setPendingLogin(null);
      setSelectedTempleId("");
      setCustomMandapName("");
      setCustomMandapAddress("");
      setContributionAmount(0);
      setActivityRecords([]);
      setFormSubmissions([]);
      setShowPostLoginContribute(false);
      setPostLoginContributionSuccess(false);
      setAccountCreatedAt(null);
      setDharmicIdDownloadError("");
    }
  }, [isLoggedIn]);

  // ─── Why the reset-password link still wasn't showing a reset form ───────
  //
  // The redirect itself now correctly lands on this page (previous fix
  // worked). What's still missing is that Supabase's DEFAULT "Reset
  // Password" email template uses {{ .ConfirmationURL }}, which routes the
  // click through Supabase's own hosted verification page first — and
  // *that* hop is where things get lost. This is a well-documented
  // Supabase gotcha, not something specific to this app: that hosted
  // redirect can fire a SIGNED_IN event before PASSWORD_RECOVERY, and can
  // clear the token from the URL before this component's own checks ever
  // see it, depending on timing outside our control.
  //
  // The fix Supabase itself recommends for client-only apps like this one
  // is to skip that hop entirely: change the email template to link
  // straight back to the app with an explicit token_hash, and verify it
  // directly here with supabase.auth.verifyOtp(). This is deterministic —
  // no dependence on background event timing at all.
  //
  // 👉 REQUIRED Dashboard step: in Supabase → Authentication → Email
  //    Templates → "Reset Password", replace the body with one that links
  //    to: {{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery
  //    (full template provided separately). Without that template change,
  //    this code has nothing to read and falls back to the older
  //    hash-based checks below, which is what's currently happening.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    const type = params.get("type");
    if (tokenHash && type === "recovery") {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" }).then(({ error }) => {
        if (error) {
          console.error("[AuthDashboard] Recovery link verification failed:", error.message);
          setForgotPasswordError(
            "This password reset link is invalid or has expired. Please request a new one below."
          );
          setShowForgotPassword(true);
        } else {
          setIsPasswordRecoveryMode(true);
        }
        // Strip token_hash/type out of the address bar either way — a
        // failed or already-used token shouldn't keep re-attempting on
        // every refresh, and a valid one shouldn't linger visibly either.
        const cleanParams = new URLSearchParams(window.location.search);
        cleanParams.delete("token_hash");
        cleanParams.delete("type");
        const cleanSearch = cleanParams.toString();
        window.history.replaceState(
          window.history.state,
          "",
          window.location.pathname + (cleanSearch ? `?${cleanSearch}` : "")
        );
      });
    }
  }, []);

  // ─── Why verification emails "worked on desktop but not on the app/mobile" ─
  //
  // Two separate root causes, both fixed here:
  //
  //   1. Supabase's ANTI-ENUMERATION behaviour: calling signUp() with an
  //      email that is already registered AND already confirmed returns a
  //      "fake" user object (empty identities[]) with NO error and NO
  //      session — and, critically, Supabase does NOT send any email for
  //      that case. The old code here couldn't tell this apart from a real
  //      first-time signup and showed "check your inbox" regardless. In
  //      practice this is exactly what happens when the same devotee (or a
  //      tester) signs up successfully once on one device, then later
  //      "signs up" again with the same email from a different
  //      platform — no email is ever sent for that second attempt, on ANY
  //      platform, desktop included, which reads exactly like "the app
  //      doesn't send emails." See handleGoogleLogin below for the fix
  //      (checking data.user.identities.length === 0).
  //
  //   2. The SAME hosted-redirect gotcha already fixed above for password
  //      recovery also affects the default "Confirm signup" email
  //      template: {{ .ConfirmationURL }} routes through Supabase's own
  //      hosted verification page before landing back on the app, and that
  //      extra hop is far more likely to fail inside an in-app/WebView
  //      browser (Android app, links opened from Gmail/Outlook mobile
  //      apps, WhatsApp's in-app browser, etc.) than in an ordinary desktop
  //      tab.
  //
  //      👉 REQUIRED Dashboard step (mirrors the Reset Password template
  //         change already made): in Supabase → Authentication → Email
  //         Templates → "Confirm signup", change the link to point to
  //         {{ .SiteURL }}?token_hash={{ .TokenHash }}&type=signup instead
  //         of {{ .ConfirmationURL }}. The useEffect below is the code half
  //         of that fix — it verifies the token directly with
  //         supabase.auth.verifyOtp(), the same deterministic approach used
  //         for password recovery, instead of depending on the hosted
  //         redirect chain to survive every mobile mail client/WebView.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    const type = params.get("type");
    if (tokenHash && (type === "signup" || type === "email")) {
      supabase.auth
        .verifyOtp({ token_hash: tokenHash, type: type === "email" ? "email" : "signup" })
        .then(async ({ data, error }) => {
          if (error) {
            console.error("[AuthDashboard] Signup verification failed:", error.message);
            setAuthErrorMessage(
              "This confirmation link is invalid or has expired. Please log in below — if your Dharmic ID still shows as unverified, switch to the Signup tab and use \"Resend verification email.\""
            );
            setAuthFormMode("signin");
          } else if (data.user) {
            // A real session now exists — App.tsx's own onAuthStateChange
            // listener picks this up and logs the devotee straight into
            // their dashboard. The "profiles" row was never written at
            // signup time (no session existed yet then, and RLS correctly
            // blocks an unauthenticated insert), so create it now that we
            // have one.
            const { data: existingProfile } = await supabase
              .from("profiles")
              .select("id")
              .eq("id", data.user.id)
              .maybeSingle();
            if (!existingProfile) {
              const { error: profileError } = await supabase.from("profiles").insert({
                id: data.user.id,
                name: (data.user.user_metadata?.name as string) || data.user.email || "Devotee",
                email: data.user.email || "",
                gotra: userGotra,
                rashi: userRashi,
                phone: userPhone || null,
              });
              if (profileError) {
                console.error("Could not save profile after email verification:", profileError.message);
              }
            }
          }
          const cleanParams = new URLSearchParams(window.location.search);
          cleanParams.delete("token_hash");
          cleanParams.delete("type");
          const cleanSearch = cleanParams.toString();
          window.history.replaceState(
            window.history.state,
            "",
            window.location.pathname + (cleanSearch ? `?${cleanSearch}` : "")
          );
        });
    }
  }, []);

  // Fallback #1: some older/default Supabase email templates deliver the
  // recovery token as a URL hash fragment (#...type=recovery...) instead
  // of the query-string token_hash above. Harmless to keep checking for
  // both.
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      setIsPasswordRecoveryMode(true);
    }
  }, []);

  // Fallback #2: listen for Supabase's PASSWORD_RECOVERY event too, in case
  // neither URL-based check above catches it first.
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecoveryMode(true);
      }
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Step 1 of forgot-password: send the reset email. Supabase's
  // resetPasswordForEmail never reveals whether the email exists (it
  // always "succeeds" from the caller's point of view) — that's a
  // deliberate Supabase anti-enumeration behaviour, not a bug here, so we
  // show the same success message regardless.
  const handleSendResetEmail = async (e: FormEvent) => {
    e.preventDefault();
    setForgotPasswordError("");

    if (!forgotPasswordEmail.trim()) {
      setForgotPasswordError("Please enter your email address.");
      return;
    }

    setIsSendingResetEmail(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail.trim(), {
      // "?page=login" makes App.tsx open straight to this component on
      // load — see the note above for why the bare site root wasn't enough.
      redirectTo: `${window.location.origin}/?page=login`,
    });
    setIsSendingResetEmail(false);

    if (error) {
      setForgotPasswordError(error.message);
      return;
    }
    setResetEmailSent(true);
  };

  // Step 2 of forgot-password: the devotee is now in a temporary recovery
  // session (from the PASSWORD_RECOVERY event above) and sets a new
  // password.
  const handleSaveNewPassword = async (e: FormEvent) => {
    e.preventDefault();
    setNewPasswordError("");

    if (!isValidPassword(newPasswordField)) {
      setNewPasswordError(PASSWORD_ERROR_MESSAGE);
      return;
    }
    if (newPasswordField !== confirmNewPasswordField) {
      setNewPasswordError("Passwords do not match.");
      return;
    }

    setIsSavingNewPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPasswordField });
    setIsSavingNewPassword(false);

    if (error) {
      setNewPasswordError(error.message);
      return;
    }
    setNewPasswordSuccess(true);
    setNewPasswordField("");
    setConfirmNewPasswordField("");
    // Strip the recovery token out of the address bar now that it's been
    // used — leaving it there would let a page refresh re-trigger recovery
    // mode indefinitely, and there's no reason for an access token to
    // linger visibly in the URL/browser history any longer than it has to.
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    }
    setTimeout(() => {
      setIsPasswordRecoveryMode(false);
      setNewPasswordSuccess(false);
    }, 2500);
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    const correctedName = editableName.trim() || userProfile.name;
    const profile = {
      name: correctedName,
      email: userProfile.email,
      gotra: userGotra,
      rashi: userRashi,
      phone: userPhone,
      family: familyMembers
    };
    localStorage.setItem("sridwar_sacred_profile", JSON.stringify(profile));

    // Source of truth — so this profile is visible on any device, not just
    // this browser.
    saveProfileExtra({ gotra: userGotra, rashi: userRashi, phone: userPhone });
    syncFamilyMembers(familyMembers);

    // If the devotee corrected their name, push it to Supabase (both the
    // profiles row and the auth user's own metadata) and refresh what's
    // shown immediately — onLoginSuccess is safe to call again while
    // already logged in, it only updates the displayed name/email.
    if (correctedName !== userProfile.name) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase.from("profiles").update({ name: correctedName }).eq("id", userData.user.id);
        await supabase.auth.updateUser({ data: { name: correctedName } });
      }
      onLoginSuccess(correctedName, userProfile.email);
    }

    // Also sync to Google Forms/Sheets, same as every other form on the
    // site, so My Sacred Profile updates land in the devotee records sheet
    // too — not just in Supabase.
    syncToGoogleForm("devotee_support", {
      name: correctedName,
      email: userProfile.email,
      phone: userPhone,
      type: "Sacred Profile Update",
      details: `Gotra: ${userGotra} | Rashi: ${userRashi} | Family Members: ${
        familyMembers.length > 0
          ? familyMembers.map((m) => `${m.name} (${m.relation})`).join(", ")
          : "None"
      }`,
      gotra: userGotra,
      rashi: userRashi,
    });

    setSaveProfileSuccess(true);
    setTimeout(() => {
      setSaveProfileSuccess(false);
    }, 4000);
  };

  const handleAddFamilyMember = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) {
      alert("Please specify a Family Member devotee name.");
      return;
    }
    const updated = [...familyMembers, { name: newMemberName.trim(), relation: newMemberRelation }];
    setFamilyMembers(updated);
    setNewMemberName("");

    // Persist immediately on list change for best UX
    const profile = {
      name: userProfile.name,
      email: userProfile.email,
      gotra: userGotra,
      rashi: userRashi,
      phone: userPhone,
      family: updated
    };
    localStorage.setItem("sridwar_sacred_profile", JSON.stringify(profile));
    syncFamilyMembers(updated);
  };

  const handleRemoveFamilyMember = (indexToRemove: number) => {
    const updated = familyMembers.filter((_, idx) => idx !== indexToRemove);
    setFamilyMembers(updated);

    // Persist immediately on list change
    const profile = {
      name: userProfile.name,
      email: userProfile.email,
      gotra: userGotra,
      rashi: userRashi,
      phone: userPhone,
      family: updated
    };
    localStorage.setItem("sridwar_sacred_profile", JSON.stringify(profile));
    syncFamilyMembers(updated);
  };

  // Downloads the on-screen Dharmic ID card (#digital-dharmic-id-card) as a
  // JPG, pixel-for-pixel as shown — including the temple backdrop,
  // Gotra/Rashi, dates, and QR code. html2canvas-pro is a normal static
  // import (top of file) rather than a runtime dynamic import:
  // AuthDashboard.tsx is already React.lazy-loaded from App.tsx, so this
  // still doesn't touch the main entry bundle — it just avoids Vite's
  // dev-server having to "discover" the dependency mid-session and restart
  // its optimizer, which is what caused the "server connection lost" / 404
  // errors.
  //
  // ✅ FIX (2026-08-29): this used to use plain "html2canvas", which throws
  // "Attempting to parse an unsupported color function 'oklch'" on any
  // element styled with Tailwind CSS v4 (this project's Tailwind version —
  // v4's default colour palette is defined in oklch()). That exception was
  // caught below and silently swallowed into the generic "Could not
  // generate the image right now" message every single time — the download
  // could never have worked while the app used Tailwind v4. Switched to
  // html2canvas-pro (see vite.config.ts's optimizeDeps/manualChunks, also
  // updated), a maintained drop-in fork with the exact same API that adds
  // oklch/oklab/lab/lch support. No other code here needed to change.
  //
  // ✅ SIMPLIFIED (2026-08-29): PNG option removed per request — JPG only,
  // one button ("Download Your ID"), no format choice to make.
  // ✅ FIX — devotee report: worked on the phone app and on desktop/laptop
  // browsers, but not on a 12.1" tablet. Two separate, well-documented
  // cross-device failure points here, both fixed:
  //
  // 1. This used `canvas.toDataURL()` + `<a href="data:...">`. A `data:`
  //    URL download is NOT reliably honoured by every mobile/tablet
  //    browser's `download` attribute — some (particularly tablet-class
  //    WebViews and certain Android browsers) just navigate to/open the
  //    data URI instead of saving a file, which looks exactly like
  //    "nothing happens" to the person tapping it. Switched to the same
  //    blob→URL.createObjectURL()→<a download> pattern already used (and
  //    already confirmed working) by every other download button on this
  //    page — one proven mechanism everywhere, not two.
  // 2. `scale` was uncapped relative to the card's actual on-screen size —
  //    a large tablet viewport combined with a high devicePixelRatio can
  //    push the resulting canvas past a browser's maximum canvas area
  //    (iOS Safari's limit in particular is much lower than desktop
  //    Chrome's), which fails silently or throws depending on the browser.
  //    Now capped by the card's real pixel dimensions, not just
  //    devicePixelRatio, and retries once at a safe fixed scale if the
  //    first attempt fails for any reason — so a device-specific limit on
  //    the first try no longer means the download just doesn't work.
  const MAX_CANVAS_DIMENSION = 4096; // safely under every mainstream browser's canvas area cap, including iOS Safari's

  const renderDharmicIdCanvas = async (node: HTMLElement, scale: number) => {
    return html2canvas(node, { backgroundColor: "#092320", scale, useCORS: true });
  };

  const handleDownloadDharmicId = async () => {
    setDharmicIdDownloadError("");
    const node = document.getElementById("digital-dharmic-id-card");
    if (!node) return;

    setIsDownloadingDharmicId(true);
    try {
      const rect = node.getBoundingClientRect();
      const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 2;
      const requestedScale = Math.min(3, dpr);
      // Clamp so width*scale and height*scale can never exceed
      // MAX_CANVAS_DIMENSION, regardless of how large the card renders on
      // a given screen/breakpoint.
      const safeScale = Math.max(
        1,
        Math.min(requestedScale, MAX_CANVAS_DIMENSION / Math.max(rect.width, 1), MAX_CANVAS_DIMENSION / Math.max(rect.height, 1))
      );

      let canvas: HTMLCanvasElement;
      try {
        canvas = await renderDharmicIdCanvas(node as HTMLElement, safeScale);
      } catch (firstError) {
        // One retry at a conservative fixed scale — covers any
        // device-specific limit the size-based calculation above didn't
        // anticipate, rather than giving up on the first failure.
        console.warn("Dharmic ID render failed at scale", safeScale, "— retrying at scale 1:", firstError);
        canvas = await renderDharmicIdCanvas(node as HTMLElement, 1);
      }

      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
      if (!blob) throw new Error("Canvas produced an empty image (toBlob returned null)");

      const safeName = (userProfile.name || "Devotee").trim().replace(/\s+/g, "_");
      // ✅ RELIABILITY FIX: see shareCertificate.ts — native-Android-first
      // cascade instead of a plain `<a download>`-only implementation.
      const result = await shareOrDownloadBlob(blob, `Dharmic-ID-${safeName}.jpg`, "My Sri Dwar Dharmic ID", "Jai Jagannath! Here is my Sri Dwar Dharmic ID.");
      if (result.status === "error") {
        setDharmicIdDownloadError("Could not generate the image right now. Please try again, or take a screenshot instead.");
      }
    } catch (e) {
      console.error("Dharmic ID download failed:", e);
      setDharmicIdDownloadError("Could not generate the image right now. Please try again, or take a screenshot instead.");
    } finally {
      setIsDownloadingDharmicId(false);
    }
  };

  // ✅ ADDED — Share Certificate for the Dharmic ID. Re-renders the same
  // html2canvas-pro capture as handleDownloadDharmicId above (rather than
  // reusing a stored blob, since the card can change between renders) and
  // hands it to the shared shareOrDownloadBlob() helper, which opens the
  // native share sheet with the actual JPG attached and safely falls back
  // to a normal download on browsers without file-sharing support.
  const [isSharingDharmicId, setIsSharingDharmicId] = useState(false);

  const handleShareDharmicId = async () => {
    setDharmicIdDownloadError("");
    const node = document.getElementById("digital-dharmic-id-card");
    if (!node) return;

    setIsSharingDharmicId(true);
    try {
      const rect = node.getBoundingClientRect();
      const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 2;
      const requestedScale = Math.min(3, dpr);
      const safeScale = Math.max(
        1,
        Math.min(requestedScale, MAX_CANVAS_DIMENSION / Math.max(rect.width, 1), MAX_CANVAS_DIMENSION / Math.max(rect.height, 1))
      );

      let canvas: HTMLCanvasElement;
      try {
        canvas = await renderDharmicIdCanvas(node as HTMLElement, safeScale);
      } catch (firstError) {
        console.warn("Dharmic ID render failed at scale", safeScale, "— retrying at scale 1:", firstError);
        canvas = await renderDharmicIdCanvas(node as HTMLElement, 1);
      }

      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
      if (!blob) throw new Error("Canvas produced an empty image (toBlob returned null)");

      const safeName = (userProfile.name || "Devotee").trim().replace(/\s+/g, "_");
      await shareOrDownloadBlob(blob, `Dharmic-ID-${safeName}.jpg`, "My Sri Dwar Dharmic ID", "Jai Jagannath! Here is my Sri Dwar Dharmic ID.");
    } catch (e) {
      console.error("Dharmic ID share failed:", e);
      setDharmicIdDownloadError("Could not share the image right now. Please try again, or take a screenshot instead.");
    } finally {
      setIsSharingDharmicId(false);
    }
  };

  // Downloads the server-composited Temple Visit Certificate for one Darshan
  // Certificate request (see GET /api/certificates/temple-visit/:refId in
  // server.ts). A relative fetch — this page is always served by the same
  // Express server that exposes that route (both on the website and inside
  // the Capacitor app, which loads the live site directly per
  // capacitor.config.ts), so no separate API base URL is needed here. Same
  // blob→object-URL→<a download> pattern as handleDownloadDharmicId above.
  // ✅ UPDATED — opens the shared reveal modal (the "unboxing" moment)
  // instead of immediately saving/sharing silently — see
  // shared/useCertificateReveal.ts + shared/CertificateRevealModal.tsx.
  const [certDownloadError, setCertDownloadError] = useState("");
  const [loadingTempleCertRefId, setLoadingTempleCertRefId] = useState<string | null>(null);
  const templeCertReveal = useCertificateReveal();

  const openTempleCertificateReveal = async (refId: string, devoteeName: string) => {
    if (!refId) return;
    setCertDownloadError("");
    setLoadingTempleCertRefId(refId);
    const safeName = (devoteeName || "Devotee").trim().replace(/\s+/g, "_");
    await templeCertReveal.open(`/api/certificates/temple-visit/${encodeURIComponent(refId)}`, `Sri-Dwar-Temple-Visit-Certificate-${safeName}.jpg`);
    setLoadingTempleCertRefId(null);
    if (templeCertReveal.error) setCertDownloadError(templeCertReveal.error);
  };

  const t = TRANSLATIONS[currentLanguage];

  // ✅ FIX — the same 🐚 emoji, absolutely positioned in the corner, was used
  // for every single booked ceremony regardless of type, and had no
  // reserved space of its own — a long puja name (very common; several
  // names in this app run 15+ words) wrapped to multiple lines and ran
  // straight under it. Two changes: (1) a real icon per keyword found in
  // the item's name, so different offerings look different at a glance,
  // and (2) laid out as a proper flex row with its own column instead of
  // position:absolute, so the title can never wrap underneath it again —
  // structurally impossible now, not just visually unlikely.
  // ✅ ADDED (2026-08-31 — "Booked Ceremonies" title clutter): pujaName is
  // often a long, fully-descriptive string built at booking time (e.g.
  // "Veer Raksha Kavach Puja — For Our Armed Forces — Ekal Raksha
  // Prarthana, Temple Selection: Any Temple, Priest/Expert Selection: Any
  // experienced priest/expert for this puja") — correct and complete, but
  // unreadable as a list-card title. Every such string this app builds
  // uses " — " (em dash) to separate the core name from the elaboration
  // that follows, so splitting on the FIRST one recovers exactly the
  // short form asked for ("Veer Raksha Kavach Puja") without needing a
  // second data field or touching how pujaName is stored/read anywhere
  // else. Names that never had a " — " in them (already short, e.g.
  // "Rudrabhishek Puja") pass through unchanged. The full original string
  // is never discarded — see the expand toggle below, which reveals it in
  // full when tapped.
  const getShortTitle = (fullName: string): string => {
    const idx = fullName.indexOf(" — ");
    return idx > 0 ? fullName.slice(0, idx).trim() : fullName;
  };
  const [expandedBookedItems, setExpandedBookedItems] = useState<Set<string>>(new Set());
  const toggleBookedItemExpanded = (key: string) => {
    setExpandedBookedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };
  // ✅ ADDED (Profile ledger field-trim, 2026-09-03): same collapse/expand
  // pattern as expandedBookedItems above, for "All Account Activity"
  // cards — the booking stepper and Receipt/Certificate/Book Again
  // buttons (renderActivityExtras) now only show once a card is expanded.
  const [expandedActivityCards, setExpandedActivityCards] = useState<Set<string>>(new Set());
  const toggleActivityCardExpanded = (key: string) => {
    setExpandedActivityCards((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };
  const getPujaIcon = (name: string) => {
    const n = (name || "").toLowerCase();
    if (/raksha|kavach|protection|armed forces|shield/.test(n)) return Shield;
    if (/abhishek|jal\b|water|milk|panchamrit/.test(n)) return Droplets;
    if (/havan|yagna|yajna|agni|homa/.test(n)) return Flame;
    if (/aarti|diya|deep\b|lamp/.test(n)) return Sun;
    if (/seva|donation|contribution|charity|annadan/.test(n)) return Heart;
    if (/mantra|chant|jaap|japa|recitation/.test(n)) return Music;
    if (/vedic|scripture|katha|discourse|path\b/.test(n)) return BookOpen;
    return Flower2;
  };

  // ✅ UPDATED — every "Receipt"/"Certificate"/"Inquiry"/"General" download
  // button in this file now opens the shared reveal modal (the "unboxing"
  // moment) instead of immediately saving/sharing silently — see
  // shared/useCertificateReveal.ts + shared/CertificateRevealModal.tsx,
  // the one implementation every certificate download in the app shares.
  // docKey is still tracked here (separately from the hook's own isLoading)
  // so the SPECIFIC button that was tapped shows its own "Preparing…"
  // state, since this one page can have many such buttons at once.
  const [activityDownloadError, setActivityDownloadError] = useState("");
  const [loadingDocKey, setLoadingDocKey] = useState<string | null>(null);
  const documentReveal = useCertificateReveal();

  const openDocumentReveal = async (url: string, filename: string, docKey: string) => {
    setActivityDownloadError("");
    setLoadingDocKey(docKey);
    await documentReveal.open(url, filename);
    setLoadingDocKey(null);
    if (documentReveal.error) setActivityDownloadError(documentReveal.error);
  };

  /** Renders the Receipt/Certificate download row for one activity record — shared by both the carousel and "show more" list below so they never drift apart. */
  // ✅ SPLIT (Profile ledger field-trim, 2026-09-03): this used to be one
  // function mixing "core, always-relevant" actions (Complete Payment,
  // Delete) with "supplementary, can wait" ones (Receipt/Certificate
  // downloads, Book Again). Per the requirement — "For other activities,
  // show title, reference ID, price, and payment status. Put remaining
  // details/activities under Show More" alongside "Pending payments:
  // clearly show... Complete Payment option" — those two groups now need
  // to render differently: renderPendingActions always shows on the card
  // face (never collapsed, since a devotee must never have to dig for a
  // stuck payment's fix), renderActivityExtras only shows once "Details"
  // is expanded.
  const renderPendingActions = (rec: ActivityRecord) => {
    const canRetryPayment = rec.paymentStatus === "pending_verification" || rec.paymentStatus === "failed";
    if (!canRetryPayment) return null;
    return (
      <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-white/5">
        <button
          type="button"
          onClick={() => handleOpenRetryPayment(rec)}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-[#FFB347]/15 hover:bg-[#FFB347]/25 border border-[#FFB347]/40 text-[#FFB347] rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all"
        >
          <RefreshCw className="w-3 h-3" />
          Complete Payment
        </button>
        {/* ✅ ADDED (Profile ledger fix) — "Delete" for a pending/failed
            row, wherever this row is shown (main ledger or Pending & Cart
            Services below) — see handleDismissPendingActivity above for
            what this actually does and why. */}
        <button
          type="button"
          onClick={() => handleDismissPendingActivity(rec)}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-white/5 hover:bg-red-950/30 border border-white/15 hover:border-red-500/30 text-white/50 hover:text-red-300 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all"
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      </div>
    );
  };

  const renderActivityExtras = (rec: ActivityRecord) => {
    const safeName = (userProfile.name || "Devotee").trim().replace(/\s+/g, "_");
    const isPaid = rec.paymentStatus === "confirmed";
    // ✅ FIX (2026-08-29 — explicit clarification): this certificate is a
    // devotional ACKNOWLEDGEMENT that the devotee opted in for this Puja/
    // Seva — like an order confirmation — never proof of performance. It
    // used to wait for completionStatus === "completed" (matching the
    // server's old gate, since removed) before showing at all; now
    // available for any genuine puja/seva booking regardless of
    // completion. A separate, individually personalized certificate is
    // prepared by Sri Dwar's team after the rite is actually performed and
    // emailed directly — this button was never meant to be that.
    const showCertificate = rec.activityType === "puja" || rec.activityType === "seva";
    if (!isPaid && !showCertificate) return null;
    // ✅ FIX (2026-08-29 — architecture reversal, explicitly requested):
    // Certificate (JPG) and Confirmation (plain-text PDF, generated
    // separately client-side by downloadConfirmationMessage() in
    // utils/devotionalMessages.ts — untouched by any of this work) must
    // stay two fully independent downloads; a PDF must never have a
    // certificate image embedded in it. The "Invoice PDF" button that used
    // to sit here called /api/certificates/transaction/:refId/pdf, which
    // does exactly that — removed. "Receipt" (JPG) and "Certificate" (JPG)
    // below are untouched; both were already image-only downloads.
    return (
      <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-white/5">
        {isPaid && (
          <button
            type="button"
            onClick={() => openDocumentReveal(`/api/certificates/transaction/${encodeURIComponent(rec.refId)}`, `Sri-Dwar-Receipt-${safeName}.jpg`, `${rec.id}-jpg`)}
            disabled={loadingDocKey === `${rec.id}-jpg`}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/15 text-[#5EEAD4] rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all disabled:opacity-50"
          >
            <Download className="w-3 h-3" />
            {loadingDocKey === `${rec.id}-jpg` ? "..." : "Receipt"}
          </button>
        )}
        {showCertificate && (
          <button
            type="button"
            onClick={() => openDocumentReveal(`/api/certificates/service/${encodeURIComponent(rec.refId)}`, `Sri-Dwar-Certificate-${safeName}.jpg`, `${rec.id}-cert`)}
            disabled={loadingDocKey === `${rec.id}-cert`}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#0F766E]/20 hover:bg-[#0F766E]/40 border border-[#5EEAD4]/30 text-[#5EEAD4] rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all disabled:opacity-50"
          >
            <Download className="w-3 h-3" />
            {loadingDocKey === `${rec.id}-cert` ? "..." : "Certificate"}
          </button>
        )}
        {/* ✅ ADDED — "Book Again" (Amazon/Flipkart's "Buy Again", adapted):
            only for a genuine puja/seva that's actually paid, and only
            when onBookAgain was actually passed in — never shown for a
            failed/pending booking, since re-offering the same wizard for
            those is what the Complete Payment retry button already is. */}
        {showCertificate && isPaid && onBookAgain && (
          <button
            type="button"
            onClick={() => onBookAgain(rec.itemName, rec.amount)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/15 text-white/70 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all"
          >
            <RefreshCw className="w-3 h-3" />
            Book Again
          </button>
        )}
      </div>
    );
  };


  // Display helpers for the synced activity ledger below.
  const ACTIVITY_TYPE_LABELS: Record<string, string> = {
    puja: "Puja Booking",
    seva: "Seva / Sponsorship",
    product: "Bazaar Order",
    contribution: "Temple Divine Contribution",
    temple_registration: "Temple Registration",
    darshan_certificate: "Darshan Certificate",
    other: "Other Offering",
  };
  const FORM_TYPE_LABELS: Record<string, string> = {
    contact_us: "Contact Us Message",
    testimonial: "Devotion Story Shared",
    darshan_certificate: "Darshan Certificate Request",
    devotee_registration: "Devotee Registration",
    expert_registration: "Dharmic Expert Registration",
    temple_committee_registration: "Temple Committee Registration",
  };
  const paymentStatusBadge = (status: string) => {
    if (status === "confirmed") {
      return { label: "Confirmed", cls: "bg-emerald-950/60 text-emerald-300 border-emerald-500/30" };
    }
    if (status === "failed") {
      return { label: "Payment Failed", cls: "bg-red-950/50 text-red-300 border-red-500/30" };
    }
    return { label: "Pending Verification", cls: "bg-[#FFB347]/10 text-[#FFB347] border-[#FFB347]/20" };
  };

  // ✅ ADDED (Profile ledger fix) — activityRecords with any devotee-
  // dismissed rows removed (see handleDismissPendingActivity above); used
  // everywhere "All Account Activity" renders below, so a dismissed row
  // disappears from every view of it, not just "Pending & Cart Services".
  const visibleActivityRecords = activityRecords.filter((rec) => !dismissedActivityIds.has(rec.id));
  // Same records, narrowed to ones still awaiting payment — surfaced
  // prominently in "Pending & Cart Services" below, always with a
  // Complete Payment option per that section's requirement.
  const pendingActivityRecords = visibleActivityRecords.filter(
    (rec) => rec.paymentStatus === "pending_verification" || rec.paymentStatus === "failed"
  );

  // ✅ ADDED — booking-journey progress stepper for genuine Puja/Seva
  // activities, in the spirit of a delivery tracker (Amazon/Flipkart) but
  // honest to what Sri Dwar can actually confirm: only 3 stages are ever
  // marked complete, each backed directly by real stored data
  // (paymentStatus / completionStatus) — never a guess. A 4th line notes
  // the personalized completion certificate without claiming it's done,
  // since that's prepared and sent individually by the team and isn't
  // tracked in this data at all — showing a false checkmark for it would
  // be worse than not showing a stepper.
  const renderBookingStepper = (rec: ActivityRecord) => {
    if (rec.activityType !== "puja" && rec.activityType !== "seva") return null;
    const paid = rec.paymentStatus === "confirmed";
    const failed = rec.paymentStatus === "failed";
    const performed = rec.completionStatus === "completed";
    const steps = [
      { label: "Sankalpa Received", done: true },
      { label: failed ? "Payment Failed" : "Payment Confirmed", done: paid, failed },
      { label: "Puja Performed", done: performed },
    ];
    return (
      <div className="mt-3 pt-3 border-t border-white/5">
        <div className="flex items-center">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                  step.failed ? "bg-red-500/20 text-red-300 border border-red-500/40"
                  : step.done ? "bg-[#5EEAD4] text-[#021816]"
                  : "bg-white/10 text-white/40 border border-white/15"
                }`}>
                  {step.failed ? "!" : step.done ? "✓" : i + 1}
                </div>
                <span className={`text-[9px] text-center leading-tight max-w-[64px] ${step.done || step.failed ? "text-white/80 font-semibold" : "text-white/35"}`}>
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mb-4 ${steps[i + 1].done || steps[i + 1].failed ? "bg-[#5EEAD4]" : "bg-white/10"}`} />
              )}
            </div>
          ))}
        </div>
        {performed && (
          <p className="text-[10px] text-white/40 mt-2 text-center leading-relaxed">
            Your personalized completion certificate is prepared individually and sent to your email — separate from the acknowledgement certificate above.
          </p>
        )}
      </div>
    );
  };

  const handleGoogleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setAuthErrorMessage("");

    if (authFormMode === "signup" && !userNameField) {
      setAuthErrorMessage("Please specify a Devotee Name to register your Digital Gotra identity.");
      return;
    }
    if (!userEmailField || !passwordField) {
      setAuthErrorMessage("Please specify an Email and Password.");
      return;
    }
    if (authFormMode === "signup" && !isValidPassword(passwordField)) {
      setAuthErrorMessage(PASSWORD_ERROR_MESSAGE);
      return;
    }

    setIsLoggingIn(true);

    if (authFormMode === "signup") {
      // Create the account in Supabase Auth. emailRedirectTo is passed
      // explicitly (rather than relying on the project's default Site URL)
      // so the confirmation link always points at wherever this signup
      // actually happened from — website, Android app, or an in-app
      // browser — all of which resolve to the real https://sridwar.com
      // origin (see capacitor.config.ts's `server.url` note).
      const { data, error } = await supabase.auth.signUp({
        email: userEmailField,
        password: passwordField,
        options: {
          data: { name: userNameField },
          emailRedirectTo: `${window.location.origin}/?page=login`,
        },
      });

      if (error) {
        // Older Supabase projects with "Confirm email" turned OFF return
        // this as a direct error instead of the silent empty-identities
        // response handled below — guide the devotee to log in either way.
        if (/already registered|already exists|user already/i.test(error.message || "")) {
          setAuthErrorMessage(
            "An account with this email already exists. Please log in instead — use \"Forgot password?\" below if you don't remember your password."
          );
          setAuthFormMode("signin");
          setPasswordField("");
        } else {
          setAuthErrorMessage(error.message);
        }
        setIsLoggingIn(false);
        return;
      }

      // Supabase's anti-enumeration behaviour: signing up with an email
      // that's already registered AND already confirmed returns success
      // with NO error, NO session, and an EMPTY identities array — and no
      // email is actually sent for this case. Without this check, that
      // silence looked identical to a real new signup, which is exactly
      // what made it seem like "the confirmation email never arrives" —
      // no email was ever sent for that attempt on any platform.
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setIsLoggingIn(false);
        setAuthErrorMessage(
          "An account with this email already exists. Please log in instead — use \"Forgot password?\" below if you don't remember your password."
        );
        setAuthFormMode("signin");
        setPasswordField("");
        return;
      }

      // If "Confirm email" is enabled in Supabase, `data.session` is null
      // here even though the account was created — there is no logged-in
      // session yet. In that case we must NOT try to write to "profiles"
      // (Row Level Security correctly rejects an unauthenticated insert,
      // which is the 401 / 42501 error) and we must NOT treat the devotee
      // as logged in or move them past the login step.
      if (!data.session) {
        setIsLoggingIn(false);
        setSignupNeedsConfirmation(true);
        setResendConfirmationMessage("");
        setResendConfirmationError("");
        return;
      }

      // A session exists (email confirmation is off, or already confirmed),
      // so it's safe to save the devotee's profile details now.
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user!.id,
        name: userNameField,
        email: userEmailField,
        gotra: userGotra,
        rashi: userRashi,
        phone: userPhone || null,
      });
      if (profileError) {
        console.error("Could not save profile:", profileError.message);
      }
    } else {
      // Existing devotee logging in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: userEmailField,
        password: passwordField,
      });

      if (error) {
        if (/email not confirmed/i.test(error.message || "")) {
          // Existing account, correct-looking credentials, but the devotee
          // never verified their email — send them to the same "resend
          // verification" panel used right after signup, instead of a
          // dead-end error message.
          setAuthFormMode("signup");
          setSignupNeedsConfirmation(true);
          setResendConfirmationMessage("");
          setResendConfirmationError("");
          setIsLoggingIn(false);
          return;
        }
        setAuthErrorMessage(error.message);
        setIsLoggingIn(false);
        return;
      }

      // Make sure their profile row exists — it may not, if it couldn't be
      // created at signup time because email confirmation was still
      // pending. We now have a real session, so this insert is allowed.
      // We only INSERT (never overwrite): the sign-in form doesn't show
      // the name/gotra/rashi fields, so blindly upserting here would
      // silently blank out or reset an existing devotee's saved details
      // on every ordinary login.
      if (data.user) {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", data.user.id)
          .maybeSingle();

        if (!existingProfile) {
          const { error: profileError } = await supabase.from("profiles").insert({
            id: data.user.id,
            name: data.user.user_metadata?.name || userEmailField,
            email: userEmailField,
            gotra: userGotra,
            rashi: userRashi,
            phone: userPhone || null,
          });
          if (profileError) {
            console.error("Could not save profile:", profileError.message);
          }
        }
      }
    }

    setPendingLogin({ name: userNameField, email: userEmailField });
    setIsLoggingIn(false);
    setAuthStep("contribute");
    gaRegistrationSubmit("devotee_registration");
  };

  // Resend a fresh confirmation link — the safety net so a devotee is never
  // permanently blocked out of their Dharmic ID over one email that didn't
  // arrive, on any platform. A short client-side cooldown (not a hard
  // block) keeps a devotee from accidentally hitting Supabase's own email
  // rate limit by tapping the button repeatedly.
  const handleResendConfirmation = async () => {
    if (!userEmailField || isResendingConfirmation || resendCooldownActive) return;
    setIsResendingConfirmation(true);
    setResendConfirmationError("");
    setResendConfirmationMessage("");

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: userEmailField,
      options: { emailRedirectTo: `${window.location.origin}/?page=login` },
    });

    setIsResendingConfirmation(false);

    if (error) {
      setResendConfirmationError(
        /rate limit|only request this|too many/i.test(error.message || "")
          ? "Please wait a minute before requesting another confirmation email."
          : error.message
      );
      return;
    }

    setResendConfirmationMessage(
      `A fresh confirmation link has been sent to ${userEmailField}. Please check your inbox (and spam/junk folder).`
    );
    setResendCooldownActive(true);
    setTimeout(() => setResendCooldownActive(false), 30000);
  };

  // Self-service account deletion — permanently removes this devotee's
  // Dharmic ID account and associated personal data (profile, family
  // members, activity ledger, form submissions) and signs them out.
  // Requires typing DELETE to confirm, and a valid, current login session
  // (the backend verifies the devotee's own Supabase access token before
  // deleting anything, so no one can delete another devotee's account).
  const handleDeleteAccount = async () => {
    setDeleteAccountError("");

    if (deleteAccountConfirmText.trim() !== "Delete") {
      setDeleteAccountError('Please type "Delete" exactly (capital D) in the box to confirm.');
      return;
    }

    setIsDeletingAccount(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (sessionError || !accessToken) {
        setDeleteAccountError("Your session has expired. Please log out, log back in, and try again.");
        setIsDeletingAccount(false);
        return;
      }

      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setDeleteAccountError(
          result?.error ||
            "We couldn't delete your account right now. Please try again, or email puja@sridwar.com and we'll complete it for you within 30 days."
        );
        setIsDeletingAccount(false);
        return;
      }

      // Account and data are gone server-side — clear the local session too.
      await supabase.auth.signOut();
      setIsDeletingAccount(false);
      setDeleteAccountSuccess(true);
      setShowDeleteAccountConfirm(false);
      setDeleteAccountConfirmText("");

      // Give the devotee a moment to see the confirmation, then return them
      // to a logged-out state.
      setTimeout(() => {
        setDeleteAccountSuccess(false);
        onLogout();
      }, 2500);
    } catch (e) {
      // ✅ FIX (2026-08-29): this catch block only fires when fetch() itself
      // throws — i.e. the request never got a response at all (server
      // unreachable, DNS/network failure, or a CORS rejection). It is NOT
      // the same as the server responding with an error (that's the
      // `!response.ok` branch above, which already shows the server's own
      // message). Previously this swallowed the real error completely,
      // making "Something went wrong" impossible to debug from a bug
      // report alone. Logging it now means the actual cause (e.g.
      // "Failed to fetch" if /api/account/delete isn't reachable at all —
      // check that the site is being served by the same Express server
      // that defines this route, not a static host with no backend) shows
      // up in the browser console/DevTools next time this happens.
      console.error("Account deletion request failed (network/fetch level):", e);
      setDeleteAccountError(
        "Something went wrong deleting your account. Please try again, or email puja@sridwar.com and we'll complete it for you within 30 days."
      );
      setIsDeletingAccount(false);
    }
  };

  // Step 7 — Skip Contribution: go directly to Dharmic Portal
  const handleSkipContribution = () => {
    if (pendingLogin) {
      gaLogin("email");
      onLoginSuccess(pendingLogin.name, pendingLogin.email);
      setPendingLogin(null);
    }
  };

  // Step 2 — Contribute clicked: validate amount then show Puja Sankalpa Portal
  const handleProceedToContributionPayment = () => {
    if (!contributionAmount || contributionAmount <= 0) return;
    gaDonationInitiate(contributionAmount);
    setContributionRefId("SDC-" + randomRefSuffix());
    setShowSankalpaForm(true);
  };

  // Step 4 — Sankalpa form submitted: sync to Google Form (Pending row) then open payment
  const handleSankalpaSubmit = (e: FormEvent) => {
    e.preventDefault();
    const resolvedName = (sankalpaName || pendingLogin?.name || userProfile.name || "").trim();
    if (!resolvedName) {
      alert("Please enter your name to proceed.");
      return;
    }
    if (!sankalpaPhone.trim()) {
      alert("Please enter your WhatsApp number to proceed.");
      return;
    }

    const templeName = selectedTempleId
      ? TEMPLES_LIST.find((t) => t.id === selectedTempleId)?.name || "Selected Temple"
      : customMandapName || "Custom Mandap";

    // Sync Puja Sankalpa data to Google Forms (seva_booking form) — ONE row,
    // recorded as "Pending" since payment hasn't been confirmed yet. The
    // corrected Final row (with real payment method) is sent from
    // finalizeContribution below, sharing the same Ref ID.
    syncToGoogleForm("seva_booking", {
      name:         resolvedName,
      email:        pendingLogin?.email || userProfile.email || "",
      phone:        sankalpaPhone.trim(),
      gotra:        sankalpaGotra || userGotra || undefined,
      intent:       sankalpaIntent || undefined,
      type:         `Temple Redevelopment Divine Contribution — ${templeName}`,
      details:      `Contribution: ₹${contributionAmount} | Payment Status: Pending — Awaiting Confirmation | Temple: ${templeName} | Gotra: ${sankalpaGotra || userGotra || "Not provided"} | Intent: ${sankalpaIntent || "General blessings"} | Ref: ${contributionRefId}`,
      fee:          contributionAmount,
      temple:       templeName,
      whatsapp:     sankalpaPhone.trim(),
      city:         customMandapAddress || "Online Devotee",
    });

    setShowSankalpaForm(false);
    setIsContributionPaymentOpen(true);
  };

  // Step 6 — After payment intent submitted (NOT yet verified): send the
  // ONE Final row (same Ref ID), with payment status corrected to
  // "Payment Submitted — Pending Verification" and the real method (UPI or
  // WhatsApp Pay) + amount — then redirect to the Dharmic Portal. Only
  // becomes "Paid — Confirmed" once the admin/reconciliation side actually
  // verifies the payment.
  const finalizeContribution = (details: { amount: number; method: "UPI" | "WhatsApp Pay" }) => {
    setIsContributionPaymentOpen(false);
    const templeName = selectedTempleId
      ? TEMPLES_LIST.find((t) => t.id === selectedTempleId)?.name || "Selected Temple"
      : customMandapName || "Custom Mandap";
    syncToGoogleForm("seva_booking", {
      name:         (sankalpaName || pendingLogin?.name || userProfile.name || "").trim(),
      email:        pendingLogin?.email || userProfile.email || "",
      phone:        sankalpaPhone.trim(),
      gotra:        sankalpaGotra || userGotra || undefined,
      intent:       sankalpaIntent || undefined,
      type:         `Temple Redevelopment Divine Contribution — ${templeName}`,
      details:      `Contribution: ₹${details.amount} | Payment Status: Payment Submitted — Pending Verification | Payment Method: ${details.method} | Temple: ${templeName} | Gotra: ${sankalpaGotra || userGotra || "Not provided"} | Intent: ${sankalpaIntent || "General blessings"} | Ref: ${contributionRefId}`,
      fee:          details.amount,
      temple:       templeName,
      whatsapp:     sankalpaPhone.trim(),
      city:         customMandapAddress || "Online Devotee",
    });
    // Record into the Supabase activity ledger so this divine contribution shows
    // up on the Profile page — this was previously the biggest silent gap
    // (divine contributions never appeared anywhere once the Google Form fired).
    recordActivity({
      activityType: "contribution",
      itemName: `Temple Redevelopment Divine Contribution — ${templeName}`,
      amount: details.amount,
      refId: contributionRefId,
      paymentMethod: details.method,
      paymentStatus: "pending_verification",
    });
    if (pendingLogin) {
      // First-time Dharmic ID generation flow — proceed into the app.
      gaLogin("email_with_contribution");
      onLoginSuccess(pendingLogin.name, pendingLogin.email);
      setPendingLogin(null);
    } else if (isLoggedIn) {
      // Already-logged-in devotee contributing again from their Profile
      // page — stay put, just refresh the ledger and show a confirmation
      // instead of re-running the login flow.
      gaDonationInitiate(details.amount);
      setShowPostLoginContribute(false);
      setSelectedTempleId("");
      setCustomMandapName("");
      setCustomMandapAddress("");
      setContributionAmount(0);
      setPostLoginContributionSuccess(true);
      setTimeout(() => setPostLoginContributionSuccess(false), 6000);
      Promise.all([fetchActivities(), fetchFormSubmissions()]).then(([activities, submissions]) => {
        setActivityRecords(activities);
        setFormSubmissions(submissions);
      });
    }
  };

  // Note: previously this dashboard showed a hardcoded "simulatedHistory"
  // list of completed pujas to every devotee regardless of whether they had
  // actually booked anything — i.e. fabricated personal account history.
  // That has been removed; the dashboard now only shows a devotee's real
  // bookedItems (from this browser session) and an honest empty state.

  return (
    <section
      id="auth-dashboard-section"
      className="py-24 bg-[#021816] text-left text-white"
      style={{
        paddingTop: `calc(var(--safe-area-inset-top, env(safe-area-inset-top, 24px)) + 96px)`,
        paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + 6rem)`,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Conditional Layout based on Logon Status.
            isPasswordRecoveryMode is included here deliberately: verifyOtp()
            for a recovery token creates a real Supabase session, which flips
            isLoggedIn to true via the onAuthStateChange listener in App.tsx.
            Without this override, a devotee who already has a cached/active
            session (the common case) would be sent straight to their Profile
            Dashboard instead of the "set new password" form — which has no
            password-reset option of its own. Recovery mode must win over an
            existing session until the new password is saved. */}
        {(!isLoggedIn || isPasswordRecoveryMode) ? (
          
          /* LOGIN PANEL FORM OVERLAY */
          <div className="max-w-md mx-auto bg-[#092320] rounded-3xl border border-white/10 p-6 sm:p-8 shadow-xl" id="google-login-panel">
            <div className="text-center space-y-3 mb-6">
              <div className="flex justify-center mb-1">
                <SriDwarLogo variant="colored" iconSize="lg" showTagline={false} className="mx-auto flex justify-center" />
              </div>
              <h3 className="font-serif text-2xl font-bold tracking-tight text-white animate-fadeIn">Access My Dharmic ID</h3>
              <p className="text-xs text-white/70 max-w-sm mx-auto">
                Securely generate your permanent digital Gotras identification for Shradhalu Private Limited’s national devalaya network.
              </p>
            </div>

            {authStep === "login" && isPasswordRecoveryMode && (
              <form onSubmit={handleSaveNewPassword} className="space-y-4 animate-fadeIn">
                <div className="flex items-start space-x-2 bg-[#5EEAD4]/8 border border-[#5EEAD4]/20 text-[#5EEAD4] text-xs rounded-xl px-3 py-3 text-left">
                  <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Choose a new password for your Dharmic ID.</span>
                </div>
                {newPasswordError && (
                  <div className="flex items-start space-x-2 bg-red-950/40 border border-red-500/30 text-red-300 text-xs rounded-xl px-3 py-2.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{newPasswordError}</span>
                  </div>
                )}
                {newPasswordSuccess ? (
                  <div className="flex items-start space-x-2 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl px-3 py-3 text-left">
                    <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Password updated! Returning you to Sri Dwar...</span>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-white/80 mb-1">New Password *</label>
                      <div className="relative">
                        <input
                          type="password"
                          required
                          minLength={8}
                          maxLength={14}
                          placeholder="8–14 characters (A-Z, a-z, 0-9)"
                          value={newPasswordField}
                          onChange={(e) => setNewPasswordField(e.target.value)}
                          className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white font-semibold placeholder-white/30 text-left"
                        />
                        <Lock className="absolute left-3.5 top-3 w-4 h-4 text-white/40" />
                      </div>
                      <p className="mt-1.5 text-[12px] text-white/40">{PASSWORD_ERROR_MESSAGE}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/80 mb-1">Confirm New Password *</label>
                      <div className="relative">
                        <input
                          type="password"
                          required
                          minLength={8}
                          maxLength={14}
                          placeholder="Re-enter new password"
                          value={confirmNewPasswordField}
                          onChange={(e) => setConfirmNewPasswordField(e.target.value)}
                          className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white font-semibold placeholder-white/30 text-left"
                        />
                        <Lock className="absolute left-3.5 top-3 w-4 h-4 text-white/40" />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isSavingNewPassword}
                      className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-bold py-3 rounded-xl text-xs transition-colors shadow flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      {isSavingNewPassword ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-[#021816]" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span className="tracking-wider">SAVE NEW PASSWORD</span>
                      )}
                    </button>
                  </>
                )}
              </form>
            )}

            {authStep === "login" && !isPasswordRecoveryMode && showForgotPassword && (
              <form onSubmit={handleSendResetEmail} className="space-y-4 animate-fadeIn">
                {resetEmailSent ? (
                  <div className="space-y-4 text-center">
                    <div className="flex items-start space-x-2 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl px-3 py-3 text-left">
                      <Mail className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        If an account exists for <strong>{forgotPasswordEmail}</strong>, a password reset link has
                        been sent. Check your inbox (and spam folder), then follow the link to set a new password.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setShowForgotPassword(false); setResetEmailSent(false); setForgotPasswordEmail(""); }}
                      className="w-full bg-[#5EEAD4] hover:bg-[#14B8A6] text-[#021816] font-bold py-3 rounded-xl text-xs transition-colors shadow cursor-pointer"
                    >
                      BACK TO LOG IN
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-white/70">Enter the email on your Dharmic ID and we'll send you a link to reset your password.</p>
                    {forgotPasswordError && (
                      <div className="flex items-start space-x-2 bg-red-950/40 border border-red-500/30 text-red-300 text-xs rounded-xl px-3 py-2.5">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{forgotPasswordError}</span>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-white/80 mb-1">Email Address *</label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          placeholder="e.g. kunu@shradhalu.com"
                          value={forgotPasswordEmail}
                          onChange={(e) => setForgotPasswordEmail(e.target.value)}
                          className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white font-semibold placeholder-white/30 text-left"
                        />
                        <Mail className="absolute left-3.5 top-3 w-4 h-4 text-white/40" />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isSendingResetEmail}
                      className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-bold py-3 rounded-xl text-xs transition-colors shadow flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      {isSendingResetEmail ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-[#021816]" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <span className="tracking-wider">SEND RESET LINK</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowForgotPassword(false); setForgotPasswordError(""); }}
                      className="w-full text-center text-[12px] text-white/50 hover:text-white/80 underline cursor-pointer"
                    >
                      Back to log in
                    </button>
                  </>
                )}
              </form>
            )}

            {authStep === "login" && !isPasswordRecoveryMode && !showForgotPassword && signupNeedsConfirmation && (
              <div className="space-y-4 text-center animate-fadeIn">
                <div className="flex items-start space-x-2 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl px-3 py-3 text-left">
                  <Mail className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    We've sent a confirmation link to <strong>{userEmailField}</strong>. Please check your inbox
                    (and spam/junk folder) and verify your email, then log in below to continue.
                  </span>
                </div>

                {resendConfirmationMessage && (
                  <div className="flex items-start space-x-2 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl px-3 py-2.5 text-left">
                    <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{resendConfirmationMessage}</span>
                  </div>
                )}
                {resendConfirmationError && (
                  <div className="flex items-start space-x-2 bg-red-950/40 border border-red-500/30 text-red-300 text-xs rounded-xl px-3 py-2.5 text-left">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{resendConfirmationError}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={isResendingConfirmation || resendCooldownActive}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isResendingConfirmation ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span className="tracking-wider">RESEND VERIFICATION EMAIL</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setAuthFormMode("signin"); setSignupNeedsConfirmation(false); }}
                  className="w-full bg-[#5EEAD4] hover:bg-[#14B8A6] text-[#021816] font-bold py-3 rounded-xl text-xs transition-colors shadow cursor-pointer"
                >
                  GO TO LOG IN
                </button>
              </div>
            )}

            {authStep === "login" && !isPasswordRecoveryMode && !showForgotPassword && !signupNeedsConfirmation && (
            <form onSubmit={handleGoogleLogin} className="space-y-4">

              {/* Sign Up / Log In toggle */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  id="auth-mode-signup-tab"
                  onClick={() => { setAuthFormMode("signup"); setAuthErrorMessage(""); setSignupNeedsConfirmation(false); }}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wide transition-all cursor-pointer ${
                    authFormMode === "signup"
                      ? "bg-[#5EEAD4] border-[#5EEAD4] text-[#021816]"
                      : "bg-[#021816] border-white/10 text-white/60 hover:text-white/80"
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Signup</span>
                </button>
                <button
                  type="button"
                  id="auth-mode-signin-tab"
                  onClick={() => { setAuthFormMode("signin"); setAuthErrorMessage(""); setSignupNeedsConfirmation(false); }}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wide transition-all cursor-pointer ${
                    authFormMode === "signin"
                      ? "bg-[#5EEAD4] border-[#5EEAD4] text-[#021816]"
                      : "bg-[#021816] border-white/10 text-white/60 hover:text-white/80"
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login</span>
                </button>
              </div>

              {authErrorMessage && (
                <div className="flex items-start space-x-2 bg-red-950/40 border border-red-500/30 text-red-300 text-xs rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{authErrorMessage}</span>
                </div>
              )}

              {/* Devotee Name — only needed when creating a new account */}
              {authFormMode === "signup" && (
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">Devotee Full Name *</label>
                <div className="relative">
                  <input
                    id="login-field-name"
                    type="text"
                    required
                    placeholder="e.g. Kunu Rana"
                    value={userNameField}
                    onChange={(e) => setUserNameField(e.target.value)}
                    className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white font-semibold placeholder-white/30 text-left"
                  />
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-white/40" />
                </div>
              </div>
              )}

              {/* Devotee Email */}
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">Email Address *</label>
                <div className="relative">
                  <input
                    id="login-field-email"
                    type="email"
                    required
                    placeholder="e.g. kunu@shradhalu.com"
                    value={userEmailField}
                    onChange={(e) => setUserEmailField(e.target.value)}
                    className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white font-semibold placeholder-white/30 text-left"
                  />
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-white/40" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">Password *</label>
                <div className="relative">
                  <input
                    id="login-field-password"
                    type="password"
                    required
                    minLength={authFormMode === "signup" ? 8 : undefined}
                    maxLength={authFormMode === "signup" ? 14 : undefined}
                    placeholder={authFormMode === "signup" ? "8–14 characters (A-Z, a-z, 0-9)" : "Enter your password"}
                    value={passwordField}
                    onChange={(e) => setPasswordField(e.target.value)}
                    className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white font-semibold placeholder-white/30 text-left"
                  />
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-white/40" />
                </div>
                {authFormMode === "signup" && (
                  <p className="mt-1.5 text-[12px] text-white/40">{PASSWORD_ERROR_MESSAGE}</p>
                )}
                {authFormMode === "signin" && (
                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(true); setAuthErrorMessage(""); setForgotPasswordEmail(userEmailField); }}
                    className="mt-1.5 text-[12px] text-[#5EEAD4] hover:text-[#14B8A6] underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              {/* Gotra / Rashi — collected once, up front, at account
                  creation, so the Dharmic ID card is complete from the
                  moment it's generated. These bind to the same
                  userGotra/userRashi state "My Sacred Profile" already
                  edits later, so nothing is duplicated — a devotee can
                  still correct either value any time from their Profile
                  page. */}
              {authFormMode === "signup" && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-white/80 mb-1">Gotra / Lineage</label>
                    <input
                      id="login-field-gotra"
                      type="text"
                      placeholder="e.g. Vatsasa Gotra"
                      value={userGotra}
                      onChange={(e) => setUserGotra(e.target.value)}
                      className="w-full text-xs px-4 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white font-semibold placeholder-white/30 text-left"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/80 mb-1">Rashi / Moon Sign</label>
                    <select
                      id="login-field-rashi"
                      value={userRashi}
                      onChange={(e) => setUserRashi(e.target.value)}
                      className="w-full text-xs px-4 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-[#5EEAD4] font-semibold"
                    >
                      <option value="Mesh (Aries)">Mesh (Aries)</option>
                      <option value="Vrishabh (Taurus)">Vrishabh (Taurus)</option>
                      <option value="Mithun (Gemini)">Mithun (Gemini)</option>
                      <option value="Kark (Cancer)">Kark (Cancer)</option>
                      <option value="Simha (Leo)">Simha (Leo)</option>
                      <option value="Kanya (Virgo)">Kanya (Virgo)</option>
                      <option value="Tula (Libra)">Tula (Libra)</option>
                      <option value="Vrishchik (Scorpio)">Vrishchik (Scorpio)</option>
                      <option value="Dhanu (Sagittarius)">Dhanu (Sagittarius)</option>
                      <option value="Makar (Capricorn)">Makar (Capricorn)</option>
                      <option value="Kumbh (Aquarius)">Kumbh (Aquarius)</option>
                      <option value="Meen (Pisces)">Meen (Pisces)</option>
                    </select>
                  </div>
                </>
              )}

              {/* Plain registration submit button — no Google branding or
                  colors, since this form does not use real Google Sign-In/
                  OAuth. Using Google's brand color and a bare "G" here would
                  visually impersonate "Sign in with Google" while actually
                  being an ordinary name/email form, which is both a brand
                  misuse and a deceptive-functionality risk. */}
              <button
                id="devotee-register-trigger"
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-bold py-3 rounded-xl text-xs transition-colors shadow flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isLoggingIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#021816]" />
                    <span>Connecting to Sri Dwar...</span>
                  </>
                ) : (
                  <>
                    <span className="tracking-wider">
                      {authFormMode === "signup" ? "GENERATE DIGITAL DHARMIC ID" : "LOG IN TO MY DHARMIC ID"}
                    </span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center space-x-1.5 text-[12px] font-mono text-[#5EEAD4] bg-white/5 py-1.5 rounded-lg border border-white/10">
                <ShieldCheck className="w-3.5 h-3.5 text-[#5EEAD4]" />
                <span>Powered by Sri Dwar Technology</span>
              </div>
            </form>
            )}

            {authStep === "contribute" && (
              <div className="space-y-4 animate-fadeIn text-left">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30 mb-2">
                    <Award className="w-6 h-6 text-[#5EEAD4]" />
                  </div>
                  <h4 className="font-serif text-lg font-bold text-[#5EEAD4]">Your Dharmic ID is Ready!</h4>
                  <p className="text-xs text-white/60">
                    Before entering your dashboard, would you like to make a heartfelt contribution towards temple redevelopment? With gratitude, your divine contribution helps care for our heritage and our temples — especially the smaller ones that quietly serve with limited resources or visibility.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1">Choose a temple from our network</label>
                  <select
                    id="contribute-temple-select"
                    value={selectedTempleId}
                    onChange={(e) => {
                      setSelectedTempleId(e.target.value);
                      if (e.target.value) {
                        setCustomMandapName("");
                        setCustomMandapAddress("");
                      }
                    }}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-[#5EEAD4] font-medium focus:outline-none focus:border-[#5EEAD4]"
                  >
                    <option value="">-- Select a temple --</option>
                    {TEMPLES_LIST.map((temple) => (
                      <option key={temple.id} value={temple.id}>{temple.name}</option>
                    ))}
                  </select>
                </div>

                <div className="sanskrit-divider text-[12px]">or</div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-white/80 mb-1">Mention your own preferred Puja Mandap</label>
                  <input
                    id="contribute-custom-mandap-name"
                    type="text"
                    placeholder="Mandap / Temple name"
                    value={customMandapName}
                    onChange={(e) => {
                      setCustomMandapName(e.target.value);
                      if (e.target.value) setSelectedTempleId("");
                    }}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-white placeholder-white/30 focus:outline-none focus:border-[#5EEAD4]"
                  />
                  <input
                    id="contribute-custom-mandap-address"
                    type="text"
                    placeholder="Mandap address / city"
                    value={customMandapAddress}
                    onChange={(e) => setCustomMandapAddress(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-white placeholder-white/30 focus:outline-none focus:border-[#5EEAD4]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1">Divine Contribution Amount (₹)</label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {[51, 101, 251].map((amt) => (
                      <button
                        key={amt}
                        id={`contribute-amount-tier-${amt}`}
                        type="button"
                        onClick={() => setContributionAmount(amt)}
                        className={`text-xs py-2 rounded-xl border font-bold transition-all ${
                          contributionAmount === amt
                            ? "bg-white/10 border-[#5EEAD4] text-[#5EEAD4] shadow-sm"
                            : "bg-black/20 border-white/10 text-white/70 hover:bg-black/30"
                        }`}
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                  <input
                    id="contribute-custom-amount"
                    type="number"
                    min={1}
                    placeholder="Or enter a custom amount"
                    value={contributionAmount || ""}
                    onChange={(e) => setContributionAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-white placeholder-white/30 focus:outline-none focus:border-[#5EEAD4]"
                  />
                </div>

                <div className="flex items-start space-x-2 text-[12px] font-mono text-[#5EEAD4] bg-white/5 px-3 py-2 rounded-lg border border-white/10">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Once a puja is performed in your name for this contribution, we will lovingly share photographs — and where possible, a short video — of that moment with you, within 3 working days.</span>
                </div>

                <StoneEngravingNote variant="compact" showRepeatNote className="text-left" />

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    id="contribute-skip-btn"
                    type="button"
                    onClick={handleSkipContribution}
                    className="bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl text-xs border border-white/10 transition-all cursor-pointer"
                  >
                    Skip for Now
                  </button>
                  <button
                    id="contribute-proceed-btn"
                    type="button"
                    onClick={handleProceedToContributionPayment}
                    disabled={!contributionAmount || contributionAmount <= 0}
                    className="bg-[#FFB347] hover:bg-[#F27D26] disabled:bg-white/10 disabled:text-white/30 text-[#021816] font-extrabold py-3 rounded-xl text-xs uppercase tracking-wide transition-all cursor-pointer"
                  >
                    Contribute ₹{contributionAmount || 0}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          
          /* ACTIVE DEVOTEE WORKSPACE WITH FLOATING VIRTUAL ID CARD */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fadeIn text-white">
            
            {/* Left Box: Professional Dharmic ID Card + Transactions Ledger (cols 5) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="w-full max-w-md flex items-center justify-between mb-4">
                <h3 className="font-serif text-xl font-bold text-white text-center">My Dharmic ID</h3>
                <button
                  type="button"
                  id="dharmic-id-edit-btn"
                  onClick={() => document.getElementById("my-sacred-profile-card")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#5EEAD4] hover:text-[#7FF4DE] uppercase tracking-wide cursor-pointer"
                  title="Edit your Dharmic ID details"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>

              {/* PROFESSIONAL DHARMIC ID CARD — corporate-ID-inspired layout on the Dharmic_ID.jpg backdrop */}
              <div 
                id="digital-dharmic-id-card"
                className="relative w-full max-w-md text-white p-5 sm:p-6 rounded-3xl shadow-2xl overflow-hidden border-2 border-[#FFB347]/50 transform hover:-translate-y-2 hover:rotate-1 transition-all duration-300"
              >
                {/* Photo backdrop with a real webp/jpg fallback pair, sitting behind the gradient + content */}
                <OptimizedImage
                  src={dharmicIdBg}
                  webpSrc={dharmicIdBgWebp}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `linear-gradient(135deg, rgba(9,35,32,0.55), rgba(2,24,22,0.6) 55%, rgba(4,47,42,0.5))`,
                  }}
                />
                {/* Mandala Background Watermarks — unchanged, kept visible over the new backdrop */}
                <div className="absolute top-2 right-2 text-9xl text-white/10 font-serif pointer-events-none select-none">
                  ॐ
                </div>
                <div className="absolute -left-10 -bottom-10 text-9xl text-[#FFB347]/10 font-sans pointer-events-none select-none">
                  श्री
                </div>

                {/* Card Header — brand logo centered at top, like a corporate ID crest */}
                <div className="relative flex flex-col items-center border-b border-white/10 pb-2 mb-2.5">
                  <SriDwarLogo variant="colored" iconSize="sm" className="mx-auto justify-center" showTagline={false} />
                  <span className="mt-1.5 text-[11px] font-bold tracking-[0.2em] uppercase text-[#FFB347]/80">
                    Dharmic Identity Card
                  </span>
                </div>

                {/* Shradhalu Name */}
                <div className="relative mb-3 text-left">
                  <span className="text-[11px] text-white/60 block uppercase">Shradhalu Name</span>
                  <span className="font-serif font-black text-base text-[#FFB347] truncate block">{userProfile.name}</span>
                </div>

                {/* Card Main Info layout */}
                <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2.5 text-xs font-mono mb-2.5 text-left">
                  <div>
                    <span className="text-[11px] text-white/60 block uppercase">Dharmic ID</span>
                    <span className="font-bold block">SDM-23491-IN2</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-white/60 block uppercase">Membership Tier</span>
                    <span className="font-bold text-white block truncate">Lifetime Shradhalu</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-white/60 block uppercase">Gotra / Lineage</span>
                    <span className="font-bold text-white block truncate">{userGotra}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-white/60 block uppercase">Sign / Rashi</span>
                    <span className="font-bold block truncate">{userRashi}</span>
                  </div>
                </div>

                {/* Card footer Bar — with real Sri Dwar QR code for verification */}
                <div className="relative flex items-center gap-2.5 text-[10px] font-mono bg-[#021816]/60 p-2 rounded-xl mt-2.5">
                  <div className="flex-1 flex flex-col gap-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span>Registered: {formatDharmicIdDate(accountCreatedAt)}</span>
                      <span>
                        Valid Till:{" "}
                        {accountCreatedAt
                          ? formatDharmicIdDate(nthMondayFrom(new Date(accountCreatedAt), SHIVA_MONDAY_VALIDITY_COUNT).toISOString())
                          : "—"}
                      </span>
                    </div>
                    <div className="flex justify-center items-center text-emerald-350 pt-1 border-t border-white/5">
                      <ShieldCheck className="w-3 h-3 text-emerald-400 mr-1" />
                      <span>Secured by Sridwar Technology</span>
                    </div>
                  </div>
                  <OptimizedImage
                    src={sridwarQR}
                    webpSrc={sridwarQRWebp}
                    alt="Sri Dwar verification QR code"
                    loading="lazy"
                    width={48}
                    height={48}
                    className="shrink-0 w-12 h-12 rounded-md object-cover border border-white/10"
                  />
                </div>
              </div>

              {/* Download Dharmic ID as a JPG — captures #digital-dharmic-id-card
                  exactly as shown, using html2canvas-pro (see package.json). */}
              <div className="w-full max-w-md mt-3">
                {dharmicIdDownloadError && (
                  <div className="mb-2 flex items-start space-x-2 bg-red-950/40 border border-red-500/30 text-red-300 text-[11px] rounded-xl px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{dharmicIdDownloadError}</span>
                  </div>
                )}
                <button
                  type="button"
                  id="dharmic-id-download-btn"
                  onClick={() => handleDownloadDharmicId()}
                  disabled={isDownloadingDharmicId}
                  className="w-full flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/15 text-[#5EEAD4] font-bold py-2.5 rounded-xl text-[11px] uppercase tracking-wide transition-all cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isDownloadingDharmicId ? "Preparing..." : "Download Your ID"}</span>
                </button>
                <button
                  type="button"
                  id="dharmic-id-share-btn"
                  onClick={() => handleShareDharmicId()}
                  disabled={isSharingDharmicId}
                  className="w-full mt-2 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/15 text-[#5EEAD4] font-bold py-2.5 rounded-xl text-[11px] uppercase tracking-wide transition-all cursor-pointer disabled:opacity-50"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{isSharingDharmicId ? "Preparing..." : "Share Your ID"}</span>
                </button>
              </div>

              {/* ✅ ADDED (Profile ledger fix) — PENDING & CART SERVICES:
                  every activity still awaiting payment (pending_verification
                  or failed), surfaced together in one place so a devotee
                  never has to hunt through the full ledger below to find
                  something they still owe on. Always shows Complete Payment
                  + Delete for every row here — that's the whole point of
                  this section, so unlike the ledgers below it's never
                  paginated/collapsed. Renders nothing when there's nothing
                  pending, same as "My Requests & Submissions" further down. */}
              {pendingActivityRecords.length > 0 && (
                <div className="w-full max-w-md mt-6 text-left" id="pending-cart-services">
                  <h3 className="font-serif text-lg font-bold text-white border-b border-white/10 pb-2 mb-4">
                    Pending & Cart Services
                  </h3>
                  <div className="space-y-3">
                    {pendingActivityRecords.map((rec) => {
                      const badge = paymentStatusBadge(rec.paymentStatus);
                      return (
                        <div
                          key={rec.id}
                          id={`pending-cart-${rec.id}`}
                          className="bg-[#092320] border border-[#FFB347]/25 p-4 rounded-2xl shadow-sm text-left"
                        >
                          <span className="text-[11px] text-[#5EEAD4] font-mono uppercase tracking-wider block mb-1">
                            {ACTIVITY_TYPE_LABELS[rec.activityType] || "Offering"}
                          </span>
                          <h4 className="font-serif text-sm font-bold text-white pr-4">{rec.itemName}</h4>
                          <span className="text-[12px] text-white/50 font-mono font-medium block">
                            Ref: {rec.refId}
                          </span>
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5 text-xs">
                            <span className="font-bold text-[#FFB347]">₹{rec.amount}</span>
                            <span className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-bold uppercase border ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-white/5">
                            <button
                              type="button"
                              onClick={() => handleOpenRetryPayment(rec)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#FFB347]/15 hover:bg-[#FFB347]/25 border border-[#FFB347]/40 text-[#FFB347] rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Complete Payment
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDismissPendingActivity(rec)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-white/5 hover:bg-red-950/30 border border-white/15 hover:border-red-500/30 text-white/50 hover:text-red-300 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* MY SPIRITUAL TRANSACTIONS LEDGER — moved directly below the ID card */}
              <div className="w-full max-w-md mt-6 text-left">
                <h3 className="font-serif text-lg font-bold text-white border-b border-white/10 pb-2 mb-4">
                  My Spiritual Transactions Ledger
                </h3>

                {/* Dynamic booked seva list from wizard success */}
                <div className="space-y-4">
                  {bookedItems.length > 0 ? (
                    <div>
                      <span className="text-xs font-bold text-[#5EEAD4] uppercase tracking-wider font-mono block mb-2 text-left">Booked Ceremonies</span>

                      {/* Latest 6, as a swipeable carousel on mobile/app
                          (desktop: 2-col grid, via MobileCarousel's default) */}
                      <MobileCarousel
                        items={bookedItems.slice(0, LEDGER_CAROUSEL_COUNT)}
                        getKey={(item, idx) => `booked-carousel-${idx}`}
                        desktopGridClassName="lg:grid-cols-2"
                        cardWidthClassName="w-[clamp(210px,62vw,360px)]"
                        renderItem={(item, idx) => {
                          const PujaIcon = getPujaIcon(item.pujaName);
                          const shortTitle = getShortTitle(item.pujaName);
                          const hasMore = shortTitle !== item.pujaName;
                          const itemKey = `carousel-${idx}`;
                          const isExpanded = expandedBookedItems.has(itemKey);
                          return (
                          <div
                            id={`booked-item-ledg-${idx}`}
                            className="h-full flex flex-col bg-[#092320] border border-white/10 p-4 rounded-2xl shadow-sm text-left overflow-hidden"
                          >
                            <div className="flex items-start gap-3">
                              <div className="shrink-0 w-9 h-9 rounded-full bg-[#5EEAD4]/10 border border-[#5EEAD4]/20 flex items-center justify-center">
                                <PujaIcon className="w-4.5 h-4.5 text-[#5EEAD4]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-serif text-sm font-bold text-white">{shortTitle}</h4>
                                {hasMore && (
                                  <button
                                    type="button"
                                    onClick={() => toggleBookedItemExpanded(itemKey)}
                                    className="text-[10px] font-bold text-[#5EEAD4]/70 hover:text-[#5EEAD4] uppercase tracking-wide mt-0.5 cursor-pointer"
                                  >
                                    {isExpanded ? "Show less ▲" : "Details ▼"}
                                  </button>
                                )}
                                {hasMore && isExpanded && (
                                  <p className="text-[11px] text-white/60 mt-1.5 leading-snug">{item.pujaName}</p>
                                )}
                              </div>
                            </div>
                            <span className="text-[12px] text-white/50 font-mono font-medium block mt-2">Reference Key: {item.refId} | Date: {item.date}</span>
                            {/* ✅ CARD-HEIGHT FIX: this card's own box (bg/border/rounded)
                                previously had no h-full, so even though MobileCarousel's
                                wrapper stretched to the tallest sibling, this visible box
                                still only grew to its own content height — leaving shorter
                                cards visibly shorter than a card with "Details" expanded.
                                h-full + flex-col on the root, plus mt-auto here (replacing
                                the old fixed mt-3) instead of a fixed top margin, lets any
                                leftover stretched space collect above this footer so every
                                card's footer lands at the same bottom edge — matching the
                                same anchor-to-bottom pattern already used elsewhere in this
                                codebase (see ReferralPlans.tsx's "Explore" button). */}
                            <div className="flex justify-between items-center mt-auto pt-3 border-t border-white/5 text-xs">
                              <span className="font-bold text-[#FFB347]">Paid: ₹{item.price}</span>
                              <span className="bg-[#FFB347]/10 text-[#FFB347] border border-[#FFB347]/20 px-2 py-0.5 rounded-full font-mono text-[11px] font-bold uppercase animate-pulse">
                                Sankalpa Scheduled
                              </span>
                            </div>
                          </div>
                          );
                        }}
                      />

                      {/* Beyond the latest 6 — collapsed by default, "Show
                          more" reveals 10 more at a time. */}
                      {bookedItems.length > LEDGER_CAROUSEL_COUNT && (
                        <div className="space-y-3 mt-3">
                          {bookedItems.slice(LEDGER_CAROUSEL_COUNT, bookedLedgerVisible).map((item, i) => {
                            const idx = LEDGER_CAROUSEL_COUNT + i;
                            const PujaIcon = getPujaIcon(item.pujaName);
                            const shortTitle = getShortTitle(item.pujaName);
                            const hasMore = shortTitle !== item.pujaName;
                            const itemKey = `list-${idx}`;
                            const isExpanded = expandedBookedItems.has(itemKey);
                            return (
                              <div
                                key={idx}
                                id={`booked-item-ledg-${idx}`}
                                className="bg-[#092320] border border-white/10 p-4 rounded-2xl shadow-sm text-left overflow-hidden"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="shrink-0 w-9 h-9 rounded-full bg-[#5EEAD4]/10 border border-[#5EEAD4]/20 flex items-center justify-center">
                                    <PujaIcon className="w-4.5 h-4.5 text-[#5EEAD4]" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-serif text-sm font-bold text-white">{shortTitle}</h4>
                                    {hasMore && (
                                      <button
                                        type="button"
                                        onClick={() => toggleBookedItemExpanded(itemKey)}
                                        className="text-[10px] font-bold text-[#5EEAD4]/70 hover:text-[#5EEAD4] uppercase tracking-wide mt-0.5 cursor-pointer"
                                      >
                                        {isExpanded ? "Show less ▲" : "Details ▼"}
                                      </button>
                                    )}
                                    {hasMore && isExpanded && (
                                      <p className="text-[11px] text-white/60 mt-1.5 leading-snug">{item.pujaName}</p>
                                    )}
                                  </div>
                                </div>
                                <span className="text-[12px] text-white/50 font-mono font-medium block mt-2">Reference Key: {item.refId} | Date: {item.date}</span>
                                <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5 text-xs">
                                  <span className="font-bold text-[#FFB347]">Paid: ₹{item.price}</span>
                                  <span className="bg-[#FFB347]/10 text-[#FFB347] border border-[#FFB347]/20 px-2 py-0.5 rounded-full font-mono text-[11px] font-bold uppercase animate-pulse">
                                    Sankalpa Scheduled
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                          {bookedLedgerVisible < bookedItems.length && (
                            <button
                              type="button"
                              onClick={() => setBookedLedgerVisible((v) => v + LEDGER_PAGE_SIZE)}
                              className="w-full flex items-center justify-center gap-1.5 text-[12px] font-bold text-[#5EEAD4] hover:text-[#7FF4DE] uppercase tracking-wide py-2 border border-white/10 rounded-xl"
                            >
                              Show {Math.min(LEDGER_PAGE_SIZE, bookedItems.length - bookedLedgerVisible)} more
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-white/40 py-4 italic text-left">No dynamic pujas scheduled in this current browser session yet. Use the header "Book a Puja" to watch live results.</p>
                  )}
                </div>
              </div>

              {/* SYNCED ACCOUNT ACTIVITY — every puja, seva, bazaar order,
                  divine contribution and registration on this Dharmic ID, pulled
                  straight from Supabase, so it's the same on every device
                  and shows the real payment status (not just "this
                  browser's session"). Purely additive to the ledger above. */}
              <div className="w-full max-w-md mt-6 text-left" id="synced-activity-ledger">
                <h3 className="font-serif text-lg font-bold text-white border-b border-white/10 pb-2 mb-4">
                  All Account Activity
                </h3>
                {activityDownloadError && (
                  <p className="text-xs text-red-300 bg-red-950/30 border border-red-500/20 rounded-xl px-3 py-2 mb-3">
                    {activityDownloadError}
                  </p>
                )}
                {visibleActivityRecords.length > 0 ? (
                  <>
                    {/* Latest 6, as a swipeable carousel on mobile/app */}
                    <MobileCarousel
                      items={visibleActivityRecords.slice(0, LEDGER_CAROUSEL_COUNT)}
                      getKey={(rec) => `activity-carousel-${rec.id}`}
                      desktopGridClassName="lg:grid-cols-2"
                      cardWidthClassName="w-[clamp(210px,62vw,360px)]"
                      renderItem={(rec) => {
                        const badge = paymentStatusBadge(rec.paymentStatus);
                        // ✅ FIELD-TRIM (2026-09-03): card face now shows only
                        // what was asked for — title, reference ID, price,
                        // payment status — plus Complete Payment/Delete
                        // whenever a payment is actually stuck (that one's
                        // covered by the separate "Pending payments must
                        // clearly show..." requirement, so it's never
                        // collapsed). The booking stepper and Receipt/
                        // Certificate/Book Again buttons are genuinely
                        // "remaining details," not core fields — same
                        // Details ▼/▲ toggle already used on the Transaction
                        // Ledger card above, for a consistent interaction.
                        const cardKey = `activity-${rec.id}`;
                        const isExpanded = expandedActivityCards.has(cardKey);
                        const hasExtras = renderBookingStepper(rec) !== null || renderActivityExtras(rec) !== null;
                        return (
                          <div
                            id={`synced-activity-${rec.id}`}
                            className="h-full flex flex-col bg-[#092320] border border-white/10 p-4 rounded-2xl shadow-sm text-left relative overflow-hidden"
                          >
                            <span className="text-[11px] text-[#5EEAD4] font-mono uppercase tracking-wider block mb-1">
                              {ACTIVITY_TYPE_LABELS[rec.activityType] || "Offering"}
                            </span>
                            <h4 className="font-serif text-sm font-bold text-white pr-4">{rec.itemName}</h4>
                            <span className="text-[12px] text-white/50 font-mono font-medium block">
                              Ref: {rec.refId} | {new Date(rec.createdAt).toLocaleDateString()}
                            </span>
                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5 text-xs">
                              <span className="font-bold text-[#FFB347]">₹{rec.amount}{rec.paymentMethod ? ` · ${rec.paymentMethod}` : ""}</span>
                              <span className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-bold uppercase border ${badge.cls}`}>
                                {badge.label}
                              </span>
                            </div>
                            {renderPendingActions(rec)}
                            {hasExtras && (
                              <button
                                type="button"
                                onClick={() => toggleActivityCardExpanded(cardKey)}
                                className="text-[10px] font-bold text-[#5EEAD4]/70 hover:text-[#5EEAD4] uppercase tracking-wide mt-3 pt-3 border-t border-white/5 text-left cursor-pointer"
                              >
                                {isExpanded ? "Show less ▲" : "Details ▼"}
                              </button>
                            )}
                            {isExpanded && renderBookingStepper(rec)}
                            {isExpanded && renderActivityExtras(rec)}
                            <div className="flex-1" />
                          </div>
                        );
                      }}
                    />

                    {/* Beyond the latest 6 — collapsed by default, "Show
                        more" reveals 10 more at a time. */}
                    {visibleActivityRecords.length > LEDGER_CAROUSEL_COUNT && (
                      <div className="space-y-3 mt-3">
                        {visibleActivityRecords.slice(LEDGER_CAROUSEL_COUNT, activityLedgerVisible).map((rec) => {
                          const badge = paymentStatusBadge(rec.paymentStatus);
                          const cardKey = `activity-${rec.id}`;
                          const isExpanded = expandedActivityCards.has(cardKey);
                          const hasExtras = renderBookingStepper(rec) !== null || renderActivityExtras(rec) !== null;
                          return (
                            <div
                              key={rec.id}
                              id={`synced-activity-${rec.id}`}
                              className="bg-[#092320] border border-white/10 p-4 rounded-2xl shadow-sm text-left relative overflow-hidden"
                            >
                              <span className="text-[11px] text-[#5EEAD4] font-mono uppercase tracking-wider block mb-1">
                                {ACTIVITY_TYPE_LABELS[rec.activityType] || "Offering"}
                              </span>
                              <h4 className="font-serif text-sm font-bold text-white pr-4">{rec.itemName}</h4>
                              <span className="text-[12px] text-white/50 font-mono font-medium block">
                                Ref: {rec.refId} | {new Date(rec.createdAt).toLocaleDateString()}
                              </span>
                              <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5 text-xs">
                                <span className="font-bold text-[#FFB347]">₹{rec.amount}{rec.paymentMethod ? ` · ${rec.paymentMethod}` : ""}</span>
                                <span className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-bold uppercase border ${badge.cls}`}>
                                  {badge.label}
                                </span>
                              </div>
                              {renderPendingActions(rec)}
                              {hasExtras && (
                                <button
                                  type="button"
                                  onClick={() => toggleActivityCardExpanded(cardKey)}
                                  className="text-[10px] font-bold text-[#5EEAD4]/70 hover:text-[#5EEAD4] uppercase tracking-wide mt-3 pt-3 border-t border-white/5 text-left cursor-pointer"
                                >
                                  {isExpanded ? "Show less ▲" : "Details ▼"}
                                </button>
                              )}
                              {isExpanded && renderBookingStepper(rec)}
                              {isExpanded && renderActivityExtras(rec)}
                            </div>
                          );
                        })}
                        {activityLedgerVisible < visibleActivityRecords.length && (
                          <button
                            type="button"
                            onClick={() => setActivityLedgerVisible((v) => v + LEDGER_PAGE_SIZE)}
                            className="w-full flex items-center justify-center gap-1.5 text-[12px] font-bold text-[#5EEAD4] hover:text-[#7FF4DE] uppercase tracking-wide py-2 border border-white/10 rounded-xl"
                          >
                            Show {Math.min(LEDGER_PAGE_SIZE, visibleActivityRecords.length - activityLedgerVisible)} more
                          </button>
                        )}
                      </div>
                    )}

                    {/* This interface only ever shows the latest 30 synced
                        records (fetchActivities() caps the query itself),
                        so a devotee with a longer history knows where to
                        go for the rest. */}
                    <p className="text-[11px] text-white/35 leading-relaxed mt-3">
                      This shows your most recent 30 transactions. For older records or a full statement, please contact Sri Dwar.
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-white/40 py-4 italic text-left">
                    No synced activity yet — bookings, sevas, orders and divine contributions made on this Dharmic ID will appear here.
                  </p>
                )}
              </div>

              {/* MY REQUESTS & SUBMISSIONS — non-monetary account activity:
                  Contact Us messages, testimonials, Darshan Certificate
                  requests, and registration submissions tied to this login. */}
              {formSubmissions.length > 0 && (
                <div className="w-full max-w-md mt-6 text-left" id="synced-form-submissions">
                  <h3 className="font-serif text-lg font-bold text-white border-b border-white/10 pb-2 mb-4">
                    My Requests & Submissions
                  </h3>
                  {certDownloadError && (
                    <p className="text-xs text-red-300 bg-red-950/30 border border-red-500/20 rounded-xl px-3 py-2 mb-3">
                      {certDownloadError}
                    </p>
                  )}
                  <div className="space-y-2.5">
                    {formSubmissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="bg-[#092320] border border-white/10 px-4 py-3 rounded-2xl text-left flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <span className="text-[12px] text-[#5EEAD4] font-mono uppercase tracking-wider block">
                            {FORM_TYPE_LABELS[sub.formType] || sub.formType}
                          </span>
                          <span className="text-xs text-white/70 block truncate">
                            {new Date(sub.createdAt).toLocaleDateString()}{sub.refId ? ` · Ref: ${sub.refId}` : ""}
                          </span>
                        </div>
                        {/* Temple Visit Certificate download — only shown for
                            Darshan Certificate requests with a refId. The
                            endpoint (server.ts) regenerates the certificate
                            fresh each time from the devotee's own submitted
                            data, so it's available as soon as the request exists. */}
                        {sub.formType === "darshan_certificate" && sub.refId && (
                          <button
                            type="button"
                            onClick={() => openTempleCertificateReveal(sub.refId as string, sub.name || userProfile.name)}
                            disabled={loadingTempleCertRefId === sub.refId}
                            className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-[#0F766E]/20 hover:bg-[#0F766E]/40 border border-[#5EEAD4]/30 text-[#5EEAD4] rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all disabled:opacity-50"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{loadingTempleCertRefId === sub.refId ? "Preparing..." : "Certificate"}</span>
                          </button>
                        )}
                        {/* ✅ ADDED — Contact Us / Dharmic Expert / Temple
                            Committee Registration submissions now get their
                            own immediate acknowledgement certificate on
                            register_temple.jpg (see GET
                            /api/certificates/inquiry/:refId in server.ts),
                            instead of being folded into the generic
                            puja_certificate.jpg fallback below — that
                            artwork's "This is to certify that ... has had
                            this sacred Puja performed" wording doesn't fit
                            a plain inquiry. Every OTHER form record
                            (Devotion Story, Devotee Registration, etc.)
                            still uses the general-purpose fallback further
                            below, unchanged. */}
                        {(sub.formType === "contact_us" || sub.formType === "expert_registration" || sub.formType === "temple_committee_registration") && sub.refId && (
                          <button
                            type="button"
                            onClick={() => openDocumentReveal(`/api/certificates/inquiry/${encodeURIComponent(sub.refId as string)}`, `Sri-Dwar-Acknowledgement-${(sub.name || userProfile.name || "Devotee").trim().replace(/\s+/g, "_")}.jpg`, `${sub.id}-inq-jpg`)}
                            disabled={loadingDocKey === `${sub.id}-inq-jpg`}
                            className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-[#0F766E]/20 hover:bg-[#0F766E]/40 border border-[#5EEAD4]/30 text-[#5EEAD4] rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all disabled:opacity-50"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{loadingDocKey === `${sub.id}-inq-jpg` ? "..." : "Certificate"}</span>
                          </button>
                        )}
                        {/* ✅ ADDED — every OTHER form record (Devotion
                            Story, Devotee Registration, etc.) has no
                            transaction and no dedicated artwork of its own,
                            so it still uses the general-purpose
                            puja_certificate.jpg fallback — see
                            /api/certificates/general/:refId in server.ts,
                            which fills in the devotee's field of
                            expertise, the temple they registered, or their
                            gotra + reference ID depending on record type.
                            ✅ FIX (2026-08-29): the /pdf variant (which
                            embedded this image inside a PDF) was removed —
                            Certificate (JPG) and Confirmation (a separate,
                            plain-text PDF) must stay two independent
                            downloads, never one embedding the other. */}
                        {sub.formType !== "darshan_certificate" && sub.formType !== "contact_us" && sub.formType !== "expert_registration" && sub.formType !== "temple_committee_registration" && sub.refId && (
                          <button
                            type="button"
                            onClick={() => openDocumentReveal(`/api/certificates/general/${encodeURIComponent(sub.refId as string)}`, `Sri-Dwar-Certificate-${(sub.name || userProfile.name || "Devotee").trim().replace(/\s+/g, "_")}.jpg`, `${sub.id}-gen-jpg`)}
                            disabled={loadingDocKey === `${sub.id}-gen-jpg`}
                            className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-[#0F766E]/20 hover:bg-[#0F766E]/40 border border-[#5EEAD4]/30 text-[#5EEAD4] rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all disabled:opacity-50"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{loadingDocKey === `${sub.id}-gen-jpg` ? "..." : "Certificate"}</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ✅ ADDED — "Manage Subscriptions" preference center, the
                  same relationship Gmail's own settings page has to your
                  inbox: every devotee is auto-subscribed at signup (the
                  database column defaults handle that, nothing here
                  controls it), and this panel is just where they can
                  review and turn individual categories off. Booking
                  confirmations, payment receipts, and certificate-ready
                  emails are transactional and are never listed here —
                  they always send, exactly like Amazon's order emails. */}
              <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-2xl">
                <h4 className="text-xs font-bold text-[#5EEAD4] uppercase tracking-wider font-mono mb-1">Manage Subscriptions</h4>
                <p className="text-[11px] text-white/50 mb-3 leading-relaxed">
                  Booking and payment updates always reach you. Everything below is optional — turn off anything you'd rather not receive.
                </p>
                {subscriptionPrefsError && (
                  <p className="text-[11px] text-red-300 bg-red-950/30 border border-red-500/20 rounded-lg px-2.5 py-1.5 mb-2">
                    {subscriptionPrefsError}
                  </p>
                )}
                <div className="space-y-2">
                  {([
                    { key: "subscribe_puja_reminders" as const, label: "Festival & Puja Reminders", desc: "Ekadashi, seasonal pujas, auspicious dates" },
                    { key: "subscribe_devotional_content" as const, label: "Devotional Stories", desc: "Devotee experiences and spiritual content" },
                    { key: "subscribe_temple_updates" as const, label: "Temple & Community Updates", desc: "New temples, platform news" },
                    { key: "subscribe_referral_program" as const, label: "Refer & Earn Updates", desc: "Cashback and referral program news" },
                  ]).map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white/90">{label}</p>
                        <p className="text-[10px] text-white/45">{desc}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={subscriptionPrefs[key]}
                        disabled={isSavingSubscriptionPrefs}
                        onClick={() => toggleSubscriptionPref(key)}
                        className={`shrink-0 w-10 h-6 rounded-full transition-colors relative disabled:opacity-60 cursor-pointer ${subscriptionPrefs[key] ? "bg-[#5EEAD4]" : "bg-white/15"}`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${subscriptionPrefs[key] ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Log out option */}
              <button
                id="dashboard-logout-btn"
                onClick={onLogout}
                className="mt-6 flex items-center space-x-1.5 px-4 py-2 bg-white/5 border border-white/10 text-white/90 hover:bg-white/15 hover:text-white rounded-full text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-[#FFB347]" />
                <span>Log Out of workspace</span>
              </button>

              {/* Danger zone — self-service account deletion, available to
                  every logged-in devotee on both the website and the app. */}
              <button
                id="dashboard-delete-account-btn"
                onClick={() => { setShowDeleteAccountConfirm(true); setDeleteAccountError(""); setDeleteAccountConfirmText(""); }}
                className="mt-3 flex items-center space-x-1.5 px-4 py-2 bg-red-950/20 border border-red-500/20 text-red-300/90 hover:bg-red-950/40 hover:text-red-200 rounded-full text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete My Account</span>
              </button>
            </div>

            {/* Right Box: My Sacred Profile management, moved to the right side (cols 7) */}
            <div className="lg:col-span-7 space-y-6">

              {/* REFER, EARN & GROW WITH DHARMA — referral, affiliate,
                  commission and subscription dashboard for this Dharmic ID.
                  Placed first in the right column so every logged-in
                  devotee/priest/temple/expert sees their earning
                  opportunity immediately upon opening their profile. */}
              <ReferralDashboardPanel
                userProfile={userProfile}
                onOpenLegalDoc={onOpenLegalDoc}
              />

              {/* SUPPORT OUR MISSION PANEL — restored so an already-logged-in
                  devotee can start a new offering from their own Profile
                  page, instead of only during first-time Dharmic ID
                  generation. Also shows a 5-point summary of how offerings
                  are used and impact is reported back to the devotee. */}
              <div
                id="profile-contribute-panel"
                className="w-full bg-[#092320] border border-white/10 rounded-3xl p-5 text-left text-white space-y-3.5"
              >
                <div className="flex items-center space-x-2 border-b border-white/5 pb-2">
                  <span className="text-lg">🙏</span>
                  <h4 className="font-serif text-sm font-bold text-white uppercase tracking-wider">
                    Support Our Mission
                  </h4>
                </div>

                {postLoginContributionSuccess && (
                  <div className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 p-2.5 rounded-xl text-[12px] text-center font-bold">
                    ✓ Your support has been recorded! It now appears under "All Account Activity" — our team will confirm it shortly.
                  </div>
                )}

                {!showPostLoginContribute ? (
                  <>
                    <p className="text-[12px] text-white/70 leading-relaxed font-sans">
                      One Divine Contribution. Countless Blessings. With gratitude, be part of Devotee Well-being, Temple Redevelopment, and Sacred Sevas through Sri Dwar — especially for smaller temples that quietly serve with limited resources or visibility. Together, let's gently strengthen our sacred heritage, one heartfelt offering at a time.
                    </p>

                    <StoneEngravingNote
                      variant="compact"
                      showRepeatNote
                      className="text-left"
                      title="Engrave Your Name in a Sacred Temple"
                      collapsible
                    />

                    <button
                      id="profile-contribute-open-btn"
                      type="button"
                      onClick={() => { setShowPostLoginContribute(true); setPostLoginContributionSuccess(false); }}
                      className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold py-2.5 rounded-xl text-xs uppercase tracking-wide transition-all cursor-pointer"
                    >
                      Support Now
                    </button>
                  </>
                ) : (
                  <div className="space-y-3.5 animate-fadeIn">
                    <div>
                      <label className="block text-[12px] font-bold text-white/80 mb-1">Choose a temple from our network</label>
                      <select
                        id="profile-contribute-temple-select"
                        value={selectedTempleId}
                        onChange={(e) => {
                          setSelectedTempleId(e.target.value);
                          if (e.target.value) {
                            setCustomMandapName("");
                            setCustomMandapAddress("");
                          }
                        }}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-[#5EEAD4] font-medium focus:outline-none focus:border-[#5EEAD4]"
                      >
                        <option value="">-- Select a temple --</option>
                        {TEMPLES_LIST.map((temple) => (
                          <option key={temple.id} value={temple.id}>{temple.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="sanskrit-divider text-[12px]">or</div>

                    <div className="space-y-2">
                      <input
                        id="profile-contribute-custom-mandap-name"
                        type="text"
                        placeholder="Mandap / Temple name"
                        value={customMandapName}
                        onChange={(e) => {
                          setCustomMandapName(e.target.value);
                          if (e.target.value) setSelectedTempleId("");
                        }}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-white placeholder-white/30 focus:outline-none focus:border-[#5EEAD4]"
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-bold text-white/80 mb-1">Support Amount (₹)</label>
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        {[51, 101, 251].map((amt) => (
                          <button
                            key={amt}
                            id={`profile-contribute-amount-tier-${amt}`}
                            type="button"
                            onClick={() => setContributionAmount(amt)}
                            className={`text-xs py-2 rounded-xl border font-bold transition-all ${
                              contributionAmount === amt
                                ? "bg-white/10 border-[#5EEAD4] text-[#5EEAD4] shadow-sm"
                                : "bg-black/20 border-white/10 text-white/70 hover:bg-black/30"
                            }`}
                          >
                            ₹{amt}
                          </button>
                        ))}
                      </div>
                      <input
                        id="profile-contribute-custom-amount"
                        type="number"
                        min={1}
                        placeholder="Or enter a custom amount"
                        value={contributionAmount || ""}
                        onChange={(e) => setContributionAmount(Math.max(0, Number(e.target.value)))}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-white placeholder-white/30 focus:outline-none focus:border-[#5EEAD4]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button
                        id="profile-contribute-cancel-btn"
                        type="button"
                        onClick={() => setShowPostLoginContribute(false)}
                        className="bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 rounded-xl text-xs border border-white/10 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        id="profile-contribute-proceed-btn"
                        type="button"
                        onClick={handleProceedToContributionPayment}
                        disabled={!contributionAmount || contributionAmount <= 0}
                        className="bg-[#FFB347] hover:bg-[#F27D26] disabled:bg-white/10 disabled:text-white/30 text-[#021816] font-extrabold py-2.5 rounded-xl text-xs uppercase tracking-wide transition-all cursor-pointer"
                      >
                        Support with ₹{contributionAmount || 0}
                      </button>
                    </div>
                  </div>
                )}

                {/* How your support is used — 5-point impact summary.
                    ✅ COLLAPSED BY DEFAULT (Profile page audit): teaser line
                    + "Read More" always visible; the 5 points and closing
                    line only mount once expanded, matching StoneEngravingNote's
                    teaser/expand pattern used just above in this same panel. */}
                <div className="border-t border-white/5 pt-3 space-y-2.5">
                  <p className="text-[12px] text-white/60 italic leading-relaxed">
                    Don't just offer your devotion — see it come alive.
                  </p>
                  {showImpactDetails && (
                    <>
                      <div className="flex items-start gap-2 text-[12px] text-white/50 font-mono leading-relaxed">
                        <Landmark className="w-3 h-3 shrink-0 mt-0.5 text-[#5EEAD4]" />
                        <span>Every booking, seva, order, and divine contribution you make directly supports your chosen temple or local puja mandal.</span>
                      </div>
                      <div className="flex items-start gap-2 text-[12px] text-white/50 font-mono leading-relaxed">
                        <Utensils className="w-3 h-3 shrink-0 mt-0.5 text-[#5EEAD4]" />
                        <span>Your generosity funds Annadanam — free sacred meals served to devotees.</span>
                      </div>
                      <div className="flex items-start gap-2 text-[12px] text-white/50 font-mono leading-relaxed">
                        <Armchair className="w-3 h-3 shrink-0 mt-0.5 text-[#5EEAD4]" />
                        <span>It also funds seating facilities, a shed, waiting halls, and comfort for devotees visiting the pilgrimage sites.</span>
                      </div>
                      <div className="flex items-start gap-2 text-[12px] text-white/50 font-mono leading-relaxed">
                        <Hammer className="w-3 h-3 shrink-0 mt-0.5 text-[#5EEAD4]" />
                        <span>Your offering supports maintenance and other sacred initiatives.</span>
                      </div>
                      <div className="flex items-start gap-2 text-[12px] text-white/50 font-mono leading-relaxed">
                        <FileCheck className="w-3 h-3 shrink-0 mt-0.5 text-[#FFB347]" />
                        <span>After the seva is completed, we share photo or video proof of the impact when available and issue your personalized Digital Seva Certificate within 7 working days.</span>
                      </div>
                      <div className="flex items-start gap-2 text-[12px] text-white/50 font-mono leading-relaxed">
                        <Landmark className="w-3 h-3 shrink-0 mt-0.5 text-[#FFB347]" />
                        <span>{STONE_ENGRAVING_REPEAT_TEXT}</span>
                      </div>
                      <p className="text-[12px] text-[#FFB347] italic leading-relaxed pt-1">
                        Every offering becomes a blessing. Every blessing creates a difference.
                      </p>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowImpactDetails((v) => !v)}
                    aria-expanded={showImpactDetails}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FFB347] hover:text-[#FFC97A] transition-colors"
                  >
                    {showImpactDetails ? "Show less" : "Read More"}
                  </button>
                </div>
              </div>

              {/* MY SACRED PROFILE MANAGEMENT CARD */}
              <div 
                id="my-sacred-profile-card"
                className="w-full bg-[#092320] border border-white/10 rounded-3xl p-5 text-left text-white space-y-4"
              >
                <div className="flex items-center space-x-2 border-b border-white/5 pb-2">
                  <span className="text-lg">🕉️</span>
                  <h4 className="font-serif text-sm font-bold text-white uppercase tracking-wider">
                    My Sacred Profile
                  </h4>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-3.5">
                  {/* Full Name — corrects the name shown on the Dharmic ID card itself */}
                  <div>
                    <label className="block text-[12px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">
                      Shradhalu Name (as shown on your Dharmic ID) *
                    </label>
                    <input
                      id="profile-name"
                      type="text"
                      required
                      placeholder="Full name"
                      value={editableName}
                      onChange={(e) => setEditableName(e.target.value)}
                      className="w-full text-xs px-3.5 py-2 rounded-xl border border-white/10 bg-[#021816] text-white focus:outline-none focus:border-[#5EEAD4] text-left font-semibold"
                    />
                  </div>

                  {/* Phone number */}
                  <div>
                    <label className="block text-[12px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">
                      Mobile / WhatsApp Number
                    </label>
                    <input
                      id="profile-phone"
                      type="text"
                      placeholder="e.g. +91 98765 43210"
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      className="w-full text-xs px-3.5 py-2 rounded-xl border border-white/10 bg-[#021816] text-[#5EEAD4] focus:outline-none focus:border-[#5EEAD4] text-left font-semibold"
                    />
                  </div>

                  {/* Gotra lineage */}
                  <div>
                    <label className="block text-[12px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">
                      Gotra Ancestry *
                    </label>
                    <input
                      id="profile-gotra"
                      type="text"
                      required
                      placeholder="e.g. Vatsasa Gotra"
                      value={userGotra}
                      onChange={(e) => setUserGotra(e.target.value)}
                      className="w-full text-xs px-3.5 py-2 rounded-xl border border-white/10 bg-[#021816] text-white focus:outline-none focus:border-[#5EEAD4] text-left font-semibold"
                    />
                  </div>

                  {/* Moon Sign Rashi */}
                  <div>
                    <label className="block text-[12px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">
                      Vedic Astro Rashi (Moon Sign)
                    </label>
                    <select
                      id="profile-rashi"
                      value={userRashi}
                      onChange={(e) => setUserRashi(e.target.value)}
                      className="w-full text-xs px-3.5 py-2 rounded-xl border border-white/10 bg-[#021816] text-[#5EEAD4] focus:outline-none focus:border-[#5EEAD4] font-semibold"
                    >
                      <option value="Mesh (Aries)">Mesh (Aries)</option>
                      <option value="Vrishabh (Taurus)">Vrishabh (Taurus)</option>
                      <option value="Mithun (Gemini)">Mithun (Gemini)</option>
                      <option value="Kark (Cancer)">Kark (Cancer)</option>
                      <option value="Simha (Leo)">Simha (Leo)</option>
                      <option value="Kanya (Virgo)">Kanya (Virgo)</option>
                      <option value="Tula (Libra)">Tula (Libra)</option>
                      <option value="Vrishchik (Scorpio)">Vrishchik (Scorpio)</option>
                      <option value="Dhanu (Sagittarius)">Dhanu (Sagittarius)</option>
                      <option value="Makar (Capricorn)">Makar (Capricorn)</option>
                      <option value="Kumbh (Aquarius)">Kumbh (Aquarius)</option>
                      <option value="Meen (Pisces)">Meen (Pisces)</option>
                    </select>
                  </div>

                  {/* Family Members Sub-section */}
                  <div className="border-t border-white/5 pt-3.5 space-y-2">
                    <span className="block text-[12px] font-bold text-white/85 uppercase tracking-wide text-left">
                      Family Members (Chanting Sankalpa)
                    </span>

                    {familyMembers.length > 0 ? (
                      <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                        {familyMembers.map((member, index) => (
                          <div 
                            key={index} 
                            className="flex items-center justify-between text-[13px] bg-[#021816] px-3 py-1.5 rounded-lg border border-white/5"
                          >
                            <span className="text-white font-medium truncate max-w-[120px] text-left">{member.name}</span>
                            <span className="text-[#FFB347] font-sans text-[12px] px-1.5 py-0.5 bg-white/5 rounded border border-white/5">{member.relation}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFamilyMember(index)}
                              className="text-red-400 hover:text-red-500 hover:scale-115 transition-all p-0.5 cursor-pointer bg-transparent border-none"
                              title="Remove family member"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px] text-white/40 italic text-left text-left">
                        No family members registered yet.
                      </p>
                    )}

                    {/* Add Member inputs */}
                    <div className="grid grid-cols-12 gap-1.5 pt-1">
                      <div className="col-span-6">
                        <input
                          id="profile-family-new-name"
                          type="text"
                          placeholder="Member Name"
                          value={newMemberName}
                          onChange={(e) => setNewMemberName(e.target.value)}
                          className="w-full text-[12px] px-2 py-1.5 rounded-lg border border-white/10 bg-[#021816] text-white focus:outline-none"
                        />
                      </div>
                      <div className="col-span-4">
                        <select
                          id="profile-family-new-relation"
                          value={newMemberRelation}
                          onChange={(e) => setNewMemberRelation(e.target.value)}
                          className="w-full text-[12px] px-1.5 py-1.5 rounded-lg border border-white/10 bg-[#021816] text-[#5EEAD4] focus:outline-none cursor-pointer"
                        >
                          <option value="Spouse">Spouse</option>
                          <option value="Son">Son</option>
                          <option value="Daughter">Daughter</option>
                          <option value="Father">Father</option>
                          <option value="Mother">Mother</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <button
                          type="button"
                          onClick={(e) => handleAddFamilyMember(e)}
                          className="w-full h-full bg-[#5EEAD4] hover:bg-[#14B8A6] text-[#021816] font-extrabold flex items-center justify-center rounded-lg transition-colors cursor-pointer border-none"
                          title="Add Member"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Submission and Saving status bar */}
                  <div className="pt-2">
                    <button
                      id="save-sacred-profile-btn"
                      type="submit"
                      className="w-full bg-[#0F766E] hover:bg-[#14B8A6] text-white font-bold text-[12px] uppercase tracking-widest py-2.5 px-4 rounded-xl shadow transition-transform active:scale-95 flex items-center justify-center space-x-1.5 cursor-pointer border-none"
                    >
                      <Save className="w-3.5 h-3.5 text-[#FFB347]" />
                      <span>Save Sacred Profile</span>
                    </button>

                    {saveProfileSuccess && (
                      <div className="mt-2 bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 p-2 rounded-xl text-[12px] text-center font-bold animate-pulse">
                        ✓ Sacred Profile & Gotra Lineage Saved!
                      </div>
                    )}
                  </div>
                </form>
              </div>
            </div>

          </div>

        )}

      </div>

      {/* ── Step 3: Divine Contribution Portal ───────────────────────────── */}
      {showSankalpaForm && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[200] overflow-y-auto p-4 py-6"
          style={{
            WebkitOverflowScrolling: "touch",
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 2rem)",
          }}
        >
          <div className="bg-[#092320] rounded-3xl w-full max-w-sm border border-white/10 shadow-2xl mx-auto my-4 text-white">

            {/* Header with SriDwarLogo */}
            <div
              className="bg-[#021816] px-5 py-4 border-b border-white/10 rounded-t-3xl"
              style={{ paddingTop: "calc(var(--safe-area-inset-top, env(safe-area-inset-top, 24px)) + 1rem)" }}
            >
              <div className="flex justify-center mb-3">
                <SriDwarLogo variant="colored" iconSize="sm" showTagline={false} />
              </div>
              {/* min-w-0 lets this text block shrink/wrap instead of pushing
                  into or overlapping the ✕ button on narrow Android widths. */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif text-sm font-bold text-white leading-snug break-words">Divine Contribution Portal</h3>
                  <p className="text-[12px] font-mono text-[#FFB347] uppercase tracking-wider mt-0.5 leading-snug break-words">
                    Temple Redevelopment Divine Contribution
                  </p>
                </div>
                <button
                  onClick={() => setShowSankalpaForm(false)}
                  className="text-white/60 hover:text-white p-1.5 bg-white/5 rounded-full border border-white/10 shrink-0 ml-2 w-8 h-8 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={handleSankalpaSubmit} className="p-5 space-y-4">

              {/* Divine Contribution summary */}
              <div className="bg-[#021816] rounded-2xl p-3 border border-white/10 flex items-center justify-between">
                <div className="text-xs text-white/60 font-mono truncate max-w-[180px]">
                  {selectedTempleId
                    ? TEMPLES_LIST.find(t => t.id === selectedTempleId)?.name
                    : customMandapName || "Temple Divine Contribution"}
                </div>
                <span className="text-sm font-extrabold text-[#FFB347] font-serif shrink-0 ml-2">
                  ₹{contributionAmount}
                </span>
              </div>

              <p className="text-[13px] text-white/60 leading-relaxed">
                🙏 Please confirm your details so our pandits can register this divine contribution Sankalpa in your name and Gotra.
              </p>

              {/* ✅ FIX (2026-09-02): was readOnly, pre-filled only from
                  pendingLogin?.name with no fallback when that's empty —
                  a devotee with no saved display name had no way to type
                  one in at all. Now editable, same pre-fill-but-overridable
                  pattern as Gotra right below it. */}
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">Devotee Name *</label>
                <input
                  type="text"
                  required
                  value={sankalpaName || pendingLogin?.name || userProfile.name || ""}
                  onChange={e => setSankalpaName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                />
              </div>

              {/* WhatsApp */}
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">WhatsApp Number *</label>
                <input
                  type="tel"
                  required
                  value={sankalpaPhone}
                  onChange={e => setSankalpaPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                />
              </div>

              {/* Gotra */}
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">
                  Gotra <span className="text-white/40 font-normal">(Optional — auto-filled from your profile)</span>
                </label>
                <input
                  type="text"
                  value={sankalpaGotra || userGotra}
                  onChange={e => setSankalpaGotra(e.target.value)}
                  placeholder="e.g. Kashyap"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                />
              </div>

              {/* Sankalpa Intention */}
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">
                  Sankalpa Intention <span className="text-white/40 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={sankalpaIntent}
                  onChange={e => setSankalpaIntent(e.target.value)}
                  placeholder="e.g. For the health and prosperity of my family..."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35 resize-none"
                />
                <p className="text-[12px] text-white/30 mt-1 font-mono">Recited by the pandit during Sankalpa</p>
              </div>

              <div className="flex items-start gap-2 bg-emerald-950/30 border border-emerald-500/20 px-3 py-2.5 rounded-xl text-[12px] text-emerald-300 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>A specific puja will be performed in your name at your ista devta temple, and the certificate for that puja will be sent on WhatsApp & Email within 3 working days. 🙏</span>
              </div>

              <button
                type="submit"
                className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold py-3 rounded-xl text-xs tracking-widest uppercase transition-all shadow flex items-center justify-center gap-2"
              >
                Proceed to Sacred Offering →
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Step 5: Complete Your Sacred Offering (UPI Payment) ───────────── */}
      <UPIPaymentModal
        isOpen={isContributionPaymentOpen}
        onClose={() => setIsContributionPaymentOpen(false)}
        onPaymentConfirmed={finalizeContribution}
        amount={contributionAmount}
        bookingName={`Temple Divine Contribution — ${
          selectedTempleId
            ? TEMPLES_LIST.find(t => t.id === selectedTempleId)?.name || "Temple"
            : customMandapName || "Temple Redevelopment"
        }`}
        devoteeName={sankalpaName || pendingLogin?.name || "Devotee"}
        devoteePhone={sankalpaPhone}
        devoteeEmail={pendingLogin?.email || userProfile.email || undefined}
        refId={contributionRefId}
        isVoluntaryContribution={true}
      />

      {/* ── "Pay Now" retry — resubmit payment for a pending/failed row in
          "All Account Activity" (see handleOpenRetryPayment above for why
          this inserts a fresh activity row instead of editing the old one). */}
      {retryPaymentTarget && (
        <UPIPaymentModal
          isOpen={showRetryUPI}
          onClose={() => setShowRetryUPI(false)}
          onPaymentConfirmed={handleRetryPaymentConfirmed}
          amount={retryPaymentTarget.amount}
          bookingName={retryPaymentTarget.itemName}
          devoteeName={userProfile.name || "Devotee"}
          devoteeEmail={userProfile.email || undefined}
          refId={retryRefId}
          skipDisclaimer
        />
      )}

      {/* ── Delete My Account — self-service confirmation modal ───────────── */}
      {showDeleteAccountConfirm && (
        <div
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          style={{ touchAction: "pan-y" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-modal-title"
        >
          <div
            className="w-full max-w-sm bg-[#092320] border border-red-500/30 rounded-3xl shadow-2xl text-left flex flex-col"
            style={{ maxHeight: "100%" }}
          >
          <div
            className="overflow-y-auto p-6"
            style={{
              WebkitOverflowScrolling: "touch",
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <h3 id="delete-account-modal-title" className="font-serif text-lg font-bold text-white">
                Delete Your Account?
              </h3>
            </div>
            <p className="text-xs text-white/70 leading-relaxed mb-3">
              This permanently deletes your Dharmic ID login, saved profile (name, email, Gotra, Rashi, phone),
              family members, and request history. This cannot be undone.
            </p>
            <p className="text-xs text-white/70 leading-relaxed mb-4">
              Records we're legally required to keep — such as confirmed payment/transaction references — may be
              retained for a limited period as described in our{" "}
              <button
                type="button"
                onClick={() => onOpenLegalDoc?.("privacy")}
                className="text-[#5EEAD4] underline underline-offset-2 cursor-pointer"
              >
                Privacy Policy
              </button>.
            </p>

            {deleteAccountError && (
              <div className="flex items-start space-x-2 bg-red-950/40 border border-red-500/30 text-red-300 text-xs rounded-xl px-3 py-2.5 mb-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{deleteAccountError}</span>
              </div>
            )}

            <label className="block text-xs font-bold text-white/80 mb-1">
              Type <span className="text-red-300">Delete</span> to confirm
            </label>
            <input
              type="text"
              value={deleteAccountConfirmText}
              onChange={(e) => setDeleteAccountConfirmText(e.target.value)}
              placeholder="Delete"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-red-500/20 focus:outline-none focus:border-red-400 text-white placeholder-white/25 mb-4"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowDeleteAccountConfirm(false); setDeleteAccountConfirmText(""); setDeleteAccountError(""); }}
                disabled={isDeletingAccount}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeletingAccount ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes, Delete Permanently</span>
                )}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* ── Account deleted — brief confirmation before signing out ───────── */}
      {deleteAccountSuccess && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div
            className="w-full max-w-sm bg-[#092320] border border-emerald-500/30 rounded-3xl shadow-2xl text-center overflow-y-auto"
            style={{
              maxHeight: "100%",
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)",
            }}
          >
            <div className="p-6 pb-0">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
              <h3 className="font-serif text-lg font-bold text-white mb-1">Account Deleted</h3>
              <p className="text-xs text-white/70">Your Dharmic ID and personal data have been removed. Signing you out...</p>
            </div>
          </div>
        </div>
      )}

      <CertificateRevealModal
        isOpen={documentReveal.isOpen}
        onClose={documentReveal.close}
        imageBlob={documentReveal.imageBlob}
        filename={documentReveal.filename}
      />
      <CertificateRevealModal
        isOpen={templeCertReveal.isOpen}
        onClose={templeCertReveal.close}
        imageBlob={templeCertReveal.imageBlob}
        filename={templeCertReveal.filename}
      />
    </section>
  );
}
