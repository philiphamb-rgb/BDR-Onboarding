-- Fix: windowed leaderboard scoring double-counted lifetime pipeline.
--
-- team_leaderboard's pipeline_weighted summed EVERY open deal regardless of
-- p_since, while calls/demos/deals/leads/xp were all windowed. Because the
-- client score() adds a pipeline term for every range (incl. Today/Week), a rep
-- with a big standing pipeline but zero activity today outranked an active rep
-- on the Today board. Window pipeline_weighted by created_at >= p_since, exactly
-- like the self-generated `leads` metric, so every scored component shares the
-- same time window. All-time (p_since NULL) is unchanged.
create or replace function public.team_leaderboard(p_since timestamptz default null)
returns table (
  user_id uuid, name text, avatar_url text, belt_day int,
  current_streak int, longest_streak int,
  xp bigint, xp_prev bigint, calls bigint, demos bigint, deals bigint, leads bigint,
  pipeline_weighted numeric, won_count bigint, leads_total bigint
)
language sql
security definer
set search_path = public
as $$
  with team as (select get_my_team_id() as tid)
  select
    u.id, u.name, u.avatar_url, coalesce(up.belt_day,0),
    coalesce(up.current_streak,0), coalesce(up.longest_streak,0),
    case when p_since is null then coalesce(up.total_xp,0)::bigint
         else coalesce((select sum(x.xp_amount) from xp_ledger x where x.user_id=u.id and x.created_at >= p_since),0) end,
    coalesce((select sum(x.xp_amount) from xp_ledger x where x.user_id=u.id
        and x.created_at >= coalesce(p_since, now()) - (now() - coalesce(p_since, now()))
        and x.created_at <  coalesce(p_since, now())),0),
    case when p_since is null then coalesce(up.total_calls,0)::bigint
         else (select count(*) from wins w where w.user_id=u.id and w.type='call' and w.logged_at >= p_since) end,
    case when p_since is null then coalesce(up.total_demos,0)::bigint
         else (select count(*) from wins w where w.user_id=u.id and w.type='demo' and w.logged_at >= p_since) end,
    case when p_since is null then coalesce(up.total_deals,0)::bigint
         else (select count(*) from wins w where w.user_id=u.id and w.type='deal' and w.logged_at >= p_since) end,
    case when p_since is null then (select count(*) from partner_onboarding p where p.user_id=u.id)
         else (select count(*) from partner_onboarding p where p.user_id=u.id and p.created_at >= p_since) end,
    -- Windowed pipeline: open deals created within the window (all-time when NULL).
    coalesce((select sum(coalesce(p.deal_amount,0) * coalesce(p.deal_probability,0) / 100.0)
              from partner_onboarding p
              where p.user_id=u.id and coalesce(p.stage,'') <> 'opportunity_won'
                and (p_since is null or p.created_at >= p_since)),0),
    (select count(*) from partner_onboarding p where p.user_id=u.id and p.stage='opportunity_won'),
    (select count(*) from partner_onboarding p where p.user_id=u.id)
  from users u
  join team t on u.team_id = t.tid
  left join user_progress up on up.user_id = u.id
  where t.tid is not null;
$$;
grant execute on function public.team_leaderboard(timestamptz) to authenticated;
