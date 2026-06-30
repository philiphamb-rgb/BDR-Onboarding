// @ts-nocheck
'use client'

// The single hook the Growth OS surfaces consume. Owns: the team's AI Team
// roster (automations table, merged with the static catalog), the rep's growth
// goals (leads/week + close rate, on the SAME `goals` row the Commission Planner
// and Goal Cockpit already use — no parallel store), and a live lead snapshot
// derived from partner_onboarding (the real pipeline — no separate leads table).
//
// Writes respect the DB's RLS exactly: any team member reads the roster; only a
// manager/owner can flip an automation's status. Reps get a read-only roster.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { mergeRoster, type AutomationStatus } from '@/lib/modules/growth-os/roster'

function weekStart(now = new Date()) {
  const d = new Date(now)
  const day = (d.getDay() + 6) % 7        // Monday = 0
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - day)
  return d
}

export function useGrowthOS() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [isManager, setIsManager] = useState(false)
  const teamRef = useRef<string | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [autoRows, setAutoRows] = useState<any[]>([])
  const [goals, setGoals] = useState<{ leads_per_week_goal: number | null; close_rate_goal: number | null; monthly_deal_goal: number | null }>({ leads_per_week_goal: null, close_rate_goal: null, monthly_deal_goal: null })
  const [partners, setPartners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const saveTimer = useRef<any>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    setUserId(user.id)
    const { data: u } = await supabase.from('users').select('team_id, role').eq('id', user.id).single()
    const tid = u?.team_id ?? null
    teamRef.current = tid; setTeamId(tid)
    setIsManager(['manager', 'owner'].includes(u?.role ?? 'rep'))

    const [{ data: autos }, { data: goalRow }, { data: pp }] = await Promise.all([
      tid ? supabase.from('automations').select('id, status, updated_at, updated_by').eq('team_id', tid) : Promise.resolve({ data: [] }),
      supabase.from('goals').select('leads_per_week_goal, close_rate_goal, monthly_deal_goal').eq('user_id', user.id).maybeSingle(),
      supabase.from('partner_onboarding').select('stage, temperature, created_at').eq('user_id', user.id).limit(500),
    ])
    setAutoRows(autos ?? [])
    if (goalRow) setGoals({ leads_per_week_goal: goalRow.leads_per_week_goal, close_rate_goal: goalRow.close_rate_goal, monthly_deal_goal: goalRow.monthly_deal_goal })
    setPartners(pp ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const roster = useMemo(() => mergeRoster(autoRows), [autoRows])
  const liveCount = roster.filter(a => a.status === 'live').length

  // Live lead snapshot from the real pipeline — temperature mix, this week's new
  // leads vs goal, and the actual close rate vs goal.
  const leads = useMemo(() => {
    const all = partners ?? []
    const ws = weekStart()
    const temp = (p: any) => (p.temperature ?? 'cold')
    const hot = all.filter(p => temp(p) === 'hot').length
    const warm = all.filter(p => temp(p) === 'warm').length
    const cold = all.filter(p => temp(p) === 'cold').length
    const newThisWeek = all.filter(p => p.created_at && new Date(p.created_at) >= ws).length
    const won = all.filter(p => p.stage === 'opportunity_won').length
    const closeRate = all.length ? Math.round((won / all.length) * 100) : 0
    return { total: all.length, hot, warm, cold, newThisWeek, won, closeRate }
  }, [partners])

  // Toggle an automation's status (manager-only; RLS enforces it server-side too).
  // Upserts the full row so a team that was never seeded still persists cleanly.
  const setStatus = useCallback(async (agent: { id: string; name: string; category: string }, status: AutomationStatus) => {
    if (!isManager || !teamRef.current || !userId) return
    setAutoRows(prev => {
      const i = prev.findIndex(r => r.id === agent.id)
      const row = { id: agent.id, status, updated_at: new Date().toISOString(), updated_by: userId }
      return i >= 0 ? prev.map(r => r.id === agent.id ? { ...r, ...row } : r) : [...prev, row]
    })
    await supabase.from('automations').upsert(
      { team_id: teamRef.current, id: agent.id, name: agent.name, category: agent.category, status, updated_by: userId, updated_at: new Date().toISOString() },
      { onConflict: 'team_id,id' },
    )
  }, [isManager, userId, supabase])

  // Persist growth goals onto the shared per-user goals row (debounced).
  const saveGoals = useCallback((patch: Partial<typeof goals>) => {
    setGoals(prev => {
      const next = { ...prev, ...patch }
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        if (!userId) return
        supabase.from('goals').upsert(
          { user_id: userId, team_id: teamRef.current, leads_per_week_goal: next.leads_per_week_goal, close_rate_goal: next.close_rate_goal, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        ).then(() => {})
      }, 500)
      return next
    })
  }, [userId, supabase])

  return { loading, isManager, roster, liveCount, leads, goals, saveGoals, setStatus, reload: load }
}
