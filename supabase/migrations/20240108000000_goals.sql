-- Per-rep goals so the AI Coach, auto-Wins, and Analytics can frame progress
-- against real targets (not just raw activity). One row per user.
create table if not exists public.goals (
  user_id             uuid primary key references public.users(id) on delete cascade,
  team_id             uuid references public.teams(id) on delete set null,
  monthly_deal_goal   int,
  monthly_income_goal numeric,
  updated_at          timestamptz not null default now()
);

alter table public.goals enable row level security;

drop policy if exists goals_select on public.goals;
create policy goals_select on public.goals
  for select using (
    user_id = (select auth.uid())
    or (is_manager_or_owner() and team_id = get_my_team_id())
  );

drop policy if exists goals_upsert on public.goals;
create policy goals_upsert on public.goals
  for insert with check (user_id = (select auth.uid()));

drop policy if exists goals_update on public.goals;
create policy goals_update on public.goals
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
