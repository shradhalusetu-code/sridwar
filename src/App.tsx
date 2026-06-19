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

import { Language, TRANSLATIONS } from "./data/translations";
import { Product, Temple, CartItem } from "./types";
import { ChevronRight, Heart, ShoppingBasket, Trash2, Calendar, ShieldAlert, Check, RefreshCw, X } from "lucide-react";

export default function App() {
  const [currentLanguage, setCurrentLanguage] = useState<Language>("en");
  const [currentPage, setCurrentPage] = useState<string>("home");
  
  // Cart, Booking wizards
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
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

  const handleCartGPayCheckout = async () => {
    if (cart.length === 0) return;
    
    // Simulate GPay for items
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

    alert(`GPay Offering authorized! ₹${totalAmount} processed successfully. Holy items and consecrated Prasad have been assigned to your Gotra. Reference: ${refId}`);
    
    setCart([]);
    setIsCartOpen(false);
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

      {/* 3. COHESIVE SECURE PLATFORM FOOTER */}
      <footer id="corporate-footer" className="bg-[#021816] text-white pt-16 pb-8 border-t border-white/10 text-left relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            
            {/* Logo details block */}
            <div className="space-y-4">
              <SriDwarLogo variant="colored" iconSize="xl" showTagline={true} className="" />
              <p className="text-xs text-white/60 font-sans leading-relaxed">
                A globally scalable faith-tech ecosystem bridging holy distances with verified ancient rituals, live aartis, and authenticated certifications.
              </p>
              <span className="text-[10px] font-mono text-[#FFB347] uppercase font-bold tracking-wider">
                Shradhalu Private Limited
              </span>
            </div>

            {/* Navigation links */}
            <div>
              <h4 className="font-serif text-sm font-bold text-[#FFB347] mb-4 uppercase tracking-wider">Quick Devotions</h4>
              <ul className="space-y-2 text-xs text-white/60 font-medium">
                <li><button onClick={() => setCurrentPage("home")} className="hover:text-white transition-colors">Home Portal</button></li>
                <li><button onClick={() => setCurrentPage("seva")} className="hover:text-white transition-colors">Seva Hub</button></li>
                <li><button onClick={() => setCurrentPage("puja")} className="hover:text-white transition-colors">Online Puja</button></li>
                <li><button onClick={() => setCurrentPage("products")} className="hover:text-white transition-colors">Temple Bazaar</button></li>
              </ul>
            </div>

            {/* Corporate compliance details */}
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

            {/* Social Grid connection details provided by user */}
            <div>
              <h4 className="font-serif text-sm font-bold text-[#FFB347] mb-4 uppercase tracking-wider">Social Linkages</h4>
              <div className="grid grid-cols-2 gap-3 text-xs text-white/60">
                <a href="https://www.linkedin.com/company/sri-dwar" target="_blank" rel="noopener noreferrer" className="hover:text-white flex items-center space-x-1 transition-colors">
                  <span>LinkedIn</span>
                  <ChevronRight className="w-3 h-3 text-[#5EEAD4]" />
                </a>
                <a href="https://www.instagram.com/sri_dwar/" target="_blank" rel="noopener noreferrer" className="hover:text-white flex items-center space-x-1 transition-colors">
                  <span>Instagram</span>
                  <ChevronRight className="w-3 h-3 text-[#5EEAD4]" />
                </a>
                <a href="https://www.youtube.com/@SriDwar" target="_blank" rel="noopener noreferrer" className="hover:text-white flex items-center space-x-1 transition-colors">
                  <span>YouTube</span>
                  <ChevronRight className="w-3 h-3 text-[#5EEAD4]" />
                </a>
                <a href="https://x.com/Sri_Dwar" target="_blank" rel="noopener noreferrer" className="hover:text-white flex items-center space-x-1 transition-colors">
                  <span>Twitter / X</span>
                  <ChevronRight className="w-3 h-3 text-[#5EEAD4]" />
                </a>
                <a href="https://www.facebook.com/sridwar" target="_blank" rel="noopener noreferrer" className="hover:text-white flex items-center space-x-1 col-span-2 transition-colors">
                  <span>Facebook Profile</span>
                  <ChevronRight className="w-3 h-3 text-[#5EEAD4]" />
                </a>
              </div>
            </div>

          </div>

          {/* Underbar Copyright statement */}
          <div className="pt-8 border-t border-white/5 text-center flex flex-col sm:flex-row justify-between items-center text-[10px] text-white/40 font-mono">
            <p>{t.copyright}</p>
            <p className="mt-2 sm:mt-0">Sri Dwar © 2026. All Blessings Secured.</p>
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
                <span>SECURE GPAY CHECKOUT NOW</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
