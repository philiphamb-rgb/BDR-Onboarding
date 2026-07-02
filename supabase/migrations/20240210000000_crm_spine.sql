-- Agentic CRM OS — Phase 1.1: the CRM spine.
-- Adds the four core CRM entities the rebuild needs (accounts, leads,
-- opportunities, activities) plus additive columns on existing CRM tables.
-- Modeled as ONE funnel that flows into the existing partner motion (see
-- docs/architecture/08-decisions.md B1): lead -> account -> opportunity ->
-- partner_onboarding. Purely additive and reversible: no existing table is
-- dropped or rewritten, no existing column changed. RLS mirrors the vetted
-- partner_onboarding pattern (owner writes; managers/owners read+manage team).

-- ─────────────────────────────────────────────────────────────────────────────
-- accounts — the business record (the unit that becomes a partner)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.accounts (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.users(id) on delete cascade,
  team_id               uuid references public.teams(id) on delete cascade,
  name                  text not null,
  vertical              text,
  segment               text,
  revenue_potential     numeric,
  partner_fit_score     integer,
  smartcredit_fit_score integer,
  health_score          integer,
  lifecycle_stage       text not null default 'new',   -- new|working|qualified|partner|inactive
  stakeholder_map       jsonb not null default '{}'::jsonb,
  tags                  text[] not null default '{}',
  ai_summary            text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists accounts_user_idx on public.accounts (user_id);
create index if not exists accounts_team_idx on public.accounts (team_id, lifecycle_stage);

alter table public.accounts enable row level security;
drop policy if exists accounts_select on public.accounts;
create policy accounts_select on public.accounts for select to authenticated
  using ( user_id = (select auth.uid()) or (is_manager_or_owner() and team_id = get_my_team_id()) );
drop policy if exists accounts_write on public.accounts;
create policy accounts_write on public.accounts for all to authenticated
  using ( user_id = (select auth.uid()) )
  with check ( user_id = (select auth.uid()) );
drop policy if exists accounts_manager_update on public.accounts;
create policy accounts_manager_update on public.accounts for update to authenticated
  using ( is_manager_or_owner() and team_id = get_my_team_id() )
  with check ( is_manager_or_owner() and team_id = get_my_team_id() );

-- ─────────────────────────────────────────────────────────────────────────────
-- leads — pre-qualification inbound interest, before an account is worked
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.leads (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.users(id) on delete cascade,
  team_id              uuid references public.teams(id) on delete cascade,
  account_id           uuid references public.accounts(id) on delete set null,
  contact_id           uuid references public.crm_contacts(id) on delete set null,
  source               text,
  raw_payload          jsonb not null default '{}'::jsonb,
  enrichment           jsonb not null default '{}'::jsonb,
  qualification_score  integer,
  status               text not null default 'new',   -- new|working|qualified|routed|recycled
  routing              jsonb not null default '{}'::jsonb,
  next_best_action     text,
  ai_summary           text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists leads_user_idx on public.leads (user_id);
create index if not exists leads_team_idx on public.leads (team_id, status);

alter table public.leads enable row level security;
drop policy if exists leads_select on public.leads;
create policy leads_select on public.leads for select to authenticated
  using ( user_id = (select auth.uid()) or (is_manager_or_owner() and team_id = get_my_team_id()) );
drop policy if exists leads_write on public.leads;
create policy leads_write on public.leads for all to authenticated
  using ( user_id = (select auth.uid()) )
  with check ( user_id = (select auth.uid()) );
drop policy if exists leads_manager_update on public.leads;
create policy leads_manager_update on public.leads for update to authenticated
  using ( is_manager_or_owner() and team_id = get_my_team_id() )
  with check ( is_manager_or_owner() and team_id = get_my_team_id() );

-- ─────────────────────────────────────────────────────────────────────────────
-- opportunities — the partnership deal (kind leaves room for future deal types)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.opportunities (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id) on delete cascade,
  team_id             uuid references public.teams(id) on delete cascade,
  account_id          uuid references public.accounts(id) on delete cascade,
  primary_contact_id  uuid references public.crm_contacts(id) on delete set null,
  name                text not null,
  kind                text not null default 'partnership',  -- partnership|direct (future)
  stage               text not null default 'new',
  amount              numeric,
  probability         integer,
  close_date          date,
  risk_flags          text[] not null default '{}',
  decision_makers     jsonb not null default '{}'::jsonb,
  deal_room           jsonb not null default '{}'::jsonb,
  ai_summary          text,
  ai_next_step        text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists opportunities_user_idx on public.opportunities (user_id);
create index if not exists opportunities_team_idx on public.opportunities (team_id, stage);
create index if not exists opportunities_account_idx on public.opportunities (account_id);

alter table public.opportunities enable row level security;
drop policy if exists opportunities_select on public.opportunities;
create policy opportunities_select on public.opportunities for select to authenticated
  using ( user_id = (select auth.uid()) or (is_manager_or_owner() and team_id = get_my_team_id()) );
drop policy if exists opportunities_write on public.opportunities;
create policy opportunities_write on public.opportunities for all to authenticated
  using ( user_id = (select auth.uid()) )
  with check ( user_id = (select auth.uid()) );
drop policy if exists opportunities_manager_update on public.opportunities;
create policy opportunities_manager_update on public.opportunities for update to authenticated
  using ( is_manager_or_owner() and team_id = get_my_team_id() )
  with check ( is_manager_or_owner() and team_id = get_my_team_id() );

-- ─────────────────────────────────────────────────────────────────────────────
-- activities — the unified stream (tasks/calls/emails/meetings/notes/agent actions).
-- A thin unifier: existing tasks/wins/notes/schedule_blocks stay as-is and emit
-- into this; agent-generated actions are captured here directly. actor_type marks
-- user vs agent so an AI-generated action is always attributable.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.activities (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.users(id) on delete cascade,  -- null when purely agent-authored
  team_id      uuid references public.teams(id) on delete cascade,
  actor_type   text not null default 'user',   -- user|agent
  actor_id     text,                            -- users.id or agents.id (text: agent ids are text)
  entity_type  text,                            -- lead|account|opportunity|partner|contact
  entity_id    uuid,
  kind         text not null,                   -- task|call|email|meeting|note|agent_action
  summary      text,
  payload      jsonb not null default '{}'::jsonb,
  occurred_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index if not exists activities_team_idx on public.activities (team_id, occurred_at desc);
create index if not exists activities_entity_idx on public.activities (entity_type, entity_id);
create index if not exists activities_user_idx on public.activities (user_id, occurred_at desc);

alter table public.activities enable row level security;
drop policy if exists activities_select on public.activities;
create policy activities_select on public.activities for select to authenticated
  using ( user_id = (select auth.uid()) or (team_id = get_my_team_id()) );
drop policy if exists activities_write on public.activities;
create policy activities_write on public.activities for all to authenticated
  using ( user_id = (select auth.uid()) )
  with check ( user_id = (select auth.uid()) );

-- ─────────────────────────────────────────────────────────────────────────────
-- Additive columns on existing tables (no rewrites; all nullable/defaulted)
-- ─────────────────────────────────────────────────────────────────────────────

-- crm_contacts: the account link + lifecycle/ownership/AI enhancements
alter table public.crm_contacts add column if not exists account_id     uuid references public.accounts(id) on delete set null;
alter table public.crm_contacts add column if not exists lifecycle_stage text not null default 'new';
alter table public.crm_contacts add column if not exists lead_source     text;
alter table public.crm_contacts add column if not exists last_touch_at   timestamptz;
alter table public.crm_contacts add column if not exists owner_id        uuid references public.users(id) on delete set null;
alter table public.crm_contacts add column if not exists comm_prefs      jsonb not null default '{}'::jsonb;
alter table public.crm_contacts add column if not exists tags            text[] not null default '{}';
alter table public.crm_contacts add column if not exists ai_summary      text;
alter table public.crm_contacts add column if not exists updated_at      timestamptz not null default now();

-- Multi-horizon coach goals. NOTE: the existing `goals` table is a per-user
-- SINGLETON (PK = user_id) that holds the primary monthly deal goal the
-- GoalCockpit reads — we leave it untouched. Richer annual/quarterly/monthly/
-- weekly/daily goals live in this new, id-keyed table so the coach can hold many
-- goals per user across horizons without disturbing the existing singleton.
create table if not exists public.goal_items (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  team_id        uuid references public.teams(id) on delete cascade,
  horizon        text not null default 'monthly',  -- annual|quarterly|monthly|weekly|daily
  parent_goal_id uuid references public.goal_items(id) on delete set null,
  category       text,                             -- revenue|content|outreach|partner|habit
  title          text not null,
  target         numeric,
  metric         text,
  progress       numeric not null default 0,
  status         text not null default 'active',   -- active|hit|missed|archived
  due_date       date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists goal_items_user_idx on public.goal_items (user_id, horizon);
alter table public.goal_items enable row level security;
drop policy if exists goal_items_select on public.goal_items;
create policy goal_items_select on public.goal_items for select to authenticated
  using ( user_id = (select auth.uid()) or (is_manager_or_owner() and team_id = get_my_team_id()) );
drop policy if exists goal_items_write on public.goal_items;
create policy goal_items_write on public.goal_items for all to authenticated
  using ( user_id = (select auth.uid()) )
  with check ( user_id = (select auth.uid()) );

-- partner_onboarding: link up to the account spine + extend past 'won' into activation
alter table public.partner_onboarding add column if not exists account_id       uuid references public.accounts(id) on delete set null;
alter table public.partner_onboarding add column if not exists activation_state text not null default 'onboarding';
  -- onboarding|activated|producing|at_risk|reengaging
