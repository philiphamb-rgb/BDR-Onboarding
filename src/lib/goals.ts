// Commission / income goal math. Pure, dependency-free helpers shared by the
// goals page, the Home/Today/Grow cards, the Daily Rhythm, and the Coach route.
//
// The rep supplies every number (target income, what they earn per deal, their
// close rate, selling days). We never bake in ConsumerDirect commission rates or
// payout tiers — this is a generic calculator driven entirely by rep inputs.

export type GoalPeriod = 'monthly'

export interface GoalInputs {
  target_income: number          // commission target for the period ($)
  commission_per_deal: number    // avg commission the rep earns per closed deal ($)
  close_rate: number             // % of conversations that become deals (0-100)
  working_days: number           // selling days in the period
}

export interface GoalRecord extends GoalInputs {
  id: string
  user_id: string
  team_id: string | null
  period: GoalPeriod
  is_active: boolean
  created_at: string
  updated_at: string
}

export const GOAL_DEFAULTS: GoalInputs = {
  target_income: 0,
  commission_per_deal: 0,
  close_rate: 5,        // 1 deal per 20 conversations — a neutral starting point the rep edits
  working_days: 21,     // typical selling days in a month
}

export interface GoalTargets {
  dealsNeeded: number            // deals required to hit target_income
  conversationsNeeded: number    // conversations required given the close rate
  dealsPerDay: number
  conversationsPerDay: number
  dealsPerDayCeil: number        // rounded up — a concrete daily number to chase
  conversationsPerDayCeil: number
}

// Returns null until the rep has entered the minimum needed to compute anything.
export function computeTargets(g: GoalInputs): GoalTargets | null {
  const { target_income, commission_per_deal, close_rate, working_days } = g
  if (!(target_income > 0) || !(commission_per_deal > 0) || !(working_days > 0)) return null

  const dealsNeeded = target_income / commission_per_deal
  const rate = close_rate > 0 ? close_rate / 100 : 0
  const conversationsNeeded = rate > 0 ? dealsNeeded / rate : 0

  return {
    dealsNeeded,
    conversationsNeeded,
    dealsPerDay: dealsNeeded / working_days,
    conversationsPerDay: conversationsNeeded / working_days,
    dealsPerDayCeil: Math.ceil(dealsNeeded / working_days),
    conversationsPerDayCeil: Math.ceil(conversationsNeeded / working_days),
  }
}

// ── Pace within the current month ────────────────────────────────────────────
// Counts Mon–Fri only; the goal's working_days is the rep's own intended denominator
// but elapsed/total business days drive what "on pace" means right now.

function businessDaysInMonth(now: Date): number {
  const y = now.getFullYear(), m = now.getMonth()
  const days = new Date(y, m + 1, 0).getDate()
  let count = 0
  for (let d = 1; d <= days; d++) {
    const dow = new Date(y, m, d).getDay()
    if (dow !== 0 && dow !== 6) count++
  }
  return count
}

function businessDaysElapsed(now: Date): number {
  const y = now.getFullYear(), m = now.getMonth(), today = now.getDate()
  let count = 0
  for (let d = 1; d <= today; d++) {
    const dow = new Date(y, m, d).getDay()
    if (dow !== 0 && dow !== 6) count++
  }
  return count
}

export type PaceStatus = 'ahead' | 'on-track' | 'behind' | 'no-data'

export interface GoalPace {
  earned: number          // commission earned so far this period ($)
  dealsClosed: number
  progressPct: number     // earned vs target (0-100, capped for display elsewhere)
  expectedPct: number     // where the rep "should" be given business days elapsed
  status: PaceStatus
  remainingIncome: number
  remainingDeals: number          // deals still needed to hit target
  dealsPerRemainingDay: number    // deals/day needed across the days that are left
  conversationsPerRemainingDay: number
  daysElapsed: number
  daysRemaining: number
}

// dealsClosed = closed deals logged this calendar month (from `wins`, type 'deal').
export function computePace(g: GoalInputs, dealsClosed: number, now: Date = new Date()): GoalPace {
  const targets = computeTargets(g)
  const earned = dealsClosed * (g.commission_per_deal || 0)
  const totalDays = businessDaysInMonth(now)
  const elapsed = Math.min(businessDaysElapsed(now), totalDays)
  const remaining = Math.max(0, totalDays - elapsed)
  const expectedPct = totalDays > 0 ? (elapsed / totalDays) * 100 : 0
  const progressPct = g.target_income > 0 ? (earned / g.target_income) * 100 : 0

  let status: PaceStatus = 'no-data'
  if (g.target_income > 0 && g.commission_per_deal > 0) {
    // 5-point tolerance band around the expected pace line.
    if (progressPct >= expectedPct + 5) status = 'ahead'
    else if (progressPct >= expectedPct - 5) status = 'on-track'
    else status = 'behind'
  }

  const remainingDeals = targets ? Math.max(0, targets.dealsNeeded - dealsClosed) : 0
  const rate = g.close_rate > 0 ? g.close_rate / 100 : 0
  const dealsPerRemainingDay = remaining > 0 ? remainingDeals / remaining : remainingDeals
  const conversationsPerRemainingDay = rate > 0 ? dealsPerRemainingDay / rate : 0

  return {
    earned,
    dealsClosed,
    progressPct,
    expectedPct,
    status,
    remainingIncome: Math.max(0, g.target_income - earned),
    remainingDeals,
    dealsPerRemainingDay,
    conversationsPerRemainingDay,
    daysElapsed: elapsed,
    daysRemaining: remaining,
  }
}

// ── Formatting ───────────────────────────────────────────────────────────────

export function fmtMoney(n: number, opts: { cents?: boolean } = {}): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: opts.cents ? 2 : 0,
    maximumFractionDigits: opts.cents ? 2 : 0,
  }).format(Number.isFinite(n) ? n : 0)
}

export const PACE_LABEL: Record<PaceStatus, string> = {
  ahead: 'Ahead of pace',
  'on-track': 'On pace',
  behind: 'Behind pace',
  'no-data': 'No goal set',
}
