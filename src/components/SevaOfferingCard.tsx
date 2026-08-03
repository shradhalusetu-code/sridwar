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
import { validatePincode } from "../utils/formValidation";

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
  // Devotee name / email / phone / gotra / sankalp-wish are intentionally
  // NOT collected here — the Sankalp Portal (BookNowWizard) that opens next
  // already asks for every one of those fields exactly once, auto-filled
  // from the devotee's saved Dharmic ID profile when available. This card
  // only ever captures what the Portal does NOT ask for: occasion,
  // preferred seva date, and delivery pincode (for local seva logistics).
  const [occasion, setOccasion] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [pincode, setPincode] = useState("");
  // Validation error for Pincode — shown inline and cleared as soon as the
  // devotee edits the field again.
  const [errors, setErrors] = useState<{ pincode?: string }>({});
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

    // Pincode is the only field left on this card — validate its format
    // only when the devotee actually entered one (it's optional here).
    const pincodeErr = pincode.trim() ? validatePincode(pincode) : null;
    if (pincodeErr) {
      setErrors({ pincode: pincodeErr });
      return;
    }
    setErrors({});

    const amount = isCustomSelected ? customAmountNumber : (selectedOption?.value as number);
    const occasionLabel = SEVA_OCCASIONS.find((o) => o.value === occasion)?.label;

    const detailParts: string[] = [];
    if (selectedOption && !isCustomSelected) detailParts.push(selectedOption.label);
    if (occasionLabel) detailParts.push(`Occasion: ${occasionLabel}`);
    if (preferredDate) detailParts.push(`Preferred Date: ${preferredDate}`);
    if (pincode.trim()) detailParts.push(`Pincode: ${pincode.trim()}`);

    const composedName = detailParts.length ? `${offering.title} — ${detailParts.join(", ")}` : offering.title;

    // ✅ DUPLICATE-SUBMISSION FIX: previously this fired its own immediate
    // Google Form sync (formType "seva") right here, then onOffer() below
    // opens the Puja Sankalpa Portal (BookNowWizard), which fires ITS OWN
    // Pending row + Final row to the same seva_booking sheet — under a
    // completely different, unrelated Ref ID. That meant every single seva
    // offering produced 3 disconnected Google Sheet rows for one devotee
    // action. The Sankalpa Portal's Pending row (fired the instant its
    // Step 1 details are confirmed) already captures the lead even if the
    // devotee abandons before paying, so no capture is lost by removing the
    // extra row here — we just stop tripling it.
    // Devotee name, email, phone, gotra and sankalp wish are collected
    // next, exactly once, inside the Sankalp Portal (BookNowWizard) — the
    // devotee's own name there is what gets attributed to this seva.
    onOffer(offering.id, composedName, amount, "");

    // Reset the form so it's immediately ready for another cow/occasion/etc,
    // and show a short confirmation instead of hiding the card.
    setOccasion("");
    setPreferredDate("");
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

        {/* Common seva form fields — shown once this card is the active
            selection. Only occasion, preferred date and pincode live here —
            the fields the Sankalp Portal doesn't ask for. Devotee name,
            email, phone, gotra and the sankalp wish are collected next,
            exactly once, in the Sankalp Portal — auto-filled from the
            devotee's Dharmic ID profile whenever one exists. */}
        {isActive && (
          <div className="space-y-2.5 mb-4 pt-3 border-t border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1">Preferred Seva Date</label>
                <input
                  type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/12 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FFB347]/50"
                />
              </div>
              <div>
                <label className="flex items-center gap-1 text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1">
                  <MapPin className="w-3 h-3 text-[#FFB347]" /> Pincode
                </label>
                <input
                  type="text" inputMode="numeric" value={pincode}
                  onChange={(e) => { setPincode(e.target.value.replace(/\D/g, "")); if (errors.pincode) setErrors((p) => ({ ...p, pincode: undefined })); }}
                  placeholder="6-digit PIN code (optional)"
                  maxLength={6}
                  className={`w-full bg-white/5 border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none ${
                    errors.pincode ? "border-red-400/60 focus:border-red-400" : "border-white/12 focus:border-[#FFB347]/50"
                  }`}
                />
                {errors.pincode && (
                  <p className="flex items-center gap-1 text-[10px] text-red-300 mt-1"><AlertCircle className="w-3 h-3 flex-shrink-0" />{errors.pincode}</p>
                )}
              </div>
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
            <p className="text-[9px] text-white/40 -mt-1">Your name, gotra, email, phone and sankalp wish are captured next in the Sankalp Portal — auto-filled from your Dharmic ID if you're logged in.</p>
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
