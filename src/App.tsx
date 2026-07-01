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
import { hasBackHandlers, invokeTopBackHandler } from "./utils/backHandlerStack";

import { Language, TRANSLATIONS } from "./data/translations";
import { Product, Temple, CartItem } from "./types";
import { getDiscountedPrice, isDiscountActive } from "./utils/discount";
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
  const [activeLegalDoc, setActiveLegalDoc] = useState<null | "privacy" | "legal" | "terms" | "refund">(null);

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
            <AboutUs />
            <SacredResources />
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
                An AI-powered faith-tech platform built on Sri Dwar's proprietary technology, bridging holy distances with verified ancient rituals, live aartis, and authenticated certifications.
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
                  { label: "Privacy Policy",   key: "privacy" },
                  { label: "Legal Compliance", key: "legal"   },
                  { label: "Terms of Use",     key: "terms"   },
                  { label: "Refund Policy",    key: "refund"  },
                ] as { label: string; key: "privacy" | "legal" | "terms" | "refund" }[]
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
        <div id="seva-quick-modal" className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col justify-end sm:justify-center sm:items-center sm:p-4 animate-fadeIn text-left"
          style={{ touchAction: "pan-y" }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsSevaModalOpen(false); }}
        >
          <div className="bg-[#092320] border border-white/15 w-full sm:rounded-3xl sm:max-w-lg shadow-2xl animate-slideUp text-white flex flex-col"
            style={{ maxHeight: "100dvh" }}
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
                  { name: "Annadanam (Feed visiting sadhus)", price: 501, symbol: "🍚" },
                  { name: "Gau Seva (Feed organic fodder)", price: 251, symbol: "🐄" },
                  { name: "Akhanda Diya (Lit clay gold lamp)", price: 151, symbol: "🪔" },
                  { name: "Sanskrit Gurukul School book kit", price: 1001, symbol: "📚" }
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
        <div id="temple-explore-modal" className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col justify-end sm:justify-center sm:items-center sm:p-4 animate-fadeIn text-left text-xs text-white"
          style={{ touchAction: "pan-y" }}
          onClick={(e) => { if (e.target === e.currentTarget) setActiveExploreTemple(null); }}
        >
          <div className="bg-[#092320] border border-white/15 w-full sm:rounded-3xl sm:max-w-2xl shadow-2xl animate-slideUp text-white flex flex-col"
            style={{ maxHeight: "100dvh" }}
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
                  Our remote co-ordinators have authenticated all physical offerings and pujaris inside this specific sanctum to allow high-integrity virtual devotion.
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
              <div className="space-y-4 pt-6 overflow-y-auto pr-1 flex-1 min-h-0" style={{ WebkitOverflowScrolling: "touch" }}>
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

            <div className="pt-6 border-t border-white/10 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <div>
                  <span className="font-bold text-white/50 uppercase tracking-widest font-mono text-xs">Basket sum:</span>
                  {isDiscountActive() && (
                    <span className="block text-[9px] font-mono text-[#FFB347]">🎉 50% OFF</span>
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
                <DocSection title="1. Introduction">
                  Sri Dwar ("we", "our", or "us"), operated by Shradhalu Private Limited, is committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit sridwar.com or use our services.
                </DocSection>
                <DocSection title="2. Information We Collect">
                  We collect information you provide when you register for a Dharmic ID, book a puja, make a donation, or contact our support desk — including your full name, email address, phone number (including WhatsApp), city, gotra details, deity preferences, and payment reference information. We do not store raw UPI or banking credentials on our servers.
                </DocSection>
                <DocSection title="3. How We Use Your Information">
                  We use collected information to: (a) process puja bookings and send seva confirmations; (b) coordinate between you and our verified pandits; (c) deliver prasad and physical products to your shipping address; (d) send acknowledgement certificates via WhatsApp and Email within 24 hours; (e) improve our platform experience; and (f) comply with applicable Indian laws. We will never sell your personal data to third parties.
                </DocSection>
                <DocSection title="4. Sri Dwar Technology Services">
                  Sri Dwar uses its proprietary Sri Dwar Technology platform for real-time synchronisation of devotee records and secure document storage. Data processed through Sri Dwar Technology services is governed by Shradhalu Private Limited's Privacy Policy. We use UPI infrastructure for payment facilitation but do not store card or bank account details.
                </DocSection>
                <DocSection title="5. Data Retention">
                  We retain your personal information for as long as your account is active or as needed to provide services and comply with legal obligations. You may request deletion of your data at any time by writing to <span className="text-[#5EEAD4]">puja@sridwar.com</span>.
                </DocSection>
                <DocSection title="6. Cookies & Analytics">
                  Our platform may use essential cookies to maintain session state and remember your language preference. We may also use anonymised analytics to understand usage patterns. You can control cookie settings in your browser at any time.
                </DocSection>
                <DocSection title="7. Security">
                  We implement industry-standard security measures including HTTPS encryption, access controls, and periodic security reviews. No system is 100% secure, but we take every reasonable precaution to protect your data.
                </DocSection>
                <DocSection title="8. Children's Privacy">
                  Our platform is not directed at children under 13. We do not knowingly collect personal information from children. If you believe your child has provided us information, please contact us immediately.
                </DocSection>
                <DocSection title="9. Contact Us">
                  For privacy-related queries: <span className="text-[#5EEAD4] font-medium">puja@sridwar.com</span> · WhatsApp: <span className="text-[#5EEAD4]">+91 97776 45062</span>
                </DocSection>
              </>
            ),
          },
          legal: {
            icon: "⚖️",
            title: "Legal Compliance",
            content: (
              <>
                <DocSection title="1. Corporate Identity">
                  Sri Dwar is a product of <strong className="text-white">Shradhalu Private Limited</strong>, incorporated under the Companies Act, 2013, with CIN: <span className="text-[#FFB347] font-mono">U62099OD2026PTC054237</span>. Our registered office is located in Odisha, India — Sobra, Maa Biraja Khetra, Jajpur, Odisha 755019.
                </DocSection>
                <DocSection title="2. Regulatory Framework">
                  Shradhalu Private Limited operates in compliance with: (a) the Information Technology Act, 2000 and its amendments; (b) the IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021; (c) the Consumer Protection (E-Commerce) Rules, 2020; (d) the Foreign Exchange Management Act (FEMA), 1999, for cross-border transactions; and (e) all applicable GST and taxation laws of India.
                </DocSection>
                <DocSection title="3. DPIIT Recognition">
                  Shradhalu Private Limited is recognised under the <strong className="text-white">Startup India Initiative</strong> by the Department for Promotion of Industry and Internal Trade (DPIIT), Government of India. This recognition enables us to avail applicable startup benefits and regulatory exemptions under Indian law.
                </DocSection>
                <DocSection title="4. Payment Compliance">
                  All digital payments on Sri Dwar are facilitated through UPI (Unified Payments Interface), regulated by the Reserve Bank of India (RBI) and the National Payments Corporation of India (NPCI). We operate as a collection merchant and do not hold or manage escrow accounts. Payment verification is conducted manually by our finance team within 24–48 hours.
                </DocSection>
                <DocSection title="5. Intellectual Property">
                  All content on Sri Dwar — including but not limited to our brand identity, platform design, puja content, ritual scripts, deity imagery, and software code — is the intellectual property of Shradhalu Private Limited or its licensed partners. Unauthorised reproduction, distribution, or modification is prohibited and may attract civil and criminal liability.
                </DocSection>
                <DocSection title="6. Dispute Resolution">
                  Any disputes arising from use of the Sri Dwar platform shall be subject to the exclusive jurisdiction of courts in Bhubaneswar, Odisha, India. We encourage amicable resolution before escalation. Raise a complaint at <span className="text-[#5EEAD4]">puja@sridwar.com</span>.
                </DocSection>
                <DocSection title="7. Grievance Officer">
                  In accordance with the IT Rules 2021, our designated Grievance Officer is reachable at <span className="text-[#5EEAD4] font-medium">puja@sridwar.com</span>. We acknowledge grievances within 24 hours and resolve within 15 working days.
                </DocSection>
              </>
            ),
          },
          terms: {
            icon: "📋",
            title: "Terms of Use",
            content: (
              <>
                <DocSection title="1. Acceptance of Terms">
                  By accessing or using the Sri Dwar platform (sridwar.com), you agree to be bound by these Terms of Use. If you do not agree with any part of these terms, you must not use our platform. These Terms constitute a legally binding agreement between you and Shradhalu Private Limited.
                </DocSection>
                <DocSection title="2. Services Offered">
                  Sri Dwar provides: (a) online puja booking with verified pandits; (b) live and on-demand temple darshan streaming; (c) prasad delivery and the Temple Bazaar marketplace; (d) Dharmic ID generation and digital certificates; (e) donation facilitation for temples and mandaps; and (f) AI-powered spiritual guidance via our Margadarshak assistant. All services are subject to availability.
                </DocSection>
                <DocSection title="3. User Responsibilities">
                  You agree to: (a) provide accurate information during registration; (b) use the platform only for lawful, spiritual, and personal purposes; (c) not misrepresent your identity or gotra details; (d) not attempt to hack, reverse-engineer, or exploit our platform; and (e) respect the sanctity of all ritual content and priest communications. Misuse may result in permanent suspension.
                </DocSection>
                <DocSection title="4. Puja Bookings">
                  Puja bookings are subject to pandit availability and the temple calendar. Upon successful payment, you will receive a confirmation reference ID. Sri Dwar coordinates with our pandit network to perform the requested seva on your behalf on a Sankalpa basis. Certificate and prasad delivery timelines are estimates and may vary due to logistics.
                </DocSection>
                <DocSection title="5. Donations">
                  Donations made through Sri Dwar are voluntary contributions toward temple redevelopment, annadanam, and priest welfare. We provide acknowledgement certificates within 24 hours via WhatsApp and Email. Donations are not eligible for 80G tax benefits unless explicitly stated otherwise.
                </DocSection>
                <DocSection title="6. Disclaimer of Warranties">
                  Sri Dwar provides its platform "as is" and "as available." We do not warrant uninterrupted access, error-free operation, or that the platform will be free of viruses. Spiritual outcomes of pujas and sevas are matters of personal faith; Sri Dwar makes no guarantees regarding their efficacy.
                </DocSection>
                <DocSection title="7. Limitation of Liability">
                  Shradhalu Private Limited shall not be liable for any indirect, incidental, or consequential damages arising from your use of Sri Dwar, including loss of data, disruption in puja services due to force majeure, or delays in prasad delivery due to courier issues.
                </DocSection>
                <DocSection title="8. Modifications">
                  We reserve the right to modify these Terms at any time. Continued use of the platform after notification of changes constitutes your acceptance of the revised Terms. Material changes will be communicated via email or WhatsApp.
                </DocSection>
                <DocSection title="9. Governing Law">
                  These Terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in Bhubaneswar, Odisha.
                </DocSection>
              </>
            ),
          },
          refund: {
            icon: "↩️",
            title: "Refund Policy",
            content: (
              <>
                <DocSection title="1. Overview">
                  At Sri Dwar, we strive to ensure every devotee has a seamless and blessed experience. This Refund Policy outlines the circumstances under which refunds or service credits may be issued for services purchased on our platform. Please read this carefully before making a payment.
                </DocSection>
                <DocSection title="2. Puja Booking Cancellations">
                  <ul className="list-disc list-inside space-y-1 mt-1">
                    <li><strong className="text-white">More than 48 hours before</strong> the scheduled puja — full refund or service credit.</li>
                    <li><strong className="text-white">24–48 hours before</strong> — 25% service fee deducted, remainder refunded.</li>
                    <li><strong className="text-white">Within 24 hours</strong> — non-refundable, as pandits and logistics are already engaged.</li>
                    <li>Where Sri Dwar is at fault for non-performance, a full refund or re-scheduling will be offered.</li>
                  </ul>
                </DocSection>
                <DocSection title="3. Temple Bazaar & Prasad Orders">
                  Physical products (prasad boxes, rudraksha malas, brass diyas, etc.) cannot be returned once dispatched, for hygiene and sanctity reasons. If you receive a damaged or incorrect item, please write to <span className="text-[#5EEAD4]">puja@sridwar.com</span> within 48 hours of delivery with a photograph. We will arrange a replacement or credit at no additional cost.
                </DocSection>
                <DocSection title="4. Donations">
                  Donations toward temple redevelopment, annadanam, or priest welfare are <strong className="text-white">non-refundable</strong>, as they are forwarded to the respective temple trust or mandap committee immediately upon payment verification.
                </DocSection>
                <DocSection title="5. Dharmic ID & Certificates">
                  Fees paid for Dharmic ID generation and digital certificate issuance are non-refundable once the certificate has been dispatched via WhatsApp/Email. If a certificate was not received within 48 hours of submission, contact our support desk and we will re-send it at no charge.
                </DocSection>
                <DocSection title="6. Payment Verification Delays">
                  UPI payments are manually verified and may take up to 24 hours to confirm. If a payment was debited but not confirmed within this window, please share your UPI transaction reference at <span className="text-[#5EEAD4]">puja@sridwar.com</span> for expedited resolution.
                </DocSection>
                <DocSection title="7. Refund Process">
                  Approved refunds are processed to the original UPI account or bank account within 7–10 working days. A confirmation will be sent to your registered WhatsApp/Email once the refund is initiated.
                </DocSection>
                <DocSection title="8. How to Request a Refund">
                  Email <span className="text-[#5EEAD4] font-medium">puja@sridwar.com</span> with your booking Reference ID, registered phone number, and reason for the refund request. Our team will respond within 24 business hours. You can also reach us on WhatsApp: <span className="text-[#5EEAD4]">+91 97776 45062</span>.
                </DocSection>
              </>
            ),
          },
        };

        const doc = DOCS[activeLegalDoc];

        return (
          <div
            id="legal-doc-modal"
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-[60] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4 animate-fadeIn"
            style={{ touchAction: "pan-y" }}
            onClick={(e) => { if (e.target === e.currentTarget) setActiveLegalDoc(null); }}
          >
            <div className="bg-[#092320] border border-white/10 w-full sm:rounded-3xl sm:max-w-2xl shadow-2xl text-white flex flex-col"
              style={{ maxHeight: "100dvh" }}
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
                    { key: "privacy", icon: "🔒", label: "Privacy" },
                    { key: "legal",   icon: "⚖️", label: "Legal"   },
                    { key: "terms",   icon: "📋", label: "Terms"   },
                    { key: "refund",  icon: "↩️", label: "Refund"  },
                  ] as { key: "privacy" | "legal" | "terms" | "refund"; icon: string; label: string }[]
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
                    Last updated: June 2026 · Shradhalu Private Limited
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
