// @ts-nocheck
'use client'

// Apex — the manager Feedback Digest: the aggregation AND application halves of
// the improvement loop. Rolls up team feedback (sentiment split, 14-day trend,
// highest-signal items), and closes the loop: run synthesis → review agent-scoped
// PROPOSALS → approve into a VERSIONED instruction override that actually extends
// the agent's prompt (see AI Team), or roll it back. Reps read overrides; only
// managers propose/approve (RLS-enforced). The nightly automation runs the same
// core via /api/cron/feedback-synthesis.

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ROSTER_BY_ID } from '@/lib/modules/growth-os/roster'
import { StarIcon, StarFilledIcon, CheckIcon, CloseIcon, RefreshIcon, LightningIcon, IntegrationIcon, TrashIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

const agentName = (id: string) => ROSTER_BY_ID[id]?.name || id

export function FeedbackDigest() {
  const supabase = createClient()
  const [rows, setRows] = useState<any[] | null>(null)
  const [proposals, setProposals] = useState<any[]>([])
  const [overrides, setOverrides] = useState<any[]>([])
  const [running, setRunning] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const uidRef = useRef<string | null>(null)
  const teamRef = useRef<string | null>(null)

  const loadPipeline = async () => {
    const [{ data: p }, { data: o }] = await Promise.all([
      supabase.from('growth_instruction_proposals').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('agent_instruction_overrides').select('*').order('created_at', { ascending: false }),
    ])
    setProposals(p ?? []); setOverrides(o ?? [])
  }

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) { uidRef.current = user.id; const { data: u } = await supabase.from('users').select('team_id').eq('id', user.id).maybeSingle(); teamRef.current = u?.team_id ?? null }
      const { data } = await supabase.from('growth_feedback').select('id, sentiment, detail, created_at, user_id').order('created_at', { ascending: false }).limit(300)
      if (!active) return
      setRows(data ?? [])
      loadPipeline()
    })()
    return () => { active = false }
  }, [])

  const agg = useMemo(() => {
    const r = rows || []
    const up = r.filter(x => x.sentiment === 'up').length
    const down = r.filter(x => x.sentiment === 'down').length
    const total = r.length
    const pct = total ? Math.round((up / total) * 100) : 0
    const day = 86400000
    const mid = new Date(); mid.setHours(0, 0, 0, 0)
    const base = mid.getTime()
    const days = Array.from({ length: 14 }, (_, i) => {
      const start = base - (13 - i) * day
      const dayRows = r.filter(x => { const t = new Date(x.created_at).getTime(); return t >= start && t < start + day })
      return { up: dayRows.filter(x => x.sentiment === 'up').length, down: dayRows.filter(x => x.sentiment === 'down').length }
    })
    const withDetail = r.filter(x => (x.detail || '').trim())
    const contributors = new Set(r.map(x => x.user_id)).size
    return { up, down, total, pct, days, withDetail, contributors, truncated: r.length >= 300 }
  }, [rows])
  const maxDay = Math.max(1, ...agg.days.map(d => d.up + d.down))

  const runSynthesis = async () => {
    if (running) return
    setRunning(true); setNote(null)
    try {
      const res = await fetch('/api/growth/synthesize', { method: 'POST' })
      const d = await res.json()
      setNote(res.ok ? (d.created ? `${d.created} proposal${d.created > 1 ? 's' : ''} generated.` : (d.reason || 'No new proposals.')) : (d.error || 'Synthesis failed.'))
      await loadPipeline()
    } catch { setNote('Synthesis failed — try again.') }
    finally { setRunning(false) }
  }

  const approve = async (p: any) => {
    const existing = overrides.filter(o => o.agent_id === p.agent_id)
    const version = existing.length ? Math.max(...existing.map(o => o.version)) + 1 : 1
    await supabase.from('agent_instruction_overrides').insert({ team_id: teamRef.current, agent_id: p.agent_id, addendum: p.addendum, version, source_proposal_id: p.id, created_by: uidRef.current })
    await supabase.from('growth_instruction_proposals').update({ status: 'approved' }).eq('id', p.id)
    loadPipeline()
  }
  const reject = async (p: any) => { await supabase.from('growth_instruction_proposals').update({ status: 'rejected' }).eq('id', p.id); loadPipeline() }
  const rollback = async (o: any) => { await supabase.from('agent_instruction_overrides').delete().eq('id', o.id); loadPipeline() }

  if (rows === null) return <div className="py-6 text-center text-[12px] text-gray">Loading team feedback…</div>

  return (
    <div className="space-y-4">
      {/* Summary */}
      {agg.total === 0 ? (
        <div className="rounded-xl bg-bdrbg p-4 text-center text-[13px] text-gray">No team feedback yet. It rolls up here as your reps rate Apex.</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-bdrbg p-3 text-center"><div className="text-[20px] font-[900] text-dark-text tabular-nums">{agg.total}</div><div className="text-[10.5px] text-gray">signals · {agg.contributors} people</div></div>
            <div className="rounded-xl bg-success/8 p-3 text-center"><div className="text-[20px] font-[900] text-success tabular-nums">{agg.pct}%</div><div className="text-[10.5px] text-gray">positive</div></div>
            <div className="rounded-xl bg-error/8 p-3 text-center"><div className="text-[20px] font-[900] text-error tabular-nums">{agg.down}</div><div className="text-[10.5px] text-gray">needs-work flags</div></div>
          </div>
          {agg.truncated && <p className="text-[10.5px] italic text-gray">Showing the latest 300 signals.</p>}
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-[800] uppercase tracking-wide text-gray"><RefreshIcon size={11} /> Last 14 days</div>
            <div className="flex items-end gap-1" style={{ height: 44 }}>
              {agg.days.map((d, i) => (
                <div key={i} className="flex flex-1 flex-col justify-end gap-0.5" title={`${d.up} up · ${d.down} down`}>
                  {d.down > 0 && <div className="rounded-sm bg-error/50" style={{ height: `${(d.down / maxDay) * 40}px`, minHeight: 2 }} />}
                  {d.up > 0 && <div className="rounded-sm bg-success/60" style={{ height: `${(d.up / maxDay) * 40}px`, minHeight: 2 }} />}
                  {d.up + d.down === 0 && <div className="rounded-sm bg-border" style={{ height: 2 }} />}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Synthesis → proposals (the application half of the loop) */}
      <div className="rounded-xl border border-teal/25 bg-teal/[0.04] p-3">
        <div className="flex items-center gap-2">
          <IntegrationIcon size={14} className="text-teal" />
          <span className="text-[12.5px] font-[800] text-dark-text">Improvement proposals</span>
          <button onClick={runSynthesis} disabled={running} className="ml-auto flex items-center gap-1.5 rounded-lg bg-navy px-2.5 py-1.5 text-[11px] font-[700] text-white disabled:opacity-60">
            <LightningIcon size={11} /> {running ? 'Synthesizing…' : 'Run synthesis'}
          </button>
        </div>
        {note && <p className="mt-2 text-[11px] font-[600] text-mid-text">{note}</p>}
        <p className="mt-1.5 text-[11px] leading-relaxed text-gray">Turns written feedback into agent-scoped instruction tweaks. Approve one and it becomes a versioned addendum on that agent&rsquo;s prompt (see AI Team). This runs automatically each morning once the nightly job is scheduled.</p>

        {proposals.length > 0 && (
          <div className="mt-3 space-y-2">
            {proposals.map(p => (
              <div key={p.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-navy/8 px-1.5 py-0.5 text-[10px] font-[800] text-navy">{agentName(p.agent_id)}</span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-[700] text-dark-text">{p.summary}</span>
                </div>
                <p className="mt-1.5 rounded-lg bg-bdrbg p-2 text-[12px] italic leading-relaxed text-mid-text">“{p.addendum}”</p>
                {p.rationale && <p className="mt-1 text-[11px] text-gray">{p.rationale}</p>}
                <div className="mt-2 flex gap-2">
                  <button onClick={() => approve(p)} className="flex items-center gap-1 rounded-lg bg-success/10 px-3 py-1.5 text-[11.5px] font-[800] text-success"><CheckIcon size={12} /> Approve</button>
                  <button onClick={() => reject(p)} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-[11.5px] font-[700] text-gray"><CloseIcon size={12} /> Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Applied overrides — the versioned changelog with rollback */}
      {overrides.length > 0 && (
        <div>
          <div className="mb-2 text-[10px] font-[800] uppercase tracking-wide text-gray">Applied tuning ({overrides.length})</div>
          <div className="space-y-2">
            {overrides.map(o => (
              <div key={o.id} className="flex gap-2.5 rounded-xl border border-border bg-card p-3">
                <span className="flex h-6 shrink-0 items-center gap-1 rounded bg-teal/10 px-1.5 text-[10px] font-[800] text-teal">v{o.version}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-[800] text-dark-text">{agentName(o.agent_id)}</div>
                  <p className="mt-0.5 whitespace-pre-wrap text-[12px] leading-relaxed text-mid-text">{o.addendum}</p>
                  <div className="mt-1 text-[10px] text-gray">{new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                </div>
                <button onClick={() => rollback(o)} aria-label="Roll back" title="Roll back" className="shrink-0 text-gray hover:text-error"><TrashIcon size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Highest-signal items */}
      {agg.withDetail.length > 0 && (
        <div>
          <div className="mb-2 text-[10px] font-[800] uppercase tracking-wide text-gray">Highest-signal items ({agg.withDetail.length})</div>
          <div className="space-y-2">
            {agg.withDetail.slice(0, 20).map(f => (
              <div key={f.id} className="flex gap-2.5 rounded-xl border border-border bg-card p-3">
                <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full', f.sentiment === 'up' ? 'bg-success/10 text-success' : 'bg-error/10 text-error')}>
                  {f.sentiment === 'up' ? <StarFilledIcon size={13} /> : <StarIcon size={13} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-dark-text">{f.detail}</p>
                  <div className="mt-1 text-[10px] text-gray">{new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
