-- Per-user, per-day Daily Rhythm blocks. Lets reps adjust their time-blocking and
-- attach notes inside the tool (works fully offline). `graph_event_id` is the hook
-- for the future Outlook/Microsoft Graph two-way sync (null = local only).
--
-- The OPTIMIZED_DAY template (src/lib/schedule.ts) remains the default; a row is
-- written here only when a rep customizes a block or adds a note for a given day.

create table if not exists public.schedule_blocks (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  day            date not null,
  block_key      text not null,          -- stable key (template index/slug)
  label          text not null,
  type           text not null,          -- plan | focus | break | lunch | admin
  start_min      int not null,           -- minutes-of-day
  dur_min        int not null,
  note           text,
  graph_event_id text,                   -- set once synced to Outlook
  updated_at     timestamptz not null default now(),
  unique (user_id, day, block_key)
);

create index if not exists idx_schedule_blocks_user_day on public.schedule_blocks (user_id, day);

alter table public.schedule_blocks enable row level security;

-- Owner-only: a rep's schedule + notes are private (no manager read).
drop policy if exists schedblocks_select on public.schedule_blocks;
create policy schedblocks_select on public.schedule_blocks
  for select using (user_id = (select auth.uid()));

drop policy if exists schedblocks_insert on public.schedule_blocks;
create policy schedblocks_insert on public.schedule_blocks
  for insert with check (user_id = (select auth.uid()));

drop policy if exists schedblocks_update on public.schedule_blocks;
create policy schedblocks_update on public.schedule_blocks
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists schedblocks_delete on public.schedule_blocks;
create policy schedblocks_delete on public.schedule_blocks
  for delete using (user_id = (select auth.uid()));
