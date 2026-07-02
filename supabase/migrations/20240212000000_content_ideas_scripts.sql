-- Agentic CRM OS — Phase 1.5: content ideas + scripts (seed of the Content OS).
-- The idea→script step made real, replacing demo-only content for capture. The
-- rest of the content layer (posts, metrics, podcast, repurposed, proof) lands
-- in Phase 3. Additive; RLS mirrors the owner-write / manager-read-team pattern.

create table if not exists public.content_ideas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  team_id     uuid references public.teams(id) on delete cascade,
  bucket      text,                              -- content pillar (tutorial, proof, opinion…)
  title       text not null,
  hook        text,
  angle       text,
  format      text,                              -- reel|carousel|text|story|vsl…
  channel     text,                              -- face|faceless
  ev_score    integer,                           -- expected value rank
  status      text not null default 'idea',      -- idea|scripted|posted|archived
  source      text,                              -- manual|coach|repurpose|agent
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists content_ideas_user_idx on public.content_ideas (user_id, status);
create index if not exists content_ideas_team_idx on public.content_ideas (team_id);
alter table public.content_ideas enable row level security;
drop policy if exists content_ideas_select on public.content_ideas;
create policy content_ideas_select on public.content_ideas for select to authenticated
  using ( user_id = (select auth.uid()) or (is_manager_or_owner() and team_id = get_my_team_id()) );
drop policy if exists content_ideas_write on public.content_ideas;
create policy content_ideas_write on public.content_ideas for all to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );

create table if not exists public.scripts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users(id) on delete cascade,
  team_id          uuid references public.teams(id) on delete cascade,
  content_idea_id  uuid references public.content_ideas(id) on delete cascade,
  body             text not null default '',
  cta              text,
  format           text,
  version          integer not null default 1,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists scripts_idea_idx on public.scripts (content_idea_id);
create index if not exists scripts_user_idx on public.scripts (user_id);
alter table public.scripts enable row level security;
drop policy if exists scripts_select on public.scripts;
create policy scripts_select on public.scripts for select to authenticated
  using ( user_id = (select auth.uid()) or (is_manager_or_owner() and team_id = get_my_team_id()) );
drop policy if exists scripts_write on public.scripts;
create policy scripts_write on public.scripts for all to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );
