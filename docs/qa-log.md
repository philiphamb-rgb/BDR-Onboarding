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
