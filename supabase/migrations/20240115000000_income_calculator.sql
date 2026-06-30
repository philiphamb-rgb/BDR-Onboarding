-- Income / Commission Calculator module — native to BDR Hub.
-- Reflects the applied state: our (select auth.uid()) RLS convention, reusing the
-- existing manages_user() SECURITY DEFINER helper for manager read access.

create table if not exists public.income_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target numeric not null default 200000,
  base numeric not null default 80000,
  path text not null default 'b2c' check (path in ('b2c','b2b2c')),
  buffer text not null default 'safe' check (buffer in ('min','safe','stretch')),
  b2c_rate numeric default 14.39,
  b2c_churn numeric default 5,
  bw_warm_leads numeric default 5,
  bw_warm_rate numeric default 30,
  b2c_self_rate numeric default 10,
  bb_comm numeric default 750,
  bb_warm_leads numeric default 2,
  bb_warm_rate numeric default 25,
  bb_self_rate numeric default 15,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);
create index if not exists idx_income_plans_user on public.income_plans(user_id);

create or replace function public.income_set_updated_at()
returns trigger language plpgsql set search_path to 'public', 'pg_temp' as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_income_plans_updated on public.income_plans;
create trigger trg_income_plans_updated before update on public.income_plans
  for each row execute function public.income_set_updated_at();

create table if not exists public.income_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.income_plans(id) on delete cascade,
  week_number integer not null,
  contacts integer not null default 0,
  closes integer not null default 0,
  target_contacts integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, week_number)
);
create index if not exists idx_income_checkins_user on public.income_checkins(user_id, week_number);

create table if not exists public.income_playbook_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  check_date date not null default current_date,
  checks boolean[] not null default '{}',
  updated_at timestamptz not null default now(),
  unique (user_id, check_date)
);

alter table public.income_plans enable row level security;
alter table public.income_checkins enable row level security;
alter table public.income_playbook_checks enable row level security;

create policy "income_plans_own" on public.income_plans for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "income_checkins_own" on public.income_checkins for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "income_playbook_own" on public.income_playbook_checks for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Manager read-only into their team's plans/checkins, via the existing helper.
create policy "income_plans_mgr_read" on public.income_plans for select
  using (public.manages_user(user_id));
create policy "income_checkins_mgr_read" on public.income_checkins for select
  using (public.manages_user(user_id));
