-- Commission / income goals: one active goal per rep. The rep enters their own
-- target income, what they typically earn per closed deal, their close rate, and
-- how many selling days they work in the period. From those inputs the app derives
-- the activity required to hit the number (deals needed, conversations needed, and
-- a per-day pace) and surfaces it across Home / Today / Grow / Daily Rhythm / Coach.
--
-- All figures are rep-supplied — the app never bakes in company commission rates or
-- payout tiers. This mirrors the live schema (project bdr-os-v2) and the RLS pattern
-- in 20240103000000_partner_onboarding.sql. Idempotent so it is safe to re-run.

create table if not exists public.goals (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id) on delete cascade,
  team_id             uuid references public.teams(id) on delete set null,
  period              text not null default 'monthly',  -- 'monthly' (pacing unit)
  target_income       numeric not null default 0,        -- commission target for the period ($)
  commission_per_deal numeric not null default 0,        -- avg commission the rep earns per closed deal ($)
  close_rate          numeric not null default 0,        -- % of conversations that become deals (0-100)
  working_days        numeric not null default 21,       -- selling days in the period
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_goals_user on public.goals (user_id);
create index if not exists idx_goals_team on public.goals (team_id);
-- At most one active goal per rep, so the app can upsert "the" goal cleanly.
create unique index if not exists idx_goals_one_active_per_user
  on public.goals (user_id) where is_active;

alter table public.goals enable row level security;

-- Owner can read their own goal; managers/owners can read their team's.
drop policy if exists goals_select on public.goals;
create policy goals_select on public.goals
  for select using (
    user_id = (select auth.uid())
    or (is_manager_or_owner() and team_id = get_my_team_id())
  );

-- Writes are owner-only.
drop policy if exists goals_insert on public.goals;
create policy goals_insert on public.goals
  for insert with check (user_id = (select auth.uid()));

drop policy if exists goals_update on public.goals;
create policy goals_update on public.goals
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists goals_delete on public.goals;
create policy goals_delete on public.goals
  for delete using (user_id = (select auth.uid()));
