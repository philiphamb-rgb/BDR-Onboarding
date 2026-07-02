'use client'

// Multi-horizon coach goals on goal_items. Distinct from the primary monthly
// deal goal (the singleton `goals` row the GoalCockpit reads) — these are the
// richer annual→daily goals the coach helps design and plans around.

import { useCallback, useEffect, useState } from 'react'
import { createUntypedClient } from '@/lib/supabase/untyped'

export type Horizon = 'annual' | 'quarterly' | 'monthly' | 'weekly' | 'daily'
export type GoalCategory = 'revenue' | 'content' | 'outreach' | 'partner' | 'habit'
export type GoalStatus = 'active' | 'hit' | 'missed' | 'archived'

export interface GoalItem {
  id: string
  horizon: Horizon
  category: GoalCategory | null
  title: string
  target: number | null
  metric: string | null
  progress: number
  status: GoalStatus
  due_date: string | null
  created_at: string
}

export const HORIZONS: Horizon[] = ['annual', 'quarterly', 'monthly', 'weekly', 'daily']
export const CATEGORIES: GoalCategory[] = ['revenue', 'content', 'outreach', 'partner', 'habit']

export function useGoals() {
  const supabase = createUntypedClient()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [goals, setGoals] = useState<GoalItem[]>([])
  const [nonce, setNonce] = useState(0)
  const reload = useCallback(() => setNonce(n => n + 1), [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (!cancelled) setLoading(false); return }
      const { data: me } = await supabase.from('users').select('team_id').eq('id', user.id).maybeSingle()
      const { data } = await supabase.from('goal_items').select('*').order('created_at', { ascending: false })
      if (cancelled) return
      setUserId(user.id); setTeamId(me?.team_id ?? null); setGoals(data ?? []); setLoading(false)
    })()
    return () => { cancelled = true }
  }, [nonce, supabase])

  const create = async (values: Partial<GoalItem>) => {
    if (!userId) return { error: 'Not signed in' }
    const { error } = await supabase.from('goal_items').insert({ ...values, user_id: userId, team_id: teamId })
    if (error) return { error: error.message }
    reload(); return {}
  }
  const update = async (id: string, values: Partial<GoalItem>) => {
    const { error } = await supabase.from('goal_items').update({ ...values, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) return { error: error.message }
    reload(); return {}
  }
  const remove = async (id: string) => {
    const { error } = await supabase.from('goal_items').delete().eq('id', id)
    if (error) return { error: error.message }
    reload(); return {}
  }

  return { loading, goals, reload, create, update, remove }
}
