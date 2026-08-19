/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Menu, X, ShoppingBasket, Globe, Share2, Calendar, User, Eye, Compass, Landmark, HeartHandshake, Linkedin, Instagram, Youtube, Twitter, MessageCircle, Facebook, Mail } from "lucide-react";
import { Language, TRANSLATIONS } from "../data/translations";
import { CartItem } from "../types";
import SriDwarLogo from "./SriDwarLogo";
import { gaNavClick, gaShare, gaAppDownloadClick } from "../utils/analytics";
import { getShareUrl } from "../utils/shareUrl";

// Live Play Store listing for the Sri Dwar Android app.
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.shradhalu.sridwar";

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
  // Mobile drawer ("hamburger menu") open state is owned by App.tsx so that
  // OTHER navigation surfaces outside this component — like the Android
  // bottom tab bar — can also close it when the devotee taps a tab.
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  // When true, the Navbar is rendering inside the Capacitor Android app
  // itself — the "Get the App" Play Store button is hidden in that case
  // since a devotee already using the app doesn't need to be sent back to
  // its own store listing. Optional + defaults to false so this is a
  // non-breaking addition for any other place Navbar is rendered.
  isAndroidApp?: boolean;
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
  onLogout,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  isAndroidApp = false
}: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  // ✅ MOBILE DRAWER ACCESSIBILITY: the drawer previously had no keyboard or
  // screen-reader affordances at all — no way to dismiss it with Escape,
  // and the page behind it stayed scrollable while it was open (so a
  // two-finger/scroll-wheel gesture over the overlay scrolled the hidden
  // page underneath instead of doing nothing, which is disorienting on
  // both touch and desktop). Locking body scroll and wiring Escape here
  // matches the same pattern already used by every other modal/drawer in
  // the app (BookNowWizard, RefundRequestModal, etc.).
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileMenuOpen, setIsMobileMenuOpen]);

  const t = TRANSLATIONS[currentLanguage];

  useEffect(() => {
    // Throttled to one check per animation frame instead of running on
    // every raw scroll event — on Android WebView, unthrottled scroll
    // listeners on a fixed, backdrop-blurred header are a common source of
    // visible scroll jank since the handler (and the resulting re-render
    // when isScrolled flips) can fire dozens of times per second.
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 20);
        ticking = false;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close the language dropdown whenever the user navigates to a different page,
  // so it doesn't stay stuck open across page changes.
  useEffect(() => {
    setIsLangDropdownOpen(false);
  }, [currentPage]);

  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleShare = async () => {
    // Always use the public production URL here — inside the Android app,
    // window.location.href points at Capacitor's internal "https://localhost"
    // origin, which is meaningless to whoever receives the shared link.
    const shareUrl = getShareUrl();

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Sri Dwar - Faith Beyond Distance",
          text: "Experience sacred Vedic rituals, live darshans, and premium blessings directly from India's most revered shrines.",
          url: shareUrl
        });
        gaShare("native_share", "website", "Sri Dwar");
      } catch (err) {
        // navigator.share() throws AbortError whenever the devotee simply
        // closes the native share sheet without picking anything — that's
        // normal, expected user behaviour, not a real error, so it's not
        // worth logging to the production console on every cancelled share.
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("Error sharing:", err);
        }
      }
    } else {
      // Fallback: Copy link to clipboard
      navigator.clipboard.writeText(shareUrl);
      gaShare("clipboard_copy", "website", "Sri Dwar");
      alert("Spiritual connection link copied to your clipboard! Share the blessings.");
    }
  };

  const navItems = [
    { id: "home", label: t.navHome },
    { id: "seva", label: t.navSeva },
    { id: "puja", label: t.navOnlinePuja },
    { id: "live-darshan", label: "Darshan" },
    { id: "products", label: t.navProducts },
    { id: "plans", label: "Plans" },
    { id: "about", label: t.navAbout },
    { id: "contact", label: t.navContact }
  ];

  return (
    <>
      <nav
        id="main-navigation"
        className={`fixed top-0 left-0 w-full z-45 transition-all duration-300 ${
          isScrolled
            ? "bg-[#021816]/80 backdrop-blur-md py-5 border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.3)]"
            : "bg-[#021816]/20 backdrop-blur-sm py-7 border-b border-white/5 text-white"
        }`}
        style={{
          // Stack the notch/status-bar safe-area on TOP of the same padding
          // used for the bottom edge (py-5/py-7 above), instead of replacing
          // it outright. An inline style always wins over a class for the
          // same CSS property, so setting only `paddingTop` here used to
          // wipe out the class's top padding entirely — leaving 0px above
          // the content but the full py-5/py-7 amount below it, which is
          // why the logo/nav/buttons sat pinned high instead of centered.
          // calc() keeps top === bottom on every normal device (safe-area
          // is 0px there) and only adds real notch clearance where needed.
          //
          // FIX: read var(--safe-area-inset-top) first, with env() as the
          // fallback. Plain env(safe-area-inset-top) silently returns 0px
          // on Android WebView builds older than Chrome 140 — that's why
          // the logo/hamburger/cart were still hugging the status bar even
          // though this calc() was already in place. Capacitor 8.3+
          // injects the *correct* value into --safe-area-inset-top
          // specifically to work around that WebView bug; env() alone
          // never sees it. This has no effect on the website (no
          // --safe-area-inset-top variable exists there, so it falls
          // straight through to env(), same as before).
          paddingTop: isScrolled
            ? "calc(var(--safe-area-inset-top, env(safe-area-inset-top, 24px)) + 1.25rem)"
            : "calc(var(--safe-area-inset-top, env(safe-area-inset-top, 24px)) + 1.75rem)",
        }}
      >
        <div className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 lg:gap-4">
            {/* Left: Brand Identity */}
            <div
              id="brand-logo-trigger"
              onClick={() => onNavigate("home")}
              className="hover:opacity-95 transition-opacity cursor-pointer group shrink-0"
            >
              <SriDwarLogo variant="colored" iconSize="md" showTagline={true} className="" />
            </div>

            {/* Middle: Desktop Navigation Items — anchored to the right edge of
                its flexible space (not centered across the full remaining
                width) so the nav labels sit close to the language/controls
                capsule instead of leaving a large empty gap before it. Any
                extra room from a wide viewport now collects between the logo
                and the nav group, which reads as a natural, balanced header
                instead of stray whitespace next to the language button. */}
            {/* FIX (tablet-in-app header bug, take 3): the previous two
                attempts both tried to solve this with ONE width breakpoint
                shared by both the Capacitor Android app and the public
                website — first "lg" (1024px), then "xl" (1280px), then
                "min-[1800px]". Any single width threshold is the wrong
                tool here, because the two surfaces have opposite needs:
                the app is only ever viewed on a phone or tablet (so it
                should ALWAYS use the compact hamburger menu, regardless of
                width or orientation — nobody needs 8 nav labels + 3 CTA
                buttons crammed into an app), while the marketing website is
                viewed on real desktop/laptop browsers where devotees expect
                to see the full nav row, and a lot of those browsers sit
                well under 1800px of CSS width (e.g. any laptop with 125%+
                OS display scaling), so that threshold made the website look
                broken/"hamburger-only" even on an ordinary laptop — not
                what a fix should trade away.
                The actual fix: branch on `isAndroidApp` instead of (only)
                on width.
                  - isAndroidApp === true  → this row (and the matching CTA
                    row + hamburger trigger below) is unconditionally
                    `hidden` / `flex`. The desktop row can never render
                    inside the app, on any tablet, in any orientation — so
                    it can never be the thing that's overflowing/clipped
                    there. This is what actually fixes the original tablet
                    bug, permanently, with no width math involved.
                  - isAndroidApp === false (the public website) → back to
                    the original `lg` (1024px) breakpoint, which is safe
                    again now that it only ever has to serve real browser
                    windows. It was never really the breakpoint's fault:
                    the paired classes below it (space-x-3 → xl:space-x-5,
                    hidden → xl:inline on the CTA button labels) were
                    already designed to compact this row — tight gaps and
                    icon-only buttons from 1024–1279px, full spacing and
                    labels from 1280px up. That tiering only stopped
                    working when a later fix moved the outer show/hide
                    threshold up without moving those inner ones with it.
                justify-end is kept exactly as it was before — that's the
                intentional design (nav sitting close to the right-hand
                controls) — don't change it. If the website row is ever
                reported as clipped again, the fix is to compact it further
                (smaller gaps, icon-only buttons over a wider range) or
                raise ONLY the website's `lg`, never by reintroducing a
                single breakpoint that also gates the app. */}
            <div
              className={`${isAndroidApp ? "hidden" : "hidden lg:flex"} items-center space-x-3 xl:space-x-5 flex-1 min-w-0 justify-end overflow-x-auto no-scrollbar pr-3 xl:pr-4`}
              id="desktop-menu"
            >
              {navItems.map((item) => (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => { gaNavClick(item.id, "desktop_nav"); onNavigate(item.id); }}
                  className={`relative text-[13px] font-semibold tracking-wide transition-colors duration-200 outline-none hover:text-white whitespace-nowrap ${
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
            <div className={`${isAndroidApp ? "hidden" : "hidden lg:flex"} items-center space-x-2.5 xl:space-x-3.5 shrink-0`}>
              {/* Preference & Account Utilities Capsule */}
              <div className="flex items-center space-x-1 bg-white/5 border border-white/10 p-1 rounded-full backdrop-blur-md h-10">
                {/* Language Selector Selector */}
                <div className="relative">
                  <button
                    id="lang-selector-btn"
                    onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                    className="flex items-center space-x-1 text-[13px] font-semibold px-1.5 py-1 rounded-full text-white/90 hover:bg-white/10 hover:text-white transition-all outline-none h-7 whitespace-nowrap"
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
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsLangDropdownOpen(false)}
                      />
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
                    </>
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
                    <span className="absolute -top-1 -right-1 bg-[#FFB347] text-[#021816] text-[11px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(255,179,71,0.5)]">
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
                  className={`flex items-center space-x-1 px-2 py-1 rounded-full text-[13px] font-semibold transition-all outline-none border h-7 ${
                    isLoggedIn
                      ? "bg-[#0F766E] text-white border-[#FFB347] shadow-[0_0_10px_rgba(20,184,166,0.3)]"
                      : "border-transparent text-white/90 hover:bg-white/10"
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-[#5EEAD4] shrink-0" />
                  <span className="max-w-[110px] truncate whitespace-nowrap">
                    {isLoggedIn ? userProfileName || "Devotee" : t.navDashboard}
                  </span>
                </button>
              </div>

              {/* Action CTA Buttons */}
              <div className="flex items-center space-x-2.5">
                <button
                  id="nav-sponsor"
                  onClick={() => {
                    gaNavClick("sponsor", "navbar");
                    onOpenSevaModal();
                  }}
                  aria-label="Sponsor"
                  title="Sponsor"
                  className="flex bg-gradient-to-r from-[#B45309] to-[#EA580C] hover:from-[#D97706] hover:to-[#F97316] text-white text-[13px] font-bold uppercase tracking-wide px-2.5 xl:px-3 py-2 rounded-full border border-[#FCD34D]/40 transition-all duration-300 items-center space-x-1 hover:scale-105 h-9 outline-none cursor-pointer whitespace-nowrap shadow-[0_0_10px_rgba(234,88,12,0.35)] hover:shadow-[0_0_16px_rgba(249,115,22,0.55)]"
                >
                  <HeartHandshake className="w-3.5 h-3.5 text-[#FCD34D]" />
                  <span className="hidden xl:inline">Sponsor</span>
                </button>
                <button
                  id="nav-counselling"
                  onClick={() => {
                    gaNavClick("counselling", "navbar");
                    onNavigate("counselling");
                  }}
                  aria-label="Counselling"
                  title="Counselling"
                  className="flex bg-gradient-to-r from-[#3730A3] to-[#4C1D95] hover:from-[#4338CA] hover:to-[#5B21B6] text-white text-[13px] font-bold uppercase tracking-wide px-2.5 xl:px-3 py-2 rounded-full border border-[#A5B4FC]/40 transition-all duration-300 items-center space-x-1 hover:scale-105 h-9 outline-none cursor-pointer whitespace-nowrap shadow-[0_0_10px_rgba(99,102,241,0.35)] hover:shadow-[0_0_16px_rgba(129,140,248,0.55)]"
                >
                  <Compass className="w-3.5 h-3.5 text-[#C7D2FE]" />
                  <span className="hidden xl:inline">Counselling</span>
                </button>
                {!isAndroidApp && (
                  <a
                    id="nav-play-store"
                    href={PLAY_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => gaAppDownloadClick("play_store", "navbar")}
                    className="flex bg-white/5 hover:bg-white/10 text-white text-[13px] font-bold uppercase tracking-wide px-2.5 py-2 rounded-full border border-white/15 hover:border-[#5EEAD4]/40 transition-all duration-300 items-center space-x-1 hover:scale-105 h-9 outline-none cursor-pointer whitespace-nowrap"
                    aria-label="Get Sri Dwar on Google Play"
                    title="Get Sri Dwar on Google Play"
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" className="shrink-0">
                      <path fill="#4285F4" d="M4,3.6 L12.8,8.2 L9.9,11.2 Z" />
                      <path fill="#EA4335" d="M12.8,8.2 L20,12 L9.9,11.2 Z" />
                      <path fill="#FBBC04" d="M20,12 L12.8,15.8 L9.9,11.2 Z" />
                      <path fill="#34A853" d="M12.8,15.8 L4,20.4 L9.9,11.2 Z" />
                    </svg>
                    <span className="hidden xl:inline">Get the App</span>
                  </a>
                )}
                <button
                  id="nav-add-temple"
                  onClick={() => {
                    gaNavClick("add-temple", "navbar");
                    onNavigate("add-temple");
                  }}
                  aria-label="Add Temple"
                  title="Add Temple"
                  className="bg-gradient-to-r from-[#9F1239] to-[#BE123C] hover:from-[#BE123C] hover:to-[#E11D48] text-white text-[13px] font-bold uppercase tracking-wide px-2.5 xl:px-3 py-2 rounded-full border border-[#FDA4AF]/40 transition-all duration-300 flex items-center space-x-1 hover:scale-105 h-9 outline-none cursor-pointer whitespace-nowrap shadow-[0_0_10px_rgba(190,18,60,0.35)] hover:shadow-[0_0_16px_rgba(225,29,72,0.55)]"
                >
                  <Landmark className="w-3.5 h-3.5 text-[#FDA4AF]" />
                  <span className="hidden xl:inline">Add Temple</span>
                </button>
              </div>
            </div>

            {/* Mobile Hamburger Trigger */}
            <div className={isAndroidApp ? "flex items-center space-x-3" : "lg:hidden flex items-center space-x-3"}>
              {/* Cart Mobile */}
              <button
                id="mobile-cart-trigger"
                onClick={onOpenCart}
                className="relative p-2 rounded-full text-white hover:bg-white/10"
              >
                <ShoppingBasket className="w-5.5 h-5.5" />
                {totalCartItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#FFB347] text-[#021816] text-[11px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {totalCartItems}
                  </span>
                )}
              </button>

              <button
                id="hamburger-menu-trigger"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-drawer-overlay"
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
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-[200] bg-[#021816]/70 backdrop-blur-md flex justify-end animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-4/5 max-w-sm bg-[#04201e] border-l border-white/10 h-full shadow-2xl flex flex-col animate-slideLeft text-white overflow-hidden"
          >
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
                  aria-label="Close menu"
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
                  id="mobile-sponsor-btn"
                  onClick={() => {
                    gaNavClick("sponsor", "mobile_nav");
                    onOpenSevaModal();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-gradient-to-r from-[#B45309] to-[#EA580C] hover:from-[#D97706] hover:to-[#F97316] text-white text-xs font-black uppercase tracking-widest py-3 rounded-xl flex items-center justify-center space-x-2 border border-[#FCD34D]/40 shadow-[0_0_12px_rgba(234,88,12,0.35)] hover:scale-[1.02] transition-all"
                >
                  <HeartHandshake className="w-4 h-4 text-[#FCD34D]" />
                  <span>Sponsor</span>
                </button>

                <button
                  id="mobile-counselling-btn"
                  onClick={() => {
                    gaNavClick("counselling", "mobile_nav");
                    onNavigate("counselling");
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-gradient-to-r from-[#3730A3] to-[#4C1D95] hover:from-[#4338CA] hover:to-[#5B21B6] text-white text-xs font-black uppercase tracking-widest py-3 rounded-xl flex items-center justify-center space-x-2 border border-[#A5B4FC]/40 shadow-[0_0_12px_rgba(99,102,241,0.35)] hover:scale-[1.02] transition-all"
                >
                  <Compass className="w-4 h-4 text-[#C7D2FE]" />
                  <span>Counselling</span>
                </button>

                {!isAndroidApp && (
                  <a
                    id="mobile-play-store-btn"
                    href={PLAY_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      gaAppDownloadClick("play_store", "mobile_nav");
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-black uppercase tracking-widest py-3 rounded-xl flex items-center justify-center space-x-2 transition-all"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" className="shrink-0">
                      <path fill="#4285F4" d="M4,3.6 L12.8,8.2 L9.9,11.2 Z" />
                      <path fill="#EA4335" d="M12.8,8.2 L20,12 L9.9,11.2 Z" />
                      <path fill="#FBBC04" d="M20,12 L12.8,15.8 L9.9,11.2 Z" />
                      <path fill="#34A853" d="M12.8,15.8 L4,20.4 L9.9,11.2 Z" />
                    </svg>
                    <span>Get the App on Google Play</span>
                  </a>
                )}

                <button
                  id="mobile-add-temple-btn"
                  onClick={() => {
                    gaNavClick("add-temple", "mobile_nav");
                    onNavigate("add-temple");
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-gradient-to-r from-[#9F1239] to-[#BE123C] hover:from-[#BE123C] hover:to-[#E11D48] text-white text-xs font-black uppercase tracking-widest py-3 rounded-xl flex items-center justify-center space-x-2 border border-[#FDA4AF]/40 shadow-[0_0_12px_rgba(190,18,60,0.35)] hover:scale-[1.02] transition-all"
                >
                  <Landmark className="w-4 h-4 text-[#FDA4AF]" />
                  <span>Add Temple</span>
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

              <div id="mobile-drawer-socials" className="grid grid-cols-4 sm:grid-cols-7 gap-y-3 gap-x-2 text-center">
                <a
                  href="https://www.linkedin.com/company/sri-dwar"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  title="LinkedIn"
                  className="flex items-center justify-center p-2 rounded-lg bg-white/5 text-[#5EEAD4] hover:bg-white/10 hover:text-white"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
                <a
                  href="https://www.instagram.com/sri_dwar/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  title="Instagram"
                  className="flex items-center justify-center p-2 rounded-lg bg-white/5 text-[#FFB347] hover:bg-white/10 hover:text-white"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href="https://www.youtube.com/@SriDwar"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  title="YouTube"
                  className="flex items-center justify-center p-2 rounded-lg bg-white/5 text-red-400 hover:bg-white/10 hover:text-white"
                >
                  <Youtube className="w-4 h-4" />
                </a>
                <a
                  href="https://x.com/Sri_Dwar"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Twitter / X"
                  title="Twitter / X"
                  className="flex items-center justify-center p-2 rounded-lg bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                >
                  <Twitter className="w-4 h-4" />
                </a>
                <a
                  href="https://wa.me/message/325QR2O5II3IH1"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  title="WhatsApp"
                  className="flex items-center justify-center p-2 rounded-lg bg-white/5 text-emerald-400 hover:bg-white/10 hover:text-white"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
                <a
                  href="https://www.facebook.com/sridwar"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  title="Facebook"
                  className="flex items-center justify-center p-2 rounded-lg bg-white/5 text-blue-400 hover:bg-white/10 hover:text-white"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a
                  href="https://mail.google.com/mail/?view=cm&to=puja@sridwar.com&su=Sri%20Dwar%20Inquiry"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Email Us"
                  title="Email: puja@sridwar.com"
                  className="flex items-center justify-center p-2 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <Mail className="w-4 h-4" />
                </a>
              </div>
              <p className="text-[11px] text-white/40 mt-4 text-center">
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
