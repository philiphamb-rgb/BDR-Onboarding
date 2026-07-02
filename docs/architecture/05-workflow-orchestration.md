# Workflow Orchestration, Meetings & Self-Improvement

> How agents actually run, hand off, meet, and get better — the moving parts behind
> `05`, `06`, `10`. All orchestration is **server-side** for key safety, governance,
> and memory access (`00` §5).

---

## 1. The agent run loop

Every agent run is one traced unit (`agent_runs` + `traces`/`spans`):

```
trigger ─▶ retrieve context ─▶ generate (Claude, tool-use) ─▶ govern ─▶ act ─▶ observe
(webhook/  (memory blend:      (structured output +          (HITL gate  (write   (trace,
 cron/     state+episodes+     tool calls)                    if risky)   CRM/     retrieval
 event/    semantic+RAG)                                                  content) event,
 manual)                                                                           feedback)
```

- **Triggers** (`agent_roles.trigger`): webhook (real-time events), cron (scheduled),
  event (another agent's output / DB change), manual (user asks).
- **Retrieve**: the single memory module (`04` §2).
- **Generate**: Claude with tool-use + structured output; the agent's editable system
  prompt + retrieved context + its role's inputs.
- **Govern**: high-risk output routes to a review state before it can send/promote (`04` §5).
- **Act**: write to CRM/content/partner tables, draft outreach, create tasks, etc.
- **Observe**: write trace, retrieval event, and (later) feedback for self-improvement.

Orchestrator modules: `lib/agents/registry.ts` (who exists), `router.ts` (who handles
what), `run.ts` (the loop above), `handoff.ts` (lateral passing), `govern.ts` (gates).

---

## 2. Routing & handoffs

- **Routing** (`router.ts`): maps a trigger/topic to the right agent(s) using the
  registry's department/role/inputs. Example: new lead → Lead Scorer → (if ≥80) Setter Assist.
- **Handoffs** (`handoff.ts`): an agent's output becomes another's input along
  `handoff_to` edges. Each handoff is an `activities` + `agent_runs` row so the chain is inspectable.
- **Escalation**: on low confidence / error / risk, the agent escalates along
  `escalation_path` (worker → manager → exec → operator).
- **Review**: `reviewed_by` agents (QA Lead, Compliance Reviewer) audit outputs
  asynchronously and can flag for the memory candidate pipeline.

This is the same reporting/handoff graph the current `orgChart.ts` already encodes —
extended with escalation + review edges.

---

## 3. Meetings, chat & boardroom (`06`)

Rooms are first-class (`meeting_rooms`); turns stream via Realtime into `agent_messages`.

| Mode | Chair | Use |
|---|---|---|
| **1:1 Chat** | — | Focused work with one role (talk to CMO about content) |
| **Team Chat** | — | User-selected multi-agent discussion |
| **Boardroom** | Chief of Staff | Moderated strategy: turn-taking, invite specialists, synthesize, challenge weak reasoning, end with decisions |
| **War Room** | CRO/COO | Urgent launch/funnel/performance review |
| **Office Hours** | selected role | Coaching/advisory |

Mechanics:
- **Smart agent suggestions** — the router proposes who should be in the room for a topic.
- **Turn-taking** — the chair agent orchestrates; "ask everyone" fans out, "ask one" targets.
- **@mentions** pull a specific agent in.
- **Saved templates** (`06`): Weekly growth review, Content planning, ICP research,
  Funnel optimization, Compliance review, Partner activation review, Revenue forecast review.

**Every meeting produces** a structured `meeting_outputs` row: transcript, summary,
decisions, open questions, owners, next actions, deadlines, related CRM links, and
**memory candidates** (feeding the promotion pipeline). Next actions auto-create
`tasks`/`activities`; decisions can update CRM records.

---

## 4. Self-improvement loop (`10`) — Plan/Act/Observe/Reflect/Improve

```
PLAN    ─ agent/workflow sets intent (from goals + coach + memory)
ACT     ─ run loop executes (§1)
OBSERVE ─ traces, retrieval events, outcomes, human edits, agent overrides
REFLECT ─ periodic review compares intent vs outcome; produces "what worked / failed /
          changed / test next / promote" learnings
IMPROVE ─ propose changes to: prompts, workflows, routing rules, templates, content
          playbooks, meeting structures, prioritization logic
```

**Measured** (`10`): content performance, funnel performance, lead quality, partner
activation, human edits, agent overrides, meeting outcomes, coaching effectiveness,
plan compliance.

**Safety rules (hard):**
- **No uncontrolled self-rewrite** — improvements are *proposals*, not auto-applied.
- **High-impact changes require review** (HITL, via the same review queue).
- **Everything versioned** (`prompt_versions`, `workflow_versions`) with **rollback**.

**Cadence (`10`):** per-run logging → daily summaries → weekly tests → monthly audits.
This is the app's existing `growth_instruction_proposals` mechanism, generalized from
prompts to workflows/routing/templates.

---

## 5. Coach integration (`04`)

The AI Coach is a first-class consumer of all of the above. It reads goal data + CRM +
pipeline + content + engagement + partner + meeting outputs + memory insights, and
produces daily plans, weekly reviews, growth plans, nudges, warnings, and precise next
actions. It is the human-facing narrator of the whole system: the operator experiences
the agent company **through** the coach as much as through the Agent Office.

---

## 6. Runtime & scale notes

- **Concurrency**: agent runs are queued server-side; scheduled fan-outs (e.g. nightly
  audits across all partners) run in edge/cron with bounded concurrency.
- **Cost governance**: per-run tokens/cost logged on `agent_runs`; the existing cost
  card + governance surfaces the monthly spend and can pause runaway agents.
- **Realtime**: Supabase channels stream agent status + room turns; the office map and
  boardroom are live.
- **Failure isolation**: a failed agent run drops to an escalation, never silently — the
  QA Lead + COO catch silent failures (the nightly-audit pattern already shipped).
