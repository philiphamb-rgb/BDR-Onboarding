// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, EmptyState, SkeletonList, ProgressBar } from '@/components/ui'
import { PageHeader, StatTile } from '@/components/manager'
import { HandshakeIcon, CheckIcon, TargetIcon } from '@/components/icons'
import { completion, stageMeta, PIPELINE_STAGES } from '@/lib/partnerChecklist'

export default function ManagerPartnersPage() {
  const supabase = createClient()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      // RLS scopes this to the manager's own + their team's partners.
      supabase.from('partner_onboarding')
        .select('id, partner_name, company, stage, checklist, user_id, users(name)')
        .order('updated_at', { ascending: false })
        .then(({ data }) => { setRows(data ?? []); setLoading(false) })
    })
  }, [])

  const total = rows.length
  const onboarded = rows.filter(r => completion(r.checklist).pct === 100).length
  const inFlight = total - onboarded
  // Count by pipeline stage for the funnel summary.
  const byStage = PIPELINE_STAGES.map(s => ({ ...s, n: rows.filter(r => r.stage === s.key).length }))

  return (
    <div className="space-y-5 pb-4 stagger-rise">
      <PageHeader title="Team Partners" subtitle={loading || !total ? undefined : `${total} partner${total === 1 ? '' : 's'} in onboarding across your team`} />

      {loading ? (
        <SkeletonList count={3} />
      ) : total === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<HandshakeIcon size={28} />}
            title="No partners in onboarding yet"
            description="When your reps add partners and work their onboarding checklists, you'll see live progress and pipeline stages here."
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <StatTile label="In onboarding" value={total} icon={<HandshakeIcon size={18} />} accent="text-navy" />
            <StatTile label="In flight" value={inFlight} icon={<TargetIcon size={18} />} accent="text-teal" />
            <StatTile label="Fully onboarded" value={onboarded} icon={<CheckIcon size={18} />} accent="text-success" />
          </div>

          {/* Stage funnel */}
          <Card>
            <h2 className="text-h3 text-dark-text mb-3">Pipeline stage</h2>
            <div className="space-y-2">
              {byStage.map(s => (
                <div key={s.key} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-[12px] font-[600]" style={{ color: s.color }}>{s.label}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full" style={{ width: `${total ? Math.max(s.n ? 4 : 0, Math.round((s.n / total) * 100)) : 0}%`, backgroundColor: s.color }} />
                  </div>
                  <span className="w-6 text-right text-[12px] font-[700] text-dark-text tabular-nums">{s.n}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Per-partner list */}
          <Card>
            <h2 className="text-h3 text-dark-text mb-3">All partners</h2>
            <div className="space-y-2">
              {rows.map(r => {
                const c = completion(r.checklist)
                const s = stageMeta(r.stage)
                return (
                  <div key={r.id} className="rounded-md border border-border bg-bdrbg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-[700] text-dark-text">{r.partner_name}</div>
                        <div className="truncate text-[11px] text-gray">{r.company ? `${r.company} · ` : ''}Owner: {r.users?.name ?? '—'}</div>
                      </div>
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-[700]" style={{ backgroundColor: `${s.color}1A`, color: s.color }}>{s.label}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <ProgressBar value={c.pct} max={100} color={c.pct === 100 ? '#16A34A' : '#00C2B2'} className="h-1.5 flex-1" />
                      <span className="text-[11px] font-[700] text-mid-text tabular-nums">{c.done}/{c.total}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
