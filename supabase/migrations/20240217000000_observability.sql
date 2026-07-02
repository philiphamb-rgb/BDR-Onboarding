-- Agentic CRM OS — Phase 6: observability tables. Versioned prompts + workflows
-- (rollback for the self-improvement loop), retrieval-quality events, trust-score
-- history, and per-run traces/spans. Additive; RLS owner-write / manager-read-team
-- (or owner-only where there's no team_id). The AI Company dashboard reads these
-- plus agent_runs / memory / meeting_outputs.
create table if not exists public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  agent_id text references public.agents(id) on delete cascade,
  version integer not null default 1, prompt text, note text, active boolean default true,
  created_at timestamptz not null default now()
);
alter table public.prompt_versions enable row level security;
create policy prompt_versions_select on public.prompt_versions for select to authenticated
  using ( user_id = (select auth.uid()) or (is_manager_or_owner() and team_id = get_my_team_id()) );
create policy prompt_versions_write on public.prompt_versions for all to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );

create table if not exists public.workflow_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  workflow_key text, version integer not null default 1, definition jsonb not null default '{}'::jsonb,
  note text, active boolean default true,
  created_at timestamptz not null default now()
);
alter table public.workflow_versions enable row level security;
create policy workflow_versions_select on public.workflow_versions for select to authenticated
  using ( user_id = (select auth.uid()) or (is_manager_or_owner() and team_id = get_my_team_id()) );
create policy workflow_versions_write on public.workflow_versions for all to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );

create table if not exists public.retrieval_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  agent_run_id uuid references public.agent_runs(id) on delete cascade,
  query text, retrieved jsonb not null default '[]'::jsonb, helped boolean, outcome text,
  created_at timestamptz not null default now()
);
alter table public.retrieval_events enable row level security;
create policy retrieval_events_all on public.retrieval_events for all to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );

create table if not exists public.trust_score_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  memory_id uuid references public.semantic_memories(id) on delete cascade,
  trust_score integer, reason text,
  created_at timestamptz not null default now()
);
alter table public.trust_score_history enable row level security;
create policy trust_score_history_all on public.trust_score_history for all to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );

create table if not exists public.traces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  agent_run_id uuid references public.agent_runs(id) on delete cascade,
  name text, spans jsonb not null default '[]'::jsonb, duration_ms integer,
  created_at timestamptz not null default now()
);
alter table public.traces enable row level security;
create policy traces_all on public.traces for all to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );
