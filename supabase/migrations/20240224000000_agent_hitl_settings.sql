-- Per-team human-in-the-loop overrides + team default. Effective tier =
-- override ?? registry default ?? team default. (Applied live via MCP; recorded.)
create table if not exists public.agent_settings (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  agent_id text not null,
  hitl_tier text not null default 'in-the-loop',
  updated_by uuid,
  updated_at timestamptz not null default now(),
  unique (team_id, agent_id)
);
create index if not exists agent_settings_team_idx on public.agent_settings (team_id);
alter table public.agent_settings enable row level security;
create policy agent_settings_select on public.agent_settings for select using (team_id = get_my_team_id());
create policy agent_settings_write on public.agent_settings for insert with check (is_manager_or_owner() and team_id = get_my_team_id());
create policy agent_settings_update on public.agent_settings for update using (is_manager_or_owner() and team_id = get_my_team_id()) with check (is_manager_or_owner() and team_id = get_my_team_id());
alter table public.brand_settings add column if not exists default_hitl text not null default 'in-the-loop';
