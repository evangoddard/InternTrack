-- Least privilege for the three user-owned tables. APPLIED 2026-08-10.
--
-- Two problems this fixes:
--   1. Supabase's default blanket grant gave `anon` AND `authenticated`
--      SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER on every
--      table, overriding the narrower grants in schema.sql. TRUNCATE in
--      particular is NOT filtered by RLS.
--   2. Every policy applied `TO public`, so it was evaluated for anon too.
--      It failed closed only because auth.uid() is NULL for anon -- the
--      role scoping was doing no work.
--
-- Row ownership is `user_id` on all three tables. No schema is altered
-- here: no column is added, dropped, or retyped, and no row is touched.

-- 1. Strip the blanket grants.
revoke all on public.saved_postings      from anon, authenticated, public;
revoke all on public.resumes             from anon, authenticated, public;
revoke all on public.dismissed_postings  from anon, authenticated, public;

-- 2. Re-grant exactly the verbs the application issues, nothing more.
--    resumes and dismissed_postings get no UPDATE: nothing in the app
--    updates either one (resumes are insert-then-delete; dismissals are a
--    presence flag).
grant select, insert, update, delete on public.saved_postings     to authenticated;
grant select, insert, delete         on public.resumes            to authenticated;
grant select, insert, delete         on public.dismissed_postings to authenticated;

-- 3. Rebind every policy to the authenticated role.
drop policy if exists "select own saved postings" on public.saved_postings;
drop policy if exists "insert own saved postings" on public.saved_postings;
drop policy if exists "update own saved postings" on public.saved_postings;
drop policy if exists "delete own saved postings" on public.saved_postings;

create policy "select own saved postings" on public.saved_postings
  for select to authenticated using (auth.uid() = user_id);
create policy "insert own saved postings" on public.saved_postings
  for insert to authenticated with check (auth.uid() = user_id);
create policy "update own saved postings" on public.saved_postings
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own saved postings" on public.saved_postings
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "select own resumes" on public.resumes;
drop policy if exists "insert own resumes" on public.resumes;
drop policy if exists "delete own resumes" on public.resumes;

create policy "select own resumes" on public.resumes
  for select to authenticated using (auth.uid() = user_id);
create policy "insert own resumes" on public.resumes
  for insert to authenticated with check (auth.uid() = user_id);
create policy "delete own resumes" on public.resumes
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "select own dismissed postings" on public.dismissed_postings;
drop policy if exists "insert own dismissed postings" on public.dismissed_postings;
drop policy if exists "delete own dismissed postings" on public.dismissed_postings;

create policy "select own dismissed postings" on public.dismissed_postings
  for select to authenticated using (auth.uid() = user_id);
create policy "insert own dismissed postings" on public.dismissed_postings
  for insert to authenticated with check (auth.uid() = user_id);
create policy "delete own dismissed postings" on public.dismissed_postings
  for delete to authenticated using (auth.uid() = user_id);

-- 4. Storage: bind the resume-bucket policies to authenticated as well.
--    Same predicate, unchanged -- first path segment must be the caller's
--    own uid.
drop policy if exists "select own resume files" on storage.objects;
drop policy if exists "insert own resume files" on storage.objects;
drop policy if exists "delete own resume files" on storage.objects;

create policy "select own resume files" on storage.objects
  for select to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "insert own resume files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own resume files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

-- 5. rls_auto_enable() is an event-trigger function (a direct RPC call just
--    errors), but it is SECURITY DEFINER and was callable by anon and
--    authenticated via /rest/v1/rpc/. Event triggers fire as the owner and
--    do not consult EXECUTE, so revoking is safe.
revoke all on function public.rls_auto_enable() from anon, authenticated, public;
