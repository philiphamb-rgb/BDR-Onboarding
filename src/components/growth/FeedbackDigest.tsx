// @ts-nocheck
'use client'

// Cortex — the manager-facing Feedback Digest: the aggregation half of the
// continuous-improvement loop. Managers already read their team's feedback via
// RLS (growth_feedback_team_read), so this rolls it up: sentiment split, a
// 14-day trend, and the highest-signal items (the ones with written detail)
// surfaced first for review. The automated nightly synthesis that turns approved
// items into agent-instruction updates is the remaining piece (see open-items).

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StarIcon, StarFilledIcon, CheckIcon, CloseIcon, RefreshIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

export function FeedbackDigest() {
  const supabase = createClient()
  const [rows, setRows] = useState<any[] | null>(null)

  useEffect(() => {
    let active = true
    supabase.from('growth_feedback').select('id, sentiment, detail, created_at, user_id').order('created_at', { ascending: false }).limit(300)
      .then(({ data }) => { if (active) setRows(data ?? []) })
    return () => { active = false }
  }, [])

  const agg = useMemo(() => {
    const r = rows || []
    const up = r.filter(x => x.sentiment === 'up').length
    const down = r.filter(x => x.sentiment === 'down').length
    const total = r.length
    const pct = total ? Math.round((up / total) * 100) : 0
    // 14-day daily trend, anchored to LOCAL midnight so each bar is a real
    // calendar day (not offset by the current time-of-day).
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

  if (rows === null) return <div className="py-6 text-center text-[12px] text-gray">Loading team feedback…</div>
  if (agg.total === 0) return <div className="py-8 text-center text-[13px] text-gray">No team feedback yet. It rolls up here as your reps rate Cortex.</div>

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-bdrbg p-3 text-center"><div className="text-[20px] font-[900] text-dark-text tabular-nums">{agg.total}</div><div className="text-[10.5px] text-gray">signals · {agg.contributors} people</div></div>
        <div className="rounded-xl bg-success/8 p-3 text-center"><div className="text-[20px] font-[900] text-success tabular-nums">{agg.pct}%</div><div className="text-[10.5px] text-gray">positive</div></div>
        <div className="rounded-xl bg-error/8 p-3 text-center"><div className="text-[20px] font-[900] text-error tabular-nums">{agg.down}</div><div className="text-[10.5px] text-gray">needs-work flags</div></div>
      </div>
      {agg.truncated && <p className="text-[10.5px] italic text-gray">Showing the latest 300 signals.</p>}

      {/* 14-day trend */}
      <div>
        <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-[800] uppercase tracking-wide text-gray"><RefreshIcon size={11} /> Last 14 days</div>
        <div className="flex items-end gap-1" style={{ height: 44 }}>
          {agg.days.map((d, i) => {
            const h = ((d.up + d.down) / maxDay) * 100
            return (
              <div key={i} className="flex flex-1 flex-col justify-end gap-0.5" title={`${d.up} up · ${d.down} down`}>
                {d.down > 0 && <div className="rounded-sm bg-error/50" style={{ height: `${(d.down / maxDay) * 40}px`, minHeight: 2 }} />}
                {d.up > 0 && <div className="rounded-sm bg-success/60" style={{ height: `${(d.up / maxDay) * 40}px`, minHeight: 2 }} />}
                {d.up + d.down === 0 && <div className="rounded-sm bg-border" style={{ height: 2 }} />}
              </div>
            )
          })}
        </div>
      </div>

      {/* Highest-signal items (with written detail) */}
      <div>
        <div className="mb-2 text-[10px] font-[800] uppercase tracking-wide text-gray">Highest-signal items ({agg.withDetail.length})</div>
        {agg.withDetail.length === 0 ? (
          <p className="text-[12px] text-gray">No written detail yet — the ratings above still show sentiment.</p>
        ) : (
          <div className="space-y-2">
            {agg.withDetail.slice(0, 25).map(f => (
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
        )}
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-teal/[0.06] p-3">
        <CheckIcon size={13} className="mt-0.5 shrink-0 text-teal" />
        <p className="text-[11px] leading-relaxed text-mid-text">This is the review surface. Approving items into automated agent-instruction updates is the scheduled nightly job on the roadmap — until then, use these signals to tune agent prompts on the AI Team tab.</p>
      </div>
    </div>
  )
}
