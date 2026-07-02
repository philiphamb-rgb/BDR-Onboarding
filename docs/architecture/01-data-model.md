# Data Model & Supabase Architecture

> Every table is labelled **EXISTING** (ships today, untouched), **EVOLVE** (exists,
> gains additive columns), or **NEW**. Per decision #3, **no table is dropped or
> rewritten** without explicit sign-off; every migration is additive and reversible.
> Grounded against the live schema (39 tables, queried 2026-07).

---

## 1. Current schema (ground truth, 39 tables)

```
agent_instruction_overrides  ai_coach_messages  audit_logs  automation_log
automations  broadcasts  crm_contacts  gamification_rules  goals
growth_feedback  growth_instruction_proposals  growth_notes  habit_logs
habits  income_checkins  income_plans  income_playbook_checks  lessons
module_certifications  module_progress  modules  notes  notifications
partner_onboarding  push_subscriptions  quiz_attempts  quiz_questions
resources  role_permissions  schedule_blocks  task_lists  tasks
team_challenges  team_members  team_resource_items  teams  user_progress
users  wins  xp_ledger
```

**pgvector is NOT installed** (extensions: plpgsql, pg_stat_statements, uuid-ossp,
pgcrypto, supabase_vault). The memory layer's first migration is
`create extension if not exists vector;` — additive, reversible, Phase 5.

---

## 2. CRM Core

### `contacts` → **EVOLVE `crm_contacts`**
Today: `id, user_id, team_id, partner_id, name, title, email, phone, is_primary, created_at`.
Add (additive):
```
account_id      uuid null references accounts(id)   -- new account link
lifecycle_stage text default 'new'                  -- subscriber→lead→…→customer
lead_source     text null
last_touch_at   timestamptz null
owner_id        uuid null references users(id)
comm_prefs      jsonb default '{}'
tags            text[] default '{}'
ai_summary      text null                            -- AI-native enhancement
updated_at      timestamptz default now()
```
`partner_id` stays (back-compat); new records prefer `account_id`.

### `accounts` — **NEW**
Company/business records (the spec's "Accounts / Businesses"). Distinct from
`partner_onboarding` (which is a *pipeline row*); an account may exist before it
becomes a partner.
```
id, team_id, owner_id, name, vertical, segment,
revenue_potential numeric, partner_fit_score int, smartcredit_fit_score int,
health_score int, stakeholder_map jsonb, lifecycle_stage text,
tags text[], ai_summary text, created_at, updated_at
```

### `leads` — **NEW**
Pre-qualification capture, before an opportunity or partner row exists.
```
id, team_id, owner_id, account_id null, contact_id null,
source text, raw_payload jsonb, enrichment jsonb,
qualification_score int, status text,      -- new→working→qualified→routed→recycled
routing jsonb, next_best_action text, ai_summary text,
created_at, updated_at
```

### `opportunities` — **NEW**
Revenue deals (distinct from partner onboarding stages).
```
id, team_id, owner_id, account_id, primary_contact_id,
name, stage text, amount numeric, probability int, close_date date,
risk_flags text[], decision_makers jsonb, deal_room jsonb,
ai_summary text, ai_next_step text, created_at, updated_at
```

### `activities` — **NEW** (thin unifier)
The spec wants one activity stream (tasks/calls/emails/meetings/notes/agent-actions).
Rather than migrate the working `tasks`/`wins`/`notes` tables, add a **normalized
activity view/table** that references them, plus captures agent-generated actions:
```
id, team_id, actor_type text,        -- 'user' | 'agent'
actor_id uuid, entity_type text,     -- lead|account|opp|partner|contact
entity_id uuid, kind text,           -- task|call|email|meeting|note|agent_action
summary text, payload jsonb, occurred_at, created_at
```
`tasks` (**EXISTING**, 22 cols), `wins` (**EXISTING**), `notes` (**EXISTING**),
`schedule_blocks` (**EXISTING**) stay as-is and emit into `activities`.

### `goals` — **EXISTING, untouched** + `goal_items` — **NEW**
Discovery during Phase 1.1: `goals` is a per-user **singleton** (PK = `user_id`,
no `id` column) holding the primary monthly deal goal the `GoalCockpit` reads.
Overloading it for multi-horizon goals would break that. So `goals` stays as-is,
and a dedicated `goal_items` table (id-keyed, many-per-user) holds the richer
5-horizon coach goals:
```
goal_items(id, user_id, team_id,
  horizon text default 'monthly',   -- annual|quarterly|monthly|weekly|daily
  parent_goal_id uuid null references goal_items(id),
  category text,                    -- revenue|content|outreach|partner|habit
  title text, target numeric, metric text,
  progress numeric, status text, due_date date, created_at, updated_at)
```

### Reused as-is (**EXISTING**)
`users`, `teams`, `team_members`, `tasks`, `notes`, `schedule_blocks`,
`income_plans`, `income_checkins`, `income_playbook_checks`, `wins`, `xp_ledger`,
`user_progress`, `habits`, `habit_logs` — no changes required for CRM core.

---

## 3. Partner / SmartCredit Layer

### `partner_pipeline` → **EVOLVE `partner_onboarding`**
Today: `id, user_id, team_id, partner_name, company, stage, checklist, notes,
created_at, updated_at, temperature, deal_amount, expected_close_date,
deal_probability, next_followup_date`.
Add:
```
account_id uuid null references accounts(id)
qualification_score_id uuid null references qualification_scores(id)
activation_state text default 'onboarding'  -- onboarding→activated→producing→at_risk→reengaging
```
The current 5-stage flow stays; `activation_state` extends *past* the current
terminal "opportunity_won" for the producing/at-risk/re-engage lifecycle (`08`).

### `qualification_scores` — **NEW**
SmartCredit fit logic (`08`).
```
id, account_id, partner_id null,
audience_fit int, trust_level int, customer_volume int,
monetization_fit int, regulatory_sensitivity int, activation_potential int,
composite int, rationale text, scored_by text,  -- agent id
created_at
```

### `partner_activation_metrics` — **NEW**
```
id, partner_id, metric text, value numeric, period text, captured_at
```

### `partner_assets` — **NEW**
Enablement assets distributed to partners (links to storage bucket).
```
id, partner_id null, team_id, title, kind, storage_path, url,
distributed_at, created_at
```

---

## 4. Content Layer (real, replacing demo data)

Today `/grow/content` runs on static `content.ts`. These tables make it real (`07`):

| Table | Purpose |
|---|---|
| `content_ideas` — **NEW** | ranked idea queue: `bucket, hook, angle, format, ev_score, status, source_memory_id` |
| `scripts` — **NEW** | `content_idea_id, body, hooks[], cta, format, version` |
| `posts` — **NEW** | `script_id, channel, status(draft→scheduled→published), published_at, permalink` |
| `post_metrics` — **NEW** | `post_id, saves, shares, watch_quality, comments, dms, clicks, lead_captures, captured_at` |
| `podcast_assets` — **NEW** | long-form source: `title, transcript_path, duration, uploaded_at` |
| `repurposed_assets` — **NEW** | `podcast_asset_id, kind(reel|clip|quote|carousel|…), body, storage_path` |
| `social_proof_items` — **NEW** | `kind(win|testimonial|before_after|screenshot), body, partner_id, storage_path` |
| `content_experiments` — **NEW** | `hypothesis, variant, metric, result, status` |

`broadcasts` (**EXISTING**) stays for manager team-broadcasts (unrelated to public content).

---

## 5. Agent Layer

### `agents` — **NEW** (identity + live state)
The 40-agent registry. Seeded from `roster.ts`; see `02-agent-registry.md` for the
full 18-field model.
```
id text primary key, team_id, role_id references agent_roles(id),
first_name, last_name, title, department,
avatar jsonb, personality text, morning_greeting text,
status text default 'setup',            -- live|setup|paused
mission text, kpi text, roi_logic text,
memory_scope text[], permissions jsonb,
system_prompt text, editable_settings jsonb,
run_count int default 0, last_run_at timestamptz,
quality_score int, error_rate numeric, created_at, updated_at
```

### `agent_roles` — **NEW** (role template, org relationships)
```
id text, tier int,        -- 0 operator | 1 exec | 2 manager | 3 worker
department text, reports_to text[], direct_reports text[],
handoff_to text[], reviewed_by text[],
inputs text[], outputs text[], tools text[], escalation_path text[]
```

### `agent_state` → reconcile with **EXISTING `automations`**
`automations` (`id, team_id, name, category, status, config, updated_by, updated_at`)
already stores per-team live status + config. Decision (`07` Q3): **keep `automations`
as the state table**, add `agent_id` FK, and treat `agents`/`agent_roles` as the
catalog/identity layer. `agent_instruction_overrides` (**EXISTING**) already versions
prompt tweaks — becomes part of governance.

### `agent_runs` — **NEW** (execution log)
```
id, agent_id, team_id, trigger text, input jsonb, output jsonb,
status text, tokens int, cost numeric, started_at, ended_at,
trace_id uuid, error text
```
`automation_log` (**EXISTING**, 7 cols) is the precursor — extend or supersede.

### `agent_messages` — **NEW** (chat + meeting turns)
```
id, room_id references meeting_rooms(id), author_type text, author_id,
content text, mentions text[], created_at
```

### Meetings — **NEW**
```
meeting_rooms(id, team_id, mode, topic, chair_agent_id, template, status, created_at)
   -- mode: one_on_one | team | boardroom | war_room | office_hours
meeting_participants(id, room_id, agent_id null, user_id null, role)
meeting_outputs(id, room_id, transcript_ref, summary, decisions jsonb,
                open_questions jsonb, owners jsonb, next_actions jsonb,
                deadlines jsonb, crm_links jsonb, memory_candidate_ids uuid[],
                created_at)
```

---

## 6. Memory Layer — **ALL NEW** (Phase 5)

Prerequisite migration: `create extension if not exists vector;`

| Table | Purpose (`11`, `12`) |
|---|---|
| `memory_events` | Episodic raw log: meetings, posts, outcomes, agent actions, user corrections |
| `memory_candidates` | Proposed insights + metadata (source_events, evidence, confidence, freshness, contradiction_status, risk_tier, affected_agents, affected_workflows, reason) |
| `semantic_memories` | Promoted, trusted learnings (winning hooks, ICP insights, SmartCredit fit patterns, approved messaging) |
| `memory_embeddings` | `vector(1536)` per semantic memory + per RAG chunk, for retrieval |
| `memory_feedback` | Did-it-help signals tied to outcomes |
| `memory_reviews` | HITL review records (approve/edit/reject/defer/rollback + reviewer) |
| `memory_links` | Graph edges: event→candidate→memory→outcome (lineage) |
| `memory_audit_log` | Immutable trail of every memory state change |

`growth_feedback` + `growth_instruction_proposals` (**EXISTING**) are the working
precedent for the feedback→candidate→HITL pattern — the memory layer generalizes them.

---

## 7. Observability Layer — **ALL NEW** (Phase 5–6)

| Table | Purpose (`13`) |
|---|---|
| `traces` / `spans` | Per agent-run tracing (nested spans for retrieval, tool calls, generation) |
| `retrieval_events` | What was retrieved, why it ranked, whether it helped, downstream outcome |
| `prompt_versions` | Versioned agent prompts (rollback) |
| `workflow_versions` | Versioned workflow/routing definitions (rollback) |
| `trust_score_history` | Trust score over time per semantic memory |

`audit_logs` (**EXISTING**) stays as the governance/user-action audit; the above are
AI-system observability, kept distinct (spec `13` + `14` want raw-events separate
from trusted memory).

---

## 8. Storage buckets — **NEW**

Per `14`: `assets`, `generated-content`, `transcripts`, `proofs`, `exports`, `media`.
RLS-scoped per team; signed URLs for reads.

---

## 9. RLS & multi-tenancy

- Every new table carries `team_id` and inherits the existing team-scoped RLS pattern
  already used by `partner_onboarding`, `automations`, `growth_feedback`.
- Agent/memory writes are **server-only** (service role via server actions/route
  handlers); clients never write memory or agent state directly.
- High-risk memory promotion requires `manager`/`admin` role (extends `role_permissions`).

---

## 10. Additive migration order (reversible)

Each is a single reversible migration; none drops or rewrites existing data.

1. **P1a** `accounts`, `leads`, `opportunities`, `activities` (+ FKs, RLS)
2. **P1b** additive columns on `crm_contacts`, `goals`, `partner_onboarding`
3. **P1c** `agents`, `agent_roles`; `automations.agent_id` column; seed 40 roles
4. **P2** `meeting_rooms`, `meeting_participants`, `agent_messages`, `meeting_outputs`, `agent_runs`
5. **P3** content tables (`content_ideas` … `content_experiments`)
6. **P4** `qualification_scores`, `partner_activation_metrics`, `partner_assets`
7. **P5a** `create extension vector`; memory tables + embeddings
8. **P5b** `memory_reviews`, `memory_audit_log`, governance RLS
9. **P6** observability tables

Every migration ships with a tested `down` and is applied via `apply_migration`
after review. No production table is renamed; spec-name aliases are documented, not enforced by rename.
