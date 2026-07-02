-- Agentic CRM OS — Phase 2.1: meetings + agent runs.
-- Rooms (1:1, team, boardroom, war room, office hours), their participants,
-- streamed messages, structured meeting outputs, and the agent-run execution
-- log. Additive; RLS = owner-write / manager-read-team, with room children
-- denormalizing user_id + team_id so policies stay simple and fast.

-- ── meeting_rooms ────────────────────────────────────────────────────────────
create table if not exists public.meeting_rooms (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  team_id        uuid references public.teams(id) on delete cascade,
  mode           text not null default 'one_on_one',  -- one_on_one|team|boardroom|war_room|office_hours
  topic          text,
  chair_agent_id text references public.agents(id) on delete set null,
  template       text,
  status         text not null default 'open',        -- open|summarized|closed
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists meeting_rooms_user_idx on public.meeting_rooms (user_id, created_at desc);
alter table public.meeting_rooms enable row level security;
drop policy if exists meeting_rooms_select on public.meeting_rooms;
create policy meeting_rooms_select on public.meeting_rooms for select to authenticated
  using ( user_id = (select auth.uid()) or (is_manager_or_owner() and team_id = get_my_team_id()) );
drop policy if exists meeting_rooms_write on public.meeting_rooms;
create policy meeting_rooms_write on public.meeting_rooms for all to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );

-- ── meeting_participants ─────────────────────────────────────────────────────
create table if not exists public.meeting_participants (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.meeting_rooms(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,   -- room owner (for RLS)
  agent_id   text references public.agents(id) on delete cascade,
  member_uid uuid references public.users(id) on delete cascade,            -- a human participant, if any
  role       text,
  created_at timestamptz not null default now()
);
create index if not exists meeting_participants_room_idx on public.meeting_participants (room_id);
alter table public.meeting_participants enable row level security;
drop policy if exists meeting_participants_select on public.meeting_participants;
create policy meeting_participants_select on public.meeting_participants for select to authenticated
  using ( user_id = (select auth.uid()) );
drop policy if exists meeting_participants_write on public.meeting_participants;
create policy meeting_participants_write on public.meeting_participants for all to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );

-- ── agent_messages (chat + meeting turns) ────────────────────────────────────
create table if not exists public.agent_messages (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.meeting_rooms(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,  -- room owner (for RLS)
  author_type text not null default 'user',   -- user|agent
  author_id   text,                           -- users.id or agents.id
  author_name text,
  content     text not null,
  mentions    text[] not null default '{}',
  created_at  timestamptz not null default now()
);
create index if not exists agent_messages_room_idx on public.agent_messages (room_id, created_at);
alter table public.agent_messages enable row level security;
drop policy if exists agent_messages_select on public.agent_messages;
create policy agent_messages_select on public.agent_messages for select to authenticated
  using ( user_id = (select auth.uid()) );
drop policy if exists agent_messages_write on public.agent_messages;
create policy agent_messages_write on public.agent_messages for all to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );

-- ── meeting_outputs (structured result of a room) ────────────────────────────
create table if not exists public.meeting_outputs (
  id                   uuid primary key default gen_random_uuid(),
  room_id              uuid not null references public.meeting_rooms(id) on delete cascade,
  user_id              uuid not null references public.users(id) on delete cascade,
  summary              text,
  decisions            jsonb not null default '[]'::jsonb,
  open_questions       jsonb not null default '[]'::jsonb,
  owners               jsonb not null default '[]'::jsonb,
  next_actions         jsonb not null default '[]'::jsonb,
  deadlines            jsonb not null default '[]'::jsonb,
  crm_links            jsonb not null default '[]'::jsonb,
  memory_candidate_ids uuid[] not null default '{}',
  created_at           timestamptz not null default now()
);
create index if not exists meeting_outputs_room_idx on public.meeting_outputs (room_id);
alter table public.meeting_outputs enable row level security;
drop policy if exists meeting_outputs_select on public.meeting_outputs;
create policy meeting_outputs_select on public.meeting_outputs for select to authenticated
  using ( user_id = (select auth.uid()) );
drop policy if exists meeting_outputs_write on public.meeting_outputs;
create policy meeting_outputs_write on public.meeting_outputs for all to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );

-- ── agent_runs (execution log) ───────────────────────────────────────────────
create table if not exists public.agent_runs (
  id          uuid primary key default gen_random_uuid(),
  agent_id    text references public.agents(id) on delete set null,
  user_id     uuid references public.users(id) on delete cascade,
  team_id     uuid references public.teams(id) on delete cascade,
  room_id     uuid references public.meeting_rooms(id) on delete set null,
  trigger     text,                             -- webhook|cron|event|manual|meeting
  input       jsonb not null default '{}'::jsonb,
  output      jsonb not null default '{}'::jsonb,
  status      text not null default 'ok',       -- ok|error|pending
  model       text,
  tokens      integer,
  cost        numeric,
  error       text,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz
);
create index if not exists agent_runs_agent_idx on public.agent_runs (agent_id, started_at desc);
create index if not exists agent_runs_user_idx on public.agent_runs (user_id, started_at desc);
alter table public.agent_runs enable row level security;
drop policy if exists agent_runs_select on public.agent_runs;
create policy agent_runs_select on public.agent_runs for select to authenticated
  using ( user_id = (select auth.uid()) or (is_manager_or_owner() and team_id = get_my_team_id()) );
drop policy if exists agent_runs_write on public.agent_runs;
create policy agent_runs_write on public.agent_runs for all to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );
