# BDR Hub → Agentic CRM OS — Unified Architecture

> Architecture package produced from the 18-file brief (`00masterorchestrator` +
> `01`–`17`). This is a **planning deliverable**: no app behavior or database
> schema changes here. Build begins only after this package is approved.
>
> **Decisions this package assumes** (flagged for override in `07-open-questions.md`):
> 1. **Plan first**, then build phase-by-phase.
> 2. **Evolve** the existing BDR Hub codebase rather than greenfield rebuild.
> 3. **Additive & reversible** schema migrations only against the live database.

---

## 1. What we're building

One product that unifies six layers into a single coherent operating system:

| Layer | One-line purpose | Source files |
|---|---|---|
| **CRM Core** | Leads, contacts, accounts, opportunities, activities, forecasting | `03`, `14` |
| **Agentic Team** | A living ~40-agent org with live status, chat, and meetings | `05`, `06`, `14` |
| **AI Coach** | A strategic, motivating mentor tied to real goals + pipeline | `04`, `15` |
| **Marketing / Content OS** | Idea → script → post → repurpose → proof, 7×2/week | `07`, `15` |
| **Partner / SmartCredit Funnel** | Educate → qualify → present → onboard → activate partners | `02`, `08` |
| **Memory + Governance** | Layered memory, RAG, trust/decay, HITL review, observability | `10`–`13` |

The through-line (`00`, `01`, `09`): **so simple a 7th grader can run it, so deep an
operator can run a company with it** — complexity under the hood, one clear next
action on the surface.

---

## 2. Guiding principles (non-negotiable, applied everywhere)

Drawn from `00`, `01`, `09`, `17`:

1. **One job per screen.** Each screen answers one question and offers one primary action.
2. **One recommended next action, always.** Every surface resolves to a single "do this now."
3. **Plain words on first contact.** Idea / Script / Post / Reply / Meeting / Goal / Plan / Fix / Improve. Jargon only when explained.
4. **Progressive disclosure.** Beginner OS on top; power tools revealed as the user grows.
5. **Everything is alive but trustworthy.** Live agent status + delight, but every AI action is inspectable, attributable, and governable.
6. **Human-in-the-loop on anything risky.** SmartCredit claims, compliance, qualification logic, and canonical playbooks never auto-promote.
7. **Systems over features.** Prefer one coherent mechanism reused everywhere (one Priority Action, one memory model, one agent registry) over parallel one-offs.
8. **Reuse before rebuild.** The existing app already ships working CRM/coach/content/partner code — evolve it; build genuinely new layers (memory, meetings, 40-agent org) fresh.

---

## 3. How the six layers map onto today's codebase

The existing app is **not** a blank slate. This is the honest inventory of what
exists, what gets extended, and what is net-new — so we never rebuild working code.

### 3.1 What already exists and stays (evolve, don't replace)

| Existing asset | Today | Becomes |
|---|---|---|
| `partner_onboarding` table + `/partners` | Partner pipeline (5 stages, checklist, temperature, deal fields) | **Partner OS** pipeline — extended with fit-scoring + activation, not replaced |
| `crm_contacts` table | Per-partner contacts (name/title/email/phone/is_primary) | **CRM Contacts** — the buying-committee spine already exists |
| `automations` table + `/grow/automations` | Team-scoped agent on/off status + config | **Agent state** — the status/config half of the agent registry |
| `src/lib/modules/growth-os/roster.ts` (18 agents) | Static agent catalog + prompts + org chart | **Agent registry seed** — grows to ~40 with the richer data model |
| `src/lib/modules/growth-os/orgChart.ts` | Reporting tiers + handoffs | **Org chart** — extended with departments + full relationship graph |
| `ai_coach_messages` + `CoachDock` + `/coach` | Context-aware coach with tool-use | **AI Coach** — extended with goal design + daily/weekly reviews |
| `goals` + `income_plans` + `priorityEngine.ts` + `triage.ts` | Goal math + ranked "do this now" | **Coach goal system** — extended to 5 horizons (annual→daily) |
| `/grow/content` + `content.ts` | Next-move EV, ranked queue, repurpose (demo data) | **Content OS** — wired to real `content_*` tables |
| `/grow/leadgen` + `leadgen.ts` | Lead scoring + routing over partner data | **Funnel Lab** — extended with SmartCredit fit scoring |
| `growth_feedback` + `growth_instruction_proposals` | Feedback loop + agent prompt proposals (HITL) | **Self-improvement loop** seed + memory-candidate precedent |
| `tasks`, `activities` (via `wins`), `notes`, `schedule_blocks`, `goals` | Task/activity/note/time-block/goal primitives | **CRM Activities + Coach** primitives — reused directly |
| `role_permissions` + `permissions.ts` | RBAC (rep/manager/admin) | **Governance RBAC** — extended with agent + memory scopes |
| `audit_logs` | Durable audit trail | **Governance audit** — reused, extended to memory/agent events |

### 3.2 What is genuinely new (build fresh, additive)

| New capability | New tables (see `01`) | Phase |
|---|---|---|
| Accounts / businesses (vs individual partners) | `accounts` | 1 |
| First-class leads (pre-partner) | `leads` | 1 |
| Opportunities / deals (vs onboarding stages) | `opportunities` | 1 |
| Multi-mode agent chat + meetings + boardroom | `meeting_rooms`, `meeting_participants`, `agent_messages`, `meeting_outputs` | 2 |
| Rich agent registry (40 agents, 18 fields) | `agent_roles` + extended `agents` | 1–2 |
| Content pipeline (real, not demo) | `content_ideas`, `scripts`, `posts`, `post_metrics`, `podcast_assets`, `repurposed_assets`, `social_proof_items`, `content_experiments` | 3 |
| Partner fit + activation | `partner_activation_metrics`, `qualification_scores`, `partner_assets` | 4 |
| Layered memory + RAG | `memory_events`, `memory_candidates`, `semantic_memories`, `memory_embeddings`, `memory_feedback`, `memory_reviews`, `memory_links`, `memory_audit_log` | 5 |
| Observability | `traces`, `spans`, `retrieval_events`, `prompt_versions`, `workflow_versions`, `trust_score_history` | 5–6 |

### 3.3 Naming reconciliation (spec vs reality)

The spec's illustrative tables sometimes duplicate things that already exist under
different names. We keep the **existing** name and treat the spec name as an alias,
to avoid a destructive rename against live data:

| Spec name | Existing reality | Decision |
|---|---|---|
| `contacts` | `crm_contacts` | Keep `crm_contacts`; add columns |
| `partner_accounts` | `partner_onboarding` | Keep `partner_onboarding`; add `account_id` FK to new `accounts` |
| `agents` / `agent_state` | `automations` (state) + `roster.ts` (catalog) | New `agents`/`agent_roles` tables; migrate `automations` rows into `agent_state` view or keep `automations` as the state table |
| `meetings` | none (only `schedule_blocks` time-blocks) | New — `schedule_blocks` is unrelated (personal calendar) |
| `goals` | `goals` (exists) | Keep; extend with horizon enum |

> Full column-level detail and the exact additive migration order live in `01-data-model.md`.

---

## 4. Top-level information architecture (navigation)

The spec's 9 screens (`15`) reconciled with today's nav. The current sidebar
already has a daily cluster + "Sell" + "Level Up" groups; the new IA folds the
9 screens in without exploding the nav.

```
Home (Command Center)          ← exists (/home), becomes the daily cockpit
Do  ─ Today                    ← exists (/today)
    ─ Tasks                    ← exists (/tasks)
    ─ Schedule (Time Blocks)   ← exists (/schedule)
    ─ Notes                    ← exists (/notes)
CRM ─ Pipeline                 ← exists (/partners) → generalized to deals+partners
    ─ Leads                    ← NEW (/crm/leads)
    ─ Contacts                 ← NEW (/crm/contacts) (crm_contacts exists)
    ─ Accounts                 ← NEW (/crm/accounts)
    ─ Opportunities            ← NEW (/crm/opportunities)
Team─ Agent Office (org chart) ← evolve (/grow/team) → /team
    ─ Chat & Boardroom         ← NEW (/team/rooms)
Grow─ Content Studio           ← evolve (/grow/content) → /studio
    ─ Funnel Lab               ← evolve (/grow/leadgen) → /funnel
    ─ Automations              ← exists (/grow/automations)
    ─ Build                    ← exists (/grow/build)
Coach (Coach Center)           ← evolve (/coach) → goals+plans+reviews
Learn (Learning Center)        ← exists (/train)
Money ─ Income Planner         ← exists (/commissions)
      ─ Commissions            ←   (same module)
Admin ─ Memory Lab             ← NEW (/admin/memory) — governance + review queue
      ─ Analytics              ← evolve (/analytics) → +agent/memory/content metrics
      ─ Manager tools          ← exists (/manager/*)
```

Guardrail: **beginners never see the full tree.** The onboarding (`09`) configures
which groups are visible; a beginner sees Home / Do / Coach / Content and grows into
CRM / Team / Admin. See `03-ux-screen-map.md`.

---

## 5. System architecture (runtime)

```
                    ┌─────────────────────────────────────────────┐
                    │            Next.js App Router (Vercel)        │
                    │   Client components (@ts-nocheck)  +  RSC     │
                    └───────────────┬─────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
   Server Actions /           Route Handlers            Edge / Cron
   RSC data loads             /api/* (coach, agent runs, (scheduled agent
   (Supabase RLS)             meetings, memory)          runs, digests)
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    │
                    ┌───────────────▼─────────────────┐
                    │        Supabase Postgres         │
                    │  RLS · Realtime · pgvector(new)  │
                    │  Storage buckets (assets/media)  │
                    └───────────────┬─────────────────┘
                                    │
                    ┌───────────────▼─────────────────┐
                    │   Agent Orchestrator (server)    │
                    │  registry · router · run loop    │
                    │  memory retrieval · governance   │
                    └───────────────┬─────────────────┘
                                    │
                    ┌───────────────▼─────────────────┐
                    │        Anthropic API (Claude)    │
                    │  tool-use · structured output    │
                    └─────────────────────────────────┘
```

Key runtime decisions (rationale in `05` + `07`):
- **Agents run server-side**, never in the browser — for key safety, governance, and memory access.
- **Realtime** (Supabase channels) drives live agent status, chat, and meeting streams.
- **Memory retrieval is a server module** every meaningful agent run calls: blends state + recent episodes + semantic insights + RAG (`11`).
- **Governance is a gate, not a suggestion**: high-risk outputs (SmartCredit, compliance) pass through a review state before they can be sent or promoted.

---

## 6. The six deliverables in this package

| File | Covers | Spec output (from `17`) |
|---|---|---|
| `00-overview.md` (this) | Unified architecture + codebase map + IA + runtime | #1 |
| `01-data-model.md` | Full schema, existing/evolve/new, additive migrations | #2 |
| `02-agent-registry.md` | 40-agent org, 18-field model, seed from 18 agents | #3 |
| `03-ux-screen-map.md` | Page-by-page for 9 screens + flows + component inventory | #4, #5 |
| `04-memory-governance.md` | Layered memory, RAG, trust/decay, HITL, observability | #7 |
| `05-workflow-orchestration.md` | Agent workflows, meetings, PAORI self-improvement loop | #6 |
| `06-implementation-plan.md` | 6 phases → concrete buildable milestones | #8 |
| `07-open-questions.md` | Assumptions + true trade-offs needing your call | #9 |

Read in order; `01`–`05` are the "what," `06` is the "in what order," `07` is
"what I need from you before/while building."
