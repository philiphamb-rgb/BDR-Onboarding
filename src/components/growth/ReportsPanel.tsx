// @ts-nocheck
'use client'

// Cortex — Reporting with drill-through. A HubSpot-style funnel rollup over
// the real pipeline: stage counts, stage-to-stage conversion, weighted pipeline
// value, win rate and average deal size. Every number is traceable — click a
// stage or a KPI and the underlying records list opens; click a record to open
// its CRM drawer. Managers can toggle to the team rollup (RLS allows team read);
// reps see their own. No invented data — all from partner_onboarding.

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui'
import { usePermissions } from '@/components/usePermissions'
import { ChartRisingIcon, CoinIcon, TargetIcon, TrophyIcon, ArrowRightIcon, TeamIcon, UserIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

const STAGES = [
  { k: 'new_lead', l: 'New', c: '#64748B' },
  { k: 'interested', l: 'Interested', c: '#0284C7' },
  { k: 'proposal_sent', l: 'Proposal', c: '#00C2B2' },
  { k: 'contract_signed', l: 'Signed', c: '#F5A623' },
  { k: 'opportunity_won', l: 'Won', c: '#16A34A' },
]
const idxOf = (stage: string) => { const i = STAGES.findIndex(s => s.k === stage); return i < 0 ? 0 : i }
const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US')

function toRecord(p: any) {
  const amt = p.deal_amount != null ? Number(p.deal_amount) : null
  const prob = p.deal_probability != null ? Number(p.deal_probability) : null
  return { id: p.id, name: p.partner_name || 'Unnamed agency', stage: p.stage || 'new_lead', amount: amt, probability: prob, weighted: amt != null && prob != null ? (amt * prob) / 100 : null }
}

export function ReportsPanel({ myLeads, onOpenLead }: { myLeads: any[]; onOpenLead: (l: any) => void }) {
  const supabase = createClient()
  const { isManager } = usePermissions()
  const [scope, setScope] = useState<'mine' | 'team'>('mine')
  const [teamRecords, setTeamRecords] = useState<any[] | null>(null)
  const [drill, setDrill] = useState<{ key: string; label: string } | null>(null)

  // My records come from the already-loaded leadList (which carries rawStage +
  // deal props); team records are fetched on demand (manager only, RLS-gated).
  const mine = useMemo(() => (myLeads || []).filter(l => l.id).map(l => ({ id: l.id, name: l.name, stage: l.rawStage || 'new_lead', amount: l.amount ?? null, probability: l.probability ?? null, weighted: l.weighted ?? null, score: l.score })), [myLeads])

  useEffect(() => {
    if (scope !== 'team' || !isManager || teamRecords) return
    let active = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: u } = await supabase.from('users').select('team_id').eq('id', user?.id).maybeSingle()
      if (!u?.team_id) { if (active) setTeamRecords([]); return }
      const { data } = await supabase.from('partner_onboarding').select('id, partner_name, stage, deal_amount, deal_probability').eq('team_id', u.team_id).limit(2000)
      if (active) setTeamRecords((data ?? []).map(toRecord))
    })()
    return () => { active = false }
  }, [scope, isManager, teamRecords, supabase])

  const records = scope === 'team' ? (teamRecords || []) : mine
  const loadingTeam = scope === 'team' && teamRecords === null

  // Funnel math (snapshot). reached[i] = records at stage i or beyond → monotonic.
  const stats = useMemo(() => {
    const currentAt = STAGES.map(s => records.filter(r => r.stage === s.k))
    const reached = STAGES.map((_, i) => records.filter(r => idxOf(r.stage) >= i).length)
    const total = records.length
    const won = currentAt[4].length
    const openRecs = records.filter(r => r.stage !== 'opportunity_won')
    const weighted = openRecs.reduce((s, r) => s + (r.weighted || 0), 0)
    const withAmt = records.filter(r => r.amount != null)
    const avgDeal = withAmt.length ? withAmt.reduce((s, r) => s + r.amount, 0) / withAmt.length : 0
    const winRate = total ? Math.round((won / total) * 100) : 0
    return { currentAt, reached, total, won, weighted, avgDeal, winRate }
  }, [records])

  const drillRecords = drill ? records.filter(r => r.stage === drill.key) : []

  return (
    <div className="space-y-4">
      {/* Scope toggle (managers) */}
      {isManager && (
        <div className="flex w-fit gap-0.5 rounded-lg border border-border bg-bdrbg p-1">
          {[['mine', 'My pipeline', UserIcon], ['team', 'Team pipeline', TeamIcon]].map(([k, l, Icon]) => (
            <button key={k} onClick={() => { setScope(k); setDrill(null) }} className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-[700]', scope === k ? 'bg-navy text-white' : 'text-gray hover:text-navy')}>
              <Icon size={13} /> {l}
            </button>
          ))}
        </div>
      )}

      {/* KPI cards — each drills to its records */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: TargetIcon, label: 'Open leads', value: String(stats.total - stats.won), tone: 'text-navy', drill: null },
          { icon: CoinIcon, label: 'Weighted pipeline', value: money(stats.weighted), tone: 'text-teal', drill: null },
          { icon: TrophyIcon, label: 'Win rate', value: `${stats.winRate}%`, tone: 'text-success', drill: null },
          { icon: ChartRisingIcon, label: 'Avg deal / mo', value: stats.avgDeal ? money(stats.avgDeal) : '—', tone: 'text-[#A06C00]', drill: null },
        ].map((k, i) => {
          const Icon = k.icon
          return (
            <Card key={i} className="!p-3.5">
              <Icon size={16} className={k.tone} />
              <div className={cn('mt-1.5 text-[19px] font-[900] tabular-nums', k.tone)}>{loadingTeam ? '…' : k.value}</div>
              <div className="text-[11px] text-gray">{k.label}</div>
            </Card>
          )
        })}
      </div>

      {/* Funnel — click a stage to drill through */}
      <Card className="!p-4">
        <div className="mb-3 flex items-center gap-1.5"><ChartRisingIcon size={14} className="text-teal" /><span className="text-[13px] font-[800] text-dark-text">Pipeline funnel</span><span className="text-[11px] text-gray">· click a stage to see the records</span></div>
        {loadingTeam ? (
          <div className="py-6 text-center text-[13px] text-gray">Loading team pipeline…</div>
        ) : stats.total === 0 ? (
          <div className="py-6 text-center text-[13px] text-gray">No records in this pipeline yet.</div>
        ) : (
          <div className="space-y-2">
            {STAGES.map((s, i) => {
              const reached = stats.reached[i]
              const at = stats.currentAt[i].length
              const pct = stats.reached[0] ? Math.round((reached / stats.reached[0]) * 100) : 0
              const conv = i > 0 && stats.reached[i - 1] ? Math.round((reached / stats.reached[i - 1]) * 100) : null
              const active = drill?.key === s.k
              return (
                <button key={s.k} onClick={() => setDrill(active ? null : { key: s.k, label: s.l })} className={cn('w-full rounded-xl border p-2.5 text-left transition-colors', active ? 'border-navy bg-navy/5' : 'border-border hover:border-navy/30')}>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-2 font-[700] text-dark-text"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.c }} />{s.l}</span>
                    <span className="flex items-center gap-2 text-gray"><span className="font-[800] tabular-nums text-dark-text">{at}</span> at stage{conv != null && <span className="tabular-nums">· {conv}% from prev</span>}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: s.c }} /></div>
                </button>
              )
            })}
          </div>
        )}
      </Card>

      {/* Drill-through record list */}
      {drill && (
        <Card className="!p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[12px] font-[800] text-dark-text">{drill.label} · {drillRecords.length} record{drillRecords.length !== 1 ? 's' : ''}</span>
            <button onClick={() => setDrill(null)} className="text-[11px] font-[700] text-gray hover:text-navy">Close</button>
          </div>
          {drillRecords.length === 0 ? (
            <p className="px-1 py-3 text-[12px] text-gray">No records at this stage.</p>
          ) : (
            <div className="space-y-1.5">
              {drillRecords.slice(0, 50).map(r => (
                <button key={r.id} onClick={() => onOpenLead({ id: r.id, name: r.name, score: r.score })} className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-2.5 text-left hover:border-teal/40">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy/8 text-[11px] font-[800] text-navy">{r.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-[700] text-dark-text">{r.name}</span>
                  {r.weighted != null && <span className="shrink-0 text-[12px] font-[700] tabular-nums text-teal">{money(r.weighted)}/mo</span>}
                  <ArrowRightIcon size={14} className="shrink-0 text-gray" />
                </button>
              ))}
              {drillRecords.length > 50 && <p className="px-1 text-[11px] text-gray">Showing 50 of {drillRecords.length}.</p>}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
