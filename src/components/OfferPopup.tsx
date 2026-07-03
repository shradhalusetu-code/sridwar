/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * OfferPopup.tsx — Sri Dwar
 * "Setu Yatra Challenge" — promotional popup encouraging devotees to add
 * temples, puja mandals/committees, priests/dharmic experts, and themselves
 * to the Sri Dwar directory, in exchange for an acknowledgement and a
 * chance to win a fully-covered Yatra.
 *
 * Wiring: controlled via isOpen/onClose props. App.tsx owns the open/close
 * state. The popup is now triggered by the hero CTA button, not auto-shown.
 *
 * EDITING THIS CAMPAIGN
 *   - CAMPAIGN_END: update to your real closing date/time (IST).
 *   - Yatra options / copy: edit the REWARD_LINES array and headline below.
 *   - To re-show this popup for a FUTURE campaign after people have already
 *     dismissed this one, bump OFFER_POPUP_STORAGE_KEY in App.tsx.
 */

import { useEffect, useState } from "react";
import { X, Flame, Landmark, Users, Sparkles, Check, MessageCircle } from "lucide-react";
import { gaEvent } from "../utils/analytics";
import SriDwarLogo from "./SriDwarLogo";

interface OfferPopupProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when the user picks a CTA destination — navigate in-app without a page reload. */
  onNavigate: (page: string) => void;
  /** The same storage key used in App.tsx so clicking a CTA also suppresses future shows. */
  storageKey?: string;
}

// EDIT ME — set this to your real campaign closing date/time (IST).
const CAMPAIGN_END = new Date("2026-08-31T23:59:59+05:30");

const WHATSAPP_NUMBER = "919777645062";

const REWARD_LINES = [
  "A personal acknowledgement for every valid entry you submit",
  "Top contributors win a fully-covered 1-week Yatra",
  "The No. 1 contributor wins the Grand Prize — All India Yatra",
];


function formatCountdown(diffMs: number): string {
  if (diffMs <= 0) return "Offer closed";
  const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const h = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const m = Math.floor((diffMs / (1000 * 60)) % 60);
  return `${d}d ${h}h ${m}m`;
}

export default function OfferPopup({ isOpen, onClose, onNavigate, storageKey }: OfferPopupProps) {
  const [countdown, setCountdown] = useState<string>(() =>
    formatCountdown(CAMPAIGN_END.getTime() - Date.now())
  );

  // Tick the countdown every minute while the popup is open.
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setCountdown(formatCountdown(CAMPAIGN_END.getTime() - Date.now()));
    }, 60000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Fire one GA event the moment the popup is actually shown to the devotee.
  useEffect(() => {
    if (isOpen) {
      gaEvent("offer_popup_shown", { campaign: "setu_yatra_challenge" });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const goTo = (page: string, label: string) => {
    gaEvent("offer_popup_cta_click", { campaign: "setu_yatra_challenge", destination: label });
    // Mark as dismissed BEFORE navigating so the popup never re-appears
    // even if the user presses back or the page reloads on the same origin.
    if (storageKey) {
      try { localStorage.setItem(storageKey, "1"); } catch (_) { /* storage blocked */ }
    }
    onClose();

    if (page === "temple-register") {
      // This is a real top-level page App.tsx knows how to render.
      onNavigate(page);
      return;
    }

    // "dharmic-expert-register" and "devotee-register" aren't top-level
    // pages — they're sections/steps INSIDE the Dharmic Expert registration
    // block that lives on the homepage. Navigate home, then tell that block
    // (via a lightweight event, since it isn't lifted into App state) which
    // sub-flow to open.
    onNavigate("home");
    window.dispatchEvent(new CustomEvent("sridwar:open-registration", { detail: { page } }));
  };

  const confirmOnWhatsApp = () => {
    gaEvent("offer_popup_cta_click", { campaign: "setu_yatra_challenge", destination: "whatsapp_confirm" });
    const message = encodeURIComponent(
      "🙏 Setu Yatra Challenge entry — I just added a Temple/Priest/My Profile on Sri Dwar.\n\nMy name: \nMy phone number: "
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
  };

  const handleClose = () => {
    gaEvent("offer_popup_dismissed", { campaign: "setu_yatra_challenge" });
    onClose();
  };

  return (
    <div
      id="offer-popup-modal"
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4 animate-fadeIn text-left"
      style={{ touchAction: "pan-y" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="bg-[#092320] border border-white/15 w-full sm:rounded-3xl sm:max-w-xl shadow-2xl animate-slideUp text-white flex flex-col"
        style={{ maxHeight: "95%" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="shrink-0 bg-[#021816] text-white px-6 py-5 flex items-center justify-between border-b border-white/10 sm:rounded-t-3xl">
          <div className="flex items-center space-x-3">
            {/* Brand logo */}
            <SriDwarLogo variant="colored" iconSize="sm" showTagline={false} />
            <div className="h-6 w-px bg-white/20" aria-hidden="true" />
            <div className="flex items-center space-x-2">
              <Flame className="w-5 h-5 text-[#FFB347] animate-pulse shrink-0" />
              <div className="text-left">
                <h3 className="font-serif text-base font-bold text-white leading-tight">Setu Yatra Challenge</h3>
                <p className="text-[11px] font-mono text-[#FFB347] uppercase tracking-wide">Limited-Time Seva Opportunity</p>
              </div>
            </div>
          </div>
          <button
            id="close-offer-popup"
            onClick={handleClose}
            aria-label="Close"
            className="text-white hover:text-[#FFB347] p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          className="flex-1 min-h-0 overflow-y-auto"
          style={{ WebkitOverflowScrolling: "touch", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 32px)" }}
        >
          <div className="p-6 space-y-5">
            <h4 className="font-serif text-2xl font-bold leading-snug text-white">
              Help Us Build India's Sacred Directory.{" "}
              <span className="text-[#FFB347]">Earn a Free Yatra.</span>
            </h4>

            <p className="text-sm text-white/70 leading-relaxed">
              Every temple, puja mandal, priest, and devotee you add brings Sanatan Dharma one step
              closer to every home. Don't miss this chance — act now while this challenge is live.
            </p>

            {/* 3 category CTAs */}
            <div className="space-y-3">
              {/* Temple CTA — teal/cyan */}
              <button
                id="offer-cta-temple"
                onClick={() => goTo("temple-register", "temple_register")}
                className="w-full flex items-center space-x-4 p-4 rounded-2xl bg-[#0D3D38] border border-[#14B8A6]/40 hover:bg-[#0F4D47] hover:border-[#14B8A6] transition-all text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-[#14B8A6]/20 flex items-center justify-center shrink-0">
                  <Landmark className="w-5 h-5 text-[#14B8A6]" />
                </div>
                <div>
                  <span className="block font-bold text-sm text-white">Add a Temple / Puja Committee</span>
                  <span className="block text-xs text-white/50 mt-0.5">Temples, puja mandals & committees</span>
                </div>
              </button>

              {/* Priest CTA — violet/purple */}
              <button
                id="offer-cta-expert"
                onClick={() => goTo("dharmic-expert-register", "dharmic_expert_register")}
                className="w-full flex items-center space-x-4 p-4 rounded-2xl bg-[#2D1B5E]/60 border border-[#A78BFA]/30 hover:bg-[#3D2070]/60 hover:border-[#A78BFA] transition-all text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-[#A78BFA]/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-[#A78BFA]" />
                </div>
                <div>
                  <span className="block font-bold text-sm text-white">Add a Priest / Dharmic Expert</span>
                  <span className="block text-xs text-white/50 mt-0.5">Pandits, Acharyas, Astrologers & more</span>
                </div>
              </button>

              {/* Devotee CTA — rose/pink */}
              <button
                id="offer-cta-devotee"
                onClick={() => goTo("devotee-register", "devotee_register")}
                className="w-full flex items-center space-x-4 p-4 rounded-2xl bg-[#4C1D31]/60 border border-[#FB7185]/30 hover:bg-[#5D1E38]/60 hover:border-[#FB7185] transition-all text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-[#FB7185]/20 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-[#FB7185]" />
                </div>
                <div>
                  <span className="block font-bold text-sm text-white">Add Myself as a Devotee</span>
                  <span className="block text-xs text-white/50 mt-0.5">Get your own Sri Dwar Dharmic ID</span>
                </div>
              </button>
            </div>

            {/* Rewards box */}
            <div className="bg-[#021816]/80 border border-[#FFB347]/20 rounded-2xl p-5 space-y-3">
              <span className="block text-[11px] font-mono font-bold text-[#FFB347] uppercase tracking-widest">
                🏆 Your Rewards
              </span>
              {REWARD_LINES.map((line, idx) => (
                <div key={idx} className="flex items-start space-x-2.5 text-sm text-white/85">
                  <Check className="w-4 h-4 text-[#FFB347] mt-0.5 shrink-0" />
                  <span>{line}</span>
                </div>
              ))}
            </div>

            {/* Already submitted? confirm for credit */}
            <button
              id="offer-cta-whatsapp-confirm"
              onClick={confirmOnWhatsApp}
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl border border-white/15 text-white/75 hover:text-white hover:border-white/30 transition-all text-xs"
            >
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
              <span>Already added someone? Confirm on WhatsApp for credit</span>
            </button>

            <div className="flex items-center justify-between pt-1 border-t border-white/10">
              <span className="text-[11px] font-mono text-white/40">
                Offer closes in: <span className="text-[#FF9933] font-bold">{countdown}</span>
              </span>
              <button
                onClick={handleClose}
                className="text-[11px] text-white/40 underline hover:text-white/60 transition-colors"
              >
                Maybe later
              </button>
            </div>

            <p className="text-[9px] text-white/30 text-center">
              Entries are subject to verification. Terms & Conditions apply.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
