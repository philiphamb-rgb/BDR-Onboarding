// Growth OS — the AI Team roster. A static catalog of the 18 automation agents
// that ship with BDR Hub. The DB (`automations`, team-scoped) holds each team's
// LIVE state (status, who changed it, when); this file holds the rich, durable
// "what each agent does" metadata, the same way the Battle Cards catalog lives
// in code while progress lives in the DB. Page merges the two by `id`.
//
// Every agent maps onto a real system already in the app — partner_onboarding
// (leads), the triage/priority engine (tasks), user_progress (gamification),
// wins, the Commission Planner, Battle Cards, and the AI Coach — so nothing
// here is a parallel universe; it's an orchestration layer over what's real.

export type AutomationCategory = 'funnel' | 'content' | 'retention' | 'ops'
export type AutomationStatus = 'live' | 'setup' | 'paused'

export interface RosterAgent {
  id: string                    // stable id — matches automations.id
  name: string
  category: AutomationCategory
  tagline: string               // one line, what it does for the rep
  detail: string                // a sentence on how it works / what it reads
  reads: string                 // the real surface it draws on (shown as a chip)
  defaultStatus: AutomationStatus
}

export const CATEGORIES: { key: AutomationCategory; label: string; blurb: string }[] = [
  { key: 'funnel',    label: 'Funnel',    blurb: 'Fill, score, and move the pipeline.' },
  { key: 'content',   label: 'Content',   blurb: 'Generate and personalize outreach.' },
  { key: 'retention', label: 'Retention', blurb: 'Keep signed partners healthy.' },
  { key: 'ops',       label: 'Ops',       blurb: 'Brief, forecast, and keep you sharp.' },
]

// The 18-agent roster. Order within a category is intentional (most foundational
// first). Status defaults are a realistic out-of-the-box mix.
export const ROSTER: RosterAgent[] = [
  // ── Funnel ──────────────────────────────────────────────────────────────
  { id: 'scoring',     name: 'Lead Scorer',          category: 'funnel', defaultStatus: 'live',
    tagline: 'Ranks your pipeline by who is closest to closing.',
    detail: 'Scores every partner on stage, temperature, and days since last touch so your warmest, most-winnable deal is always on top.',
    reads: 'Partners' },
  { id: 'alert',       name: 'Hot-Lead Alert',       category: 'funnel', defaultStatus: 'live',
    tagline: 'Pings you the moment a partner turns hot.',
    detail: 'Watches temperature changes on your pipeline and flags a lead the second it goes hot, so you strike while interest peaks.',
    reads: 'Partners' },
  { id: 'followup',    name: 'Follow-Up Sequencer',  category: 'funnel', defaultStatus: 'live',
    tagline: 'Never lets a stalled deal go quiet.',
    detail: 'Spots deals parked at Proposal Sent or Contract Signed with no movement and queues the next touch as a task.',
    reads: 'Partners · Tasks' },
  { id: 'router',      name: 'Lead Router',          category: 'funnel', defaultStatus: 'setup',
    tagline: 'Sends fresh inbound to the right rep.',
    detail: 'Distributes new leads by territory and current load so nothing sits unclaimed. Managed by your team lead.',
    reads: 'Partners' },
  { id: 'enrich',      name: 'Lead Enricher',        category: 'funnel', defaultStatus: 'setup',
    tagline: 'Fills the blanks before your first call.',
    detail: 'Backfills missing partner firmographics — industry, size, site — so you walk into every conversation prepared.',
    reads: 'Partners' },
  { id: 'booker',      name: 'Meeting Booker',       category: 'funnel', defaultStatus: 'paused',
    tagline: 'Keeps a next step on every active deal.',
    detail: 'Nudges you to lock the next call whenever an active partner has no scheduled follow-up.',
    reads: 'Partners · Tasks' },

  // ── Content ─────────────────────────────────────────────────────────────
  { id: 'ideator',     name: 'Content Ideator',      category: 'content', defaultStatus: 'live',
    tagline: 'Daily outreach angles tuned to credit partners.',
    detail: 'Generates fresh openers and post ideas around the real pains of credit-repair, broker, and fintech partners. Powers the Content Engine.',
    reads: 'AI Coach' },
  { id: 'personalize', name: 'Outreach Personalizer',category: 'content', defaultStatus: 'live',
    tagline: 'Tailors every message to the partner.',
    detail: 'Rewrites your outreach using a partner’s stage and past objections so it never reads like a template.',
    reads: 'Partners · AI Coach' },
  { id: 'rebuttal',    name: 'Objection Rebuttals',  category: 'content', defaultStatus: 'live',
    tagline: 'The right Battle Card line, on demand.',
    detail: 'When a prospect names a competitor, surfaces the proven rebuttal straight from your Battle Cards.',
    reads: 'Battle Cards' },
  { id: 'repurpose',   name: 'Win Repurposer',       category: 'content', defaultStatus: 'setup',
    tagline: 'Turns a win into a proof point.',
    detail: 'Takes a win you logged and reshapes it into a shareable, credibility-building outreach hook.',
    reads: 'Wins' },

  // ── Retention ───────────────────────────────────────────────────────────
  { id: 'health',      name: 'Account Health',       category: 'retention', defaultStatus: 'live',
    tagline: 'Flags signed partners going cold.',
    detail: 'Ranks your onboarded partners by churn risk from inactivity, so you save the relationship before it slips.',
    reads: 'Partners' },
  { id: 'winback',     name: 'Win-Back',             category: 'retention', defaultStatus: 'setup',
    tagline: 'Re-engages partners who went quiet.',
    detail: 'Drafts a reason-to-talk for dormant partners and queues it when the timing is right.',
    reads: 'Partners' },
  { id: 'pulse',       name: 'Partner Pulse',        category: 'retention', defaultStatus: 'setup',
    tagline: 'Reads the room on partner sentiment.',
    detail: 'Gathers sentiment signals across your book and routes the red flags to you first.',
    reads: 'Partners' },
  { id: 'milestone',   name: 'Milestone Celebrator', category: 'retention', defaultStatus: 'paused',
    tagline: 'Marks go-lives and anniversaries.',
    detail: 'Celebrates partner milestones automatically so the relationship keeps deepening past the sale.',
    reads: 'Partners' },

  // ── Ops ─────────────────────────────────────────────────────────────────
  { id: 'digest',      name: 'Daily Digest',         category: 'ops', defaultStatus: 'live',
    tagline: 'Your morning brief in three lines.',
    detail: 'Pace to goal, your hottest lead, and the single move that matters most — assembled before you start the day.',
    reads: 'Goals · Partners' },
  { id: 'hygiene',     name: 'Pipeline Hygiene',     category: 'ops', defaultStatus: 'live',
    tagline: 'Keeps your pipeline trustworthy.',
    detail: 'Flags stale stages and missing fields so your numbers — and your forecast — stay clean.',
    reads: 'Partners' },
  { id: 'forecast',    name: 'Forecaster',           category: 'ops', defaultStatus: 'live',
    tagline: 'Projects where the month lands.',
    detail: 'Reads your current run-rate against your goal and projects month-end deals so there are no surprises.',
    reads: 'Goals' },
  { id: 'signals',     name: 'Coaching Signals',     category: 'ops', defaultStatus: 'setup',
    tagline: 'Spots what to sharpen, routes it to Coach.',
    detail: 'Watches your conversion and activity for the leak that costs you most, then hands it to your AI Coach with a plan.',
    reads: 'AI Coach' },
]

export const ROSTER_BY_ID: Record<string, RosterAgent> = Object.fromEntries(ROSTER.map(a => [a.id, a]))

export const STATUS_META: Record<AutomationStatus, { label: string; tone: string; dot: string }> = {
  live:  { label: 'Live',     tone: 'text-success bg-success/10', dot: 'bg-success' },
  setup: { label: 'Setup',    tone: 'text-[#A06C00] bg-gold/15',  dot: 'bg-gold' },
  paused:{ label: 'Paused',   tone: 'text-gray bg-bdrbg',         dot: 'bg-gray' },
}

// The team's effective roster = catalog metadata + the team's live status.
// A team with no DB rows yet falls back to each agent's default status.
export function mergeRoster(rows: { id: string; status: AutomationStatus; updated_at?: string; updated_by?: string | null }[] = []) {
  const byId = new Map(rows.map(r => [r.id, r]))
  return ROSTER.map(a => {
    const row = byId.get(a.id)
    return { ...a, status: (row?.status as AutomationStatus) ?? a.defaultStatus, updated_at: row?.updated_at, updated_by: row?.updated_by ?? null, configured: !!row }
  })
}

export type MergedAgent = ReturnType<typeof mergeRoster>[number]
