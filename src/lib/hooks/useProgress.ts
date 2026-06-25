// @ts-nocheck
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface TodayStats {
  habitsCompleted: number
  habitsTotal: number
  callsLogged: number
  demosLogged: number
  dealsLogged: number
  xpEarnedToday: number
}

export interface ProgressData {
  user_id: string
  belt_rank: string
  belt_day: number
  total_xp: number
  current_streak: number
  longest_streak: number
  // computed
  nextBelt: string | null
  daysUntilNextBelt: number | null
  beltProgressPercent: number
  todayStats: TodayStats
  streakStatus: 'active' | 'at-risk' | 'broken'
}

const BELT_TIERS = [
  { name: 'white',  minDays: 0 },
  { name: 'yellow', minDays: 7 },
  { name: 'orange', minDays: 14 },
  { name: 'green',  minDays: 30 },
  { name: 'blue',   minDays: 50 },
  { name: 'purple', minDays: 70 },
  { name: 'black',  minDays: 90 },
]

function computeBelt(days: number) {
  const current = BELT_TIERS.reduce((acc, b) => (days >= b.minDays ? b : acc), BELT_TIERS[0])
  const idx = BELT_TIERS.indexOf(current)
  const next = BELT_TIERS[idx + 1] ?? null
  const prev = current
  const pct = next
    ? Math.min(100, Math.round(((days - prev.minDays) / (next.minDays - prev.minDays)) * 100))
    : 100
  return { current: current.name, next: next?.name ?? null, daysUntil: next ? next.minDays - days : null, pct }
}

export function useProgress(userId: string | undefined) {
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchProgress = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    try {
      setError(null)
      const today = new Date().toISOString().split('T')[0]

      const [{ data: prog }, { data: habitLogs }, { data: allHabits }, { data: todayXP }, { data: todayWins }] = await Promise.all([
        supabase.from('user_progress').select('*').eq('user_id', userId).single(),
        supabase.from('habit_logs').select('habit_id').eq('user_id', userId).eq('date', today),
        supabase.from('habits').select('id').eq('user_id', userId).eq('is_active', true),
        supabase.from('xp_ledger').select('xp_amount').eq('user_id', userId).gte('created_at', today + 'T00:00:00'),
        supabase.from('wins').select('type').eq('user_id', userId).gte('logged_at', today + 'T00:00:00'),
      ])

      if (!prog) { setLoading(false); return }

      const days = prog.belt_day ?? 0
      const belt = computeBelt(days)
      const xpToday = todayXP?.reduce((s: number, r: { xp_amount: number }) => s + (r.xp_amount ?? 0), 0) ?? 0

      const lastDate = prog.last_streak_date
      let streakStatus: 'active' | 'at-risk' | 'broken' = 'broken'
      if (lastDate) {
        const diff = Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000)
        streakStatus = diff === 0 ? 'active' : diff === 1 ? 'at-risk' : 'broken'
      }

      setProgress({
        user_id: prog.user_id,
        belt_rank: belt.current,
        belt_day: days,
        total_xp: prog.total_xp ?? 0,
        current_streak: prog.current_streak ?? 0,
        longest_streak: prog.longest_streak ?? 0,
        nextBelt: belt.next,
        daysUntilNextBelt: belt.daysUntil,
        beltProgressPercent: belt.pct,
        todayStats: {
          habitsCompleted: habitLogs?.length ?? 0,
          habitsTotal: allHabits?.length ?? 0,
          callsLogged: todayWins?.filter((w: { type: string }) => w.type === 'call').length ?? 0,
          demosLogged: todayWins?.filter((w: { type: string }) => w.type === 'demo').length ?? 0,
          dealsLogged: todayWins?.filter((w: { type: string }) => w.type === 'deal').length ?? 0,
          xpEarnedToday: xpToday,
        },
        streakStatus,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load progress')
    } finally {
      setLoading(false)
    }
  }, [userId, supabase])

  useEffect(() => { fetchProgress() }, [fetchProgress])

  const logXP = async (action: string, metadata: Record<string, unknown> = {}) => {
    if (!userId) return null
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return null
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/calculate-xp`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ action, user_id: userId, ...metadata }),
        }
      )
      if (!res.ok) return null
      const result = await res.json()
      await fetchProgress()
      return result
    } catch { return null }
  }

  return { progress, loading, error, refresh: fetchProgress, logXP }
}

export function useHabits(userId: string | undefined) {
  const [habits, setHabits] = useState<{ id: string; label: string; description: string | null; is_active: boolean; completed_today: boolean }[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchHabits = useCallback(async () => {
    if (!userId) return
    const today = new Date().toISOString().split('T')[0]
    const [{ data: habitsData }, { data: logsToday }] = await Promise.all([
      supabase.from('habits').select('id, label, description, is_active').eq('user_id', userId).eq('is_active', true).order('order_index'),
      supabase.from('habit_logs').select('habit_id').eq('user_id', userId).eq('date', today),
    ])
    const completedIds = new Set(logsToday?.map(l => l.habit_id) ?? [])
    setHabits((habitsData ?? []).map(h => ({ ...h, completed_today: completedIds.has(h.id) })))
    setLoading(false)
  }, [userId, supabase])

  useEffect(() => { fetchHabits() }, [fetchHabits])
  return { habits, loading, refresh: fetchHabits }
}
