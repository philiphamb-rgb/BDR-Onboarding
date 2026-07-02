# Resolved Decisions (operator delegated judgment)

> The operator asked me to make the best educated calls on the open questions and
> proceed. This records each decision, the reasoning, and — importantly — the seam I
> leave so any of them can be revisited without rework. These resolve `07-open-questions.md`
> §B (must-answer) and §C (trade-offs).

---

## B1 — CRM scope: build the full spine, modeled as ONE funnel (not a generic parallel CRM)

**Decision.** Build the full CRM spine in Phase 1 — `accounts`, `leads`,
`opportunities`, `activities` — **but architected as a single coherent funnel that
flows into the existing partner motion**, not a generic Salesforce-style parallel system.

**Reasoning.** The real business (files `02`, `08`) is one motion: educate a business →
qualify it → present SmartCredit → onboard it as a partner. There is no separate B2C
sales org here. So a generic CRM with unrelated "deals" would be over-engineering that
fights the product. Instead:

```
lead ──▶ account (business) ──▶ opportunity (the partnership deal) ──▶ partner_onboarding
(inbound   (the unit that        (qualified + SmartCredit-fit           (existing pipeline,
 interest)  becomes a partner)     revenue deal)                          now activation-aware)
```

`accounts` is the spine; `contacts` (existing `crm_contacts`) hang off it; `leads` are
pre-qualification; `opportunities` are the deal; winning one creates/links a
`partner_onboarding` row. This gives the spec's completeness **and** matches reality.

**Seam.** `opportunities.kind` allows a future non-partner deal type if a real direct-sales
motion ever appears — but we don't build UI for it now.

---

## B2 — Content publishing: prep + package + track (publishing links out), not native social APIs

**Decision.** The Content OS **generates, packages, schedules-intent, and tracks**
content, with a one-tap "copy everything + open the platform" hand-off. It does **not**
natively auto-post to Instagram/LinkedIn/X/TikTok in this build.

**Reasoning.**
- Native publishing is a huge, brittle surface: per-platform OAuth, Meta app review,
  TikTok's restricted API, X's now-paid API, per-platform format rules, and ongoing
  maintenance as each platform changes terms.
- The user still creates the actual video/asset themselves (file `07`: "record or
  assemble → publish"). The leverage is in *deciding what to make, writing it, and
  repurposing it* — not in the final HTTP POST.
- Auto-posting financial-adjacent content without human review conflicts with the HITL
  compliance rules (`12`). A human should see every partner-facing post before it ships.

**What we build instead.** `posts` carries `status (draft→ready→published)` and a
`permalink` the user pastes back after posting; `post_metrics` tracks performance
against it. A "publish pack" gives caption + hashtags + asset downloads + a deep link
to the platform.

**Seam.** A `publish_targets` concept is left as a clean future integration point; when
a specific channel is worth automating, it slots in without reworking the content model.

---

## B3 — RAG sources: ingest the app's own knowledge first, then uploaded docs, then live research

**Decision.** RAG v1 (Phase 5) indexes **what already exists in the app** — training
`modules`/`lessons`, `resources`, battle cards — plus a storage bucket where the operator
drops SmartCredit / compliance / approved-messaging PDFs. Live web research is a second
source, added via the existing `/api/research` path, not a launch blocker.

**Reasoning.** The app is already a knowledge base (13 training modules, resources,
competitor battle cards). Indexing that first gives immediate, grounded, on-brand
retrieval with zero new content dependencies. External feeds can wait until there's a
concrete need and source list.

**Seam.** `memory_embeddings.source` tags origin (`internal_module`, `resource`,
`uploaded_doc`, `web_research`), so sources are added incrementally and ranked/filtered per task.

---

## B4 — Compliance authority: operator (admin) approves; hard HITL gate; approved-language templates are user-populated (never fabricated)

**Decision.**
- The **operator/admin is the default compliance approver.**
- SmartCredit / financial messaging passes a **hard human-in-the-loop gate** — no
  auto-send, ever, until a human approves.
- Approved-language lives in a `compliance_templates` store that ships **empty**; agents
  may only emit specific SmartCredit financial claims that trace to an approved template.
  The system **never fabricates a financial outcome, guarantee, or credit-result claim.**

**Reasoning.** This is the highest-risk area and partly a legal/business decision I
can't fully own — so the safe, correct posture is: the machine proposes, a human
disposes, and the machine may not invent regulated claims. This matches the app's
existing compliance stance (every content prompt already carries "no guaranteed credit
outcomes"). It's the ethically and legally defensible default and protects the operator.

**Seam.** When the operator (or their counsel) supplies approved language, they populate
`compliance_templates`; the Compliance Guardian/Counsel agents then work strictly within it.

---

## B5 — Cost/scale: tiered model routing + per-run cost logging + a configurable monthly cap with graceful auto-pause

**Decision.** Design for cost-efficiency and observability from day one:

| Agent tier | Model | Why |
|---|---|---|
| Worker (high-volume, mechanical) | **Haiku 4.5** (`claude-haiku-4-5-20251001`) | Cheap, fast, sufficient for scoring/drafting/qualifying |
| Manager (synthesis, review) | **Sonnet 5** (`claude-sonnet-5`) | Strong reasoning at moderate cost |
| Exec + Coach (strategy, the human-facing voice) | **Opus 4.8** (`claude-opus-4-8`) | Best judgment where it's felt most |

Plus: every `agent_runs` row logs tokens + cost; a **configurable monthly budget cap**
(conservative default) with **graceful degradation** — when near cap, non-critical
worker agents pause and only critical/compliance runs continue; scheduled fan-outs
(nightly audits) run batched with bounded concurrency.

**Reasoning.** Without a hard number from the operator, the right move is an architecture
that's cheap by default, observable, and self-limiting — so cost can never surprise them,
and they tune the cap once they see real usage. Tiering avoids paying Opus prices for
mechanical work while keeping premium judgment where it matters.

**Seam.** Model choice is per-role config (`agent_roles`/`agents`), not hardcoded — retune
any agent's tier without code changes.

---

## C-series trade-offs (resolved with my earlier leans)

| # | Decision |
|---|---|
| C1 Activity model | Thin `activities` unifier; keep `tasks`/`wins`/`notes` as sources (P1). |
| C2 Agent state home | Keep `automations` as the live-state table, add `agent_id`; `agents`/`agent_roles` are catalog/identity. |
| C3 Office Map | Ship a polished desk-grid + live status dots first; richer animation later. |
| C4 Meeting turns | Separate Claude calls per agent for boardroom/war-room; single role-played call for quick team chats (cost). |
| C5 Embedding model | Decide dimension at P5 with model choice; table uses a fixed `vector(N)`. |
| C6 Decay cadence | Nightly cron recompute. |
| C7 Beginner default | New users see Home / Do / Coach / Content; CRM / Team / Admin reveal on milestones. |

---

## Proceed order

With these resolved, I begin **Phase 1** (`06-implementation-plan.md`), starting with the
additive, reversible foundation migration (§1.1) — new tables only, zero risk to existing
data — then registry seed, CRM shell, coach goals, and the idea→script generator. Each
milestone: migration reviewed + applied, build green, committed, merged to the designated
branch. `main` stays gated per session policy.
