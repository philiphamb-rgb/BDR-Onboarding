-- Daily Rhythm accountability: a per-block done status + manager visibility so
-- managers can see where each rep is in their day (done / in-progress / next).

alter table public.schedule_blocks add column if not exists done boolean not null default false;

-- Managers/owners can read their team's blocks (live day tracking). Owner-only
-- read/write policies from the original migration still apply (OR'd).
drop policy if exists schedblocks_mgr_select on public.schedule_blocks;
create policy schedblocks_mgr_select on public.schedule_blocks
  for select using (
    is_manager_or_owner()
    and user_id in (select id from public.users where team_id = get_my_team_id())
  );
