// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'

// Apex — Overview. The "where you stand" home: shared chrome (health + KPIs
// + Triage Strip), your growth goals ringed against the live pipeline, a
// temperature snapshot of the real partner pipeline, and the pulse of your AI
// Team. Everything links into the real screens — no parallel pipeline, one coach.

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, Skeleton } from '@/components/ui'
import { CountUp } from '@/components/CountUp'
import { GrowthTabs } from '@/components/GrowthTabs'
import { GrowthChrome } from '@/components/growth/GrowthChrome'
import { FlameIcon, HandshakeIcon, IntegrationIcon, EditIcon, ArrowRightIcon, ChartRisingIcon, LightningIcon } from '@/components/icons'
import { useGrowthOS } from '@/lib/hooks/useGrowthOS'
import { useModuleKV } from '@/lib/hooks/useModuleKV'
import { askCoach } from '@/lib/coachBus'
import { cn } from '@/lib/utils'

function Ring({ pct, label, sub, tone = 'rgb(var(--teal))' }: { pct: number; label: any; sub: string; tone?: string }) {
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
  const router = useRouter()
  const { loading, roster, liveCount, leads, goals } = useGrowthOS()
  const { loading: welcomeLoading, value: welcome } = useModuleKV('growth_welcome', { seen: false })

  // First-ever visit to Agentic CRM → the full-screen "Meet your AI team"
  // orientation, once per user. Replayable any time from the info icon below.
  useEffect(() => {
    if (!welcomeLoading && !welcome.seen) router.replace('/grow/welcome')
  }, [welcomeLoading, welcome.seen, router])

  const lpw = goals.leads_per_week_goal || 0
  const crGoal = goals.close_rate_goal != null ? Number(goals.close_rate_goal) : 0
  const leadPct = lpw > 0 ? (leads.newThisWeek / lpw) * 100 : 0
  const crPct = crGoal > 0 ? (leads.closeRate / crGoal) * 100 : 0
  const hasGoals = lpw > 0 || crGoal > 0

  if (welcomeLoading || !welcome.seen) return (
    <div className="space-y-4"><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /></div>
  )

  return (
    <div className="space-y-4 stagger-rise">
      <GrowthChrome />
      <GrowthTabs />

      {loading ? (
        <><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /></>
      ) : (
        <>
          {/* Growth goal rings — same goals row as the Commission Planner */}
          {hasGoals && (
            <Card className="overflow-hidden !p-0">
              <div className="bg-gradient-hero p-4">
                <div className={cn('grid gap-3', lpw > 0 && crGoal > 0 ? 'grid-cols-2' : 'grid-cols-1')}>
                  {lpw > 0 && <Ring pct={leadPct} label={<><CountUp value={leads.newThisWeek} />/{lpw}</>} sub="new leads this week" />}
                  {crGoal > 0 && <Ring pct={crPct} label={`${leads.closeRate}%`} sub={`all-time close · goal ${crGoal}%`} tone="rgb(var(--gold))" />}
                </div>
              </div>
            </Card>
          )}

          {/* Live pipeline snapshot */}
          <Link href="/partners" className="block active:scale-[0.99] transition-transform">
            <Card className="!p-4 hover:border-teal/40">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2"><HandshakeIcon size={16} className="text-navy-ink" /><span className="text-[13px] font-[800] text-dark-text">Pipeline right now</span></div>
                <span className="flex items-center gap-1 text-[12px] font-[700] text-navy-ink">Open Partners <ArrowRightIcon size={13} /></span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { k: 'Hot', v: leads.hot, tone: 'text-error', bg: 'bg-error/8' },
                  { k: 'Warm', v: leads.warm, tone: 'text-[#A06C00]', bg: 'bg-gold/12' },
                  { k: 'Cold', v: leads.cold, tone: 'text-navy-ink', bg: 'bg-navy/6' },
                ].map(s => (
                  <div key={s.k} className={cn('rounded-xl p-2.5 text-center', s.bg)}>
                    <div className="mb-0.5 flex items-center justify-center gap-1"><FlameIcon size={14} className={s.tone} /><span className="text-[10px] font-[800] uppercase tracking-wide text-gray">{s.k}</span></div>
                    <div className={cn('text-[22px] font-[900] tabular-nums', s.tone)}><CountUp value={s.v} /></div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-center text-[11px] text-gray">{leads.total} agency partners tracked · {leads.won} won</div>
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

          {/* Quick entries */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/grow/content" className="block active:scale-[0.98] transition-transform">
              <Card className="h-full !p-4 hover:border-teal/40">
                <EditIcon size={20} className="text-navy-ink" />
                <div className="mt-2 text-[13.5px] font-[800] text-dark-text">Content Engine</div>
                <p className="mt-0.5 text-[11.5px] leading-snug text-gray">Your ranked "what to post next"</p>
              </Card>
            </Link>
            <Link href="/grow/leadgen" className="block active:scale-[0.98] transition-transform">
              <Card className="h-full !p-4 hover:border-teal/40">
                <ChartRisingIcon size={20} className="text-navy-ink" />
                <div className="mt-2 text-[13.5px] font-[800] text-dark-text">Lead Gen</div>
                <p className="mt-0.5 text-[11.5px] leading-snug text-gray">Score, route & convert leads</p>
              </Card>
            </Link>
          </div>

          {/* One coach */}
          <button onClick={() => askCoach("Look at my Agentic CRM: my income, leads-per-week and close-rate goals, my pipeline by temperature, and what my AI Team is doing. What are the 3 highest-leverage moves to grow my number this week?")}
            className="relative flex w-full items-center gap-3 overflow-hidden rounded-2xl bg-navy p-4 text-left text-white shadow-card transition-transform active:scale-[0.99]">
            <span className="pointer-events-none absolute inset-y-0 left-0 w-1/4 animate-shimmer bg-white/15 blur-md" aria-hidden="true" />
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15"><LightningIcon size={18} /></div>
            <div className="relative min-w-0 flex-1">
              <div className="text-[14px] font-[800]">Ask your coach about growth</div>
              <div className="text-[11px] text-white/75">Your top 3 moves, from your real numbers</div>
            </div>
            <ArrowRightIcon size={16} className="relative shrink-0 animate-nudge-x text-white/80" />
          </button>
        </>
      )}
    </div>
  )
}
