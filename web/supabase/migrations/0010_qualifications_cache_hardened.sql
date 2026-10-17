-- Shared cache of requirements text scraped from public ATS pages.
-- APPLIED 2026-08-10. Replaces 0008, which was never applied.
--
-- 0008 granted INSERT *and UPDATE* to `authenticated` with
-- `with check (true)`, which would let any signed-in user rewrite a cache
-- entry that every other user reads -- their eligibility verdicts and
-- skill-gap percentages are computed from this text.
--
-- The app holds only the publishable/anon key: its server routes talk to
-- Postgres as `authenticated`, exactly like the browser would. So there is
-- no privilege level available to the server that a user cannot also
-- reach, and "only the server writes this" cannot be enforced by grants.
--
-- What IS enforceable is immutability: INSERT only, no UPDATE and no
-- DELETE policy. Entries are write-once, first-writer-wins, so a cache
-- entry cannot be altered after a legitimate fetch has populated it.
-- lib/qualificationsStore.ts writes with ignoreDuplicates to match.
create table if not exists public.posting_qualifications (
  posting_id     text primary key,
  url            text not null,
  available      boolean not null default false,
  qualifications text,
  full_text      text,
  source         text,
  fetched_at     timestamptz not null default now()
);

alter table public.posting_qualifications enable row level security;

revoke all on public.posting_qualifications from anon, authenticated, public;
grant select, insert on public.posting_qualifications to authenticated;

drop policy if exists "read qualifications cache"   on public.posting_qualifications;
drop policy if exists "insert qualifications cache" on public.posting_qualifications;
drop policy if exists "update qualifications cache" on public.posting_qualifications;
drop policy if exists "seed qualifications cache"   on public.posting_qualifications;

-- Public job-posting data, shared by design -- `true` is correct here and
-- is NOT a private-table policy.
create policy "read qualifications cache" on public.posting_qualifications
  for select to authenticated using (true);

create policy "seed qualifications cache" on public.posting_qualifications
  for insert to authenticated with check (true);

-- No UPDATE policy and no DELETE policy, deliberately.
