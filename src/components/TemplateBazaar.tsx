/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TemplateBazaar — Sri Dwar Sacred Marketplace & Temple Bazaar Store
 * Unified section combining sacred products + services.
 * Flow: Browse → Puja Sankalpa Portal (services) / Sacred Bazaar Order (products) → Complete Your Sacred Offering (UPI)
 */

import { useState, useEffect, FormEvent } from "react";
import {
  ShoppingBag, X, Star, Package, Truck, ShieldCheck,
  ChevronDown, ChevronUp, Flame, BookOpen, Heart
} from "lucide-react";
import UPIPaymentModal from "./UPIPaymentModal";
import { syncToGoogleForm, randomRefSuffix } from "../utils/googleFormSync";
import { recordActivity } from "../lib/activities";
import { downloadConfirmationMessage } from "../utils/devotionalMessages";
import SriDwarLogo from "./SriDwarLogo";
import IndiaTempleMap from "./IndiaTempleMap";
import { gaCategoryFilter, gaAddToCart, gaCheckoutInitiate, gaBookingComplete } from "../utils/analytics";
import BazaarOfferingCard from "./BazaarOfferingCard";
import DisclaimerAcknowledge from "./DisclaimerAcknowledge";
import OptimizedImage from "./OptimizedImage";
import MobileCarousel from "./shared/MobileCarousel";
import { sectionTopPadding } from "../utils/androidSpacing";
import {
  BAZAAR_PRODUCTS, BAZAAR_CATEGORIES, BAZAAR_DELIVERY_NOTE, BAZAAR_TRUST_COPY,
  BAZAAR_DISCLAIMER, BAZAAR_BHOG_OFFERING_SUMMARY, BazaarProduct,
} from "../data/bazaarOfferings";

// ─── Devotional Shopping promo visibility ──────────────────────────────────
// Mirrors the category flag in utils/discount.ts (Devotional Shopping/
// Temple Bazaar isn't wired through that shared module — this catalogue is
// local — so it gets its own small on/off switch here instead). `price`
// below already IS the current discounted amount and stays exactly as-is;
// this flag only controls whether the crossed-out `mrp` reference price
// and any "20% OFF" badge text are ever rendered. Both `mrp` and the
// "20% OFF" badge values are left untouched in BAZAAR_ITEMS below so this
// can be flipped back on later with no data changes needed.
const SHOW_BAZAAR_DISCOUNT_PROMO = false;
const BAZAAR_DISCOUNT_BADGE_TEXT = "20% OFF";

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
  /** What the devotee receives once the order/seva is processed — same
   *  "You will receive" pattern as the Structured Devotional Shopping
   *  Offerings / Seva Offerings above, backfilled here so every card in
   *  this catalogue shows both "What's Included" and "What You Receive"
   *  instead of includes alone. */
  receives?: string[];
  isService?: boolean; // true = seva/puja service (no shipping address needed)
}

const BAZAAR_ITEMS: BazaarItem[] = [
  // ── Physical Products ──────────────────────────────────────────────────
  {
    id: "bazaar-puri-prasad",
    name: "Jagannath Puri Mahaprasad Kit",
    description: "Traditional Chhappan Bhog Mahaprasad from Puri Jagannath Temple — sun-dried, ritually sealed, and shipped with blessings.",
    price: 1799,
    mrp: 2249,
    category: "Prasad",
    imageUrl: import.meta.env.BASE_URL + "images/Mahaprasad Kit.jpg",
    badge: "Bestseller",
    includes: ["Dry Prasad 250g", "Temple Certificate", "Blessing Card"],
    receives: ["Mahaprasad kit shipped to your address", "Temple certificate confirming the prasad's temple origin", "Digital confirmation shared after dispatch"],
  },
  {
    id: "bazaar-puja-kit",
    name: "Complete Home Puja Kit",
    description: "All essentials for daily puja — brass diya, incense sticks, kumkum, turmeric, akshat, and a handsigned sankalpa card.",
    price: 1079,
    mrp: 1349,
    category: "Puja Essentials",
    imageUrl: import.meta.env.BASE_URL + "images/Home Puja Kit.jpg",
    badge: "20% OFF",
    includes: ["Brass Diya", "Incense Sticks (pack of 50)", "Kumkum & Haldi", "Akshat", "Sankalpa Card"],
    receives: ["Complete puja kit shipped to your address", "Sankalpa card ready for your own puja use", "Digital confirmation shared after dispatch"],
  },
  {
    id: "bazaar-rudraksha",
    name: "5-Mukhi Rudraksha Mala",
    description: "Traditional Nepal-origin 5-faced Rudraksha mala — energised at Kashi Vishwanath Temple with proper Vedic mantras.",
    price: 1919,
    mrp: 2399,
    category: "Sacred Items",
    imageUrl: import.meta.env.BASE_URL + "images/Rudraksha Mala.jpg",
    badge: "Traditional",
    includes: ["108+1 Beads Mala", "Energisation Certificate", "Velvet Pouch"],
    receives: ["Rudraksha mala shipped in a protective velvet pouch", "Energisation certificate confirming the Vedic process followed", "Digital confirmation shared after dispatch"],
  },
  {
    id: "bazaar-incense",
    name: "Temple Incense Collection",
    description: "Hand-rolled incense sticks made from temple-grade sandalwood, mogra, and dhoop — same fragrance used in Lingaraj Temple daily rituals.",
    price: 479,
    mrp: 599,
    category: "Incense & Aroma",
    imageUrl: import.meta.env.BASE_URL + "images/Incense.jpg",
    includes: ["Sandalwood (20 sticks)", "Mogra (20 sticks)", "Dhoop (10 sticks)"],
    receives: ["Incense collection shipped to your address", "Three fragrances packed together for daily aarti", "Digital confirmation shared after dispatch"],
  },
  {
    id: "bazaar-gurukul-kit",
    name: "Sanskrit Gurukul Student Kit",
    description: "Sponsor a complete Vedic student kit — textbooks, Sanskrit grammar guides, and sacred thread — shipped to registered Gurukuls.",
    price: 1319,
    mrp: 1649,
    category: "Divine Contribution Kits",
    imageUrl: import.meta.env.BASE_URL + "images/Student Kit.jpg",
    badge: "Impact Gift",
    includes: ["Sanskrit Primer", "Devanagari Workbook", "Yajnopavita (Sacred Thread)", "Photo Report from Gurukul"],
    receives: ["Kit dispatched directly to the registered Gurukul in your name", "Photo report shared once the kit is delivered", "Digital confirmation of your sponsorship"],
  },
  {
    id: "bazaar-maa-idol",
    name: "Maa Durga Brass Idol (6 inch)",
    description: "Hand-cast brass idol of Maa Durga in Mahishasurmardini posture — temple-grade finish, energised before dispatch.",
    price: 2399,
    mrp: 2999,
    category: "Sacred Items",
    imageUrl: import.meta.env.BASE_URL + "images/Brass Idol.jpg",
    badge: "Handcrafted",
    includes: ["6-inch Brass Idol", "Energisation Certificate", "Red Velvet Base"],
    receives: ["Hand-cast brass idol shipped with a red velvet base", "Energisation certificate confirming the process followed before dispatch", "Digital confirmation shared after dispatch"],
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
  /** Optional — when set (e.g. arriving from the homepage carousel), the
   *  matching Devotional Shopping Offering card is opened and scrolled into
   *  view on mount. Matches a BAZAAR_PRODUCTS id (e.g. "bazaar-new-bhog").
   *  Any id that doesn't match is silently ignored. */
  initialHighlightId?: string | null;
  /** Since this page can be the first thing rendered under <main> on the
   *  Android app (which drops its own top padding so each page can size
   *  its own clearance), this section must supply enough top padding to
   *  clear the fixed Navbar + status bar itself — otherwise the "Temple
   *  Bazaar" heading renders partly underneath the fixed header. */
  isAndroidApp?: boolean;
}

export default function TemplateBazaar({ onNavigate, initialHighlightId = null, isAndroidApp = false }: TemplateBazaarProps) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  // ✅ DISCLAIMER PLACEMENT FIX: the legacy Current Offerings catalogue
  // cards render inline here (not via BazaarOfferingCard), so each one
  // gets its own entry in this per-item map rather than one shared
  // checkbox — same reasoning as the structured Devotional Shopping
  // Offerings cards, which already gate on their own local state.
  const [legacyDisclaimerChecked, setLegacyDisclaimerChecked] = useState<Record<string, boolean>>({});
  const [legacyDisclaimerError, setLegacyDisclaimerError] = useState<Record<string, boolean>>({});

  // Sankalpa Portal (step 1) state
  const [showSankalpa, setShowSankalpa] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BazaarItem | null>(null);
  // ✅ DISCLAIMER RELOCATION: the Bhog Offering disclaimer (previously shown
  // on every Devotional Shopping card) now lives once here, inside the
  // Sankalpa Portal, only when the selected item is a Bhog Offering
  // (selectedItem.isService — see isBhogOffering() in
  // BazaarOfferingCard.tsx, the only Devotional Shopping product performed
  // at a temple rather than shipped).
  const [sankalpaDisclaimerChecked, setSankalpaDisclaimerChecked] = useState(false);
  const [showSankalpaDisclaimerError, setShowSankalpaDisclaimerError] = useState(false);

  // Form fields
  const [devoteeName, setDevoteeName]       = useState("");
  const [devoteePhone, setDevoteePhone]     = useState("");
  const [devoteeEmail, setDevoteeEmail]     = useState("");
  const [devoteeGotra, setDevoteeGotra]     = useState("");
  const [devoteeRashi, setDevoteeRashi]     = useState("Mesh (Aries)");
  const [sankalpaIntent, setSankalpaIntent] = useState("");
  // Plain order note for physical-product purchases — kept separate from
  // sankalpaIntent above so a product order (e.g. a Rudraksha mala or an
  // idol) is never synced with a leftover "Sankalpa Intention" the devotee
  // never actually saw or filled in on this form.
  const [orderNote, setOrderNote]           = useState("");
  // Physical product delivery fields (only shown for non-service items)
  const [devoteeAddress, setDevoteeAddress] = useState("");
  const [devoteePincode, setDevoteePincode] = useState("");

  // UPI payment (step 2) state
  const [showUPI, setShowUPI]   = useState(false);
  const [refId, setRefId]       = useState("");

  // ── Devotional Shopping Offerings (new, structured products) state ──────
  const [newSelectedCategory, setNewSelectedCategory] = useState("All");
  const [activeNewOfferingId, setActiveNewOfferingId] = useState<string | null>(null);
  // Lightweight, section-local cart for "Add to Cart" — this Temple Bazaar
  // Store section has never used the site's global cart (it checks out
  // directly through the Puja Sankalpa Portal below), so this mirrors that
  // existing pattern rather than introducing a second, inconsistent cart.
  const [newBazaarCart, setNewBazaarCart] = useState<
    { id: string; label: string; amount: number; isService: boolean; pincode: string }[]
  >([]);

  const filteredItems = selectedCategory === "All"
    ? BAZAAR_ITEMS
    : BAZAAR_ITEMS.filter(i => i.category === selectedCategory);

  // Deep-link from the homepage carousel (or anywhere else that passes
  // initialHighlightId). Switches the category filter to "All" so the
  // matching product is guaranteed to be in the grid regardless of
  // whatever category was last selected, then opens and scrolls to it.
  // Runs once per mount; TemplateBazaar is unmounted/remounted whenever
  // currentPage changes in App.tsx, so a fresh id always re-triggers this.
  useEffect(() => {
    if (!initialHighlightId) return;
    const match = BAZAAR_PRODUCTS.find((p) => p.id === initialHighlightId);
    if (!match) return;
    setNewSelectedCategory("All");
    setActiveNewOfferingId(match.id);
    const timer = setTimeout(() => {
      document.getElementById(`bazaar-offering-${match.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialHighlightId]);

  // ── Open Sankalpa Portal ────────────────────────────────────────────────
  // `prefillPincode` lets callers that already captured a PIN code inline on
  // the offering card (Devotional Shopping Offerings) carry it straight into
  // the Delivery Address section here, instead of asking the devotee twice.
  const handleBuyNow = (item: BazaarItem, prefillPincode?: string) => {
    gaAddToCart(item.name, item.price, item.id);
    setSelectedItem(item);
    setRefId((item.isService ? "SDV-" : "SDB-") + randomRefSuffix());
    if (prefillPincode) setDevoteePincode(prefillPincode);
    setSankalpaDisclaimerChecked(false);
    setShowSankalpaDisclaimerError(false);
    setShowSankalpa(true);
  };

  // ── Devotional Shopping Offerings: primary CTA ("Offer in Temple"/"Buy
  //    Now") — reuses handleBuyNow's exact pipeline (GA event, Sankalpa
  //    Portal, UPI payment) so checkout and data sync stay unchanged. ──────
  const handleOfferNewProduct = (product: BazaarProduct, composedName: string, amount: number, pincode: string) => {
    if (!amount || amount <= 0) { alert("Please choose a valid amount before continuing."); return; }
    handleBuyNow({
      id: product.id,
      name: composedName,
      description: product.description,
      price: amount,
      mrp: amount,
      category: "Devotional Shopping",
      imageUrl: product.imageUrl,
      isService: product.isService,
    }, pincode);
  };

  // ── Devotional Shopping Offerings: "Add to Cart" ─────────────────────────
  const handleAddToNewCart = (product: BazaarProduct, composedName: string, amount: number, pincode: string) => {
    if (!amount || amount <= 0) { alert("Please choose a valid amount before adding to cart."); return; }
    gaAddToCart(composedName, amount, product.id);
    setNewBazaarCart((prev) => [...prev, { id: product.id, label: composedName, amount, isService: product.isService, pincode }]);
  };

  const handleClearNewCart = () => setNewBazaarCart([]);

  // Combines every cart line into one composed order and hands it to the
  // same Sankalpa Portal + UPI flow used everywhere else in this section.
  const handleCheckoutNewCart = () => {
    if (newBazaarCart.length === 0) return;
    const total = newBazaarCart.reduce((sum, i) => sum + i.amount, 0);
    const combinedName = `Devotional Shopping Cart — ${newBazaarCart.map((i) => i.label).join(" | ")}`;
    // If everything in the cart is temple-performed (no shipping needed),
    // skip the delivery address fields; otherwise collect delivery details.
    const allService = newBazaarCart.every((i) => i.isService);
    // Carry over a PIN code already captured on one of the cart's cards, if any.
    const cartPincode = newBazaarCart.find((i) => i.pincode)?.pincode;
    handleBuyNow({
      id: "bazaar-new-cart-checkout",
      name: combinedName,
      description: "Combined Devotional Shopping cart order.",
      price: total,
      mrp: total,
      category: "Devotional Shopping",
      imageUrl: null,
      isService: allService,
    }, cartPincode);
    setNewBazaarCart([]);
  };

  const filteredNewProducts = newSelectedCategory === "All"
    ? BAZAAR_PRODUCTS
    : BAZAAR_PRODUCTS.filter((p) => p.category === newSelectedCategory);

  const newCartTotal = newBazaarCart.reduce((sum, i) => sum + i.amount, 0);

  // ── Submit Sankalpa Portal → go to payment ──────────────────────────────
  // Sends ONE row immediately with payment status "Pending — Awaiting
  // Confirmation" (the order is captured even if the devotee abandons the
  // UPI step), then redirects straight to "Complete Your Sacred Offering".
  // Once the devotee submits a payment intent, handlePaymentConfirmed sends
  // exactly ONE more row — same Ref ID — marked "Payment Submitted —
  // Pending Verification" (never "Paid — Confirmed" at this stage; that
  // only happens once the admin/reconciliation side actually verifies it).
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
    if (selectedItem?.isService && !sankalpaDisclaimerChecked) {
      setShowSankalpaDisclaimerError(true);
      document.getElementById("sankalpa-bhog-disclaimer")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // Sync to seva_booking Google Form
    syncToGoogleForm("seva_booking", {
      name:         devoteeName.trim(),
      email:        devoteeEmail.trim(),
      phone:        devoteePhone.trim(),
      gotra:        selectedItem?.isService ? (devoteeGotra || undefined) : undefined,
      rashi:        selectedItem?.isService ? (devoteeRashi || undefined) : undefined,
      intent:       selectedItem?.isService ? (sankalpaIntent.trim() || undefined) : (orderNote.trim() || undefined),
      type:         selectedItem?.isService
                      ? `Puja Service — ${selectedItem?.name}`
                      : `Temple Bazaar Order — ${selectedItem?.name}`,
      details:      `Item: ${selectedItem?.name} | ` +
                    `Amount: ₹${selectedItem?.price} | ` +
                    `Payment Status: Pending — Awaiting Confirmation | ` +
                    (selectedItem?.isService
                      ? `Gotra: ${devoteeGotra || "Not provided"} | Rashi: ${devoteeRashi} | Intent: ${sankalpaIntent || "General blessings"}`
                      : `Order Note: ${orderNote.trim() || "None"} | Address: ${devoteeAddress.trim()} | PIN: ${devoteePincode.trim()}`) +
                    ` | Ref: ${refId}`,
      fee:          selectedItem?.price,
      city:         selectedItem?.isService ? "Online Devotee" : devoteeAddress.trim(),
      whatsapp:     devoteePhone.trim(),
    });

    setShowSankalpa(false);
    setShowUPI(true);
  };

  // ── After payment intent submitted (NOT yet verified) ───────────────────
  // Sends the ONE Final row for this order, sharing the same Ref ID, with
  // the payment status corrected to "Payment Submitted — Pending
  // Verification" and the real method. Only becomes "Paid — Confirmed"
  // once the admin/reconciliation side actually verifies the payment.
  const handlePaymentConfirmed = (details: { amount: number; method: "UPI" | "WhatsApp Pay" }) => {
    setShowUPI(false);
    if (selectedItem) {
      gaBookingComplete(selectedItem.name, details.amount, refId);
      syncToGoogleForm("seva_booking", {
        name:         devoteeName.trim(),
        email:        devoteeEmail.trim(),
        phone:        devoteePhone.trim(),
        gotra:        selectedItem.isService ? (devoteeGotra || undefined) : undefined,
        rashi:        selectedItem.isService ? (devoteeRashi || undefined) : undefined,
        intent:       selectedItem.isService ? (sankalpaIntent.trim() || undefined) : (orderNote.trim() || undefined),
        type:         selectedItem.isService
                        ? `Puja Service — ${selectedItem.name}`
                        : `Temple Bazaar Order — ${selectedItem.name}`,
        details:      `Item: ${selectedItem.name} | ` +
                      `Amount: ₹${details.amount} | ` +
                      `Payment Status: Payment Submitted — Pending Verification | ` +
                      `Payment Method: ${details.method} | ` +
                      (selectedItem.isService
                        ? `Gotra: ${devoteeGotra || "Not provided"} | Rashi: ${devoteeRashi} | Intent: ${sankalpaIntent || "General blessings"}`
                        : `Order Note: ${orderNote.trim() || "None"} | Address: ${devoteeAddress.trim()} | PIN: ${devoteePincode.trim()}`) +
                      ` | Ref: ${refId}`,
        fee:          details.amount,
        city:         selectedItem.isService ? "Online Devotee" : devoteeAddress.trim(),
        whatsapp:     devoteePhone.trim(),
      });
    }
    // Record into the Supabase activity ledger (no-ops for guests who
    // aren't logged in) — previously this Sankalpa Portal flow never wrote
    // anywhere the devotee's own Profile page could read from.
    if (selectedItem) {
      recordActivity({
        activityType: selectedItem.isService ? "seva" : "product",
        itemName: selectedItem.name,
        amount: details.amount,
        refId,
        paymentMethod: details.method,
        paymentStatus: "pending_verification",
      });
    }
    const msg = selectedItem?.isService
      ? `🙏 Jai Jagannath! Your ${selectedItem.name} has been registered. Our pandit team will send you a confirmation soon. Ref: ${refId}`
      : `🙏 Order received! Once your payment is verified, our team will confirm it and ship your ${selectedItem?.name} within 3–5 working days. Ref: ${refId}`;
    alert(msg);
    // No dedicated success screen in this flow (falls straight back to the
    // bazaar grid after the alert) — deliver the confirmation PDF directly,
    // same underlying function BookNowWizard's button uses.
    if (selectedItem) {
      downloadConfirmationMessage({
        category: selectedItem.isService ? "seva_offering" : "bazaar_order",
        serviceName: selectedItem.name,
        devoteeName: devoteeName.trim(),
        refId,
      });
    }
    // Reset form fields
    setDevoteeName(""); setDevoteePhone(""); setDevoteeEmail("");
    setDevoteeGotra(""); setDevoteeRashi("Mesh (Aries)");
    setSankalpaIntent(""); setOrderNote(""); setDevoteeAddress(""); setDevoteePincode("");
    setSelectedItem(null);
  };

  // ✅ DUPLICATE-SUBMISSION FIX: this used to run a debounced "Draft — Still
  // Filling Form" autosave on every meaningful keystroke, PLUS a second
  // visibilitychange/pagehide listener that flushed a "Draft — Page Closed"
  // row too. Both fired in addition to the Pending row (sent on submit,
  // below) and the Final row (sent on payment), so one Sankalpa Portal
  // session could write many extra, unfinished rows into the Google Sheet
  // — exactly the duplicate-entries problem this component should not
  // create. The Pending row already reliably captures an abandoned cart the
  // moment the devotee submits the Sankalpa Portal, so removing the
  // autosave here does not lose any real lead — it just stops writing a new
  // row for every pause in typing or tab switch.

  // Shared card renderer for the "Current Offerings" legacy catalogue —
  // used by BOTH the mobile/app carousel and the desktop grid below so
  // the two stay pixel-identical instead of drifting apart over time.
  const renderLegacyItemCard = (item: BazaarItem) => (
            <div
              className="bg-[#092320] rounded-3xl border border-white/10 overflow-hidden flex flex-col hover:border-[#5EEAD4]/20 transition-all hover:shadow-lg h-full"
            >
              {/* Image */}
              <div className="relative w-full aspect-[3/2] overflow-hidden bg-[#0D2F2B] shrink-0">
                {item.imageUrl ? (
                  <OptimizedImage
                    src={item.imageUrl}
                    alt={item.name}
                    loading="lazy"
                    width={480}
                    height={320}
                    className="w-full h-full object-cover filter brightness-90"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="w-10 h-10 text-white/20" />
                  </div>
                )}
                {item.badge && (SHOW_BAZAAR_DISCOUNT_PROMO || item.badge !== BAZAAR_DISCOUNT_BADGE_TEXT) && (
                  <span className="absolute top-2 left-2 bg-red-500 text-white text-[11px] font-black px-2 py-0.5 rounded-full tracking-wide">
                    {item.badge}
                  </span>
                )}
                {/* Service badge */}
                {item.isService && (
                  <span className="absolute top-2 right-2 bg-[#FFB347] text-[#021816] text-[11px] font-black px-2 py-0.5 rounded-full tracking-wide flex items-center gap-1">
                    <Flame className="w-2.5 h-2.5" />
                    Live Seva
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#092320]/90 to-transparent p-2">
                  <span className="text-[11px] font-mono text-teal-300 bg-black/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {item.category}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-serif font-bold text-white text-sm mb-1">{item.name}</h3>
                <p className="text-[13px] text-white/60 leading-relaxed mb-3">{item.description}</p>

                {/* Includes / Receives accordion — both shown together per
                    the "What's Included" + "What You Receive" pattern used
                    by Seva Offerings and Devotional Shopping Offerings. */}
                {(item.includes || item.receives) && (
                  <div className="mb-3">
                    <button
                      onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                      className="flex items-center gap-1.5 text-[12px] text-[#5EEAD4] font-mono font-bold"
                    >
                      <Package className="w-3 h-3" />
                      What's included · What you receive
                      {expandedItem === item.id
                        ? <ChevronUp className="w-3 h-3" />
                        : <ChevronDown className="w-3 h-3" />}
                    </button>
                    {expandedItem === item.id && (
                      <div className="mt-1.5 space-y-2">
                        {item.includes && (
                          <div>
                            <span className="block text-[11px] font-bold text-white/50 uppercase tracking-wide mb-0.5">Includes</span>
                            <ul className="space-y-0.5">
                              {item.includes.map((inc, i) => (
                                <li key={i} className="flex items-center gap-1.5 text-[12px] text-white/60">
                                  <Star className="w-2.5 h-2.5 text-[#FFB347] shrink-0" />
                                  {inc}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {item.receives && (
                          <div>
                            <span className="block text-[11px] font-bold text-white/50 uppercase tracking-wide mb-0.5">You receive</span>
                            <ul className="space-y-0.5">
                              {item.receives.map((rec, i) => (
                                <li key={i} className="flex items-center gap-1.5 text-[12px] text-white/60">
                                  <Star className="w-2.5 h-2.5 text-[#5EEAD4] shrink-0" />
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Spacer pushes price/CTA to the bottom */}
                <div className="flex-1" />

                {/* Contribution disclaimer — lives inside this card, right
                    above its own Buy Now/Book Seva button. */}
                <div id={`bazaar-legacy-disclaimer-${item.id}`} className="mt-2 pt-3">
                  <DisclaimerAcknowledge
                    summary={item.isService
                      ? "May this seva be a heartfelt expression of your श्रद्धा, lovingly performed according to the sacred traditions of the temple, with each devotee's experience unfolding in its own unique way."
                      : "This item is dispatched with care after payment confirmation — delivery timelines can vary by location."}
                    details={BAZAAR_DISCLAIMER}
                    checked={!!legacyDisclaimerChecked[item.id]}
                    onCheckedChange={(v) => {
                      setLegacyDisclaimerChecked((p) => ({ ...p, [item.id]: v }));
                      if (v) setLegacyDisclaimerError((p) => ({ ...p, [item.id]: false }));
                    }}
                    checkboxLabel="I understand and confirm before proceeding."
                    showRequiredError={!!legacyDisclaimerError[item.id]}
                  />
                </div>

                {/* Price + CTA
                    ✅ FIX — same price/button collision fix as
                    HolisticWellness.tsx: min-w-0 on the price block plus
                    shrink-0 whitespace-nowrap on the button stops the
                    label wrapping and visually overlapping the price at
                    narrow (280px carousel) card widths. */}
                <div className="flex items-center justify-between pt-3 border-t border-white/10 gap-3">
                  <div className="min-w-0">
                    {SHOW_BAZAAR_DISCOUNT_PROMO && (
                      <span className="block text-[12px] line-through text-white/30 font-mono">₹{item.mrp}</span>
                    )}
                    <span className="text-base font-extrabold text-[#FFB347] font-serif">₹{item.price}</span>
                  </div>
                  <button
                    onClick={() => {
                      if (!legacyDisclaimerChecked[item.id]) {
                        setLegacyDisclaimerError((p) => ({ ...p, [item.id]: true }));
                        document.getElementById(`bazaar-legacy-disclaimer-${item.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                        return;
                      }
                      handleBuyNow(item);
                    }}
                    className="bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold px-4 py-2.5 rounded-xl text-[12px] tracking-widest uppercase transition-all shadow flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                  >
                    {item.isService
                      ? <><Flame className="w-3.5 h-3.5" /> Book Seva</>
                      : <><ShoppingBag className="w-3.5 h-3.5" /> Buy Now</>}
                  </button>
                </div>
              </div>
            </div>
  );

  return (
    <section
      id="temple-bazaar-section"
      className="py-16 bg-[#021816] text-white relative"
      style={isAndroidApp ? sectionTopPadding(true) : { paddingTop: `calc(var(--safe-area-inset-top, env(safe-area-inset-top, 24px)) + 96px)` }}
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
            Traditional prasad, puja kits, sacred items & live puja services — sourced from temples across India,
            performed in your Gotra, delivered to your doorstep.
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            Devotional Shopping Offerings — new structured products,
            shown at the top of Temple Bazaar Store per the same tiered
            (₹100 → ₹2,100+) pattern used by Seva Offerings.
        ══════════════════════════════════════════════════════════════ */}
        <div className="mb-12">
          <div className="text-center max-w-2xl mx-auto mb-5">
            <h3 className="font-serif text-xl font-bold text-white">Devotional Shopping Offerings</h3>
            <p className="text-[13px] text-white/60 mt-1.5 leading-relaxed">{BAZAAR_DELIVERY_NOTE}</p>
            <span className="inline-block text-[12px] font-mono text-[#5EEAD4] uppercase tracking-wide bg-[#5EEAD4]/10 border border-[#5EEAD4]/20 px-2.5 py-1 rounded-full mt-2">
              All Offerings Start at ₹100
            </span>
          </div>

          {/* New products category filter */}
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {["All", ...BAZAAR_CATEGORIES].map((cat) => (
              <button
                key={cat}
                onClick={() => { gaCategoryFilter(cat, "temple_bazaar_devotional_shopping"); setNewSelectedCategory(cat); }}
                className={`text-xs font-bold px-4 py-2 rounded-full border transition-all ${
                  newSelectedCategory === cat
                    ? "bg-[#FFB347] text-[#021816] border-[#FFB347]"
                    : "bg-white/5 text-white/70 border-white/10 hover:border-white/30"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* ✅ MIGRATED TO SHARED MobileCarousel — see SevaExperience.tsx
              for why hand-copied carousel markup was consolidated into one
              component. */}
          <div className="mb-6">
            <MobileCarousel
              items={filteredNewProducts}
              getKey={(product) => product.id}
              cardWidthClassName="w-[clamp(240px,72vw,420px)]"
              gapClassName="gap-5"
              renderItem={(product) => (
                <BazaarOfferingCard
                  product={product}
                  isActive={activeNewOfferingId === product.id}
                  onActivate={() => setActiveNewOfferingId(product.id)}
                  onOffer={handleOfferNewProduct}
                  onAddToCart={handleAddToNewCart}
                />
              )}
            />
          </div>

          {/* Section-local cart summary — only shown once something's been added */}
          {newBazaarCart.length > 0 && (
            <div className="max-w-md mx-auto mb-6 bg-[#092320] border border-[#FFB347]/40 rounded-2xl px-4 py-3 shadow-lg flex items-center justify-between gap-3">
              <div className="text-xs text-white/80">
                <span className="font-bold text-[#FFB347]">{newBazaarCart.length} item{newBazaarCart.length > 1 ? "s" : ""}</span> in cart · ₹{newCartTotal.toLocaleString("en-IN")}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={handleClearNewCart} className="text-[12px] text-white/50 underline hover:text-white/70">
                  Clear
                </button>
                <button
                  onClick={handleCheckoutNewCart}
                  className="bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] text-[12px] font-extrabold px-3.5 py-2 rounded-xl uppercase tracking-wide"
                >
                  Checkout
                </button>
              </div>
            </div>
          )}

          {/* Trust copy */}
          <div className="flex items-start space-x-2.5 text-xs text-white/70 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 max-w-3xl mx-auto">
            <ShieldCheck className="w-4 h-4 text-[#5EEAD4] flex-shrink-0 mt-0.5" />
            <span>{BAZAAR_TRUST_COPY}</span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            Current Offerings — original Temple Bazaar catalogue
        ══════════════════════════════════════════════════════════════ */}
        <div className="text-center max-w-2xl mx-auto mb-5">
          <h3 className="font-serif text-xl font-bold text-white">Current Offerings</h3>
          <p className="flex items-center justify-center gap-1.5 text-[13px] text-white/60 mt-1.5 leading-relaxed">
            <Truck className="w-3.5 h-3.5 text-[#FFB347] shrink-0" />
            Shipping charges will apply on physical items and may vary based on your delivery PIN code.
          </p>
        </div>

        {/* ── Category Filter ──────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => { gaCategoryFilter(cat, "temple_bazaar"); setSelectedCategory(cat); }}
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
        {/* ✅ MIGRATED TO SHARED MobileCarousel — same Temple Bazaar top-6
            pattern as Devotional Shopping Offerings above, now sharing the
            same component instead of a second hand-copied implementation. */}
        <MobileCarousel
          items={filteredItems}
          getKey={(item) => item.id}
          cardWidthClassName="w-[clamp(240px,72vw,420px)]"
          gapClassName="gap-5"
          renderItem={(item) => renderLegacyItemCard(item)}
        />

        {/* ── Trust Badges ─────────────────────────────────────────────── */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: <Truck className="w-5 h-5 text-[#FFB347]" />,          title: "Free Shipping",     desc: "On all product orders above ₹499" },
            { icon: <ShieldCheck className="w-5 h-5 text-[#5EEAD4]" />,    title: "Temple Sourced",   desc: "All items sourced from registered temples" },
            { icon: <Heart className="w-5 h-5 text-pink-400" fill="currentColor" />, title: "Seva Guarantee",   desc: "Live photo proof for every puja service" },
          ].map((badge, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              {badge.icon}
              <div>
                <span className="block text-xs font-bold text-white">{badge.title}</span>
                <span className="block text-[12px] text-white/50">{badge.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* India Temple Map (static image) — shown after Sacred Marketplace per site layout */}
        <div className="mt-12">
          <IndiaTempleMap />
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════════
          STEP 1: Puja Sankalpa Portal
      ══════════════════════════════════════════════════════════════════ */}
      {showSankalpa && selectedItem && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[200] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4"
          style={{ touchAction: "pan-y" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowSankalpa(false); }}
        >
          <div
            className="bg-[#092320] w-full sm:rounded-3xl sm:max-w-sm border border-white/10 shadow-2xl text-white flex flex-col"
            style={{ maxHeight: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >

            {/* Sticky Modal Header with Logo */}
            <div
              className="shrink-0 bg-[#021816] px-5 py-4 border-b border-white/10 sm:rounded-t-3xl"
              style={{ paddingTop: "calc(var(--safe-area-inset-top, env(safe-area-inset-top, 24px)) + 1rem)" }}
            >
              {/* Sri Dwar Brand Logo */}
              <div className="flex justify-center mb-3">
                <SriDwarLogo variant="colored" iconSize="sm" showTagline={false} />
              </div>
              {/* min-w-0 lets this text block shrink instead of pushing
                  into or overlapping the ✕ button on narrow Android widths. */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif text-sm font-bold text-white leading-snug break-words">
                    {selectedItem.isService ? "Puja Sankalpa Portal" : "Sacred Bazaar Order"}
                  </h3>
                  <p className="text-[12px] font-mono text-[#FFB347] uppercase tracking-wider mt-0.5 truncate">
                    {selectedItem.name}
                  </p>
                </div>
                <button
                  onClick={() => setShowSankalpa(false)}
                  className="text-white/60 hover:text-white p-1.5 bg-white/5 rounded-full border border-white/10 shrink-0 ml-2 w-8 h-8 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Single scroll container — the ONLY scrollable element */}
            <div
              className="flex-1 min-h-0 overflow-y-auto"
              style={{ WebkitOverflowScrolling: "touch", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)" }}
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
                  {SHOW_BAZAAR_DISCOUNT_PROMO && selectedItem.mrp > selectedItem.price && (
                    <span className="block text-[11px] line-through text-white/30 font-mono">₹{selectedItem.mrp}</span>
                  )}
                  <span className="text-sm font-extrabold text-[#FFB347] font-serif">₹{selectedItem.price}</span>
                </div>
              </div>

              <p className="text-[13px] text-white/60 leading-relaxed">
                {selectedItem.isService
                  ? "🙏 Please enter your Sankalpa details so our pandits can perform this seva in your name and Gotra."
                  : "🙏 Please share your details so we can prepare and dispatch your sacred order with care."}
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

              {/* Gotra + Rashi + Sankalpa Intention — only for temple-performed
                  seva/puja services. A physical product order (mala, idol,
                  incense, prasad kit) has no priest reciting a Sankalpa
                  against these details, so asking for them there was
                  confusing and meaningless — replaced below with a plain,
                  optional Order Note for products instead. */}
              {selectedItem.isService && (
                <>
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
                    <p className="text-[12px] text-white/30 mt-1 font-mono">The pandit will recite this during Sankalpa</p>
                  </div>
                </>
              )}

              {/* Order Note — only for physical products, replaces the
                  Sankalpa Intention field above with plain order wording. */}
              {!selectedItem.isService && (
                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-[#5EEAD4]" />
                    Order Note <span className="text-white/40 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={orderNote}
                    onChange={e => setOrderNote(e.target.value)}
                    placeholder="Any note for our packing team — e.g. gifting instructions..."
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35 resize-none"
                  />
                </div>
              )}

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
                  <p className="text-[12px] text-white/40 font-mono">
                    🚚 Ships within 3–5 working days after payment confirmation.
                  </p>
                </>
              )}

              {selectedItem.isService && (
                <div className="flex items-start gap-2 bg-emerald-950/30 border border-emerald-500/20 px-3 py-2.5 rounded-xl text-[12px] text-emerald-300 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Live photo proof + WhatsApp confirmation sent within 2 hours of seva completion. 🙏</span>
                </div>
              )}

              {/* Bhog Offerings disclaimer — shown once, here in the
                  Sankalpa Portal, instead of repeating on every card. */}
              {selectedItem.isService && (
                <div id="sankalpa-bhog-disclaimer">
                  <DisclaimerAcknowledge
                    summary={BAZAAR_BHOG_OFFERING_SUMMARY}
                    details={BAZAAR_DISCLAIMER}
                    checked={sankalpaDisclaimerChecked}
                    onCheckedChange={(v) => { setSankalpaDisclaimerChecked(v); if (v) setShowSankalpaDisclaimerError(false); }}
                    checkboxLabel="I understand and confirm before proceeding."
                    showRequiredError={showSankalpaDisclaimerError}
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold py-3.5 rounded-xl text-xs tracking-widest uppercase transition-all shadow flex items-center justify-center gap-2"
              >
                <Flame className="w-4 h-4" />
                {selectedItem.isService ? "Proceed to Sacred Offering →" : "Proceed to Checkout →"}
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
