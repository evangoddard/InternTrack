-- InternTrack schema: saved postings + résumé storage, both RLS-locked to
-- the owning user. Run this once in the Supabase dashboard's SQL editor
-- (Project -> SQL Editor -> New query), after creating your project.
--
-- Nothing here stores the job postings themselves -- those still come from
-- web/data.json, rebuilt from the scanner. saved_postings snapshots the
-- display fields (company/title/url/etc.) at the moment a user saves a
-- posting, rather than only storing its id, so a saved row still means
-- something after that posting eventually rotates out of data.json.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- saved_postings
-- ---------------------------------------------------------------------
create table if not exists saved_postings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  posting_id text not null,
  status text not null default 'not_applied'
    check (status in (
      'not_applied', 'applied', 'oa', 'interview', 'final_round', 'offer', 'rejected'
    )),
  company text not null,
  title text not null,
  url text not null,
  location text not null default '',
  season text not null default '',
  source text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, posting_id)
);

alter table saved_postings enable row level security;

-- A user can only ever see/change their own rows. auth.uid() is the
-- logged-in user's id, taken from their session JWT -- there's no way for
-- a request to claim a different user_id and have it match.
create policy "select own saved postings"
  on saved_postings for select
  using (auth.uid() = user_id);

create policy "insert own saved postings"
  on saved_postings for insert
  with check (auth.uid() = user_id);

create policy "update own saved postings"
  on saved_postings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own saved postings"
  on saved_postings for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- resumes (metadata row per uploaded file; the file itself lives in the
-- "resumes" Storage bucket, created below)
-- ---------------------------------------------------------------------
create table if not exists resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  uploaded_at timestamptz not null default now()
);

alter table resumes enable row level security;

create policy "select own resumes"
  on resumes for select
  using (auth.uid() = user_id);

create policy "insert own resumes"
  on resumes for insert
  with check (auth.uid() = user_id);

create policy "delete own resumes"
  on resumes for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Table-level grants. RLS policies only filter *rows* -- they don't matter
-- until the "authenticated" role has base permission to touch the table at
-- all. Written explicitly here so this schema works regardless of whether
-- "Automatically expose new tables" was left on or off when the project
-- was created. Only "authenticated" gets anything -- the app never queries
-- these tables as a signed-out user, so "anon" needs no grant at all.
-- ---------------------------------------------------------------------
grant select, insert, update, delete on saved_postings to authenticated;
grant select, insert, delete on resumes to authenticated;

-- ---------------------------------------------------------------------
-- Storage: a private "resumes" bucket. Files are uploaded under a
-- `${user_id}/...` path (enforced by the app, not just convention -- these
-- policies actively check the path's first folder against auth.uid()), so
-- one user's résumé is never listable or downloadable by another.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

create policy "select own resume files"
  on storage.objects for select
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "insert own resume files"
  on storage.objects for insert
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "delete own resume files"
  on storage.objects for delete
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
