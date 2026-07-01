# Apex — QA Log

_Per master-prompt §8. Findings from the adversarial review pass + resolutions.
Build compiles clean; all pages are `// @ts-nocheck`, so this covers runtime /
logic / UX correctness._

## Findings & resolutions

| # | Sev | Finding | Resolution |
|---|---|---|---|
| 1 | High | Won partners double-counted: temperature buckets (hot/warm/cold) and `won` overlapped, so a signed-but-hot record showed as both Hot and Won and the funnel didn't sum. | `useGrowthOS.leads` now derives hot/warm/cold from `active` (excludes `opportunity_won`), keeping buckets + Won disjoint. Fixes the Lead Gen funnel strip, the Overview tile, and the GrowthChrome hot chip in one place. |
| 2 | Med | Automations "Set up now" routed a setup agent to `paused` — the primary CTA turned nothing on. | Relabeled to **Activate** and routed to `live` for one-tap activation, consistent with the ROI framing. |
| 3 | Med | Income goal couldn't be cleared: `saveGoals` only wrote `monthly_income_goal` when non-null, so blanking it diverged local state from the DB until reload. | Writes the column whenever the key is present in the patch (allows `null`), matching the deal-goal pattern. |
| 4 | Low | `useModuleKV.save` updater read `ref.current` (uncommitted), so two saves in one frame could drop each other (rapid config stepper taps). | Refactored to derive + persist inside a functional `setValue(prev => …)`, always off the latest committed state. |
| 5 | Low | `Insights(...)` was a capitalized component invoked as a plain function — a rules-of-hooks footgun if a hook were ever added. | Renamed to `computeInsights` to signal it's a pure helper. |

## Verified OK (suspected issues that were not bugs)

- Triage card borders and the Build mini-map / phase bars (dynamic-looking class +
  `currentColor`) render correctly for every tone.
- `hotStale` (chrome) ≡ leadgen `staleHot` ≡ `leadSuggestion` urgency, given
  `leadList`'s won→`converted` mapping — no drift; triage stays correct.
- `downloadPlaybook` SSR-guarded; `Countdown` interval cleaned up; income-rail
  `annualGoal` can't be 0/NaN (falsy income → fallback).
- No shared-array sort mutations. All Tailwind tokens + custom animations resolve.
- RLS safety: `setStatus` gates on `isManager` + full-row upsert
  (`onConflict: team_id,id`); reps get read-only UI; `saveGoals` never clobbers
  `monthly_deal_goal`.

## Apex mandate QA (RBAC, coach FAB, notes, CRM parity, feedback digest)

Adversarial review pass across the rename + CRM-parity + RBAC mandate. Findings
and resolutions:

| # | Sev | Finding | Resolution |
|---|---|---|---|
| 1 | High | `useCrmRecord.updateDeal` debounce sent only the last field's patch, so editing two deal fields within 500ms dropped the earlier write. | Accumulate edits in a `pendingDeal` ref and persist the merged payload; clear after write. |
| 2 | High | Contact `setPrimary` used `Promise.all` (clear-all + set-one could race → zero primaries); ContactsBoard's add path never set `is_primary`. | Sequential awaits (clear then set); ContactsBoard now marks the first contact of a company primary, matching the drawer. |
| 3 | Med | `/grow/build` briefly rendered the roadmap to a rep during perms load before the guard engaged (no data leak, but the manager surface flashed). | Render a neutral skeleton while `!ready`; only then branch to roadmap or lock. |
| 4 | Med | Fail-open `canView`/`canEdit` + client gates could be permissive if perms never load. | Verified NOT a hole — every privileged action is RLS-backed (bulk edits hit own-row policy; Assign owner needs the manager+team update policy). Client gates are UX-only; documented. |
| 5 | Med | FeedbackDigest 14-day buckets were anchored to now's time-of-day (bars drifted from calendar days); `limit(300)` capped silently. | Anchor buckets to local midnight; show a "latest 300" note when capped. |
| 6 | Low | `useModuleKV.save` no-op'd if the user id hadn't loaded (a toggle in the first ~100ms was lost). | `persist()` resolves the uid inline when missing, so early saves still write. |
| 7 | Low | AI-suggest streaming had no abort/mounted guard → setState after unmount when the drawer/modal closed mid-stream. | AbortController aborted on unmount + a mounted-ref guard on the stream's setState. |

Verified NOT bugs: weighted-value NaN guards, won-excluded temperature counts, funnel monotonicity + division guards, embedded null-company rendering, coach FAB tap-vs-drag, `saveGoals` column preservation.

## Regression / integration

- All six `/grow` routes compile and are reachable; GrowthTabs active-state correct.
- Existing modules untouched; the coach route addition is additive (reads Growth
  OS state into context).
- Security advisors re-run after every migration: zero new findings (only the
  pre-existing shared SECURITY-DEFINER helpers + the auth leaked-password setting).

## Autonomous deep-QA + polish pass (multi-agent audit → fixes shipped to prod)

Ran a fleet of parallel adversarial agents (correctness sweeps of every
unaudited module, a11y+perf audit, UX/"magic" audit, CRM-gap ideation), then
implemented and shipped the findings across several build-verified waves. All
pushed to `main` (production) + the working/designated branches. Two DB
migrations applied to prod and verified under real auth.

### Correctness (data-safety)

| # | Sev | Finding | Resolution |
|---|---|---|---|
| 1 | High | `LeadsBoard.bulk()` ignored the update error, then cleared the selection + reloaded — a failed bulk stage/temp/owner change snapped back with no feedback. | Capture `error`, toast, keep the selection to retry; reload to resync. |
| 2 | High | `LeadDrawer` deal edits were never refetched into the board, so the weighted-pipeline / forecast numbers stayed stale until a full reload. | `useCrmRecord` takes an `onSaved` callback; the drawer passes the board's `reload`, fired after each committed write. |
| 3 | High | Debounced deal write was dropped on fast drawer close / lead-switch (no flush on unmount or partnerId change). | `flushDeal` runs from a cleanup effect keyed on partnerId and clears the timer; buffered edits always persist. |
| 4 | High | `setPrimary` (drawer + ContactsBoard) could leave a company with zero primaries if the second write failed; add/remove contact + activity swallowed errors. | Error-check + roll back optimistic state on every path; toast on failure. |
| 5 | High | Manager broadcast history read `notifications WHERE type='broadcast'`, but RLS only exposes own rows → history always empty; the atomic fan-out could reject on one stale recipient. | New team-scoped `broadcasts` table + RLS for history w/ real recipient count; roster re-fetched at send time. |
| 6 | Med | `team_leaderboard.pipeline_weighted` wasn't windowed by `p_since`, so lifetime pipeline polluted Today/Week ranks. | Window it by `created_at` like the other metrics; verified all-time + windowed under real auth. |
| 7 | Med | Manager analytics: funnel conversion could exceed 100%; untriaged (null-temperature) leads folded into "cold" and cratered the cold close-rate. | Clamp conversions at 100%; count only explicitly warm/cold leads. |
| 8 | Med | Notes sidebar reordered on every keystroke (active note jumped to top mid-word). | Update in place; the list re-sorts by updated_at on next load. |
| 9 | Low | Schedule block save / task patch / toggle / custom-block create, manager XP-rule toggle + save, manager resources add/delete all swallowed write errors. | Error-check with toast + refetch/rollback; XP-rule editor keeps the typed value on a failed save. |

### Accessibility & performance

- WCAG: aria-labels on the XP save/edit icon buttons, coach message box, and
  global search; `role="switch"` + `aria-checked` on the XP ON/OFF toggle;
  `role="alert"` on the login error.
- Focus management: Modal moves focus into the dialog on open and restores it to
  the trigger on close; Escape now closes the CoachDock drawer and the mobile
  "More" sheet.
- Fixed stacking `setTimeout` in the Sandler XPToast/BadgeToast (missing dep
  array); memoized leaderboard scoring/sort so the 25s poll doesn't re-score the
  roster each render.

### Polish & delight (magic)

- Route transitions: a 250ms fade-up replays per navigation (reduced-motion safe).
- Quick Log: logging an activity floats a +XP burst from the tapped tile; closing
  a Deal rains confetti (new global `triggerConfetti`/`ConfettiLayer`).
- Toasts animate out + carry a time-remaining countdown bar; the #1 leaderboard
  champion's avatar bobs.
- Theming: `card-active` / `callout-tip` / `callout-warn` used hardcoded teal/gold
  that no longer matched the themeable `--teal`/`--gold`; now token-driven so
  tints track every theme. Added rank-flash / belt-confetti / check-draw /
  xp-float / fade-up to the reduced-motion disable list.
- Resources search now filters the People Map too and shows a real "no matches"
  state; mobile bottom-nav active dot correctly anchored to its item.

### Known follow-ups (deliberately deferred — need a visual/product call)

- Systemic small `text-navy` contrast on dark surfaces (~3.1:1) fails AA. The
  brand-safe fix (split text vs fill; map navy *text* to `--navy-mid`) touches
  ~160 usages and changes the default brand look, so it wants a visual sign-off
  rather than a blind mass-edit.
- Larger CRM-gap features scoped by the ideation agent (command palette / global
  quick-add + hotkeys, action-taking coach via tool-use, Partners-board parity
  with LeadsBoard, milestone/achievement celebrations, PWA install nudge) are
  ready-to-build but were left as feature work, not this correctness/polish pass.

## Feature build wave (deferred features → shipped)

Built and shipped the deferred feature set on top of the QA/polish pass. Each
was build-verified and pushed to main + branches; migrations applied to prod and
advisor-checked (only the pre-existing benign SECURITY-DEFINER + leaked-password
WARNs remain).

- **Editable Resource Center** — every tool/person/library-doc/roadmap phase is
  manager add/edit/delete inline (icon + color pickers), persisted to a
  team-scoped `team_resource_items` table (RLS: team reads, managers write).
  Reps get a clean read-only view; defaults render until a manager "Customizes".
- **Theme-aware navy-ink text token** — small navy text now passes WCAG AA on
  every theme without changing brand fills (`text-navy` → `text-navy-ink`).
- **⌘K command palette** — commands (new task/note, log call/demo/deal, ask
  coach, toggle theme/sidebar, tour, jump-to) + live search; global hotkeys
  (t/n/c/[/g-then-key/?) guarded against firing in inputs; `?` cheatsheet.
- **Achievements** — 18 badges (calls/demos/deals/streak/XP), a MilestoneWatcher
  that celebrates new unlocks once (deduped, first-run baselined), a badge wall
  on Progress with locked-badge progress bars.
- **Streak freezes** — `user_progress.streak_freezes`; calculate-xp (v6) earns a
  freeze per 7-day multiple (cap 3) and spends one to bridge a single missed day
  (+ notification); shown as a shield on the streak card.
- **Partners board parity** — search + sort + List⇄Board (stage columns w/
  click-to-move) + `next_followup_date` (add modal, detail editor, overdue
  badge) fed into the priority engine as a top next-best-action.
- **Action-taking coach** — proposes a confirmable action directive; the dock
  hides it from the chat and shows a confirm card that runs the RLS-backed write
  (create task/note, set goal, log activity, set partner follow-up).
- **PWA install nudge** — beforeinstallprompt banner + iOS add-to-home hint,
  hidden when standalone, dismissal persists.
