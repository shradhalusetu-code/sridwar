/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Menu, X, ShoppingBasket, Globe, Share2, Heart, Calendar, User, Eye } from "lucide-react";
import { Language, TRANSLATIONS } from "../data/translations";
import { CartItem } from "../types";
import SriDwarLogo from "./SriDwarLogo";
import { gaNavClick, gaShare } from "../utils/analytics";

interface NavbarProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  currentPage: string;
  onNavigate: (page: string) => void;
  cart: CartItem[];
  onOpenCart: () => void;
  onOpenBookNow: () => void;
  onOpenSevaModal: () => void;
  isLoggedIn: boolean;
  userProfileName?: string;
  onLogout: () => void;
}

export default function Navbar({
  currentLanguage,
  onLanguageChange,
  currentPage,
  onNavigate,
  cart,
  onOpenCart,
  onOpenBookNow,
  onOpenSevaModal,
  isLoggedIn,
  userProfileName,
  onLogout
}: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  const t = TRANSLATIONS[currentLanguage];

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Sri Dwar - Faith Beyond Distance",
          text: "Experience sacred Vedic rituals, live darshans, and premium blessings directly from India's most revered shrines.",
          url: window.location.href
        });
        gaShare("native_share", "website", "Sri Dwar");
      } catch (err) {
        console.log("Error sharing:", err);
      }
    } else {
      // Fallback: Copy link to clipboard
      navigator.clipboard.writeText(window.location.href);
      gaShare("clipboard_copy", "website", "Sri Dwar");
      alert("Spiritual connection link copied to your clipboard! Share the blessings.");
    }
  };

  const navItems = [
    { id: "home", label: t.navHome },
    { id: "seva", label: t.navSeva },
    { id: "puja", label: t.navOnlinePuja },
    { id: "products", label: t.navProducts },
    { id: "about", label: t.navAbout },
    { id: "contact", label: t.navContact }
  ];

  return (
    <>
      <nav
        id="main-navigation"
        className={`fixed top-0 left-0 w-full z-45 transition-all duration-300 ${
          isScrolled
            ? "bg-[#021816]/80 backdrop-blur-md py-3 border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.3)]"
            : "bg-[#021816]/20 backdrop-blur-sm py-5 border-b border-white/5 text-white"
        }`}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Left: Brand Identity */}
            <div
              id="brand-logo-trigger"
              onClick={() => onNavigate("home")}
              className="hover:opacity-95 transition-opacity cursor-pointer group"
            >
              <SriDwarLogo variant="colored" iconSize="md" showTagline={true} className="" />
            </div>

            {/* Middle: Desktop Navigation Items */}
            <div className="hidden lg:flex items-center space-x-4 xl:space-x-7" id="desktop-menu">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => { gaNavClick(item.id, "desktop_nav"); onNavigate(item.id); }}
                  className={`relative text-xs font-medium uppercase tracking-widest transition-colors duration-200 outline-none hover:text-white ${
                    currentPage === item.id
                      ? "text-[#5EEAD4] font-bold"
                      : "text-white/70"
                  }`}
                >
                  {item.label}
                  {currentPage === item.id && (
                    <span className="absolute -bottom-1.5 left-0 w-full h-0.5 bg-[#FFB347] rounded-full shadow-[0_0_8px_#FFB347]" />
                  )}
                </button>
              ))}
            </div>

            {/* Right: Desktop Controls & CTAs */}
            <div className="hidden lg:flex items-center space-x-2 xl:space-x-3.5">
              {/* Preference & Account Utilities Capsule */}
              <div className="flex items-center space-x-1 bg-white/5 border border-white/10 p-1 rounded-full backdrop-blur-md h-9">
                {/* Language Selector Selector */}
                <div className="relative">
                  <button
                    id="lang-selector-btn"
                    onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                    className="flex items-center space-x-1 text-xs font-semibold px-2.5 py-1 rounded-full text-white/90 hover:bg-white/10 hover:text-white transition-all outline-none h-7"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#5EEAD4]" />
                    <span>
                      {currentLanguage === "en"
                        ? "English"
                        : currentLanguage === "hi"
                        ? "हिंदी"
                        : currentLanguage === "bn"
                        ? "বাংলা"
                        : "ଓଡ଼ିଆ"}
                    </span>
                  </button>

                  {isLangDropdownOpen && (
                    <div
                      id="lang-dropdown"
                      className="absolute left-0 mt-2.5 w-32 rounded-xl bg-[#092320] shadow-2xl border border-white/10 py-1 text-xs text-white z-50 animate-fadeIn"
                    >
                      {[
                        { key: "en", label: "English" },
                        { key: "hi", label: "हिंदी" },
                        { key: "bn", label: "বাংলা" },
                        { key: "or", label: "ଓଡ଼ିଆ" }
                      ].map((lang) => (
                        <button
                          key={lang.key}
                          onClick={() => {
                            onLanguageChange(lang.key as Language);
                            setIsLangDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-white/10 transition-colors ${
                            currentLanguage === lang.key ? "text-[#5EEAD4] font-bold bg-white/5" : "text-white/80"
                          }`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="w-px h-4 bg-white/15 self-center" />

                {/* Cart Basket */}
                <button
                  id="navbar-cart-trigger"
                  onClick={onOpenCart}
                  className="relative p-1.5 rounded-full transition-all text-white hover:bg-white/10 hover:text-[#5EEAD4] flex items-center justify-center outline-none h-7 w-7"
                >
                  <ShoppingBasket className="w-4 h-4 text-white" />
                  {totalCartItems > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#FFB347] text-[#021816] text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(255,179,71,0.5)]">
                      {totalCartItems}
                    </span>
                  )}
                </button>

                {/* Divider */}
                <div className="w-px h-4 bg-white/15 self-center" />

                {/* Devotee Dashboard Account Button */}
                <button
                  id="navbar-account-trigger"
                  onClick={() => onNavigate("login")}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all outline-none border h-7 ${
                    isLoggedIn
                      ? "bg-[#0F766E] text-white border-[#FFB347] shadow-[0_0_10px_rgba(20,184,166,0.3)]"
                      : "border-transparent text-white/90 hover:bg-white/10"
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-[#5EEAD4]" />
                  <span className="max-w-[70px] truncate">
                    {isLoggedIn ? userProfileName || "Devotee" : t.navDashboard}
                  </span>
                </button>
              </div>

              {/* Action CTA Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  id="nav-direct-donate-seva"
                  onClick={onOpenSevaModal}
                  className="bg-[#0F766E]/65 hover:bg-[#14B8A6]/80 text-white text-xs font-bold px-4 py-2 rounded-full border border-white/10 transition-all duration-300 flex items-center space-x-1.5 hover:scale-101 h-9 outline-none cursor-pointer"
                >
                  <Heart className="w-3.5 h-3.5 text-[#FFB347] fill-[#FFB347]" />
                  <span>{t.donate}</span>
                </button>
              </div>
            </div>

            {/* Mobile Hamburger Trigger */}
            <div className="lg:hidden flex items-center space-x-3">
              {/* Cart Mobile */}
              <button
                id="mobile-cart-trigger"
                onClick={onOpenCart}
                className="relative p-2 rounded-full text-white hover:bg-white/10"
              >
                <ShoppingBasket className="w-5.5 h-5.5" />
                {totalCartItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#FFB347] text-[#021816] text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {totalCartItems}
                  </span>
                )}
              </button>

              <button
                id="hamburger-menu-trigger"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-md text-white hover:bg-white/10"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          id="mobile-drawer-overlay"
          className="fixed inset-0 z-50 bg-[#021816]/70 backdrop-blur-md flex justify-end animate-fadeIn"
        >
          <div className="w-4/5 max-w-sm bg-[#04201e] border-l border-white/10 h-full shadow-2xl flex flex-col animate-slideLeft text-white overflow-hidden">
            {/* Scrollable inner content */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-6 flex flex-col justify-between"
              onTouchMove={e => e.stopPropagation()}
            >
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-6 border-b border-white/10">
                <div className="flex items-center">
                  <SriDwarLogo variant="colored" iconSize="sm" showTagline={true} />
                </div>
                <button
                  id="close-mobile-menu"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded-md text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Language Selector for Mobile Drawer */}
              <div className="my-4 p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-[#5EEAD4]" />
                  <span className="text-xs font-semibold text-white/80">Change Language</span>
                </div>
                <select
                  id="mobile-lang-select"
                  value={currentLanguage}
                  onChange={(e) => onLanguageChange(e.target.value as Language)}
                  className="text-xs bg-[#092320] border border-white/10 rounded-lg p-1 text-white hover:border-[#5EEAD4]/50 font-semibold focus:outline-none"
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी</option>
                  <option value="bn">বাংলা</option>
                  <option value="or">ଓଡ଼ିଆ</option>
                </select>
              </div>

              {/* Drawer Links */}
              <div id="mobile-drawer-links" className="flex flex-col space-y-2 pt-2">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    id={`mobile-nav-${item.id}`}
                    onClick={() => {
                      gaNavClick(item.id, "mobile_nav");
                      onNavigate(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`text-left text-sm font-semibold py-2.5 px-4 rounded-lg transition-all ${
                      currentPage === item.id
                        ? "bg-[#0F766E] text-white border-l-4 border-[#FFB347]"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Floating menu buttons inside drawer */}
              <div className="mt-6 flex flex-col space-y-3">
                <button
                  id="mobile-seva-btn"
                  onClick={() => {
                    onOpenSevaModal();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-[#0F766E] hover:bg-[#14B8A6] text-white text-xs font-black uppercase tracking-widest py-3 rounded-xl flex items-center justify-center space-x-2 border border-white/10 shadow hover:scale-[1.01] transition-transform"
                >
                  <Heart className="w-4 h-4 text-[#FFB347] fill-[#FFB347]" />
                  <span>{t.donate}</span>
                </button>

                <button
                  id="mobile-profile-btn"
                  onClick={() => {
                    onNavigate("login");
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center space-x-2"
                >
                  <User className="w-4 h-4 text-[#5EEAD4]" />
                  <span className="truncate">{isLoggedIn ? userProfileName || "Devotee Workspace" : "Access Dharmic account"}</span>
                </button>
              </div>
            </div>

            {/* Bottom: Mobile Menu Drawer Full Social Grid & Share portal action */}
            <div id="mobile-drawer-footer" className="pt-6 border-t border-white/10">
              <p className="text-xs text-white/80 font-bold mb-3 text-center">Share & Support the Platform</p>
              
              <button
                id="mobile-share-portal-btn"
                onClick={handleShare}
                className="w-full bg-white/5 border border-white/10 text-white hover:bg-[#0F766E] text-xs font-bold py-2 rounded-xl mb-4 flex items-center justify-center space-x-2"
              >
                <Share2 className="w-4 h-4 text-[#FFB347]" />
                <span>Open Divine Share Portal</span>
              </button>

              <div id="mobile-drawer-socials" className="grid grid-cols-5 gap-3 text-center">
                <a
                  href="https://www.linkedin.com/company/sri-dwar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center p-2 rounded-lg bg-white/5 text-[#5EEAD4] hover:bg-white/10 hover:text-white"
                >
                  <span className="text-[10px] font-bold">IN</span>
                </a>
                <a
                  href="https://www.instagram.com/sri_dwar/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center p-2 rounded-lg bg-white/5 text-[#FFB347] hover:bg-white/10 hover:text-white"
                >
                  <span className="text-[10px] font-bold">IG</span>
                </a>
                <a
                  href="https://www.youtube.com/@SriDwar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center p-2 rounded-lg bg-white/5 text-red-400 hover:bg-white/10 hover:text-white"
                >
                  <span className="text-[10px] font-bold">YT</span>
                </a>
                <a
                  href="https://x.com/Sri_Dwar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center p-2 rounded-lg bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                >
                  <span className="text-[10px] font-bold">X</span>
                </a>
                <a
                  href="https://wa.me/message/325QR2O5II3IH1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center p-2 rounded-lg bg-white/5 text-emerald-400 hover:bg-white/10 hover:text-white"
                >
                  <span className="text-[10px] font-bold">WA</span>
                </a>
              </div>
              <p className="text-[9px] text-white/40 mt-4 text-center">
                Shradhalu Private Limited
              </p>
            </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
