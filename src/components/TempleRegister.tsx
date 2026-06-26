/**
 * TempleRegister.tsx — Sri Dwar
 * "Find & Register Your Native Temple / Puja Committee"
 *
 * An Initiative by Sridwar Technology
 *
 * Features:
 *  • Searchable dropdown to find a temple/puja committee from the master list
 *  • "Add New Temple" quick-register path for unlisted temples
 *  • Devotee portal: personal details, temple selection, optional puja/seva, optional donation
 *  • On skip-donation → generates Dharmic ID → Dharma Portal screen
 *  • Syncs all data to the dedicated Google Form (entry IDs from user's prefilled link)
 *  • Shareable standalone Temple Registration URL: ?page=temple-register
 *  • Branded "An Initiative by Sridwar Technology"
 *  • Mobile-first, spiritually-inspired glassmorphism UI
 *  • Android Capacitor safe (no fixed-position scroll traps, safe-area aware)
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, ChevronDown, ChevronRight, Plus, Check, X,
  MapPin, Phone, Mail, User, Heart, Sparkles,
  Building2, Send, Copy, Share2, ExternalLink, ArrowLeft,
  Landmark, BookOpen, Gift
} from "lucide-react";
import { TEMPLES_LIST } from "../data/temples";
import { validateName, validateEmail, validatePhone } from "../utils/formValidation";
import UPIPaymentModal from "./UPIPaymentModal";

// ─── Google Form field mapping (from user's prefilled link) ──────────────────
// https://docs.google.com/forms/d/e/1FAIpQLSdcdy6jt7oXb-OOpoD3JBeHYoFsC7Bdh7War6h2G3JMAtphrg/viewform
//   entry.1681250719 = Full Name
//   entry.383182949  = Phone
//   entry.1690498502 = Email
//   entry.328073340  = Temple / Puja Committee Name
//   entry.1459017454 = City / Location
//   entry.1343219786 = Puja / Seva Request (optional)
//   entry.757655737  = Donation Amount (optional, "Skipped" if skipped)
//   entry.2068325520 = Dharmic ID
//   entry.1644752302 = Submission Type  (Devotee | Temple Registration)
//   entry.1264974204 = Additional Notes / Message

const FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSdcdy6jt7oXb-OOpoD3JBeHYoFsC7Bdh7War6h2G3JMAtphrg/formResponse";

const ENTRY = {
  name:           "entry.1681250719",
  phone:          "entry.383182949",
  email:          "entry.1690498502",
  temple:         "entry.328073340",
  city:           "entry.1459017454",
  puja:           "entry.1343219786",
  donation:       "entry.757655737",
  dharmicId:      "entry.2068325520",
  type:           "entry.1644752302",
  notes:          "entry.1264974204",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateDharmicId(): string {
  const prefix = "SDW";
  const year   = new Date().getFullYear().toString().slice(-2);
  const rand   = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${year}-${rand}`;
}

async function submitToGoogleForm(payload: Record<string, string>): Promise<void> {
  const fd = new FormData();
  Object.entries(payload).forEach(([k, v]) => fd.append(k, v));
  try {
    await fetch(FORM_URL, { method: "POST", mode: "no-cors", body: fd });
  } catch {
    // no-cors fetch always throws on response read — that's expected; data still submits
  }
}

// ─── Puja / Seva options ──────────────────────────────────────────────────────
const PUJA_OPTIONS = [
  "Satyanarayan Puja", "Rudrabhishek", "Ganesh Puja", "Navgraha Shanti",
  "Griha Pravesh Puja", "Maha Mrityunjaya Japa", "Lakshmi Puja", "Durga Saptashati Path",
  "Hanuman Puja", "Sudarshana Homa", "Navagraha Homa", "Pitru Tarpan",
  "Annaprashana Puja", "Vivah Puja", "Naming Ceremony (Namakarana)",
  "Community Annadanam", "Diya Seva", "Gau Seva", "Custom / Other Seva",
];

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = "find"        // Step 1: find/select temple
          | "portal"      // Step 2: devotee details
          | "donation"    // Step 3: donation
          | "dharmic"     // Step 4: Dharmic ID portal
          | "temple-reg"; // Standalone: temple registration form

interface DevoteeForm {
  name: string; phone: string; email: string;
  city: string; puja: string; notes: string;
}

interface TempleRegForm {
  templeName: string; city: string; state: string;
  deity: string; address: string;
  contactName: string; contactPhone: string; contactEmail: string;
  notes: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center space-x-1.5 bg-[#FFB347]/10 border border-[#FFB347]/25 rounded-full px-3 py-1 text-[10px] font-mono font-bold text-[#FFB347] uppercase tracking-widest">
      <Sparkles className="w-2.5 h-2.5" />
      <span>{label}</span>
    </span>
  );
}

function FieldError({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1"><X className="w-3 h-3" />{msg}</p>;
}

function InputField({
  label, icon: Icon, type = "text", value, onChange, placeholder, error, required
}: {
  label: string; icon: React.ElementType; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; error?: string | null; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-white/70 mb-1.5">
        {label}{required && <span className="text-[#FFB347] ml-0.5">*</span>}
      </label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5EEAD4]/60 pointer-events-none" />
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-white/5 border ${error ? "border-red-500/60" : "border-white/10"} rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#5EEAD4]/50 focus:bg-white/8 transition-all`}
        />
      </div>
      <FieldError msg={error ?? null} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface TempleRegisterProps {
  /** If true, renders only the temple-registration standalone page */
  standaloneTempleReg?: boolean;
  onNavigate?: (page: string) => void;
}

export default function TempleRegister({ standaloneTempleReg, onNavigate }: TempleRegisterProps) {

  // ── Step state ──
  const [step, setStep] = useState<Step>(standaloneTempleReg ? "temple-reg" : "find");
  const [selectedTemple, setSelectedTemple] = useState<string>("");
  const [isNewTemple, setIsNewTemple] = useState(false);

  // ── Search dropdown ──
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const allOptions = [
    ...TEMPLES_LIST.map(t => ({ id: t.id, name: t.name, city: t.city, state: t.state })),
  ];
  const filtered = allOptions.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.state.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const showAddNew = searchQuery.trim().length > 2 && filtered.length === 0;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Devotee form ──
  const [devotee, setDevotee] = useState<DevoteeForm>({
    name: "", phone: "", email: "", city: "", puja: "", notes: ""
  });
  const [devoteeErrors, setDevoteeErrors] = useState<Partial<Record<keyof DevoteeForm, string>>>({});
  const [submittingDevotee, setSubmittingDevotee] = useState(false);

  // ── Donation ──
  const [donationAmount, setDonationAmount] = useState("");
  const [donationNote, setDonationNote] = useState("");
  const [submittingDonation, setSubmittingDonation] = useState(false);

  // ── UPI Payment Modal (donation flow) ──
  const [showDonationUpi, setShowDonationUpi] = useState(false);
  const [donationRefId, setDonationRefId] = useState("");

  // ── Dharmic ID ──
  const [dharmicId, setDharmicId] = useState("");
  const [copied, setCopied] = useState(false);

  // ── Temple registration ──
  const [templeReg, setTempleReg] = useState<TempleRegForm>({
    templeName: "", city: "", state: "", deity: "", address: "",
    contactName: "", contactPhone: "", contactEmail: "", notes: ""
  });
  const [templeRegErrors, setTempleRegErrors] = useState<Partial<Record<keyof TempleRegForm, string>>>({});
  const [submittingTempleReg, setSubmittingTempleReg] = useState(false);
  const [templeRegSuccess, setTempleRegSuccess] = useState(false);

  // ── Temple-reg donation (separate from devotee donation) ──
  const [templeRegDonationAmount, setTempleRegDonationAmount] = useState("");
  const [templeRegDonationNote, setTempleRegDonationNote] = useState("");
  const [showTempleRegUpi, setShowTempleRegUpi] = useState(false);
  const [templeRegDonationRefId, setTempleRegDonationRefId] = useState("");
  // Holds the validated form payload while awaiting payment confirmation
  const [pendingTempleRegPayload, setPendingTempleRegPayload] = useState<Record<string, string> | null>(null);

  // ── Select temple from dropdown ──
  const handleSelectTemple = (name: string, isNew = false) => {
    setSelectedTemple(name);
    setIsNewTemple(isNew);
    setDropdownOpen(false);
    setSearchQuery(name);
  };

  // ── Validate devotee form ──
  const validateDevotee = (): boolean => {
    const errs: Partial<Record<keyof DevoteeForm, string>> = {};
    errs.name  = validateName(devotee.name) ?? undefined;
    errs.phone = validatePhone(devotee.phone) ?? undefined;
    if (devotee.email) errs.email = validateEmail(devotee.email) ?? undefined;
    if (!devotee.city.trim()) errs.city = "City / location is required.";
    const clean: Partial<Record<keyof DevoteeForm, string>> = {};
    Object.entries(errs).forEach(([k, v]) => { if (v) clean[k as keyof DevoteeForm] = v; });
    setDevoteeErrors(clean);
    return Object.keys(clean).length === 0;
  };

  // ── Submit devotee → go to donation step ──
  const handleDevoteeSubmit = () => {
    if (!validateDevotee()) return;
    setStep("donation");
  };

  // ── Finalize: generate ID, sync, go to Dharmic portal ──
  const finalize = useCallback(async (donated: boolean, amount?: string) => {
    const id = generateDharmicId();
    setDharmicId(id);

    const payload: Record<string, string> = {
      [ENTRY.name]:      devotee.name,
      [ENTRY.phone]:     devotee.phone,
      [ENTRY.email]:     devotee.email || "Not provided",
      [ENTRY.temple]:    selectedTemple,
      [ENTRY.city]:      devotee.city,
      [ENTRY.puja]:      devotee.puja || "None requested",
      [ENTRY.donation]:  donated && amount ? `₹${amount}` : "Skipped",
      [ENTRY.dharmicId]: id,
      [ENTRY.type]:      "Devotee Registration",
      [ENTRY.notes]:     devotee.notes || "",
    };

    await submitToGoogleForm(payload);
    setStep("dharmic");
  }, [devotee, selectedTemple]);

  // ── Donation: open UPI payment modal ──
  const handleDonationSubmit = () => {
    if (!donationAmount || isNaN(Number(donationAmount)) || Number(donationAmount) < 1) {
      alert("Please enter a valid donation amount (minimum ₹1).");
      return;
    }
    // Generate a ref ID for this donation transaction
    const ref = `SDW-DON-${Math.floor(100000 + Math.random() * 900000)}`;
    setDonationRefId(ref);
    setShowDonationUpi(true);
  };

  // ── Called after devotee taps "I Have Paid" in the UPI modal ──
  const handleDonationConfirmed = async () => {
    setShowDonationUpi(false);
    setSubmittingDonation(true);
    await finalize(true, donationAmount);
    setSubmittingDonation(false);
  };

  // ── Skip donation ──
  const handleSkipDonation = async () => {
    setSubmittingDonation(true);
    await finalize(false);
    setSubmittingDonation(false);
  };

  // ── Temple registration submit ──
  const handleTempleRegSubmit = async () => {
    const errs: Partial<Record<keyof TempleRegForm, string>> = {};
    if (!templeReg.templeName.trim()) errs.templeName = "Temple / committee name is required.";
    if (!templeReg.city.trim()) errs.city = "City is required.";
    if (!templeReg.state.trim()) errs.state = "State is required.";
    const cn = validateName(templeReg.contactName);
    if (cn) errs.contactName = cn;
    const cp = validatePhone(templeReg.contactPhone);
    if (cp) errs.contactPhone = cp;
    if (templeReg.contactEmail) {
      const ce = validateEmail(templeReg.contactEmail);
      if (ce) errs.contactEmail = ce;
    }
    setTempleRegErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const donationAmt = Number(templeRegDonationAmount);
    const hasDonation = templeRegDonationAmount.trim() !== "" && !isNaN(donationAmt) && donationAmt >= 1;

    const payload: Record<string, string> = {
      [ENTRY.name]:      templeReg.contactName,
      [ENTRY.phone]:     templeReg.contactPhone,
      [ENTRY.email]:     templeReg.contactEmail || "Not provided",
      [ENTRY.temple]:    templeReg.templeName,
      [ENTRY.city]:      `${templeReg.city}, ${templeReg.state}`,
      [ENTRY.puja]:      templeReg.deity || "Not specified",
      [ENTRY.donation]:  hasDonation ? `₹${templeRegDonationAmount}` : "Skipped",
      [ENTRY.dharmicId]: "Temple-Mgmt",
      [ENTRY.type]:      "Temple / Puja Committee Registration",
      [ENTRY.notes]:     `Deity: ${templeReg.deity} | Address: ${templeReg.address} | Donation note: ${templeRegDonationNote || "—"} | Notes: ${templeReg.notes}`,
    };

    if (hasDonation) {
      // Open UPI modal — submit to Google Form only after payment confirmed
      const ref = `SDW-TREG-${Math.floor(100000 + Math.random() * 900000)}`;
      setTempleRegDonationRefId(ref);
      setPendingTempleRegPayload(payload);
      setShowTempleRegUpi(true);
    } else {
      // No donation — submit form directly
      setSubmittingTempleReg(true);
      await submitToGoogleForm(payload);
      setSubmittingTempleReg(false);
      setTempleRegSuccess(true);
    }
  };

  // ── Called after "I Have Paid" in temple-reg UPI modal ──
  const handleTempleRegDonationConfirmed = async () => {
    setShowTempleRegUpi(false);
    setSubmittingTempleReg(true);
    if (pendingTempleRegPayload) {
      await submitToGoogleForm(pendingTempleRegPayload);
    }
    setSubmittingTempleReg(false);
    setPendingTempleRegPayload(null);
    setTempleRegSuccess(true);
  };

  // ── Copy Dharmic ID ──
  const handleCopy = () => {
    navigator.clipboard.writeText(dharmicId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Share ──
  const handleShare = () => {
    const text = `I just registered on Sri Dwar and received my Dharmic ID: ${dharmicId} 🙏\nJoin me: https://sridwar.com`;
    if (navigator.share) {
      navigator.share({ title: "My Dharmic ID — Sri Dwar", text });
    } else {
      navigator.clipboard.writeText(text);
      alert("Link copied to clipboard!");
    }
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  // ── Standalone Temple Registration ──────────────────────────────────────
  if (step === "temple-reg") {
    return (
      <>
      <section
        id="temple-register-section"
        className="min-h-screen bg-gradient-to-b from-[#021816] via-[#051F1A] to-[#021816] py-20 px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 80px)" }}
      >
        <div className="max-w-2xl mx-auto">

          {/* Back button (only when not standalone) */}
          {!standaloneTempleReg && (
            <button
              onClick={() => setStep("find")}
              className="flex items-center space-x-2 text-white/50 hover:text-[#5EEAD4] text-sm mb-6 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> <span>Back to Temple Finder</span>
            </button>
          )}

          {/* Header */}
          <div className="text-center mb-8 space-y-3">
            <SectionBadge label="An Initiative by Sridwar Technology" />
            <h1 className="text-3xl sm:text-4xl font-serif font-black text-white leading-tight">
              Register Your <span className="text-[#FFB347]">Temple</span> or<br />Puja Committee
            </h1>
            <p className="text-white/55 text-sm max-w-md mx-auto leading-relaxed">
              Help thousands of devotees discover and connect with your temple or puja mandal on the Sri Dwar platform.
            </p>
          </div>

          {templeRegSuccess ? (
            <div className="glass-panel rounded-3xl p-8 text-center space-y-5 border border-[#FFB347]/20">
              <div className="w-16 h-16 rounded-full bg-[#FFB347]/15 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-[#FFB347]" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-white">Registration Submitted!</h2>
              <p className="text-white/60 text-sm leading-relaxed">
                Thank you, <strong className="text-white">{templeReg.contactName}</strong>! Your temple
                <strong className="text-[#FFB347]"> {templeReg.templeName}</strong> has been submitted for review.
                Our team will reach out within 48 hours at the contact details provided.
              </p>
              <div className="text-xs font-mono text-[#5EEAD4]/60 bg-[#5EEAD4]/5 border border-[#5EEAD4]/15 rounded-xl px-4 py-2">
                An Initiative by Sridwar Technology · Sri Dwar
              </div>
              {!standaloneTempleReg && (
                <button
                  onClick={() => { setTempleRegSuccess(false); setStep("find"); }}
                  className="inline-flex items-center space-x-2 bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-bold text-sm px-6 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> <span>Back to Home</span>
                </button>
              )}
            </div>
          ) : (
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-5 border border-white/10">

              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#FFB347] uppercase tracking-wider font-mono">Temple / Committee Details</h3>
                <p className="text-xs text-white/40">All starred fields are required.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <InputField
                    label="Temple / Puja Committee / Mandal Name"
                    icon={Landmark}
                    value={templeReg.templeName}
                    onChange={v => setTempleReg(p => ({ ...p, templeName: v }))}
                    placeholder="e.g. Shree Radha Krishna Mandir"
                    error={templeRegErrors.templeName}
                    required
                  />
                </div>
                <InputField
                  label="City"
                  icon={MapPin}
                  value={templeReg.city}
                  onChange={v => setTempleReg(p => ({ ...p, city: v }))}
                  placeholder="e.g. Bhubaneswar"
                  error={templeRegErrors.city}
                  required
                />
                <InputField
                  label="State"
                  icon={MapPin}
                  value={templeReg.state}
                  onChange={v => setTempleReg(p => ({ ...p, state: v }))}
                  placeholder="e.g. Odisha"
                  error={templeRegErrors.state}
                  required
                />
                <div className="sm:col-span-2">
                  <InputField
                    label="Primary Deity / Presiding God or Goddess"
                    icon={Sparkles}
                    value={templeReg.deity}
                    onChange={v => setTempleReg(p => ({ ...p, deity: v }))}
                    placeholder="e.g. Lord Shiva, Maa Durga"
                  />
                </div>
                <div className="sm:col-span-2">
                  <InputField
                    label="Full Address (optional)"
                    icon={Building2}
                    value={templeReg.address}
                    onChange={v => setTempleReg(p => ({ ...p, address: v }))}
                    placeholder="Street, Locality, PIN code"
                  />
                </div>
              </div>

              <div className="border-t border-white/8 pt-4 space-y-1">
                <h3 className="text-sm font-bold text-[#5EEAD4] uppercase tracking-wider font-mono">Contact Person (Temple Authority)</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  label="Your Full Name"
                  icon={User}
                  value={templeReg.contactName}
                  onChange={v => setTempleReg(p => ({ ...p, contactName: v }))}
                  placeholder="Pujari / Secretary / Manager"
                  error={templeRegErrors.contactName}
                  required
                />
                <InputField
                  label="Mobile Number"
                  icon={Phone}
                  type="tel"
                  value={templeReg.contactPhone}
                  onChange={v => setTempleReg(p => ({ ...p, contactPhone: v }))}
                  placeholder="+91 9XXXXXXXXX"
                  error={templeRegErrors.contactPhone}
                  required
                />
                <div className="sm:col-span-2">
                  <InputField
                    label="Email (optional)"
                    icon={Mail}
                    type="email"
                    value={templeReg.contactEmail}
                    onChange={v => setTempleReg(p => ({ ...p, contactEmail: v }))}
                    placeholder="temple@example.com"
                    error={templeRegErrors.contactEmail}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-white/70 mb-1.5">Additional Notes (optional)</label>
                  <textarea
                    value={templeReg.notes}
                    onChange={e => setTempleReg(p => ({ ...p, notes: e.target.value }))}
                    rows={3}
                    placeholder="Describe your temple, events, or any special information..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#5EEAD4]/50 transition-all resize-none"
                  />
                </div>
              </div>

              {/* ── Donation / Contribution (optional) ── */}
              <div className="border-t border-white/8 pt-5 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#FFB347] uppercase tracking-wider font-mono flex items-center gap-2">
                    <Gift className="w-3.5 h-3.5" /> Optional Donation / Contribution
                  </h3>
                  <p className="text-[11px] text-white/40 leading-relaxed">
                    Support your temple's renovation, annadanam, or seva activities. Leave blank to skip — registration is always free.
                  </p>
                </div>

                {/* Info callout */}
                <div className="flex items-start space-x-3 bg-[#FFB347]/8 border border-[#FFB347]/20 rounded-xl px-4 py-3">
                  <Heart className="w-3.5 h-3.5 text-[#FFB347] shrink-0 mt-0.5" />
                  <p className="text-[11px] text-white/55 leading-relaxed">
                    If you donate, your payment will be forwarded to <strong className="text-white/80">{templeReg.templeName || "your temple"}</strong>.
                    A <strong className="text-white/80">Donation Certificate</strong> will be shared on WhatsApp &amp; Email within <strong className="text-white/80">24 hours</strong> after payment verification and temple management response.
                  </p>
                </div>

                {/* Preset amounts */}
                <div className="grid grid-cols-4 gap-2">
                  {[101, 251, 501, 1001].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTempleRegDonationAmount(
                        templeRegDonationAmount === String(amt) ? "" : String(amt)
                      )}
                      className={`py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                        templeRegDonationAmount === String(amt)
                          ? "bg-[#FFB347]/20 border-[#FFB347]/50 text-[#FFB347]"
                          : "bg-white/5 border-white/10 text-white/55 hover:border-white/25"
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>

                {/* Custom amount */}
                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-1.5">
                    Or enter a custom amount (₹) <span className="text-white/30 font-normal">— leave blank to skip</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={templeRegDonationAmount}
                    onChange={e => setTempleRegDonationAmount(e.target.value)}
                    placeholder="e.g. 2100"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#FFB347]/50 transition-all"
                  />
                </div>

                {/* Dedication note — only shown when amount is entered */}
                {templeRegDonationAmount && Number(templeRegDonationAmount) >= 1 && (
                  <input
                    type="text"
                    value={templeRegDonationNote}
                    onChange={e => setTempleRegDonationNote(e.target.value)}
                    placeholder="Dedication note — e.g. In memory of, On behalf of family…"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#5EEAD4]/50 transition-all"
                  />
                )}
              </div>

              <button
                onClick={handleTempleRegSubmit}
                disabled={submittingTempleReg}
                className="w-full bg-[#FFB347] hover:bg-[#F27D26] disabled:opacity-60 text-[#021816] font-bold py-3.5 rounded-2xl flex items-center justify-center space-x-2 transition-all cursor-pointer text-sm tracking-wide"
              >
                {submittingTempleReg ? (
                  <><span className="animate-spin w-4 h-4 border-2 border-[#021816] border-t-transparent rounded-full" /><span>Submitting…</span></>
                ) : templeRegDonationAmount && Number(templeRegDonationAmount) >= 1 ? (
                  <><Send className="w-4 h-4" /><span>Register &amp; Donate ₹{templeRegDonationAmount}</span></>
                ) : (
                  <><Send className="w-4 h-4" /><span>Submit Temple Registration</span></>
                )}
              </button>

              <p className="text-center text-[10px] text-white/30 font-mono">
                An Initiative by Sridwar Technology · Data synced to Sri Dwar's secure Google Workspace
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── UPI Donation Payment Modal (temple registration) ── */}
      {showTempleRegUpi && (
        <UPIPaymentModal
          isOpen={showTempleRegUpi}
          onClose={() => setShowTempleRegUpi(false)}
          onPaymentConfirmed={handleTempleRegDonationConfirmed}
          amount={Number(templeRegDonationAmount)}
          bookingName={`Temple Registration Donation — ${templeReg.templeName}${templeRegDonationNote ? ` (${templeRegDonationNote})` : ""}`}
          devoteeName={templeReg.contactName}
          refId={templeRegDonationRefId}
        />
      )}
      </>
    );
  }

  // ── Step: Dharma Portal ──────────────────────────────────────────────────
  if (step === "dharmic") {
    return (
      <section
        id="dharma-portal-section"
        className="min-h-screen bg-gradient-to-b from-[#021816] via-[#051F1A] to-[#021816] py-20 px-4 flex items-center"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 80px)" }}
      >
        <div className="max-w-md mx-auto w-full space-y-6">

          {/* Glow ring */}
          <div className="relative flex items-center justify-center mb-2">
            <div className="absolute w-28 h-28 rounded-full bg-[#FFB347]/20 blur-2xl" />
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FFB347]/30 to-[#FF9933]/20 border-2 border-[#FFB347]/40 flex items-center justify-center text-3xl z-10">
              🙏
            </div>
          </div>

          <div className="text-center space-y-2">
            <SectionBadge label="Dharma Portal — Sri Dwar" />
            <h1 className="text-3xl font-serif font-black text-white">
              Welcome, <span className="text-[#FFB347]">{devotee.name.split(" ")[0]}</span>!
            </h1>
            <p className="text-white/55 text-sm">Your Dharmic ID has been created and synced.</p>
          </div>

          {/* ID card */}
          <div className="glass-panel rounded-3xl p-6 border border-[#FFB347]/20 space-y-4 glow-gold">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[#FFB347]/70 uppercase tracking-widest">Your Dharmic ID</span>
              <span className="text-[9px] font-mono text-white/30">Sri Dwar · Sridwar Technology</span>
            </div>

            <div className="bg-[#021816]/60 rounded-2xl px-5 py-4 border border-[#FFB347]/15 text-center">
              <p className="text-2xl font-mono font-bold text-[#FFB347] tracking-widest">{dharmicId}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-white/60">
              <div><span className="text-white/30 block text-[10px] uppercase">Name</span>{devotee.name}</div>
              <div><span className="text-white/30 block text-[10px] uppercase">Phone</span>{devotee.phone}</div>
              <div className="col-span-2"><span className="text-white/30 block text-[10px] uppercase">Temple / Committee</span>
                <span className="text-[#5EEAD4]">{selectedTemple}</span>
              </div>
              {devotee.puja && (
                <div className="col-span-2"><span className="text-white/30 block text-[10px] uppercase">Puja / Seva</span>{devotee.puja}</div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center space-x-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-semibold py-2.5 rounded-xl transition-all cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#5EEAD4]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied!" : "Copy ID"}</span>
              </button>
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center space-x-1.5 bg-[#FFB347]/10 hover:bg-[#FFB347]/20 border border-[#FFB347]/25 text-[#FFB347] text-xs font-semibold py-2.5 rounded-xl transition-all cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
            </div>
          </div>

          {/* Info panel */}
          <div className="glass-panel rounded-2xl p-4 border border-white/8 space-y-2">
            <p className="text-[11px] text-white/50 leading-relaxed">
              🔔 Your details and Dharmic ID have been synced to Sri Dwar's secure Google Workspace. 
              Our team will reach out for any puja/seva coordination within 24 hours on WhatsApp.
            </p>
            <p className="text-[10px] font-mono text-white/30 mt-2">
              An Initiative by Sridwar Technology
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onNavigate?.("puja")}
              className="flex items-center justify-center space-x-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-semibold py-3 rounded-xl transition-all cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" /><span>Book a Puja</span>
            </button>
            <button
              onClick={() => { setStep("find"); setDevotee({ name:"", phone:"", email:"", city:"", puja:"", notes:"" }); setSelectedTemple(""); setSearchQuery(""); }}
              className="flex items-center justify-center space-x-1.5 bg-[#5EEAD4]/10 hover:bg-[#5EEAD4]/15 border border-[#5EEAD4]/20 text-[#5EEAD4] text-xs font-semibold py-3 rounded-xl transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /><span>Back to Home</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ── Step: Donation ────────────────────────────────────────────────────────
  if (step === "donation") {
    const presets = [51, 101, 251, 501, 1001, 2100];
    return (
      <>
      <section
        id="donation-step-section"
        className="min-h-screen bg-gradient-to-b from-[#021816] via-[#051F1A] to-[#021816] py-20 px-4 flex items-center"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 80px)" }}
      >
        <div className="max-w-md mx-auto w-full space-y-6">
          <button
            onClick={() => setStep("portal")}
            className="flex items-center space-x-2 text-white/50 hover:text-[#5EEAD4] text-sm transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /><span>Back</span>
          </button>          <div className="text-center space-y-2">
            <SectionBadge label="Optional Contribution" />
            <h2 className="text-2xl font-serif font-bold text-white">
              Support <span className="text-[#FFB347]">{selectedTemple.split("—")[0].trim()}</span>
            </h2>
            <p className="text-white/50 text-sm">Your donation goes directly toward temple upkeep, annadanam, and seva activities.</p>
          </div>

          <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-5">

            {/* Donation destination notice */}
            <div className="flex items-start space-x-3 bg-[#FFB347]/8 border border-[#FFB347]/20 rounded-2xl px-4 py-3.5">
              <Gift className="w-4 h-4 text-[#FFB347] shrink-0 mt-0.5" />
              <div className="space-y-1 text-left">
                <p className="text-xs font-semibold text-[#FFB347]">
                  Your donation will be forwarded to:
                </p>
                <p className="text-sm font-bold text-white leading-snug">
                  {selectedTemple.split("—")[0].trim()}
                </p>
                <p className="text-[11px] text-white/50 leading-relaxed">
                  A <strong className="text-white/75">Donation Certificate</strong> will be shared with you on WhatsApp &amp; Email within <strong className="text-white/75">24 hours</strong> after payment verification and temple / puja committee management response.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {presets.map(amt => (
                <button
                  key={amt}
                  onClick={() => setDonationAmount(String(amt))}
                  className={`py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                    donationAmount === String(amt)
                      ? "bg-[#FFB347]/20 border-[#FFB347]/50 text-[#FFB347]"
                      : "bg-white/5 border-white/10 text-white/60 hover:border-white/25"
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1.5">Or enter a custom amount (₹)</label>
              <input
                type="number"
                min="1"
                value={donationAmount}
                onChange={e => setDonationAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#FFB347]/50 transition-all"
              />
            </div>

            <input
              type="text"
              value={donationNote}
              onChange={e => setDonationNote(e.target.value)}
              placeholder="Dedication note (e.g. In memory of…)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#5EEAD4]/50 transition-all"
            />

            <button
              onClick={handleDonationSubmit}
              disabled={submittingDonation}
              className="w-full bg-[#FFB347] hover:bg-[#F27D26] disabled:opacity-60 text-[#021816] font-bold py-3.5 rounded-2xl flex items-center justify-center space-x-2 transition-all cursor-pointer text-sm"
            >
              {submittingDonation ? (
                <><span className="animate-spin w-4 h-4 border-2 border-[#021816] border-t-transparent rounded-full" /><span>Processing…</span></>
              ) : (
                <>
                  <Heart className="w-4 h-4" />
                  <span>
                    {donationAmount && Number(donationAmount) > 0
                      ? `Donate ₹${donationAmount} & Get Dharmic ID`
                      : "Donate & Get Dharmic ID"}
                  </span>
                </>
              )}
            </button>

            <button
              onClick={handleSkipDonation}
              disabled={submittingDonation}
              className="w-full text-white/40 hover:text-white/70 text-xs py-2 transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              <span>Skip donation — just get my Dharmic ID</span>
            </button>
          </div>

          <p className="text-center text-[10px] text-white/25 font-mono">
            Donations are voluntary and non-refundable · An Initiative by Sridwar Technology
          </p>
        </div>
      </section>

      {/* ── UPI Donation Payment Modal ── */}
      {showDonationUpi && (
        <UPIPaymentModal
          isOpen={showDonationUpi}
          onClose={() => setShowDonationUpi(false)}
          onPaymentConfirmed={handleDonationConfirmed}
          amount={Number(donationAmount)}
          bookingName={`Temple Donation — ${selectedTemple.split("—")[0].trim()}${donationNote ? ` (${donationNote})` : ""}`}
          devoteeName={devotee.name}
          refId={donationRefId}
        />
      )}
      </>
    );
  }

  // ── Step: Devotee Portal ──────────────────────────────────────────────────
  if (step === "portal") {
    return (
      <section
        id="devotee-portal-section"
        className="min-h-screen bg-gradient-to-b from-[#021816] via-[#051F1A] to-[#021816] py-20 px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 80px)" }}
      >
        <div className="max-w-lg mx-auto space-y-6">
          <button
            onClick={() => setStep("find")}
            className="flex items-center space-x-2 text-white/50 hover:text-[#5EEAD4] text-sm transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /><span>Back to Temple Finder</span>
          </button>

          <div className="text-center space-y-2">
            <SectionBadge label="Devotee Portal — Sri Dwar" />
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
              Register with<br /><span className="text-[#FFB347]">{selectedTemple.length > 40 ? selectedTemple.slice(0, 40) + "…" : selectedTemple}</span>
            </h2>
            <p className="text-white/50 text-sm">
              {isNewTemple ? "Your temple will be registered and reviewed by our team." : "Complete your details to receive your Dharmic ID."}
            </p>
          </div>

          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
            <InputField
              label="Full Name"
              icon={User}
              value={devotee.name}
              onChange={v => setDevotee(p => ({ ...p, name: v }))}
              placeholder="As per your Aadhaar / ID"
              error={devoteeErrors.name}
              required
            />
            <InputField
              label="Mobile Number"
              icon={Phone}
              type="tel"
              value={devotee.phone}
              onChange={v => setDevotee(p => ({ ...p, phone: v }))}
              placeholder="+91 9XXXXXXXXX"
              error={devoteeErrors.phone}
              required
            />
            <InputField
              label="Email Address (optional)"
              icon={Mail}
              type="email"
              value={devotee.email}
              onChange={v => setDevotee(p => ({ ...p, email: v }))}
              placeholder="your@email.com"
              error={devoteeErrors.email}
            />
            <InputField
              label="Your City / Location"
              icon={MapPin}
              value={devotee.city}
              onChange={v => setDevotee(p => ({ ...p, city: v }))}
              placeholder="e.g. Bhubaneswar, Odisha"
              error={devoteeErrors.city}
              required
            />

            {/* Puja / Seva request */}
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                Request a Puja / Seva <span className="text-white/30 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5EEAD4]/60 pointer-events-none" />
                <select
                  value={devotee.puja}
                  onChange={e => setDevotee(p => ({ ...p, puja: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#5EEAD4]/50 transition-all appearance-none cursor-pointer"
                >
                  <option value="" className="bg-[#021816]">— Select a Puja or Seva —</option>
                  {PUJA_OPTIONS.map(p => (
                    <option key={p} value={p} className="bg-[#021816]">{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                Additional Message / Sankalp <span className="text-white/30 font-normal">(optional)</span>
              </label>
              <textarea
                value={devotee.notes}
                onChange={e => setDevotee(p => ({ ...p, notes: e.target.value }))}
                rows={3}
                placeholder="Gotra, Rashi, special prayers, or any message for the temple…"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#5EEAD4]/50 transition-all resize-none"
              />
            </div>

            <button
              onClick={handleDevoteeSubmit}
              disabled={submittingDevotee}
              className="w-full bg-gradient-to-r from-[#FFB347] to-[#FF9933] hover:from-[#F27D26] hover:to-[#E8851A] disabled:opacity-60 text-[#021816] font-bold py-3.5 rounded-2xl flex items-center justify-center space-x-2 transition-all cursor-pointer text-sm tracking-wide shadow-lg"
            >
              <ChevronRight className="w-4 h-4" />
              <span>Continue to Contribution</span>
            </button>

            <p className="text-center text-[10px] text-white/30 font-mono">
              An Initiative by Sridwar Technology · Your data is saved securely.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // ── Step: Find Temple (Home section) ─────────────────────────────────────
  return (
    <section
      id="temple-finder-section"
      className="py-16 sm:py-20 bg-gradient-to-b from-[#051F1A] via-[#021816] to-[#051F1A] relative text-white"
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-[#FFB347]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[#5EEAD4]/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Header */}
        <div className="text-center mb-10 space-y-3">
          <SectionBadge label="An Initiative by Sridwar Technology" />
          <h2 className="text-3xl sm:text-4xl font-serif font-black text-white leading-tight">
            Find &amp; Register Your<br />
            <span className="text-[#FFB347]">Native Temple</span> or Puja Committee
          </h2>
          <p className="text-white/55 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Search for your local temple, puja committee, or mandal. Don't find it? Register it for free — and connect
            thousands of devotees to your sacred space.
          </p>
        </div>

        {/* Main search card */}
        <div className="glass-panel-dark rounded-3xl p-6 sm:p-8 border border-white/10 space-y-6">

          {/* Searchable dropdown */}
          <div ref={dropRef} className="relative">
            <label className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider font-mono">
              Search Temple / Puja Committee / Mandal
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5EEAD4]/60 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setDropdownOpen(true); setSelectedTemple(""); }}
                onFocus={() => setDropdownOpen(true)}
                placeholder="Type temple name, city, deity, or state…"
                className="w-full bg-white/5 border border-white/12 rounded-2xl pl-11 pr-11 py-3.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#FFB347]/50 focus:bg-white/8 transition-all"
              />
              <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </div>

            {/* Dropdown */}
            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#051F1A] border border-white/12 rounded-2xl shadow-2xl z-50 max-h-64 overflow-y-auto">
                {filtered.length > 0 ? (
                  <>
                    {filtered.map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleSelectTemple(t.name)}
                        className="w-full flex items-start space-x-3 px-4 py-3 hover:bg-white/5 text-left transition-colors cursor-pointer border-b border-white/5 last:border-0"
                      >
                        <MapPin className="w-3.5 h-3.5 text-[#FFB347]/60 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm text-white font-medium leading-snug">{t.name}</p>
                          <p className="text-[11px] text-white/40">{t.city}, {t.state}</p>
                        </div>
                        {selectedTemple === t.name && <Check className="w-4 h-4 text-[#5EEAD4] ml-auto shrink-0" />}
                      </button>
                    ))}
                    {/* Add new temple always shown at bottom */}
                    <button
                      onClick={() => { handleSelectTemple(searchQuery.trim() || "New Temple", true); setDropdownOpen(false); setStep("temple-reg"); }}
                      className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-[#FFB347]/8 text-left transition-colors cursor-pointer bg-[#FFB347]/5"
                    >
                      <Plus className="w-4 h-4 text-[#FFB347] shrink-0" />
                      <div>
                        <p className="text-sm text-[#FFB347] font-semibold">Register a New Temple / Puja Committee</p>
                        <p className="text-[11px] text-white/40">Can't find yours? List it on Sri Dwar for free</p>
                      </div>
                    </button>
                  </>
                ) : showAddNew ? (
                  <button
                    onClick={() => { setStep("temple-reg"); setTempleReg(p => ({ ...p, templeName: searchQuery })); setDropdownOpen(false); }}
                    className="w-full flex items-center space-x-3 px-4 py-3.5 hover:bg-[#FFB347]/8 text-left transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-[#FFB347] shrink-0" />
                    <div>
                      <p className="text-sm text-[#FFB347] font-semibold">Register "{searchQuery}"</p>
                      <p className="text-[11px] text-white/40">Submit this temple / puja committee for listing on Sri Dwar</p>
                    </div>
                  </button>
                ) : (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm text-white/40">Start typing to search temples…</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected temple preview */}
          {selectedTemple && !dropdownOpen && (
            <div className="flex items-center space-x-3 bg-[#FFB347]/8 border border-[#FFB347]/20 rounded-xl px-4 py-3">
              <Check className="w-4 h-4 text-[#FFB347] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#FFB347] truncate">{selectedTemple}</p>
                {isNewTemple && <p className="text-[11px] text-white/40">New — will be submitted for listing</p>}
              </div>
              <button onClick={() => { setSelectedTemple(""); setSearchQuery(""); }} className="text-white/30 hover:text-white/60 cursor-pointer transition-colors shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                if (!selectedTemple) { alert("Please select or enter a temple / puja committee first."); return; }
                if (isNewTemple) { setStep("temple-reg"); } else { setStep("portal"); }
              }}
              className="flex-1 bg-gradient-to-r from-[#FFB347] to-[#FF9933] hover:from-[#F27D26] hover:to-[#E8851A] text-[#021816] font-bold py-3.5 rounded-2xl flex items-center justify-center space-x-2 transition-all cursor-pointer text-sm shadow-lg shadow-[#FFB347]/20"
            >
              <Heart className="w-4 h-4" />
              <span>Register as Devotee</span>
            </button>

            <button
              onClick={() => setStep("temple-reg")}
              className="flex-1 sm:flex-none bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/25 text-white font-semibold py-3.5 px-6 rounded-2xl flex items-center justify-center space-x-2 transition-all cursor-pointer text-sm"
            >
              <Building2 className="w-4 h-4 text-[#5EEAD4]" />
              <span>Register My Temple</span>
            </button>
          </div>

          {/* Feature chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            {[
              { icon: "🏛️", label: `${TEMPLES_LIST.length}+ Temples Listed` },
              { icon: "🆓", label: "Free Registration" },
              { icon: "📋", label: "Google Sheets Sync" },
              { icon: "🪪", label: "Dharmic ID" },
            ].map(f => (
              <span key={f.label} className="flex items-center space-x-1.5 bg-white/4 border border-white/8 rounded-full px-3 py-1 text-[11px] text-white/50">
                <span>{f.icon}</span><span>{f.label}</span>
              </span>
            ))}
          </div>

          {/* Shareable temple reg link */}
          <div className="border-t border-white/8 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-white/50 mb-0.5">Temple / Authority Registration Link</p>
              <p className="text-[11px] text-white/30 font-mono">Share this with your temple management for direct access</p>
            </div>
            <button
              onClick={() => {
                const url = `${window.location.origin}${window.location.pathname}?page=temple-register`;
                navigator.clipboard.writeText(url);
                alert("✅ Temple registration link copied to clipboard!");
              }}
              className="flex items-center space-x-2 bg-[#5EEAD4]/10 hover:bg-[#5EEAD4]/15 border border-[#5EEAD4]/20 text-[#5EEAD4] text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Copy Link</span>
            </button>
          </div>
        </div>

        {/* Initiative footer */}
        <p className="text-center text-[10px] text-white/25 font-mono mt-6 tracking-wider">
          🕉️ An Initiative by Sridwar Technology · Empowering Every Temple, Every Devotee
        </p>
      </div>
    </section>
  );
}
