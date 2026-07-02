# Open Questions, Assumptions & Trade-offs

> Per `17` #9: what I resolved on my own, and what genuinely needs your call before or
> during the build. Answer the **must-answer** items before Phase 1 migrations; the
> rest can be decided at their phase.

---

## A. Assumptions I made (tell me if any are wrong)

1. **Evolve, not rebuild.** Existing working code (partners, roster, coach, content,
   commissions) is extended, not replaced. (Decision #2.)
2. **Additive, reversible schema only.** No production table dropped or renamed without
   sign-off. Spec table names that collide with existing ones (e.g. `contacts` vs
   `crm_contacts`, `partner_accounts` vs `partner_onboarding`) are kept under the
   **existing** name. (Decision #3.)
3. **Single-tenant-per-team.** The existing `team_id` RLS model extends to all new
   tables; no new multi-org tenancy layer unless you say otherwise.
4. **Server-side agents.** All agent/memory execution is server-side (route handlers /
   edge / cron); the browser never holds keys or writes memory.
5. **Anthropic/Claude is the model layer** (matches the existing coach + tool-use).
6. **~34 named agents** from `05`'s explicit role lists (8 exec + 11 manager + 15
   worker), with headroom to 40 — not exactly 40 invented roles.
7. **`@ts-nocheck` client-component convention** stays for new client pages (matches
   the codebase); plain `.ts` lib files remain strictly typed.
8. **Plan-first.** No code/schema changes until this package is approved. (Decision #1.)

---

## B. Must-answer before Phase 1

1. **Scope of Phase 1 CRM vs the existing partner flow.** The app today centers on
   *partners*; the spec adds generic *leads/accounts/opportunities*. Do you want the
   full CRM spine now, or should Phase 1 stay partner-centric and add leads/accounts/
   opportunities incrementally? (Affects migration P1a scope.)
2. **Real content publishing vs planning-only.** Does the Content OS need to *actually
   publish* to social channels (API integrations — Instagram/LinkedIn/X/TikTok), or is
   it a **prep + checklist + track-manually** system (as today)? Real publishing is a
   large integration surface with its own auth/compliance. My default: **prep + track**,
   publishing links out.
3. **RAG source ingestion.** What are the concrete RAG sources (SmartCredit docs,
   compliance PDFs, market research feeds)? Memory Phase 5 needs the actual documents +
   an ingestion path. My default: start with uploaded internal docs only; add live web
   research later.
4. **Compliance authority.** For SmartCredit claims / financial messaging, who is the
   human approver, and are there fixed approved-language templates I must enforce
   verbatim? This sets the HITL gate content. (This is the highest-risk area.)
5. **Scale/cost envelope.** Roughly how many agent runs/day and what monthly AI-spend
   ceiling? This sizes concurrency, cron cadence, and whether we need a cheaper model
   tier for high-volume worker agents.

---

## C. Decide-at-phase trade-offs

| # | Trade-off | Options | My lean |
|---|---|---|---|
| C1 | **Activity model** | Normalize into one `activities` table vs keep `tasks`/`wins`/`notes` separate and view-join | Thin `activities` unifier + keep sources (P1) |
| C2 | **Agent state home** | Keep `automations` as state vs new `agent_state` table | Keep `automations`, add `agent_id` — less migration risk |
| C3 | **Office Map fidelity** | Full "Sims-like" animated office vs a polished static desk grid with live dots | Ship the desk-grid + live dots first; animate later |
| C4 | **Meeting turn generation** | Multi-agent turns as separate Claude calls (accurate, costlier) vs one call role-playing the room (cheaper) | Separate calls for boardroom/war-room, single-call for quick team chats |
| C5 | **Embedding model** | Which embedding model for pgvector (dimension) | Decide at P5 with the model choice; table uses a fixed dim |
| C6 | **Memory decay cadence** | Real-time vs nightly recompute | Nightly cron (cheaper, sufficient) |
| C7 | **Beginner vs operator default** | Which nav groups a brand-new user sees | Home/Do/Coach/Content; reveal CRM/Team/Admin on milestones |

---

## D. Known risks / watch-items

1. **Live-data safety.** Real users + `partner_onboarding` rows exist. Every migration
   reversible; test on a branch DB (Supabase branching) before prod where feasible.
2. **`main` push is gated in this session.** I've been merging working → designated
   branch (`claude/affectionate-volta-v1qqa6`) and *not* pushing `main`. That continues
   unless you re-authorize `main`.
3. **Scope size.** This is a multi-month build. Phasing keeps each step shippable and
   reversible; we should treat each phase as its own approval gate, not commit to all 6 blindly.
4. **Cost.** 40 agents × frequent runs × Claude calls can get expensive fast — B5
   above (cost envelope) directly gates worker-agent design.
5. **PROMPT.md Part 1 vs this brief.** The Part 1 UX overhaul I just shipped (tasks
   41–54) targeted the *current* `/grow` module. Some of it (nav, copy, empty states)
   carries forward; some screens (`/grow/team`, `/grow/content`, `/grow/leadgen`) get
   substantially reworked here. No conflict — this brief supersedes and extends — but
   worth noting the recent work isn't wasted; it's the evolve-from baseline.

---

## E. What I need from you now

To start Phase 1, I need **B1–B5** answered (or "use your defaults"). Everything else
I can proceed on with the leans above, checking in at each phase gate. Say the word and
I'll begin Phase 1 with the additive migrations + CRM shell, or adjust any assumption in
section A first.
