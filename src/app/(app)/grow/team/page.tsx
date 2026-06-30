// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'

// Growth OS — AI Team. The 18-agent automation roster, grouped by what they do
// for you. Read live state from the team-scoped `automations` table (RLS: every
// team member reads; only a manager/owner can flip status). Reps see exactly
// what's working for them; managers run the team's roster from here.

import { Card, Skeleton, Badge } from '@/components/ui'
import { GrowthTabs } from '@/components/GrowthTabs'
import { GrowIcon, IntegrationIcon, LockIcon, InfoIcon } from '@/components/icons'
import { useGrowthOS } from '@/lib/hooks/useGrowthOS'
import { CATEGORIES, STATUS_META } from '@/lib/modules/growth-os/roster'
import { cn } from '@/lib/utils'

const STATUSES = ['live', 'setup', 'paused'] as const

function StatusControl({ agent, isManager, onSet }: any) {
  if (!isManager) {
    const m = STATUS_META[agent.status]
    return (
      <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-[800]', m.tone)}>
        <span className={cn('h-1.5 w-1.5 rounded-full', m.dot, agent.status === 'live' && 'animate-breathe')} />{m.label}
      </span>
    )
  }
  return (
    <div className="flex shrink-0 overflow-hidden rounded-lg border border-border bg-bdrbg p-0.5" role="group" aria-label={`${agent.name} status`}>
      {STATUSES.map(s => {
        const active = agent.status === s
        const m = STATUS_META[s]
        return (
          <button key={s} onClick={() => !active && onSet(agent, s)} style={{ minHeight: 26 }}
            className={cn('rounded-md px-2 py-1 text-[11px] font-[800] capitalize transition-colors', active ? cn('bg-card shadow-sm', m.tone.split(' ')[0]) : 'text-gray hover:text-dark-text')}>
            {s}
          </button>
        )
      })}
    </div>
  )
}

export default function GrowthTeamPage() {
  const { loading, isManager, roster, liveCount, setStatus } = useGrowthOS()

  return (
    <div className="space-y-4 stagger-rise">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-hero text-white"><GrowIcon size={18} /></span>
        <div>
          <h1 className="text-h2 leading-tight text-dark-text">Growth OS</h1>
          <p className="text-[12px] text-gray">Your AI-powered growth engine</p>
        </div>
      </div>
      <GrowthTabs />

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : (
        <>
          <Card className="!p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal/10 text-teal"><IntegrationIcon size={22} /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-[800] text-dark-text">{liveCount} of {roster.length} agents live</div>
                <div className="text-[12px] text-gray">{isManager ? 'Tap a status to run the roster for your team.' : 'Your team lead manages which agents run.'}</div>
              </div>
              {!isManager && <span className="flex items-center gap-1 rounded-full bg-bdrbg px-2.5 py-1 text-[11px] font-[700] text-gray"><LockIcon size={12} /> View</span>}
            </div>
          </Card>

          {CATEGORIES.map(cat => {
            const agents = roster.filter(a => a.category === cat.key)
            const live = agents.filter(a => a.status === 'live').length
            return (
              <div key={cat.key}>
                <div className="mb-2 flex items-center justify-between px-0.5">
                  <div>
                    <h2 className="text-[13px] font-[800] uppercase tracking-wide text-navy">{cat.label}</h2>
                    <p className="text-[11px] text-gray">{cat.blurb}</p>
                  </div>
                  <span className="text-[11px] font-[700] text-gray tabular-nums">{live}/{agents.length} live</span>
                </div>
                <div className="space-y-2">
                  {agents.map(a => (
                    <Card key={a.id} className={cn('!p-3.5 transition-opacity', a.status === 'paused' && 'opacity-70')}>
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-[14px] font-[800] text-dark-text">{a.name}</span>
                            <Badge className="!bg-bdrbg !text-gray !text-[10px]">{a.reads}</Badge>
                          </div>
                          <p className="mt-0.5 text-[12.5px] font-[600] text-mid-text">{a.tagline}</p>
                          <p className="mt-1 text-[12px] leading-relaxed text-gray">{a.detail}</p>
                        </div>
                        <StatusControl agent={a} isManager={isManager} onSet={setStatus} />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}

          <div className="flex items-start gap-2 rounded-xl border border-border bg-bdrbg p-3">
            <InfoIcon size={14} className="mt-0.5 shrink-0 text-gray" />
            <p className="text-[11.5px] leading-relaxed text-gray">
              Every agent works off your real data already in BDR Hub — your Partners pipeline, Tasks, Wins, goals, Battle Cards, and AI Coach. Status changes are audited to your team's activity log.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
