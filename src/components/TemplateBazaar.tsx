/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TemplateBazaar — Sri Dwar Sacred Store
 * A curated marketplace for temple prasad, puja kits, and sacred items.
 * Flow: Browse → Select → Enter Devotee Details → UPI Payment
 */

import { useState, FormEvent } from "react";
import { ShoppingBag, X, Star, Package, Truck, ShieldCheck, Tag, ChevronDown, ChevronUp } from "lucide-react";
import UPIPaymentModal from "./UPIPaymentModal";
import { syncToGoogleForm } from "../utils/googleFormSync";
import { validateName, validatePhone, validateEmail, validatePincode } from "../utils/formValidation";
interface BazaarItem {
  id: string;
  name: string;
  description: string;
  price: number;
  mrp: number;
  category: string;
  imageUrl: string | null;
  badge?: string;
  includes?: string[];
}

const BAZAAR_ITEMS: BazaarItem[] = [
  {
    id: "bazaar-puri-prasad",
    name: "Jagannath Puri Mahaprasad Kit",
    description: "Authentic Chhappan Bhog Mahaprasad from Puri Jagannath Temple — sun-dried, ritually sealed, and shipped with blessings.",
    price: 299,
    mrp: 599,
    category: "Prasad",
    imageUrl: import.meta.env.BASE_URL + "images/prasad.jpg",
    badge: "Bestseller",
    includes: ["Dry Prasad 250g", "Temple Certificate", "Blessing Card"],
  },
  {
    id: "bazaar-puja-kit",
    name: "Complete Home Puja Kit",
    description: "All essentials for daily puja — brass diya, incense sticks, kumkum, turmeric, akshat, and a handsigned sankalpa card.",
    price: 449,
    mrp: 899,
    category: "Puja Essentials",
    imageUrl: import.meta.env.BASE_URL + "images/puja.jpg",
    badge: "50% OFF",
    includes: ["Brass Diya", "Incense Sticks (pack of 50)", "Kumkum & Haldi", "Akshat", "Sankalpa Card"],
  },
  {
    id: "bazaar-rudraksha",
    name: "5-Mukhi Rudraksha Mala",
    description: "Certified Nepal-origin 5-faced Rudraksha mala — energised at Kashi Vishwanath Temple with proper Vedic mantras.",
    price: 799,
    mrp: 1599,
    category: "Sacred Items",
    imageUrl: import.meta.env.BASE_URL + "images/bead.jpg",
    badge: "Certified",
    includes: ["108+1 Beads Mala", "Energisation Certificate", "Velvet Pouch"],
  },
  {
    id: "bazaar-incense",
    name: "Temple Incense Collection",
    description: "Hand-rolled incense sticks made from temple-grade sandalwood, mogra, and dhoop — same fragrance used in Lingaraj Temple daily rituals.",
    price: 199,
    mrp: 399,
    category: "Incense & Aroma",
    imageUrl: import.meta.env.BASE_URL + "images/incense.jpg",
    includes: ["Sandalwood (20 sticks)", "Mogra (20 sticks)", "Dhoop (10 sticks)"],
  },
  {
    id: "bazaar-gurukul-kit",
    name: "Sanskrit Gurukul Student Kit",
    description: "Sponsor a complete Vedic student kit — textbooks, Sanskrit grammar guides, and sacred thread — shipped to registered Gurukuls.",
    price: 549,
    mrp: 1099,
    category: "Donation Kits",
    imageUrl: import.meta.env.BASE_URL + "images/kit.jpg",
    badge: "Impact Gift",
    includes: ["Sanskrit Primer", "Devanagari Workbook", "Yajnopavita (Sacred Thread)", "Photo Report from Gurukul"],
  },
  {
    id: "bazaar-maa-idol",
    name: "Maa Durga Brass Idol (6 inch)",
    description: "Hand-cast brass idol of Maa Durga in Mahishasurmardini posture — temple-grade finish, energised before dispatch.",
    price: 999,
    mrp: 1999,
    category: "Sacred Items",
    imageUrl: import.meta.env.BASE_URL + "images/maa.jpg",
    badge: "Handcrafted",
    includes: ["6-inch Brass Idol", "Energisation Certificate", "Red Velvet Base"],
  },
];

const CATEGORIES = ["All", ...Array.from(new Set(BAZAAR_ITEMS.map(i => i.category)))];

interface TemplateBazaarProps {
  onNavigate?: (page: string) => void;
  /** Called when the user taps "Buy Now" — opens the Puja Sankalpa Portal (BookNowWizard).
   *  Wire this in App.tsx the same way onSponsorSeva is wired for SevaExperience:
   *  onOpenBookNow={(itemName, price) => { setWizardDefaults({ pujaName: `Temple Bazaar: ${itemName}`, price }); setIsBookNowOpen(true); }}
   */
  onOpenBookNow?: (itemName: string, price: number) => void;
}

export default function TemplateBazaar({ onNavigate, onOpenBookNow }: TemplateBazaarProps) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Details form state — used only when onOpenBookNow is not provided (fallback)
  const [showDetailsForm, setShowDetailsForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BazaarItem | null>(null);
  const [devoteeName, setDevoteeName] = useState("");
  const [devoteePhone, setDevoteePhone] = useState("");
  const [devoteeEmail, setDevoteeEmail] = useState("");
  const [devoteeAddress, setDevoteeAddress] = useState("");
  const [devoteePincode, setDevoteePincode] = useState("");

  // UPI payment state — used only in fallback mode
  const [showUPI, setShowUPI] = useState(false);
  const [refId, setRefId] = useState("");

  const filteredItems = selectedCategory === "All"
    ? BAZAAR_ITEMS
    : BAZAAR_ITEMS.filter(i => i.category === selectedCategory);

  const handleBuyNow = (item: BazaarItem) => {
    if (onOpenBookNow) {
      // ✅ Primary path: open the Puja Sankalpa Portal (BookNowWizard) via App.tsx
      onOpenBookNow(`Temple Bazaar: ${item.name}`, item.price);
    } else {
      // Fallback: local delivery details form + UPI modal (used when prop not wired)
      setSelectedItem(item);
      setRefId("SDB-" + Math.floor(100000 + Math.random() * 900000));
      setShowDetailsForm(true);
    }
  };

  const handleDetailsSubmit = (e: FormEvent) => {
    e.preventDefault();

    // ── Global validation ──────────────────────────────────────────────────
    const nameErr    = validateName(devoteeName);
    const phoneErr   = validatePhone(devoteePhone);
    const emailErr   = validateEmail(devoteeEmail);
    const pincodeErr = validatePincode(devoteePincode);
    if (nameErr)    { alert(nameErr);    return; }
    if (phoneErr)   { alert(phoneErr);   return; }
    if (emailErr)   { alert(emailErr);   return; }
    if (!devoteeAddress.trim() || devoteeAddress.trim().length < 5) {
      alert("Please enter a valid delivery address."); return;
    }
    if (pincodeErr) { alert(pincodeErr); return; }
    // ──────────────────────────────────────────────────────────────────────

    syncToGoogleForm("seva_booking", {
      name: devoteeName.trim(),
      email: devoteeEmail.trim(),
      phone: devoteePhone.trim(),
      details: `Item: ${selectedItem?.name} | Amount: ₹${selectedItem?.price} | Address: ${devoteeAddress.trim()} | Pincode: ${devoteePincode.trim()} | Ref: ${refId}`,
      type: `Temple Bazaar Order — ${selectedItem?.name}`,
      city: devoteeAddress.trim(),
    });
    setShowDetailsForm(false);
    setShowUPI(true);
  };

  return (
    <section
      id="temple-bazaar-section"
      className="py-16 bg-[#021816] text-white relative"
      style={{ paddingTop: `calc(env(safe-area-inset-top, 0px) + 80px)` }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="text-xs font-semibold text-[#5EEAD4]/80 tracking-wider font-mono uppercase">Sacred Marketplace</span>
          <h2 className="text-3xl font-serif font-black text-white tracking-tight mt-1">
            Temple Bazaar Store
          </h2>
          <p className="text-xs text-white/70 mt-2 leading-relaxed">
            Authentic prasad, puja essentials, and sacred items — sourced directly from temples across India and delivered to your doorstep.
          </p>
          <div className="inline-flex items-center gap-2 mt-3 bg-red-500/15 border border-red-400/30 text-red-300 text-xs font-bold px-4 py-1.5 rounded-full">
            <Tag className="w-3.5 h-3.5" />
            50% OFF — Limited Period Launch Offer
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs font-bold px-4 py-2 rounded-full border transition-all ${
                selectedCategory === cat
                  ? "bg-[#FFB347] text-[#021816] border-[#FFB347]"
                  : "bg-white/5 text-white/70 border-white/10 hover:border-white/30"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className="bg-[#092320] rounded-3xl border border-white/10 overflow-hidden flex flex-col hover:border-[#5EEAD4]/20 transition-all hover:shadow-lg"
            >
              {/* Image */}
              <div className="relative w-full h-40 overflow-hidden bg-[#0D2F2B]">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover filter brightness-90"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="w-10 h-10 text-white/20" />
                  </div>
                )}
                {item.badge && (
                  <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full tracking-wide">
                    {item.badge}
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#092320]/90 to-transparent p-2">
                  <span className="text-[9px] font-mono text-teal-300 bg-black/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {item.category}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-serif font-bold text-white text-sm mb-1">{item.name}</h3>
                <p className="text-[11px] text-white/60 leading-relaxed mb-3 flex-1">{item.description}</p>

                {/* Includes accordion */}
                {item.includes && (
                  <div className="mb-3">
                    <button
                      onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                      className="flex items-center gap-1.5 text-[10px] text-[#5EEAD4] font-mono font-bold"
                    >
                      <Package className="w-3 h-3" />
                      What's included
                      {expandedItem === item.id
                        ? <ChevronUp className="w-3 h-3" />
                        : <ChevronDown className="w-3 h-3" />
                      }
                    </button>
                    {expandedItem === item.id && (
                      <ul className="mt-1.5 space-y-0.5">
                        {item.includes.map((inc, i) => (
                          <li key={i} className="flex items-center gap-1.5 text-[10px] text-white/60">
                            <Star className="w-2.5 h-2.5 text-[#FFB347] shrink-0" />
                            {inc}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Price + Buy */}
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/10">
                  <div>
                    <span className="block text-[10px] line-through text-white/30 font-mono">₹{item.mrp}</span>
                    <span className="text-base font-extrabold text-[#FFB347] font-serif">₹{item.price}</span>
                  </div>
                  <button
                    onClick={() => handleBuyNow(item)}
                    className="bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold px-4 py-2.5 rounded-xl text-[10px] tracking-widest uppercase transition-all shadow flex items-center gap-1.5"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Buy Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: <Truck className="w-5 h-5 text-[#FFB347]" />, title: "Free Shipping", desc: "On all orders above ₹499" },
            { icon: <ShieldCheck className="w-5 h-5 text-[#5EEAD4]" />, title: "Temple Verified", desc: "All items sourced from registered temples" },
            { icon: <Package className="w-5 h-5 text-emerald-400" />, title: "Secure Packaging", desc: "Ritually sealed before dispatch" },
          ].map((badge, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              {badge.icon}
              <div>
                <span className="block text-xs font-bold text-white">{badge.title}</span>
                <span className="block text-[10px] text-white/50">{badge.desc}</span>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* ── Step 1: Delivery Details Form ── */}
      {showDetailsForm && selectedItem && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[70] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#092320] rounded-3xl w-full max-w-sm border border-white/10 shadow-2xl overflow-hidden my-auto">

            <div className="bg-[#021816] px-5 py-4 flex items-center justify-between border-b border-white/10">
              <div>
                <h3 className="font-serif text-sm font-bold text-white">Delivery Details</h3>
                <p className="text-[10px] font-mono text-[#FFB347] uppercase tracking-wider truncate max-w-[180px]">{selectedItem.name}</p>
              </div>
              <button
                onClick={() => setShowDetailsForm(false)}
                className="text-white/60 hover:text-white p-1.5 bg-white/5 rounded-full border border-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDetailsSubmit} className="p-5 space-y-4">
              <div className="bg-[#021816] rounded-2xl p-3 border border-white/10 flex items-center justify-between">
                <span className="text-xs text-white/60 font-mono truncate max-w-[160px]">{selectedItem.name}</span>
                <span className="text-sm font-extrabold text-[#FFB347] font-serif shrink-0">₹{selectedItem.price}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={devoteeName}
                  onChange={e => setDevoteeName(e.target.value)}
                  placeholder="e.g. Anand Satpathy"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">WhatsApp / Phone *</label>
                <input
                  type="tel"
                  required
                  value={devoteePhone}
                  onChange={e => setDevoteePhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={devoteeEmail}
                  onChange={e => setDevoteeEmail(e.target.value)}
                  placeholder="e.g. name@gmail.com"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">Delivery Address *</label>
                <textarea
                  required
                  rows={2}
                  value={devoteeAddress}
                  onChange={e => setDevoteeAddress(e.target.value)}
                  placeholder="House No., Street, City, State"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">PIN Code *</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={devoteePincode}
                  onChange={e => setDevoteePincode(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 751001"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                />
              </div>

              <p className="text-[10px] text-white/40 font-mono">
                🚚 Your order will be shipped within 3–5 working days after payment confirmation.
              </p>

              <button
                type="submit"
                className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold py-3 rounded-xl text-xs tracking-widest uppercase transition-all shadow"
              >
                Proceed to Payment →
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Step 2: UPI Payment Modal ── */}
      {selectedItem && (
        <UPIPaymentModal
          isOpen={showUPI}
          onClose={() => setShowUPI(false)}
          onPaymentConfirmed={() => {
            setShowUPI(false);
            alert(`🙏 Order confirmed! Your ${selectedItem.name} will be shipped to ${devoteeAddress} within 3–5 days. Ref: ${refId}`);
            setDevoteeName("");
            setDevoteePhone("");
            setDevoteeEmail("");
            setDevoteeAddress("");
            setDevoteePincode("");
          }}
          amount={selectedItem.price}
          bookingName={selectedItem.name}
          devoteeName={devoteeName || "Devotee"}
          refId={refId}
        />
      )}
    </section>
  );
}
