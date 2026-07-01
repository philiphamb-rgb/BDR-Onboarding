// @ts-nocheck
'use client'

// Sibling to BeltWatcher. Watches user_progress counters and fires a one-time
// celebration (toast + confetti) when a new achievement is unlocked. Dedupe is
// per-user via localStorage; on first ever run it silently records already-earned
// badges so a returning rep isn't spammed with a backlog of confetti.

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/ui'
import { triggerConfetti } from '@/components/gamification'
import { ACHIEVEMENTS, earnedIds } from '@/lib/achievements'

export function MilestoneWatcher({ userId }: { userId?: string }) {
  const supabase = createClient()

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    const key = `bdr:ach:${userId}`
    ;(async () => {
      const { data: up } = await supabase
        .from('user_progress')
        .select('total_calls, total_demos, total_deals, current_streak, longest_streak, total_xp')
        .eq('user_id', userId).maybeSingle()
      if (!up || cancelled) return
      const earned = earnedIds(up)
      let seen: string[] = []
      let firstRun = false
      try {
        const raw = localStorage.getItem(key)
        if (raw == null) firstRun = true
        else seen = JSON.parse(raw) || []
      } catch { firstRun = true }

      if (firstRun) {
        // Baseline silently — don't celebrate the whole backlog at once.
        try { localStorage.setItem(key, JSON.stringify(earned)) } catch {}
        return
      }

      const fresh = earned.filter(id => !seen.includes(id))
      if (fresh.length === 0) return
      try { localStorage.setItem(key, JSON.stringify(Array.from(new Set([...seen, ...earned])))) } catch {}

      triggerConfetti()
      // Toast each new badge (cap the burst so a big catch-up stays tasteful).
      fresh.slice(0, 3).forEach((id, i) => {
        const a = ACHIEVEMENTS.find(x => x.id === id)
        if (a) setTimeout(() => toast.success(`Achievement unlocked — ${a.label}!`, a.desc), i * 700)
      })
      if (fresh.length > 3) setTimeout(() => toast.success(`+${fresh.length - 3} more badges unlocked`, 'See them on your Progress page'), 3 * 700)
    })()
    return () => { cancelled = true }
  }, [userId])

  return null
}
