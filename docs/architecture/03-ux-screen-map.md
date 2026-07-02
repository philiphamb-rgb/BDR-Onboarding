# UX Screen Map, Flows & Component Inventory

> The 9 core screens (`15`) specified page-by-page, the 4 primary flows, and the
> shared component inventory — all held to the beginner-proof standard (`01`, `09`):
> one job per screen, one primary action, plain words, progressive disclosure.

---

## 1. Screen specs

### 1.1 Home — Command Center  `(/home, EVOLVE)`
**Job:** "What do I do right now?" **Primary action:** the single top move.
- Coach summary line (today, in one sentence).
- Goal progress (the shared `GoalCockpit`, already built).
- The one Priority Action (reuse the single Priority Action component — §3).
- Today's plan (tasks time-blocked), urgent pipeline items, today's 2 content tasks.
- Live team status strip (agents live, current focus) → Agent Office.
- Beginner mode hides CRM/Team depth; shows Coach plan + content task only.

### 1.2 CRM Workspace  `(/crm/*, NEW + evolve /partners)`
**Job:** manage everyone and every deal. **Primary action:** work the top record.
Tabs: **Leads · Contacts · Accounts · Opportunities · Pipeline (partners) · Activities.**
- List views with saved filters (reuse `LeadsBoard` patterns), each row carrying an
  AI-native enhancement (summary, urgency, next step).
- Record drawer: timeline + AI summary + recommended next step + auto-draft outreach.
- Pipeline = today's `/partners` Kanban, generalized to deals **and** partner stages.
- Empty states everywhere with a real CTA (the standard already applied in Part 1).

### 1.3 Agent Office  `(/team, EVOLVE /grow/team)`
**Job:** see and run your AI company. **Primary action:** open the agent you need.
- Org chart (reporting + handoff) — today's view, deepened.
- Office map (NEW) — living desks, avatars, live status, current task, queue count.
- Agent profile drawer — the 18 fields, editable prompt, quality/run stats.
- "Set up your full AI team" wizard with real progress (evolve today's card).

### 1.4 Chat & Boardroom  `(/team/rooms, NEW)`
**Job:** think with your team. **Primary action:** start the right room.
- 1:1 threads, group rooms, boardroom, war room, office hours (`06`).
- Smart agent suggestions ("who should be in this?"), saved meeting templates.
- Shared transcript, @mentions, "ask everyone vs ask one," live streaming turns.
- Every room ends producing a structured meeting output (summary/decisions/owners/
  next actions/deadlines/CRM links/memory candidates) → written to `meeting_outputs`.

### 1.5 Content Studio  `(/studio, EVOLVE /grow/content)`
**Job:** publish 2 pieces today with minimal friction. **Primary action:** pick today's post.
- Today's 2 recommended posts (ranked by EV, from `content_ideas`).
- Idea → Script → Post builder (the simple 8-step flow from `07`).
- Repurposing lab: one podcast/long-form → reels/clips/quotes/carousels/text/DMs.
- Social proof shelf, publishing prep checklist, performance review.
- Beginner flow: Home → pick post → generate package → publish checklist → engage.

### 1.6 Funnel Lab  `(/funnel, EVOLVE /grow/leadgen)`
**Job:** turn attention into qualified partners. **Primary action:** advance the hottest lead.
- Lead routes, conversion logic, nurture paths (visual).
- SmartCredit fit logic + partner qualification scoring (`08`).
- The score→action routing already built, extended with fit scoring.

### 1.7 Coach Center  `(/coach, EVOLVE)`
**Job:** clarity, plan, accountability. **Primary action:** get today's plan.
- Goals across 5 horizons (annual→daily), each tied to revenue/content/outreach/partner/habit.
- Daily plan, weekly review, growth plans, motivational nudges, warnings, pivots.
- Reads goal data + CRM + pipeline + content + engagement + partner + meetings + memory.
- The coach "knows me / my business / gives clarity / pushes me forward" (`04`).

### 1.8 Memory Lab  `(/admin/memory, NEW)`
**Job:** govern what the system believes. **Primary action:** clear the review queue.
- PR-style review queue: approve / edit / reject / defer / rollback / compare versions.
- Promoted memories, trust dashboard, decay management, lineage tools.
- Admin/manager only (RBAC); the operator's governance seat.

### 1.9 Analytics  `(/analytics, EVOLVE)`
**Job:** know what's working. **Primary action:** act on the biggest gap.
- CRM metrics, partner metrics, content metrics, agent metrics, memory metrics.
- Memory observability views (timeline/graph/lineage/retrieval/health) live here or in Memory Lab.

---

## 2. Primary flows (`15`)

**Beginner Daily:** Home → Coach plan → Content task → Post builder → Publish checklist → Engagement checklist → End-of-day review.

**Revenue:** Home → CRM pipeline → lead/partner record → suggested next action → outreach/meeting → follow-up/activation.

**Team:** Agent Office → select agents → Boardroom → action plan → task generation → CRM/content execution.

**Governance:** Memory Lab → review queue → approve/edit/reject → trust update → observability dashboards.

**Onboarding (first-run, `09`):** 6 questions (goal / business / content experience /
channels / revenue goal / desired AI support) → app configures coach style, content
plan, dashboard priorities, daily checklist, suggested agents → first-win path (first
goal → first idea → first script → first post → first daily plan).

---

## 3. Component inventory (shared, build once)

Reuse-first. Bold = already exists and is reused/extended.

| Component | Used by | Status |
|---|---|---|
| **PriorityAction** (single "do this now") | Home, Today, CRM records | consolidate existing duplicates → one |
| **GoalCockpit** | Home, Today, Coach, Analytics | exists |
| **RecordDrawer** (timeline + AI summary + next step) | all CRM entities | new (generalize LeadDrawer) |
| **ListBoard** (filters, saved views, bulk ops) | Leads/Contacts/Accounts/Opps | exists (LeadsBoard) → generalize |
| **KanbanBoard** | Pipeline | exists (PartnerBoard) → generalize |
| **AgentCard / AgentProfileDrawer** | Agent Office | exists → deepen to 18 fields |
| **OrgChart / OfficeMap** | Agent Office | org chart exists; office map new |
| **RoomThread** (chat + streaming turns + @mentions) | Chat & Boardroom | new |
| **MeetingOutputCard** | rooms, CRM, memory | new |
| **ReviewQueueItem** (approve/edit/reject/rollback/diff) | Memory Lab | new (growth_instruction_proposals is precedent) |
| **StatusBadge** (clickable → meaning + next step) | everywhere | exists (made clickable in Part 1) |
| **EmptyState** (icon + why + CTA) | everywhere | exists |
| **CoachDock** (pocket coach FAB) | global | exists |
| **TrustMeter / DecayChip** | Memory Lab, agent cards | new |
| **MetricTile / Sparkline** | Analytics, dashboards | exists |

Design language stays: navy/teal/gold, Inter, one primary teal CTA per screen,
destructive=red, the strict type scale and card consistency from Part 1's master
principles. Adds the "living office" visual metaphor for the Team layer only.

---

## 4. Beginner ↔ operator disclosure

- **Beginner surface** (default post-onboarding): Home, Do (Today/Tasks), Coach, Content Studio.
- **Reveals as used:** CRM Workspace, Funnel Lab, Agent Office, Chat & Boardroom.
- **Operator/admin only:** Memory Lab, full Analytics, Manager tools, agent prompt editing.
Onboarding answers set the initial visibility; a "grow into it" nudge unlocks the next layer as milestones are hit.
