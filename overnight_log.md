# Apex OS — Overnight Perfection Loop log

Baseline commit: `130a5bf` (working tree clean at start). Branches kept in sync:
`claude/serene-shannon-17i9vv`, `claude/affectionate-volta-v1qqa6`. `main` intentionally
not force-pushed (policy: no direct default-branch push without explicit go-ahead).

---

## Cycle 1 — 2026-07-01T04:15Z — Phase: 0 (Baseline & Map)
Time spent: ~15m
Goal this cycle: Enumerate every route, confirm clean baseline, stand up the loop's tracking artifacts.
Changes made:
- Added `loop_state.json`, `module_checklist.md`, `overnight_log.md` (this file).
- Mapped 46 page routes + 7 API route groups into `module_checklist.md`, grouped by priority.
Verified how: `git status` clean at `130a5bf`; route list from Glob over `src/app/**/page.tsx`; confirmed no test script in package.json.
Not verified / carried forward: per-module functional QA (Phase 4) — starts next cycle.
Flagged decisions (needs Philip): No automated test suite exists — recommend Playwright smoke tests; not building unprompted overnight.
Delight additions: none this cycle (setup).

---

## Cycle 2 — 2026-07-01T04:20Z — Phase: 3 (Design System Audit — automated pass)
Time spent: ~6m
Goal this cycle: Run the cheap, objective design-system invariants across the whole source tree.
Changes made: none (audit only — all invariants held).
Verified how:
- Emoji scan across all `.ts`/`.tsx` (unicode ranges 1F000–1FAFF, 2600–27BF, arrows, symbols): **0 matches**.
- Stock-icon library imports (lucide/heroicons/react-icons/tabler/font-awesome/material): **0 matches** — custom SVG set only.
- Brand triad integrity: navy `#003087` (16×), teal `#00C2B2` (23×), gold `#F5A623` (8×) — **no drifted variants** of the three (no `#003088`, `#00C2B3`, etc.). Remaining hexes are semantic (success `#16A34A`, error `#DC2626`) and chart / pipeline-stage tokens — an intentional extended palette, not drift.
Not verified / carried forward: per-component hover/active/focus/disabled state coverage (Phase 3 manual portion) — deferred; spot-checked during Phase 4.
Flagged decisions: none.
Delight additions: none.

---

## Cycle 3 — 2026-07-01T04:25Z — Phase: 4/5 (Module QA — adversarial, in progress)
Time spent: (running)
Goal this cycle: Adversarial logic audit of the three highest-risk clusters via parallel review agents: (1) first-impressions (onboarding/home/today), (2) money & math correctness (income engine, commissions, calculator, pipeline, XP), (3) manager suite + RBAC. Fix all high-confidence findings.

Findings (verified against source, most severe first):
- [HIGH] Onboarding `finish()` hangs forever if the auth session is missing (early `return` leaves `loading=true`, no redirect, no error). FIXED.
- [HIGH] Onboarding Step 3 promised "5 default habits" with labels wired to nothing; the DB seeds 7 differently-worded habits → day-1 user sees a different list than promised. FIXED (list now mirrors seed_default_habits; copy says 7).
- [HIGH] Quiz XP farmable on every retake — edge function never dedupes `quiz_pass_*` and ignores the `is_first_attempt`/`prev_best` the client already sends, contradicting the Settings FAQ ("first attempt only"). FIXED in source (ledger dedupe per module + is_first_attempt fallback). DEPLOY FLAGGED.
- [HIGH] `/grow/build` "hard-lock" was client-only via a fail-OPEN accessor; no server/middleware/RLS gate. FIXED (added to middleware manager-only server gate).
- [MED] `module_complete` XP double-awardable via read-modify-write race on `learning_done`. FIXED (dedupe via immutable xp_ledger).
- [MED] Today Quick-Log awarded XP even if the `wins` insert failed (XP/counter desync). FIXED (check insert error before XP).
- [MED] Home `completeTask` removed the row optimistically with no error check → task silently "disappears" if the write fails. FIXED (clear only after confirmed write; revert + toast on error).
- [MED] Today cockpit/streak render against un-loaded progress (zeros flash before real values). CARRIED FORWARD.
- [MED] activity XP (call/demo/deal/win) has no per-day cap — farmable by paced clicks. FLAGGED (balance decision — recommend a daily cap mirroring drill_complete).
- [MED] B2C `impliedMonthlyDeals` feeds a subscriber-add count into the org "monthly_deal_goal" that Home/Today compare *closed deals* against → B2C rep looks perpetually behind. FLAGGED (unit/semantics decision).
- [MED] Broadcast send + manager role-change/invite are blocked by RLS but the UI reports success (dead features that lie). FLAGGED (need service-role edge functions / scoped RLS policies).
- [LOW] Coach page used a non-robust `first_name`-only greeting + inconsistent "Coach AI" naming + TargetIcon instead of the global CoachIcon. FIXED (fallback to name, "AI Coach", CoachIcon).
- [LOW] Several optimistic writes (shift prompt, auto-plan toast count, leaderboard rank>5) lack feedback/accuracy. CARRIED FORWARD.

Verified how: every finding traced to specific source lines by the review agents and re-checked before fixing; `npm run build` ✓ compiled successfully after all client + middleware edits. Edge-function edits are Deno (not in the Next build) — source-reviewed, deploy flagged.
Changes made (this cycle):
- src/app/(app)/coach/page.tsx — robust first-name greeting, "AI Coach" naming, CoachIcon.
- src/app/(auth)/onboarding/page.tsx — resilient finish() (try/finally, /login redirect, toast); habit list mirrors the 7 seeded; "AI Coach" copy.
- src/app/(app)/today/page.tsx — guard XP award on confirmed wins insert.
- src/app/(app)/home/page.tsx — completeTask clears row only on confirmed write.
- src/middleware.ts — server-enforce /grow/build as manager-only.
- supabase/functions/calculate-xp/index.ts — quiz + module_complete ledger dedupe (DEPLOY FLAGGED).
Not verified / carried forward: Today loading-state gate; the LOW optimistic-feedback items; Phase 4 on Learning/Sandler, Apex tabs, Notifications, Leaderboard, Resources (next cycles).
Flagged decisions (needs Philip):
1. DEPLOY the calculate-xp edge function to activate the quiz/module dedupe fixes (changes the live XP economy — your call).
2. Activity-XP daily caps (call/demo/deal/win farmable) — pick cap values or confirm mirroring the drill 5/day cap.
3. B2C goal-unit mismatch — subscriber-adds vs closed-deals feeding monthly_deal_goal.
4. Broadcast + manager role-assignment/invite need a service-role path or scoped RLS INSERT/UPDATE policies (currently silently blocked).
5. No automated test suite (from cycle 1).
Delight additions: none this cycle (correctness pass). Coach icon/name now consistent with the global Ask-Coach affordance — small but removes a "wait, is this the same coach?" beat.

