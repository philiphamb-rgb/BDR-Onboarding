-- Agentic CRM OS — Phase 3: the Content OS tables. Completes the content layer
-- begun in Phase 1.5 (content_ideas + scripts): posts + metrics, podcast/long-
-- form sources and their repurposed assets, social proof, and experiments.
-- Additive; RLS owner-write / manager-read-team.

-- posts — a scheduled/published piece (links out to publish; permalink tracked)
create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  team_id      uuid references public.teams(id) on delete cascade,
  script_id    uuid references public.scripts(id) on delete set null,
  idea_id      uuid references public.content_ideas(id) on delete set null,
  channel      text,
  title        text,
  body         text,
  status       text not null default 'draft',   -- draft|ready|scheduled|published
  scheduled_at timestamptz,
  published_at timestamptz,
  permalink    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists posts_user_idx on public.posts (user_id, status);
alter table public.posts enable row level security;
drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts for select to authenticated
  using ( user_id = (select auth.uid()) or (is_manager_or_owner() and team_id = get_my_team_id()) );
drop policy if exists posts_write on public.posts;
create policy posts_write on public.posts for all to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );

-- post_metrics — performance a rep pastes back / a source syncs
create table if not exists public.post_metrics (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  post_id       uuid not null references public.posts(id) on delete cascade,
  saves         integer, shares integer, watch_quality numeric, comments integer,
  dms           integer, clicks integer, lead_captures integer,
  captured_at   timestamptz not null default now()
);
create index if not exists post_metrics_post_idx on public.post_metrics (post_id);
alter table public.post_metrics enable row level security;
drop policy if exists post_metrics_select on public.post_metrics;
create policy post_metrics_select on public.post_metrics for select to authenticated
  using ( user_id = (select auth.uid()) );
drop policy if exists post_metrics_write on public.post_metrics;
create policy post_metrics_write on public.post_metrics for all to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );

-- podcast_assets — long-form source (transcript in storage or inline)
create table if not exists public.podcast_assets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  team_id      uuid references public.teams(id) on delete cascade,
  title        text not null,
  transcript   text,
  duration_min integer,
  created_at   timestamptz not null default now()
);
create index if not exists podcast_assets_user_idx on public.podcast_assets (user_id);
alter table public.podcast_assets enable row level security;
drop policy if exists podcast_assets_select on public.podcast_assets;
create policy podcast_assets_select on public.podcast_assets for select to authenticated
  using ( user_id = (select auth.uid()) or (is_manager_or_owner() and team_id = get_my_team_id()) );
drop policy if exists podcast_assets_write on public.podcast_assets;
create policy podcast_assets_write on public.podcast_assets for all to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );

-- repurposed_assets — the many short assets from one source
create table if not exists public.repurposed_assets (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  team_id           uuid references public.teams(id) on delete cascade,
  podcast_asset_id  uuid references public.podcast_assets(id) on delete cascade,
  kind              text,          -- reel|clip|quote|carousel|text|story|dm|email|hook
  title             text,
  body              text,
  created_at        timestamptz not null default now()
);
create index if not exists repurposed_source_idx on public.repurposed_assets (podcast_asset_id);
create index if not exists repurposed_user_idx on public.repurposed_assets (user_id);
alter table public.repurposed_assets enable row level security;
drop policy if exists repurposed_assets_select on public.repurposed_assets;
create policy repurposed_assets_select on public.repurposed_assets for select to authenticated
  using ( user_id = (select auth.uid()) or (is_manager_or_owner() and team_id = get_my_team_id()) );
drop policy if exists repurposed_assets_write on public.repurposed_assets;
create policy repurposed_assets_write on public.repurposed_assets for all to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );

-- social_proof_items — wins/testimonials/before-after feeding content
create table if not exists public.social_proof_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  team_id     uuid references public.teams(id) on delete cascade,
  kind        text,      -- win|testimonial|before_after|screenshot|onboarding
  body        text,
  partner_id  uuid references public.partner_onboarding(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists social_proof_user_idx on public.social_proof_items (user_id);
alter table public.social_proof_items enable row level security;
drop policy if exists social_proof_select on public.social_proof_items;
create policy social_proof_select on public.social_proof_items for select to authenticated
  using ( user_id = (select auth.uid()) or (is_manager_or_owner() and team_id = get_my_team_id()) );
drop policy if exists social_proof_write on public.social_proof_items;
create policy social_proof_write on public.social_proof_items for all to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );

-- content_experiments — A/B on hooks/sequences (used more in Phase 6)
create table if not exists public.content_experiments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  team_id     uuid references public.teams(id) on delete cascade,
  hypothesis  text, variant text, metric text, result text,
  status      text not null default 'running',
  created_at  timestamptz not null default now()
);
alter table public.content_experiments enable row level security;
drop policy if exists content_experiments_select on public.content_experiments;
create policy content_experiments_select on public.content_experiments for select to authenticated
  using ( user_id = (select auth.uid()) or (is_manager_or_owner() and team_id = get_my_team_id()) );
drop policy if exists content_experiments_write on public.content_experiments;
create policy content_experiments_write on public.content_experiments for all to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );
