// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, SkeletonCard, toast } from '@/components/ui'
import { PageHeader } from '@/components/manager'
import { ClockIcon, PhoneIcon, CheckIcon, ArrowRightIcon, CalendarIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import {
  SHIFT_OPTIONS, DEFAULT_SHIFT, OPTIMIZED_DAY, BLOCK_STYLE,
  parseHM, fmtClock, fmtShift, fmtDuration, SELLING_MINUTES,
} from '@/lib/schedule'

export default function SchedulePage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string>()
  const [settings, setSettings] = useState<Record<string, unknown>>({})
  const [shift, setShift] = useState(DEFAULT_SHIFT)
  const [loading, setLoading] = useState(true)
  // Per-block overrides for today: start time, duration, and note. Empty = use
  // the OPTIMIZED_DAY template. Works fully offline; syncs to Outlook later.
  const [over, setOver] = useState<Record<string, { start_min?: number; dur_min?: number; note?: string }>>({})
  const [openNote, setOpenNote] = useState<string | null>(null)
  const [editTime, setEditTime] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ start: string; dur: string }>({ start: '', dur: '' })
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
      supabase.from('schedule_blocks').select('block_key, note, start_min, dur_min').eq('user_id', user.id).eq('day', today)
        .then(({ data }) => {
          const map: Record<string, { start_min?: number; dur_min?: number; note?: string }> = {}
          for (const r of data ?? []) map[r.block_key] = { start_min: r.start_min, dur_min: r.dur_min, note: r.note ?? undefined }
          setOver(map)
        })
    })
  }, [])

  // Upsert a block override for today (start/dur/note), keyed user+day+block_key.
  const saveBlock = async (i: number, block: typeof OPTIMIZED_DAY[number], patch: { start_min?: number; dur_min?: number; note?: string }) => {
    const key = String(i)
    const cur = over[key] ?? {}
    const merged = {
      start_min: patch.start_min ?? cur.start_min ?? (parseHM(shift) + block.off),
      dur_min: patch.dur_min ?? cur.dur_min ?? block.dur,
      note: patch.note !== undefined ? patch.note : cur.note,
    }
    setOver(prev => ({ ...prev, [key]: merged }))
    if (!userId) return
    await supabase.from('schedule_blocks').upsert({
      user_id: userId, day: today, block_key: key,
      label: block.label, type: block.type,
      start_min: merged.start_min, dur_min: merged.dur_min,
      note: merged.note || null, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,day,block_key' })
  }

  const saveNote = (i: number, block: typeof OPTIMIZED_DAY[number], value: string) => {
    setOpenNote(null)
    saveBlock(i, block, { note: value })
  }
  const openTimeEditor = (i: number, start: number, dur: number) => {
    const hm = `${String(Math.floor((start % 1440) / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`
    setDraft({ start: hm, dur: String(dur) })
    setEditTime(String(i))
  }
  const saveTime = (i: number, block: typeof OPTIMIZED_DAY[number]) => {
    const start_min = parseHM(draft.start)
    const dur_min = Math.max(5, parseInt(draft.dur, 10) || block.dur)
    setEditTime(null)
    saveBlock(i, block, { start_min, dur_min })
  }
  const resetDay = async () => {
    setOver({}); setEditTime(null); setOpenNote(null)
    if (userId) await supabase.from('schedule_blocks').delete().eq('user_id', userId).eq('day', today)
    toast.success('Reset to the optimized day')
  }

  const pickShift = async (start: string) => {
    setShift(start)
    if (!userId) return
    // Build from the latest settings so a rapid second tap (or any other
    // settings writer) can't clobber unrelated keys.
    let next: Record<string, unknown> = {}
    setSettings(prev => { next = { ...prev, shift: start }; return next })
    const { error } = await supabase.from('users').update({ settings: next }).eq('id', userId)
    if (!error) toast.success('Shift saved')
  }

  const base = parseHM(shift)
  const chosen = SHIFT_OPTIONS.find(o => o.start === shift) ?? SHIFT_OPTIONS[0]

  if (loading) return <div className="space-y-4"><SkeletonCard /></div>

  return (
    <div className="space-y-5 pb-4">
      <PageHeader title="Daily Rhythm" subtitle="Pick your shift, then run the optimized time-blocked day." />

      {/* Shift picker */}
      <Card>
        <div className="label mb-2">Choose your 8-hour shift</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SHIFT_OPTIONS.map(o => {
            const active = o.start === shift
            return (
              <button key={o.start} onClick={() => pickShift(o.start)}
                className={cn('flex items-center justify-center gap-1.5 rounded-md border px-3 py-2.5 text-[13px] font-[700] transition-all',
                  active ? 'border-navy bg-navy text-white' : 'border-border bg-bdrbg text-mid-text hover:border-navy/40')}>
                {active && <CheckIcon size={14} />}{fmtShift(o)}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Selling-time highlight */}
      <Card className="bg-gradient-hero text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 shrink-0"><PhoneIcon size={20} className="text-white" /></div>
          <div>
            <div className="text-[22px] font-[800] leading-none">{fmtDuration(SELLING_MINUTES)}</div>
            <div className="text-[12px] text-white/75">of protected selling time — the point of the whole day</div>
          </div>
        </div>
      </Card>

      {/* Outlook connection — foundation laid; live sync pending Azure setup */}
      <Card className="!p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy"><CalendarIcon size={18} /></div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-[700] text-dark-text">Connect Outlook</div>
            <div className="text-[12px] text-gray">Your blocks &amp; notes save here now. Two-way calendar sync is coming soon.</div>
          </div>
          <span className="shrink-0 rounded-full bg-bdrbg px-2.5 py-1 text-[11px] font-[700] text-gray">Soon</span>
        </div>
      </Card>

      {/* Timeline */}
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <ClockIcon size={16} className="text-navy" />
          <h2 className="text-h3 text-dark-text">Your day · {fmtShift(chosen)}</h2>
          {Object.keys(over).length > 0 && (
            <button onClick={resetDay} className="ml-auto text-[11px] font-[700] text-gray hover:text-error">Reset</button>
          )}
        </div>
        <div className="space-y-2">
          {OPTIMIZED_DAY.map((b, i) => {
            const st = BLOCK_STYLE[b.type]
            const o = over[String(i)]
            const start = o?.start_min ?? (base + b.off)
            const dur = o?.dur_min ?? b.dur
            const note = o?.note ?? ''
            const edited = o?.start_min != null && (o.start_min !== base + b.off || dur !== b.dur)
            return (
              <div key={i} className="flex gap-3">
                <div className="w-[68px] shrink-0 pt-0.5 text-right">
                  <div className="text-[12px] font-[700] text-dark-text tabular-nums">{fmtClock(start)}</div>
                  <div className="text-[10px] text-gray">{fmtDuration(dur)}{edited && <span className="text-teal"> ·edited</span>}</div>
                </div>
                <div className="relative flex flex-col items-center">
                  <span className="mt-1 h-3 w-3 rounded-full" style={{ backgroundColor: st.color }} />
                  {i < OPTIMIZED_DAY.length - 1 && <span className="w-px flex-1 bg-border" />}
                </div>
                <div className="flex-1 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-[700] text-dark-text">{b.label}</span>
                    <span className="rounded-full px-1.5 py-0.5 text-[10px] font-[700]" style={{ backgroundColor: `${st.color}1A`, color: st.color }}>{st.label}</span>
                    <button onClick={() => openTimeEditor(i, start, dur)} className="ml-auto text-[11px] font-[700] text-gray hover:text-navy">Edit time</button>
                  </div>
                  {b.tip && <p className="mt-0.5 text-[12px] text-gray leading-relaxed">{b.tip}</p>}
                  {b.href && (
                    <Link href={b.href} className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-[700] text-teal hover:text-teal-dark">
                      {b.cta ?? 'Open'} <ArrowRightIcon size={13} />
                    </Link>
                  )}
                  {/* Inline time editor */}
                  {editTime === String(i) && (
                    <div className="mt-2 flex items-center gap-2 rounded-md border border-border bg-bdrbg p-2">
                      <input type="time" value={draft.start} onChange={e => setDraft(d => ({ ...d, start: e.target.value }))}
                        className="rounded border border-border bg-card px-2 py-1 text-[12px]" />
                      <input type="number" min={5} step={5} value={draft.dur} onChange={e => setDraft(d => ({ ...d, dur: e.target.value }))}
                        className="w-16 rounded border border-border bg-card px-2 py-1 text-[12px]" /> <span className="text-[11px] text-gray">min</span>
                      <button onClick={() => saveTime(i, b)} className="ml-auto rounded bg-navy px-2.5 py-1 text-[11px] font-[700] text-white">Save</button>
                      <button onClick={() => setEditTime(null)} className="text-[11px] font-[700] text-gray">Cancel</button>
                    </div>
                  )}
                  {/* Per-block note — editable in-tool, saved for today */}
                  {openNote === String(i) ? (
                    <textarea
                      autoFocus defaultValue={note} rows={2}
                      placeholder="Add a note for this block (focus, targets, who to call)…"
                      onBlur={e => saveNote(i, b, e.target.value.trim())}
                      className="mt-2 w-full resize-none rounded-md border border-border px-3 py-2 text-[12px] text-dark-text focus:outline-none focus:ring-2 focus:ring-navy" />
                  ) : note ? (
                    <button onClick={() => setOpenNote(String(i))} className="mt-1.5 block w-full rounded-md bg-bdrbg px-3 py-1.5 text-left text-[12px] text-mid-text">{note}</button>
                  ) : (
                    <button onClick={() => setOpenNote(String(i))} className="mt-1 text-[11px] font-[700] text-teal hover:text-teal-dark">+ Add note</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <p className="mt-2 text-[11px] text-gray">Optimized from a standard BDR day — adjust any block's time or add notes; changes save for today.</p>
      </Card>
    </div>
  )
}
