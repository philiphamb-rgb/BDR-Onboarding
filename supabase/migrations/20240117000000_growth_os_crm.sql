-- ════════════════════════════════════════════════════════════════════════════
-- Growth OS — feedback loop, reference notes / activity timeline, and the CRM
-- parity layer. Mirrors what is live on the project (applied via MCP as the
-- growth_os_reseed_roster / growth_os_feedback / growth_os_notes /
-- growth_os_crm_parity migrations); committed here so repo and database stay in
-- sync. Idempotent throughout.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Feedback loop (capture end) ─────────────────────────────────────────────
create table if not exists public.growth_feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  team_id    uuid references public.teams(id) on delete set null,
  surface    text not null,
  sentiment  text not null,
  detail     text,
  created_at timestamptz not null default now()
);
alter table public.growth_feedback enable row level security;
drop policy if exists growth_feedback_own on public.growth_feedback;
create policy growth_feedback_own on public.growth_feedback
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists growth_feedback_team_read on public.growth_feedback;
create policy growth_feedback_team_read on public.growth_feedback
  for select using (is_manager_or_owner() and team_id = get_my_team_id());
create index if not exists growth_feedback_user_idx on public.growth_feedback (user_id, created_at desc);
create index if not exists growth_feedback_team_idx on public.growth_feedback (team_id, created_at desc);

-- ── Reference notes / typed activity timeline ───────────────────────────────
create table if not exists public.growth_notes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  team_id      uuid references public.teams(id) on delete set null,
  entity_type  text not null,
  entity_id    text not null,
  body         text not null,
  ai_suggested boolean not null default false,
  kind         text not null default 'note',   -- note | call | email | meeting | task
  created_at   timestamptz not null default now()
);
alter table public.growth_notes add column if not exists kind text not null default 'note';
alter table public.growth_notes enable row level security;
drop policy if exists growth_notes_own on public.growth_notes;
create policy growth_notes_own on public.growth_notes
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists growth_notes_team_read on public.growth_notes;
create policy growth_notes_team_read on public.growth_notes
  for select using (is_manager_or_owner() and team_id = get_my_team_id());
create index if not exists growth_notes_entity_idx on public.growth_notes (user_id, entity_type, entity_id, created_at desc);

-- ── CRM parity: deal properties on the existing Company/Deal record ──────────
alter table public.partner_onboarding add column if not exists deal_amount numeric;
alter table public.partner_onboarding add column if not exists expected_close_date date;
alter table public.partner_onboarding add column if not exists deal_probability integer;

-- ── CRM parity: Contacts (people) associated to a partner/company ────────────
create table if not exists public.crm_contacts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  team_id     uuid references public.teams(id) on delete set null,
  partner_id  uuid not null references public.partner_onboarding(id) on delete cascade,
  name        text not null,
  title       text,
  email       text,
  phone       text,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table public.crm_contacts enable row level security;
drop policy if exists crm_contacts_select on public.crm_contacts;
create policy crm_contacts_select on public.crm_contacts
  for select using (user_id = (select auth.uid()) or (is_manager_or_owner() and team_id = get_my_team_id()));
drop policy if exists crm_contacts_write on public.crm_contacts;
create policy crm_contacts_write on public.crm_contacts
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create index if not exists crm_contacts_partner_idx on public.crm_contacts (partner_id, created_at);
