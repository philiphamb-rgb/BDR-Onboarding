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
import { FlameIcon, HandshakeIcon, ArrowRightIcon, LightningIcon } from '@/components/icons'
import { useGrowthOS } from '@/lib/hooks/useGrowthOS'
import { useModuleKV } from '@/lib/hooks/useModuleKV'
import { AUTOMATION_META } from '@/lib/modules/growth-os/automationMeta'
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
  const autosForRoster = (roster || []).filter(a => AUTOMATION_META[a.id])
  const autosLive = autosForRoster.filter(a => a.status === 'live').length

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

          {/* One coach — the single most powerful action here, right below
              the Triage Strip (in GrowthChrome above), ahead of everything else. */}
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

          {/* Live pipeline snapshot — never a bare zero. Hot=0 leads with a
              contextual next move instead of a "0" tile that explains nothing. */}
          <Link href="/partners" className="block active:scale-[0.99] transition-transform">
            <Card className="!p-4 hover:border-teal/40">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2"><HandshakeIcon size={16} className="text-navy-ink" /><span className="text-[13px] font-[800] text-dark-text">Pipeline right now — {leads.total} partner{leads.total === 1 ? '' : 's'} tracked</span></div>
                <span className="flex items-center gap-1 text-[12px] font-[700] text-navy-ink shrink-0">Open <ArrowRightIcon size={13} /></span>
              </div>
              {leads.hot === 0 ? (
                <div className="rounded-xl bg-bdrbg p-3 text-center">
                  <p className="text-[13px] font-[700] text-dark-text">
                    No hot leads right now
                    {leads.warm > 0 ? ` — ${leads.warm} warm lead${leads.warm > 1 ? 's' : ''} ready to advance` : leads.cold > 0 ? ` — ${leads.cold} cold lead${leads.cold > 1 ? 's' : ''} in the pipeline` : ''}
                  </p>
                </div>
              ) : (
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
              )}
              {leads.won > 0 && <div className="mt-2 text-center text-[11px] text-gray">{leads.won} won</div>}
            </Card>
          </Link>

          {/* Your system at a glance — one scannable line replacing three
              separate cards (AI Team pulse, Content Engine, Lead Gen) that
              each only ever said "here's the number, tap to see more." */}
          <Card className="!p-3">
            <div className="mb-2 text-[11px] font-[800] uppercase tracking-wide text-gray">Your system at a glance</div>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5 text-[12.5px]">
              <Link href="/grow/team" className="font-[700] text-navy-ink hover:underline">Agents: {liveCount}/{roster.length} live</Link>
              <span className="text-gray">·</span>
              <Link href="/grow/automations" className="font-[700] text-navy-ink hover:underline">Automations: {autosLive}/{autosForRoster.length} active</Link>
              <span className="text-gray">·</span>
              <Link href="/grow/content" className="font-[700] text-navy-ink hover:underline">Content: 1 item ready</Link>
              <span className="text-gray">·</span>
              <Link href="/grow/leadgen" className="font-[700] text-navy-ink hover:underline">Pipeline: {leads.total} tracked</Link>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
