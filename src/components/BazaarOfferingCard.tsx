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

import { useState } from "react";
import {
  ShoppingBag, Flame, Check, ChevronDown, ShieldCheck, BadgeCheck, Gift,
} from "lucide-react";
import { BazaarProduct, BAZAAR_ADDONS, BAZAAR_CUSTOM_AMOUNT_NOTE } from "../data/bazaarOfferings";

interface BazaarOfferingCardProps {
  product: BazaarProduct;
  isActive: boolean;
  onActivate: () => void;
  /** Fires the primary CTA ("Offer in Temple" / "Buy Now") — hands a fully
   *  composed, human-readable item name and final amount straight to the
   *  existing Puja Sankalpa Portal + UPI payment flow in TemplateBazaar. */
  onOffer: (product: BazaarProduct, composedName: string, amount: number) => void;
  /** Fires "Add to Cart" — adds the composed item to the lightweight
   *  Devotional Shopping cart in TemplateBazaar. */
  onAddToCart: (product: BazaarProduct, composedName: string, amount: number) => void;
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
    return `${parts.join(" ")} — ${detailBits.join(", ")}`;
  };

  const resetAfterAction = () => {
    setSelectedAddOns({});
    setAddOnText({});
  };

  const handlePrimary = () => {
    if (!isActive) { onActivate(); return; }
    if (isCustomSelected && !customAmountValid) { alert(BAZAAR_CUSTOM_AMOUNT_NOTE); return; }
    onOffer(product, buildComposedName(), finalAmount);
    resetAfterAction();
    setJustAdded("offer");
    setTimeout(() => setJustAdded(null), 5000);
  };

  const handleAddToCart = () => {
    if (!isActive) { onActivate(); return; }
    if (isCustomSelected && !customAmountValid) { alert(BAZAAR_CUSTOM_AMOUNT_NOTE); return; }
    onAddToCart(product, buildComposedName(), finalAmount);
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
          <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover object-center select-none filter brightness-90" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#021816]/90 to-transparent p-2">
            <span className="text-[9px] font-mono font-bold text-teal-300 bg-black/40 px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm">
              {product.category}
            </span>
          </div>
        </div>
      ) : (
        <div className="w-full h-44 bg-gradient-to-br from-[#0D2F2B] to-[#021816] flex items-center justify-between px-4">
          <span className="text-[9px] font-mono font-bold text-teal-300 uppercase tracking-wider">{product.category}</span>
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
          <h4 className="text-base font-serif font-bold text-white">{product.title}</h4>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {product.badges.map((b) => (
            <span key={b} className="flex items-center space-x-1 bg-white/4 border border-white/8 rounded-full px-2.5 py-0.5 text-[9px] text-white/55">
              <BadgeCheck className="w-2.5 h-2.5 text-[#5EEAD4]" /><span>{b}</span>
            </span>
          ))}
        </div>

        <p className="text-[11px] text-white/70 leading-relaxed mb-3">{product.description}</p>

        {justAdded && (
          <div className="flex items-start space-x-1.5 text-[11px] text-[#5EEAD4] bg-[#5EEAD4]/10 border border-[#5EEAD4]/25 rounded-xl px-3 py-2 mb-3">
            <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              {justAdded === "cart"
                ? "Added to cart — you can add more items or continue below."
                : "Details captured — please complete your Sankalpa in the form that just opened."}
            </span>
          </div>
        )}

        <div className="space-y-1.5 mb-3">
          <span className="block text-[10px] font-bold text-white/60 uppercase tracking-wide">This includes</span>
          <ul className="space-y-1">
            {product.includes.map((item, i) => (
              <li key={i} className="flex items-start space-x-1.5 text-[11px] text-white/70">
                <Check className="w-3 h-3 text-[#5EEAD4] flex-shrink-0 mt-0.5" /><span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-1.5 mb-4">
          <span className="block text-[10px] font-bold text-white/60 uppercase tracking-wide">You will receive</span>
          <ul className="space-y-1">
            {product.devoteeReceives.map((item, i) => (
              <li key={i} className="flex items-start space-x-1.5 text-[11px] text-white/70">
                <Check className="w-3 h-3 text-[#FFB347] flex-shrink-0 mt-0.5" /><span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Price + Quantity — always visible */}
        <div className="grid grid-cols-2 gap-2 mb-3" onClick={(e) => e.stopPropagation()}>
          <div>
            <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1.5">Amount / Tier</label>
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
            <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1.5">Quantity</label>
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
            <p className="text-[9px] text-white/40 mt-1">{BAZAAR_CUSTOM_AMOUNT_NOTE}</p>
          </div>
        )}

        {/* Extra option dropdowns (Bhog Type, Mala Type, Item Type…) */}
        {product.options.length > 0 && (
          <div className="space-y-2.5 mb-3" onClick={(e) => e.stopPropagation()}>
            {product.options.map((group) => (
              <div key={group.id}>
                <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1">{group.label}</label>
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

        {/* Devotional add-ons — shown once the card is the active selection */}
        {isActive && (
          <div className="space-y-2 mb-4 pt-3 border-t border-white/10" onClick={(e) => e.stopPropagation()}>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-white/60 uppercase tracking-wide">
              <Gift className="w-3 h-3 text-[#FFB347]" /> Devotional Add-ons
            </span>
            {BAZAAR_ADDONS.map((addOn) => (
              <div key={addOn.id}>
                <label className="flex items-center gap-2 text-[11px] text-white/75 cursor-pointer">
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
          <span className="text-[10px] text-white/50">Total</span>
          <span className="text-base font-extrabold text-[#FFB347] font-serif">₹{finalAmount > 0 ? finalAmount.toLocaleString("en-IN") : "—"}</span>
        </div>

        <div className="flex items-center space-x-1.5 text-[10px] text-white/50 mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-[#5EEAD4] flex-shrink-0" />
          <span>{product.isService ? "Offered as per temple schedule; digital confirmation shared after completion." : "Dispatched after payment confirmation; digital confirmation shared after dispatch."}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handlePrimary(); }}
            className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold py-2.5 rounded-xl text-[10px] tracking-wider uppercase transition-all shadow flex items-center justify-center gap-1.5"
          >
            {product.isService ? <Flame className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
            {isActive ? product.ctaLabels.primary : "Select"}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleAddToCart(); }}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/15 text-white font-bold py-2.5 rounded-xl text-[10px] tracking-wider uppercase transition-all flex items-center justify-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            {product.ctaLabels.secondary}
          </button>
        </div>
      </div>
    </div>
  );
}
