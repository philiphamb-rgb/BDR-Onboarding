# Apex — System Architecture

## In plain language (for a VP)

Think of Apex as a small team of tireless assistants, each with one job,
all managed from one screen inside the tool BDRs already use. When an agency
fills out a form, one assistant scores how good a fit they are, another texts the
BDR if they're hot, another starts a friendly email sequence if they're not
quite ready — and a compliance assistant checks every outgoing message first so
nothing risky ever goes out. A coach sits on top of all of it and can write or
explain anything. The BDR just sees "here's the most important thing to do
right now, and why."

## The pieces

**One reasoning layer.** Claude is the brain of every agent and the coach.
External tools (HubSpot, Twilio, Airtable, Google Calendar, Slack) are used only
for the specific actions Claude can't do itself — send a text, write a CRM field,
hold a calendar slot. Claude is always first choice.

**The shared record (LEO).** Every agent reads and writes one Lead Event Object
per prospect (see `lib/modules/growth-os/roster.ts` → `LEAD_EVENT_SCHEMA`),
stored as CRM contact properties + an activity timeline. This is what makes
"agents talking to each other" a literal mechanism, not a metaphor: the Scoring
agent writes a score and stage, which triggers the Alert or Nurture agent, which
appends to the same `automation_log`.

**The 18-agent roster** (`roster.ts`), grouped:
- *Funnel* — Lead Scoring, Speed-to-Lead Alert, Call Prep, No-Show Rescue,
  Nurture Drip, Cold Nurture, Affiliate Attribution, Win-Back.
- *Content* — Content Idea, Hook Research.
- *Retention* — Referral Ask, Partner Retention & Activation, Testimonial/UGC.
- *Ops* — Compliance Guardian (a synchronous gate, not a schedule), Pipeline QA,
  Income Reconciliation, Daily Briefing, Teaching (in-app, already live).

**Compliance as a gate.** The Compliance Guardian is called synchronously by
every partner-facing agent before anything sends, checking CROA / TCPA / CAN-SPAM
and Co-Brand PLUS+ term accuracy. Run in shadow mode a week before it becomes a
hard gate.

**The feedback loop.** Capture (`growth_feedback`) → daily manager digest →
approve/reject → versioned agent-instruction update → rollback. Capture +
changelog ship now; the nightly synthesis is a scheduled job (see open-items).

## How it lives inside BDR Hub (native, not bolted-on)

- **Data.** Reuses `partner_onboarding` (leads/CRM), `goals` (income/leads/close,
  same row as the Commission Planner), `automations` (team-scoped roster, RLS:
  team reads / managers manage), `module_progress` (build + content KV),
  `growth_feedback`.
- **AI.** Reuses `/api/coach` + `askCoach` + `CoachDock`. The coach's context
  builder reads live Apex state.
- **UI.** Reuses the Card/Button/Toggle/Badge kit, Navy/Teal/Gold tokens, custom
  SVG icons, and the workspace-switcher pattern (GrowthTabs mirrors
  LearnTabs/PlanTabs). Shared `GrowthChrome` = health + KPIs + Triage + goals +
  feedback on every view.
- **Access.** New `growth` permission feature; manager-only status toggles
  enforced by RLS server-side and the UI client-side.

## Technical appendix

```
Form submit ─► Lead Scoring (webhook) ─┬─ hot  ─► Speed-to-Lead Alert (SMS+Slack, 5-min escalation)
                                       ├─ warm ─► Nurture Drip (5 emails, stop-on-reply)
                                       └─ cold ─► Cold Nurture (14-day education, auto-promote)
Booked call ─► Call Prep (brief 30m prior)      Missed call ─► No-Show Rescue (reschedule SMS)
Signed      ─► Referral Ask ─► [Compliance Guardian gate] ─► send
Nightly     ─► Pipeline QA (audit automation_log)   Weekly ─► Income Reconciliation ─► Daily Briefing
```
Orchestration: Claude Managed Agents (webhook + cron). Secrets vault-stored, never
hardcoded. Every agent verifies live Managed-Agents syntax against current docs at
build time (noted in each agent's build steps).
