-- Postings the user has explicitly ruled out (PhD-only, wrong location,
-- whatever) so they stop reappearing in the feed on every visit. Only the
-- posting id is stored -- there's nothing to snapshot, since hiding it means
-- never wanting to see it again.
--
-- Run this in the Supabase SQL editor like the previous migrations.

create table if not exists dismissed_postings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  posting_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, posting_id)
);

alter table dismissed_postings enable row level security;

create policy "select own dismissed postings"
  on dismissed_postings for select
  using (auth.uid() = user_id);

create policy "insert own dismissed postings"
  on dismissed_postings for insert
  with check (auth.uid() = user_id);

create policy "delete own dismissed postings"
  on dismissed_postings for delete
  using (auth.uid() = user_id);

grant select, insert, delete on dismissed_postings to authenticated;
