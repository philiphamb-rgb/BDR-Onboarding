// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'

// The AI Company dashboard — observability over everything the team does and
// learns (file 13). Surfaces the data already being collected: agent activity +
// cost from agent_runs, meetings + decisions from meeting_outputs, and the
// memory system's health (candidates pending, trusted count, trust distribution,
// lifecycle). Admin-gated.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createUntypedClient } from '@/lib/supabase/untyped'
import { Card, Skeleton } from '@/components/ui'
import { loadRegistry } from '@/lib/agents/registry'
import { IntegrationIcon, BrainIcon, CoachIcon, ChartRisingIcon, CoinIcon, AlertIcon, ArrowRightIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

export default function ObservabilityPage() {
  const supabase = createUntypedClient()
  const [loading, setLoading] = useState(true)
  const [d, setD] = useState<any>({})

  useEffect(() => {
    ;(async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString()
      const [reg, runs, outputs, cand, mem] = await Promise.all([
        loadRegistry(supabase),
        supabase.from('agent_runs').select('agent_id, status, cost, trigger, started_at').gte('started_at', since).order('started_at', { ascending: false }).limit(500),
        supabase.from('meeting_outputs').select('decisions, next_actions, created_at'),
        supabase.from('memory_candidates').select('status, risk_tier'),
        supabase.from('semantic_memories').select('trust_score, lifecycle_state, category'),
      ])
      const runRows = runs.data ?? []
      const byAgent: Record<string, { runs: number; errors: number }> = {}
      let cost = 0, errors = 0
      for (const r of runRows) {
        byAgent[r.agent_id] = byAgent[r.agent_id] || { runs: 0, errors: 0 }
        byAgent[r.agent_id].runs++
        if (r.status === 'error') { byAgent[r.agent_id].errors++; errors++ }
        cost += Number(r.cost) || 0
      }
      const topAgents = Object.entries(byAgent).map(([id, v]) => ({ id, ...v, name: reg.byId[id]?.fullName || id })).sort((a, b) => b.runs - a.runs).slice(0, 8)
      const decisions = (outputs.data ?? []).reduce((s, o) => s + (Array.isArray(o.decisions) ? o.decisions.length : 0), 0)
      const memRows = mem.data ?? []
      const trustBands = { high: memRows.filter(m => m.trust_score >= 60).length, mid: memRows.filter(m => m.trust_score >= 45 && m.trust_score < 60).length, low: memRows.filter(m => m.trust_score < 45).length }
      const lifecycle = ['active', 'aging', 'stale', 'deprecated', 'archived'].map(s => ({ s, n: memRows.filter(m => m.lifecycle_state === s).length })).filter(x => x.n > 0)
      setD({
        totalRuns: runRows.length, errors, cost, topAgents,
        meetings: (outputs.data ?? []).length, decisions,
        pending: (cand.data ?? []).filter(c => c.status === 'pending').length,
        highRiskPending: (cand.data ?? []).filter(c => c.status === 'pending' && c.risk_tier === 'high').length,
        trusted: memRows.length, trustBands, lifecycle,
        agentCount: reg.agents.length,
      })
      setLoading(false)
    })()
  }, [supabase])

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48 rounded-xl" /><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div><Skeleton className="h-40 rounded-2xl" /></div>

  const tile = (icon: any, value: any, label: string, tone = 'text-dark-text') => (
    <Card className="!p-3.5 text-center"><div className="mb-1 flex justify-center text-gray">{icon}</div><div className={cn('text-[20px] font-[900] tabular-nums', tone)}>{value}</div><div className="text-[10.5px] text-gray">{label}</div></Card>
  )

  return (
    <div className="space-y-4 stagger-rise">
      <div>
        <h1 className="text-h1 text-dark-text">AI Company</h1>
        <p className="mt-0.5 text-[13px] text-gray">What your team did and learned — last 30 days.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tile(<IntegrationIcon size={16} />, d.totalRuns, 'agent runs', 'text-teal')}
        {tile(<CoachIcon size={16} />, d.meetings, 'meetings held')}
        {tile(<CheckDecisions n={d.decisions} />, d.decisions, 'decisions made')}
        {tile(<AlertIcon size={16} />, d.errors, 'run errors', d.errors > 0 ? 'text-error' : 'text-dark-text')}
      </div>

      {/* Memory health */}
      <Card className="!p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[13px] font-[800] text-dark-text"><BrainIcon size={15} className="text-navy-ink" /> Memory health</div>
          <Link href="/admin/memory" className="flex items-center gap-1 text-[12px] font-[700] text-teal">Memory Lab <ArrowRightIcon size={12} /></Link>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div><div className={cn('text-[20px] font-[900]', d.pending > 0 ? 'text-[#A06C00]' : 'text-dark-text')}>{d.pending}</div><div className="text-[10.5px] text-gray">to review{d.highRiskPending > 0 ? ` · ${d.highRiskPending} high-risk` : ''}</div></div>
          <div><div className="text-[20px] font-[900] text-success">{d.trusted}</div><div className="text-[10.5px] text-gray">trusted learnings</div></div>
          <div><div className="text-[20px] font-[900] text-teal">{d.trustBands?.high ?? 0}</div><div className="text-[10.5px] text-gray">high-trust</div></div>
        </div>
        {d.lifecycle?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
            {d.lifecycle.map((x: any) => <span key={x.s} className="rounded-full bg-bdrbg px-2.5 py-0.5 text-[11px] font-[700] capitalize text-mid-text">{x.s}: {x.n}</span>)}
          </div>
        )}
      </Card>

      {/* Busiest agents */}
      <Card className="!p-4">
        <div className="mb-3 flex items-center gap-1.5 text-[13px] font-[800] text-dark-text"><ChartRisingIcon size={15} className="text-teal" /> Busiest teammates</div>
        {(!d.topAgents || d.topAgents.length === 0) ? (
          <p className="text-[12.5px] text-gray">No agent runs yet. As your team works meetings and automations, activity shows here.</p>
        ) : (
          <div className="space-y-1.5">
            {d.topAgents.map((a: any) => {
              const max = d.topAgents[0].runs || 1
              return (
                <div key={a.id} className="flex items-center gap-2.5">
                  <span className="w-28 shrink-0 truncate text-[12px] font-[700] text-dark-text">{a.name}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-teal" style={{ width: `${(a.runs / max) * 100}%` }} /></div>
                  <span className="w-8 shrink-0 text-right text-[12px] font-[800] tabular-nums text-mid-text">{a.runs}</span>
                  {a.errors > 0 && <span className="w-10 shrink-0 text-right text-[10px] text-error">{a.errors} err</span>}
                </div>
              )
            })}
          </div>
        )}
        <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-[11.5px] text-gray">
          <span>{d.agentCount} teammates on staff</span>
          <span className="flex items-center gap-1"><CoinIcon size={12} /> ~${(d.cost || 0).toFixed(2)} est. run cost (30d)</span>
        </div>
      </Card>
    </div>
  )
}

function CheckDecisions({ n }: any) { return <span className="text-[16px] leading-none">{n > 0 ? '✓' : '·'}</span> }
