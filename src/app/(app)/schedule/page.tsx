// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Sheet, SkeletonCard, toast } from '@/components/ui'
import { ClockIcon, PhoneIcon, CheckIcon, ArrowRightIcon, CalendarIcon, RefreshIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import {
  SHIFT_OPTIONS, DEFAULT_SHIFT, OPTIMIZED_DAY, BLOCK_STYLE,
  parseHM, fmtClock, fmtShift, fmtDuration, SELLING_MINUTES, currentBlock,
} from '@/lib/schedule'
import { Tour } from '@/components/tour'
import { RHYTHM_TOUR } from '@/lib/tours'

const PX_PER_MIN = 1          // 60px per hour (Google-Calendar-like density)
const SNAP = 5                // snap drag to 5-minute steps
const GUTTER = 52             // px reserved for the hour labels

export default function SchedulePage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string>()
  const [settings, setSettings] = useState<Record<string, unknown>>({})
  const [shift, setShift] = useState(DEFAULT_SHIFT)
  const [loading, setLoading] = useState(true)
  // Per-block overrides for today: start time, duration, note, done. Empty = use
  // the OPTIMIZED_DAY template. Works fully offline; syncs to Outlook later.
  const [over, setOver] = useState<Record<string, { start_min?: number; dur_min?: number; note?: string; done?: boolean }>>({})
  const [blockTasks, setBlockTasks] = useState<Record<string, any[]>>({})
  const [selected, setSelected] = useState<number | null>(null)
  const [preview, setPreview] = useState<{ i: number; start: number; dur: number } | null>(null)
  const previewRef = useRef<{ i: number; start: number; dur: number } | null>(null)
  const [now, setNow] = useState(() => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() })
  const scrollRef = useRef<HTMLDivElement>(null)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      supabase.from('users').select('settings').eq('id', user.id).single().then(({ data }) => {
        const s = data?.settings ?? {}
        setSettings(s)
        if (s.shift && SHIFT_OPTIONS.some(o => o.start === s.shift)) setShift(s.shift)
        setLoading(false)
      })
      supabase.from('schedule_blocks').select('block_key, note, start_min, dur_min, done').eq('user_id', user.id).eq('day', today)
        .then(({ data }) => {
          const map: Record<string, any> = {}
          for (const r of data ?? []) map[r.block_key] = { start_min: r.start_min, dur_min: r.dur_min, note: r.note ?? undefined, done: r.done ?? false }
          setOver(map)
        })
      supabase.from('tasks').select('id, title, done, scheduled_block').eq('user_id', user.id).eq('scheduled_day', today)
        .then(({ data }) => {
          const map: Record<string, any[]> = {}
          for (const t of data ?? []) { (map[t.scheduled_block] ??= []).push(t) }
          setBlockTasks(map)
        })
    })
  }, [])

  // Live "now" line, refreshed each minute.
  useEffect(() => {
    const id = setInterval(() => { const d = new Date(); setNow(d.getHours() * 60 + d.getMinutes()) }, 60000)
    return () => clearInterval(id)
  }, [])

  const base = parseHM(shift)
  const chosen = SHIFT_OPTIONS.find(o => o.start === shift) ?? SHIFT_OPTIONS[0]

  // Resolve every block to its concrete start/dur for today (template + overrides).
  const blocks = OPTIMIZED_DAY.map((b, i) => {
    const o = over[String(i)]
    return {
      i, b,
      start: o?.start_min ?? (base + b.off),
      dur: o?.dur_min ?? b.dur,
      note: o?.note ?? '',
      done: !!o?.done,
      edited: o?.start_min != null && (o.start_min !== base + b.off || (o.dur_min ?? b.dur) !== b.dur),
    }
  })

  // Visible range snapped to whole hours, with a little breathing room.
  const minStart = Math.min(base, ...blocks.map(x => x.start))
  const maxEnd = Math.max(base + OPTIMIZED_DAY[OPTIMIZED_DAY.length - 1].off + OPTIMIZED_DAY[OPTIMIZED_DAY.length - 1].dur, ...blocks.map(x => x.start + x.dur))
  const rangeStart = Math.floor((minStart - 30) / 60) * 60
  const rangeEnd = Math.ceil((maxEnd + 30) / 60) * 60
  const totalH = (rangeEnd - rangeStart) * PX_PER_MIN
  const y = (min: number) => (min - rangeStart) * PX_PER_MIN
  const hours: number[] = []
  for (let h = rangeStart; h <= rangeEnd; h += 60) hours.push(h)

  const cur = shift ? currentBlock(shift) : null
  const activeIdx = cur?.status === 'active' ? OPTIMIZED_DAY.indexOf(cur.block) : -1
  const doneCount = blocks.filter(x => x.done).length

  // Auto-scroll to "now" (or the start of the day) on first paint.
  useEffect(() => {
    if (loading || !scrollRef.current) return
    const target = (now >= rangeStart && now <= rangeEnd) ? now : rangeStart
    scrollRef.current.scrollTop = Math.max(0, (target - rangeStart) * PX_PER_MIN - 120)
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persistence ────────────────────────────────────────────────────────────
  const saveBlock = async (i: number, block: typeof OPTIMIZED_DAY[number], patch: any) => {
    const key = String(i)
    const cur = over[key] ?? {}
    const merged = {
      start_min: patch.start_min ?? cur.start_min ?? (base + block.off),
      dur_min: patch.dur_min ?? cur.dur_min ?? block.dur,
      note: patch.note !== undefined ? patch.note : cur.note,
      done: patch.done !== undefined ? patch.done : (cur.done ?? false),
    }
    setOver(prev => ({ ...prev, [key]: merged }))
    if (!userId) return
    await supabase.from('schedule_blocks').upsert({
      user_id: userId, day: today, block_key: key,
      label: block.label, type: block.type,
      start_min: merged.start_min, dur_min: merged.dur_min,
      note: merged.note || null, done: merged.done, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,day,block_key' })
  }
  const toggleDone = (i: number) => saveBlock(i, OPTIMIZED_DAY[i], { done: !blocks[i].done })
  const toggleTask = async (id: string, key: string, done: boolean) => {
    setBlockTasks(prev => ({ ...prev, [key]: (prev[key] ?? []).map(t => t.id === id ? { ...t, done } : t) }))
    await supabase.from('tasks').update({ done, updated_at: new Date().toISOString() }).eq('id', id)
  }
  const resetDay = async () => {
    setOver({}); setSelected(null)
    if (userId) await supabase.from('schedule_blocks').delete().eq('user_id', userId).eq('day', today)
    toast.success('Reset to the optimized day')
  }
  const pickShift = async (start: string) => {
    setShift(start)
    if (!userId) return
    const d = new Date()
    const t = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    let next: Record<string, unknown> = {}
    setSettings(prev => { next = { ...prev, shift: start, shiftConfirmedDate: t }; return next })
    const { error } = await supabase.from('users').update({ settings: next }).eq('id', userId)
    if (!error) toast.success('Shift saved')
  }

  // ── Drag to move / resize (Google-Calendar style) ───────────────────────────
  const startDrag = (e: React.PointerEvent, i: number, mode: 'move' | 'resize') => {
    e.preventDefault(); e.stopPropagation()
    const blk = blocks[i]
    const meta = { startY: e.clientY, origStart: blk.start, origDur: blk.dur, moved: false }
    const onMove = (ev: PointerEvent) => {
      const delta = Math.round((ev.clientY - meta.startY) / PX_PER_MIN / SNAP) * SNAP
      if (Math.abs(ev.clientY - meta.startY) > 3) meta.moved = true
      let next
      if (mode === 'move') {
        const start = Math.min(Math.max(meta.origStart + delta, rangeStart), rangeEnd - meta.origDur)
        next = { i, start, dur: meta.origDur }
      } else {
        const dur = Math.min(Math.max(meta.origDur + delta, 15), rangeEnd - meta.origStart)
        next = { i, start: meta.origStart, dur }
      }
      previewRef.current = next
      setPreview(next)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      const p = previewRef.current
      if (meta.moved && p) saveBlock(i, OPTIMIZED_DAY[i], { start_min: p.start, dur_min: p.dur })
      else if (!meta.moved) setSelected(i)
      previewRef.current = null
      setPreview(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  if (loading) return <div className="space-y-4"><SkeletonCard /></div>

  const sel = selected != null ? blocks[selected] : null
  const selStyle = sel ? BLOCK_STYLE[sel.b.type] : null

  return (
    <div className="space-y-3 pb-4">
      {/* Compact header + toolbar — small footprint, calendar is the hero */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <h1 className="text-h2 text-dark-text leading-tight">Time Blocks</h1>
          <p className="text-[12px] text-gray">Drag to move · drag the edge to resize · tap for details</p>
        </div>
        <div className="relative">
          <select value={shift} onChange={e => pickShift(e.target.value)} aria-label="Shift"
            className="appearance-none rounded-lg border border-border bg-card py-2 pl-3 pr-8 text-[13px] font-[700] text-dark-text shadow-card focus:outline-none focus:ring-2 focus:ring-navy">
            {SHIFT_OPTIONS.map(o => <option key={o.start} value={o.start}>{fmtShift(o)}</option>)}
          </select>
          <ClockIcon size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray" />
        </div>
        {Object.keys(over).length > 0 && (
          <button onClick={resetDay} aria-label="Reset day" className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-2 text-[12px] font-[700] text-gray shadow-card hover:text-error">
            <RefreshIcon size={14} /> Reset
          </button>
        )}
      </div>

      {/* At-a-glance chips */}
      <div className="flex items-center gap-2 text-[12px]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal/10 px-2.5 py-1 font-[700] text-teal"><PhoneIcon size={13} />{fmtDuration(SELLING_MINUTES)} selling</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-bdrbg px-2.5 py-1 font-[700] text-mid-text tabular-nums">{doneCount}/{OPTIMIZED_DAY.length} done</span>
      </div>

      {/* Calendar day view */}
      <div ref={scrollRef} data-tour="rhythm-timeline"
        className="overflow-y-auto rounded-2xl border border-border bg-card shadow-card"
        style={{ maxHeight: 'calc(100vh - 230px)' }}>
        <div className="relative" style={{ height: totalH }}>
          {/* Hour gridlines + labels */}
          {hours.map(h => (
            <div key={h} className="absolute left-0 right-0 flex items-start" style={{ top: y(h) }}>
              <span className="w-[52px] shrink-0 -translate-y-2 pr-2 text-right text-[10px] font-[700] uppercase text-gray">{fmtClock(h)}</span>
              <span className="mt-px h-px flex-1 bg-border/70" />
            </div>
          ))}
          {/* half-hour faint lines */}
          {hours.slice(0, -1).map(h => (
            <div key={`half-${h}`} className="absolute right-0 h-px bg-border/30" style={{ top: y(h + 30), left: GUTTER }} />
          ))}

          {/* Now line */}
          {now >= rangeStart && now <= rangeEnd && (
            <div className="pointer-events-none absolute left-0 right-0 z-20 flex items-center" style={{ top: y(now) }}>
              <span className="ml-[46px] h-2.5 w-2.5 -translate-y-px rounded-full bg-error shadow" />
              <span className="h-[2px] flex-1 bg-error/80" />
            </div>
          )}

          {/* Blocks */}
          {blocks.map(({ i, b, start: rStart, dur: rDur, note, done, edited }) => {
            const st = BLOCK_STYLE[b.type]
            const p = preview?.i === i ? preview : null
            const start = p ? p.start : rStart
            const dur = p ? p.dur : rDur
            const top = y(start)
            const height = Math.max(18, dur * PX_PER_MIN)
            const compact = height < 44
            const isCurrent = i === activeIdx
            const dragging = preview?.i === i
            const tasks = blockTasks[String(i)] ?? []
            return (
              <div key={i}
                onPointerDown={e => startDrag(e, i, 'move')}
                className={cn('group absolute z-10 select-none overflow-hidden rounded-lg border-l-[3px] px-2.5 py-1.5 shadow-sm transition-shadow touch-none',
                  done ? 'opacity-60' : '', dragging ? 'z-30 shadow-modal ring-2 ring-navy/30' : 'hover:shadow-card cursor-grab')}
                style={{
                  top, height, left: GUTTER + 4, right: 8,
                  backgroundColor: `${st.color}14`, borderLeftColor: st.color,
                }}>
                <div className="flex items-start gap-1.5">
                  <button onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); toggleDone(i) }}
                    aria-label={done ? 'Mark not done' : 'Mark done'}
                    className={cn('mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                      done ? 'border-success bg-success text-white' : 'bg-card text-transparent')}
                    style={!done ? { borderColor: st.color } : undefined}>
                    <CheckIcon size={10} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className={cn('truncate text-[12.5px] font-[700] leading-tight', done ? 'text-gray line-through' : 'text-dark-text')}>{b.label}</div>
                    {!compact && (
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-mid-text">
                        <span className="tabular-nums">{fmtClock(start)}–{fmtClock(start + dur)}</span>
                        <span className="text-gray">· {fmtDuration(dur)}</span>
                        {edited && !dragging && <span className="text-teal">· edited</span>}
                        {isCurrent && !done && <span className="rounded-full bg-teal px-1.5 text-[9px] font-[800] text-white">NOW</span>}
                      </div>
                    )}
                    {!compact && tasks.length > 0 && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] font-[700] text-gray"><CheckIcon size={10} />{tasks.filter(t => t.done).length}/{tasks.length} tasks</div>
                    )}
                  </div>
                  <span className="rounded-full px-1.5 py-0.5 text-[9px] font-[800] shrink-0" style={{ backgroundColor: `${st.color}26`, color: st.color }}>{st.label}</span>
                </div>
                {/* Resize handle */}
                <div onPointerDown={e => startDrag(e, i, 'resize')}
                  className="absolute inset-x-0 bottom-0 flex h-3 cursor-ns-resize items-end justify-center"
                  aria-hidden="true">
                  <span className="mb-0.5 h-1 w-8 rounded-full bg-dark-text/15 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Outlook — compact, foundation laid */}
      <Link href="/settings" className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-[12px] shadow-card hover:border-navy/40">
        <CalendarIcon size={15} className="text-navy" />
        <span className="font-[700] text-dark-text">Connect Outlook / Google</span>
        <span className="text-gray">— two-way calendar sync</span>
        <span className="ml-auto rounded-full bg-bdrbg px-2 py-0.5 text-[10px] font-[700] text-gray">Soon</span>
      </Link>

      {/* Block detail sheet */}
      <Sheet open={selected != null} onClose={() => setSelected(null)} title={sel?.b.label}>
        {sel && selStyle && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full px-2 py-0.5 text-[11px] font-[800]" style={{ backgroundColor: `${selStyle.color}1A`, color: selStyle.color }}>{selStyle.label}</span>
              <span className="text-[13px] font-[700] text-mid-text tabular-nums">{fmtClock(sel.start)}–{fmtClock(sel.start + sel.dur)}</span>
              <span className="text-[12px] text-gray">· {fmtDuration(sel.dur)}</span>
            </div>

            {sel.b.tip && <p className="text-[13px] leading-relaxed text-mid-text">{sel.b.tip}</p>}

            <div className="flex flex-wrap gap-2">
              <button onClick={() => toggleDone(sel.i)}
                className={cn('flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-[700]', sel.done ? 'bg-success/10 text-success' : 'bg-bdrbg text-dark-text hover:bg-border/40')}>
                <CheckIcon size={15} />{sel.done ? 'Completed' : 'Mark done'}
              </button>
              {sel.b.href && (
                <Link href={sel.b.href} className="flex items-center gap-1.5 rounded-lg bg-teal/10 px-3 py-2 text-[13px] font-[700] text-teal hover:bg-teal/15">
                  {sel.b.cta ?? 'Open'} <ArrowRightIcon size={14} />
                </Link>
              )}
            </div>

            {/* Exact time edit */}
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] font-[700] text-gray">Start
                <input type="time" defaultValue={`${String(Math.floor((sel.start % 1440) / 60)).padStart(2, '0')}:${String(sel.start % 60).padStart(2, '0')}`}
                  onChange={e => { if (e.target.value) saveBlock(sel.i, sel.b, { start_min: parseHM(e.target.value) }) }}
                  className="mt-1 w-full rounded-md border border-border bg-card px-2 py-2 text-[13px]" />
              </label>
              <label className="text-[11px] font-[700] text-gray">Duration (min)
                <input type="number" min={5} step={5} defaultValue={sel.dur}
                  onChange={e => { const v = parseInt(e.target.value, 10); if (v >= 5) saveBlock(sel.i, sel.b, { dur_min: v }) }}
                  className="mt-1 w-full rounded-md border border-border bg-card px-2 py-2 text-[13px]" />
              </label>
            </div>

            {/* Note */}
            <div>
              <div className="mb-1 text-[11px] font-[700] text-gray">Note</div>
              <textarea defaultValue={sel.note} rows={3}
                placeholder="Focus, targets, who to call…"
                onBlur={e => saveBlock(sel.i, sel.b, { note: e.target.value.trim() })}
                className="w-full resize-none rounded-md border border-border bg-card px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-navy" />
            </div>

            {/* Assigned tasks */}
            {(blockTasks[String(sel.i)] ?? []).length > 0 && (
              <div>
                <div className="mb-1 text-[11px] font-[700] text-gray">Tasks in this block</div>
                <div className="space-y-1.5">
                  {blockTasks[String(sel.i)].map(tk => (
                    <div key={tk.id} className="flex items-center gap-2 rounded-md bg-bdrbg px-2.5 py-2">
                      <button onClick={() => toggleTask(tk.id, String(sel.i), !tk.done)} aria-label={tk.done ? 'Mark task incomplete' : 'Complete task'}
                        className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2', tk.done ? 'border-success bg-success text-white' : 'border-border text-transparent')}>
                        <CheckIcon size={10} />
                      </button>
                      <span className={cn('text-[13px]', tk.done ? 'text-gray line-through' : 'text-mid-text')}>{tk.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Link href="/tasks" className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2.5 text-[12px] font-[700] text-navy hover:border-navy/40">
              Assign tasks to blocks in Tasks <ArrowRightIcon size={13} />
            </Link>
          </div>
        )}
      </Sheet>

      <Tour tourKey="rhythm" steps={RHYTHM_TOUR} />
    </div>
  )
}
