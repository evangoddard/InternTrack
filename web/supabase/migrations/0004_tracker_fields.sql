-- Extra per-application fields for the /tracker sheet -- freeform details
-- the scanner has no way to know (which résumé/cover letter version was
-- used, salary discussed, offer details). All optional text, edited inline
-- from the sheet itself. Run this the same way as the previous migrations.
alter table saved_postings add column if not exists resume_used text not null default '';
alter table saved_postings add column if not exists cover_letter text not null default '';
alter table saved_postings add column if not exists salary text not null default '';
alter table saved_postings add column if not exists offer text not null default '';
