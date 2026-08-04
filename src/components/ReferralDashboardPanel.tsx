/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Referral Dashboard — lives inside the Dharmic ID page (AuthDashboard).
 * Shows the devotee/priest/temple's unique referral link, referral list
 * (with consent-gated contact details), earnings, payouts, subscription
 * status, and the legal acceptance checkbox required before the link can
 * be shared. Reads/writes through lib/referrals.ts, which is defensive —
 * this panel renders a sensible empty state even before
 * supabase_schema_referrals.sql has been applied.
 */

import { useEffect, useState } from "react";
import {
  Share2, Copy, Check, Users, Wallet, TrendingUp, ShieldCheck, Lock,
  BadgeCheck, ChevronRight, Gift,
} from "lucide-react";
import {
  fetchOrCreateReferralProfile, acceptReferralTerms, fetchReferralList,
  fetchPayoutHistory, requestPayout, buildReferralLink, ReferralProfile,
  ReferralListItem, PayoutRecord,
} from "../lib/referrals";
import {
  COMMISSION_STRUCTURE, findPlanTierById, isDevoteeTier, PLAN_CATEGORIES,
  REFERRAL_PAYOUT_THRESHOLD, REFERRAL_KYC_THRESHOLD,
} from "../data/referralProgram";

const REFERRAL_TERMS_VERSION = "2026-08-01";

interface ReferralDashboardPanelProps {
  userProfile: { name: string; email: string };
  onOpenLegalDoc?: (doc: string) => void;
}

export default function ReferralDashboardPanel({ userProfile, onOpenLegalDoc }: ReferralDashboardPanelProps) {
  const [profile, setProfile] = useState<ReferralProfile | null>(null);
  const [referrals, setReferrals] = useState<ReferralListItem[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [acceptChecked, setAcceptChecked] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [payoutMessage, setPayoutMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const p = await fetchOrCreateReferralProfile(userProfile.email || userProfile.name);
      const [refs, pay] = await Promise.all([fetchReferralList(), fetchPayoutHistory()]);
      if (!cancelled) {
        setProfile(p);
        setReferrals(refs);
        setPayouts(pay);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile.email]);

  const termsAccepted = !!profile?.termsAcceptedAt;
  const referralLink = profile ? buildReferralLink(profile.dharmicRefCode) : "";
  const activeReferrals = referrals.filter((r) => r.status === "active").length;
  const kycRequired = (profile?.lifetimeCommission ?? 0) >= REFERRAL_KYC_THRESHOLD;
  const canRequestPayout = (profile?.ledgerBalance ?? 0) >= REFERRAL_PAYOUT_THRESHOLD && (!kycRequired || profile?.kycStatus === "verified");

  // Six fully separate plan systems (see data/referralProgram.ts) share this
  // one profile column, so resolve which one — and which tier — by id rather
  // than assuming it matches any locally-selected category.
  const activePlan = findPlanTierById(profile?.subscriptionTier);
  const currentTierDef = activePlan?.tier;
  const currentCategoryLabel = activePlan ? PLAN_CATEGORIES.find((c) => c.id === activePlan.categoryId)?.tabLabel : undefined;
  const currentTierRateLabel = currentTierDef
    ? (isDevoteeTier(currentTierDef) ? `${currentTierDef.cashbackRatePercent}% Cashback` : currentTierDef.commissionEligibility)
    : undefined;

  const handleAccept = async () => {
    if (!acceptChecked || accepting) return;
    setAccepting(true);
    const ok = await acceptReferralTerms(REFERRAL_TERMS_VERSION);
    if (ok && profile) setProfile({ ...profile, termsAcceptedAt: new Date().toISOString() });
    else if (profile) setProfile({ ...profile, termsAcceptedAt: new Date().toISOString() }); // optimistic even pre-migration
    setAccepting(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable — ignore */ }
  };

  const handleShare = async () => {
    const text = `Join me on Sri Dwar and book pujas, sevas & Darshan easily 🙏 ${referralLink}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Sri Dwar", text, url: referralLink }); } catch { /* user cancelled */ }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  const handleRequestPayout = async () => {
    if (!canRequestPayout || requestingPayout || !profile) return;
    setRequestingPayout(true);
    const ok = await requestPayout(profile.ledgerBalance);
    setPayoutMessage(ok
      ? "Payout requested — you'll see it move to 'Processing' once verified."
      : "Couldn't submit the request right now. Please try again shortly.");
    setRequestingPayout(false);
  };

  if (loading) {
    return (
      <div id="referral-dashboard-panel" className="w-full bg-[#092320] border border-white/10 rounded-3xl p-5 text-center text-white/50 text-xs">
        Loading your Referral Dashboard…
      </div>
    );
  }

  return (
    <div id="referral-dashboard-panel" className="w-full bg-[#092320] border border-white/10 rounded-3xl p-5 text-left text-white space-y-4">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">🤲</span>
          <h4 className="font-serif text-sm font-bold text-white uppercase tracking-wider">
            Refer, Earn & Grow — My Referral Dashboard
          </h4>
        </div>
      </div>

      {/* Legal acceptance gate */}
      {!termsAccepted && (
        <div className="bg-[#021816] border border-[#FFB347]/30 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 text-[#FFB347] mt-0.5 shrink-0" />
            <p className="text-[11px] text-white/70 leading-relaxed">
              Accept the Program Terms to activate your referral link and start earning cashback.
            </p>
          </div>
          <label className="flex items-start gap-2 text-[10px] text-white/60 cursor-pointer">
            <input
              id="referral-terms-accept-checkbox"
              type="checkbox"
              checked={acceptChecked}
              onChange={(e) => setAcceptChecked(e.target.checked)}
              className="mt-0.5 accent-[#FFB347]"
            />
            <span>
              I have read and agree to the{" "}
              <button type="button" onClick={() => onOpenLegalDoc?.("referral")} className="text-[#FFB347] underline underline-offset-2">Refer & Earn Program Terms</button>,{" "}
              <button type="button" onClick={() => onOpenLegalDoc?.("privacy")} className="text-[#FFB347] underline underline-offset-2">Privacy Policy</button>, and{" "}
              <button type="button" onClick={() => onOpenLegalDoc?.("disclaimer")} className="text-[#FFB347] underline underline-offset-2">Legal Disclaimer</button>.
            </span>
          </label>
          <button
            id="referral-terms-accept-btn"
            onClick={handleAccept}
            disabled={!acceptChecked || accepting}
            className="w-full text-center text-[11px] font-bold px-3 py-2 rounded-full bg-[#FFB347] text-[#021816] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {accepting ? "Activating…" : "Accept & Activate My Referral Link"}
          </button>
        </div>
      )}

      {/* Referral link */}
      <div className={termsAccepted ? "" : "opacity-40 pointer-events-none select-none"}>
        <span className="text-[9px] text-white/50 uppercase tracking-wider block mb-1">Your Dharmic ID Referral Link</span>
        <div className="flex items-center gap-2 bg-[#021816] border border-white/10 rounded-xl px-3 py-2">
          <span className="text-[11px] font-mono text-[#5EEAD4] truncate flex-1">{referralLink || "Generating…"}</span>
          <button onClick={handleCopy} className="text-white/60 hover:text-white shrink-0" aria-label="Copy referral link">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button onClick={handleShare} className="text-white/60 hover:text-white shrink-0" aria-label="Share referral link">
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-[#021816] border border-white/5 rounded-xl p-2.5 text-center">
          <Users className="w-3.5 h-3.5 text-[#5EEAD4] mx-auto mb-1" />
          <span className="block text-base font-serif font-black text-white">{referrals.length}</span>
          <span className="block text-[9px] text-white/45">Total Referrals</span>
        </div>
        <div className="bg-[#021816] border border-white/5 rounded-xl p-2.5 text-center">
          <TrendingUp className="w-3.5 h-3.5 text-[#5EEAD4] mx-auto mb-1" />
          <span className="block text-base font-serif font-black text-white">{activeReferrals}</span>
          <span className="block text-[9px] text-white/45">Active</span>
        </div>
        <div className="bg-[#021816] border border-white/5 rounded-xl p-2.5 text-center">
          <Wallet className="w-3.5 h-3.5 text-[#FFB347] mx-auto mb-1" />
          <span className="block text-base font-serif font-black text-[#FFB347]">₹{(profile?.lifetimeCommission ?? 0).toLocaleString("en-IN")}</span>
          <span className="block text-[9px] text-white/45">Total Cashback Earned</span>
        </div>
        <div className="bg-[#021816] border border-white/5 rounded-xl p-2.5 text-center">
          <Gift className="w-3.5 h-3.5 text-[#FFB347] mx-auto mb-1" />
          <span className="block text-base font-serif font-black text-[#FFB347]">₹{(profile?.ledgerBalance ?? 0).toLocaleString("en-IN")}</span>
          <span className="block text-[9px] text-white/45">Available Balance</span>
        </div>
      </div>

      {/* Commission structure quick reference */}
      <div className="grid grid-cols-3 gap-2">
        {COMMISSION_STRUCTURE.map((c) => (
          <div key={c.bookingLabel} className="bg-[#021816] border border-white/5 rounded-lg p-2 text-center">
            <span className="block text-sm font-serif font-black text-[#FFB347]">{c.rate}%</span>
            <span className="block text-[8px] text-white/45 uppercase">{c.bookingLabel}</span>
          </div>
        ))}
      </div>

      {/* Subscription status */}
      <div className="bg-[#021816] border border-white/10 rounded-2xl p-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Subscription Status</span>
        </div>
        {profile?.subscriptionTier && profile.subscriptionTier !== "none" ? (
          <div className="flex items-center gap-2 flex-wrap">
            <BadgeCheck className="w-4 h-4 text-[#FFB347]" />
            <span className="text-xs font-bold text-white">{currentTierDef?.name ?? profile.subscriptionTier} Plan</span>
            {currentCategoryLabel && (
              <span className="text-[9px] font-mono text-white/40 bg-white/5 px-1.5 py-0.5 rounded-full">{currentCategoryLabel}</span>
            )}
            {currentTierRateLabel && <span className="text-[10px] text-white/50">· {currentTierRateLabel}</span>}
          </div>
        ) : (
          <p className="text-[10px] text-white/50">
            No active plan yet — you're on standard <span className="font-black text-[#FFB347]">3%</span> / <span className="font-black text-[#FFB347]">2%</span> / <span className="font-black text-[#FFB347]">1%</span> cashback rates.
            Visit the homepage "Refer, Earn & Grow with Dharma" section to join a free Devotee Circle (unlocks automatically as your own bookings and community contributions grow), or set up a paid service-listing plan if you're a Pujari, Mandal, Yoga Guru, Dharmic Expert, or Seva Provider.
          </p>
        )}
      </div>

      {/* KYC + payout */}
      <div className="bg-[#021816] border border-white/10 rounded-2xl p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#5EEAD4]" />
            <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">KYC Status</span>
          </div>
          <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border font-bold uppercase ${
            profile?.kycStatus === "verified" ? "border-emerald-500/30 text-emerald-300 bg-emerald-950/40"
            : kycRequired ? "border-amber-400/30 text-amber-300 bg-amber-950/30"
            : "border-white/10 text-white/40 bg-white/5"
          }`}>
            {profile?.kycStatus === "verified" ? "Verified" : kycRequired ? "Required" : "Not Yet Required"}
          </span>
        </div>
        <p className="text-[10px] text-white/45">
          KYC becomes mandatory once your accumulated cashback crosses ₹{REFERRAL_KYC_THRESHOLD.toLocaleString("en-IN")}. Minimum payout balance is ₹{REFERRAL_PAYOUT_THRESHOLD.toLocaleString("en-IN")}.
        </p>
        <button
          onClick={handleRequestPayout}
          disabled={!canRequestPayout || requestingPayout}
          className="w-full text-center text-[11px] font-bold px-3 py-2 rounded-full border border-[#FFB347]/40 text-[#FFB347] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#FFB347] hover:text-[#021816] transition-all"
        >
          {requestingPayout ? "Requesting…" : `Request Payout of ₹${(profile?.ledgerBalance ?? 0).toLocaleString("en-IN")}`}
        </button>
        {payoutMessage && <p className="text-[10px] text-[#5EEAD4] text-center">{payoutMessage}</p>}
      </div>

      {/* Referral list */}
      <div>
        <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider block mb-2">My Referrals</span>
        {referrals.length > 0 ? (
          <div className="space-y-2">
            {referrals.map((r) => (
              <div key={r.id} className="bg-[#021816] border border-white/5 rounded-xl p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white block truncate">{r.referredName || "Devotee"}</span>
                  <span className="text-[10px] text-white/45 block truncate">
                    {r.contactConsent ? (r.referredEmail || r.referredPhone || "Contact shared") : "Contact hidden — awaiting their consent"}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold text-[#FFB347] block">{r.bookingCount} booking{r.bookingCount === 1 ? "" : "s"}</span>
                  <span className="text-[9px] text-white/40 capitalize">{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-white/40 italic">
            No referrals yet — share your link above. Once someone books using it, they'll appear here with their booking history and your cashback, linked to your Dharmic ID.
          </p>
        )}
      </div>

      {/* Payout history */}
      {payouts.length > 0 && (
        <div>
          <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider block mb-2">Payout History</span>
          <div className="space-y-1.5">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-[10px] bg-[#021816] border border-white/5 rounded-lg px-3 py-2">
                <span className="text-white/60">{new Date(p.requestedAt).toLocaleDateString()}</span>
                <span className="text-[#FFB347] font-bold">₹{p.amount.toLocaleString("en-IN")}</span>
                <span className="text-white/40 capitalize">{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => onOpenLegalDoc?.("referral")}
        className="w-full flex items-center justify-center gap-1 text-[10px] text-white/40 hover:text-[#FFB347] pt-1"
      >
        View full Refer & Earn Program Terms <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}
