-- ---------------------------------------------------------------------
-- NOT APPLIED TO THE LIVE DATABASE.
--
-- Verified 2026-08-10 against the running project: none of the columns
-- this file adds (resume_used, cover_letter, salary, offer) exist. Every
-- write to them has been failing silently. The tracker UI no longer
-- references resume_used / cover_letter / salary at all.
--
-- The file is kept rather than deleted so the history stays honest. Do not
-- assume it ran just because it is here -- supabase_migrations was empty
-- until 0009, i.e. everything before that was applied by hand in the SQL
-- editor with no record of what actually landed.
-- ---------------------------------------------------------------------

-- Two default changes to match the simplified save-is-apply workflow:
--   - offer defaults to "waiting" instead of blank, matching the Yes/No/
--     Waiting dropdown on /tracker.
--   - status defaults to "applied" instead of "saved" -- app/saved/actions.ts
--     savePosting() now sets both explicitly on every save, so this mostly
--     just keeps the column default consistent for any other insert path.
-- Safe to run whether or not 0004_tracker_fields.sql has already run.
alter table saved_postings add column if not exists offer text not null default 'waiting';
alter table saved_postings alter column offer set default 'waiting';
update saved_postings set offer = 'waiting' where offer = '';

alter table saved_postings alter column status set default 'applied';
