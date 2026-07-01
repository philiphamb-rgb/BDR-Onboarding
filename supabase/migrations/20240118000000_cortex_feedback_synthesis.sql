-- Cortex — the feedback-loop synthesis pipeline (mirrors the live
-- cortex_feedback_synthesis migration). Approved feedback becomes a VERSIONED
-- instruction override that actually extends an agent's prompt on the AI Team —
-- not a UI relabel. Idempotent.

create table if not exists public.growth_instruction_proposals (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  agent_id    text not null,
  summary     text not null,
  addendum    text not null,
  rationale   text,
  source_ids  jsonb not null default '[]'::jsonb,
  status      text not null default 'pending',   -- pending | approved | rejected
  created_at  timestamptz not null default now()
);
alter table public.growth_instruction_proposals enable row level security;
drop policy if exists gip_manager_all on public.growth_instruction_proposals;
create policy gip_manager_all on public.growth_instruction_proposals
  for all using (is_manager_or_owner() and team_id = get_my_team_id())
  with check (is_manager_or_owner() and team_id = get_my_team_id());

create table if not exists public.agent_instruction_overrides (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  agent_id    text not null,
  addendum    text not null,
  version     integer not null default 1,
  source_proposal_id uuid,
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
alter table public.agent_instruction_overrides enable row level security;
-- Every team member READS the overrides (the AI Team extends prompts with them);
-- only managers apply/rollback.
drop policy if exists aio_team_read on public.agent_instruction_overrides;
create policy aio_team_read on public.agent_instruction_overrides
  for select using (team_id = get_my_team_id());
drop policy if exists aio_manager_write on public.agent_instruction_overrides;
create policy aio_manager_write on public.agent_instruction_overrides
  for all using (is_manager_or_owner() and team_id = get_my_team_id())
  with check (is_manager_or_owner() and team_id = get_my_team_id());
create index if not exists aio_team_agent_idx on public.agent_instruction_overrides (team_id, agent_id, version desc);
