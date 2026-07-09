/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import {
  Heart, Utensils, Flame, Wind, Flower2, Landmark,
  Check, ChevronDown, ShieldCheck, BadgeCheck, CheckCircle2, AlertCircle, MapPin,
} from "lucide-react";
import { SevaOffering, SEVA_OCCASIONS } from "../data/sevaOfferings";
import OptimizedImage from "./OptimizedImage";
import { validateName, validateEmail, validatePhone, validatePincode } from "../utils/formValidation";
import { syncToGoogleForm } from "../utils/googleFormSync";

const renderOfferingIcon = (id: string) => {
  switch (id) {
    case "seva-gau-feeding":        return <Heart className="w-4 h-4 text-emerald-400" fill="currentColor" />;
    case "seva-annadan":            return <Utensils className="w-4 h-4 text-[#FFB347]" />;
    case "seva-deep-daan":          return <Flame className="w-4 h-4 text-orange-500" fill="currentColor" />;
    case "seva-dhoop-camphor":      return <Wind className="w-4 h-4 text-[#5EEAD4]" />;
    case "seva-flower":             return <Flower2 className="w-4 h-4 text-pink-400" />;
    case "seva-temple-maintenance": return <Landmark className="w-4 h-4 text-cyan-300" />;
    default:                        return <Heart className="w-4 h-4 text-[#FFB347]" />;
  }
};

interface SevaOfferingCardProps {
  offering: SevaOffering;
  isActive: boolean;
  onActivate: () => void;
  /** Called with the offering id, a fully composed human-readable seva name,
   *  the final amount, and the devotee name — the (name, price) pair plugs
   *  straight into the existing checkout flow, while the id/devotee name let
   *  the parent surface it on the Live Dashboard. The card itself never
   *  hides or shrinks after this fires — a devotee may want to offer the
   *  same seva again for a different person, so the full form stays
   *  available; only a brief confirmation is shown and the fields reset. */
  onOffer: (offeringId: string, composedName: string, amount: number, devoteeName: string) => void;
}

export default function SevaOfferingCard({ offering, isActive, onActivate, onOffer }: SevaOfferingCardProps) {
  const firstNumericOption = offering.priceOptions.find((p) => typeof p.value === "number");
  const [selected, setSelected] = useState<string>(firstNumericOption ? String(firstNumericOption.value) : "custom");
  const [customAmount, setCustomAmount] = useState("");
  const [devoteeName, setDevoteeName] = useState("");
  const [gotra, setGotra] = useState("");
  const [sankalp, setSankalp] = useState("");
  const [occasion, setOccasion] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  // Pincode — same inline field used on the Simple Pujas cards, so location
  // is captured up front and can be used for local seva logistics/routing.
  const [pincode, setPincode] = useState("");
  // Validation errors for Name/Email/Phone/Pincode — shown inline under each
  // field and cleared as soon as the devotee edits that specific field again.
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string; pincode?: string }>({});
  // Brief "thank you" confirmation shown right after offering — the card
  // itself is never hidden or shrunk, so a devotee can immediately fill the
  // form again to offer the same seva for someone else (e.g. another cow,
  // another family member).
  const [justOffered, setJustOffered] = useState(false);
  const justOfferedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (justOfferedTimeoutRef.current) clearTimeout(justOfferedTimeoutRef.current);
    };
  }, []);

  const isCustomSelected = selected === "custom";
  const selectedOption = offering.priceOptions.find((p) => String(p.value) === selected);
  const customAmountNumber = parseInt(customAmount, 10);
  const customAmountValid = !isCustomSelected || (!isNaN(customAmountNumber) && customAmountNumber >= 100);

  const handleSubmit = () => {
    if (!isActive) { onActivate(); return; }
    if (isCustomSelected && !customAmountValid) { alert("Custom seva amount starts from ₹100."); return; }

    // Validate Name / Phone / Email before anything is synced anywhere.
    // A clear inline error is shown under the relevant field and submission
    // is blocked entirely until every field is corrected.
    const nameErr = validateName(devoteeName);
    const emailErr = validateEmail(email);
    const phoneErr = validatePhone(phone);
    const pincodeErr = validatePincode(pincode);
    if (nameErr || emailErr || phoneErr || pincodeErr) {
      setErrors({ name: nameErr || undefined, email: emailErr || undefined, phone: phoneErr || undefined, pincode: pincodeErr || undefined });
      return;
    }
    setErrors({});

    const amount = isCustomSelected ? customAmountNumber : (selectedOption?.value as number);
    const occasionLabel = SEVA_OCCASIONS.find((o) => o.value === occasion)?.label;

    const detailParts: string[] = [];
    if (selectedOption && !isCustomSelected) detailParts.push(selectedOption.label);
    detailParts.push(`For: ${devoteeName.trim()}`);
    detailParts.push(`Email: ${email.trim()}`);
    detailParts.push(`Phone: ${phone.trim()}`);
    detailParts.push(`Pincode: ${pincode.trim()}`);
    if (gotra.trim()) detailParts.push(`Gotra: ${gotra.trim()}`);
    if (occasionLabel) detailParts.push(`Occasion: ${occasionLabel}`);
    if (preferredDate) detailParts.push(`Preferred Date: ${preferredDate}`);
    if (sankalp.trim()) detailParts.push(`Sankalp: ${sankalp.trim()}`);

    const composedName = `${offering.title} — ${detailParts.join(", ")}`;

    // Immediate sync — fired the moment this button is clicked, so the
    // devotee's validated details reach the team's Google Sheet right away.
    // This does NOT depend on the devotee ever opening, filling, or
    // completing the Puja Sankalpa Portal (payment step) that follows —
    // if they close that portal without paying, this record has already
    // been captured. If they do go on to complete the Puja Sankalpa
    // Portal, that portal syncs its own record as usual (unchanged), so
    // both the initial offering and the payment confirmation are recorded.
    syncToGoogleForm("seva", {
      name: devoteeName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      details: `Seva: ${offering.title} | Amount: ₹${amount} | Pincode: ${pincode.trim()}` +
        (gotra.trim() ? ` | Gotra: ${gotra.trim()}` : "") +
        (occasionLabel ? ` | Occasion: ${occasionLabel}` : "") +
        (preferredDate ? ` | Preferred Date: ${preferredDate}` : "") +
        (sankalp.trim() ? ` | Sankalp: ${sankalp.trim()}` : "") +
        ` | Captured immediately on '${offering.ctaLabel}' click — Puja Sankalpa Portal payment step not yet completed.`,
      type: `Seva Offering - ${offering.title}`,
      gotra: gotra.trim() || undefined,
      intent: sankalp.trim() || undefined,
      dob: preferredDate || undefined,
    }).catch((err) => console.error(`${offering.title} immediate sync error:`, err));

    onOffer(offering.id, composedName, amount, devoteeName.trim());

    // Reset the form so it's immediately ready for another devotee/cow/etc,
    // and show a short confirmation instead of hiding the card.
    setDevoteeName("");
    setGotra("");
    setSankalp("");
    setOccasion("");
    setPreferredDate("");
    setEmail("");
    setPhone("");
    setPincode("");
    setCustomAmount("");
    setJustOffered(true);
    if (justOfferedTimeoutRef.current) clearTimeout(justOfferedTimeoutRef.current);
    justOfferedTimeoutRef.current = setTimeout(() => setJustOffered(false), 6000);
  };

  return (
    <div
      id={`seva-offering-${offering.id}`}
      onClick={() => { if (!isActive) onActivate(); }}
      className={`bg-[#092320] rounded-3xl border text-left transition-all flex flex-col text-white overflow-hidden ${
        isActive ? "border-[#FFB347]/60 shadow-lg shadow-[#FFB347]/10" : "border-white/10 hover:border-[#5EEAD4]/25 cursor-pointer"
      }`}
    >
      {/* Image or icon banner — a fixed height (not aspect-ratio) so all six
          Structured Seva Offering cards get an identically-sized header
          regardless of each source photo's original shape. Some seva photos
          are square (e.g. Flower, Temple Maintenance) while others are
          landscape (e.g. Gau Seva, Annadan) — aspect-ratio containers would
          make the square ones crop very differently and read as "oversized"
          next to the landscape ones, throwing off row alignment in the
          grid. A fixed height + object-cover + centered crop keeps every
          card's header the same size and the cards aligned. */}
      {offering.imageUrl ? (
        <div className="w-full h-44 relative overflow-hidden">
          <OptimizedImage src={offering.imageUrl} alt={offering.title} className="w-full h-full object-cover object-center select-none filter brightness-90" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#021816]/90 to-transparent p-2">
            <span className="text-[9px] font-mono font-bold text-teal-300 bg-black/40 px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm">
              {offering.category}
            </span>
          </div>
        </div>
      ) : (
        <div className="w-full h-44 bg-gradient-to-br from-[#0D2F2B] to-[#021816] flex items-center justify-between px-4">
          <span className="text-[9px] font-mono font-bold text-teal-300 uppercase tracking-wider">{offering.category}</span>
          <div className="p-2 rounded-xl bg-white/5 border border-white/10">{renderOfferingIcon(offering.id)}</div>
        </div>
      )}

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center space-x-2 mb-2">
          <div className="p-1.5 rounded-lg bg-white/5 border border-white/15">{renderOfferingIcon(offering.id)}</div>
          <h4 className="text-base font-serif font-bold text-white">{offering.title}</h4>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {["Starts at ₹100", "Digital Certificate", "Evidence Shared", "Seva in Your Name"].map((b) => (
            <span key={b} className="flex items-center space-x-1 bg-white/4 border border-white/8 rounded-full px-2.5 py-0.5 text-[9px] text-white/55">
              <BadgeCheck className="w-2.5 h-2.5 text-[#5EEAD4]" /><span>{b}</span>
            </span>
          ))}
        </div>

        <p className="text-[11px] text-white/70 leading-relaxed mb-3">{offering.description}</p>

        {justOffered && (
          <div className="flex items-start space-x-1.5 text-[11px] text-[#5EEAD4] bg-[#5EEAD4]/10 border border-[#5EEAD4]/25 rounded-xl px-3 py-2 mb-3">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{offering.title} offered — thank you! You can offer it again below for another person, cow, or occasion.</span>
          </div>
        )}

        <div className="space-y-1.5 mb-3">
          <span className="block text-[10px] font-bold text-white/60 uppercase tracking-wide">This seva includes</span>
          <ul className="space-y-1">
            {offering.includes.map((item, i) => (
              <li key={i} className="flex items-start space-x-1.5 text-[11px] text-white/70">
                <Check className="w-3 h-3 text-[#5EEAD4] flex-shrink-0 mt-0.5" /><span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-1.5 mb-4">
          <span className="block text-[10px] font-bold text-white/60 uppercase tracking-wide">You will receive</span>
          <ul className="space-y-1">
            {offering.devoteeReceives.map((item, i) => (
              <li key={i} className="flex items-start space-x-1.5 text-[11px] text-white/70">
                <Check className="w-3 h-3 text-[#FFB347] flex-shrink-0 mt-0.5" /><span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Amount / option selector — always visible */}
        <div className="mb-3" onClick={(e) => e.stopPropagation()}>
          <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1.5">{offering.dropdownLabel}</label>
          <div className="relative">
            <select
              id={`seva-offering-select-${offering.id}`}
              value={selected}
              onChange={(e) => { setSelected(e.target.value); if (!isActive) onActivate(); }}
              className="w-full appearance-none bg-white/5 border border-white/12 rounded-xl pl-3.5 pr-9 py-2.5 text-xs text-white focus:outline-none focus:border-[#FFB347]/50 focus:bg-white/8 transition-all"
            >
              {offering.priceOptions.map((opt) => (
                <option key={String(opt.value)} value={String(opt.value)} className="bg-[#092320] text-white">
                  {typeof opt.value === "number" ? `₹${opt.value.toLocaleString("en-IN")} — ${opt.label}` : opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
          </div>

          {isCustomSelected && offering.customAmountEnabled && (
            <div className="mt-2">
              <input
                id={`seva-offering-custom-${offering.id}`}
                type="number"
                min={100}
                placeholder="Enter custom amount (₹)"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full bg-white/5 border border-white/12 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFB347]/50"
              />
              <p className="text-[9px] text-white/40 mt-1">Custom seva amount starts from ₹100.</p>
            </div>
          )}
        </div>

        {/* Common seva form fields — shown once this card is the active selection */}
        {isActive && (
          <div className="space-y-2.5 mb-4 pt-3 border-t border-white/10" onClick={(e) => e.stopPropagation()}>
            <div>
              <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1">Devotee Name</label>
              <input
                type="text" value={devoteeName}
                onChange={(e) => { setDevoteeName(e.target.value); if (errors.name) setErrors((p) => ({ ...p, name: undefined })); }}
                placeholder="Your full name"
                className={`w-full bg-white/5 border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none ${
                  errors.name ? "border-red-400/60 focus:border-red-400" : "border-white/12 focus:border-[#FFB347]/50"
                }`}
              />
              {errors.name && (
                <p className="flex items-center gap-1 text-[10px] text-red-300 mt-1"><AlertCircle className="w-3 h-3 flex-shrink-0" />{errors.name}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1">Email Address</label>
                <input
                  type="email" value={email}
                  onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((p) => ({ ...p, email: undefined })); }}
                  placeholder="name@gmail.com"
                  className={`w-full bg-white/5 border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none ${
                    errors.email ? "border-red-400/60 focus:border-red-400" : "border-white/12 focus:border-[#FFB347]/50"
                  }`}
                />
                {errors.email && (
                  <p className="flex items-center gap-1 text-[10px] text-red-300 mt-1"><AlertCircle className="w-3 h-3 flex-shrink-0" />{errors.email}</p>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1">Phone Number</label>
                <input
                  type="tel" value={phone}
                  onChange={(e) => { setPhone(e.target.value); if (errors.phone) setErrors((p) => ({ ...p, phone: undefined })); }}
                  placeholder="10-digit mobile number"
                  className={`w-full bg-white/5 border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none ${
                    errors.phone ? "border-red-400/60 focus:border-red-400" : "border-white/12 focus:border-[#FFB347]/50"
                  }`}
                />
                {errors.phone && (
                  <p className="flex items-center gap-1 text-[10px] text-red-300 mt-1"><AlertCircle className="w-3 h-3 flex-shrink-0" />{errors.phone}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1">Gotra (if applicable)</label>
                <input
                  type="text" value={gotra} onChange={(e) => setGotra(e.target.value)}
                  placeholder="e.g. Kashyap Gotra"
                  className="w-full bg-white/5 border border-white/12 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFB347]/50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1">Preferred Seva Date</label>
                <input
                  type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/12 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FFB347]/50"
                />
              </div>
            </div>
            <div>
              <label className="flex items-center gap-1 text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1">
                <MapPin className="w-3 h-3 text-[#FFB347]" /> Pincode
              </label>
              <input
                type="text" inputMode="numeric" value={pincode}
                onChange={(e) => { setPincode(e.target.value.replace(/\D/g, "")); if (errors.pincode) setErrors((p) => ({ ...p, pincode: undefined })); }}
                placeholder="6-digit PIN code"
                maxLength={6}
                className={`w-full bg-white/5 border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none ${
                  errors.pincode ? "border-red-400/60 focus:border-red-400" : "border-white/12 focus:border-[#FFB347]/50"
                }`}
              />
              {errors.pincode && (
                <p className="flex items-center gap-1 text-[10px] text-red-300 mt-1"><AlertCircle className="w-3 h-3 flex-shrink-0" />{errors.pincode}</p>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1">Occasion</label>
              <div className="relative">
                <select
                  value={occasion} onChange={(e) => setOccasion(e.target.value)}
                  className="w-full appearance-none bg-white/5 border border-white/12 rounded-xl pl-3.5 pr-9 py-2.5 text-xs text-white focus:outline-none focus:border-[#FFB347]/50"
                >
                  <option value="" className="bg-[#092320]">Select occasion (optional)</option>
                  {SEVA_OCCASIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-[#092320]">{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1">Sankalp / Purpose</label>
              <textarea
                rows={2} value={sankalp} onChange={(e) => setSankalp(e.target.value)}
                placeholder="Your prayer or intention for this seva (optional)"
                className="w-full bg-white/5 border border-white/12 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFB347]/50 resize-none"
              />
            </div>
            <p className="text-[9px] text-white/40 -mt-1">Your digital certificate will be sent to the email and phone/WhatsApp number above.</p>
          </div>
        )}

        <div className="flex items-center space-x-1.5 text-[10px] text-white/50 mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-[#5EEAD4] flex-shrink-0" />
          <span>{offering.certificateTimeline}</span>
        </div>

        <button
          id={`seva-offering-cta-${offering.id}`}
          onClick={(e) => { e.stopPropagation(); handleSubmit(); }}
          className="mt-auto w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold py-2.5 rounded-xl text-xs tracking-wider transition-all shadow flex items-center justify-center gap-1.5"
        >
          {renderOfferingIcon(offering.id)}
          {isActive ? offering.ctaLabel.toUpperCase() + " 🙏" : "SELECT THIS SEVA"}
        </button>
      </div>
    </div>
  );
}
