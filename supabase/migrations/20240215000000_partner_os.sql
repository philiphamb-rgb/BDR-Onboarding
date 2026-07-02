-- Agentic CRM OS — Phase 4: Partner + SmartCredit OS tables.
-- qualification_scores (the 6-dimension SmartCredit fit model), partner
-- activation metrics, and partner enablement assets. Additive; RLS owner-write /
-- manager-read-team. The activation lifecycle itself rides on the
-- partner_onboarding.activation_state column added in Phase 1.1.

create table if not exists public.qualification_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete cascade,
  partner_id uuid references public.partner_onboarding(id) on delete cascade,
  audience_fit integer, trust_level integer, customer_volume integer,
  monetization_fit integer, regulatory_sensitivity integer, activation_potential integer,
  composite integer, rationale text, scored_by text,
  created_at timestamptz not null default now()
);
create index if not exists qual_scores_account_idx on public.qualification_scores (account_id);
create index if not exists qual_scores_user_idx on public.qualification_scores (user_id);
alter table public.qualification_scores enable row level security;
drop policy if exists qual_scores_select on public.qualification_scores;
create policy qual_scores_select on public.qualification_scores for select to authenticated
  using ( user_id = (select auth.uid()) or (is_manager_or_owner() and team_id = get_my_team_id()) );
drop policy if exists qual_scores_write on public.qualification_scores;
create policy qual_scores_write on public.qualification_scores for all to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );

create table if not exists public.partner_activation_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  partner_id uuid references public.partner_onboarding(id) on delete cascade,
  metric text, value numeric, period text,
  captured_at timestamptz not null default now()
);
create index if not exists activation_metrics_partner_idx on public.partner_activation_metrics (partner_id);
alter table public.partner_activation_metrics enable row level security;
drop policy if exists activation_metrics_select on public.partner_activation_metrics;
create policy activation_metrics_select on public.partner_activation_metrics for select to authenticated
  using ( user_id = (select auth.uid()) or (is_manager_or_owner() and team_id = get_my_team_id()) );
drop policy if exists activation_metrics_write on public.partner_activation_metrics;
create policy activation_metrics_write on public.partner_activation_metrics for all to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );

create table if not exists public.partner_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  partner_id uuid references public.partner_onboarding(id) on delete set null,
  title text, kind text, storage_path text, url text,
  distributed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists partner_assets_user_idx on public.partner_assets (user_id);
alter table public.partner_assets enable row level security;
drop policy if exists partner_assets_select on public.partner_assets;
create policy partner_assets_select on public.partner_assets for select to authenticated
  using ( user_id = (select auth.uid()) or (is_manager_or_owner() and team_id = get_my_team_id()) );
drop policy if exists partner_assets_write on public.partner_assets;
create policy partner_assets_write on public.partner_assets for all to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );
