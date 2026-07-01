-- Managers/owners can insert notifications for team members they manage, so the
-- Broadcast feature actually delivers. Previously only users_manage_own_notifications
-- (user_id = auth.uid()) existed, so a manager's broadcast insert was rejected by
-- RLS while the UI reported success. This policy is additive and scoped via the
-- existing vetted helpers; reps and cross-team access are unaffected.
create policy managers_broadcast_to_team on public.notifications
  for insert to authenticated
  with check ( is_manager_or_owner() and manages_user(user_id) );
