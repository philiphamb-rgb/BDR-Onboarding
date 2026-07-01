// @ts-nocheck
'use client'

// Wins, liquidated. Instead of a "Wins" destination, milestones now surface as
// throttled notification-log entries scattered through the app. This hook detects
// newly-crossed milestones (streak, deals this month, goal completion) and logs
// ONE notification for the highest new one — tightly throttled so it can never
// flood the inbox:
//   • each milestone fires at most once, ever (tracked in module_progress)
//   • at most one notification per load (the highest new milestone)
//   • the first-ever run only baselines existing milestones — no retroactive blast

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useModuleKV } from '@/lib/hooks/useModuleKV'

const STREAKS = [3, 7, 14, 30, 60, 100, 200, 365]
const DEALS = [1, 3, 5, 10, 15, 20, 30, 50]

function computeCrossed({ streak = 0, deals = 0, goal = 0 }) {
  const out = []
  for (const s of STREAKS) if (streak >= s) out.push({ key: `streak_${s}`, order: s, title: `${s}-day streak locked in`, body: `You've shown up ${s} days straight. That consistency is exactly how records get set — keep the line.`, action_url: '/leaderboard' })
  for (const d of DEALS) if (deals >= d) out.push({ key: `deals_${d}`, order: 100 + d, title: `${d} ${d === 1 ? 'deal' : 'deals'} closed this month`, body: `Deal ${d} is on the board. Momentum compounds — line up the next one.`, action_url: '/partners' })
  if (goal > 0 && deals >= goal) out.push({ key: `goal_${goal}`, order: 1000, title: 'Monthly goal smashed', body: `You hit your ${goal}-deal goal for the month. Everything from here is pure upside.`, action_url: '/commissions' })
  return out
}

export function useWinsNotify({ userId, streak, deals, goal }: { userId?: string; streak?: number; deals?: number; goal?: number | null }) {
  const supabase = createClient()
  const { loading, value, save } = useModuleKV('wins_milestones', { fired: [] })

  useEffect(() => {
    if (loading || !userId) return
    const fired = new Set(value.fired || [])
    const crossed = computeCrossed({ streak: streak || 0, deals: deals || 0, goal: goal || 0 })
    if (crossed.length === 0) return

    // First-ever run: baseline whatever's already achieved, notify nothing.
    if (fired.size === 0) { save({ fired: crossed.map(c => c.key) }); return }

    const fresh = crossed.filter(c => !fired.has(c.key))
    if (fresh.length === 0) return

    // Throttle: mark ALL fresh as fired, but log only the single highest.
    save({ fired: [...fired, ...fresh.map(c => c.key)] })
    const top = fresh.sort((a, b) => a.order - b.order)[fresh.length - 1]
    supabase.from('notifications').insert({ user_id: userId, type: 'win', title: top.title, body: top.body, action_url: top.action_url, tier: 2 }).then(() => {}, () => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, userId, streak, deals, goal])
}
