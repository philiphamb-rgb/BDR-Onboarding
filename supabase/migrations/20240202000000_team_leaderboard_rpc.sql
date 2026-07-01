-- Team leaderboard aggregate powering the gamified Leaderboard. SECURITY DEFINER
-- + scoped to the caller's own team via get_my_team_id(), so reps get real
-- teammate metrics (calls, self-generated leads, pipeline value) WITHOUT
-- exposing raw partner rows through RLS. Returns only per-user aggregates.
create or replace function public.team_leaderboard()
returns table (
  user_id uuid, name text, avatar_url text,
  total_xp int, xp_week bigint, current_streak int, longest_streak int, belt_day int,
  total_calls int, calls_week int, total_demos int, demos_week int, total_deals int, deals_month int,
  leads_total bigint, leads_week bigint, pipeline_open bigint, pipeline_weighted numeric, won_count bigint
)
language sql
security definer
set search_path = public
as $$
  with team as (select get_my_team_id() as tid)
  select
    u.id, u.name, u.avatar_url,
    coalesce(up.total_xp, 0),
    coalesce((select sum(x.xp_amount) from xp_ledger x where x.user_id = u.id and x.created_at >= now() - interval '7 days'), 0),
    coalesce(up.current_streak, 0), coalesce(up.longest_streak, 0), coalesce(up.belt_day, 0),
    coalesce(up.total_calls, 0), coalesce(up.calls_this_week, 0),
    coalesce(up.total_demos, 0), coalesce(up.demos_this_week, 0),
    coalesce(up.total_deals, 0), coalesce(up.deals_this_month, 0),
    (select count(*) from partner_onboarding p where p.user_id = u.id),
    (select count(*) from partner_onboarding p where p.user_id = u.id and p.created_at >= now() - interval '7 days'),
    (select count(*) from partner_onboarding p where p.user_id = u.id and coalesce(p.stage,'') <> 'opportunity_won'),
    coalesce((select sum(coalesce(p.deal_amount,0) * coalesce(p.deal_probability,0) / 100.0) from partner_onboarding p where p.user_id = u.id and coalesce(p.stage,'') <> 'opportunity_won'), 0),
    (select count(*) from partner_onboarding p where p.user_id = u.id and p.stage = 'opportunity_won')
  from users u
  join team t on u.team_id = t.tid
  left join user_progress up on up.user_id = u.id
  where t.tid is not null;
$$;

grant execute on function public.team_leaderboard() to authenticated;
