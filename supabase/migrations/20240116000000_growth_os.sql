-- ════════════════════════════════════════════════════════════════════════════
-- Growth OS — schema for the AI-powered growth engine.
--
-- Mirrors what is already live on the project (applied via MCP as the
-- growth_os_* migrations); committed here so the repo and the database stay in
-- sync. Written idempotently (IF NOT EXISTS / DROP POLICY IF EXISTS / ON
-- CONFLICT DO NOTHING) so it is safe to run anywhere.
--
-- Deliberate anti-duplication choices (see lib/modules/growth-os):
--   • Growth goals extend the EXISTING per-user `goals` row — no parallel table.
--   • Leads ARE `partner_onboarding` — Growth OS reads that pipeline, never a
--     second leads store.
--   • The AI Coach is the EXISTING /api/coach — Growth OS summons it via
--     askCoach(); there is no second coach runtime.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Growth goals on the shared goals row ────────────────────────────────────
alter table public.goals add column if not exists leads_per_week_goal integer;
alter table public.goals add column if not exists close_rate_goal numeric;

-- ── AI Team roster (team-scoped; managers manage, team reads) ────────────────
-- RLS shape copied from gamification_rules. Rich per-agent metadata lives in
-- code; this table holds each team's live state.
create table if not exists public.automations (
  team_id    uuid not null references public.teams(id) on delete cascade,
  id         text not null,
  name       text not null,
  category   text not null,
  status     text not null default 'setup',
  config     jsonb not null default '{}'::jsonb,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (team_id, id)
);
alter table public.automations enable row level security;
drop policy if exists team_members_read_automations on public.automations;
create policy team_members_read_automations on public.automations
  for select using (team_id = get_my_team_id());
drop policy if exists managers_manage_automations on public.automations;
create policy managers_manage_automations on public.automations
  for all using (is_manager_or_owner() and team_id = get_my_team_id());

-- ── Automation activity log (append-only audit) ─────────────────────────────
-- No client-side INSERT policy on purpose: rows are written only by the service
-- role from backend agent processes, never forgeable by a browser session.
create table if not exists public.automation_log (
  id             uuid primary key default gen_random_uuid(),
  team_id        uuid not null references public.teams(id) on delete cascade,
  automation_id  text not null,
  user_reference uuid,
  action         text not null,
  detail         jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);
alter table public.automation_log enable row level security;
drop policy if exists team_members_read_automation_log on public.automation_log;
create policy team_members_read_automation_log on public.automation_log
  for select using (team_id = get_my_team_id());
create index if not exists automation_log_team_created_idx on public.automation_log (team_id, created_at desc);

-- ── AI coach message history (per-user; reserved for persisted coach history) ─
create table if not exists public.ai_coach_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  role       text not null,
  content    text not null,
  created_at timestamptz not null default now()
);
alter table public.ai_coach_messages enable row level security;
drop policy if exists ai_coach_messages_own on public.ai_coach_messages;
create policy ai_coach_messages_own on public.ai_coach_messages
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create index if not exists ai_coach_messages_user_created_idx on public.ai_coach_messages (user_id, created_at);

-- ── Seed the 18-agent roster for every existing team ────────────────────────
-- Id-agnostic (cross-joins teams) and idempotent, so it never clobbers a
-- manager's live status on re-run.
insert into public.automations (team_id, id, name, category, status, config)
select t.id, r.id, r.name, r.category, r.status, '{}'::jsonb
from public.teams t
cross join (values
  ('scoring',     'Lead Scorer',          'funnel',    'live'),
  ('alert',       'Hot-Lead Alert',       'funnel',    'live'),
  ('followup',    'Follow-Up Sequencer',  'funnel',    'live'),
  ('router',      'Lead Router',          'funnel',    'setup'),
  ('enrich',      'Lead Enricher',        'funnel',    'setup'),
  ('booker',      'Meeting Booker',       'funnel',    'paused'),
  ('ideator',     'Content Ideator',      'content',   'live'),
  ('personalize', 'Outreach Personalizer','content',   'live'),
  ('rebuttal',    'Objection Rebuttals',  'content',   'live'),
  ('repurpose',   'Win Repurposer',       'content',   'setup'),
  ('health',      'Account Health',       'retention', 'live'),
  ('winback',     'Win-Back',             'retention', 'setup'),
  ('pulse',       'Partner Pulse',        'retention', 'setup'),
  ('milestone',   'Milestone Celebrator', 'retention', 'paused'),
  ('digest',      'Daily Digest',         'ops',       'live'),
  ('hygiene',     'Pipeline Hygiene',     'ops',       'live'),
  ('forecast',    'Forecaster',           'ops',       'live'),
  ('signals',     'Coaching Signals',     'ops',       'setup')
) as r(id, name, category, status)
on conflict (team_id, id) do nothing;
