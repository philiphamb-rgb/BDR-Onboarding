// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'

// Apex — Content Engine. The top-of-funnel that tells you exactly what to
// publish next to attract agency partners, and why it's worth your time —
// ranked by Expected Value. Next Move hero + ranked queue + income forecast +
// 30-day funnel, a "What's Working" analytics view, a downloadable Creator
// Playbook, and your saved idea board. Every "Generate" summons the one coach.

import { useEffect, useState } from 'react'
import { Card, Button, Skeleton } from '@/components/ui'
import { GrowthTabs } from '@/components/GrowthTabs'
import { GrowthChrome } from '@/components/growth/GrowthChrome'
import {
  LightningIcon, ClockIcon, ChevronDownIcon, ArrowRightIcon, IntegrationIcon, TargetIcon,
  ChartRisingIcon, DownloadIcon, PlusIcon, CheckIcon, TrashIcon, InfoIcon, StarIcon,
} from '@/components/icons'
import { useGrowthOS } from '@/lib/hooks/useGrowthOS'
import { useModuleKV } from '@/lib/hooks/useModuleKV'
import {
  NEXT_MOVE, STACK, INCOME, FUNNEL, LEADERBOARD, HOOKS, PILLARS, HEAT_HOURS, HEAT_DAYS,
  heatVal, fmtMoney, fmtCompact, downloadPlaybook,
} from '@/lib/modules/growth-os/content'
import { askCoach } from '@/lib/coachBus'
import { cn } from '@/lib/utils'

const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

function ConfChip({ level }: any) {
  const proven = level === 'Proven'
  return <span className={cn('inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-[800] uppercase tracking-wide', proven ? 'bg-success/10 text-success' : 'bg-gold/12 text-[#A06C00]')}><span className={cn('h-1.5 w-1.5 rounded-full', proven ? 'bg-success' : 'bg-gold')} />{level}</span>
}
function ChannelChip({ channel }: any) {
  return <span className={cn('rounded px-1.5 py-0.5 text-[9.5px] font-[800] uppercase', channel === 'face' ? 'bg-teal/10 text-teal' : 'bg-navy/8 text-navy-ink')}>{channel === 'face' ? 'Face' : 'Faceless'}</span>
}
function Countdown({ minutes }: any) {
  const [secs, setSecs] = useState(minutes * 60)
  useEffect(() => { const t = setInterval(() => setSecs(s => s > 0 ? s - 1 : 0), 1000); return () => clearInterval(t) }, [])
  const m = Math.floor(secs / 60), s = secs % 60, urgent = secs < 600
  return <span className={cn('inline-flex items-center gap-1.5 text-[12px] font-[600]', urgent ? 'text-error' : 'text-gray')}><ClockIcon size={12} /> window closes in <span className="tabular-nums">{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}</span></span>
}

function NextMoveCard() {
  const [expanded, setExpanded] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  return (
    <Card className={cn('relative overflow-hidden !p-5', status && 'opacity-60')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-[800] uppercase tracking-wide text-[#A06C00]"><LightningIcon size={13} /> Next Move</span>
          <ConfChip level={NEXT_MOVE.confidence} />
        </div>
        <Countdown minutes={NEXT_MOVE.windowMins} />
      </div>
      <h2 className="mt-3 text-[19px] font-[800] leading-snug text-dark-text">{NEXT_MOVE.title}</h2>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-gray">
        <span>{NEXT_MOVE.format}</span><span>·</span><span>{NEXT_MOVE.pillar}</span><ChannelChip channel={NEXT_MOVE.channel} />
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-4">
        <div>
          <div className="text-[10px] font-[700] uppercase tracking-wide text-gray">Expected Value</div>
          <div className="text-[38px] font-[900] leading-none text-teal">{fmtMoney(NEXT_MOVE.ev)}</div>
        </div>
        <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[12px] font-[700] text-gray">why this number <ChevronDownIcon size={12} className={cn('transition-transform', expanded && 'rotate-180')} /></button>
        <div className="flex-1" />
        <div className="flex gap-2">
          <button onClick={() => setStatus('skipped')} disabled={!!status} className="rounded-lg border border-border px-3.5 py-2 text-[12.5px] font-[700] text-gray">Skip</button>
          <button onClick={() => setStatus('done')} disabled={!!status} className="flex items-center gap-1.5 rounded-lg bg-success/10 px-3.5 py-2 text-[12.5px] font-[800] text-success"><CheckIcon size={13} /> Done</button>
          <button onClick={() => askCoach(`Write the full, ready-to-shoot script for this ConsumerDirect Co-Brand PLUS+ content piece aimed at credit-repair AGENCY owners: "${NEXT_MOVE.title}" (${NEXT_MOVE.format}, pillar ${NEXT_MOVE.pillar}). Strong hook in the first 2 seconds, beat-by-beat structure, on-screen text, and a clear CTA. Compliant — no guaranteed credit outcomes.`)}
            disabled={!!status} className="flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-[12.5px] font-[800] text-white"><IntegrationIcon size={13} /> Generate with AI</button>
        </div>
      </div>
      {status && <div className={cn('mt-3 text-[12px] font-[600]', status === 'done' ? 'text-success' : 'text-gray')}>{status === 'done' ? 'Marked done — the next move refreshes with tomorrow’s queue.' : 'Skipped — the next move refreshes with tomorrow’s queue.'}</div>}
      {expanded && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="mb-3 flex gap-2 rounded-lg bg-teal/[0.06] p-3"><InfoIcon size={13} className="mt-0.5 shrink-0 text-teal" /><span className="text-[12px] leading-relaxed text-mid-text"><span className="font-[800] text-dark-text">What "Expected Value" means: </span>a smart guess at how much recurring partner revenue this post will drive, from what similar posts actually did. Higher EV = better bet for your next 30 minutes.</span></div>
          {NEXT_MOVE.math.map((row, i) => (
            <div key={i} className={cn('flex items-baseline justify-between gap-3 py-2', i < NEXT_MOVE.math.length - 1 && 'border-b border-border')}>
              <div><div className="text-[12.5px] text-dark-text">{row.label}</div><div className="text-[11px] text-gray">{row.note}</div></div>
              <div className="shrink-0 text-[12.5px] font-[700] tabular-nums text-teal">{row.value}</div>
            </div>
          ))}
          <div className="mt-3 flex items-center justify-between rounded-lg bg-gold/12 px-3.5 py-2.5 text-[12.5px] font-[800] text-[#A06C00]"><span>{NEXT_MOVE.evFinal}</span><span>= {fmtMoney(NEXT_MOVE.ev)} EV</span></div>
        </div>
      )}
    </Card>
  )
}

function StackCard({ item, rank }: any) {
  return (
    <Card className="flex items-center gap-3 !p-3.5">
      <div className="w-6 shrink-0 text-[12px] font-[800] tabular-nums text-gray">{String(rank).padStart(2, '0')}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-[700] text-dark-text">{item.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-gray">{item.format}</span><ConfChip level={item.conf} /><ChannelChip channel={item.channel} />
        </div>
      </div>
      <div className="shrink-0 text-right"><div className="text-[9px] uppercase text-gray">EV</div><div className="text-[15px] font-[800] tabular-nums text-dark-text">{fmtMoney(item.ev)}</div></div>
      <button onClick={() => askCoach(`Write the full ready-to-shoot script for this Co-Brand PLUS+ content piece for agency owners: "${item.title}" (${item.format}, pillar ${item.pillar}). Hook, structure, on-screen text, CTA. Compliant.`)} aria-label="Generate script" className="flex shrink-0 items-center rounded-lg bg-teal/10 p-2 text-teal"><IntegrationIcon size={13} /></button>
    </Card>
  )
}

function IncomeRail({ annualGoal }: any) {
  const { worst, expected, best, mtdActual, daysLeft } = INCOME
  const pacePct = Math.round((mtdActual / expected) * 100)
  const annualRunRate = expected * 12
  const goalPct = Math.min(100, Math.round((annualRunRate / annualGoal) * 100))
  const bands = [{ label: 'Worst case', value: worst, c: 'bg-gray' }, { label: 'Expected', value: expected, c: 'bg-teal' }, { label: 'Best case', value: best, c: 'bg-gold' }]
  return (
    <Card className="!p-4">
      <div className="mb-3 flex items-center gap-1.5"><TargetIcon size={13} className="text-[#A06C00]" /><span className="text-[11px] font-[800] uppercase tracking-wide text-dark-text">Income Forecast</span></div>
      <div className="mb-3"><div className="text-[11px] text-gray">MTD actual · {daysLeft}d left</div><div className="text-[24px] font-[900] text-dark-text">{fmtMoney(mtdActual)}</div><div className="mt-0.5 text-[11.5px] font-[600] text-success">{pacePct}% of expected, on pace</div></div>
      <div className="mb-4 space-y-2.5">
        {bands.map(b => (
          <div key={b.label}>
            <div className="mb-1 flex justify-between text-[11.5px]"><span className="text-gray">{b.label}</span><span className="font-[700] tabular-nums text-dark-text">{fmtMoney(b.value)}</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-border"><div className={cn('h-full rounded-full', b.c)} style={{ width: `${(b.value / best) * 100}%` }} /></div>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-navy p-3 text-white">
        <div className="text-[10px] text-white/65">Path to {fmtMoney(annualGoal)} / year</div>
        <div className="text-[17px] font-[900]">{fmtMoney(annualRunRate)}<span className="text-[11px] font-[500] text-white/60"> run-rate</span></div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-gold" style={{ width: `${goalPct}%` }} /></div>
        <div className="mt-1.5 text-[10.5px] text-white/65">{goalPct}% of the way at this month's expected pace</div>
      </div>
      <div className="mt-2 text-center text-[10px] italic text-gray">Forecast is demo data until a commission source connects</div>
    </Card>
  )
}

function FunnelWaterfall() {
  const max = FUNNEL[0].value
  return (
    <Card className="!p-4">
      <div className="mb-3 flex items-center gap-1.5"><ChartRisingIcon size={13} className="text-teal" /><span className="text-[11px] font-[800] uppercase tracking-wide text-dark-text">30-Day Funnel</span></div>
      <div className="flex items-stretch overflow-x-auto">
        {FUNNEL.map((f, i) => {
          const prev = i > 0 ? FUNNEL[i - 1].value : null
          const drop = prev ? Math.round((1 - f.value / prev) * 100) : null
          const h = f.isCurrency ? 100 : Math.max(8, (f.value / max) * 100)
          return (
            <div key={f.stage} className="flex items-stretch">
              {i > 0 && <div className="flex w-11 shrink-0 flex-col items-center justify-center"><ArrowRightIcon size={12} className="text-gray" /><span className={cn('mt-1 text-[10px]', drop > 80 ? 'text-error' : 'text-gray')}>−{drop}%</span></div>}
              <div className="flex min-w-[58px] flex-1 flex-col items-center">
                <div className="mb-2 flex h-[70px] items-end"><div className={cn('w-9 rounded-md', f.isCurrency ? 'bg-gold' : 'bg-teal')} style={{ height: `${h}%`, minHeight: 5 }} /></div>
                <div className={cn('text-[13px] font-[700] tabular-nums', f.isCurrency ? 'text-[#A06C00]' : 'text-dark-text')}>{f.isCurrency ? fmtMoney(f.value) : fmtCompact(f.value)}</div>
                <div className="mt-0.5 text-[10px] uppercase text-gray">{f.stage}</div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function WhatsWorking() {
  const maxEv = Math.max(...HOOKS.map(h => h.avgEv))
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => downloadPlaybook(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))} icon={<DownloadIcon size={14} />}>Download Creator Playbook</Button>
      </div>
      {/* Format leaderboard */}
      <Card className="!p-4">
        <div className="mb-3 flex items-center gap-1.5"><ChartRisingIcon size={13} className="text-teal" /><span className="text-[13px] font-[700] text-dark-text">Format leaderboard</span><span className="text-[11px] text-gray">· avg EV, last 30 days</span></div>
        <div className="space-y-1.5">
          {LEADERBOARD.map(r => (
            <div key={r.format} className="flex items-center gap-2 rounded-lg bg-bdrbg px-3 py-2.5">
              <span className="flex-1 text-[13px] font-[500] text-dark-text">{r.format}</span>
              <span className="w-10 text-right text-[12px] tabular-nums text-gray">{r.posts}</span>
              <span className="w-16 text-right text-[13px] font-[800] tabular-nums text-teal">{fmtMoney(r.avgEv)}</span>
              <span className="w-12 text-right text-[12px] tabular-nums text-gray">{r.saveRate}</span>
              <span className="w-4 text-right">{r.trend !== 0 && <ChartRisingIcon size={13} className={r.trend > 0 ? 'text-success' : 'text-error'} style={r.trend < 0 ? { transform: 'scaleY(-1)' } : undefined} />}</span>
            </div>
          ))}
        </div>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Hooks */}
        <Card className="!p-4">
          <div className="mb-3 flex items-center gap-1.5"><LightningIcon size={13} className="text-teal" /><span className="text-[13px] font-[700] text-dark-text">Hook archetypes</span></div>
          <div className="space-y-3">
            {HOOKS.map(h => (
              <div key={h.name}>
                <div className="mb-1.5 flex justify-between gap-2"><span className="text-[12px] text-dark-text">{h.name}</span><span className="shrink-0 text-[12px] font-[800] tabular-nums text-teal">{fmtMoney(h.avgEv)}</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-teal" style={{ width: `${(h.avgEv / maxEv) * 100}%` }} /></div>
              </div>
            ))}
          </div>
          <button onClick={() => askCoach('Write 5 new opening hooks for ConsumerDirect Co-Brand PLUS+ content aimed at credit-repair agency owners, modeled on the top archetype "Before / after revenue reveal" (avg EV $1,510, 71% retention). 5 fresh, specific first-2-second lines.')} className="mt-3 flex w-full items-center justify-between rounded-lg bg-teal/10 px-3.5 py-2.5 text-[12px] font-[700] text-teal"><span>Generate 5 new hooks with AI</span><ArrowRightIcon size={12} /></button>
        </Card>
        {/* Pillars */}
        <Card className="!p-4">
          <div className="mb-3 flex items-center gap-1.5"><TargetIcon size={13} className="text-teal" /><span className="text-[13px] font-[700] text-dark-text">Pillar mix vs goal</span></div>
          <div className="space-y-3.5">
            {PILLARS.map(p => {
              const over = p.actualPct > p.goalPct
              return (
                <div key={p.name}>
                  <div className="mb-1.5 flex justify-between"><span className="text-[12px] text-dark-text">{p.name}</span><span className={cn('text-[11px]', over ? 'text-[#A06C00]' : 'text-gray')}>{p.actualPct}% <span className="text-gray">/ goal {p.goalPct}%</span></span></div>
                  <div className="relative h-2 rounded-full bg-border"><div className="absolute -top-0.5 bottom-[-2px] w-0.5 bg-gray" style={{ left: `${p.goalPct}%` }} /><div className={cn('h-full rounded-full', over ? 'bg-gold' : 'bg-teal')} style={{ width: `${p.actualPct}%` }} /></div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
      {/* Heatmap */}
      <Card className="!p-4">
        <div className="mb-3 flex items-center gap-1.5"><ClockIcon size={13} className="text-teal" /><span className="text-[13px] font-[700] text-dark-text">Posting-window heatmap</span><span className="text-[11px] text-gray">· EV density by day × hour</span></div>
        <div className="overflow-x-auto">
          <div className="min-w-[520px]">
            <div className="mb-1 grid gap-1" style={{ gridTemplateColumns: `40px repeat(${HEAT_HOURS.length}, 1fr)` }}>
              <div />{HEAT_HOURS.map(h => <div key={h} className="text-center text-[9px] text-gray">{h}:00</div>)}
            </div>
            {HEAT_DAYS.map((d, di) => (
              <div key={d} className="mb-1 grid gap-1" style={{ gridTemplateColumns: `40px repeat(${HEAT_HOURS.length}, 1fr)` }}>
                <div className="flex items-center text-[10px] text-gray">{d}</div>
                {HEAT_HOURS.map(h => { const v = heatVal(di, h); return <div key={h} title={`${d} ${h}:00 — ${v} EV`} className="rounded" style={{ aspectRatio: '1.4', background: `rgba(0,194,178,${0.06 + (v / 100) * 0.7})` }} /> })}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}

export default function GrowthContentPage() {
  const { goals } = useGrowthOS()
  const { value: kv, save } = useModuleKV('growth_content', { ideas: [] })
  const [view, setView] = useState('now')
  const [channel, setChannel] = useState('all')
  const [draft, setDraft] = useState('')
  const annualGoal = (goals.monthly_income_goal ? Number(goals.monthly_income_goal) : 16667) * 12
  const filteredStack = STACK.filter(s => channel === 'all' || s.channel === channel)
  const ideas = kv.ideas || []
  const addIdea = () => { const t = draft.trim(); if (!t) return; save(p => ({ ideas: [{ id: uid(), text: t, used: false }, ...(p.ideas || [])] })); setDraft('') }

  return (
    <div className="space-y-4 stagger-rise">
      <GrowthChrome />
      <GrowthTabs />

      <div className="flex items-start gap-2 rounded-xl bg-teal/[0.06] p-3">
        <InfoIcon size={14} className="mt-0.5 shrink-0 text-teal" />
        <p className="text-[11.5px] leading-relaxed text-mid-text"><span className="font-[700] text-dark-text">How this works: </span>every piece below carries an <span className="font-[700]">EV (Expected Value)</span> — a smart guess at the recurring partner revenue it drives. Higher = better use of your next 30 minutes. It feeds straight into Lead Gen: more saves and DMs here means more agency leads to score and route there. Analytics shown are demo data until a live source connects.</p>
      </div>

      <div className="flex w-fit gap-0.5 rounded-lg border border-border bg-bdrbg p-1">
        {[['now', 'Next Move'], ['working', "What's Working"]].map(([id, l]) => (
          <button key={id} onClick={() => setView(id)} className={cn('rounded-md px-3.5 py-1.5 text-[12.5px] font-[700]', view === id ? 'bg-navy text-white' : 'text-gray hover:text-navy-ink')}>{l}</button>
        ))}
      </div>

      {view === 'now' ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="min-w-0 space-y-4">
            <NextMoveCard />
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-[800] uppercase tracking-wide text-gray">Ranked queue</span>
                <div className="flex gap-1">
                  {[['all', 'All'], ['face', 'Face'], ['faceless', 'Faceless']].map(([id, l]) => (
                    <button key={id} onClick={() => setChannel(id)} className={cn('rounded-full border px-2.5 py-0.5 text-[10.5px] font-[700]', channel === id ? 'border-navy bg-navy text-white' : 'border-border text-gray')}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {filteredStack.length === 0 ? (
                  <p className="rounded-xl border border-border bg-bdrbg px-3 py-6 text-center text-[12px] text-gray">No queued moves for this channel — switch the filter above to see more.</p>
                ) : filteredStack.map((item, i) => <StackCard key={item.id} item={item} rank={i + 2} />)}
              </div>
            </div>
            <FunnelWaterfall />
          </div>
          <IncomeRail annualGoal={annualGoal} />
        </div>
      ) : (
        <WhatsWorking />
      )}

      {/* Saved idea board */}
      <div>
        <h2 className="mb-2 px-0.5 text-[13px] font-[800] uppercase tracking-wide text-navy-ink">Your idea board</h2>
        <Card className="!p-3">
          <div className="flex items-end gap-2">
            <textarea value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); addIdea() } }} placeholder="Jot a content idea, hook, or subject line to keep…" rows={1}
              className="max-h-28 flex-1 resize-none rounded-xl border border-border bg-bdrbg px-3 py-2 text-[13px] outline-none placeholder-gray focus:border-navy/40" />
            <Button onClick={addIdea} disabled={!draft.trim()} icon={<PlusIcon size={15} />} className="shrink-0">Save</Button>
          </div>
        </Card>
        {ideas.length > 0 && (
          <div className="mt-2 space-y-2">
            {ideas.map(it => (
              <div key={it.id} className={cn('flex items-start gap-2 rounded-xl border border-border bg-card p-3 shadow-card', it.used && 'opacity-60')}>
                <button onClick={() => save(p => ({ ideas: (p.ideas || []).map(x => x.id === it.id ? { ...x, used: !x.used } : x) }))} aria-label="Toggle used" style={{ minHeight: 22 }} className={cn('mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border-[1.5px]', it.used ? 'border-teal bg-teal text-white' : 'border-gray/40 text-transparent hover:border-teal')}><CheckIcon size={13} /></button>
                <p className={cn('min-w-0 flex-1 whitespace-pre-wrap text-[13px] text-dark-text', it.used && 'line-through')}>{it.text}</p>
                <button onClick={() => save(p => ({ ideas: (p.ideas || []).filter(x => x.id !== it.id) }))} aria-label="Delete" className="shrink-0 text-gray hover:text-error"><TrashIcon size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
