# Build Status — Agentic CRM OS

Autonomous build of the 6-phase roadmap (`06-implementation-plan.md`). Every
migration is additive + reversible and was applied to the live DB and verified;
every UI milestone passed `npm run build` and was committed + merged to the
designated branch. This is the honest record of what's **live** and what's
**remaining depth** (deliberately deferred, noted for the next pass).

## Migrations applied (8, all additive/reversible)

| File | Adds |
|---|---|
| `20240210…_crm_spine` | accounts, leads, opportunities, activities, goal_items + additive cols |
| `20240211…_agent_registry` | agent_roles, agents (43-agent org seed) |
| `20240212…_content_ideas_scripts` | content_ideas, scripts |
| `20240213…_meetings_agent_runs` | meeting_rooms, participants, agent_messages, meeting_outputs, agent_runs |
| `20240214…_content_os` | posts, post_metrics, podcast_assets, repurposed_assets, social_proof_items, content_experiments |
| `20240215…_partner_os` | qualification_scores, partner_activation_metrics, partner_assets |
| `20240216…_memory_layer` | pgvector + 8 memory tables |
| `20240217…_observability` | prompt_versions, workflow_versions, retrieval_events, trust_score_history, traces |

## Phase-by-phase status

### Phase 1 — Foundation ✅ shipped
- CRM spine + `/crm` workspace (Accounts/Leads/Opportunities/Contacts, full CRUD).
- 43-agent registry (`agent_roles`/`agents`) + typed `lib/agents` data layer.
- `/goals` multi-horizon coach goals.
- `/studio` idea→script (real persistence).

### Phase 2 — Team & Meetings ✅ shipped
- `/team` Agent Office on the live registry (department groups, 18-field profiles, live status).
- `/team/rooms` chat/boardroom/war-room/office-hours with real in-character agent
  responses (`/api/team/room`), chair synthesis, @mentions, agent_run logging.
- `/api/team/room/summarize` → structured meeting outputs.
- **Remaining depth:** the office *map* visual (currently a polished profile grid, not the animated "Sims-like" office); non-meeting agent triggers (cron/webhook run loop) — the run loop exists for meetings, not yet for scheduled fan-outs.

### Phase 3 — Marketing OS ✅ core shipped
- Content OS tables; `/studio/repurpose` one-long-form→many-assets engine
  (`/api/content/repurpose`), copy-to-clipboard, past-sources.
- **Remaining depth:** full post-builder + scheduler UI on `posts`/`post_metrics`;
  social-proof shelf UI; wiring the existing `/grow/content` Next-Move to live tables.

### Phase 4 — Partner + SmartCredit OS ✅ core shipped
- `/funnel` Funnel Lab: AI SmartCredit fit scoring (6 dimensions, `/api/partner/fit-score`)
  + activation lifecycle board.
- **Remaining depth:** partner enablement asset distribution UI (`partner_assets`);
  activation metrics charts (`partner_activation_metrics`).

### Phase 5 — Memory + Learning ✅ core shipped
- pgvector + full memory schema; `/admin/memory` PR-style review queue with
  risk-weighted promotion + lifecycle control; `/api/memory/distill` candidate
  generation from real activity; audit logging.
- **Remaining depth:** embeddings population + RAG retrieval wired into the agent
  run loop (schema + column ready, generation not yet wired — needs an embedding
  model choice, decision C5); nightly decay/trust recompute cron; the graph/lineage
  observability views.

### Phase 6 — Advanced Optimization ✅ core shipped
- Observability tables; `/admin/observability` AI Company dashboard (runs, errors,
  cost, meetings, decisions, busiest agents, memory health).
- **Remaining depth:** the closed-loop self-improvement (PAORI) that proposes
  prompt/workflow changes into the review queue (tables ready: prompt_versions/
  workflow_versions with rollback); experimentation runner on `content_experiments`;
  proactive "upgrade radar."

## Cross-cutting notes / follow-ups

1. **Model tiering (decision B5):** agents carry `model_tier`; room/agent responses
   currently use one reliable model (`AGENT_MODEL`, default `claude-sonnet-4-6`).
   Flip on per-tier routing once tier-model access is confirmed for the deployment
   — it's data-ready (map `model_tier` → model in the API routes).
2. **RAG sources (decision B3):** retrieval will index the app's own knowledge
   (modules/lessons/resources/battle cards) + uploaded docs first. Not yet wired.
3. **pgvector schema:** installed in `public` (benign advisor WARN). Optional future
   cleanup: move to an `extensions` schema.
4. **`main` branch:** pushes gated this session; all work merged to
   `claude/affectionate-volta-v1qqa6`. `main` is behind by the whole rebuild.
5. **Verification:** every step is build-verified (typecheck + compile) and DB-
   verified (counts, RLS, advisor). End-to-end runtime verification of the AI
   endpoints requires the deployed app + `ANTHROPIC_API_KEY` + a signed-in session —
   they reuse the same Anthropic setup the existing coach uses.
