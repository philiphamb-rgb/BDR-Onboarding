// @ts-nocheck
'use client'

// The single hook the Cortex surfaces consume. Owns: the team's AI Team
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
  const [goals, setGoals] = useState<{ leads_per_week_goal: number | null; close_rate_goal: number | null; monthly_deal_goal: number | null; monthly_income_goal: number | null }>({ leads_per_week_goal: null, close_rate_goal: null, monthly_deal_goal: null, monthly_income_goal: null })
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
      supabase.from('goals').select('leads_per_week_goal, close_rate_goal, monthly_deal_goal, monthly_income_goal').eq('user_id', user.id).maybeSingle(),
      supabase.from('partner_onboarding').select('id, stage, temperature, created_at, updated_at, partner_name, deal_amount, deal_probability').eq('user_id', user.id).limit(500),
    ])
    setAutoRows(autos ?? [])
    if (goalRow) setGoals({ leads_per_week_goal: goalRow.leads_per_week_goal, close_rate_goal: goalRow.close_rate_goal, monthly_deal_goal: goalRow.monthly_deal_goal, monthly_income_goal: goalRow.monthly_income_goal })
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
    // Won partners graduate out of the temperature buckets so a signed-but-hot
    // record isn't counted as both Hot and Won (the buckets + Won stay disjoint).
    const won = all.filter(p => p.stage === 'opportunity_won').length
    const active = all.filter(p => p.stage !== 'opportunity_won')
    const hot = active.filter(p => temp(p) === 'hot').length
    const warm = active.filter(p => temp(p) === 'warm').length
    const cold = active.filter(p => temp(p) === 'cold').length
    const newThisWeek = all.filter(p => p.created_at && new Date(p.created_at) >= ws).length
    const closeRate = all.length ? Math.round((won / all.length) * 100) : 0
    return { total: all.length, hot, warm, cold, newThisWeek, won, closeRate }
  }, [partners])

  // A derived lead list for the Lead Gen board: a deterministic 0–100 pseudo-score
  // from the REAL pipeline (temperature + stage + recency), badged as derived —
  // no parallel leads table, no invented data.
  const leadList = useMemo(() => {
    const STAGE_BUMP: Record<string, number> = { opportunity_won: 20, contract_signed: 14, proposal_sent: 8, interested: 4, new_lead: 0 }
    const TEMP_BASE: Record<string, number> = { hot: 74, warm: 54, cold: 32 }
    const now = Date.now()
    return (partners ?? []).map((p: any) => {
      const t = p.temperature ?? 'cold'
      const agoMin = Math.max(0, Math.round((now - new Date(p.updated_at || p.created_at || now).getTime()) / 60000))
      let score = (TEMP_BASE[t] ?? 32) + (STAGE_BUMP[p.stage] ?? 0)
      if (agoMin > 4320) score -= 8              // 3d+ stale
      const stage = p.stage === 'opportunity_won' ? 'converted' : t
      const amt = p.deal_amount != null ? Number(p.deal_amount) : null
      const prob = p.deal_probability != null ? Number(p.deal_probability) : null
      return { id: p.id, name: p.partner_name || 'Unnamed agency', score: Math.max(1, Math.min(100, score)), stage, temperature: t, rawStage: p.stage, agoMin, amount: amt, probability: prob, weighted: amt != null && prob != null ? (amt * prob) / 100 : null }
    }).sort((a, b) => b.score - a.score)
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
        // Only write the growth-goal columns present; never clobber the deal goal
        // the Commission Planner owns unless explicitly changed here.
        const payload: any = { user_id: userId, team_id: teamRef.current, leads_per_week_goal: next.leads_per_week_goal, close_rate_goal: next.close_rate_goal, updated_at: new Date().toISOString() }
        // Write these only when the caller actually touched them (present in the
        // patch) — including when set to null, so a goal can be cleared.
        if ('monthly_income_goal' in patch) payload.monthly_income_goal = next.monthly_income_goal
        if ('monthly_deal_goal' in patch) payload.monthly_deal_goal = next.monthly_deal_goal
        supabase.from('goals').upsert(payload, { onConflict: 'user_id' }).then(() => {})
      }, 500)
      return next
    })
  }, [userId, supabase])

  return { loading, isManager, roster, liveCount, leads, leadList, goals, saveGoals, setStatus, reload: load }
}
