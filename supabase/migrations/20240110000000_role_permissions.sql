-- Per-team Roles & Permissions matrix. Rows are overrides on top of the code
-- defaults (src/lib/permissions.ts); absence of a row = use the default (fail-open).
create table if not exists public.role_permissions (
  team_id     uuid not null references public.teams(id) on delete cascade,
  role        text not null,                  -- 'admin' | 'manager' | 'rep'
  feature_key text not null,
  can_view    boolean not null default true,
  can_edit    boolean not null default true,
  updated_at  timestamptz not null default now(),
  primary key (team_id, role, feature_key)
);

alter table public.role_permissions enable row level security;

-- Any team member can read their team's matrix (to resolve their own access).
drop policy if exists roleperm_select on public.role_permissions;
create policy roleperm_select on public.role_permissions
  for select using (team_id = get_my_team_id());

-- Only managers/owners (admins) edit it, for their own team.
drop policy if exists roleperm_write on public.role_permissions;
create policy roleperm_write on public.role_permissions
  for all using (is_manager_or_owner() and team_id = get_my_team_id())
  with check (is_manager_or_owner() and team_id = get_my_team_id());
