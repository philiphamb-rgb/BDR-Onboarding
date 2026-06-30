// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, SkeletonCard, ProgressBar } from '@/components/ui'
import { PageHeader } from '@/components/manager'
import { PhoneIcon, TargetIcon, HandshakeIcon, ArrowRightIcon, LightningIcon, CoinIcon } from '@/components/icons'
import { PIPELINE_STAGES, stageMeta } from '@/lib/partnerChecklist'
import { askCoach } from '@/lib/coachBus'
import { goalStats } from '@/lib/priorityEngine'
import { GoalCockpit } from '@/components/GoalCockpit'

const WON = 'opportunity_won'
const rate = (arr) => arr.length ? Math.round(arr.filter(p => p.stage === WON).length / arr.length * 100) : 0

export default function AnalyticsPage() {
  const supabase = createClient()
  const [partners, setPartners] = useState([])
  const [prog, setProg] = useState<any>(null)
  const [userId, setUserId] = useState<string>()
  const [teamId, setTeamId] = useState<string | null>(null)
  const [goalInput, setGoalInput] = useState('')
  const [savedGoal, setSavedGoal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      Promise.all([
        supabase.from('partner_onboarding').select('stage, temperature').eq('user_id', user.id),
        supabase.from('user_progress').select('calls_this_week, demos_this_week, deals_this_month, total_deals').eq('user_id', user.id).single(),
        supabase.from('goals').select('monthly_deal_goal').eq('user_id', user.id).maybeSingle(),
        supabase.from('users').select('team_id').eq('id', user.id).single(),
      ]).then(([{ data: p }, { data: pr }, { data: g }, { data: u }]) => {
        setPartners(p ?? []); setProg(pr ?? {})
        if (g?.monthly_deal_goal != null) { setSavedGoal(g.monthly_deal_goal); setGoalInput(String(g.monthly_deal_goal)) }
        setTeamId(u?.team_id ?? null)
        setLoading(false)
      })
    })
  }, [])

  const saveGoal = async () => {
    const n = parseInt(goalInput, 10)
    if (!userId || !Number.isFinite(n) || n < 0) return
    await supabase.from('goals').upsert({ user_id: userId, team_id: teamId, monthly_deal_goal: n, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    setSavedGoal(n)
    const { toast } = await import('@/components/ui'); toast.success('Monthly goal saved')
  }

  if (loading) return <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>

  const warm = partners.filter(p => (p.temperature ?? 'cold') === 'warm')
  const cold = partners.filter(p => (p.temperature ?? 'cold') === 'cold')
  const won = partners.filter(p => p.stage === WON).length
  const funnel = PIPELINE_STAGES.map(s => ({ ...s, n: partners.filter(p => p.stage === s.key).length }))
  const maxN = Math.max(1, ...funnel.map(f => f.n))

  const gstats = goalStats(savedGoal, prog?.deals_this_month ?? 0, new Date())

  const tiles = [
    { label: 'Total partners', value: partners.length },
    { label: '🔥 Warm', value: warm.length },
    { label: '❄️ Cold', value: cold.length },
    { label: 'Won', value: won },
  ]

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title="Analytics" subtitle="Your pipeline, conversion, and activity at a glance." />

      {/* Proactive coaching on the numbers right here */}
      <button onClick={() => askCoach('Look at my analytics — my pipeline, conversion, and activity. What is my single biggest bottleneck and what 3 specific things should I do to improve my numbers?')}
        className="flex w-full items-center gap-3 rounded-2xl bg-gradient-hero p-3.5 text-left text-white shadow-card transition-transform active:scale-[0.99]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15"><LightningIcon size={18} className="text-white" /></div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-[800]">Coach me on these numbers</div>
          <div className="text-[11px] text-white/75">Your biggest bottleneck & how to fix it</div>
        </div>
        <ArrowRightIcon size={16} className="shrink-0 text-white/80 animate-nudge-x" />
      </button>

      {/* Live goal cockpit — the same dashboard shown on Home & Today */}
      {gstats.hasGoal && (
        <Card className="overflow-hidden !p-0">
          <GoalCockpit g={gstats} title="This month's goal" />
        </Card>
      )}

      {/* Set / edit the monthly deal goal — the single setter for the whole app */}
      <Card data-tour="an-goal">
        <div className="label mb-2">{gstats.hasGoal ? 'Edit your monthly deal goal' : 'Set your monthly deal goal'}</div>
        <div className="flex items-center gap-2">
          <input type="number" min={0} value={goalInput} onChange={e => setGoalInput(e.target.value)} placeholder="e.g. 8"
            className="w-24 rounded-md border border-border px-3 py-2 text-sm font-[700] text-dark-text focus:outline-none focus:ring-2 focus:ring-navy" />
          <span className="text-[12px] text-gray">deals / month</span>
          <button onClick={saveGoal} className="ml-auto rounded-md bg-navy px-3 py-2 text-[12px] font-[700] text-white hover:bg-navy-dark">Save</button>
        </div>
        <p className="mt-2 text-[11px] text-gray">This goal powers your live pace, projection, and game plan across Home, Today, and Coach.</p>
      </Card>

      {partners.length === 0 ? (
        <Card className="text-center !py-8">
          <p className="text-sm text-gray">Add partners and tag them warm or cold to unlock your conversion analytics.</p>
          <Link href="/partners" className="mt-3 inline-flex items-center gap-1 text-[13px] font-[700] text-teal">Go to Partners <ArrowRightIcon size={14} /></Link>
        </Card>
      ) : (
        <>
          {/* Headline tiles */}
          <div className="grid grid-cols-4 gap-2">
            {tiles.map(t => (
              <Card key={t.label} className="!p-3 text-center">
                <div className="text-h2 font-[800] text-dark-text tabular-nums">{t.value}</div>
                <div className="mt-0.5 text-[11px] text-gray">{t.label}</div>
              </Card>
            ))}
          </div>

          {/* Closing rate — warm vs cold */}
          <Card>
            <div className="label mb-3">Closing rate</div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { l: 'Overall', v: rate(partners), c: '#003087' },
                { l: '🔥 Warm', v: rate(warm), c: '#EA580C' },
                { l: '❄️ Cold', v: rate(cold), c: '#2563EB' },
              ].map(x => (
                <div key={x.l}>
                  <div className="text-[26px] font-[900] tabular-nums" style={{ color: x.c }}>{x.v}%</div>
                  <div className="mt-1 text-[11px] text-gray">{x.l}</div>
                  <ProgressBar value={x.v} max={100} color={x.c} className="mt-1 h-1.5" />
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-gray">Closing rate = partners at “Opportunity Won” ÷ total leads in that segment.</p>
          </Card>

          {/* Pipeline funnel */}
          <Card>
            <div className="label mb-3">Pipeline funnel</div>
            <div className="space-y-2">
              {funnel.map(f => (
                <div key={f.key} className="flex items-center gap-3">
                  <span className="w-[110px] shrink-0 text-[12px] font-[700] text-mid-text">{f.label}</span>
                  <div className="h-5 flex-1 overflow-hidden rounded-md bg-bdrbg">
                    <div className="h-full rounded-md transition-all" style={{ width: `${(f.n / maxN) * 100}%`, backgroundColor: f.color, minWidth: f.n ? 6 : 0 }} />
                  </div>
                  <span className="w-6 shrink-0 text-right text-[12px] font-[800] text-dark-text tabular-nums">{f.n}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Activity */}
          <Card>
            <div className="label mb-3">Activity</div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { Icon: PhoneIcon, label: 'Calls / wk', value: prog?.calls_this_week ?? 0 },
                { Icon: TargetIcon, label: 'Demos / wk', value: prog?.demos_this_week ?? 0 },
                { Icon: HandshakeIcon, label: 'Deals / mo', value: prog?.deals_this_month ?? 0 },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-border bg-bdrbg p-3 text-center">
                  <s.Icon size={20} className="mx-auto mb-1 text-navy" />
                  <div className="text-h3 font-bold text-dark-text tabular-nums">{s.value}</div>
                  <div className="text-[11px] text-gray">{s.label}</div>
                </div>
              ))}
            </div>
          </Card>

        </>
      )}

      {/* Income Calculator — commission goal → daily calls/demos (embedded tool) */}
      <Card data-tour="an-calc" className="!p-3">
        <div className="mb-2 flex items-center gap-2">
          <CoinIcon size={16} className="text-teal" />
          <span className="label">Income Calculator</span>
        </div>
        <p className="mb-2 text-[12px] text-gray">Set a commission goal and the Hub back-solves the daily calls and demos to hit it.</p>
        <iframe
          src="/tools/income-calculator.html"
          title="BDR Income & Commission Goals Calculator"
          className="w-full rounded-xl border border-border bg-white"
          style={{ height: 'calc(100vh - 12rem)', minHeight: 520 }}
        />
      </Card>
    </div>
  )
}
