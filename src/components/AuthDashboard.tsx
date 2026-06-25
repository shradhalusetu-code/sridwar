/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect, FormEvent } from "react";
import { User, ShieldCheck, Mail, Phone, Calendar, RefreshCw, LogOut, Award, Layers, Plus, Trash2, Save } from "lucide-react";
import { Language, TRANSLATIONS } from "../data/translations";
import { TEMPLES_LIST } from "../data/temples";
import SriDwarLogo from "./SriDwarLogo";
import UPIPaymentModal from "./UPIPaymentModal";

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

  // My Sacred Profile states
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    { name: "Anjali Rana", relation: "Spouse" },
    { name: "Siddharth Rana", relation: "Son" }
  ]);
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
    }, 1200);
  };

  // Devotee tapped "Skip for Now" on the contribution step.
  const handleSkipContribution = () => {
    if (pendingLogin) onLoginSuccess(pendingLogin.name, pendingLogin.email);
  };

  // Devotee picked an amount and a temple/mandap — open the real UPI popup.
  const handleProceedToContributionPayment = () => {
    if (!contributionAmount || contributionAmount <= 0) return;
    setIsContributionPaymentOpen(true);
  };

  // Called after "I Have Paid" is tapped in the UPI popup.
  const finalizeContribution = async () => {
    const templeName = selectedTempleId
      ? TEMPLES_LIST.find((temple) => temple.id === selectedTempleId)?.name
      : `${customMandapName}${customMandapAddress ? " — " + customMandapAddress : ""}`;

    // Best-effort logging only — no dedicated Google Form configured for this yet.
    console.log("[Temple Redevelopment Contribution]", {
      name: pendingLogin?.name,
      email: pendingLogin?.email,
      templeName,
      amount: contributionAmount
    });

    setIsContributionPaymentOpen(false);
    if (pendingLogin) onLoginSuccess(pendingLogin.name, pendingLogin.email);
  };

  const selectedTempleName = selectedTempleId
    ? TEMPLES_LIST.find((temple) => temple.id === selectedTempleId)?.name || "Selected Temple"
    : customMandapName || "Custom Mandap";

  const simulatedHistory = [
    { name: "Puri Jagannath Shringar Aarti", date: "June 10, 2026", status: "Completed" },
    { name: "Gau Seva Green Food Feed", date: "June 14, 2026", status: "Delivered & Chanted" }
  ];

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

              {/* Secure Google sign in simulation trigger */}
              <button
                id="google-signin-trigger"
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-[#EA4335] hover:bg-[#D62E1F] text-white font-bold py-3 rounded-xl text-xs transition-colors shadow flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isLoggingIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Synchronizing Google Account...</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-black text-center">G</span>
                    <span className="tracking-wider">GENERATE DIGITAL DHARMIC ID</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center space-x-1.5 text-[10px] font-mono text-[#5EEAD4] bg-white/5 py-1.5 rounded-lg border border-white/10">
                <ShieldCheck className="w-3.5 h-3.5 text-[#5EEAD4]" />
                <span>Google OAuth Secured for Shradhalu Pvt Ltd</span>
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
            
            {/* Left Box: Elegant Gotras Virtual ID Card (cols 5) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <h3 className="font-serif text-xl font-bold text-white mb-4 text-center">My Permanent Devotee Card</h3>
              
              {/* FLOATING SACRED CERTIFICATE/ID DESIGN */}
              <div 
                id="digital-dharmic-id-card"
                className="relative w-full max-w-sm aspect-[1.586/1] bg-gradient-to-tr from-[#092320] via-[#021816] to-[#042F2A] text-white p-6 rounded-3xl shadow-2xl overflow-hidden border-2 border-[#FFB347]/50 transform hover:-translate-y-2 hover:rotate-1 transition-all duration-300"
              >
                {/* Mandala Background Watermarks */}
                <div className="absolute top-2 right-2 text-9xl text-white/5 font-serif pointer-events-none select-none">
                  ॐ
                </div>
                <div className="absolute -left-10 -bottom-10 text-9xl text-[#FFB347]/5 font-sans pointer-events-none select-none">
                  श्री
                </div>

                {/* Card Header */}
                <div className="flex justify-between items-start border-b border-white/10 pb-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <SriDwarLogo variant="colored" iconSize="sm" showTagline={false} />
                    <div>
                      <span className="block font-bold text-sm tracking-wide text-left">Sri Dwar Identity</span>
                      <span className="block text-[8px] font-mono tracking-widest text-[#FFB347] uppercase text-left">Shradhalu Private Ltd</span>
                    </div>
                  </div>
                  <span className="text-[9px] bg-[#FFB347]/20 text-[#FFB347] px-2 py-0.5 rounded border border-[#FFB347]/30 font-bold uppercase font-mono">
                    Devotee
                  </span>
                </div>

                {/* Card Main Info layout */}
                <div className="grid grid-cols-2 gap-4 text-xs font-mono mb-4 text-left">
                  <div>
                    <span className="text-[9px] text-white/60 block uppercase">Pilgrim Name</span>
                    <span className="font-serif font-black text-sm text-[#FFB347] truncate block">{userProfile.name}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-white/60 block uppercase">Permanent ID</span>
                    <span className="font-bold block">SDM-23491-IN2</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-white/60 block uppercase">Gotra Lineage</span>
                    <span className="font-bold text-white block truncate">{userGotra}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-white/60 block uppercase">Sign Rashi</span>
                    <span className="font-bold block truncate">{userRashi}</span>
                  </div>
                </div>

                {/* Card footer Bar */}
                <div className="flex justify-between items-center text-[8px] font-mono bg-[#021816]/60 p-2 rounded-xl mt-4">
                  <span>Registered: June 2026</span>
                  <span className="text-emerald-350 flex items-center">
                    <ShieldCheck className="w-3 h-3 text-emerald-400 mr-0.5" />
                    <span>✓ Authenticated Secure</span>
                  </span>
                </div>
              </div>

              {/* MY SACRED PROFILE MANAGEMENT CARD */}
              <div 
                id="my-sacred-profile-card"
                className="w-full max-w-sm mt-6 bg-[#092320] border border-white/10 rounded-3xl p-5 text-left text-white space-y-4"
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

            {/* Right Box: Live bookings history record ledger (cols 7) */}
            <div className="lg:col-span-7 space-y-6">
              <h3 className="font-serif text-xl font-bold text-white border-b border-white/10 pb-2">
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

                {/* Simulated default history records */}
                <div>
                  <span className="text-xs font-bold text-white/40 uppercase tracking-wider font-mono block mb-2 text-left">Historic Devout Transactions</span>
                  <div className="space-y-3">
                    {simulatedHistory.map((hist, idx) => (
                      <div key={idx} className="bg-[#092320] p-4 rounded-2xl border border-white/5 text-left text-white">
                        <h4 className="text-xs font-bold text-white/95">{hist.name}</h4>
                        <span className="text-[10px] text-white/45 font-mono font-medium block">Completed: {hist.date}</span>
                        <div className="flex justify-between items-center mt-2 text-[10px] font-mono text-white/55">
                          <span>Verified: Pundit Shastri</span>
                          <span className="text-emerald-400 font-bold">✓ Delivered & Blessed</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>

          </div>

        )}

      </div>

      {/* Real UPI Payment Popup for the temple-redevelopment contribution */}
      {isContributionPaymentOpen && (
        <UPIPaymentModal
          amount={contributionAmount}
          note={`Temple Redevelopment Contribution - ${pendingLogin?.name || ""}`}
          payeeLabel="Contribution To"
          payeeValue={selectedTempleName}
          onConfirm={finalizeContribution}
          onClose={() => setIsContributionPaymentOpen(false)}
        />
      )}
    </section>
  );
}
