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
  parseHM, fmtClock, fmtShift, fmtDuration, SELLING_MINUTES, localToday,
} from '@/lib/schedule'
import {
  urgency, urgencyLabel, isActive, isStale, autoPlan, fmtEst, localDate, DEFAULT_TRIAGE, categorize,
  pickRolloverBlock, MAX_DEFERRALS, AUTO_PRIORITY_DEFERRALS,
} from '@/lib/triageEngine'
import { asLearning, recordDeferral, learnedBonus, learnedTip } from '@/lib/triageLearning'
import { monthPaceFraction } from '@/lib/winsEngine'
import { stageMeta } from '@/lib/partnerChecklist'
import { askCoach } from '@/lib/coachBus'
import { AiTip } from '@/components/AiTip'
import { Tour } from '@/components/tour'
import { RHYTHM_TOUR } from '@/lib/tours'

const PX_PER_MIN = 1.5        // 90px per hour — short blocks stay usable & legible
const SNAP = 5                // snap drag/create to 5-minute steps
const GUTTER = 52             // px reserved for the hour labels
const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)
const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'focus', label: 'Sell' }, { value: 'plan', label: 'Plan' },
  { value: 'admin', label: 'Admin' }, { value: 'break', label: 'Break' }, { value: 'lunch', label: 'Lunch' },
]
const fmtViewDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
// Shifts an ISO "YYYY-MM-DD" date by N calendar days using local date-FIELD
// arithmetic (setDate), not raw millisecond math — a day can be 23 or 25 real
// hours across a DST transition, so `+ n * 86400000` can land one calendar
// day off from the intended date.
const shiftDate = (iso: string, days: number): string => {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return localToday(d)
}

// Greedy column layout for overlapping blocks (Google-Calendar style): each
// cluster of overlapping blocks splits into side-by-side columns. Keyed by block key.
function layoutColumns(items: { key: string; start: number; dur: number }[]) {
  const sorted = [...items].sort((a, b) => a.start - b.start || a.key.localeCompare(b.key))
  const out: Record<string, { col: number; cols: number }> = {}
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
    cl.forEach(it => { out[it.key] = { col: it._col, cols } })
  }
  sorted.forEach(it => {
    if (cluster.length && it.start >= clusterEnd) { flush(cluster); cluster = [] }
    cluster.push(it)
    clusterEnd = cluster.length === 1 ? it.start + it.dur : Math.max(clusterEnd, it.start + it.dur)
  })
  if (cluster.length) flush(cluster)
  return out
}

// Read-only glance ahead (or back) from whichever day is anchored — the
// anchor day's real (overridden) blocks, and the plain shift template for
// the other visible days (no per-day overrides are loaded for them; only
// Day view edits a day, which is what loads its real overrides). Tap any
// day to jump into the full interactive Day view for that date.
// KNOWN LIMITATION: if the anchor isn't today (e.g. paging Week view back to
// a week that still contains today), today's own cell shows the plain
// template too — its real per-day overrides aren't fetched unless it's the
// anchor. Its task-planned count (from rangeTasks) is still accurate either
// way, since that's fetched for every visible day, not just the anchor.
function MultiDayOverview({ days, anchor, todayIso, base, templateBlocks, rangeTasks, onPickDay }: {
  days: number; anchor: string; todayIso: string; base: number
  templateBlocks: { key: string; label: string; type: string; start: number; dur: number; done: boolean }[]
  rangeTasks: Record<string, any[]> | null
  onPickDay: (iso: string) => void
}) {
  const dateFor = (i: number) => shiftDate(anchor, i)
  const dayLabel = (iso: string) => {
    if (iso === todayIso) return 'Today'
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
  }
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}>
      {Array.from({ length: days }, (_, i) => {
        const iso = dateFor(i)
        const isAnchor = i === 0          // the day templateBlocks' real overrides belong to
        const isRealToday = iso === todayIso
        const blocks = isAnchor ? templateBlocks : templateBlocks.map(b => ({ ...b, done: false }))
        const dayTasks = rangeTasks?.[iso] ?? []
        const doneN = dayTasks.filter(t => t.done).length
        return (
          <button key={iso} onClick={() => onPickDay(iso)}
            className={cn('flex min-w-0 flex-col rounded-xl border p-2 text-left transition-colors hover:border-teal/40',
              isRealToday ? 'border-teal/40 bg-teal/[0.04]' : 'border-border bg-card')}>
            <div className={cn('mb-1.5 truncate text-[11px] font-[800] uppercase tracking-wide', isRealToday ? 'text-teal' : 'text-gray')}>{dayLabel(iso)}</div>
            <div className="space-y-1">
              {blocks.map(b => (
                <div key={b.key} className={cn('flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[10.5px]', b.done ? 'opacity-50' : '')} style={{ backgroundColor: `${(BLOCK_STYLE[b.type] ?? BLOCK_STYLE.focus).color}14` }}>
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: (BLOCK_STYLE[b.type] ?? BLOCK_STYLE.focus).color }} />
                  <span className="truncate font-[700] text-dark-text">{b.label}</span>
                  <span className="ml-auto shrink-0 text-gray">{fmtClock(b.start)}</span>
                </div>
              ))}
            </div>
            {dayTasks.length > 0 && (
              <div className="mt-1.5 border-t border-border pt-1.5 text-[10px] font-[700] text-mid-text">{doneN}/{dayTasks.length} tasks planned</div>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default function SchedulePage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string>()
  const [settings, setSettings] = useState<Record<string, unknown>>({})
  const [shift, setShift] = useState(DEFAULT_SHIFT)
  const [loading, setLoading] = useState(true)
  // Template overrides (keyed "0".."8") and freeform custom blocks (keyed "c:uuid").
  const [over, setOver] = useState<Record<string, any>>({})
  const [customBlocks, setCustomBlocks] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [goal, setGoal] = useState<number | null>(null)
  const [dealsThisMonth, setDealsThisMonth] = useState(0)
  const [partners, setPartners] = useState<any[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [triageBusy, setTriageBusy] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [dragTaskId, setDragTaskId] = useState<string | null>(null)   // task being dragged from the list
  const [triageBlk, setTriageBlk] = useState<{ blk: any; tasks: any[] } | null>(null)  // end-of-block triage
  const settingsRef = useRef<any>({})       // always-latest settings, to avoid stale-closure clobbering
  const pillDragRef = useRef(false)          // suppress the click that can follow a cancelled pill drag
  const [dropKey, setDropKey] = useState<string | null>(null)         // block hovered as a drop target
  const [selected, setSelected] = useState<string | null>(null)       // selected block key
  const [preview, setPreview] = useState<{ key: string; start: number; dur: number } | null>(null)
  const previewRef = useRef<any>(null)
  const interactedRef = useRef(false)   // suppress the click that follows a block drag/tap
  const [now, setNow] = useState(() => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() })
  const scrollRef = useRef<HTMLDivElement>(null)
  const today = localToday()
  // The day being viewed/edited — defaults to today, but Day view is fully
  // date-navigable (Prev/Today/Tomorrow/Next + a date picker) so a rep can plan
  // ahead. All "live" behavior (the NOW line, auto-scroll-to-now, the ended-
  // blocks nudge, the end-of-block triage flow) stays scoped to `isToday` —
  // block times are minute-of-day only, so comparing them against the real
  // clock on a different calendar day would be meaningless.
  const [viewDate, setViewDate] = useState<string>(() => localToday())
  const isToday = viewDate === today
  const tomorrowIso = shiftDate(today, 1)
  const isTomorrow = viewDate === tomorrowIso
  const viewDayLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : fmtViewDate(viewDate)
  // Always-latest viewDate, for async error-recovery reloads — a closure
  // captured when a write started can go stale if the rep navigates to a
  // different day before that write resolves/fails; the reload must target
  // whatever day is ACTUALLY on screen when it runs, not the day it was for.
  const viewDateRef = useRef(viewDate)
  useEffect(() => { viewDateRef.current = viewDate }, [viewDate])
  // Midnight rollover: `today` is recomputed every render, but `viewDate` is
  // state and won't advance on its own. If the rep was following "today" (had
  // not manually navigated elsewhere), keep following it across midnight;
  // if they'd navigated to a specific day, leave that choice alone.
  const prevTodayRef = useRef(today)
  useEffect(() => {
    if (prevTodayRef.current !== today) {
      setViewDate(v => (v === prevTodayRef.current ? today : v))
      prevTodayRef.current = today
    }
  }, [today])
  // Calendar view mode — Day is the full interactive editor (unchanged, default);
  // 3-Day/Week are a read-only glance ahead, anchored at viewDate, loaded lazily
  // on first switch (and whenever viewDate or viewMode changes).
  const [viewMode, setViewMode] = useState<'day' | '3day' | 'week'>('day')
  const [rangeTasks, setRangeTasks] = useState<Record<string, any[]> | null>(null)
  const rangeLoadedFor = useRef<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      supabase.from('users').select('settings').eq('id', user.id).single().then(({ data }) => {
        const s = data?.settings ?? {}
        settingsRef.current = s
        setSettings(s)
        if (s.shift && SHIFT_OPTIONS.some(o => o.start === s.shift)) setShift(s.shift)
        setLoading(false)
      })
      supabase.from('goals').select('monthly_deal_goal').eq('user_id', user.id).maybeSingle().then(({ data }) => setGoal(data?.monthly_deal_goal ?? null))
      supabase.from('user_progress').select('deals_this_month').eq('user_id', user.id).single().then(({ data }) => setDealsThisMonth(data?.deals_this_month ?? 0))
      supabase.from('partner_onboarding').select('id, partner_name, stage, temperature, updated_at').eq('user_id', user.id)
        .then(({ data }) => setPartners(data ?? []))
    })
  }, [])

  // Loads (and reloads on every date change) the blocks + tasks for whichever
  // day is being viewed.
  useEffect(() => {
    if (!userId) return
    loadBlocks(userId, viewDate)
    loadTasks(userId, viewDate)
  }, [userId, viewDate]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadBlocks = async (uid: string, day: string) => {
    const { data } = await supabase.from('schedule_blocks').select('block_key, label, type, note, start_min, dur_min, done').eq('user_id', uid).eq('day', day)
    const ov: Record<string, any> = {}
    const customs: any[] = []
    for (const r of data ?? []) {
      if (/^\d+$/.test(r.block_key)) ov[r.block_key] = { start_min: r.start_min, dur_min: r.dur_min, note: r.note ?? undefined, done: r.done ?? false }
      else customs.push({ key: r.block_key, label: r.label, type: r.type, start: r.start_min, dur: r.dur_min, note: r.note ?? '', done: r.done ?? false, custom: true })
    }
    setOver(ov); setCustomBlocks(customs)
  }
  const loadTasks = async (uid: string, day: string) => {
    // Every open task (for the Unplanned queue) plus any completed task
    // scheduled on the viewed day (so its done-checkbox still shows in a block).
    const { data } = await supabase.from('tasks')
      .select('id, title, done, priority, due_date, estimated_minutes, created_at, scheduled_day, scheduled_block, snoozed_until, deferral_count, last_deferred_at')
      .eq('user_id', uid).is('parent_id', null)
      .or(`done.eq.false,scheduled_day.eq.${day}`)
    setTasks(data ?? [])
  }

  useEffect(() => { settingsRef.current = settings }, [settings])
  // One race-safe path for every settings write — always reads the latest
  // settings (ref), so concurrent writes (shift, aging, learning) never clobber.
  const persistSettings = (mut: (s: any) => any) => {
    const next = mut(settingsRef.current || {})
    settingsRef.current = next
    setSettings(next)
    if (userId) supabase.from('users').update({ settings: next }).eq('id', userId).then(() => {})
  }

  useEffect(() => {
    const id = setInterval(() => { const d = new Date(); setNow(d.getHours() * 60 + d.getMinutes()) }, 60000)
    return () => clearInterval(id)
  }, [])

  const base = parseHM(shift)
  const chosen = SHIFT_OPTIONS.find(o => o.start === shift) ?? SHIFT_OPTIONS[0]

  // Unified block list: template (with overrides) + custom.
  const templateBlocks = OPTIMIZED_DAY.map((b, i) => {
    const o = over[String(i)]
    return {
      key: String(i), custom: false, label: b.label, type: b.type, tip: b.tip, href: b.href, cta: b.cta,
      start: o?.start_min ?? (base + b.off),
      dur: o?.dur_min ?? b.dur,
      note: o?.note ?? '',
      done: !!o?.done,
      edited: o?.start_min != null && (o.start_min !== base + b.off || (o.dur_min ?? b.dur) !== b.dur),
    }
  })
  const blocks = [...templateBlocks, ...customBlocks.map(c => ({ ...c, edited: false }))]
  const blockByKey = (k: string) => blocks.find(b => b.key === k)

  const lastT = OPTIMIZED_DAY[OPTIMIZED_DAY.length - 1]
  const minStart = Math.min(base, ...blocks.map(x => x.start))
  const maxEnd = Math.max(base + lastT.off + lastT.dur, ...blocks.map(x => x.start + x.dur))
  const rangeStart = Math.floor((minStart - 30) / 60) * 60
  const rangeEnd = Math.ceil((maxEnd + 30) / 60) * 60
  const totalH = (rangeEnd - rangeStart) * PX_PER_MIN
  const y = (min: number) => (min - rangeStart) * PX_PER_MIN
  const hours: number[] = []
  for (let h = rangeStart; h <= rangeEnd; h += 60) hours.push(h)

  const doneCount = templateBlocks.filter(x => x.done).length
  const cols = layoutColumns(blocks.map(x => ({
    key: x.key,
    start: preview?.key === x.key ? preview.start : x.start,
    dur: preview?.key === x.key ? preview.dur : x.dur,
  })))

  // ── Triage derivations ──────────────────────────────────────────────────────
  const nowDate = new Date()
  const plannedToday = tasks.filter(t => t.scheduled_day === viewDate && t.scheduled_block != null)
  const scheduledToday = plannedToday.filter(t => isActive(t, nowDate))
  const blockTasks: Record<string, any[]> = {}
  for (const t of plannedToday) { (blockTasks[String(t.scheduled_block)] ??= []).push(t) }
  const planTotal = plannedToday.length
  const planDone = plannedToday.filter(t => t.done).length
  const planProgress = planTotal ? Math.round((planDone / planTotal) * 100) : 0
  const unscheduled = tasks
    .filter(t => isActive(t, nowDate) && t.scheduled_day !== viewDate)
    .sort((a, b) => urgency(b, nowDate) - urgency(a, nowDate))
  const triageCfg = { ...DEFAULT_TRIAGE, agingDays: (settings as any)?.triage?.agingDays ?? DEFAULT_TRIAGE.agingDays }
  const staleTasks = tasks.filter(t => isStale(t, nowDate, triageCfg))
  // Slots = work blocks, ordered so blocks that haven't ended yet fill first —
  // only meaningful when viewing today; a future/past day's blocks are all
  // "upcoming" since block times are minute-of-day only.
  const slots = blocks.filter(x => ['plan', 'focus', 'admin'].includes(x.type))
    .sort((a, b) => {
      const ap = (isToday && (a.start + a.dur) <= now) ? 1 : 0, bp = (isToday && (b.start + b.dur) <= now) ? 1 : 0
      return ap - bp || a.start - b.start
    })
    .map(x => ({ key: x.key, type: x.type, capacity: x.dur }))
  const capacityMin = slots.reduce((s, x) => s + x.capacity, 0)
  const plannedMin = scheduledToday.reduce((s, t) => s + (t.estimated_minutes || 30), 0)
  const overbookedMin = Math.max(0, plannedMin - capacityMin)
  const goalGap = goal && goal > 0 ? Math.max(0, goal - dealsThisMonth) : 0
  const stuck = partners.filter(p => p.stage === 'proposal_sent' || p.stage === 'contract_signed').length

  // Work blocks whose time has passed but that aren't checked done yet — the Hub
  // proactively suggests marking these complete. Only meaningful for today —
  // block times are minute-of-day only, with no date component.
  const isWorkBlock = (t: string) => ['plan', 'focus', 'admin'].includes(t)
  const needsCheck = (blk: any) => isToday && !blk.done && isWorkBlock(blk.type) && (blk.start + blk.dur) <= now
  const learning = asLearning((settings as any)?.triageLearning)   // adaptive deferral memory (derived)
  const endedUndone = blocks.filter(needsCheck).sort((a, b) => a.start - b.start)
  const endedLeftoverTasks = endedUndone.flatMap(b => (blockTasks[b.key] ?? []).filter((t: any) => !t.done))
  const markEndedBlocksDone = async () => { for (const b of endedUndone) await saveBlock(b, { done: true }) }
  const completeEnded = async () => { await completeTasks(endedLeftoverTasks); await markEndedBlocksDone() }
  const rollOverEnded = async () => { await rollOverTasks(endedLeftoverTasks); await markEndedBlocksDone() }

  const daysSince = (iso?: string) => iso ? Math.max(0, Math.floor((nowDate.getTime() - new Date(iso).getTime()) / 86400000)) : null
  const openTitles = tasks.map(t => (t.title || '').toLowerCase())
  const hasTitle = (needle: string) => openTitles.some(t => t.includes(needle.toLowerCase()))
  const suggestions = (() => {
    const out: any[] = []
    const stalled = partners.filter(p => p.stage === 'proposal_sent' || p.stage === 'contract_signed')
      .sort((a, b) => (a.updated_at || '').localeCompare(b.updated_at || ''))
    for (const p of stalled.slice(0, 4)) {
      if (hasTitle(p.partner_name)) continue
      const d = daysSince(p.updated_at)
      out.push({ id: `lead:${p.id}`, kind: 'lead', title: `Follow up with ${p.partner_name}`, priority: (d ?? 0) >= 3,
        reason: `${stageMeta(p.stage).label}${d != null ? ` · ${d}d no movement` : ''} — a nudge could close it.`, estimate: 15 })
    }
    if (goal && goal > 0) {
      const expected = goal * monthPaceFraction(nowDate)
      if (dealsThisMonth < expected && !hasTitle('prospect')) {
        const behind = Math.max(1, Math.ceil(expected - dealsThisMonth))
        out.push({ id: 'goal', kind: 'goal', title: 'Prospect new leads to close the gap', priority: true,
          reason: `~${behind} behind pace toward ${goal} deals — feed the top of funnel today.`, estimate: 30 })
      }
    }
    const warm = partners.filter(p => p.temperature === 'warm' && (p.stage === 'interested' || p.stage === 'new_lead'))
    if (warm.length && !hasTitle('warm lead')) {
      out.push({ id: 'warm', kind: 'warm', title: `Advance ${warm.length} warm lead${warm.length > 1 ? 's' : ''}`, priority: false,
        reason: 'Warm leads convert best — book the next step before they cool.', estimate: 20 })
    }
    return out.filter(s => !dismissed.has(s.id))
  })()

  useEffect(() => {
    if (loading || !scrollRef.current) return
    const target = (isToday && now >= rangeStart && now <= rangeEnd) ? now : rangeStart
    scrollRef.current.scrollTop = Math.max(0, (target - rangeStart) * PX_PER_MIN - 120)
  }, [loading, viewDate, rangeStart, rangeEnd]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Block persistence (template + custom, keyed by block.key) ────────────────
  const saveBlock = async (blk: any, patch: any) => {
    // Merge onto the FRESHEST block (not the passed snapshot) so a done-toggle
    // can't clobber a concurrent move/resize of the same block.
    const cur = blockByKey(blk.key) ?? blk
    const merged = {
      label: patch.label ?? cur.label,
      type: patch.type ?? cur.type,
      start_min: patch.start_min ?? cur.start,
      dur_min: patch.dur_min ?? cur.dur,
      note: patch.note !== undefined ? patch.note : cur.note,
      done: patch.done !== undefined ? patch.done : cur.done,
    }
    if (blk.custom) {
      setCustomBlocks(prev => prev.map(c => c.key === blk.key ? { ...c, label: merged.label, type: merged.type, start: merged.start_min, dur: merged.dur_min, note: merged.note, done: merged.done } : c))
    } else {
      setOver(prev => ({ ...prev, [blk.key]: { start_min: merged.start_min, dur_min: merged.dur_min, note: merged.note, done: merged.done } }))
    }
    if (!userId) return
    const { error } = await supabase.from('schedule_blocks').upsert({
      user_id: userId, day: viewDate, block_key: blk.key,
      label: merged.label, type: merged.type,
      start_min: merged.start_min, dur_min: merged.dur_min,
      note: merged.note || null, done: merged.done, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,day,block_key' })
    if (error) { toast.error('That change didn’t save — try again.'); loadBlocks(userId, viewDateRef.current) }
  }
  const toggleDone = (blk: any) => saveBlock(blk, { done: !blk.done })

  const createCustomBlock = async (startMin: number) => {
    if (!userId) return
    const start = Math.max(rangeStart, Math.min(rangeEnd - 30, Math.round(startMin / SNAP) * SNAP))
    const key = `c:${uid()}`
    const blk = { key, custom: true, label: 'New block', type: 'focus', start, dur: 30, note: '', done: false }
    setCustomBlocks(prev => [...prev, blk])
    setSelected(key)
    const { error } = await supabase.from('schedule_blocks').upsert({
      user_id: userId, day: viewDate, block_key: key, label: 'New block', type: 'focus',
      start_min: start, dur_min: 30, note: null, done: false, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,day,block_key' })
    if (error) { setCustomBlocks(prev => prev.filter(c => c.key !== key)); setSelected(null); toast.error('Couldn’t add that block — try again.') }
  }
  const deleteBlock = async (blk: any) => {
    if (!blk.custom) { // template → reset to default
      setOver(prev => { const n = { ...prev }; delete n[blk.key]; return n })
      if (userId) await supabase.from('schedule_blocks').delete().eq('user_id', userId).eq('day', viewDate).eq('block_key', blk.key)
      setSelected(null)
      return
    }
    setCustomBlocks(prev => prev.filter(c => c.key !== blk.key))
    setSelected(null)
    // Return any tasks assigned to this block to the unplanned queue.
    const orphans = tasks.filter(t => t.scheduled_day === viewDate && String(t.scheduled_block) === blk.key)
    setTasks(prev => prev.map(t => orphans.some(o => o.id === t.id) ? { ...t, scheduled_day: null, scheduled_block: null } : t))
    if (userId) {
      await supabase.from('schedule_blocks').delete().eq('user_id', userId).eq('day', viewDate).eq('block_key', blk.key)
      await Promise.all(orphans.map(o => supabase.from('tasks').update({ scheduled_day: null, scheduled_block: null }).eq('id', o.id)))
    }
    toast.success('Block removed')
  }

  // ── Task actions ─────────────────────────────────────────────────────────────
  const patchTask = async (id: string, patch: any) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
    const { error } = await supabase.from('tasks').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast.error('That change didn’t save — try again.'); if (userId) loadTasks(userId, viewDateRef.current) }
  }
  const toggleTaskDone = async (id: string, done: boolean) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done } : t))
    const { error } = await supabase.from('tasks').update({ done, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast.error('That change didn’t save — try again.'); if (userId) loadTasks(userId, viewDateRef.current) }
  }
  const assignTask = (id: string, key: string) => patchTask(id, { scheduled_day: viewDate, scheduled_block: key })
  const unassignTask = (id: string) => patchTask(id, { scheduled_day: null, scheduled_block: null })
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
  const bestSlot = (title: string, est: number) => {
    const rem: Record<string, number> = {}
    slots.forEach(s => { rem[s.key] = s.capacity })
    scheduledToday.forEach(st => { const k = String(st.scheduled_block); if (rem[k] != null) rem[k] -= (st.estimated_minutes || 30) })
    const cat = categorize(title)
    return (cat && slots.find(s => s.type === cat && rem[s.key] >= est)) || slots.find(s => rem[s.key] >= est) || slots[0]
  }
  const planOne = (t: any) => {
    const slot = bestSlot(t.title, t.estimated_minutes || 30)
    if (slot) { assignTask(t.id, slot.key); toast.success('Planned into your day') }
  }
  const autoPlanDay = async (reflow: boolean) => {
    if (triageBusy) return
    setTriageBusy(true)
    try {
      const assign = autoPlan(tasks, slots, nowDate, { reflow, learn: learnedBonus(learning) })
      const updates = tasks.filter(t => assign[t.id] != null && (t.scheduled_day !== viewDate || String(t.scheduled_block) !== String(assign[t.id])))
      const cleared = reflow ? tasks.filter(t => assign[t.id] == null && t.scheduled_day === viewDate) : []
      setTasks(prev => prev.map(t => {
        if (assign[t.id] != null) return { ...t, scheduled_day: viewDate, scheduled_block: String(assign[t.id]) }
        if (reflow && t.scheduled_day === viewDate) return { ...t, scheduled_day: null, scheduled_block: null }
        return t
      }))
      await Promise.all([
        ...updates.map(t => supabase.from('tasks').update({ scheduled_day: viewDate, scheduled_block: String(assign[t.id]), updated_at: new Date().toISOString() }).eq('id', t.id)),
        ...cleared.map(t => supabase.from('tasks').update({ scheduled_day: null, scheduled_block: null, updated_at: new Date().toISOString() }).eq('id', t.id)),
      ])
      const n = Object.keys(assign).length
      toast.success(n ? `Planned ${n} task${n > 1 ? 's' : ''} into your day` : 'Nothing to plan right now')
    } finally { setTriageBusy(false) }
  }
  // ── End-of-block triage ──────────────────────────────────────────────────────
  const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return localDate(d) }
  // Record deferrals grouped by the block type each task came from, so the
  // adaptive engine learns which kind of work the user chronically rolls over.
  // Race-safe: derives from the latest persisted learning, never a stale closure.
  const learnBySource = (items: any[]) => {
    const byType: Record<string, number> = {}
    items.forEach(t => { const ty = blockByKey(String(t.scheduled_block))?.type ?? 'other'; byType[ty] = (byType[ty] || 0) + 1 })
    persistSettings(prev => {
      let L2 = asLearning(prev?.triageLearning)
      for (const [ty, n] of Object.entries(byType)) L2 = recordDeferral(L2, ty === 'other' ? null : ty, n, new Date().toISOString())
      return { ...prev, triageLearning: L2 }
    })
  }
  // Bulk-complete a set of tasks.
  const completeTasks = async (items: any[]) => {
    const ids = items.map(t => t.id)
    setTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, done: true } : t))
    await Promise.all(ids.map(id => supabase.from('tasks').update({ done: true, updated_at: new Date().toISOString() }).eq('id', id)))
  }
  // Roll incomplete tasks into the next fitting block later today; otherwise defer
  // to tomorrow. Each move increments deferral_count (auto-escalating priority).
  const rollOverTasks = async (items: any[]) => {
    if (!items.length) return
    const used: Record<string, number> = {}
    scheduledToday.forEach(st => { if (st.done) return; const k = String(st.scheduled_block); used[k] = (used[k] || 0) + (st.estimated_minutes || 30) })
    items.forEach(t => { const k = String(t.scheduled_block); if (used[k] != null) used[k] = Math.max(0, used[k] - (t.estimated_minutes || 30)) })
    const placement = blocks.map(b => ({ key: b.key, type: b.type, start: b.start, dur: b.dur }))
    const tomorrow = addDays(1)
    let later = 0, deferred = 0
    const updates = items.map(t => {
      const targetKey = pickRolloverBlock(t, placement, used, now, String(t.scheduled_block))
      const newDef = Math.min(MAX_DEFERRALS, (t.deferral_count || 0) + 1)   // counter is capped
      const patch: any = { deferral_count: newDef, last_deferred_at: new Date().toISOString(), priority: t.priority || newDef >= AUTO_PRIORITY_DEFERRALS }
      if (targetKey) { used[targetKey] = (used[targetKey] || 0) + (t.estimated_minutes || 30); patch.scheduled_day = viewDate; patch.scheduled_block = targetKey; later++ }
      else { patch.scheduled_day = tomorrow; patch.scheduled_block = null; deferred++ }
      return { id: t.id, patch }
    })
    setTasks(prev => prev.map(t => { const u = updates.find(x => x.id === t.id); return u ? { ...t, ...u.patch } : t }))
    learnBySource(items)
    toast.success(later && deferred ? `Rolled ${later} later · ${deferred} to tomorrow` : later ? `Rolled ${later} into later block${later > 1 ? 's' : ''}` : `Deferred ${deferred} to tomorrow`)
    try { await Promise.all(updates.map(u => supabase.from('tasks').update({ ...u.patch, updated_at: new Date().toISOString() }).eq('id', u.id))) }
    catch { toast.error('Could not save — refreshing'); if (userId) loadTasks(userId, viewDateRef.current) }
  }
  const deferToTomorrow = async (items: any[]) => {
    if (!items.length) return
    const tomorrow = addDays(1)
    const updates = items.map(t => {
      const newDef = Math.min(MAX_DEFERRALS, (t.deferral_count || 0) + 1)
      return { id: t.id, patch: { scheduled_day: tomorrow, scheduled_block: null, deferral_count: newDef, last_deferred_at: new Date().toISOString(), priority: t.priority || newDef >= AUTO_PRIORITY_DEFERRALS } }
    })
    setTasks(prev => prev.map(t => { const u = updates.find(x => x.id === t.id); return u ? { ...t, ...u.patch } : t }))
    learnBySource(items)
    toast.success(`Deferred ${items.length} to tomorrow`)
    try { await Promise.all(updates.map(u => supabase.from('tasks').update({ ...u.patch, updated_at: new Date().toISOString() }).eq('id', u.id))) }
    catch { toast.error('Could not save — refreshing'); if (userId) loadTasks(userId, viewDateRef.current) }
  }
  // Marking a block done: if it still holds incomplete tasks, intercept with the
  // triage micro-dialogue instead of silently completing the block. The
  // roll-forward/defer flow is about restructuring the REST OF TODAY, so it
  // only applies when viewing today — elsewhere, completing just completes.
  const requestBlockDone = (blk: any) => {
    if (blk.done) { toggleDone(blk); return }
    if (!isToday) { toggleDone(blk); return }
    const incomplete = (blockTasks[blk.key] ?? []).filter((t: any) => !t.done)
    if (incomplete.length) { setTriageBlk({ blk, tasks: incomplete }); return }
    toggleDone(blk)
  }
  const finalizeTriage = (act: () => Promise<void> | void) => {
    const blk = triageBlk?.blk
    Promise.resolve(act()).then(() => { if (blk && !blk.done) toggleDone(blk) })
    setTriageBlk(null)
  }
  // Bulk action on the non-stuck tasks. If stuck tasks remain (>= MAX_DEFERRALS),
  // keep the sheet open showing only those — they need an explicit decision and
  // are NOT silently rolled again (enforces "nothing defers forever").
  const triageAct = (normal: any[], stuck: any[], act: (items: any[]) => Promise<void> | void) => {
    if (stuck.length) { if (normal.length) act(normal); setTriageBlk(cur => (cur ? { ...cur, tasks: stuck } : cur)) }
    else finalizeTriage(() => act(normal))
  }
  // Resolve a single stuck task, then drop it from the sheet (finalize if last).
  const resolveStuck = async (t: any, action: 'do' | 'remove') => {
    if (action === 'do') await completeTasks([t]); else await removeTask(t.id)
    setTriageBlk(cur => {
      if (!cur) return cur
      const remaining = cur.tasks.filter((x: any) => x.id !== t.id)
      if (!remaining.length) { if (!cur.blk.done) toggleDone(cur.blk); return null }
      return { ...cur, tasks: remaining }
    })
  }

  const ensureList = async () => {
    const { data } = await supabase.from('task_lists').select('id').eq('user_id', userId).order('order_index').limit(1)
    if (data && data[0]) return data[0].id
    const { data: created } = await supabase.from('task_lists').insert({ user_id: userId, name: 'My Tasks', order_index: 0 }).select('id').single()
    return created?.id
  }
  const createTask = async (title: string, estimate: number, opts: { priority?: boolean; plan?: boolean; blockKey?: string } = {}) => {
    if (!userId) return
    const list_id = await ensureList()
    const { data } = await supabase.from('tasks')
      .insert({ user_id: userId, list_id, title, estimated_minutes: estimate, priority: !!opts.priority })
      .select('id, title, done, priority, due_date, estimated_minutes, created_at, scheduled_day, scheduled_block, snoozed_until, deferral_count, last_deferred_at').single()
    if (!data) return
    setTasks(prev => [data, ...prev])
    if (opts.blockKey) { await patchTask(data.id, { scheduled_day: viewDate, scheduled_block: opts.blockKey }); toast.success('Added to block') }
    else if (opts.plan) { const slot = bestSlot(title, estimate); if (slot) await patchTask(data.id, { scheduled_day: viewDate, scheduled_block: slot.key }); toast.success('Added & planned into your day') }
    else toast.success('Task added')
  }
  const dismissSuggestion = (id: string) => setDismissed(prev => new Set(prev).add(id))

  const setAgingDays = async (n: number) => {
    let next: any = {}
    setSettings(prev => { next = { ...prev, triage: { ...(prev as any)?.triage, agingDays: n } }; return next })
    if (userId) await supabase.from('users').update({ settings: next }).eq('id', userId)
  }
  const resetDay = async () => {
    // Tasks parked in custom blocks must return to the queue (those blocks vanish).
    const orphans = tasks.filter(t => t.scheduled_day === viewDate && typeof t.scheduled_block === 'string' && t.scheduled_block.startsWith('c:'))
    setOver({}); setCustomBlocks([]); setSelected(null)
    if (orphans.length) setTasks(prev => prev.map(t => orphans.some(o => o.id === t.id) ? { ...t, scheduled_day: null, scheduled_block: null } : t))
    if (userId) {
      await supabase.from('schedule_blocks').delete().eq('user_id', userId).eq('day', viewDate)
      await Promise.all(orphans.map(o => supabase.from('tasks').update({ scheduled_day: null, scheduled_block: null }).eq('id', o.id)))
    }
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

  // ── Drag to move / resize ────────────────────────────────────────────────────
  const startDrag = (e: React.PointerEvent, blk: any, mode: 'move' | 'resize') => {
    e.preventDefault(); e.stopPropagation()
    const meta = { startY: e.clientY, origStart: blk.start, origDur: blk.dur, moved: false }
    const onMove = (ev: PointerEvent) => {
      const delta = Math.round((ev.clientY - meta.startY) / PX_PER_MIN / SNAP) * SNAP
      if (Math.abs(ev.clientY - meta.startY) > 3) meta.moved = true
      let next
      if (mode === 'move') {
        const start = Math.min(Math.max(meta.origStart + delta, rangeStart), rangeEnd - meta.origDur)
        next = { key: blk.key, start, dur: meta.origDur }
      } else {
        const dur = Math.min(Math.max(meta.origDur + delta, 15), rangeEnd - meta.origStart)
        next = { key: blk.key, start: meta.origStart, dur }
      }
      previewRef.current = next
      setPreview(next)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      const p = previewRef.current
      if (meta.moved && p) saveBlock(blk, { start_min: p.start, dur_min: p.dur })
      else if (!meta.moved) setSelected(blk.key)
      previewRef.current = null
      setPreview(null)
      // The browser fires a click after pointerup; suppress canvas-create for it.
      interactedRef.current = true
      setTimeout(() => { interactedRef.current = false }, 60)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // Click empty calendar space → create a freeform block at that time.
  const onCanvasClick = (e: React.MouseEvent) => {
    if (interactedRef.current) return        // ignore the click right after a block drag
    if (e.target !== e.currentTarget) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const min = rangeStart + (e.clientY - rect.top) / PX_PER_MIN
    createCustomBlock(min - 15)  // center the 30-min block on the click
  }
  // Drop a dragged task onto a block.
  const onBlockDrop = (e: React.DragEvent, key: string) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain') || dragTaskId
    if (id) assignTask(id, key)
    setDragTaskId(null); setDropKey(null)
  }

  // Lazily load the wider date range's tasks the first time 3-Day/Week is opened
  // (Day view never needs it, so most sessions skip this fetch entirely).
  // MUST stay above the `if (loading) return` below — a hook can never be
  // called conditionally or after an early return, or React throws a
  // "change in the order of Hooks" error the moment `loading` flips to
  // false (which is every single load). That was the Schedule tab crash.
  useEffect(() => {
    if (viewMode === 'day' || !userId) return
    const span = viewMode === '3day' ? 3 : 7
    const cacheKey = `${viewMode}:${viewDate}`
    if (rangeLoadedFor.current === cacheKey) return
    rangeLoadedFor.current = cacheKey
    const dates = Array.from({ length: span }, (_, i) => shiftDate(viewDate, i))
    supabase.from('tasks').select('id, title, done, scheduled_day, scheduled_block')
      .eq('user_id', userId).in('scheduled_day', dates).is('parent_id', null)
      .then(({ data }) => {
        const byDay: Record<string, any[]> = {}
        for (const t of data ?? []) (byDay[t.scheduled_day] ??= []).push(t)
        setRangeTasks(byDay)
      })
  }, [viewMode, userId, viewDate])

  if (loading) return <div className="space-y-4"><SkeletonCard /></div>

  const sel = selected != null ? blockByKey(selected) : null
  const selStyle = sel ? (BLOCK_STYLE[sel.type] ?? BLOCK_STYLE.focus) : null

  return (
    <div className="space-y-3 pb-4">
      {/* Compact header + toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <h1 className="text-h2 text-dark-text leading-tight">Time Blocks</h1>
          <p className="text-[12px] text-gray">
            {viewMode === 'day'
              ? (isToday ? 'Drag to move · drag the edge to resize · tap a block · tap empty space to add' : `Planning ${fmtViewDate(viewDate)} — drag to move · tap a block · tap empty space to add`)
              : `A look ahead from ${fmtViewDate(viewDate)} — full editing lives in Day view`}
          </p>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-border shrink-0" role="tablist" aria-label="Calendar view">
          {([['day', 'Day'], ['3day', '3-Day'], ['week', 'Week']] as const).map(([v, l]) => (
            <button key={v} role="tab" aria-selected={viewMode === v} onClick={() => setViewMode(v)}
              className={cn('px-3 py-2 text-[12px] font-[800]', viewMode === v ? 'bg-navy text-white' : 'bg-card text-gray hover:text-navy-ink')}>
              {l}
            </button>
          ))}
        </div>
        <div className="relative">
          <select value={shift} onChange={e => pickShift(e.target.value)} aria-label="Shift"
            className="appearance-none rounded-lg border border-border bg-card py-2 pl-3 pr-8 text-[13px] font-[700] text-dark-text shadow-card focus:outline-none focus:ring-2 focus:ring-navy">
            {SHIFT_OPTIONS.map(o => <option key={o.start} value={o.start}>{fmtShift(o)}</option>)}
          </select>
          <ClockIcon size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray" />
        </div>
        {(Object.keys(over).length > 0 || customBlocks.length > 0) && (
          <button onClick={resetDay} aria-label="Reset day" className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-2 text-[12px] font-[700] text-gray shadow-card hover:text-error">
            <RefreshIcon size={14} /> Reset
          </button>
        )}
      </div>

      {/* Date navigator — jump ahead to plan tomorrow, or any day/week/month */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center overflow-hidden rounded-lg border border-border shrink-0">
          <button onClick={() => setViewDate(d => shiftDate(d, -(viewMode === 'day' ? 1 : viewMode === '3day' ? 3 : 7)))}
            aria-label={viewMode === 'day' ? 'Previous day' : viewMode === '3day' ? 'Previous 3 days' : 'Previous week'}
            className="px-2.5 py-2 text-[13px] font-[800] text-gray hover:bg-bdrbg hover:text-navy-ink">‹</button>
          <button onClick={() => setViewDate(today)}
            className={cn('border-l border-r border-border px-3 py-2 text-[12px] font-[800]', isToday ? 'bg-navy text-white' : 'bg-card text-gray hover:text-navy-ink')}>Today</button>
          <button onClick={() => setViewDate(tomorrowIso)}
            className={cn('border-r border-border px-3 py-2 text-[12px] font-[800]', isTomorrow ? 'bg-navy text-white' : 'bg-card text-gray hover:text-navy-ink')}>Tomorrow</button>
          <button onClick={() => setViewDate(d => shiftDate(d, viewMode === 'day' ? 1 : viewMode === '3day' ? 3 : 7))}
            aria-label={viewMode === 'day' ? 'Next day' : viewMode === '3day' ? 'Next 3 days' : 'Next week'}
            className="px-2.5 py-2 text-[13px] font-[800] text-gray hover:bg-bdrbg hover:text-navy-ink">›</button>
        </div>
        <input type="date" value={viewDate} onChange={e => e.target.value && setViewDate(e.target.value)} aria-label="Jump to a date"
          className="rounded-lg border border-border bg-card px-3 py-2 text-[13px] font-[700] text-dark-text shadow-card focus:outline-none focus:ring-2 focus:ring-navy" />
        {!isToday && !isTomorrow && <span className="text-[12px] font-[700] text-mid-text">{viewDayLabel}</span>}
      </div>

      <div className="flex items-center gap-2 text-[12px]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal/10 px-2.5 py-1 font-[700] text-teal"><PhoneIcon size={13} />{fmtDuration(SELLING_MINUTES)} selling</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-bdrbg px-2.5 py-1 font-[700] text-mid-text tabular-nums">{doneCount}/{OPTIMIZED_DAY.length} done</span>
      </div>

      <AiTip id="tb-autoplan" title="Let AI build your day" prompt="Plan my day for me — what should I focus on first, and in what order?" tryLabel="Plan my day with AI">
        Tap <span className="font-[700]">Auto-plan my day</span> and AI schedules your tasks by priority into the right blocks — selling work into power blocks, admin into the admin block. You can still drag any block to move it.
      </AiTip>

      {viewMode !== 'day' ? (
        <MultiDayOverview
          days={viewMode === '3day' ? 3 : 7}
          anchor={viewDate}
          todayIso={today}
          base={base}
          templateBlocks={templateBlocks}
          rangeTasks={rangeTasks}
          onPickDay={(iso: string) => { setViewDate(iso); setViewMode('day') }}
        />
      ) : (
      <>
      {/* AI day-triage summary */}
      <div className="rounded-2xl bg-gradient-hero p-4 text-white shadow-card">
        <div className="mb-2 flex items-center gap-2">
          <LightningIcon size={16} className="text-white" />
          <span className="text-[14px] font-[800]">{isToday || isTomorrow ? `${viewDayLabel}’s triage` : `Triage for ${viewDayLabel}`}</span>
          <span className={cn('ml-auto rounded-full px-2 py-0.5 text-[11px] font-[700] tabular-nums', overbookedMin > 0 ? 'bg-error/30 text-white' : 'text-white/70')}>
            {overbookedMin > 0 ? `Overbooked ${overbookedMin}m` : `${plannedMin}m planned · ${Math.max(0, capacityMin - plannedMin)}m free`}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-white/10 px-2.5 py-2">
            <div className="text-[11px] text-white/70">Goal</div>
            <div className="text-[15px] font-[800] leading-tight">{goal ? `${dealsThisMonth}/${goal}` : '—'}</div>
            <div className="text-[10px] text-white/60">{goal ? (goalGap > 0 ? `${goalGap} to go` : 'hit ') : 'set in Analytics'}</div>
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
            <div className="mb-1 flex items-center justify-between text-[11px] text-white/80"><span>{isToday || isTomorrow ? `${viewDayLabel}’s plan` : `Plan for ${viewDayLabel}`}</span><span className="tabular-nums">{planDone}/{planTotal} done</span></div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-card transition-all duration-700 ease-out" style={{ width: `${planProgress}%` }} /></div>
          </div>
        )}
        <div data-tour="autoplan-controls" className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => autoPlanDay(false)} disabled={triageBusy}
            className="flex items-center gap-1.5 rounded-lg bg-card px-3 py-2 text-[13px] font-[800] text-navy-ink active:scale-[0.99] disabled:opacity-60">
            <LightningIcon size={14} className="text-navy-ink" /> {triageBusy ? 'Planning…' : 'Auto-plan my day'}
          </button>
          {scheduledToday.length > 0 && (
            <button onClick={() => autoPlanDay(true)} disabled={triageBusy}
              className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-[13px] font-[700] text-white hover:bg-white/25 disabled:opacity-60">
              <RefreshIcon size={14} /> Re-plan
            </button>
          )}
          <button onClick={() => askCoach(isToday
              ? 'Look at my goal, pipeline, and today’s tasks. Triage my day for me: what are the top 3 things to focus on and in what order?'
              : `Look at my goal, pipeline, and my tasks for ${fmtViewDate(viewDate)}. Help me plan that day: what are the top 3 things to focus on and in what order?`)}
            className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-[13px] font-[700] text-white hover:bg-white/25">
            <TargetIcon size={14} /> Coach my day
          </button>
        </div>
      </div>

      {/* Smart suggestions */}
      {suggestions.length > 0 && (
        <div className="rounded-2xl border border-teal/40 bg-teal/[0.05] p-3">
          <div className="mb-2 flex items-center gap-2">
            <LightningIcon size={15} className="text-teal" />
            <span className="text-[13px] font-[800] text-dark-text">Suggested for {viewDayLabel.toLowerCase() === 'today' || viewDayLabel.toLowerCase() === 'tomorrow' ? viewDayLabel.toLowerCase() : viewDayLabel}</span>
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
                  s.kind === 'goal' ? 'bg-gold/15 text-gold' : s.kind === 'warm' ? 'bg-orange-500/15 text-orange-400' : 'bg-navy/10 text-navy-ink')}>
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

      {/* Proactive nudge: blocks whose time has passed but aren't checked done */}
      {endedUndone.length > 0 && (
        <div className="rounded-2xl border border-gold/40 bg-gold/[0.08] p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/20 text-[#A06C00]"><ClockIcon size={18} /></span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-[800] text-dark-text">{endedUndone.length} time block{endedUndone.length > 1 ? 's have' : ' has'} ended</div>
              <div className="text-[11px] text-gray">{endedLeftoverTasks.length > 0 ? `${endedLeftoverTasks.length} task${endedLeftoverTasks.length > 1 ? 's' : ''} left — roll forward or mark done.` : 'Check off what you finished to keep your day accurate.'}</div>
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {endedLeftoverTasks.length > 0 && (
              <button onClick={rollOverEnded}
                className="flex items-center gap-1.5 rounded-lg bg-[#A06C00] px-3 py-2 text-[12px] font-[800] text-white active:scale-[0.99]">
                <LightningIcon size={13} /> Roll {endedLeftoverTasks.length > 1 ? 'them' : 'it'} forward
              </button>
            )}
            <button onClick={endedLeftoverTasks.length > 0 ? completeEnded : markEndedBlocksDone}
              className={cn('flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-[800] active:scale-[0.99]',
                endedLeftoverTasks.length > 0 ? 'border border-gold/50 bg-card text-[#A06C00]' : 'bg-[#A06C00] text-white')}>
              <CheckIcon size={13} /> Mark all done
            </button>
          </div>
        </div>
      )}

      {/* Calendar day view */}
      <div ref={scrollRef} data-tour="rhythm-timeline"
        className="overflow-y-auto rounded-2xl border border-border bg-card shadow-card"
        style={{ maxHeight: 'calc(100vh - 230px)' }}>
        <div className="relative" style={{ height: totalH }}>
          {hours.map(h => (
            <div key={h} className="pointer-events-none absolute left-0 right-0 flex items-start" style={{ top: y(h) }}>
              <span className="w-[52px] shrink-0 -translate-y-2 pr-2 text-right text-[10px] font-[700] uppercase text-gray">{fmtClock(h)}</span>
              <span className="mt-px h-px flex-1 bg-border/70" />
            </div>
          ))}
          {hours.slice(0, -1).map(h => (
            <div key={`half-${h}`} className="pointer-events-none absolute right-0 h-px bg-border/30" style={{ top: y(h + 30), left: GUTTER }} />
          ))}

          {isToday && now >= rangeStart && now <= rangeEnd && (
            <div className="pointer-events-none absolute left-0 right-0 z-20 flex items-center" style={{ top: y(now) }}>
              <span className="ml-[46px] h-2.5 w-2.5 -translate-y-px rounded-full bg-error shadow" />
              <span className="h-[2px] flex-1 bg-error/80" />
            </div>
          )}

          {/* Events area — click empty space to add a block; blocks lay out in columns */}
          <div className="absolute bottom-0 top-0" style={{ left: GUTTER + 4, right: 8 }} onClick={onCanvasClick}>
            {blocks.map((blk) => {
              const { key, type, done } = blk
              const st = BLOCK_STYLE[type] ?? BLOCK_STYLE.focus
              const p = preview?.key === key ? preview : null
              const start = p ? p.start : blk.start
              const dur = p ? p.dur : blk.dur
              const top = y(start)
              const height = Math.max(16, dur * PX_PER_MIN)
              const tiny = height < 30
              const compact = height < 52
              const isCurrent = isToday && now >= start && now < start + dur
              const suggestDone = needsCheck(blk)
              const dragging = preview?.key === key
              const bTasks = blockTasks[key] ?? []
              const { col, cols: ncols } = cols[key] ?? { col: 0, cols: 1 }
              const showPills = !tiny && !compact && bTasks.length > 0 && height >= 80
              const maxPills = Math.max(1, Math.floor((height - 46) / 19))
              const isDrop = dropKey === key
              return (
                <div key={key}
                  onPointerDown={e => startDrag(e, blk, 'move')}
                  onDragOver={dragTaskId ? (e) => { e.preventDefault(); setDropKey(key) } : undefined}
                  onDragLeave={dragTaskId ? () => setDropKey(k => k === key ? null : k) : undefined}
                  onDrop={dragTaskId ? (e) => onBlockDrop(e, key) : undefined}
                  className={cn('group absolute select-none overflow-hidden rounded-lg border-l-[3px] px-1.5 py-1 shadow-sm transition-shadow touch-none',
                    done ? 'opacity-60' : '', dragging ? 'z-30 shadow-modal ring-2 ring-navy/40' : 'z-10 hover:shadow-card cursor-grab',
                    suggestDone && !dragging && 'ring-1 ring-gold/60', isDrop && 'ring-2 ring-teal')}
                  style={{
                    top, height,
                    left: `${(col / ncols) * 100}%`,
                    width: `calc(${100 / ncols}% - 3px)`,
                    backgroundColor: dragging ? `${st.color}26` : `${st.color}14`,
                    borderLeftColor: st.color,
                  }}>
                  <div className={cn('flex h-full flex-col', showPills ? 'justify-start pt-1' : 'justify-center')}>
                    <div className="flex items-center justify-start gap-1.5">
                      {!tiny && (
                        <button onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); requestBlockDone(blk) }}
                          aria-label={done ? 'Mark not done' : 'Mark done'}
                          className={cn('flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border-[1.5px] transition-all',
                            done ? 'border-success bg-success text-white' : 'bg-card text-transparent', suggestDone && 'animate-attention')}
                          style={{ minHeight: 18, ...(!done ? { borderColor: suggestDone ? 'rgb(var(--gold))' : st.color } : {}) }}>
                          <CheckIcon size={11} />
                        </button>
                      )}
                      <span className={cn('truncate text-left font-[700] leading-tight', tiny ? 'text-[11px]' : 'text-[12px]', done ? 'text-gray line-through' : 'text-dark-text')}>{blk.label}</span>
                      {!tiny && ncols === 1 && (
                        <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-[800] leading-none" style={{ backgroundColor: `${st.color}26`, color: st.color }}>{st.label}</span>
                      )}
                    </div>
                    {!tiny && !compact && (
                      <div className="mt-0.5 flex max-w-full flex-wrap items-center justify-start gap-x-1.5 text-[10.5px] text-mid-text">
                        <span className="tabular-nums">{fmtClock(start)}–{fmtClock(start + dur)}</span>
                        {blk.edited && !dragging && <span className="text-teal">· edited</span>}
                        {isCurrent && !done && <span className="rounded-full bg-teal px-1.5 text-[9px] font-[800] text-white">NOW</span>}
                        {suggestDone && <span className="rounded-full bg-gold/25 px-1.5 text-[9px] font-[800] text-[#A06C00]">Mark done?</span>}
                        {bTasks.length > 0 && !showPills && <span className="text-gray">· {bTasks.filter(t => t.done).length}/{bTasks.length} tasks</span>}
                      </div>
                    )}
                    {showPills && (
                      <div className="mt-1 space-y-0.5 overflow-hidden">
                        {bTasks.slice(0, maxPills).map(tk => (
                          <div key={tk.id} draggable
                            onPointerDown={e => e.stopPropagation()}
                            onDragStart={e => { e.stopPropagation(); pillDragRef.current = true; e.dataTransfer.setData('text/plain', tk.id); setDragTaskId(tk.id) }}
                            onDragEnd={() => { setDragTaskId(null); setDropKey(null); setTimeout(() => { pillDragRef.current = false }, 60) }}
                            onClick={e => { e.stopPropagation(); if (pillDragRef.current) return; toggleTaskDone(tk.id, !tk.done) }}
                            className="flex cursor-grab items-center gap-1 rounded bg-white/70 px-1.5 py-0.5 text-left active:cursor-grabbing">
                            <span className={cn('flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border', tk.done ? 'border-success bg-success text-white' : 'border-gray/50 text-transparent')}><CheckIcon size={9} /></span>
                            <span className={cn('truncate text-[10px] font-[600]', tk.done ? 'text-gray line-through' : 'text-dark-text')}>{tk.title}</span>
                            {(tk.deferral_count ?? 0) > 0 && <span className="ml-auto shrink-0 rounded bg-gold/20 px-1 text-[8px] font-[800] text-[#A06C00]" title={`Rolled over ${tk.deferral_count}×`}>↻{tk.deferral_count}</span>}
                          </div>
                        ))}
                        {bTasks.length > maxPills && <div className="text-center text-[9px] font-[700] text-gray">+{bTasks.length - maxPills} more</div>}
                      </div>
                    )}
                  </div>
                  <div onPointerDown={e => startDrag(e, blk, 'resize')}
                    className="absolute inset-x-0 bottom-0 flex h-2.5 cursor-ns-resize items-end justify-center" aria-hidden="true">
                    <span className="mb-0.5 h-1 w-7 rounded-full bg-dark-text/15 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      </>
      )}

      {/* Needs attention — stale tasks aging out */}
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

      {/* Unplanned tasks queue */}
      <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <ChecklistIcon size={15} className="text-navy-ink" />
          <span className="text-[13px] font-[800] text-dark-text">Unplanned tasks</span>
          <span className="rounded-full bg-bdrbg px-2 py-0.5 text-[11px] font-[700] text-mid-text tabular-nums">{unscheduled.length}</span>
          <label className="ml-auto flex items-center gap-1 text-[11px] text-gray">
            Flag stale after
            <select value={triageCfg.agingDays} onChange={e => setAgingDays(parseInt(e.target.value, 10))}
              className="rounded-md border border-border bg-card px-1.5 py-1 text-[11px] font-[700] text-dark-text">
              {[3, 5, 7, 14, 30].map(d => <option key={d} value={d}>{d}d</option>)}
            </select>
          </label>
          <Link href="/tasks" className="text-[12px] font-[700] text-navy-ink">Manage →</Link>
        </div>
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
          <p className="py-2 text-center text-[12px] text-gray">Everything’s planned. Nice. </p>
        ) : (
          <div className="space-y-1.5">
            {unscheduled.slice(0, 12).map(t => {
              const u = urgencyLabel(urgency(t, nowDate))
              return (
                <div key={t.id} draggable
                  onDragStart={e => { e.dataTransfer.setData('text/plain', t.id); setDragTaskId(t.id) }}
                  onDragEnd={() => { setDragTaskId(null); setDropKey(null) }}
                  className="flex items-center gap-2 rounded-lg border border-border bg-bdrbg px-2.5 py-2">
                  <button onClick={() => toggleTaskDone(t.id, true)} aria-label="Complete task" style={{ minHeight: 18 }}
                    className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border-[1.5px] border-border text-transparent transition-colors hover:border-teal hover:bg-teal/10">
                    <CheckIcon size={11} />
                  </button>
                  <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-[800]',
                    u.tone === 'high' ? 'bg-error/10 text-error' : u.tone === 'med' ? 'bg-gold/15 text-[#A06C00]' : 'bg-bdrbg text-gray')}>{u.label}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-dark-text">{t.title}{t.priority && <StarFilledIcon size={12} className="ml-1 inline text-gold" />}</span>
                  <div className="flex shrink-0 items-center rounded-md border border-border bg-card">
                    <button onClick={() => setEstimate(t.id, (t.estimated_minutes || 30) - 15)} aria-label="Less time" className="px-1.5 text-gray hover:text-navy-ink">−</button>
                    <span className="w-9 text-center text-[11px] font-[700] text-mid-text tabular-nums">{fmtEst(t.estimated_minutes || 30)}</span>
                    <button onClick={() => setEstimate(t.id, (t.estimated_minutes || 30) + 15)} aria-label="More time" className="px-1.5 text-gray hover:text-navy-ink">+</button>
                  </div>
                  <button onClick={() => planOne(t)} className="shrink-0 rounded-md bg-teal/10 px-2 py-1 text-[11px] font-[700] text-teal hover:bg-teal/15">Plan</button>
                </div>
              )
            })}
            <p className="pt-1 text-center text-[10px] text-gray">Tip: drag a task onto a block to schedule it there.</p>
          </div>
        )}
      </div>

      {/* Outlook — compact */}
      <Link href="/settings" className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-[12px] shadow-card hover:border-navy/40">
        <CalendarIcon size={15} className="text-navy-ink" />
        <span className="font-[700] text-dark-text">Connect Outlook / Google</span>
        <span className="text-gray">— two-way calendar sync</span>
        <span className="ml-auto rounded-full bg-bdrbg px-2 py-0.5 text-[10px] font-[700] text-gray">Soon</span>
      </Link>

      {/* Block detail sheet */}
      <Sheet open={selected != null} onClose={() => setSelected(null)} title={sel?.label}>
        {sel && selStyle && (
          <div key={sel.key} className="space-y-4">
            {/* Custom blocks: editable label + type */}
            {sel.custom ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="text-[11px] font-[700] text-gray">Name
                  <input defaultValue={sel.label} onBlur={e => saveBlock(sel, { label: e.target.value.trim() || 'Block' })}
                    className="mt-1 w-full rounded-md border border-border bg-card px-2 py-2 text-[13px] font-[600]" />
                </label>
                <label className="text-[11px] font-[700] text-gray">Type
                  <select defaultValue={sel.type} onChange={e => saveBlock(sel, { type: e.target.value })}
                    className="mt-1 w-full rounded-md border border-border bg-card px-2 py-2 text-[13px] font-[600]">
                    {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="rounded-full px-2 py-0.5 text-[11px] font-[800]" style={{ backgroundColor: `${selStyle.color}1A`, color: selStyle.color }}>{selStyle.label}</span>
                <span className="text-[13px] font-[700] text-mid-text tabular-nums">{fmtClock(sel.start)}–{fmtClock(sel.start + sel.dur)}</span>
                <span className="text-[12px] text-gray">· {fmtDuration(sel.dur)}</span>
              </div>
            )}

            {sel.tip && <p className="text-[13px] leading-relaxed text-mid-text">{sel.tip}</p>}

            <div className="flex flex-wrap gap-2">
              <button onClick={() => { setSelected(null); requestBlockDone(sel) }}
                className={cn('flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-[700]',
                  sel.done ? 'bg-success/10 text-success' : needsCheck(sel) ? 'bg-gold/15 text-[#A06C00] ring-1 ring-gold/50' : 'bg-bdrbg text-dark-text hover:bg-border/40')}>
                <CheckIcon size={15} />{sel.done ? 'Completed' : needsCheck(sel) ? 'Mark done?' : 'Mark done'}
              </button>
              {sel.href && (
                <Link href={sel.href} className="flex items-center gap-1.5 rounded-lg bg-teal/10 px-3 py-2 text-[13px] font-[700] text-teal hover:bg-teal/15">
                  {sel.cta ?? 'Open'} <ArrowRightIcon size={14} />
                </Link>
              )}
              <button onClick={() => deleteBlock(sel)} className="flex items-center gap-1.5 rounded-lg bg-bdrbg px-3 py-2 text-[13px] font-[700] text-gray hover:text-error">
                <TrashIcon size={14} /> {sel.custom ? 'Delete block' : 'Reset block'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] font-[700] text-gray">Start
                <input type="time" defaultValue={`${String(Math.floor((sel.start % 1440) / 60)).padStart(2, '0')}:${String(sel.start % 60).padStart(2, '0')}`}
                  onChange={e => { if (e.target.value) saveBlock(sel, { start_min: parseHM(e.target.value) }) }}
                  className="mt-1 w-full rounded-md border border-border bg-card px-2 py-2 text-[13px]" />
              </label>
              <label className="text-[11px] font-[700] text-gray">Duration (min)
                <input type="number" min={5} step={5} defaultValue={sel.dur}
                  onChange={e => { const v = parseInt(e.target.value, 10); if (v >= 5) saveBlock(sel, { dur_min: v }) }}
                  className="mt-1 w-full rounded-md border border-border bg-card px-2 py-2 text-[13px]" />
              </label>
            </div>

            <div>
              <div className="mb-1 text-[11px] font-[700] text-gray">Note</div>
              <textarea defaultValue={sel.note} rows={3} placeholder="Focus, targets, who to call…"
                onBlur={e => saveBlock(sel, { note: e.target.value.trim() })}
                className="w-full resize-none rounded-md border border-border bg-card px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-navy" />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-[700] text-gray">Tasks in this block</span>
                {(blockTasks[sel.key] ?? []).length > 0 && (
                  <span className="text-[11px] font-[700] text-mid-text tabular-nums">{(blockTasks[sel.key] ?? []).reduce((s, t) => s + (t.estimated_minutes || 30), 0)}m planned</span>
                )}
              </div>
              <div className="space-y-1.5">
                {(blockTasks[sel.key] ?? []).map(tk => (
                  <div key={tk.id} className="flex items-center gap-2 rounded-md bg-bdrbg px-2.5 py-2">
                    <button onClick={() => toggleTaskDone(tk.id, !tk.done)} aria-label={tk.done ? 'Mark task incomplete' : 'Complete task'} style={{ minHeight: 18 }}
                      className={cn('flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border-[1.5px]', tk.done ? 'border-success bg-success text-white' : 'border-border text-transparent')}>
                      <CheckIcon size={11} />
                    </button>
                    <span className={cn('flex-1 text-[13px]', tk.done ? 'text-gray line-through' : 'text-mid-text')}>{tk.title}</span>
                    {tk.priority && <StarFilledIcon size={13} className="text-gold shrink-0" />}
                    <span className="shrink-0 text-[11px] font-[600] text-gray tabular-nums">{fmtEst(tk.estimated_minutes || 30)}</span>
                    <button onClick={() => unassignTask(tk.id)} aria-label="Remove from block" className="shrink-0 px-1 text-[15px] leading-none text-gray hover:text-error">×</button>
                  </div>
                ))}
                {(blockTasks[sel.key] ?? []).length === 0 && <p className="text-[12px] text-gray">No tasks yet — add one below.</p>}
              </div>
              {unscheduled.length > 0 && (
                <div className="mt-2">
                  <div className="mb-1 text-[11px] font-[700] text-gray">Add a task</div>
                  <div className="max-h-40 space-y-1 overflow-y-auto">
                    {unscheduled.slice(0, 8).map(tk => (
                      <button key={tk.id} onClick={() => assignTask(tk.id, sel.key)}
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

      {/* End-of-block triage — supportive, low-friction handling of leftovers */}
      <Sheet open={triageBlk != null} onClose={() => setTriageBlk(null)} title="Wrap up this block">
        {triageBlk && (() => {
          const tc = BLOCK_STYLE[triageBlk.blk.type] ?? BLOCK_STYLE.focus
          const n = triageBlk.tasks.length
          const tip = learnedTip(learning)
          const stuckTasks = triageBlk.tasks.filter((t: any) => (t.deferral_count ?? 0) >= MAX_DEFERRALS)
          const normal = triageBlk.tasks.filter((t: any) => (t.deferral_count ?? 0) < MAX_DEFERRALS)
          const hasStuck = stuckTasks.length > 0
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full px-2 py-0.5 text-[11px] font-[800]" style={{ backgroundColor: `${tc.color}1A`, color: tc.color }}>{tc.label}</span>
                <span className="truncate text-[13px] font-[700] text-dark-text">{triageBlk.blk.label}</span>
              </div>
              <p className="text-[13px] text-mid-text">{n} task{n > 1 ? 's' : ''} {n > 1 ? 'are' : 'is'} still open. How do you want to handle {n > 1 ? 'them' : 'it'}?</p>

              {/* Stuck tasks (rolled over too many times) — explicit decision required */}
              {hasStuck && (
                <div className="space-y-1.5 rounded-xl border border-error/30 bg-error/[0.04] p-2.5">
                  <p className="text-[11px] font-[700] text-error">Rolled over {MAX_DEFERRALS}+ times — these won’t auto-roll again. Do {stuckTasks.length > 1 ? 'them' : 'it'} now or drop {stuckTasks.length > 1 ? 'them' : 'it'}:</p>
                  {stuckTasks.map((t: any) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-[13px] text-dark-text">{t.title}</span>
                      <button onClick={() => resolveStuck(t, 'do')} className="shrink-0 rounded-md bg-success/10 px-2 py-1 text-[11px] font-[800] text-success">Do now</button>
                      <button onClick={() => resolveStuck(t, 'remove')} className="shrink-0 rounded-md bg-bdrbg px-2 py-1 text-[11px] font-[800] text-gray hover:text-error">Remove</button>
                    </div>
                  ))}
                </div>
              )}

              {normal.length > 0 && (
                <div className="space-y-1.5">
                  {normal.map((t: any) => (
                    <div key={t.id} className="flex items-center gap-2 rounded-lg border border-border bg-bdrbg px-2.5 py-2">
                      <span className="min-w-0 flex-1 truncate text-[13px] text-dark-text">{t.title}{t.priority && <StarFilledIcon size={12} className="ml-1 inline text-gold" />}</span>
                      {(t.deferral_count ?? 0) > 0 && <span className="shrink-0 rounded bg-gold/20 px-1.5 text-[10px] font-[800] text-[#A06C00]">↻{t.deferral_count}</span>}
                      <span className="shrink-0 text-[11px] font-[600] text-gray tabular-nums">{fmtEst(t.estimated_minutes || 30)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                {normal.length > 0 && (
                  <button onClick={() => triageAct(normal, stuckTasks, rollOverTasks)}
                    className="flex w-full items-center gap-2 rounded-xl bg-gradient-hero px-3 py-3 text-left text-white shadow-card transition-transform active:scale-[0.99]">
                    <LightningIcon size={18} className="shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-[800]">{hasStuck ? `Roll the other ${normal.length} forward` : 'Auto-triage — roll them forward'}</span>
                      <span className="block text-[11px] text-white/80">Into the next fitting block today, or tomorrow if the day’s full</span>
                    </span>
                  </button>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => finalizeTriage(() => completeTasks(triageBlk.tasks))}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-success/30 bg-success/10 py-2.5 text-[13px] font-[800] text-success">
                    <CheckIcon size={15} /> Mark all done
                  </button>
                  <button onClick={() => triageAct(normal, stuckTasks, deferToTomorrow)} disabled={normal.length === 0}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-bdrbg py-2.5 text-[13px] font-[800] text-mid-text hover:bg-border/40 disabled:opacity-40">
                    Defer to tomorrow
                  </button>
                </div>
                <button onClick={() => { const blk = triageBlk.blk; if (!blk.done) toggleDone(blk); setTriageBlk(null) }}
                  className="w-full py-1.5 text-center text-[12px] font-[700] text-gray hover:text-dark-text">
                  Just mark the block done
                </button>
              </div>

              {tip && <p className="flex items-start gap-1.5 text-[11px] text-teal"><LightningIcon size={12} className="mt-0.5 shrink-0" /> {tip}</p>}
            </div>
          )
        })()}
      </Sheet>

      <Tour tourKey="rhythm" steps={RHYTHM_TOUR} />
    </div>
  )
}
