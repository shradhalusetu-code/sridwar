-- ============================================================================
-- Sri Dwar — Activity/Profile persistence migration
-- Run this once in Supabase SQL Editor. Safe to re-run (idempotent guards).
-- Does NOT touch Google Form sync — that stays entirely as-is, unaffected.
-- ============================================================================

-- 1. Extend profiles with phone -----------------------------------------------
alter table public.profiles
  add column if not exists phone text;

-- 2. Family members -----------------------------------------------------------
create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  relation text not null,
  created_at timestamptz not null default now()
);

create index if not exists family_members_user_id_idx on public.family_members(user_id);

alter table public.family_members enable row level security;

drop policy if exists "family_members_select_own" on public.family_members;
create policy "family_members_select_own" on public.family_members
  for select using (auth.uid() = user_id);

drop policy if exists "family_members_insert_own" on public.family_members;
create policy "family_members_insert_own" on public.family_members
  for insert with check (auth.uid() = user_id);

drop policy if exists "family_members_update_own" on public.family_members;
create policy "family_members_update_own" on public.family_members
  for update using (auth.uid() = user_id);

drop policy if exists "family_members_delete_own" on public.family_members;
create policy "family_members_delete_own" on public.family_members
  for delete using (auth.uid() = user_id);

-- 3. Unified activity ledger ---------------------------------------------------
-- One row per puja booking, seva offering/sponsorship, bazaar product order,
-- and temple redevelopment contribution. This is the single source of truth
-- that the Profile page's "My Spiritual Transactions Ledger" reads from.
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null check (activity_type in ('puja', 'seva', 'product', 'contribution', 'temple_registration', 'other')),
  item_name text not null,
  amount numeric not null default 0,
  ref_id text not null,
  payment_method text,                    -- 'UPI' | 'WhatsApp Pay' | etc, nullable
  -- 'pending_verification' = UPI "I have paid" click, no gateway confirmation yet (current interim state).
  -- 'confirmed' = verified either manually or by a real payment gateway webhook once integrated.
  -- 'failed' = explicitly known to have failed.
  payment_status text not null default 'pending_verification'
    check (payment_status in ('pending_verification', 'confirmed', 'failed')),
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activities_user_id_idx on public.activities(user_id);
create index if not exists activities_ref_id_idx on public.activities(ref_id);

alter table public.activities enable row level security;

drop policy if exists "activities_select_own" on public.activities;
create policy "activities_select_own" on public.activities
  for select using (auth.uid() = user_id);

drop policy if exists "activities_insert_own" on public.activities;
create policy "activities_insert_own" on public.activities
  for insert with check (auth.uid() = user_id);

-- No update/delete policy for regular users on purpose — this is meant to be
-- an append-only ledger from the devotee's side. Marking a payment
-- "confirmed" later (once you have a verified source) should be done by you,
-- from the Supabase dashboard/SQL editor or a service-role backend function,
-- not by the devotee's own browser session.

-- ============================================================================
-- Manual reconciliation helper (run this by hand, or from an admin tool)
-- to mark a specific pending UPI payment as confirmed once you've verified
-- the UTR/reference against your PhonePe statement:
--
--   update public.activities
--   set payment_status = 'confirmed'
--   where ref_id = 'SDP-123456';
-- ============================================================================
