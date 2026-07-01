-- Follow-up dates on partners — the #1 missing CRM primitive (HubSpot's "task on
-- a record"). Surfaced on the Partners board and fed into the priority engine so
-- a due follow-up becomes a next-best-action. Covered by the existing
-- partner_onboarding RLS (owner writes; managers read their team).
alter table public.partner_onboarding
  add column if not exists next_followup_date date;
