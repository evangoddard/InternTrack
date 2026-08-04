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
