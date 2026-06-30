-- Performance + security hardening (from Supabase advisors).
--   * Add covering indexes for foreign keys (perf).
--   * Wrap auth.uid() in a scalar subquery inside RLS policies so it is
--     evaluated once per statement instead of once per row. This is a query-plan
--     optimization only — auth.uid() is stable within a statement, so access
--     behavior is identical.
--   * Drop the broad public SELECT policy on the avatars bucket. avatars is a
--     PUBLIC bucket (objects are served via the public URL endpoint, which
--     bypasses RLS), so that policy is unnecessary for display and only allowed
--     clients to LIST every file. Owner-scoped insert/update/delete remain.

-- ── FK covering indexes ─────────────────────────────────────────────────────
create index if not exists idx_goals_team_id on public.goals(team_id);
create index if not exists idx_module_certifications_user_id on public.module_certifications(user_id);
create index if not exists idx_tasks_parent_id on public.tasks(parent_id);

-- ── RLS init-plan: auth.uid() -> (select auth.uid()) ────────────────────────
alter policy "managers_read_team_audit" on public.audit_logs
  using (manages_user(user_id) or (user_id = (select auth.uid())));

alter policy "users_manage_own_habit_logs" on public.habit_logs
  using (user_id = (select auth.uid()));

alter policy "users_manage_own_habits" on public.habits
  using (user_id = (select auth.uid()));

alter policy "module_certifications_own" on public.module_certifications
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

alter policy "module_progress_own" on public.module_progress
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

alter policy "users_manage_own_notifications" on public.notifications
  using (user_id = (select auth.uid()));

alter policy "users_manage_own_subscriptions" on public.push_subscriptions
  using (user_id = (select auth.uid()));

alter policy "users_insert_own_attempts" on public.quiz_attempts
  with check (user_id = (select auth.uid()));

alter policy "users_read_own_attempts" on public.quiz_attempts
  using (user_id = (select auth.uid()));

alter policy "managers_can_update_own_team" on public.teams
  using ((manager_id = (select auth.uid())) or (get_my_role() = 'owner'::text));

alter policy "owners_can_create_teams" on public.teams
  with check ((select auth.uid()) is not null);

alter policy "teams_members_can_read" on public.teams
  using ((id = get_my_team_id()) or (exists (
    select 1 from team_members tm
    where ((tm.team_id = teams.id) and (tm.user_id = (select auth.uid()))))));

alter policy "users_insert_own_progress" on public.user_progress
  with check (user_id = (select auth.uid()));

alter policy "users_read_own_progress" on public.user_progress
  using (user_id = (select auth.uid()));

alter policy "users_update_own_progress" on public.user_progress
  using (user_id = (select auth.uid()));

alter policy "users_insert_own" on public.users
  with check (id = (select auth.uid()));

alter policy "users_read_own" on public.users
  using (id = (select auth.uid()));

alter policy "users_update_own" on public.users
  using (id = (select auth.uid()))
  with check ((id = (select auth.uid())) and (role = (
    select users_1.role from users users_1 where (users_1.id = (select auth.uid())))));

alter policy "users_manage_own_wins" on public.wins
  using (user_id = (select auth.uid()));

alter policy "users_read_own_xp" on public.xp_ledger
  using (user_id = (select auth.uid()));

-- ── Storage: drop broad public listing on avatars ──────────────────────────
drop policy if exists "avatars public read" on storage.objects;
