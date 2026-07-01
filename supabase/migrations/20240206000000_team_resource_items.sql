-- Editable Resource Center content. The /resources page was 100% static code;
-- this lets a manager add/edit/delete every tool, teammate, library item, and
-- roadmap phase for their team — no code change, no Claude prompt. Reps read;
-- managers/owners write, team-scoped via the vetted RLS helpers.
create table if not exists public.team_resource_items (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  kind        text not null check (kind in ('tool','person','library','roadmap')),
  category    text,                       -- library section grouping (null for others)
  data        jsonb not null default '{}'::jsonb,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists team_resource_items_team_kind_idx
  on public.team_resource_items (team_id, kind, sort_order);

alter table public.team_resource_items enable row level security;

drop policy if exists team_resource_items_read on public.team_resource_items;
create policy team_resource_items_read on public.team_resource_items
  for select to authenticated
  using ( team_id = get_my_team_id() );

drop policy if exists team_resource_items_write on public.team_resource_items;
create policy team_resource_items_write on public.team_resource_items
  for all to authenticated
  using ( is_manager_or_owner() and team_id = get_my_team_id() )
  with check ( is_manager_or_owner() and team_id = get_my_team_id() );
