-- Expand status from the old 5-value list into the full application
-- pipeline, and flip the default: saving a posting now means "not applied
-- yet" (a lead you're tracking), not "applied". The old CHECK constraint
-- has to be dropped before the new values can be written, and existing
-- rows remapped onto the new vocabulary.
--
-- Run this in the Supabase SQL editor like the previous migrations.

alter table saved_postings drop constraint if exists saved_postings_status_check;

-- Remap the two renamed values. Everything else ('applied', 'offer',
-- 'rejected') carries over unchanged.
update saved_postings set status = 'not_applied' where status = 'saved';
update saved_postings set status = 'interview' where status = 'interviewing';

alter table saved_postings add constraint saved_postings_status_check
  check (status in (
    'not_applied', 'applied', 'oa', 'interview', 'final_round', 'offer', 'rejected'
  ));

alter table saved_postings alter column status set default 'not_applied';
