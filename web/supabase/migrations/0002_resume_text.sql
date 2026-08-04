-- Adds the extracted-text column resumes needs to actually be matched
-- against postings (see lib/parseResume.ts + lib/rankPostings.ts). Run
-- this in the Supabase SQL Editor the same way you ran schema.sql --
-- it's additive and safe to run even if you're not sure whether it's
-- already applied.
alter table resumes add column if not exists parsed_text text not null default '';
