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

-- Extra per-application fields for the /tracker sheet -- freeform details
-- the scanner has no way to know (which résumé/cover letter version was
-- used, salary discussed, offer details). All optional text, edited inline
-- from the sheet itself. Run this the same way as the previous migrations.
alter table saved_postings add column if not exists resume_used text not null default '';
alter table saved_postings add column if not exists cover_letter text not null default '';
alter table saved_postings add column if not exists salary text not null default '';
alter table saved_postings add column if not exists offer text not null default '';
