/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from "react";
import { MessageSquare, Phone, Mail, Clock, ShieldCheck, Database, RefreshCw, Send, Check } from "lucide-react";
import { syncToGoogleForm, makeSubmissionRef } from "../utils/googleFormSync";
import UPIPaymentModal from "./UPIPaymentModal";
import { validateName, validateEmail, validatePhone } from "../utils/formValidation";
import { gaContactFormStart, gaContactFormSubmit, gaDonationInitiate, gaWhatsAppClick } from "../utils/analytics";

export default function ContactUs() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [queryType, setQueryType] = useState("Puja Clarification");
  const [comment, setComment] = useState("");
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [donationAmount, setDonationAmount] = useState<number | null>(null);
  const [showDonation, setShowDonation] = useState(false);
  const [showUPI, setShowUPI] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [refId, setRefId] = useState("");

  // ── "Submit Message" — fires ONE Pending row to Google Sync immediately,
  // with the donation outcome correctly recorded as "Pending" (not silently
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

    gaContactFormSubmit(!!phone);

    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
        setShowDonation(true); // ✅ Show donation option after form submission
      }, 1000);
    }
  };

  // Skip Donation — sends the ONE Final row for this message, with the
  // contribution correctly recorded as "Skipped" instead of leaving the
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
      setIsSubmitted(true);
      setShowDonation(false);
    }
  };

  // Payment confirmed — sends the ONE Final row for this message, with the
  // contribution correctly recorded as the real amount and method paid.
  const handleDonationPaid = async (details: { amount: number; method: "UPI" | "WhatsApp Pay" }) => {
    try {
      await syncToGoogleForm("customer_contact", {
        name, email, phone, type: queryType,
        details: `${comment} [Contribution: ₹${details.amount} via ${details.method}] [Ref: ${refId}]`,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setShowUPI(false);
      setIsSubmitted(true);
      setShowDonation(false);
    }
  };

  return (
    <section id="contact-us-section" className="py-24 bg-[#021816] text-left text-white" style={{ paddingTop: `calc(env(safe-area-inset-top, 0px) + 80px)` }}>
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
                  <span className="block text-[10px] text-white/50">Click to chat with Devotee Support instantly</span>
                </div>
              </a>

              {/* Email */}
              <div className="flex items-center space-x-3.5 p-4 rounded-2xl bg-[#092320] border border-white/10">
                <Mail className="w-5 h-5 text-[#5EEAD4] shrink-0 shadow-sm" />
                <div>
                  <span className="block text-xs font-bold text-white">Email support desk</span>
                  <a href="mailto:puja@sridwar.com" className="block text-[11px] text-white/50 hover:text-[#5EEAD4] transition-colors">puja@sridwar.com</a>
                </div>
              </div>

               {/* Operating Hours */}
              <div className="flex items-center space-x-3.5 p-4 rounded-2xl bg-[#092320] border border-white/10 text-left">
                <Clock className="w-5 h-5 text-[#FFB347] shrink-0 shadow-sm" />
                <div>
                  <span className="block text-xs font-bold text-white">Operating hours</span>
                  <span className="block text-[11px] text-white/50">04:00 AM – 11:00 PM IST (Daily)</span>
                </div>
              </div>
            </div>

            {/* License branding */}
            <div className="text-[10px] text-white/40 font-mono">
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
                bookingName="Sri Dwar Temple Donation"
                devoteeName={name}
                refId={refId}
                allowCustomAmount={true}
                minAmount={5}
                maxAmount={1000}
              />
            )}

            {showDonation && !isSubmitted ? (
              <div className="text-center p-6 space-y-5 animate-slideUp">
                <div className="w-12 h-12 bg-[#FFB347]/10 rounded-full flex items-center justify-center mx-auto border border-[#FFB347]/30">
                  <span className="text-2xl">🙏</span>
                </div>
                <h4 className="font-serif text-lg font-bold text-white">Message Received!</h4>
                <p className="text-xs text-white/60">Would you like to make a voluntary contribution to our temple projects?</p>

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

                <div className="flex items-start space-x-2 bg-emerald-950/30 border border-emerald-500/20 px-3 py-2 rounded-xl text-[10px] text-emerald-300 font-mono">
                  <ShieldCheck className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>An acknowledgement certificate will be shared within 24 hours on your WhatsApp & Email. 🙏</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleSkipDonation}
                    className="bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl text-xs border border-white/10 transition-all"
                  >Skip Donation</button>
                  <button
                    onClick={() => { if (donationAmount && donationAmount >= 5) { gaDonationInitiate(donationAmount); setShowUPI(true); } else alert("Minimum donation is ₹5"); }}
                    disabled={!donationAmount}
                    className="bg-[#FFB347] hover:bg-[#F27D26] disabled:bg-white/10 disabled:text-white/30 text-[#021816] font-extrabold py-3 rounded-xl text-xs uppercase tracking-wide transition-all"
                  >Donate ₹{donationAmount || 0} 🙏</button>
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
                <div className="flex items-center space-x-2 text-[10px] font-mono text-[#5EEAD4] bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                  <Database className="w-3.5 h-3.5 fill-[#5EEAD4]/20 text-[#5EEAD4]" />
                  <span>Powered by Sri Dwar Technology</span>
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
                      <span>SUBMIT MESSAGE TO DEVOTEE Care</span>
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
                  <p className="text-[10px] text-white/40 font-mono">Reference Ticket: {refId}</p>
                </div>

                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left text-xs leading-relaxed text-white/80">
                  Dear <strong>{name}</strong>, your message on <span className="font-bold">{queryType}</span> has been written directly to Shradhalu Private Limited's secure Sri Dwar Technology records. Our Pandit desk has received your phone number: <strong>{phone}</strong> and email: <strong>{email}</strong>, and will contact you shortly!
                </div>

                {/* Spreadsheet confirm */}
                <div className="flex items-center justify-center space-x-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/20 py-1.5 rounded-lg border border-emerald-500/20">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Automated Real-Time synchronization completed</span>
                </div>

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

      </div>
    </section>
  );
}
