# Implementation Plan — 6 Phases → Buildable Milestones

> The spec's 6 phases (`16`) turned into concrete, sequenced, buildable milestones,
> mapped to the evolve-vs-new decisions (`00` §3) and the additive migration order
> (`01` §10). Every phase ends green: `npm run build` passes, reversible migrations
> applied, committed + pushed, nothing existing broken.

**Working agreement per phase:** additive migrations only → build behind the existing
UX → verify against real data → commit per milestone → merge to the designated branch.
No production table dropped/renamed without explicit sign-off.

---

## Phase 1 — Foundation  (CRM data model + shell + coach/goals + registry seed)

**Goal:** the CRM spine and the agent registry exist; nothing user-facing breaks.

- **1.1** Migrations P1a–P1c: `accounts`, `leads`, `opportunities`, `activities`;
  additive columns on `crm_contacts`/`goals`/`partner_onboarding`; `agents`/`agent_roles`
  + `automations.agent_id`.
- **1.2** Seed `agent_roles`/`agents` from `roster.ts` (18) + author the exec/manager
  role rows (mapping table in `02` §6). Keep `automations` as live state.
- **1.3** CRM Workspace shell (`/crm/*`) with Leads/Contacts/Accounts/Opportunities
  list + record drawer, reusing `LeadsBoard`/`LeadDrawer` generalized. Pipeline stays `/partners`.
- **1.4** Coach goal system: extend `goals` to 5 horizons; Coach Center goal-design UI
  on top of the existing coach.
- **1.5** Content idea + script generator wired to `content_ideas`/`scripts` (real rows,
  replacing demo `content.ts` for the idea→script step).
- **Exit:** CRM records CRUD against real tables; registry queryable; coach sets
  multi-horizon goals; build green.

## Phase 2 — Team & Meetings

**Goal:** the living company + rooms.

- **2.1** Migration P2: `meeting_rooms`, `meeting_participants`, `agent_messages`,
  `meeting_outputs`, `agent_runs`.
- **2.2** Agent Office: deepen `/grow/team` → `/team` with 18-field profiles + Office
  Map (living desks, live status via Realtime).
- **2.3** Chat & Boardroom (`/team/rooms`): 1:1, team, boardroom, war room, office hours;
  streaming turns; @mentions; smart agent suggestions; saved templates.
- **2.4** Meeting outputs: every room writes the structured output; next actions →
  `tasks`/`activities`; memory candidates stubbed (queued, promoted in P5).
- **2.5** Agent run loop (server): registry → router → run → handoff → govern, traced.
- **Exit:** user can hold a boardroom that produces decisions + tasks; agents run and hand off; build green.

## Phase 3 — Marketing OS

**Goal:** publish 2/day with the full studio.

- **3.1** Migration P3: content tables (`posts`, `post_metrics`, `podcast_assets`,
  `repurposed_assets`, `social_proof_items`, `content_experiments`).
- **3.2** Content Studio (`/studio`): today's 2 posts → post builder → publish prep;
  the simple 8-step flow (`07`).
- **3.3** Repurposing lab: one long-form → reels/clips/quotes/carousels/text/DMs/etc.
- **3.4** Social proof shelf + performance analytics (real `post_metrics`).
- **3.5** Content agents live (Ideator/Hook/Script/Carousel/Repurpose/Proof).
- **Exit:** a podcast/long-form fans out into a week of assets; performance tracked; build green.

## Phase 4 — Partner + SmartCredit OS

**Goal:** recruit → qualify → onboard → activate partners.

- **4.1** Migration P4: `qualification_scores`, `partner_activation_metrics`, `partner_assets`.
- **4.2** Funnel Lab (`/funnel`): lead routes + nurture paths + SmartCredit fit scoring.
- **4.3** Partner OS: extend `partner_onboarding` with activation lifecycle
  (onboarding→activated→producing→at_risk→reengaging); activation dashboard.
- **4.4** Partner enablement: asset distribution + progress tracking + re-engagement.
- **4.5** Funnel/partner agents live (ICP Mapper, Partner Fit Scorer, Partner Success, etc.).
- **Exit:** a business flows education→qualification→SmartCredit fit→onboarding→activation; build green.

## Phase 5 — Memory + Learning

**Goal:** the trust layer.

- **5.1** Migration P5a: `create extension vector`; `memory_events`, `memory_candidates`,
  `semantic_memories`, `memory_embeddings`, `memory_feedback`, `memory_links`.
- **5.2** Retrieval module (`lib/memory/retrieve.ts`) wired into the agent run loop.
- **5.3** Migration P5b: `memory_reviews`, `memory_audit_log`; Memory Lab review queue
  (approve/edit/reject/defer/rollback/diff) — generalize `growth_instruction_proposals`.
- **5.4** Trust scoring + decay job (edge/cron); candidate generation (Insight Consolidator).
- **5.5** HITL gates enforced for high-risk domains.
- **Exit:** events → candidates → HITL → semantic memory → retrieval improves agent runs; build green.

## Phase 6 — Advanced Optimization

**Goal:** the system improves itself, safely.

- **6.1** Migration P6: observability tables (`traces`, `spans`, `retrieval_events`,
  `prompt_versions`, `workflow_versions`, `trust_score_history`).
- **6.2** Self-improvement loop (PAORI): reflect + propose (prompts/workflows/routing/
  templates), versioned, rollback-able, review-gated.
- **6.3** Memory observability dashboards (timeline/graph/lineage/retrieval/health).
- **6.4** Experimentation layer (`content_experiments` + A/B on hooks/sequences).
- **6.5** Advanced routing + proactive "upgrade radar."
- **Exit:** weekly tests + monthly audits produce reviewed improvements; full observability; build green.

---

## Cross-cutting (every phase)

- **UX standard held:** one job per screen, one primary action, plain words,
  progressive disclosure, empty states, the Part 1 master principles.
- **Governance held:** RLS on every new table; server-only agent/memory writes;
  HITL on high-risk; audit everything.
- **Verify:** where a phase adds runtime behavior, drive the real flow (not just build)
  before calling it done — the `verify` discipline.
- **Onboarding (`09`)** built early (Phase 1) so first-win exists from day one; deepens as layers land.

## Sequencing rationale

Foundation before team (agents need CRM entities to act on) → team before marketing
(content agents need the run loop + rooms) → marketing/partner before memory (memory
needs real events to distill) → memory before optimization (can't improve what you
can't observe). This matches `16` and de-risks the live database by front-loading the
additive CRM migrations and deferring pgvector until there's real signal to store.
