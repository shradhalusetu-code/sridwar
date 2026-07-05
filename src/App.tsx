/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import TempleExperience from "./components/TempleExperience";
import SevaExperience from "./components/SevaExperience";
import DevoteeExperiences from "./components/DevoteeExperiences";
import OnlinePuja from "./components/OnlinePuja";
import PriestSection from "./components/PriestSection";
import TemplateBazaar from "./components/TemplateBazaar";
import AboutUs from "./components/AboutUs";
import FounderStory from "./components/FounderStory";
import ContactUs from "./components/ContactUs";
import AuthDashboard from "./components/AuthDashboard";
import AIAssistant from "./components/AIAssistant";
import BookNowWizard from "./components/BookNowWizard";
import SriDwarLogo from "./components/SriDwarLogo";
import FAQs from "./components/FAQs";
import SacredResources from "./components/SacredResources";
import HolisticWellness from "./components/HolisticWellness";
import TempleRegister from "./components/TempleRegister";
import UPIPaymentModal from "./components/UPIPaymentModal";
import OfferPopup from "./components/OfferPopup";
import sridwarQR from "./assets/images/SridwarQR.jpg";
import { hasBackHandlers, invokeTopBackHandler } from "./utils/backHandlerStack";

import { Language, TRANSLATIONS } from "./data/translations";
import { Product, Temple, CartItem } from "./types";
import { getDiscountedPrice, isDiscountActive, DISCOUNT_TAG } from "./utils/discount";
import {
  gaPageView, gaBookNowOpen, gaBookingComplete, gaCartCheckout, gaCartPurchase,
  gaSevaSelect, gaAddToCart, gaNavClick, gaSocialClick, gaWhatsAppClick,
  gaLegalDocOpen, gaTempleExplore,
} from "./utils/analytics";
import {
  ChevronRight, Heart, ShoppingBasket, Trash2, Calendar, ShieldAlert, Check, RefreshCw, X,
  Linkedin, Instagram, Youtube, Twitter, Facebook, MessageCircle, Mail, MapPin
} from "lucide-react";

export default function App() {
  // True only inside the Android APK — main.tsx adds this class via Capacitor detection.
  // On localhost or GitHub Pages this is always false, so the bottom nav stays hidden.
  const isAndroidApp = typeof document !== "undefined" && document.body.classList.contains("capacitor-android");

  const [currentLanguage, setCurrentLanguage] = useState<Language>("en");
  const [currentPage, setCurrentPage] = useState<string>("home");

  // Owns the Navbar's mobile hamburger drawer open/closed state here (rather
  // than inside Navbar itself) so that OTHER navigation surfaces — like the
  // Android app's bottom tab bar below — can also close the drawer when the
  // devotee taps a tab, even if they're already on that page.
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Cart, Booking wizards
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCartPaymentOpen, setIsCartPaymentOpen] = useState(false);
  const [isBookNowOpen, setIsBookNowOpen] = useState(false);
  const [isSevaModalOpen, setIsSevaModalOpen] = useState(false);

  // "Setu Yatra Challenge" promo popup — bump the version suffix below
  // (v1 -> v2) any time you launch a NEW campaign and want it to show again
  // to devotees who already dismissed a previous one.
  const OFFER_POPUP_STORAGE_KEY = "sd_offer_popup_dismissed_v1";
  const [isOfferPopupOpen, setIsOfferPopupOpen] = useState(false);
  
  // Custom states for wizard pass
  const [wizardDefaults, setWizardDefaults] = useState({ pujaName: "", price: 1100 });
  const [sevaDefaults, setSevaDefaults] = useState({ name: "", price: 501 });

  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState({ name: "", email: "" });
  const [bookedItems, setBookedItems] = useState<Array<{ pujaName: string; price: number; refId: string; date: string }>>([]);

  // Active Selected Temple Modal details for full page reviews
  const [activeExploreTemple, setActiveExploreTemple] = useState<Temple | null>(null);

  // Deep-link target when navigating to the Priests page from elsewhere (e.g. Online Puja)
  const [priestDeepLinkId, setPriestDeepLinkId] = useState<string | null>(null);

  // Inline legal document reader — null = closed
  const [activeLegalDoc, setActiveLegalDoc] = useState<null | "privacy" | "cookie" | "terms" | "refund" | "legal" | "disclaimer" | "grievance" | "community" | "content_ip" | "donation" | "partner">(null);

  const t = TRANSLATIONS[currentLanguage];

  // ── Browser/Android back-button control ──────────────────────────────
  // Strategy: main.tsx already pushed one sentinel history entry before
  // React mounted. Our popstate handler ALWAYS re-pushes a sentinel at
  // the very start, THEN decides what to do. This means:
  //   - From any internal page or open form → go Home (or close the form).
  //   - From the Home page with nothing open → do NOT retrap; let the
  //     browser navigate back naturally (exit to the previous external page).
  // The refs let the popstate handler read the latest React state without
  // stale-closure issues (the handler is registered once with []).
  const currentPageRef = useRef("home");
  currentPageRef.current = currentPage;
  const isCartOpenRef          = useRef(false);  isCartOpenRef.current          = isCartOpen;
  const isCartPaymentOpenRef   = useRef(false);  isCartPaymentOpenRef.current   = isCartPaymentOpen;
  const isBookNowOpenRef       = useRef(false);  isBookNowOpenRef.current       = isBookNowOpen;
  const isSevaModalOpenRef     = useRef(false);  isSevaModalOpenRef.current     = isSevaModalOpen;
  const isOfferPopupOpenRef    = useRef(false);  isOfferPopupOpenRef.current    = isOfferPopupOpen;
  const activeExploreTempleRef = useRef<Temple | null>(null);             activeExploreTempleRef.current = activeExploreTemple;
  const activeLegalDocRef      = useRef<typeof activeLegalDoc>(null);    activeLegalDocRef.current      = activeLegalDoc;

  const retrap = () => {
    if (typeof window !== "undefined" && window.history) {
      window.history.pushState({ sdTrap: true }, "", window.location.pathname + window.location.search);
    }
  };

  const handleNavigate = (page: string) => {
    window.scrollTo({ top: 0, behavior: "instant" });
    setCurrentPage(page);
    gaPageView(`/${page}`, page.charAt(0).toUpperCase() + page.slice(1));
  };

  // Track page view on initial load.
  // (The sentinel history entry was already pushed synchronously in main.tsx.)
  useEffect(() => {
    gaPageView("/home", "Home");
  }, []);

  // Popstate listener — registered once; uses refs for current state.
  useEffect(() => {
    const onPopState = () => {
      const onInternalPage = currentPageRef.current !== "home";
      const hasOverlay = (
        isBookNowOpenRef.current ||
        isCartPaymentOpenRef.current ||
        isCartOpenRef.current ||
        isSevaModalOpenRef.current ||
        !!activeExploreTempleRef.current ||
        !!activeLegalDocRef.current ||
        isOfferPopupOpenRef.current
      );

      // Local multi-step flows/modals (e.g. the Darshan Certificate modal in
      // Hero, or the Devotee/Dharmic-Expert/Temple registration flows in
      // TempleRegister) manage their own state and register themselves here
      // rather than lifting state into App. Treat a registered handler the
      // same as any other tracked overlay.
      const hasLocalOverlay = hasBackHandlers();

      // Let the user exit the site normally when they're on Home with nothing open.
      if (!onInternalPage && !hasOverlay && !hasLocalOverlay) return;

      // Otherwise always re-push the sentinel FIRST so the next Back is also caught.
      retrap();

      // Close the most-recently-opened local flow/modal first, if any.
      if (hasLocalOverlay)                 { invokeTopBackHandler();         return; }

      // Close the topmost open overlay/wizard/form (most-recently-opened first).
      if (isBookNowOpenRef.current)        { setIsBookNowOpen(false);        return; }
      if (isCartPaymentOpenRef.current)    { setIsCartPaymentOpen(false);    return; }
      if (isCartOpenRef.current)           { setIsCartOpen(false);           return; }
      if (isSevaModalOpenRef.current)      { setIsSevaModalOpen(false);      return; }
      if (activeExploreTempleRef.current)  { setActiveExploreTemple(null);   return; }
      if (activeLegalDocRef.current)       { setActiveLegalDoc(null);        return; }
      if (isOfferPopupOpenRef.current) {
        localStorage.setItem(OFFER_POPUP_STORAGE_KEY, "1");
        setIsOfferPopupOpen(false);
        return;
      }

      // No overlay — must be on an internal page; go Home.
      window.scrollTo({ top: 0, behavior: "instant" });
      setCurrentPage("home");
      gaPageView("/home", "Home");
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

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

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("page") === "temple-register") {
      setCurrentPage("temple-register");
    }
  }, []);

  // "Setu Yatra Challenge" popup is triggered by the hero CTA button.
  // No auto-show timer — keeps the experience non-intrusive for devotees.

  const handleCloseOfferPopup = () => {
    localStorage.setItem(OFFER_POPUP_STORAGE_KEY, "1");
    setIsOfferPopupOpen(false);
  };
    // Handle Android back button (mirrors the web Back-button trap above:
    // close any open form/modal first, then go Home, then exit the app)
  useEffect(() => {
    const setupBackButton = async () => {
      const { App: CapApp } = await import('@capacitor/app');
      const handler = await CapApp.addListener('backButton', () => {
        if (isBookNowOpenRef.current) { setIsBookNowOpen(false); return; }
        if (isCartPaymentOpenRef.current) { setIsCartPaymentOpen(false); return; }
        if (isCartOpenRef.current) { setIsCartOpen(false); return; }
        if (isSevaModalOpenRef.current) { setIsSevaModalOpen(false); return; }
        if (activeExploreTempleRef.current) { setActiveExploreTemple(null); return; }
        if (activeLegalDocRef.current) { setActiveLegalDoc(null); return; }
        if (isOfferPopupOpenRef.current) {
          localStorage.setItem(OFFER_POPUP_STORAGE_KEY, "1");
          setIsOfferPopupOpen(false);
          return;
        }
        if (currentPage !== 'home') {
          setCurrentPage('home');
        } else {
          CapApp.exitApp();
        }
      });
      return handler;
    };

    let handler: any;
    setupBackButton().then(h => { handler = h; });
    return () => { if (handler) handler.remove(); };
  }, [currentPage]);

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
    gaAddToCart(product.name, getDiscountedPrice(product.price), product.id);
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
    const total = cart.reduce((acc, item) => acc + getDiscountedPrice(item.product.price) * item.quantity, 0);
    gaCartCheckout(total, cart.length);
    setIsCartPaymentOpen(true);
  };

  // Called after the devotee taps "I Have Paid" in the UPI popup.
  const finalizeCartCheckout = async () => {
    const cartSummaryStr = cart.map(item => `${item.product.name} (x${item.quantity})`).join(", ");
    const totalAmount = cart.reduce((acc, item) => acc + getDiscountedPrice(item.product.price) * item.quantity, 0);

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

    gaCartPurchase(totalAmount, refId);

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
    <div className="flex flex-col min-h-full bg-[#021816] text-white font-sans" style={{overflowX: 'hidden', touchAction: 'pan-y'}}>
      
      {/* 1. STICKY HEADER NAVIGATION */}
      <Navbar
        currentLanguage={currentLanguage}
        onLanguageChange={setCurrentLanguage}
        currentPage={currentPage}
        onNavigate={handleNavigate}
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
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* 2. DYNAMIC PAGES VIEW */}
      <main className={`flex-grow ${isAndroidApp ? "pt-0" : "pt-16"}`}>
        {currentPage === "home" && (
          <div className="space-y-0">
            {/* Cinematic Entrance */}
            <Hero
              currentLanguage={currentLanguage}
              isAndroidApp={isAndroidApp}
              onNavigate={handleNavigate}
              onOpenSetuYatra={() => setIsOfferPopupOpen(true)}
            />
            
            {/* Spotlight and lists */}
            <TempleRegister
              onNavigate={handleNavigate}
              onOpenBookNow={() => {
                setWizardDefaults({ pujaName: "Sarvajanik Veda Shanti Puja", price: 550 });
                setIsBookNowOpen(true);
              }}
            />
            <TempleExperience
              onBookPuja={(templeName, deity) => {
                setWizardDefaults({ pujaName: `${deity} Sankalpa offering (${templeName})`, price: 751 });
                setIsBookNowOpen(true);
              }}
              onExploreTemple={(temple) => {
                gaTempleExplore(temple.name);
                setActiveExploreTemple(temple);
              }}
              onNavigate={handleNavigate}
            />

            <DevoteeExperiences />
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
                setWizardDefaults({ pujaName, price });
                setIsBookNowOpen(true);
              }}
              onViewPriestProfile={(priestId) => {
                setPriestDeepLinkId(priestId);
                handleNavigate("priests");
              }}
            />
            <HolisticWellness
              onBookService={(serviceName, price) => {
                setWizardDefaults({ pujaName: serviceName, price });
                setIsBookNowOpen(true);
              }}
            />
          </div>
        )}

        {currentPage === "priests" && (
          <div className="animate-fadeIn">
            <PriestSection
              initialPriestId={priestDeepLinkId}
              onBack={() => {
                setPriestDeepLinkId(null);
                handleNavigate("puja");
              }}
            />
          </div>
        )}


        {currentPage === "products" && (
          <div className="animate-fadeIn">
            <TemplateBazaar onNavigate={handleNavigate} />
          </div>
        )}

        {currentPage === "about" && (
          <div className="animate-fadeIn">
            <AboutUs onNavigate={handleNavigate} />
            <SacredResources />
          </div>
        )}

        {currentPage === "founder-story" && (
          <div className="animate-fadeIn">
            <FounderStory
              onBack={() => handleNavigate("about")}
              defaultLanguage={currentLanguage === "hi" || currentLanguage === "or" ? currentLanguage : "en"}
            />
          </div>
        )}

        {currentPage === "contact" && (
          <div className="animate-fadeIn">
            <ContactUs />
            <FAQs />
          </div>
        )}

        {currentPage === "temple-register" && (
          <div className="animate-fadeIn">
            <TempleRegister standaloneTempleReg onNavigate={handleNavigate} />
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
      <footer id="corporate-footer" className="bg-[#021816] text-white pt-10 pb-6 border-t border-white/10 text-left relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── Row 1: Brand + Links ───────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">

            {/* Logo / brand block */}
            <div className="space-y-4">
              <h4 className="invisible font-serif text-sm font-bold mb-4 uppercase tracking-wider" aria-hidden="true">Sri Dwar</h4>
              <SriDwarLogo variant="colored" iconSize="xl" showTagline={true} className="" />
              <p className="text-xs text-white/60 font-sans leading-relaxed">
                An AI-powered faith-tech platform built on Sri Dwar's proprietary technology, bridging holy distances with time-honoured rituals, live aartis, and trusted certifications.
              </p>
            </div>
            <div>
              <h4 className="font-serif text-sm font-bold text-[#FFB347] mb-4 uppercase tracking-wider">Quick Devotions</h4>
              <ul className="space-y-2 text-xs text-white/60 font-medium">
                <li><button onClick={() => handleNavigate("home")} className="hover:text-white transition-colors">Home Portal</button></li>
                <li><button onClick={() => handleNavigate("seva")} className="hover:text-white transition-colors">Seva Hub</button></li>
                <li><button onClick={() => handleNavigate("puja")} className="hover:text-white transition-colors">Online Puja</button></li>
                <li><button onClick={() => handleNavigate("products")} className="hover:text-white transition-colors">Temple Bazaar</button></li>
                <li><button onClick={() => handleNavigate("about")} className="hover:text-white transition-colors">Our Divine Mission</button></li>
                <li><button onClick={() => handleNavigate("contact")} className="hover:text-white transition-colors">Devotee Care</button></li>
                <li><button onClick={() => handleNavigate("login")} className="hover:text-white transition-colors">My Dharmic ID</button></li>
                <li>
                  <button
                    onClick={() => {
                      handleNavigate("home");
                      setTimeout(() => {
                        document.getElementById("temple-experience-section")?.scrollIntoView({ behavior: "instant" });
                      }, 150);
                    }}
                    className="hover:text-white transition-colors"
                  >
                    Explore Shrines
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      handleNavigate("home");
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent("sd-open-darshan-register"));
                      }, 150);
                    }}
                    className="hover:text-white transition-colors"
                  >
                    Darshan Certificate
                  </button>
                </li>
                <li><button onClick={() => handleNavigate("products")} className="hover:text-white transition-colors">Receive Prasad</button></li>
                <li><button onClick={() => handleNavigate("contact")} className="hover:text-white transition-colors">Investors &amp; Career</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-serif text-sm font-bold text-[#FFB347] mb-4 uppercase tracking-wider">Legal & Compliance</h4>
              <ul className="space-y-2 text-xs text-white/60">
                <li className="font-bold text-white">Shradhalu Private Ltd</li>
                <li className="font-mono text-[10px] text-[#FFB347]">CIN: U62099OD2026PTC054237</li>
                <li>Secured Payments: Sri Dwar UPI/Payment Gateway</li>
                <li>Database: Sri Dwar secured records</li>
                <li className="flex items-start space-x-2 text-[11px] text-white/55 leading-relaxed pt-1">
                  <MapPin className="w-3.5 h-3.5 text-[#5EEAD4] shrink-0 mt-0.5" />
                  <span>Ground Floor, Sobra, Maa Biraja Khetra, Jajpur, Odisha, 755019</span>
                </li>
                <li className="pt-2 text-[10px] text-white/40 leading-relaxed italic border-t border-white/5 mt-2">
                  Disclaimer: All temple names, deity portraits, rituals, trademarks, and associated media shown are intellectual property rights reserved under respective temple trusts & the company.
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-serif text-sm font-bold text-[#FFB347] mb-4 uppercase tracking-wider">Social Linkages</h4>

              <div className="flex flex-wrap gap-2.5">
                <a
                  href="https://www.linkedin.com/company/sri-dwar"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  title="LinkedIn"
                  onClick={() => gaSocialClick("linkedin")}
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
                  onClick={() => gaSocialClick("instagram")}
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
                  onClick={() => gaSocialClick("youtube")}
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
                  onClick={() => gaSocialClick("twitter_x")}
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
                  onClick={() => gaSocialClick("facebook")}
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
                  onClick={() => gaWhatsAppClick("footer")}
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-[#5EEAD4] hover:border-[#5EEAD4]/40 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
                <a
                  href="https://mail.google.com/mail/?view=cm&to=puja@sridwar.com&su=Sri%20Dwar%20Inquiry"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Email Us"
                  title="Email: puja@sridwar.com"
                  onClick={() => gaSocialClick("email")}
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-[#5EEAD4] hover:border-[#5EEAD4]/40 transition-all"
                >
                  <Mail className="w-4 h-4" />
                </a>
              </div>

              {/* Sri Dwar QR code — scan to connect on the go */}
              <div className="mt-5">
                <img
                  src={sridwarQR}
                  alt="Sri Dwar QR code — scan to connect"
                  loading="lazy"
                  decoding="async"
                  width={112}
                  height={112}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl border border-white/10 bg-white p-1 object-contain"
                />
              </div>
            </div>

          </div>
          <div className="mb-8 bg-[#051F1A] border border-white/8 rounded-3xl p-5 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">

              <div className="space-y-2 text-left lg:pr-6">
                <p className="text-[10px] font-mono font-bold text-white/30 uppercase tracking-widest">
                  Government of India Initiatives
                </p>
                <p className="text-[11px] text-white/55 leading-relaxed">
                  Sri Dwar has applied for recognition under <strong className="text-white/75">Startup India</strong>, <strong className="text-white/75">DPIIT</strong>, <strong className="text-white/75">GeM</strong>, and <strong className="text-white/75">Digital India</strong>. Applications are currently <strong className="text-[#FFB347]">pending approval</strong>.
                </p>
              </div>
              <div className="space-y-3 text-left lg:border-l lg:border-white/8 lg:pl-6">
                <div className="flex items-center space-x-2">
                  <span className="text-base">📱</span>
                  <span className="text-[10px] font-mono font-bold text-[#5EEAD4]/80 uppercase tracking-widest">Sri Dwar Mobile App — Coming Soon</span>
                </div>
                <p className="text-[10px] text-white/50 leading-relaxed">
                  Live darshans, one-tap puja booking, daily prayers, and personalised guidance — on Android and iOS.
                </p>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center space-x-2 bg-[#0A1A18] border border-white/10 rounded-xl px-3 py-2 min-w-[130px] cursor-not-allowed opacity-80">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-[#1A1A2E]">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                        <path d="M3.18 1.44A1 1 0 0 0 2 2.43v19.14a1 1 0 0 0 1.55.83l17-9.57a1 1 0 0 0 0-1.66L3.55 1.6a1 1 0 0 0-.37-.16z" fill="#00D26A"/>
                        <path d="M2 21.57V2.43L13.06 12 2 21.57z" fill="#00B0FF" fillOpacity="0.7"/>
                        <path d="M3.18 1.44l9.88 10.56L20.18 12 3.55 1.6a1 1 0 0 0-.37-.16z" fill="#FFD400" fillOpacity="0.9"/>
                        <path d="M3.18 22.56l9.88-10.56 7.12.44L3.55 22.4a1 1 0 0 1-.37.16z" fill="#FF3D00" fillOpacity="0.9"/>
                      </svg>
                    </div>
                    <div>
                      <span className="block text-[7px] text-white/40 uppercase tracking-widest font-mono">Coming Soon</span>
                      <span className="block text-[11px] font-bold text-white">Google Play</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 bg-[#0A1A18] border border-white/10 rounded-xl px-3 py-2 min-w-[130px] cursor-not-allowed opacity-80">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-[#1C1C1E]">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                      </svg>
                    </div>
                    <div>
                      <span className="block text-[7px] text-white/40 uppercase tracking-widest font-mono">Coming Soon</span>
                      <span className="block text-[11px] font-bold text-white">App Store</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
          <div className="pt-6 border-t border-white/8 mb-4">
            <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2">
              {(
                [
                  { label: "Privacy Policy",           key: "privacy"    },
                  { label: "Cookie Policy",             key: "cookie"     },
                  { label: "Terms of Use",              key: "terms"      },
                  { label: "Refund Policy",             key: "refund"     },
                  { label: "Legal Compliance",          key: "legal"      },
                  { label: "Legal Disclaimer",          key: "disclaimer" },
                  { label: "Grievance Redressal",       key: "grievance"  },
                  { label: "Community Guidelines",      key: "community"  },
                  { label: "Content & IP Policy",       key: "content_ip" },
                  { label: "Donation & Charity Policy", key: "donation"   },
                  { label: "Partner Agreement",         key: "partner"    },
                ] as { label: string; key: "privacy" | "cookie" | "terms" | "refund" | "legal" | "disclaimer" | "grievance" | "community" | "content_ip" | "donation" | "partner" }[]
              ).map(({ label, key }, i, arr) => (
                <span key={key} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => { gaLegalDocOpen(key); setActiveLegalDoc(key); }}
                    className="text-[11px] text-white/45 hover:text-[#5EEAD4] transition-colors underline underline-offset-2 decoration-white/15 hover:decoration-[#5EEAD4] cursor-pointer bg-transparent border-none p-0"
                  >
                    {label}
                  </button>
                  {i < arr.length - 1 && <span className="mx-2 text-white/20 text-[10px] select-none">·</span>}
                </span>
              ))}
            </div>
          </div>
          <div className="pt-4 border-t border-white/5 text-center flex flex-col sm:flex-row justify-between items-center text-[10px] text-white/40 font-mono gap-2">
            <p>{t.copyright}</p>
            <p>Sri Dwar © {new Date().getFullYear()} · All Blessings Secured 🙏</p>
          </div>

        </div>
      </footer>
      {isAndroidApp && <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#021816',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', justifyContent: 'space-around',
        padding: '8px 0 20px',
        zIndex: 100
      }}>
        {[
          { id:'home', icon:'🏛️', label:'Home' },
          { id:'puja', icon:'🪔', label:'Puja' },
          { id:'seva', icon:'🤲', label:'Seva' },
          { id:'products', icon:'🛍️', label:'Shop' },
          { id:'login', icon:'👤', label:'Profile' },
        ].map(tab => (
          <button key={tab.id} onClick={() => {
            // Always close the hamburger drawer first — otherwise it stays
            // open on top of the newly navigated-to page.
            setIsMobileMenuOpen(false);
            setCurrentPage(tab.id);
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
            style={{
              color: currentPage === tab.id ? '#FFB347' : 'rgba(255,255,255,0.5)',
              background: 'none', border: 'none', fontSize: '10px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              cursor: 'pointer', padding: '4px 8px'
            }}>
            <span style={{fontSize:'22px'}}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>}
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
        <div id="seva-quick-modal" className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4 animate-fadeIn text-left"
          style={{ touchAction: "pan-y" }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsSevaModalOpen(false); }}
        >
          <div className="bg-[#092320] border border-white/15 w-full sm:rounded-3xl sm:max-w-lg shadow-2xl animate-slideUp text-white flex flex-col"
            style={{ maxHeight: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="shrink-0 bg-[#021816] text-white px-5 py-4 flex items-center justify-between border-b border-white/10 sm:rounded-t-3xl">
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

            <div className="flex-1 min-h-0 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 32px)" }}>
            <div className="p-5 space-y-4">
              <span className="block text-xs font-bold text-white/85 text-left">Choose a quick Charity Offering:</span>
              
              <div className="space-y-2.5">
                {[
                  { name: "Annadanam (Feed visiting sadhus)", price: 752, symbol: "🍚" },
                  { name: "Gau Seva (Feed organic fodder)", price: 377, symbol: "🐄" },
                  { name: "Akhanda Diya (Lit clay gold lamp)", price: 227, symbol: "🪔" },
                  { name: "Sanskrit Gurukul School book kit", price: 1502, symbol: "📚" }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    id={`quick-seva-btn-${idx}`}
                    onClick={() => {
                      gaSevaSelect(item.name, getDiscountedPrice(item.price));
                      setWizardDefaults({ pujaName: `Sponsorship donation: ${item.name}`, price: getDiscountedPrice(item.price) });
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
                    <div className="text-right">
                      {isDiscountActive() && (
                        <span className="block text-[9px] text-white/35 line-through font-mono">₹{item.price}</span>
                      )}
                      <span className="text-xs font-black font-serif text-[#FFB347]">₹{getDiscountedPrice(item.price)}</span>
                    </div>
                  </button>
                ))}
              </div>

              <p className="text-[9px] text-[#5EEAD4] font-mono text-center pt-2">
                All donations are written securely under Shradhalu Private Limited records.
              </p>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. RE-USABLE TEMPLE EXPLORE / ARCHITECTURE HISTORY MODAL */}
      {activeExploreTemple && (
        <div id="temple-explore-modal" className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4 animate-fadeIn text-left text-xs text-white"
          style={{ touchAction: "pan-y" }}
          onClick={(e) => { if (e.target === e.currentTarget) setActiveExploreTemple(null); }}
        >
          <div className="bg-[#092320] border border-white/15 w-full sm:rounded-3xl sm:max-w-2xl shadow-2xl animate-slideUp text-white flex flex-col"
            style={{ maxHeight: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Header Image — shrink-0 so it never scrolls away */}
            <div className="relative aspect-video bg-gray-900 border-b border-white/10 shrink-0">
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
            <div className="flex-1 min-h-0 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 32px)" }}>
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
                  Our remote co-ordinators have confirmed all physical offerings and pujaris inside this specific sanctum to allow high-integrity virtual devotion.
                </p>
              </div>
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
        </div>
      )}

      {/* 8. CAR BASKET SIDE-OVER TRAY */}
      {isCartOpen && (
        <div id="cart-slideover-portal" className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex justify-end animate-fadeIn">
          <div className="w-full max-w-md bg-[#092320] border-l border-white/10 h-full shadow-2xl flex flex-col animate-slideLeft text-xs text-white text-left">
            
            {/* Header — shrink-0 so it never scrolls away */}
            <div className="shrink-0 flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10">
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

            {/* Scrollable body — THE ONLY scroll container */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 pr-5" style={{ WebkitOverflowScrolling: "touch" }}>
              <div className="space-y-4 pt-6 pb-2">
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
                          {isDiscountActive() ? (
                            <span className="flex items-center space-x-1.5 mt-0.5">
                              <span className="text-[9px] text-white/35 line-through font-mono">₹{item.product.price}</span>
                              <span className="text-[10px] text-[#FFB347] font-bold font-serif">₹{getDiscountedPrice(item.product.price)} INR</span>
                            </span>
                          ) : (
                            <span className="block text-[10px] text-[#FFB347] font-bold font-serif mt-0.5">₹{item.product.price} INR</span>
                          )}
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

            <div
              className="shrink-0 px-6 pt-6 border-t border-white/10 space-y-4"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
            >
              <div className="flex justify-between items-center text-sm">
                <div>
                  <span className="font-bold text-white/50 uppercase tracking-widest font-mono text-xs">Basket sum:</span>
                  {isDiscountActive() && (
                    <span className="block text-[9px] font-mono text-[#FFB347]">🎉 {DISCOUNT_TAG}</span>
                  )}
                </div>
                <div className="text-right">
                  {isDiscountActive() && (
                    <span className="block text-[10px] text-white/35 line-through font-mono">
                      ₹{cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0)} INR
                    </span>
                  )}
                  <span className="text-lg font-black font-serif text-[#FFB347]">
                    ₹{cart.reduce((acc, item) => acc + getDiscountedPrice(item.product.price) * item.quantity, 0)} INR
                  </span>
                </div>
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

      {/* UPI Payment Modal for Temple Bazaar cart checkout */}
      <UPIPaymentModal
        isOpen={isCartPaymentOpen}
        onClose={() => setIsCartPaymentOpen(false)}
        onPaymentConfirmed={finalizeCartCheckout}
        amount={cart.reduce((acc, item) => acc + getDiscountedPrice(item.product.price) * item.quantity, 0)}
        bookingName="Temple Bazaar Order"
        devoteeName={userProfile.name || "Devotee"}
        refId={`CART-${Date.now()}`}
        payeeLabel="Order Items"
        payeeValue={`${cart.length} item(s)`}
      />

      {/* "Setu Yatra Challenge" promo popup */}
      <OfferPopup
        isOpen={isOfferPopupOpen}
        onClose={handleCloseOfferPopup}
        onNavigate={handleNavigate}
        storageKey={OFFER_POPUP_STORAGE_KEY}
      />

      {/* ═══════════════════════════════════════════════════════════════════════
          INLINE LEGAL DOCUMENT READER
          Opens when a user clicks Privacy Policy / Legal Compliance /
          Terms of Use / Refund Policy in the footer.
          No external navigation — full document text rendered inside the page.
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeLegalDoc && (() => {
        // ── tiny section helper ──────────────────────────────────────────────
        const DocSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
          <div className="space-y-2 pb-5 border-b border-white/8 last:border-0 last:pb-0">
            <h4 className="text-sm font-bold text-[#FFB347] font-serif">{title}</h4>
            <div className="text-[13px] text-white/72 leading-relaxed">{children}</div>
          </div>
        );

        // ── document content map ─────────────────────────────────────────────
        const DOCS: Record<string, { icon: string; title: string; content: React.ReactNode }> = {
          privacy: {
            icon: "🔒",
            title: "Privacy Policy",
            content: (
              <>
                <p className="text-[13px] text-white/60 italic leading-relaxed mb-4">This Privacy Policy ("Policy") explains how Shradhalu Private Limited, operating under the brand Sri Dwar ("Sri Dwar," "Company," "we," "our," or "us"), collects, uses, stores, shares, and protects your personal information when you access or use our website, mobile applications, APIs, customer support channels, social media pages, or any services offered by Sri Dwar (collectively, the "Platform").</p>
                <p className="text-[13px] text-white/60 italic leading-relaxed mb-4">By accessing or using the Platform, you acknowledge that you have read and understood this Privacy Policy and consent to the processing of your personal data as described herein, subject to applicable law.</p>
                <DocSection title="1. Scope">
                  <p className="mb-2 last:mb-0">This Policy applies to all users, including visitors, registered users, devotees, donors, customers, temples, priests, trusts, partners, vendors, and any other persons interacting with the Platform.</p>
                  <p className="mb-2 last:mb-0">This Policy should be read together with our Terms & Conditions, Legal Disclaimer, Refund & Cancellation Policy, and other applicable policies.</p>
                </DocSection>
                <DocSection title="2. Information We Collect">
                  <p className="mb-2 last:mb-0">We may collect the following categories of information:</p>
                  <p className="font-semibold text-white/85 mt-3 mb-1">Personal Information</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>Full name</li>
                    <li>Email address</li>
                    <li>Mobile number</li>
                    <li>Postal address</li>
                    <li>City, State, Country</li>
                    <li>Date of birth (where required)</li>
                    <li>Government identification details where legally necessary</li>
                    <li>Organization or trust details</li>
                  </ul>
                  <p className="font-semibold text-white/85 mt-3 mb-1">Booking Information</p>
                  <p className="mb-2 last:mb-0">To facilitate religious services, we may collect:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>Devotee names</li>
                    <li>Family member names</li>
                    <li>Gotra</li>
                    <li>Nakshatra</li>
                    <li>Sankalp details</li>
                    <li>Puja preferences</li>
                    <li>Occasion details</li>
                    <li>Temple preferences</li>
                    <li>Delivery addresses</li>
                    <li>Booking history</li>
                  </ul>
                  <p className="mb-2 last:mb-0">These details are collected solely for providing the requested religious service.</p>
                  <p className="font-semibold text-white/85 mt-3 mb-1">Payment Information</p>
                  <p className="mb-2 last:mb-0">We may collect:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>Transaction IDs</li>
                    <li>Payment references</li>
                    <li>Payment status</li>
                    <li>Billing information</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Sri Dwar does not store complete debit card, credit card, UPI PIN, CVV, or net banking credentials. Payments are processed by authorized payment service providers.</p>
                  <p className="font-semibold text-white/85 mt-3 mb-1">Technical Information</p>
                  <p className="mb-2 last:mb-0">We may automatically collect:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>IP address</li>
                    <li>Browser type</li>
                    <li>Device information</li>
                    <li>Operating system</li>
                    <li>Language settings</li>
                    <li>Time zone</li>
                    <li>Cookies</li>
                    <li>Device identifiers</li>
                    <li>Log files</li>
                    <li>Usage analytics</li>
                  </ul>
                </DocSection>
                <DocSection title="3. How We Use Your Information">
                  <p className="mb-2 last:mb-0">We use your information to:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>Provide requested services</li>
                    <li>Process bookings</li>
                    <li>Coordinate with temples and priests</li>
                    <li>Arrange donations</li>
                    <li>Deliver Prasad</li>
                    <li>Provide livestream links</li>
                    <li>Process payments</li>
                    <li>Respond to customer support requests</li>
                    <li>Improve our Platform</li>
                    <li>Prevent fraud</li>
                    <li>Comply with legal obligations</li>
                    <li>Send booking confirmations</li>
                    <li>Send transactional updates</li>
                    <li>Improve AI-assisted services</li>
                    <li>Conduct analytics</li>
                    <li>Protect the security of our Platform</li>
                  </ul>
                  <p className="mb-2 last:mb-0">We do not sell your personal information.</p>
                </DocSection>
                <DocSection title="4. Sharing of Information">
                  <p className="mb-2 last:mb-0">We may share only the minimum information reasonably necessary with:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>Temples</li>
                    <li>Priests</li>
                    <li>Temple trusts</li>
                    <li>Gaushalas</li>
                    <li>Charitable organizations</li>
                    <li>Logistics partners</li>
                    <li>Payment gateways</li>
                    <li>Cloud hosting providers</li>
                    <li>Technology vendors</li>
                    <li>Customer support providers</li>
                    <li>Government authorities where legally required</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Courts or law enforcement agencies pursuant to lawful requests</p>
                  <p className="mb-2 last:mb-0">For example, your name, Gotra, Nakshatra, and Sankalp details may be shared with the assigned priest solely for performing the requested ritual.</p>
                  <p className="mb-2 last:mb-0">We do not authorize third parties to use your personal information for purposes unrelated to the services requested unless required by law or with your consent.</p>
                </DocSection>
                <DocSection title="5. Cookies and Similar Technologies">
                  <p className="mb-2 last:mb-0">We use cookies and similar technologies to:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>remember user preferences</li>
                    <li>improve website functionality</li>
                    <li>analyse traffic</li>
                    <li>understand user behaviour</li>
                    <li>enhance security</li>
                    <li>measure marketing effectiveness</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Most browsers allow users to disable cookies; however, certain Platform features may not function properly if cookies are disabled.</p>
                </DocSection>
                <DocSection title="6. Communications">
                  <p className="mb-2 last:mb-0">By using Sri Dwar, you consent to receive communications through:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>Email</li>
                    <li>SMS</li>
                    <li>WhatsApp</li>
                    <li>Push notifications</li>
                    <li>Telephone calls (where permitted)</li>
                    <li>In-app messages</li>
                  </ul>
                  <p className="mb-2 last:mb-0">These communications may include:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>Booking confirmations</li>
                    <li>Payment confirmations</li>
                    <li>Temple updates</li>
                    <li>Livestream links</li>
                    <li>Customer support</li>
                    <li>Security alerts</li>
                    <li>Policy updates</li>
                    <li>Promotional messages, where permitted by law</li>
                  </ul>
                  <p className="mb-2 last:mb-0">You may opt out of promotional communications at any time. Transactional communications relating to your bookings or account may continue.</p>
                </DocSection>
                <DocSection title="7. AI-Assisted Services">
                  <p className="mb-2 last:mb-0">Sri Dwar may use Artificial Intelligence to provide customer support, recommendations, translations, search assistance, educational information, and service improvements.</p>
                  <p className="mb-2 last:mb-0">AI-generated responses are provided for informational purposes and may not always be accurate or complete.</p>
                  <p className="mb-2 last:mb-0">Users should independently verify important information before relying upon it.</p>
                </DocSection>
                <DocSection title="8. Data Security">
                  <p className="mb-2 last:mb-0">Sri Dwar implements commercially reasonable administrative, organizational, technical, and physical safeguards designed to protect personal information against unauthorized access, disclosure, alteration, misuse, or destruction.</p>
                  <p className="mb-2 last:mb-0">Despite reasonable security measures, no internet transmission or electronic storage system can be guaranteed to be completely secure.</p>
                  <p className="mb-2 last:mb-0">Users are responsible for maintaining the confidentiality of their account credentials.</p>
                </DocSection>
                <DocSection title="9. Data Retention">
                  <p className="mb-2 last:mb-0">We retain personal information only for as long as reasonably necessary to:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>provide requested services</li>
                    <li>comply with legal obligations</li>
                    <li>resolve disputes</li>
                    <li>prevent fraud</li>
                    <li>maintain business records</li>
                    <li>enforce our agreements</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Data may be securely deleted, anonymized, or archived after it is no longer required, subject to applicable law.</p>
                </DocSection>
                <DocSection title="10. Children's Privacy">
                  <p className="mb-2 last:mb-0">The Platform is not intended for children acting independently.</p>
                  <p className="mb-2 last:mb-0">Where services are booked on behalf of minors, the booking must be made by a parent, legal guardian, or other authorized adult.</p>
                  <p className="mb-2 last:mb-0">If we become aware that personal information has been collected from a child in violation of applicable law, we will take reasonable steps to delete such information.</p>
                </DocSection>
                <DocSection title="11. Third-Party Websites">
                  <p className="mb-2 last:mb-0">The Platform may contain links to third-party websites, temples, payment providers, social media platforms, or partner services.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar does not control their privacy practices and is not responsible for their content, security, or policies.</p>
                  <p className="mb-2 last:mb-0">Users should review the privacy policies of such third parties before sharing information.</p>
                </DocSection>
                <DocSection title="12. Your Rights">
                  <p className="mb-2 last:mb-0">Subject to applicable law, including the Digital Personal Data Protection Act, 2023, you may have the right to:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>access your personal information</li>
                    <li>request correction of inaccurate information</li>
                    <li>request deletion of information where legally permissible</li>
                    <li>withdraw consent where processing is based upon consent</li>
                    <li>request information regarding processing activities</li>
                    <li>lodge grievances regarding your personal data</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Certain requests may be declined where retention is required by law, regulatory obligations, fraud prevention, dispute resolution, or legitimate business purposes.</p>
                </DocSection>
                <DocSection title="13. International Users">
                  <p className="mb-2 last:mb-0">If Sri Dwar expands internationally, personal information may be processed or stored in jurisdictions other than the user's country, subject to applicable legal safeguards.</p>
                  <p className="mb-2 last:mb-0">By using the Platform, users consent to such transfers where permitted by law.</p>
                </DocSection>
                <DocSection title="14. Legal Compliance">
                  <p className="mb-2 last:mb-0">We may disclose personal information where reasonably necessary to:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>comply with applicable law</li>
                    <li>respond to lawful governmental requests</li>
                    <li>enforce our agreements</li>
                    <li>protect our rights</li>
                    <li>investigate fraud</li>
                    <li>protect users or the public</li>
                    <li>comply with court orders</li>
                  </ul>
                </DocSection>
                <DocSection title="15. Changes to this Policy">
                  <p className="mb-2 last:mb-0">Sri Dwar may update this Privacy Policy from time to time to reflect legal, operational, technological, or business changes.</p>
                  <p className="mb-2 last:mb-0">The updated version will be published on the Platform with the revised "Last Updated" date.</p>
                  <p className="mb-2 last:mb-0">Continued use of the Platform after such publication constitutes acceptance of the updated Policy.</p>
                </DocSection>
                <DocSection title="16. Contact and Grievance Redressal">
                  <p className="mb-2 last:mb-0">Questions, requests, or grievances relating to this Privacy Policy or your personal information may be submitted through the official contact details published on the Sri Dwar Platform.</p>
                  <p className="mb-2 last:mb-0">Where required by applicable law, Sri Dwar shall designate and publish the contact details of its Grievance Officer or Data Protection Contact.</p>
                  <p className="mb-2 last:mb-0">We will make reasonable efforts to acknowledge and address privacy-related requests within the timelines prescribed by applicable law.</p>
                  <p className="mb-2 last:mb-0">For privacy-related queries: puja@sridwar.com · WhatsApp: +91 97776 45062</p>
                </DocSection>
                <DocSection title="17. Consent">
                  <p className="mb-2 last:mb-0">By accessing or using Sri Dwar, creating an account, making a booking, making a donation, submitting information, communicating with us, or otherwise using our services, you acknowledge that you have read, understood, and agreed to this Privacy Policy.</p>
                  <p className="mb-2 last:mb-0">Where consent is required under applicable law, you consent to the collection, use, storage, processing, and sharing of your personal information as described in this Policy.</p>
                  <p className="mb-2 last:mb-0">Nothing in this Privacy Policy limits any rights that cannot legally be waived under applicable law.</p>
                </DocSection>
              </>
            ),
          },
          cookie: {
            icon: "🍪",
            title: "Cookie Policy",
            content: (
              <>
                <p className="text-[13px] text-white/60 italic leading-relaxed mb-4">This Cookie Policy explains how Shradhalu Private Limited, operating as Sri Dwar, uses cookies and similar technologies on our website, mobile applications, and digital platforms.</p>
                <DocSection title="1. What Are Cookies?">
                  <p className="mb-2 last:mb-0">Cookies are small text files stored on your device when you visit our Platform. They help improve website functionality, remember preferences, analyze usage, and enhance security.</p>
                </DocSection>
                <DocSection title="2. Types of Cookies We Use">
                  <p className="font-semibold text-white/85 mt-3 mb-1">Essential Cookies</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>User authentication</li>
                    <li>Security</li>
                    <li>Session management</li>
                    <li>Shopping cart and booking functionality</li>
                  </ul>
                  <p className="mb-2 last:mb-0">These are necessary for the Platform to operate.</p>
                  <p className="mb-2 last:mb-0">Performance & Analytics Cookies
These help us understand:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>Visitor traffic</li>
                    <li>Popular pages</li>
                    <li>Device types</li>
                    <li>Website performance</li>
                    <li>Error reports</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Preference Cookies
These remember:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>Language</li>
                    <li>Region</li>
                    <li>User settings</li>
                    <li>Accessibility preferences</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Marketing Cookies
Where permitted by law, we may use cookies to:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>Measure advertising performance</li>
                    <li>Personalize promotions</li>
                    <li>Prevent repetitive advertisements</li>
                  </ul>
                </DocSection>
                <DocSection title="3. Third-Party Cookies">
                  <p className="mb-2 last:mb-0">Some cookies may be placed by trusted third-party providers including payment gateways, analytics providers, cloud hosting services, customer support tools, embedded video providers, or social media integrations.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar does not control third-party cookie policies.</p>
                </DocSection>
                <DocSection title="4. Managing Cookies">
                  <p className="mb-2 last:mb-0">Most web browsers allow you to:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>View cookies</li>
                    <li>Delete cookies</li>
                    <li>Block cookies</li>
                    <li>Restrict third-party cookies</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Disabling cookies may affect certain Platform features.</p>
                </DocSection>
                <DocSection title="5. Changes">
                  <p className="mb-2 last:mb-0">Sri Dwar may update this Cookie Policy periodically. Continued use of the Platform constitutes acceptance of the latest version.</p>
                </DocSection>
                <DocSection title="6. Contact">
                  <p className="mb-2 last:mb-0">Questions regarding cookies may be submitted through the official contact details published on the Sri Dwar Platform.</p>
                </DocSection>
              </>
            ),
          },
          terms: {
            icon: "📋",
            title: "Terms of Use",
            content: (
              <>
                <p className="text-[13px] text-white/60 italic leading-relaxed mb-4">These Terms and Conditions ("Terms") constitute a legally binding agreement between Shradhalu Private Limited, a company incorporated under the provisions of the Companies Act, 2013, having its registered office in India, operating under the brand name Sri Dwar ("Sri Dwar", "Shradhalu", "Company", "Platform", "we", "our", or "us"), and every individual, organization, institution, temple, priest, trust, partner, donor, visitor, customer, subscriber, volunteer, or other entity ("User", "you", or "your") accessing or using any service provided through our website, mobile applications, APIs, communication channels, social media platforms, partner platforms, or any other digital or physical medium operated by or on behalf of Sri Dwar.</p>
                <p className="text-[13px] text-white/60 italic leading-relaxed mb-4">These Terms govern your access to and use of all products, services, features, content, bookings, communications, transactions, donations, digital offerings, and interactions made available by Sri Dwar.</p>
                <p className="text-[13px] text-white/60 italic leading-relaxed mb-4">By accessing, browsing, registering, placing a booking, making a donation, subscribing to communications, or otherwise using any part of the Platform, you acknowledge that you have carefully read, understood, and agreed to be legally bound by these Terms, together with our Privacy Policy, Refund & Cancellation Policy, Legal Disclaimer, Cookie Policy (if applicable), and any additional policies or guidelines published by Sri Dwar from time to time.</p>
                <p className="text-[13px] text-white/60 italic leading-relaxed mb-4">If you do not agree to these Terms, you must immediately discontinue use of the Platform.</p>
                <DocSection title="1. DEFINITIONS">
                  <p className="mb-2 last:mb-0">For the purposes of these Terms, unless the context otherwise requires, the following expressions shall have the meanings assigned below.</p>
                  <p className="mb-2 last:mb-0">"Platform" means all websites, mobile applications, APIs, portals, software, communication channels, digital products, social media accounts, and other services owned, licensed, operated, or managed by Shradhalu Private Limited under the brand name Sri Dwar.</p>
                  <p className="mb-2 last:mb-0">"Sri Dwar" means the religious technology platform operated by Shradhalu Private Limited.</p>
                  <p className="mb-2 last:mb-0">"Company" means Shradhalu Private Limited.</p>
                  <p className="mb-2 last:mb-0">"User" includes every visitor, registered member, devotee, donor, customer, organization, representative, institution, temple, priest, trust, volunteer, or other person accessing the Platform.</p>
                  <p className="mb-2 last:mb-0">"Temple" means any religious institution, shrine, monastery, mutt, dham, jyotirlinga, shakti peetha, gaushala, trust, charitable institution, or spiritual place listed on or associated with the Platform.</p>
                  <p className="mb-2 last:mb-0">"Priest", "Pandit", "Purohit", "Archaka", "Astrologer", "Spiritual Guide", or similar expressions refer to independent individuals offering religious or spiritual services through or in connection with the Platform.</p>
                  <p className="mb-2 last:mb-0">"Partner" includes temples, trusts, priests, charitable organizations, NGOs, logistics providers, vendors, photographers, livestream providers, event coordinators, travel operators, accommodation providers, payment service providers, technology vendors, and any other third-party service provider associated with the Platform.</p>
                  <p className="mb-2 last:mb-0">"Services" include, without limitation:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>Pujas</li>
                    <li>Homas</li>
                    <li>Abhisheks</li>
                    <li>Temple rituals</li>
                    <li>Religious ceremonies</li>
                    <li>Donations</li>
                    <li>Annadanam</li>
                    <li>Gaushala seva</li>
                    <li>Live darshan</li>
                    <li>Livestream services</li>
                    <li>Temple bookings</li>
                    <li>VIP darshan arrangements</li>
                    <li>Prasad services</li>
                    <li>Astrology consultations</li>
                    <li>Spiritual consultations</li>
                    <li>Pilgrimage assistance</li>
                    <li>Religious events</li>
                    <li>Charitable initiatives</li>
                    <li>Religious education</li>
                    <li>Digital offerings</li>
                    <li>Memberships</li>
                    <li>Subscriptions</li>
                    <li>AI-powered informational services</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Future products and services introduced by Sri Dwar.</p>
                  <p className="mb-2 last:mb-0">Words importing the singular shall include the plural and vice versa.</p>
                  <p className="mb-2 last:mb-0">Headings are inserted for convenience only and shall not affect interpretation.</p>
                </DocSection>
                <DocSection title="2. ACCEPTANCE OF TERMS">
                  <p className="mb-2 last:mb-0">By using the Platform, you expressly represent and warrant that:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>you have read these Terms in their entirety</li>
                    <li>you agree to be legally bound by them</li>
                    <li>you possess the legal capacity to enter into a binding agreement</li>
                    <li>all information submitted by you is true, accurate, and complete</li>
                  </ul>
                  <p className="mb-2 last:mb-0">you shall comply with all applicable laws while using the Platform.</p>
                  <p className="mb-2 last:mb-0">If you are accessing the Platform on behalf of an organization, temple, company, trust, family, or other legal entity, you represent that you possess the authority to bind such entity to these Terms.</p>
                </DocSection>
                <DocSection title="3. ELIGIBILITY">
                  <p className="mb-2 last:mb-0">The Platform is intended only for persons legally competent to enter into binding contracts under applicable law.</p>
                  <p className="mb-2 last:mb-0">By using the Platform, you represent that:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>you are at least eighteen (18) years of age or otherwise legally competent under applicable law</li>
                    <li>your use does not violate any law applicable to you</li>
                  </ul>
                  <p className="mb-2 last:mb-0">you are not prohibited from entering into contracts under any applicable legislation.</p>
                  <p className="mb-2 last:mb-0">If you are using the Platform on behalf of a minor, you warrant that you are the lawful parent or legal guardian and accept full responsibility for all activities carried out on behalf of such minor.</p>
                </DocSection>
                <DocSection title="4. NATURE OF THE PLATFORM">
                  <p className="mb-2 last:mb-0">Sri Dwar is primarily a technology-enabled platform designed to facilitate the discovery, coordination, booking, communication, and management of religious, spiritual, charitable, devotional, cultural, and associated services.</p>
                  <p className="mb-2 last:mb-0">Except where expressly stated otherwise in writing, Sri Dwar does not own, control, manage, administer, supervise, or operate temples, religious institutions, trusts, gaushalas, pilgrimage destinations, or the religious ceremonies performed thereat.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar's role may include facilitating communication, technology infrastructure, payment processing, customer support, scheduling assistance, documentation, livestream coordination, logistics coordination, and related administrative functions.</p>
                  <p className="mb-2 last:mb-0">The Platform may also directly provide certain digital services, educational content, technological solutions, software, memberships, subscriptions, customer support, and other services under its own brand.</p>
                </DocSection>
                <DocSection title="5. INDEPENDENT STATUS OF TEMPLES, PRIESTS AND PARTNERS">
                  <p className="mb-2 last:mb-0">Unless expressly agreed through a separate written contract executed by Shradhalu Private Limited, every temple, priest, astrologer, trust, volunteer, logistics provider, photographer, accommodation provider, travel operator, gaushala, charitable institution, event organizer, consultant, or other service provider listed on the Platform acts as an independent entity.</p>
                  <p className="mb-2 last:mb-0">Nothing contained in these Terms shall be construed as creating any relationship of employer and employee, principal and agent, partnership, joint venture, franchise, fiduciary relationship, or similar legal relationship between Sri Dwar and such independent persons or organizations.</p>
                  <p className="mb-2 last:mb-0">The inclusion of any temple, priest, trust, or service provider on the Platform shall not constitute an endorsement, certification, guarantee, employment, agency, or representation that such person or institution is affiliated with or controlled by Sri Dwar.</p>
                  <p className="mb-2 last:mb-0">Users acknowledge that religious institutions function according to their own customs, traditions, internal governance, local regulations, and administrative decisions. Sri Dwar neither directs nor controls the manner in which independent religious services are performed.</p>
                </DocSection>
                <DocSection title="6. SOURCE OF INFORMATION">
                  <p className="mb-2 last:mb-0">Information displayed on the Platform relating to temples, priests, rituals, customs, timings, donations, availability, accommodations, local traditions, photographs, schedules, festivals, services, and related matters may be obtained from one or more of the following sources:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>temple authorities</li>
                    <li>priests</li>
                    <li>trustees</li>
                    <li>local coordinators</li>
                    <li>volunteers</li>
                    <li>charitable organizations</li>
                    <li>independent contributors</li>
                    <li>government publications</li>
                    <li>publicly available information</li>
                    <li>historical records</li>
                    <li>tourism authorities</li>
                    <li>users</li>
                    <li>community representatives</li>
                    <li>other third-party sources reasonably believed to be reliable</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Although Sri Dwar endeavors to present accurate and updated information, it does not warrant that such information is complete, current, error-free, continuously available, or suitable for any particular purpose. Religious institutions frequently revise schedules, rituals, access rules, donation practices, and operational procedures without prior notice.</p>
                  <p className="mb-2 last:mb-0">Users are encouraged to independently verify information where it is material to their decision-making.</p>
                </DocSection>
                <DocSection title="7. MODIFICATION OF TERMS">
                  <p className="mb-2 last:mb-0">Sri Dwar reserves the right, at its sole discretion and to the extent permitted by applicable law, to amend, revise, replace, or update these Terms at any time to reflect changes in law, business operations, technology, security practices, services, or regulatory requirements.</p>
                  <p className="mb-2 last:mb-0">The revised Terms shall become effective upon publication on the Platform unless a later effective date is expressly specified.</p>
                  <p className="mb-2 last:mb-0">Continued access to or use of the Platform following such publication shall constitute acceptance of the revised Terms.</p>
                  <p className="mb-2 last:mb-0">If you do not agree to any modification, your sole remedy is to discontinue use of the Platform.</p>
                </DocSection>
                <DocSection title="8. USER ACCOUNTS">
                  <p className="mb-2 last:mb-0">Certain features of the Platform may require you to create an account.</p>
                  <p className="mb-2 last:mb-0">When creating an account, you agree to provide complete, accurate, current, and truthful information and to promptly update such information whenever necessary.</p>
                  <p className="mb-2 last:mb-0">You are solely responsible for:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>maintaining the confidentiality of your login credentials</li>
                    <li>restricting unauthorized access to your account</li>
                    <li>all activities conducted through your account</li>
                    <li>ensuring that your contact information remains current</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Sri Dwar shall not be liable for any loss arising from your failure to safeguard your account credentials.</p>
                  <p className="mb-2 last:mb-0">You shall immediately notify Sri Dwar if you become aware of any unauthorized use, suspected compromise, or security breach relating to your account.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar reserves the right, at its sole discretion, to suspend, restrict, verify, or terminate any account where it reasonably believes that:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>false information has been provided</li>
                    <li>fraudulent activity has occurred</li>
                    <li>applicable law has been violated</li>
                    <li>these Terms have been breached</li>
                  </ul>
                  <p className="mb-2 last:mb-0">continued access may expose the Platform, users, partners, or the public to legal, operational, financial, or security risks.</p>
                </DocSection>
                <DocSection title="9. USER VERIFICATION">
                  <p className="mb-2 last:mb-0">Sri Dwar may, but shall not be obligated to, verify the identity of users, partners, temples, priests, donors, or organizations using reasonable methods deemed appropriate by the Company.</p>
                  <p className="mb-2 last:mb-0">Verification may include requesting:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>Government-issued identity documents</li>
                    <li>Address proof</li>
                    <li>Mobile verification</li>
                    <li>Email verification</li>
                    <li>Payment verification</li>
                    <li>Organizational documentation</li>
                    <li>Trust registration certificates</li>
                    <li>GST details</li>
                    <li>PAN</li>
                    <li>Aadhaar (where legally permissible)</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Other documentation reasonably required.</p>
                  <p className="mb-2 last:mb-0">Failure to provide requested information may result in refusal of service, delayed processing, suspension, cancellation, or permanent termination of access.</p>
                  <p className="mb-2 last:mb-0">Verification conducted by Sri Dwar shall not constitute a representation, certification, guarantee, endorsement, warranty, or legal confirmation regarding the identity, qualifications, integrity, conduct, competence, financial status, religious authority, or future behavior of any person or organization.</p>
                </DocSection>
                <DocSection title="10. BOOKINGS">
                  <p className="mb-2 last:mb-0">Sri Dwar facilitates requests for religious and associated services.</p>
                  <p className="mb-2 last:mb-0">Submission of a booking request does not constitute acceptance.</p>
                  <p className="mb-2 last:mb-0">A booking shall be deemed confirmed only after:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>successful verification</li>
                    <li>availability confirmation</li>
                    <li>payment confirmation where applicable</li>
                    <li>acceptance by the relevant service provider, where required</li>
                    <li>issuance of a booking confirmation by Sri Dwar</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Sri Dwar reserves the right to reject, decline, postpone, modify, reschedule, or cancel any booking where reasonably necessary due to:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>temple restrictions</li>
                    <li>priest availability</li>
                    <li>local administrative decisions</li>
                    <li>weather</li>
                    <li>force majeure</li>
                    <li>security concerns</li>
                    <li>incomplete information</li>
                    <li>payment issues</li>
                    <li>suspected fraud</li>
                    <li>legal requirements</li>
                    <li>operational constraints</li>
                    <li>or any other reasonable cause</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Users acknowledge that religious ceremonies often depend upon circumstances beyond the control of Sri Dwar.</p>
                </DocSection>
                <DocSection title="11. DYNAMIC PRICING">
                  <p className="mb-2 last:mb-0">Prices displayed on the Platform are generally indicative unless expressly stated to be final.</p>
                  <p className="mb-2 last:mb-0">Prices are not fixed by Sri Dwar and may change before confirmation.</p>
                  <p className="mb-2 last:mb-0">Pricing may increase or decrease due to numerous factors including, without limitation:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>festival dem</li>
                    <li>auspicious dates</li>
                    <li>temple crowd</li>
                    <li>VIP movement</li>
                    <li>local customs</li>
                    <li>seasonal dem</li>
                    <li>priest availability</li>
                    <li>temple administration decisions</li>
                    <li>trust policies</li>
                    <li>government regulations</li>
                    <li>transportation expenses</li>
                    <li>accommodation costs</li>
                    <li>logistics</li>
                    <li>inflation</li>
                    <li>market prices of flowers, fruits, puja materials, milk, ghee, honey, cloth, and ritual items</li>
                    <li>taxation</li>
                    <li>regional conditions</li>
                    <li>weather</li>
                    <li>natural calamities</li>
                    <li>emergency situations</li>
                    <li>public holidays</li>
                    <li>local strikes</li>
                    <li>security restrictions</li>
                    <li>any other operational factors beyond reasonable control</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Sri Dwar shall not be liable for any increase or decrease in pricing before booking confirmation.</p>
                  <p className="mb-2 last:mb-0">Final pricing shall be communicated prior to confirmation wherever reasonably practicable.</p>
                </DocSection>
                <DocSection title="12. PAYMENTS">
                  <p className="mb-2 last:mb-0">Payments made through the Platform shall be processed using payment gateways or banking channels selected by Sri Dwar.</p>
                  <p className="mb-2 last:mb-0">By making a payment, you authorize Sri Dwar and its payment partners to process the transaction.</p>
                  <p className="mb-2 last:mb-0">Users represent that they are legally authorized to use the selected payment instrument.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar does not store complete payment card information except as permitted by applicable law and payment industry standards.</p>
                  <p className="mb-2 last:mb-0">Processing failures, banking delays, payment gateway outages, network interruptions, or third-party technical issues may delay confirmation of bookings.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar shall not be responsible for delays attributable to banks, payment aggregators, financial institutions, card networks, UPI providers, internet service providers, or governmental payment infrastructure.</p>
                  <p className="mb-2 last:mb-0">Applicable taxes, convenience fees, payment gateway charges, platform fees, service charges, and statutory levies may be charged separately where applicable.</p>
                </DocSection>
                <DocSection title="13. DONATIONS">
                  <p className="mb-2 last:mb-0">The Platform may facilitate voluntary donations to temples, trusts, gaushalas, charitable institutions, annadanam programs, educational initiatives, social causes, disaster relief, and similar activities.</p>
                  <p className="mb-2 last:mb-0">Unless expressly stated otherwise, Sri Dwar acts solely as a facilitating platform for such donations.</p>
                  <p className="mb-2 last:mb-0">Donation requests may be processed through:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>registered charitable organizations</li>
                    <li>temple trusts</li>
                    <li>gaushalas</li>
                    <li>NGOs</li>
                    <li>local partners</li>
                    <li>authorized institutions</li>
                    <li>or other eligible recipients</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Sri Dwar does not guarantee tax deductions, exemptions, charitable status, or governmental recognition unless specifically stated in writing.</p>
                  <p className="mb-2 last:mb-0">Once transferred to the designated recipient, donations may become irreversible subject to applicable law and the Refund & Cancellation Policy.</p>
                  <p className="mb-2 last:mb-0">Users are responsible for ensuring the accuracy of donation details before submission.</p>
                </DocSection>
                <DocSection title="14. PUJAS, RITUALS AND RELIGIOUS SERVICES">
                  <p className="mb-2 last:mb-0">Sri Dwar facilitates access to religious ceremonies including but not limited to:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>Abhishekam</li>
                    <li>Rudrabhishekam</li>
                    <li>Archana</li>
                    <li>Homa</li>
                    <li>Havan</li>
                    <li>Yagna</li>
                    <li>Sankalp</li>
                    <li>Pind Daan</li>
                    <li>Shraddha</li>
                    <li>Narayan Bali</li>
                    <li>Temple Sevas</li>
                    <li>Annadanam</li>
                    <li>Gaushala Seva</li>
                    <li>Prasad offerings</li>
                    <li>Festival ceremonies</li>
                    <li>Religious observances</li>
                    <li>Spiritual consultations</li>
                    <li>and similar devotional activities</li>
                  </ul>
                  <p className="mb-2 last:mb-0">The timing, sequence, duration, procedure, language, mantras, customs, samagri, priest allocation, temple arrangements, and ceremonial practices are determined by the respective temple, priest, trust, or religious authority in accordance with local customs and traditions.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar shall not interfere with established religious procedures.</p>
                  <p className="mb-2 last:mb-0">Variations in rituals between temples, regions, sampradayas, traditions, and priests shall not constitute a deficiency in service.</p>
                </DocSection>
                <DocSection title="15. RELIGIOUS BELIEFS AND SPIRITUAL OUTCOMES">
                  <p className="mb-2 last:mb-0">Religious services involve matters of personal faith and belief.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar makes no representation or warranty regarding:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>divine blessings</li>
                    <li>fulfilment of wishes</li>
                    <li>removal of obstacles</li>
                    <li>astrological accuracy</li>
                    <li>spiritual transformation</li>
                    <li>healing</li>
                    <li>prosperity</li>
                    <li>success</li>
                    <li>marriage</li>
                    <li>childbirth</li>
                    <li>employment</li>
                    <li>financial improvement</li>
                    <li>health</li>
                    <li>peace of mind</li>
                    <li>karma</li>
                    <li>liberation</li>
                    <li>miracles</li>
                    <li>any metaphysical or supernatural outcome</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Religious experiences are subjective and vary between individuals.</p>
                  <p className="mb-2 last:mb-0">No statement published on the Platform shall be construed as a guarantee of any spiritual, religious, emotional, financial, medical, or personal result.</p>
                </DocSection>
                <DocSection title="16. LIVESTREAMS, PHOTOGRAPHS AND DIGITAL CONTENT">
                  <p className="mb-2 last:mb-0">Where available, Sri Dwar may facilitate livestreams, photographs, videos, digital certificates, completion reports, acknowledgements, recordings, or other digital content relating to booked services.</p>
                  <p className="mb-2 last:mb-0">Availability depends upon:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>temple permissions</li>
                    <li>local regulations</li>
                    <li>priest availability</li>
                    <li>internet connectivity</li>
                    <li>mobile network coverage</li>
                    <li>electricity</li>
                    <li>weather</li>
                    <li>security restrictions</li>
                    <li>equipment functionality</li>
                    <li>local infrastructure</li>
                    <li>operational feasibility</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Sri Dwar does not guarantee uninterrupted livestreams, specific camera angles, audio quality, video quality, recording duration, image clarity, or continuous availability.</p>
                  <p className="mb-2 last:mb-0">Temporary interruptions, delays, incomplete recordings, technical failures, or inability to provide digital content shall not constitute a breach of these Terms where caused by circumstances beyond Sri Dwar's reasonable control.</p>
                </DocSection>
                <DocSection title="17. PRASAD, OFFERINGS AND PHYSICAL DELIVERIES">
                  <p className="mb-2 last:mb-0">Where available, Sri Dwar may facilitate the collection, packaging, dispatch, or delivery of Prasad, sacred items, temple offerings, holy water, Vibhuti, Kumkum, Rudraksha, Tulsi, Yantras, religious literature, photographs, certificates, or other devotional materials.</p>
                  <p className="mb-2 last:mb-0">Users acknowledge and agree that:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>availability depends upon the respective temple or service provider</li>
                    <li>packaging may vary from temple to temple</li>
                    <li>quantity and appearance may differ due to temple practices</li>
                    <li>certain items may be substituted where necessary</li>
                    <li>delivery timelines are estimates only</li>
                    <li>courier services are performed by independent logistics providers</li>
                  </ul>
                  <p className="mb-2 last:mb-0">delays caused by weather, customs, festivals, transport disruptions, strikes, governmental restrictions, or courier partners are beyond Sri Dwar's reasonable control.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar shall not be responsible for deterioration of perishable offerings occurring during transit despite reasonable handling.</p>
                  <p className="mb-2 last:mb-0">Users are responsible for providing complete and accurate delivery details.</p>
                  <p className="mb-2 last:mb-0">Undelivered shipments resulting from incorrect addresses, unavailable recipients, refusal to accept delivery, customs restrictions, or failed delivery attempts may not qualify for replacement or refund except where required by applicable law.</p>
                </DocSection>
                <DocSection title="18. PILGRIMAGE, TRAVEL AND ACCOMMODATION SERVICES">
                  <p className="mb-2 last:mb-0">The Platform may facilitate pilgrimage assistance, travel planning, accommodation reservations, transportation arrangements, guided visits, darshan coordination, VIP access requests, local assistance, or related services.</p>
                  <p className="mb-2 last:mb-0">Unless expressly stated otherwise, Sri Dwar does not own, operate, or control:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>hotels</li>
                    <li>guest houses</li>
                    <li>dharamshalas</li>
                    <li>transport operators</li>
                    <li>airlines</li>
                    <li>railway services</li>
                    <li>taxi providers</li>
                    <li>tour operators</li>
                    <li>guides</li>
                    <li>accommodation providers</li>
                    <li>pilgrimage authorities</li>
                  </ul>
                  <p className="mb-2 last:mb-0">All such services remain subject to the respective provider's independent terms and policies.</p>
                  <p className="mb-2 last:mb-0">Schedules, routes, room availability, vehicle allocation, permits, local restrictions, government regulations, weather conditions, and operational decisions may change without notice.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar shall not be liable for cancellations, delays, denied entry, accommodation issues, transportation failures, overbooking, or service deficiencies attributable to independent providers.</p>
                </DocSection>
                <DocSection title="19. USER RESPONSIBILITIES">
                  <p className="mb-2 last:mb-0">Every User agrees to use the Platform responsibly, lawfully, respectfully, and in accordance with these Terms.</p>
                  <p className="mb-2 last:mb-0">Users shall:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>provide truthful information</li>
                    <li>submit accurate names, gotra, nakshatra, addresses, contact details, and ritual requirements</li>
                    <li>verify booking details before confirmation</li>
                    <li>comply with temple rules</li>
                    <li>respect religious customs and traditions</li>
                    <li>maintain appropriate conduct during physical or virtual participation</li>
                    <li>refrain from abusive, offensive, defamatory, discriminatory, unlawful, or disruptive behaviour</li>
                    <li>cooperate with reasonable verification requests</li>
                    <li>comply with applicable laws</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Users remain solely responsible for decisions made based upon information available on the Platform.</p>
                </DocSection>
                <DocSection title="20. PROHIBITED ACTIVITIES">
                  <p className="mb-2 last:mb-0">Users shall not:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>impersonate another person or organization</li>
                    <li>submit false information</li>
                    <li>use stolen payment methods</li>
                    <li>engage in fraudulent transactions</li>
                    <li>interfere with Platform operations</li>
                    <li>upload malicious software</li>
                    <li>attempt unauthorized access</li>
                    <li>scrape or harvest data without authorization</li>
                    <li>copy or reproduce Platform content unlawfully</li>
                    <li>abuse customer support personnel</li>
                    <li>threaten priests, temples, partners, volunteers, or other users</li>
                    <li>use the Platform for money laundering or unlawful fundraising</li>
                    <li>violate intellectual property rights</li>
                    <li>distribute spam</li>
                    <li>publish defamatory content</li>
                    <li>promote hate speech or violence</li>
                    <li>misuse donations</li>
                    <li>circumvent booking procedures</li>
                    <li>manipulate reviews or ratings</li>
                    <li>create multiple accounts to evade restrictions</li>
                  </ul>
                  <p className="mb-2 last:mb-0">engage in activities that may harm Sri Dwar, its partners, users, or the public.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar reserves the right to suspend or permanently terminate access for violations of this Section without prior notice where reasonably necessary.</p>
                </DocSection>
                <DocSection title="21. THIRD-PARTY SERVICES">
                  <p className="mb-2 last:mb-0">The Platform may integrate or facilitate services provided by third parties including:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>payment gateways</li>
                    <li>logistics companies</li>
                    <li>communication providers</li>
                    <li>mapping services</li>
                    <li>livestream providers</li>
                    <li>cloud hosting providers</li>
                    <li>artificial intelligence providers</li>
                    <li>analytics providers</li>
                    <li>government portals</li>
                    <li>travel operators</li>
                    <li>accommodation providers</li>
                    <li>charitable institutions</li>
                    <li>temples</li>
                    <li>trusts</li>
                    <li>priests</li>
                    <li>vendors</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Sri Dwar neither controls nor guarantees the services provided by independent third parties.</p>
                  <p className="mb-2 last:mb-0">Users acknowledge that use of third-party services may be governed by separate agreements, privacy policies, and operational practices.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar shall not be liable for acts, omissions, negligence, interruptions, inaccuracies, security incidents, or contractual breaches attributable to independent third-party service providers.</p>
                </DocSection>
                <DocSection title="22. USER REVIEWS, RATINGS AND SUBMISSIONS">
                  <p className="mb-2 last:mb-0">Users may voluntarily submit reviews, ratings, testimonials, suggestions, photographs, videos, comments, feedback, or other content.</p>
                  <p className="mb-2 last:mb-0">By submitting such content, the User grants Sri Dwar a perpetual, worldwide, royalty-free, transferable, sublicensable, irrevocable, non-exclusive licence to:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>use</li>
                    <li>reproduce</li>
                    <li>publish</li>
                    <li>modify</li>
                    <li>translate</li>
                    <li>display</li>
                    <li>distribute</li>
                    <li>archive</li>
                    <li>adapt</li>
                    <li>promote</li>
                    <li>market</li>
                    <li>analyze</li>
                    <li>improve services using such content</li>
                  </ul>
                  <p className="mb-2 last:mb-0">in any media now known or developed in the future, subject to applicable law and the Privacy Policy.</p>
                  <p className="mb-2 last:mb-0">Users represent that submitted content:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>is truthful</li>
                    <li>does not infringe intellectual property rights</li>
                    <li>is not defamatory</li>
                    <li>is not misleading</li>
                    <li>does not violate any law</li>
                    <li>does not contain malicious software</li>
                    <li>is submitted with appropriate permissions</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Sri Dwar reserves the right, but not the obligation, to remove or moderate content at its sole discretion.</p>
                </DocSection>
                <DocSection title="23. INTELLECTUAL PROPERTY">
                  <p className="mb-2 last:mb-0">Unless otherwise stated, all rights, title, and interest in and to the Platform, including:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>software</li>
                    <li>source code</li>
                    <li>databases</li>
                    <li>website design</li>
                    <li>graphics</li>
                    <li>logos</li>
                    <li>trademarks</li>
                    <li>service marks</li>
                    <li>text</li>
                    <li>icons</li>
                    <li>user interface</li>
                    <li>audiovisual works</li>
                    <li>layouts</li>
                    <li>documentation</li>
                    <li>compilations</li>
                    <li>photographs</li>
                    <li>videos</li>
                    <li>AI-generated content</li>
                    <li>proprietary algorithms</li>
                    <li>business methods</li>
                    <li>branding</li>
                    <li>domain names</li>
                  </ul>
                  <p className="mb-2 last:mb-0">are owned by or licensed to Shradhalu Private Limited and are protected under applicable intellectual property laws.</p>
                  <p className="mb-2 last:mb-0">No right, title, licence, or ownership is transferred to Users except the limited right to access the Platform in accordance with these Terms.</p>
                  <p className="mb-2 last:mb-0">Unauthorized copying, reproduction, distribution, reverse engineering, republication, commercial exploitation, or derivative works are strictly prohibited without prior written consent.</p>
                </DocSection>
                <DocSection title="24. ARTIFICIAL INTELLIGENCE AND DIGITAL SERVICES">
                  <p className="mb-2 last:mb-0">Sri Dwar may provide AI-assisted recommendations, informational tools, translations, summaries, educational content, search functionality, customer support, automation, or similar digital services.</p>
                  <p className="mb-2 last:mb-0">AI-generated information is intended solely for informational and convenience purposes.</p>
                  <p className="mb-2 last:mb-0">Users acknowledge that AI-generated outputs may contain inaccuracies, omissions, outdated information, or content requiring independent verification.</p>
                  <p className="mb-2 last:mb-0">AI services shall not be interpreted as:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>legal advice</li>
                    <li>financial advice</li>
                    <li>medical advice</li>
                    <li>professional religious rulings</li>
                    <li>astrological certainty</li>
                    <li>guaranteed spiritual guidance</li>
                    <li>or official temple instructions</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Users remain solely responsible for decisions made based upon AI-generated content.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar reserves the right to improve, suspend, discontinue, or modify AI services at any time.</p>
                </DocSection>
                <DocSection title="25. ELECTRONIC COMMUNICATIONS">
                  <p className="mb-2 last:mb-0">By using the Platform, Users consent to receive communications electronically, including through:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>email</li>
                    <li>SMS</li>
                    <li>WhatsApp</li>
                    <li>push notifications</li>
                    <li>in-app messages</li>
                    <li>automated calls where legally permitted</li>
                    <li>customer support channels</li>
                    <li>social media messaging</li>
                    <li>or other digital communication methods</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Such communications may include:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>booking confirmations</li>
                    <li>payment acknowledgements</li>
                    <li>service updates</li>
                    <li>security notifications</li>
                    <li>verification requests</li>
                    <li>promotional communications (subject to applicable law)</li>
                    <li>newsletters</li>
                    <li>policy updates</li>
                    <li>legal notices</li>
                    <li>customer support responses</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Electronic communications shall satisfy any legal requirement that communications be in writing, to the extent permitted under applicable law.</p>
                  <p className="mb-2 last:mb-0">Users may opt out of promotional communications where legally required; however, transactional and legally necessary communications may continue.</p>
                </DocSection>
                <DocSection title="26. PRIVACY AND DATA PROTECTION">
                  <p className="mb-2 last:mb-0">Your privacy is important to Sri Dwar.</p>
                  <p className="mb-2 last:mb-0">The collection, processing, storage, disclosure, retention, transfer, and protection of personal information shall be governed by the Privacy Policy published by Sri Dwar, which forms an integral part of these Terms.</p>
                  <p className="mb-2 last:mb-0">By using the Platform, you consent to the collection and processing of your information in accordance with the Privacy Policy and applicable law.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar may collect information including but not limited to:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>identity information</li>
                    <li>contact details</li>
                    <li>booking information</li>
                    <li>religious service preferences</li>
                    <li>communication records</li>
                    <li>payment references</li>
                    <li>device information</li>
                    <li>location information where permitted</li>
                    <li>technical logs</li>
                    <li>cookies and similar technologies</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Users represent that any personal information provided regarding another individual has been obtained with appropriate authorization.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar implements commercially reasonable administrative, technical, and organizational safeguards to protect personal information; however, no electronic system can be guaranteed to be completely secure.</p>
                </DocSection>
                <DocSection title="27. PAYMENT DISPUTES AND CHARGEBACKS">
                  <p className="mb-2 last:mb-0">Users agree not to initiate chargebacks, payment reversals, payment disputes, or banking claims without first contacting Sri Dwar to seek resolution.</p>
                  <p className="mb-2 last:mb-0">Where a payment dispute or chargeback is initiated:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>Sri Dwar may suspend pending bookings</li>
                    <li>future bookings may be declined</li>
                    <li>access to the Platform may be temporarily or permanently restricted</li>
                  </ul>
                  <p className="mb-2 last:mb-0">supporting documentation may be provided to banks, payment gateways, law enforcement agencies, or regulatory authorities where legally permitted.</p>
                  <p className="mb-2 last:mb-0">Fraudulent chargebacks or abuse of payment dispute mechanisms may result in recovery proceedings, legal action, and reporting to competent authorities.</p>
                  <p className="mb-2 last:mb-0">Nothing contained herein limits any rights available under applicable consumer protection or banking laws.</p>
                </DocSection>
                <DocSection title="28. FRAUD PREVENTION">
                  <p className="mb-2 last:mb-0">Sri Dwar maintains zero tolerance towards fraud, identity theft, financial crime, money laundering, terrorist financing, cybercrime, phishing, impersonation, and misuse of the Platform.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar reserves the right to:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>conduct identity verification</li>
                    <li>request additional documentation</li>
                    <li>delay or suspend transactions pending review</li>
                    <li>refuse suspicious bookings</li>
                    <li>report suspicious activity to competent authorities</li>
                  </ul>
                  <p className="mb-2 last:mb-0">cooperate with banks, payment aggregators, law enforcement agencies, regulators, and courts.</p>
                  <p className="mb-2 last:mb-0">Users shall not misuse the Platform for unlawful purposes.</p>
                  <p className="mb-2 last:mb-0">Where fraudulent activity is reasonably suspected, Sri Dwar may take immediate protective action without prior notice.</p>
                </DocSection>
                <DocSection title="29. SUSPENSION AND TERMINATION">
                  <p className="mb-2 last:mb-0">Sri Dwar reserves the right, at its sole discretion and to the extent permitted by applicable law, to suspend, restrict, deactivate, or permanently terminate any account or access to the Platform where:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>these Terms are violated</li>
                    <li>fraudulent activity is suspected</li>
                    <li>inaccurate information has been provided</li>
                    <li>payment obligations remain unpaid</li>
                    <li>unlawful conduct is identified</li>
                    <li>abusive behaviour occurs</li>
                    <li>repeated complaints are received</li>
                    <li>operational, legal, regulatory, or security concerns arise</li>
                  </ul>
                  <p className="mb-2 last:mb-0">continuation of services could expose Sri Dwar, users, partners, or the public to unreasonable risk.</p>
                  <p className="mb-2 last:mb-0">Termination of access shall not affect accrued rights, outstanding obligations, completed transactions, intellectual property rights, indemnification obligations, dispute resolution provisions, or any clauses intended by their nature to survive termination.</p>
                </DocSection>
                <DocSection title="30. DISCLAIMER OF WARRANTIES">
                  <p className="mb-2 last:mb-0">To the fullest extent permitted by applicable law, the Platform and all Services are provided on an "AS IS", "AS AVAILABLE", and "WITH ALL FAULTS" basis.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar expressly disclaims all warranties and representations, whether express, implied, statutory, customary, or otherwise, including but not limited to implied warranties of:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>merchantability</li>
                    <li>satisfactory quality</li>
                    <li>fitness for a particular purpose</li>
                    <li>uninterrupted availability</li>
                    <li>accuracy</li>
                    <li>reliability</li>
                    <li>compatibility</li>
                    <li>non-infringement</li>
                    <li>security</li>
                    <li>timeliness</li>
                    <li>completeness</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Sri Dwar does not warrant that:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>the Platform will always be available</li>
                    <li>services will be uninterrupted</li>
                    <li>defects will be corrected immediately</li>
                    <li>servers will remain free from malicious code</li>
                    <li>information will always remain current</li>
                    <li>bookings will always be accepted</li>
                    <li>every temple or priest will always remain available</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Users acknowledge that religious institutions, government authorities, festivals, weather conditions, infrastructure limitations, and third-party providers may affect services.</p>
                </DocSection>
                <DocSection title="31. LIMITATION OF LIABILITY">
                  <p className="mb-2 last:mb-0">To the maximum extent permitted under applicable law, neither Shradhalu Private Limited, Sri Dwar, nor their respective:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>directors</li>
                    <li>shareholders</li>
                    <li>officers</li>
                    <li>employees</li>
                    <li>consultants</li>
                    <li>advisors</li>
                    <li>licensors</li>
                    <li>affiliates</li>
                    <li>subsidiaries</li>
                    <li>technology partners</li>
                    <li>payment partners</li>
                    <li>contractors</li>
                    <li>volunteers</li>
                    <li>representatives</li>
                    <li>successors</li>
                    <li>assigns</li>
                  </ul>
                  <p className="mb-2 last:mb-0">shall be liable for any indirect, incidental, consequential, exemplary, punitive, special, remote, economic, reputational, emotional, spiritual, or speculative damages, including but not limited to:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>loss of profits</li>
                    <li>loss of opportunity</li>
                    <li>loss of goodwill</li>
                    <li>loss of data</li>
                    <li>loss of donations</li>
                    <li>business interruption</li>
                    <li>travel losses</li>
                    <li>accommodation losses</li>
                    <li>religious dissatisfaction</li>
                    <li>emotional distress</li>
                    <li>delays</li>
                    <li>cancellations</li>
                    <li>technical failures</li>
                    <li>communication failures</li>
                    <li>temple decisions</li>
                    <li>priest decisions</li>
                    <li>third-party acts or omissions</li>
                    <li>governmental restrictions</li>
                    <li>force majeure events</li>
                    <li>user errors</li>
                  </ul>
                  <p className="mb-2 last:mb-0">or any other losses arising from the use of or inability to use the Platform.</p>
                  <p className="mb-2 last:mb-0">Where liability cannot lawfully be excluded but may be limited, Sri Dwar's aggregate liability arising from any single claim or series of related claims shall not exceed the amount of the platform service fee actually retained by Sri Dwar for the specific transaction giving rise to the claim, excluding amounts collected on behalf of independent temples, trusts, priests, logistics providers, payment gateways, governments, or other third parties, unless otherwise required by applicable law.</p>
                  <p className="mb-2 last:mb-0">Nothing contained in these Terms excludes or limits liability that cannot legally be excluded under applicable law, including liability arising from fraud, fraudulent misrepresentation, wilful misconduct, or any statutory rights that cannot be waived.</p>
                </DocSection>
                <DocSection title="32. USER ACKNOWLEDGEMENT OF THIRD-PARTY RELATIONSHIPS">
                  <p className="mb-2 last:mb-0">Users expressly acknowledge and agree that temples, priests, trusts, astrologers, gaushalas, charitable organizations, logistics providers, accommodation providers, travel operators, photographers, livestream providers, and other independent service providers listed on or accessible through the Platform generally operate independently of Sri Dwar unless expressly identified as employees or authorized representatives of Shradhalu Private Limited.</p>
                  <p className="mb-2 last:mb-0">Any agreement, understanding, instruction, representation, assurance, promise, conduct, or dispute arising directly between a User and such independent third party shall ordinarily remain the responsibility of the respective parties involved.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar shall not be deemed to supervise, direct, or control the day-to-day activities or independent professional or religious decisions of such third parties.</p>
                  <p className="mb-2 last:mb-0">Where Sri Dwar voluntarily assists in communication or dispute resolution, such assistance shall be provided as a customer support measure only and shall not create any legal assumption of responsibility for the underlying dispute.</p>
                </DocSection>
                <DocSection title="33. USER INDEMNIFICATION">
                  <p className="mb-2 last:mb-0">To the fullest extent permitted by law, Users agree to defend, indemnify, and hold harmless Shradhalu Private Limited, Sri Dwar, its directors, officers, employees, affiliates, contractors, licensors, technology partners, payment partners, successors, and assigns from and against any claims, demands, actions, proceedings, investigations, liabilities, damages, judgments, penalties, fines, costs, and expenses (including reasonable legal fees) arising out of or relating to:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>violation of these Terms</li>
                    <li>misuse of the Platform</li>
                    <li>inaccurate information submitted by the User</li>
                    <li>infringement of intellectual property rights</li>
                    <li>violation of applicable law</li>
                    <li>fraudulent conduct</li>
                    <li>disputes initiated with independent third-party service providers</li>
                    <li>content uploaded by the User</li>
                    <li>negligence or wilful misconduct of the User</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Sri Dwar reserves the right to assume exclusive control of the defence of any matter subject to indemnification, at the User's expense where permitted by law.</p>
                </DocSection>
                <DocSection title="34. FORCE MAJEURE">
                  <p className="mb-2 last:mb-0">Sri Dwar shall not be responsible for any delay, interruption, suspension, modification, cancellation, or failure to perform obligations arising from circumstances beyond its reasonable control, including but not limited to:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>acts of God</li>
                    <li>floods</li>
                    <li>earthquakes</li>
                    <li>cyclones</li>
                    <li>storms</li>
                    <li>fires</li>
                    <li>epidemics</li>
                    <li>pandemics</li>
                    <li>war</li>
                    <li>terrorism</li>
                    <li>riots</li>
                    <li>civil unrest</li>
                    <li>labour disputes</li>
                    <li>internet outages</li>
                    <li>power failures</li>
                    <li>cyberattacks</li>
                    <li>governmental actions</li>
                    <li>judicial orders</li>
                    <li>transportation disruptions</li>
                    <li>temple closures</li>
                    <li>religious restrictions</li>
                    <li>security advisories</li>
                    <li>shortages of materials</li>
                    <li>failures of third-party service providers</li>
                    <li>or any comparable unforeseen event</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Affected obligations shall remain suspended only for the duration reasonably necessary to address the force majeure event.</p>
                </DocSection>
                <DocSection title="35. DISPUTE RESOLUTION">
                  <p className="mb-2 last:mb-0">Sri Dwar encourages Users to first contact customer support to resolve concerns amicably.</p>
                  <p className="mb-2 last:mb-0">Where a dispute cannot be resolved through good-faith discussions, the parties agree to attempt mediation before initiating formal legal proceedings, where practicable and legally permissible.</p>
                  <p className="mb-2 last:mb-0">Subject to applicable law, any dispute arising out of or relating to these Terms shall, where mutually agreed or required under an applicable arbitration agreement, be referred to arbitration in accordance with the Arbitration and Conciliation Act, 1996, as amended.</p>
                  <p className="mb-2 last:mb-0">Unless otherwise required by applicable law or agreed in writing, the seat and venue of arbitration shall be the city in which the registered office of Shradhalu Private Limited is situated. Proceedings shall be conducted in the English language.</p>
                  <p className="mb-2 last:mb-0">Nothing in this clause prevents either party from seeking urgent interim or injunctive relief before a court of competent jurisdiction where necessary.</p>
                </DocSection>
                <DocSection title="36. COMPLIANCE WITH APPLICABLE LAWS">
                  <p className="mb-2 last:mb-0">Users shall comply with all applicable laws, rules, regulations, governmental orders, judicial directions, and statutory requirements while accessing or using the Platform.</p>
                  <p className="mb-2 last:mb-0">Nothing contained in these Terms shall be interpreted as authorizing any activity prohibited by applicable law.</p>
                  <p className="mb-2 last:mb-0">Users are solely responsible for ensuring that their use of the Platform is lawful in their respective jurisdiction.</p>
                  <p className="mb-2 last:mb-0">Where any local law prohibits access to particular services, the User agrees not to access or use such services.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar reserves the right to restrict or discontinue any service where required by law, judicial order, regulatory directive, or governmental instruction.</p>
                </DocSection>
                <DocSection title="37. ELECTRONIC RECORDS AND ELECTRONIC CONTRACTS">
                  <p className="mb-2 last:mb-0">The User acknowledges that these Terms constitute an electronic record and an electronic contract.</p>
                  <p className="mb-2 last:mb-0">Acceptance of these Terms by electronic means, including clicking an acceptance button, creating an account, making a booking, making a payment, or otherwise using the Platform, shall constitute valid legal acceptance under applicable law.</p>
                  <p className="mb-2 last:mb-0">Electronic communications, confirmations, invoices, booking acknowledgements, payment receipts, notices, and records maintained by Sri Dwar shall be admissible as evidence to the extent permitted under applicable law.</p>
                </DocSection>
                <DocSection title="38. INTELLECTUAL PROPERTY ENFORCEMENT">
                  <p className="mb-2 last:mb-0">Sri Dwar actively protects its intellectual property.</p>
                  <p className="mb-2 last:mb-0">Users shall not:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>register confusingly similar trademarks</li>
                    <li>register confusingly similar domain names</li>
                    <li>reproduce Sri Dwar branding</li>
                    <li>imitate Platform design</li>
                    <li>commercially exploit Platform content</li>
                    <li>misrepresent affiliation with Sri Dwar</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Sri Dwar reserves all legal and equitable remedies available under intellectual property laws.</p>
                  <p className="mb-2 last:mb-0">Unauthorized use may result in civil proceedings, criminal complaints where applicable, injunctions, monetary damages, and recovery of legal costs.</p>
                </DocSection>
                <DocSection title="39. COPYRIGHT COMPLAINTS">
                  <p className="mb-2 last:mb-0">Sri Dwar respects intellectual property rights.</p>
                  <p className="mb-2 last:mb-0">Any copyright owner or authorized representative believing that material available through the Platform infringes their lawful rights may submit a written complaint containing:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>identification of the copyrighted work</li>
                    <li>identification of the allegedly infringing material</li>
                    <li>ownership details</li>
                    <li>contact information</li>
                    <li>a statement made in good faith</li>
                    <li>a declaration regarding the accuracy of the complaint</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Sri Dwar may investigate, remove, disable access to, or otherwise act upon such complaints as considered appropriate under applicable law.</p>
                  <p className="mb-2 last:mb-0">Submission of a false complaint may attract legal consequences.</p>
                </DocSection>
                <DocSection title="40. CONFIDENTIALITY">
                  <p className="mb-2 last:mb-0">Where confidential information is shared between Sri Dwar and a User, Partner, Temple, Priest, Trust, Vendor, or Organization, each recipient agrees to use such information solely for the purpose for which it was disclosed.</p>
                  <p className="mb-2 last:mb-0">Confidential information includes, without limitation:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>pricing arrangements</li>
                    <li>business plans</li>
                    <li>commercial strategies</li>
                    <li>technical documentation</li>
                    <li>software</li>
                    <li>operational procedures</li>
                    <li>internal communications</li>
                    <li>financial information</li>
                    <li>customer data</li>
                    <li>proprietary processes</li>
                  </ul>
                  <p className="mb-2 last:mb-0">This obligation shall not apply to information that:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>is publicly available without breach</li>
                    <li>is independently developed</li>
                    <li>is lawfully obtained from another source</li>
                    <li>must be disclosed pursuant to law or court order</li>
                  </ul>
                </DocSection>
                <DocSection title="41. ASSIGNMENT">
                  <p className="mb-2 last:mb-0">Sri Dwar may assign, transfer, novate, subcontract, delegate, or otherwise deal with its rights and obligations under these Terms without prior notice where permitted by applicable law.</p>
                  <p className="mb-2 last:mb-0">Users may not assign, transfer, delegate, sublicense, or otherwise dispose of their rights or obligations without the prior written consent of Sri Dwar.</p>
                  <p className="mb-2 last:mb-0">Any attempted assignment in violation of this Section shall be void to the extent permitted by law.</p>
                </DocSection>
                <DocSection title="42. NO PARTNERSHIP OR AGENCY">
                  <p className="mb-2 last:mb-0">Nothing contained in these Terms shall create or be construed as creating:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>a partnership</li>
                    <li>joint venture</li>
                    <li>agency</li>
                    <li>employment relationship</li>
                    <li>franchise</li>
                    <li>fiduciary relationship</li>
                    <li>representative authority</li>
                  </ul>
                  <p className="mb-2 last:mb-0">between Sri Dwar and any User, Temple, Priest, Trust, Vendor, Partner, or independent service provider unless expressly created by a separate written agreement signed by authorized representatives of both parties.</p>
                  <p className="mb-2 last:mb-0">No person shall have authority to bind Sri Dwar except an authorized representative acting within delegated authority.</p>
                </DocSection>
                <DocSection title="43. WAIVER">
                  <p className="mb-2 last:mb-0">Failure or delay by Sri Dwar in exercising any right, remedy, or provision under these Terms shall not constitute a waiver.</p>
                  <p className="mb-2 last:mb-0">Any waiver shall be effective only if made expressly in writing by an authorized representative of Shradhalu Private Limited.</p>
                  <p className="mb-2 last:mb-0">A waiver of one breach shall not constitute a waiver of any subsequent or continuing breach.</p>
                </DocSection>
                <DocSection title="44. SEVERABILITY">
                  <p className="mb-2 last:mb-0">If any provision of these Terms is determined by a court or competent authority to be invalid, unlawful, unenforceable, or contrary to applicable law, such provision shall be modified or severed only to the minimum extent necessary.</p>
                  <p className="mb-2 last:mb-0">The remaining provisions shall continue in full force and effect.</p>
                  <p className="mb-2 last:mb-0">Where legally permissible, the invalid provision shall be interpreted in a manner that most closely reflects its original commercial intent.</p>
                </DocSection>
                <DocSection title="45. SURVIVAL">
                  <p className="mb-2 last:mb-0">The following provisions shall survive termination, suspension, expiration, or cessation of use of the Platform to the extent applicable:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>Intellectual Property</li>
                    <li>Confidentiality</li>
                    <li>User Content Licence</li>
                    <li>Payment Obligations</li>
                    <li>Indemnification</li>
                    <li>Limitation of Liability</li>
                    <li>Disclaimers</li>
                    <li>Dispute Resolution</li>
                    <li>Governing Law</li>
                    <li>Jurisdiction</li>
                    <li>Electronic Records</li>
                    <li>Fraud Prevention</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Any provision intended by its nature to survive.</p>
                </DocSection>
                <DocSection title="46. ENTIRE AGREEMENT">
                  <p className="mb-2 last:mb-0">These Terms, together with the Privacy Policy, Refund & Cancellation Policy, Legal Disclaimer, Cookie Policy (where applicable), Partner Agreements, and any other policies expressly incorporated by reference, constitute the entire agreement between the User and Sri Dwar concerning use of the Platform.</p>
                  <p className="mb-2 last:mb-0">They supersede all prior understandings, negotiations, communications, representations, advertisements, or agreements relating to the same subject matter, except where a separate written agreement expressly provides otherwise.</p>
                </DocSection>
                <DocSection title="47. GOVERNING LAW AND JURISDICTION">
                  <p className="mb-2 last:mb-0">These Terms shall be governed by and construed in accordance with the laws of the Republic of India.</p>
                  <p className="mb-2 last:mb-0">Subject to any applicable arbitration agreement and to the extent permitted by law, the courts having territorial jurisdiction over the registered office of Shradhalu Private Limited shall have exclusive jurisdiction over disputes arising out of or relating to these Terms.</p>
                  <p className="mb-2 last:mb-0">Nothing herein limits the jurisdiction of any court where exclusive jurisdiction cannot legally be excluded.</p>
                </DocSection>
                <DocSection title="48. MODIFICATIONS TO THE PLATFORM">
                  <p className="mb-2 last:mb-0">Sri Dwar continuously improves its Platform and Services.</p>
                  <p className="mb-2 last:mb-0">Accordingly, Sri Dwar reserves the right, without prior notice where reasonably necessary, to:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>add new services</li>
                    <li>discontinue existing services</li>
                    <li>modify features</li>
                    <li>revise pricing structures</li>
                    <li>introduce subscription models</li>
                    <li>change technologies</li>
                    <li>integrate third-party services</li>
                    <li>update user interfaces</li>
                    <li>improve security measures</li>
                    <li>suspend services for maintenance</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Such modifications shall not constitute a breach of these Terms.</p>
                </DocSection>
                <DocSection title="49. CONTACT INFORMATION">
                  <p className="mb-2 last:mb-0">For legal notices, grievances, contractual communications, or questions relating to these Terms, Users may contact Sri Dwar through the official contact details published on the Platform.</p>
                  <p className="mb-2 last:mb-0">Users are encouraged to first contact customer support to facilitate prompt resolution of concerns.</p>
                  <p className="mb-2 last:mb-0">Where applicable under law, Sri Dwar shall designate and publish the contact details of its Grievance Officer or other statutory contact person.</p>
                </DocSection>
                <DocSection title="50. ACKNOWLEDGEMENT">
                  <p className="mb-2 last:mb-0">BY ACCESSING, REGISTERING WITH, BROWSING, MAKING A BOOKING, MAKING A DONATION, MAKING A PAYMENT, USING ANY FEATURE OF THE PLATFORM, OR OTHERWISE CONTINUING TO USE SRI DWAR, YOU ACKNOWLEDGE THAT:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>YOU HAVE READ THESE TERMS CAREFULLY</li>
                    <li>YOU UNDERSTAND THEIR LEGAL EFFECT</li>
                    <li>YOU AGREE TO BE BOUND BY THEM</li>
                    <li>YOU HAVE HAD AN OPPORTUNITY TO SEEK INDEPENDENT LEGAL ADVICE IF YOU CHOSE TO DO SO</li>
                  </ul>
                  <p className="mb-2 last:mb-0">YOU AGREE THAT ELECTRONIC ACCEPTANCE OF THESE TERMS CONSTITUTES A LEGALLY BINDING AGREEMENT TO THE EXTENT PERMITTED UNDER APPLICABLE LAW.</p>
                  <p className="mb-2 last:mb-0">By continuing to use the Platform, you further acknowledge that religious services are inherently subject to temple customs, priest availability, operational conditions, governmental regulations, and circumstances beyond the control of Sri Dwar. You understand that Sri Dwar acts as a facilitator and technology platform for many of its services and that no provision of these Terms shall be interpreted as creating obligations beyond those expressly assumed by Shradhalu Private Limited under applicable law.</p>
                </DocSection>
              </>
            ),
          },
          refund: {
            icon: "↩️",
            title: "Refund Policy",
            content: (
              <>
                <p className="text-[13px] text-white/60 italic leading-relaxed mb-4">This Refund & Cancellation Policy ("Policy") forms an integral part of the Terms & Conditions governing the use of Sri Dwar, operated by Shradhalu Private Limited ("Sri Dwar," "we," "our," or "us").</p>
                <p className="text-[13px] text-white/60 italic leading-relaxed mb-4">By booking any service, making any payment, or using the Platform, you acknowledge that you have read, understood, and agreed to this Policy.</p>
                <DocSection title="1. Purpose">
                  <p className="mb-2 last:mb-0">Sri Dwar provides a technology platform facilitating religious, spiritual, devotional, charitable, pilgrimage, and related services through temples, priests, trusts, charitable institutions, logistics providers, and other independent partners.</p>
                  <p className="mb-2 last:mb-0">Many of these services involve advance arrangements, reservations, donations, temple scheduling, procurement of ritual materials, priest allocation, travel coordination, and other time-sensitive preparations. Accordingly, refunds and cancellations depend upon the nature of the service and the stage at which cancellation occurs.</p>
                </DocSection>
                <DocSection title="2. Definitions">
                  <p className="mb-2 last:mb-0">For the purposes of this Policy:</p>
                  <p className="mb-2 last:mb-0">Booking means any confirmed request for a service through Sri Dwar.</p>
                  <p className="mb-2 last:mb-0">Service includes pujas, rituals, donations, livestreams, astrology consultations, pilgrimage services, prasad delivery, temple bookings, charitable activities, and any other offerings available on the Platform.</p>
                  <p className="mb-2 last:mb-0">Platform Fee means the service fee charged by Sri Dwar for facilitating bookings and related services.</p>
                  <p className="mb-2 last:mb-0">Third-Party Charges include amounts payable to temples, priests, trusts, logistics providers, payment gateways, travel operators, accommodation providers, vendors, or other independent service providers.</p>
                  <p className="mb-2 last:mb-0">Force Majeure has the meaning assigned in the Terms & Conditions.</p>
                </DocSection>
                <DocSection title="3. Nature of Religious Services">
                  <p className="mb-2 last:mb-0">Many religious services begin preparation immediately after booking confirmation. Such preparations may include:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>reserving temple slots</li>
                    <li>scheduling priests</li>
                    <li>purchasing flowers, fruits, milk, ghee, cloth, and puja materials</li>
                    <li>arranging livestreams</li>
                    <li>preparing Prasad</li>
                    <li>coordinating logistics</li>
                    <li>making donations to temples or trusts</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Once such preparations commence, recovery of amounts paid to independent service providers may not always be possible.</p>
                </DocSection>
                <DocSection title="4. Dynamic Pricing">
                  <p className="mb-2 last:mb-0">Service prices are not fixed and may vary due to:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>festival seasons</li>
                    <li>auspicious dates</li>
                    <li>temple crowd</li>
                    <li>priest availability</li>
                    <li>local customs</li>
                    <li>transportation costs</li>
                    <li>government regulations</li>
                    <li>material costs</li>
                    <li>inflation</li>
                    <li>operational requirements</li>
                    <li>other circumstances beyond reasonable control</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Price variations after booking confirmation do not automatically entitle a User to cancellation or refund.</p>
                </DocSection>
                <DocSection title="5. Cancellation by User">
                  <p className="mb-2 last:mb-0">Users may request cancellation through the official Sri Dwar support channels.</p>
                  <p className="mb-2 last:mb-0">Cancellation requests become effective only after written confirmation from Sri Dwar.</p>
                  <p className="mb-2 last:mb-0">The following general principles apply unless otherwise specified for a particular service:</p>
                  <p className="font-semibold text-white/85 mt-3 mb-1">Before Processing Begins</p>
                  <p className="mb-2 last:mb-0">Where no arrangements have been initiated and no payments have been transferred to third parties, Sri Dwar may approve cancellation subject to deduction of:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>payment gateway charges</li>
                    <li>taxes</li>
                    <li>administrative expenses</li>
                    <li>applicable Platform Fees</li>
                  </ul>
                  <p className="font-semibold text-white/85 mt-3 mb-1">After Processing Begins</p>
                  <p className="mb-2 last:mb-0">Where booking processing has commenced, Sri Dwar may deduct:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>Platform Fees</li>
                    <li>payment gateway charges</li>
                    <li>taxes</li>
                    <li>actual expenses incurred</li>
                    <li>non-refundable third-party charges</li>
                  </ul>
                  <p className="font-semibold text-white/85 mt-3 mb-1">After Service Commencement</p>
                  <p className="mb-2 last:mb-0">Once a ritual, consultation, livestream, pilgrimage, donation process, or other booked service has commenced, the booking shall generally be considered fulfilled and no refund shall ordinarily be available except where required by applicable law.</p>
                </DocSection>
                <DocSection title="6. Cancellation by Sri Dwar">
                  <p className="mb-2 last:mb-0">Sri Dwar may cancel or reschedule bookings due to:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>temple closure</li>
                    <li>priest unavailability</li>
                    <li>natural disasters</li>
                    <li>security concerns</li>
                    <li>government restrictions</li>
                    <li>operational limitations</li>
                    <li>technical failures</li>
                    <li>force majeure</li>
                    <li>fraud prevention</li>
                    <li>incomplete booking information</li>
                    <li>legal requirements</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Where feasible, Sri Dwar may offer:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>rescheduling</li>
                    <li>an alternative service</li>
                    <li>partial refund</li>
                    <li>full refund of recoverable amounts</li>
                  </ul>
                </DocSection>
                <DocSection title="7. Temple and Priest Cancellations">
                  <p className="mb-2 last:mb-0">Temples and priests operate independently.</p>
                  <p className="mb-2 last:mb-0">If a temple, priest, trust, or other independent service provider cancels, postpones, or modifies a service, Sri Dwar will make reasonable efforts to:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>arrange another priest</li>
                    <li>coordinate another temple</li>
                    <li>reschedule the service</li>
                    <li>provide alternative arrangements where practicable</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Refunds, if any, shall depend upon the recoverability of payments already made to independent service providers.</p>
                </DocSection>
                <DocSection title="8. Donations">
                  <p className="mb-2 last:mb-0">Donations made to:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>temples</li>
                    <li>trusts</li>
                    <li>gaushalas</li>
                    <li>charitable institutions</li>
                    <li>annadanam programmes</li>
                    <li>religious causes</li>
                    <li>are generally voluntary</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Once transferred to the designated recipient, such donations are ordinarily non-refundable.</p>
                  <p className="mb-2 last:mb-0">Where a donation has not yet been transferred, Sri Dwar may review cancellation requests on a case-by-case basis.</p>
                  <p className="mb-2 last:mb-0">Nothing in this section limits any mandatory rights available under applicable law.</p>
                </DocSection>
                <DocSection title="9. Prasad and Physical Deliveries">
                  <p className="mb-2 last:mb-0">Refunds shall generally not be available for:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>delivery delays caused by courier partners</li>
                    <li>customs delays</li>
                    <li>weather disruptions</li>
                    <li>recipient unavailability</li>
                    <li>incorrect delivery information supplied by the User</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Where products arrive materially damaged due to packaging attributable to Sri Dwar, users should notify customer support within forty-eight (48) hours of delivery with reasonable supporting evidence.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar may, at its discretion, offer replacement, reshipment, or an appropriate refund where justified.</p>
                </DocSection>
                <DocSection title="10. Livestream Services">
                  <p className="mb-2 last:mb-0">Temporary interruptions resulting from:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>internet failures</li>
                    <li>power outages</li>
                    <li>temple restrictions</li>
                    <li>weather</li>
                    <li>equipment malfunction</li>
                    <li>local infrastructure limitations</li>
                    <li>shall not automatically qualify for refunds</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Where a livestream cannot be provided due solely to circumstances attributable to Sri Dwar and no reasonable alternative is offered, Sri Dwar may consider an appropriate refund or service credit.</p>
                </DocSection>
                <DocSection title="11. Pilgrimage, Travel and Accommodation">
                  <p className="mb-2 last:mb-0">Travel, accommodation, transportation, and pilgrimage services may be subject to the cancellation policies of independent providers.</p>
                  <p className="mb-2 last:mb-0">Airlines, railways, hotels, taxi operators, tour operators, and accommodation providers may impose separate cancellation charges.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar shall not be responsible for charges imposed by such independent providers.</p>
                </DocSection>
                <DocSection title="12. Astrology and Consultation Services">
                  <p className="mb-2 last:mb-0">Once an astrology consultation, spiritual consultation, or similar appointment has commenced, the service shall generally be considered completed.</p>
                  <p className="mb-2 last:mb-0">Refunds shall not ordinarily be granted based solely upon dissatisfaction with advice, predictions, interpretations, or subjective expectations.</p>
                </DocSection>
                <DocSection title="13. Failed Payments">
                  <p className="mb-2 last:mb-0">Where payment fails but funds are debited by a bank or payment provider, reversal timelines shall be governed by the relevant financial institution.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar shall reasonably cooperate in resolving such matters but does not control banking settlement timelines.</p>
                </DocSection>
                <DocSection title="14. Fraudulent Transactions">
                  <p className="mb-2 last:mb-0">Sri Dwar reserves the right to refuse refunds where there is reasonable evidence of:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>payment fraud</li>
                    <li>identity theft</li>
                    <li>abuse of refund policies</li>
                    <li>chargeback misuse</li>
                    <li>false claims</li>
                    <li>duplicate refund requests</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Appropriate legal action may be initiated where necessary.</p>
                </DocSection>
                <DocSection title="15. Refund Method">
                  <p className="mb-2 last:mb-0">Approved refunds shall ordinarily be processed through the original payment method used for the transaction, unless otherwise required by law or operational constraints.</p>
                  <p className="mb-2 last:mb-0">Where the original payment method is unavailable, Sri Dwar may use another lawful payment mechanism after appropriate verification.</p>
                </DocSection>
                <DocSection title="16. Refund Processing Time">
                  <p className="mb-2 last:mb-0">After approval, refunds are generally initiated within 7 to 15 business days.</p>
                  <p className="mb-2 last:mb-0">Actual credit timelines depend upon:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>banks</li>
                    <li>card networks</li>
                    <li>UPI providers</li>
                    <li>payment gateways</li>
                    <li>financial institutions</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Sri Dwar is not responsible for delays attributable to these independent entities.</p>
                </DocSection>
                <DocSection title="17. Force Majeure">
                  <p className="mb-2 last:mb-0">Refund obligations may be affected by Force Majeure events including:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>floods</li>
                    <li>earthquakes</li>
                    <li>pandemics</li>
                    <li>riots</li>
                    <li>war</li>
                    <li>government restrictions</li>
                    <li>transportation failures</li>
                    <li>internet outages</li>
                    <li>temple closures</li>
                    <li>natural disasters</li>
                    <li>public emergencies</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Sri Dwar shall make commercially reasonable efforts to provide rescheduling or alternative arrangements where feasible.</p>
                </DocSection>
                <DocSection title="18. Customer Support">
                  <p className="mb-2 last:mb-0">Users requiring cancellation, modification, refund assistance, or clarification should contact Sri Dwar through the official communication channels published on the Platform.</p>
                  <p className="mb-2 last:mb-0">Users should provide:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>Booking ID</li>
                    <li>registered mobile number or email</li>
                    <li>payment reference</li>
                    <li>reason for the request</li>
                    <li>supporting documents where applicable</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Providing complete information helps expedite processing.</p>
                </DocSection>
                <DocSection title="19. Changes to this Policy">
                  <p className="mb-2 last:mb-0">Sri Dwar reserves the right to amend or update this Policy from time to time in response to legal, operational, technological, or business developments.</p>
                  <p className="mb-2 last:mb-0">The revised version shall become effective upon publication on the Platform unless otherwise specified.</p>
                </DocSection>
                <DocSection title="20. Final Provisions">
                  <p className="mb-2 last:mb-0">This Policy shall be read together with the Terms & Conditions, Privacy Policy, and Legal Disclaimer.</p>
                  <p className="mb-2 last:mb-0">Nothing contained in this Policy excludes or limits any rights that cannot lawfully be excluded under applicable law.</p>
                  <p className="mb-2 last:mb-0">Where a conflict exists between this Policy and mandatory legal requirements, the applicable law shall prevail to the extent of such conflict.</p>
                  <p className="mb-2 last:mb-0">By completing a booking or making a payment through Sri Dwar, you acknowledge that you have read, understood, and agreed to this Refund & Cancellation Policy.</p>
                </DocSection>
              </>
            ),
          },
          legal: {
            icon: "📄",
            title: "legal",
            content: (
              <>
                <DocSection title="1. Corporate Identity">
                  Sri Dwar is a product of <strong className="text-white">Shradhalu Private Limited</strong>, incorporated under the Companies Act, 2013, with CIN: <span className="text-[#FFB347] font-mono">U62099OD2026PTC054237</span>. Registered office: Ground Floor, Sobra, Maa Biraja Khetra, Jajpur, Odisha 755019.
                </DocSection>
                <DocSection title="2. Regulatory Framework">
                  Shradhalu Private Limited operates in compliance with: (a) the Information Technology Act, 2000 and its amendments; (b) the IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021; (c) the Consumer Protection (E-Commerce) Rules, 2020; (d) the Digital Personal Data Protection Act, 2023; (e) the Foreign Exchange Management Act (FEMA), 1999, for cross-border transactions; and (f) applicable GST and taxation laws of India.
                </DocSection>
                <DocSection title="3. Startup India / DPIIT Recognition">
                  Shradhalu Private Limited has applied for recognition under the Startup India Initiative (DPIIT), GeM, and Digital India; these applications are currently pending approval by the Government of India.
                </DocSection>
                <DocSection title="4. Payment Compliance">
                  All digital payments are facilitated through UPI, regulated by the Reserve Bank of India (RBI) and the National Payments Corporation of India (NPCI). We operate as a collection facilitator and do not hold escrow accounts. Payment verification is generally completed manually within 24–48 hours.
                </DocSection>
                <DocSection title="5. Related Policies">
                  This Legal Compliance summary should be read together with our full Privacy Policy, Cookie Policy, Terms of Use, Refund Policy, Legal Disclaimer, Grievance Redressal Policy, Community Guidelines, Content & IP Policy, Donation & Charity Policy, and — for registered partners, temples and priests — the Partner Agreement, each available as a separate tab in this window.
                </DocSection>
                <DocSection title="6. Dispute Resolution & Governing Law">
                  These policies are governed by the laws of India. Disputes are subject to the exclusive jurisdiction of the courts in Bhubaneswar, Odisha, and, where agreed, may be referred to arbitration under the Arbitration and Conciliation Act, 1996. To the extent permitted by law, Sri Dwar's liability for any claim is limited to the platform fee retained for the relevant transaction.
                </DocSection>
              </>
            ),
          },
          disclaimer: {
            icon: "⚠️",
            title: "Legal Disclaimer",
            content: (
              <>
                <p className="text-[13px] text-white/60 italic leading-relaxed mb-4">This Legal Disclaimer governs the use of the Sri Dwar platform, including its website, mobile applications, services, communications, and all offerings provided by Shradhalu Private Limited ("Sri Dwar", "we", "our", or "us").</p>
                <p className="text-[13px] text-white/60 italic leading-relaxed mb-4">By accessing or using our platform, you acknowledge that you have read, understood, and agreed to this Disclaimer together with our Terms & Conditions and Privacy Policy.</p>
                <DocSection title="1. Platform Nature">
                  <p className="mb-2 last:mb-0">Sri Dwar is a technology platform that facilitates devotees in discovering, requesting, coordinating, and booking religious, spiritual, devotional, charitable, and temple-related services.</p>
                  <p className="mb-2 last:mb-0">Except where expressly stated otherwise, Sri Dwar does not own, manage, control, supervise, employ, or operate any temple, religious institution, trust, priest, astrologer, guru, monk, service provider, volunteer, charitable organization, gaushala, or pilgrimage destination.</p>
                  <p className="mb-2 last:mb-0">Most services available through the platform are performed by independent third parties.</p>
                </DocSection>
                <DocSection title="2. Independent Service Providers">
                  <p className="mb-2 last:mb-0">Priests, temples, trusts, local coordinators, volunteers, charitable organizations, astrologers, pandits, guides, and other religious service providers listed on Sri Dwar are independent persons or entities.</p>
                  <p className="mb-2 last:mb-0">Information regarding them may be obtained from:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>the priests themselves</li>
                    <li>temple authorities</li>
                    <li>local representatives</li>
                    <li>volunteers</li>
                    <li>charitable organizations</li>
                    <li>publicly available sources</li>
                    <li>community references</li>
                    <li>other independent contributors</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Sri Dwar does not warrant or guarantee the continued accuracy, completeness, qualifications, availability, conduct, licensing, religious authority, experience, authenticity, representations, or future performance of any third-party service provider.</p>
                  <p className="mb-2 last:mb-0">Any interaction between a devotee and a temple, priest, trust, or other third party remains solely between those parties.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar shall not be responsible or liable for any dispute, disagreement, misconduct, negligence, delay, omission, cancellation, communication failure, misunderstanding, quality of service, financial issue, personal conduct, injury, property loss, dissatisfaction, or any other issue arising from such interactions.</p>
                </DocSection>
                <DocSection title="3. Dynamic Pricing Disclaimer">
                  <p className="mb-2 last:mb-0">Prices shown on the website are indicative estimates only unless expressly confirmed.</p>
                  <p className="mb-2 last:mb-0">Prices are not fixed by Sri Dwar.</p>
                  <p className="mb-2 last:mb-0">Charges may increase or decrease at any time depending upon numerous factors including but not limited to:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>festival seasons</li>
                    <li>temple crowd</li>
                    <li>auspicious dates</li>
                    <li>priest availability</li>
                    <li>local customs</li>
                    <li>temple policies</li>
                    <li>government regulations</li>
                    <li>transportation costs</li>
                    <li>accommodation</li>
                    <li>inflation</li>
                    <li>material costs</li>
                    <li>flower prices</li>
                    <li>puja samagri costs</li>
                    <li>donations requested by temples</li>
                    <li>special arrangements</li>
                    <li>urgency</li>
                    <li>weather</li>
                    <li>natural events</li>
                    <li>local administrative decisions</li>
                    <li>other operational circumstances beyond anyone's reasonable control</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Neither Sri Dwar, Shradhalu Private Limited, temples, priests, trusts, volunteers, coordinators, nor any associated person shall be liable for price fluctuations occurring before or after a booking request.</p>
                  <p className="mb-2 last:mb-0">Final pricing may only be confirmed after verification with the relevant service provider.</p>
                </DocSection>
                <DocSection title="4. Information Accuracy">
                  <p className="mb-2 last:mb-0">While reasonable efforts are made to keep information current, religious institutions frequently modify:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>rituals</li>
                    <li>timings</li>
                    <li>temple rules</li>
                    <li>dress codes</li>
                    <li>photography policies</li>
                    <li>offerings</li>
                    <li>festivals</li>
                    <li>donations</li>
                    <li>priest availability</li>
                    <li>queue systems</li>
                    <li>accessibility</li>
                    <li>government restrictions</li>
                    <li>operational procedures</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Accordingly, all information is provided on an "as available" and "as updated" basis.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar makes no representation or warranty that any information is complete, current, uninterrupted, error-free, or continuously available.</p>
                </DocSection>
                <DocSection title="5. No Religious Guarantee">
                  <p className="mb-2 last:mb-0">Religious rituals are matters of personal faith.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar does not guarantee:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>spiritual results</li>
                    <li>blessings</li>
                    <li>fulfillment of wishes</li>
                    <li>religious outcomes</li>
                    <li>astrological accuracy</li>
                    <li>healing</li>
                    <li>prosperity</li>
                    <li>success</li>
                    <li>health</li>
                    <li>miracles</li>
                    <li>any supernatural or metaphysical benefit</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Individual beliefs and experiences may differ.</p>
                </DocSection>
                <DocSection title="6. Temple Policies">
                  <p className="mb-2 last:mb-0">Every temple has its own independent rules.</p>
                  <p className="mb-2 last:mb-0">Temple authorities may change:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>entry rules</li>
                    <li>timings</li>
                    <li>queue systems</li>
                    <li>VIP darshan availability</li>
                    <li>donations</li>
                    <li>rituals</li>
                    <li>photography permissions</li>
                    <li>security procedures</li>
                    <li>visitor restrictions</li>
                    <li>without prior notice</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Sri Dwar has no authority to override such decisions.</p>
                </DocSection>
                <DocSection title="7. Third-Party Content">
                  <p className="mb-2 last:mb-0">The platform may contain information supplied by third parties.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar does not independently verify every statement, image, schedule, biography, ritual description, historical detail, or service listing.</p>
                  <p className="mb-2 last:mb-0">Use of such information is entirely at the user's discretion.</p>
                </DocSection>
                <DocSection title="8. Images and Representations">
                  <p className="mb-2 last:mb-0">Photographs, illustrations, videos, livestreams, artwork, maps, and graphics are for reference and illustrative purposes only.</p>
                  <p className="mb-2 last:mb-0">Actual locations, decorations, ceremonies, priests, temples, offerings, crowds, flowers, and arrangements may differ.</p>
                </DocSection>
                <DocSection title="9. Livestreams and Digital Services">
                  <p className="mb-2 last:mb-0">Livestreams, recordings, photographs, digital certificates, acknowledgements, and updates depend upon:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>internet connectivity</li>
                    <li>temple permissions</li>
                    <li>weather</li>
                    <li>equipment</li>
                    <li>electricity</li>
                    <li>local infrastructure</li>
                    <li>operational limitations</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Temporary interruptions, delays, or failures may occur.</p>
                </DocSection>
                <DocSection title="10. Force Majeure">
                  <p className="mb-2 last:mb-0">Sri Dwar shall not be responsible for delays, cancellations, interruptions, or inability to perform services arising from circumstances beyond reasonable control including:</p>
                  <p className="mb-2 last:mb-0">natural disasters, floods, earthquakes, storms, pandemics, epidemics, strikes, riots, war, civil disturbances, governmental restrictions, law enforcement actions, transportation disruptions, internet failures, power outages, religious events, temple closures, security concerns, accidents, or any other force majeure event.</p>
                </DocSection>
                <DocSection title="11. Donations">
                  <p className="mb-2 last:mb-0">Amounts paid towards donations, offerings, annadanam, gaushala support, temple development, charitable activities, or similar causes may be transferred to the respective temple, trust, charitable institution, or service provider in accordance with applicable arrangements.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar does not guarantee tax benefits, charitable deductions, or governmental recognition unless specifically stated.</p>
                </DocSection>
                <DocSection title="12. User Responsibility">
                  <p className="mb-2 last:mb-0">Users are responsible for verifying:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>names</li>
                    <li>dates</li>
                    <li>gotra details</li>
                    <li>nakshatra</li>
                    <li>addresses</li>
                    <li>contact information</li>
                    <li>booking requirements</li>
                    <li>ritual preferences</li>
                    <li>other information submitted during booking</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Sri Dwar shall not be responsible for errors caused by incorrect information provided by users.</p>
                </DocSection>
                <DocSection title="13. Limitation of Liability">
                  <p className="mb-2 last:mb-0">To the maximum extent permitted by applicable law, Sri Dwar, Shradhalu Private Limited, its directors, officers, employees, consultants, affiliates, agents, licensors, technology partners, vendors, contractors, volunteers, temples, priests, trusts, charitable organizations, coordinators, representatives, successors, assigns, and associated persons shall not be liable for any direct, indirect, incidental, consequential, exemplary, punitive, special, economic, reputational, emotional, religious, or other losses arising from or related to:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>use of the platform</li>
                    <li>reliance upon information</li>
                    <li>service interruptions</li>
                    <li>pricing changes</li>
                    <li>booking modifications</li>
                    <li>temple decisions</li>
                    <li>priest conduct</li>
                    <li>third-party actions</li>
                    <li>cancellations</li>
                    <li>delays</li>
                    <li>travel</li>
                    <li>accommodation</li>
                    <li>donations</li>
                    <li>technical failures</li>
                    <li>payment issues</li>
                    <li>misunderstandings</li>
                  </ul>
                  <p className="mb-2 last:mb-0">acts or omissions of independent service providers; or</p>
                  <p className="mb-2 last:mb-0">any event beyond reasonable control.</p>
                  <p className="mb-2 last:mb-0">Nothing in this Disclaimer excludes liability that cannot legally be excluded under applicable law.</p>
                </DocSection>
                <DocSection title="14. Governing Law">
                  <p className="mb-2 last:mb-0">This Disclaimer shall be governed by the laws of India.</p>
                  <p className="mb-2 last:mb-0">Any disputes shall be subject to the exclusive jurisdiction of the competent courts having jurisdiction over the registered office of Shradhalu Private Limited, unless otherwise required by applicable law.</p>
                </DocSection>
                <DocSection title="15. Changes">
                  <p className="mb-2 last:mb-0">Sri Dwar reserves the right to modify, update, revise, or replace this Disclaimer at any time without prior notice.</p>
                  <p className="mb-2 last:mb-0">Continued use of the platform constitutes acceptance of the latest version.</p>
                </DocSection>
              </>
            ),
          },
          grievance: {
            icon: "📮",
            title: "Grievance Redressal",
            content: (
              <>
                <p className="text-[13px] text-white/60 italic leading-relaxed mb-4">Sri Dwar is committed to resolving user concerns fairly, transparently, and promptly.</p>
                <DocSection title="1. Scope">
                  <p className="mb-2 last:mb-0">This Policy applies to grievances relating to:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>bookings</li>
                    <li>payments</li>
                    <li>donations</li>
                    <li>refunds</li>
                    <li>priests</li>
                    <li>temples</li>
                    <li>customer support</li>
                    <li>privacy</li>
                    <li>Platform functionality</li>
                    <li>content</li>
                    <li>technical issues</li>
                  </ul>
                </DocSection>
                <DocSection title="2. Raising a Grievance">
                  <p className="mb-2 last:mb-0">Users should submit:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>Booking ID (if applicable)</li>
                    <li>registered email or mobile number</li>
                    <li>description of the issue</li>
                    <li>supporting documents or screenshots where available</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Grievances should be submitted through the official contact channels published on the Platform.</p>
                </DocSection>
                <DocSection title="3. Review Process">
                  <p className="mb-2 last:mb-0">Sri Dwar will:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>acknowledge receipt within a reasonable time</li>
                    <li>review available information</li>
                    <li>seek clarification where necessary</li>
                    <li>coordinate with relevant partners if applicable</li>
                    <li>communicate the outcome</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Resolution timelines may vary depending on complexity and third-party involvement.</p>
                </DocSection>
                <DocSection title="4. Independent Service Providers">
                  <p className="mb-2 last:mb-0">Where a grievance concerns an independent temple, priest, trust, logistics provider, or other service provider, Sri Dwar may facilitate communication but cannot compel independent parties to take specific actions.</p>
                </DocSection>
                <DocSection title="5. Fraudulent Complaints">
                  <p className="mb-2 last:mb-0">Knowingly false, misleading, abusive, or fraudulent complaints may result in suspension of Platform access and other appropriate action.</p>
                </DocSection>
                <DocSection title="6. Escalation">
                  <p className="mb-2 last:mb-0">If a user is dissatisfied with the initial response, the matter may be escalated for further internal review.</p>
                  <p className="mb-2 last:mb-0">Where required by applicable law, users may also pursue remedies before competent authorities or courts.</p>
                </DocSection>
                <DocSection title="7. Grievance Officer">
                  <p className="mb-2 last:mb-0">Where required under applicable law, Sri Dwar shall publish the name and contact details of its designated Grievance Officer on the Platform.</p>
                </DocSection>
                <DocSection title="8. Policy Updates">
                  <p className="mb-2 last:mb-0">Sri Dwar may revise this Policy from time to time. Updated versions become effective upon publication.</p>
                </DocSection>
                <DocSection title="9. Contact">
                  <p className="mb-2 last:mb-0">All grievances should be submitted using the official contact details published on the Sri Dwar Platform. We encourage users to provide complete information to facilitate a prompt and fair resolution.</p>
                </DocSection>
              </>
            ),
          },
          community: {
            icon: "🤝",
            title: "Community Guidelines",
            content: (
              <>
                <p className="text-[13px] text-white/60 italic leading-relaxed mb-4">Sri Dwar aims to provide a respectful, inclusive, and spiritually enriching environment for devotees, temples, priests, partners, and visitors.</p>
                <DocSection title="1. Respect">
                  <p className="mb-2 last:mb-0">Users shall treat everyone with dignity and respect regardless of religion, caste, gender, nationality, language, or background.</p>
                </DocSection>
                <DocSection title="2. Authentic Information">
                  <p className="mb-2 last:mb-0">Users should provide truthful booking details, contact information, and service requests.</p>
                </DocSection>
                <DocSection title="3. Appropriate Behaviour">
                  <p className="mb-2 last:mb-0">Users shall not:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>abuse priests or temple staff</li>
                    <li>harass other users</li>
                    <li>use offensive language</li>
                    <li>discriminate</li>
                    <li>threaten anyone</li>
                    <li>spread misinformation</li>
                    <li>impersonate others</li>
                    <li>engage in unlawful conduct</li>
                  </ul>
                </DocSection>
                <DocSection title="4. Religious Respect">
                  <p className="mb-2 last:mb-0">Users shall respect:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>temple customs</li>
                    <li>local traditions</li>
                    <li>dress codes</li>
                    <li>photography restrictions</li>
                    <li>ceremonial procedures</li>
                    <li>instructions issued by temple authorities</li>
                  </ul>
                </DocSection>
                <DocSection title="5. Reviews">
                  <p className="mb-2 last:mb-0">Reviews should be:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>honest</li>
                    <li>respectful</li>
                    <li>relevant</li>
                    <li>based on genuine experiences</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Fake, misleading, defamatory, or manipulated reviews are prohibited.</p>
                </DocSection>
                <DocSection title="6. Safety">
                  <p className="mb-2 last:mb-0">Users shall comply with safety instructions issued by temple authorities, local administration, or Sri Dwar.</p>
                </DocSection>
                <DocSection title="7. Privacy">
                  <p className="mb-2 last:mb-0">Users shall not publish another person's personal information without lawful authority.</p>
                </DocSection>
                <DocSection title="8. Platform Integrity">
                  <p className="mb-2 last:mb-0">Users shall not:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>attempt unauthorized access</li>
                    <li>distribute malware</li>
                    <li>misuse donations</li>
                    <li>manipulate bookings</li>
                    <li>interfere with Platform operations</li>
                  </ul>
                </DocSection>
                <DocSection title="9. Enforcement">
                  <p className="mb-2 last:mb-0">Sri Dwar may remove content, suspend accounts, cancel bookings, or terminate access where these Guidelines are violated.</p>
                </DocSection>
                <DocSection title="10. Reporting">
                  <p className="mb-2 last:mb-0">Users are encouraged to report misconduct, fraud, abuse, or suspicious activity through official Sri Dwar support channels.</p>
                </DocSection>
              </>
            ),
          },
          content_ip: {
            icon: "©️",
            title: "Content & IP Policy",
            content: (
              <>
                <p className="text-[13px] text-white/60 italic leading-relaxed mb-4">All content available on Sri Dwar is protected under applicable intellectual property laws.</p>
                <DocSection title="1. Ownership">
                  <p className="mb-2 last:mb-0">Unless otherwise stated, all rights in:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>logos</li>
                    <li>trademarks</li>
                    <li>website design</li>
                    <li>software</li>
                    <li>graphics</li>
                    <li>text</li>
                    <li>photographs</li>
                    <li>videos</li>
                    <li>livestreams</li>
                    <li>databases</li>
                    <li>AI-generated content</li>
                    <li>branding</li>
                    <li>are owned by or licensed to Shradhalu Private Limited</li>
                  </ul>
                </DocSection>
                <DocSection title="2. User Content">
                  <p className="mb-2 last:mb-0">Users may submit reviews, photographs, videos, testimonials, or feedback.</p>
                  <p className="mb-2 last:mb-0">By submitting content, you grant Sri Dwar a worldwide, royalty-free, non-exclusive licence to use, display, reproduce, modify, publish, and distribute such content for operating, improving, and promoting the Platform, subject to applicable law.</p>
                </DocSection>
                <DocSection title="3. Temple Content">
                  <p className="mb-2 last:mb-0">Photographs, descriptions, livestreams, rituals, and other content relating to temples or priests may be provided by the respective temple, priest, partner, users, or publicly available sources.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar does not claim ownership over third-party intellectual property.</p>
                </DocSection>
                <DocSection title="4. Prohibited Use">
                  <p className="mb-2 last:mb-0">Users shall not:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>copy substantial portions of the Platform</li>
                    <li>reproduce logos without permission</li>
                    <li>scrape data</li>
                    <li>reverse engineer software</li>
                    <li>create derivative works</li>
                    <li>remove copyright notices</li>
                    <li>commercially exploit Platform content without authorization</li>
                  </ul>
                </DocSection>
                <DocSection title="5. Copyright Complaints">
                  <p className="mb-2 last:mb-0">Rights holders may report alleged infringement through the official contact channels.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar may investigate and remove allegedly infringing material where appropriate.</p>
                </DocSection>
                <DocSection title="6. Reservation of Rights">
                  <p className="mb-2 last:mb-0">All rights not expressly granted remain reserved by Shradhalu Private Limited.</p>
                </DocSection>
              </>
            ),
          },
          donation: {
            icon: "🙏",
            title: "Donation & Charity Policy",
            content: (
              <>
                <p className="text-[13px] text-white/60 italic leading-relaxed mb-4">Sri Dwar facilitates donations to temples, trusts, gaushalas, annadanam programmes, charitable organizations, and other approved religious or social initiatives.</p>
                <DocSection title="1. Nature of Donations">
                  <p className="mb-2 last:mb-0">Unless expressly stated otherwise, Sri Dwar acts as a technology platform facilitating donations and does not ordinarily own or manage the recipient institutions.</p>
                </DocSection>
                <DocSection title="2. Use of Donations">
                  <p className="mb-2 last:mb-0">Donations may support:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>Temple rituals</li>
                    <li>Annadanam</li>
                    <li>Cow protection</li>
                    <li>Temple maintenance</li>
                    <li>Religious festivals</li>
                    <li>Educational initiatives</li>
                    <li>Social welfare</li>
                    <li>Disaster relief</li>
                    <li>Other approved charitable purposes</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Actual utilization is determined by the recipient institution unless specifically stated otherwise.</p>
                </DocSection>
                <DocSection title="3. Voluntary Contributions">
                  <p className="mb-2 last:mb-0">All donations are voluntary.</p>
                  <p className="mb-2 last:mb-0">Users should review donation details before completing payment.</p>
                </DocSection>
                <DocSection title="4. Non-Refundable Nature">
                  <p className="mb-2 last:mb-0">Once transferred to the designated recipient, donations are generally non-refundable unless required by applicable law.</p>
                </DocSection>
                <DocSection title="5. Transparency">
                  <p className="mb-2 last:mb-0">Sri Dwar makes reasonable efforts to work with reputable institutions; however, it cannot guarantee how independent organizations utilize funds after transfer.</p>
                  <p className="mb-2 last:mb-0">Where available, completion reports, photographs, livestreams, acknowledgements, or receipts may be shared.</p>
                </DocSection>
                <DocSection title="6. Compliance">
                  <p className="mb-2 last:mb-0">Recipient organizations are responsible for complying with applicable laws governing charitable or religious institutions.</p>
                </DocSection>
                <DocSection title="7. Tax Benefits">
                  <p className="mb-2 last:mb-0">Tax deductions or exemptions are available only where specifically stated and legally applicable.</p>
                  <p className="mb-2 last:mb-0">Users remain responsible for determining their eligibility.</p>
                </DocSection>
                <DocSection title="8. Fraud Prevention">
                  <p className="mb-2 last:mb-0">Sri Dwar reserves the right to reject suspicious donations or conduct additional verification to prevent fraud or financial crime.</p>
                </DocSection>
                <DocSection title="9. Changes">
                  <p className="mb-2 last:mb-0">This Policy may be updated from time to time.</p>
                  <p className="mb-2 last:mb-0">Continued use of the Platform constitutes acceptance of the revised Policy.</p>
                </DocSection>
              </>
            ),
          },
          partner: {
            icon: "📜",
            title: "Partner Agreement",
            content: (
              <>
                <p className="text-[13px] text-white/60 italic leading-relaxed mb-4">This Partner, Temple & Priest Agreement ("Agreement") is entered into between Shradhalu Private Limited, operating under the brand name Sri Dwar ("Sri Dwar", "Company", "we", "our", or "us"), and the individual, temple, trust, priest, astrologer, gaushala, charitable institution, organization, vendor, or other service provider ("Partner", "Temple", "Priest", "Service Provider", or "you") registering, listing, or providing services through the Sri Dwar Platform.</p>
                <p className="text-[13px] text-white/60 italic leading-relaxed mb-4">By registering, accepting bookings, or providing services through Sri Dwar, you agree to be legally bound by this Agreement.</p>
                <DocSection title="1. Purpose">
                  <p className="mb-2 last:mb-0">Sri Dwar is a technology platform that enables devotees to discover, book, and access religious, spiritual, charitable, pilgrimage, and associated services.</p>
                  <p className="mb-2 last:mb-0">This Agreement governs the relationship between Sri Dwar and its independent Partners.</p>
                </DocSection>
                <DocSection title="2. Independent Relationship">
                  <p className="mb-2 last:mb-0">The Partner acknowledges that:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>it is an independent contract</li>
                    <li>it is not an employee of Sri Dwar</li>
                    <li>it is not an agent of Sri Dwar unless expressly authorized in writing</li>
                    <li>it has no authority to bind Sri Dwar legally or financially</li>
                  </ul>
                  <p className="mb-2 last:mb-0">it shall not represent itself as an employee, franchisee, subsidiary, or legal representative of Sri Dwar.</p>
                  <p className="mb-2 last:mb-0">Nothing in this Agreement creates a partnership, joint venture, employer-employee relationship, fiduciary relationship, agency, or franchise.</p>
                </DocSection>
                <DocSection title="3. Eligibility">
                  <p className="mb-2 last:mb-0">The Partner represents that:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>all information provided is accurate</li>
                    <li>it possesses all necessary legal authority to provide its services</li>
                    <li>where applicable, required registrations, licences, permissions, or approvals have been obtained</li>
                    <li>it will comply with applicable laws</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Sri Dwar may request identity verification or supporting documentation at any time.</p>
                </DocSection>
                <DocSection title="4. Services">
                  <p className="mb-2 last:mb-0">Partners may provide services including but not limited to:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>Temple Pujas</li>
                    <li>Rudrabhishek</li>
                    <li>Archana</li>
                    <li>Homas</li>
                    <li>Havan</li>
                    <li>Pind Daan</li>
                    <li>Shraddha</li>
                    <li>Astrology</li>
                    <li>Spiritual Consultation</li>
                    <li>Annadanam</li>
                    <li>Gaushala Seva</li>
                    <li>Prasad Distribution</li>
                    <li>Pilgrimage Assistance</li>
                    <li>Religious Events</li>
                    <li>Livestream Services</li>
                    <li>Photography</li>
                    <li>Accommodation</li>
                    <li>Transportation</li>
                    <li>Charitable Activities</li>
                    <li>Other approved services</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Sri Dwar reserves the right to approve or reject any listing.</p>
                </DocSection>
                <DocSection title="5. Information Accuracy">
                  <p className="mb-2 last:mb-0">The Partner is solely responsible for the accuracy of:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>temple details</li>
                    <li>priest details</li>
                    <li>timings</li>
                    <li>rituals</li>
                    <li>prices</li>
                    <li>photographs</li>
                    <li>videos</li>
                    <li>availability</li>
                    <li>contact information</li>
                    <li>local customs</li>
                    <li>service descriptions</li>
                  </ul>
                  <p className="mb-2 last:mb-0">The Partner shall promptly notify Sri Dwar of any changes.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar may edit listings for formatting, clarity, translation, spelling, or consistency without altering the intended meaning.</p>
                </DocSection>
                <DocSection title="6. Pricing">
                  <p className="mb-2 last:mb-0">Partners acknowledge that service pricing is dynamic.</p>
                  <p className="mb-2 last:mb-0">Pricing may change due to:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>festivals</li>
                    <li>crowd levels</li>
                    <li>seasonal dem</li>
                    <li>material costs</li>
                    <li>priest availability</li>
                    <li>temple administration</li>
                    <li>government regulations</li>
                    <li>operational requirements</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Partners shall communicate revised pricing as early as reasonably possible.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar reserves the right to verify pricing before publishing.</p>
                </DocSection>
                <DocSection title="7. Booking Acceptance">
                  <p className="mb-2 last:mb-0">Partners shall use reasonable efforts to:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>honour confirmed bookings</li>
                    <li>arrive on time</li>
                    <li>communicate delays</li>
                    <li>maintain respectful conduct</li>
                    <li>perform services professionally</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Where a booking cannot be fulfilled, the Partner shall immediately notify Sri Dwar.</p>
                </DocSection>
                <DocSection title="8. Service Standards">
                  <p className="mb-2 last:mb-0">Partners agree to:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>conduct themselves respectfully</li>
                    <li>maintain appropriate religious decorum</li>
                    <li>follow temple customs</li>
                    <li>avoid misleading statements</li>
                    <li>avoid abusive behaviour</li>
                    <li>comply with safety requirements</li>
                    <li>maintain professional communication</li>
                  </ul>
                  <p className="mb-2 last:mb-0">No Partner shall make guarantees regarding divine blessings, miracles, financial success, medical healing, or supernatural outcomes.</p>
                </DocSection>
                <DocSection title="9. Livestreams">
                  <p className="mb-2 last:mb-0">Where livestream services are offered, Partners shall use reasonable efforts to:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>provide stable video</li>
                    <li>obtain required permissions</li>
                    <li>avoid unnecessary interruptions</li>
                    <li>notify Sri Dwar of technical problems</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Livestream availability depends upon local infrastructure and cannot be guaranteed.</p>
                </DocSection>
                <DocSection title="10. Donations">
                  <p className="mb-2 last:mb-0">Where donations are accepted:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>they shall be used only for their intended purpose</li>
                    <li>applicable legal requirements shall be observed</li>
                    <li>misuse of donations is strictly prohibited</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Sri Dwar may request reasonable documentation regarding donation utilization where appropriate.</p>
                </DocSection>
                <DocSection title="11. Payments">
                  <p className="mb-2 last:mb-0">Payments shall be settled according to the commercial arrangement agreed between Sri Dwar and the Partner.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar may deduct:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>Platform Fees</li>
                    <li>taxes</li>
                    <li>payment gateway charges</li>
                    <li>agreed commissions</li>
                    <li>applicable statutory deductions</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Settlement timelines may vary depending upon operational requirements.</p>
                </DocSection>
                <DocSection title="12. Taxes">
                  <p className="mb-2 last:mb-0">Partners remain solely responsible for:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>GST</li>
                    <li>income tax</li>
                    <li>professional tax</li>
                    <li>local taxes</li>
                    <li>registrations</li>
                    <li>statutory filings</li>
                    <li>accounting obligations</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Sri Dwar shall not be responsible for the Partner's tax compliance.</p>
                </DocSection>
                <DocSection title="13. Compliance">
                  <p className="mb-2 last:mb-0">Partners agree to comply with all applicable laws including those relating to:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>religious institutions</li>
                    <li>taxation</li>
                    <li>consumer protection</li>
                    <li>labour</li>
                    <li>anti-corruption</li>
                    <li>anti-money laundering</li>
                    <li>public safety</li>
                    <li>charitable activities</li>
                  </ul>
                </DocSection>
                <DocSection title="14. Confidentiality">
                  <p className="mb-2 last:mb-0">Partners shall keep confidential all non-public information received from Sri Dwar including:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>customer information</li>
                    <li>pricing</li>
                    <li>business processes</li>
                    <li>software</li>
                    <li>internal communications</li>
                    <li>commercial arrangements</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Confidential information shall not be disclosed without prior written consent unless required by law.</p>
                </DocSection>
                <DocSection title="15. User Information">
                  <p className="mb-2 last:mb-0">Partners shall access only the information reasonably necessary to perform the requested service.</p>
                  <p className="mb-2 last:mb-0">User information shall not be:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>sold</li>
                    <li>copied</li>
                    <li>shared</li>
                    <li>published</li>
                    <li>used for unsolicited marketing</li>
                    <li>retained longer than reasonably necessary</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Partners shall comply with applicable privacy laws.</p>
                </DocSection>
                <DocSection title="16. Intellectual Property">
                  <p className="mb-2 last:mb-0">All trademarks, logos, branding, software, designs, text, photographs, graphics, and proprietary materials belonging to Sri Dwar remain the exclusive property of Shradhalu Private Limited.</p>
                  <p className="mb-2 last:mb-0">Partners receive only a limited, revocable, non-exclusive licence to use approved Sri Dwar branding solely for performing services under this Agreement.</p>
                  <p className="mb-2 last:mb-0">No ownership rights are transferred.</p>
                </DocSection>
                <DocSection title="17. Reviews">
                  <p className="mb-2 last:mb-0">Sri Dwar may collect customer reviews.</p>
                  <p className="mb-2 last:mb-0">Partners shall not:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>manipulate ratings</li>
                    <li>submit fake reviews</li>
                    <li>pressure users</li>
                    <li>offer incentives for favourable reviews</li>
                    <li>post misleading testimonials</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Sri Dwar reserves the right to moderate reviews in accordance with applicable law.</p>
                </DocSection>
                <DocSection title="18. Suspension">
                  <p className="mb-2 last:mb-0">Sri Dwar may temporarily suspend a Partner for:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>repeated complaints</li>
                    <li>fraud</li>
                    <li>misconduct</li>
                    <li>inaccurate information</li>
                    <li>safety concerns</li>
                    <li>legal issues</li>
                    <li>poor service quality</li>
                    <li>policy violations</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Suspension may remain in effect until the matter is resolved.</p>
                </DocSection>
                <DocSection title="19. Termination">
                  <p className="mb-2 last:mb-0">Either party may terminate this Agreement by written notice, subject to completion of pending obligations unless otherwise agreed.</p>
                  <p className="mb-2 last:mb-0">Sri Dwar may immediately terminate this Agreement where there is:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>fraud</li>
                    <li>criminal activity</li>
                    <li>serious misconduct</li>
                    <li>repeated policy violations</li>
                    <li>misuse of customer information</li>
                    <li>reputational harm</li>
                    <li>legal or regulatory concerns</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Termination shall not affect accrued rights or outstanding payment obligations.</p>
                </DocSection>
                <DocSection title="20. Indemnity">
                  <p className="mb-2 last:mb-0">The Partner agrees to defend, indemnify, and hold harmless Shradhalu Private Limited, Sri Dwar, its directors, officers, employees, affiliates, and representatives against claims, losses, liabilities, damages, penalties, costs, and reasonable legal expenses arising from:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>inaccurate information supplied by the Partner</li>
                    <li>negligence</li>
                    <li>misconduct</li>
                    <li>breach of this Agreement</li>
                    <li>violation of law</li>
                    <li>infringement of third-party rights</li>
                    <li>injury caused by the Partner</li>
                    <li>misuse of customer information</li>
                  </ul>
                </DocSection>
                <DocSection title="21. Limitation of Liability">
                  <p className="mb-2 last:mb-0">To the maximum extent permitted by law, Sri Dwar shall not be liable for indirect, incidental, consequential, special, exemplary, or punitive damages arising from this Agreement.</p>
                  <p className="mb-2 last:mb-0">Where liability cannot legally be excluded, Sri Dwar's aggregate liability shall not exceed the Platform Fees retained by Sri Dwar relating to the transaction giving rise to the claim.</p>
                  <p className="mb-2 last:mb-0">Nothing in this Agreement excludes liability that cannot lawfully be excluded.</p>
                </DocSection>
                <DocSection title="22. Force Majeure">
                  <p className="mb-2 last:mb-0">Neither party shall be liable for delay or failure caused by events beyond reasonable control including:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1">
                    <li>floods</li>
                    <li>earthquakes</li>
                    <li>pandemics</li>
                    <li>government restrictions</li>
                    <li>riots</li>
                    <li>internet failures</li>
                    <li>power outages</li>
                    <li>temple closures</li>
                    <li>transportation disruptions</li>
                    <li>natural disasters</li>
                    <li>war</li>
                    <li>terrorism</li>
                  </ul>
                  <p className="mb-2 last:mb-0">Affected obligations shall remain suspended for the duration of the event.</p>
                </DocSection>
                <DocSection title="23. Governing Law">
                  <p className="mb-2 last:mb-0">This Agreement shall be governed by the laws of the Republic of India.</p>
                  <p className="mb-2 last:mb-0">Subject to applicable law, the courts having jurisdiction over the registered office of Shradhalu Private Limited shall have jurisdiction over disputes arising under this Agreement.</p>
                  <p className="mb-2 last:mb-0">Where agreed, disputes may be referred to arbitration under the Arbitration and Conciliation Act, 1996.</p>
                </DocSection>
                <DocSection title="24. Modifications">
                  <p className="mb-2 last:mb-0">Sri Dwar may update this Agreement to reflect legal, operational, technological, or business changes.</p>
                  <p className="mb-2 last:mb-0">Updated versions shall become effective upon publication or notification.</p>
                  <p className="mb-2 last:mb-0">Continued participation on the Platform constitutes acceptance of the revised Agreement.</p>
                </DocSection>
                <DocSection title="25. Entire Agreement">
                  <p className="mb-2 last:mb-0">This Agreement, together with the Terms & Conditions, Privacy Policy, Refund & Cancellation Policy, Legal Disclaimer, and any commercial schedules executed between the parties, constitutes the entire agreement between Sri Dwar and the Partner regarding the subject matter herein.</p>
                  <p className="mb-2 last:mb-0">If any provision is held invalid or unenforceable, the remaining provisions shall continue in full force and effect.</p>
                </DocSection>
                <DocSection title="26. Contact">
                  <p className="mb-2 last:mb-0">All contractual communications shall be made through the official contact details published by Sri Dwar or otherwise notified in writing.</p>
                </DocSection>
                <DocSection title="27. Acceptance">
                  <p className="mb-2 last:mb-0">By registering as a Partner, Temple, Priest, Trust, Gaushala, Astrologer, Vendor, or other Service Provider on Sri Dwar, or by accepting bookings through the Platform, you acknowledge that you have carefully read this Agreement, understood its contents, and agree to be legally bound by its terms.</p>
                  <p className="mb-2 last:mb-0">You further represent that you have the authority to enter into this Agreement on behalf of yourself or the organization you represent.</p>
                </DocSection>
              </>
            ),
          },
        };

        const doc = DOCS[activeLegalDoc];

        return (
          <div
            id="legal-doc-modal"
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-[200] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4 animate-fadeIn"
            style={{ touchAction: "pan-y" }}
            onClick={(e) => { if (e.target === e.currentTarget) setActiveLegalDoc(null); }}
          >
            <div className="bg-[#092320] border border-white/10 w-full sm:rounded-3xl sm:max-w-2xl shadow-2xl text-white flex flex-col"
              style={{ maxHeight: "100%" }}
              onClick={(e) => e.stopPropagation()}
            >

              {/* ── Sticky header ── */}
              <div className="shrink-0 bg-[#021816] border-b border-white/10 px-5 py-4 flex items-center justify-between sm:rounded-t-3xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFB347]/15 flex items-center justify-center text-xl shrink-0">
                    {doc.icon}
                  </div>
                  <div className="text-left">
                    <h3 className="font-serif text-base font-bold text-white">{doc.title}</h3>
                    <p className="text-[10px] font-mono text-[#FFB347] uppercase tracking-wider mt-0.5">
                      Shradhalu Private Limited · Sri Dwar
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="close-legal-doc"
                  onClick={() => setActiveLegalDoc(null)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/12 border border-white/10 flex items-center justify-center text-white/55 hover:text-white transition-all cursor-pointer shrink-0"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 32px)" }}>
              {/* ── Tab switcher so user can jump between docs ── */}
              <div className="flex gap-2 px-6 pt-5 pb-1 flex-wrap">
                {(
                  [
                    { key: "privacy",    icon: "🔒",  label: "Privacy"     },
                    { key: "cookie",     icon: "🍪",  label: "Cookies"     },
                    { key: "terms",      icon: "📋",  label: "Terms"       },
                    { key: "refund",     icon: "↩️",  label: "Refund"      },
                    { key: "legal",      icon: "⚖️",  label: "Legal"       },
                    { key: "disclaimer", icon: "⚠️",  label: "Disclaimer"  },
                    { key: "grievance",  icon: "📮",  label: "Grievance"   },
                    { key: "community",  icon: "🤝",  label: "Community"   },
                    { key: "content_ip", icon: "©️",  label: "Content/IP"  },
                    { key: "donation",   icon: "🙏",  label: "Donations"   },
                    { key: "partner",    icon: "📜",  label: "Partners"    },
                  ] as { key: "privacy" | "cookie" | "terms" | "refund" | "legal" | "disclaimer" | "grievance" | "community" | "content_ip" | "donation" | "partner"; icon: string; label: string }[]
                ).map(({ key, icon, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveLegalDoc(key)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                      activeLegalDoc === key
                        ? "bg-[#FFB347]/15 border-[#FFB347]/40 text-[#FFB347]"
                        : "bg-white/5 border-white/10 text-white/45 hover:text-white/70 hover:border-white/20"
                    }`}
                  >
                    <span>{icon}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              <div className="px-6 pt-4 pb-2">
                <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/8 rounded-full px-3 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5EEAD4] animate-pulse shrink-0" />
                  <span className="text-[10px] font-mono text-white/40">
                    Last updated: July 2026 · Shradhalu Private Limited
                  </span>
                </div>
              </div>
              <div className="px-6 pb-6 space-y-0 text-left">
                {doc.content}
              </div>

              </div>
              {/* ── Footer row ── */}
              <div className="shrink-0 border-t border-white/10 px-6 py-4 flex items-center justify-between bg-[#021816]/60">
                <p className="text-[10px] font-mono text-white/30">
                  © {new Date().getFullYear()} Shradhalu Private Limited. All rights reserved.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveLegalDoc(null)}
                  className="bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-bold py-2 px-5 rounded-xl text-xs uppercase tracking-wider cursor-pointer transition-all"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
