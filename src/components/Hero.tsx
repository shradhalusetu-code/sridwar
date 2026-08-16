/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from "react";
import { BookOpen, ChevronRight, Check, Heart, ShieldCheck, Database, RefreshCw } from "lucide-react";
import { Language } from "../data/translations";
import SacredIcon from "./SacredIcon";
import SriDwarLogo from "./SriDwarLogo";
import { syncToGoogleForm, makeSubmissionRef } from "../utils/googleFormSync";
import { recordFormSubmission, recordActivity } from "../lib/activities";
import UPIPaymentModal from "./UPIPaymentModal";
import { getDevotionalConfirmation, downloadConfirmationMessage } from "../utils/devotionalMessages";
import { validateName, validateEmail, validatePhone, validateAge } from "../utils/formValidation";
import { TEMPLES_LIST } from "../data/temples";
import { gaContactFormStart, gaContactFormSubmit } from "../utils/analytics";
import { registerBackHandler, unregisterBackHandler } from "../utils/backHandlerStack";
import OptimizedImage from "./OptimizedImage";
// @ts-ignore
import aerialJagannathPuri from "../assets/images/aerial_jagannath_puri_hero_1781871848760.jpg";
// @ts-ignore
import aerialJagannathPuriWebp from "../assets/images/aerial_jagannath_puri_hero_1781871848760.webp";

interface HeroProps {
  currentLanguage: Language;
  isAndroidApp?: boolean;
  onNavigate: (page: string) => void;
}

export default function Hero({ currentLanguage, isAndroidApp = false, onNavigate }: HeroProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Register with the shared Back-button trap while the Darshan Certificate
  // modal is open, so pressing Back (browser or Android hardware) closes
  // the modal / returns to the homepage instead of exiting the site.
  useEffect(() => {
    const id = "hero-darshan-certificate-modal";
    if (isModalOpen) {
      registerBackHandler(id, () => setIsModalOpen(false));
    } else {
      unregisterBackHandler(id);
    }
    return () => unregisterBackHandler(id);
  }, [isModalOpen]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Form fields
  const [name, setName] = useState("");
  const [temple, setTemple] = useState("");
  const [age, setAge] = useState("");
  const [deity, setDeity] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [feedback, setFeedback] = useState("");
  const [membershipTier, setMembershipTier] = useState<number | null>(null);
  const [refId, setRefId] = useState("");
  const [showUPI, setShowUPI] = useState(false);
  const [upiAmount, setUpiAmount] = useState<number | null>(null);

  const darshanConfirmation = getDevotionalConfirmation({
    category: "darshan_certificate",
    serviceName: "Darshan Certificate",
    devoteeName: name,
    refId,
  });

  const handleOpenCertificateModal = () => {
    setIsModalOpen(true);
    setIsSubmitted(false);
    setMembershipTier(null);
  };

  // Allow other parts of the app (e.g. the footer's "Darshan Certificate"
  // link, which lives outside this component) to open the Sri Dwar Darshan
  // Register modal by dispatching a global event after navigating home.
  useEffect(() => {
    const openFromEvent = () => handleOpenCertificateModal();
    window.addEventListener("sd-open-darshan-register", openFromEvent);
    return () => window.removeEventListener("sd-open-darshan-register", openFromEvent);
  }, []);

  // ── Submit Certificate Request — fires ONE row immediately. If the devotee
  // picked a divine contribution tier, the row is recorded as "Pending — Awaiting
  // Decision" (not the tier amount) until payment is actually confirmed —
  // see handleDarshanPaymentConfirmed below. If no tier was picked ("Skip
  // for Now"), that's already a final decision, so it's recorded as
  // "Skipped" right away with no further row needed. ──
  const handleSubmitCertificate = async (e: FormEvent) => {
    e.preventDefault();

    // ── Global validation ──────────────────────────────────────────────────
    const nameErr  = validateName(name);
    const emailErr = validateEmail(email);
    const phoneErr = validatePhone(phone);
    const ageErr   = age ? validateAge(age, false) : null;

    if (nameErr)  { alert(nameErr);  return; }
    if (!temple)  { alert("Please select the temple you visited."); return; }
    if (emailErr) { alert(emailErr); return; }
    if (phoneErr) { alert(phoneErr); return; }
    if (!city.trim() || city.trim().length < 2) { alert("Please enter your city."); return; }
    if (ageErr)   { alert(ageErr);   return; }
    // ──────────────────────────────────────────────────────────────────────

    setIsSubmitting(true);
    const newRefId = makeSubmissionRef("CERT");
    setRefId(newRefId);
    const contributionStatus = membershipTier ? "Pending — Awaiting Decision" : "Skipped";

    try {
      await syncToGoogleForm("darshan_certificate", {
        name,
        email,
        phone,
        details: `Temple: ${temple} | Age: ${age || 'N/A'} | Deity: ${deity || 'N/A'} | City: ${city} | Contribution: ${contributionStatus} | Feedback: ${feedback || 'None'} | Ref: ${newRefId}`,
        type: "Darshan Certificate Request",
        temple,
        age: age || undefined,
        deity,
        whatsapp,
        city,
        feedback,
        contribution: contributionStatus,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
      setIsSubmitted(true);
      gaContactFormSubmit(!!phone);
      recordFormSubmission({
        formType: "darshan_certificate",
        name, email, phone, refId: newRefId,
        payload: { temple, age, deity, city, feedback, contributionStatus },
      });
      // ✅ Show UPI if user selected a divine contribution tier
      if (membershipTier) {
        setUpiAmount(membershipTier);
        setShowUPI(true);
      }
    }
  };

  // Payment confirmed — sends the ONE Final row for this certificate
  // request, with the divine contribution correctly recorded as the real amount
  // and method paid, sharing the same Ref ID as the initial submission.
  const handleDarshanPaymentConfirmed = async (details: { amount: number; method: "UPI" | "WhatsApp Pay" }) => {
    setShowUPI(false);
    try {
      await syncToGoogleForm("darshan_certificate", {
        name,
        email,
        phone,
        details: `Temple: ${temple} | Age: ${age || 'N/A'} | Deity: ${deity || 'N/A'} | City: ${city} | Contribution: ₹${details.amount} via ${details.method} | Feedback: ${feedback || 'None'} | Ref: ${refId}`,
        type: "Darshan Certificate Request",
        temple,
        age: age || undefined,
        deity,
        whatsapp,
        city,
        feedback,
        contribution: `₹${details.amount}`,
      });
    } catch (err) {
      console.error(err);
    }
    recordActivity({
      activityType: "darshan_certificate",
      itemName: `Darshan Certificate Divine Contribution — ${temple}`,
      amount: details.amount,
      refId,
      paymentMethod: details.method,
      paymentStatus: "pending_verification",
    });
  };

  return (
    <div
      id="hero-wrapper"
      className={`relative flex flex-col justify-between bg-[#021816] text-white min-h-[420px] sm:min-h-[480px] lg:min-h-[560px] ${isAndroidApp ? "pt-4 pb-6" : "pt-2 pb-4"}`}
      style={{
        // NOTE: Hero is no longer the first element on the homepage —
        // HomeCarousel renders above it and already reserves clearance for
        // the fixed navbar/status bar. Hero therefore no longer forces a
        // full-viewport minHeight; that used to leave a large empty gap
        // above and below this section on every screen where the headline
        // + CTAs don't naturally fill 100% of the viewport height.
        //
        // It still needs SOME floor height though (min-h-[...] above): with
        // no floor at all, on screens where the text content is short the
        // whole section — including the absolutely-positioned cinematic
        // background image behind it — collapses down to just the content's
        // height. Since that background uses object-cover, a too-short box
        // crops the aerial temple photo down to a thin sliver instead of
        // showing the intended wide cinematic shot, which is what made the
        // background look "compressed"/misaligned. The min-height values
        // above give the image room to render properly while still sizing
        // to content (and growing taller than the floor) whenever the
        // headline/CTAs need more room, e.g. wrapped text on narrow phones.
        // "hidden" not "clip" — overflow: clip is unsupported on older
        // Android WebView and gets ignored, letting horizontal overflow
        // through.
        overflowX: "hidden",
        touchAction: "pan-y",
      }}
    >
      
      {/* Cinematic Sacred Banner: aerial Puri Jagannath Temple feel with teal overlays and golden lighting */}
      <div
        id="hero-cinematic-bg"
        className="absolute inset-0 pointer-events-none transition-transform duration-1000 overflow-hidden"
      >
        <OptimizedImage
          src={aerialJagannathPuri}
          webpSrc={aerialJagannathPuriWebp}
          alt=""
          loading="eager"
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover object-center filter brightness-45 contrast-[1.03]"
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(2, 24, 22, 0.35), rgba(2, 24, 22, 0.8), rgba(2, 24, 22, 1))`
          }}
        />
      </div>

      {/* Floating Sparkles & Diya lights */}
      <div className="absolute top-1/4 left-10 w-24 h-24 bg-saffron/10 rounded-full filter blur-2xl animate-pulse" />
      <div className="absolute top-1/3 right-10 w-32 h-32 bg-teal-mid/10 rounded-full filter blur-2xl animate-pulse delay-700" />

      {/* Hero Central Content */}
      <div id="hero-main-container" className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-grow flex items-center z-10 pt-0">
        {/* Video + Headline layout: headline/copy first (both in the DOM and
            visually) so the temple background and the message are what a
            visitor sees first — the video is a smaller supporting element,
            not the dominant one. Stacked (text above video) on mobile;
            text-left / video-right from md up. Vertically centered
            (items-center) so the text block sits in the visual middle of
            the tall 9:16 video next to it — this is intentional now that
            the headline is a shorter, smaller three-line block (it was
            top-aligned earlier specifically to fix the old, much larger
            two-line headline overpowering the row when centered; the
            smaller size no longer has that problem, and centered reads
            better next to a tall media block, matching the pattern most
            hero-with-video sections use). */}
        <div className="w-full grid grid-cols-1 md:grid-cols-[1fr_260px] lg:grid-cols-[1fr_300px] items-center gap-8 md:gap-12 lg:gap-16">

          {/* Headline and Copy — spacing below is now set explicitly on each
              piece (h1 top margin, the line-group gap inside h1, and the
              p's top margin) instead of the previous flex "space-y-*" on
              this wrapper. space-y applies one uniform gap between every
              child via a ">*+*" selector, which is higher-specificity than
              a plain margin-top utility on the child itself — so it was
              overriding any per-line spacing tweak. Removing it here is
              what makes the three distinct gaps below actually take
              effect. */}
          <div className="flex flex-col items-center md:items-start max-w-4xl mx-auto md:mx-0 text-center md:text-left">

            {/* Headline — single line on Android APK; split tagline on website.
                Sized down from the site's original hero scale (was
                text-4xl/5xl/6xl) since this headline is now three lines
                instead of one or two — at the old size, three lines of
                serif type would dominate the section and crowd the video
                next to it. This size keeps it the clear focal point of the
                text column without overpowering the layout.
                Spacing: mt-3/mt-4 above the whole block gives it room to
                breathe below the video's top edge instead of sitting flush
                against it; the mt-3/mt-4 on the second line creates the
                gap between the Sanskrit line and the English two-line
                group; the two English lines stay flush against each other
                (no gap) since they read as one continuous thought.
                Devanagari note: the site's serif heading font (Lora) doesn't
                include Devanagari glyphs, so "पत्रं पुष्पं फलं तोयं" renders
                in the browser's default fallback font rather than Lora —
                still fully legible, just not the same serif style as the
                English lines beside it. Flagging this now in case you want
                a Devanagari-supporting font added later; nothing to fix for
                this change to work correctly today. */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black tracking-tight text-white leading-snug text-center md:text-left mt-3 sm:mt-4">
              <span className="block">पत्रं पुष्पं फलं तोयं</span>
              <span className="block mt-3 sm:mt-4">A Leaf, A Flower, Reaches the Divine.</span>
              <span className="block text-[#FFB347]">Faith needs no distance to be heard.</span>
            </h1>

            {/* Sub-headline — mt-6/7/8 gives a clearly healthier gap from
                the headline than the previous space-y-3 (12px) default,
                roughly matching the breathing room brands like this use
                between a multi-line headline and its supporting copy, and
                keeps the whole text block's total height in proportion
                with the video column beside it rather than reading as two
                cramped blocks stacked on top of each other. */}
            <p className={`text-sm sm:text-base text-white/85 font-sans font-normal leading-relaxed max-w-2xl text-center md:text-left mx-auto md:mx-0 ${isAndroidApp ? "mt-6" : "mt-6 sm:mt-7 lg:mt-8"}`}>
              Every sacred fire lit in your name, every mantra chanted for your family, every Sankalpa spoken with your Gotra — these are not transactions. They are threads that keep you tied to the temple your ancestors once walked toward. We simply help you hold that thread, from wherever you are.
            </p>
          </div>

          {/* Sri Dwar YouTube Short — sits to the RIGHT of the headline on
              md+ screens so the temple background stays visible behind and
              around the text (previously the video sat on the left, right
              where the headline began, blocking the most visible part of
              the background). Kept smaller on mobile (220px) than before
              (280–300px) so it reads as a supporting element below the
              message rather than covering most of the hero's visible
              height on small screens. Vertical 9:16 frame to match the
              Shorts format instead of letterboxing it.

              ✅ UPDATED (2026-08-16): this is the site's PRIMARY video, so
              per your instruction it now plays inline — in the website
              browser AND inside the app itself — instead of handing off to
              the YouTube app/browser. The previous "open in YouTube"
              button (Android-only) is removed; both platforms now render
              the exact same iframe below. If you add other, secondary
              videos elsewhere later, THOSE are the ones that should still
              link out to YouTube — this fix only changes the primary
              hero video.
              One real trade-off to know about, since it can't be fixed
              from website files alone: Android's WebView needs a native
              hook (WebChromeClient.onShowCustomView) to support the
              iframe player's FULLSCREEN button specifically — that
              requires editing the native Android project (not part of
              this website codebase), so tapping fullscreen inside the app
              may not expand correctly even though inline playback (what
              you actually asked for) works. If inline playback itself
              ever fails to start in the app, that's worth re-testing on a
              real device first — the last time playback looked broken
              here it turned out to be the emulator's DNS failing to
              resolve sridwar.com at all (see net::ERR_NAME_NOT_RESOLVED),
              not the video itself. */}
          <div className="w-full flex justify-center md:justify-end">
            <div className="w-full max-w-[220px] sm:max-w-[240px] md:max-w-none aspect-[9/16] rounded-3xl overflow-hidden border border-white/15 shadow-[0_10px_40px_rgba(0,0,0,0.45)] bg-black/40 shrink-0">
              <iframe
                className="w-full h-full"
                // FIX ("Error 153: Video player configuration error"): YouTube
                // requires a real Referer/Origin header to serve the embedded
                // player config. That header goes missing (triggering this
                // exact error) when: (a) the page's Referrer-Policy is
                // "no-referrer"/"same-origin", or gets stripped by a
                // strict security header, a privacy extension, or an ad
                // blocker, or (b) it's requested from an origin YouTube
                // can't verify (this is also commonly seen on
                // http://localhost during local dev for the same reason).
                // referrerPolicy="strict-origin-when-cross-origin" makes the
                // browser always send that header, and youtube-nocookie.com
                // is Google's privacy-enhanced embed domain, which is also
                // less likely to be blocked by ad blockers/extensions than
                // www.youtube.com. If this ever still shows Error 153 only
                // on localhost, that's expected (YouTube can be stricter
                // about unrecognized local origins) — verify on the real
                // sridwar.com deployment before assuming it's still broken.
                src="https://www.youtube-nocookie.com/embed/o29uNx4lg0M"
                title="Sri Dwar — A Leaf, A Flower, Reaches the Divine"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>

        </div>
      </div>

      {/* SPECIAL INTERACTIVE DARSHAN CERTIFICATE MODAL */}
      {isModalOpen && (
        <div
          id="darshan-modal-portal"
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4 animate-fadeIn"
          style={{ touchAction: "pan-y" }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div
            className="bg-[#092320] border border-white/15 w-full sm:rounded-3xl sm:max-w-xl shadow-2xl animate-slideUp text-white flex flex-col"
            style={{ maxHeight: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Modal Header */}
            <div
              className="shrink-0 bg-[#021816] text-white px-5 py-4 flex items-center justify-between border-b border-white/10 sm:rounded-t-3xl"
              style={{ paddingTop: "calc(var(--safe-area-inset-top, env(safe-area-inset-top, 24px)) + 1rem)" }}
            >
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <SriDwarLogo
                  iconSize="sm"
                  showTagline={false}
                  variant="colored"
                  useImageOnly={true}
                  className="shrink-0"
                />
                <div className="text-left min-w-0">
                  <h3 className="font-serif text-lg font-bold tracking-tight text-white leading-tight break-words">Sri Dwar Darshan Register</h3>
                  <p className="text-[12px] font-mono text-[#FFB347] uppercase break-words">Handsigned by Revered Pundits</p>
                </div>
              </div>
              <button 
                id="close-certificate-modal"
                onClick={() => setIsModalOpen(false)} 
                className="text-white hover:text-[#FFB347] p-1.5 bg-white/10 rounded-full text-sm font-bold shrink-0 ml-2 w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* ── Scrollable body — THE ONLY scroll container on Android ── */}
            <div
              className="flex-1 min-h-0 overflow-y-auto"
              style={{ WebkitOverflowScrolling: "touch", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
            >
            {/* Modal Body: Active Submission Form or Completed Message */}
            {!isSubmitted ? (
              <form onSubmit={handleSubmitCertificate} className="p-6 space-y-4">
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-xs text-[#5EEAD4]">
                  <p className="font-semibold text-left">🙏 Submitting dynamic prayers and details logs:</p>
                  <p className="text-white/70 mt-1 text-left">Fill out the form below to receive a personalized, high-resolution blessed certificate of your visit to download or print.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name field */}
                  <div className="text-left">
                    <label className="block text-xs font-bold text-white/80 mb-1">Devotee Name *</label>
                    <input
                      id="cert-form-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onFocus={() => gaContactFormStart()}
                      placeholder="e.g. Anand Satpathy"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                    />
                  </div>

                  {/* Temple dropdown select */}
                  <div className="text-left">
                    <label className="block text-xs font-bold text-white/80 mb-1">Temple Visited *</label>
                    <select
                      id="cert-form-temple"
                      required
                      value={temple}
                      onChange={(e) => setTemple(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#021816] border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white"
                    >
                      <option value="" className="bg-[#021816]">Select Temple...</option>
                      {TEMPLES_LIST.map((t) => (
                        <option key={t.id} value={t.name} className="bg-[#021816]">{t.name}</option>
                      ))}
                      <option value="Other Temple in India" className="bg-[#021816]">Other Temple — India</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Age field */}
                  <div className="text-left">
                    <label className="block text-xs font-bold text-white/80 mb-1">Age <span className="text-white/40 font-normal">(Optional · 16–100)</span></label>
                    <input
                      id="cert-form-age"
                      type="number"
                      min={16}
                      max={100}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="e.g. 34"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                    />
                  </div>

                  {/* Deity Name */}
                  <div className="text-left">
                    <label className="block text-xs font-bold text-white/80 mb-1">Deity Name</label>
                    <input
                      id="cert-form-deity"
                      type="text"
                      value={deity}
                      onChange={(e) => setDeity(e.target.value)}
                      placeholder="e.g. Shiva, Jagannath, Durga"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Phone Number - MANDATORY */}
                  <div className="text-left">
                    <label className="block text-xs font-bold text-white/80 mb-1">Phone Number * (Mandatory)</label>
                    <input
                      id="cert-form-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Mandatory mobile connection"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                    />
                  </div>

                  {/* WhatsApp Number */}
                  <div className="text-left">
                    <label className="block text-xs font-bold text-white/80 mb-1">WhatsApp Number</label>
                    <input
                      id="cert-form-whatsapp"
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="Optional WhatsApp alerts"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email - MANDATORY */}
                  <div className="text-left">
                    <label className="block text-xs font-bold text-white/80 mb-1">Email Address * (Mandatory)</label>
                    <input
                      id="cert-form-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. name@gmail.com"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                    />
                  </div>

                  {/* City */}
                  <div className="text-left">
                    <label className="block text-xs font-bold text-white/80 mb-1">Devotee City *</label>
                    <input
                      id="cert-form-city"
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Seattle, Mumbai, London"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                    />
                  </div>
                </div>

                {/* Feedback */}
                <div className="text-left">
                  <label className="block text-xs font-bold text-white/80 mb-1">Feedback/Suggestions</label>
                  <textarea
                    id="cert-form-feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={2}
                    placeholder="We appreciate any thoughts on your remote spiritual connection experience..."
                    className="w-full text-xs p-3 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-[#5EEAD4] text-white placeholder-white/35"
                  />
                </div>

                {/* Optional Darshan Membership Divine Contribution Selection */}
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <span className="block text-xs font-bold text-white/95 mb-2 text-left animate-pulse">
                    🙏 Optional Darshan Membership Divine Contribution
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      id="membership-tier-none"
                      type="button"
                      onClick={() => setMembershipTier(null)}
                      className={`text-left p-3 rounded-xl border text-xs font-medium transition-all ${
                        membershipTier === null 
                          ? "bg-white/10 border-[#5EEAD4] text-[#5EEAD4] shadow-sm" 
                          : "bg-black/20 border-white/10 text-white/70 hover:bg-black/30"
                      }`}
                    >
                      <span className="block font-bold">Skip for Now</span>
                      <span className="block text-[12px] text-white/40">Continue without support</span>
                    </button>

                    <button
                      id="membership-tier-5"
                      type="button"
                      onClick={() => setMembershipTier(5)}
                      className={`text-left p-3 rounded-xl border text-xs font-medium transition-all ${
                        membershipTier === 5 
                          ? "bg-white/10 border-[#5EEAD4] text-[#5EEAD4] shadow-sm" 
                          : "bg-black/20 border-white/10 text-white/70 hover:bg-black/30"
                      }`}
                    >
                      <span className="block font-bold text-saffron">₹5 — member</span>
                      <span className="block text-[12px] text-white/40">Supports temple logistics · auto-eligible for seasonal campaigns</span>
                    </button>

                    <button
                      id="membership-tier-51"
                      type="button"
                      onClick={() => setMembershipTier(51)}
                      className={`text-left p-3 rounded-xl border text-xs font-medium transition-all ${
                        membershipTier === 51 
                          ? "bg-white/10 border-[#5EEAD4] text-[#5EEAD4] shadow-sm" 
                          : "bg-black/20 border-white/10 text-white/70 hover:bg-black/30"
                      }`}
                    >
                      <span className="block font-bold text-[#FFB347]">₹51 — Supporter</span>
                      <span className="block text-[12px] text-white/40">Helps digitize more temples · cashback &amp; milestone rewards begin</span>
                    </button>
                  </div>
                  {/* ✅ CONTRIBUTION-BENEFITS UPDATE: brief, honest note on what
                      a ₹100+ contribution (via "Enter custom amount" if shown
                      elsewhere in this flow, or a higher preset chosen on the
                      Plans/Donate screens) adds beyond the Supporter tier —
                      kept short since the two buttons above already carry the
                      per-tier benefit copy. */}
                  {membershipTier !== null && membershipTier >= 51 && (
                    <p className="text-[11px] text-white/35 leading-snug mt-2">
                      Contributions of ₹100 or more also carry eligibility toward pilgrimage-related opportunities offered periodically to regular devotees — genuine platform benefits, not a guarantee of any outcome.
                    </p>
                  )}
                </div>

                {/* Real-time sync tracker banner representation */}
                <div className="flex items-center space-x-2 text-[12px] font-mono text-[#5EEAD4] bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                  <Database className="w-3.5 h-3.5 fill-[#5EEAD4]/20 text-[#5EEAD4]" />
                  <span>Powered by Sri Dwar Technology</span>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    id="submit-cert-form"
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-black py-3 px-6 rounded-xl text-xs transition-all tracking-widest uppercase shadow-[0_0_15px_rgba(255,179,71,0.3)] hover:scale-[1.02]"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center space-x-1">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sanctifying Details...</span>
                      </span>
                    ) : (
                      <span>SUBMIT REGISTRATION & GENERATE CERTIFICATE</span>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              // SUBMISSION CONFIRMED POPUP SCREEN
              <div className="p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-[#0F766E]/50 rounded-full flex items-center justify-center mx-auto shadow-inner border border-[#5EEAD4]/35">
                  <Check className="w-8 h-8 text-[#5EEAD4] stroke-[3]" />
                </div>

                <div className="space-y-2">
                  <h4 className="font-serif text-2xl font-bold text-[#5EEAD4]">Blessings Received!</h4>
                  <p className="text-xs text-white/50 uppercase tracking-widest font-mono">Reference ID: {refId}</p>
                </div>

                {/* Devotional confirmation copy — shared wording via devotionalMessages.ts */}
                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl text-left text-xs text-white/90 leading-relaxed shadow-sm">
                  <p className="mb-2"><strong>{darshanConfirmation.greeting}</strong></p>
                  <p className="mb-3">{darshanConfirmation.opening}</p>
                  <p className="mb-4">{darshanConfirmation.blessing}</p>
                  <div className="grid grid-cols-3 gap-2 text-center text-[12px] font-mono bg-black/40 p-3 rounded-xl border border-white/10">
                    <div>
                      <span className="block text-base">💬</span>
                      <span className="block font-bold text-emerald-400">WhatsApp</span>
                    </div>
                    <div>
                      <span className="block text-base">✉️</span>
                      <span className="block font-bold text-[#5EEAD4]">Email</span>
                    </div>
                    <div>
                      <span className="block text-base">⏱</span>
                      <span className="block font-bold text-[#FFB347]">3–7 Days</span>
                    </div>
                  </div>
                </div>

                {/* Google Forms Drive Sync report log representation */}
                <div className="flex items-center justify-center space-x-1.5 text-[12px] font-mono text-emerald-400 bg-emerald-950/40 py-2 rounded-xl border border-emerald-900/40">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Powered by Sri Dwar Technology</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    id="download-confirmation-message"
                    onClick={() => downloadConfirmationMessage({
                      category: "darshan_certificate",
                      serviceName: "Darshan Certificate",
                      devoteeName: name,
                      refId,
                    })}
                    className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl text-xs transition-all tracking-wider flex items-center justify-center space-x-1.5 shadow border border-white/10"
                  >
                    <span>📩</span>
                    <span>Download Confirmation</span>
                  </button>
                  <button
                    id="close-confirmation-modal"
                    onClick={() => setIsModalOpen(false)}
                    className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-bold py-3 rounded-xl text-xs transition-all tracking-wider shadow"
                  >
                    🙏 Jai Jagannath — Close
                  </button>
                </div>
              </div>
            )}

            </div>
          </div>
        </div>
      )}

    {/* UPI Payment Modal for Darshan Certificate divine contribution */}
    <UPIPaymentModal
      isOpen={showUPI}
      onClose={() => setShowUPI(false)}
      onPaymentConfirmed={handleDarshanPaymentConfirmed}
      amount={upiAmount}
      bookingName="Darshan Certificate Divine Contribution"
      devoteeName={name}
      refId={refId}
    />
    </div>
  );
}
