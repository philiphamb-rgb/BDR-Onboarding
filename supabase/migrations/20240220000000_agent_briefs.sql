-- Autonomous agent output surface. The Chief of Staff writes a morning brief per
-- operator; the QA Lead writes a nightly team audit. Both land here and surface
-- on Today/Home. (Applied to the live DB via MCP; recorded here for the repo.)
create table if not exists public.agent_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  team_id uuid,
  agent_id text,
  kind text not null default 'morning',        -- 'morning' | 'nightly'
  for_date date not null default (now() at time zone 'utc')::date,
  title text,
  body text,
  data jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists agent_briefs_user_date_idx on public.agent_briefs (user_id, for_date desc);
create index if not exists agent_briefs_team_date_idx on public.agent_briefs (team_id, for_date desc);

alter table public.agent_briefs enable row level security;

create policy agent_briefs_select on public.agent_briefs
  for select using (
    (select auth.uid()) = user_id
    or (is_manager_or_owner() and team_id = get_my_team_id())
  );
create policy agent_briefs_update on public.agent_briefs
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
-- Owner may generate their own brief on demand (the "Brief me" button); the
-- service-role cron bypasses RLS for the scheduled path.
create policy agent_briefs_insert on public.agent_briefs
  for insert with check ((select auth.uid()) = user_id);
