-- Compliance approved-language vault. Manager-curated, pre-cleared snippets that
-- partner-facing agents must use for any regulated claim. Injected into agent
-- prompts. (Applied to the live DB via MCP; recorded here for the repo.)
create table if not exists public.approved_language (
  id uuid primary key default gen_random_uuid(),
  team_id uuid,
  category text not null default 'general',
  label text not null,
  snippet text not null,
  note text,
  active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists approved_language_team_idx on public.approved_language (team_id, category);

alter table public.approved_language enable row level security;

create policy approved_language_select on public.approved_language
  for select using (team_id = get_my_team_id());
create policy approved_language_write on public.approved_language
  for insert with check (is_manager_or_owner() and team_id = get_my_team_id());
create policy approved_language_update on public.approved_language
  for update using (is_manager_or_owner() and team_id = get_my_team_id())
  with check (is_manager_or_owner() and team_id = get_my_team_id());
create policy approved_language_delete on public.approved_language
  for delete using (is_manager_or_owner() and team_id = get_my_team_id());
