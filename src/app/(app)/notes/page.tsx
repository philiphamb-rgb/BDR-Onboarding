// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { SkeletonList, toast } from '@/components/ui'
import { SearchIcon, PlusIcon, TrashIcon, CheckIcon, LightningIcon, ChecklistIcon, ClockIcon, ArrowRightIcon, DocumentIcon, BackIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { OPTIMIZED_DAY, BLOCK_STYLE, parseHM, fmtClock, DEFAULT_SHIFT, localToday } from '@/lib/schedule'
import { smartTaskDefaults, suggestNoteMeta, looksActionable, cleanTaskTitle, NOTE_CATEGORIES, CATEGORY_COLOR } from '@/lib/noteTriage'
import { fmtEst } from '@/lib/triageEngine'
import { AiTip } from '@/components/AiTip'
import { PlanTabs } from '@/components/PlanTabs'

const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)
const emptyBlocks = () => [{ id: uid(), text: '' }]
const blockText = (n: any) => (n?.blocks ?? []).map((b: any) => b.text).join('\n')
// Map a smart category to a sensible template block index for "Plan today".
const CATEGORY_BLOCK: Record<string, string> = { Selling: '1', Admin: '7', Planning: '0', Learning: '0', Personal: '7', General: '1' }

export default function NotesPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string>()
  const [notes, setNotes] = useState<any[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [organizing, setOrganizing] = useState(false)
  const [aiTasks, setAiTasks] = useState<any[] | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [dayBlocks, setDayBlocks] = useState<any[]>([])     // today's schedulable blocks (drop targets)
  const [noteTasks, setNoteTasks] = useState<any[]>([])     // tasks created from the active note
  const [dropKey, setDropKey] = useState<string | null>(null)
  const saveTimer = useRef<any>(null)
  const today = localToday()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      supabase.from('notes').select('*').eq('user_id', user.id).eq('archived', false).order('updated_at', { ascending: false })
        .then(({ data }) => {
          const list = (data ?? []).map(n => ({ ...n, blocks: Array.isArray(n.blocks) && n.blocks.length ? n.blocks : emptyBlocks() }))
          setNotes(list)
          setLoading(false)
        })
      loadDayBlocks(user.id)
    })
  }, [])

  // Today's schedulable blocks (template + overrides + custom) as drop targets.
  const loadDayBlocks = async (uid: string) => {
    const [{ data: u }, { data: rows }] = await Promise.all([
      supabase.from('users').select('settings').eq('id', uid).single(),
      supabase.from('schedule_blocks').select('block_key, label, type, start_min, dur_min').eq('user_id', uid).eq('day', today),
    ])
    const shift = (u?.settings as any)?.shift || DEFAULT_SHIFT
    const base = parseHM(shift)
    const ov: Record<string, any> = {}; const customs: any[] = []
    for (const r of rows ?? []) {
      if (/^\d+$/.test(r.block_key)) ov[r.block_key] = r
      else customs.push({ key: r.block_key, label: r.label, type: r.type, start: r.start_min, dur: r.dur_min })
    }
    const template = OPTIMIZED_DAY.map((b, i) => ({ key: String(i), label: b.label, type: b.type, start: ov[i]?.start_min ?? base + b.off, dur: ov[i]?.dur_min ?? b.dur }))
    const all = [...template, ...customs].filter(b => ['plan', 'focus', 'admin'].includes(b.type)).sort((a, b) => a.start - b.start)
    setDayBlocks(all)
  }

  const active = notes.find(n => n.id === activeId) || null

  // Tasks spawned from the active note — the note's living plan.
  useEffect(() => {
    if (!activeId || !userId) { setNoteTasks([]); return }
    supabase.from('tasks').select('id, title, done, estimated_minutes, scheduled_day, scheduled_block').eq('source_note_id', activeId).order('created_at', { ascending: true })
      .then(({ data }) => setNoteTasks(data ?? []))
  }, [activeId, userId]) // eslint-disable-line react-hooks/exhaustive-deps
  const refreshNoteTasks = () => {
    if (!activeId) return
    supabase.from('tasks').select('id, title, done, estimated_minutes, scheduled_day, scheduled_block').eq('source_note_id', activeId).order('created_at', { ascending: true })
      .then(({ data }) => setNoteTasks(data ?? []))
  }

  // ── Persistence (debounced) ──────────────────────────────────────────────────
  const scheduleSave = (note: any) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => persist(note), 700)
  }
  const persist = async (note: any) => {
    if (!note?.id) return
    const { error } = await supabase.from('notes').update({
      title: note.title, blocks: note.blocks, category: note.category, tags: note.tags, updated_at: new Date().toISOString(),
    }).eq('id', note.id)
    // A debounced note save is the user's typed text — if it fails, say so
    // instead of silently losing it on the next refresh.
    if (error) toast.error('Couldn’t save this note — check your connection.')
  }
  const updateActive = (patch: any) => {
    if (!active) return
    const next = { ...active, ...patch, updated_at: new Date().toISOString() }
    // Update in place — do NOT reorder the list on every keystroke (it made the
    // active note jump to the top of the sidebar mid-word). The list re-sorts by
    // updated_at naturally on the next load.
    setNotes(prev => prev.map(n => n.id === next.id ? next : n))
    scheduleSave(next)
  }

  const newNote = async () => {
    if (!userId) return
    const note = { id: uid(), user_id: userId, title: 'Untitled note', blocks: emptyBlocks(), category: null, tags: [], archived: false, updated_at: new Date().toISOString(), created_at: new Date().toISOString() }
    const { data } = await supabase.from('notes').insert({ user_id: userId, title: note.title, blocks: note.blocks, tags: [] }).select('*').single()
    const created = data ? { ...data, blocks: Array.isArray(data.blocks) && data.blocks.length ? data.blocks : emptyBlocks() } : note
    setNotes(prev => [created, ...prev])
    setActiveId(created.id)
    setAiTasks(null)
    setFocusId(created.blocks[0].id)
  }
  const deleteNote = async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id))
    if (activeId === id) setActiveId(null)
    await supabase.from('notes').delete().eq('id', id)
    toast.success('Note deleted')
  }

  // ── Block editing ────────────────────────────────────────────────────────────
  const setBlockText = (id: string, text: string) => updateActive({ blocks: active.blocks.map((b: any) => b.id === id ? { ...b, text } : b) })
  const addBlockAfter = (id: string) => {
    const idx = active.blocks.findIndex((b: any) => b.id === id)
    const nb = { id: uid(), text: '' }
    const blocks = [...active.blocks.slice(0, idx + 1), nb, ...active.blocks.slice(idx + 1)]
    updateActive({ blocks })
    setFocusId(nb.id)
  }
  const removeBlock = (id: string) => {
    if (active.blocks.length <= 1) return
    const idx = active.blocks.findIndex((b: any) => b.id === id)
    const blocks = active.blocks.filter((b: any) => b.id !== id)
    updateActive({ blocks })
    setFocusId(blocks[Math.max(0, idx - 1)]?.id ?? null)
  }
  const onBlockKeyDown = (e: any, b: any) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addBlockAfter(b.id) }
    else if (e.key === 'Backspace' && b.text === '') { e.preventDefault(); removeBlock(b.id) }
  }

  // ── Task creation from a block / the note (smart defaults + note context) ─────
  const ensureList = async () => {
    const { data } = await supabase.from('task_lists').select('id').eq('user_id', userId).order('order_index').limit(1)
    if (data && data[0]) return data[0].id
    const { data: created } = await supabase.from('task_lists').insert({ user_id: userId, name: 'My Tasks', order_index: 0 }).select('id').single()
    return created?.id
  }
  const createTask = async (text: string, opts: { plan?: boolean; blockKey?: string } = {}) => {
    const title = cleanTaskTitle(text)
    if (!title || !userId) return
    const d = smartTaskDefaults(text)
    const tags = Array.from(new Set([...(active?.tags ?? []), ...d.tags]))
    const category = active?.category || d.category
    const list_id = await ensureList()
    const row: any = { user_id: userId, list_id, title, estimated_minutes: d.estimated_minutes, priority: d.priority, category, tags, source_note_id: active?.id ?? null }
    if (opts.blockKey) { row.scheduled_day = today; row.scheduled_block = opts.blockKey }
    else if (opts.plan) { row.scheduled_day = today; row.scheduled_block = CATEGORY_BLOCK[category] ?? '1' }
    await supabase.from('tasks').insert(row)
    refreshNoteTasks()
    const where = opts.blockKey ? (dayBlocks.find(b => b.key === opts.blockKey)?.label ?? 'block') : null
    toast.success(opts.blockKey ? `Added to ${where} · ${fmtEst(d.estimated_minutes)}` : opts.plan ? `Planned · ${fmtEst(d.estimated_minutes)}${d.priority ? ' · priority' : ''}` : `Task created · ${d.category} · ${fmtEst(d.estimated_minutes)}`)
  }

  // ── Live deterministic suggestion + AI organize ───────────────────────────────
  const text = active ? blockText(active) : ''
  const suggestion = active && text.trim().length > 12 ? suggestNoteMeta(text) : null
  const applySuggestion = () => { if (suggestion) updateActive({ category: suggestion.category, tags: Array.from(new Set([...(active.tags ?? []), ...suggestion.tags])) }) }

  const organize = async () => {
    if (!active || organizing) return
    setOrganizing(true)
    try {
      const res = await fetch('/api/note-triage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
      const data = await res.json()
      updateActive({ category: data.category || active.category, tags: Array.from(new Set([...(active.tags ?? []), ...(data.tags ?? [])])) })
      setAiTasks(data.tasks ?? [])
      if (!data.tasks?.length) toast.info('No action items found — tags & category updated')
    } catch { toast.error('Could not organize right now') }
    finally { setOrganizing(false) }
  }
  const addAiTask = async (t: any) => {
    if (!userId) return
    const list_id = await ensureList()
    await supabase.from('tasks').insert({ user_id: userId, list_id, title: t.title, estimated_minutes: t.estimate, priority: t.priority, category: active?.category || 'General', tags: active?.tags ?? [], source_note_id: active?.id ?? null })
    setAiTasks(prev => (prev ?? []).filter(x => x !== t))
    refreshNoteTasks()
    toast.success('Task added')
  }
  const toggleNoteTask = (id: string, done: boolean) => {
    setNoteTasks(prev => prev.map(t => t.id === id ? { ...t, done } : t))
    supabase.from('tasks').update({ done, updated_at: new Date().toISOString() }).eq('id', id).then(() => {})
  }

  // ── Filtering / search ────────────────────────────────────────────────────────
  const q = query.trim().toLowerCase()
  const filtered = q ? notes.filter(n => (n.title || '').toLowerCase().includes(q) || blockText(n).toLowerCase().includes(q) || (n.tags ?? []).some((t: string) => t.toLowerCase().includes(q))) : notes
  const preview = (n: any) => blockText(n).replace(/\n+/g, ' ').trim().slice(0, 80) || 'Empty note'

  if (loading) return <div className="space-y-4"><SkeletonList count={4} /></div>

  return (
    <div className="space-y-3">
      <PlanTabs />
      <div className="flex h-[calc(100vh-16rem)] gap-3 desktop:h-[calc(100vh-13rem)]">
      {/* List / history — hidden on mobile when a note is open */}
      <div className={cn('flex w-full flex-col desktop:w-[320px] desktop:shrink-0', active && 'hidden desktop:flex')}>
        <div data-tour="notes-new" className="mb-2 flex items-center gap-2">
          <h1 className="text-h2 text-dark-text">Notes</h1>
          <button onClick={newNote} className="ml-auto flex items-center gap-1 rounded-lg bg-navy px-3 py-2 text-[13px] font-[800] text-white hover:bg-navy-dark"><PlusIcon size={15} /> New</button>
        </div>
        <div className="relative mb-2">
          <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search notes, text, #tags…"
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-[13px] shadow-card outline-none focus:ring-2 focus:ring-navy" />
        </div>
        <div className="mb-2">
          <AiTip id="notes-ai" title="Notes that turn into action" prompt="">
            Brain-dump anything. Hit <span className="font-[700]">Organize</span> and AI tags it and pulls out every to-do with a time estimate. Drag any line (⠿) into a time block, or tap to make a task.
          </AiTip>
        </div>
        <div className="flex-1 space-y-1.5 overflow-y-auto pb-2">
          {filtered.length === 0 ? (
            <button onClick={newNote} className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-bdrbg p-4 text-left hover:border-navy/40">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal/10 text-teal animate-attention"><PlusIcon size={16} /></span>
              <span className="text-sm font-medium text-mid-text">{q ? 'No matches — create a note' : 'Create your first note'}</span>
            </button>
          ) : filtered.map(n => (
            <button key={n.id} onClick={() => { setActiveId(n.id); setAiTasks(null) }}
              className={cn('w-full rounded-xl border p-3 text-left transition-colors', activeId === n.id ? 'border-navy/40 bg-navy/5' : 'border-border bg-card hover:border-navy/30')}>
              <div className="flex items-center gap-2">
                {n.category && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: CATEGORY_COLOR[n.category] ?? '#64748B' }} />}
                <span className="truncate text-[14px] font-[700] text-dark-text">{n.title || 'Untitled note'}</span>
              </div>
              <div className="mt-0.5 truncate text-[12px] text-gray">{preview(n)}</div>
              {(n.tags ?? []).length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">{n.tags.slice(0, 4).map((t: string) => <span key={t} className="rounded-full bg-bdrbg px-1.5 py-0.5 text-[9px] font-[700] text-mid-text">#{t}</span>)}</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      {active ? (
        <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-border bg-card shadow-card">
          <div className="flex items-center gap-2 border-b border-border p-3">
            <button onClick={() => setActiveId(null)} aria-label="Back to notes" className="desktop:hidden text-gray hover:text-dark-text"><BackIcon size={18} /></button>
            <input value={active.title} onChange={e => updateActive({ title: e.target.value })} placeholder="Note title"
              className="min-w-0 flex-1 bg-transparent text-[18px] font-[800] text-dark-text outline-none placeholder-gray" />
            <button onClick={organize} disabled={organizing}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-gradient-hero px-2.5 py-1.5 text-[12px] font-[800] text-white active:scale-95 disabled:opacity-60">
              <LightningIcon size={13} /> {organizing ? 'Organizing…' : 'Organize'}
            </button>
            <button onClick={() => deleteNote(active.id)} aria-label="Delete note" className="shrink-0 p-1.5 text-gray hover:text-error"><TrashIcon size={16} /></button>
          </div>

          {/* Category + tags bar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
            <select value={active.category ?? ''} onChange={e => updateActive({ category: e.target.value || null })}
              className="rounded-md border border-border bg-card px-2 py-1 text-[12px] font-[700] text-dark-text">
              <option value="">Category…</option>
              {NOTE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {(active.tags ?? []).map((t: string) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-bdrbg px-2 py-0.5 text-[11px] font-[700] text-mid-text">
                #{t}<button onClick={() => updateActive({ tags: active.tags.filter((x: string) => x !== t) })} className="text-gray hover:text-error">×</button>
              </span>
            ))}
            {suggestion && (suggestion.category !== active.category || suggestion.tags.some(t => !(active.tags ?? []).includes(t))) && (
              <button onClick={applySuggestion} className="inline-flex items-center gap-1 rounded-full border border-teal/40 bg-teal/10 px-2 py-0.5 text-[11px] font-[700] text-teal">
                <LightningIcon size={11} /> Suggest: {suggestion.category}{suggestion.tags.length ? ` · #${suggestion.tags[0]}` : ''}
              </button>
            )}
          </div>

          {/* AI-extracted tasks */}
          {aiTasks && aiTasks.length > 0 && (
            <div className="border-b border-border bg-teal/[0.05] p-3">
              <div className="mb-1.5 flex items-center gap-2 text-[12px] font-[800] text-dark-text"><LightningIcon size={13} className="text-teal" />Action items found
                <button onClick={() => { aiTasks.forEach(addAiTask) }} className="ml-auto rounded-md bg-teal px-2 py-0.5 text-[11px] font-[800] text-white">Add all</button>
              </div>
              <div className="space-y-1">
                {aiTasks.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-card px-2.5 py-1.5">
                    <span className="min-w-0 flex-1 truncate text-[13px] text-dark-text">{t.title}</span>
                    {t.priority && <span className="shrink-0 rounded-full bg-error/10 px-1.5 text-[9px] font-[800] text-error">!</span>}
                    <span className="shrink-0 text-[11px] font-[600] text-gray tabular-nums">{fmtEst(t.estimate)}</span>
                    <button onClick={() => addAiTask(t)} className="shrink-0 rounded-md bg-teal/10 px-2 py-1 text-[11px] font-[800] text-teal">Add</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Block editor */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="space-y-0.5">
              {active.blocks.map((b: any) => {
                const actionable = looksActionable(b.text)
                return (
                  <div key={b.id} className="group flex items-start gap-1 rounded-lg px-1 hover:bg-bdrbg/60">
                    <span
                      draggable={!!b.text.trim()}
                      onDragStart={e => { e.dataTransfer.setData('text/plain', b.text); e.dataTransfer.effectAllowed = 'copy' }}
                      title={b.text.trim() ? 'Drag into a time block below' : undefined}
                      className={cn('mt-1.5 select-none text-[13px] leading-none', b.text.trim() ? 'cursor-grab text-gray/50 hover:text-navy' : 'text-border')}>⠿</span>
                    <textarea
                      ref={el => { if (!el) return; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; if (focusId === b.id) { el.focus(); setFocusId(null) } }}
                      value={b.text}
                      onChange={e => { setBlockText(b.id, e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                      onKeyDown={e => onBlockKeyDown(e, b)}
                      rows={1}
                      placeholder="Type a line…  (Enter for new line · type an action like “Call Acme” to make a task)"
                      className="min-h-[28px] flex-1 resize-none bg-transparent py-1 text-[14px] leading-relaxed text-dark-text outline-none placeholder-gray/70" />
                    {/* Per-line actions */}
                    <div className={cn('mt-1 flex shrink-0 items-center gap-1 transition-opacity', b.text.trim() ? 'opacity-0 group-hover:opacity-100 focus-within:opacity-100' : 'opacity-0')}>
                      <button onClick={() => createTask(b.text)} title="Make a task" aria-label="Make a task"
                        className={cn('rounded-md px-1.5 py-1 text-[11px] font-[800]', actionable ? 'bg-teal/15 text-teal' : 'text-gray hover:bg-bdrbg hover:text-navy')}><CheckIcon size={13} /></button>
                      <button onClick={() => createTask(b.text, { plan: true })} title="Make a task & plan today" aria-label="Make a task and plan today"
                        className="rounded-md px-1.5 py-1 text-gray hover:bg-bdrbg hover:text-navy"><ClockIcon size={13} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Tasks spawned from this note — the living plan */}
            {noteTasks.length > 0 && (
              <div className="mt-4 rounded-xl border border-border bg-bdrbg/60 p-2.5">
                <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-[800] uppercase tracking-wide text-gray">
                  <ChecklistIcon size={12} /> Tasks from this note <span className="tabular-nums">· {noteTasks.filter(t => t.done).length}/{noteTasks.length}</span>
                </div>
                <div className="space-y-1">
                  {noteTasks.map(t => (
                    <div key={t.id} className="flex items-center gap-2 rounded-lg bg-card px-2.5 py-1.5">
                      <button onClick={() => toggleNoteTask(t.id, !t.done)} aria-label={t.done ? 'Mark incomplete' : 'Complete'}
                        className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px]', t.done ? 'border-success bg-success text-white' : 'border-border text-transparent')}><CheckIcon size={10} /></button>
                      <span className={cn('min-w-0 flex-1 truncate text-[13px]', t.done ? 'text-gray line-through' : 'text-dark-text')}>{t.title}</span>
                      {t.scheduled_day === today && t.scheduled_block != null && <ClockIcon size={12} className="shrink-0 text-teal" />}
                      <span className="shrink-0 text-[11px] font-[600] text-gray tabular-nums">{fmtEst(t.estimated_minutes || 30)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-3 px-1 text-[11px] text-gray">Hover a line → <CheckIcon size={11} className="inline text-teal" /> make a task · <ClockIcon size={11} className="inline" /> plan it today. Drag the <span className="font-[700]">⠿</span> handle onto a block below. Or <span className="font-[700]">Organize</span> to auto-tag + extract every action item.</p>
          </div>

          {/* Drop rail — drag a note line onto today's blocks */}
          {dayBlocks.length > 0 && (
            <div className="border-t border-border p-2">
              <div className="mb-1 px-1 text-[10px] font-[800] uppercase tracking-wide text-gray">Drag a line into today ↓</div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {dayBlocks.map(b => {
                  const st = BLOCK_STYLE[b.type] ?? BLOCK_STYLE.focus
                  const isDrop = dropKey === b.key
                  return (
                    <div key={b.key}
                      onDragOver={e => { e.preventDefault(); setDropKey(b.key) }}
                      onDragLeave={() => setDropKey(k => k === b.key ? null : k)}
                      onDrop={e => { e.preventDefault(); const text = e.dataTransfer.getData('text/plain'); if (text && text.trim()) createTask(text, { blockKey: b.key }); setDropKey(null) }}
                      className={cn('flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-colors', isDrop ? 'border-teal bg-teal/10 ring-2 ring-teal/40' : 'border-border bg-bdrbg')}>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: st.color }} />
                      <span className="whitespace-nowrap text-[11px] font-[700] text-dark-text">{b.label.split(' — ')[0]}</span>
                      <span className="shrink-0 text-[10px] tabular-nums text-gray">{fmtClock(b.start)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="hidden flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card text-center desktop:flex">
          <DocumentIcon size={34} className="mb-3 text-gray" />
          <p className="text-[15px] font-[700] text-dark-text">Pick a note or start a new one</p>
          <p className="mt-1 max-w-[280px] text-[13px] text-gray">Brain-dump freely. Turn any line into a task, plan it into your day, and let Organize tag it for you.</p>
          <button onClick={newNote} className="mt-4 flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-[13px] font-[800] text-white"><PlusIcon size={15} /> New note</button>
        </div>
      )}
      </div>
    </div>
  )
}
