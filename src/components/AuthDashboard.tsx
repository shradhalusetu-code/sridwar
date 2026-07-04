/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect, FormEvent } from "react";
import { User, ShieldCheck, Mail, Phone, Calendar, RefreshCw, LogOut, Award, Layers, Plus, Trash2, Save } from "lucide-react";
import { Language, TRANSLATIONS } from "../data/translations";
import { TEMPLES_LIST } from "../data/temples";
import SriDwarLogo from "./SriDwarLogo";
import dharmicIdBg from "../assets/images/Dharmic_ID.jpg";
import sridwarQR from "../assets/images/SridwarQR.jpg";
import UPIPaymentModal from "./UPIPaymentModal";
import { syncToGoogleForm } from "../utils/googleFormSync";
import { gaRegistrationSubmit, gaLogin, gaDonationInitiate } from "../utils/analytics";

interface FamilyMember {
  name: string;
  relation: string;
}

interface AuthDashboardProps {
  currentLanguage: Language;
  isLoggedIn: boolean;
  onLoginSuccess: (name: string, email: string) => void;
  onLogout: () => void;
  userProfile: { name: string; email: string };
  bookedItems: Array<{ pujaName: string; price: number; refId: string; date: string }>;
}

export default function AuthDashboard({
  currentLanguage,
  isLoggedIn,
  onLoginSuccess,
  onLogout,
  userProfile,
  bookedItems
}: AuthDashboardProps) {
  const [userNameField, setUserNameField] = useState("");
  const [userEmailField, setUserEmailField] = useState("");
  const [userGotra, setUserGotra] = useState("Vatsasa Gotra");
  const [userRashi, setUserRashi] = useState("Dhanu (Sagittarius)");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dharmic ID generation step + temple-redevelopment contribution step
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

  // Sync profile details on mount or auth state change
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
    } else {
      // Reset the Dharmic ID generation flow back to the start after logout
      setAuthStep("login");
      setPendingLogin(null);
      setSelectedTempleId("");
      setCustomMandapName("");
      setCustomMandapAddress("");
      setContributionAmount(0);
    }
  }, [isLoggedIn]);

  const handleSaveProfile = (e: FormEvent) => {
    e.preventDefault();
    const profile = {
      name: userProfile.name,
      email: userProfile.email,
      gotra: userGotra,
      rashi: userRashi,
      phone: userPhone,
      family: familyMembers
    };
    localStorage.setItem("sridwar_sacred_profile", JSON.stringify(profile));
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
  };

  const t = TRANSLATIONS[currentLanguage];

  const handleGoogleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (!userNameField || !userEmailField) {
      alert("Please specify a Devotee Name and Email to register your Digital Gotra identity.");
      return;
    }

    setIsLoggingIn(true);
    setTimeout(() => {
      setPendingLogin({ name: userNameField, email: userEmailField });
      setIsLoggingIn(false);
      setAuthStep("contribute");
      gaRegistrationSubmit("devotee_registration");
    }, 1200);
  };

  // Step 7 — Skip Contribution: go directly to Dharmic Portal
  const handleSkipContribution = () => {
    if (pendingLogin) {
      gaLogin("email");
      onLoginSuccess(pendingLogin.name, pendingLogin.email);
    }
  };

  // Step 2 — Contribute clicked: validate amount then show Puja Sankalpa Portal
  const handleProceedToContributionPayment = () => {
    if (!contributionAmount || contributionAmount <= 0) return;
    gaDonationInitiate(contributionAmount);
    setContributionRefId("SDC-" + Math.floor(100000 + Math.random() * 900000));
    setShowSankalpaForm(true);
  };

  // Step 4 — Sankalpa form submitted: sync to Google Form (Pending row) then open payment
  const handleSankalpaSubmit = (e: FormEvent) => {
    e.preventDefault();
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
      name:         pendingLogin?.name || "",
      email:        pendingLogin?.email || "",
      phone:        sankalpaPhone.trim(),
      gotra:        sankalpaGotra || userGotra || undefined,
      intent:       sankalpaIntent || undefined,
      type:         `Temple Redevelopment Contribution — ${templeName}`,
      details:      `Contribution: ₹${contributionAmount} | Payment Status: Pending — Awaiting Confirmation | Temple: ${templeName} | Gotra: ${sankalpaGotra || userGotra || "Not provided"} | Intent: ${sankalpaIntent || "General blessings"} | Ref: ${contributionRefId}`,
      fee:          contributionAmount,
      temple:       templeName,
      whatsapp:     sankalpaPhone.trim(),
      city:         customMandapAddress || "Online Devotee",
    });

    setShowSankalpaForm(false);
    setIsContributionPaymentOpen(true);
  };

  // Step 6 — After payment confirmed: send the ONE Final row (same Ref ID),
  // with payment status corrected to "Paid — Confirmed" and the real method
  // (UPI or WhatsApp Pay) + actual confirmed amount — then redirect to the
  // Dharmic Portal.
  const finalizeContribution = (details: { amount: number; method: "UPI" | "WhatsApp Pay" }) => {
    setIsContributionPaymentOpen(false);
    const templeName = selectedTempleId
      ? TEMPLES_LIST.find((t) => t.id === selectedTempleId)?.name || "Selected Temple"
      : customMandapName || "Custom Mandap";
    syncToGoogleForm("seva_booking", {
      name:         pendingLogin?.name || "",
      email:        pendingLogin?.email || "",
      phone:        sankalpaPhone.trim(),
      gotra:        sankalpaGotra || userGotra || undefined,
      intent:       sankalpaIntent || undefined,
      type:         `Temple Redevelopment Contribution — ${templeName}`,
      details:      `Contribution: ₹${details.amount} | Payment Status: Paid — Confirmed | Payment Method: ${details.method} | Temple: ${templeName} | Gotra: ${sankalpaGotra || userGotra || "Not provided"} | Intent: ${sankalpaIntent || "General blessings"} | Ref: ${contributionRefId}`,
      fee:          details.amount,
      temple:       templeName,
      whatsapp:     sankalpaPhone.trim(),
      city:         customMandapAddress || "Online Devotee",
    });
    if (pendingLogin) {
      gaLogin("email_with_contribution");
      onLoginSuccess(pendingLogin.name, pendingLogin.email);
    }
  };

  // Note: previously this dashboard showed a hardcoded "simulatedHistory"
  // list of completed pujas to every devotee regardless of whether they had
  // actually booked anything — i.e. fabricated personal account history.
  // That has been removed; the dashboard now only shows a devotee's real
  // bookedItems (from this browser session) and an honest empty state.

  return (
    <section id="auth-dashboard-section" className="py-24 bg-[#021816] text-left text-white" style={{ paddingTop: `calc(env(safe-area-inset-top, 0px) + 80px)` }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Conditional Layout based on Logon Status */}
        {!isLoggedIn ? (
          
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

            {authStep === "login" && (
            <form onSubmit={handleGoogleLogin} className="space-y-4">
              
              {/* Devotee Name */}
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

              <div className="grid grid-cols-2 gap-4 text-left">
                {/* Gotra */}
                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1">Gotra Ancestry</label>
                  <input
                    id="login-field-gotra"
                    type="text"
                    value={userGotra}
                    onChange={(e) => setUserGotra(e.target.value)}
                    placeholder="e.g. Kashyap Gotra"
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#5EEAD4] bg-[#021816] text-white font-medium placeholder-white/30 text-left"
                  />
                </div>
                {/* Rashi */}
                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1">Moon Sign (Rashi)</label>
                  <select
                    id="login-field-rashi"
                    value={userRashi}
                    onChange={(e) => setUserRashi(e.target.value)}
                    className="w-full text-xs px-2.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-[#5EEAD4] font-medium"
                  >
                    <option value="Mesh (Aries)">Mesh (Aries)</option>
                    <option value="Vrishabh (Taurus)">Vrishabh (Taurus)</option>
                    <option value="Mithun (Gemini)">Mithun (Gemini)</option>
                    <option value="Dhanu (Sagittarius)">Dhanu (Sagittarius)</option>
                    <option value="Meen (Pisces)">Meen (Pisces)</option>
                  </select>
                </div>
              </div>

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
                    <span className="tracking-wider">GENERATE DIGITAL DHARMIC ID</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center space-x-1.5 text-[10px] font-mono text-[#5EEAD4] bg-white/5 py-1.5 rounded-lg border border-white/10">
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
                    Would you like to contribute towards temple redevelopment before entering your dashboard?
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

                <div className="sanskrit-divider text-[10px]">or</div>

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
                  <label className="block text-xs font-bold text-white/80 mb-1">Contribution Amount (₹)</label>
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

                <div className="flex items-start space-x-2 text-[10px] font-mono text-[#5EEAD4] bg-white/5 px-3 py-2 rounded-lg border border-white/10">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>An acknowledgement certificate will be shared with you on WhatsApp & Email within 24 hours of your contribution.</span>
                </div>

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
              <h3 className="font-serif text-xl font-bold text-white mb-4 text-center">My Dharmic ID</h3>
              
              {/* PROFESSIONAL DHARMIC ID CARD — corporate-ID-inspired layout on the Dharmic_ID.jpg backdrop */}
              <div 
                id="digital-dharmic-id-card"
                className="relative w-full max-w-md aspect-[1.62/1] text-white p-6 rounded-3xl shadow-2xl overflow-hidden border-2 border-[#FFB347]/50 transform hover:-translate-y-2 hover:rotate-1 transition-all duration-300"
                style={{
                  backgroundImage: `linear-gradient(135deg, rgba(9,35,32,0.55), rgba(2,24,22,0.6) 55%, rgba(4,47,42,0.5)), url(${dharmicIdBg})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
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
                  <span className="mt-1.5 text-[9px] font-bold tracking-[0.2em] uppercase text-[#FFB347]/80">
                    Dharmic Identity Card
                  </span>
                </div>

                {/* Shradhalu Name */}
                <div className="relative mb-3 text-left">
                  <span className="text-[9px] text-white/60 block uppercase">Shradhalu Name</span>
                  <span className="font-serif font-black text-base text-[#FFB347] truncate block">{userProfile.name}</span>
                </div>

                {/* Card Main Info layout */}
                <div className="relative grid grid-cols-2 gap-3 text-xs font-mono mb-2.5 text-left">
                  <div>
                    <span className="text-[9px] text-white/60 block uppercase">Dharmic ID</span>
                    <span className="font-bold block">SDM-23491-IN2</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-white/60 block uppercase">Membership Tier</span>
                    <span className="font-bold text-white block truncate">Lifetime Shradhalu</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-white/60 block uppercase">Gotra / Lineage</span>
                    <span className="font-bold text-white block truncate">{userGotra}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-white/60 block uppercase">Sign / Rashi</span>
                    <span className="font-bold block truncate">{userRashi}</span>
                  </div>
                </div>

                {/* Card footer Bar — with real Sri Dwar QR code for verification */}
                <div className="relative flex items-center gap-2.5 text-[8px] font-mono bg-[#021816]/60 p-2 rounded-xl mt-2.5">
                  <div className="flex-1 flex flex-col gap-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span>Registered: June 2026</span>
                      <span>Valid Till: June 2027</span>
                    </div>
                    <div className="flex justify-center items-center text-emerald-350 pt-1 border-t border-white/5">
                      <ShieldCheck className="w-3 h-3 text-emerald-400 mr-1" />
                      <span>Secured by Sridwar Technology</span>
                    </div>
                  </div>
                  <img
                    src={sridwarQR}
                    alt="Sri Dwar verification QR code"
                    className="shrink-0 w-12 h-12 rounded-md object-cover border border-white/10"
                  />
                </div>
              </div>

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
                      <div className="space-y-3">
                        {bookedItems.map((item, idx) => (
                          <div
                            key={idx}
                            id={`booked-item-ledg-${idx}`}
                            className="bg-[#092320] border border-white/10 p-4 rounded-2xl shadow-sm text-left relative overflow-hidden"
                          >
                            <div className="absolute right-4 top-4 text-2xl">🐚</div>
                            <h4 className="font-serif text-sm font-bold text-white">{item.pujaName}</h4>
                            <span className="text-[10px] text-white/50 font-mono font-medium block">Reference Key: {item.refId} | Date: {item.date}</span>
                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5 text-xs">
                              <span className="font-bold text-[#FFB347]">Paid: ₹{item.price}</span>
                              <span className="bg-[#FFB347]/10 text-[#FFB347] border border-[#FFB347]/20 px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase animate-pulse">
                                Sankalpa Scheduled
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-white/40 py-4 italic text-left">No dynamic pujas scheduled in this current browser session yet. Use the header "Book a Puja" to watch live results.</p>
                  )}
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
            </div>

            {/* Right Box: My Sacred Profile management, moved to the right side (cols 7) */}
            <div className="lg:col-span-7">
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

                <p className="text-[10px] text-white/70 leading-relaxed font-sans text-left">
                  Configure your sacred lineage gotra, birth rashi, and primary family details. These are auto-filled whenever you initiate a dynamic Sankalpa booking ceremony in Sri Dwar.
                </p>

                <form onSubmit={handleSaveProfile} className="space-y-3.5">
                  {/* Phone number */}
                  <div>
                    <label className="block text-[10px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">
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
                    <label className="block text-[10px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">
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
                    <label className="block text-[10px] font-bold text-white/80 uppercase tracking-wide mb-1 text-left">
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
                    <span className="block text-[10px] font-bold text-white/85 uppercase tracking-wide text-left">
                      Family Members (Chanting Sankalpa)
                    </span>

                    {familyMembers.length > 0 ? (
                      <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                        {familyMembers.map((member, index) => (
                          <div 
                            key={index} 
                            className="flex items-center justify-between text-[11px] bg-[#021816] px-3 py-1.5 rounded-lg border border-white/5"
                          >
                            <span className="text-white font-medium truncate max-w-[120px] text-left">{member.name}</span>
                            <span className="text-[#FFB347] font-sans text-[10px] px-1.5 py-0.5 bg-white/5 rounded border border-white/5">{member.relation}</span>
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
                      <p className="text-[10px] text-white/40 italic text-left text-left">
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
                          className="w-full text-[10px] px-2 py-1.5 rounded-lg border border-white/10 bg-[#021816] text-white focus:outline-none"
                        />
                      </div>
                      <div className="col-span-4">
                        <select
                          id="profile-family-new-relation"
                          value={newMemberRelation}
                          onChange={(e) => setNewMemberRelation(e.target.value)}
                          className="w-full text-[10px] px-1.5 py-1.5 rounded-lg border border-white/10 bg-[#021816] text-[#5EEAD4] focus:outline-none cursor-pointer"
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
                      className="w-full bg-[#0F766E] hover:bg-[#14B8A6] text-white font-bold text-[10px] uppercase tracking-widest py-2.5 px-4 rounded-xl shadow transition-transform active:scale-95 flex items-center justify-center space-x-1.5 cursor-pointer border-none"
                    >
                      <Save className="w-3.5 h-3.5 text-[#FFB347]" />
                      <span>Save Sacred Profile</span>
                    </button>

                    {saveProfileSuccess && (
                      <div className="mt-2 bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 p-2 rounded-xl text-[10px] text-center font-bold animate-pulse">
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

      {/* ── Step 3: Puja Sankalpa Portal ─────────────────────────────────── */}
      {showSankalpaForm && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[200] overflow-y-auto p-4 py-6">
          <div className="bg-[#092320] rounded-3xl w-full max-w-sm border border-white/10 shadow-2xl mx-auto my-4 text-white">

            {/* Header with SriDwarLogo */}
            <div className="bg-[#021816] px-5 py-4 border-b border-white/10 rounded-t-3xl">
              <div className="flex justify-center mb-3">
                <SriDwarLogo variant="colored" iconSize="sm" showTagline={false} />
              </div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-serif text-sm font-bold text-white">Puja Sankalpa Portal</h3>
                  <p className="text-[10px] font-mono text-[#FFB347] uppercase tracking-wider mt-0.5">
                    Temple Redevelopment Contribution
                  </p>
                </div>
                <button
                  onClick={() => setShowSankalpaForm(false)}
                  className="text-white/60 hover:text-white p-1.5 bg-white/5 rounded-full border border-white/10 shrink-0 ml-2"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={handleSankalpaSubmit} className="p-5 space-y-4">

              {/* Contribution summary */}
              <div className="bg-[#021816] rounded-2xl p-3 border border-white/10 flex items-center justify-between">
                <div className="text-xs text-white/60 font-mono truncate max-w-[180px]">
                  {selectedTempleId
                    ? TEMPLES_LIST.find(t => t.id === selectedTempleId)?.name
                    : customMandapName || "Temple Contribution"}
                </div>
                <span className="text-sm font-extrabold text-[#FFB347] font-serif shrink-0 ml-2">
                  ₹{contributionAmount}
                </span>
              </div>

              <p className="text-[11px] text-white/60 leading-relaxed">
                🙏 Please confirm your details so our pandits can register this contribution Sankalpa in your name and Gotra.
              </p>

              {/* Devotee name — pre-filled from login, read-only */}
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">Devotee Name</label>
                <input
                  type="text"
                  readOnly
                  value={pendingLogin?.name || ""}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/20 border border-white/5 text-white/60 cursor-not-allowed"
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
                <p className="text-[10px] text-white/30 mt-1 font-mono">Recited by the pandit during Sankalpa</p>
              </div>

              <div className="flex items-start gap-2 bg-emerald-950/30 border border-emerald-500/20 px-3 py-2.5 rounded-xl text-[10px] text-emerald-300 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Acknowledgement certificate sent on WhatsApp & Email within 24 hours. 🙏</span>
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
        bookingName={`Temple Contribution — ${
          selectedTempleId
            ? TEMPLES_LIST.find(t => t.id === selectedTempleId)?.name || "Temple"
            : customMandapName || "Temple Redevelopment"
        }`}
        devoteeName={pendingLogin?.name || "Devotee"}
        refId={contributionRefId}
      />
    </section>
  );
}
