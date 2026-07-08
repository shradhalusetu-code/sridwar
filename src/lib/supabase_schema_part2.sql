-- ============================================================================
-- Sri Dwar — Migration Part 2: Darshan Certificate, Temple/Priest
-- Registration, Contact Us, and Testimonials sync to Supabase.
-- Run this AFTER supabase_schema.sql. Safe to re-run.
-- Does NOT touch Google Form sync — that stays entirely as-is, unaffected.
-- ============================================================================

-- 1. Widen activities.activity_type to cover the new donation/contribution
--    flows (Darshan Certificate contribution, Temple/Priest registration
--    donations). Existing rows and values are untouched — this only adds
--    more allowed values to the same check constraint.
alter table public.activities drop constraint if exists activities_activity_type_check;
alter table public.activities add constraint activities_activity_type_check
  check (activity_type in (
    'puja', 'seva', 'product', 'contribution', 'temple_registration', 'other',
    'darshan_certificate'
  ));

-- 2. Generic form-submission log — Contact Us inquiries, testimonials,
--    Darshan Certificate requests, and Temple/Priest/Devotee registration
--    details (the non-monetary part of each). These are mostly filled out
--    by devotees who are NOT logged in, so user_id is nullable and anyone
--    (including anonymous visitors) is allowed to INSERT — exactly like a
--    public Google Form. Nobody can SELECT these back through the public
--    API though; only you, via the Supabase dashboard/SQL editor (which
--    uses the service role and bypasses RLS), or a logged-in devotee
--    reading their own past submissions.
create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  form_type text not null check (form_type in (
    'contact_us', 'testimonial', 'darshan_certificate',
    'devotee_registration', 'expert_registration', 'temple_committee_registration'
  )),
  name text,
  email text,
  phone text,
  ref_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists form_submissions_user_id_idx on public.form_submissions(user_id);
create index if not exists form_submissions_form_type_idx on public.form_submissions(form_type);
create index if not exists form_submissions_ref_id_idx on public.form_submissions(ref_id);

alter table public.form_submissions enable row level security;

drop policy if exists "form_submissions_insert_anyone" on public.form_submissions;
create policy "form_submissions_insert_anyone" on public.form_submissions
  for insert with check (true);

drop policy if exists "form_submissions_select_own" on public.form_submissions;
create policy "form_submissions_select_own" on public.form_submissions
  for select using (auth.uid() = user_id);

-- ============================================================================
-- To browse all submissions (including guest ones) go to:
--   Table Editor → form_submissions   (this uses your dashboard's admin
--   access, which bypasses RLS — the "select own" policy above only
--   restricts what a devotee's own browser session can read back).
-- ============================================================================
