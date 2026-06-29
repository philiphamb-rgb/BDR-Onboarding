-- Partner onboarding pipeline: one row per partner a BDR is working, tracked
-- from "new lead" through "opportunity won & contract signed" with a per-partner
-- checklist (stored as jsonb [{key, done, note}]).
--
-- This mirrors the live schema (project bdr-os-v2) so the table is reproducible
-- from source. Idempotent so it is safe to re-run against an environment where
-- the table was created out-of-band.

create table if not exists public.partner_onboarding (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  team_id      uuid references public.teams(id) on delete set null,
  partner_name text not null,
  company      text,
  stage        text not null default 'new_lead',
  checklist    jsonb not null default '[]'::jsonb,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_partner_onboarding_user on public.partner_onboarding (user_id);
create index if not exists idx_partner_onboarding_team on public.partner_onboarding (team_id);

alter table public.partner_onboarding enable row level security;

-- Owner can read their own partners; managers/owners can read their team's.
drop policy if exists partners_select on public.partner_onboarding;
create policy partners_select on public.partner_onboarding
  for select using (
    user_id = (select auth.uid())
    or (is_manager_or_owner() and team_id = get_my_team_id())
  );

-- Writes are owner-only.
drop policy if exists partners_insert on public.partner_onboarding;
create policy partners_insert on public.partner_onboarding
  for insert with check (user_id = (select auth.uid()));

drop policy if exists partners_update on public.partner_onboarding;
create policy partners_update on public.partner_onboarding
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists partners_delete on public.partner_onboarding;
create policy partners_delete on public.partner_onboarding
  for delete using (user_id = (select auth.uid()));
