/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useRef, useEffect, ElementType } from "react";
import { ON_LINE_PUJAS } from "../data/spiritualData";
import type { Puja } from "../types";
import { getPriestByDetails, getPriestById, getPriestsByKeywords } from "../data/priests";
import { TEMPLES_LIST } from "../data/temples";
import { SEVA_OCCASIONS } from "../data/sevaOfferings";
import {
  ShieldAlert, Heart, Briefcase, Award, TrendingUp, Sparkles,
  CheckCircle2, Video, Clock, ChevronDown, ChevronUp, X, UserCircle2,
  Flame, ShieldCheck, BadgeCheck, Check, AlertCircle
} from "lucide-react";
import SacredIcon from "./SacredIcon";
import OptimizedImage from "./OptimizedImage";
import { gaCategoryFilter, gaBookNowOpen } from "../utils/analytics";
import { getDiscountedPrice, isDiscountPromoVisible, DISCOUNT_TAG } from "../utils/discount";
import { useSingleOpen } from "./shared/useSingleOpen";
import MobileCarousel from "./shared/MobileCarousel";
import { validatePincode, validateBookingDate, getMinBookableDateISO } from "../utils/formValidation";
import { sectionTopPadding } from "../utils/androidSpacing";

// ─────────────────────────────────────────────────────────────────────────
// "Simple Pujas" — affordable, structured puja booking tier system.
// Added as a self-contained data model + card component (same pattern as
// SEVA_OFFERINGS / SevaOfferingCard used in the Seva Hub & Live Devotional
// Dashboard), kept inside this file so this section can be booked, synced,
// and reused without touching any other component or route.
// ─────────────────────────────────────────────────────────────────────────

interface SimplePujaPriceOption {
  /** Rupee amount for this tier, or "custom" to reveal the custom-amount input. */
  value: number | "custom";
  label: string;
}

// The five numeric tiers every Simple Puja's amount selector is built from
// (₹100 → ₹2,100+), same amounts used across Structured Seva Offerings so
// pricing stays consistent site-wide. Each puja supplies its OWN label per
// tier (via buildSimplePujaTierOptions below) so the dropdown text reads as
// specific to that puja rather than a generic shared label.
const SIMPLE_PUJA_TIER_AMOUNTS = [100, 250, 500, 1100, 2100] as const;
type SimplePujaTierKey = "100" | "250" | "500" | "1100" | "2100";

/** Builds one puja's dropdownOptions from 5 puja-specific tier labels (in
 *  ₹100 → ₹2,100 order) plus the shared "Custom Amount" entry. */
function buildSimplePujaTierOptions(labels: readonly [string, string, string, string, string]): SimplePujaPriceOption[] {
  return [
    ...SIMPLE_PUJA_TIER_AMOUNTS.map((value, i) => ({ value, label: labels[i] })),
    { value: "custom" as const, label: "Custom Amount" },
  ];
}

// ✅ PRICE/CONTENT SYNC FIX: previously every Simple Puja card showed one
// fixed duration + description no matter which amount was selected (e.g.
// Basic Sankalp Puja always said "2 minutes" even when ₹2,100 was chosen).
// Each puja now defines tier-specific content for all 5 amount tiers —
// duration, description, and an additional "includes" line — so picking a
// higher tier visibly reflects a deeper, longer Sankalp instead of just a
// bigger number next to the same fixed text.
interface SimplePujaTierContent {
  duration: string;
  description: string;
  /** Appended as one extra bullet under "This puja includes" for this tier.
   *  Left undefined at the ₹100 tier, where the base `includes` list is the
   *  whole picture. */
  extraInclude?: string;
}
type SimplePujaTierMap = Record<SimplePujaTierKey, SimplePujaTierContent>;

// Highest-to-lowest so a custom amount (e.g. ₹200, ₹1,800) resolves to the
// nearest tier AT OR BELOW what was actually entered/selected — the card
// never implies a deeper Sankalp than the amount paid actually reflects.
const SIMPLE_PUJA_TIER_KEYS_DESC: SimplePujaTierKey[] = ["2100", "1100", "500", "250", "100"];
function resolveSimplePujaTierKey(amount: number): SimplePujaTierKey {
  for (const key of SIMPLE_PUJA_TIER_KEYS_DESC) {
    if (amount >= Number(key)) return key;
  }
  return "100";
}

interface SimplePujaOffering {
  id: string;
  title: string;
  price: number;
  duration: string;
  category: "Simple Pujas";
  description: string;
  includes: string[];
  devoteeReceives: string[];
  certificateTimeline: string;
  /** Tier-specific duration/description/extra-include, keyed by amount.
   *  `offering.duration`/`offering.description` above stay as the ₹100
   *  baseline (used for the badge/preview state before a card is opened);
   *  the card itself always renders from here once an amount is selected. */
  tiers: SimplePujaTierMap;
  dropdownOptions: SimplePujaPriceOption[];
  customAmountEnabled: boolean;
  ctaLabel: string;
  imageUrl: string;
  /**
   * Keyword tags (matched against each priest's pujaExpertise/adviceAreas in
   * data/priests.ts via getPriestsByKeywords) used to build a live, ranked
   * list of at least 20 genuinely relevant, experienced priests for this
   * specific offering — the same pattern used by SevaOfferingCard.tsx and
   * BazaarOfferingCard.tsx. Never a hardcoded id list, so newly added
   * priests are picked up automatically. Rendered as the
   * "Priest / Expert Selection" dropdown below.
   */
  priestKeywords: string[];
}

const SIMPLE_PUJAS: SimplePujaOffering[] = [
  {
    id: "simple-puja-basic-sankalp",
    title: "Basic Sankalp Puja",
    price: 100,
    duration: "2 minutes",
    category: "Simple Pujas",
    description: "A simple daily blessing puja where the devotee's name and gotra are included in the Sankalp.",
    includes: [
      "Devotee name will be read during the puja.",
      "Gotra will be read.",
      "Sankalp will be taken on behalf of the devotee.",
      "Short prayer will be offered to the deity.",
      "Suitable for devotees who want a simple daily blessing.",
    ],
    devoteeReceives: [
      "Digital Puja Certificate, approved and signed off by the performing priest, as evidence.",
      "Your Puja, Your Sacred Connection — wherever the temple permits, we share a blessed photograph of your puja as a cherished remembrance of your offering. Where audio or video recording is allowed, a short glimpse of the sacred recitation may also be shared. At certain ancient and revered temples, strict security and sacred privacy rules may prohibit photography, audio/video recording, or electronic devices — we deeply respect these traditions and never compromise the temple's sanctity. In such circumstances, your devotion is lovingly acknowledged through a signed certificate from the performing priest and, where permitted, a personal audio/video testimony from the priest.",
      "Certificate issued within 3-7 working days.",
    ],
    certificateTimeline: "Certificate issued within 3-7 working days.",
    tiers: {
      "100": {
        duration: "2 minutes",
        description: "A short, simple daily Sankalp — your name and gotra are read, and a brief blessing is offered to the deity.",
      },
      "250": {
        duration: "4 minutes",
        description: "The Sankalp reading is followed by an additional short prayer and Dhoop offering, giving the daily blessing a little more devotional weight.",
        extraInclude: "An additional short prayer and Dhoop offering are added to the Sankalp.",
      },
      "500": {
        duration: "7 minutes",
        description: "A fuller Sankalp with Dhoop and a short Aarti, offered with unhurried attention so the daily blessing feels complete rather than brief.",
        extraInclude: "A short Aarti with Dhoop is included, extending the puja into a fuller ritual.",
      },
      "1100": {
        duration: "10 minutes",
        description: "The Sankalp is repeated with added focus, and the priest offers an extended personal prayer on your behalf — a Premium Devotional Sankalp for those seeking deeper attention.",
        extraInclude: "The Sankalp is repeated with added focus, and the priest offers an extended personal prayer.",
      },
      "2100": {
        duration: "15 minutes",
        description: "A Maha Sankalp — extended chanting, additional offerings, and the priest's fullest attention, suited to devotees seeking a deeper, more elaborate daily blessing.",
        extraInclude: "Extended chanting and additional offerings are included, with unhurried attention from the priest throughout.",
      },
    },
    dropdownOptions: buildSimplePujaTierOptions([
      "Simple Sankalp",
      "Extended Sankalp",
      "Full Sankalp with Aarti",
      "Premium Daily Sankalp",
      "Maha Sankalp",
    ]),
    customAmountEnabled: true,
    ctaLabel: "Book Puja",
    imageUrl: import.meta.env.BASE_URL + "images/deity_jagannath_1781872890111.jpg",
    // A simple daily Sankalp/blessing suits any well-rounded temple priest,
    // so these keywords deliberately span several specialisms — health,
    // wealth, protection and festival — resolved live via
    // getPriestsByKeywords so devotees see a genuinely varied, at-least-20
    // priest list rather than one narrow expertise.
    priestKeywords: ["health", "wealth", "protection", "festival"],
  },
  {
    id: "simple-puja-raksha-sankalp-armed-forces",
    title: "Veer Raksha Kavach Puja — For Our Armed Forces",
    price: 100,
    duration: "5 minutes",
    category: "Simple Pujas",
    description: "\"They protect us. Let us pray for their protection.\" A sacred Raksha Kavach Sankalp — a devotional shield of prayer — offered for the safety, strength and safe return of a soldier in the Army, Navy, or Air Force — performed on their behalf by anyone who loves or honours them.",
    includes: [
      "Enter the name of the Armed Forces personnel you are praying for — a family member, friend, colleague, veteran, or any soldier you wish to bless.",
      "Choose who you are praying for: family member, friend, colleague, well-wisher, any Armed Forces personnel, or a collective prayer for all who serve.",
      "Devotee's (the person performing the puja) name, Gotra and Rashi will be read in the Sankalp.",
      "Sankalp taken specifically for the personnel's safety, protection, strength, courage and mental peace while on duty.",
      "Prayer offered for their safe completion of duty and safe return home to their loved ones.",
      "Optional personal prayer/intention may be added, e.g. \"May [Name] remain protected, strong and safe in every duty, and return home safely.\"",
      "Only the devotee's own contact details (the person booking) are collected — the security personnel's personal contact information is never requested or shared.",
      "No confidential posting, unit, deployment, location or schedule details are ever asked for or recorded.",
      "This is a devotional Sankalp/prayer for blessings and protection — it is not a guarantee of any outcome.",
    ],
    devoteeReceives: [
      "Digital Puja Certificate, approved and signed off by the performing priest, as evidence.",
      "Your Puja, Your Sacred Connection — wherever the temple permits, we share a blessed photograph of your puja as a cherished remembrance of your offering. Where audio or video recording is allowed, a short glimpse of the sacred recitation may also be shared. At certain ancient and revered temples, strict security and sacred privacy rules may prohibit photography, audio/video recording, or electronic devices — we deeply respect these traditions and never compromise the temple's sanctity. In such circumstances, your devotion is lovingly acknowledged through a signed certificate from the performing priest and, where permitted, a personal audio/video testimony from the priest.",
      "Certificate issued within 3-7 working days.",
    ],
    certificateTimeline: "Certificate issued within 3-7 working days.",
    tiers: {
      "100": {
        duration: "5 minutes",
        description: "\"They protect us. Let us pray for their protection.\" A focused Raksha Kavach Sankalp offered for the safety and strength of one soldier.",
      },
      "250": {
        duration: "8 minutes",
        description: "The protective Sankalp is extended with an additional prayer round and Dhoop offering, strengthening the devotional shield of prayer around them.",
        extraInclude: "An additional round of protective prayer and Dhoop offering are added to the Kavach Sankalp.",
      },
      "500": {
        duration: "12 minutes",
        description: "A fuller Raksha Kavach with Dhoop, Diya and an extended Sankalp — offered with complete devotion for their safety, strength and safe return.",
        extraInclude: "Diya and Dhoop are added alongside an extended Sankalp reading, making this a fuller Kavach.",
      },
      "1100": {
        duration: "18 minutes",
        description: "The Kavach Sankalp is repeated with added focus and extended chanting — a Premium prayer offered for their protection through every duty.",
        extraInclude: "The protective Sankalp is repeated with extended chanting and added focus, offered by the priest with deeper attention.",
      },
      "2100": {
        duration: "25 minutes",
        description: "A Maha Veer Raksha Kavach — the fullest, most extended form of this protective Sankalp, offered with unhurried devotion for their complete safety and wellbeing.",
        extraInclude: "The fullest form of this Kavach is offered — extended chanting, additional rounds of protective prayer, and the priest's unhurried attention throughout.",
      },
    },
    dropdownOptions: buildSimplePujaTierOptions([
      "Ekal Raksha Prarthana",
      "Vistarit Raksha Kavach",
      "Sampoorna Raksha Kavach",
      "Premium Veer Kavach",
      "Maha Veer Raksha Kavach",
    ]),
    customAmountEnabled: true,
    ctaLabel: "Offer Veer Raksha Kavach 🙏",
    imageUrl: import.meta.env.BASE_URL + "images/deity_kashtabhanjan_hanuman_1781874800576.jpg",
    // Protector-deity Sankalp for a person's safety and strength — matched
    // to priests specialising in Protection/Graha Shanti, Health &
    // Longevity, and festival/Aarti ritual conduct, resolved live via
    // getPriestsByKeywords.
    priestKeywords: ["protection", "health", "festival"],
  },
  {
    id: "simple-puja-raksha-sankalp-inland-security",
    title: "Seema Prahari Kavach Puja — For Our Inland Security Forces",
    price: 100,
    duration: "5 minutes",
    category: "Simple Pujas",
    description: "A sacred Raksha Kavach Sankalp — a devotional shield of prayer for our unseen sentinels — dedicated to the personnel of CRPF, BSF, CISF, ITBP and similar forces who guard our borders, cities and institutions day and night — offered for their safety, wellbeing and strength by those who honour their service.",
    includes: [
      "Enter the name of the Inland Security / paramilitary (CAPF) personnel you are praying for.",
      "Choose who you are praying for: family member, friend, colleague, well-wisher, any security personnel, or a collective prayer for all who guard our borders and institutions.",
      "Devotee's (the person performing the puja) name, Gotra and Rashi will be read in the Sankalp.",
      "Sankalp taken specifically for protection from danger and unforeseen harm, good health, and mental peace during difficult or high-risk assignments.",
      "Prayer offered for their strength, courage and safe return to family after duty.",
      "Optional personal prayer/intention may be added, e.g. \"May [Name] remain protected, strong and safe in every duty, and return home safely.\"",
      "Only the devotee's own contact details (the person booking) are collected — the personnel's personal contact information is never requested or shared.",
      "No confidential posting, unit, deployment, location or schedule details are ever asked for or recorded.",
      "This is a devotional Sankalp/prayer for blessings and protection — it is not a guarantee of any outcome.",
    ],
    devoteeReceives: [
      "Digital Puja Certificate, approved and signed off by the performing priest, as evidence.",
      "Your Puja, Your Sacred Connection — wherever the temple permits, we share a blessed photograph of your puja as a cherished remembrance of your offering. Where audio or video recording is allowed, a short glimpse of the sacred recitation may also be shared. At certain ancient and revered temples, strict security and sacred privacy rules may prohibit photography, audio/video recording, or electronic devices — we deeply respect these traditions and never compromise the temple's sanctity. In such circumstances, your devotion is lovingly acknowledged through a signed certificate from the performing priest and, where permitted, a personal audio/video testimony from the priest.",
      "Certificate issued within 3-7 working days.",
    ],
    certificateTimeline: "Certificate issued within 3-7 working days.",
    tiers: {
      "100": {
        duration: "5 minutes",
        description: "A focused Raksha Kavach Sankalp — a devotional shield of prayer for one guardian of our borders, cities and institutions.",
      },
      "250": {
        duration: "8 minutes",
        description: "The protective Sankalp is extended with an additional prayer round and Dhoop offering, strengthening the shield of prayer around them.",
        extraInclude: "An additional round of protective prayer and Dhoop offering are added to the Kavach Sankalp.",
      },
      "500": {
        duration: "12 minutes",
        description: "A fuller Suraksha Kavach with Dhoop, Diya and an extended Sankalp — offered with complete devotion for their safety and strength during difficult assignments.",
        extraInclude: "Diya and Dhoop are added alongside an extended Sankalp reading, making this a fuller Kavach.",
      },
      "1100": {
        duration: "18 minutes",
        description: "The Kavach Sankalp is repeated with added focus and extended chanting — a Premium prayer offered for their protection through every high-risk assignment.",
        extraInclude: "The protective Sankalp is repeated with extended chanting and added focus, offered by the priest with deeper attention.",
      },
      "2100": {
        duration: "25 minutes",
        description: "A Maha Suraksha Kavach — the fullest, most extended form of this protective Sankalp, offered with unhurried devotion for their complete safety and wellbeing.",
        extraInclude: "The fullest form of this Kavach is offered — extended chanting, additional rounds of protective prayer, and the priest's unhurried attention throughout.",
      },
    },
    dropdownOptions: buildSimplePujaTierOptions([
      "Ekal Suraksha Prarthana",
      "Vistarit Suraksha Kavach",
      "Sampoorna Suraksha Kavach",
      "Premium Prahari Kavach",
      "Maha Suraksha Kavach",
    ]),
    customAmountEnabled: true,
    ctaLabel: "Offer Seema Prahari Kavach 🙏",
    imageUrl: import.meta.env.BASE_URL + "images/deity_maa_tarini_1781872917967.jpg",
    // Shakti/protector-goddess Sankalp — matched to priests specialising in
    // Protection/Graha Shanti, Health & Longevity, and ancestral/festival
    // ritual conduct, resolved live via getPriestsByKeywords.
    priestKeywords: ["protection", "health", "ancestral"],
  },
  {
    id: "simple-puja-raksha-sankalp-police-firefighters",
    title: "Samaj Rakshak Kavach Puja — For Police, Firefighters & Protectors of Society",
    price: 100,
    duration: "5 minutes",
    category: "Simple Pujas",
    description: "A sacred Raksha Kavach Sankalp — a devotional shield of prayer for society's everyday guardians — for the police personnel, firefighters and every protector of society who steps toward danger so others can stay safe — offered for their protection, wellbeing and safe return by a grateful citizen.",
    includes: [
      "Enter the name of the police officer, firefighter, or other protector of society you are praying for.",
      "Choose who you are praying for: family member, friend, colleague, well-wisher, any protector of society, or a collective public prayer.",
      "Devotee's (the person performing the puja) name, Gotra and Rashi will be read in the Sankalp.",
      "Sankalp taken specifically for safety and protection while on duty, good health, and strength and mental peace during difficult situations.",
      "Prayer offered for their safe completion of duty and safe return home to their loved ones.",
      "Optional personal prayer/intention may be added, e.g. \"May [Name] remain protected, strong and safe in every duty, and return home safely.\"",
      "Only the devotee's own contact details (the person booking) are collected — the personnel's personal contact information is never requested or shared.",
      "No confidential posting, deployment, location or shift/schedule details are ever asked for or recorded.",
      "This is a devotional Sankalp/prayer for blessings and protection — it is not a guarantee of any outcome.",
    ],
    devoteeReceives: [
      "Digital Puja Certificate, approved and signed off by the performing priest, as evidence.",
      "Your Puja, Your Sacred Connection — wherever the temple permits, we share a blessed photograph of your puja as a cherished remembrance of your offering. Where audio or video recording is allowed, a short glimpse of the sacred recitation may also be shared. At certain ancient and revered temples, strict security and sacred privacy rules may prohibit photography, audio/video recording, or electronic devices — we deeply respect these traditions and never compromise the temple's sanctity. In such circumstances, your devotion is lovingly acknowledged through a signed certificate from the performing priest and, where permitted, a personal audio/video testimony from the priest.",
      "Certificate issued within 3-7 working days.",
    ],
    certificateTimeline: "Certificate issued within 3-7 working days.",
    tiers: {
      "100": {
        duration: "5 minutes",
        description: "A focused Raksha Kavach Sankalp — a devotional shield of prayer for one everyday guardian of society.",
      },
      "250": {
        duration: "8 minutes",
        description: "The protective Sankalp is extended with an additional prayer round and Dhoop offering, strengthening the shield of prayer around them.",
        extraInclude: "An additional round of protective prayer and Dhoop offering are added to the Kavach Sankalp.",
      },
      "500": {
        duration: "12 minutes",
        description: "A fuller Rakshak Kavach with Dhoop, Diya and an extended Sankalp — offered with complete devotion for their safety while on duty and safe return home.",
        extraInclude: "Diya and Dhoop are added alongside an extended Sankalp reading, making this a fuller Kavach.",
      },
      "1100": {
        duration: "18 minutes",
        description: "The Kavach Sankalp is repeated with added focus and extended chanting — a Premium prayer offered for their protection through every difficult situation.",
        extraInclude: "The protective Sankalp is repeated with extended chanting and added focus, offered by the priest with deeper attention.",
      },
      "2100": {
        duration: "25 minutes",
        description: "A Maha Samaj Raksha Kavach — the fullest, most extended form of this protective Sankalp, offered with unhurried devotion for their complete safety and wellbeing.",
        extraInclude: "The fullest form of this Kavach is offered — extended chanting, additional rounds of protective prayer, and the priest's unhurried attention throughout.",
      },
    },
    dropdownOptions: buildSimplePujaTierOptions([
      "Ekal Rakshak Prarthana",
      "Vistarit Rakshak Kavach",
      "Sampoorna Rakshak Kavach",
      "Premium Samaj Kavach",
      "Maha Samaj Raksha Kavach",
    ]),
    customAmountEnabled: true,
    ctaLabel: "Offer Samaj Rakshak Kavach 🙏",
    imageUrl: import.meta.env.BASE_URL + "images/deity_kalighat_kali_1781874835951.jpg",
    // Fierce-protector-goddess Sankalp for society's everyday guardians —
    // matched to priests specialising in Protection/Graha Shanti, Health &
    // Longevity, and festival/Aarti ritual conduct, resolved live via
    // getPriestsByKeywords.
    priestKeywords: ["protection", "health", "festival"],
  },
  {
    id: "simple-puja-mansik-ichha",
    title: "Mansik Ichha Puja",
    price: 250,
    duration: "5 minutes",
    category: "Simple Pujas",
    description: "A focused Sankalp puja where the devotee's personal wish, prayer, or intention is respectfully expressed.",
    includes: [
      "Devotee name will be read.",
      "Gotra will be read.",
      "Rashi will be read.",
      "Devotee's Mansik Ichha / personal wish will be expressed during the Sankalp.",
      "2 Dhoop will be offered during the prayer.",
      "Suitable for family wellbeing, health, peace, success, protection, and personal prayer.",
    ],
    devoteeReceives: [
      "Digital Puja Certificate, approved and signed off by the performing priest, as evidence.",
      "Your Puja, Your Sacred Connection — wherever the temple permits, we share a blessed photograph of your puja as a cherished remembrance of your offering. Where audio or video recording is allowed, a short glimpse of the sacred recitation may also be shared. At certain ancient and revered temples, strict security and sacred privacy rules may prohibit photography, audio/video recording, or electronic devices — we deeply respect these traditions and never compromise the temple's sanctity. In such circumstances, your devotion is lovingly acknowledged through a signed certificate from the performing priest and, where permitted, a personal audio/video testimony from the priest.",
      "Certificate issued within 3-7 working days.",
    ],
    certificateTimeline: "Certificate issued within 3-7 working days.",
    tiers: {
      "100": {
        duration: "3 minutes",
        description: "A brief Sankalp where your personal wish is quietly expressed to the deity, with name and gotra read.",
      },
      "250": {
        duration: "5 minutes",
        description: "Your wish is expressed in a fuller Sankalp, with Dhoop offered alongside — this puja's original, most-chosen form.",
        extraInclude: "Dhoop is offered alongside the Sankalp as your Mansik Ichha is expressed.",
      },
      "500": {
        duration: "8 minutes",
        description: "A Special Wish Puja — additional Dhoop and a short Aarti accompany the Sankalp, giving your Mansik Ichha more devotional depth.",
        extraInclude: "An additional Dhoop offering and a short Aarti accompany the Sankalp.",
      },
      "1100": {
        duration: "12 minutes",
        description: "The Sankalp is repeated with added focus on your wish, and the priest offers an extended personal prayer — a Premium Wish Fulfilment Puja.",
        extraInclude: "The Sankalp is repeated with added focus on your personal wish, with an extended prayer from the priest.",
      },
      "2100": {
        duration: "18 minutes",
        description: "A Maha Ichha Puja — extended chanting and additional offerings accompany the Sankalp, offered with the priest's fullest attention to your personal wish.",
        extraInclude: "Extended chanting and additional offerings accompany the Sankalp, with the priest's fullest attention to your wish.",
      },
    },
    dropdownOptions: buildSimplePujaTierOptions([
      "Simple Wish Sankalp",
      "Enhanced Wish Sankalp",
      "Special Wish Puja",
      "Premium Wish Fulfilment Puja",
      "Maha Ichha Puja",
    ]),
    customAmountEnabled: true,
    ctaLabel: "Book Puja",
    imageUrl: import.meta.env.BASE_URL + "images/deity_lingaraj_1781872903761.jpg",
    // Matches the offering's own description — "family wellbeing, health,
    // peace, success, protection, and personal prayer" — to priests whose
    // pujaExpertise/adviceAreas are Health & Longevity, Protection/Graha
    // Shanti, or Marriage & Family Harmony, resolved live via
    // getPriestsByKeywords.
    priestKeywords: ["health", "protection", "marriage", "family"],
  },
  {
    id: "simple-puja-sampoorna-bhog-deep",
    title: "Sampoorna Bhog & Deep Puja",
    price: 500,
    duration: "10 minutes",
    category: "Simple Pujas",
    description: "A complete devotional puja with Sankalp, Bhog, Diya, camphor, and Dhoop offering.",
    includes: [
      "Devotee name will be read.",
      "Gotra will be read.",
      "Rashi will be read.",
      "Sankalp will be performed.",
      "Bhog will be offered to the deity.",
      "Diya will be lit.",
      "Camphor will be offered.",
      "Dhoop will be used while praying.",
      "Suitable for important prayers, special blessings, family protection, success, prosperity, and gratitude.",
    ],
    devoteeReceives: [
      "Digital Puja Certificate, approved and signed off by the performing priest — and by the temple, where applicable — as evidence.",
      "Your Puja, Your Sacred Connection — wherever the temple permits, we share a blessed photograph of your puja as a cherished remembrance of your offering. Where audio or video recording is allowed, a short glimpse of the sacred recitation may also be shared. At certain ancient and revered temples, strict security and sacred privacy rules may prohibit photography, audio/video recording, or electronic devices — we deeply respect these traditions and never compromise the temple's sanctity. In such circumstances, your devotion is lovingly acknowledged through a signed certificate from the performing priest and, where permitted, a personal audio/video testimony from the priest.",
      "Certificate/evidence is typically issued within 3-7 working days, depending on puja complexity and temple confirmation.",
    ],
    certificateTimeline: "Certificate issued within 3-7 working days (longer for multi-day or festival rituals).",
    tiers: {
      "100": {
        duration: "4 minutes",
        description: "A Simple Bhog & Deep — Sankalp is taken and a Diya is lit; a compact version of the full ritual for a quick, meaningful offering.",
      },
      "250": {
        duration: "6 minutes",
        description: "Sankalp, Diya and Dhoop are offered together — an Enhanced Bhog & Deep for a fuller daily offering.",
        extraInclude: "Dhoop is added alongside the Sankalp and Diya for a fuller offering.",
      },
      "500": {
        duration: "10 minutes",
        description: "The complete Sankalp, Bhog, Diya, camphor and Dhoop offering — this puja's original, most complete form.",
        extraInclude: "Bhog and camphor are offered alongside the Sankalp, Diya and Dhoop — the puja's complete original form.",
      },
      "1100": {
        duration: "15 minutes",
        description: "The full Bhog & Deep ritual is extended with an additional prayer round and more unhurried attention — a Premium Bhog & Deep Seva.",
        extraInclude: "An additional prayer round is added to the full ritual, offered with more unhurried attention.",
      },
      "2100": {
        duration: "22 minutes",
        description: "A Maha Bhog & Deep Seva — the fullest form of this ritual, with extended chanting, additional Bhog and Diya offerings, and the priest's complete attention.",
        extraInclude: "Extended chanting and additional Bhog and Diya offerings are included, with the priest's complete attention throughout.",
      },
    },
    dropdownOptions: buildSimplePujaTierOptions([
      "Simple Bhog & Deep",
      "Enhanced Bhog & Deep",
      "Sampoorna Bhog & Deep",
      "Premium Bhog & Deep Seva",
      "Maha Bhog & Deep Seva",
    ]),
    customAmountEnabled: true,
    ctaLabel: "Book Puja",
    imageUrl: import.meta.env.BASE_URL + "images/deity_kashi_vishwanath_1781874522891.jpg",
    // Matches the offering's own description — "important prayers, special
    // blessings, family protection, success, prosperity, and gratitude" —
    // to priests specialising in Wealth/Lakshmi Sadhana, Protection/Graha
    // Shanti, or Festival & Aarti ceremonies (Bhog + Deep is a full Aarti
    // ritual in spirit), resolved live via getPriestsByKeywords.
    priestKeywords: ["wealth", "protection", "festival"],
  },
];

interface SimplePujaCardProps {
  offering: SimplePujaOffering;
  isActive: boolean;
  onActivate: () => void;
  onBook: (pujaName: string, amount: number) => void;
}

function SimplePujaCard({ offering, isActive, onActivate, onBook }: SimplePujaCardProps) {
  // Lazy initializer — computed once, strictly from THIS offering's own base
  // price, so each of the three Simple Puja cards always defaults its own
  // amount selector independently (₹100 / ₹250 / ₹500) and can never pick up
  // another card's selection.
  const [selected, setSelected] = useState<string>(() => String(offering.price));
  const [customAmount, setCustomAmount] = useState("");
  // ✅ PROGRESSIVE DISCLOSURE: same fix as SevaOfferingCard.tsx /
  // BazaarOfferingCard.tsx — "This puja includes" / "Devotee receives"
  // collapsed by default so a devotee can scan the Simple Pujas grid by
  // photo/title/badges/price first, then open a card for detail.
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  // Devotee name / gotra / rashi / wish / contact are intentionally NOT
  // collected on this card anymore — the Puja Sankalp Portal (BookNowWizard)
  // that opens next already asks for every one of those fields exactly
  // once, auto-filled from the devotee's saved Dharmic ID profile when
  // available. This card only ever captures the two things the Portal does
  // NOT ask for: a puja-date preference and a delivery pincode.
  const [pujaDate, setPujaDate] = useState("");
  const [pincode, setPincode] = useState("");
  // Occasion — same optional dropdown pattern used under Structured Seva
  // Offerings (SevaOfferingCard.tsx / SEVA_OCCASIONS), replicated here so
  // every Simple Puja card lets a devotee optionally note the occasion
  // (birthday, anniversary, Pitru Memory, gratitude, etc.) behind the puja.
  const [occasion, setOccasion] = useState("");
  // "" = no preference — an experienced priest/expert matching this
  // offering is assigned. Kept optional so a devotee never has to pick a
  // name to proceed. At least 20 genuinely relevant, experienced priests
  // are resolved live from the priest directory via getPriestsByKeywords —
  // never a hardcoded shortlist — same pattern as SevaOfferingCard.tsx and
  // BazaarOfferingCard.tsx.
  const [selectedPriestId, setSelectedPriestId] = useState("");
  const priestOptions = useMemo(
    () => getPriestsByKeywords(offering.priestKeywords, 20),
    [offering.priestKeywords]
  );
  // "" = "Any Temple" — no preference, an available temple/priest pairing
  // is assigned. Sourced live from TEMPLES_LIST (data/temples.ts) so every
  // temple on the platform is selectable, never a hardcoded subset.
  const [selectedTempleId, setSelectedTempleId] = useState("");
  const [errors, setErrors] = useState<{ pincode?: string; pujaDate?: string }>({});
  const [justBooked, setJustBooked] = useState(false);
  const justBookedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ✅ DISCLAIMER CONSOLIDATION: the acknowledgement gate previously lived
  // here, on every card, in addition to an identical gate one step later in
  // the Puja Sankalpa Portal (BookNowWizard) — a devotee had to read and
  // tick the same disclaimer twice for one booking. It now lives once,
  // inside the Puja Sankalpa Portal's "Devotee Sankalpa" step, which every
  // Simple Puja routes through regardless of which card it started from.

  useEffect(() => {
    return () => {
      if (justBookedTimeoutRef.current) clearTimeout(justBookedTimeoutRef.current);
    };
  }, []);

  const isCustomSelected = selected === "custom";
  const selectedOption = offering.dropdownOptions.find((p) => String(p.value) === selected);
  const customAmountNumber = parseInt(customAmount, 10);
  const customAmountValid = !isCustomSelected || (!isNaN(customAmountNumber) && customAmountNumber >= 100);

  // ✅ PRICE/CONTENT SYNC FIX: the amount actually reflected in the card's
  // duration/description/includes below — resolved from whichever amount is
  // presently selected (a fixed tier, or a validly-entered custom amount).
  // Falls back to the puja's own base price only while a custom amount is
  // selected but not yet validly typed in, so the card never shows content
  // for an amount that hasn't actually been chosen.
  const activeAmount = isCustomSelected
    ? (customAmountValid && customAmountNumber ? customAmountNumber : offering.price)
    : (typeof selectedOption?.value === "number" ? selectedOption.value : offering.price);
  const activeTierKey = resolveSimplePujaTierKey(activeAmount);
  const activeTier = offering.tiers[activeTierKey];
  const activeIncludes = activeTier.extraInclude ? [...offering.includes, activeTier.extraInclude] : offering.includes;

  const handleSubmit = () => {
    if (!isActive) { onActivate(); return; }
    if (isCustomSelected && !customAmountValid) { alert("Custom sankalp amount starts from ₹100."); return; }

    const pincodeErr = pincode.trim() ? validatePincode(pincode) : null;
    // Pandit/Pujari coordination needs lead time — same-day/next-day/within
    // the 3-day prep window is blocked here too, not just via the date
    // picker's min attribute (which a manually-typed/pasted date can bypass
    // in some browsers).
    const pujaDateErr = pujaDate ? validateBookingDate(pujaDate) : null;
    if (pincodeErr || pujaDateErr) {
      setErrors({ pincode: pincodeErr || undefined, pujaDate: pujaDateErr || undefined });
      return;
    }
    setErrors({});

    const amount = isCustomSelected ? customAmountNumber : (selectedOption?.value as number);

    const chosenPriest = selectedPriestId ? getPriestById(selectedPriestId) : undefined;
    const chosenTemple = selectedTempleId ? TEMPLES_LIST.find((t) => t.id === selectedTempleId) : undefined;

    const occasionLabel = SEVA_OCCASIONS.find((o) => o.value === occasion)?.label;

    const detailParts: string[] = [];
    if (selectedOption && !isCustomSelected) detailParts.push(selectedOption.label);
    if (occasionLabel) detailParts.push(`Occasion: ${occasionLabel}`);
    if (pujaDate) detailParts.push(`Puja Date Preference: ${pujaDate}`);
    if (pincode.trim()) detailParts.push(`Pincode: ${pincode.trim()}`);
    detailParts.push(`Temple Selection: ${chosenTemple ? chosenTemple.name : "Any Temple"}`);
    detailParts.push(`Priest/Expert Selection: ${chosenPriest ? chosenPriest.name : "Any experienced priest/expert for this puja"}`);

    const composedName = detailParts.length ? `${offering.title} — ${detailParts.join(", ")}` : offering.title;

    // ✅ DUPLICATE-SUBMISSION FIX: previously this fired its own immediate
    // Google Form sync (formType "puja") right here, then onBook() below
    // opens the Puja Sankalp Portal (BookNowWizard), which fires ITS OWN
    // Pending row + Final row — under a completely different, unrelated
    // Ref ID. That meant every single "Book Puja" click produced 3
    // disconnected Google Sheet rows for one devotee action. The Sankalp
    // Portal's Pending row (fired the instant its Step 1 details are
    // confirmed) already captures the lead even if the devotee abandons
    // before paying, so no capture is lost by removing the extra row here
    // — we just stop tripling it.
    //
    // onBook() hands the composed name + amount straight to onBookNowClick,
    // which sets the Puja Sankalp Portal (BookNowWizard) defaults and opens
    // it immediately.
    gaBookNowOpen(composedName, amount);
    // Devotee name, gotra, rashi, wish, phone and email are collected next,
    // exactly once, inside the Puja Sankalp Portal (BookNowWizard) — never
    // here — so a devotee is never asked to re-type the same detail twice.
    onBook(composedName, amount);

    setPujaDate("");
    setPincode("");
    setOccasion("");
    setCustomAmount("");
    setSelectedPriestId("");
    setSelectedTempleId("");
    setJustBooked(true);
    if (justBookedTimeoutRef.current) clearTimeout(justBookedTimeoutRef.current);
    justBookedTimeoutRef.current = setTimeout(() => setJustBooked(false), 6000);
  };

  return (
    <div
      id={`simple-puja-${offering.id}`}
      onClick={() => { if (!isActive) onActivate(); }}
      className={`bg-[#092320] rounded-3xl border text-left transition-all flex flex-col text-white overflow-hidden h-full ${
        isActive ? "border-[#FFB347]/60 shadow-lg shadow-[#FFB347]/10" : "border-white/10 hover:border-[#5EEAD4]/25 cursor-pointer"
      }`}
    >
      <div className="w-full h-44 relative overflow-hidden">
        <OptimizedImage src={offering.imageUrl} alt={offering.title} className="w-full h-full object-cover object-center select-none filter brightness-90" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#021816]/90 to-transparent p-2">
          <span className="text-[11px] font-mono font-bold text-teal-300 bg-black/40 px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm">
            {offering.category}
          </span>
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-white/5 border border-white/15">
              <Flame className="w-4 h-4 text-orange-400" fill="currentColor" />
            </div>
            <h4 className="text-lg font-serif font-bold text-white">{offering.title}</h4>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-3 text-[12px] text-white/50 font-mono">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-[#FFB347]/60" />{activeTier.duration}</span>
        </div>

        {/* Badges — "Starts at ₹100" intentionally omitted here: the Simple
            Pujas section heading above already carries a single "Starts at
            ₹100" badge for the whole section, so repeating it on every card
            was redundant duplicate text per card. */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {["Digital Certificate", "Temple Priest Puja", "Evidence Shared"].map((b) => (
            <span key={b} className="flex items-center space-x-1 bg-white/4 border border-white/8 rounded-full px-2.5 py-0.5 text-[11px] text-white/55">
              <BadgeCheck className="w-2.5 h-2.5 text-[#5EEAD4]" /><span>{b}</span>
            </span>
          ))}
        </div>

        <p className="text-[13px] text-white/70 leading-relaxed mb-3">{activeTier.description}</p>

        {justBooked && (
          <div className="flex items-start space-x-1.5 text-[13px] text-[#5EEAD4] bg-[#5EEAD4]/10 border border-[#5EEAD4]/25 rounded-xl px-3 py-2 mb-3">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{offering.title} — Sankalp recorded. Continuing to the Puja Sankalp Portal…</span>
          </div>
        )}

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setIsDetailsExpanded((v) => !v); }}
          aria-expanded={isDetailsExpanded}
          className="flex items-center gap-1 text-[12px] font-bold text-[#5EEAD4] hover:text-[#7FF4DE] uppercase tracking-wide mb-3 -mt-1 transition-colors"
        >
          {isDetailsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{isDetailsExpanded ? "Hide details" : "What's included · What you receive"}</span>
        </button>

        {isDetailsExpanded && (
          <>
            <div className="space-y-1.5 mb-3">
              <span className="block text-[12px] font-bold text-white/60 uppercase tracking-wide">This puja includes</span>
              <ul className="space-y-1">
                {activeIncludes.map((item, i) => (
                  <li key={i} className="flex items-start space-x-1.5 text-[13px] text-white/70">
                    <Check className="w-3 h-3 text-[#5EEAD4] flex-shrink-0 mt-0.5" /><span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-1.5 mb-4">
              <span className="block text-[12px] font-bold text-white/60 uppercase tracking-wide">Devotee receives</span>
              <ul className="space-y-1">
                {offering.devoteeReceives.map((item, i) => (
                  <li key={i} className="flex items-start space-x-1.5 text-[13px] text-white/70">
                    <Check className="w-3 h-3 text-[#FFB347] flex-shrink-0 mt-0.5" /><span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Custom Sankalp Amount selector — always visible */}
        <div className="mb-3" onClick={(e) => e.stopPropagation()}>
          <label className="block text-[12px] font-bold text-white/60 uppercase tracking-wide mb-1.5">Custom Sankalp Amount</label>
          <div className="relative">
            <select
              key={offering.id}
              id={`simple-puja-select-${offering.id}`}
              value={selected}
              onChange={(e) => { setSelected(e.target.value); if (!isActive) onActivate(); }}
              className="w-full appearance-none bg-white/5 border border-white/12 rounded-xl pl-3.5 pr-9 py-2.5 text-xs text-white focus:outline-none focus:border-[#FFB347]/50 focus:bg-white/8 transition-all"
            >
              {offering.dropdownOptions.map((opt) => (
                <option key={String(opt.value)} value={String(opt.value)} className="bg-[#092320] text-white">
                  {typeof opt.value === "number" ? `₹${opt.value.toLocaleString("en-IN")} — ${opt.label}` : opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
          </div>

          {isCustomSelected && offering.customAmountEnabled && (
            <div className="mt-2">
              <input
                id={`simple-puja-custom-${offering.id}`}
                type="number"
                min={100}
                placeholder="Enter custom amount (₹)"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full bg-white/5 border border-white/12 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFB347]/50"
              />
              <p className="text-[11px] text-white/40 mt-1">Custom sankalp amount starts from ₹100.</p>
            </div>
          )}
        </div>

        {/* Booking form fields — shown once this card is the active selection.
            Only the two fields the Sankalp Portal does NOT collect (a date
            preference and a delivery pincode) live here. Devotee name,
            gotra, rashi, wish, phone and email are collected next, exactly
            once, in the Puja Sankalp Portal — auto-filled from the
            devotee's Dharmic ID profile whenever one exists. */}
        {isActive && (
          <div className="space-y-2.5 mb-4 pt-3 border-t border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[12px] font-bold text-white/60 uppercase tracking-wide mb-1">Puja Date Preference</label>
                <input
                  type="date" value={pujaDate} min={getMinBookableDateISO()}
                  onChange={(e) => { setPujaDate(e.target.value); if (errors.pujaDate) setErrors((p) => ({ ...p, pujaDate: undefined })); }}
                  className={`w-full bg-white/5 border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none ${
                    errors.pujaDate ? "border-red-400/60 focus:border-red-400" : "border-white/12 focus:border-[#FFB347]/50"
                  }`}
                />
                <p className="text-[11px] text-white/40 mt-1">Please allow at least 3 days so we can coordinate with the Pandit/Pujari.</p>
                {errors.pujaDate && (
                  <p className="flex items-center gap-1 text-[12px] text-red-300 mt-1"><AlertCircle className="w-3 h-3 flex-shrink-0" />{errors.pujaDate}</p>
                )}
              </div>
              <div>
                <label className="block text-[12px] font-bold text-white/60 uppercase tracking-wide mb-1">Pincode</label>
                <input
                  type="text" inputMode="numeric" value={pincode}
                  onChange={(e) => { setPincode(e.target.value.replace(/\D/g, "")); if (errors.pincode) setErrors((p) => ({ ...p, pincode: undefined })); }}
                  placeholder="6-digit PIN code (optional)"
                  maxLength={6}
                  className={`w-full bg-white/5 border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none ${
                    errors.pincode ? "border-red-400/60 focus:border-red-400" : "border-white/12 focus:border-[#FFB347]/50"
                  }`}
                />
                {errors.pincode && (
                  <p className="flex items-center gap-1 text-[12px] text-red-300 mt-1"><AlertCircle className="w-3 h-3 flex-shrink-0" />{errors.pincode}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-bold text-white/60 uppercase tracking-wide mb-1">Temple Selection</label>
              <div className="relative">
                <select
                  id={`simple-puja-temple-${offering.id}`}
                  value={selectedTempleId}
                  onChange={(e) => setSelectedTempleId(e.target.value)}
                  className="w-full appearance-none bg-white/5 border border-white/12 rounded-xl pl-3.5 pr-9 py-2.5 text-xs text-white focus:outline-none focus:border-[#FFB347]/50 focus:bg-white/8 transition-all"
                >
                  <option value="" className="bg-[#092320] text-white">Any Temple</option>
                  {[...TEMPLES_LIST].sort((a, b) => a.name.localeCompare(b.name)).map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#092320] text-white">
                      {t.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
              </div>
            </div>

            {/* Occasion — replicated from the Occasion + dropdown pattern
                already used under Structured Seva Offerings (SevaOfferingCard.tsx). */}
            <div>
              <label className="block text-[12px] font-bold text-white/60 uppercase tracking-wide mb-1">Occasion</label>
              <div className="relative">
                <select
                  id={`simple-puja-occasion-${offering.id}`}
                  value={occasion} onChange={(e) => setOccasion(e.target.value)}
                  className="w-full appearance-none bg-white/5 border border-white/12 rounded-xl pl-3.5 pr-9 py-2.5 text-xs text-white focus:outline-none focus:border-[#FFB347]/50"
                >
                  <option value="" className="bg-[#092320]">Select occasion (optional)</option>
                  {SEVA_OCCASIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-[#092320]">{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-bold text-white/60 uppercase tracking-wide mb-1">Priest / Expert Selection</label>
              <div className="relative">
                <select
                  id={`simple-puja-priest-${offering.id}`}
                  value={selectedPriestId}
                  onChange={(e) => setSelectedPriestId(e.target.value)}
                  className="w-full appearance-none bg-white/5 border border-white/12 rounded-xl pl-3.5 pr-9 py-2.5 text-xs text-white focus:outline-none focus:border-[#FFB347]/50 focus:bg-white/8 transition-all"
                >
                  <option value="" className="bg-[#092320] text-white">Any experienced priest/expert for this puja</option>
                  {priestOptions.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#092320] text-white">
                      {p.name} — {p.currentCity}, {p.currentState} ({p.yearsExperience} yrs)
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
              </div>
              <p className="text-[11px] text-white/40 mt-1">
                If your chosen Pandit/Priest is unavailable at your preferred time, another approved and equally experienced priest/expert will graciously perform this Sankalp on your behalf, with the same devotion and tradition.
              </p>
            </div>

            <p className="text-[11px] text-white/40 -mt-1">Your name, gotra, rashi, contact details and personal wish are captured next in the Sankalp Portal — auto-filled from your Dharmic ID if you're logged in.</p>
          </div>
        )}

        <div className="flex-1" />

        <div className="flex items-center space-x-1.5 text-[12px] text-white/50 mb-3 mt-4">
          <ShieldCheck className="w-3.5 h-3.5 text-[#5EEAD4] flex-shrink-0" />
          <span>{offering.certificateTimeline}</span>
        </div>

        {/* Disclaimer acknowledgement now lives once, in the Puja Sankalpa
            Portal's "Devotee Sankalpa" step (BookNowWizard) that opens
            next — not duplicated here. */}

        <button
          id={`simple-puja-cta-${offering.id}`}
          onClick={(e) => { e.stopPropagation(); handleSubmit(); }}
          className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold py-2.5 rounded-xl text-xs tracking-wider uppercase transition-all shadow flex items-center justify-center gap-1.5"
        >
          <Flame className="w-4 h-4" fill="currentColor" />
          {isActive ? offering.ctaLabel.toUpperCase() + " 🙏" : "SELECT THIS PUJA"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PujaCategoryCard — compact card used ONLY in the Android/phone carousel
// for the 6 category accordions below (Health & Longevity, Wealth &
// Prosperity, Protection & Victory, Career & Business, Family & Marriage,
// and the "other" Festivals/Ancestral/Graha Shanti group). Desktop keeps
// its existing detailed row-list completely unchanged — this card exists
// purely so phone/app devotees get the same swipeable carousel experience
// already used for Simple Pujas / Seva / Bazaar, instead of a long
// vertical scroll of rows.
//
// Every card renders at a fluid clamp(240px,72vw,420px) width and (via MobileCarousel's
// h-full/[&>*]:h-full stretch) matches the height of the tallest card in
// its row, so a puja with a long name/benefit line never makes its card
// visually bigger than its neighbours.
// ─────────────────────────────────────────────────────────────────────────
interface PujaCategoryCardProps {
  puja: Puja;
  isDetailsOpen: boolean;
  onToggleDetails: () => void;
  /** Receives the final composed puja name (with Duration/Pandits appended
   *  for dynamically-priced pujas) and the final amount to charge — same
   *  pattern as SimplePujaCard's onBook. Pujas without pricingMode set
   *  behave exactly as before: name is unchanged, amount is
   *  getDiscountedPrice(puja.price). */
  onBook: (pujaName: string, amount: number) => void;
  onViewPriestProfile?: (priestId: string) => void;
}

function PujaCategoryCard({ puja, isDetailsOpen, onToggleDetails, onBook, onViewPriestProfile }: PujaCategoryCardProps) {
  const priest = getPriestByDetails(puja.priestDetails);

  // ─── Dynamic Duration + Pandit pricing (Health/Wealth/Protection/Career/
  // Marriage pujas only — see types.ts Puja.pricingMode, and
  // isPujaDynamicPricing() below for the full eligibility rule, including
  // the 6-hour+ exclusion). Every other puja falls straight through to its
  // original fixed puja.price, completely unaffected. ────────────────────
  const isDynamicPricing = isPujaDynamicPricing(puja);
  const unitMinutes = puja.unitDurationMinutes ?? 10;
  const [durationUnits, setDurationUnits] = useState(() => getDefaultDurationUnits(puja));
  const [pandits, setPandits] = useState(1);
  const baseAmount = computePujaBaseAmount(puja, durationUnits, pandits);
  // ✅ PRICE-CONSISTENCY FIX: for dynamically-priced pujas, the breakdown
  // text right below the selector (e.g. "₹250 base ... = ₹500") IS the
  // actual total — it must never be silently discounted into a different
  // final price (e.g. showing ₹400 at the bottom of the card). So dynamic
  // pujas always show/charge baseAmount as-is. Pujas without pricingMode
  // are completely unaffected and keep the sitewide discount exactly as
  // before.
  const discountedPrice = isDynamicPricing ? baseAmount : getDiscountedPrice(baseAmount);
  // Tier-based rate per 10-minute block / per Pandit — derived from this
  // puja's own price (see getPujaUnitPrice), NOT the legacy per-record
  // unitPrice field. Used only for the breakdown text below; baseAmount
  // above is always the single source of truth for the actual total.
  const pujaUnitPrice = isDynamicPricing ? getPujaUnitPrice(puja) : 0;
  const dynamicValueNotes = isDynamicPricing ? getDynamicPujaValueNotes(puja, durationUnits, pandits, unitMinutes) : [];

  const handleBook = () => {
    if (!isDynamicPricing) { onBook(puja.name, discountedPrice); return; }
    const composedName = `${puja.name} — Duration: ${durationUnits * unitMinutes} minutes, Pandits: ${pandits}`;
    onBook(composedName, discountedPrice);
  };

  return (
    <div className="h-full flex flex-col bg-[#092320] rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 transition-colors">
      {/* Thumbnail */}
      <div className="relative w-full aspect-[4/3] bg-[#021816]/70 shrink-0">
        {puja.imageUrl ? (
          <OptimizedImage
            src={puja.imageUrl}
            alt={puja.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover filter brightness-90"
          />
        ) : (
          <SacredIcon type={puja.id as any} size="sm" className="w-full h-full border-none" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#021816]/90 via-transparent to-transparent" />
        <span className="absolute bottom-2 left-2 text-[11px] uppercase font-mono tracking-widest text-[#5EEAD4] bg-[#021816]/85 backdrop-blur border border-[#5EEAD4]/25 px-2 py-0.5 rounded-full">
          {puja.deityName}
        </span>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-serif font-black text-white text-sm leading-snug mb-1">{puja.name}</h3>
        <p className="text-[12px] font-mono text-[#FFB347]/70 truncate mb-2">{puja.templeName}</p>

        {/* ✅ ADDED — "why this matters," visible at the point of decision
            instead of hidden behind the "Purpose & inclusions" toggle
            below. Reuses puja.benefits — the same content already written
            and already shown once expanded — just surfaces the first
            clause of it here too, truncated to one line, rather than
            writing new devotional copy. */}
        {puja.benefits && (
          <p className="text-[11px] text-white/55 italic leading-snug mb-2 line-clamp-1">
            {puja.benefits.split(/[,.]/)[0]}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-2.5">
          <span className="flex items-center gap-1 text-[11px] text-white/50 font-mono">
            <Clock className="w-3 h-3 text-[#FFB347]/60 shrink-0" />
            {/* ✅ DURATION-DISPLAY FIX: for dynamically-priced pujas this
                must track the devotee's selected duration, not the puja's
                static traditional duration string — otherwise this badge
                disagrees with the "DURATION (X MIN)" selector below it
                (e.g. staying on "60 minutes" after picking 20 minutes). */}
            {isDynamicPricing ? `${durationUnits * unitMinutes} minutes` : displayDuration(puja.duration)}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-mono text-white/40">
            <Video className="w-3 h-3 text-emerald-400 shrink-0" />
            HD Video
          </span>
          <span className="flex items-center gap-1 text-[11px] font-mono text-white/40">
            <CheckCircle2 className="w-3 h-3 text-[#5EEAD4] shrink-0" />
            {puja.prasadIncluded ? "Prasad" : "E-Patrika"}
          </span>
        </div>

        {/* ✅ FIX (missing pandit details bug): this used to be gated on
            `priest &&` — i.e. the whole line, including the plain
            puja.priestDetails text, only rendered when that priest also had
            a full registered profile in PRIEST_PROFILES (priests.ts). Most
            temple/puja combinations don't have one of the ~101 curated
            profiles, so their pandit line silently disappeared even though
            puja.priestDetails always has a valid value. PujaDesktopRow
            (below) already had the correct pattern — text always shows,
            only the "Profile" button is conditional on `priest` — this now
            matches that. */}
        {puja.priestDetails && (
          <div className="flex items-center gap-1.5 mb-2.5">
            <UserCircle2 className="w-3 h-3 text-[#FFB347]/60 shrink-0" />
            <span className="text-[11px] font-mono text-white/50 truncate">{puja.priestDetails}</span>
            {priest && onViewPriestProfile && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onViewPriestProfile(priest.id); }}
                className="text-[11px] font-bold text-[#5EEAD4] hover:underline shrink-0"
              >
                Profile
              </button>
            )}
          </div>
        )}

        {/* Purpose / details toggle — reuses the same single-open state as
            the desktop row list (isPujaDetailsOpen/togglePujaDetails), so
            opening a card's details on mobile behaves identically: only
            one puja's details stay expanded at a time. */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleDetails(); }}
          aria-expanded={isDetailsOpen}
          className="flex items-center gap-1 text-[11px] font-bold text-[#5EEAD4] hover:text-[#7FF4DE] uppercase tracking-wide mb-2 transition-colors"
        >
          {isDetailsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          <span>{isDetailsOpen ? "Hide details" : "Purpose & inclusions"}</span>
        </button>

        {isDetailsOpen && puja.benefits && (
          <div className="flex items-start gap-1.5 text-[12px] text-white/70 bg-[#021816]/60 px-2.5 py-2 rounded-lg border border-white/8 mb-2">
            <Check className="w-3 h-3 text-[#5EEAD4] flex-shrink-0 mt-0.5" />
            <span>{puja.benefits}</span>
          </div>
        )}
        {isDetailsOpen && dynamicValueNotes.map((note, i) => (
          <div key={i} className="flex items-start gap-1.5 text-[12px] text-white/70 bg-[#021816]/60 px-2.5 py-2 rounded-lg border border-white/8 mb-2">
            <Check className="w-3 h-3 text-[#FFB347] flex-shrink-0 mt-0.5" />
            <span>{note}</span>
          </div>
        ))}
        {isDetailsOpen && puja.materialsIncluded && puja.materialsIncluded.length > 0 && (
          <ul className="space-y-1 mb-2">
            {puja.materialsIncluded.map((item, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[12px] text-white/60">
                <Check className="w-3 h-3 text-[#FFB347] flex-shrink-0 mt-0.5" /><span>{item}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Duration + Pandit selector — only for pujas with dynamic pricing.
            Same stepper pattern as Sponsorship Services' duration-pandit
            sevas (SevaExperience.tsx), sized down to fit this card. */}
        {isDynamicPricing && (
          <div className="grid grid-cols-2 gap-2 mb-2" onClick={(e) => e.stopPropagation()}>
            <div>
              <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wide mb-1">
                Duration ({durationUnits * unitMinutes} min)
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDurationUnits((d) => clampPujaDurationUnits(puja, d - 1))}
                  className="w-7 h-7 shrink-0 rounded-lg bg-white/5 border border-white/12 text-white text-sm font-bold hover:border-[#FFB347]/50 transition-colors"
                  aria-label="Decrease duration"
                >
                  −
                </button>
                <span className="flex-1 text-center text-xs text-white font-mono">{durationUnits}</span>
                <button
                  type="button"
                  onClick={() => setDurationUnits((d) => clampPujaDurationUnits(puja, d + 1))}
                  className="w-7 h-7 shrink-0 rounded-lg bg-white/5 border border-white/12 text-white text-sm font-bold hover:border-[#FFB347]/50 transition-colors"
                  aria-label="Increase duration"
                >
                  +
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wide mb-1">Pandits</label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPandits((p) => clampPujaPandits(p - 1))}
                  className="w-7 h-7 shrink-0 rounded-lg bg-white/5 border border-white/12 text-white text-sm font-bold hover:border-[#FFB347]/50 transition-colors"
                  aria-label="Decrease number of Pandits"
                >
                  −
                </button>
                <span className="flex-1 text-center text-xs text-white font-mono">{pandits}</span>
                <button
                  type="button"
                  onClick={() => setPandits((p) => clampPujaPandits(p + 1))}
                  className="w-7 h-7 shrink-0 rounded-lg bg-white/5 border border-white/12 text-white text-sm font-bold hover:border-[#FFB347]/50 transition-colors"
                  aria-label="Increase number of Pandits"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Price breakdown — base price charged once, extra duration and
            extra Pandits shown as separate additive line items (duration
            can also go negative, for a shorter/cheaper version below the
            puja's traditional length). Only rendered once a devotee has
            actually moved away from the default, so the default view
            stays a single clean price. */}
        {isDynamicPricing && (
          <p className="text-[11px] text-white/40 mb-2 -mt-1">
            ₹{pujaUnitPrice} base (10 min, 1 Pandit) + ₹{pujaUnitPrice} per extra 10 minutes or extra Pandit = ₹{baseAmount}
          </p>
        )}

        {/* Spacer pushes price/book row to the bottom of every card,
            regardless of how much text is above it, so the footer lines
            up card-to-card even though descriptions/details vary. */}
        <div className="flex-1" />

        <div className="flex items-center justify-between gap-4 pt-2 mt-1 border-t border-white/8">
          <div>
            {isDiscountPromoVisible("puja") ? (
              <>
                <span className="block text-[11px] line-through text-white/30 font-mono">₹{baseAmount}</span>
                <span className="block text-base font-black text-[#5EEAD4] font-serif leading-tight">₹{discountedPrice}</span>
              </>
            ) : (
              <span className="block text-base font-black text-white font-serif">₹{discountedPrice}</span>
            )}
          </div>
          <button
            type="button"
            onClick={handleBook}
            className="bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold px-4 py-2.5 rounded-xl text-[11px] tracking-widest uppercase transition-colors shadow cursor-pointer whitespace-nowrap min-h-[40px] shrink-0"
          >
            Book Puja
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PujaDesktopRow — the detailed row-list layout used on desktop (lg+) for
// all 6 accordion sections: the 5 named categories (Health & Longevity,
// Wealth & Prosperity, Protection & Victory, Career & Business, Family &
// Marriage) AND the "Festivals, Ancestral & Graha Shanti" ("other") group.
// Extracted from an inline .map() into its own component so pujas with
// dynamic Duration + Pandit pricing can hold their own duration/pandit
// selection state (React hooks cannot be called conditionally inside a
// .map() callback). Markup/styling is otherwise byte-for-byte the same row
// this replaces everywhere it's used.
// ─────────────────────────────────────────────────────────────────────────
interface PujaDesktopRowProps {
  puja: Puja;
  isDetailsOpen: boolean;
  onToggleDetails: () => void;
  onViewPriestProfile?: (priestId: string) => void;
  onBook: (pujaName: string, amount: number) => void;
}

function PujaDesktopRow({ puja, isDetailsOpen, onToggleDetails, onViewPriestProfile, onBook }: PujaDesktopRowProps) {
  const priest = getPriestByDetails(puja.priestDetails);

  // ─── Dynamic Duration + Pandit pricing — same calculation as
  // PujaCategoryCard above, kept in sync intentionally. ────────────────────
  const isDynamicPricing = isPujaDynamicPricing(puja);
  const unitMinutes = puja.unitDurationMinutes ?? 10;
  const [durationUnits, setDurationUnits] = useState(() => getDefaultDurationUnits(puja));
  const [pandits, setPandits] = useState(1);
  const baseAmount = computePujaBaseAmount(puja, durationUnits, pandits);
  // ✅ PRICE-CONSISTENCY FIX: see PujaCategoryCard above — dynamic pujas
  // always show/charge baseAmount as-is, matching the breakdown text.
  const discountedPrice = isDynamicPricing ? baseAmount : getDiscountedPrice(baseAmount);
  // Tier-based rate per 10-minute block / per Pandit (see PujaCategoryCard
  // above for the full explanation) — used only for the breakdown text;
  // baseAmount is always the single source of truth for the actual total.
  const pujaUnitPrice = isDynamicPricing ? getPujaUnitPrice(puja) : 0;
  const dynamicValueNotes = isDynamicPricing ? getDynamicPujaValueNotes(puja, durationUnits, pandits, unitMinutes) : [];

  const handleBook = () => {
    if (!isDynamicPricing) { onBook(puja.name, discountedPrice); return; }
    const composedName = `${puja.name} — Duration: ${durationUnits * unitMinutes} minutes, Pandits: ${pandits}`;
    onBook(composedName, discountedPrice);
  };

  return (
    <div
      id={`puja-row-desktop-${puja.id}`}
      className="flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-4 hover:bg-white/3 transition-colors"
    >
      {/* Thumbnail image */}
      <div className="shrink-0 w-full sm:w-16 h-24 sm:h-16 rounded-xl overflow-hidden bg-[#021816]/70 border border-white/8">
        {puja.imageUrl ? (
          <OptimizedImage
            src={puja.imageUrl}
            alt={puja.name}
            loading="lazy"
            width={128}
            height={128}
            className="w-full h-full object-cover filter brightness-90"
            referrerPolicy="no-referrer"
          />
        ) : (
          <SacredIcon
            type={puja.id as any}
            size="sm"
            className="w-full h-full border-none"
          />
        )}
      </div>

      {/* Left: puja info */}
      <div className="flex-1 min-w-0 space-y-1.5">

        {/* Puja name + deity badge */}
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-serif font-black text-white text-sm leading-snug">
            {puja.name}
          </h3>
          <span className="text-[11px] uppercase font-mono tracking-widest text-[#5EEAD4] bg-[#5EEAD4]/10 border border-[#5EEAD4]/25 px-2 py-0.5 rounded-full shrink-0">
            {puja.deityName}
          </span>
        </div>

        {/* Temple */}
        <p className="text-[12px] font-mono text-[#FFB347]/70">
          {puja.templeName}
        </p>

        {/* ✅ ADDED — same "why this matters" line as the mobile card
            above, for consistency across both layouts. */}
        {puja.benefits && (
          <p className="text-[11px] text-white/55 italic leading-snug line-clamp-1">
            {puja.benefits.split(/[,.]/)[0]}
          </p>
        )}

        {/* Duration row */}
        <div className="flex flex-wrap items-center gap-3 pt-0.5">
          <span className="flex items-center gap-1 text-[12px] text-white/50 font-mono">
            <Clock className="w-3 h-3 text-[#FFB347]/60 shrink-0" />
            {/* ✅ DURATION-DISPLAY FIX: see PujaCategoryCard above — must
                track the selected duration for dynamically-priced pujas. */}
            {isDynamicPricing ? `${durationUnits * unitMinutes} minutes` : displayDuration(puja.duration)}
          </span>
        </div>

        {/* Prasad / Video indicators */}
        <div className="flex items-center gap-4 text-[11px] font-mono text-white/40 pt-0.5">
          <span className="flex items-center gap-1">
            <Video className="w-3 h-3 text-emerald-400 shrink-0" />
            HD Video
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#5EEAD4] shrink-0" />
            {puja.prasadIncluded ? "Prasad Shipped" : "E-Patrika"}
          </span>
        </div>

        {/* Priest details + link to full profile */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <UserCircle2 className="w-3 h-3 text-[#FFB347]/60 shrink-0" />
          <span className="text-[11px] font-mono text-white/50 truncate">
            {puja.priestDetails}
          </span>
          {priest && onViewPriestProfile && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onViewPriestProfile(priest.id); }}
              className="text-[11px] font-bold text-[#5EEAD4] hover:underline shrink-0"
            >
              View Profile
            </button>
          )}
        </div>

        {/* Duration + Pandit selector — only for pujas with dynamic
            pricing. Compact stepper row so it fits the existing horizontal
            row layout without disrupting it. */}
        {isDynamicPricing && (
          <div className="flex flex-wrap items-center gap-4 pt-1" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-white/50 uppercase tracking-wide">
                Duration ({durationUnits * unitMinutes} min)
              </span>
              <button
                type="button"
                onClick={() => setDurationUnits((d) => clampPujaDurationUnits(puja, d - 1))}
                className="w-6 h-6 shrink-0 rounded-lg bg-white/5 border border-white/12 text-white text-xs font-bold hover:border-[#FFB347]/50 transition-colors"
                aria-label="Decrease duration"
              >
                −
              </button>
              <span className="w-5 text-center text-xs text-white font-mono">{durationUnits}</span>
              <button
                type="button"
                onClick={() => setDurationUnits((d) => clampPujaDurationUnits(puja, d + 1))}
                className="w-6 h-6 shrink-0 rounded-lg bg-white/5 border border-white/12 text-white text-xs font-bold hover:border-[#FFB347]/50 transition-colors"
                aria-label="Increase duration"
              >
                +
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-white/50 uppercase tracking-wide">Pandits</span>
              <button
                type="button"
                onClick={() => setPandits((p) => clampPujaPandits(p - 1))}
                className="w-6 h-6 shrink-0 rounded-lg bg-white/5 border border-white/12 text-white text-xs font-bold hover:border-[#FFB347]/50 transition-colors"
                aria-label="Decrease number of Pandits"
              >
                −
              </button>
              <span className="w-5 text-center text-xs text-white font-mono">{pandits}</span>
              <button
                type="button"
                onClick={() => setPandits((p) => clampPujaPandits(p + 1))}
                className="w-6 h-6 shrink-0 rounded-lg bg-white/5 border border-white/12 text-white text-xs font-bold hover:border-[#FFB347]/50 transition-colors"
                aria-label="Increase number of Pandits"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Price breakdown — base price charged once, extra duration and
            extra Pandits shown as separate additive line items (duration
            can also go negative, for a shorter/cheaper version below the
            puja's traditional length). */}
        {isDynamicPricing && (
          <p className="text-[11px] text-white/40">
            ₹{pujaUnitPrice} base (10 min, 1 Pandit) + ₹{pujaUnitPrice} per extra 10 minutes or extra Pandit = ₹{baseAmount}
          </p>
        )}

        {/* Complete details toggle — benefits + materials included, both
            present in data but not shown in the compact row above.
            Expanded content follows the same consistent structure used
            across Simple Pujas / Seva / Bazaar: purpose, what's included,
            what the devotee receives, and a disclaimer. */}
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleDetails(); }}
            aria-expanded={isDetailsOpen}
            className="flex items-center gap-1 text-[11px] font-bold text-[#5EEAD4] hover:text-[#7FF4DE] uppercase tracking-wide pt-0.5 transition-colors"
          >
            {isDetailsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <span>{isDetailsOpen ? "Hide details" : "Purpose · What's included · What you'll receive"}</span>
          </button>
          {isDetailsOpen && (
            <div className="space-y-2.5 pt-1.5">
              {puja.benefits && (
                <div>
                  <span className="block text-[11px] font-bold text-white/50 uppercase tracking-wide mb-1">Purpose</span>
                  <div className="flex items-start gap-1.5 text-[12px] text-white/70 bg-[#021816]/60 px-2.5 py-2 rounded-lg border border-white/8">
                    <Check className="w-3 h-3 text-[#5EEAD4] flex-shrink-0 mt-0.5" />
                    <span>{puja.benefits}</span>
                  </div>
                  {dynamicValueNotes.map((note, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[12px] text-white/70 bg-[#021816]/60 px-2.5 py-2 rounded-lg border border-white/8 mt-1.5">
                      <Check className="w-3 h-3 text-[#FFB347] flex-shrink-0 mt-0.5" />
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              )}
              {puja.materialsIncluded && puja.materialsIncluded.length > 0 && (
                <div>
                  <span className="block text-[11px] font-bold text-white/50 uppercase tracking-wide mb-1">This puja includes</span>
                  <ul className="space-y-1">
                    {puja.materialsIncluded.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[12px] text-white/60">
                        <Check className="w-3 h-3 text-[#FFB347] flex-shrink-0 mt-0.5" /><span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <span className="block text-[11px] font-bold text-white/50 uppercase tracking-wide mb-1">Devotee receives</span>
                <ul className="space-y-1">
                  <li className="flex items-start gap-1.5 text-[12px] text-white/60">
                    <Check className="w-3 h-3 text-[#FFB347] flex-shrink-0 mt-0.5" />
                    <span>Digital Sankalpa Certificate, signed off by the performing priest, within 3-7 working days of completion.</span>
                  </li>
                  <li className="flex items-start gap-1.5 text-[12px] text-white/60">
                    <Check className="w-3 h-3 text-[#FFB347] flex-shrink-0 mt-0.5" />
                    <span>{puja.videoAvailable ? "A blessed photograph of your puja, and — where this temple graciously permits it — a short video glimpse of the sacred recitation." : "A blessed photograph of your puja. As this ancient temple's sacred privacy traditions do not permit recording, your devotion is lovingly acknowledged through a signed priest certificate and the performing priest's own personal video/audio testimony."}</span>
                  </li>
                  <li className="flex items-start gap-1.5 text-[12px] text-white/60">
                    <Check className="w-3 h-3 text-[#FFB347] flex-shrink-0 mt-0.5" />
                    <span>{puja.prasadIncluded ? "Prasad shipped to your address." : "Digital e-Patrika / puja summary."}</span>
                  </li>
                </ul>
              </div>
              <p className="text-[11px] text-white/35 leading-relaxed">
                Temple and priest for this puja are as shown above; your Sankalp details (name, gotra, preferred date, pincode, occasion) are collected next in the Puja Sankalp Portal. Performed with devotion as per temple process — timings may vary with temple schedule, festival rush, and priest availability. A puja is an act of devotion and does not guarantee any specific outcome.
              </p>
            </div>
          )}
        </>
      </div>

      {/* Right: price + book button */}
      <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1.5 shrink-0">
        {/* Price */}
        <div className="text-right">
          {isDiscountPromoVisible("puja") ? (
            <>
              <span className="block text-[12px] line-through text-white/30 font-mono">
                ₹{baseAmount}
              </span>
              <span className="block text-base font-black text-[#5EEAD4] font-serif leading-tight">
                ₹{discountedPrice}
              </span>
              <span className="block text-[11px] text-[#FFB347] font-mono">
                {DISCOUNT_TAG}
              </span>
            </>
          ) : (
            <span className="block text-base font-black text-white font-serif">
              ₹{discountedPrice}
            </span>
          )}
        </div>

        {/* Book button */}
        <button
          id={`puja-book-btn-${puja.id}`}
          onClick={handleBook}
          className="bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold px-5 py-2.5 rounded-xl text-[12px] tracking-widest uppercase transition-colors shadow cursor-pointer whitespace-nowrap min-h-[40px]"
        >
          Book Puja
        </button>
      </div>
    </div>
  );
}

interface OnlinePujaProps {
  onBookNowClick: (pujaName: string, price: number) => void;
  /** Optional — lets the parent app navigate to the dedicated Priest profile page. */
  onViewPriestProfile?: (priestId: string) => void;
  /** Optional — when set (e.g. arriving from the homepage carousel), the
   *  matching Simple Puja card is opened and scrolled into view on mount.
   *  Matches a SIMPLE_PUJAS id below (e.g. "simple-puja-basic-sankalp").
   *  Any id that doesn't match a Simple Puja is silently ignored, so this
   *  is safe to pass even when the destination is a different section. */
  initialHighlightId?: string | null;
  /** Since this page can be the first thing rendered under <main> on the
   *  Android app (which drops its own top padding so each page can size
   *  its own clearance), this section must supply enough top padding to
   *  clear the fixed Navbar + status bar itself — otherwise the Online
   *  Pujas header renders partly underneath the fixed header. */
  isAndroidApp?: boolean;
}

// ── Category metadata ──────────────────────────────────────────────────────────
const CATEGORY_META: Record<string, { label: string; icon: ElementType; dataIds: string[] }> = {
  all:        { label: "All Holy Pujas",       icon: Sparkles,    dataIds: [] },
  health:     { label: "Health & Longevity",   icon: Heart,       dataIds: [] },
  wealth:     { label: "Wealth & Prosperity",  icon: TrendingUp,  dataIds: [] },
  protection: { label: "Protection & Victory", icon: ShieldAlert, dataIds: [] },
  career:     { label: "Career & Business",    icon: Briefcase,   dataIds: [] },
  marriage:   { label: "Family & Marriage",    icon: Award,       dataIds: [] },
};

// Display order for accordion sections
const ACCORDION_ORDER = ["health", "wealth", "protection", "career", "marriage"] as const;
type AccordionCat = typeof ACCORDION_ORDER[number];

// ─── Locality-first initial display (Health & Longevity, Wealth &
// Prosperity, Protection & Victory, Career & Business, Family & Marriage) ──
// Each of these 5 category sections initially shows only 5 pujas — 2 from
// Odisha, 2 from North India, 1 from West India — with the rest revealed
// via "Show more". Falls back gracefully (fewer picks) if a region has
// fewer than that many pujas in a given category; if the category has 5 or
// fewer pujas total, every puja is already shown and no "Show more" appears.
const NORTH_INDIA_STATES = ["Uttar Pradesh", "Uttarakhand", "Jammu and Kashmir", "Himachal Pradesh", "Delhi"];
const WEST_INDIA_STATES = ["Maharashtra", "Gujarat"];
function getInitialCuratedPujas<T extends { templeName: string; id: string }>(pujas: T[]): T[] {
  const stateOf = (templeName: string) => TEMPLES_LIST.find(t => t.name === templeName)?.state ?? "";
  const odisha = pujas.filter(p => stateOf(p.templeName) === "Odisha").slice(0, 2);
  const north = pujas.filter(p => NORTH_INDIA_STATES.includes(stateOf(p.templeName))).slice(0, 2);
  const west = pujas.filter(p => WEST_INDIA_STATES.includes(stateOf(p.templeName))).slice(0, 1);
  const chosenIds = new Set([...odisha, ...north, ...west].map(p => p.id));
  // Preserve each puja's original relative order among the chosen set.
  return pujas.filter(p => chosenIds.has(p.id));
}

// ─── Locality-first full ordering (not just the curated first-5/first-6
// set above) — Odisha, then Uttar Pradesh, then Uttarakhand, then
// Maharashtra, then Gujarat, then everything else, in that priority order.
// Applied once to each category's full puja list (and to "Festivals,
// Ancestral & Graha Shanti") before the existing curation/slice logic
// runs, so both the initial curated view AND whatever "Show more" reveals
// stay locality-first — without changing which pujas are chosen, only the
// order they're shown in. A stable sort (guaranteed by the JS spec since
// ES2019, true in every modern browser/WebView this app targets) means
// pujas within the same state keep their original relative order.
const STATE_PRIORITY_ORDER = ["Odisha", "Uttar Pradesh", "Uttarakhand", "Maharashtra", "Gujarat"];
function sortByStatePriority<T extends { templeName: string }>(pujas: T[]): T[] {
  const stateOf = (templeName: string) => TEMPLES_LIST.find(t => t.name === templeName)?.state ?? "";
  const rankOf = (templeName: string) => {
    const idx = STATE_PRIORITY_ORDER.indexOf(stateOf(templeName));
    return idx === -1 ? STATE_PRIORITY_ORDER.length : idx;
  };
  return [...pujas].sort((a, b) => rankOf(a.templeName) - rankOf(b.templeName));
}

// ── Shared dropdown style ──────────────────────────────────────────────────────
const SELECT_CLS =
  "appearance-none bg-[#092320] border border-white/15 text-white/90 text-xs font-semibold " +
  "rounded-xl px-4 py-3 pr-8 w-full focus:outline-none focus:border-[#FFB347]/60 cursor-pointer " +
  "transition-colors hover:border-white/30";

// ── Utility: graceful duration display ────────────────────────────────────────
function displayDuration(d?: string) {
  return d && d.trim() ? d : "Not specified";
}

// ── Utility: default Duration selector value for dynamically-priced pujas
// (pricingMode "duration-pandit") ───────────────────────────────────────
// ✅ DEFAULT FIX: the selector must always start at 1 block (10 minutes) +
// 1 Pandit, per spec — NOT the puja's own traditional duration (e.g. 60
// minutes) rounded into blocks. Anchoring the default to the puja's
// traditional duration was also what caused the base price to be
// re-derived from puja.price instead of purely from the unit rate (see
// computePujaBaseAmount below), which is what produced mismatched
// card/checkout prices. The puja's real traditional duration is still
// shown unchanged elsewhere on the card (the clock/"Duration" info row
// above uses puja.duration directly) — only the pricing selector's
// starting point changes here.
function getDefaultDurationUnits(_puja: Puja): number {
  return 1;
}

// ── Duration + Pandit pricing — purely unit-rate based ─────────────────────
// ✅ PRICE-MODEL FIX: the total is 1 × unitPrice at the 10-minute/1-Pandit
// default, and every additional 10-minute block OR additional Pandit adds
// exactly one more unitPrice — the whole puja price is never multiplied or
// re-multiplied by duration/Pandits. Hard caps per spec: 1–10 duration
// units (10–100 minutes) and 1–10 Pandits, regardless of puja.
const PUJA_MIN_DURATION_UNITS = 1;
const PUJA_MAX_DURATION_UNITS = 10;
const PUJA_MAX_PANDITS = 10;

function clampPujaDurationUnits(puja: Puja, units: number): number {
  return Math.min(PUJA_MAX_DURATION_UNITS, Math.max(PUJA_MIN_DURATION_UNITS, units));
}

function clampPujaPandits(units: number): number {
  return Math.min(PUJA_MAX_PANDITS, Math.max(1, units));
}

// ── Tier-based per-unit rate for Duration + Pandit pricing ─────────────────
// ✅ TIER FIX (rate-table correction): the rate charged per extra
// 10-minute block / extra Pandit is derived directly from this puja's own
// `price` (used ONLY to pick the tier — never multiplied into the total),
// following ONE shared tier table:
//   under ₹2,000            → ₹200 per 10 minutes / per Pandit
//   ₹2,000 – ₹3,000         → ₹250
//   ₹3,000 – ₹4,000         → ₹300
//   ₹4,000 – ₹6,000         → ₹350
//   above ₹6,000            → +₹100 for every further ₹2,000 band
//                              (₹6,000–₹8,000 → ₹450, ₹8,000–₹10,000 → ₹550, …)
function getPujaUnitPrice(puja: Puja): number {
  const price = puja.price;
  if (price <= 2000) return 200;
  if (price <= 3000) return 250;
  if (price <= 4000) return 300;
  if (price <= 6000) return 350;
  const bandsAbove6000 = Math.ceil((price - 6000) / 2000);
  return 350 + bandsAbove6000 * 100;
}

// ── Duration string parsing + 6-hour exclusion guard ───────────────────────
// Handles both "NN minutes" and "N hours" duration strings so a puja whose
// traditional ritual already runs 6 hours (360 minutes) or more never gets
// the Duration + Pandit selector, even if pricingMode were ever set on one
// by mistake — those must stay completely unchanged per spec.
function getPujaDurationMinutes(duration?: string): number | null {
  if (!duration) return null;
  const hourMatch = duration.match(/(\d+(?:\.\d+)?)\s*hour/i);
  if (hourMatch) return Math.round(parseFloat(hourMatch[1]) * 60);
  const minuteMatch = duration.match(/(\d+)\s*minute/i);
  if (minuteMatch) return parseInt(minuteMatch[1], 10);
  return null;
}

// ✅ SCOPE GUARD: Duration + Pandit pricing applies within the 5 original
// named Online Puja categories — Health & Longevity, Wealth & Prosperity,
// Protection & Victory, Career & Business, Family & Marriage — PLUS the
// "Festivals, Ancestral & Graha Shanti" ("other") group (festivals,
// ancestor, graha_shanti, education), which now uses the exact same
// duration-pandit logic. Every puja with pricingMode "duration-pandit" in
// spiritualData.ts sits in one of these 9 categories; this check makes
// that a hard rule instead of a coincidence, and Simple Pujas can still
// never pick this up even if pricingMode were ever mistakenly set on one
// of them later.
const PUJA_DYNAMIC_PRICING_CATEGORIES: Puja["category"][] = [
  "health", "wealth", "protection", "career", "marriage",
  "festivals", "ancestor", "graha_shanti", "education",
];

function isPujaDynamicPricing(puja: Puja): boolean {
  if (puja.pricingMode !== "duration-pandit") return false;
  if (!PUJA_DYNAMIC_PRICING_CATEGORIES.includes(puja.category)) return false;
  const minutes = getPujaDurationMinutes(puja.duration);
  // ✅ NULL-SAFETY FIX: a duration string that doesn't parse as a plain
  // "NN minutes"/"N hours" value (e.g. "Multi-day recitation (as per
  // temple schedule)") must be EXCLUDED, not allowed through — the whole
  // point of this guard is to keep the selector away from rituals that
  // don't fit a fixed-minutes format. Previously `minutes === null` fell
  // through as eligible, which was backwards.
  return minutes !== null && minutes < 360;
}

/** Pre-discount amount for a puja at a given duration/Pandit selection.
 *  ✅ PRICE-MODEL FIX: the total is now computed purely from the tiered
 *  unit rate — never anchored to or offset from puja.price — exactly
 *  matching the required behavior: 10 min + 1 Pandit = 1 × unitPrice, and
 *  every additional 10-minute block OR additional Pandit adds one more
 *  unitPrice. This is the same additive model as Sponsorship Services'
 *  duration-pandit sevas (see SevaExperience.tsx), so both duration+pandit
 *  selectors on the site now follow one identical rule:
 *    10 min + 1 pandit = unitPrice
 *    20 min + 1 pandit = 2 × unitPrice
 *    20 min + 2 pandits = 3 × unitPrice
 *    30 min + 2 pandits = 4 × unitPrice
 *  Pujas without pricingMode "duration-pandit" (or excluded by the
 *  6-hour+ guard) are entirely unaffected — always puja.price, exactly as
 *  before. */
function computePujaBaseAmount(puja: Puja, durationUnits: number, pandits: number): number {
  if (!isPujaDynamicPricing(puja)) return puja.price;
  const unitPrice = getPujaUnitPrice(puja);
  return unitPrice * (durationUnits + pandits - 1);
}

// ── Dynamic "Purpose · What's included · What you'll receive" content ─────
// As a devotee selects more duration or more Pandits, the Purpose section
// grows with additional lines explaining the extra devotional value —
// deeper mantra/japa cycles for more time, and multi-priest chanting /
// wider sankalpa coverage for more Pandits. Grounded in each category's
// own traditional ritual elements (not generic repeated text), and always
// shown ALONGSIDE the puja's existing benefits text — nothing existing is
// replaced or removed. Only rendered for pujas eligible for Duration +
// Pandit pricing; every other puja's Purpose section is unchanged.
type DynamicPujaCategory =
  | "health" | "wealth" | "protection" | "career" | "marriage"
  | "festivals" | "ancestor" | "graha_shanti" | "education";
const CATEGORY_RITUAL_FOCUS: Record<DynamicPujaCategory, { mantra: string; offering: string; sankalp: string }> = {
  health: {
    mantra: "Mahamrityunjaya and healing-mantra japa cycles",
    offering: "extended Rudrabhishek stages and healing havan offerings",
    sankalp: "health and longevity sankalpa, covering more family members by name",
  },
  wealth: {
    mantra: "Lakshmi and Kubera mantra japa cycles",
    offering: "additional havan offerings and prosperity rituals",
    sankalp: "wealth and prosperity sankalpa, covering more family members by name",
  },
  protection: {
    mantra: "raksha and shanti mantra recitation cycles",
    offering: "additional protective havan offerings",
    sankalp: "protection sankalpa, covering more family members by name",
  },
  career: {
    mantra: "Saraswati and Ganesha mantra japa cycles for clarity and success",
    offering: "additional havan offerings dedicated to career and business growth",
    sankalp: "career and business sankalpa, covering more family members by name",
  },
  marriage: {
    mantra: "Parvati-Shiva vivah-related mantra japa cycles",
    offering: "additional offerings for marital harmony",
    sankalp: "family and marriage sankalpa, covering more family members by name",
  },
  // ── New: "Festivals, Ancestral & Graha Shanti" categories ──────────────
  festivals: {
    mantra: "extended Aarti and festival-sankalpa mantra recitation",
    offering: "additional festival havan offerings and temple sevas performed in your name",
    sankalp: "festival sankalpa, covering more family members by name",
  },
  ancestor: {
    mantra: "Pitru Tarpan and ancestral-peace mantra japa cycles",
    offering: "additional Pind Daan-related offerings for departed ancestors",
    sankalp: "Pitru Dosha and ancestral-peace sankalpa, covering more family members and forefathers by name",
  },
  graha_shanti: {
    mantra: "Navagraha and planetary-pacification mantra japa cycles",
    offering: "additional Graha Shanti havan offerings for the afflicted planet",
    sankalp: "Graha Shanti sankalpa, covering more family members by name",
  },
  education: {
    mantra: "Saraswati Vandana and Ganesh Atharvashirsha japa cycles",
    offering: "additional offerings for learning, memory, and academic clarity",
    sankalp: "education and knowledge sankalpa, covering more family members by name",
  },
};

/** Returns 0, 1, or 2 additional Purpose lines describing the extra
 *  devotional value of the current duration/Pandit selection, beyond the
 *  puja's base 10-minute/1-Pandit selection. Empty at the default
 *  selection so the default view stays exactly as authored. */
function getDynamicPujaValueNotes(puja: Puja, durationUnits: number, pandits: number, unitMinutes: number): string[] {
  if (!isPujaDynamicPricing(puja)) return [];
  const focus = CATEGORY_RITUAL_FOCUS[puja.category as DynamicPujaCategory];
  if (!focus) return [];
  const notes: string[] = [];
  if (durationUnits > 1) {
    notes.push(
      `At ${durationUnits * unitMinutes} minutes, the priest extends the ${focus.mantra}, with ${focus.offering} — giving the ritual stronger continuity and a more complete conclusion.`
    );
  }
  if (pandits > 1) {
    notes.push(
      `With ${pandits} Pandits performing together, the puja includes simultaneous multi-priest chanting and expanded ${focus.sankalp}.`
    );
  }
  return notes;
}

// "Festivals, Ancestral & Graha Shanti" — same show-6-then-"Show more"
// pattern as the Health/Wealth/Protection/Career/Family accordion sections
// above, so this category isn't overcrowded on first open.
const OTHER_CATEGORY_INITIAL_COUNT = 6;

export default function OnlinePuja({ onBookNowClick, onViewPriestProfile, initialHighlightId = null, isAndroidApp = false }: OnlinePujaProps) {
  // ── Filter state ─────────────────────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<"all" | AccordionCat>("all");
  const [selectedTemple,   setSelectedTemple]   = useState<string>("all");
  const [selectedPriest,   setSelectedPriest]   = useState<string>("all");

  // ── Simple Pujas section state ────────────────────────────────────────────
  // Kept independent of selectedCategory/ACCORDION_ORDER filtering above so
  // the existing "Showing X of Y pujas" count, accordion groups, and empty
  // state are never affected by this new tier system.
  const [activeSimplePujaId, setActiveSimplePujaId] = useState<string | null>(null);
  const [simpleTabActive, setSimpleTabActive] = useState(false);
  const simplePujaSectionRef = useRef<HTMLDivElement | null>(null);

  const handleSimplePujaTabClick = () => {
    setSimpleTabActive(true);
    gaCategoryFilter("simple", "online_puja");
    simplePujaSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Deep-link from the homepage carousel (or anywhere else that passes
  // initialHighlightId): open the matching Simple Puja card exactly the
  // same way a tap on it would (reuses isActive/onActivate below — no new
  // highlight styling needed), then scroll it into view. Runs once per
  // mount; OnlinePuja is unmounted/remounted whenever currentPage changes
  // in App.tsx, so a fresh id always re-triggers this correctly.
  useEffect(() => {
    if (!initialHighlightId) return;
    // ✅ VISIBILITY-BUG FIX: callers of this prop (e.g. the homepage
    // carousel) have historically used two different id spellings for the
    // same Simple Puja — the short slug ("basic-sankalp-puja") and this
    // file's own prefixed id ("simple-puja-basic-sankalp"). An exact-only
    // match silently failed whenever the short slug was passed, which
    // meant activeSimplePujaId never got set — so the card never became
    // "isActive" and its Puja Date Preference / Pincode / Priest fields
    // never appeared, even though the devotee had just tapped straight
    // into that exact puja. Matching on a normalized core slug (dropping
    // the "simple-puja-" prefix on either side) makes this resilient to
    // both spellings, and to any future caller, without needing every
    // other file that supplies this id to agree on one exact string.
    const normalize = (id: string) => id.replace(/^simple-puja-/, "").toLowerCase();
    const match =
      SIMPLE_PUJAS.find((p) => p.id === initialHighlightId) ??
      SIMPLE_PUJAS.find((p) => normalize(p.id) === normalize(initialHighlightId));
    if (!match) return;
    setSimpleTabActive(true);
    setActiveSimplePujaId(match.id);
    const timer = setTimeout(() => {
      document.getElementById(`simple-puja-${match.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialHighlightId]);

  const handleBookSimplePuja = (pujaName: string, amount: number) => {
    onBookNowClick(pujaName, amount);
    setActiveSimplePujaId(null);
  };

  // ── Accordion open state — all collapsed by default ──────────────────────────
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    health: false, wealth: false, protection: false, career: false, marriage: false,
  });

  // Tracks which sections have EVER been opened. Puja thumbnail images are only
  // mounted into the DOM once a section has been opened at least once — while a
  // section is still collapsed, none of its <img> tags exist yet, so the browser
  // never requests those images. Previously all ~100 puja thumbnails (many
  // pointing at large, shared temple/deity photos) were mounted immediately and
  // only hidden with CSS (max-height: 0), so they were still downloaded on page
  // load even though nothing was visible yet. This was the main cause of slow
  // loading on this section.
  const [openedOnce, setOpenedOnce] = useState<Record<string, boolean>>({});

  // ─── Per-puja "complete details" expand (Holy Pujas rows) ────────────────
  // Each row already shows a compact summary (name, deity, temple, duration,
  // prasad/video, priest). `benefits` and `materialsIncluded` exist on every
  // Puja (see types.ts / data/spiritualData.ts) but were never rendered
  // anywhere — this reveals them behind a tap, same expand/collapse pattern
  // as SevaOfferingCard.tsx / BazaarOfferingCard.tsx, without touching the
  // booking button, price, or any existing field.
  // ✅ ACCORDION FIX: was Record<string, boolean> — every puja's "complete
  // details" toggle tracked independently, so a devotee could open details
  // on a puja in Health & Longevity AND one in Wealth & Prosperity AND one
  // in Festivals/Ancestral/Graha Shanti all at the same time; opening a new
  // one never closed whichever was already open. Backed by the shared
  // useSingleOpen coordinator instead — same isOpen/toggle call shape used
  // by HolisticWellness, so there's only ever one puja's details open
  // across every category on this page at once.
  const { isOpen: isPujaDetailsOpen, toggle: togglePujaDetails } = useSingleOpen<string>();

  // Tracks which accordion category sections have had "Show more" tapped —
  // once true for a category, that section shows every puja instead of the
  // initial 2 Odisha + 2 North India + 1 West India curated set.
  const [categoryShowAll, setCategoryShowAll] = useState<Record<string, boolean>>({});
  const toggleCategoryShowAll = (cat: string) =>
    setCategoryShowAll(prev => ({ ...prev, [cat]: !prev[cat] }));

  const toggleSection = (cat: string) =>
    setOpenSections(prev => {
      const next = !prev[cat];
      if (next) setOpenedOnce(o => (o[cat] ? o : { ...o, [cat]: true }));
      return { ...prev, [cat]: next };
    });

  // ── Derived dropdown options ──────────────────────────────────────────────────
  const uniqueTemples = useMemo(
    () => Array.from(new Set(ON_LINE_PUJAS.map(p => p.templeName))).filter(Boolean).sort(),
    []
  );
  const uniquePriests = useMemo(
    () => Array.from(new Set(ON_LINE_PUJAS.map(p => p.priestDetails))).filter(Boolean).sort(),
    []
  );

  // ── Combined filter ───────────────────────────────────────────────────────────
  const filteredPujas = useMemo(() => {
    return ON_LINE_PUJAS.filter(p => {
      const catMatch    = selectedCategory === "all" || p.category === selectedCategory;
      const templeMatch = selectedTemple   === "all" || p.templeName    === selectedTemple;
      const priestMatch = selectedPriest   === "all" || p.priestDetails === selectedPriest;
      return catMatch && templeMatch && priestMatch;
    });
  }, [selectedCategory, selectedTemple, selectedPriest]);

  // ── Group filtered pujas by category ─────────────────────────────────────────
  const grouped = useMemo(() => {
    const map: Record<string, typeof filteredPujas> = {};
    for (const cat of ACCORDION_ORDER) map[cat] = [];
    for (const puja of filteredPujas) {
      if (ACCORDION_ORDER.includes(puja.category as AccordionCat)) {
        map[puja.category].push(puja);
      } else {
        // Edge: put other categories (festivals, ancestor, graha_shanti…) into the section
        // most semantically close — for the UI we still display them.
        // They won't appear under "all" tab since they're genuinely other types.
        // We surface them in a catch-all by attaching to whichever tab is "all".
      }
    }
    // Locality-first ordering (Odisha → UP → Uttarakhand → Maharashtra →
    // Gujarat → other) applied per category, ahead of the existing
    // curation/slice logic — see sortByStatePriority above.
    for (const cat of ACCORDION_ORDER) map[cat] = sortByStatePriority(map[cat]);
    return map;
  }, [filteredPujas]);

  // Pujas that belong to non-accordion categories (festivals, ancestor, graha_shanti, education)
  const otherPujas = useMemo(() => {
    return sortByStatePriority(
      filteredPujas.filter(p => !ACCORDION_ORDER.includes(p.category as AccordionCat))
    );
  }, [filteredPujas]);

  const isAnyFilterActive =
    selectedCategory !== "all" || selectedTemple !== "all" || selectedPriest !== "all";

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleClearAll = () => {
    setSelectedCategory("all");
    setSelectedTemple("all");
    setSelectedPriest("all");
  };

  const handleCategoryChange = (val: string) => {
    setSelectedCategory(val as any);
    setSimpleTabActive(false);
    gaCategoryFilter(val, "online_puja");
    // Auto-open matching section when a specific category is chosen from dropdown/tab
    if (val !== "all" && ACCORDION_ORDER.includes(val as AccordionCat)) {
      setOpenSections(prev => ({ ...prev, [val]: true }));
      setOpenedOnce(prev => (prev[val] ? prev : { ...prev, [val]: true }));
    }
  };

  return (
    <section id="online-pujas-section" className="py-20 bg-[#021816] text-white" style={isAndroidApp ? sectionTopPadding(true) : { paddingTop: `calc(var(--safe-area-inset-top, env(safe-area-inset-top, 24px)) + 96px)` }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Keyframes for the Priest Directory button pulse — matches the Setu Yatra Challenge button treatment */}
        <style>{`
          @keyframes priestDirectoryPulse {
            0%, 100% { box-shadow: 0 0 20px rgba(255,107,0,0.5), 0 0 40px rgba(255,107,0,0.25); transform: scale(1); }
            50%       { box-shadow: 0 0 32px rgba(255,153,0,0.8), 0 0 64px rgba(255,153,0,0.4); transform: scale(1.04); }
          }
          @keyframes priestDirectoryRing {
            0%, 100% { box-shadow: 0 0 0 0 rgba(255,215,0,0.0); }
            50%       { box-shadow: 0 0 0 6px rgba(255,215,0,0.18); }
          }
          @keyframes priestDirectoryFlicker {
            0%   { opacity: 1;   transform: rotate(-5deg) scale(1.05); }
            100% { opacity: 0.75; transform: rotate(5deg)  scale(0.95); }
          }
        `}</style>

        {/* ── Title Block (unchanged) ─────────────────────────────────────────── */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold text-[#FFB347]/80 tracking-wider font-mono">
            Sacred rites online
          </span>
          <h2 className="text-3xl font-serif font-black text-white tracking-tight mt-1">
            Online Pujas & Vedic Rituals
          </h2>
          <p className="text-xs text-white/70 mt-2">
            Schedule a customized remote offering performed inside ancient temple sanctums.
            All prayers are documented via live video recordings and physical Prasad dispatches.
          </p>
        </div>

        {/* ── Simple Pujas — affordable, structured tier system ─────────────────
            Placed at the top of the section, above the existing filter bar,
            accordions, and dropdowns — none of which are altered below. */}
        <div ref={simplePujaSectionRef} id="simple-pujas-section" className="mb-12 scroll-mt-24">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <div>
              <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" fill="currentColor" />
                Simple Pujas
              </h3>
              <p className="text-[13px] text-white/60 mt-1 max-w-2xl">
                Worship, prayer, ritual, ceremony, and devotion-based pujas — affordable, structured Sankalp offerings starting at ₹100.
              </p>
            </div>
            <span className="text-[12px] font-mono text-[#5EEAD4] uppercase tracking-wide bg-[#5EEAD4]/10 border border-[#5EEAD4]/20 px-2.5 py-1 rounded-full shrink-0">
              Starts at ₹100
            </span>
          </div>

          {/* Trust note */}
          <div className="flex items-start space-x-2.5 text-xs text-white/70 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 mb-6 max-w-3xl">
            <ShieldCheck className="w-4 h-4 text-[#5EEAD4] flex-shrink-0 mt-0.5" />
            <span>Every puja is performed with devotion by temple priests. A digital certificate/evidence will be shared after completion.</span>
          </div>

          {/* ✅ MIGRATED TO SHARED MobileCarousel — see SevaExperience.tsx /
              shared/MobileCarousel.tsx for why hand-copied carousel markup
              was consolidated into one component. */}
          <MobileCarousel
            items={SIMPLE_PUJAS}
            getKey={(offering) => offering.id}
            cardWidthClassName="w-[clamp(240px,72vw,420px)]"
            renderItem={(offering) => (
              <SimplePujaCard
                offering={offering}
                isActive={activeSimplePujaId === offering.id}
                onActivate={() => setActiveSimplePujaId(offering.id)}
                onBook={handleBookSimplePuja}
              />
            )}
          />

          {/* Disclaimer */}
          <p className="text-[12px] text-white/35 font-mono mt-6 leading-relaxed max-w-2xl">
            Offerings and sevas are performed with devotion as per temple process. Timings may vary depending on temple schedule, festival rush, priest availability, and temple rituals.
          </p>
        </div>

        {/* ── Filter Dropdown Bar ─────────────────────────────────────────────── */}
        <div className="mb-8 bg-[#092320]/70 border border-white/10 rounded-2xl p-4 flex flex-col gap-4">

          {/* Three equal-width dropdowns — grid keeps them perfectly aligned on all screen sizes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

            {/* Dropdown 1 – Temple */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-mono uppercase tracking-widest text-[#FFB347]/70 pl-1">
                Select Temple
              </label>
              <div className="relative">
                <select
                  value={selectedTemple}
                  onChange={e => { setSelectedTemple(e.target.value); }}
                  className={SELECT_CLS}
                >
                  <option value="all">All Temples</option>
                  {uniqueTemples.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#FFB347]/60" />
              </div>
            </div>

            {/* Dropdown 2 – Category */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-mono uppercase tracking-widest text-[#FFB347]/70 pl-1">
                Select Puja Category
              </label>
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={e => handleCategoryChange(e.target.value)}
                  className={SELECT_CLS}
                >
                  <option value="all">All Holy Pujas</option>
                  <option value="health">Health &amp; Longevity</option>
                  <option value="wealth">Wealth &amp; Prosperity</option>
                  <option value="protection">Protection &amp; Victory</option>
                  <option value="career">Career &amp; Business</option>
                  <option value="marriage">Family &amp; Marriage</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#FFB347]/60" />
              </div>
            </div>

            {/* Dropdown 3 – Priest */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-mono uppercase tracking-widest text-[#FFB347]/70 pl-1">
                Select Priest
              </label>
              <div className="relative">
                <select
                  value={selectedPriest}
                  onChange={e => { setSelectedPriest(e.target.value); }}
                  className={SELECT_CLS}
                >
                  <option value="all">Any Priest</option>
                  {uniquePriests.map(pr => (
                    <option key={pr} value={pr}>{pr}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#FFB347]/60" />
              </div>
            </div>
          </div>

          {/* Result count + Browse priests link + Clear All on one tidy row */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-[13px] text-white/50 font-mono">
                Showing{" "}
                <span className="text-[#5EEAD4] font-bold">{filteredPujas.length}</span>
                {" "}of{" "}
                <span className="text-white/80 font-bold">{ON_LINE_PUJAS.length}</span>
                {" "}pujas
              </span>
              {onViewPriestProfile && (
                <button
                  type="button"
                  onClick={() => onViewPriestProfile("")}
                  className="relative inline-flex items-center gap-1.5 bg-gradient-to-r from-[#FF6B00] to-[#FF9900] hover:from-[#FF8C00] hover:to-[#FFB300] text-white font-extrabold text-[12px] uppercase tracking-widest px-4 py-2 rounded-full transition-all hover:scale-105 border border-[#FFD700]/60 cursor-pointer"
                  style={{
                    boxShadow: "0 0 20px rgba(255, 107, 0, 0.5), 0 0 40px rgba(255, 107, 0, 0.25)",
                    animation: "priestDirectoryPulse 2s ease-in-out infinite",
                  }}
                >
                  {/* Outer glow ring */}
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{ animation: "priestDirectoryRing 2s ease-in-out infinite" }}
                    aria-hidden="true"
                  />
                  <Sparkles className="w-3 h-3 text-[#FFD700] shrink-0" style={{ animation: "priestDirectoryFlicker 1.5s ease-in-out infinite alternate" }} />
                  <span>PRIEST DIRECTORY</span>
                </button>
              )}
            </div>
            {isAnyFilterActive && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-bold transition-all shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* ── Category Pill Tabs (unchanged, synced with dropdown) ──────────────── */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {Object.entries(CATEGORY_META)
            .filter(([id]) => id !== "all" ? true : true)
            .map(([id, meta]) => {
              const Icon = meta.icon;
              return (
                <button
                  key={id}
                  id={`puja-tab-${id}`}
                  onClick={() => handleCategoryChange(id)}
                  className={`flex items-center space-x-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer min-h-[40px] ${
                    selectedCategory === id
                      ? "bg-[#FFB347] text-[#021816] shadow-md border border-[#FFB347]"
                      : "bg-[#092320] text-white/80 hover:bg-white/5 hover:text-white border border-white/10"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{meta.label}</span>
                </button>
              );
            })}
          {/* Simple Pujas — worship, prayer, ritual, ceremony, and devotion-based
              pujas. Scrolls to the structured tier cards above rather than
              filtering ON_LINE_PUJAS, so the existing category counts,
              accordions, and empty state are left completely untouched. */}
          <button
            id="puja-tab-simple"
            onClick={handleSimplePujaTabClick}
            title="Includes worship, prayer, ritual, ceremony, and devotion-based pujas"
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer min-h-[40px] ${
              simpleTabActive
                ? "bg-[#FFB347] text-[#021816] shadow-md border border-[#FFB347]"
                : "bg-[#092320] text-white/80 hover:bg-white/5 hover:text-white border border-white/10"
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Simple Pujas</span>
          </button>
        </div>

        {/* ── Empty state ───────────────────────────────────────────────────────── */}
        {filteredPujas.length === 0 && (
          <div className="text-center py-16 text-white/40">
            <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold">No pujas match your filters.</p>
            <button
              onClick={handleClearAll}
              className="mt-4 text-xs text-[#FFB347] underline underline-offset-2"
            >
              Clear filters to see all pujas
            </button>
          </div>
        )}

        {/* ── Accordion Sections ────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {ACCORDION_ORDER.map(cat => {
            const pujas = grouped[cat] ?? [];
            // Hide entire section if filtered to zero results
            if (pujas.length === 0) return null;

            const meta = CATEGORY_META[cat];
            const Icon = meta.icon;
            const isOpen = openSections[cat];

            return (
              <div
                key={cat}
                id={`accordion-section-${cat}`}
                className="bg-[#092320] rounded-2xl border border-white/10 overflow-hidden"
              >
                {/* ── Accordion Header ── */}
                <button
                  onClick={() => toggleSection(cat)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left min-h-[60px] hover:bg-white/3 transition-colors group"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      isOpen ? "bg-[#FFB347] text-[#021816]" : "bg-[#FFB347]/10 text-[#FFB347]"
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block font-serif font-black text-white text-sm leading-tight">
                        {meta.label}
                      </span>
                      <span className="block text-[12px] font-mono text-white/40 mt-0.5">
                        {pujas.length} {pujas.length === 1 ? "puja" : "pujas"} available
                      </span>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-[#FFB347]/70 transition-transform duration-300 shrink-0 ${
                      isOpen ? "rotate-180" : "rotate-0"
                    }`}
                  />
                </button>

                {/* ── Accordion Body with smooth animation ── */}
                <div
                  style={{
                    maxHeight: isOpen ? `${pujas.length * 400}px` : "0px",
                    transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    overflow: "hidden",
                  }}
                >
                  {/* ✅ MIGRATED TO SHARED MobileCarousel (mobileOnly —
                      desktop below stays the existing detailed row-list,
                      which was never a card grid, so only the mobile
                      carousel markup itself is shared/consolidated here). */}
                  <MobileCarousel
                    mobileOnly
                    className="border-t border-white/8 pt-4 pb-2 -mx-4 sm:-mx-6 px-4 sm:px-6"
                    items={openedOnce[cat] ? (categoryShowAll[cat] ? pujas : getInitialCuratedPujas(pujas)) : []}
                    getKey={(puja) => puja.id}
                    cardWidthClassName="w-[clamp(240px,72vw,420px)]"
                    renderItem={(puja) => {
                      return (
                        <div id={`puja-row-${puja.id}`}>
                          <PujaCategoryCard
                            puja={puja}
                            isDetailsOpen={isPujaDetailsOpen(puja.id)}
                            onToggleDetails={() => togglePujaDetails(puja.id)}
                            onBook={(name, amount) => { gaBookNowOpen(name, amount); onBookNowClick(name, amount); }}
                            onViewPriestProfile={onViewPriestProfile}
                          />
                        </div>
                      );
                    }}
                  />

                  <div className="hidden lg:block border-t border-white/8 divide-y divide-white/5">
                    {openedOnce[cat] && (categoryShowAll[cat] ? pujas : getInitialCuratedPujas(pujas)).map(puja => (
                      <PujaDesktopRow
                        key={puja.id}
                        puja={puja}
                        isDetailsOpen={isPujaDetailsOpen(puja.id)}
                        onToggleDetails={() => togglePujaDetails(puja.id)}
                        onViewPriestProfile={onViewPriestProfile}
                        onBook={(name, amount) => { gaBookNowOpen(name, amount); onBookNowClick(name, amount); }}
                      />
                    ))}
                  </div>

                  {/* "Show more" — only when this category has more pujas than the
                      initial 2 Odisha + 2 North India + 1 West India curated set. */}
                  {openedOnce[cat] && !categoryShowAll[cat] && pujas.length > getInitialCuratedPujas(pujas).length && (
                    <div className="px-6 py-3 border-t border-white/8">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleCategoryShowAll(cat); }}
                        className="w-full flex items-center justify-center gap-1.5 text-[12px] font-bold text-[#5EEAD4] hover:text-[#7FF4DE] uppercase tracking-wide py-1.5"
                      >
                        Show {pujas.length - getInitialCuratedPujas(pujas).length} more <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* ── Other category pujas (festivals / ancestor / graha_shanti / education) ── */}
          {otherPujas.length > 0 && (
            <div
              id="accordion-section-other"
              className="bg-[#092320] rounded-2xl border border-white/10 overflow-hidden"
            >
              <button
                onClick={() => toggleSection("other")}
                className="w-full flex items-center justify-between px-6 py-4 text-left min-h-[60px] hover:bg-white/3 transition-colors"
                aria-expanded={!!openSections["other"]}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    openSections["other"] ? "bg-[#FFB347] text-[#021816]" : "bg-[#FFB347]/10 text-[#FFB347]"
                  }`}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block font-serif font-black text-white text-sm leading-tight">
                      Festivals, Ancestral & Graha Shanti
                    </span>
                    <span className="block text-[12px] font-mono text-white/40 mt-0.5">
                      {otherPujas.length} {otherPujas.length === 1 ? "puja" : "pujas"} available
                    </span>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-[#FFB347]/70 transition-transform duration-300 shrink-0 ${
                    openSections["other"] ? "rotate-180" : "rotate-0"
                  }`}
                />
              </button>

              <div
                style={{
                  maxHeight: openSections["other"] ? `${(categoryShowAll["other"] ? otherPujas.length : Math.min(otherPujas.length, OTHER_CATEGORY_INITIAL_COUNT)) * 400 + 100}px` : "0px",
                  transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  overflow: "hidden",
                }}
              >
                {/* ✅ MIGRATED TO SHARED MobileCarousel (mobileOnly — see
                    the category carousels above for why). */}
                <MobileCarousel
                  mobileOnly
                  className="border-t border-white/8 pt-4 pb-2 -mx-4 sm:-mx-6 px-4 sm:px-6"
                  items={openedOnce["other"] ? (categoryShowAll["other"] ? otherPujas : otherPujas.slice(0, OTHER_CATEGORY_INITIAL_COUNT)) : []}
                  getKey={(puja) => puja.id}
                  cardWidthClassName="w-[clamp(240px,72vw,420px)]"
                  renderItem={(puja) => {
                    return (
                      <div id={`puja-row-${puja.id}`}>
                        <PujaCategoryCard
                          puja={puja}
                          isDetailsOpen={isPujaDetailsOpen(puja.id)}
                          onToggleDetails={() => togglePujaDetails(puja.id)}
                          onBook={(name, amount) => { gaBookNowOpen(name, amount); onBookNowClick(name, amount); }}
                          onViewPriestProfile={onViewPriestProfile}
                        />
                      </div>
                    );
                  }}
                />

                {/* "other" category desktop row-list — now shares the exact
                    same PujaDesktopRow component as the 5 category
                    accordions above, so pujas here with pricingMode
                    "duration-pandit" get the identical Duration + Pandit
                    selector, live pricing, and dynamic Purpose notes.
                    Markup/styling is unchanged; only the duplicated inline
                    JSX was replaced with the shared component. */}
                <div className="hidden lg:block border-t border-white/8 divide-y divide-white/5">
                  {openedOnce["other"] && (categoryShowAll["other"] ? otherPujas : otherPujas.slice(0, OTHER_CATEGORY_INITIAL_COUNT)).map(puja => (
                    <PujaDesktopRow
                      key={puja.id}
                      puja={puja}
                      isDetailsOpen={isPujaDetailsOpen(puja.id)}
                      onToggleDetails={() => togglePujaDetails(puja.id)}
                      onViewPriestProfile={onViewPriestProfile}
                      onBook={(name, amount) => { gaBookNowOpen(name, amount); onBookNowClick(name, amount); }}
                    />
                  ))}
                </div>

                {/* "Show more" — only when this category has more pujas than the
                    initial 6 shown, same pattern as the accordion sections above. */}
                {openedOnce["other"] && !categoryShowAll["other"] && otherPujas.length > OTHER_CATEGORY_INITIAL_COUNT && (
                  <div className="px-6 py-3 border-t border-white/8">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleCategoryShowAll("other"); }}
                      className="w-full flex items-center justify-center gap-1.5 text-[12px] font-bold text-[#5EEAD4] hover:text-[#7FF4DE] uppercase tracking-wide py-1.5"
                    >
                      Show {otherPujas.length - OTHER_CATEGORY_INITIAL_COUNT} more <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Disclaimer — same wording/placement pattern as Simple Pujas,
            Seva (SEVA_DISCLAIMER) and Bazaar (BAZAAR_DISCLAIMER), so every
            offering type is consistent about process transparency and
            makes no outcome guarantees. */}
        <p className="text-[12px] text-white/35 font-mono mt-6 leading-relaxed max-w-2xl mx-auto text-center">
          Pujas are performed with devotion as per temple and priest process. Timings may vary depending on temple schedule, festival rush, and priest availability. A puja is an act of devotion and does not guarantee any specific outcome. Wherever a temple permits, we lovingly share a blessed photograph — and where allowed, a short video/audio glimpse — of your puja as a cherished remembrance. At certain ancient and revered temples, sacred privacy traditions may not permit recording; we deeply respect this, and in such cases your devotion is warmly acknowledged through a signed priest certificate and, where permitted, the priest's own personal testimony.
        </p>

      </div>
    </section>
  );
}
