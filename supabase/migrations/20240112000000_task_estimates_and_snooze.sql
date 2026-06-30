-- Auto-triage foundations:
--   * estimated_minutes — editable time-to-complete per task; the triage engine
--     uses it to pack tasks into time blocks by available capacity.
--   * snoozed_until — the aging algorithm can defer a stale task to a later date
--     instead of deleting it (keeps the active list uncongested).
alter table public.tasks add column if not exists estimated_minutes int not null default 30;
alter table public.tasks add column if not exists snoozed_until date;
create index if not exists idx_tasks_user_open on public.tasks (user_id) where done = false;
