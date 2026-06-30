// Deterministic auto-Wins / Coach-insight engine (rep-side counterpart to the
// manager-side lib/insights.ts). Turns real signal — week-over-week activity,
// closing rate, goal pace, streak, curriculum progress — into short,
// manager-style callouts framed against actual targets. No fabricated numbers.

export interface AutoWin {
  id: string
  tone: 'win' | 'pace' | 'nudge'   // win = positive, pace = goal status, nudge = gentle push
  title: string
  detail: string
  href?: string
}

export interface WinsInput {
  callsThisWeek: number
  callsLastWeek: number
  demosThisWeek: number
  demosLastWeek: number
  dealsThisWeek: number
  dealsLastWeek: number
  dealsThisMonth: number
  monthlyDealGoal?: number | null
  closeRateWarm?: number | null
  closeRateOverall?: number | null
  streak: number
  modulesDone: number
  modulesTotal: number
  stalledPartners?: number   // partners sitting at proposal/contract stage
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0)

// Day of month → fraction of the month elapsed, for pace math.
export function monthPaceFraction(now: Date): number {
  const day = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return Math.min(1, day / daysInMonth)
}

export function deriveAutoWins(i: WinsInput, paceFraction: number): AutoWin[] {
  const wins: AutoWin[] = []

  // Goal pace — the headline when a goal is set.
  if (i.monthlyDealGoal && i.monthlyDealGoal > 0) {
    const expected = i.monthlyDealGoal * paceFraction
    const p = pct(i.dealsThisMonth, i.monthlyDealGoal)
    if (i.dealsThisMonth >= i.monthlyDealGoal) {
      wins.push({ id: 'goal', tone: 'win', title: `Goal smashed — ${i.dealsThisMonth}/${i.monthlyDealGoal} deals 🎯`, detail: `You hit your monthly deal goal. Anything now is upside.`, href: '/analytics' })
    } else if (i.dealsThisMonth >= expected) {
      wins.push({ id: 'goal', tone: 'pace', title: `On pace — ${i.dealsThisMonth}/${i.monthlyDealGoal} deals (${p}%)`, detail: `Right where you should be this far into the month. Keep the cadence.`, href: '/analytics' })
    } else {
      const behind = Math.max(1, Math.ceil(expected - i.dealsThisMonth))
      wins.push({ id: 'goal', tone: 'nudge', title: `${i.monthlyDealGoal - i.dealsThisMonth} deals to your goal`, detail: `About ${behind} behind pace — a focused power block today closes the gap.`, href: '/analytics' })
    }
  }

  // Week-over-week calls.
  const dCalls = i.callsThisWeek - i.callsLastWeek
  if (i.callsLastWeek > 0 && dCalls > 0) {
    wins.push({ id: 'calls', tone: 'win', title: `${dCalls} more calls than last week`, detail: `${i.callsThisWeek} vs ${i.callsLastWeek} — that's a ${pct(dCalls, i.callsLastWeek)}% jump in activity.`, href: '/wins' })
  }

  // Week-over-week deals.
  const dDeals = i.dealsThisWeek - i.dealsLastWeek
  if (dDeals > 0) {
    wins.push({ id: 'deals', tone: 'win', title: `${i.dealsThisWeek} deal${i.dealsThisWeek === 1 ? '' : 's'} this week`, detail: i.dealsLastWeek > 0 ? `Up from ${i.dealsLastWeek} last week — momentum is building.` : `First deals on the board this week — keep it rolling.`, href: '/wins' })
  }

  // Closing rate.
  if ((i.closeRateWarm ?? 0) >= 25) {
    wins.push({ id: 'close', tone: 'win', title: `${i.closeRateWarm}% warm closing rate`, detail: `Your warm conversations convert — feed that pipeline with more referrals.`, href: '/analytics' })
  } else if ((i.closeRateOverall ?? 0) > 0 && (i.closeRateWarm ?? 0) > 0 && (i.closeRateWarm ?? 0) < (i.closeRateOverall ?? 0)) {
    wins.push({ id: 'close', tone: 'nudge', title: `Cold leads are dragging your close rate`, detail: `Warm closes higher than cold — run the pain funnel before pitching cold prospects.`, href: '/coach' })
  }

  // Stalled pipeline — proposals/contracts sitting without a next step.
  if ((i.stalledPartners ?? 0) > 0) {
    const n = i.stalledPartners as number
    wins.push({ id: 'stalled', tone: 'nudge', title: `${n} deal${n === 1 ? '' : 's'} waiting on you`, detail: `${n === 1 ? 'A partner is' : `${n} partners are`} at proposal/contract stage — one nudge today could close ${n === 1 ? 'it' : 'them'}.`, href: '/partners' })
  }

  // Streak.
  if (i.streak >= 3) {
    wins.push({ id: 'streak', tone: 'win', title: `${i.streak}-day streak 🔥`, detail: `Consistency is the #1 predictor of ramp speed. Don't break the chain.`, href: '/today' })
  }

  // Curriculum.
  if (i.modulesTotal > 0 && i.modulesDone >= i.modulesTotal) {
    wins.push({ id: 'learn', tone: 'win', title: `Curriculum complete 🎓`, detail: `Every module done — see your progress and certificate, and keep sharpening in the Drill.`, href: '/progress' })
  }

  // Rank by usefulness: goal pace first, then wins, then nudges.
  const order = { pace: 0, win: 1, nudge: 2 }
  return wins.sort((a, b) => order[a.tone] - order[b.tone])
}
