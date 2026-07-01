-- Streak resilience: a "freeze" auto-protects the streak across a single missed
-- day instead of resetting it. Reps earn one freeze each time their streak
-- crosses a 7-day multiple (capped), and one is spent to bridge a one-day gap.
-- calculate-xp reads/writes this column.
alter table public.user_progress
  add column if not exists streak_freezes integer not null default 0;
