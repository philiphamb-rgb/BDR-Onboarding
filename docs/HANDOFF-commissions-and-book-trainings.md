# Handoff — Commissions/Goals + Sandler Book-Training modules

> Context brief for the next chat session. The repo is cloned fresh each session, so
> read this first. It captures the plan, the current architecture, and exactly where
> to plug in. Active Supabase project: **`bdr-os-v2`** (id `zbgimoasdqqprymbykqb`).
> Production deploys from branch **`claude/serene-shannon-17i9vv`** (Vercel project
> `bdr-os`, alias `bdr-os.vercel.app`). Develop on the assigned feature branch and
> only push to the prod branch / `main` with explicit permission.

## What we're adding (user's request)

1. **Commissions Calculator + Goal-Setting module/tool.** Already built separately by
   the user — needs to be integrated. A rep sets income/commission goals; the tool
   computes what activity is required to hit them.
2. **Sandler sales-training program** — a structured course based on the Sandler rules
   book. This is the **first of several "book training" courses** to live in the
   Learning Center, so build it as a *repeatable pattern* (a book-training course type),
   not a one-off.
3. **Overhaul / tie everything together.** Commissions goals must feed into the other
   tabs — **Today, Grow, Daily Rhythm, Home** — with **AI coaching suggestions** on how
   to hit goals/commissions by best leveraging every minute of the day.

> The user has these tools/modules already built elsewhere. **Ask them to paste/upload
> the actual content + any commission formulas/rates first.** Do NOT fabricate
> commission rates, pricing, payout tiers, or Sandler content — wire in only real data
> they provide (this has been a hard rule all session).

## Current architecture (verified live)

### Learning content lives in Postgres, not files
- **`modules`**: `order_index` (1-based), `title`, `subtitle`, `icon_name`, `description`,
  `is_published`, `is_new`, `required_day`, `xp_lessons`, `xp_quiz`, `is_active`.
- **`lessons`**: `module_id`, `order_index`, `title`, `duration_minutes`, `difficulty`,
  `content` (jsonb block array), `sources` (jsonb), `is_published`, `lesson_type`,
  `pass_threshold`.
- **`quiz_questions`**: `module_id`, `order_index`, `question`, `question_type`,
  `options` (jsonb), `correct_answer` (int index), `explanation`, `source`, `difficulty`.
- Insert content via Supabase MCP `apply_migration` / `execute_sql`.

### Lesson `content` jsonb = array of blocks. Renderer supports these types ONLY:
`intro`, `heading`, `list`, `steps`, `links`, `template`, `tip`, `warn`, `screenshot`,
`quote`. (`**bold**` is parsed inside text.) Renderer:
`src/app/(app)/train/[moduleId]/[lessonId]/page.tsx`. If a book-training course needs a
new block type (e.g. a "rule card", chapter divider, or self-assessment), add it to that
renderer's switch.

### Existing modules (1–13) — note 7 & 8 already exist as titles
`1 HubSpot Fundamentals · 2 Lead Scoring · 3 Sales Pipeline · 4 Deal Teams ·
5 Order Forms · 6 PartnerHub · 7 Commissions, Pricing, Promos · 8 Nextiva & Field Sales ·
9 ONIT Order Form · 10 Integrations & API · 11 Full Product Suite · 12 Your CD Team ·
13 Competitive Positioning`. Module 7 is the natural home for (or pairs with) the
commissions content; Sandler should likely be a **new module** flagged as a book-training
course. Decide with the user whether the Sandler course is one module with many lessons
(one per rule/chapter) — that's the cleanest fit for the existing modules→lessons model.

### Gamification / XP
- **`xp_ledger`**: `user_id`, `action`, `xp_amount`, `reference_id`, `reference_type`,
  `verified`. Awards go through edge function **`calculate-xp`** (Deno), which dedupes per
  `(user, action, reference_id)`. To award XP for a new action (e.g. `goal_set`,
  `book_course_complete`), add a branch + a `gamification_rules.rule_key` (per-team,
  tunable in `/manager/gamification`).
- Belt ranks driven by `belt_day`; celebration via unread `belt_advance` notification.

### Habits / daily flow
- **`habits`**: per-user, `category`, `time_of_day`, `is_system`, `is_active`,
  `order_index`. Streak = completing ALL active habits in a day (edge fn).
- **Daily Rhythm**: `src/lib/schedule.ts` (`SHIFT_OPTIONS`, `OPTIMIZED_DAY` blocks with
  `href`/`cta`, `currentBlock()`), pages `src/app/(app)/schedule/page.tsx` and the Home
  "Right now" card in `src/app/(app)/home/page.tsx`. Shift persists to `users.settings.shift`.

### AI Coach
- `src/app/api/coach/route.ts` — Anthropic `claude-sonnet-4-6`, streaming default mode +
  `drill`/`feedback` modes. Has `COMPANY_CONTEXT`, uses server-verified `user.id`, already
  fetches `partner_onboarding` for partner context. **This is where goal/commission context
  gets injected** so the coach can advise "to hit $X you need Y conversations/day."

### There is NO `goals` table yet
The commissions/goal tool will need a new table, e.g. `goals` (user_id, period, target_income,
commission_rate or product mix, target_deals, created_at, …) with owner RLS + manager-team
read, mirroring the `partner_onboarding` pattern in
`supabase/migrations/20240103000000_partner_onboarding.sql`. **Commit the migration to the
repo** (we keep schema reproducible — RLS helper funcs `is_manager_or_owner()`,
`get_my_team_id()` exist in the initial migration; use the `(select auth.uid())` policy form).

## Integration map ("tie everything together")
Where commissions/goals should surface once the `goals` table + calculator exist:
- **Home** — progress-to-goal card next to the "Right now" rhythm card.
- **Today** (`today/page.tsx`) — today's required activity to stay on pace.
- **Grow** (`grow/page.tsx`) — goal trend / pacing over time.
- **Daily Rhythm** — translate the daily activity target into the time-blocked day
  (e.g. "X conversations across the 3 power blocks").
- **Coach** — inject goal + pace into the system prompt for "how to hit your number" advice.
- **Nav** — add the calculator/goals entry to `src/components/nav/index.tsx` Tools section.

## Design system (match existing)
Tokens: `dark-text`, `mid-text`, `gray`, `bdrbg`, `card`, `border`, `teal`, `navy`, `gold`,
`belt-*`. Components in `src/components/ui`: `Card` (`hover`, `variant`), `Button`, `Badge`
(valid: teal/navy/gold/success/error/gray), `EmptyState`, `Skeleton`, `Modal`,
`ConfirmDialog`, `ProgressBar`, `toast` (`toast.xp(amount:number, action?:string)` — amount
first!). Client components that call Supabase use `// @ts-nocheck` + `'use client'`.
`bg-gradient-hero` for hero cards.

## QA gates each pass (non-negotiable, every session has used these)
`npx tsc --noEmit` → `npm run build` → commit → push to feature branch → (with permission)
push to prod branch/`main` → verify Vercel deployment `READY` via Vercel MCP →
`get_advisors` security must stay zero-ERROR. Can't browser-test live (egress blocked), so
rely on DB evidence + build + adversarial review subagent.

## First steps for the new chat
1. Ask the user to paste the **commissions calculator logic/rates** and the **Sandler
   course content** (and confirm whether Sandler = one new module with per-rule lessons).
2. Propose the `goals` table schema + the book-training course pattern, get a thumbs-up.
3. Build calculator + goal module → migration → wire into Home/Today/Grow/Daily Rhythm/Coach.
4. Run the QA gates above.
