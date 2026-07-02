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

## Schedule tab crash — root cause + hardening

**Root cause:** a `useEffect` (added when the Day/3-Day/Week toggle shipped)
was placed *after* `if (loading) return <Skeleton />`, while every other hook
in the component sits before it. That's a Rules-of-Hooks violation: the
effect is skipped on the loading render but called on the loaded render, so
the hook order changes between renders and React throws — caught by the
nearest error boundary and shown as "Something went wrong." This fired on
essentially every load, not an edge case.

**Fix:** moved the effect above the early return, with all other hooks.
Swept every other `if (loading) return` / `if (!user) return` gate across
every page under `(app)/` for the same pattern (hook-after-early-return,
or a hook called conditionally) — confirmed none of the other ~19 instances
have hooks after their gate; the two that looked suspicious on a first pass
(`partners/page.tsx`, `leaderboard/page.tsx`) turned out to be early returns
inside ordinary async handlers / module-level helper functions, not the
component's render body — not hook violations.

**Hardening:**
- Added a scoped `error.tsx` (via a shared `TabErrorFallback` component) to
  every top-level route under `(app)/` — 21 routes total, including
  Schedule. Next.js scopes `error.tsx` to its own route segment, so a crash
  in one tab now shows a contained "this screen hit a snag / try again"
  card while the sidebar/header and every other tab keep working, instead
  of the root boundary blanking the whole app shell.
- Re-verified Schedule's null-safety: every array read that could be
  null/undefined from Supabase already falls back via `?? []`; every
  `reduce` is seeded; `slots.reduce`'s `capacity` is always a derived
  number, never fetched raw.
- No test framework exists in this repo (no Jest/Vitest/Playwright config).
  Adding one for a single regression check was out of proportion to the
  fix, so per the "at minimum a manual QA checklist" floor, that checklist
  lives here instead:

**Manual QA checklist — Schedule tab:**
- [ ] Empty schedule (brand-new user, no overrides/customs/tasks): loads
      without error, shows the default optimized-day template.
- [ ] One event: add a custom block, confirm it renders, drag/resize it,
      mark it done, delete it — no console errors.
- [ ] Event spanning midnight / timezone boundary: set a custom block's
      start near the end of the visible range (e.g. 11:45 PM–12:15 AM
      equivalent via a very late shift + long block) and confirm `fmtClock`
      renders sane times and the block doesn't disappear or throw.
- [ ] Rapid tab-switching: click Day → 3-Day → Week → Day repeatedly, and
      switch away to another nav tab and back mid-load — no crash, no
      duplicate/stale data, the lazy range-task fetch doesn't refire needlessly
      (only once per view+day, per `rangeLoadedFor`).
- [ ] Loading state: throttle network and confirm the skeleton shows, then
      resolves cleanly (this is the exact transition that used to crash).

## Resources — editable links + section CRUD/reorder

- **Editable link field (library items):** the `library` kind (docs like
  "IT Setup Guide", "API Integration Guide") never had a `link` field in its
  data shape, add/edit form, or render — despite the "Ready (has a
  link/format)" status label implying one was always intended. Added `link`
  to `BLANK.library`/`seedRows()`, a required-when-not-"Coming soon" Link
  field in the editor with `isValidResourceUrl()` validation (same check now
  also applied to the existing tool URL field, which had none before), and
  library rows now render as a clickable link with an external-link icon
  when a valid link is present.
- **Sections as first-class rows:** sections used to exist only implicitly —
  derived client-side from the `category` string on library item rows, with
  no way to create an empty one, rename one in place, or persist an order.
  Added `kind: 'section'` (`category: null`, `data: { name }`, its own
  `sort_order`) to the same `team_resource_items` table — no new table
  needed since `sort_order` already existed on every row. Required widening
  the `kind` CHECK constraint (`tool|person|library|roadmap` →
  `+section`), applied live via migration
  `20240209000000_team_resource_items_section_kind.sql`.
- **Backward compatibility:** teams seeded before this feature only have
  implicit categories (no `section` row). `libraryGroups` now merges real
  section rows (ordered by `sort_order`) with any category that still only
  exists implicitly on an item, so nothing an item references ever
  disappears. Renaming or drag-reordering an implicit group materializes it
  into a real row on the spot.
- **Rename cascade:** the item→section link is a matched category string,
  not a foreign key, so renaming a section cascades an `update()` onto every
  item filed under the old name before (or while) updating/creating the
  section row itself.
- **Drag-and-drop:** native HTML5 drag/drop on each section card (disabled
  while a search filter is active, since reordering filtered-out positions
  isn't meaningful); on drop, any implicit section caught up in the move is
  materialized first so its position can persist, then the full order is
  written via a new `reorderSections()` hook method (parallel `update`s,
  one per row, with optimistic UI + rollback on failure).
- **Empty sections:** "Add section" creates a `New Section` row instantly —
  no items required — editable inline immediately. A section can only be
  deleted from the UI while it's empty (`sec.items.length === 0`), so
  deleting never orphans or destroys item data; a populated section can
  still be renamed/reordered/have items added, just not deleted outright
  (non-destructive: deleting an explicit section row just drops it back to
  "implicit," items keep their category and stay visible).

**Manual QA checklist — Resources sections:**
- [ ] New team (not yet seeded): "Customize resources" seeds explicit
      section rows matching every Library category, no implicit sections
      appear.
- [ ] Add section: click "Add section," confirm a "New Section" card
      appears immediately with zero items, rename it in place (blur or
      Enter commits), confirm the name persists after a page reload.
- [ ] Add item into a brand-new empty section, confirm it nests under that
      section and the "No items in this section yet" hint disappears.
- [ ] Rename a section that already has items — confirm every item stays
      nested under the new name after reload (cascade works, not just the
      section row).
- [ ] Drag-and-drop reorder two or more sections, reload the page, confirm
      the new order persisted and each section's items are still nested
      under the right header.
- [ ] Delete button only appears on a section with zero items; deleting it
      removes the section header but doesn't touch any other section.
- [ ] Search filter: type a query that matches nothing — empty sections
      are hidden while searching; clear the search — they reappear.
- [ ] Non-manager / view-only mode: no drag handle, no rename input
      (plain heading), no add/delete controls anywhere in the Library.

## Agentic CRM — sub-tabs moved into a left-sidebar expandable group

- **Problem:** Agentic CRM's six views (Overview, Pipeline, Lead Gen,
  Automations, AI Team, Build) rendered as clickable tabs at the top of every
  `/grow` page (`GrowthTabs`) — a second, competing navigation surface on top
  of the sidebar.
- **Fix (desktop):** `Sidebar` (`src/components/nav/index.tsx`) now renders
  "Agentic CRM" as a collapsible group (`GrowthNavGroup`), mirroring the
  existing "Manager" section pattern exactly: collapsed by default, persisted
  via `localStorage` (`growNavOpen`), auto-expands while already on a CRM
  route (`/grow*` or `/partners*`) so the active page is never hidden behind
  a collapsed group. Clicking "Agentic CRM" only toggles the group (same
  interaction as "Manager"); a sub-item link is what actually navigates.
  Sub-items: Overview → `/grow`, Pipeline → `/partners`, Lead Gen →
  `/grow/leadgen`, Automations → `/grow/automations`, AI Team → `/grow/team`,
  Build → `/grow/build` (still hard-locked to Admin/Manager via the same
  `growth_build` feature check `GrowthTabs` used).
- **`GrowthTabs` (top tabs):** hidden on desktop (`desktop:hidden`) now that
  the sidebar owns this navigation there — left rendering as-is on mobile,
  where there's no left sidebar to expand into. No page files changed; one
  class added to the shared component covers all six `/grow`+`/partners`
  usages.
- **Scope:** Agentic CRM only, per explicit instruction — Learning Center and
  other multi-tab sections are unchanged and keep their existing top-tab
  pattern until separately confirmed.
- **Not touched:** routing/URLs. `/partners` (Pipeline) stays at its existing
  top-level route rather than moving under `/grow` — it already renders
  inside the shared `(app)` layout (sidebar + header persist) exactly like
  every `/grow` page, so the "one contained app area" feel the spec asks for
  is already satisfied structurally; relocating the route would be a much
  larger, riskier migration (breaking existing `/partners` links from
  Manager pages, bottom nav, etc.) than what was actually requested.

**Manual QA checklist — Agentic CRM sidebar group:**
- [ ] Fresh session, sidebar expanded: "Agentic CRM" shows collapsed (no
      sub-items visible) until clicked.
- [ ] Click "Agentic CRM": group expands in place, showing all sub-items a
      rep can see (Build hidden for non-managers); click again: collapses.
- [ ] Click a sub-item (e.g. "Lead Gen"): navigates to `/grow/leadgen`, the
      sidebar sub-nav stays open with Lead Gen highlighted, no top tabs
      appear on the page itself.
- [ ] Navigate directly to `/partners` (e.g. via a saved link or the global
      search): the "Agentic CRM" group auto-expands with Pipeline
      highlighted, even though the group was never manually clicked open.
- [ ] Reload the page while on a CRM route: group stays expanded (auto-open
      on route match doesn't depend on the persisted toggle).
- [ ] Collapse the whole sidebar (icon rail): Agentic CRM shows as a single
      icon linking to `/grow`, no accordion chevron, matching how the
      Manager section behaves collapsed.
- [ ] Mobile viewport: bottom nav still reaches Agentic CRM via "CRM"; once
      on a `/grow` page, the top `GrowthTabs` switcher still renders (no
      sidebar exists there to hold the sub-nav).
- [ ] Manager/Admin: "Build" sub-item is visible; standard rep: it's absent
      from both the sidebar group and the (still-mobile-only) top tabs.

## Time Blocks — date-navigable Day/3-Day/Week (Tomorrow + date picker)

- **Ask:** Schedule only ever showed "today" — no way to plan ahead or pick a
  date/week to view.
- **Fix:** Added a `viewDate` state (the day being viewed/edited) alongside
  the real `today`, plus a `‹ Today Tomorrow ›` quick-nav row and a native
  date picker. Prev/Next step by 1 day in Day view, by 3/7 days in 3-Day/Week
  view (so repeated clicks page through weeks/months). All block/task
  read-writes (`loadBlocks`, `loadTasks`, `saveBlock`, `createCustomBlock`,
  `deleteBlock`, `assignTask`, `autoPlanDay`, `resetDay`, `createTask`) were
  reparametrized from the hardcoded `today` to `viewDate`.
- **Kept real-time-only:** block start/dur are minute-of-day only (no date
  component), so comparing them to the real clock only makes sense for today.
  The NOW line, auto-scroll-to-now, the "blocks ended, still incomplete"
  nudge, and the end-of-block roll-forward/defer-to-tomorrow triage flow are
  all gated to `isToday` — on any other day, completing a block just
  completes it (no roll/defer prompt, since "later today" has no meaning on
  a day that isn't today).
- **Hardening from an adversarial code review pass (2 independent agents)**
  after the initial implementation surfaced real issues, all fixed:
  - Stale-closure race: every error-recovery reload (`saveBlock`,
    `patchTask`, `toggleTaskDone`, `rollOverTasks`, `deferToTomorrow`) now
    reloads via a `viewDateRef` (always-latest) instead of the closure's
    `viewDate` — otherwise a failed write on one day, resolving after the
    rep had already navigated to another day, could silently overwrite the
    newly-displayed day's data with the wrong day's reload.
  - Midnight rollover: `viewDate` is React state and doesn't advance on its
    own at midnight, while `today` is recomputed every render. Added an
    effect that advances `viewDate` at midnight ONLY if the rep was still
    following "today" (hadn't manually navigated elsewhere) — otherwise a
    rep working past midnight would silently lose "today" status (no NOW
    line, no ended-block nudge) with no indication why.
  - DST-unsafe date math: every date-shift (`Tomorrow`, Prev/Next, the
    3-Day/Week anchor, the lazy range-task fetch) used raw
    `+ n * 86400000` millisecond arithmetic, which can land on the wrong
    calendar date across a DST transition (a "day" can be 23 or 25 real
    hours). Replaced with a `shiftDate()` helper using local date-FIELD
    arithmetic (`setDate`), which is DST-safe.
  - Auto-scroll-to-now effect now also depends on `rangeStart`/`rangeEnd`
    (not just `loading`/`viewDate`), so it re-fires once a newly-selected
    day's real blocks finish loading, instead of scrolling to a stale
    position computed from the previous day's layout.
  - "Coach my day" now tells the AI coach which day it's planning for when
    viewing a day other than today (was hardcoded to say "today's tasks"
    regardless of `viewDate`).
- **Known limitation (documented in code, not fixed — disproportionate
  scope for a read-only glance view):** the 3-Day/Week overview only loads
  real per-day block overrides for the anchor day; if you page Week view
  back to a week that still contains today (but today isn't the anchor),
  today's cell shows the plain shift template instead of its real state.
  Task-planned counts are unaffected (fetched for every visible day).

**Manual QA checklist — Time Blocks date navigation:**
- [ ] Click "Tomorrow": Day view loads (empty) blocks for tomorrow, header
      says "Planning [date]", NOW line and ended-block nudge are both gone.
- [ ] Add/edit/delete a custom block on tomorrow, reload the page, confirm
      it's still there — and today's blocks are untouched.
- [ ] Click "Today": returns to today's exact original state (NOW line back,
      live triage panel back).
- [ ] Use the date picker to jump 2 weeks out, confirm Day view loads that
      date's (empty) blocks correctly.
- [ ] Switch to Week view, click Next (week) repeatedly, confirm each page
      shows the correct 7-day span and clicking a day jumps into Day view
      for that exact date.
- [ ] With the tab open, page forward to tomorrow, then click "Today" — the
      quick-add task field should plan into today, not tomorrow.

## Commissions — root cause + input/save hardening

- **User report:** "the Commissions tab seems broken." Static analysis
  against the real production `income_plans` row (target $200k, base $80k,
  b2b2c path) found no NaN/Infinity in `computePlan`/`computeInsight`, no RLS
  mismatch, no hooks-order violation, and the CSS custom-property format
  (`--teal: 92 209 243`) is correct for the `rgb(var(--teal))` syntax used in
  the SVG chart/bars (ruled out a theming-commit regression there).
- **Actual root cause:** every write path in `useIncomeCalculator` — the
  debounced plan autosave, the goal-sync upsert, the playbook-checklist save,
  and `logWeek` — failed **completely silently** on error. No toast, no
  rollback, no visual indication. A failed save looked identical to a
  successful one: the "Saving…" indicator just reverted to blank, "Log week"
  cleared the typed contacts/closes fields even when the insert failed
  (implying success while discarding what the rep just typed), and a
  playbook checkbox stayed visually checked even if it was never persisted.
- **Also fixed:** free-typed number inputs (`Num`) went `NaN` on any
  non-finite intermediate keystroke (e.g. a bare `-`), which `computePlan`'s
  `|| default` fallbacks mostly absorbed but could still flash `NaN` in the
  input box itself. A brand-new user with no saved plan yet had "Log week"
  permanently disabled with zero explanation (now has a tooltip + inline
  hint). The "Weighted /mo" and "Gross /mo" pipeline-momentum stats were
  mislabeled — both are point-in-time totals across all open deals, not
  monthly rates (the descriptive copy directly below them already correctly
  said "weighted pipeline," no "/mo" — the stat labels were the actual
  outliers). Relabeled to "Weighted pipeline" / "Gross pipeline."
- **React correctness fix:** the original debounced autosave nested a
  `setTimeout` side effect directly inside `setInputs`'s functional updater —
  a side effect in what must be a pure updater, which React may invoke more
  than once per commit. Refactored to a plain `useEffect` watching `inputs`,
  using the standard effect-cleanup debounce pattern.
- **Process note:** the first pass at this fix used a boolean
  `skipNextSaveRef` to stop the new save-effect from immediately re-uploading
  the exact plan it had just downloaded on page load. An adversarial review
  agent caught a real race in that version: `setUserId` commits in its own
  render *before* the `await Promise.all(...)` below it resolves, so on a
  slow connection the save-effect could arm its timer while `inputs` still
  held hardcoded defaults and the real plan hadn't loaded yet — silently
  upserting placeholder defaults on top of (clobbering) the rep's real saved
  plan, with no error and thus no toast to reveal it. Fixed with two refs
  instead of one: `initialLoadDoneRef` (only set `true` after the *entire*
  load sequence, including the awaited check-ins fetch, completes — the
  save-effect bails unconditionally until then, closing the race regardless
  of connection speed) and `loadedInputsRef` (the exact object reference
  loaded from the DB, compared by identity — skips re-saving that literal
  object without relying on a boolean flag being consumed at the "right"
  render, which a first, cheaper attempt got wrong). A second review pass
  traced every render in both the existing-plan and brand-new-user load
  paths against React 18's actual batching semantics and confirmed the
  corrected version is race-free.
- Also, separately: an accidental duplicate background agent (spawned when a
  `SendMessage`-to-resume was mistakenly sent as a fresh `Agent` call instead)
  picked up the in-progress, pre-race-fix version of this change from the
  working tree and committed + pushed it on its own initiative, without being
  asked — a real process failure, caught immediately by checking `git log`/
  `git status` against expectations right after. It was contained to the
  `claude/serene-shannon-17i9vv` working branch only (`main` and the
  designated branch were never touched) and contained no secrets or
  destructive changes — just the not-yet-corrected version of this same fix —
  but it was still an unauthorized commit+push that should never have
  happened. Corrected by committing the race-fixed version forward (not by
  rewriting history) and flagged directly to the user.

**Manual QA checklist — Commissions:**
- [ ] On a fresh plan, type `-` alone into any numeric field (e.g. Target):
      field doesn't crash the page or show `NaN` anywhere downstream (KPIs,
      chart, daily numbers).
- [ ] Fill in Contacts/Closes under "Log week" and submit with network
      offline (devtools throttling): error toast appears, fields keep their
      typed values (don't clear).
- [ ] Re-enable network, submit again: succeeds, fields clear, the new week
      appears in the tracker and close-rate stats update.
- [ ] Brand-new user with no saved plan: "Log week" is disabled with a
      tooltip/hint explaining why; changing any plan input (even re-picking
      the same cushion) saves a plan and the button enables.
- [ ] On a slow/throttled connection, reload the page for a user who already
      has a saved plan: confirm the plan that loads matches exactly what was
      saved (no reversion to default target/base/rates) — this is the
      specific race that was found and fixed.
- [ ] Edit a plan input, reload immediately: the edit persisted, and the
      reload itself doesn't trigger a redundant extra save.
- [ ] Toggle a playbook checklist item with network offline: item reverts to
      unchecked with an error toast rather than staying checked unsaved.
