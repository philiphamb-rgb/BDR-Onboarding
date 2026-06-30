// @ts-nocheck
'use client'

// The single hook every Income/Commission Calculator surface consumes. It owns
// loading the BDR's plan + check-ins + today's playbook from Supabase, running
// the pure engine, and saving edits (debounced). Native to BDR Hub: auth via
// supabase.auth.getUser(), and — crucially — it keeps the live Goal Cockpit in
// sync by deriving the plan's implied monthly deal target into goals.monthly_deal_goal.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  computePlan, computeInsight, trackerSummary,
  type Plan, type PlanInputs, type CheckIn, type Path, type BufferKey, type Insight,
} from '@/lib/income/engine'

const DEFAULTS: Omit<PlanInputs, 'target' | 'base' | 'path' | 'buffer'> = {
  b2cRate: 14.39, b2cChurn: 5, bwWarmLeads: 5, bwWarmRate: 30, b2cSelfRate: 10,
  bbComm: 750, bbWarmLeads: 2, bbWarmRate: 25, bbSelfRate: 15,
}

function rowToInputs(r: any): PlanInputs {
  return {
    target: Number(r.target), base: Number(r.base), path: r.path as Path, buffer: r.buffer as BufferKey,
    b2cRate: Number(r.b2c_rate), b2cChurn: Number(r.b2c_churn), bwWarmLeads: Number(r.bw_warm_leads),
    bwWarmRate: Number(r.bw_warm_rate), b2cSelfRate: Number(r.b2c_self_rate),
    bbComm: Number(r.bb_comm), bbWarmLeads: Number(r.bb_warm_leads), bbWarmRate: Number(r.bb_warm_rate), bbSelfRate: Number(r.bb_self_rate),
  }
}
// The deal-count goal that an income plan implies (monthly closes), so the
// shared Goal Cockpit / triage engine plan around the same number.
export function impliedMonthlyDeals(plan: Plan): number {
  return Math.max(1, Math.round((plan.grossY1 || 0) / 12))
}
function localDateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function useIncomeCalculator() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [bdrName, setBdrName] = useState('')
  const [planId, setPlanId] = useState<string | null>(null)
  const [inputs, setInputs] = useState<PlanInputs>({ target: 200000, base: 80000, path: 'b2c', buffer: 'safe', ...DEFAULTS })
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [playbook, setPlaybookState] = useState<boolean[]>([])
  const [hasPlan, setHasPlan] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<any>(null)
  const today = localDateKey()

  useEffect(() => {
    let active = true
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || !active) { setLoading(false); return }
      setUserId(user.id)
      const [{ data: u }, { data: planRow }, { data: pb }] = await Promise.all([
        supabase.from('users').select('name, team_id').eq('id', user.id).single(),
        supabase.from('income_plans').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('income_playbook_checks').select('checks').eq('user_id', user.id).eq('check_date', today).maybeSingle(),
      ])
      if (!active) return
      setBdrName(u?.name ?? '')
      setTeamId(u?.team_id ?? null)
      if (pb?.checks) setPlaybookState(pb.checks)
      if (planRow) {
        setPlanId(planRow.id); setHasPlan(true); setInputs(rowToInputs(planRow))
        const { data: ci } = await supabase.from('income_checkins').select('week_number, contacts, closes, target_contacts').eq('plan_id', planRow.id)
        if (active && ci) setCheckIns(ci.sort((a: any, b: any) => a.week_number - b.week_number).map((r: any) => ({ c: r.contacts, x: r.closes, t: r.target_contacts })))
      }
      setLoading(false)
    })
    return () => { active = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const plan: Plan = useMemo(() => computePlan(inputs), [inputs])
  const insight: Insight | null = useMemo(() => computeInsight(plan, checkIns), [plan, checkIns])
  const stats = useMemo(() => trackerSummary(plan, checkIns), [plan, checkIns])

  const updateInputs = useCallback((patch: Partial<PlanInputs>) => {
    setInputs(prev => {
      const next = { ...prev, ...patch }
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        if (!userId) return
        setSaving(true)
        const payload = {
          user_id: userId, target: next.target, base: next.base, path: next.path, buffer: next.buffer,
          b2c_rate: next.b2cRate, b2c_churn: next.b2cChurn, bw_warm_leads: next.bwWarmLeads, bw_warm_rate: next.bwWarmRate, b2c_self_rate: next.b2cSelfRate,
          bb_comm: next.bbComm, bb_warm_leads: next.bbWarmLeads, bb_warm_rate: next.bbWarmRate, bb_self_rate: next.bbSelfRate,
        }
        const { data } = await supabase.from('income_plans').upsert(payload, { onConflict: 'user_id' }).select('id').single()
        if (data) { setPlanId(data.id); setHasPlan(true) }
        // Keep the shared Goal Cockpit in sync: the income plan IS the goal.
        const monthly = impliedMonthlyDeals(computePlan(next))
        await supabase.from('goals').upsert({ user_id: userId, team_id: teamId, monthly_deal_goal: monthly, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
        setSaving(false)
      }, 600)
      return next
    })
  }, [userId, teamId, supabase])

  const setPlaybook = useCallback((checks: boolean[]) => {
    setPlaybookState(checks)
    if (!userId) return
    supabase.from('income_playbook_checks').upsert({ user_id: userId, check_date: today, checks, updated_at: new Date().toISOString() }, { onConflict: 'user_id,check_date' }).then(() => {})
  }, [userId, today, supabase])

  const logWeek = useCallback(async (contacts: number, closes: number) => {
    if (!userId || !planId) return { error: 'no-plan' }
    const weekNumber = checkIns.length + 1
    const targetContacts = plan.totalWk || plan.coldWk
    const { error } = await supabase.from('income_checkins').insert({ user_id: userId, plan_id: planId, week_number: weekNumber, contacts, closes, target_contacts: targetContacts })
    if (!error) setCheckIns(prev => [...prev, { c: contacts, x: closes, t: targetContacts }])
    return { error }
  }, [userId, planId, checkIns.length, plan.totalWk, plan.coldWk, supabase])

  return { loading, saving, hasPlan, inputs, updateInputs, plan, insight, checkIns, stats, playbook, setPlaybook, logWeek, bdrName }
}
