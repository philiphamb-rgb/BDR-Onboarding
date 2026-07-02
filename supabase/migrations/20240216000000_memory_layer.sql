-- Agentic CRM OS — Phase 5: the layered memory + governance schema.
-- Enables pgvector and creates episodic events, promotion candidates, promoted
-- semantic memories (+ embeddings for future RAG), feedback, the PR-style review
-- log, an immutable audit log, and lineage links. Additive; RLS owner-write /
-- manager-read-team. Retrieval + decay recompute build on top of this.

create extension if not exists vector;

create table if not exists public.memory_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  kind text, source_type text, source_id uuid,
  content text, payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists memory_events_user_idx on public.memory_events (user_id, created_at desc);
alter table public.memory_events enable row level security;
create policy memory_events_select on public.memory_events for select to authenticated
  using ( user_id = (select auth.uid()) or (is_manager_or_owner() and team_id = get_my_team_id()) );
create policy memory_events_write on public.memory_events for all to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );

create table if not exists public.memory_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  title text not null, insight text,
  evidence jsonb not null default '[]'::jsonb,
  confidence integer, freshness integer,
  contradiction_status text default 'none',
  risk_tier text default 'low', category text,
  affected_agents text[] not null default '{}',
  affected_workflows text[] not null default '{}',
  reason text, status text not null default 'pending',
  source_event_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz, reviewed_by uuid references public.users(id) on delete set null
);
alter table public.memory_candidates enable row level security;
create policy memory_candidates_select on public.memory_candidates for select to authenticated
  using ( user_id = (select auth.uid()) or (is_manager_or_owner() and team_id = get_my_team_id()) );
create policy memory_candidates_write on public.memory_candidates for all to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );

create table if not exists public.semantic_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  title text not null, content text, category text,
  trust_score integer not null default 50,
  lifecycle_state text not null default 'active',
  risk_tier text default 'low',
  source_candidate_id uuid references public.memory_candidates(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.semantic_memories enable row level security;
create policy semantic_memories_select on public.semantic_memories for select to authenticated
  using ( user_id = (select auth.uid()) or (is_manager_or_owner() and team_id = get_my_team_id()) );
create policy semantic_memories_write on public.semantic_memories for all to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );

create table if not exists public.memory_embeddings (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid references public.semantic_memories(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  source text, embedding vector(1536),
  created_at timestamptz not null default now()
);
alter table public.memory_embeddings enable row level security;
create policy memory_embeddings_select on public.memory_embeddings for select to authenticated
  using ( user_id = (select auth.uid()) );
create policy memory_embeddings_write on public.memory_embeddings for all to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );

create table if not exists public.memory_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  memory_id uuid references public.semantic_memories(id) on delete cascade,
  helpful boolean, outcome text,
  created_at timestamptz not null default now()
);
alter table public.memory_feedback enable row level security;
create policy memory_feedback_all on public.memory_feedback for all to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );

create table if not exists public.memory_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  candidate_id uuid references public.memory_candidates(id) on delete cascade,
  action text, note text,
  created_at timestamptz not null default now()
);
alter table public.memory_reviews enable row level security;
create policy memory_reviews_all on public.memory_reviews for all to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );

create table if not exists public.memory_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  entity_type text, entity_id uuid, action text, detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.memory_audit_log enable row level security;
create policy memory_audit_select on public.memory_audit_log for select to authenticated
  using ( user_id = (select auth.uid()) or (is_manager_or_owner()) );
create policy memory_audit_write on public.memory_audit_log for all to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );

create table if not exists public.memory_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  from_type text, from_id uuid, to_type text, to_id uuid, relation text,
  created_at timestamptz not null default now()
);
alter table public.memory_links enable row level security;
create policy memory_links_all on public.memory_links for all to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );
