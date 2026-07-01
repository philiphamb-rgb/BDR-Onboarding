-- Broadcast history — a first-class record of manager announcements.
--
-- Before this, the Broadcast page tried to reconstruct history by SELECTing
-- notifications WHERE type='broadcast'. But the only SELECT policy on
-- notifications is user_id = auth.uid(), and broadcast rows are inserted with
-- user_id = <each rep>. So a manager's own SELECT matched zero rows and the
-- "Recent Messages" list was always empty after a reload. A dedicated,
-- team-scoped table fixes that and lets us store an accurate recipient_count.
create table if not exists public.broadcasts (
  id              uuid primary key default gen_random_uuid(),
  team_id         uuid not null references public.teams(id) on delete cascade,
  sender_id       uuid not null references public.users(id) on delete cascade,
  title           text not null,
  body            text not null,
  recipient_count integer not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists broadcasts_team_created_idx
  on public.broadcasts (team_id, created_at desc);

alter table public.broadcasts enable row level security;

-- Managers/owners can read and write their own team's broadcast history. Reps
-- never touch this table (they receive the fan-out notifications instead), so
-- there is deliberately no rep-facing policy.
drop policy if exists broadcasts_team_read on public.broadcasts;
create policy broadcasts_team_read on public.broadcasts
  for select to authenticated
  using ( is_manager_or_owner() and team_id = get_my_team_id() );

drop policy if exists broadcasts_team_insert on public.broadcasts;
create policy broadcasts_team_insert on public.broadcasts
  for insert to authenticated
  with check ( is_manager_or_owner() and team_id = get_my_team_id() and sender_id = (select auth.uid()) );
