/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TemplateBazaar — Sri Dwar Sacred Marketplace & Temple Bazaar Store
 * Unified section combining sacred products + services.
 * Flow: Browse → Puja Sankalpa Portal → Complete Your Sacred Offering (UPI)
 */

import { useState, FormEvent } from "react";
import {
  ShoppingBag, X, Star, Package, Truck, ShieldCheck,
  Tag, ChevronDown, ChevronUp, Flame, BookOpen, Heart
} from "lucide-react";
import UPIPaymentModal from "./UPIPaymentModal";
import { syncToGoogleForm } from "../utils/googleFormSync";
import SriDwarLogo from "./SriDwarLogo";

// ─── Product catalogue ─────────────────────────────────────────────────────
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
  isService?: boolean; // true = seva/puja service (no shipping address needed)
}

const BAZAAR_ITEMS: BazaarItem[] = [
  // ── Physical Products ──────────────────────────────────────────────────
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

  // ── Seva / Puja Services (no delivery, isService=true) ─────────────────
  {
    id: "bazaar-rudrabhishek",
    name: "Rudrabhishek Puja Service",
    description: "Live Rudrabhishek at Kashi Vishwanath or Lingaraj Mandir — performed in your name & Gotra with live photo confirmation.",
    price: 1100,
    mrp: 2200,
    category: "Puja Services",
    imageUrl: import.meta.env.BASE_URL + "images/puja_1.jpg",
    badge: "Live Puja",
    isService: true,
    includes: ["Performed in your Gotra", "Live Photo Proof", "WhatsApp Confirmation", "Digital Certificate"],
  },
  {
    id: "bazaar-navagraha",
    name: "Navagraha Shanti Homa",
    description: "Nine-planet pacification homa to remove planetary doshas — performed by Jyotish-trained Acharyas at Ujjain Mahakaleshwar.",
    price: 4000,
    mrp: 8000,
    category: "Puja Services",
    imageUrl: import.meta.env.BASE_URL + "images/puja_3.jpg",
    badge: "50% OFF",
    isService: true,
    includes: ["Jyotish-trained Acharya", "All Herbal Samidha included", "Video Confirmation", "Digital Certificate"],
  },
  {
    id: "bazaar-annadanam",
    name: "Annadanam Sponsorship",
    description: "Sponsor hot meals for 35+ pilgrims at Jagannath Puri — the most auspicious seva in Odisha's temple tradition.",
    price: 900,
    mrp: 1800,
    category: "Puja Services",
    imageUrl: import.meta.env.BASE_URL + "images/puja_2.jpg",
    badge: "High Impact",
    isService: true,
    includes: ["Feeds 35+ pilgrims", "Performed at Puri Temple", "Photo Report", "WhatsApp Receipt"],
  },
];

const CATEGORIES = ["All", ...Array.from(new Set(BAZAAR_ITEMS.map(i => i.category)))];

const RASHI_OPTIONS = [
  "Mesh (Aries)", "Vrishabh (Taurus)", "Mithun (Gemini)", "Karka (Cancer)",
  "Simha (Leo)", "Kanya (Virgo)", "Tula (Libra)", "Vrishchik (Scorpio)",
  "Dhanu (Sagittarius)", "Makar (Capricorn)", "Kumbh (Aquarius)", "Meen (Pisces)",
];

interface TemplateBazaarProps {
  onNavigate?: (page: string) => void;
}

export default function TemplateBazaar({ onNavigate }: TemplateBazaarProps) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Sankalpa Portal (step 1) state
  const [showSankalpa, setShowSankalpa] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BazaarItem | null>(null);

  // Form fields
  const [devoteeName, setDevoteeName]       = useState("");
  const [devoteePhone, setDevoteePhone]     = useState("");
  const [devoteeEmail, setDevoteeEmail]     = useState("");
  const [devoteeGotra, setDevoteeGotra]     = useState("");
  const [devoteeRashi, setDevoteeRashi]     = useState("Mesh (Aries)");
  const [sankalpaIntent, setSankalpaIntent] = useState("");
  // Physical product delivery fields (only shown for non-service items)
  const [devoteeAddress, setDevoteeAddress] = useState("");
  const [devoteePincode, setDevoteePincode] = useState("");

  // UPI payment (step 2) state
  const [showUPI, setShowUPI]   = useState(false);
  const [refId, setRefId]       = useState("");

  const filteredItems = selectedCategory === "All"
    ? BAZAAR_ITEMS
    : BAZAAR_ITEMS.filter(i => i.category === selectedCategory);

  // ── Open Sankalpa Portal ────────────────────────────────────────────────
  const handleBuyNow = (item: BazaarItem) => {
    setSelectedItem(item);
    setRefId((item.isService ? "SDV-" : "SDB-") + Math.floor(100000 + Math.random() * 900000));
    setShowSankalpa(true);
  };

  // ── Submit Sankalpa Portal → go to payment ──────────────────────────────
  const handleSankalpaSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!devoteeName.trim() || !devoteePhone.trim()) {
      alert("Please enter your name and WhatsApp number to proceed.");
      return;
    }
    if (!selectedItem?.isService && (!devoteeAddress.trim() || !devoteePincode.trim())) {
      alert("Please enter your delivery address and PIN code.");
      return;
    }

    // Sync to seva_booking Google Form
    syncToGoogleForm("seva_booking", {
      name:         devoteeName.trim(),
      email:        devoteeEmail.trim(),
      phone:        devoteePhone.trim(),
      gotra:        devoteeGotra || undefined,
      rashi:        devoteeRashi || undefined,
      intent:       sankalpaIntent.trim() || undefined,
      type:         selectedItem?.isService
                      ? `Puja Service — ${selectedItem?.name}`
                      : `Temple Bazaar Order — ${selectedItem?.name}`,
      details:      `Item: ${selectedItem?.name} | ` +
                    `Amount: ₹${selectedItem?.price} | ` +
                    `Gotra: ${devoteeGotra || "Not provided"} | ` +
                    `Rashi: ${devoteeRashi} | ` +
                    (selectedItem?.isService
                      ? `Intent: ${sankalpaIntent || "General blessings"}`
                      : `Address: ${devoteeAddress.trim()} | PIN: ${devoteePincode.trim()}`) +
                    ` | Ref: ${refId}`,
      fee:          selectedItem?.price,
      city:         selectedItem?.isService ? "Online Devotee" : devoteeAddress.trim(),
      whatsapp:     devoteePhone.trim(),
    });

    setShowSankalpa(false);
    setShowUPI(true);
  };

  // ── After payment confirmed ─────────────────────────────────────────────
  const handlePaymentConfirmed = () => {
    setShowUPI(false);
    const msg = selectedItem?.isService
      ? `🙏 Jai Jagannath! Your ${selectedItem.name} has been registered. Our pandit team will send you a WhatsApp confirmation within 2 hours. Ref: ${refId}`
      : `🙏 Order confirmed! Your ${selectedItem?.name} will be shipped within 3–5 working days. Ref: ${refId}`;
    alert(msg);
    // Reset form fields
    setDevoteeName(""); setDevoteePhone(""); setDevoteeEmail("");
    setDevoteeGotra(""); setDevoteeRashi("Mesh (Aries)");
    setSankalpaIntent(""); setDevoteeAddress(""); setDevoteePincode("");
    setSelectedItem(null);
  };

  return (
    <section
      id="temple-bazaar-section"
      className="py-16 bg-[#021816] text-white relative"
      style={{ paddingTop: `calc(env(safe-area-inset-top, 0px) + 80px)` }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Section Header ───────────────────────────────────────────── */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="text-xs font-semibold text-[#5EEAD4]/80 tracking-wider font-mono uppercase">
            Sacred Marketplace
          </span>
          <h2 className="text-3xl font-serif font-black text-white tracking-tight mt-1">
            Temple Bazaar Store
          </h2>
          <p className="text-xs text-white/70 mt-2 leading-relaxed">
            Authentic prasad, puja kits, sacred items & live puja services — sourced from temples across India,
            performed in your Gotra, delivered to your doorstep.
          </p>
          <div className="inline-flex items-center gap-2 mt-3 bg-red-500/15 border border-red-400/30 text-red-300 text-xs font-bold px-4 py-1.5 rounded-full">
            <Tag className="w-3.5 h-3.5" />
            50% OFF — Limited Period Launch Offer
          </div>
        </div>

        {/* ── Category Filter ──────────────────────────────────────────── */}
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

        {/* ── Items Grid ───────────────────────────────────────────────── */}
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
                {/* Service badge */}
                {item.isService && (
                  <span className="absolute top-2 right-2 bg-[#FFB347] text-[#021816] text-[9px] font-black px-2 py-0.5 rounded-full tracking-wide flex items-center gap-1">
                    <Flame className="w-2.5 h-2.5" />
                    Live Seva
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
                        : <ChevronDown className="w-3 h-3" />}
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

                {/* Price + CTA */}
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/10">
                  <div>
                    <span className="block text-[10px] line-through text-white/30 font-mono">₹{item.mrp}</span>
                    <span className="text-base font-extrabold text-[#FFB347] font-serif">₹{item.price}</span>
                  </div>
                  <button
                    onClick={() => handleBuyNow(item)}
                    className="bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold px-4 py-2.5 rounded-xl text-[10px] tracking-widest uppercase transition-all shadow flex items-center gap-1.5"
                  >
                    {item.isService
                      ? <><Flame className="w-3.5 h-3.5" /> Book Seva</>
                      : <><ShoppingBag className="w-3.5 h-3.5" /> Buy Now</>}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Trust Badges ─────────────────────────────────────────────── */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: <Truck className="w-5 h-5 text-[#FFB347]" />,          title: "Free Shipping",     desc: "On all product orders above ₹499" },
            { icon: <ShieldCheck className="w-5 h-5 text-[#5EEAD4]" />,    title: "Temple Verified",   desc: "All items sourced from registered temples" },
            { icon: <Heart className="w-5 h-5 text-pink-400" fill="currentColor" />, title: "Seva Guarantee",   desc: "Live photo proof for every puja service" },
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

      {/* ══════════════════════════════════════════════════════════════════
          STEP 1: Puja Sankalpa Portal
      ══════════════════════════════════════════════════════════════════ */}
      {showSankalpa && selectedItem && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[70] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4"
          style={{ touchAction: "pan-y" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowSankalpa(false); }}
        >
          <div
            className="bg-[#092320] w-full sm:rounded-3xl sm:max-w-sm border border-white/10 shadow-2xl text-white flex flex-col"
            style={{ maxHeight: "100dvh" }}
            onClick={(e) => e.stopPropagation()}
          >

            {/* Sticky Modal Header with Logo */}
            <div className="shrink-0 bg-[#021816] px-5 py-4 border-b border-white/10 sm:rounded-t-3xl">
              {/* Sri Dwar Brand Logo */}
              <div className="flex justify-center mb-3">
                <SriDwarLogo variant="colored" iconSize="sm" showTagline={false} />
              </div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-serif text-sm font-bold text-white">Puja Sankalpa Portal</h3>
                  <p className="text-[10px] font-mono text-[#FFB347] uppercase tracking-wider mt-0.5 truncate max-w-[200px]">
                    {selectedItem.name}
                  </p>
                </div>
                <button
                  onClick={() => setShowSankalpa(false)}
                  className="text-white/60 hover:text-white p-1.5 bg-white/5 rounded-full border border-white/10 shrink-0 ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Single scroll container — the ONLY scrollable element */}
            <div
              className="flex-1 min-h-0 overflow-y-auto"
              style={{ WebkitOverflowScrolling: "touch", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
            >
            <form onSubmit={handleSankalpaSubmit} className="p-5 space-y-4">

              {/* Item + price summary */}
              <div className="bg-[#021816] rounded-2xl p-3 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {selectedItem.isService
                    ? <Flame className="w-4 h-4 text-[#FFB347] shrink-0" />
                    : <ShoppingBag className="w-4 h-4 text-[#5EEAD4] shrink-0" />}
                  <span className="text-xs text-white/70 font-mono truncate">{selectedItem.name}</span>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <span className="block text-[9px] line-through text-white/30 font-mono">₹{selectedItem.mrp}</span>
                  <span className="text-sm font-extrabold text-[#FFB347] font-serif">₹{selectedItem.price}</span>
                </div>
              </div>

              <p className="text-[11px] text-white/60 leading-relaxed">
                🙏 Please enter your Sankalpa details so our pandits can perform this {selectedItem.isService ? "seva" : "offering"} in your name and Gotra.
              </p>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">Full Name *</label>
                <input
                  type="text" required
                  value={devoteeName}
                  onChange={e => setDevoteeName(e.target.value)}
                  placeholder="e.g. Anand Kumar Satpathy"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                />
              </div>

              {/* WhatsApp */}
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">WhatsApp Number *</label>
                <input
                  type="tel" required
                  value={devoteePhone}
                  onChange={e => setDevoteePhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                />
              </div>

              {/* Email (optional) */}
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">
                  Email <span className="text-white/40 font-normal">(Optional)</span>
                </label>
                <input
                  type="email"
                  value={devoteeEmail}
                  onChange={e => setDevoteeEmail(e.target.value)}
                  placeholder="e.g. anand@email.com"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                />
              </div>

              {/* Gotra + Rashi */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1">
                    Gotra <span className="text-white/40 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={devoteeGotra}
                    onChange={e => setDevoteeGotra(e.target.value)}
                    placeholder="e.g. Kashyap"
                    className="w-full text-xs px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1">Rashi (Moon Sign)</label>
                  <select
                    value={devoteeRashi}
                    onChange={e => setDevoteeRashi(e.target.value)}
                    className="w-full text-xs px-2.5 py-2.5 rounded-xl bg-[#021816] border border-white/10 text-[#5EEAD4] font-medium focus:outline-none focus:border-[#5EEAD4]"
                  >
                    {RASHI_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {/* Sankalpa / Intention */}
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#5EEAD4]" />
                  Sankalpa Intention <span className="text-white/40 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={sankalpaIntent}
                  onChange={e => setSankalpaIntent(e.target.value)}
                  placeholder="e.g. For the health and prosperity of my family..."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35 resize-none"
                />
                <p className="text-[10px] text-white/30 mt-1 font-mono">The pandit will recite this during Sankalpa</p>
              </div>

              {/* Delivery fields — only for physical products */}
              {!selectedItem.isService && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-white/80 mb-1">Delivery Address *</label>
                    <textarea
                      required rows={2}
                      value={devoteeAddress}
                      onChange={e => setDevoteeAddress(e.target.value)}
                      placeholder="House No., Street, City, State"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/80 mb-1">PIN Code *</label>
                    <input
                      type="text" required maxLength={6}
                      value={devoteePincode}
                      onChange={e => setDevoteePincode(e.target.value.replace(/\D/g, ""))}
                      placeholder="e.g. 751001"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                    />
                  </div>
                  <p className="text-[10px] text-white/40 font-mono">
                    🚚 Ships within 3–5 working days after payment confirmation.
                  </p>
                </>
              )}

              {selectedItem.isService && (
                <div className="flex items-start gap-2 bg-emerald-950/30 border border-emerald-500/20 px-3 py-2.5 rounded-xl text-[10px] text-emerald-300 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Live photo proof + WhatsApp confirmation sent within 2 hours of seva completion. 🙏</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold py-3.5 rounded-xl text-xs tracking-widest uppercase transition-all shadow flex items-center justify-center gap-2"
              >
                <Flame className="w-4 h-4" />
                Proceed to Sacred Offering →
              </button>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STEP 2: Complete Your Sacred Offering (UPI Payment)
      ══════════════════════════════════════════════════════════════════ */}
      {selectedItem && (
        <UPIPaymentModal
          isOpen={showUPI}
          onClose={() => setShowUPI(false)}
          onPaymentConfirmed={handlePaymentConfirmed}
          amount={selectedItem.price}
          bookingName={selectedItem.name}
          devoteeName={devoteeName || "Devotee"}
          refId={refId}
        />
      )}
    </section>
  );
}
