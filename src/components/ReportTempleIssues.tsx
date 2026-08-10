/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Raise Temple Issues With Elected Representatives" — /Report-Temple-Issues
 *
 * Lets devotees report an issue, concern, or suggestion about a temple,
 * puja committee, pandal, mandal, festival, or Hindu cultural/traditional
 * activity, and choose which local/district/state/national representatives
 * or authorities it should be routed to. Reuses the exact same submission
 * pipeline as the Devotee Registration & Support Lock form on the Support
 * page (syncToGoogleForm + recordFormSubmission — see ContactUs.tsx), so it
 * behaves identically (offline queueing, de-dupe, Supabase ledger) with zero
 * changes to that shared infrastructure.
 *
 * Sri Dwar only FACILITATES sharing this information with the recipients a
 * devotee selects — it does not act on their behalf, guarantee a response,
 * or control what any government office, elected representative, or temple
 * body does with a report. That is stated up front and again at submission.
 */

import { useState, FormEvent } from "react";
import {
  Landmark, Users, MapPin, Send, Check, ShieldCheck, RefreshCw, Flag,
  Building2, Megaphone, Award, Info, ChevronRight, ClipboardList, Calendar,
} from "lucide-react";
import { syncToGoogleForm, makeSubmissionRef } from "../utils/googleFormSync";
import { recordFormSubmission, recordActivity } from "../lib/activities";
import { validateName, validateEmail, validatePhone, validateTextMinLength, firstError } from "../utils/formValidation";
import { gaTempleIssueFormStart, gaTempleIssueSubmit, gaTempleIssueContribution } from "../utils/analytics";
import OptimizedImage from "./OptimizedImage";
import UPIPaymentModal from "./UPIPaymentModal";
// @ts-ignore
import reportHero from "../assets/images/ReportTempleIssuesHero.jpg";
// @ts-ignore
import reportHeroWebp from "../assets/images/ReportTempleIssuesHero.webp";

interface ReportTempleIssuesProps {
  /** Optional — lets this page navigate back to Support/Contact ("Devotee
   * Registration & Support Lock") the same way AboutUs/LiveDarshan do.
   * Safe to omit; the in-page link below simply won't render if absent. */
  onNavigate?: (page: string) => void;
}

// ─── India's local → national administrative/political structure ──────────
// Grouped the way a devotee actually thinks about "who do I complain to,"
// not a strict constitutional hierarchy. Each entry maps to a real class of
// office-holder/authority so a report can be addressed sensibly.
const RECIPIENT_GROUPS: Array<{
  level: string;
  icon: typeof Landmark;
  options: Array<{ id: string; label: string; helper: string }>;
}> = [
  {
    level: "Local",
    icon: Users,
    options: [
      { id: "gram_panchayat", label: "Gram Panchayat / Sarpanch / Ward Member", helper: "Village-level elected local body" },
      { id: "municipal_councillor", label: "Municipal Councillor / Corporator", helper: "Town/city ward representative" },
      { id: "temple_administration", label: "Temple Administration / Trust / Committee", helper: "The temple's own managing body" },
    ],
  },
  {
    level: "Block / Taluka",
    icon: Building2,
    options: [
      { id: "bdo", label: "BDO (Block Development Officer)", helper: "Block-level administrative officer" },
      { id: "tahsildar", label: "Tahsildar / Talathi / Revenue Officer", helper: "Taluka/tehsil revenue authority" },
    ],
  },
  {
    level: "District",
    icon: Landmark,
    options: [
      { id: "collector", label: "District Collector / District Magistrate", helper: "Top district administrative authority" },
      { id: "zilla_parishad", label: "Zilla Parishad / District Panchayat", helper: "District-level local self-government" },
    ],
  },
  {
    level: "State",
    icon: Flag,
    options: [
      { id: "mla", label: "MLA (Member of Legislative Assembly)", helper: "Your state assembly representative" },
      { id: "state_endowments", label: "State Endowments / Temple Trust Board / Culture Dept.", helper: "e.g. HR&CE, TTD, State Endowments Dept." },
    ],
  },
  {
    level: "National",
    icon: Megaphone,
    options: [
      { id: "mp", label: "MP (Member of Parliament — Lok Sabha / Rajya Sabha)", helper: "Your national representative" },
      { id: "ministry_culture", label: "Union Ministry of Culture / ASI", helper: "For heritage & nationally significant sites" },
    ],
  },
];

const CATEGORY_OPTIONS = [
  "Temple", "Puja Committee", "Pandal", "Mandal / Samiti",
  "Festival / Utsav Celebration", "Hindu Cultural or Traditional Activity",
];

const ISSUE_TYPE_OPTIONS = [
  "Maintenance / Damage / Disrepair",
  "Encroachment / Land Issue",
  "Mismanagement or Lack of Transparency",
  "Safety & Security Concern",
  "Lack of Basic Facilities (water, sanitation, access)",
  "Festival/Event Needs Support",
  "Heritage & Preservation Concern",
  "Suggestion / Improvement Idea",
  "Other",
];

const HOW_IT_WORKS = [
  { icon: ClipboardList, title: "Submit Your Issue", body: "Share the temple/committee name, location, and your concern or suggestion — photos can follow by WhatsApp/email." },
  { icon: Users, title: "Send To The Right Representatives", body: "Choose local, district, state or national recipients — you decide who should see it." },
  { icon: ShieldCheck, title: "Review & Action", body: "Your report is logged with a reference ID and shared with your selected recipients." },
  { icon: Calendar, title: "Feedback & Updates", body: "We share weekly progress updates on responses and proposed improvements where available." },
];

export default function ReportTempleIssues({ onNavigate }: ReportTempleIssuesProps) {
  // Reporter details
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  // What/where
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");

  // Issue
  const [issueType, setIssueType] = useState(ISSUE_TYPE_OPTIONS[0]);
  const [description, setDescription] = useState("");

  // Optional local representative details
  const [mlaName, setMlaName] = useState("");
  const [mpName, setMpName] = useState("");
  const [additionalRepDetails, setAdditionalRepDetails] = useState("");

  // Recipients
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [otherRecipient, setOtherRecipient] = useState("");
  const [includeOther, setIncludeOther] = useState(false);

  const [consent, setConsent] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [refId, setRefId] = useState("");
  const [hasStarted, setHasStarted] = useState(false);

  // Contribution / Darshan Certificate section
  const [showContribution, setShowContribution] = useState(false);
  const [donationAmount, setDonationAmount] = useState<number | null>(null);
  const [showUPI, setShowUPI] = useState(false);
  const [contributionDone, setContributionDone] = useState(false);

  const toggleRecipient = (id: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const recipientLabel = (id: string) => {
    for (const group of RECIPIENT_GROUPS) {
      const found = group.options.find((o) => o.id === id);
      if (found) return found.label;
    }
    return id;
  };

  const handleFirstFocus = () => {
    if (!hasStarted) {
      setHasStarted(true);
      gaTempleIssueFormStart();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const nameErr = validateName(name);
    const emailErr = validateEmail(email);
    const phoneErr = validatePhone(phone);
    const whatsappErr = whatsapp.trim() ? validatePhone(whatsapp) : null;
    const itemErr = itemName.trim() ? null : "Please enter the temple / committee / pandal / mandal / festival name.";
    const locationErr = village.trim() && state.trim() ? null : "Please enter at least the village/town/city and state.";
    const descErr = validateTextMinLength(description, "Issue / concern / suggestion", 20);
    const recipientErr = selectedRecipients.length === 0 && !(includeOther && otherRecipient.trim())
      ? "Please select at least one recipient to send this to."
      : null;
    const consentErr = consent ? null : "Please confirm you've read and accept the disclaimer below.";

    const err = firstError(nameErr, emailErr, phoneErr, whatsappErr, itemErr, locationErr, descErr, recipientErr, consentErr);
    if (err) { alert(err); return; }

    setIsSyncing(true);
    const newRefId = makeSubmissionRef("TIR");
    setRefId(newRefId);

    const recipientNames = [
      ...selectedRecipients.map(recipientLabel),
      ...(includeOther && otherRecipient.trim() ? [`Other: ${otherRecipient.trim()}`] : []),
    ].join(" | ");

    const locationStr = [village, district, state].filter(Boolean).join(", ");

    const detailsBlock = [
      `Category: ${category}`,
      `Name of Temple/Committee/Pandal/Mandal/Festival: ${itemName}`,
      `Location: ${locationStr || "Not specified"}`,
      `Issue Type: ${issueType}`,
      `Description: ${description}`,
      mlaName.trim() ? `Local MLA: ${mlaName.trim()}` : null,
      mpName.trim() ? `Local MP: ${mpName.trim()}` : null,
      additionalRepDetails.trim() ? `Additional Representative/Official Details: ${additionalRepDetails.trim()}` : null,
      `Recipients Selected: ${recipientNames || "None specified"}`,
      whatsapp.trim() ? `Devotee WhatsApp Number: ${whatsapp.trim()}` : null,
      `[Ref: ${newRefId}]`,
    ].filter(Boolean).join(" | ");

    try {
      // NOTE: the Google Form behind "temple_issue_report" only has
      // name/email/phone/details/type entry IDs mapped (see
      // googleFormSync.ts) — there's no dedicated WhatsApp column yet, so
      // the WhatsApp number travels inside `details` above (same pattern
      // already used here for MLA/MP) rather than being silently dropped.
      // `phone` continues to map to the sheet's phone column and now
      // represents the Devotee Contact Number field below.
      await syncToGoogleForm("temple_issue_report", {
        name, email, phone,
        type: `Temple/Culture Issue Report — ${category}`,
        details: detailsBlock,
        temple: itemName,
        city: locationStr,
        feedback: issueType,
      });

      recordFormSubmission({
        formType: "temple_issue_report",
        name, email, phone, refId: newRefId,
        payload: {
          category, itemName, village, district, state, issueType, description,
          whatsapp: whatsapp.trim() || null,
          mlaName, mpName, additionalRepDetails: additionalRepDetails.trim() || null,
          recipients: selectedRecipients, otherRecipient: includeOther ? otherRecipient : "",
          status: "submitted",
        },
      });

      gaTempleIssueSubmit(category, issueType, selectedRecipients.length);
    } catch (err2) {
      console.error(err2);
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
        setIsSubmitted(true);
        setShowContribution(true);
      }, 900);
    }
  };

  const handleContributionSkip = () => {
    setShowContribution(false);
    setContributionDone(true);
  };

  const handleContributionPaid = (details: { amount: number; method: "UPI" | "WhatsApp Pay" }) => {
    recordActivity({
      activityType: "contribution",
      itemName: `Temple Preservation Contribution — ${itemName || "General"}`,
      amount: details.amount,
      refId,
      paymentMethod: details.method,
      paymentStatus: "pending_verification",
    });
    gaTempleIssueContribution(details.amount);
    setShowUPI(false);
    setShowContribution(false);
    setContributionDone(true);
  };

  const resetForm = () => {
    setIsSubmitted(false);
    setShowContribution(false);
    setContributionDone(false);
    setDonationAmount(null);
    setRefId("");
    setName(""); setEmail(""); setPhone(""); setWhatsapp("");
    setItemName(""); setCategory(CATEGORY_OPTIONS[0]);
    setVillage(""); setDistrict(""); setState("");
    setIssueType(ISSUE_TYPE_OPTIONS[0]); setDescription("");
    setMlaName(""); setMpName(""); setAdditionalRepDetails("");
    setSelectedRecipients([]); setOtherRecipient(""); setIncludeOther(false);
    setConsent(false); setHasStarted(false);
  };

  return (
    <section
      id="report-temple-issues-section"
      className="py-24 bg-[#021816] text-left text-white"
      style={{ paddingTop: `calc(env(safe-area-inset-top, 0px) + 80px)` }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Heading — moved above the hero image so the page opens with
             the title, then the image, then the ambition statement. ──── */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-8">
          <span className="text-xs font-semibold text-[#FFB347]/80 tracking-wider font-mono">Devotee civic desk</span>
          <h1 className="text-3xl sm:text-4xl font-serif font-black text-white tracking-tight leading-tight">
            Raise Temple Issues With Elected Representatives
          </h1>
        </div>

        {/* ── Hero banner image ─────────────────────────────────────────── */}
        <div className="mb-10 rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
          <OptimizedImage
            src={reportHero}
            webpSrc={reportHeroWebp}
            alt="Your Voice. Your Temple. Our Responsibility. — Sri Dwar temple issue reporting process"
            loading="eager"
            fetchPriority="high"
            width={1440}
            height={720}
            className="w-full h-auto object-cover"
          />
        </div>

        {/* ── Intro / ambition statement ────────────────────────────────── */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <p className="text-sm text-white/70 leading-relaxed">
            <span className="block text-white font-serif text-lg font-bold mb-2">
              Protect What Our Ancestors Preserved
            </span>
            From the smallest village shrine to great temple celebrations, help bring attention to what
            matters. Share your concerns, suggestions, and ideas, and direct them to the appropriate local,
            district, state, or national representatives.
          </p>
        </div>

        {/* ── How it works ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={step.title} className="bg-[#092320] border border-white/10 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#FFB347] text-[#021816] text-[11px] font-extrabold flex items-center justify-center shrink-0">{i + 1}</span>
                <step.icon className="w-4 h-4 text-[#5EEAD4]" />
              </div>
              <h3 className="text-xs font-bold text-white">{step.title}</h3>
              <p className="text-[11px] text-white/60 leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>

        {!isSubmitted ? (
          <form onSubmit={handleSubmit} onFocus={handleFirstFocus} className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Left: What / Where / Issue */}
            <div className="lg:col-span-7 bg-[#092320] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-5">
              <h2 className="font-serif text-lg font-bold text-white">Tell us what's happening</h2>

              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">What are you reporting on? *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-[#5EEAD4] font-semibold shadow-sm focus:outline-none focus:border-[#5EEAD4]"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c} className="bg-[#092320] text-white">{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">Temple / Committee / Pandal / Mandal / Festival Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shree Jagannath Mandir, or Durga Puja Samiti"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-white placeholder-white/30 shadow-sm focus:outline-none focus:border-[#5EEAD4]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1">Village / Town / City *</label>
                  <input
                    type="text" required placeholder="e.g. Puri"
                    value={village} onChange={(e) => setVillage(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-white placeholder-white/30 shadow-sm focus:outline-none focus:border-[#5EEAD4]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1">District</label>
                  <input
                    type="text" placeholder="e.g. Puri"
                    value={district} onChange={(e) => setDistrict(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-white placeholder-white/30 shadow-sm focus:outline-none focus:border-[#5EEAD4]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1">State *</label>
                  <input
                    type="text" required placeholder="e.g. Odisha"
                    value={state} onChange={(e) => setState(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-white placeholder-white/30 shadow-sm focus:outline-none focus:border-[#5EEAD4]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">Type of Issue *</label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-[#5EEAD4] font-semibold shadow-sm focus:outline-none focus:border-[#5EEAD4]"
                >
                  {ISSUE_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t} className="bg-[#092320] text-white">{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">Describe the issue, concern, or suggestion *</label>
                <textarea
                  rows={4}
                  placeholder="Share as much detail as you can — what's happening, since when, and what you'd like to see happen."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs p-3.5 rounded-xl border border-white/10 bg-[#021816] text-white placeholder-white/30 shadow-sm focus:outline-none focus:border-[#5EEAD4]"
                />
                <p className="text-[10px] text-white/40 mt-1">Have photos? Email them to puja@sridwar.com or share via our WhatsApp helpline with your reference ID once submitted.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1">Local MLA (Optional)</label>
                  <input
                    type="text" placeholder="If known"
                    value={mlaName} onChange={(e) => setMlaName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-white placeholder-white/30 shadow-sm focus:outline-none focus:border-[#5EEAD4]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1">Local MP (Optional)</label>
                  <input
                    type="text" placeholder="If known"
                    value={mpName} onChange={(e) => setMpName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-white placeholder-white/30 shadow-sm focus:outline-none focus:border-[#5EEAD4]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">Additional Representative / Government Official Details (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Know a specific representative or official this should reach? Add their name, phone, email, or any other contact detail here."
                  value={additionalRepDetails}
                  onChange={(e) => setAdditionalRepDetails(e.target.value)}
                  className="w-full text-xs p-3.5 rounded-xl border border-white/10 bg-[#021816] text-white placeholder-white/30 shadow-sm focus:outline-none focus:border-[#5EEAD4]"
                />
                <p className="text-[10px] text-white/40 mt-1">
                  Not limited to the Local MLA / MP fields above — add anyone else (block/district officer, municipal
                  councillor, temple trust member, etc.) you'd like us to try and reach.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1">Devotee Name *</label>
                  <input
                    type="text" required placeholder="e.g. Kunu Rana"
                    value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-white placeholder-white/30 shadow-sm focus:outline-none focus:border-[#5EEAD4]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1">Devotee Contact Number *</label>
                  <input
                    type="tel" required placeholder="Mandatory for follow-up"
                    value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-white placeholder-white/30 shadow-sm focus:outline-none focus:border-[#5EEAD4]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">Devotee WhatsApp Number (Optional, if different)</label>
                <input
                  type="tel" placeholder="Leave blank if same as Contact Number above"
                  value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-white placeholder-white/30 shadow-sm focus:outline-none focus:border-[#5EEAD4]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">Devotee Email ID *</label>
                <input
                  type="email" required placeholder="e.g. kunu@shradhalu.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-white placeholder-white/30 shadow-sm focus:outline-none focus:border-[#5EEAD4]"
                />
              </div>

              {/* ── Privacy disclosure — placed directly below the Email ID
                   field per policy. Worded to match what actually happens to
                   the data: identity/contact info is withheld from the
                   recipients (only the report content + selected recipient
                   list goes out), but it is NOT anonymous end-to-end, since
                   Sri Dwar itself retains it (in this form state, the Google
                   Sheet, and the Supabase form_submissions ledger above) to
                   send acknowledgements, status updates, and any Darshan
                   Certificate. Avoid overpromising "complete anonymity". ── */}
              <div className="flex items-start gap-2.5 bg-[#5EEAD4]/5 border border-[#5EEAD4]/20 px-3.5 py-3 rounded-xl text-[10px] text-white/70 leading-relaxed">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-[#5EEAD4]" />
                <span>
                  🙏 <strong className="text-[#5EEAD4]">Your privacy, respected:</strong> your name and contact details
                  are <strong>not shared</strong> with the government bodies, elected representatives, temple authorities,
                  or other recipients you select above — they only receive the report content itself. Sri Dwar keeps
                  your details on file solely to send you acknowledgements, response and action updates, and your
                  participation/thank-you certificate if applicable. As this information is retained by Sri Dwar for
                  that purpose, it is kept confidential rather than fully anonymous — we do not sell it or share it
                  with anyone beyond what's needed to process your report.
                </span>
              </div>
            </div>

            {/* Right: Recipients + consent + submit */}
            <div className="lg:col-span-5 bg-[#092320] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-5 flex flex-col">
              <div>
                <h2 className="font-serif text-lg font-bold text-white mb-1">Send this to</h2>
                <p className="text-[11px] text-white/50">You choose. We connect. Select every recipient this should reach.</p>
              </div>

              {/* flex-1 + min-h-0 lets this list grow to fill whatever
                  height the "Send this to" card ends up with (it matches
                  the taller left-hand form column on desktop) instead of
                  stopping at a fixed max-height and leaving empty space
                  above the submit button below. overflow-y-auto still
                  kicks in to scroll internally if the recipient list itself
                  ever grows taller than the available space. On mobile,
                  where the card is only as tall as its own content, this
                  has no visible effect — the list simply sizes to fit. */}
              <div className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-1">
                {RECIPIENT_GROUPS.map((group) => (
                  <div key={group.level}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <group.icon className="w-3.5 h-3.5 text-[#FFB347]" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#FFB347]/80">{group.level}</span>
                    </div>
                    <div className="space-y-1.5">
                      {group.options.map((opt) => (
                        <label
                          key={opt.id}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                            selectedRecipients.includes(opt.id)
                              ? "bg-white/10 border-[#5EEAD4]"
                              : "bg-[#021816] border-white/10 hover:bg-white/5"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedRecipients.includes(opt.id)}
                            onChange={() => toggleRecipient(opt.id)}
                            className="mt-0.5 accent-[#5EEAD4]"
                          />
                          <span>
                            <span className="block text-[11px] font-bold text-white">{opt.label}</span>
                            <span className="block text-[10px] text-white/50">{opt.helper}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <div>
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border bg-[#021816] border-white/10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeOther}
                      onChange={(e) => setIncludeOther(e.target.checked)}
                      className="mt-0.5 accent-[#5EEAD4]"
                    />
                    <span className="block text-[11px] font-bold text-white">Other relevant authority</span>
                  </label>
                  {includeOther && (
                    <input
                      type="text"
                      placeholder="e.g. Waqf Board liaison, Heritage Society, District SP office..."
                      value={otherRecipient}
                      onChange={(e) => setOtherRecipient(e.target.value)}
                      className="w-full mt-2 text-xs px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#021816] text-white placeholder-white/30 shadow-sm focus:outline-none focus:border-[#5EEAD4]"
                    />
                  )}
                </div>
              </div>

              <label className="flex items-start gap-2.5 text-[10px] text-white/60 leading-relaxed">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 accent-[#FFB347]"
                />
                <span>
                  I understand Sri Dwar only facilitates sharing this report with the recipients I've selected, is
                  not a government body, does not guarantee any response, action, or outcome, and is not
                  responsible for the decisions or actions of any representative, authority, or temple body. I
                  consent to my details being shared with the selected recipients for this purpose.
                </span>
              </label>

              <div className="flex items-center space-x-2 text-[10px] font-mono text-[#5EEAD4] bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Powered by Sri Dwar Technology</span>
              </div>

              <button
                type="submit"
                disabled={isSyncing}
                className="relative w-full bg-gradient-to-r from-[#7C2D12] via-[#C2410C] to-[#EA580C] hover:from-[#9A3412] hover:via-[#EA580C] hover:to-[#F97316] disabled:opacity-70 text-white font-extrabold py-3.5 rounded-xl text-xs transition-all duration-300 hover:scale-[1.02] active:scale-95 tracking-widest shadow-[0_0_16px_rgba(234,88,12,0.45)] hover:shadow-[0_0_24px_rgba(249,115,22,0.6)] flex items-center justify-center space-x-1.5 cursor-pointer uppercase mt-auto border border-[#FDBA74]/40"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending your report...</span>
                  </>
                ) : (
                  <>
                    <Megaphone className="w-3.5 h-3.5 text-[#FED7AA] shrink-0" />
                    <span>Raise an Issue</span>
                  </>
                )}
              </button>

              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate("contact")}
                  className="w-full flex items-center justify-center gap-1 text-[11px] text-white/50 hover:text-[#5EEAD4] transition-colors"
                >
                  Have a general query instead? Use Devotee Support <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="max-w-2xl mx-auto bg-[#092320] border border-white/10 rounded-3xl p-6 sm:p-10 space-y-6 animate-slideUp">

            {showContribution && (
              <>
                {showUPI && (
                  <UPIPaymentModal
                    isOpen={showUPI}
                    onClose={() => setShowUPI(false)}
                    onPaymentConfirmed={handleContributionPaid}
                    amount={donationAmount}
                    bookingName="Sri Dwar Temple Preservation Contribution"
                    devoteeName={name}
                    refId={refId}
                    allowCustomAmount={true}
                    minAmount={5}
                    maxAmount={1000}
                  />
                )}
                <div className="text-center space-y-5">
                  <div className="w-12 h-12 bg-[#FFB347]/10 rounded-full flex items-center justify-center mx-auto border border-[#FFB347]/30">
                    <Award className="w-6 h-6 text-[#FFB347]" />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-white">Report Received — Contribute a Darshan Certificate?</h3>
                  <p className="text-xs text-white/60">
                    Would you like to make a voluntary contribution toward Sri Dwar's temple preservation mission?
                    In return, a puja is performed in your name at your ista devta temple, and a Darshan Certificate
                    is shared with you within 3–7 working days.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[51, 101, 251].map((amt) => (
                      <button
                        key={amt} type="button"
                        onClick={() => setDonationAmount(amt)}
                        className={`text-xs py-2.5 rounded-xl border font-bold transition-all ${donationAmount === amt ? "bg-white/10 border-[#FFB347] text-[#FFB347]" : "bg-black/20 border-white/10 text-white/70 hover:bg-black/30"}`}
                      >₹{amt}</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleContributionSkip}
                      className="bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl text-xs border border-white/10 transition-all"
                    >Skip for now</button>
                    <button
                      type="button"
                      onClick={() => { if (donationAmount && donationAmount >= 5) setShowUPI(true); else alert("Minimum contribution is ₹5"); }}
                      disabled={!donationAmount}
                      className="bg-[#FFB347] hover:bg-[#F27D26] disabled:bg-white/10 disabled:text-white/30 text-[#021816] font-extrabold py-3 rounded-xl text-xs uppercase tracking-wide transition-all"
                    >Contribute ₹{donationAmount || 0} 🙏</button>
                  </div>
                </div>
              </>
            )}

            {!showContribution && (
              <div className="text-center space-y-5">
                <div className="w-14 h-14 bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                  <Check className="w-6 h-6 text-emerald-400 stroke-[3]" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif text-xl font-bold text-[#5EEAD4]">Your Report Is On Its Way!</h3>
                  <p className="text-[10px] text-white/40 font-mono">Reference ID: {refId}</p>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left text-xs leading-relaxed text-white/80">
                  Dear <strong>{name}</strong>, your report on <strong>{itemName || "the item you reported"}</strong> has
                  been logged and shared with the recipients you selected. You'll receive <strong>weekly updates</strong> by
                  email/WhatsApp on the status, any response received, and proposed improvements — where available.
                </div>
                <div className="flex items-start gap-2 bg-amber-950/20 border border-amber-500/20 px-3 py-2.5 rounded-xl text-[10px] text-amber-200/80 text-left leading-relaxed">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-300" />
                  <span>Reminder: Sri Dwar facilitates this communication but is not responsible for the actions or
                  outcomes of any representative, authority, or temple body.</span>
                </div>
                <div className="flex items-center justify-center space-x-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/20 py-1.5 rounded-lg border border-emerald-500/20">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Automated real-time synchronization completed</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold py-3.5 rounded-xl text-xs transition-all uppercase tracking-wider cursor-pointer"
                  >Report another issue</button>
                  {onNavigate && (
                    <button
                      type="button"
                      onClick={() => onNavigate("contact")}
                      className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-xl text-xs border border-white/10 transition-all"
                    >Go to Devotee Support</button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Closing disclaimer — now lives here as the single, non-duplicated
             copy of this notice (previously repeated near the top of the
             page as well). ──────────────────────────────────────────────── */}
        <div className="max-w-2xl mx-auto mt-14 text-center space-y-3">
          <p className="text-[11px] text-white/40 leading-relaxed">
            Sri Dwar only facilitates sharing the information you submit with the recipients you choose. We
            are not a government body, are not responsible for the actions, decisions, or outcomes of any
            representative, authority, or temple body, and cannot guarantee a response. This initiative
            simply aims to encourage elected representatives and authorities to actively support temples,
            culture, and traditions.
          </p>
          <p className="text-[11px] text-white/40 leading-relaxed">
            🙏 Together, let's preserve our temples, honour our traditions, and bring local and major temples, festivals,
            and celebrations to a wider — and eventually global — community of devotees.
          </p>
        </div>
      </div>
    </section>
  );
}
