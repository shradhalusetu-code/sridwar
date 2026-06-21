/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import TempleExperience from "./components/TempleExperience";
import SpiritualConsole from "./components/SpiritualConsole";
import SevaExperience from "./components/SevaExperience";
import DevoteeExperiences from "./components/DevoteeExperiences";
import OnlinePuja from "./components/OnlinePuja";
import ProductCatalog from "./components/ProductCatalog";
import AboutUs from "./components/AboutUs";
import ContactUs from "./components/ContactUs";
import AuthDashboard from "./components/AuthDashboard";
import AIAssistant from "./components/AIAssistant";
import BookNowWizard from "./components/BookNowWizard";
import SriDwarLogo from "./components/SriDwarLogo";
import FAQs from "./components/FAQs";
import UpiPaymentPopup from "./components/UpiPaymentPopup";
import SacredResources from "./components/SacredResources";

import { Language, TRANSLATIONS } from "./data/translations";
import { Product, Temple, CartItem } from "./types";
import {
  ChevronRight, Heart, ShoppingBasket, Trash2, Calendar, ShieldAlert, Check, RefreshCw, X,
  Linkedin, Instagram, Youtube, Twitter, Facebook, MessageCircle, Mail, MapPin
} from "lucide-react";

export default function App() {
  const [currentLanguage, setCurrentLanguage] = useState<Language>("en");
  const [currentPage, setCurrentPage] = useState<string>("home");
  
  // Cart, Booking wizards
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCartPaymentOpen, setIsCartPaymentOpen] = useState(false);
  const [isBookNowOpen, setIsBookNowOpen] = useState(false);
  const [isSevaModalOpen, setIsSevaModalOpen] = useState(false);
  
  // Custom states for wizard pass
  const [wizardDefaults, setWizardDefaults] = useState({ pujaName: "", price: 1100 });
  const [sevaDefaults, setSevaDefaults] = useState({ name: "", price: 501 });

  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState({ name: "", email: "" });
  const [bookedItems, setBookedItems] = useState<Array<{ pujaName: string; price: number; refId: string; date: string }>>([]);

  // Active Selected Temple Modal details for full page reviews
  const [activeExploreTemple, setActiveExploreTemple] = useState<Temple | null>(null);

  const t = TRANSLATIONS[currentLanguage];

  // Load sample book on launch or sync with localStorage for durable persistence
  useEffect(() => {
    const cachedName = localStorage.getItem("sd_dev_name");
    const cachedEmail = localStorage.getItem("sd_dev_email");
    if (cachedName && cachedEmail) {
      setIsLoggedIn(true);
      setUserProfile({ name: cachedName, email: cachedEmail });
    }

    const cachedBooked = localStorage.getItem("sd_booked_items");
    if (cachedBooked) {
      setBookedItems(JSON.parse(cachedBooked));
    }
  }, []);

  const handleLoginSuccess = (name: string, email: string) => {
    setIsLoggedIn(true);
    setUserProfile({ name, email });
    localStorage.setItem("sd_dev_name", name);
    localStorage.setItem("sd_dev_email", email);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserProfile({ name: "", email: "" });
    localStorage.removeItem("sd_dev_name");
    localStorage.removeItem("sd_dev_email");
  };

  const handleAddToCart = (product: Product) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        return prevCart.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.product.id === productId) {
            const newQ = item.quantity + delta;
            return { ...item, quantity: newQ };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  // Opens the real UPI QR payment popup for the cart total.
  const handleCartGPayCheckout = () => {
    if (cart.length === 0) return;
    setIsCartPaymentOpen(true);
  };

  // Called after the devotee taps "I Have Paid" in the UPI popup.
  const finalizeCartCheckout = async () => {
    const cartSummaryStr = cart.map(item => `${item.product.name} (x${item.quantity})`).join(", ");
    const totalAmount = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

    const refId = `SDP-${Math.floor(100000 + Math.random() * 900000)}`;
    const newBooking = {
      pujaName: `Cart Orders: ${cartSummaryStr}`,
      price: totalAmount,
      refId,
      date: new Date().toLocaleDateString()
    };

    const updatedBookings = [newBooking, ...bookedItems];
    setBookedItems(updatedBookings);
    localStorage.setItem("sd_booked_items", JSON.stringify(updatedBookings));

    setIsCartPaymentOpen(false);
    setCart([]);
    setIsCartOpen(false);

    alert(`🙏 Payment confirmed! ₹${totalAmount} recorded for order ${refId}. Your blessed Prasad & items will be shipped soon. An acknowledgement certificate will be shared with you on WhatsApp and Email within 24 hours.`);
  };

  const handleBookNowSuccess = (item: { pujaName: string; price: number; refId: string }) => {
    const newBooking = {
      pujaName: item.pujaName,
      price: item.price,
      refId: item.refId,
      date: new Date().toLocaleDateString()
    };

    const updatedBookings = [newBooking, ...bookedItems];
    setBookedItems(updatedBookings);
    localStorage.setItem("sd_booked_items", JSON.stringify(updatedBookings));
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#021816] text-white overflow-x-hidden font-sans">
      
      {/* 1. STICKY HEADER NAVIGATION */}
      <Navbar
        currentLanguage={currentLanguage}
        onLanguageChange={setCurrentLanguage}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        cart={cart}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenBookNow={() => {
          setWizardDefaults({ pujaName: "Sarvajanik Veda Shanti Puja", price: 550 });
          setIsBookNowOpen(true);
        }}
        onOpenSevaModal={() => setIsSevaModalOpen(true)}
        isLoggedIn={isLoggedIn}
        userProfileName={userProfile.name}
        onLogout={handleLogout}
      />

      {/* 2. DYNAMIC PAGES VIEW */}
      <main className="flex-grow pt-8">
        {currentPage === "home" && (
          <div className="space-y-0">
            {/* Cinematic Entrance */}
            <Hero
              currentLanguage={currentLanguage}
              onNavigate={setCurrentPage}
              onOpenBookNow={() => {
                setWizardDefaults({ pujaName: "Vighnaharta Ganesha Success Puja", price: 626 });
                setIsBookNowOpen(true);
              }}
              onOpenProducts={() => setCurrentPage("products")}
            />
            
            {/* Spotlight and lists */}
            <TempleExperience
              onBookPuja={(templeName, deity) => {
                setWizardDefaults({ pujaName: `${deity} Sankalpa offering (${templeName})`, price: 751 });
                setIsBookNowOpen(true);
              }}
              onExploreTemple={(temple) => setActiveExploreTemple(temple)}
              onNavigate={setCurrentPage}
            />

            {/* Chants/Horoscope console */}
            <SpiritualConsole
              onBookService={(serviceName) => {
                setWizardDefaults({ pujaName: `${serviceName} Vedic Guidance`, price: 1050 });
                setIsBookNowOpen(true);
              }}
            />

            {/* Giving and feed */}
            <SevaExperience
              onSponsorSeva={(sevaName, price) => {
                setWizardDefaults({ pujaName: `Sponsorship donation: ${sevaName}`, price });
                setIsBookNowOpen(true);
              }}
            />

            {/* Testimonials and customer reviews carousel */}
            <DevoteeExperiences />

            {/* Collapsible FAQ accordion questions */}
            <FAQs />
          </div>
        )}

        {currentPage === "seva" && (
          <div className="animate-fadeIn">
            <SevaExperience
              onSponsorSeva={(sevaName, price) => {
                setWizardDefaults({ pujaName: `Sponsorship donation: ${sevaName}`, price });
                setIsBookNowOpen(true);
              }}
            />
          </div>
        )}

        {currentPage === "puja" && (
          <div className="animate-fadeIn">
            <OnlinePuja
              onBookNowClick={(pujaName, price) => {
                setWizardDefaults({ pujaName, price: Math.round(price * 0.5) });
                setIsBookNowOpen(true);
              }}
            />
          </div>
        )}

        {currentPage === "products" && (
          <div className="animate-fadeIn">
            <ProductCatalog
              onAddToCart={handleAddToCart}
              cart={cart}
            />
          </div>
        )}

        {currentPage === "about" && (
          <div className="animate-fadeIn">
            <AboutUs />
          </div>
        )}

        {currentPage === "contact" && (
          <div className="animate-fadeIn">
            <ContactUs />
          </div>
        )}

        {currentPage === "login" && (
          <div className="animate-fadeIn">
            <AuthDashboard
              currentLanguage={currentLanguage}
              isLoggedIn={isLoggedIn}
              onLoginSuccess={handleLoginSuccess}
              onLogout={handleLogout}
              userProfile={userProfile}
              bookedItems={bookedItems}
            />
          </div>
        )}
      </main>

      {/* 3a. SACRED DAILY DEVOTION TOOLS (Mantra / Aarti / Chalisa / Sun & Moon Timings) */}
      <SacredResources />

      {/* 3. COHESIVE SECURE PLATFORM FOOTER */}
      <footer id="corporate-footer" className="bg-[#021816] text-white pt-16 pb-8 border-t border-white/10 text-left relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── Row 1: Brand + Links ───────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">

            {/* Logo / brand block */}
            <div className="space-y-4">
              <SriDwarLogo variant="colored" iconSize="xl" showTagline={true} className="" />
              <p className="text-xs text-white/60 font-sans leading-relaxed">
                A globally scalable faith-tech ecosystem bridging holy distances with verified ancient rituals, live aartis, and authenticated certifications.
              </p>
              <span className="text-[10px] font-mono text-[#FFB347] uppercase font-bold tracking-wider block">
                Shradhalu Private Limited
              </span>
              <div className="flex items-start space-x-2 text-[11px] text-white/55 leading-relaxed pt-1">
                <MapPin className="w-3.5 h-3.5 text-[#5EEAD4] shrink-0 mt-0.5" />
                <span>Shradhalu Pvt Ltd, Ground Floor, Sobra, Maa Biraja Khetra, Jajpur, Odisha, 755019</span>
              </div>
            </div>

            {/* Navigation links */}
            <div>
              <h4 className="font-serif text-sm font-bold text-[#FFB347] mb-4 uppercase tracking-wider">Quick Devotions</h4>
              <ul className="space-y-2 text-xs text-white/60 font-medium">
                <li><button onClick={() => setCurrentPage("home")} className="hover:text-white transition-colors">Home Portal</button></li>
                <li><button onClick={() => setCurrentPage("seva")} className="hover:text-white transition-colors">Seva Hub</button></li>
                <li><button onClick={() => setCurrentPage("puja")} className="hover:text-white transition-colors">Online Puja</button></li>
                <li><button onClick={() => setCurrentPage("products")} className="hover:text-white transition-colors">Temple Bazaar</button></li>
                <li><button onClick={() => setCurrentPage("about")} className="hover:text-white transition-colors">Our Divine Mission</button></li>
                <li><button onClick={() => setCurrentPage("contact")} className="hover:text-white transition-colors">Devotee Care</button></li>
                <li><button onClick={() => setCurrentPage("login")} className="hover:text-white transition-colors">My Dharmic ID</button></li>
                <li>
                  <button
                    onClick={() => {
                      setCurrentPage("home");
                      setTimeout(() => {
                        document.getElementById("temple-experience-section")?.scrollIntoView({ behavior: "smooth" });
                      }, 150);
                    }}
                    className="hover:text-white transition-colors"
                  >
                    Explore Shrines
                  </button>
                </li>
                <li><button onClick={() => setCurrentPage("login")} className="hover:text-white transition-colors">Darshan Certificate</button></li>
                <li><button onClick={() => setCurrentPage("login")} className="hover:text-white transition-colors">Receive Prasad</button></li>
                <li><button onClick={() => setCurrentPage("contact")} className="hover:text-white transition-colors">Investors &amp; Career</button></li>
              </ul>
            </div>

            {/* Corporate compliance */}
            <div>
              <h4 className="font-serif text-sm font-bold text-[#FFB347] mb-4 uppercase tracking-wider">Legal & Compliance</h4>
              <ul className="space-y-2 text-xs text-white/60">
                <li className="font-bold text-white">Shradhalu Private Ltd</li>
                <li className="font-mono text-[10px] text-[#FFB347]">CIN: U62099OD2026PTC054237</li>
                <li>Secured Payments: Standard Google Pay Container</li>
                <li>Database: Google Cloud Spreadsheet secured records</li>
                <li className="pt-2 text-[10px] text-white/40 leading-relaxed italic border-t border-white/5 mt-2">
                  Disclaimer: All temple names, deity portraits, rituals, trademarks, and associated media shown are intellectual property rights reserved under respective temple trusts & Shradhalu Private Ltd.
                </li>
              </ul>
            </div>

            {/* Social links */}
            <div>
              <h4 className="font-serif text-sm font-bold text-[#FFB347] mb-4 uppercase tracking-wider">Social Linkages</h4>

              <div className="flex flex-wrap gap-2.5">
                <a
                  href="https://www.linkedin.com/company/sri-dwar"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  title="LinkedIn"
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-[#5EEAD4] hover:border-[#5EEAD4]/40 transition-all"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
                <a
                  href="https://www.instagram.com/sri_dwar/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  title="Instagram"
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-[#5EEAD4] hover:border-[#5EEAD4]/40 transition-all"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href="https://www.youtube.com/@SriDwar"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  title="YouTube"
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-[#5EEAD4] hover:border-[#5EEAD4]/40 transition-all"
                >
                  <Youtube className="w-4 h-4" />
                </a>
                <a
                  href="https://x.com/Sri_Dwar"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Twitter / X"
                  title="Twitter / X"
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-[#5EEAD4] hover:border-[#5EEAD4]/40 transition-all"
                >
                  <Twitter className="w-4 h-4" />
                </a>
                <a
                  href="https://www.facebook.com/sridwar"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  title="Facebook"
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-[#5EEAD4] hover:border-[#5EEAD4]/40 transition-all"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a
                  href="https://wa.me/919777645062"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  title="WhatsApp: +91 97776 45062"
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-[#5EEAD4] hover:border-[#5EEAD4]/40 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
                <a
                  href="mailto:puja@sridwar.com"
                  aria-label="Email"
                  title="puja@sridwar.com"
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-[#5EEAD4] hover:border-[#5EEAD4]/40 transition-all"
                >
                  <Mail className="w-4 h-4" />
                </a>
              </div>
            </div>

          </div>

          {/* ── Row 2: Platform Disclaimer ────────────────────────────────────── */}
          <div className="mb-10 bg-[#051F1A] border border-white/8 rounded-3xl p-6 sm:p-8 space-y-3">
            <div className="flex items-center space-x-2 mb-1">
              <Heart className="w-4 h-4 text-[#FFB347] fill-[#FFB347]/30 shrink-0" />
              <span className="text-[10px] font-mono font-bold text-[#FFB347]/80 uppercase tracking-widest">About Sri Dwar</span>
            </div>
            <p className="text-[12px] text-white/65 leading-relaxed">
              Sri Dwar is a digital platform that supports millions of people on their spiritual and devotional journey. It helps devotees strengthen their connection with the Divine by providing meaningful guidance and making daily worship simple, accessible, and convenient.
            </p>
            <p className="text-[12px] text-white/65 leading-relaxed">
              With Sri Dwar, you can worship anytime, anywhere — directly from your mobile phone, completely free of charge. In just a few clicks, you can create a beautiful digital temple, choose your preferred deities, and perform your daily prayers with devotion, all from the comfort of your phone.
            </p>
            <p className="text-[12px] text-white/65 leading-relaxed">
              Sri Dwar is designed to make spirituality a part of everyday life, enabling devotees to stay connected to their faith wherever they are.
            </p>
          </div>

          {/* ── Row 3: Government Initiative Badges ───────────────────────────── */}
          <div className="mb-10">
            <p className="text-[10px] font-mono font-bold text-white/30 uppercase tracking-widest text-center mb-5">
              Recognised by Government of India Initiatives
            </p>
            <div className="flex flex-wrap justify-center gap-3">

              {/* Digital India */}
              <div className="flex flex-col items-center justify-center px-4 py-3 rounded-2xl border text-center min-w-[108px]" style={{ background: "#0A1F0A", borderColor: "#FF6B2B40" }}>
                <div className="flex w-full h-[3px] rounded-full overflow-hidden mb-2">
                  <div className="flex-1 bg-[#FF9933]" /><div className="flex-1 bg-white/90" /><div className="flex-1 bg-[#138808]" />
                </div>
                <div className="w-5 h-5 rounded-full border-2 border-[#FF6B2B] flex items-center justify-center mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B2B]" />
                </div>
                <span className="block text-[11px] font-black leading-tight text-[#FF6B2B]">Digital India</span>
                <span className="block text-[8px] text-white/40 mt-0.5">Power to Empower</span>
              </div>

              {/* Startup India */}
              <div className="flex flex-col items-center justify-center px-4 py-3 rounded-2xl border text-center min-w-[108px]" style={{ background: "#0A1510", borderColor: "#FF993340" }}>
                <div className="flex w-full h-[3px] rounded-full overflow-hidden mb-2">
                  <div className="flex-1 bg-[#FF9933]" /><div className="flex-1 bg-white/90" /><div className="flex-1 bg-[#138808]" />
                </div>
                <div className="w-5 h-5 rounded-full border-2 border-[#FF9933] flex items-center justify-center mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF9933]" />
                </div>
                <span className="block text-[11px] font-black leading-tight text-[#FF9933]">Startup India</span>
                <span className="block text-[8px] text-white/40 mt-0.5">Recognised</span>
              </div>

              {/* Make in India */}
              <div className="flex flex-col items-center justify-center px-4 py-3 rounded-2xl border text-center min-w-[108px]" style={{ background: "#061506", borderColor: "#13880840" }}>
                <div className="flex w-full h-[3px] rounded-full overflow-hidden mb-2">
                  <div className="flex-1 bg-[#FF9933]" /><div className="flex-1 bg-white/90" /><div className="flex-1 bg-[#138808]" />
                </div>
                <div className="w-5 h-5 rounded-full border-2 border-[#138808] flex items-center justify-center mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#138808]" />
                </div>
                <span className="block text-[11px] font-black leading-tight text-[#138808]">Make in India</span>
                <span className="block text-[8px] text-white/40 mt-0.5">Proudly Built Here</span>
              </div>

              {/* GeM */}
              <div className="flex flex-col items-center justify-center px-4 py-3 rounded-2xl border text-center min-w-[108px]" style={{ background: "#050B1A", borderColor: "#1A73E840" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-1 text-base" style={{ background: "#1A73E822" }}>🛒</div>
                <span className="block text-[11px] font-black leading-tight text-[#1A73E8]">GeM</span>
                <span className="block text-[8px] text-white/40 mt-0.5">Govt e-Marketplace</span>
              </div>

              {/* DPIIT */}
              <div className="flex flex-col items-center justify-center px-4 py-3 rounded-2xl border text-center min-w-[108px]" style={{ background: "#05090F", borderColor: "#0056A840" }}>
                <div className="flex w-full h-[3px] rounded-full overflow-hidden mb-2">
                  <div className="flex-1 bg-[#FF9933]" /><div className="flex-1 bg-white/90" /><div className="flex-1 bg-[#138808]" />
                </div>
                <div className="w-5 h-5 rounded-full border-2 border-[#0056A8] flex items-center justify-center mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0056A8]" />
                </div>
                <span className="block text-[11px] font-black leading-tight text-[#0056A8]">DPIIT</span>
                <span className="block text-[8px] text-white/40 mt-0.5">Dept. for Promotion of Industry</span>
              </div>

            </div>
          </div>

          {/* ── Row 4: Coming Soon — Mobile Apps ─────────────────────────────── */}
          <div className="mb-10 bg-[#051F1A] border border-white/8 rounded-3xl p-5 sm:p-6">
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-base">📱</span>
              <span className="text-[10px] font-mono font-bold text-[#5EEAD4]/80 uppercase tracking-widest">Sri Dwar Mobile App — Coming Soon</span>
            </div>
            <p className="text-[11px] text-white/50 mb-4 leading-relaxed">
              Experience the full power of Sri Dwar on your phone — live darshans, one-tap puja booking, daily prayers, and personalised spiritual guidance. Available soon on Android and iOS.
            </p>
            <div className="flex flex-wrap gap-3">

              {/* Google Play badge */}
              <div className="flex items-center space-x-3 bg-[#0A1A18] border border-white/10 rounded-2xl px-4 py-3 min-w-[155px] cursor-not-allowed opacity-80 hover:opacity-100 hover:border-[#5EEAD4]/30 transition-all">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#1A1A2E]">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                    <path d="M3.18 1.44A1 1 0 0 0 2 2.43v19.14a1 1 0 0 0 1.55.83l17-9.57a1 1 0 0 0 0-1.66L3.55 1.6a1 1 0 0 0-.37-.16z" fill="#00D26A"/>
                    <path d="M2 21.57V2.43L13.06 12 2 21.57z" fill="#00B0FF" fillOpacity="0.7"/>
                    <path d="M3.18 1.44l9.88 10.56L20.18 12 3.55 1.6a1 1 0 0 0-.37-.16z" fill="#FFD400" fillOpacity="0.9"/>
                    <path d="M3.18 22.56l9.88-10.56 7.12.44L3.55 22.4a1 1 0 0 1-.37.16z" fill="#FF3D00" fillOpacity="0.9"/>
                  </svg>
                </div>
                <div>
                  <span className="block text-[8px] text-white/40 uppercase tracking-widest font-mono">Coming Soon</span>
                  <span className="block text-xs font-bold text-white">Google Play</span>
                  <span className="block text-[8px] text-white/30">Android</span>
                </div>
              </div>

              {/* App Store badge */}
              <div className="flex items-center space-x-3 bg-[#0A1A18] border border-white/10 rounded-2xl px-4 py-3 min-w-[155px] cursor-not-allowed opacity-80 hover:opacity-100 hover:border-[#5EEAD4]/30 transition-all">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#1C1C1E]">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                </div>
                <div>
                  <span className="block text-[8px] text-white/40 uppercase tracking-widest font-mono">Coming Soon</span>
                  <span className="block text-xs font-bold text-white">App Store</span>
                  <span className="block text-[8px] text-white/30">iOS &amp; iPadOS</span>
                </div>
              </div>

            </div>
            <p className="text-[10px] font-mono text-[#FFB347]/50 mt-3">⭐ Follow us on WhatsApp to be the first to know when we launch</p>
          </div>

          {/* ── Row 5: Legal links strip ──────────────────────────────────────── */}
          <div className="pt-6 border-t border-white/8 mb-4">
            <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2">
              {[
                { label: "Privacy Policy", href: "https://docs.google.com/document/d/1HbohYx4LSsV94e-27KIndNvRpHRWb-i3/edit?usp=sharing&ouid=101793474525393877706&rtpof=true&sd=true" },
                { label: "Legal Compliance", href: "https://docs.google.com/document/d/1EKWQtLbVwI64Ay6GLbPV6X88myp5a8cb/edit?usp=sharing&ouid=101793474525393877706&rtpof=true&sd=true" },
                { label: "Terms of Use", href: "https://docs.google.com/document/d/1XGh8uRc6G7dS-Sk_pzJ65NF-7ujmAu7X/edit?usp=sharing&ouid=101793474525393877706&rtpof=true&sd=true" },
                { label: "Refund Policy", href: "https://docs.google.com/document/d/14mUCy9177qRHZELh1Mk6pFHuji9J5Dez/edit?usp=sharing&ouid=101793474525393877706&rtpof=true&sd=true" },
              ].map(({ label, href }, i, arr) => (
                <span key={label} className="flex items-center">
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-white/45 hover:text-[#5EEAD4] transition-colors underline underline-offset-2 decoration-white/15 hover:decoration-[#5EEAD4]"
                  >
                    {label}
                  </a>
                  {i < arr.length - 1 && <span className="mx-2 text-white/20 text-[10px] select-none">·</span>}
                </span>
              ))}
            </div>
          </div>

          {/* ── Row 6: Copyright bar ──────────────────────────────────────────── */}
          <div className="pt-4 border-t border-white/5 text-center flex flex-col sm:flex-row justify-between items-center text-[10px] text-white/40 font-mono gap-2">
            <p>{t.copyright}</p>
            <p>Sri Dwar © {new Date().getFullYear()} · Shradhalu Private Limited · All Blessings Secured 🙏</p>
          </div>

        </div>
      </footer>

      {/* 4. AI-POWERED SIDEBAR CHAT HELPER (Margadarshak) */}
      <AIAssistant currentLanguage={currentLanguage} />

      {/* 5. MULTI-STEP SANKALPA BOOKING WIZARD OVERLAY */}
      <BookNowWizard
        isOpen={isBookNowOpen}
        onClose={() => setIsBookNowOpen(false)}
        defaultPujaName={wizardDefaults.pujaName}
        defaultPrice={wizardDefaults.price}
        onSuccess={handleBookNowSuccess}
      />

      {/* 6. RE-USABLE SEVA CONTRIBUTION MODAL */}
      {isSevaModalOpen && (
        <div id="seva-quick-modal" className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 overflow-y-auto flex justify-center items-start md:items-center p-4 py-8 animate-fadeIn text-left">
          <div className="bg-[#092320] border border-white/15 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden relative animate-slideUp text-white my-auto">
            
            {/* Modal Header */}
            <div className="bg-[#021816] text-white px-6 py-5 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center space-x-2">
                <Heart className="w-5 h-5 text-[#FFB347] fill-[#FFB347] animate-pulse" />
                <div className="text-left">
                  <h3 className="font-serif text-base font-bold text-white">Divine Seva Sponsorship</h3>
                  <p className="text-[10px] font-mono text-[#FFB347] uppercase">Fostering Ancient Ritual Care</p>
                </div>
              </div>
              <button 
                id="close-seva-quick"
                onClick={() => setIsSevaModalOpen(false)} 
                className="text-white hover:text-[#FFB347] p-1.5 bg-white/10 rounded-full text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <span className="block text-xs font-bold text-white/85 text-left">Choose a quick Charity Offering:</span>
              
              <div className="space-y-2.5">
                {[
                  { name: "Annadanam (Feed visiting sadhus)", price: 501, symbol: "🍚" },
                  { name: "Gau Seva (Feed organic fodder)", price: 251, symbol: "🐄" },
                  { name: "Akhanda Diya (Lit clay gold lamp)", price: 151, symbol: "🪔" },
                  { name: "Sanskrit Gurukul School book kit", price: 1001, symbol: "📚" }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    id={`quick-seva-btn-${idx}`}
                    onClick={() => {
                      setWizardDefaults({ pujaName: `Sponsorship donation: ${item.name}`, price: item.price });
                      setIsSevaModalOpen(false);
                      setIsBookNowOpen(true);
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#5EEAD4] transition-all text-left"
                  >
                    <div className="flex items-center space-x-3 text-xs text-white">
                      <span className="text-xl">{item.symbol}</span>
                      <div className="text-left">
                        <span className="block font-bold text-white">{item.name}</span>
                        <span className="block text-[10px] text-white/50">Perform on your Gotra Sankalpa</span>
                      </div>
                    </div>
                    <span className="text-xs font-black font-serif text-[#FFB347]">₹{item.price}</span>
                  </button>
                ))}
              </div>

              <p className="text-[9px] text-[#5EEAD4] font-mono text-center pt-2">
                All donations are written securely under Shradhalu Private Limited records.
              </p>
            </div>

          </div>
        </div>
      )}

      {/* 7. RE-USABLE TEMPLE EXPLORE / ARCHITECTURE HISTORY MODAL */}
      {activeExploreTemple && (
        <div id="temple-explore-modal" className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 overflow-y-auto flex justify-center items-start md:items-center p-4 py-8 animate-fadeIn text-left text-xs text-white">
          <div className="bg-[#092320] border border-white/15 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden relative animate-slideUp my-auto">
            
            {/* Header Image box */}
            <div className="relative aspect-video bg-gray-900 border-b border-white/10">
              <img
                src={activeExploreTemple.imageUrl}
                alt={activeExploreTemple.name}
                className="absolute inset-0 w-full h-full object-cover filter brightness-75"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#092320] via-[#092320]/30 to-transparent" />
              
              <button
                id="close-temple-explore"
                onClick={() => setActiveExploreTemple(null)}
                className="absolute top-4 right-4 text-white hover:text-[#FFB347] p-1.5 bg-black/45 rounded-full font-bold text-sm"
              >
                ✕
              </button>

              <div className="absolute bottom-5 left-6 text-white text-left">
                <span className="text-2xl">{activeExploreTemple.symbol}</span>
                <h3 className="font-serif text-2xl font-black tracking-tight mt-1 text-white">{activeExploreTemple.name}</h3>
                <p className="text-xs text-[#FFB347] font-bold font-serif">{activeExploreTemple.city}, {activeExploreTemple.state}</p>
              </div>
            </div>

            {/* Narrative Body */}
            <div className="p-6 sm:p-8 space-y-4">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-left">
                <h4 className="font-bold text-[#5EEAD4] mb-1">Presiding supreme Deity:</h4>
                <p className="text-white/90">{activeExploreTemple.deity}</p>
              </div>

              <div className="space-y-2 text-left">
                <h4 className="font-serif text-base font-bold text-[#FFB347]">Holy Pilgrimage Narrative & History:</h4>
                <p className="text-white/80 leading-relaxed font-sans">
                  The holy shrine stands as a cornerstone of spiritual resonance built across centuries of devotion. Celebrated by legendary sages, it continues to echo ancient Vedic mantras, inviting pilgrims to find profound inner silence.
                </p>
                <p className="text-white/80 leading-relaxed font-sans">
                  Our remote co-ordinators have authenticated all physical offerings and pujaris inside this specific sanctum to allow high-integrity virtual devotion.
                </p>
              </div>

              {/* Travel and Rituals timings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10 text-left">
                <div>
                  <h5 className="font-bold text-[#5EEAD4]">Aarti Timings:</h5>
                  <p className="text-white/70 font-sans">{activeExploreTemple.timings}</p>
                </div>
                <div>
                  <h5 className="font-bold text-[#5EEAD4]">Authorized rituals:</h5>
                  <p className="text-white/70 font-sans italic">{activeExploreTemple.rituals.join(", ")}</p>
                </div>
              </div>

              {/* Action */}
              <div className="pt-6 flex justify-end space-x-3">
                <button
                  id="modal-explore-book-btn"
                  onClick={() => {
                    setWizardDefaults({ pujaName: `${activeExploreTemple.deity} Temple Sankalpa (${activeExploreTemple.name})`, price: 751 });
                    setActiveExploreTemple(null);
                    setIsBookNowOpen(true);
                  }}
                  className="bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-black py-3 px-6 rounded-xl text-xs tracking-widest uppercase shadow-[0_0_15px_rgba(255,179,71,0.35)]"
                >
                  BOOK RITES NOW
                </button>
                <button
                  id="modal-explore-close-btn"
                  onClick={() => setActiveExploreTemple(null)}
                  className="border border-white/10 hover:bg-white/5 text-white/70 py-3 px-5 rounded-xl text-xs"
                >
                  Close History
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 8. CAR BASKET SIDE-OVER TRAY */}
      {isCartOpen && (
        <div id="cart-slideover-portal" className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-end animate-fadeIn">
          <div className="w-full max-w-md bg-[#092320] border-l border-white/10 h-full shadow-2xl flex flex-col justify-between p-6 animate-slideLeft text-xs text-white text-left">
            
            {/* Header */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center space-x-2">
                  <ShoppingBasket className="w-5.5 h-5.5 text-[#5EEAD4]" />
                  <h3 className="font-serif text-lg font-bold text-white">Your Basket</h3>
                </div>
                <button
                  id="close-cart-slideover"
                  onClick={() => setIsCartOpen(false)}
                  className="p-1 rounded-full text-white/50 hover:bg-white/10 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Cart List */}
              <div className="space-y-4 pt-6 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
                {cart.length > 0 ? (
                  cart.map((item) => (
                     <div
                      key={item.product.id}
                      id={`cart-item-row-${item.product.id}`}
                      className="flex items-start justify-between p-3.5 bg-white/5 border border-white/10 rounded-2xl relative"
                     >
                      <div className="flex items-start space-x-3 truncate">
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="w-12 h-12 rounded-xl object-cover shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="truncate text-left">
                          <span className="block font-bold text-white truncate">{item.product.name}</span>
                          <span className="block text-[10px] text-[#FFB347] font-bold font-serif mt-0.5">₹{item.product.price} INR</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-between h-full min-h-[50px] shrink-0">
                        {/* Remove trash */}
                        <button
                          id={`cart-remove-${item.product.id}`}
                          onClick={() => handleRemoveFromCart(item.product.id)}
                          className="text-white/40 hover:text-red-400 rounded p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        {/* Increment / Decrement controls */}
                        <div className="flex items-center space-x-2 bg-white/5 border border-white/10 px-2 py-1 rounded-lg mt-2">
                          <button
                            id={`cart-qty-dec-${item.product.id}`}
                            onClick={() => handleUpdateQuantity(item.product.id, -1)}
                            className="font-black text-white/60 p-0.5 text-xs hover:text-[#5EEAD4]"
                          >
                            -
                          </button>
                          <span className="font-bold text-white font-mono text-xs">{item.quantity}</span>
                          <button
                            id={`cart-qty-inc-${item.product.id}`}
                            onClick={() => handleUpdateQuantity(item.product.id, 1)}
                            className="font-black text-white/60 p-0.5 text-xs hover:text-[#5EEAD4]"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-white/50 text-center py-12 italic">Your sacred basket is currently empty. Fill it with purified Prasad & accessories from the Temple Bazaar.</p>
                )}
              </div>
            </div>

            {/* Cart Footer Checkout Actions */}
            <div className="pt-6 border-t border-white/10 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-white/50 uppercase tracking-widest font-mono text-xs">Basket sum:</span>
                <span className="text-lg font-black font-serif text-[#FFB347]">
                  ₹{cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0)} INR
                </span>
              </div>

              <div className="text-[10px] text-white/70 bg-[#021816]/60 p-3 rounded-2xl border border-white/10 text-left">
                ⭐ Consecrated Prasad is lovingly hand-packed inside biological protective tubes and wrapped alongside holy threads and divine bindi powder.
              </div>

              <button
                id="cart-checkout-btn"
                disabled={cart.length === 0}
                onClick={handleCartGPayCheckout}
                className="w-full bg-[#1A73E8] hover:bg-[#1557B0] disabled:bg-white/5 disabled:text-white/20 text-white font-extrabold py-4 rounded-xl text-xs tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(26,115,232,0.4)] flex items-center justify-center space-x-2 border border-[#1A73E8]"
              >
                <span>PAY VIA UPI NOW</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Real UPI Payment Popup for Temple Bazaar cart checkout */}
      {isCartPaymentOpen && (
        <UpiPaymentPopup
          amount={cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0)}
          note="Temple Bazaar Order"
          payeeLabel="Order Items"
          payeeValue={`${cart.length} item(s)`}
          onConfirm={finalizeCartCheckout}
          onClose={() => setIsCartPaymentOpen(false)}
        />
      )}

    </div>
  );
}
