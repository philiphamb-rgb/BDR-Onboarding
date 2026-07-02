# BDR Hub → Agentic CRM OS — Architecture Package

Implementation-ready architecture produced from the 18-file brief
(`00masterorchestrator.md` + companion files `01`–`17`). This is the deliverable
`17claudeexecutioninstructions.md` asks for: a unified architecture, schema, agent
registry, UX spec, memory plan, workflow map, sequencing, and open questions.

> **Status: PLAN — awaiting approval.** No app behavior or database schema has changed.
> Build begins at Phase 1 only after sign-off (see `07-open-questions.md` §E).

## Read in order

| # | File | What it answers |
|---|---|---|
| 0 | [`00-overview.md`](./00-overview.md) | Unified architecture, how the 6 layers map onto today's code, IA, runtime |
| 1 | [`01-data-model.md`](./01-data-model.md) | Full schema — existing / evolve / new — + additive migration order |
| 2 | [`02-agent-registry.md`](./02-agent-registry.md) | The ~34–40 agent org, 18-field model, seeded from today's 18 agents |
| 3 | [`03-ux-screen-map.md`](./03-ux-screen-map.md) | 9 screens page-by-page, 4 flows, shared component inventory |
| 4 | [`04-memory-governance.md`](./04-memory-governance.md) | Layered memory, RAG, trust/decay, HITL, observability |
| 5 | [`05-workflow-orchestration.md`](./05-workflow-orchestration.md) | Agent run loop, routing/handoffs, meetings, self-improvement |
| 6 | [`06-implementation-plan.md`](./06-implementation-plan.md) | 6 phases → concrete, reversible, shippable milestones |
| 7 | [`07-open-questions.md`](./07-open-questions.md) | Assumptions, must-answer items, trade-offs, risks |

## Three decisions this package assumes

1. **Plan first**, then build phase-by-phase.
2. **Evolve** the existing BDR Hub codebase (reuse partners/roster/coach/content).
3. **Additive & reversible** schema migrations only against the live database.

Override any of these in `07-open-questions.md` §A before Phase 1.

## Guardrails carried from the current codebase

- `npm run build` is the verification gate (no ESLint config, no test framework).
- New client pages use `// @ts-nocheck`; plain `.ts` lib files stay strictly typed.
- Team-scoped RLS on every table; agent/memory writes are server-only.
- `main` pushes are gated this session — work merges to the designated branch.
