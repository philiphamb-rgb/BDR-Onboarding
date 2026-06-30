// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'

// Growth OS — Overview. The "where you stand" surface: your growth goals
// (leads/week + close rate, on the same goals row the Commission Planner and
// Goal Cockpit use), a live snapshot of your real pipeline by temperature, and
// the pulse of your AI Team. Everything links into the real screens — no
// parallel pipeline, no second coach.

import Link from 'next/link'
import { useState } from 'react'
import { Card, Button, Skeleton } from '@/components/ui'
import { CountUp } from '@/components/CountUp'
import { GrowthTabs } from '@/components/GrowthTabs'
import { GrowIcon, FlameIcon, HandshakeIcon, IntegrationIcon, EditIcon, CheckIcon, ArrowRightIcon, TargetIcon, ChartRisingIcon, LightningIcon } from '@/components/icons'
import { useGrowthOS } from '@/lib/hooks/useGrowthOS'
import { askCoach } from '@/lib/coachBus'
import { cn } from '@/lib/utils'

function Ring({ pct, label, sub, tone = '#00C2B2' }: { pct: number; label: string; sub: string; tone?: string }) {
  const r = 26, c = 2 * Math.PI * r, off = c - (Math.min(100, Math.max(0, pct)) / 100) * c
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-[64px] w-[64px] shrink-0">
        <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="6" />
          <circle cx="32" cy="32" r={r} fill="none" stroke={tone} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[14px] font-[900] text-white tabular-nums">{Math.round(Math.min(100, Math.max(0, pct)))}%</div>
      </div>
      <div className="min-w-0">
        <div className="text-[20px] font-[900] leading-none text-white">{label}</div>
        <div className="mt-1 text-[11px] font-[600] text-white/75">{sub}</div>
      </div>
    </div>
  )
}

export default function GrowthOverviewPage() {
  const { loading, roster, liveCount, leads, goals, saveGoals } = useGrowthOS()
  const [editing, setEditing] = useState(false)

  const lpw = goals.leads_per_week_goal || 0
  const crGoal = goals.close_rate_goal != null ? Number(goals.close_rate_goal) : 0
  const leadPct = lpw > 0 ? (leads.newThisWeek / lpw) * 100 : 0
  const crPct = crGoal > 0 ? (leads.closeRate / crGoal) * 100 : 0
  const hasGoals = lpw > 0 || crGoal > 0

  const Header = (
    <>
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-hero text-white"><GrowIcon size={18} /></span>
        <div>
          <h1 className="text-h2 leading-tight text-dark-text">Growth OS</h1>
          <p className="text-[12px] text-gray">Your AI-powered growth engine</p>
        </div>
      </div>
      <GrowthTabs />
    </>
  )

  if (loading) return (
    <div className="space-y-4 stagger-rise">{Header}<Skeleton className="h-44 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /></div>
  )

  return (
    <div className="space-y-4 stagger-rise">
      {Header}

      {/* Growth goals — same goals row as the Commission Planner & Goal Cockpit */}
      <Card className="overflow-hidden !p-0">
        <div className="bg-gradient-hero p-4">
          <div className="mb-3 flex items-center gap-2 text-white">
            <TargetIcon size={15} />
            <span className="text-[13px] font-[800]">Your growth goals</span>
            <button onClick={() => setEditing(e => !e)} className="ml-auto flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-[700] hover:bg-white/25">
              {editing ? <><CheckIcon size={12} /> Done</> : <><EditIcon size={12} /> Edit</>}
            </button>
          </div>

          {editing ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="rounded-xl bg-white/10 p-3">
                <span className="block text-[11px] font-[700] text-white/75">Leads / week</span>
                <input type="number" min={0} value={lpw || ''} onChange={e => saveGoals({ leads_per_week_goal: e.target.value === '' ? null : Math.max(0, parseInt(e.target.value) || 0) })}
                  placeholder="10" className="mt-1 w-full bg-transparent text-[22px] font-[900] text-white outline-none placeholder-white/40" />
              </label>
              <label className="rounded-xl bg-white/10 p-3">
                <span className="block text-[11px] font-[700] text-white/75">Close rate goal %</span>
                <input type="number" min={0} max={100} value={crGoal || ''} onChange={e => saveGoals({ close_rate_goal: e.target.value === '' ? null : Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                  placeholder="25" className="mt-1 w-full bg-transparent text-[22px] font-[900] text-white outline-none placeholder-white/40" />
              </label>
            </div>
          ) : hasGoals ? (
            <div className={cn('grid gap-3', lpw > 0 && crGoal > 0 ? 'grid-cols-2' : 'grid-cols-1')}>
              {lpw > 0 && <Ring pct={leadPct} label={<><CountUp value={leads.newThisWeek} />/{lpw}</>} sub={`new leads this week`} />}
              {crGoal > 0 && <Ring pct={crPct} label={`${leads.closeRate}%`} sub={`all-time close · goal ${crGoal}%`} tone="#F5A623" />}
            </div>
          ) : (
            <button onClick={() => setEditing(true)} className="flex w-full items-center gap-2 rounded-xl bg-white/10 p-3 text-[13px] font-[700] text-white hover:bg-white/15">
              <TargetIcon size={16} className="shrink-0" /> Set your leads/week and close-rate goals <ArrowRightIcon size={14} className="ml-auto shrink-0" />
            </button>
          )}
        </div>
        {hasGoals && !editing && (
          <div className="flex items-start gap-2 p-3">
            <LightningIcon size={14} className="mt-0.5 shrink-0 text-teal" />
            <p className="text-[12px] leading-relaxed text-mid-text">
              {lpw > 0
                ? (leads.newThisWeek >= lpw
                    ? `Top-of-funnel is healthy — ${leads.newThisWeek} new leads this week. Now turn the pressure to conversion.`
                    : `You're at ${leads.newThisWeek} of ${lpw} new leads this week. Feed the funnel from Partners to stay on pace.`)
                : `Your close rate is ${leads.closeRate}% against a ${crGoal}% goal. Tighten discovery on your warmest leads to lift it.`}
            </p>
          </div>
        )}
      </Card>

      {/* Live pipeline snapshot — the real partner_onboarding pipeline */}
      <Link href="/partners" className="block active:scale-[0.99] transition-transform">
        <Card className="!p-4 hover:border-teal/40">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2"><HandshakeIcon size={16} className="text-navy" /><span className="text-[13px] font-[800] text-dark-text">Pipeline right now</span></div>
            <span className="flex items-center gap-1 text-[12px] font-[700] text-navy">Open Partners <ArrowRightIcon size={13} /></span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { k: 'Hot', v: leads.hot, tone: 'text-error', bg: 'bg-error/8', icon: <FlameIcon size={14} className="text-error" /> },
              { k: 'Warm', v: leads.warm, tone: 'text-[#A06C00]', bg: 'bg-gold/12', icon: <FlameIcon size={14} className="text-gold" /> },
              { k: 'Cold', v: leads.cold, tone: 'text-navy', bg: 'bg-navy/6', icon: <FlameIcon size={14} className="text-navy/50" /> },
            ].map(s => (
              <div key={s.k} className={cn('rounded-xl p-2.5 text-center', s.bg)}>
                <div className="mb-0.5 flex items-center justify-center gap-1">{s.icon}<span className="text-[10px] font-[800] uppercase tracking-wide text-gray">{s.k}</span></div>
                <div className={cn('text-[22px] font-[900] tabular-nums', s.tone)}><CountUp value={s.v} /></div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-center text-[11px] text-gray">{leads.total} partners tracked · {leads.won} won</div>
        </Card>
      </Link>

      {/* AI Team pulse */}
      <Link href="/grow/team" className="block active:scale-[0.99] transition-transform">
        <Card className="!p-4 hover:border-teal/40">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal/10 text-teal"><IntegrationIcon size={22} /></span>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-[800] text-dark-text">AI Team</div>
              <div className="text-[12px] text-gray"><span className="font-[800] text-teal">{liveCount}</span> of {roster.length} agents live & working your funnel</div>
            </div>
            <ArrowRightIcon size={16} className="shrink-0 text-gray" />
          </div>
        </Card>
      </Link>

      {/* Quick entries to Content + Build */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/grow/content" className="block active:scale-[0.98] transition-transform">
          <Card className="h-full !p-4 hover:border-teal/40">
            <EditIcon size={20} className="text-navy" />
            <div className="mt-2 text-[13.5px] font-[800] text-dark-text">Content Engine</div>
            <p className="mt-0.5 text-[11.5px] leading-snug text-gray">Generate & save outreach angles</p>
          </Card>
        </Link>
        <Link href="/grow/build" className="block active:scale-[0.98] transition-transform">
          <Card className="h-full !p-4 hover:border-teal/40">
            <ChartRisingIcon size={20} className="text-navy" />
            <div className="mt-2 text-[13.5px] font-[800] text-dark-text">Build Phases</div>
            <p className="mt-0.5 text-[11.5px] leading-snug text-gray">Stand up your growth system</p>
          </Card>
        </Link>
      </div>

      {/* One coach — summon the existing AI Coach with growth context */}
      <button onClick={() => askCoach("Look at my Growth OS: my leads-per-week and close-rate goals, my pipeline by temperature, and what my AI Team is doing. What are the 3 highest-leverage moves to grow my number this week?")}
        className="relative flex w-full items-center gap-3 overflow-hidden rounded-2xl bg-navy p-4 text-left text-white shadow-card transition-transform active:scale-[0.99]">
        <span className="pointer-events-none absolute inset-y-0 left-0 w-1/4 animate-shimmer bg-white/15 blur-md" aria-hidden="true" />
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15"><LightningIcon size={18} /></div>
        <div className="relative min-w-0 flex-1">
          <div className="text-[14px] font-[800]">Ask your coach about growth</div>
          <div className="text-[11px] text-white/75">Your top 3 moves, from your real numbers</div>
        </div>
        <ArrowRightIcon size={16} className="relative shrink-0 animate-nudge-x text-white/80" />
      </button>
    </div>
  )
}
