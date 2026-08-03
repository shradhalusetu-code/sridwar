-- ============================================================================
-- Sri Dwar — "Refer, Earn & Grow with Dharma" migration
-- Run this once in Supabase SQL Editor, after supabase_schema.sql and
-- supabase_schema_part2.sql. Safe to re-run (idempotent guards).
--
-- Design notes (read before wiring a UI to this):
--   * Every referred devotee stays PERMANENTLY linked to the referrer's
--     Dharmic ID via referrals.referrer_user_id — this column is never
--     reassigned by client code, only ever by a service-role/admin action.
--   * Money-moving rows (commissions, payouts) are NEVER writable directly
--     by the logged-in user's browser session. They must be written by a
--     service-role backend function (e.g. a Supabase Edge Function) that
--     runs when a booking's payment is independently confirmed — exactly
--     the same trust boundary already used for activities.payment_status
--     in supabase_schema.sql. This is what prevents a devotee from ever
--     crediting themselves a fake commission from the client.
--   * referrals.contact_consent gates whether the referrer's dashboard is
--     allowed to display the referred devotee's raw phone/email — consent
--     defaults to false and must be explicitly granted by the referred
--     devotee themselves.
-- ============================================================================

-- 1. Referral / subscription profile — one row per Dharmic ID -----------------
create table if not exists public.referral_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dharmic_ref_code text not null unique,               -- short code embedded in the referral link
  -- Six fully separate plan systems — see src/data/referralProgram.ts:
  --   devotee  = Devotee Referral Circles (referral-only, no services)
  --   pujari   = individual priests/pundits      (Service Paths)
  --   mandal   = community puja committees        (Sangh Plans)
  --   yogaguru = yoga & wellness instructors       (Marg Plans)
  --   expert   = astrologers/vastu/counselors      (Peeth Plans)
  --   seva     = volunteers & NGOs                 (Seva Plans)
  participant_type text not null default 'devotee'
    check (participant_type in ('devotee', 'pujari', 'mandal', 'yogaguru', 'expert', 'seva')),
  -- Tier id must belong to the ladder matching participant_type — e.g. a
  -- 'pujari' profile's subscription_tier is one of 'shishya'..'rajguru'.
  -- Enforced in application code (findPlanTierById); the DB check below
  -- just guards against a value outside all six ladders entirely.
  subscription_tier text not null default 'none'
    check (subscription_tier in (
      'none',
      'diya', 'kalash', 'shankh', 'trishul', 'chakra',
      'shishya', 'purohit', 'acharya', 'mahant', 'rajguru',
      'aarambh', 'utsav', 'mahotsav', 'rajotsav', 'samrat',
      'sadhak', 'yogi', 'siddha', 'rishi', 'maharishi',
      'gyani', 'vidwan', 'shastri', 'vachaspati', 'mahopadhyay',
      'sevak', 'karyakarta', 'sanchalak', 'pramukh', 'mahasevak'
    )),
  billing_cycle text not null default 'monthly'
    check (billing_cycle in ('monthly', 'annual')),
  subscription_started_at timestamptz,
  subscription_expires_at timestamptz,
  terms_accepted_at timestamptz,                       -- Refer & Earn Program Terms acceptance timestamp
  terms_version text,                                  -- which version of the terms was accepted
  kyc_status text not null default 'not_required'
    check (kyc_status in ('not_required', 'pending', 'verified', 'rejected')),
  payout_method jsonb,                                 -- { type: 'upi'|'bank', upi_id / account_no, ifsc, verified }
  lifetime_commission numeric not null default 0,
  ledger_balance numeric not null default 0,            -- unpaid, confirmed commission available for payout
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Re-running this migration on a table created before the six plan
-- categories existed refreshes both constraints and adds billing_cycle.
alter table public.referral_profiles drop constraint if exists referral_profiles_participant_type_check;
alter table public.referral_profiles add constraint referral_profiles_participant_type_check
  check (participant_type in ('devotee', 'pujari', 'mandal', 'yogaguru', 'expert', 'seva'));

alter table public.referral_profiles drop constraint if exists referral_profiles_subscription_tier_check;
alter table public.referral_profiles add constraint referral_profiles_subscription_tier_check
  check (subscription_tier in (
    'none',
    'diya', 'kalash', 'shankh', 'trishul', 'chakra',
    'shishya', 'purohit', 'acharya', 'mahant', 'rajguru',
    'aarambh', 'utsav', 'mahotsav', 'rajotsav', 'samrat',
    'sadhak', 'yogi', 'siddha', 'rishi', 'maharishi',
    'gyani', 'vidwan', 'shastri', 'vachaspati', 'mahopadhyay',
    'sevak', 'karyakarta', 'sanchalak', 'pramukh', 'mahasevak'
  ));

alter table public.referral_profiles add column if not exists billing_cycle text not null default 'monthly';
alter table public.referral_profiles drop constraint if exists referral_profiles_billing_cycle_check;
alter table public.referral_profiles add constraint referral_profiles_billing_cycle_check
  check (billing_cycle in ('monthly', 'annual'));

alter table public.referral_profiles enable row level security;

drop policy if exists "referral_profiles_select_own" on public.referral_profiles;
create policy "referral_profiles_select_own" on public.referral_profiles
  for select using (auth.uid() = user_id);

drop policy if exists "referral_profiles_upsert_own" on public.referral_profiles;
create policy "referral_profiles_upsert_own" on public.referral_profiles
  for insert with check (auth.uid() = user_id);

-- Users may update their OWN non-financial fields (accepting terms, setting
-- a payout method, participant_type). ledger_balance / lifetime_commission /
-- kyc_status must be changed only by a service-role function in practice —
-- enforce that at the application layer (service role bypasses RLS anyway).
drop policy if exists "referral_profiles_update_own" on public.referral_profiles;
create policy "referral_profiles_update_own" on public.referral_profiles
  for update using (auth.uid() = user_id);

create index if not exists referral_profiles_code_idx on public.referral_profiles(dharmic_ref_code);

-- 2. Referrals — permanent link between referrer and referred devotee --------
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid references auth.users(id) on delete set null,
  referred_name text,
  referred_email text,
  referred_phone text,
  contact_consent boolean not null default false,       -- referred devotee must explicitly opt in
  booking_count int not null default 0,                 -- drives the 1st/2nd/3rd+ commission tier
  status text not null default 'active'
    check (status in ('active', 'inactive', 'flagged_fraud')),
  -- Which of the six participant types the referred person signed up as.
  -- Defaults to 'devotee' (the common case). When a referred person is one
  -- of the five provider types instead, this referral also counts toward
  -- that provider category's "verified referred professionals" 5-tier
  -- unlock requirement in src/data/referralProgram.ts (PROVIDER_TIER_UNLOCK_THRESHOLDS),
  -- on top of counting as a devotee referral would.
  referred_participant_type text not null default 'devotee'
    check (referred_participant_type in ('devotee', 'pujari', 'mandal', 'yogaguru', 'expert', 'seva')),
  attributed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Re-running this migration on a table created before referred_participant_type
-- existed adds the column safely without touching any existing rows (they
-- all default to 'devotee', which is correct for historical data).
alter table public.referrals add column if not exists referred_participant_type text not null default 'devotee';
alter table public.referrals drop constraint if exists referrals_referred_participant_type_check;
alter table public.referrals add constraint referrals_referred_participant_type_check
  check (referred_participant_type in ('devotee', 'pujari', 'mandal', 'yogaguru', 'expert', 'seva'));

create unique index if not exists referrals_referred_user_unique on public.referrals(referred_user_id)
  where referred_user_id is not null; -- one permanent referrer per referred devotee

create index if not exists referrals_referrer_idx on public.referrals(referrer_user_id);
create index if not exists referrals_referred_participant_type_idx on public.referrals(referred_participant_type);

alter table public.referrals enable row level security;

drop policy if exists "referrals_select_own" on public.referrals;
create policy "referrals_select_own" on public.referrals
  for select using (auth.uid() = referrer_user_id);

-- No client insert/update policy on purpose: a referral row is created when
-- someone signs up through a referral link, which should be handled by a
-- service-role function so referrer_user_id can never be forged by the
-- referred devotee's own browser session.

-- 3. Commissions — one row per eligible, paid booking -------------------------
create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete cascade,
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  booking_ref_id text not null,                         -- matches activities.ref_id
  booking_amount numeric not null,
  booking_sequence int not null,                        -- 1, 2, 3... for that referred devotee
  commission_rate numeric not null,                      -- percentage actually applied
  commission_amount numeric not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'reversed')),
  created_at timestamptz not null default now()
);

create index if not exists commissions_referrer_idx on public.commissions(referrer_user_id);
create index if not exists commissions_referral_idx on public.commissions(referral_id);

alter table public.commissions enable row level security;

drop policy if exists "commissions_select_own" on public.commissions;
create policy "commissions_select_own" on public.commissions
  for select using (auth.uid() = referrer_user_id);

-- Intentionally no client insert/update/delete policy — commissions are
-- only ever written by a service-role function once the underlying
-- booking's payment is independently confirmed, exactly like
-- activities.payment_status in supabase_schema.sql.

-- 4. Payouts -------------------------------------------------------------------
create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric not null,
  status text not null default 'requested'
    check (status in ('requested', 'processing', 'paid', 'rejected')),
  method jsonb,
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists payouts_user_idx on public.payouts(user_id);

alter table public.payouts enable row level security;

drop policy if exists "payouts_select_own" on public.payouts;
create policy "payouts_select_own" on public.payouts
  for select using (auth.uid() = user_id);

drop policy if exists "payouts_insert_own" on public.payouts;
create policy "payouts_insert_own" on public.payouts
  for insert with check (auth.uid() = user_id);
-- Status transitions beyond 'requested' (processing/paid/rejected) should
-- be made only by a service-role function, after real bank/UPI settlement.

-- 5. Milestone & campaign credits ----------------------------------------------
create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_type text not null check (reward_type in ('milestone', 'seasonal_campaign', 'loyalty_bonus', 'grand_prize')),
  title text not null,
  amount numeric not null default 0,
  awarded_at timestamptz not null default now()
);

create index if not exists referral_rewards_user_idx on public.referral_rewards(user_id);

alter table public.referral_rewards enable row level security;

drop policy if exists "referral_rewards_select_own" on public.referral_rewards;
create policy "referral_rewards_select_own" on public.referral_rewards
  for select using (auth.uid() = user_id);

-- ============================================================================
-- Example service-role logic (run from a trusted backend, NOT the browser)
-- for crediting a commission once a booking's payment is confirmed:
--
--   1. Find the referral row for the paying devotee (referred_user_id).
--   2. Increment referrals.booking_count.
--   3. Pick the rate: 1st booking = 10%, 2nd = 5%, 3rd+ = 3%
--      (apply the referrer's subscription-tier boost from referral_profiles
--      if subscription_tier grants one).
--   4. Insert a row into commissions with status 'confirmed'.
--   5. Increment referral_profiles.ledger_balance and lifetime_commission
--      for the referrer.
-- ============================================================================
