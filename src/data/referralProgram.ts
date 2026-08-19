/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// "Refer, Earn & Grow with Dharma" — data model
// SIX fully separate plan systems, one per participant type on Sri Dwar.
// The five PROVIDER categories (Pujari, Mandal, Yoga Guru, Dharmic Expert,
// Seva Provider) each have their own 5-tier ladder with unique names,
// pricing (monthly + annual), taglines, services/fee model, commission
// structure, and CTA copy — a paid subscription for listing/marketplace
// features, since a Panditji, a Mandal, a Yoga Guru, a Dharmic Expert, and
// a Seva Provider all fundamentally sell a service and earn a commission
// on top, just worded and priced for who they are.
//
// The DEVOTEE category is structurally different and intentionally has NO
// subscription fee at any tier: it is a free loyalty/community-engagement
// program. Tier progression is driven entirely by the devotee's own genuine
// activity — completed pujas/sevas/divine contributions, temple/priest reviews,
// and Setu Yatra directory divine contributions — never by recruiting other
// people, paying for a higher tier, or unlocking tiers through referral
// volume. Referral cashback still exists (a modest, tier-linked bonus
// earned only when someone a devotee refers completes a genuine, paid
// booking), but it is a side benefit of a devotion-first program, not the
// program's core mechanic. See DEVOTEE_ENGAGEMENT_TIER_THRESHOLDS below.
//
//   1. DEVOTEE_REFERRAL_TIERS      — "Diya"..."Chakra" Circles (free, engagement-based)
//   2. PUJARI_TIERS                — "Shishya"..."Rajguru" Paths
//   3. PUJA_MANDAL_TIERS           — "Aarambh"..."Samrat" Sangh
//   4. YOGA_GURU_TIERS             — "Sadhak"..."Maharishi" Marg
//   5. DHARMIC_EXPERT_TIERS        — "Gyani"..."Mahopadhyay" Peeth
//   6. SEVA_PROVIDER_TIERS         — "Sevak"..."Mahasevak" Seva
// ============================================================================

export interface CommissionTier {
  bookingLabel: string;
  rate: number; // percentage
  description: string;
}

// Cashback is calculated per referred devotee — booking count resets for
// every new person a Dharmic ID refers, not for the referrer overall. This
// baseline applies to every plan category below; paid tiers add a boost.
// Cashback eligibility is capped at each referred devotee's 8th successful
// booking; no further cashback accrues on that devotee's bookings beyond
// the 8th, though the referrer remains free to refer new devotees at any time.
export const COMMISSION_STRUCTURE: CommissionTier[] = [
  { bookingLabel: "1st Booking", rate: 3, description: "First eligible puja, seva, divine contribution, product, or consultation booked by your referred devotee." },
  { bookingLabel: "2nd Booking", rate: 2, description: "Second eligible booking by the same referred devotee." },
  { bookingLabel: "3rd–8th Booking", rate: 1, description: "Every eligible booking from the 3rd through the 8th booking by the same referred devotee. Cashback eligibility ends after that devotee's 8th successful booking." },
];

export const REFERRAL_CASHBACK_BOOKING_CAP = 8; // eligible bookings per referred devotee, after which cashback stops accruing for that devotee

export type PlanCategoryId = "devotee" | "pujari" | "mandal" | "yogaguru" | "expert" | "seva";
export type ProviderCategoryId = Exclude<PlanCategoryId, "devotee">;

export interface PlanCategoryMeta {
  id: PlanCategoryId;
  tabLabel: string;   // short label for the category tab
  planLabel: string;  // full title shown above the 5-tier grid
  icon: "Users" | "Flame" | "Landmark" | "Sparkles" | "BookOpen" | "HeartHandshake";
  intro: string;
}

export const PLAN_CATEGORIES: PlanCategoryMeta[] = [
  {
    id: "devotee",
    tabLabel: "Devotees",
    planLabel: "5-Tier Devotee Circles",
    icon: "Users",
    intro: "Always free, for every devotee — no subscription, no recruiting. Your Circle grows as your own pujas, sevas, divine contributions, and community knowledge-sharing grow, with genuine referral cashback as a bonus on top.",
  },
  {
    id: "pujari",
    tabLabel: "Pujaris (Pundits)",
    planLabel: "5-Tier Pujari (Pundit) Service Paths",
    icon: "Flame",
    intro: "Built for individual priests running a puja practice — list your rituals, set your own dakshina, reach genuine devotees, and earn referral cashback and rewards on top.",
  },
  {
    id: "mandal",
    tabLabel: "Puja Mandals",
    planLabel: "5-Tier Puja Mandal Sangh Plans",
    icon: "Landmark",
    intro: "Built for community puja committees organizing festivals — list your events, collect sponsorships & seva divine contributions, and earn referral cashback and rewards on top.",
  },
  {
    id: "yogaguru",
    tabLabel: "Yoga Gurus",
    planLabel: "5-Tier Yoga Guru Marg Plans",
    icon: "Sparkles",
    intro: "Built for yoga & wellness instructors — list your classes and retreats, set your own session fees, reach genuine students, and earn referral cashback and rewards on top.",
  },
  {
    id: "expert",
    tabLabel: "Dharmic Experts",
    planLabel: "5-Tier Dharmic Expert Peeth Plans",
    icon: "BookOpen",
    intro: "Built for astrologers, vastu consultants & spiritual counselors — list your consultations, set your own fees, reach genuine clients, and earn referral cashback and rewards on top.",
  },
  {
    id: "seva",
    tabLabel: "Seva Providers",
    planLabel: "5-Tier Seva Provider Seva Plans",
    icon: "HeartHandshake",
    intro: "Built for volunteers & NGOs running annadanam, prasad and divine contribution drives — list your seva activities transparently, and earn referral cashback and rewards on top.",
  },
];

// ============================================================================
// 1. DEVOTEES — "Referral Circles"
// Purely about referral bonuses and commission income. No service listings,
// no puja fees, no customer-management features of any kind.
// ============================================================================
export interface DevoteeReferralTier {
  id: string;
  name: string;
  monthlyPrice: number;
  monthlyPriceLabel: string;
  annualPrice: number;
  annualPriceLabel: string;
  annualSavingsLabel: string;
  tagline: string;
  referralCapacity: string;
  networkCommissionRate: string;
  // Structured percentage extracted from networkCommissionRate above, so
  // every place that shows this tier's cashback rate (the Plans page tier
  // card, the 5-Tier Devotee Referral Circles badge, and the Referral
  // Dashboard inside the Dharmic ID) can render the exact same "X%"
  // value in the exact same aligned, consistently-formatted style — rather
  // than each screen re-deriving or re-wording it from the sentence above.
  cashbackRatePercent: number;
  milestoneBonusMultiplier: string;
  payoutSpeed: string;
  referralSupport: string;
  bonusPerks: string[];
  highlight?: boolean;
  ctaLabel: string;
}

export const DEVOTEE_REFERRAL_TIERS: DevoteeReferralTier[] = [
  {
    id: "diya",
    name: "Diya Circle",
    monthlyPrice: 0,
    monthlyPriceLabel: "Free",
    annualPrice: 0,
    annualPriceLabel: "Free",
    annualSavingsLabel: "Always free",
    tagline: "Light the first diya of your own dharmic journey — begin sharing genuine pujas, sevas, and temple experiences with your circle.",
    referralCapacity: "Share your referral link freely — no cap on who you can invite",
    networkCommissionRate: "Guide devotees to their first blessings and earn an additional 1% referral cashback on top of the standard booking cashback, only when they complete a genuine, paid booking",
    cashbackRatePercent: 1,
    milestoneBonusMultiplier: "Standard milestone bonus credits",
    payoutSpeed: "Monthly payout cycle",
    referralSupport: "Email support, 48-hour response",
    bonusPerks: ["Personal referral dashboard", "Digital Dharmic ID referral card", "Eligible for all milestone rewards", "Full referral cashback & community benefits from day one"],
    ctaLabel: "Join Diya Circle — Free",
  },
  {
    id: "kalash",
    name: "Kalash Circle",
    monthlyPrice: 0,
    monthlyPriceLabel: "Free",
    annualPrice: 0,
    annualPriceLabel: "Free",
    annualSavingsLabel: "Always free",
    tagline: "Fill your sacred kalash, drop by drop — earned by completing your own pujas, sevas, and divine contributions, and sharing what you've learned with fellow devotees.",
    referralCapacity: "Unlocked once you've completed a handful of genuine bookings or divine contributions of your own",
    networkCommissionRate: "Walk beside more devotees on their journey and earn an additional 2% referral cashback on top of the standard booking cashback, only when they complete a genuine, paid booking",
    cashbackRatePercent: 2,
    milestoneBonusMultiplier: "1.25x milestone bonus credits",
    payoutSpeed: "Twice-monthly payout cycle",
    referralSupport: "Priority email + WhatsApp support",
    bonusPerks: ["Verified devotee badge on your profile", "Early access to seasonal community campaigns", "A guiding hand from our support team as your circle grows"],
    ctaLabel: "Grow with Kalash — Free",
  },
  {
    id: "shankh",
    name: "Shankh Circle",
    monthlyPrice: 0,
    monthlyPriceLabel: "Free",
    annualPrice: 0,
    annualPriceLabel: "Free",
    annualSavingsLabel: "Always free",
    tagline: "Sound the shankh and let your circle hear the call — recognition for devotees whose own bookings, reviews, and directory divine contributions show sustained, genuine engagement.",
    referralCapacity: "Unlocked through consistent participation — attending pujas/sevas, writing verified temple experiences, or contributing to the Sri Dwar directory",
    networkCommissionRate: "Answer the call of your growing circle and earn an additional 3% referral cashback on top of the standard booking cashback, only when they complete a genuine, paid booking",
    cashbackRatePercent: 3,
    milestoneBonusMultiplier: "1.5x milestone bonus credits",
    payoutSpeed: "Weekly payout cycle",
    referralSupport: "Dedicated referral support coordinator",
    bonusPerks: ["Featured community shout-out for active contributors", "Access to co-branded share creatives", "Recognition within the Sri Dwar community for consistent, genuine participation"],
    highlight: true,
    ctaLabel: "Sound the Shankh Circle",
  },
  {
    id: "trishul",
    name: "Trishul Circle",
    monthlyPrice: 0,
    monthlyPriceLabel: "Free",
    annualPrice: 0,
    annualPriceLabel: "Free",
    annualSavingsLabel: "Always free",
    tagline: "Wield the trishul of a true community anchor — for devotees with a real, sustained history of bookings, reviews, and knowledge-sharing on the platform.",
    referralCapacity: "Unlocked through a strong track record of your own genuine bookings and verified community divine contributions",
    networkCommissionRate: "Lead a thriving circle of devotees and earn an additional 4% referral cashback on top of the standard booking cashback, only when they complete a genuine, paid booking",
    cashbackRatePercent: 4,
    milestoneBonusMultiplier: "2x milestone bonus credits",
    payoutSpeed: "Faster, on-demand payout requests",
    referralSupport: "Dedicated community support contact",
    bonusPerks: ["Eligible for seasonal campaign rewards", "Invitations to community/satsang events where available", "Recognition as a trusted, long-standing voice in the Sri Dwar community"],
    ctaLabel: "Lead with Trishul — Free",
  },
  {
    id: "chakra",
    name: "Chakra Circle",
    monthlyPrice: 0,
    monthlyPriceLabel: "Free",
    annualPrice: 0,
    annualPriceLabel: "Free",
    annualSavingsLabel: "Always free",
    tagline: "Set the chakra of dharma turning across your whole community — the top tier of recognition, reserved for devotees with the deepest, most genuine engagement.",
    referralCapacity: "Unlocked at the highest level of sustained genuine engagement — bookings, reviews, and directory divine contributions over time",
    networkCommissionRate: "Set the wheel of dharma in motion for your whole community and earn an additional 5% referral cashback on top of the standard booking cashback, only when they complete a genuine, paid booking",
    cashbackRatePercent: 5,
    milestoneBonusMultiplier: "3x milestone bonus credits + Chakra-tier recognition status",
    payoutSpeed: "Fastest available payout cycle",
    referralSupport: "White-glove onboarding + priority support line",
    bonusPerks: ["Premium homepage feature for your devotion story", "Invitations to community leadership conversations", "Standing as a recognised pillar of the Sri Dwar devotee community"],
    ctaLabel: "Go Chakra — Free",
  },
];

// ============================================================================
// Shared shape for the five service-based provider categories below.
// Each array's content (names, prices, services, fees, benefits) is fully
// custom to that category — only the field shape is reused.
// ============================================================================
export interface ProviderCategoryTier {
  id: string;
  categoryId: ProviderCategoryId;
  name: string;
  monthlyPrice: number;
  monthlyPriceLabel: string;
  annualPrice: number;
  annualPriceLabel: string;
  annualSavingsLabel: string;
  /**
   * What the annual plan gives beyond the free days already reflected in
   * annualSavingsLabel — a genuine capability/priority/support upgrade a
   * monthly subscriber does NOT get, so the monthly-vs-annual choice is
   * about more than just a discount. Optional so other provider categories
   * (Mandal, Yoga Guru, Dharmic Expert, Seva Provider) are unaffected until
   * they're given the same treatment.
   */
  annualExtraBenefit?: string;
  tagline: string;
  servicesIncluded: string;
  feeModel: string;
  customerReach: string;
  commissionEligibility: string;
  referralRewards: string;
  priorityListing: boolean;
  premiumVisibility: boolean;
  verifiedBadge: boolean;
  marketingTools: boolean;
  analytics: "Basic" | "Standard" | "Advanced" | "Full Suite";
  support: string;
  payoutSpeed: string;
  exclusiveBenefits: string[];
  highlight?: boolean;
  ctaLabel: string;
}

// ============================================================================
// 2. PUJARIS (PUNDITS) — "Service Paths"
// Individual priests performing home visits, temple rituals, weddings & yagnas.
// ============================================================================
export const PUJARI_TIERS: ProviderCategoryTier[] = [
  {
    id: "shishya", categoryId: "pujari", name: "Shishya Path",
    monthlyPrice: 199, monthlyPriceLabel: "₹199/month",
    annualPrice: 2189, annualPriceLabel: "₹2,189/year", annualSavingsLabel: "30 days free",
    annualExtraBenefit: "Annual Shishyas also get a locked-in rate for the full year (no mid-year price change) and skip 12 separate monthly renewals — one less thing to track while you're building your first listing.",
    tagline: "Take your first steps as a shishya of sacred ritual — bring your puja and seva offerings online and let devotees find you.",
    servicesIncluded: "List puja, griha pravesh, satyanarayan & basic ritual services on your Dharmic ID profile",
    feeModel: "You set your own dakshina/puja fees — no markup beyond your subscription",
    customerReach: "~8 genuine puja enquiries/month, or approx. ₹3,000 worth of ritual opportunities on average",
    commissionEligibility: "Standard referral cashback structure (3% / 2% / 1%)",
    referralRewards: "Up to 15 active referral links",
    priorityListing: false, premiumVisibility: false, verifiedBadge: false, marketingTools: false,
    analytics: "Basic", support: "Email support, 48-hour response", payoutSpeed: "Monthly payout cycle",
    exclusiveBenefits: ["Listed in city/temple search results", "Access to the Referral Dashboard", "Digital Panditji profile page", "Every listing reviewed for authenticity before it goes live"],
    ctaLabel: "Begin the Shishya Path",
  },
  {
    id: "purohit", categoryId: "pujari", name: "Purohit Path",
    monthlyPrice: 299, monthlyPriceLabel: "₹299/month",
    annualPrice: 3140, annualPriceLabel: "₹3,140/year", annualSavingsLabel: "45 days free",
    annualExtraBenefit: "Annual Purohits keep their Verified badge and priority routing active continuously through the full festival calendar — no risk of a lapsed monthly renewal dropping you out of rotation during a high-demand season, on top of the 45 days free above.",
    tagline: "Walk the purohit's path with steady purpose — home visits, temple rituals, and muhurat consultations flow to you consistently.",
    servicesIncluded: "Priority routing for home-visit pujas, temple rituals & muhurat consultations",
    feeModel: "Set your own dakshina, plus milestone bonuses on high-value ceremonies",
    customerReach: "Targets approx. ₹8,000 worth of opportunities or 40 rituals/month",
    commissionEligibility: "Standard structure + eligible for milestone bonuses",
    referralRewards: "Up to 50 active referral links",
    priorityListing: true, premiumVisibility: false, verifiedBadge: true, marketingTools: false,
    analytics: "Standard", support: "Priority email + WhatsApp, 24-hour response", payoutSpeed: "Twice-monthly payout cycle",
    exclusiveBenefits: ["Verified Panditji badge", "Priority placement in your city category", "Seasonal campaign eligibility", "Featured within your city's temple and ritual search results"],
    ctaLabel: "Walk the Purohit Path",
  },
  {
    id: "acharya", categoryId: "pujari", name: "Acharya Path",
    monthlyPrice: 499, monthlyPriceLabel: "₹499/month",
    annualPrice: 4990, annualPriceLabel: "₹4,990/year", annualSavingsLabel: "60 days free",
    annualExtraBenefit: "Annual Acharyas are prioritised for homepage priest spotlights and early seasonal campaign access over monthly subscribers when slots are limited, and lock in this year's rate before renewal pricing is reviewed — meaningful given weddings and yagnas are booked months ahead.",
    tagline: "Rise as an acharya devotees trust for weddings, yagnas, and full ceremonies — with featured visibility and boosted cashback.",
    servicesIncluded: "Featured listings for weddings, yagnas, havan & multi-day ceremonies",
    feeModel: "Set your own dakshina + 1% cashback boost across all tiers (4% / 3% / 2%)",
    customerReach: "Targets approx. ₹25,000 worth of opportunities or 80 rituals/month",
    commissionEligibility: "+1% cashback boost on all tiers (4% / 3% / 2%)",
    referralRewards: "Up to 150 active referral links",
    priorityListing: true, premiumVisibility: true, verifiedBadge: true, marketingTools: true,
    analytics: "Advanced", support: "Dedicated relationship coordinator", payoutSpeed: "Weekly payout cycle",
    exclusiveBenefits: ["Featured in homepage priest spotlights", "Co-branded marketing creatives", "Early seasonal campaign access", "Introduced to devotees planning milestone family ceremonies"],
    highlight: true,
    ctaLabel: "Rise on the Acharya Path",
  },
  {
    id: "mahant", categoryId: "pujari", name: "Mahant Path",
    monthlyPrice: 999, monthlyPriceLabel: "₹999/month",
    annualPrice: 9990, annualPriceLabel: "₹9,990/year", annualSavingsLabel: "60 days free",
    annualExtraBenefit: "Annual Mahants get their multi-ceremony calendar dashboard and dedicated account manager retained without a monthly re-verification cycle, and custom promotional campaigns are planned across the full year rather than restarted every month — better suited to managing an entire festival season end-to-end.",
    tagline: "Preside over a full festival and wedding season like a mahant leading his tradition — commanding calendar, boosted cashback, dedicated support.",
    servicesIncluded: "Multi-ceremony calendar management across weddings, yagnas & festival duties",
    feeModel: "Set your own dakshina + 2% cashback boost across all tiers (5% / 4% / 3%)",
    customerReach: "Benefits exceeding ₹60,000 worth of opportunities and 200+ rituals/month",
    commissionEligibility: "+2% cashback boost on all tiers (5% / 4% / 3%)",
    referralRewards: "Unlimited referral links",
    priorityListing: true, premiumVisibility: true, verifiedBadge: true, marketingTools: true,
    analytics: "Full Suite", support: "Dedicated account manager + priority grievance handling", payoutSpeed: "Faster, on-demand payout requests",
    exclusiveBenefits: ["Multi-ceremony calendar dashboard", "Custom promotional campaigns", "Eligible for seasonal campaign rewards", "Recognised as a senior voice within the Sri Dwar priest community"],
    ctaLabel: "Ascend to the Mahant Path",
  },
  {
    id: "rajguru", categoryId: "pujari", name: "Rajguru Path",
    monthlyPrice: 1299, monthlyPriceLabel: "₹1,299/month",
    annualPrice: 12990, annualPriceLabel: "₹12,990/year", annualSavingsLabel: "60 days free",
    annualExtraBenefit: "Annual Rajgurus keep white-glove onboarding, 24x7 support, and custom commercial terms locked for the full year without renegotiation, and are first in line when premium homepage & festival-season visibility slots are allocated — the difference matters most for a lineage managing several disciples' calendars at once.",
    tagline: "Ascend to the standing of a rajguru — unlimited reach for the most sought-after pandits and multi-priest lineages, honoured platform-wide.",
    servicesIncluded: "Unlimited ceremony listings across your entire priest team/lineage",
    feeModel: "Set your own dakshina + 3% cashback boost across all tiers (6% / 5% / 4%)",
    customerReach: "Unlimited genuine customer access — no monthly enquiry cap",
    commissionEligibility: "+3% cashback boost on all tiers (6% / 5% / 4%)",
    referralRewards: "Unlimited referral links, plus individual team-member profiles for your disciples",
    priorityListing: true, premiumVisibility: true, verifiedBadge: true, marketingTools: true,
    analytics: "Full Suite", support: "White-glove onboarding + 24x7 dedicated support line", payoutSpeed: "Fastest available payout cycle",
    exclusiveBenefits: ["Premium homepage & festival-season visibility", "Ideal for lineages with multiple disciples", "Custom commercial terms available on request", "Honoured as a lineage-level presence across the platform"],
    ctaLabel: "Attain the Rajguru Path",
  },
];

// ============================================================================
// 3. PUJA MANDALS — "Sangh" Plans
// Community puja committees organizing festivals, pandals & processions.
// ============================================================================
export const PUJA_MANDAL_TIERS: ProviderCategoryTier[] = [
  {
    id: "aarambh", categoryId: "mandal", name: "Aarambh Sangh",
    monthlyPrice: 299, monthlyPriceLabel: "₹299/month",
    annualPrice: 3289, annualPriceLabel: "₹3,289/year", annualSavingsLabel: "30 days free",
    annualExtraBenefit: "Annual Aarambh Sanghs lock in this year's rate before renewal pricing is reviewed and skip 12 separate monthly renewals — one less thing to track while your committee is still building its first festival listing.",
    tagline: "Begin your mandal's dharmic journey — bring your first festival, puja, and Aarti schedule online for your community to discover.",
    servicesIncluded: "List community pujas, festival events & Aarti schedules on your Mandal's Dharmic ID",
    feeModel: "Collect seva/sponsorship divine contributions with no markup beyond your subscription",
    customerReach: "~15 genuine devotee footfalls/event, or approx. ₹5,000 worth of sponsorship interest",
    commissionEligibility: "Standard referral cashback structure (3% / 2% / 1%)",
    referralRewards: "Up to 15 active referral links",
    priorityListing: false, premiumVisibility: false, verifiedBadge: false, marketingTools: false,
    analytics: "Basic", support: "Email support, 48-hour response", payoutSpeed: "Monthly payout cycle",
    exclusiveBenefits: ["Listed in city festival directory", "Access to the Referral Dashboard", "Digital Mandal profile page", "A digital home for your mandal's story and seva history"],
    ctaLabel: "Begin the Aarambh Sangh",
  },
  {
    id: "utsav", categoryId: "mandal", name: "Utsav Sangh",
    monthlyPrice: 999, monthlyPriceLabel: "₹999/month",
    annualPrice: 10490, annualPriceLabel: "₹10,490/year", annualSavingsLabel: "45 days free",
    annualExtraBenefit: "Annual Utsav Sanghs keep their Verified badge and priority routing active continuously through the full festival calendar — no risk of a lapsed monthly renewal dropping the mandal out of rotation right before Ganesh Utsav or Durga Puja.",
    tagline: "Celebrate every utsav with steady visibility — regular festivals, seasonal events, and sponsorships flow to your mandal consistently.",
    servicesIncluded: "Priority routing for festival announcements, ticketed events & volunteer sign-ups",
    feeModel: "Collect divine contributions + eligible for milestone bonuses on large festivals",
    customerReach: "Targets approx. ₹15,000 worth of sponsorship interest or 30 event RSVPs/month",
    commissionEligibility: "Standard structure + eligible for milestone bonuses",
    referralRewards: "Up to 50 active referral links",
    priorityListing: true, premiumVisibility: false, verifiedBadge: true, marketingTools: false,
    analytics: "Standard", support: "Priority email + WhatsApp support", payoutSpeed: "Twice-monthly payout cycle",
    exclusiveBenefits: ["Verified Mandal badge", "Priority placement in your city category", "Seasonal campaign eligibility", "Recognised within your city's festival calendar"],
    ctaLabel: "Celebrate with Utsav Sangh",
  },
  {
    id: "mahotsav", categoryId: "mandal", name: "Mahotsav Sangh",
    monthlyPrice: 2999, monthlyPriceLabel: "₹2,999/month",
    annualPrice: 29990, annualPriceLabel: "₹29,990/year", annualSavingsLabel: "60 days free",
    annualExtraBenefit: "Annual Mahotsav Sanghs are prioritised for homepage festival spotlights and early seasonal campaign access over monthly subscribers when slots are limited — meaningful given multi-day festival sponsorships are usually locked in months ahead.",
    tagline: "Host a mahotsav worthy of your mandal's legacy — featured listings for Durga Puja, Ganesh Utsav, and multi-day celebrations.",
    servicesIncluded: "Featured listings for multi-day festivals, pandals & processions",
    feeModel: "Collect divine contributions + 1% cashback boost across all tiers (4% / 3% / 2%)",
    customerReach: "Targets approx. ₹50,000 worth of sponsorship interest or 100+ event RSVPs/month",
    commissionEligibility: "+1% cashback boost on all tiers (4% / 3% / 2%)",
    referralRewards: "Up to 150 active referral links",
    priorityListing: true, premiumVisibility: true, verifiedBadge: true, marketingTools: true,
    analytics: "Advanced", support: "Dedicated relationship coordinator", payoutSpeed: "Weekly payout cycle",
    exclusiveBenefits: ["Featured in homepage festival spotlights", "Co-branded marketing creatives", "Early seasonal campaign access", "Introduced to devotees seeking large festival sponsorships"],
    highlight: true,
    ctaLabel: "Host the Mahotsav Sangh",
  },
  {
    id: "rajotsav", categoryId: "mandal", name: "Rajotsav Sangh",
    monthlyPrice: 9999, monthlyPriceLabel: "₹9,999/month",
    annualPrice: 99990, annualPriceLabel: "₹99,990/year", annualSavingsLabel: "60 days free",
    annualExtraBenefit: "Annual Rajotsav Sanghs keep their multi-pandal dashboard and dedicated account manager retained without a monthly re-verification cycle, and custom promotional campaigns are planned across the full festival season rather than restarted every month.",
    tagline: "Lead a rajotsav spanning many pandals — coordinate processions and festival teams across your entire district with ease.",
    servicesIncluded: "Multi-pandal & multi-volunteer-team event management dashboard",
    feeModel: "Collect divine contributions + 2% cashback boost across all tiers (5% / 4% / 3%)",
    customerReach: "Benefits exceeding ₹1,50,000 worth of sponsorship interest and 500+ RSVPs/month",
    commissionEligibility: "+2% cashback boost on all tiers (5% / 4% / 3%)",
    referralRewards: "Unlimited referral links across your committee",
    priorityListing: true, premiumVisibility: true, verifiedBadge: true, marketingTools: true,
    analytics: "Full Suite", support: "Dedicated account manager + priority grievance handling", payoutSpeed: "Faster, on-demand payout requests",
    exclusiveBenefits: ["Multi-pandal committee dashboard", "Custom promotional campaigns for your mandal", "Eligible for seasonal campaign rewards", "Recognised as a coordinating force across your district"],
    ctaLabel: "Lead the Rajotsav Sangh",
  },
  {
    id: "samrat", categoryId: "mandal", name: "Samrat Sangh",
    monthlyPrice: 24999, monthlyPriceLabel: "₹24,999/month",
    annualPrice: 249990, annualPriceLabel: "₹2,49,990/year", annualSavingsLabel: "60 days free",
    annualExtraBenefit: "Annual Samrat Sanghs keep white-glove onboarding, 24x7 support, and custom commercial terms locked for the full year without renegotiation, and are first in line when premium homepage & festival-season visibility slots are allocated across the federation.",
    tagline: "Command a samrat-scale federation of mandals — unlimited reach and premium visibility for citywide apex festival bodies.",
    servicesIncluded: "Unlimited event listings across your entire federation of affiliated mandals",
    feeModel: "Collect divine contributions + 3% cashback boost across all tiers (6% / 5% / 4%)",
    customerReach: "Unlimited genuine footfall & sponsorship access — no monthly cap",
    commissionEligibility: "+3% cashback boost on all tiers (6% / 5% / 4%)",
    referralRewards: "Unlimited referral links, plus individual team-member profiles for every affiliated mandal",
    priorityListing: true, premiumVisibility: true, verifiedBadge: true, marketingTools: true,
    analytics: "Full Suite", support: "White-glove onboarding + 24x7 dedicated support line", payoutSpeed: "Fastest available payout cycle",
    exclusiveBenefits: ["Premium homepage & festival-season visibility", "Ideal for federations with 10+ affiliated mandals", "Custom commercial terms available on request", "Honoured as an apex body within the festival community"],
    ctaLabel: "Command the Samrat Sangh",
  },
];

// ============================================================================
// 4. YOGA GURUS — "Marg" Plans
// Individual yoga & wellness instructors: classes, retreats, teacher trainings.
// ============================================================================
export const YOGA_GURU_TIERS: ProviderCategoryTier[] = [
  {
    id: "sadhak", categoryId: "yogaguru", name: "Sadhak Marg",
    monthlyPrice: 199, monthlyPriceLabel: "₹199/month",
    annualPrice: 2189, annualPriceLabel: "₹2,189/year", annualSavingsLabel: "30 days free",
    annualExtraBenefit: "Annual Sadhaks lock in this year's rate before renewal pricing is reviewed and skip 12 separate monthly renewals — one less thing to track while you're still building your first class listing.",
    tagline: "Begin your teaching sadhana — bring your first yoga classes and wellness sessions online for genuine seekers to find.",
    servicesIncluded: "List yoga classes, meditation sessions & basic wellness consultations",
    feeModel: "You set your own class/session fees — no markup beyond your subscription",
    customerReach: "~10 genuine student enquiries/month, or approx. ₹3,000 worth of session interest",
    commissionEligibility: "Standard referral cashback structure (3% / 2% / 1%)",
    referralRewards: "Up to 15 active referral links",
    priorityListing: false, premiumVisibility: false, verifiedBadge: false, marketingTools: false,
    analytics: "Basic", support: "Email support, 48-hour response", payoutSpeed: "Monthly payout cycle",
    exclusiveBenefits: ["Listed in city wellness directory", "Access to the Referral Dashboard", "Digital Guru profile page", "Every class reviewed for authenticity before it goes live"],
    ctaLabel: "Step onto the Sadhak Marg",
  },
  {
    id: "yogi", categoryId: "yogaguru", name: "Yogi Marg",
    monthlyPrice: 499, monthlyPriceLabel: "₹499/month",
    annualPrice: 5240, annualPriceLabel: "₹5,240/year", annualSavingsLabel: "45 days free",
    annualExtraBenefit: "Annual Yogis keep their Verified badge and priority routing active continuously through the busiest wellness season (Yoga Day, New Year resolutions) with no risk of a lapsed monthly renewal dropping them out of rotation.",
    tagline: "Teach with the steadiness of a devoted yogi — a consistent flow of students for your classes, workshops, and sessions.",
    servicesIncluded: "Priority routing for group classes, retreats & personalized programs",
    feeModel: "Set your own fees, plus eligible for milestone bonuses",
    customerReach: "Targets approx. ₹8,000 worth of session interest or 40 bookings/month",
    commissionEligibility: "Standard structure + eligible for milestone bonuses",
    referralRewards: "Up to 50 active referral links",
    priorityListing: true, premiumVisibility: false, verifiedBadge: true, marketingTools: false,
    analytics: "Standard", support: "Priority email + WhatsApp support", payoutSpeed: "Twice-monthly payout cycle",
    exclusiveBenefits: ["Verified Yoga Guru badge", "Priority placement in your city category", "Seasonal campaign eligibility", "Featured within your city's wellness search results"],
    ctaLabel: "Walk the Yogi Marg",
  },
  {
    id: "siddha", categoryId: "yogaguru", name: "Siddha Marg",
    monthlyPrice: 1499, monthlyPriceLabel: "₹1,499/month",
    annualPrice: 14990, annualPriceLabel: "₹14,990/year", annualSavingsLabel: "60 days free",
    annualExtraBenefit: "Annual Siddhas are prioritised for homepage wellness spotlights and early seasonal campaign access over monthly subscribers when slots are limited — meaningful given retreats and teacher trainings are usually booked out months ahead.",
    tagline: "Attain siddha-level standing among wellness seekers — retreats, certified teacher trainings, and featured homepage spotlights.",
    servicesIncluded: "Featured listings for retreats, workshops & certified teacher trainings",
    feeModel: "Set your own fees + 1% cashback boost across all tiers (4% / 3% / 2%)",
    customerReach: "Targets approx. ₹25,000 worth of session interest or 100 bookings/month",
    commissionEligibility: "+1% cashback boost on all tiers (4% / 3% / 2%)",
    referralRewards: "Up to 150 active referral links",
    priorityListing: true, premiumVisibility: true, verifiedBadge: true, marketingTools: true,
    analytics: "Advanced", support: "Dedicated relationship coordinator", payoutSpeed: "Weekly payout cycle",
    exclusiveBenefits: ["Featured in homepage wellness spotlights", "Co-branded marketing creatives", "Early seasonal campaign access", "Introduced to seekers planning dedicated retreat time"],
    highlight: true,
    ctaLabel: "Attain the Siddha Marg",
  },
  {
    id: "rishi", categoryId: "yogaguru", name: "Rishi Marg",
    monthlyPrice: 3999, monthlyPriceLabel: "₹3,999/month",
    annualPrice: 39990, annualPriceLabel: "₹39,990/year", annualSavingsLabel: "60 days free",
    annualExtraBenefit: "Annual Rishis keep their multi-batch studio dashboard and dedicated account manager retained without a monthly re-verification cycle, and custom promotional campaigns are planned across the full year rather than restarted every month.",
    tagline: "Guide your students like a rishi guiding disciples — manage a full studio and retreat calendar with boosted cashback on every referral.",
    servicesIncluded: "Multi-batch class & retreat calendar management across your studio",
    feeModel: "Set your own fees + 2% cashback boost across all tiers (5% / 4% / 3%)",
    customerReach: "Benefits exceeding ₹60,000 worth of session interest and 300+ bookings/month",
    commissionEligibility: "+2% cashback boost on all tiers (5% / 4% / 3%)",
    referralRewards: "Unlimited referral links",
    priorityListing: true, premiumVisibility: true, verifiedBadge: true, marketingTools: true,
    analytics: "Full Suite", support: "Dedicated account manager + priority grievance handling", payoutSpeed: "Faster, on-demand payout requests",
    exclusiveBenefits: ["Multi-batch studio dashboard", "Custom promotional campaigns", "Eligible for seasonal campaign rewards", "Recognised as a senior voice within the Sri Dwar wellness community"],
    ctaLabel: "Journey the Rishi Marg",
  },
  {
    id: "maharishi", categoryId: "yogaguru", name: "Maharishi Marg",
    monthlyPrice: 7999, monthlyPriceLabel: "₹7,999/month",
    annualPrice: 79990, annualPriceLabel: "₹79,990/year", annualSavingsLabel: "60 days free",
    annualExtraBenefit: "Annual Maharishis keep white-glove onboarding, 24x7 support, and custom commercial terms locked for the full year without renegotiation, and are first in line when premium homepage & festival-season visibility slots are allocated.",
    tagline: "Stand as a maharishi of the wellness world — unlimited scale for institutes and multi-instructor teams, with premium platform-wide visibility.",
    servicesIncluded: "Unlimited class/retreat listings across your entire instructor team",
    feeModel: "Set your own fees + 3% cashback boost across all tiers (6% / 5% / 4%)",
    customerReach: "Unlimited genuine student access — no monthly cap",
    commissionEligibility: "+3% cashback boost on all tiers (6% / 5% / 4%)",
    referralRewards: "Unlimited referral links, plus individual team-member profiles for your entire team",
    priorityListing: true, premiumVisibility: true, verifiedBadge: true, marketingTools: true,
    analytics: "Full Suite", support: "White-glove onboarding + 24x7 dedicated support line", payoutSpeed: "Fastest available payout cycle",
    exclusiveBenefits: ["Premium homepage & festival-season visibility", "Ideal for institutes with 10+ instructors", "Custom commercial terms available on request", "Honoured as an institute-level presence across the platform"],
    ctaLabel: "Master the Maharishi Marg",
  },
];

// ============================================================================
// 5. DHARMIC EXPERTS — "Peeth" Plans
// Astrologers, vastu consultants, numerologists & spiritual counselors.
// ============================================================================
export const DHARMIC_EXPERT_TIERS: ProviderCategoryTier[] = [
  {
    id: "gyani", categoryId: "expert", name: "Gyani Peeth",
    monthlyPrice: 299, monthlyPriceLabel: "₹299/month",
    annualPrice: 3289, annualPriceLabel: "₹3,289/year", annualSavingsLabel: "30 days free",
    annualExtraBenefit: "Annual Gyanis lock in this year's rate before renewal pricing is reviewed and skip 12 separate monthly renewals — one less thing to track while you're still building your first consultation listing.",
    tagline: "Share the gyan you've cultivated — bring your first astrology, vastu, or spiritual counseling sessions online for seekers to discover.",
    servicesIncluded: "List astrology, vastu, numerology & spiritual counseling consultations",
    feeModel: "You set your own consultation fees — no markup beyond your subscription",
    customerReach: "~10 genuine consultation enquiries/month, or approx. ₹4,000 worth of session interest",
    commissionEligibility: "Standard referral cashback structure (3% / 2% / 1%)",
    referralRewards: "Up to 15 active referral links",
    priorityListing: false, premiumVisibility: false, verifiedBadge: false, marketingTools: false,
    analytics: "Basic", support: "Email support, 48-hour response", payoutSpeed: "Monthly payout cycle",
    exclusiveBenefits: ["Listed in city expert directory", "Access to the Referral Dashboard", "Digital Expert profile page", "Every consultation listing reviewed for authenticity before it goes live"],
    ctaLabel: "Enter the Gyani Peeth",
  },
  {
    id: "vidwan", categoryId: "expert", name: "Vidwan Peeth",
    monthlyPrice: 799, monthlyPriceLabel: "₹799/month",
    annualPrice: 8390, annualPriceLabel: "₹8,390/year", annualSavingsLabel: "45 days free",
    annualExtraBenefit: "Annual Vidwans keep their Verified badge and priority routing active continuously through peak consultation seasons (Navratri, wedding muhurat windows) with no risk of a lapsed monthly renewal dropping them out of rotation.",
    tagline: "Consult with the steady demand of a respected vidwan — a consistent flow of astrology, vastu, and counseling bookings.",
    servicesIncluded: "Priority routing for astrology, vastu & counseling consultation requests",
    feeModel: "Set your own fees, plus eligible for milestone bonuses",
    customerReach: "Targets approx. ₹10,000 worth of session interest or 40 consultations/month",
    commissionEligibility: "Standard structure + eligible for milestone bonuses",
    referralRewards: "Up to 50 active referral links",
    priorityListing: true, premiumVisibility: false, verifiedBadge: true, marketingTools: false,
    analytics: "Standard", support: "Priority email + WhatsApp support", payoutSpeed: "Twice-monthly payout cycle",
    exclusiveBenefits: ["Verified Expert badge", "Priority placement in your city category", "Seasonal campaign eligibility", "Featured within your city's expert search results"],
    ctaLabel: "Rise to the Vidwan Peeth",
  },
  {
    id: "shastri", categoryId: "expert", name: "Shastri Peeth",
    monthlyPrice: 1999, monthlyPriceLabel: "₹1,999/month",
    annualPrice: 19990, annualPriceLabel: "₹19,990/year", annualSavingsLabel: "60 days free",
    annualExtraBenefit: "Annual Shastris are prioritised for homepage expert spotlights and early seasonal campaign access over monthly subscribers when slots are limited — meaningful given detailed chart readings and vastu visits are usually booked weeks ahead.",
    tagline: "Earn the trust given to a shastri of deep learning — detailed chart readings, vastu site visits, and featured homepage spotlights.",
    servicesIncluded: "Featured listings for detailed chart readings, vastu site visits & retreats",
    feeModel: "Set your own fees + 1% cashback boost across all tiers (4% / 3% / 2%)",
    customerReach: "Targets approx. ₹30,000 worth of session interest or 100 consultations/month",
    commissionEligibility: "+1% cashback boost on all tiers (4% / 3% / 2%)",
    referralRewards: "Up to 150 active referral links",
    priorityListing: true, premiumVisibility: true, verifiedBadge: true, marketingTools: true,
    analytics: "Advanced", support: "Dedicated relationship coordinator", payoutSpeed: "Weekly payout cycle",
    exclusiveBenefits: ["Featured in homepage expert spotlights", "Co-branded marketing creatives", "Early seasonal campaign access", "Introduced to seekers requesting detailed, in-depth readings"],
    highlight: true,
    ctaLabel: "Ascend to the Shastri Peeth",
  },
  {
    id: "vachaspati", categoryId: "expert", name: "Vachaspati Peeth",
    monthlyPrice: 4999, monthlyPriceLabel: "₹4,999/month",
    annualPrice: 49990, annualPriceLabel: "₹49,990/year", annualSavingsLabel: "60 days free",
    annualExtraBenefit: "Annual Vachaspatis keep their multi-consultation calendar dashboard and dedicated account manager retained without a monthly re-verification cycle, and custom promotional campaigns are planned across the full year rather than restarted every month.",
    tagline: "Command the calendar of a vachaspati — full consultation scheduling and eligibility for platform panel features, with boosted cashback.",
    servicesIncluded: "Multi-consultation calendar management + eligibility for platform panel features",
    feeModel: "Set your own fees + 2% cashback boost across all tiers (5% / 4% / 3%)",
    customerReach: "Benefits exceeding ₹70,000 worth of session interest and 250+ consultations/month",
    commissionEligibility: "+2% cashback boost on all tiers (5% / 4% / 3%)",
    referralRewards: "Unlimited referral links",
    priorityListing: true, premiumVisibility: true, verifiedBadge: true, marketingTools: true,
    analytics: "Full Suite", support: "Dedicated account manager + priority grievance handling", payoutSpeed: "Faster, on-demand payout requests",
    exclusiveBenefits: ["Multi-consultation calendar dashboard", "Custom promotional campaigns", "Eligible for seasonal campaign rewards", "Recognised as a senior voice within the Sri Dwar expert community"],
    ctaLabel: "Command the Vachaspati Peeth",
  },
  {
    id: "mahopadhyay", categoryId: "expert", name: "Mahopadhyay Peeth",
    monthlyPrice: 9999, monthlyPriceLabel: "₹9,999/month",
    annualPrice: 99990, annualPriceLabel: "₹99,990/year", annualSavingsLabel: "60 days free",
    annualExtraBenefit: "Annual Mahopadhyays keep white-glove onboarding, 24x7 support, and custom commercial terms locked for the full year without renegotiation, and are first in line when premium homepage & festival-season visibility slots are allocated across the panel.",
    tagline: "Lead as a mahopadhyay guiding an entire panel of experts — unlimited consultation listings and premium platform-wide recognition.",
    servicesIncluded: "Unlimited consultation listings across your entire panel of experts",
    feeModel: "Set your own fees + 3% cashback boost across all tiers (6% / 5% / 4%)",
    customerReach: "Unlimited genuine consultation access — no monthly cap",
    commissionEligibility: "+3% cashback boost on all tiers (6% / 5% / 4%)",
    referralRewards: "Unlimited referral links, plus individual team-member profiles for your entire panel",
    priorityListing: true, premiumVisibility: true, verifiedBadge: true, marketingTools: true,
    analytics: "Full Suite", support: "White-glove onboarding + 24x7 dedicated support line", payoutSpeed: "Fastest available payout cycle",
    exclusiveBenefits: ["Premium homepage & festival-season visibility", "Ideal for institutes with 10+ consultants", "Custom commercial terms available on request", "Honoured as an institute-level presence across the platform"],
    ctaLabel: "Attain the Mahopadhyay Peeth",
  },
];

// ============================================================================
// 6. SEVA PROVIDERS — "Seva" Plans
// Volunteers & NGOs running annadanam, prasad distribution & divine contribution drives.
// Entry tier priced low (₹49/month) to stay accessible, in keeping with a
// charitable ethos, while still qualifying for referral cashback & commission.
// ============================================================================
export const SEVA_PROVIDER_TIERS: ProviderCategoryTier[] = [
  {
    id: "sevak", categoryId: "seva", name: "Sevak Seva",
    monthlyPrice: 49, monthlyPriceLabel: "₹49/month",
    annualPrice: 539, annualPriceLabel: "₹539/year", annualSavingsLabel: "30 days free",
    annualExtraBenefit: "Annual Sevaks lock in this year's rate before renewal pricing is reviewed and skip 12 separate monthly renewals — one less thing to track while you're still building your first drive listing.",
    tagline: "Begin your seva selflessly — list your first annadanam, prasad, or divine contribution drive with full transparency, for just ₹49/month.",
    servicesIncluded: "List annadanam drives, prasad distribution & divine contribution collection campaigns",
    feeModel: "No platform markup on divine contributions collected — 100% transparent seva accounting",
    customerReach: "~10 genuine volunteer/donor leads/month, or approx. ₹3,000 worth of divine contribution interest",
    commissionEligibility: "Standard referral cashback structure (3% / 2% / 1%)",
    referralRewards: "Up to 15 active referral links",
    priorityListing: false, premiumVisibility: false, verifiedBadge: false, marketingTools: false,
    analytics: "Basic", support: "Email support, 48-hour response", payoutSpeed: "Monthly payout cycle",
    exclusiveBenefits: ["Listed in city seva directory", "Access to the Referral Dashboard", "Digital Seva profile page", "Every drive reviewed for transparency before it goes live"],
    ctaLabel: "Start Sevak Seva — ₹49/mo",
  },
  {
    id: "karyakarta", categoryId: "seva", name: "Karyakarta Seva",
    monthlyPrice: 199, monthlyPriceLabel: "₹199/month",
    annualPrice: 2189, annualPriceLabel: "₹2,189/year", annualSavingsLabel: "30 days free",
    annualExtraBenefit: "Annual Karyakartas keep their Verified badge and priority routing active continuously through peak seva seasons (Annadanam drives, festival relief camps) with no risk of a lapsed monthly renewal dropping them out of rotation.",
    tagline: "Serve as a steady karyakarta — a consistent flow of volunteers and donors for your regular seva and divine contribution drives.",
    servicesIncluded: "Priority routing for volunteer sign-ups & recurring divine contribution drives",
    feeModel: "No platform markup + eligible for milestone bonuses on large drives",
    customerReach: "Targets approx. ₹8,000 worth of divine contribution interest or 40 volunteer sign-ups/month",
    commissionEligibility: "Standard structure + eligible for milestone bonuses",
    referralRewards: "Up to 50 active referral links",
    priorityListing: true, premiumVisibility: false, verifiedBadge: true, marketingTools: false,
    analytics: "Standard", support: "Priority email + WhatsApp support", payoutSpeed: "Twice-monthly payout cycle",
    exclusiveBenefits: ["Verified Seva badge", "Priority placement in your city category", "Seasonal campaign eligibility", "Featured within your city's seva search results"],
    ctaLabel: "Serve with Karyakarta Seva",
  },
  {
    id: "sanchalak", categoryId: "seva", name: "Sanchalak Seva",
    monthlyPrice: 499, monthlyPriceLabel: "₹499/month",
    annualPrice: 5240, annualPriceLabel: "₹5,240/year", annualSavingsLabel: "45 days free",
    annualExtraBenefit: "Annual Sanchalaks are prioritised for homepage seva spotlights and early seasonal campaign access over monthly subscribers when slots are limited — meaningful given large-scale annadanam and relief drives are usually planned weeks ahead.",
    tagline: "Coordinate as a sanchalak of large-scale seva — annadanam and relief drives featured with boosted cashback for every referral.",
    servicesIncluded: "Featured listings for large-scale annadanam, relief drives & bulk prasad distribution",
    feeModel: "No platform markup + 1% referral cashback boost (4% / 3% / 2%)",
    customerReach: "Targets approx. ₹20,000 worth of divine contribution interest or 150 volunteer sign-ups/month",
    commissionEligibility: "+1% cashback boost on all tiers (4% / 3% / 2%)",
    referralRewards: "Up to 150 active referral links",
    priorityListing: true, premiumVisibility: true, verifiedBadge: true, marketingTools: true,
    analytics: "Advanced", support: "Dedicated relationship coordinator", payoutSpeed: "Weekly payout cycle",
    exclusiveBenefits: ["Featured in homepage seva spotlights", "Co-branded marketing creatives", "Early seasonal campaign access", "Introduced to donors seeking large-scale relief efforts"],
    highlight: true,
    ctaLabel: "Organize with Sanchalak Seva",
  },
  {
    id: "pramukh", categoryId: "seva", name: "Pramukh Seva",
    monthlyPrice: 1499, monthlyPriceLabel: "₹1,499/month",
    annualPrice: 14990, annualPriceLabel: "₹14,990/year", annualSavingsLabel: "60 days free",
    annualExtraBenefit: "Annual Pramukhs keep their multi-team dashboard and dedicated account manager retained without a monthly re-verification cycle, and custom promotional campaigns are planned across the full year rather than restarted every month.",
    tagline: "Lead as a pramukh across many seva teams — a district-wide dashboard for coordinating volunteers, drives, and divine contributions.",
    servicesIncluded: "Multi-team volunteer & divine contribution-drive management dashboard",
    feeModel: "No platform markup + 2% referral cashback boost (5% / 4% / 3%)",
    customerReach: "Benefits exceeding ₹50,000 worth of divine contribution interest and 500+ volunteer sign-ups/month",
    commissionEligibility: "+2% cashback boost on all tiers (5% / 4% / 3%)",
    referralRewards: "Unlimited referral links across your teams",
    priorityListing: true, premiumVisibility: true, verifiedBadge: true, marketingTools: true,
    analytics: "Full Suite", support: "Dedicated account manager + priority grievance handling", payoutSpeed: "Faster, on-demand payout requests",
    exclusiveBenefits: ["Multi-team NGO dashboard", "Custom promotional campaigns", "Eligible for seasonal campaign rewards", "Recognised as a senior voice within the Sri Dwar seva community"],
    ctaLabel: "Lead as Pramukh Seva",
  },
  {
    id: "mahasevak", categoryId: "seva", name: "Mahasevak Seva",
    monthlyPrice: 3999, monthlyPriceLabel: "₹3,999/month",
    annualPrice: 39990, annualPriceLabel: "₹39,990/year", annualSavingsLabel: "60 days free",
    annualExtraBenefit: "Annual Mahasevaks keep white-glove onboarding, 24x7 support, and custom commercial terms locked for the full year without renegotiation, and are first in line when premium homepage & festival-season visibility slots are allocated across the federation.",
    tagline: "Stand as a mahasevak serving entire regions — unlimited scale, white-glove support, for NGO federations doing dharma's greatest work.",
    servicesIncluded: "Unlimited divine contribution-drive & volunteer listings across your entire federation",
    feeModel: "No platform markup + 3% referral cashback boost (6% / 5% / 4%)",
    customerReach: "Unlimited genuine volunteer & donor access — no monthly cap",
    commissionEligibility: "+3% cashback boost on all tiers (6% / 5% / 4%)",
    referralRewards: "Unlimited referral links, plus individual team-member profiles for every affiliated chapter",
    priorityListing: true, premiumVisibility: true, verifiedBadge: true, marketingTools: true,
    analytics: "Full Suite", support: "White-glove onboarding + 24x7 dedicated support line", payoutSpeed: "Fastest available payout cycle",
    exclusiveBenefits: ["Premium homepage & festival-season visibility", "Ideal for federations with 10+ affiliated chapters", "Custom commercial terms available on request", "Honoured as a federation-level presence across the platform"],
    ctaLabel: "Champion Mahasevak Seva",
  },
];

// Convenience map so UI code can look up "the 5 tiers for this category" and
// "which category + tier does this id belong to" without a long if/else.
export const PLAN_TIERS_BY_CATEGORY: Record<PlanCategoryId, (DevoteeReferralTier | ProviderCategoryTier)[]> = {
  devotee: DEVOTEE_REFERRAL_TIERS,
  pujari: PUJARI_TIERS,
  mandal: PUJA_MANDAL_TIERS,
  yogaguru: YOGA_GURU_TIERS,
  expert: DHARMIC_EXPERT_TIERS,
  seva: SEVA_PROVIDER_TIERS,
};

export function isDevoteeTier(tier: DevoteeReferralTier | ProviderCategoryTier): tier is DevoteeReferralTier {
  return "networkCommissionRate" in tier;
}

// ============================================================================
// Tier-unlock eligibility
// Every ladder (devotee + all five provider categories) has exactly 5 tiers,
// in ascending order. New users start on tier 0 only; each higher tier is
// revealed automatically as genuine, verified activity crosses that tier's
// requirement — never by self-reported claims, and never by payment.
//
// Two different gating shapes, by design:
//   • DEVOTEE ladder (Diya → Chakra): gates purely on the devotee's OWN
//     genuine engagement — their own completed, paid pujas/sevas/
//     divine contributions, plus verified community divine contributions (temple/priest
//     reviews, Setu Yatra directory entries). It intentionally does NOT
//     gate on how many other people a devotee has referred or recruited —
//     referral cashback is still earned on genuine bookings made by people
//     you refer (see COMMISSION_STRUCTURE / DEVOTEE_REFERRAL_TIERS above),
//     but recruiting more people is never required, rewarded, or counted
//     toward reaching a higher tier. This keeps the Devotee ladder a
//     genuine loyalty/engagement program, not a recruitment structure.
//   • The five PROVIDER ladders (Pujari, Mandal, Yoga Guru, Dharmic Expert,
//     Seva Provider) gate on verified referred devotees — i.e. genuine
//     paying customers the provider has brought to the platform. Unlike an
//     earlier version of this ladder, tiers no longer require recruiting a
//     minimum number of OTHER paying professionals into the platform —
//     that mechanic was removed because rewarding providers for recruiting
//     other fee-paying providers is a recruitment-based (MLM-style)
//     pattern, regardless of intent. Providers can still refer peers if
//     they want to, and any resulting bookings by that peer still count
//     like any other genuine referral, but recruiting peers is never a
//     requirement for advancement.
//
// Backing data: devotee engagement comes from lib/activities.fetchActivities
// (the devotee's own confirmed bookings) combined with verified community
// divine contributions where tracked; provider "verified referred devotees" comes
// from lib/referrals.fetchReferralList, filtered to referredParticipantType
// === "devotee" and an "active" (non-fraud-flagged) status.
// ============================================================================
export const QUALIFIED_REFERRAL_MIN_BOOKINGS = 2; // bookings a referred devotee needs before counting toward a provider's unlock ladder

// Devotee ladder — the devotee's own confirmed bookings + verified
// community divine contributions (a single combined "engagement score"), never
// referral/recruitment counts.
export const DEVOTEE_ENGAGEMENT_TIER_THRESHOLDS = [0, 3, 10, 25, 50] as const;

export interface ProviderTierUnlockRequirement {
  minVerifiedDevotees: number;
}

// Provider ladders — verified referred devotees (genuine customers) only.
export const PROVIDER_TIER_UNLOCK_THRESHOLDS: Record<ProviderCategoryId, ProviderTierUnlockRequirement[]> = {
  pujari: [
    { minVerifiedDevotees: 0 },
    { minVerifiedDevotees: 8 },
    { minVerifiedDevotees: 25 },
    { minVerifiedDevotees: 75 },
    { minVerifiedDevotees: 200 },
  ],
  mandal: [
    { minVerifiedDevotees: 0 },
    { minVerifiedDevotees: 10 },
    { minVerifiedDevotees: 30 },
    { minVerifiedDevotees: 100 },
    { minVerifiedDevotees: 300 },
  ],
  yogaguru: [
    { minVerifiedDevotees: 0 },
    { minVerifiedDevotees: 8 },
    { minVerifiedDevotees: 25 },
    { minVerifiedDevotees: 75 },
    { minVerifiedDevotees: 200 },
  ],
  expert: [
    { minVerifiedDevotees: 0 },
    { minVerifiedDevotees: 8 },
    { minVerifiedDevotees: 25 },
    { minVerifiedDevotees: 75 },
    { minVerifiedDevotees: 200 },
  ],
  seva: [
    { minVerifiedDevotees: 0 },
    { minVerifiedDevotees: 8 },
    { minVerifiedDevotees: 25 },
    { minVerifiedDevotees: 75 },
    { minVerifiedDevotees: 200 },
  ],
};

/**
 * Whether a given tier (by index, 0-based) is unlocked for the given category.
 * For "devotee", `qualifiedCount` is the devotee's own engagement score
 * (confirmed bookings + verified community divine contributions) — never a
 * referral/recruitment count. For the five provider categories,
 * `qualifiedCount` is verified referred devotees (genuine customers).
 */
export function isTierUnlocked(
  categoryId: PlanCategoryId,
  tierIndex: number,
  qualifiedCount: number
): boolean {
  if (categoryId === "devotee") {
    const threshold = DEVOTEE_ENGAGEMENT_TIER_THRESHOLDS[tierIndex] ?? Infinity;
    return qualifiedCount >= threshold;
  }
  const requirement = PROVIDER_TIER_UNLOCK_THRESHOLDS[categoryId as ProviderCategoryId][tierIndex];
  if (!requirement) return false;
  return qualifiedCount >= requirement.minVerifiedDevotees;
}

/** Human-readable eligibility text shown on a locked tier card. */
export function tierUnlockRequirementLabel(categoryId: PlanCategoryId, tierIndex: number): string {
  if (categoryId === "devotee") {
    const threshold = DEVOTEE_ENGAGEMENT_TIER_THRESHOLDS[tierIndex] ?? 0;
    if (threshold === 0) return "Available from the start";
    return `Unlocks after ${threshold} of your own completed pujas/sevas/divine contributions, temple reviews, or verified directory divine contributions`;
  }
  const requirement = PROVIDER_TIER_UNLOCK_THRESHOLDS[categoryId as ProviderCategoryId][tierIndex];
  if (!requirement || requirement.minVerifiedDevotees === 0) return "Available from the start";
  return `Unlocks at ${requirement.minVerifiedDevotees} verified referred devotees (${QUALIFIED_REFERRAL_MIN_BOOKINGS}+ bookings each)`;
}

/** Finds a tier (and which category it belongs to) by its id, across all six ladders. */
export function findPlanTierById(tierId: string | null | undefined): { categoryId: PlanCategoryId; tier: DevoteeReferralTier | ProviderCategoryTier } | null {
  if (!tierId || tierId === "none") return null;
  for (const category of PLAN_CATEGORIES) {
    const tier = PLAN_TIERS_BY_CATEGORY[category.id].find((t) => t.id === tierId);
    if (tier) return { categoryId: category.id, tier };
  }
  return null;
}

export interface Milestone {
  title: string;
  requirement: string;
  reward: string;
  icon: string;
}

export const MILESTONE_REWARDS: Milestone[] = [
  { icon: "🌱", title: "First Blessing", requirement: "Your first completed puja, seva, or divine contribution booked on Sri Dwar", reward: "₹51 bonus credit + Milestone Badge" },
  { icon: "🪔", title: "Growing in Devotion", requirement: "5 of your own completed bookings, or verified divine contributions (temple/priest reviews, Setu Yatra directory entries)", reward: "₹151 bonus credit + Bronze Devotee Badge" },
  { icon: "🔔", title: "Community Builder", requirement: "20 of your own completed bookings/divine contributions, sustained over at least 3 months", reward: "₹501 bonus credit + Silver Devotee Badge" },
  { icon: "🏵️", title: "Dharma Ambassador", requirement: "50 of your own completed bookings/divine contributions, sustained over at least 6 months", reward: "₹1,001 bonus credit + Gold Devotee Badge + Featured Profile" },
  { icon: "👑", title: "Grand Sevak", requirement: "100 of your own completed bookings/divine contributions, sustained over at least a year", reward: "₹2,501 bonus credit + Diamond-tier recognition status" },
];

export interface SeasonalCampaign {
  name: string;
  window: string;
  description: string;
}

// All campaigns below are merit- or milestone-based: rewards are earned by
// verified referral cashback performance, verified bookings, or verified
// directory divine contributions — never by chance, lucky draw, or random
// selection — so the program does not function as a lottery or prize
// scheme under Indian law.
export const SEASONAL_CAMPAIGNS: SeasonalCampaign[] = [
  { name: "Setu Yatra Challenge", window: "Ongoing", description: "Add real, verifiable temples, priests, or Dharmic experts to the Sri Dwar directory. Ranking is based solely on the number of valid, confirmed divine contributions — never on chance." },
  { name: "All India Pilgrimage", window: "Annual, year-end", description: "The devotee with the highest verified referral cashback earned across the full year is recognized with a fully-covered pilgrimage to a temple circuit of their choice, based purely on performance." },
  { name: "Family Pilgrimage to Four Holy Sites", window: "Annual, milestone-based", description: "Devotees who reach the Grand Sevak milestone (100 of their own completed bookings/divine contributions, sustained over at least a year) become eligible for a fully-covered family pilgrimage to four holy sites, awarded strictly on milestone completion." },
  { name: "Navratri Referral Surge", window: "Navratri fortnight", description: "Earn 2x cashback on the 1st booking of every devotee you refer during Navratri." },
  { name: "Diwali Top Referrer Recognition", window: "Diwali week", description: "The referrers with the highest verified cashback earned during Diwali week receive a recognition bonus and Featured Referrer badge — ranked purely by performance, not by chance." },
  { name: "Guru Purnima Loyalty Bonus", window: "Guru Purnima", description: "Loyalty bonus credited to every referrer whose network stayed active over the preceding 90 days." },
  { name: "Makar Sankranti Kickstart Bonus", window: "Makar Sankranti week", description: "New referrers who bring in their first 3 verified bookings during this week receive a one-time kickstart cashback bonus." },
  { name: "Maha Shivratri Devotion Drive", window: "Maha Shivratri", description: "Referrers whose devotees book a live darshan or online puja during the Shivratri vigil earn a bonus cashback credit on those bookings." },
  { name: "Ram Navami Community Champion", window: "Ram Navami week", description: "Recognition badge and bonus credit for the referrer with the most verified referred bookings in their city during the week, based on booking counts alone." },
  { name: "Raksha Bandhan Family Circle Bonus", window: "Raksha Bandhan week", description: "Referrers who successfully refer immediate family members (verified by shared address or explicit consent) earn a special Family Circle cashback bonus." },
  { name: "Ganesh Chaturthi Mandal Spotlight", window: "Ganesh Chaturthi", description: "Puja Mandals with the highest verified devotee footfall bookings during the festival are featured in the homepage Mandal Spotlight." },
  { name: "Karthik Maas Consistency Reward", window: "Karthik Maas (1 month)", description: "Referrers who maintain active, verified referral bookings on at least 15 days during the month earn a Consistency Badge and bonus credit." },
  { name: "New Year Dharmic Resolution Challenge", window: "January", description: "Set and complete a personal referral milestone within January to earn a bonus credit on top of your regular tier cashback." },
  { name: "Founders' Week Loyalty Milestone", window: "Sri Dwar's founding anniversary week", description: "Long-standing referrers who have stayed active on the platform for a full year receive a loyalty appreciation bonus, based on tenure and verified activity alone." },
];

export interface FraudRule {
  title: string;
  description: string;
}

export const FRAUD_PREVENTION_RULES: FraudRule[] = [
  { title: "One person, one Dharmic ID", description: "Duplicate or fake accounts created to refer yourself are detected and blocked; cashback is forfeited." },
  { title: "Real, paid bookings only", description: "Cashback is calculated only after payment is confirmed — cancelled, refunded, or disputed bookings never count." },
  { title: "KYC above payout thresholds", description: "Identity verification is required once your accumulated cashback crosses the threshold shown on your dashboard." },
  { title: "Consent-gated contact sharing", description: "Referred devotees' full contact details are visible to you only once they explicitly consent." },
  { title: "Manual + automated review", description: "Unusual referral patterns are flagged for manual review before payout, protecting genuine referrers." },
];

export interface ReferralDisclaimer {
  title: string;
  points: string[];
}

export const REFERRAL_PAYOUT_THRESHOLD = 1000; // ₹ — minimum accumulated cashback before it becomes redeemable

// Displayed wherever referral or subscription cashback terms are shown.
export const REFERRAL_CASHBACK_DISCLAIMER: ReferralDisclaimer = {
  title: "Cashback Eligibility & Redemption Disclaimer",
  points: [
    `Cashback is redeemable only after the applicable eligibility period for that booking has passed, and only once your total accumulated cashback balance reaches at least ₹${REFERRAL_PAYOUT_THRESHOLD.toLocaleString("en-IN")}.`,
    `Referral cashback is earned only up to each referred devotee's ${REFERRAL_CASHBACK_BOOKING_CAP}th successful booking. No further cashback accrues on that devotee's bookings after the ${REFERRAL_CASHBACK_BOOKING_CAP}th booking.`,
    "Cashback amounts, tiers, and campaign rewards are promotional in nature, may be revised, modified, or discontinued at Sri Dwar's discretion for future bookings, and do not constitute a guaranteed or contractual entitlement beyond what has already been credited to your account.",
    "This is a customer referral, cashback, and membership program tied to genuine, paid bookings on the Sri Dwar platform — it is not an investment, deposit, or money-circulation scheme, and cashback is never paid for recruiting new paying participants into the program itself.",
  ],
};

export const REFERRAL_KYC_THRESHOLD = 5000; // ₹ — accumulated cashback above which KYC becomes mandatory
