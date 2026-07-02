// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'

// Agent Office — the living company, on the DB-backed 43-agent registry
// (agent_roles + agents), with per-team live status from `automations`. Grouped
// by department; tap any agent for the full spec. This is the deepened successor
// to /grow/team, reading the real registry instead of the code roster.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createUntypedClient } from '@/lib/supabase/untyped'
import { Card, Skeleton } from '@/components/ui'
import { GrowthSlimHeader } from '@/components/growth/GrowthChrome'
import { loadRegistry } from '@/lib/agents/registry'
import { MODEL_FOR_TIER, HITL_LABEL, TIER_LABEL } from '@/lib/agents/types'
import { InfoIcon, IntegrationIcon, ChevronDownIcon, ArrowRightIcon, CoachIcon, UserIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

const DEPT_LABEL: Record<string, string> = {
  exec: 'Executive', marketing: 'Marketing', funnel: 'Lead Funnel',
  partner: 'Partner Success', ops: 'Ops & Quality', compliance: 'Compliance', memory: 'Memory',
}
const DEPT_ORDER = ['exec', 'marketing', 'funnel', 'partner', 'compliance', 'ops', 'memory']
const STATUS_TONE: Record<string, string> = { live: 'bg-success', setup: 'bg-gold', paused: 'bg-gray' }
const HITL_TONE: Record<string, string> = { 'in-the-loop': 'text-error bg-error/8', 'on-the-loop': 'text-teal bg-teal/8', autonomous: 'text-gray bg-bdrbg' }
const MODEL_LABEL: Record<string, string> = { worker: 'Fast', manager: 'Balanced', exec: 'Deep' }

export default function AgentOfficePage() {
  const supabase = createUntypedClient()
  const [loading, setLoading] = useState(true)
  const [reg, setReg] = useState<any>(null)
  const [statusById, setStatusById] = useState<Record<string, string>>({})
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const registry = await loadRegistry(supabase)
      const { data: { user } } = await supabase.auth.getUser()
      let statuses: Record<string, string> = {}
      if (user) {
        const { data: me } = await supabase.from('users').select('team_id').eq('id', user.id).maybeSingle()
        if (me?.team_id) {
          const { data: autos } = await supabase.from('automations').select('id, status').eq('team_id', me.team_id)
          statuses = Object.fromEntries((autos ?? []).map((a: any) => [a.id, a.status]))
        }
      }
      if (cancelled) return
      setReg(registry); setStatusById(statuses); setLoading(false)
    })()
    return () => { cancelled = true }
  }, [supabase])

  // Effective status = team override, else the agent's seeded default.
  const statusOf = (a: any) => statusById[a.id] ?? a.defaultStatus
  const live = reg ? reg.agents.filter((a: any) => statusOf(a) === 'live').length : 0

  const byDept = useMemo(() => {
    if (!reg) return []
    return DEPT_ORDER
      .map(d => ({ dept: d, items: reg.agents.filter((a: any) => a.role?.department === d).sort((x: any, y: any) => (x.role?.tier ?? 3) - (y.role?.tier ?? 3)) }))
      .filter(g => g.items.length > 0)
  }, [reg])

  const open = reg && openId ? reg.byId[openId] : null

  return (
    <div className="space-y-4 stagger-rise">
      <GrowthSlimHeader title="Agent Office" subtitle={loading ? undefined : `${live} of ${reg.agents.length} teammates live`} />

      <div className="flex items-start gap-2 rounded-xl bg-navy/[0.04] p-3">
        <InfoIcon size={14} className="mt-0.5 shrink-0 text-navy-ink" />
        <p className="text-[11.5px] leading-relaxed text-mid-text"><span className="font-[700] text-dark-text">This is your company.</span> Everyone reports up to you. Tap anyone to see what they do — or <Link href="/team/rooms" className="font-[700] text-teal">meet with your team</Link>.</p>
      </div>

      <Link href="/team/rooms" className="flex items-center gap-3 rounded-2xl bg-gradient-hero p-4 text-white shadow-card">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15"><CoachIcon size={20} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-[800]">Meet with your team</div>
          <div className="text-[12px] text-white/75">Chat 1:1, gather a group, or run a boardroom — they come with decisions.</div>
        </div>
        <ArrowRightIcon size={18} className="shrink-0 text-white/80" />
      </Link>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : (
        <div className="space-y-5">
          {byDept.map(g => (
            <div key={g.dept}>
              <div className="mb-2 px-0.5 text-[11px] font-[900] uppercase tracking-wide text-navy-ink">{DEPT_LABEL[g.dept]} <span className="text-gray/60">· {g.items.length}</span></div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {g.items.map((a: any) => {
                  const st = statusOf(a)
                  return (
                    <Card key={a.id} hover className="!p-3 cursor-pointer" onClick={() => setOpenId(a.id)}>
                      <div className="flex items-start gap-2.5">
                        <div className="relative shrink-0">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy/8 text-[12px] font-[800] text-navy-ink">{a.firstName[0]}{a.lastName[0]}</span>
                          <span className={cn('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card', STATUS_TONE[st], st === 'live' && 'animate-breathe')} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-[800] text-dark-text">{a.fullName}</div>
                          <div className="truncate text-[10.5px] font-[700] uppercase tracking-wide text-gray">{a.role?.title}</div>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-mid-text">{a.role?.mission}</p>
                        </div>
                        <ChevronDownIcon size={14} className="mt-0.5 shrink-0 text-gray" />
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && <AgentDrawer agent={open} reg={reg} status={statusOf(open)} onClose={() => setOpenId(null)} onOpen={setOpenId} />}
    </div>
  )
}

function AgentDrawer({ agent, reg, status, onClose, onOpen }: any) {
  const role = agent.role || {}
  const chip = (id: string) => reg.byId[id]
  const relRow = (label: string, ids: string[]) => ids?.length ? (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-[800] uppercase tracking-wide text-gray">{label}</span>
      {ids.map((id: string) => { const a = chip(id); return a ? <button key={id} onClick={() => onOpen(id)} className="rounded-md bg-bdrbg px-2 py-0.5 text-[11px] font-[700] text-navy-ink hover:bg-navy/10">{a.fullName}</button> : null })}
    </div>
  ) : null

  return (
    <div className="fixed inset-0 z-[1055] flex items-end justify-center bg-dark-text/50 sm:items-center" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-card p-4 shadow-modal sm:rounded-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-navy/8 text-[15px] font-[900] text-navy-ink">{agent.firstName[0]}{agent.lastName[0]}</span>
          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-[900] text-dark-text">{agent.fullName}</div>
            <div className="text-[11px] font-[700] uppercase tracking-wide text-gray">{role.title}</div>
            {agent.personality && <div className="mt-0.5 text-[11.5px] italic text-gray">{agent.personality}</div>}
          </div>
          <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-[800] capitalize', status === 'live' ? 'bg-success/10 text-success' : status === 'paused' ? 'bg-bdrbg text-gray' : 'bg-gold/12 text-[#A06C00]')}>{status}</span>
        </div>

        {agent.morningGreeting && <div className="mb-3 rounded-xl bg-teal/[0.06] p-3 text-[12px] italic leading-relaxed text-mid-text">“{agent.morningGreeting}”</div>}

        <div className="space-y-2.5 text-[12px] leading-relaxed text-mid-text">
          {role.mission && <p><span className="font-[800] text-dark-text">Mission: </span>{role.mission}</p>}
          {role.kpi && <p><span className="font-[800] text-dark-text">Measured by: </span>{role.kpi}</p>}
          {role.roiLogic && <p><span className="font-[800] text-dark-text">Why it matters: </span>{role.roiLogic}</p>}
        </div>

        <div className="my-3 flex flex-wrap gap-2">
          <span className={cn('rounded-lg px-2.5 py-1 text-[11px] font-[700]', HITL_TONE[agent.hitlTier])}>{HITL_LABEL[agent.hitlTier]}</span>
          <span className="rounded-lg bg-navy/8 px-2.5 py-1 text-[11px] font-[700] text-navy-ink">{TIER_LABEL[role.tier] ?? 'Specialist'}</span>
          <span className="rounded-lg bg-bdrbg px-2.5 py-1 text-[11px] font-[700] text-gray" title={MODEL_FOR_TIER[agent.modelTier]}>{MODEL_LABEL[agent.modelTier]} model</span>
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          {relRow('Reports to', role.reportsTo)}
          {relRow('Passes to', role.handoffTo)}
          {relRow('Reviewed by', role.reviewedBy)}
        </div>

        <div className="mt-4 flex gap-2">
          <Link href={`/team/rooms?agent=${agent.id}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-navy py-2.5 text-[12.5px] font-[800] text-white"><IntegrationIcon size={14} /> Talk 1:1</Link>
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2.5 text-[12.5px] font-[700] text-gray">Close</button>
        </div>
      </div>
    </div>
  )
}
