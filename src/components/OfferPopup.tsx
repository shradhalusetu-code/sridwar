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
 * Wiring: controlled via isOpen/onClose props, same pattern as
 * UPIPaymentModal.tsx. App.tsx owns the open/close state and decides WHEN
 * to show it (see the wiring snippet in App.tsx near isOfferPopupOpen).
 *
 * Navigation: each CTA sends the devotee to the SAME deep-link URLs your
 * own "share" buttons inside TempleRegister.tsx already generate
 * (?page=temple-register / ?page=dharmic-expert-register /
 * ?page=devotee-register). TempleRegister.tsx reads these query params in a
 * mount-only effect, so a full navigation (not a SPA state change) is the
 * correct and already-proven way to land a user directly on the right
 * section/step — this is intentional, not a workaround.
 *
 * EDITING THIS CAMPAIGN
 *   - CAMPAIGN_END: update to your real closing date/time (IST).
 *   - Yatra options / copy: edit the REWARD_LINES array and headline below.
 *   - To re-show this popup for a FUTURE campaign after people have already
 *     dismissed this one, bump OFFER_POPUP_STORAGE_KEY in App.tsx (see the
 *     comment there) — no changes needed in this file.
 */

import { useEffect, useState } from "react";
import { X, Flame, Landmark, Users, Sparkles, Check, MessageCircle } from "lucide-react";
import { gaEvent } from "../utils/analytics";
import SriDwarLogo from "./SriDwarLogo";

interface OfferPopupProps {
  isOpen: boolean;
  onClose: () => void;
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

function buildDeepLink(page: string): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?page=${page}`;
}

function formatCountdown(diffMs: number): string {
  if (diffMs <= 0) return "Offer closed";
  const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const h = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const m = Math.floor((diffMs / (1000 * 60)) % 60);
  return `${d}d ${h}h ${m}m`;
}

export default function OfferPopup({ isOpen, onClose, storageKey }: OfferPopupProps) {
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
    // Small tick lets React flush the close before the navigation fires.
    setTimeout(() => { window.location.href = buildDeepLink(page); }, 0);
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
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col justify-end sm:justify-center sm:items-center sm:p-4 animate-fadeIn text-left"
      style={{ touchAction: "pan-y" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="bg-[#092320] border border-white/15 w-full sm:rounded-3xl sm:max-w-md shadow-2xl animate-slideUp text-white flex flex-col"
        style={{ maxHeight: "100dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="shrink-0 bg-[#021816] text-white px-5 py-4 flex items-center justify-between border-b border-white/10 sm:rounded-t-3xl">
          <div className="flex items-center space-x-3">
            {/* Brand logo — same component used in the main nav */}
            <SriDwarLogo variant="colored" iconSize="sm" showTagline={false} />
            <div className="h-5 w-px bg-white/20" aria-hidden="true" />
            <div className="flex items-center space-x-1.5">
              <Flame className="w-4 h-4 text-[#FFB347] animate-pulse shrink-0" />
              <div className="text-left">
                <h3 className="font-serif text-sm font-bold text-white leading-tight">Setu Yatra Challenge</h3>
                <p className="text-[10px] font-mono text-[#FFB347] uppercase tracking-wide">Limited-Time Seva Opportunity</p>
              </div>
            </div>
          </div>
          <button
            id="close-offer-popup"
            onClick={handleClose}
            aria-label="Close"
            className="text-white hover:text-[#FFB347] p-1.5 bg-white/10 rounded-full text-sm font-bold"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div
          className="flex-1 min-h-0 overflow-y-auto"
          style={{ WebkitOverflowScrolling: "touch", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 32px)" }}
        >
          <div className="p-5 space-y-4">
            <h4 className="font-serif text-xl font-bold leading-snug text-white">
              Help Us Build India's Sacred Directory.{" "}
              <span className="text-[#FFB347]">Earn a Free Yatra.</span>
            </h4>

            <p className="text-xs text-white/70 leading-relaxed">
              Every temple, puja mandal, priest, and devotee you add brings Sanatan Dharma one step
              closer to every home. Don't miss this chance — act now while this challenge is live.
            </p>

            {/* 3 category CTAs */}
            <div className="space-y-2.5">
              <button
                id="offer-cta-temple"
                onClick={() => goTo("temple-register", "temple_register")}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#5EEAD4] transition-all text-left"
              >
                <div className="flex items-center space-x-3 text-xs text-white">
                  <Landmark className="w-5 h-5 text-[#5EEAD4]" />
                  <div className="text-left">
                    <span className="block font-bold text-white">Add a Temple / Puja Committee</span>
                    <span className="block text-[10px] text-white/50">Temples, puja mandals & committees</span>
                  </div>
                </div>
              </button>

              <button
                id="offer-cta-expert"
                onClick={() => goTo("dharmic-expert-register", "dharmic_expert_register")}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#5EEAD4] transition-all text-left"
              >
                <div className="flex items-center space-x-3 text-xs text-white">
                  <Sparkles className="w-5 h-5 text-[#5EEAD4]" />
                  <div className="text-left">
                    <span className="block font-bold text-white">Add a Priest / Dharmic Expert</span>
                    <span className="block text-[10px] text-white/50">Pandits, Acharyas, Astrologers & more</span>
                  </div>
                </div>
              </button>

              <button
                id="offer-cta-devotee"
                onClick={() => goTo("devotee-register", "devotee_register")}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#5EEAD4] transition-all text-left"
              >
                <div className="flex items-center space-x-3 text-xs text-white">
                  <Users className="w-5 h-5 text-[#5EEAD4]" />
                  <div className="text-left">
                    <span className="block font-bold text-white">Add Myself as a Devotee</span>
                    <span className="block text-[10px] text-white/50">Get your own Sri Dwar Dharmic ID</span>
                  </div>
                </div>
              </button>
            </div>

            {/* Rewards box */}
            <div className="bg-[#021816]/60 border border-white/10 rounded-2xl p-4 space-y-2">
              <span className="block text-[10px] font-mono font-bold text-[#5EEAD4] uppercase tracking-widest">
                Your Rewards
              </span>
              {REWARD_LINES.map((line, idx) => (
                <div key={idx} className="flex items-start space-x-2 text-xs text-white/85">
                  <Check className="w-3.5 h-3.5 text-[#FFB347] mt-0.5 shrink-0" />
                  <span>{line}</span>
                </div>
              ))}
            </div>

            {/* Already submitted? confirm for credit */}
            <button
              id="offer-cta-whatsapp-confirm"
              onClick={confirmOnWhatsApp}
              className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl border border-white/15 text-white/75 hover:text-white hover:border-white/30 transition-all text-[11px]"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#5EEAD4]" />
              <span>Already added someone? Confirm on WhatsApp for credit</span>
            </button>

            <div className="flex items-center justify-between pt-1 border-t border-white/10 mt-1">
              <span className="text-[10px] font-mono text-white/40">
                Offer closes in: <span className="text-[#FF9933] font-bold">{countdown}</span>
              </span>
              <button
                onClick={handleClose}
                className="text-[10px] text-white/40 underline hover:text-white/60"
              >
                Maybe later
              </button>
            </div>

            <p className="text-[9px] text-white/30 text-center pt-1">
              Entries are subject to verification. Terms & Conditions apply.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
