# Memory, RAG, Governance & Observability

> The trust layer (`11`, `12`, `13`). Memory is **layered, not a blob**; promotion to
> "trusted truth" is **human-gated in high-risk domains**; everything is **observable**.
> Tables defined in `01`; this doc defines the behavior.

---

## 1. Layered memory (`11`)

| Layer | Stores | Table | Lifetime |
|---|---|---|---|
| **Episodic** | Raw events: meetings, posts, outcomes, agent actions, partner interactions, user corrections | `memory_events` | Durable, immutable |
| **Semantic** | Distilled learnings: winning hooks, ICP insights, SmartCredit fit patterns, approved messaging, coaching learnings, winning workflows | `semantic_memories` (+ `memory_embeddings`) | Governed lifecycle |
| **State** | Live operational reality: current tasks, active experiments, meeting participants, pipeline state, ownership | existing CRM tables + `agent_state` | Ephemeral / current |
| **RAG** | External + reference: current AI landscape, market research, product/SmartCredit/compliance docs | `memory_embeddings` (source='rag') | Refreshed on ingest |

**Golden rule:** raw episodic events and trusted semantic memory are stored
**separately** (`14`). Nothing becomes "believed" without passing through promotion.

---

## 2. Retrieval (`11`)

For any meaningful agent task, the retrieval module blends four sources:
1. **Current state** (what's true right now — pipeline, tasks, participants),
2. **Recent episodes** (what just happened),
3. **Relevant semantic insights** (what we've learned, ranked by trust × similarity),
4. **Live external context** (RAG).

Retrieval is a single server module (`lib/memory/retrieve.ts`) every agent run calls.
Every retrieval writes a `retrieval_events` row (what, why it ranked, whether it
helped, downstream outcome) so retrieval quality is itself observable (`13`).

Ranking = `similarity × trust_score × freshness_decay`, with risk-tier floors
(low-trust or deprecated memories never surface for high-risk tasks).

---

## 3. Promotion pipeline (`12`)

```
event ──▶ candidate ──▶ scored ──▶ [review?] ──▶ semantic memory ──▶ trust monitored
(episodic) (Insight     (auto)    (HITL if      (promoted)          (ongoing)
           Consolidator)          high-risk)
```

1. **Capture** — raw event lands in `memory_events`.
2. **Candidate** — the Insight Consolidator agent proposes a `memory_candidate` with
   metadata: source_events, evidence, confidence, freshness, contradiction_status,
   risk_tier, affected_agents, affected_workflows, recommendation reason.
3. **Score** — automated composite (see trust model below).
4. **Review** — required for high-risk domains (§5); optional otherwise.
5. **Promote** — approved candidate becomes a `semantic_memory` (+ embedding).
6. **Monitor** — trust tracked over time (`trust_score_history`), decays if unused.

This generalizes the **existing** `growth_feedback` → `growth_instruction_proposals`
→ HITL-approval loop already in the app.

---

## 4. Trust score model (`12`)

`trust = w1·provenance + w2·human_confirmation + w3·freshness + w4·consistency
         + w5·performance_reinforcement − w6·contradiction_penalty − w7·risk_penalty`

- **Provenance**: quality/count of source events.
- **Human confirmation**: approved in review > auto-promoted.
- **Freshness**: newer = higher; feeds decay.
- **Consistency**: agrees with other trusted memory.
- **Performance reinforcement**: used → good outcome → trust up (via `memory_feedback`).
- **Contradiction penalty**: conflicts with trusted memory.
- **Risk penalty**: high-risk domains start lower, need more confirmation.

Weights are config, versioned in `prompt_versions`/`workflow_versions` style so tuning is auditable.

---

## 5. Human-in-the-loop (`12`) — non-negotiable gates

**Review required** before promotion or send for:
- Financial messaging,
- SmartCredit positioning / claims,
- Compliance-sensitive content,
- Qualification logic,
- Partner playbooks,
- Canonical best practices.

The **Compliance Reviewer** (worker) does first-pass; **Chief Compliance** /
**Chief Counsel** (exec, both `human-in-the-loop`) gate anything that reaches a
partner. A "Block" notifies the operator with reason + suggested alternative.

---

## 6. Decay (`12`)

States: **Active → Aging → Stale → Deprecated → Archived.**
A memory loses influence when it is old, unreinforced, contradicted, underperforming,
or tied to outdated tools/platform conditions. Decay is a scheduled job (edge/cron)
that recomputes freshness and demotes; nothing is hard-deleted (archived, auditable).

---

## 7. Memory Review Queue (`12`) — the PR model

The Memory Lab review queue behaves like pull requests. Per candidate, the operator can:
**approve · edit · reject · defer · rollback · compare versions.** Every action writes
`memory_reviews` + `memory_audit_log`. This is the operator's governance seat and the
single place "what the system believes" is controlled.

---

## 8. Observability (`13`)

Five dashboard views (Memory Lab / Analytics):

| View | Answers |
|---|---|
| **Timeline** | writes, promotions, contradictions, deprecations, approvals, retrieval usage over time |
| **Graph** | agent↔memory connections, clusters, topic maps, insight↔outcome links |
| **Lineage** | which events produced which insights, who approved, how they changed |
| **Retrieval Quality** | what was retrieved, why it ranked, whether it helped, business outcome |
| **Memory Health** | stale / conflicting / low-trust / overused memories, missing knowledge areas |

Operational metrics: memory growth rate, promotion rate, retrieval hit rate,
trust-score distribution, contradiction counts, decay counts, approval throughput,
business impact by cluster.

**UX goal (`13`):** the operator can see *what* agents learned, *why* they believe it,
*how* that belief changed, and *whether it's helping the business.*

---

## 9. Governance data requirements (`11`)

Every memory carries: provenance, approval state, confidence, freshness, supersession
link, lifecycle state, permissions (memory scope). High-risk domains (SmartCredit
claims, qualification rules, compliance/legal language, canonical playbooks) use
stricter governance — higher review threshold, lower auto-trust, mandatory reviewer.
