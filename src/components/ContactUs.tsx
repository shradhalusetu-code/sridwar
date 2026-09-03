/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from "react";
import { MessageSquare, Phone, Mail, Clock, ShieldCheck, Database, RefreshCw, Send, Check, Landmark, ChevronRight, Download } from "lucide-react";
import { syncToGoogleForm, makeSubmissionRef } from "../utils/googleFormSync";
import { recordFormSubmission, recordActivity } from "../lib/activities";
import { downloadConfirmationMessage } from "../utils/devotionalMessages";
import { useCertificateReveal } from "./shared/useCertificateReveal";
import CertificateRevealModal from "./shared/CertificateRevealModal";
import UPIPaymentModal from "./UPIPaymentModal";
import StoneEngravingNote from "./StoneEngravingNote";
import DisclaimerAcknowledge from "./DisclaimerAcknowledge";
import { validateName, validateEmail, validatePhone } from "../utils/formValidation";
import { gaContactFormStart, gaContactFormSubmit, gaDonationInitiate, gaWhatsAppClick } from "../utils/analytics";
import OptimizedImage from "./OptimizedImage";
// @ts-ignore
import sridwarQR from "../assets/images/SridwarQR.jpg";
// @ts-ignore
import sridwarQRWebp from "../assets/images/SridwarQR.webp";

interface ContactUsProps {
  /** Optional — lets the "Raise Temple Issues" banner below navigate to
   * that page. Safe to omit; the banner simply won't be clickable/won't
   * navigate if absent (existing <ContactUs /> callers are unaffected). */
  onNavigate?: (page: string) => void;
  /** ✅ ADDED — lets a caller (currently the homepage "Add Your Name to
   *  the Sacred Wall" CTA in StoneEngravingNote.tsx, via App.tsx's
   *  offeringDeepLinkId) land a devotee here with the Inquiry Type
   *  already set to "Stone Name Engraving" ("Place Your Name in Divine
   *  Presence"), instead of the default "Puja Clarification". Optional —
   *  omitted callers keep the existing default untouched. Read once on
   *  mount since this component unmounts/remounts every time
   *  currentPage changes in App.tsx. */
  initialInquiryType?: string;
}

export default function ContactUs({ onNavigate, initialInquiryType }: ContactUsProps = {}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [queryType, setQueryType] = useState(initialInquiryType || "Puja Clarification");
  const [comment, setComment] = useState("");
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [donationAmount, setDonationAmount] = useState<number | null>(null);
  const [showDonation, setShowDonation] = useState(false);
  const [showUPI, setShowUPI] = useState(false);
  // ✅ DISCLAIMER COVERAGE: this message is sent immediately on submit —
  // before the optional UPI contribution modal ever opens — so it needs
  // its own acknowledgement rather than relying on the payment modal's,
  // which this flow may never reach.
  const [contactDisclaimerChecked, setContactDisclaimerChecked] = useState(false);
  const [showContactDisclaimerError, setShowContactDisclaimerError] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  // ✅ ADDED (2026-08-30 — this Inquiry flow had no real certificate
  // download at all, only a conditional "Download Confirmation" that only
  // showed up alongside a divine contribution). Uses the general
  // certificate endpoint — register_temple.jpg — which never implies a
  // payment or a performed rite, appropriate for a plain inquiry.
  // ✅ UPDATED — "Certificate" now opens the shared reveal modal (the
  // "unboxing" moment) instead of immediately saving/sharing silently —
  // see shared/useCertificateReveal.ts + shared/CertificateRevealModal.tsx.
  const certificateReveal = useCertificateReveal();
  const openCertificateReveal = () => {
    if (!refId) return;
    const safeName = (name || "Devotee").trim().replace(/\s+/g, "_");
    certificateReveal.open(`/api/certificates/general/${encodeURIComponent(refId)}`, `Sri-Dwar-Certificate-${safeName}.jpg`);
  };
  const [refId, setRefId] = useState("");

  // ── "Submit Message" — fires ONE Pending row to Google Sync immediately,
  // with the divine contribution outcome correctly recorded as "Pending" (not silently
  // dropped/blank). The Skip / Donate buttons below send exactly ONE more
  // Final row sharing the same Ref ID, with the real outcome — see
  // handleSkipDonation / handleDonationConfirmed. ──
  const handleSendMessage = async (e: FormEvent) => {
  e.preventDefault();

  // ── Global validation ────────────────────────────────────────────────────
  const nameErr  = validateName(name);
  const emailErr = validateEmail(email);
  const phoneErr = validatePhone(phone);
  if (nameErr)  { alert(nameErr);  return; }
  if (emailErr) { alert(emailErr); return; }
  if (phoneErr) { alert(phoneErr); return; }
  if (!contactDisclaimerChecked) {
    setShowContactDisclaimerError(true);
    document.getElementById("contact-disclaimer-acknowledge")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  // ────────────────────────────────────────────────────────────────────────

  setIsSyncing(true);
  const newRefId = makeSubmissionRef("SUP");
  setRefId(newRefId);

  try {
    await syncToGoogleForm("customer_contact", {
      name,
      email,
      phone,
      type: queryType,
      details: `${comment} [Contribution: Pending — Awaiting Decision] [Ref: ${newRefId}]`,
    });
    // ✅ FIX: Pending row now also recorded in Supabase, not just Google
    // Forms — previously only the Final row was, so a message abandoned
    // before Skip/Donate showed up in the Google Sheet but was invisible
    // in Supabase, and the two counts didn't match.
    recordFormSubmission({
      formType: "contact_us",
      name, email, phone, refId: newRefId,
      payload: { queryType, comment, contribution: "pending", status: "pending" },
    });

    gaContactFormSubmit(!!phone);

    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
        setShowDonation(true); // ✅ Show divine contribution option after form submission
      }, 1000);
    }
  };

  // Skip Divine Contribution — sends the ONE Final row for this message, with the
  // divine contribution correctly recorded as "Skipped" instead of leaving the
  // earlier "Pending" status to stand in for it.
  const handleSkipDonation = async () => {
    try {
      await syncToGoogleForm("customer_contact", {
        name, email, phone, type: queryType,
        details: `${comment} [Contribution: Skipped] [Ref: ${refId}]`,
      });
    } catch (err) {
      console.error(err);
    } finally {
      recordFormSubmission({
        formType: "contact_us",
        name, email, phone, refId,
        payload: { queryType, comment, contribution: "skipped" },
      });
      setIsSubmitted(true);
      setShowDonation(false);
    }
  };

  // Payment confirmed — sends the ONE Final row for this message, with the
  // divine contribution correctly recorded as the real amount and method paid.
  const handleDonationPaid = async (details: { amount: number; method: "UPI" | "WhatsApp Pay" }) => {
    try {
      await syncToGoogleForm("customer_contact", {
        name, email, phone, type: queryType,
        details: `${comment} [Contribution: ₹${details.amount} via ${details.method}] [Ref: ${refId}]`,
      });
    } catch (err) {
      console.error(err);
    } finally {
      recordFormSubmission({
        formType: "contact_us",
        name, email, phone, refId,
        payload: { queryType, comment, contribution: `₹${details.amount} via ${details.method}` },
      });
      recordActivity({
        activityType: "contribution",
        itemName: `Contact Us Divine Contribution — ${queryType}`,
        amount: details.amount,
        refId,
        paymentMethod: details.method,
        paymentStatus: "pending_verification",
      });
      setShowUPI(false);
      setIsSubmitted(true);
      setShowDonation(false);
    }
  };

  return (
    <section
      id="contact-us-section"
      className="py-24 bg-[#021816] text-left text-white"
      style={{
        paddingTop: `calc(var(--safe-area-inset-top, env(safe-area-inset-top, 24px)) + 96px)`,
        paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + 6rem)`,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Grid split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          
          {/* Left Column: Helplines (cols 5) */}
          <div className="lg:col-span-5 space-y-8 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-xs font-semibold text-[#FFB347]/80 tracking-wider font-mono">Devotee care desk</span>
              <h2 className="text-3xl sm:text-4xl font-serif font-black text-white tracking-tight leading-none">
                Reach Sri Dwar
              </h2>
              <p className="text-xs text-white/70 max-w-sm leading-relaxed">
                Connect directly with our coordinating Pandits and support specialists for custom family pujas, feedback logs, or registration challenges. We resolve queries within 2 hours.
              </p>
            </div>

            {/* Direct Helplines info block */}
            <div className="space-y-4">
              
              {/* WhatsApp Premium link as requested by user */}
              <a
                href="https://wa.me/message/325QR2O5II3IH1"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => gaWhatsAppClick("contact_helpline")}
                className="flex items-center space-x-3.5 p-4 rounded-2xl bg-[#092320] border border-white/10 hover:bg-white/5 transition-colors group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-lg shrink-0">
                  💬
                </div>
                <div>
                  <span className="block text-xs font-bold text-emerald-400">Sri Dwar WhatsApp Helpline</span>
                  <span className="block text-[12px] text-white/50">Click to chat with Devotee Support instantly</span>
                </div>
              </a>

              {/* Email */}
              <div className="flex items-center space-x-3.5 p-4 rounded-2xl bg-[#092320] border border-white/10">
                <Mail className="w-5 h-5 text-[#5EEAD4] shrink-0 shadow-sm" />
                <div>
                  <span className="block text-xs font-bold text-white">Email support desk</span>
                  <a href="mailto:puja@sridwar.com" className="block text-[13px] text-white/50 hover:text-[#5EEAD4] transition-colors">puja@sridwar.com</a>
                </div>
              </div>

               {/* Operating Hours */}
              <div className="flex items-center space-x-3.5 p-4 rounded-2xl bg-[#092320] border border-white/10 text-left">
                <Clock className="w-5 h-5 text-[#FFB347] shrink-0 shadow-sm" />
                <div>
                  <span className="block text-xs font-bold text-white">Operating hours</span>
                  <span className="block text-[13px] text-white/50">04:00 AM – 11:00 PM IST (Daily)</span>
                </div>
              </div>

              {/* Sri Dwar QR code — scan to connect. Same card shape/height as the
                  Helplines/Operating Hours cards above it so the whole column
                  reads as one consistent, aligned set. */}
              <div className="flex items-center space-x-3.5 p-4 rounded-2xl bg-[#092320] border border-white/10 text-left">
                <OptimizedImage
                  src={sridwarQR}
                  webpSrc={sridwarQRWebp}
                  alt="Sri Dwar QR code — scan to connect"
                  loading="lazy"
                  width={44}
                  height={44}
                  className="w-11 h-11 rounded-lg border border-white/10 bg-white p-1 object-contain shrink-0"
                />
                <div>
                  <span className="block text-xs font-bold text-white">Scan to connect</span>
                  <span className="block text-[13px] text-white/50">Sri Dwar QR code — open on your phone camera</span>
                </div>
              </div>
            </div>

            {/* License branding */}
            <div className="text-[12px] text-white/40 font-mono">
              Sri Dwar is a proprietary technology of Shradhalu Private Limited.<br />
              All corporate letters should be addressed to our registered corporate office.
            </div>
          </div>

          {/* Right Column: Submission Form with Sheets Real-Time Sync visualizer (cols 7) */}
          <div className="lg:col-span-7 bg-[#092320] border border-white/10 p-6 sm:p-8 rounded-3xl shadow-xl">
            {showUPI && (
              <UPIPaymentModal
                isOpen={showUPI}
                onClose={() => setShowUPI(false)}
                onPaymentConfirmed={handleDonationPaid}
                amount={donationAmount}
                bookingName="Sri Dwar Temple Divine Contribution"
                devoteeName={name}
                refId={refId}
                allowCustomAmount={true}
                minAmount={5}
                maxAmount={1000}
                isVoluntaryContribution={true}
              />
            )}

            {showDonation && !isSubmitted ? (
              <div className="text-center p-6 space-y-5 animate-slideUp">
                <div className="w-12 h-12 bg-[#FFB347]/10 rounded-full flex items-center justify-center mx-auto border border-[#FFB347]/30">
                  <span className="text-2xl">🙏</span>
                </div>
                <h4 className="font-serif text-lg font-bold text-white">Message Received!</h4>
                <p className="text-xs text-white/60">Would you like to make a voluntary divine contribution to help care for our heritage and our temples — especially the smaller ones that quietly serve their devotees with limited resources or visibility?</p>

                <StoneEngravingNote variant="compact" showRepeatNote className="text-left" />

                <div className="grid grid-cols-3 gap-2">
                  {[51, 101, 251].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setDonationAmount(amt)}
                      className={`text-xs py-2.5 rounded-xl border font-bold transition-all ${donationAmount === amt ? "bg-white/10 border-[#FFB347] text-[#FFB347]" : "bg-black/20 border-white/10 text-white/70 hover:bg-black/30"}`}
                    >₹{amt}</button>
                  ))}
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-white/50 text-xs">₹</span>
                  <input
                    type="number"
                    min={5}
                    max={1000}
                    placeholder="Custom amount (₹5–₹1000)"
                    value={donationAmount || ""}
                    onChange={(e) => setDonationAmount(Math.min(1000, Math.max(5, Number(e.target.value))))}
                    className="flex-1 text-xs px-3 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-white focus:outline-none focus:border-[#FFB347] placeholder-white/30"
                  />
                </div>

                <div className="flex items-start space-x-2 bg-emerald-950/30 border border-emerald-500/20 px-3 py-2 rounded-xl text-[12px] text-emerald-300 font-mono">
                  <ShieldCheck className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>A specific puja will be performed in your name at your ista devta temple, and the certificate for that puja will be shared within 3-7 working days on your WhatsApp & Email. 🙏</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleSkipDonation}
                    className="bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl text-xs border border-white/10 transition-all"
                  >Skip Divine Contribution</button>
                  <button
                    onClick={() => { if (donationAmount && donationAmount >= 5) { gaDonationInitiate(donationAmount); setShowUPI(true); } else alert("Minimum divine contribution is ₹5"); }}
                    disabled={!donationAmount}
                    className="bg-[#FFB347] hover:bg-[#F27D26] disabled:bg-white/10 disabled:text-white/30 text-[#021816] font-extrabold py-3 rounded-xl text-xs uppercase tracking-wide transition-all"
                  >Contribute ₹{donationAmount || 0} 🙏</button>
                </div>
              </div>
            ) : !isSubmitted ? (
              <form onSubmit={handleSendMessage} className="space-y-4">
                <h3 className="font-serif text-lg font-bold text-white mb-2">Devotee Registration & Support Lock</h3>
                
                <p className="text-xs text-white/70">
                  Submit this digital registry form to declare gotra inquiries. Mandatory fields are synced in real-time with our secure Sri Dwar Technology records.
                </p>

                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1">Full Name *</label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    placeholder="e.g. Kunu Rana"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={() => gaContactFormStart()}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white placeholder-white/30 text-left shadow-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email - MANDATORY */}
                  <div>
                    <label className="block text-xs font-bold text-white/80 mb-1">Email Address * (Mandatory)</label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      placeholder="e.g. kunu@shradhalu.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white placeholder-white/30 text-left shadow-sm"
                    />
                  </div>

                  {/* Phone - MANDATORY */}
                  <div>
                    <label className="block text-xs font-bold text-white/80 mb-1">Phone Number * (Mandatory)</label>
                    <input
                      id="contact-phone"
                      type="tel"
                      required
                      placeholder="Mandatory for coordinating priests"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white placeholder-white/30 text-left shadow-sm"
                    />
                  </div>
                </div>

                {/* Query category */}
                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1">Inquiry Type</label>
                  <select
                    id="contact-query-type"
                    value={queryType}
                    onChange={(e) => setQueryType(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-[#5EEAD4] bg-[#021816] text-[#5EEAD4] shadow-sm font-semibold"
                  >
                    <option value="Puja Clarification" className="bg-[#092320] text-white">Online Puja/Sankalpa clarification</option>
                    <option value="Prasad Courier" className="bg-[#092320] text-white">Prasad Shipment & Courier query</option>
                    <option value="Corporate Shradhalu Private Limited" className="bg-[#092320] text-white">Shradhalu Private Ltd corporate inquiry</option>
                    <option value="Feedback / Suggestions" className="bg-[#092320] text-white">Devotee Feedback & Suggestions</option>
                    <option value="Bespoke Family Pooja" className="bg-[#092320] text-white">Bespoke customized Family Puja schedule</option>
                    {/* ✅ ADDED — reached via the homepage "Add Your Name to the
                        Sacred Wall" CTA (StoneEngravingNote.tsx). Uses this
                        SAME form + the SAME voluntary-contribution step below
                        (StoneEngravingNote + amount tiers) — no separate or
                        duplicate flow. */}
                    <option value="Stone Name Engraving" className="bg-[#092320] text-white">Place Your Name in Divine Presence</option>
                  </select>
                </div>

                {/* Feedback Comment */}
                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1">Your detailed Message</label>
                  <textarea
                    id="contact-comments"
                    rows={3}
                    placeholder="Provide details of your request so our temple pundits can review it..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full text-xs p-3.5 rounded-xl border border-white/10 bg-[#021816] text-white focus:outline-none focus:border-[#5EEAD4] placeholder-white/30 text-left shadow-sm"
                  />
                </div>

                {/* Sri Dwar Technology sync status panel */}
                <div className="flex items-center space-x-2 text-[12px] font-mono text-[#5EEAD4] bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                  <Database className="w-3.5 h-3.5 fill-[#5EEAD4]/20 text-[#5EEAD4]" />
                  <span>Powered by Sri Dwar Technology</span>
                </div>

                {/* Required acknowledgement — gates Submit below. */}
                <div id="contact-disclaimer-acknowledge">
                  <DisclaimerAcknowledge
                    summary="With care, we keep your details simply to respond to your message and keep you gently updated — never shared beyond what's needed to help you."
                    details="With care and warmth, Sri Dwar keeps your name, email and phone number to respond to your message, coordinate with the relevant temple priest or team where needed, and share status updates with you. We never sell your details or share them beyond what's needed to help with this request. Response times can vary a little depending on the query and season; we lovingly aim to respond within 2 working days, though this isn't a fixed or guaranteed turnaround."
                    checked={contactDisclaimerChecked}
                    onCheckedChange={(v) => { setContactDisclaimerChecked(v); if (v) setShowContactDisclaimerError(false); }}
                    checkboxLabel="I understand and agree to the above before sending my message."
                    showRequiredError={showContactDisclaimerError}
                  />
                </div>

                {/* Submit action */}
                <button
                  id="submit-contact-form"
                  type="submit"
                  disabled={isSyncing}
                  className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold py-3.5 rounded-xl text-xs transition-all tracking-widest shadow flex items-center justify-center space-x-1.5 cursor-pointer uppercase"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Syncing with Shradhalu spreadsheet database...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>SUBMIT</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              // SUBMITTED SUCCESS BLOCK
              <div className="text-center p-8 space-y-5 animate-slideUp">
                <div className="w-14 h-14 bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                  <Check className="w-6 h-6 text-emerald-400 stroke-[3]" />
                </div>

                <div className="space-y-1">
                  <h4 className="font-serif text-xl font-bold text-[#5EEAD4]">Inquiry Successfully Synced!</h4>
                  <p className="text-[12px] text-white/40 font-mono">Reference Ticket: {refId}</p>
                </div>

                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left text-xs leading-relaxed text-white/80">
                  Dear <strong>{name}</strong>, your message on <span className="font-bold">{queryType}</span> has been written directly to Shradhalu Private Limited's secure Sri Dwar Technology records. Our Pandit desk has received your phone number: <strong>{phone}</strong> and email: <strong>{email}</strong>, and will contact you shortly!
                </div>

                {/* Spreadsheet confirm */}
                <div className="flex items-center justify-center space-x-1.5 text-[12px] font-mono text-emerald-400 bg-emerald-950/20 py-1.5 rounded-lg border border-emerald-500/20">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Automated Real-Time synchronization completed</span>
                </div>

                {certificateReveal.error && (
                  <p className="text-[11px] text-red-300 bg-red-950/30 border border-red-500/20 rounded-lg px-2.5 py-1.5">
                    {certificateReveal.error}
                  </p>
                )}
                {/* ✅ UPDATED — opens the shared reveal modal instead of two
                    separate Download/Share buttons; Save and Share now
                    live inside the modal itself. */}
                <button
                  id="download-certificate-btn"
                  type="button"
                  disabled={certificateReveal.isLoading}
                  onClick={openCertificateReveal}
                  className="w-full flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-60 border border-white/15 text-[#5EEAD4] font-bold py-3 rounded-xl text-[11px] transition-all tracking-wide uppercase cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> {certificateReveal.isLoading ? "Preparing…" : "Certificate"}
                </button>

                {donationAmount ? (
                  <button
                    id="download-confirmation-btn"
                    onClick={() =>
                      downloadConfirmationMessage({
                        category: "support_contribution",
                        serviceName: `Divine Contribution — ${queryType}`,
                        devoteeName: name,
                        refId,
                      })
                    }
                    className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/15 text-[#5EEAD4] font-bold py-3 rounded-xl text-xs transition-all tracking-wide uppercase cursor-pointer"
                  >
                    <Download className="w-4 h-4" /> Download Confirmation
                  </button>
                ) : null}

                <button
                  id="contact-button-reset"
                  onClick={() => {
                    setIsSubmitted(false);
                    setShowDonation(false);
                    setDonationAmount(null);
                    setRefId("");
                    setName(""); setEmail(""); setPhone("");
                    setQueryType("Puja Clarification"); setComment("");
                  }}
                  className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold py-3.5 rounded-xl text-xs transition-all uppercase tracking-wider cursor-pointer"
                >
                  Submit another ticket
                </button>
              </div>
            )}
          </div>

        </div>

        {/* ── New section below Support: Raise Temple Issues With Elected
             Representatives (https://sridwar.com/Report-Temple-Issues).
             Purely additive — does not change anything above. ── */}
        <button
          type="button"
          onClick={() => onNavigate?.("report-temple-issues")}
          className="w-full mt-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left bg-[#092320] border border-white/10 hover:border-[#FFB347]/40 hover:bg-white/5 transition-colors rounded-3xl p-6 sm:p-8 cursor-pointer"
        >
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-[#FFB347]/10 border border-[#FFB347]/30 flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5 text-[#FFB347]" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-white">Raise Temple Issues With Elected Representatives</h3>
              <p className="text-xs text-white/60 mt-1 max-w-xl md:max-w-none">
                <span className="block text-white font-semibold mb-1">Protect What Our Ancestors Preserved</span>
                From the smallest village shrine to great temple celebrations, help bring attention to what
                matters. Share your concerns, suggestions, and ideas, and direct them to the appropriate
                local, district, state, or national representatives.
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-xs font-bold text-[#FFB347] shrink-0 self-end sm:self-center">
            Raise an issue <ChevronRight className="w-4 h-4" />
          </span>
        </button>

      </div>

      <CertificateRevealModal
        isOpen={certificateReveal.isOpen}
        onClose={certificateReveal.close}
        imageBlob={certificateReveal.imageBlob}
        filename={certificateReveal.filename}
      />
    </section>
  );
}
