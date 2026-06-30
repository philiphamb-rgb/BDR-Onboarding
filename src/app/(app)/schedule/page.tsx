// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Sheet, SkeletonCard, toast } from '@/components/ui'
import { ClockIcon, PhoneIcon, CheckIcon, ArrowRightIcon, CalendarIcon, RefreshIcon, LightningIcon, StarFilledIcon, PlusIcon, TrashIcon, TargetIcon, ChecklistIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import {
  SHIFT_OPTIONS, DEFAULT_SHIFT, OPTIMIZED_DAY, BLOCK_STYLE,
  parseHM, fmtClock, fmtShift, fmtDuration, SELLING_MINUTES, currentBlock,
} from '@/lib/schedule'
import {
  urgency, urgencyLabel, isActive, isStale, autoPlan, fmtEst, localDate, DEFAULT_TRIAGE, categorize,
} from '@/lib/triageEngine'
import { monthPaceFraction } from '@/lib/winsEngine'
import { stageMeta } from '@/lib/partnerChecklist'
import { askCoach } from '@/lib/coachBus'
import { Tour } from '@/components/tour'
import { RHYTHM_TOUR } from '@/lib/tours'

const PX_PER_MIN = 1.5        // 90px per hour — short blocks stay usable & legible
const SNAP = 5                // snap drag to 5-minute steps
const GUTTER = 52             // px reserved for the hour labels

// Greedy column layout for any overlapping blocks (Google-Calendar style): each
// cluster of overlapping blocks is split into side-by-side columns so nothing
// stacks on top of anything else. Returns i -> { col, cols }.
function layoutColumns(items: { i: number; start: number; dur: number }[]) {
  const sorted = [...items].sort((a, b) => a.start - b.start || a.i - b.i)
  const out: Record<number, { col: number; cols: number }> = {}
  let cluster: any[] = []
  let clusterEnd = -1
  const flush = (cl: any[]) => {
    const colEnds: number[] = []
    cl.forEach(it => {
      let placed = false
      for (let c = 0; c < colEnds.length; c++) {
        if (it.start >= colEnds[c]) { colEnds[c] = it.start + it.dur; it._col = c; placed = true; break }
      }
      if (!placed) { it._col = colEnds.length; colEnds.push(it.start + it.dur) }
    })
    const cols = Math.max(1, colEnds.length)
    cl.forEach(it => { out[it.i] = { col: it._col, cols } })
  }
  sorted.forEach(it => {
    if (cluster.length && it.start >= clusterEnd) { flush(cluster); cluster = [] }
    cluster.push(it)
    clusterEnd = cluster.length === 1 ? it.start + it.dur : Math.max(clusterEnd, it.start + it.dur)
  })
  if (cluster.length) flush(cluster)
  return out
}

export default function SchedulePage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string>()
  const [settings, setSettings] = useState<Record<string, unknown>>({})
  const [shift, setShift] = useState(DEFAULT_SHIFT)
  const [loading, setLoading] = useState(true)
  // Per-block overrides for today: start time, duration, note, done. Empty = use
  // the OPTIMIZED_DAY template. Works fully offline; syncs to Outlook later.
  const [over, setOver] = useState<Record<string, { start_min?: number; dur_min?: number; note?: string; done?: boolean }>>({})
  const [tasks, setTasks] = useState<any[]>([])      // all open tasks (active + snoozed)
  const [goal, setGoal] = useState<number | null>(null)
  const [dealsThisMonth, setDealsThisMonth] = useState(0)
  const [partners, setPartners] = useState<any[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [triageBusy, setTriageBusy] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [addToBlock, setAddToBlock] = useState<number | null>(null)  // block index awaiting a task
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
      loadTasks(user.id)
      // Goal + pace + pipeline pressure feed the day-triage summary.
      supabase.from('goals').select('monthly_deal_goal').eq('user_id', user.id).maybeSingle().then(({ data }) => setGoal(data?.monthly_deal_goal ?? null))
      supabase.from('user_progress').select('deals_this_month').eq('user_id', user.id).single().then(({ data }) => setDealsThisMonth(data?.deals_this_month ?? 0))
      supabase.from('partner_onboarding').select('id, partner_name, stage, temperature, updated_at').eq('user_id', user.id)
        .then(({ data }) => setPartners(data ?? []))
    })
  }, [])

  // All open tasks (top-level only) with triage fields. Reused after mutations.
  const loadTasks = async (uid: string) => {
    // Open tasks (any day) PLUS anything scheduled today — so today's completed
    // tasks still show (struck through) and the day's progress stays accurate.
    const { data } = await supabase.from('tasks')
      .select('id, title, done, priority, due_date, estimated_minutes, created_at, scheduled_day, scheduled_block, snoozed_until')
      .eq('user_id', uid).is('parent_id', null)
      .or(`done.eq.false,scheduled_day.eq.${today}`)
    setTasks(data ?? [])
  }

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

  // Column layout using the live (preview-adjusted) positions, so dragging a
  // block over another splits them into side-by-side columns instead of stacking.
  const cols = layoutColumns(blocks.map(x => ({
    i: x.i,
    start: preview?.i === x.i ? preview.start : x.start,
    dur: preview?.i === x.i ? preview.dur : x.dur,
  })))

  // ── Triage derivations ──────────────────────────────────────────────────────
  const nowDate = new Date()
  const plannedToday = tasks.filter(t => t.scheduled_day === today && t.scheduled_block != null)
  const scheduledToday = plannedToday.filter(t => isActive(t, nowDate))   // active (not done) — for capacity
  const blockTasks: Record<string, any[]> = {}
  for (const t of plannedToday) { (blockTasks[String(t.scheduled_block)] ??= []).push(t) }
  const planTotal = plannedToday.length
  const planDone = plannedToday.filter(t => t.done).length
  const planProgress = planTotal ? Math.round((planDone / planTotal) * 100) : 0
  const unscheduled = tasks
    .filter(t => isActive(t, nowDate) && t.scheduled_day !== today)
    .sort((a, b) => urgency(b, nowDate) - urgency(a, nowDate))
  const triageCfg = { ...DEFAULT_TRIAGE, agingDays: (settings as any)?.triage?.agingDays ?? DEFAULT_TRIAGE.agingDays }
  const staleTasks = tasks.filter(t => isStale(t, nowDate, triageCfg))
  // Blocks that can hold work (selling/plan/admin), with capacity in minutes.
  const slots = blocks.filter(x => ['plan', 'focus', 'admin'].includes(x.b.type)).map(x => ({ index: x.i, type: x.b.type, capacity: x.dur }))
  const capacityMin = slots.reduce((s, x) => s + x.capacity, 0)
  const plannedMin = scheduledToday.reduce((s, t) => s + (t.estimated_minutes || 30), 0)
  const overbookedMin = Math.max(0, plannedMin - capacityMin)
  const goalGap = goal && goal > 0 ? Math.max(0, goal - dealsThisMonth) : 0
  const stuck = partners.filter(p => p.stage === 'proposal_sent' || p.stage === 'contract_signed').length

  // ── Suggestions: turn pipeline pressure + goal gap into ready-to-add tasks ───
  const daysSince = (iso?: string) => iso ? Math.max(0, Math.floor((nowDate.getTime() - new Date(iso).getTime()) / 86400000)) : null
  const openTitles = tasks.map(t => (t.title || '').toLowerCase())
  const hasTitle = (needle: string) => openTitles.some(t => t.includes(needle.toLowerCase()))
  const suggestions = (() => {
    const out: any[] = []
    // Oldest stalled partners first — a nudge could close them.
    const stalled = partners.filter(p => p.stage === 'proposal_sent' || p.stage === 'contract_signed')
      .sort((a, b) => (a.updated_at || '').localeCompare(b.updated_at || ''))
    for (const p of stalled.slice(0, 4)) {
      if (hasTitle(p.partner_name)) continue
      const d = daysSince(p.updated_at)
      out.push({ id: `lead:${p.id}`, kind: 'lead', title: `Follow up with ${p.partner_name}`, priority: (d ?? 0) >= 3,
        reason: `${stageMeta(p.stage).label}${d != null ? ` · ${d}d no movement` : ''} — a nudge could close it.`, estimate: 15, href: `/partners/${p.id}` })
    }
    // Behind goal pace → prospecting.
    if (goal && goal > 0) {
      const expected = goal * monthPaceFraction(nowDate)
      if (dealsThisMonth < expected && !hasTitle('prospect')) {
        const behind = Math.max(1, Math.ceil(expected - dealsThisMonth))
        out.push({ id: 'goal', kind: 'goal', title: 'Prospect new leads to close the gap', priority: true,
          reason: `~${behind} behind pace toward ${goal} deals — feed the top of funnel today.`, estimate: 30, href: '/partners' })
      }
    }
    // Warm leads not yet advanced — convert while hot.
    const warm = partners.filter(p => p.temperature === 'warm' && (p.stage === 'interested' || p.stage === 'new_lead'))
    if (warm.length && !hasTitle('warm lead')) {
      out.push({ id: 'warm', kind: 'warm', title: `Advance ${warm.length} warm lead${warm.length > 1 ? 's' : ''}`, priority: false,
        reason: 'Warm leads convert best — book the next step before they cool.', estimate: 20, href: '/partners' })
    }
    return out.filter(s => !dismissed.has(s.id))
  })()

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

  // ── Task actions (optimistic) ───────────────────────────────────────────────
  const patchTask = async (id: string, patch: any) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
    await supabase.from('tasks').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
  }
  const toggleTaskDone = (id: string, done: boolean) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done } : t))
    supabase.from('tasks').update({ done, updated_at: new Date().toISOString() }).eq('id', id).then(() => {})
  }
  const assignTask = (id: string, blockIndex: number) => {
    patchTask(id, { scheduled_day: today, scheduled_block: String(blockIndex) })
    setAddToBlock(null)
  }
  const unassignTask = (id: string) => patchTask(id, { scheduled_day: null, scheduled_block: null })
  // Plan a single task into the first block with room (falls back to the first block).
  const bestSlot = (title: string, est: number) => {
    const rem: Record<number, number> = {}
    slots.forEach(s => { rem[s.index] = s.capacity })
    scheduledToday.forEach(st => { const k = Number(st.scheduled_block); if (rem[k] != null) rem[k] -= (st.estimated_minutes || 30) })
    const cat = categorize(title)
    return (cat && slots.find(s => s.type === cat && rem[s.index] >= est)) || slots.find(s => rem[s.index] >= est) || slots[0]
  }
  const planOne = (t: any) => {
    const slot = bestSlot(t.title, t.estimated_minutes || 30)
    if (slot) { assignTask(t.id, slot.index); toast.success('Planned into your day') }
  }
  const setEstimate = (id: string, min: number) => patchTask(id, { estimated_minutes: Math.max(5, min) })
  const snoozeTask = (id: string, days: number) => {
    const d = new Date(); d.setDate(d.getDate() + days)
    patchTask(id, { snoozed_until: localDate(d) })
    toast.success(`Deferred ${days} day${days > 1 ? 's' : ''}`)
  }
  const removeTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    await supabase.from('tasks').delete().eq('id', id)
    toast.success('Task removed')
  }
  // Auto-triage: pack the highest-urgency tasks into today's blocks by capacity.
  const autoPlanDay = async (reflow: boolean) => {
    if (triageBusy) return
    setTriageBusy(true)
    try {
      const assign = autoPlan(tasks, slots, nowDate, { reflow })
      const updates = tasks.filter(t => assign[t.id] != null && (t.scheduled_day !== today || String(t.scheduled_block) !== String(assign[t.id])))
      const cleared = reflow ? tasks.filter(t => assign[t.id] == null && t.scheduled_day === today) : []
      setTasks(prev => prev.map(t => {
        if (assign[t.id] != null) return { ...t, scheduled_day: today, scheduled_block: String(assign[t.id]) }
        if (reflow && t.scheduled_day === today) return { ...t, scheduled_day: null, scheduled_block: null }
        return t
      }))
      await Promise.all([
        ...updates.map(t => supabase.from('tasks').update({ scheduled_day: today, scheduled_block: String(assign[t.id]), updated_at: new Date().toISOString() }).eq('id', t.id)),
        ...cleared.map(t => supabase.from('tasks').update({ scheduled_day: null, scheduled_block: null, updated_at: new Date().toISOString() }).eq('id', t.id)),
      ])
      const n = Object.keys(assign).length
      toast.success(n ? `Planned ${n} task${n > 1 ? 's' : ''} into your day` : 'Nothing to plan right now')
    } finally { setTriageBusy(false) }
  }
  // Create a real task from a suggestion (optionally planning it into the day).
  const ensureList = async () => {
    const { data } = await supabase.from('task_lists').select('id').eq('user_id', userId).order('order_index').limit(1)
    if (data && data[0]) return data[0].id
    const { data: created } = await supabase.from('task_lists').insert({ user_id: userId, name: 'My Tasks', order_index: 0 }).select('id').single()
    return created?.id
  }
  const createTask = async (title: string, estimate: number, opts: { priority?: boolean; plan?: boolean } = {}) => {
    if (!userId) return
    const list_id = await ensureList()
    const { data } = await supabase.from('tasks')
      .insert({ user_id: userId, list_id, title, estimated_minutes: estimate, priority: !!opts.priority })
      .select('id, title, done, priority, due_date, estimated_minutes, created_at, scheduled_day, scheduled_block, snoozed_until').single()
    if (!data) return
    setTasks(prev => [data, ...prev])
    if (opts.plan) {
      const slot = bestSlot(title, estimate)
      if (slot) await patchTask(data.id, { scheduled_day: today, scheduled_block: String(slot.index) })
      toast.success('Added & planned into your day')
    } else {
      toast.success('Task added')
    }
  }
  const dismissSuggestion = (id: string) => setDismissed(prev => new Set(prev).add(id))

  const setAgingDays = async (n: number) => {
    let next: any = {}
    setSettings(prev => { next = { ...prev, triage: { ...(prev as any)?.triage, agingDays: n } }; return next })
    if (userId) await supabase.from('users').update({ settings: next }).eq('id', userId)
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

      {/* AI day-triage summary — built from your goal, pipeline, and tasks */}
      <div className="rounded-2xl bg-gradient-hero p-4 text-white shadow-card">
        <div className="mb-2 flex items-center gap-2">
          <LightningIcon size={16} className="text-white" />
          <span className="text-[14px] font-[800]">Today’s triage</span>
          <span className={cn('ml-auto rounded-full px-2 py-0.5 text-[11px] font-[700] tabular-nums', overbookedMin > 0 ? 'bg-error/30 text-white' : 'text-white/70')}>
            {overbookedMin > 0 ? `Overbooked ${overbookedMin}m` : `${plannedMin}m planned · ${Math.max(0, capacityMin - plannedMin)}m free`}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-white/10 px-2.5 py-2">
            <div className="text-[11px] text-white/70">Goal</div>
            <div className="text-[15px] font-[800] leading-tight">{goal ? `${dealsThisMonth}/${goal}` : '—'}</div>
            <div className="text-[10px] text-white/60">{goal ? (goalGap > 0 ? `${goalGap} to go` : 'hit 🎯') : 'set in Analytics'}</div>
          </div>
          <div className="rounded-xl bg-white/10 px-2.5 py-2">
            <div className="text-[11px] text-white/70">Pipeline</div>
            <div className="text-[15px] font-[800] leading-tight">{stuck}</div>
            <div className="text-[10px] text-white/60">awaiting next step</div>
          </div>
          <div className="rounded-xl bg-white/10 px-2.5 py-2">
            <div className="text-[11px] text-white/70">Tasks</div>
            <div className="text-[15px] font-[800] leading-tight">{scheduledToday.length}/{scheduledToday.length + unscheduled.length}</div>
            <div className="text-[10px] text-white/60">{unscheduled.length} unplanned</div>
          </div>
        </div>
        {planTotal > 0 && (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-[11px] text-white/80"><span>Today’s plan</span><span className="tabular-nums">{planDone}/{planTotal} done</span></div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-white transition-all duration-700 ease-out" style={{ width: `${planProgress}%` }} /></div>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => autoPlanDay(false)} disabled={triageBusy}
            className="relative flex items-center gap-1.5 overflow-hidden rounded-lg bg-white px-3 py-2 text-[13px] font-[800] text-navy active:scale-[0.99] disabled:opacity-60">
            <LightningIcon size={14} className="text-navy" /> {triageBusy ? 'Planning…' : 'Auto-plan my day'}
          </button>
          {scheduledToday.length > 0 && (
            <button onClick={() => autoPlanDay(true)} disabled={triageBusy}
              className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-[13px] font-[700] text-white hover:bg-white/25 disabled:opacity-60">
              <RefreshIcon size={14} /> Re-plan
            </button>
          )}
          <button onClick={() => askCoach('Look at my goal, pipeline, and today’s tasks. Triage my day for me: what are the top 3 things to focus on and in what order?')}
            className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-[13px] font-[700] text-white hover:bg-white/25">
            <TargetIcon size={14} /> Coach my day
          </button>
        </div>
      </div>

      {/* Smart suggestions — the day builds itself from leads + goal + pipeline */}
      {suggestions.length > 0 && (
        <div className="rounded-2xl border border-teal/40 bg-teal/[0.05] p-3">
          <div className="mb-2 flex items-center gap-2">
            <LightningIcon size={15} className="text-teal" />
            <span className="text-[13px] font-[800] text-dark-text">Suggested for today</span>
            <span className="text-[11px] text-gray">· from your pipeline & goal</span>
            {suggestions.length > 1 && (
              <button onClick={() => suggestions.forEach(s => createTask(s.title, s.estimate, { priority: s.priority, plan: true }))}
                className="ml-auto rounded-md bg-teal px-2 py-1 text-[11px] font-[800] text-white hover:bg-teal-dark">Add all & plan</button>
            )}
          </div>
          <div className="space-y-1.5">
            {suggestions.map(s => (
              <div key={s.id} className="flex items-center gap-2 rounded-lg bg-card px-2.5 py-2 shadow-sm">
                <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-lg',
                  s.kind === 'goal' ? 'bg-gold/15 text-gold' : s.kind === 'warm' ? 'bg-orange-100 text-orange-600' : 'bg-navy/10 text-navy')}>
                  {s.kind === 'goal' ? <TargetIcon size={13} /> : s.kind === 'warm' ? <PhoneIcon size={13} /> : <ArrowRightIcon size={13} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-[700] text-dark-text">{s.title}</div>
                  <div className="truncate text-[11px] text-gray">{s.reason}</div>
                </div>
                <span className="shrink-0 text-[11px] font-[600] text-gray tabular-nums">{fmtEst(s.estimate)}</span>
                <button onClick={() => createTask(s.title, s.estimate, { priority: s.priority, plan: true })}
                  className="shrink-0 rounded-md bg-teal/10 px-2 py-1 text-[11px] font-[800] text-teal hover:bg-teal/15">Add & plan</button>
                <button onClick={() => dismissSuggestion(s.id)} aria-label="Dismiss suggestion" className="shrink-0 px-1 text-[15px] leading-none text-gray hover:text-error">×</button>
              </div>
            ))}
          </div>
        </div>
      )}

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

          {/* Events area (right of the hour gutter) — blocks lay out in columns */}
          <div className="absolute bottom-0 top-0" style={{ left: GUTTER + 4, right: 8 }}>
            {blocks.map(({ i, b, start: rStart, dur: rDur, done, edited }) => {
              const st = BLOCK_STYLE[b.type]
              const p = preview?.i === i ? preview : null
              const start = p ? p.start : rStart
              const dur = p ? p.dur : rDur
              const top = y(start)
              const height = Math.max(16, dur * PX_PER_MIN)
              const tiny = height < 30          // ~20 min or less — one slim line
              const compact = height < 52       // hide the time row, keep title
              const isCurrent = i === activeIdx
              const dragging = preview?.i === i
              const bTasks = blockTasks[String(i)] ?? []
              const { col, cols: ncols } = cols[i] ?? { col: 0, cols: 1 }
              return (
                <div key={i}
                  onPointerDown={e => startDrag(e, i, 'move')}
                  className={cn('group absolute select-none overflow-hidden rounded-lg border-l-[3px] shadow-sm transition-shadow touch-none',
                    tiny ? 'px-2 py-0.5' : 'px-2 py-1',
                    done ? 'opacity-60' : '', dragging ? 'z-30 shadow-modal ring-2 ring-navy/40' : 'z-10 hover:shadow-card cursor-grab')}
                  style={{
                    top, height,
                    left: `${(col / ncols) * 100}%`,
                    width: `calc(${100 / ncols}% - 3px)`,
                    backgroundColor: dragging ? `${st.color}26` : `${st.color}14`,
                    borderLeftColor: st.color,
                  }}>
                  {/* Inner content — one vertically-centered, aligned row: check · label · tag */}
                  {(() => {
                    const showPills = !tiny && !compact && bTasks.length > 0 && height >= 80
                    const maxPills = Math.max(1, Math.floor((height - 46) / 19))
                    return (
                      <div className={cn('flex h-full flex-col px-1.5', showPills ? 'justify-start pt-1' : 'justify-center')}>
                        <div className="flex items-center justify-center gap-1.5">
                          {!tiny && (
                            <button onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); toggleDone(i) }}
                              aria-label={done ? 'Mark not done' : 'Mark done'}
                              className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all',
                                done ? 'border-success bg-success text-white' : 'bg-card text-transparent')}
                              style={!done ? { borderColor: st.color } : undefined}>
                              <CheckIcon size={10} />
                            </button>
                          )}
                          <span className={cn('truncate text-center font-[700] leading-tight', tiny ? 'text-[11px]' : 'text-[12px]', done ? 'text-gray line-through' : 'text-dark-text')}>{b.label}</span>
                          {!tiny && ncols === 1 && (
                            <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-[800] leading-none" style={{ backgroundColor: `${st.color}26`, color: st.color }}>{st.label}</span>
                          )}
                        </div>
                        {!tiny && !compact && (
                          <div className="mt-0.5 flex max-w-full flex-wrap items-center justify-center gap-x-1.5 text-[10.5px] text-mid-text">
                            <span className="tabular-nums">{fmtClock(start)}–{fmtClock(start + dur)}</span>
                            {edited && !dragging && <span className="text-teal">· edited</span>}
                            {isCurrent && !done && <span className="rounded-full bg-teal px-1.5 text-[9px] font-[800] text-white">NOW</span>}
                            {bTasks.length > 0 && !showPills && <span className="text-gray">· {bTasks.filter(t => t.done).length}/{bTasks.length} tasks</span>}
                          </div>
                        )}
                        {showPills && (
                          <div className="mt-1 space-y-0.5 overflow-hidden">
                            {bTasks.slice(0, maxPills).map(tk => (
                              <div key={tk.id} onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); toggleTaskDone(tk.id, !tk.done) }}
                                className="flex items-center gap-1 rounded bg-white/70 px-1.5 py-0.5 text-left">
                                <span className={cn('flex h-3 w-3 shrink-0 items-center justify-center rounded-full border', tk.done ? 'border-success bg-success text-white' : 'border-gray/50 text-transparent')}><CheckIcon size={8} /></span>
                                <span className={cn('truncate text-[10px] font-[600]', tk.done ? 'text-gray line-through' : 'text-dark-text')}>{tk.title}</span>
                              </div>
                            ))}
                            {bTasks.length > maxPills && (
                              <div className="text-center text-[9px] font-[700] text-gray">+{bTasks.length - maxPills} more</div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                  {/* Resize handle */}
                  <div onPointerDown={e => startDrag(e, i, 'resize')}
                    className="absolute inset-x-0 bottom-0 flex h-2.5 cursor-ns-resize items-end justify-center"
                    aria-hidden="true">
                    <span className="mb-0.5 h-1 w-7 rounded-full bg-dark-text/15 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Needs attention — stale tasks aging out; defer or remove to de-congest */}
      {staleTasks.length > 0 && (
        <div className="rounded-2xl border border-gold/40 bg-gold/[0.06] p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 animate-attention rounded-full bg-gold" />
            <span className="text-[13px] font-[800] text-dark-text">Needs attention</span>
            <span className="text-[11px] text-gray">· aging {triageCfg.agingDays}+ days unplanned</span>
          </div>
          <div className="space-y-1.5">
            {staleTasks.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center gap-2 rounded-lg bg-card px-2.5 py-2">
                <span className="flex-1 truncate text-[13px] text-dark-text">{t.title}</span>
                <button onClick={() => planOne(t)} className="shrink-0 rounded-md bg-teal/10 px-2 py-1 text-[11px] font-[700] text-teal hover:bg-teal/15">Plan</button>
                <button onClick={() => snoozeTask(t.id, 3)} className="shrink-0 rounded-md bg-bdrbg px-2 py-1 text-[11px] font-[700] text-mid-text hover:bg-border/40">Defer</button>
                <button onClick={() => removeTask(t.id)} aria-label="Remove task" className="shrink-0 px-1 text-gray hover:text-error"><TrashIcon size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unscheduled tasks — triage queue, set time estimates, plan into the day */}
      <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
        <div className="mb-2 flex items-center gap-2">
          <ChecklistIcon size={15} className="text-navy" />
          <span className="text-[13px] font-[800] text-dark-text">Unplanned tasks</span>
          <span className="rounded-full bg-bdrbg px-2 py-0.5 text-[11px] font-[700] text-mid-text tabular-nums">{unscheduled.length}</span>
          <label className="ml-auto flex items-center gap-1 text-[11px] text-gray">
            Flag stale after
            <select value={triageCfg.agingDays} onChange={e => setAgingDays(parseInt(e.target.value, 10))}
              className="rounded-md border border-border bg-card px-1.5 py-1 text-[11px] font-[700] text-dark-text">
              {[3, 5, 7, 14, 30].map(d => <option key={d} value={d}>{d}d</option>)}
            </select>
          </label>
          <Link href="/tasks" className="text-[12px] font-[700] text-navy">Manage →</Link>
        </div>
        {/* Quick add */}
        <div className="mb-2 flex items-center gap-2">
          <input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newTaskTitle.trim()) { createTask(newTaskTitle.trim(), 30); setNewTaskTitle('') } }}
            placeholder="Quick-add a task…"
            className="flex-1 rounded-lg border border-border bg-bdrbg px-3 py-2 text-[13px] outline-none placeholder-gray focus:ring-2 focus:ring-navy" />
          <button onClick={() => { if (newTaskTitle.trim()) { createTask(newTaskTitle.trim(), 30, { plan: true }); setNewTaskTitle('') } }}
            disabled={!newTaskTitle.trim()}
            className="shrink-0 rounded-lg bg-navy px-3 py-2 text-[12px] font-[800] text-white disabled:opacity-50">Add &amp; plan</button>
        </div>
        {unscheduled.length === 0 ? (
          <p className="py-2 text-center text-[12px] text-gray">Everything’s planned. Nice. 🎯</p>
        ) : (
          <div className="space-y-1.5">
            {unscheduled.slice(0, 12).map(t => {
              const u = urgencyLabel(urgency(t, nowDate))
              return (
                <div key={t.id} className="flex items-center gap-2 rounded-lg border border-border bg-bdrbg px-2.5 py-2">
                  <button onClick={() => toggleTaskDone(t.id, true)} aria-label="Complete task"
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border text-transparent transition-colors hover:border-teal hover:bg-teal/10">
                    <CheckIcon size={10} />
                  </button>
                  <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-[800]',
                    u.tone === 'high' ? 'bg-error/10 text-error' : u.tone === 'med' ? 'bg-gold/15 text-[#A06C00]' : 'bg-bdrbg text-gray')}>{u.label}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-dark-text">{t.title}{t.priority && <StarFilledIcon size={12} className="ml-1 inline text-gold" />}</span>
                  {/* ETC stepper */}
                  <div className="flex shrink-0 items-center rounded-md border border-border bg-card">
                    <button onClick={() => setEstimate(t.id, (t.estimated_minutes || 30) - 15)} aria-label="Less time" className="px-1.5 text-gray hover:text-navy">−</button>
                    <span className="w-9 text-center text-[11px] font-[700] text-mid-text tabular-nums">{fmtEst(t.estimated_minutes || 30)}</span>
                    <button onClick={() => setEstimate(t.id, (t.estimated_minutes || 30) + 15)} aria-label="More time" className="px-1.5 text-gray hover:text-navy">+</button>
                  </div>
                  <button onClick={() => planOne(t)} className="shrink-0 rounded-md bg-teal/10 px-2 py-1 text-[11px] font-[700] text-teal hover:bg-teal/15">Plan</button>
                </div>
              )
            })}
          </div>
        )}
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
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-[700] text-gray">Tasks in this block</span>
                {(blockTasks[String(sel.i)] ?? []).length > 0 && (
                  <span className="text-[11px] font-[700] text-mid-text tabular-nums">{(blockTasks[String(sel.i)] ?? []).reduce((s, t) => s + (t.estimated_minutes || 30), 0)}m planned</span>
                )}
              </div>
              <div className="space-y-1.5">
                {(blockTasks[String(sel.i)] ?? []).map(tk => (
                  <div key={tk.id} className="flex items-center gap-2 rounded-md bg-bdrbg px-2.5 py-2">
                    <button onClick={() => toggleTaskDone(tk.id, !tk.done)} aria-label={tk.done ? 'Mark task incomplete' : 'Complete task'}
                      className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px]', tk.done ? 'border-success bg-success text-white' : 'border-border text-transparent')}>
                      <CheckIcon size={10} />
                    </button>
                    <span className={cn('flex-1 text-[13px]', tk.done ? 'text-gray line-through' : 'text-mid-text')}>{tk.title}</span>
                    {tk.priority && <StarFilledIcon size={13} className="text-gold shrink-0" />}
                    <span className="shrink-0 text-[11px] font-[600] text-gray tabular-nums">{fmtEst(tk.estimated_minutes || 30)}</span>
                    <button onClick={() => unassignTask(tk.id)} aria-label="Remove from block" className="shrink-0 px-1 text-[15px] leading-none text-gray hover:text-error">×</button>
                  </div>
                ))}
                {(blockTasks[String(sel.i)] ?? []).length === 0 && <p className="text-[12px] text-gray">No tasks yet — add one below.</p>}
              </div>
              {/* Add an unscheduled task to this block */}
              {unscheduled.length > 0 && (
                <div className="mt-2">
                  <div className="mb-1 text-[11px] font-[700] text-gray">Add a task</div>
                  <div className="max-h-40 space-y-1 overflow-y-auto">
                    {unscheduled.slice(0, 8).map(tk => (
                      <button key={tk.id} onClick={() => assignTask(tk.id, sel.i)}
                        className="flex w-full items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2 text-left hover:border-teal/50 hover:bg-teal/5">
                        <PlusIcon size={13} className="shrink-0 text-teal" />
                        <span className="flex-1 truncate text-[13px] text-dark-text">{tk.title}</span>
                        <span className="shrink-0 text-[11px] font-[600] text-gray tabular-nums">{fmtEst(tk.estimated_minutes || 30)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Sheet>

      <Tour tourKey="rhythm" steps={RHYTHM_TOUR} />
    </div>
  )
}
