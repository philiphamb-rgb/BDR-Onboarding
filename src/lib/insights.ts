// Team coaching insight engine.
// Deterministic, rule-based nudges derived from real rep progress data — no
// guesswork, no fabricated numbers. Each insight cites the metric it came from
// so a manager can trust and act on it. Consumed by /manager/dashboard and
// /manager/analytics.

export interface MemberStat {
  id: string
  name: string
  email?: string
  total_xp: number
  current_streak: number
  longest_streak: number
  total_calls: number
  total_demos: number
  total_deals: number
  calls_this_week: number
  demos_this_week: number
  deals_this_month: number
  lessons_completed: number
  belt_day: number
  last_active_date: string | null
}

export type InsightTone = 'positive' | 'warning' | 'info'

export interface Insight {
  id: string
  tone: InsightTone
  icon: 'trophy' | 'flame' | 'alert' | 'phone' | 'belt' | 'target' | 'chart' | 'book'
  title: string
  detail: string
}

const BELT_STEPS: { day: number; name: string }[] = [
  { day: 7, name: 'Yellow' },
  { day: 14, name: 'Orange' },
  { day: 30, name: 'Green' },
  { day: 50, name: 'Blue' },
  { day: 70, name: 'Purple' },
  { day: 90, name: 'Black' },
]

export function daysSince(date: string | null): number | null {
  if (!date) return null
  const d = new Date(date + 'T00:00:00')
  if (isNaN(d.getTime())) return null
  return Math.floor((Date.now() - d.getTime()) / 86_400_000)
}

function nextBelt(beltDay: number): { name: string; daysAway: number } | null {
  for (const step of BELT_STEPS) {
    if (beltDay < step.day) return { name: step.name, daysAway: step.day - beltDay }
  }
  return null
}

// Returns a prioritized, deduped list of coaching insights (most actionable
// first). Caller decides how many to show. Pure: no side effects, no I/O.
export function deriveTeamInsights(members: MemberStat[]): Insight[] {
  if (members.length === 0) return []
  const out: Insight[] = []
  const sortedByXP = [...members].sort((a, b) => b.total_xp - a.total_xp)

  // 1) Reps who have gone quiet — highest priority for a manager.
  const stale = members
    .map(m => ({ m, days: daysSince(m.last_active_date) }))
    .filter(x => x.days !== null && x.days >= 3)
    .sort((a, b) => (b.days ?? 0) - (a.days ?? 0))
  if (stale.length === 1) {
    const { m, days } = stale[0]
    out.push({
      id: `stale-${m.id}`, tone: 'warning', icon: 'alert',
      title: `${firstName(m.name)} has gone quiet`,
      detail: `No activity in ${days} days. A quick 1:1 check-in usually re-engages a rep before they stall.`,
    })
  } else if (stale.length > 1) {
    out.push({
      id: 'stale-multi', tone: 'warning', icon: 'alert',
      title: `${stale.length} reps have gone quiet`,
      detail: `${stale.map(s => firstName(s.m.name)).slice(0, 3).join(', ')}${stale.length > 3 ? ` +${stale.length - 3} more` : ''} have no activity in 3+ days. Prioritize check-ins this week.`,
    })
  }

  // 2) Zero call activity this week — leading indicator of a stalled pipeline.
  const noCalls = members.filter(m => m.calls_this_week === 0)
  if (noCalls.length > 0 && noCalls.length < members.length) {
    out.push({
      id: 'no-calls', tone: 'warning', icon: 'phone',
      title: `${noCalls.length} of ${members.length} reps logged no calls this week`,
      detail: `${noCalls.map(m => firstName(m.name)).slice(0, 3).join(', ')}${noCalls.length > 3 ? ` +${noCalls.length - 3} more` : ''} are quiet on the phones. Calls are the #1 leading indicator of pipeline.`,
    })
  }

  // 3) Top performer — reinforce and make visible.
  const top = sortedByXP[0]
  if (top && top.total_xp > 0) {
    out.push({
      id: `top-${top.id}`, tone: 'positive', icon: 'trophy',
      title: `${firstName(top.name)} is leading the team`,
      detail: `${top.total_xp.toLocaleString()} XP earned${top.deals_this_month > 0 ? ` and ${top.deals_this_month} deal${top.deals_this_month === 1 ? '' : 's'} this month` : ''}. A shout-out in your next stand-up reinforces the behavior.`,
    })
  }

  // 4) Hot streaks — momentum worth celebrating.
  const streaker = [...members].sort((a, b) => b.current_streak - a.current_streak)[0]
  if (streaker && streaker.current_streak >= 5) {
    out.push({
      id: `streak-${streaker.id}`, tone: 'positive', icon: 'flame',
      title: `${firstName(streaker.name)} is on a ${streaker.current_streak}-day streak`,
      detail: `Consistency compounds. Protect this momentum — a missed day resets it to zero.`,
    })
  }

  // 5) About to earn a belt — a timely nudge from a manager lands hard.
  const beltCandidate = members
    .map(m => ({ m, next: nextBelt(m.belt_day) }))
    .filter(x => x.next && x.next.daysAway <= 2 && x.next.daysAway > 0)
    .sort((a, b) => (a.next!.daysAway) - (b.next!.daysAway))[0]
  if (beltCandidate && beltCandidate.next) {
    out.push({
      id: `belt-${beltCandidate.m.id}`, tone: 'info', icon: 'belt',
      title: `${firstName(beltCandidate.m.name)} is ${beltCandidate.next.daysAway} day${beltCandidate.next.daysAway === 1 ? '' : 's'} from ${beltCandidate.next.name} Belt`,
      detail: `Recognize the milestone when it lands — belt advances are a natural moment to raise expectations.`,
    })
  }

  // 6) Training pace — reps ramping behind their tenure.
  const behind = members.filter(m => m.belt_day >= 14 && m.lessons_completed < 5)
  if (behind.length > 0) {
    out.push({
      id: 'training-behind', tone: 'info', icon: 'book',
      title: `${behind.length} rep${behind.length === 1 ? '' : 's'} ${behind.length === 1 ? 'is' : 'are'} behind on training`,
      detail: `${behind.map(m => firstName(m.name)).slice(0, 3).join(', ')} ${behind.length === 1 ? 'has' : 'have'} completed fewer than 5 lessons despite 2+ weeks on the team. Block focused training time.`,
    })
  }

  return out
}

function firstName(name: string): string {
  return (name || '').trim().split(' ')[0] || name
}
