# Apex — Build Log

_Decisions, assumptions, and defaults, per master-prompt §10. Newest first._

## Architecture decisions

- **One coach, not two.** Discarded the reference's browser→Anthropic "Sage"
  chat and `SageChat.tsx`. Every AI action across Apex calls the existing
  context-aware `/api/coach` via `askCoach()`. Rationale: the reference's own #1
  principle is "don't duplicate what exists," and the app already has a
  streaming, pipeline-aware coach. The coach's context builder was extended to
  read Apex state (goals + live roster).
- **Agency-partner motion, not consumer.** The reference copy targets consumers
  with poor credit; the master prompt says adapt mechanics to the internal
  Co-Brand PLUS+ motion selling to credit-repair **agencies**. All agent prompts,
  content, lead copy, and scoring were re-themed to the agency-partner audience,
  matching the existing app's `partner_onboarding` model.
- **One roster, two lenses.** The reference split 18 agents (prompts) from 8
  automations (config). Unified: the `automations` table holds one 18-agent
  roster; **AI Team** renders the prompt/build spec, **Automations** renders the
  operational config/ROI lens (`automationMeta.ts`). Avoids a parallel concept.
- **Leads = `partner_onboarding`.** Lead Gen derives a deterministic 0–100 score
  from real temperature + stage + recency (badged as derived). No leads table.
- **Goals unified.** Growth goals (income, leads/week, close rate) write the same
  per-user `goals` row the Commission Planner + Goal Cockpit use. The Goals editor
  writes only the columns it owns and never clobbers `monthly_deal_goal`.
- **Triage is deterministic.** `triage.ts` computes Right Now / Next / After That
  from real goals + pipeline + roster + build progress; the coach only runs when
  an item is tapped.

## Assumptions & defaults

- **Demo/benchmark data** (Content EV/queue/funnel/leaderboard/heatmap, income
  forecast, campaigns) is seed data drawn from published benchmark research and
  is **badged "Demo data"** in the UI. Real data (pipeline, goals, roster,
  feedback) is the spine. Assumption: these surfaces become live once analytics /
  campaign / commission sources connect.
- **Run-cost estimates** (`roster.costPerMo`, AI Team ~$/mo) are blended
  approximations for governance framing; see `docs/growth-os/cost-reference.md`.
- **Default roster status mix** (6 live / 12 setup) reflects what a team can run
  today (Claude-only agents) vs what needs an external tool connected first.

## TODO(integration) — built as contract, awaiting external access

- **HubSpot / Twilio / Airtable / Google Calendar / Slack.** Every agent's build
  steps + the Automations tool-connection status define the contract; connect the
  credential and the agent activates. No hardcoded copy bypasses the templating
  layer.
- **Feedback loop synthesis.** Capture (`growth_feedback` table + `FeedbackButton`
  + changelog) shipped. The nightly **Manager Digest → approve/reject → versioned
  instruction-update → rollback** pipeline is specified but not automated — it
  needs a scheduled backend job (Claude Managed Agent) with write access to agent
  instruction storage.
- **3-tier brand-voice template CMS.** The guardrail/voice layer
  (`COMPLIANCE_GUARDRAILS` / `HUMAN_VOICE` / `BRAND_KNOWLEDGE`) is baked into every
  agent prompt as the locked company tier. The editable team/individual tiers +
  signature editor + tone sliders are deferred to a settings surface.
- **CRM parity dashboards.** `partner_onboarding` is the CRM object today; the
  full Contacts/Companies/Deals mirror + traceable rollups map onto existing
  Partners + Manager Analytics and are noted for expansion.
- **Strategizer.** Served by the existing coach (research prompts via `askCoach`);
  a dedicated ChatGPT-connector research space is deferred.

## Schema changes (all live + committed as repo migrations)

- `20240116000000_growth_os.sql` — goals extension, `automations`,
  `automation_log`, `ai_coach_messages`, initial roster seed.
- `growth_os_reseed_roster` — reconciled to the final 18-agent roster.
- `growth_os_feedback` — the feedback capture table (RLS: own rows; managers read
  team).

Security advisors re-checked after each migration: zero new findings.
