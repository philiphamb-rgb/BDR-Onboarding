// @ts-nocheck
'use client'

// Income & Commission Planner — native BDR Hub module. Turns an income goal into
// a daily number, projects the year, and tracks weekly pace. The plan's implied
// monthly deals sync to the shared Goal Cockpit (see useIncomeCalculator), so
// this is the engine behind the goal — not a separate calculator.

import { useState } from 'react'
import Link from 'next/link'
import { Card, Button, ProgressBar, Skeleton } from '@/components/ui'
import { CountUp } from '@/components/CountUp'
import { AiTip } from '@/components/AiTip'
import { CoinIcon, LightningIcon, TargetIcon, PhoneIcon, HandshakeIcon, CheckIcon, ArrowRightIcon, ChartRisingIcon, FlameIcon, GrowIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { askCoach } from '@/lib/coachBus'
import { useIncomeCalculator, impliedMonthlyDeals } from '@/lib/hooks/useIncomeCalculator'
import { usePipelineMomentum } from '@/lib/hooks/usePipelineMomentum'
import { fmt, fmtK } from '@/lib/income/engine'

const BUFFERS = [
  { key: 'min', label: 'Minimum', sub: 'exact goal' },
  { key: 'safe', label: 'Safe', sub: '+15% cushion' },
  { key: 'stretch', label: 'Stretch', sub: '+30% cushion' },
]

function Num({ label, suffix, value, onChange, step = 1 }: any) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-[700] text-gray">{label}</span>
      <div className="flex items-center rounded-lg border border-border bg-card focus-within:ring-2 focus-within:ring-navy/30">
        <input type="number" inputMode="decimal" value={value} step={step}
          onChange={e => onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))}
          className="w-full rounded-lg bg-transparent px-3 py-2 text-[14px] font-[700] text-dark-text outline-none" />
        {suffix && <span className="pr-3 text-[12px] text-gray">{suffix}</span>}
      </div>
    </label>
  )
}

export default function CommissionsPage() {
  const { loading, saving, hasPlan, inputs, updateInputs, plan, insight, stats, playbook, setPlaybook, checkIns, logWeek } = useIncomeCalculator()
  const pipe = usePipelineMomentum()
  const [advanced, setAdvanced] = useState(false)
  const [wkC, setWkC] = useState(''); const [wkX, setWkX] = useState(''); const [logging, setLogging] = useState(false)

  if (loading) return <div className="space-y-4"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-40 rounded-2xl" /></div>

  const isB2C = plan.path === 'b2c'
  const monthly = impliedMonthlyDeals(plan)
  const coversWarm = plan.coldDay === 0 && plan.warmDay > 0

  // Live pipeline momentum vs the monthly production this plan demands.
  const monthlyNeed = Math.max(0, (plan.target || 0) - (plan.base || 0)) / 12
  const coverage = monthlyNeed > 0 ? Math.min(100, (pipe.weighted / monthlyNeed) * 100) : 0

  // Projection chart geometry
  const maxPace = Math.max(plan.target, ...plan.monthly.map(m => m.pace)) * 1.05
  const W = 320, H = 120, PAD = 6
  const x = (m: number) => PAD + ((m - 1) / 11) * (W - PAD * 2)
  const y = (v: number) => H - PAD - (v / maxPace) * (H - PAD * 2)
  const linePts = plan.monthly.map(m => `${x(m.m)},${y(m.pace)}`).join(' ')
  const areaPts = `${x(1)},${H - PAD} ${linePts} ${x(12)},${H - PAD}`

  const handleLog = async () => {
    if (logging) return
    setLogging(true)
    await logWeek(Math.max(0, parseInt(wkC || '0', 10)), Math.max(0, parseInt(wkX || '0', 10)))
    setWkC(''); setWkX(''); setLogging(false)
  }

  const playbookItems = isB2C
    ? ['Send order forms to yesterday’s closes', `Make your ${plan.coldDay || 0} cold contacts`, `Work your ${plan.warmDay || 0} warm leads`, 'Book the next step before hanging up', 'Log activity in HubSpot']
    : ['Follow up with open partner proposals', `Make your ${plan.coldDay || 0} prospecting touches`, `Work your ${plan.warmDay || 0} warm intros`, 'Advance one onboarding checklist', 'Log activity in HubSpot']
  const pbDone = playbookItems.filter((_, i) => playbook[i]).length

  return (
    <div className="space-y-4 stagger-rise pb-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 text-dark-text">Income &amp; Commission Planner</h1>
          <p className="mt-0.5 text-[13px] text-gray">Turn your income goal into a daily number — and track your way there.</p>
        </div>
        <Link href="/analytics" className="hidden shrink-0 items-center gap-1 rounded-pill border border-border bg-card px-3 py-2 text-[12px] font-[700] text-navy shadow-card hover:border-navy/40 desktop:flex">
          <ChartRisingIcon size={15} /> Analytics
        </Link>
      </div>

      <AiTip id="commissions-coach" title="Your plan, coached" prompt="Look at my income plan — am I on track to hit my goal, and what should I focus on this week?" tryLabel="Coach my plan">
        Set your income goal and the Hub back-solves the exact daily activity to hit it. The plan syncs to your goal everywhere — Home, Today, and the Coach all plan around the same number.
      </AiTip>

      {/* Plan inputs */}
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <CoinIcon size={16} className="text-teal" />
          <span className="label text-teal">Your plan</span>
          {saving && <span className="ml-auto text-[11px] text-gray">Saving…</span>}
          {!saving && hasPlan && <span className="ml-auto text-[11px] text-success">Saved</span>}
        </div>

        {/* Path */}
        <div className="mb-3 flex gap-1 rounded-xl bg-bdrbg p-1">
          {[{ k: 'b2c', l: 'Direct (B2C)' }, { k: 'b2b2c', l: 'Partners (B2B2C)' }].map(p => (
            <button key={p.k} onClick={() => updateInputs({ path: p.k as any })}
              className={cn('flex-1 rounded-lg py-2 text-[13px] font-[700] transition-all', plan.path === p.k ? 'bg-card text-navy shadow-sm' : 'text-gray hover:text-navy')}>{p.l}</button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Num label="Income goal" suffix="/yr" step={1000} value={inputs.target} onChange={(v: number) => updateInputs({ target: v })} />
          <Num label="Current base" suffix="/yr" step={1000} value={inputs.base} onChange={(v: number) => updateInputs({ base: v })} />
        </div>

        {/* Buffer */}
        <div className="mt-3">
          <span className="mb-1 block text-[11px] font-[700] text-gray">Cushion</span>
          <div className="grid grid-cols-3 gap-2">
            {BUFFERS.map(b => (
              <button key={b.key} onClick={() => updateInputs({ buffer: b.key as any })}
                className={cn('rounded-lg border px-2 py-2 text-center transition-all', inputs.buffer === b.key ? 'border-teal bg-teal/5' : 'border-border bg-card hover:border-navy/30')}>
                <div className="text-[12px] font-[800] text-dark-text">{b.label}</div>
                <div className="text-[10px] text-gray">{b.sub}</div>
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => setAdvanced(a => !a)} className="mt-3 text-[12px] font-[700] text-navy">{advanced ? 'Hide' : 'Show'} advanced inputs</button>
        {advanced && (
          <div className="mt-2 grid grid-cols-2 gap-3 border-t border-border pt-3">
            {isB2C ? (
              <>
                <Num label="Rate $/sub/mo" value={inputs.b2cRate} step={0.5} onChange={(v: number) => updateInputs({ b2cRate: v })} />
                <Num label="Monthly churn" suffix="%" value={inputs.b2cChurn} onChange={(v: number) => updateInputs({ b2cChurn: v })} />
                <Num label="Warm leads/wk" value={inputs.bwWarmLeads} onChange={(v: number) => updateInputs({ bwWarmLeads: v })} />
                <Num label="Warm close" suffix="%" value={inputs.bwWarmRate} onChange={(v: number) => updateInputs({ bwWarmRate: v })} />
                <Num label="Cold close" suffix="%" value={inputs.b2cSelfRate} onChange={(v: number) => updateInputs({ b2cSelfRate: v })} />
              </>
            ) : (
              <>
                <Num label="$/partner acct" value={inputs.bbComm} step={50} onChange={(v: number) => updateInputs({ bbComm: v })} />
                <Num label="Warm intros/wk" value={inputs.bbWarmLeads} onChange={(v: number) => updateInputs({ bbWarmLeads: v })} />
                <Num label="Warm close" suffix="%" value={inputs.bbWarmRate} onChange={(v: number) => updateInputs({ bbWarmRate: v })} />
                <Num label="Cold close" suffix="%" value={inputs.bbSelfRate} onChange={(v: number) => updateInputs({ bbSelfRate: v })} />
              </>
            )}
          </div>
        )}
      </Card>

      {/* Smart insight */}
      {insight && (
        <div className="flex gap-2.5 rounded-xl border border-teal/30 bg-teal/[0.07] px-4 py-3">
          <LightningIcon size={16} className="mt-0.5 shrink-0 text-teal" />
          <div>
            <div className="text-[10px] font-[800] uppercase tracking-wider text-teal">{insight.lbl}</div>
            <div className="mt-0.5 text-[13px] leading-relaxed text-mid-text">{insight.text}</div>
          </div>
        </div>
      )}

      {/* Daily target hero */}
      <Card className="overflow-hidden !p-0">
        <div className="bg-gradient-hero p-5 text-white">
          <div className="text-[10px] font-[800] uppercase tracking-[0.16em] text-white/40">Your daily target</div>
          {coversWarm ? (
            <div className="mt-2 flex items-end gap-2">
              <span className="text-[52px] font-[800] leading-none tabular-nums"><CountUp value={plan.warmDay} /></span>
              <span className="pb-2 text-sm text-white/55">warm leads/day cover your full goal</span>
            </div>
          ) : (
            <>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-[52px] font-[800] leading-none tabular-nums"><CountUp value={plan.coldDay} /></span>
                <span className="text-sm text-white/50">{isB2C ? 'cold contacts/day' : 'cold prospects/day'}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.07] p-2.5">
                  <div className="text-[10px] font-[700] uppercase tracking-wide text-white/40">Warm</div>
                  <div className="text-2xl font-[800] tabular-nums">{plan.warmDay || 0}</div>
                  <div className="text-[11px] text-white/45">{plan.warmDay > 0 ? 'provided for you' : plan.wL > 0 ? `~${plan.wL}/week` : 'none this week'}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.07] p-2.5">
                  <div className="text-[10px] font-[700] uppercase tracking-wide text-white/40">Cold</div>
                  <div className="text-2xl font-[800] tabular-nums">{plan.coldDay}</div>
                  <div className="text-[11px] text-white/45">{isB2C ? 'cold contacts/day' : 'cold calls/day'}</div>
                </div>
              </div>
              {plan.evContact > 0 && (
                <div className="mt-3 text-[12px] text-white/55">Each contact adds about <strong className="text-[#5EEAD4]">{fmt(plan.evContact)}</strong> in {isB2C ? 'annual recurring value' : 'expected commission'} at your {Math.round(plan.sR * 100)}% close rate.</div>
              )}
            </>
          )}
        </div>
        {/* Goal sync line */}
        <div className="flex items-center gap-2 p-3">
          <TargetIcon size={14} className="shrink-0 text-teal" />
          <p className="text-[12px] text-mid-text">This plan needs about <strong className="text-dark-text">{monthly} deal{monthly > 1 ? 's' : ''}/month</strong> — synced to your goal on Home, Today &amp; Coach.</p>
        </div>
      </Card>

      {/* Live pipeline momentum — real CRM deals rolled up against the plan */}
      {!pipe.loading && pipe.openCount > 0 && (
        <Card className="border-navy/30">
          <div className="mb-3 flex items-center gap-2">
            <ChartRisingIcon size={15} className="text-navy" />
            <span className="label">Pipeline momentum</span>
            <Link href="/grow" className="ml-auto text-[11px] font-[700] text-navy">Open workspace</Link>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-border bg-bdrbg p-3">
              <div className="text-[16px] font-[800] text-teal tabular-nums">{fmt(pipe.weighted)}</div>
              <div className="mt-0.5 text-[10.5px] text-gray">Weighted /mo</div>
            </div>
            <div className="rounded-xl border border-border bg-bdrbg p-3">
              <div className="text-[16px] font-[800] text-dark-text tabular-nums">{fmt(pipe.gross)}</div>
              <div className="mt-0.5 text-[10.5px] text-gray">Gross /mo</div>
            </div>
            <div className="rounded-xl border border-border bg-bdrbg p-3">
              <div className="text-[16px] font-[800] text-dark-text tabular-nums">{pipe.openCount}</div>
              <div className="mt-0.5 text-[10.5px] text-gray">Open deal{pipe.openCount === 1 ? '' : 's'}</div>
            </div>
          </div>
          {monthlyNeed > 0 && (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[11.5px]">
                <span className="font-[700] text-mid-text">Covers your monthly production target</span>
                <span className="font-[800] text-navy tabular-nums">{Math.round(coverage)}%</span>
              </div>
              <ProgressBar value={coverage} max={100} color={coverage >= 100 ? '#16A34A' : '#003087'} className="h-2" />
              <p className="mt-1.5 text-[11px] text-gray">
                {coverage >= 100
                  ? `Your weighted pipeline already covers the ${fmt(monthlyNeed)}/mo this plan needs — protect it and keep advancing stages.`
                  : `You need about ${fmt(monthlyNeed)}/mo in new production. Weighted pipeline covers ${Math.round(coverage)}% — add or advance ${pipe.priced < pipe.openCount ? 'and price the ' + (pipe.openCount - pipe.priced) + ' unpriced ' : ''}deals to close the gap.`}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* 12-month projection */}
      <Card>
        <div className="mb-2 flex items-center gap-2">
          <ChartRisingIcon size={15} className="text-navy" />
          <span className="label">12-month projection</span>
          {plan.goalMonth && <span className="ml-auto rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-[800] text-success">Goal ~month {plan.goalMonth}</span>}
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 120 }}>
          <line x1={PAD} y1={y(plan.target)} x2={W - PAD} y2={y(plan.target)} stroke="#CA8A04" strokeWidth="1" strokeDasharray="4 3" />
          <polygon points={areaPts} fill="#00C2B2" opacity="0.12" />
          <polyline points={linePts} fill="none" stroke="#00C2B2" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {plan.goalMonth && <circle cx={x(plan.goalMonth)} cy={y(plan.monthly[plan.goalMonth - 1].pace)} r="3.5" fill="#16A34A" />}
        </svg>
        <div className="mt-1 flex justify-between text-[10px] text-gray"><span>Mo 1</span><span className="text-gold">Goal {fmtK(plan.target)}</span><span>Mo 12</span></div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {plan.milestones.map(m => (
            <div key={m.m} className="rounded-lg border border-border bg-bdrbg p-2 text-center">
              <div className="text-[11px] font-[800] text-dark-text">Mo {m.m}</div>
              <div className={cn('text-[11px] font-[700]', m.hit ? 'text-success' : 'text-gray')}>{Math.round(m.pct)}%</div>
              <ProgressBar value={m.pct} max={100} color={m.hit ? '#16A34A' : '#00C2B2'} className="mt-1 h-1" />
            </div>
          ))}
        </div>
      </Card>

      {/* Weekly funnel */}
      {plan.funnel && (
        <Card>
          <div className="mb-3 flex items-center gap-2"><PhoneIcon size={15} className="text-navy" /><span className="label">Your weekly funnel</span></div>
          <div className="space-y-1.5">
            {[
              { l: isB2C ? 'Dials' : 'Touches', v: plan.funnel.dials },
              { l: 'Connects', v: plan.funnel.connects },
              { l: 'Conversations', v: plan.funnel.convos },
              { l: isB2C ? 'Demos' : 'Meetings', v: plan.funnel.demos },
              { l: 'Closes', v: plan.funnel.closes },
            ].map((s, i) => {
              const pct = plan.funnel.dials > 0 ? (s.v / plan.funnel.dials) * 100 : 0
              return (
                <div key={s.l} className="flex items-center gap-3">
                  <span className="w-[110px] shrink-0 text-[12px] font-[700] text-mid-text">{s.l}</span>
                  <div className="h-5 flex-1 overflow-hidden rounded-md bg-bdrbg">
                    <div className="h-full rounded-md" style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: i === 4 ? '#16A34A' : '#003087', opacity: 1 - i * 0.13 }} />
                  </div>
                  <span className="w-9 shrink-0 text-right text-[12px] font-[800] text-dark-text tabular-nums">{Math.round(s.v)}</span>
                </div>
              )
            })}
          </div>
          <p className="mt-2 text-[11px] text-gray">Per week, to stay on your daily pace.</p>
        </Card>
      )}

      {/* Earnings breakdown */}
      <Card>
        <div className="mb-3 flex items-center gap-2"><HandshakeIcon size={15} className="text-navy" /><span className="label">Year-1 earnings</span></div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { l: 'Base', v: plan.base },
            { l: 'New production', v: Math.max(0, plan.y1total - plan.base) },
            { l: 'Exit run-rate', v: plan.exitPace },
          ].map(s => (
            <div key={s.l} className="rounded-xl border border-border bg-bdrbg p-3">
              <div className="text-[16px] font-[800] text-dark-text tabular-nums">{fmtK(s.v)}</div>
              <div className="mt-0.5 text-[11px] text-gray">{s.l}</div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between rounded-lg bg-teal/5 px-3 py-2">
          <span className="text-[12px] font-[700] text-mid-text">Projected year-1 total</span>
          <span className="text-[15px] font-[800] text-teal tabular-nums">{fmt(plan.y1total)}</span>
        </div>
      </Card>

      {/* Daily playbook */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2"><CheckIcon size={15} className="text-teal" /><span className="label">Today’s playbook</span></div>
          <span className="text-[11px] font-[700] text-gray tabular-nums">{pbDone}/{playbookItems.length}</span>
        </div>
        <div className="space-y-2">
          {playbookItems.map((item, i) => (
            <button key={i} onClick={() => { const next = [...playbook]; next[i] = !next[i]; setPlaybook(next) }}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-bdrbg p-3 text-left transition-all hover:border-teal/50 active:scale-[0.99]">
              <span style={{ minHeight: 18 }} className={cn('flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border-[1.5px] transition-colors', playbook[i] ? 'border-teal bg-teal text-white' : 'border-border text-transparent')}><CheckIcon size={11} /></span>
              <span className={cn('flex-1 text-[13px] font-[600]', playbook[i] ? 'text-gray line-through' : 'text-dark-text')}>{item}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Weekly pace tracker */}
      <Card className="border-teal/40">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2"><ChartRisingIcon size={15} className="text-teal" /><span className="label">Weekly pace tracker</span></div>
          {stats.streak >= 2 && <span className="flex items-center gap-1 text-[11px] font-[800] text-orange-600"><FlameIcon size={12} />{stats.streak}-week streak</span>}
        </div>
        <div className="mb-3 flex items-center justify-between rounded-lg bg-bdrbg px-3 py-2">
          <span className="text-[12px] font-[700] text-gray">Week {checkIns.length + 1}</span>
          <span className="text-[14px] font-[800] text-dark-text">Target: {(plan.totalWk || plan.coldWk).toLocaleString()} contacts</span>
        </div>
        {checkIns.length > 0 && (
          <p className={cn('mb-3 text-[13px] font-[600]', stats.deficit <= 0 ? 'text-success' : stats.deficit < (plan.totalWk || plan.coldWk) * 0.5 ? 'text-[#A06C00]' : 'text-error')}>
            {stats.deficit <= 0
              ? `On pace${stats.deficit < 0 ? `, ${-stats.deficit} ahead` : ''}. ${stats.actual.toLocaleString()} logged vs ${stats.expected.toLocaleString()} targeted.`
              : `Behind by ${stats.deficit.toLocaleString()} contacts. Adjust this week before it compounds.`}
          </p>
        )}
        <div className="flex gap-2">
          <input type="number" inputMode="numeric" placeholder="Contacts this week" value={wkC} onChange={e => setWkC(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
          <input type="number" inputMode="numeric" placeholder="Closes" value={wkX} onChange={e => setWkX(e.target.value)}
            className="w-24 rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
          <Button size="sm" onClick={handleLog} loading={logging} disabled={!hasPlan}>Log week</Button>
        </div>
        {stats.actualCloseRate !== null && (
          <p className="mt-2 text-[11.5px] text-gray">Actual close rate: <strong className="text-mid-text">{(stats.actualCloseRate * 100).toFixed(1)}%</strong> · ~<strong className="text-mid-text">{fmt(stats.valueFromCloses)}</strong> from {stats.totalCloses} logged close{stats.totalCloses === 1 ? '' : 's'}</p>
        )}
      </Card>

      {/* The bridge to the Apex workspace — this tab handles the money math; the
          strategy to hit it lives in Apex (KPIs + AI game plans). Kept as one
          motivating CTA rather than deep coaching inline. */}
      <Link href="/grow"
        className="relative flex w-full items-center gap-3 overflow-hidden rounded-2xl bg-gradient-hero p-4 text-left text-white shadow-card transition-transform active:scale-[0.99]">
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1/4 animate-shimmer bg-white/20 blur-md" />
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15"><GrowIcon size={20} className="text-white" /></div>
        <div className="relative min-w-0 flex-1">
          <div className="text-[14.5px] font-[900]">Generate strategy via Workspace</div>
          <div className="text-[11.5px] text-white/80">Turn this number into a game plan — your KPIs + AI agents in Agentic OS</div>
        </div>
        <ArrowRightIcon size={18} className="relative shrink-0 text-white/85 animate-nudge-x" />
      </Link>

      <p className="px-1 text-[11px] leading-relaxed text-gray">These projections are estimates based on default retail pricing. Actual earnings depend on your specific order form terms, client activity, refunds, and surcharges. Refer to your order form for exact terms.</p>
    </div>
  )
}
