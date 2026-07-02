-- Full editable agent detail + calculated ROI + shared brand voice.
-- agent_roles gains job_description + comms_style (how they communicate across
-- departments); agents gain a per-agent brand_voice override and ROI inputs
-- (minutes/run x runs/month -> hours -> $ at the team hourly rate). A team-scoped
-- brand_settings row holds the shared brand voice + business context every agent
-- inherits. All additive; every field is surfaced and editable in the Agent
-- Office UI. ROI seeds reuse the researched automation figures where an agent
-- backs an automation, else sensible per-tier defaults.
alter table public.agent_roles add column if not exists job_description text;
alter table public.agent_roles add column if not exists comms_style text;
alter table public.agents add column if not exists brand_voice_override text;
alter table public.agents add column if not exists roi_min_per_run integer;
alter table public.agents add column if not exists roi_runs_per_mo integer;
alter table public.agents add column if not exists roi_note text;

update public.agent_roles set
  job_description = coalesce(job_description, mission || case when roi_logic is not null then '. ' || roi_logic || '.' else '.' end),
  comms_style = coalesce(comms_style, case tier
    when 1 then 'Sets direction for the department, synthesizes a clear view up to you, and escalates cross-team conflicts.'
    when 2 then 'Turns strategy into a daily plan, briefs the specialists below, and reports results up to the C-suite.'
    else 'Does the hands-on work, hands finished output to the next teammate in the chain, and flags anything unusual to its manager.'
  end);

update public.agents set
  roi_min_per_run = coalesce(roi_min_per_run, case model_tier when 'worker' then 15 when 'manager' then 30 else 45 end),
  roi_runs_per_mo = coalesce(roi_runs_per_mo, case model_tier when 'worker' then 30 when 'manager' then 16 else 8 end);

update public.agents set roi_min_per_run = 8,  roi_runs_per_mo = 60 where id = 'scoring';
update public.agents set roi_min_per_run = 5,  roi_runs_per_mo = 40 where id = 'alert';
update public.agents set roi_min_per_run = 25, roi_runs_per_mo = 12 where id = 'call-prep';
update public.agents set roi_min_per_run = 10, roi_runs_per_mo = 8  where id = 'noshow';
update public.agents set roi_min_per_run = 45, roi_runs_per_mo = 20 where id = 'nurture';
update public.agents set roi_min_per_run = 30, roi_runs_per_mo = 10 where id = 'cold-nurture';
update public.agents set roi_min_per_run = 5,  roi_runs_per_mo = 30 where id = 'affiliate';
update public.agents set roi_min_per_run = 20, roi_runs_per_mo = 15 where id = 'winback';
update public.agents set roi_min_per_run = 30, roi_runs_per_mo = 30 where id = 'content-idea';
update public.agents set roi_min_per_run = 60, roi_runs_per_mo = 4  where id = 'hook-research';
update public.agents set roi_min_per_run = 15, roi_runs_per_mo = 10 where id = 'referral';
update public.agents set roi_min_per_run = 20, roi_runs_per_mo = 8  where id = 'customer-retention';
update public.agents set roi_min_per_run = 30, roi_runs_per_mo = 5  where id = 'testimonial';
update public.agents set roi_min_per_run = 45, roi_runs_per_mo = 30 where id = 'qa';
update public.agents set roi_min_per_run = 90, roi_runs_per_mo = 4  where id = 'reconciliation';
update public.agents set roi_min_per_run = 10, roi_runs_per_mo = 30 where id = 'daily-briefing';

create table if not exists public.brand_settings (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade unique,
  voice text, audience text, promise text, dos text, donts text,
  hourly_rate numeric not null default 50,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.brand_settings enable row level security;
create policy brand_settings_read on public.brand_settings for select to authenticated
  using ( team_id = get_my_team_id() );
create policy brand_settings_write on public.brand_settings for all to authenticated
  using ( is_manager_or_owner() and team_id = get_my_team_id() )
  with check ( is_manager_or_owner() and team_id = get_my_team_id() );
