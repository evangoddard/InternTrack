-- Tracks when a posting's status first became "applied", separately from
-- updated_at (which drifts every time status changes again later -- e.g.
-- applied -> interviewing would otherwise wipe out the real apply date).
-- Run this the same way as the previous migrations.
alter table saved_postings add column if not exists applied_at timestamptz;
