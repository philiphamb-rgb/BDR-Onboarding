# Agent Registry & Org Chart

> The living company (`05`, `06`). Defines the full org, the per-agent data model,
> and — critically — how today's **18-agent `roster.ts`** maps into it so we extend
> rather than replace. Role counts: 8 exec + 11 manager + 15 worker = **34 named
> agents** + the human operator, with headroom to 40 as departments deepen.

---

## 1. Per-agent data model (18 fields, from `05`)

Every agent (stored in `agents` + `agent_roles`, see `01`) carries:

| Field | Meaning |
|---|---|
| name (first + last) | Human identity — makes the team feel real |
| title | Formal role |
| department | Marketing / Funnel / Partner / Ops / Compliance / Memory / Exec |
| mission | One sentence: why this agent exists |
| job description | What it does day to day |
| goals | What success looks like |
| KPI | The measured number |
| ROI logic | How its value is computed (time saved / revenue influenced) |
| inputs | What it reads (CRM state, memory, other agents' outputs) |
| outputs | What it produces (and where it lands) |
| tools | Which tools/integrations it uses |
| meetings involved in | Which meeting templates it joins |
| upstream dependencies | Who feeds it |
| downstream dependencies | Who it hands to |
| escalation paths | Who it escalates to and when |
| permissions | What it may read/write, HITL tier |
| memory scope | Which memory clusters it may read/write |
| editable prompt / behavior | User-tunable system prompt + settings |

Runtime adds: `status` (live/setup/paused), `run_count`, `last_run_at`,
`quality_score`, `error_rate`, `avatar`, `personality`, `morning_greeting`.

**HITL tier** per agent (governance, `12`): `human-in-the-loop` (must approve),
`human-on-the-loop` (can override after), `autonomous`. Anything touching
SmartCredit claims, compliance, qualification logic, or canonical playbooks is
forced to `human-in-the-loop`.

---

## 2. The org chart

```
                          ┌─────────────────┐
                          │  OPERATOR (You)  │   Tier 0 — human
                          └────────┬─────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │        EXECUTIVE (Tier 1)      │
                    │  CEO/Chief Vision · Chief of   │
                    │  Staff · CRO · CMO · COO ·     │
                    │  Chief Compliance · Chief      │
                    │  Counsel · RevOps Lead         │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │        MANAGERS (Tier 2)       │
                    │  by department (11 leads)      │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │        WORKERS (Tier 3)        │
                    │  individual contributors (15)  │
                    └───────────────────────────────┘
```

Two relationship types (already modeled today in `orgChart.ts`):
- **Reporting** (`reports_to`/`direct_reports`) — the tree, drawn as connector lines.
- **Handoff** (`handoff_to`) — lateral work passing, drawn as "→ passes to" edges.
Plus a third the memory layer adds: **review** (`reviewed_by`) — who QA/compliance-checks
this agent's output.

---

## 3. Executive layer (Tier 1 — 8 agents)

| Agent | Department | Mission | KPI | HITL |
|---|---|---|---|---|
| **CEO / Chief Vision** | Exec | Set weekly priorities, synthesize cross-dept status, escalate blockers | Weekly plan adherence | on-the-loop |
| **Chief of Staff** | Exec | Chair boardrooms, run the morning brief, keep the operator focused | Daily brief open rate | on-the-loop |
| **CRO (Chief Revenue)** | Funnel/Partner | Own the number: pipeline, deals, partner revenue | Revenue vs goal | on-the-loop |
| **CMO (Chief Growth)** | Marketing | Own content strategy, brand voice, channel mix | Reach → lead conversion | on-the-loop |
| **COO (Chief Operations)** | Ops | System health, pipeline integrity, catch silent failures | Error rate, SLA | on-the-loop |
| **Chief Compliance** | Compliance | Gate every partner-facing message for risk | Blocks / escapes | **in-the-loop** |
| **Chief Counsel / Legal** | Compliance | Legal/TCPA/CAN-SPAM/SmartCredit-claim review | Legal-flag accuracy | **in-the-loop** |
| **RevOps Lead** | Ops | Reconcile forecast vs actual, keep CRM data clean | Forecast accuracy | in-the-loop |

---

## 4. Manager layer (Tier 2 — 11 agents)

| Agent | Department | Reports to | Owns |
|---|---|---|---|
| **Marketing Lead** | Marketing | CMO | Daily content brief + channel plan |
| **Social Research Lead** | Marketing | CMO | Trend/hook research, competitor scans |
| **Content Studio Lead** | Marketing | CMO | The content queue — ideas → scripts → posts |
| **Podcast Repurposing Lead** | Marketing | CMO | Long-form → many short assets |
| **BDR Captain** | Funnel | CRO | Outreach cadence + setter/closer assists |
| **Partner Ops Lead** | Partner | CRO | Partner prospecting → qualification |
| **Partner Success Lead** | Partner | CRO | Onboarding → activation → retention |
| **Funnel Architect** | Funnel | CRO | Lead routes, nurture paths, conversion logic |
| **QA Lead** | Ops | COO | Audits every agent's output for silent failures |
| **Memory Steward** | Memory | COO | Curates memory candidates, runs promotion queue |
| **Governance Lead** | Compliance | Chief Compliance | Enforces HITL rules, manages review throughput |

---

## 5. Worker layer (Tier 3 — 15 agents)

| Agent | Dept | Reports to | Output |
|---|---|---|---|
| **Content Ideator** | Marketing | Content Studio Lead | Ranked daily idea queue |
| **Hook Writer** | Marketing | Content Studio Lead | Opening lines that hold attention |
| **Script Writer** | Marketing | Content Studio Lead | Full post/reel scripts |
| **Carousel Builder** | Marketing | Content Studio Lead | Carousel slide copy |
| **Short-Form Editor Planner** | Marketing | Podcast Repurposing Lead | Clip cut-lists + captions |
| **Faceless Content Producer** | Marketing | Content Studio Lead | No-camera format packages |
| **Social Proof Collector** | Marketing | Partner Success Lead | Wins/testimonials → content |
| **Lead Researcher** | Funnel | BDR Captain | Enriched lead dossiers |
| **ICP Mapper** | Funnel | Funnel Architect | Ideal-customer-profile maps |
| **Outreach Drafter** | Funnel | BDR Captain | Ready-to-send outreach |
| **DM Qualifier** | Funnel | Funnel Architect | Qualification from DM threads |
| **Setter Assist** | Funnel | BDR Captain | Booked-call prep + reminders |
| **Closer Assist** | Funnel | BDR Captain | Deal-advance next steps |
| **Insight Consolidator** | Memory | Memory Steward | Distills events → memory candidates |
| **Compliance Reviewer** | Compliance | Governance Lead | First-pass risk review before Chief Compliance |

---

## 6. Migration: today's 18 agents → the new org

The existing `roster.ts` agents are **not discarded** — each maps to a role in the
new org (mostly Tier 3, with the exec/manager tiers being net-new supervisory agents):

| Existing agent (`roster.ts`) | New role | Tier |
|---|---|---|
| `scoring` (Lead Scoring) | Lead Scorer (under Funnel Architect) | 3 |
| `alert` (Speed-to-Lead) | Setter Assist | 3 |
| `call-prep` | Setter Assist (brief mode) | 3 |
| `noshow` (Reschedule) | Setter Assist (recovery mode) | 3 |
| `nurture` (5-touch) | Outreach Drafter (nurture) | 3 |
| `cold-nurture` (14-day) | Outreach Drafter (education) | 3 |
| `affiliate` (Attribution) | Partner Ops (attribution) | 2/3 |
| `winback` | Outreach Drafter (win-back) | 3 |
| `content-idea` | Content Ideator | 3 |
| `hook-research` | Hook Writer / Social Research Lead | 2/3 |
| `referral` | Social Proof Collector | 3 |
| `customer-retention` | Partner Success Lead | 2 |
| `testimonial` | Social Proof Collector | 3 |
| `compliance-guardian` | Chief Compliance | 1 |
| `qa` | QA Lead | 2 |
| `reconciliation` | RevOps Lead | 1 |
| `daily-briefing` | Chief of Staff | 1 |
| `teaching` | (stays as onboarding guide, Ops) | 3 |

New agents to author (not in today's roster): CEO, CRO, CMO, COO, Chief Counsel,
RevOps split, Marketing/Social/Content/Podcast/BDR/Partner-Ops/Funnel/Memory/
Governance leads, and the worker-tier writers/researchers/qualifiers/consolidators.

`AUTOMATION_META` + `orgChart.ts` already carry ROI/handoff/reporting data for the
18 — that content is preserved and extended into the 18-field model, not rewritten.

---

## 7. Agent Office UX (from `05`, `15`)

- **Org chart view**: reporting tree + handoff edges (evolve today's `/grow/team`).
- **Office map view** (NEW): the "living company" — desks by department, avatars,
  live status dots, current task, queue count. Sims-like aliveness, Linear-clarity.
- **Agent profile drawer**: the 18 fields, editable prompt, quality score, last run,
  run count, improvement log — the current expandable card, deepened.
- **Live signals**: status (live/setup/paused), current task, queue depth, quality
  trend — driven by Supabase Realtime off `agent_runs`/`agent_state`.

See `03-ux-screen-map.md` for the full screen spec and `05-workflow-orchestration.md`
for how agents actually run and hand off.
