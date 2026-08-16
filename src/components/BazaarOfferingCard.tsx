/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BazaarOfferingCard — structured Devotional Shopping product card used by
 * the "Devotional Shopping Offerings" grid inside Temple Bazaar Store
 * (TemplateBazaar.tsx). Mirrors the SevaOfferingCard pattern (image banner,
 * includes / devotee-receives lists, tiered price dropdown, custom amount)
 * with the additions the Bazaar needs: a quantity dropdown, optional extra
 * dropdown(s) (Bhog Type, Mala Type, Item Type…), and devotional add-ons.
 */

import { useState, useMemo } from "react";
import {
  ShoppingBag, Flame, Check, ChevronDown, ChevronUp, ShieldCheck, BadgeCheck, Gift, MapPin, AlertCircle,
} from "lucide-react";
import { BazaarProduct, BAZAAR_ADDONS, BAZAAR_CUSTOM_AMOUNT_NOTE } from "../data/bazaarOfferings";
import { getPriestById, getPriestsByKeywords } from "../data/priests";
import { TEMPLES_LIST } from "../data/temples";
import { SEVA_OCCASIONS } from "../data/sevaOfferings";
import OptimizedImage from "./OptimizedImage";
import { validatePincode } from "../utils/formValidation";

// Bhog Offerings is the one Devotional Shopping product actually offered
// AT a temple (product.isService === true, prepared/offered to the
// deity) rather than shipped — so it's the only product card that gets
// the Occasion + dropdown and Temple Selection + dropdown patterns
// already used elsewhere (Structured Seva Offerings / Simple Pujas).
// Every other Devotional Shopping item (Puja Kits, Mala & Beads, Diya &
// Dhoop, Prasad & Blessed Items) is a physical item shipped to the
// devotee, so occasion/temple do not apply there.
const isBhogOffering = (product: BazaarProduct) => product.category === "Bhog Offerings";

interface BazaarOfferingCardProps {
  product: BazaarProduct;
  isActive: boolean;
  onActivate: () => void;
  /** Fires the primary CTA ("Offer in Temple" / "Buy Now") — hands a fully
   *  composed, human-readable item name, final amount, and (for physical
   *  items) the delivery PIN code straight to the existing Puja Sankalpa
   *  Portal + UPI payment flow in TemplateBazaar. */
  onOffer: (product: BazaarProduct, composedName: string, amount: number, pincode: string) => void;
  /** Fires "Add to Cart" — adds the composed item to the lightweight
   *  Devotional Shopping cart in TemplateBazaar. */
  onAddToCart: (product: BazaarProduct, composedName: string, amount: number, pincode: string) => void;
}

export default function BazaarOfferingCard({ product, isActive, onActivate, onOffer, onAddToCart }: BazaarOfferingCardProps) {
  const firstNumericOption = product.priceOptions.find((p) => typeof p.value === "number");
  const [selected, setSelected] = useState<string>(firstNumericOption ? String(firstNumericOption.value) : "custom");
  const [customAmount, setCustomAmount] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [optionChoices, setOptionChoices] = useState<Record<string, string>>(
    () => Object.fromEntries(product.options.map((g) => [g.id, g.choices[0]?.value || ""]))
  );
  const [selectedAddOns, setSelectedAddOns] = useState<Record<string, boolean>>({});
  const [addOnText, setAddOnText] = useState<Record<string, string>>({});
  const [justAdded, setJustAdded] = useState<"offer" | "cart" | null>(null);
  // ✅ PROGRESSIVE DISCLOSURE: same fix as SevaOfferingCard.tsx — "This
  // includes" / "You will receive" collapsed by default so a devotee can
  // scan the Bazaar grid by photo/title/badges/price first, then open a
  // card for detail. isActive/CTA/booking fields are unaffected.
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  // Delivery PIN code — only relevant for physical (non-service) items, since
  // shipping cost/availability depends on it. Captured inline on the card
  // (same pattern as Simple Pujas) so it's known before checkout even opens.
  const [pincode, setPincode] = useState("");
  const [pincodeError, setPincodeError] = useState<string | undefined>(undefined);
  // "" = no preference — an approved priest/expert matching this offering
  // blesses/prepares it before dispatch or temple offering. Same pattern as
  // the Simple Pujas and Structured Seva Offering priest selectors: at
  // least 20 genuinely relevant priests, verified against the live
  // directory via each product's priestKeywords.
  const [selectedPriestId, setSelectedPriestId] = useState("");
  const priestOptions = useMemo(
    () => getPriestsByKeywords(product.priestKeywords, 20),
    [product.priestKeywords]
  );
  // Occasion + Temple Selection — only relevant for Bhog Offerings, since
  // Bhog is offered to the deity at a temple (see isBhogOffering above).
  const [occasion, setOccasion] = useState("");
  const [selectedTempleId, setSelectedTempleId] = useState("");

  const isCustomSelected = selected === "custom";
  const selectedOption = product.priceOptions.find((p) => String(p.value) === selected);
  const customAmountNumber = parseInt(customAmount, 10);
  const customAmountValid = !isCustomSelected || (!isNaN(customAmountNumber) && customAmountNumber >= 100);

  const unitPrice = isCustomSelected ? customAmountNumber : (selectedOption?.value as number);
  const finalAmount = (isNaN(unitPrice) ? 0 : unitPrice) * quantity;

  const buildComposedName = (): string => {
    const parts: string[] = [product.title];
    const tierLabel = isCustomSelected ? "Custom Devotional Amount" : selectedOption?.label;
    const detailBits: string[] = [];
    if (tierLabel) detailBits.push(tierLabel);
    product.options.forEach((g) => {
      const chosen = g.choices.find((c) => c.value === optionChoices[g.id]);
      if (chosen) detailBits.push(`${g.label}: ${chosen.label}`);
    });
    if (quantity > 1) detailBits.push(`Qty: ${quantity}`);
    const addOnLabels = BAZAAR_ADDONS.filter((a) => selectedAddOns[a.id]).map((a) =>
      a.requiresText && addOnText[a.id]?.trim() ? `${a.label} (${addOnText[a.id].trim()})` : a.label
    );
    if (addOnLabels.length) detailBits.push(`Add-ons: ${addOnLabels.join(", ")}`);
    if (isBhogOffering(product)) {
      const occasionLabel = SEVA_OCCASIONS.find((o) => o.value === occasion)?.label;
      if (occasionLabel) detailBits.push(`Occasion: ${occasionLabel}`);
      const chosenTemple = selectedTempleId ? TEMPLES_LIST.find((t) => t.id === selectedTempleId) : undefined;
      detailBits.push(`Temple Selection: ${chosenTemple ? chosenTemple.name : "Any Temple"}`);
    }
    const chosenPriest = selectedPriestId ? getPriestById(selectedPriestId) : undefined;
    detailBits.push(`Priest/Expert Selection: ${chosenPriest ? chosenPriest.name : "Any approved priest/expert for this offering"}`);
    return `${parts.join(" ")} — ${detailBits.join(", ")}`;
  };

  const resetAfterAction = () => {
    setSelectedAddOns({});
    setAddOnText({});
    setPincode("");
    setPincodeError(undefined);
    setSelectedPriestId("");
    setOccasion("");
    setSelectedTempleId("");
  };

  const handlePrimary = () => {
    if (!isActive) { onActivate(); return; }
    if (isCustomSelected && !customAmountValid) { alert(BAZAAR_CUSTOM_AMOUNT_NOTE); return; }
    if (!product.isService) {
      const err = validatePincode(pincode);
      if (err) { setPincodeError(err); return; }
    }
    onOffer(product, buildComposedName(), finalAmount, pincode.trim());
    resetAfterAction();
    setJustAdded("offer");
    setTimeout(() => setJustAdded(null), 5000);
  };

  const handleAddToCart = () => {
    if (!isActive) { onActivate(); return; }
    if (isCustomSelected && !customAmountValid) { alert(BAZAAR_CUSTOM_AMOUNT_NOTE); return; }
    if (!product.isService) {
      const err = validatePincode(pincode);
      if (err) { setPincodeError(err); return; }
    }
    onAddToCart(product, buildComposedName(), finalAmount, pincode.trim());
    resetAfterAction();
    setJustAdded("cart");
    setTimeout(() => setJustAdded(null), 5000);
  };

  return (
    <div
      id={`bazaar-offering-${product.id}`}
      onClick={() => { if (!isActive) onActivate(); }}
      className={`bg-[#092320] rounded-3xl border text-left transition-all flex flex-col text-white overflow-hidden ${
        isActive ? "border-[#FFB347]/60 shadow-lg shadow-[#FFB347]/10" : "border-white/10 hover:border-[#5EEAD4]/25 cursor-pointer"
      }`}
    >
      {/* Image or icon banner — fixed height so every card in the grid lines up */}
      {product.imageUrl ? (
        <div className="w-full h-44 relative overflow-hidden">
          <OptimizedImage src={product.imageUrl} alt={product.title} className="w-full h-full object-cover object-center select-none filter brightness-90" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#021816]/90 to-transparent p-2">
            <span className="text-[11px] font-mono font-bold text-teal-300 bg-black/40 px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm">
              {product.category}
            </span>
          </div>
        </div>
      ) : (
        <div className="w-full h-44 bg-gradient-to-br from-[#0D2F2B] to-[#021816] flex items-center justify-between px-4">
          <span className="text-[11px] font-mono font-bold text-teal-300 uppercase tracking-wider">{product.category}</span>
          <div className="p-2 rounded-xl bg-white/5 border border-white/10">
            <ShoppingBag className="w-4 h-4 text-[#FFB347]" />
          </div>
        </div>
      )}

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center space-x-2 mb-2">
          <div className="p-1.5 rounded-lg bg-white/5 border border-white/15">
            {product.isService ? <Flame className="w-4 h-4 text-orange-500" fill="currentColor" /> : <ShoppingBag className="w-4 h-4 text-[#5EEAD4]" />}
          </div>
          <h4 className="text-lg font-serif font-bold text-white">{product.title}</h4>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {product.badges.map((b) => (
            <span key={b} className="flex items-center space-x-1 bg-white/4 border border-white/8 rounded-full px-2.5 py-0.5 text-[11px] text-white/55">
              <BadgeCheck className="w-2.5 h-2.5 text-[#5EEAD4]" /><span>{b}</span>
            </span>
          ))}
        </div>

        <p className="text-[13px] text-white/70 leading-relaxed mb-3">{product.description}</p>

        {justAdded && (
          <div className="flex items-start space-x-1.5 text-[13px] text-[#5EEAD4] bg-[#5EEAD4]/10 border border-[#5EEAD4]/25 rounded-xl px-3 py-2 mb-3">
            <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              {justAdded === "cart"
                ? "Added to cart — you can add more items or continue below."
                : "Details captured — please complete your Sankalpa in the form that just opened."}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setIsDetailsExpanded((v) => !v); }}
          aria-expanded={isDetailsExpanded}
          className="flex items-center gap-1 text-[12px] font-bold text-[#5EEAD4] hover:text-[#7FF4DE] uppercase tracking-wide mb-3 -mt-1 transition-colors"
        >
          {isDetailsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{isDetailsExpanded ? "Hide details" : "What's included · What you receive"}</span>
        </button>

        {isDetailsExpanded && (
          <>
            <div className="space-y-1.5 mb-3">
              <span className="block text-[12px] font-bold text-white/60 uppercase tracking-wide">This includes</span>
              <ul className="space-y-1">
                {product.includes.map((item, i) => (
                  <li key={i} className="flex items-start space-x-1.5 text-[13px] text-white/70">
                    <Check className="w-3 h-3 text-[#5EEAD4] flex-shrink-0 mt-0.5" /><span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-1.5 mb-4">
              <span className="block text-[12px] font-bold text-white/60 uppercase tracking-wide">You will receive</span>
              <ul className="space-y-1">
                {product.devoteeReceives.map((item, i) => (
                  <li key={i} className="flex items-start space-x-1.5 text-[13px] text-white/70">
                    <Check className="w-3 h-3 text-[#FFB347] flex-shrink-0 mt-0.5" /><span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Price + Quantity — always visible */}
        <div className="grid grid-cols-2 gap-2 mb-3" onClick={(e) => e.stopPropagation()}>
          <div>
            <label className="block text-[12px] font-bold text-white/60 uppercase tracking-wide mb-1.5">Amount / Tier</label>
            <div className="relative">
              <select
                value={selected}
                onChange={(e) => { setSelected(e.target.value); if (!isActive) onActivate(); }}
                className="w-full appearance-none bg-white/5 border border-white/12 rounded-xl pl-3.5 pr-8 py-2.5 text-xs text-white focus:outline-none focus:border-[#FFB347]/50 focus:bg-white/8 transition-all"
              >
                {product.priceOptions.map((opt) => (
                  <option key={String(opt.value)} value={String(opt.value)} className="bg-[#092320] text-white">
                    {typeof opt.value === "number" ? `₹${opt.value.toLocaleString("en-IN")} — ${opt.label}` : opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-bold text-white/60 uppercase tracking-wide mb-1.5">Quantity</label>
            <div className="relative">
              <select
                value={quantity}
                onChange={(e) => { setQuantity(Number(e.target.value)); if (!isActive) onActivate(); }}
                className="w-full appearance-none bg-white/5 border border-white/12 rounded-xl pl-3.5 pr-8 py-2.5 text-xs text-white focus:outline-none focus:border-[#FFB347]/50 focus:bg-white/8 transition-all"
              >
                {[1, 2, 3, 4, 5].map((q) => (
                  <option key={q} value={q} className="bg-[#092320] text-white">{q}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
            </div>
          </div>
        </div>

        {isCustomSelected && product.customAmountEnabled && (
          <div className="mb-3" onClick={(e) => e.stopPropagation()}>
            <input
              type="number"
              min={100}
              placeholder="Enter custom amount (₹)"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="w-full bg-white/5 border border-white/12 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFB347]/50"
            />
            <p className="text-[11px] text-white/40 mt-1">{BAZAAR_CUSTOM_AMOUNT_NOTE}</p>
          </div>
        )}

        {/* Extra option dropdowns (Bhog Type, Mala Type, Item Type…) */}
        {product.options.length > 0 && (
          <div className="space-y-2.5 mb-3" onClick={(e) => e.stopPropagation()}>
            {product.options.map((group) => (
              <div key={group.id}>
                <label className="block text-[12px] font-bold text-white/60 uppercase tracking-wide mb-1">{group.label}</label>
                <div className="relative">
                  <select
                    value={optionChoices[group.id]}
                    onChange={(e) => setOptionChoices((p) => ({ ...p, [group.id]: e.target.value }))}
                    className="w-full appearance-none bg-white/5 border border-white/12 rounded-xl pl-3.5 pr-8 py-2.5 text-xs text-white focus:outline-none focus:border-[#FFB347]/50"
                  >
                    {group.choices.map((c) => (
                      <option key={c.value} value={c.value} className="bg-[#092320] text-white">{c.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delivery PIN code — shown once active, only for physical (shippable) items */}
        {isActive && !product.isService && (
          <div className="mb-3 pt-3 border-t border-white/10" onClick={(e) => e.stopPropagation()}>
            <label className="flex items-center gap-1.5 text-[12px] font-bold text-white/60 uppercase tracking-wide mb-1">
              <MapPin className="w-3 h-3 text-[#FFB347]" /> Delivery PIN Code
            </label>
            <input
              type="text" inputMode="numeric" maxLength={6}
              value={pincode}
              onChange={(e) => { setPincode(e.target.value.replace(/\D/g, "")); if (pincodeError) setPincodeError(undefined); }}
              placeholder="6-digit PIN code"
              className={`w-full bg-white/5 border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none ${
                pincodeError ? "border-red-400/60 focus:border-red-400" : "border-white/12 focus:border-[#FFB347]/50"
              }`}
            />
            {pincodeError ? (
              <p className="flex items-center gap-1 text-[12px] text-red-300 mt-1"><AlertCircle className="w-3 h-3 flex-shrink-0" />{pincodeError}</p>
            ) : (
              <p className="text-[11px] text-white/40 mt-1">Shipping charges apply and may vary based on your PIN code.</p>
            )}
          </div>
        )}

        {/* Occasion + Temple Selection — only for Bhog Offerings, since Bhog
            is offered to the deity at a temple. Replicates the Occasion +
            dropdown pattern from Structured Seva Offerings and the Temple
            Selection + dropdown pattern from Simple Pujas. */}
        {isActive && isBhogOffering(product) && (
          <div className="space-y-2.5 mb-3 pt-3 border-t border-white/10" onClick={(e) => e.stopPropagation()}>
            <div>
              <label className="block text-[12px] font-bold text-white/60 uppercase tracking-wide mb-1">Temple Selection</label>
              <div className="relative">
                <select
                  id={`bazaar-offering-temple-${product.id}`}
                  value={selectedTempleId}
                  onChange={(e) => setSelectedTempleId(e.target.value)}
                  className="w-full appearance-none bg-white/5 border border-white/12 rounded-xl pl-3.5 pr-9 py-2.5 text-xs text-white focus:outline-none focus:border-[#FFB347]/50 focus:bg-white/8 transition-all"
                >
                  <option value="" className="bg-[#092320] text-white">Any Temple</option>
                  {[...TEMPLES_LIST].sort((a, b) => a.name.localeCompare(b.name)).map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#092320] text-white">
                      {t.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-white/60 uppercase tracking-wide mb-1">Occasion</label>
              <div className="relative">
                <select
                  id={`bazaar-offering-occasion-${product.id}`}
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
          </div>
        )}

        {/* Priest / Expert Selection — shown once the card is the active
            selection, same pattern as Simple Pujas and Structured Seva
            Offerings. Optional: an approved priest/expert is assigned by
            the temple if left on "Any". */}
        {isActive && (
          <div className="mb-3 pt-3 border-t border-white/10" onClick={(e) => e.stopPropagation()}>
            <label className="block text-[12px] font-bold text-white/60 uppercase tracking-wide mb-1">Priest / Expert Selection</label>
            <div className="relative">
              <select
                id={`bazaar-offering-priest-${product.id}`}
                value={selectedPriestId}
                onChange={(e) => setSelectedPriestId(e.target.value)}
                className="w-full appearance-none bg-white/5 border border-white/12 rounded-xl pl-3.5 pr-9 py-2.5 text-xs text-white focus:outline-none focus:border-[#FFB347]/50 focus:bg-white/8 transition-all"
              >
                <option value="" className="bg-[#092320] text-white">Any approved priest/expert for this offering</option>
                {priestOptions.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#092320] text-white">
                    {p.name} — {p.currentCity}, {p.currentState} ({p.yearsExperience} yrs)
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
            </div>
            <p className="text-[11px] text-white/40 mt-1">
              If your chosen Pandit/Priest/Expert is unavailable, another approved and equally experienced priest/expert will graciously bless and prepare this offering on your behalf, with the same devotion and tradition.
            </p>
          </div>
        )}

        {/* Devotional add-ons — shown once the card is the active selection */}
        {isActive && (
          <div className="space-y-2 mb-4 pt-3 border-t border-white/10" onClick={(e) => e.stopPropagation()}>
            <span className="flex items-center gap-1.5 text-[12px] font-bold text-white/60 uppercase tracking-wide">
              <Gift className="w-3 h-3 text-[#FFB347]" /> Devotional Add-ons
            </span>
            {BAZAAR_ADDONS.map((addOn) => (
              <div key={addOn.id}>
                <label className="flex items-center gap-2 text-[13px] text-white/75 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!selectedAddOns[addOn.id]}
                    onChange={(e) => setSelectedAddOns((p) => ({ ...p, [addOn.id]: e.target.checked }))}
                    className="w-3.5 h-3.5 accent-[#FFB347]"
                  />
                  {addOn.label}
                </label>
                {addOn.requiresText && selectedAddOns[addOn.id] && (
                  <input
                    type="text"
                    value={addOnText[addOn.id] || ""}
                    onChange={(e) => setAddOnText((p) => ({ ...p, [addOn.id]: e.target.value }))}
                    placeholder={addOn.textPlaceholder}
                    className="mt-1.5 w-full bg-white/5 border border-white/12 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFB347]/50"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/10 mb-3">
          <span className="text-[12px] text-white/50">Total</span>
          <span className="text-base font-extrabold text-[#FFB347] font-serif">₹{finalAmount > 0 ? finalAmount.toLocaleString("en-IN") : "—"}</span>
        </div>

        <div className="flex items-center space-x-1.5 text-[12px] text-white/50 mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-[#5EEAD4] flex-shrink-0" />
          <span>{product.isService ? "Offered as per temple schedule; digital confirmation shared after completion." : "Dispatched after payment confirmation; digital confirmation shared after dispatch."}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handlePrimary(); }}
            className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold py-2.5 rounded-xl text-[12px] tracking-wider uppercase transition-all shadow flex items-center justify-center gap-1.5"
          >
            {product.isService ? <Flame className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
            {isActive ? product.ctaLabels.primary : "Select"}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleAddToCart(); }}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/15 text-white font-bold py-2.5 rounded-xl text-[12px] tracking-wider uppercase transition-all flex items-center justify-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            {product.ctaLabels.secondary}
          </button>
        </div>
      </div>
    </div>
  );
}
