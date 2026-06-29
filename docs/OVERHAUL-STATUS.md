# Overhaul status — IA / links / AI-forward / redundancy pass

From the 4-reviewer audit (IA & clicks, learning content, AI coaching, Outlook + code).
Branch: `claude/affectionate-volta-v1qqa6`. Active Supabase: `bdr-os-v2` (`zbgimoasdqqprymbykqb`).

## Shipped (committed + build-verified)
1. **Mobile reachability** — BottomNav "More" sheet exposes all Tools/manager routes + Notifications/Settings (7 routes were unreachable on phones). Shared `TOOLS_NAV`. Fixed broken `/settings/profile` → `/settings`.
2. **Link registry + partner cockpit** — `src/lib/links.ts` (single source for external URLs; `placeholder` flags generic homepages). Partner checklist tasks now render "Open <system>" launch buttons (HubSpot/PartnerHub/Stripe/Onit).
3. **Unified activity log** — Today's Quick Log now writes the same `wins` record the Wins page reads (was a silent XP-only tally that diverged).
4. **Home inline habits + Grow retired** — top incomplete habits completable in 1 tap on Home; Grow folded (belt-journey ladder moved to Certificate; route + nav entry removed).
5. **AI-forward coaching** — shared `buildUserContext()` feeds all coach modes; coach prompt gains pipeline funnel + shift/day structure; drill feedback belt-calibrated; won drills auto-surface feedback; "Discuss with Coach" bridge pre-seeds Coach via sessionStorage.
6. **Daily Rhythm notes + Outlook foundation** — `schedule_blocks` table (per-user/day, owner-RLS, `graph_event_id` hook) applied live; per-block notes editable in-tool (offline); "Connect Outlook — Soon" affordance.
7. **Proactive Home nudge** — block + pipeline-aware one-liner in the "Right now" card.
8. **Module → tool links + naming** — lesson `links` blocks render internal routes as same-tab SPA nav; added tool tie-ins (Modules 2→Today, 3→Partners, 3 L3 + 13→Drill, 5→Partners/Onit, 6→Partners, 8→Daily Rhythm/Nextiva); standardized "ONIT"→"Onit" across titles + content.
9. **Editable block times** — per-block start/duration overrides on the Daily Rhythm (persisted to `schedule_blocks`), with "edited" marker + Reset.

## Remaining (next passes)
### Needs a focused build pass (no user input required)
- **Content dedup** (DB, judgment-heavy): consolidate Module 5 ↔ Module 9 (5 is the canonical order-form procedure; 9 is a generic re-narration — merge or convert 9 to a cross-linked checklist); remove the "discovery beats objections" tip from 3 of its 4 lessons; make Module 4 L1 contacts defer to Module 12; reconcile pipeline stage names between Module 3 and `partnerChecklist.PIPELINE_STAGES`.
- **Code cleanup** (edge redeploy via MCP): `calculate-xp` should import helpers from `supabase/functions/_shared/cors.ts` (currently re-declares them); consolidate belt thresholds (duplicated in calculate-xp / insights / coach route — keep edge fn authoritative); merge `getDaysSince`/`daysSince`; finish or mark the `send-notification` web-push stub.

### Blocked on the user
- **Outlook live sync** — Azure/Entra app: `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_TENANT`; redirect URI `https://<app>/api/calendar/callback`; delegated scopes `Calendars.ReadWrite offline_access User.Read`. Then build `calendar_connections` table (token-encrypted, owner-RLS), `/api/calendar/{connect,callback,events,disconnect}`, refresh handling, block↔event mapping. (Full design in the reviewer notes / chat history.) Cannot be tested from this egress-restricted env.
- **Real deep-link URLs** to replace placeholders in `src/lib/links.ts`: HubSpot deal pattern, Stripe onboarding, Nextiva click-to-call scheme, Slack per-user IDs, doc URLs.
- **Thin module content** (do not fabricate): Module 7 commissions/pricing/promos + rates; Module 8 Nextiva setup; Module 13 competitive battlecard (Array/IDIQ specifics); Module 11 product specs.
- **Goals/commissions tool + Sandler course** — see `docs/HANDOFF-commissions-and-book-trainings.md`. Coach already has a `buildUserContext` seam to ingest goals once the table exists; the `goal_plan` mode (deterministic $→daily-activity math, LLM framing) is designed and ready to add.
