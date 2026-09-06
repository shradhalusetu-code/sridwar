/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ✅ ADDED (2026-09-05): "Send an individual Razorpay payment link, or
// show its QR code, directly from the website" — for a phone booking, an
// in-person darshan counter, or any case with no automated email flow to
// trigger a payment link from. Reuses the SAME staff/vendor access check
// as AdminCertificateGeneration.tsx (see that file for the established
// pattern this follows), and the SAME "qrcode" npm package already used
// for the UPI QR (see src/utils/upiConfig.ts) — generated entirely in the
// browser, no external service, nothing that can be "down".

import { useState, useEffect, useCallback } from "react";
import { CreditCard, ShieldCheck, Lock, ArrowLeft, Copy, Check, AlertTriangle, Send } from "lucide-react";
import QRCode from "qrcode";
import { supabase } from "../lib/supabaseClient";
// ✅ ADDED (2026-09-06 — "Payment Links button/section... header is
// hidden or not properly visible"): same root cause and same fix already
// verified on AdminCertificateGeneration.tsx — this page's fixed
// `min-h-screen ... py-10` wrapper never compensated for the Capacitor
// Android app's fixed-position Navbar (which is taller there, due to the
// status-bar safe-area), so its own heading rendered underneath the
// fixed header. Reusing the project's existing helper rather than
// inventing a second fix for the same bug class.
import { sectionTopPadding, sectionBottomPadding } from "../utils/androidSpacing";
// ✅ ADDED (2026-09-06): mirrors every payment link staff create here into
// the same Inquiry Google Sheet the team already monitors for devotee
// submissions — see the syncToGoogleForm("customer_contact", ...) call in
// handleCreate below. Purely additive logging; does not touch the actual
// Razorpay link creation (/api/admin/payment-links) at all, so a Google
// Forms outage can never block a real payment link from being generated.
import { syncToGoogleForm } from "../utils/googleFormSync";

interface AdminPaymentLinksProps {
  onNavigate: (page: string) => void;
  // ✅ ADDED (2026-09-06): see the androidSpacing import comment above.
  // Optional + defaulted so nothing breaks for any other caller.
  isAndroidApp?: boolean;
}

type AccessState = "checking" | "staff" | "vendor" | "denied";

export default function AdminPaymentLinks({ onNavigate, isAndroidApp = false }: AdminPaymentLinksProps) {
  const [access, setAccess] = useState<AccessState>("checking");
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [result, setResult] = useState<{ shortUrl: string; refId: string } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");

  // ── Access check — same staff/vendor check as the certificate feature ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { if (!cancelled) setAccess("denied"); return; }
      setSessionToken(session.access_token);
      try {
        const res = await fetch("/api/admin/certificates/access-check", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.authorized && data.role === "staff") setAccess("staff");
        else if (data.authorized && data.role === "vendor") setAccess("vendor");
        else setAccess("denied");
      } catch {
        if (!cancelled) setAccess("denied");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const authFetch = useCallback((url: string, init: RequestInit = {}) => {
    return fetch(url, {
      ...init,
      headers: { ...(init.headers || {}), Authorization: `Bearer ${sessionToken}` },
    });
  }, [sessionToken]);

  const handleCreate = async () => {
    setCreateError("");
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setCreateError("Enter a valid amount greater than 0.");
      return;
    }
    if (!phone.trim() && !email.trim()) {
      setCreateError("Enter at least a phone number or email — Razorpay needs one to notify the devotee.");
      return;
    }
    setIsCreating(true);
    setResult(null);
    setQrDataUrl(null);
    try {
      const res = await authFetch("/api/admin/payment-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, amount: amountNum, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create the payment link.");
      setResult({ shortUrl: data.short_url, refId: data.refId });

      // Mirror into the Inquiry Google Sheet so the team has one shared
      // place to see this alongside devotee-submitted inquiries — see the
      // import comment above. Fire-and-forget: never blocks the payment
      // link itself, and never surfaces its own errors to the staff member.
      syncToGoogleForm("customer_contact", {
        name: name || "Staff-Generated Payment Link",
        email,
        phone,
        type: "Admin: Payment Link Created",
        details: `Amount: ₹${amountNum} | Description: ${description || "N/A"} | Link: ${data.short_url} | Ref: ${data.refId}`,
      }).catch((err) => console.error("Admin Payment Link Inquiry sync error:", err));
      // Same client-side QR generation already used for UPI — no network
      // call, nothing that can be "down".
      const qr = await QRCode.toDataURL(data.short_url, {
        width: 520, margin: 2, errorCorrectionLevel: "M",
        color: { dark: "#021816", light: "#FFFFFF" },
      });
      setQrDataUrl(qr);
    } catch (err: any) {
      setCreateError(err?.message || "Something went wrong.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.shortUrl);
    setCopyStatus("copied");
    setTimeout(() => setCopyStatus("idle"), 2000);
  };

  const handleReset = () => {
    setName(""); setPhone(""); setEmail(""); setAmount(""); setDescription("");
    setResult(null); setQrDataUrl(null); setCreateError("");
  };

  return (
    <div className="min-h-screen bg-[#021816] text-white px-4 py-10" style={{ ...sectionTopPadding(isAndroidApp), ...sectionBottomPadding(isAndroidApp) }}>
      <div className="max-w-2xl mx-auto">
        <button
          type="button" onClick={() => onNavigate("plans")}
          className="flex items-center gap-1.5 text-white/50 hover:text-white text-xs font-mono uppercase tracking-wider mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <div className="flex items-center gap-3 mb-2">
          <CreditCard className="w-6 h-6 text-[#FFB347]" />
          <h1 className="font-serif text-2xl font-bold">Payment Links</h1>
        </div>
        <p className="text-white/50 text-sm mb-8">Send an individual Razorpay payment link, or show its QR code</p>

        {access === "checking" && (
          <div className="bg-[#092320] border border-white/10 rounded-2xl p-8 text-center text-white/50">
            Checking your access…
          </div>
        )}

        {access === "denied" && (
          <div className="bg-[#092320] border border-red-500/30 rounded-2xl p-8 text-center">
            <Lock className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p className="text-white/70 text-sm">This page is restricted to Sri Dwar staff and authorized vendors.</p>
          </div>
        )}

        {(access === "staff" || access === "vendor") && (
          <div className="space-y-4">
            {access === "staff" && (
              <div className="flex items-center gap-2 bg-[#092320] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-[#5EEAD4] uppercase tracking-wide w-fit">
                <ShieldCheck className="w-3.5 h-3.5" /> Staff Access
              </div>
            )}

            <div className="bg-[#092320] border border-white/10 rounded-2xl p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-white/70 uppercase tracking-wide mb-1">Devotee Name</label>
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Enter devotee's name"
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label className="block text-xs font-bold text-white/70 uppercase tracking-wide mb-1">Phone Number</label>
                  <input
                    type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                    placeholder="For SMS notification"
                    className="w-full min-w-0 text-sm px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-xs font-bold text-white/70 uppercase tracking-wide mb-1">Email Address</label>
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="For email notification"
                    className="w-full min-w-0 text-sm px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-white/70 uppercase tracking-wide mb-1">Amount (₹) *</label>
                <input
                  type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 501"
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/70 uppercase tracking-wide mb-1">Description (optional)</label>
                <input
                  type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Simple Puja Sankalpa"
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                />
              </div>

              {createError && (
                <p className="flex items-center gap-1.5 text-red-400 text-xs"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {createError}</p>
              )}

              <button
                type="button" onClick={handleCreate} disabled={isCreating}
                className="w-full flex items-center justify-center gap-1.5 bg-[#FFB347] hover:bg-[#ffc169] disabled:opacity-50 text-[#021816] text-sm font-bold uppercase tracking-wide py-3 rounded-xl"
              >
                <Send className="w-4 h-4" /> {isCreating ? "Creating…" : "Generate Payment Link"}
              </button>
            </div>

            {result && (
              <div className="bg-[#092320] border border-[#5EEAD4]/30 rounded-2xl p-5 space-y-4">
                <div>
                  <p className="text-xs font-bold text-white/50 uppercase tracking-wide mb-1">Reference</p>
                  <p className="text-[#FFB347] font-mono text-sm">{result.refId}</p>
                </div>

                <div>
                  <p className="text-xs font-bold text-white/50 uppercase tracking-wide mb-1">Payment Link</p>
                  <div className="flex gap-2">
                    <input readOnly value={result.shortUrl} className="flex-1 min-w-0 text-sm px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white/80" />
                    <button type="button" onClick={handleCopy} className="shrink-0 flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs font-bold uppercase px-4 rounded-xl">
                      {copyStatus === "copied" ? <Check className="w-3.5 h-3.5 text-[#5EEAD4]" /> : <Copy className="w-3.5 h-3.5" />}
                      {copyStatus === "copied" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  {(phone.trim() || email.trim()) && (
                    <p className="text-[11px] text-white/40 mt-1.5">
                      Razorpay has already sent this link {phone.trim() && email.trim() ? "by SMS and email" : phone.trim() ? "by SMS" : "by email"} to the devotee.
                    </p>
                  )}
                </div>

                {qrDataUrl && (
                  <div>
                    <p className="text-xs font-bold text-white/50 uppercase tracking-wide mb-2">Scan to Pay</p>
                    <div className="bg-white rounded-xl p-4 w-fit mx-auto">
                      <img src={qrDataUrl} alt="Payment link QR code" className="w-48 h-48" />
                    </div>
                    <p className="text-[11px] text-white/40 text-center mt-2">Show this on your screen for the devotee to scan in person.</p>
                  </div>
                )}

                <button type="button" onClick={handleReset} className="w-full text-xs text-white/50 hover:text-white text-center">
                  Create another link
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
