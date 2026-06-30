// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, Button, ProgressBar, Badge, SkeletonCard, toast } from '@/components/ui'
import { PageHeader } from '@/components/manager'
import { CoinIcon, TargetIcon, PhoneIcon, HandshakeIcon, ClockIcon, ArrowRightIcon, ChartRisingIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import {
  GOAL_DEFAULTS, computeTargets, computePace, fmtMoney, PACE_LABEL,
} from '@/lib/goals'

// First and last day of the current calendar month as YYYY-MM-DD (local).
function monthRange(now = new Date()) {
  const y = now.getFullYear(), m = now.getMonth()
  const pad = (d: number) => String(d).padStart(2, '0')
  const first = `${y}-${pad(m + 1)}-01`
  const lastDay = new Date(y, m + 1, 0).getDate()
  const last = `${y}-${pad(m + 1)}-${pad(lastDay)}`
  return { first, last }
}

const PACE_BADGE = { ahead: 'success', 'on-track': 'teal', behind: 'gold', 'no-data': 'gray' } as const

export default function GoalsPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string>()
  const [teamId, setTeamId] = useState<string | null>(null)
  const [goalId, setGoalId] = useState<string | null>(null)
  const [dealsThisMonth, setDealsThisMonth] = useState(0)
  const [form, setForm] = useState({ ...GOAL_DEFAULTS })
  const [saved, setSaved] = useState(false)   // a goal exists in the DB
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      const { first, last } = monthRange()
      const [{ data: u }, { data: goal }, { data: deals }] = await Promise.all([
        supabase.from('users').select('team_id').eq('id', user.id).single(),
        supabase.from('goals').select('*').eq('user_id', user.id).eq('is_active', true).maybeSingle(),
        supabase.from('wins').select('id').eq('user_id', user.id).eq('type', 'deal')
          .gte('logged_at', first + 'T00:00:00').lte('logged_at', last + 'T23:59:59'),
      ])
      setTeamId(u?.team_id ?? null)
      setDealsThisMonth(deals?.length ?? 0)
      if (goal) {
        setGoalId(goal.id)
        setSaved(true)
        setForm({
          target_income: goal.target_income ?? 0,
          commission_per_deal: goal.commission_per_deal ?? 0,
          close_rate: goal.close_rate ?? GOAL_DEFAULTS.close_rate,
          working_days: goal.working_days ?? GOAL_DEFAULTS.working_days,
        })
      }
      setLoading(false)
    })
  }, [])

  const setNum = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setForm(prev => ({ ...prev, [key]: v === '' ? 0 : Math.max(0, Number(v)) }))
  }

  const targets = computeTargets(form)
  const pace = saved ? computePace(form, dealsThisMonth) : null

  const save = async () => {
    if (!userId) return
    if (!(form.target_income > 0) || !(form.commission_per_deal > 0) || !(form.working_days > 0)) {
      toast.error('Enter a target, what you earn per deal, and your selling days.')
      return
    }
    setSaving(true)
    try {
      const row = {
        user_id: userId,
        team_id: teamId,
        period: 'monthly',
        target_income: form.target_income,
        commission_per_deal: form.commission_per_deal,
        close_rate: form.close_rate,
        working_days: form.working_days,
        is_active: true,
        updated_at: new Date().toISOString(),
      }
      let error
      if (goalId) {
        ({ error } = await supabase.from('goals').update(row).eq('id', goalId))
      } else {
        const ins = await supabase.from('goals').insert(row).select('id').single()
        error = ins.error
        if (ins.data?.id) setGoalId(ins.data.id)
      }
      if (error) { toast.error('Could not save your goal.'); return }
      setSaved(true)

      // Best-effort XP for setting a goal — silently no-ops if the action isn't
      // wired into calculate-xp yet, so saving never depends on it.
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/calculate-xp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ action: 'goal_set', user_id: userId }),
          })
          if (res.ok) {
            const { xp_earned } = await res.json()
            if (xp_earned > 0) { toast.xp(xp_earned, 'Goal set!'); return }
          }
        }
      } catch { /* ignore */ }
      toast.success('Goal saved')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>

  return (
    <div className="space-y-5 pb-4">
      <PageHeader title="Commission Goal" subtitle="Set your income target — we'll turn it into a daily activity plan." />

      {/* Pace summary (only once a goal is saved) */}
      {pace && targets && (
        <Card className="bg-gradient-hero text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-[800] uppercase tracking-[0.08em] text-white/70 mb-1">This month</div>
              <div className="text-[26px] font-[800] leading-none">{fmtMoney(pace.earned)}</div>
              <div className="text-[12px] text-white/75 mt-1">of {fmtMoney(form.target_income)} · {pace.dealsClosed} deal{pace.dealsClosed === 1 ? '' : 's'} closed</div>
            </div>
            <Badge variant={PACE_BADGE[pace.status]}>{PACE_LABEL[pace.status]}</Badge>
          </div>
          <div className="mt-3">
            <ProgressBar value={Math.min(100, pace.progressPct)} max={100} color="#FFFFFF" className="h-2" />
            <div className="mt-1 flex justify-between text-[11px] text-white/70">
              <span>{Math.round(pace.progressPct)}% there</span>
              <span>{pace.daysRemaining} selling day{pace.daysRemaining === 1 ? '' : 's'} left</span>
            </div>
          </div>
          {pace.remainingDeals > 0 && (
            <p className="mt-3 text-[12px] text-white/85 leading-relaxed">
              {Math.ceil(pace.remainingDeals)} more deal{Math.ceil(pace.remainingDeals) === 1 ? '' : 's'} to go —
              about <b>{Math.ceil(pace.dealsPerRemainingDay)}/day</b>
              {form.close_rate > 0 && <> (~{Math.ceil(pace.conversationsPerRemainingDay)} conversations/day)</>} the rest of the month.
            </p>
          )}
        </Card>
      )}

      {/* Inputs */}
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <CoinIcon size={16} className="text-navy" />
          <h2 className="text-h3 text-dark-text">Your numbers</h2>
        </div>
        <div className="space-y-3">
          <Field label="Monthly commission target" prefix="$"
            value={form.target_income} onChange={setNum('target_income')}
            hint="The take-home commission you want to earn this month." />
          <Field label="Average commission per deal" prefix="$"
            value={form.commission_per_deal} onChange={setNum('commission_per_deal')}
            hint="What you typically earn when one partner signs. Use your own real number." />
          <Field label="Close rate" suffix="%"
            value={form.close_rate} onChange={setNum('close_rate')}
            hint="Share of conversations that become signed deals. 5% ≈ 1 in 20." />
          <Field label="Selling days this month" value={form.working_days} onChange={setNum('working_days')}
            hint="Days you'll actually be prospecting. Typical month ≈ 21." />
        </div>
        <Button variant="conversion" fullWidth className="mt-4" loading={saving} onClick={save}>
          {saved ? 'Update goal' : 'Save goal & build my plan'}
        </Button>
      </Card>

      {/* Derived plan */}
      {targets ? (
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <TargetIcon size={16} className="text-teal" />
            <h2 className="text-h3 text-dark-text">What it takes</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat icon={<HandshakeIcon size={18} className="text-navy" />} value={Math.ceil(targets.dealsNeeded)} label="deals this month" />
            <Stat icon={<PhoneIcon size={18} className="text-navy" />} value={form.close_rate > 0 ? Math.ceil(targets.conversationsNeeded) : '—'} label="conversations needed" />
            <Stat icon={<TargetIcon size={18} className="text-teal" />} value={targets.dealsPerDayCeil} label="deals / day" />
            <Stat icon={<ChartRisingIcon size={18} className="text-teal" />} value={form.close_rate > 0 ? targets.conversationsPerDayCeil : '—'} label="conversations / day" />
          </div>
          <Link href="/schedule" className="mt-3 inline-flex items-center gap-1 text-[12px] font-[700] text-teal hover:text-teal-dark">
            See this across your Daily Rhythm power blocks <ArrowRightIcon size={13} />
          </Link>
        </Card>
      ) : (
        <Card className="text-center">
          <p className="text-[13px] text-gray">Enter your target and what you earn per deal to see your daily plan.</p>
        </Card>
      )}

      <Link href="/coach">
        <Card hover className="flex items-center gap-3 !p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold"><ClockIcon size={18} /></div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-[700] text-dark-text">Ask your Coach how to hit it</div>
            <div className="text-[12px] text-gray">Get a plan to make every selling minute count.</div>
          </div>
          <span className="shrink-0 text-[12px] font-[700] text-teal">Open →</span>
        </Card>
      </Link>
    </div>
  )
}

function Field({ label, value, onChange, prefix, suffix, hint }: {
  label: string; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  prefix?: string; suffix?: string; hint?: string
}) {
  return (
    <div>
      <label className="label mb-1 block">{label}</label>
      <div className="flex items-center rounded-md border border-border bg-bdrbg focus-within:border-navy/50">
        {prefix && <span className="pl-3 text-[14px] font-[700] text-gray">{prefix}</span>}
        <input
          type="number" inputMode="decimal" min={0}
          value={value === 0 ? '' : value}
          onChange={onChange}
          placeholder="0"
          className="w-full bg-transparent px-3 py-2.5 text-[15px] font-[700] text-dark-text outline-none"
        />
        {suffix && <span className="pr-3 text-[14px] font-[700] text-gray">{suffix}</span>}
      </div>
      {hint && <p className="mt-1 text-[11px] text-gray leading-snug">{hint}</p>}
    </div>
  )
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-bdrbg p-3">
      <div className="mb-1 flex items-center gap-1.5">{icon}</div>
      <div className="text-[20px] font-[800] text-dark-text leading-none tabular-nums">{value}</div>
      <div className="mt-1 text-[11px] text-gray">{label}</div>
    </div>
  )
}
