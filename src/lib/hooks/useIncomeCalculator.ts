// @ts-nocheck
'use client'

// The single hook every Income/Commission Calculator surface consumes. It owns
// loading the BDR's plan + check-ins + today's playbook from Supabase, running
// the pure engine, and saving edits (debounced). Native to BDR Hub: auth via
// supabase.auth.getUser(), and — crucially — it keeps the live Goal Cockpit in
// sync by deriving the plan's implied monthly deal target into goals.monthly_deal_goal.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/ui'
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
  const teamRef = useRef<string | null>(null)   // always-latest team_id (no stale closure on first edit)
  // Guards the debounced save effect below against firing before the initial
  // load has actually finished. `setUserId` commits in its OWN render (it
  // runs before the `await Promise.all(...)` beneath it), so there's a window
  // where `userId` is already truthy but `inputs` still holds the hardcoded
  // defaults and any real saved plan hasn't loaded yet — without this guard,
  // a slow connection can let the debounce timer fire first and upsert
  // placeholder defaults on top of (silently clobbering) the rep's real plan.
  const initialLoadDoneRef = useRef(false)
  // The exact `inputs` object set from a loaded plan row — compared by
  // REFERENCE below so the save effect can skip re-uploading the identical
  // data it was just loaded from without a fragile "consume a boolean flag
  // on the next run" scheme (which can't tell "the run right after load" apart
  // from "the next real edit" when React batches renders differently than
  // expected). A real edit always produces a new `{...prev, ...patch}` object,
  // so this comparison naturally stops matching from the first real edit on.
  const loadedInputsRef = useRef<PlanInputs | null>(null)
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
      setTeamId(u?.team_id ?? null); teamRef.current = u?.team_id ?? null
      if (pb?.checks) setPlaybookState(pb.checks)
      if (planRow) {
        setPlanId(planRow.id); setHasPlan(true)
        const loaded = rowToInputs(planRow)
        loadedInputsRef.current = loaded
        setInputs(loaded)
        const { data: ci } = await supabase.from('income_checkins').select('week_number, contacts, closes, target_contacts').eq('plan_id', planRow.id)
        if (active && ci) setCheckIns(ci.sort((a: any, b: any) => a.week_number - b.week_number).map((r: any) => ({ c: r.contacts, x: r.closes, t: r.target_contacts })))
      }
      initialLoadDoneRef.current = true
      setLoading(false)
    })
    return () => { active = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const plan: Plan = useMemo(() => computePlan(inputs), [inputs])
  const insight: Insight | null = useMemo(() => computeInsight(plan, checkIns), [plan, checkIns])
  const stats = useMemo(() => trackerSummary(plan, checkIns), [plan, checkIns])

  const updateInputs = useCallback((patch: Partial<PlanInputs>) => {
    setInputs(prev => ({ ...prev, ...patch }))
  }, [])

  // Debounced save — a plain effect watching `inputs`, not a side effect
  // nested inside setInputs' updater (which React may invoke more than once
  // per commit, e.g. under Strict Mode, and must stay pure). Every genuine
  // edit resets the 600ms timer via the standard effect-cleanup debounce
  // pattern. Any failure now surfaces to the rep instead of vanishing —
  // previously a failed save just silently reverted the "Saving…" indicator
  // to blank with no explanation.
  useEffect(() => {
    if (!userId || !initialLoadDoneRef.current) return
    if (inputs === loadedInputsRef.current) return
    const timer = setTimeout(async () => {
      setSaving(true)
      const payload = {
        user_id: userId, target: inputs.target, base: inputs.base, path: inputs.path, buffer: inputs.buffer,
        b2c_rate: inputs.b2cRate, b2c_churn: inputs.b2cChurn, bw_warm_leads: inputs.bwWarmLeads, bw_warm_rate: inputs.bwWarmRate, b2c_self_rate: inputs.b2cSelfRate,
        bb_comm: inputs.bbComm, bb_warm_leads: inputs.bbWarmLeads, bb_warm_rate: inputs.bbWarmRate, bb_self_rate: inputs.bbSelfRate,
      }
      const { data, error } = await supabase.from('income_plans').upsert(payload, { onConflict: 'user_id' }).select('id').single()
      if (error || !data) { setSaving(false); toast.error('Your plan didn’t save — try again.'); return }   // don't clobber the goal if the plan didn't save
      setPlanId(data.id); setHasPlan(true)
      // Keep the shared Goal Cockpit in sync: the income plan IS the goal.
      const monthly = impliedMonthlyDeals(computePlan(inputs))
      const { error: goalError } = await supabase.from('goals').upsert({ user_id: userId, team_id: teamRef.current, monthly_deal_goal: monthly, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      if (goalError) toast.error('Plan saved, but couldn’t sync your goal — reopen this page to retry.')
      setSaving(false)
    }, 600)
    return () => clearTimeout(timer)
  }, [inputs, userId, supabase])

  const setPlaybook = useCallback((checks: boolean[]) => {
    const prev = playbook
    setPlaybookState(checks)
    if (!userId) return
    supabase.from('income_playbook_checks')
      .upsert({ user_id: userId, check_date: today, checks, updated_at: new Date().toISOString() }, { onConflict: 'user_id,check_date' })
      .then(({ error }) => { if (error) { setPlaybookState(prev); toast.error('That didn’t save — try again.') } })
  }, [userId, today, supabase, playbook])

  const logWeek = useCallback(async (contacts: number, closes: number) => {
    if (!userId || !planId) return { error: 'no-plan' }
    const weekNumber = checkIns.length + 1
    const targetContacts = plan.totalWk || plan.coldWk
    const { error } = await supabase.from('income_checkins').insert({ user_id: userId, plan_id: planId, week_number: weekNumber, contacts, closes, target_contacts: targetContacts })
    if (!error) setCheckIns(prev => [...prev, { c: contacts, x: closes, t: targetContacts }])
    else toast.error('That week didn’t save — try again.')
    return { error }
  }, [userId, planId, checkIns.length, plan.totalWk, plan.coldWk, supabase])

  return { loading, saving, hasPlan, inputs, updateInputs, plan, insight, checkIns, stats, playbook, setPlaybook, logWeek, bdrName }
}
