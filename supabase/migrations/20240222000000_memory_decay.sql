-- Nightly memory decay function. Unreinforced trusted learnings slowly lose
-- trust and age out; lifecycle_state is derived purely from trust (idempotent).
-- Cron-only (service role). (Applied to the live DB via MCP; recorded for repo.)
create or replace function public.recompute_memory_decay()
returns table(touched int, deprecated int)
language plpgsql
security definer
set search_path = public
as $$
declare v_touched int; v_deprecated int;
begin
  with upd as (
    update public.semantic_memories
       set trust_score = greatest(0, trust_score - 1)
     where lifecycle_state in ('active','aging','stale')
       and updated_at < (now() - interval '14 days')
    returning 1
  ) select count(*) into v_touched from upd;

  update public.semantic_memories
     set lifecycle_state = case
       when trust_score >= 60 then 'active'
       when trust_score >= 40 then 'aging'
       when trust_score >= 20 then 'stale'
       else 'deprecated' end
   where lifecycle_state in ('active','aging','stale','deprecated');

  select count(*) into v_deprecated from public.semantic_memories where lifecycle_state = 'deprecated';
  return query select v_touched, v_deprecated;
end;
$$;

-- Service-role/cron-only: no signed-in user should be able to trigger a global decay.
revoke execute on function public.recompute_memory_decay() from public, anon, authenticated;
