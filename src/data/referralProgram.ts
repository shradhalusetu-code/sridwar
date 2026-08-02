/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// "Refer, Earn & Grow with Dharma" — data model
// SIX fully separate plan systems, one per participant type on Sri Dwar.
// Each has its own 5-tier ladder with unique names, pricing (monthly +
// annual), taglines, services/fee model, commission structure, and CTA
// copy. They intentionally do NOT share tier names or price points — the
// only thing shared is a TypeScript shape (for maintainability) between
// the five "provider" categories, since a Panditji, a Mandal, a Yoga Guru,
// a Dharmic Expert, and a Seva Provider all fundamentally sell a service
// and earn a commission on top, just worded and priced for who they are.
// Devotees are structurally different: referral-only, no services at all.
//
//   1. DEVOTEE_REFERRAL_TIERS      — "Diya"..."Chakra" Circles
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

// Commission is calculated per referred devotee — booking count resets for
// every new person a Dharmic ID refers, not for the referrer overall. This
// baseline applies to every plan category below; paid tiers add a boost.
export const COMMISSION_STRUCTURE: CommissionTier[] = [
  { bookingLabel: "1st Booking", rate: 10, description: "First eligible puja, seva, donation, product, or consultation booked by your referred devotee." },
  { bookingLabel: "2nd Booking", rate: 5, description: "Second eligible booking by the same referred devotee." },
  { bookingLabel: "3rd Booking Onwards", rate: 3, description: "Every eligible booking from the 3rd one onward — for as long as the devotee stays linked to your Dharmic ID." },
];

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
    planLabel: "5-Tier Devotee Referral Circles",
    icon: "Users",
    intro: "Built purely around referring & earning — no services to list, no puja fees to manage. Just your Dharmic ID, your circle, and the bonuses and commissions you earn as it grows.",
  },
  {
    id: "pujari",
    tabLabel: "Pujaris (Pundits)",
    planLabel: "5-Tier Pujari (Pundit) Service Paths",
    icon: "Flame",
    intro: "Built for individual priests running a puja practice — list your rituals, set your own dakshina, reach genuine devotees, and earn referral commissions and rewards on top.",
  },
  {
    id: "mandal",
    tabLabel: "Puja Mandals",
    planLabel: "5-Tier Puja Mandal Sangh Plans",
    icon: "Landmark",
    intro: "Built for community puja committees organizing festivals — list your events, collect sponsorships & seva contributions, and earn referral commissions and rewards on top.",
  },
  {
    id: "yogaguru",
    tabLabel: "Yoga Gurus",
    planLabel: "5-Tier Yoga Guru Marg Plans",
    icon: "Sparkles",
    intro: "Built for yoga & wellness instructors — list your classes and retreats, set your own session fees, reach genuine students, and earn referral commissions and rewards on top.",
  },
  {
    id: "expert",
    tabLabel: "Dharmic Experts",
    planLabel: "5-Tier Dharmic Expert Peeth Plans",
    icon: "BookOpen",
    intro: "Built for astrologers, vastu consultants & spiritual counselors — list your consultations, set your own fees, reach genuine clients, and earn referral commissions and rewards on top.",
  },
  {
    id: "seva",
    tabLabel: "Seva Providers",
    planLabel: "5-Tier Seva Provider Seva Plans",
    icon: "HeartHandshake",
    intro: "Built for volunteers & NGOs running annadanam, prasad and donation drives — list your seva activities transparently, and earn referral commissions and rewards on top.",
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
    tagline: "Start at zero cost — light your first spark and start earning bonuses today.",
    referralCapacity: "Up to 15 active referral links",
    networkCommissionRate: "10% commission on every eligible booking your referred devotees make",
    milestoneBonusMultiplier: "Standard milestone bonus credits",
    payoutSpeed: "Monthly payout cycle",
    referralSupport: "Email support, 48-hour response",
    bonusPerks: ["Personal referral dashboard", "Digital Dharmic ID referral card", "Eligible for all milestone rewards"],
    ctaLabel: "Start Free with Diya Circle",
  },
  {
    id: "kalash",
    name: "Kalash Circle",
    monthlyPrice: 49,
    monthlyPriceLabel: "₹49/month",
    annualPrice: 490,
    annualPriceLabel: "₹490/year",
    annualSavingsLabel: "2 months free",
    tagline: "Fill your circle for the price of a cup of chai — bring in more devotees, more often.",
    referralCapacity: "Up to 50 active referral links",
    networkCommissionRate: "13% commission on every eligible booking your referred devotees make",
    milestoneBonusMultiplier: "1.25x milestone bonus credits",
    payoutSpeed: "Twice-monthly payout cycle",
    referralSupport: "Priority email + WhatsApp support",
    bonusPerks: ["Verified referrer badge on your profile", "Early access to seasonal referral campaigns"],
    ctaLabel: "Grow with Kalash — ₹49/mo",
  },
  {
    id: "shankh",
    name: "Shankh Circle",
    monthlyPrice: 149,
    monthlyPriceLabel: "₹149/month",
    annualPrice: 1490,
    annualPriceLabel: "₹1,490/year",
    annualSavingsLabel: "2 months free",
    tagline: "Sound the call — turn your everyday devotion into steady referral income.",
    referralCapacity: "Up to 150 active referral links",
    networkCommissionRate: "16% commission on every eligible booking your referred devotees make",
    milestoneBonusMultiplier: "1.5x milestone bonus credits",
    payoutSpeed: "Weekly payout cycle",
    referralSupport: "Dedicated referral support coordinator",
    bonusPerks: ["Featured community shout-out for top referrers", "Access to co-branded share creatives"],
    highlight: true,
    ctaLabel: "Sound the Shankh Circle",
  },
  {
    id: "trishul",
    name: "Trishul Circle",
    monthlyPrice: 399,
    monthlyPriceLabel: "₹399/month",
    annualPrice: 3990,
    annualPriceLabel: "₹3,990/year",
    annualSavingsLabel: "2 months free",
    tagline: "For devotees with real reach — sharper commissions, faster payouts, bigger bonuses.",
    referralCapacity: "Up to 500 active referral links",
    networkCommissionRate: "18% commission on every eligible booking your referred devotees make",
    milestoneBonusMultiplier: "2x milestone bonus credits",
    payoutSpeed: "Faster, on-demand payout requests",
    referralSupport: "Dedicated referral account manager",
    bonusPerks: ["Eligible for Grand Prize draws", "Custom community referral campaigns"],
    ctaLabel: "Lead with Trishul — ₹399/mo",
  },
  {
    id: "chakra",
    name: "Chakra Circle",
    monthlyPrice: 999,
    monthlyPriceLabel: "₹999/month",
    annualPrice: 9990,
    annualPriceLabel: "₹9,990/year",
    annualSavingsLabel: "2 months free",
    tagline: "Set the wheel of dharma in motion — top-tier earning power for your entire community.",
    referralCapacity: "Unlimited referral links",
    networkCommissionRate: "20% commission on every eligible booking your referred devotees make",
    milestoneBonusMultiplier: "3x milestone bonus credits + lifetime Chakra-tier status",
    payoutSpeed: "Fastest available payout cycle",
    referralSupport: "White-glove onboarding + 24x7 dedicated support line",
    bonusPerks: ["Premium homepage feature for your referral story", "Custom commercial terms available for community leaders"],
    ctaLabel: "Go Chakra — ₹999/mo",
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
    annualPrice: 1990, annualPriceLabel: "₹1,990/year", annualSavingsLabel: "2 months free",
    tagline: "Begin your priestly practice — list your first puja & seva services online.",
    servicesIncluded: "List puja, griha pravesh, satyanarayan & basic ritual services on your Dharmic ID profile",
    feeModel: "You set your own dakshina/puja fees — no markup beyond your subscription",
    customerReach: "~8 genuine puja enquiries/month, or approx. ₹3,000 worth of ritual opportunities on average",
    commissionEligibility: "Standard referral commission structure (10% / 5% / 3%)",
    referralRewards: "Up to 15 active referral links",
    priorityListing: false, premiumVisibility: false, verifiedBadge: false, marketingTools: false,
    analytics: "Basic", support: "Email support, 48-hour response", payoutSpeed: "Monthly payout cycle",
    exclusiveBenefits: ["Listed in city/temple search results", "Access to the Referral Dashboard", "Digital Panditji profile page"],
    ctaLabel: "Begin the Shishya Path",
  },
  {
    id: "purohit", categoryId: "pujari", name: "Purohit Path",
    monthlyPrice: 499, monthlyPriceLabel: "₹499/month",
    annualPrice: 4990, annualPriceLabel: "₹4,990/year", annualSavingsLabel: "2 months free",
    tagline: "Steady bookings for a practicing purohit — home visits, temple rituals & more.",
    servicesIncluded: "Priority routing for home-visit pujas, temple rituals & muhurat consultations",
    feeModel: "Set your own dakshina, plus milestone bonuses on high-value ceremonies",
    customerReach: "Targets approx. ₹8,000 worth of opportunities or 40 rituals/month",
    commissionEligibility: "Standard structure + eligible for milestone bonuses",
    referralRewards: "Up to 50 active referral links",
    priorityListing: true, premiumVisibility: false, verifiedBadge: true, marketingTools: false,
    analytics: "Standard", support: "Priority email + WhatsApp, 24-hour response", payoutSpeed: "Twice-monthly payout cycle",
    exclusiveBenefits: ["Verified Panditji badge", "Priority placement in your city category", "Seasonal campaign eligibility"],
    ctaLabel: "Walk the Purohit Path",
  },
  {
    id: "acharya", categoryId: "pujari", name: "Acharya Path",
    monthlyPrice: 999, monthlyPriceLabel: "₹999/month",
    annualPrice: 9990, annualPriceLabel: "₹9,990/year", annualSavingsLabel: "2 months free",
    tagline: "For established acharyas conducting weddings, yagnas & full ceremonies.",
    servicesIncluded: "Featured listings for weddings, yagnas, havan & multi-day ceremonies",
    feeModel: "Set your own dakshina + 1% commission boost across all tiers (11% / 6% / 4%)",
    customerReach: "Targets approx. ₹25,000 worth of opportunities or 80 rituals/month",
    commissionEligibility: "+1% commission boost on all tiers (11% / 6% / 4%)",
    referralRewards: "Up to 150 active referral links",
    priorityListing: true, premiumVisibility: true, verifiedBadge: true, marketingTools: true,
    analytics: "Advanced", support: "Dedicated relationship coordinator", payoutSpeed: "Weekly payout cycle",
    exclusiveBenefits: ["Featured in homepage priest spotlights", "Co-branded marketing creatives", "Early seasonal campaign access"],
    highlight: true,
    ctaLabel: "Rise on the Acharya Path",
  },
  {
    id: "mahant", categoryId: "pujari", name: "Mahant Path",
    monthlyPrice: 2499, monthlyPriceLabel: "₹2,499/month",
    annualPrice: 24990, annualPriceLabel: "₹24,990/year", annualSavingsLabel: "2 months free",
    tagline: "For senior pandits managing a full festival & wedding season calendar.",
    servicesIncluded: "Multi-ceremony calendar management across weddings, yagnas & festival duties",
    feeModel: "Set your own dakshina + 2% commission boost across all tiers (12% / 7% / 5%)",
    customerReach: "Benefits exceeding ₹60,000 worth of opportunities and 200+ rituals/month",
    commissionEligibility: "+2% commission boost on all tiers (12% / 7% / 5%)",
    referralRewards: "Unlimited referral links",
    priorityListing: true, premiumVisibility: true, verifiedBadge: true, marketingTools: true,
    analytics: "Full Suite", support: "Dedicated account manager + priority grievance handling", payoutSpeed: "Faster, on-demand payout requests",
    exclusiveBenefits: ["Multi-ceremony calendar dashboard", "Custom promotional campaigns", "Eligible for Grand Prize draws"],
    ctaLabel: "Ascend to the Mahant Path",
  },
  {
    id: "rajguru", categoryId: "pujari", name: "Rajguru Path",
    monthlyPrice: 4999, monthlyPriceLabel: "₹4,999/month",
    annualPrice: 49990, annualPriceLabel: "₹49,990/year", annualSavingsLabel: "2 months free",
    tagline: "Unlimited scale for the most sought-after pandits & multi-priest lineages.",
    servicesIncluded: "Unlimited ceremony listings across your entire priest team/lineage",
    feeModel: "Set your own dakshina + 3% commission boost across all tiers (13% / 8% / 6%)",
    customerReach: "Unlimited genuine customer access — no monthly enquiry cap",
    commissionEligibility: "+3% commission boost on all tiers (13% / 8% / 6%)",
    referralRewards: "Unlimited referral links, sub-Dharmic-IDs for your disciples",
    priorityListing: true, premiumVisibility: true, verifiedBadge: true, marketingTools: true,
    analytics: "Full Suite", support: "White-glove onboarding + 24x7 dedicated support line", payoutSpeed: "Fastest available payout cycle",
    exclusiveBenefits: ["Premium homepage & festival-season visibility", "Ideal for lineages with multiple disciples", "Custom commercial terms available on request"],
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
    annualPrice: 2990, annualPriceLabel: "₹2,990/year", annualSavingsLabel: "2 months free",
    tagline: "Get your mandal's first festival & puja events listed online.",
    servicesIncluded: "List community pujas, festival events & Aarti schedules on your Mandal's Dharmic ID",
    feeModel: "Collect seva/sponsorship contributions with no markup beyond your subscription",
    customerReach: "~15 genuine devotee footfalls/event, or approx. ₹5,000 worth of sponsorship interest",
    commissionEligibility: "Standard referral commission structure (10% / 5% / 3%)",
    referralRewards: "Up to 15 active referral links",
    priorityListing: false, premiumVisibility: false, verifiedBadge: false, marketingTools: false,
    analytics: "Basic", support: "Email support, 48-hour response", payoutSpeed: "Monthly payout cycle",
    exclusiveBenefits: ["Listed in city festival directory", "Access to the Referral Dashboard", "Digital Mandal profile page"],
    ctaLabel: "Begin the Aarambh Sangh",
  },
  {
    id: "utsav", categoryId: "mandal", name: "Utsav Sangh",
    monthlyPrice: 999, monthlyPriceLabel: "₹999/month",
    annualPrice: 9990, annualPriceLabel: "₹9,990/year", annualSavingsLabel: "2 months free",
    tagline: "Steady visibility for mandals running regular monthly & seasonal events.",
    servicesIncluded: "Priority routing for festival announcements, ticketed events & volunteer sign-ups",
    feeModel: "Collect contributions + eligible for milestone bonuses on large festivals",
    customerReach: "Targets approx. ₹15,000 worth of sponsorship interest or 30 event RSVPs/month",
    commissionEligibility: "Standard structure + eligible for milestone bonuses",
    referralRewards: "Up to 50 active referral links",
    priorityListing: true, premiumVisibility: false, verifiedBadge: true, marketingTools: false,
    analytics: "Standard", support: "Priority email + WhatsApp support", payoutSpeed: "Twice-monthly payout cycle",
    exclusiveBenefits: ["Verified Mandal badge", "Priority placement in your city category", "Seasonal campaign eligibility"],
    ctaLabel: "Celebrate with Utsav Sangh",
  },
  {
    id: "mahotsav", categoryId: "mandal", name: "Mahotsav Sangh",
    monthlyPrice: 2999, monthlyPriceLabel: "₹2,999/month",
    annualPrice: 29990, annualPriceLabel: "₹29,990/year", annualSavingsLabel: "2 months free",
    tagline: "For mandals hosting large multi-day festivals like Durga Puja & Ganesh Utsav.",
    servicesIncluded: "Featured listings for multi-day festivals, pandals & processions",
    feeModel: "Collect contributions + 1% commission boost across all tiers (11% / 6% / 4%)",
    customerReach: "Targets approx. ₹50,000 worth of sponsorship interest or 100+ event RSVPs/month",
    commissionEligibility: "+1% commission boost on all tiers (11% / 6% / 4%)",
    referralRewards: "Up to 150 active referral links",
    priorityListing: true, premiumVisibility: true, verifiedBadge: true, marketingTools: true,
    analytics: "Advanced", support: "Dedicated relationship coordinator", payoutSpeed: "Weekly payout cycle",
    exclusiveBenefits: ["Featured in homepage festival spotlights", "Co-branded marketing creatives", "Early seasonal campaign access"],
    highlight: true,
    ctaLabel: "Host the Mahotsav Sangh",
  },
  {
    id: "rajotsav", categoryId: "mandal", name: "Rajotsav Sangh",
    monthlyPrice: 9999, monthlyPriceLabel: "₹9,999/month",
    annualPrice: 99990, annualPriceLabel: "₹99,990/year", annualSavingsLabel: "2 months free",
    tagline: "For district-level mandals coordinating processions across multiple pandals.",
    servicesIncluded: "Multi-pandal & multi-volunteer-team event management dashboard",
    feeModel: "Collect contributions + 2% commission boost across all tiers (12% / 7% / 5%)",
    customerReach: "Benefits exceeding ₹1,50,000 worth of sponsorship interest and 500+ RSVPs/month",
    commissionEligibility: "+2% commission boost on all tiers (12% / 7% / 5%)",
    referralRewards: "Unlimited referral links across your committee",
    priorityListing: true, premiumVisibility: true, verifiedBadge: true, marketingTools: true,
    analytics: "Full Suite", support: "Dedicated account manager + priority grievance handling", payoutSpeed: "Faster, on-demand payout requests",
    exclusiveBenefits: ["Multi-pandal committee dashboard", "Custom promotional campaigns for your mandal", "Eligible for Grand Prize draws"],
    ctaLabel: "Lead the Rajotsav Sangh",
  },
  {
    id: "samrat", categoryId: "mandal", name: "Samrat Sangh",
    monthlyPrice: 24999, monthlyPriceLabel: "₹24,999/month",
    annualPrice: 249990, annualPriceLabel: "₹2,49,990/year", annualSavingsLabel: "2 months free",
    tagline: "Unlimited scale for citywide festival federations & apex mandal bodies.",
    servicesIncluded: "Unlimited event listings across your entire federation of affiliated mandals",
    feeModel: "Collect contributions + 3% commission boost across all tiers (13% / 8% / 6%)",
    customerReach: "Unlimited genuine footfall & sponsorship access — no monthly cap",
    commissionEligibility: "+3% commission boost on all tiers (13% / 8% / 6%)",
    referralRewards: "Unlimited referral links, sub-Dharmic-IDs for every affiliated mandal",
    priorityListing: true, premiumVisibility: true, verifiedBadge: true, marketingTools: true,
    analytics: "Full Suite", support: "White-glove onboarding + 24x7 dedicated support line", payoutSpeed: "Fastest available payout cycle",
    exclusiveBenefits: ["Premium homepage & festival-season visibility", "Ideal for federations with 10+ affiliated mandals", "Custom commercial terms available on request"],
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
    annualPrice: 1990, annualPriceLabel: "₹1,990/year", annualSavingsLabel: "2 months free",
    tagline: "Begin teaching — list your first yoga & wellness sessions online.",
    servicesIncluded: "List yoga classes, meditation sessions & basic wellness consultations",
    feeModel: "You set your own class/session fees — no markup beyond your subscription",
    customerReach: "~10 genuine student enquiries/month, or approx. ₹3,000 worth of session interest",
    commissionEligibility: "Standard referral commission structure (10% / 5% / 3%)",
    referralRewards: "Up to 15 active referral links",
    priorityListing: false, premiumVisibility: false, verifiedBadge: false, marketingTools: false,
    analytics: "Basic", support: "Email support, 48-hour response", payoutSpeed: "Monthly payout cycle",
    exclusiveBenefits: ["Listed in city wellness directory", "Access to the Referral Dashboard", "Digital Guru profile page"],
    ctaLabel: "Step onto the Sadhak Marg",
  },
  {
    id: "yogi", categoryId: "yogaguru", name: "Yogi Marg",
    monthlyPrice: 499, monthlyPriceLabel: "₹499/month",
    annualPrice: 4990, annualPriceLabel: "₹4,990/year", annualSavingsLabel: "2 months free",
    tagline: "Steady bookings for an actively teaching yogi.",
    servicesIncluded: "Priority routing for group classes, retreats & personalized programs",
    feeModel: "Set your own fees, plus eligible for milestone bonuses",
    customerReach: "Targets approx. ₹8,000 worth of session interest or 40 bookings/month",
    commissionEligibility: "Standard structure + eligible for milestone bonuses",
    referralRewards: "Up to 50 active referral links",
    priorityListing: true, premiumVisibility: false, verifiedBadge: true, marketingTools: false,
    analytics: "Standard", support: "Priority email + WhatsApp support", payoutSpeed: "Twice-monthly payout cycle",
    exclusiveBenefits: ["Verified Yoga Guru badge", "Priority placement in your city category", "Seasonal campaign eligibility"],
    ctaLabel: "Walk the Yogi Marg",
  },
  {
    id: "siddha", categoryId: "yogaguru", name: "Siddha Marg",
    monthlyPrice: 1499, monthlyPriceLabel: "₹1,499/month",
    annualPrice: 14990, annualPriceLabel: "₹14,990/year", annualSavingsLabel: "2 months free",
    tagline: "For established gurus running retreats & certified teacher trainings.",
    servicesIncluded: "Featured listings for retreats, workshops & certified teacher trainings",
    feeModel: "Set your own fees + 1% commission boost across all tiers (11% / 6% / 4%)",
    customerReach: "Targets approx. ₹25,000 worth of session interest or 100 bookings/month",
    commissionEligibility: "+1% commission boost on all tiers (11% / 6% / 4%)",
    referralRewards: "Up to 150 active referral links",
    priorityListing: true, premiumVisibility: true, verifiedBadge: true, marketingTools: true,
    analytics: "Advanced", support: "Dedicated relationship coordinator", payoutSpeed: "Weekly payout cycle",
    exclusiveBenefits: ["Featured in homepage wellness spotlights", "Co-branded marketing creatives", "Early seasonal campaign access"],
    highlight: true,
    ctaLabel: "Attain the Siddha Marg",
  },
  {
    id: "rishi", categoryId: "yogaguru", name: "Rishi Marg",
    monthlyPrice: 3999, monthlyPriceLabel: "₹3,999/month",
    annualPrice: 39990, annualPriceLabel: "₹39,990/year", annualSavingsLabel: "2 months free",
    tagline: "For gurus running a full wellness studio & retreat calendar.",
    servicesIncluded: "Multi-batch class & retreat calendar management across your studio",
    feeModel: "Set your own fees + 2% commission boost across all tiers (12% / 7% / 5%)",
    customerReach: "Benefits exceeding ₹60,000 worth of session interest and 300+ bookings/month",
    commissionEligibility: "+2% commission boost on all tiers (12% / 7% / 5%)",
    referralRewards: "Unlimited referral links",
    priorityListing: true, premiumVisibility: true, verifiedBadge: true, marketingTools: true,
    analytics: "Full Suite", support: "Dedicated account manager + priority grievance handling", payoutSpeed: "Faster, on-demand payout requests",
    exclusiveBenefits: ["Multi-batch studio dashboard", "Custom promotional campaigns", "Eligible for Grand Prize draws"],
    ctaLabel: "Journey the Rishi Marg",
  },
  {
    id: "maharishi", categoryId: "yogaguru", name: "Maharishi Marg",
    monthlyPrice: 7999, monthlyPriceLabel: "₹7,999/month",
    annualPrice: 79990, annualPriceLabel: "₹79,990/year", annualSavingsLabel: "2 months free",
    tagline: "Unlimited scale for wellness institutes & multi-instructor teams.",
    servicesIncluded: "Unlimited class/retreat listings across your entire instructor team",
    feeModel: "Set your own fees + 3% commission boost across all tiers (13% / 8% / 6%)",
    customerReach: "Unlimited genuine student access — no monthly cap",
    commissionEligibility: "+3% commission boost on all tiers (13% / 8% / 6%)",
    referralRewards: "Unlimited referral links, sub-Dharmic-IDs for your entire team",
    priorityListing: true, premiumVisibility: true, verifiedBadge: true, marketingTools: true,
    analytics: "Full Suite", support: "White-glove onboarding + 24x7 dedicated support line", payoutSpeed: "Fastest available payout cycle",
    exclusiveBenefits: ["Premium homepage & festival-season visibility", "Ideal for institutes with 10+ instructors", "Custom commercial terms available on request"],
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
    annualPrice: 2990, annualPriceLabel: "₹2,990/year", annualSavingsLabel: "2 months free",
    tagline: "Begin consulting — list your first astrology, vastu or counseling sessions.",
    servicesIncluded: "List astrology, vastu, numerology & spiritual counseling consultations",
    feeModel: "You set your own consultation fees — no markup beyond your subscription",
    customerReach: "~10 genuine consultation enquiries/month, or approx. ₹4,000 worth of session interest",
    commissionEligibility: "Standard referral commission structure (10% / 5% / 3%)",
    referralRewards: "Up to 15 active referral links",
    priorityListing: false, premiumVisibility: false, verifiedBadge: false, marketingTools: false,
    analytics: "Basic", support: "Email support, 48-hour response", payoutSpeed: "Monthly payout cycle",
    exclusiveBenefits: ["Listed in city expert directory", "Access to the Referral Dashboard", "Digital Expert profile page"],
    ctaLabel: "Enter the Gyani Peeth",
  },
  {
    id: "vidwan", categoryId: "expert", name: "Vidwan Peeth",
    monthlyPrice: 799, monthlyPriceLabel: "₹799/month",
    annualPrice: 7990, annualPriceLabel: "₹7,990/year", annualSavingsLabel: "2 months free",
    tagline: "Steady bookings for an actively consulting expert.",
    servicesIncluded: "Priority routing for astrology, vastu & counseling consultation requests",
    feeModel: "Set your own fees, plus eligible for milestone bonuses",
    customerReach: "Targets approx. ₹10,000 worth of session interest or 40 consultations/month",
    commissionEligibility: "Standard structure + eligible for milestone bonuses",
    referralRewards: "Up to 50 active referral links",
    priorityListing: true, premiumVisibility: false, verifiedBadge: true, marketingTools: false,
    analytics: "Standard", support: "Priority email + WhatsApp support", payoutSpeed: "Twice-monthly payout cycle",
    exclusiveBenefits: ["Verified Expert badge", "Priority placement in your city category", "Seasonal campaign eligibility"],
    ctaLabel: "Rise to the Vidwan Peeth",
  },
  {
    id: "shastri", categoryId: "expert", name: "Shastri Peeth",
    monthlyPrice: 1999, monthlyPriceLabel: "₹1,999/month",
    annualPrice: 19990, annualPriceLabel: "₹19,990/year", annualSavingsLabel: "2 months free",
    tagline: "For established experts offering detailed chart readings & long consultations.",
    servicesIncluded: "Featured listings for detailed chart readings, vastu site visits & retreats",
    feeModel: "Set your own fees + 1% commission boost across all tiers (11% / 6% / 4%)",
    customerReach: "Targets approx. ₹30,000 worth of session interest or 100 consultations/month",
    commissionEligibility: "+1% commission boost on all tiers (11% / 6% / 4%)",
    referralRewards: "Up to 150 active referral links",
    priorityListing: true, premiumVisibility: true, verifiedBadge: true, marketingTools: true,
    analytics: "Advanced", support: "Dedicated relationship coordinator", payoutSpeed: "Weekly payout cycle",
    exclusiveBenefits: ["Featured in homepage expert spotlights", "Co-branded marketing creatives", "Early seasonal campaign access"],
    highlight: true,
    ctaLabel: "Ascend to the Shastri Peeth",
  },
  {
    id: "vachaspati", categoryId: "expert", name: "Vachaspati Peeth",
    monthlyPrice: 4999, monthlyPriceLabel: "₹4,999/month",
    annualPrice: 49990, annualPriceLabel: "₹49,990/year", annualSavingsLabel: "2 months free",
    tagline: "For senior experts managing a full consultation calendar & panel presence.",
    servicesIncluded: "Multi-consultation calendar management + eligibility for platform panel features",
    feeModel: "Set your own fees + 2% commission boost across all tiers (12% / 7% / 5%)",
    customerReach: "Benefits exceeding ₹70,000 worth of session interest and 250+ consultations/month",
    commissionEligibility: "+2% commission boost on all tiers (12% / 7% / 5%)",
    referralRewards: "Unlimited referral links",
    priorityListing: true, premiumVisibility: true, verifiedBadge: true, marketingTools: true,
    analytics: "Full Suite", support: "Dedicated account manager + priority grievance handling", payoutSpeed: "Faster, on-demand payout requests",
    exclusiveBenefits: ["Multi-consultation calendar dashboard", "Custom promotional campaigns", "Eligible for Grand Prize draws"],
    ctaLabel: "Command the Vachaspati Peeth",
  },
  {
    id: "mahopadhyay", categoryId: "expert", name: "Mahopadhyay Peeth",
    monthlyPrice: 9999, monthlyPriceLabel: "₹9,999/month",
    annualPrice: 99990, annualPriceLabel: "₹99,990/year", annualSavingsLabel: "2 months free",
    tagline: "Unlimited scale for expert panels, institutes & multi-consultant teams.",
    servicesIncluded: "Unlimited consultation listings across your entire panel of experts",
    feeModel: "Set your own fees + 3% commission boost across all tiers (13% / 8% / 6%)",
    customerReach: "Unlimited genuine consultation access — no monthly cap",
    commissionEligibility: "+3% commission boost on all tiers (13% / 8% / 6%)",
    referralRewards: "Unlimited referral links, sub-Dharmic-IDs for your entire panel",
    priorityListing: true, premiumVisibility: true, verifiedBadge: true, marketingTools: true,
    analytics: "Full Suite", support: "White-glove onboarding + 24x7 dedicated support line", payoutSpeed: "Fastest available payout cycle",
    exclusiveBenefits: ["Premium homepage & festival-season visibility", "Ideal for institutes with 10+ consultants", "Custom commercial terms available on request"],
    ctaLabel: "Attain the Mahopadhyay Peeth",
  },
];

// ============================================================================
// 6. SEVA PROVIDERS — "Seva" Plans
// Volunteers & NGOs running annadanam, prasad distribution & donation drives.
// Starts free, like the Devotee ladder, in keeping with a charitable ethos.
// ============================================================================
export const SEVA_PROVIDER_TIERS: ProviderCategoryTier[] = [
  {
    id: "sevak", categoryId: "seva", name: "Sevak Seva",
    monthlyPrice: 0, monthlyPriceLabel: "Free",
    annualPrice: 0, annualPriceLabel: "Free", annualSavingsLabel: "Always free",
    tagline: "Start at zero cost — list your first annadanam, prasad or donation drive.",
    servicesIncluded: "List annadanam drives, prasad distribution & donation collection campaigns",
    feeModel: "No platform markup on donations collected — 100% transparent seva accounting",
    customerReach: "~10 genuine volunteer/donor leads/month, or approx. ₹3,000 worth of donation interest",
    commissionEligibility: "Standard referral commission structure (10% / 5% / 3%)",
    referralRewards: "Up to 15 active referral links",
    priorityListing: false, premiumVisibility: false, verifiedBadge: false, marketingTools: false,
    analytics: "Basic", support: "Email support, 48-hour response", payoutSpeed: "Monthly payout cycle",
    exclusiveBenefits: ["Listed in city seva directory", "Access to the Referral Dashboard", "Digital Seva profile page"],
    ctaLabel: "Start Free with Sevak Seva",
  },
  {
    id: "karyakarta", categoryId: "seva", name: "Karyakarta Seva",
    monthlyPrice: 199, monthlyPriceLabel: "₹199/month",
    annualPrice: 1990, annualPriceLabel: "₹1,990/year", annualSavingsLabel: "2 months free",
    tagline: "Steady support for volunteers running regular donation & seva drives.",
    servicesIncluded: "Priority routing for volunteer sign-ups & recurring donation drives",
    feeModel: "No platform markup + eligible for milestone bonuses on large drives",
    customerReach: "Targets approx. ₹8,000 worth of donation interest or 40 volunteer sign-ups/month",
    commissionEligibility: "Standard structure + eligible for milestone bonuses",
    referralRewards: "Up to 50 active referral links",
    priorityListing: true, premiumVisibility: false, verifiedBadge: true, marketingTools: false,
    analytics: "Standard", support: "Priority email + WhatsApp support", payoutSpeed: "Twice-monthly payout cycle",
    exclusiveBenefits: ["Verified Seva badge", "Priority placement in your city category", "Seasonal campaign eligibility"],
    ctaLabel: "Serve with Karyakarta Seva",
  },
  {
    id: "sanchalak", categoryId: "seva", name: "Sanchalak Seva",
    monthlyPrice: 499, monthlyPriceLabel: "₹499/month",
    annualPrice: 4990, annualPriceLabel: "₹4,990/year", annualSavingsLabel: "2 months free",
    tagline: "For coordinators running large-scale annadanam & disaster-relief drives.",
    servicesIncluded: "Featured listings for large-scale annadanam, relief drives & bulk prasad distribution",
    feeModel: "No platform markup + 1% referral commission boost (11% / 6% / 4%)",
    customerReach: "Targets approx. ₹20,000 worth of donation interest or 150 volunteer sign-ups/month",
    commissionEligibility: "+1% commission boost on all tiers (11% / 6% / 4%)",
    referralRewards: "Up to 150 active referral links",
    priorityListing: true, premiumVisibility: true, verifiedBadge: true, marketingTools: true,
    analytics: "Advanced", support: "Dedicated relationship coordinator", payoutSpeed: "Weekly payout cycle",
    exclusiveBenefits: ["Featured in homepage seva spotlights", "Co-branded marketing creatives", "Early seasonal campaign access"],
    highlight: true,
    ctaLabel: "Organize with Sanchalak Seva",
  },
  {
    id: "pramukh", categoryId: "seva", name: "Pramukh Seva",
    monthlyPrice: 1499, monthlyPriceLabel: "₹1,499/month",
    annualPrice: 14990, annualPriceLabel: "₹14,990/year", annualSavingsLabel: "2 months free",
    tagline: "For NGO heads coordinating multiple seva teams across a district.",
    servicesIncluded: "Multi-team volunteer & donation-drive management dashboard",
    feeModel: "No platform markup + 2% referral commission boost (12% / 7% / 5%)",
    customerReach: "Benefits exceeding ₹50,000 worth of donation interest and 500+ volunteer sign-ups/month",
    commissionEligibility: "+2% commission boost on all tiers (12% / 7% / 5%)",
    referralRewards: "Unlimited referral links across your teams",
    priorityListing: true, premiumVisibility: true, verifiedBadge: true, marketingTools: true,
    analytics: "Full Suite", support: "Dedicated account manager + priority grievance handling", payoutSpeed: "Faster, on-demand payout requests",
    exclusiveBenefits: ["Multi-team NGO dashboard", "Custom promotional campaigns", "Eligible for Grand Prize draws"],
    ctaLabel: "Lead as Pramukh Seva",
  },
  {
    id: "mahasevak", categoryId: "seva", name: "Mahasevak Seva",
    monthlyPrice: 3999, monthlyPriceLabel: "₹3,999/month",
    annualPrice: 39990, annualPriceLabel: "₹39,990/year", annualSavingsLabel: "2 months free",
    tagline: "Unlimited scale for large NGOs & seva federations serving entire regions.",
    servicesIncluded: "Unlimited donation-drive & volunteer listings across your entire federation",
    feeModel: "No platform markup + 3% referral commission boost (13% / 8% / 6%)",
    customerReach: "Unlimited genuine volunteer & donor access — no monthly cap",
    commissionEligibility: "+3% commission boost on all tiers (13% / 8% / 6%)",
    referralRewards: "Unlimited referral links, sub-Dharmic-IDs for every affiliated chapter",
    priorityListing: true, premiumVisibility: true, verifiedBadge: true, marketingTools: true,
    analytics: "Full Suite", support: "White-glove onboarding + 24x7 dedicated support line", payoutSpeed: "Fastest available payout cycle",
    exclusiveBenefits: ["Premium homepage & festival-season visibility", "Ideal for federations with 10+ affiliated chapters", "Custom commercial terms available on request"],
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
  { icon: "🌱", title: "First Blessing", requirement: "Your first successful referral booking", reward: "₹51 bonus credit + Milestone Badge" },
  { icon: "🪔", title: "5 Devotees Strong", requirement: "5 referred devotees with at least 1 booking each", reward: "₹501 bonus credit + Bronze Referrer Badge" },
  { icon: "🔔", title: "Community Builder", requirement: "25 referred devotees with at least 1 booking each", reward: "₹2,500 bonus credit + Silver Referrer Badge + Priority Listing" },
  { icon: "🏵️", title: "Dharma Ambassador", requirement: "100 referred devotees with at least 1 booking each", reward: "₹15,000 bonus credit + Gold Referrer Badge + Featured Profile" },
  { icon: "👑", title: "Grand Sevak", requirement: "500 referred devotees with at least 1 booking each", reward: "₹1,00,000 Grand Prize pool entry + Lifetime Diamond-tier benefits" },
];

export interface SeasonalCampaign {
  name: string;
  window: string;
  description: string;
}

export const SEASONAL_CAMPAIGNS: SeasonalCampaign[] = [
  { name: "Navratri Referral Surge", window: "Navratri fortnight", description: "Earn 2x commission on the 1st booking of every devotee you refer during Navratri." },
  { name: "Diwali Grand Prize Draw", window: "Diwali week", description: "Every 5 eligible referrals during Diwali week is an entry into the Diwali Grand Prize draw." },
  { name: "Guru Purnima Loyalty Bonus", window: "Guru Purnima", description: "Loyalty bonus credited to every referrer whose network stayed active over the preceding 90 days." },
];

export interface FraudRule {
  title: string;
  description: string;
}

export const FRAUD_PREVENTION_RULES: FraudRule[] = [
  { title: "One person, one Dharmic ID", description: "Duplicate or fake accounts created to refer yourself are detected and blocked; commissions are forfeited." },
  { title: "Real, paid bookings only", description: "Commission is calculated only after payment is confirmed — cancelled, refunded, or disputed bookings never count." },
  { title: "KYC above payout thresholds", description: "Identity verification is required once your lifetime commission crosses the threshold shown on your dashboard." },
  { title: "Consent-gated contact sharing", description: "Referred devotees' full contact details are visible to you only once they explicitly consent." },
  { title: "Manual + automated review", description: "Unusual referral patterns are flagged for manual review before payout, protecting genuine referrers." },
];

export const REFERRAL_PAYOUT_THRESHOLD = 500; // ₹ — minimum ledger balance before a payout can be requested
export const REFERRAL_KYC_THRESHOLD = 5000; // ₹ — lifetime commission above which KYC becomes mandatory
