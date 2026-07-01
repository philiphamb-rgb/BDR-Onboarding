# Growth OS — Pre-Build Audit

_Per master-prompt §0. Recorded before writing the agentic build._

## 1. Existing repo inventory

**Stack.** Next.js 14 App Router (route group `(app)`), Supabase (Postgres + RLS
+ Storage), Anthropic SDK for the coach. Tailwind design system in
`src/components/ui` with tokens Navy `#003087` / Teal `#00C2B2` / Gold `#F5A623`
/ `bdrbg`, Inter font, custom SVG icon set in `src/components/icons`, zero emoji.

**Design-system rules observed.** Custom SVG icons only; the shared `Card`,
`Button`, `Toggle`, `Badge`, `ProgressBar`, `Skeleton`, `Modal`, `Sheet`, toast.
Critical gotcha: an unlayered global `button,a,[role=button]{min-height:44px}`
overrides Tailwind height utilities — small controls pin height inline (the
shared `Toggle` already does).

**Existing modules.** Commission/Income Calculator (`/commissions`, native,
drives `goals.monthly_deal_goal`), AI Coach (`/api/coach` streaming + `CoachDock`
+ `askCoach` event bus), Sandler Training + Battle Cards (Learning Center,
`module_progress` KV pattern), Partners pipeline (`partner_onboarding`),
Analytics, Manager suite, Gamification (`user_progress`, `xp_ledger`, belts).

**Auth/roles.** `users.role` (`owner`→admin / manager / rep); permissions via
`role_permissions` + `lib/permissions.ts` (fail-open); RLS helpers
`get_my_team_id()`, `is_manager_or_owner()`, `manages_user()`.

**Nav.** Sidebar accordion (TOP_NAV + REP_SECTIONS Sell/Grow + Manager),
BottomNav, `AppHeader` with ⌘K global search + bell; `featureForHref` gating.

**Schema already live for Growth OS** (from the prior turn): `automations`
(team-scoped, RLS: team reads / managers manage), `automation_log` (append-only,
service-role writes), `ai_coach_messages`, and `goals` extended with
`leads_per_week_goal` + `close_rate_goal` (alongside existing
`monthly_deal_goal`, `monthly_income_goal`, PK `user_id`).

## 2. Integration seams (risk points)

- **Coach.** The reference ships a second "Sage" chat that calls Anthropic
  directly from the browser. Colliding with the existing context-aware
  `/api/coach` + `CoachDock` would violate the "don't duplicate" rule. → Reuse
  the one coach via `askCoach`.
- **Leads.** No dedicated leads table exists — `partner_onboarding` (stage,
  temperature) IS the pipeline. → Lead Gen reads it; no parallel table.
- **Goals.** `goals` is per-user and already drives the shared Goal Cockpit. →
  Growth goals write the same row; the Triage Strip and Content income rail read
  it.
- **Commission math.** Owned by the Income Calculator. → Never duplicated; the
  income forecast references the goal, and the KPI math calls the same row.
- **Gamification/streak.** Real system exists. → Not duplicated.
- **Agents vs automations.** The reference splits 18 agents (prompts) from 8
  automations (config). → Unified onto one roster; AI Team = prompt lens,
  Automations = operational lens, both over the same `automations` table.

## 3. Gaps flagged (and how handled)

| Gap | Resolution |
|---|---|
| Consumer motion in the reference copy | Re-themed to the internal Co-Brand PLUS+ **agency-partner** motion, matching the existing app. |
| HubSpot / Twilio / Airtable not connected | Interface + contract built; tool-connection status shown honestly; `TODO(integration)` logged. |
| Feedback-loop nightly synthesis | Capture + changelog surfaces shipped; synthesis pipeline stubbed + documented. |
| 3-tier brand-voice CMS | Guardrail/voice layer baked into every agent prompt (`COMPLIANCE_GUARDRAILS`/`HUMAN_VOICE`); full editable CMS deferred + logged. |
| Live analytics for Content EV/funnel | Seed/benchmark data, honestly badged "Demo data". |

## 4. Information architecture (decided before building)

Growth OS lives under the existing **Grow** nav section (`/grow`) as a six-view
workspace switcher mirroring LearnTabs/PlanTabs: **Overview · Content · Lead Gen
· Automations · AI Team · Build**. A shared `GrowthChrome` (health + KPI chips +
Triage Strip + Goals editor + Feedback) sits atop every view. Nothing bolted on;
every surface reuses the app's Card/Button/Toggle kit, tokens, and the one coach.
