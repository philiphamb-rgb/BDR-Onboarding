// The brain behind the Home/Today "what do I do right now" experience. Turns a
// rep's goal, pace, pipeline, and tasks into: (1) live goal math, and (2) a
// single ranked action list — each with a plain-English WHY — so the most
// revenue-driving next move is always at the top. Deterministic, per-person.

import { urgency } from '@/lib/triageEngine'

export interface GoalStats {
  hasGoal: boolean
  goal: number
  done: number
  remaining: number
  pct: number            // done / goal, 0–100 (capped 100 for the ring)
  rawPct: number         // uncapped
  daysInMonth: number
  day: number
  daysLeft: number       // calendar days remaining incl. today
  paceFraction: number   // fraction of month elapsed
  expected: number       // where you "should" be by now
  behind: number         // deals behind pace (0 if on/ahead)
  status: 'none' | 'hit' | 'ahead' | 'on' | 'behind'
  projection: number     // projected month-end at current run-rate
  perDayNeeded: number   // deals/day needed to still hit goal
}

export function goalStats(goal: number | null | undefined, done: number, now: Date): GoalStats {
  const day = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft = Math.max(1, daysInMonth - day + 1)
  const paceFraction = Math.min(1, day / daysInMonth)
  if (!goal || goal <= 0) {
    return { hasGoal: false, goal: 0, done, remaining: 0, pct: 0, rawPct: 0, daysInMonth, day, daysLeft, paceFraction, expected: 0, behind: 0, status: 'none', projection: 0, perDayNeeded: 0 }
  }
  const remaining = Math.max(0, goal - done)
  const rawPct = Math.round((done / goal) * 100)
  const expected = goal * paceFraction
  const gap = expected - done           // + = behind pace, − = ahead
  const behind = Math.max(0, Math.round(gap))
  const projection = day > 0 ? Math.round((done / day) * daysInMonth) : done
  const perDayNeeded = remaining / daysLeft
  // One-deal tolerance band: don't flag "behind" for sub-deal, early-month
  // rounding slack — only when you're a full deal or more off pace.
  let status: GoalStats['status']
  if (done >= goal) status = 'hit'
  else if (gap <= -1) status = 'ahead'
  else if (gap < 1) status = 'on'
  else status = 'behind'
  return { hasGoal: true, goal, done, remaining, pct: Math.min(100, rawPct), rawPct, daysInMonth, day, daysLeft, paceFraction, expected, behind, status, projection, perDayNeeded }
}

// A short, dynamic strategy line — the "why" behind today's focus.
export function strategyLine(g: GoalStats): string {
  if (!g.hasGoal) return 'Set a monthly deal goal to unlock your pace, projection, and a personalized game plan.'
  if (g.status === 'hit') return `Goal smashed — ${g.done}/${g.goal}. Every deal now is upside; keep the streak alive.`
  if (g.status === 'behind') return `You're ~${g.behind} behind pace. Hitting ${g.goal} now needs ${g.perDayNeeded.toFixed(1)}/day — feed the top of funnel and work your warmest leads first.`
  if (g.status === 'ahead') return `Ahead of pace — projected ${g.projection}/${g.goal}. Protect your selling blocks and push for a record month.`
  return `On track — projected ${g.projection}/${g.goal}. Hold the cadence: ${g.perDayNeeded.toFixed(1)}/day keeps you on target.`
}

export interface Action {
  id: string
  kind: 'lead' | 'goal' | 'task'
  title: string
  why: string
  href: string
  cta: string
  est?: number
  score: number
  taskId?: string
}

const STALLED = ['proposal_sent', 'contract_signed']

// Build the ranked action list from tasks, pipeline, and goal pressure.
export function buildActions(input: {
  tasks: any[]
  partners: any[]
  g: GoalStats
  now: Date
  stageLabel?: (s: string) => string
}): Action[] {
  const { tasks, partners, g, now } = input
  const stageLabel = input.stageLabel ?? ((s: string) => s)
  const out: Action[] = []
  const titles = (tasks ?? []).map(t => (t.title || '').toLowerCase())
  const hasTitle = (n: string) => titles.some(t => t.includes(n.toLowerCase()))
  const daysSince = (iso?: string) => iso ? Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86400000)) : 0

  // Open tasks (active) → ranked by urgency.
  for (const t of (tasks ?? [])) {
    if (t.done) continue
    const score = urgency(t, now)
    const d = t.due_date ? Math.round((new Date(t.due_date + 'T00:00:00').getTime() - new Date(now.toDateString()).getTime()) / 86400000) : null
    const why = d != null && d < 0 ? `Overdue by ${-d}d` : d === 0 ? 'Due today' : t.priority ? 'You flagged this priority' : (t.scheduled_block != null ? 'On today’s plan' : 'Top of your list')
    out.push({ id: `task:${t.id}`, kind: 'task', title: t.title, why, href: '/tasks', cta: 'Open', est: t.estimated_minutes ?? 30, score, taskId: t.id })
  }

  // Due follow-ups → highest-intent partner action (you scheduled it yourself).
  const todayISO = new Date(now.toDateString()).toISOString().split('T')[0]
  const dueFollowups = (partners ?? []).filter(p => p.next_followup_date && p.next_followup_date <= todayISO)
    .sort((a, b) => (a.next_followup_date || '').localeCompare(b.next_followup_date || ''))
  const followedUp = new Set<string>()
  for (const p of dueFollowups.slice(0, 5)) {
    followedUp.add(p.id)
    if (hasTitle(p.partner_name)) continue
    const overdueDays = daysSince(p.next_followup_date + 'T00:00:00')
    out.push({ id: `followup:${p.id}`, kind: 'lead', title: `Follow up with ${p.partner_name}`, why: overdueDays > 0 ? `Follow-up ${overdueDays}d overdue` : 'Follow-up due today', href: `/partners/${p.id}`, cta: 'Work it', est: 15, score: 200 + Math.min(90, overdueDays * 10) })
  }

  // Stalled partners → follow-ups (skip if already surfaced via a due date or task).
  const stalled = (partners ?? []).filter(p => STALLED.includes(p.stage) && !followedUp.has(p.id)).sort((a, b) => (a.updated_at || '').localeCompare(b.updated_at || ''))
  for (const p of stalled.slice(0, 5)) {
    if (hasTitle(p.partner_name)) continue
    const days = daysSince(p.updated_at)
    const why = days === 0
      ? `Just moved to ${stageLabel(p.stage)} · First follow-up recommended today`
      : `${stageLabel(p.stage)} · ${days}d since last touch — a nudge could close it`
    out.push({ id: `lead:${p.id}`, kind: 'lead', title: `Follow up with ${p.partner_name}`, why, href: `/partners/${p.id}`, cta: 'Work it', est: 15, score: 150 + Math.min(90, days * 8) })
  }

  // Behind goal → prospecting (high priority; one entry).
  if (g.hasGoal && g.status === 'behind' && !hasTitle('prospect')) {
    out.push({ id: 'goal:prospect', kind: 'goal', title: 'Prospect new leads to close the gap', why: `~${g.behind} behind pace toward ${g.goal} — feed the top of funnel today`, href: '/partners', cta: 'Prospect', est: 30, score: 155 + g.behind * 18 })
  }

  return out.sort((a, b) => b.score - a.score)
}
