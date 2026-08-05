-- Cache of qualifications text fetched from company ATS pages.
--
-- This is public job-posting data, not user data, so it's shared across
-- users and keyed by posting id -- one fetch per posting, ever, rather than
-- once per person per server restart. That matters because the eligibility
-- filter needs text for the whole feed at once, not just the row you
-- happen to open.
--
-- `available` is stored explicitly so hosts we can't read (ByteDance,
-- Microsoft, ...) are remembered as misses instead of being retried on
-- every pass.
--
-- Run this in the Supabase SQL editor like the previous migrations.

create table if not exists posting_qualifications (
  posting_id text primary key,
  url text not null,
  available boolean not null default false,
  qualifications text,
  full_text text,
  source text,
  fetched_at timestamptz not null default now()
);

alter table posting_qualifications enable row level security;

-- Readable by any signed-in user; only the server writes to it.
create policy "read qualifications cache"
  on posting_qualifications for select
  to authenticated
  using (true);

create policy "insert qualifications cache"
  on posting_qualifications for insert
  to authenticated
  with check (true);

create policy "update qualifications cache"
  on posting_qualifications for update
  to authenticated
  using (true)
  with check (true);

grant select, insert, update on posting_qualifications to authenticated;
