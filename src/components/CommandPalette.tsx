// @ts-nocheck
'use client'

// ⌘K command palette + global hotkeys + quick-add. Keyboard-first: run commands
// (new task/note, log call/demo/deal, ask coach, toggle theme/sidebar, jump to
// any page, start the tour) and search partners/tasks/notes/lessons in one place.
// Mounted once in the app shell. Press ? for the shortcut cheatsheet.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/ui'
import { askCoach } from '@/lib/coachBus'
import { triggerXpPop, triggerConfetti } from '@/components/gamification'
import { getStoredTheme, setStoredTheme, applyTheme } from '@/lib/theme'
import {
  SearchIcon, HomeIcon, TodayIcon, GrowIcon, LeaderboardIcon, BarChartIcon, TrainIcon,
  BookIcon, ChecklistIcon, DocumentIcon, CoachIcon, PhoneIcon, TargetIcon, HandshakeIcon,
  PlusIcon, SettingsIcon, ArrowRightIcon, LightningIcon, MenuIcon, HubIcon,
} from '@/components/icons'
import { cn } from '@/lib/utils'

const NAV = [
  { label: 'Home', href: '/home', icon: HomeIcon, keys: 'h' },
  { label: 'Today', href: '/today', icon: TodayIcon, keys: 't' },
  { label: 'Plan', href: '/schedule', icon: ChecklistIcon, keys: 'p' },
  { label: 'Agentic CRM', href: '/grow', icon: GrowIcon, keys: 'c' },
  { label: 'Leaderboard', href: '/leaderboard', icon: LeaderboardIcon, keys: 'l' },
  { label: 'Analytics', href: '/analytics', icon: BarChartIcon },
  { label: 'Learning Center', href: '/train', icon: TrainIcon },
  { label: 'Resources', href: '/resources', icon: BookIcon, keys: 'r' },
  { label: 'Partners', href: '/partners', icon: HandshakeIcon },
  { label: 'Notes', href: '/notes', icon: DocumentIcon },
  { label: 'Tasks', href: '/tasks', icon: ChecklistIcon },
  { label: 'Settings', href: '/settings', icon: SettingsIcon },
]

const isEditable = (el: any) => {
  if (!el) return false
  const t = (el.tagName || '').toLowerCase()
  return t === 'input' || t === 'textarea' || t === 'select' || el.isContentEditable
}

function toggleSidebar() {
  const el = document.documentElement
  const collapsed = el.dataset.sidebar === 'collapsed'
  el.dataset.sidebar = collapsed ? 'expanded' : 'collapsed'
  try { localStorage.setItem('sidebarCollapsed', collapsed ? '0' : '1') } catch {}
}

function toggleTheme() {
  const { base, accent } = getStoredTheme()
  const next = base === 'light' ? 'dark' : 'light'
  setStoredTheme(next, accent)
  applyTheme(next, accent, true)
  toast.success(`${next[0].toUpperCase()}${next.slice(1)} theme`)
}

export function CommandPalette() {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [results, setResults] = useState<any[]>([])
  const [compose, setCompose] = useState<null | 'task' | 'note'>(null)
  const [composeText, setComposeText] = useState('')
  const [cheats, setCheats] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const timer = useRef<any>(null)
  const gPending = useRef(false)

  const close = useCallback(() => { setOpen(false); setQ(''); setResults([]); setCompose(null); setComposeText(''); setActive(0) }, [])

  // ── Logging a quick activity (win + XP + celebrate), shared with Today ──
  const logActivity = useCallback(async (type: 'call' | 'demo' | 'deal') => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: { session } } = await supabase.auth.getSession()
    if (!user || !session) return
    const label = `${type[0].toUpperCase()}${type.slice(1)}`
    const { error } = await supabase.from('wins').insert({ user_id: user.id, type, description: `${label} logged` })
    if (error) { toast.error(`Could not log that ${type}.`); return }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/calculate-xp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: `${type}_logged`, user_id: user.id }),
      })
      if (res.ok) { const { xp_earned } = await res.json(); toast.xp(xp_earned ?? 0, `${label} logged!`); if (xp_earned) triggerXpPop(xp_earned); if (type === 'deal') triggerConfetti() }
      else toast.success(`${label} logged!`)
    } catch { toast.success(`${label} logged!`) }
  }, [supabase])

  const createNote = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('notes').insert({ user_id: user.id, title: 'Untitled note', tags: [] }).select('id').single()
    router.push('/notes')
    toast.success('Note created')
  }, [supabase, router])

  // ── Command registry ──
  const commands = useMemo(() => [
    { id: 'new-task', label: 'New task', group: 'Create', icon: PlusIcon, run: () => { setCompose('task'); setQ(''); setComposeText('') } },
    { id: 'new-note', label: 'New note', group: 'Create', icon: DocumentIcon, run: () => { close(); createNote() } },
    { id: 'log-call', label: 'Log a call', hint: '+XP', group: 'Log', icon: PhoneIcon, run: () => { close(); logActivity('call') } },
    { id: 'log-demo', label: 'Log a demo', hint: '+XP', group: 'Log', icon: TargetIcon, run: () => { close(); logActivity('demo') } },
    { id: 'log-deal', label: 'Log a deal', hint: '🎉', group: 'Log', icon: HandshakeIcon, run: () => { close(); logActivity('deal') } },
    { id: 'coach', label: 'Ask the AI Coach', group: 'AI', icon: CoachIcon, run: () => { close(); askCoach() } },
    { id: 'theme', label: 'Toggle light / dark theme', group: 'Settings', icon: LightningIcon, run: () => { close(); toggleTheme() } },
    { id: 'sidebar', label: 'Collapse / expand sidebar', group: 'Settings', icon: MenuIcon, run: () => { close(); toggleSidebar() } },
    { id: 'tour', label: 'Start the product tour', group: 'Help', icon: HubIcon, run: () => { close(); window.dispatchEvent(new CustomEvent('bdr:start-tour', { detail: 'home' })) } },
    { id: 'cheats', label: 'Keyboard shortcuts', hint: '?', group: 'Help', icon: InfoRow, run: () => { setCheats(true) } },
    ...NAV.map(n => ({ id: 'go-' + n.href, label: `Go to ${n.label}`, group: 'Navigate', icon: n.icon, run: () => { close(); router.push(n.href) } })),
  ], [close, createNote, logActivity, router])

  // Filter commands + merge live search results.
  const term = q.trim().toLowerCase()
  const filteredCommands = useMemo(() => !term ? commands.filter(c => c.group !== 'Navigate').concat(commands.filter(c => c.group === 'Navigate').slice(0, 5))
    : commands.filter(c => c.label.toLowerCase().includes(term)), [commands, term])

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (!term) { setResults([]); return }
    timer.current = setTimeout(async () => {
      const like = `%${term}%`
      const [{ data: partners }, { data: tasks }, { data: notes }, { data: lessons }] = await Promise.all([
        supabase.from('partner_onboarding').select('id, partner_name').ilike('partner_name', like).limit(4),
        supabase.from('tasks').select('id, title').eq('done', false).ilike('title', like).limit(4),
        supabase.from('notes').select('id, title').ilike('title', like).eq('archived', false).limit(4),
        supabase.from('lessons').select('id, module_id, title').eq('is_published', true).ilike('title', like).limit(3),
      ])
      const r: any[] = []
      for (const p of partners ?? []) r.push({ group: 'Partners', label: p.partner_name, href: `/partners/${p.id}` })
      for (const t of tasks ?? []) r.push({ group: 'Tasks', label: t.title, href: '/tasks' })
      for (const n of notes ?? []) r.push({ group: 'Notes', label: n.title || 'Untitled note', href: '/notes' })
      for (const l of lessons ?? []) r.push({ group: 'Learn', label: l.title, href: `/train/${l.module_id}/${l.id}` })
      setResults(r)
    }, 200)
  }, [term, supabase])

  // Flattened selectable rows: commands first, then search results.
  const rows = useMemo(() => [
    ...filteredCommands.map(c => ({ type: 'cmd', ...c })),
    ...results.map(r => ({ type: 'link', id: r.href + r.label, label: r.label, group: r.group, run: () => { close(); router.push(r.href) } })),
  ], [filteredCommands, results, close, router])

  useEffect(() => { setActive(0) }, [term, results.length])

  const runRow = (row: any) => row?.run?.()

  // ── Global keyboard: ⌘K, hotkeys, and in-palette nav ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o); return }
      if (open) {
        if (e.key === 'Escape') { e.preventDefault(); compose ? setCompose(null) : close() }
        else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(rows.length - 1, a + 1)) }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)) }
        else if (e.key === 'Enter' && !compose) { e.preventDefault(); runRow(rows[active]) }
        return
      }
      // Global shortcuts only when not typing and no modifier held.
      if (e.metaKey || e.ctrlKey || e.altKey || isEditable(document.activeElement)) return
      if (e.key === '?') { e.preventDefault(); setCheats(true); return }
      if (gPending.current) {
        gPending.current = false
        const dest = NAV.find(n => n.keys === e.key.toLowerCase())
        if (dest) { e.preventDefault(); router.push(dest.href) }
        return
      }
      if (e.key === 'g') { gPending.current = true; setTimeout(() => { gPending.current = false }, 900); return }
      if (e.key === 'c') { e.preventDefault(); askCoach() }
      else if (e.key === 't') { e.preventDefault(); setOpen(true); setCompose('task') }
      else if (e.key === 'n') { e.preventDefault(); createNote() }
      else if (e.key === '[') { e.preventDefault(); toggleSidebar() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, rows, active, compose, close, router, createNote])

  useEffect(() => { if (open && !compose) setTimeout(() => inputRef.current?.focus(), 20) }, [open, compose])
  // Keep the active row scrolled into view.
  useEffect(() => { const el = listRef.current?.querySelector(`[data-idx="${active}"]`); el?.scrollIntoView({ block: 'nearest' }) }, [active])

  const submitCompose = async () => {
    const text = composeText.trim()
    if (!text) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (compose === 'task') {
      const { error } = await supabase.from('tasks').insert({ user_id: user.id, title: text })
      if (error) { toast.error('Could not add task.'); return }
      toast.success('Task added')
    }
    close()
  }

  if (!open && !cheats) return null

  return createPortal(
    <>
      {open && (
        <div className="fixed inset-0 z-[1200] flex items-start justify-center p-4 pt-[10vh]" onMouseDown={close}>
          <div className="absolute inset-0 bg-dark-text/50 backdrop-blur-[2px] animate-fade-in" />
          <div className="relative z-10 w-full max-w-[560px] overflow-hidden rounded-2xl border border-border bg-card shadow-modal animate-fade-up" onMouseDown={e => e.stopPropagation()}>
            {compose ? (
              <div className="p-4">
                <div className="mb-2 text-[11px] font-[800] uppercase tracking-wide text-gray">New {compose}</div>
                <input autoFocus value={composeText} onChange={e => setComposeText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitCompose(); if (e.key === 'Escape') setCompose(null) }}
                  placeholder={compose === 'task' ? 'What needs doing?' : 'Note title…'}
                  className="w-full rounded-lg border border-border bg-bdrbg px-3 py-2.5 text-[14px] outline-none focus:border-navy/40" />
                <div className="mt-2 flex justify-end gap-2">
                  <button onClick={() => setCompose(null)} className="rounded-lg px-3 py-1.5 text-[12px] font-[700] text-gray hover:text-dark-text">Cancel</button>
                  <button onClick={submitCompose} disabled={!composeText.trim()} className="rounded-lg bg-navy px-3 py-1.5 text-[12px] font-[800] text-white disabled:opacity-50">Add</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 border-b border-border px-3.5 py-3">
                  <SearchIcon size={16} className="shrink-0 text-gray" />
                  <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Type a command or search…"
                    aria-label="Command palette" className="flex-1 bg-transparent text-[14px] outline-none placeholder-gray" />
                  <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] font-[700] text-gray sm:block">ESC</kbd>
                </div>
                <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-1.5">
                  {rows.length === 0 ? (
                    <div className="px-3 py-6 text-center text-[12.5px] text-gray">No matches. Press <kbd className="rounded border border-border px-1 text-[10px]">?</kbd> for shortcuts.</div>
                  ) : rows.map((row, i) => {
                    const Icon = row.icon
                    return (
                      <button key={row.id} data-idx={i} onMouseEnter={() => setActive(i)} onClick={() => runRow(row)}
                        className={cn('flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left', i === active ? 'bg-navy/10' : 'hover:bg-bdrbg')}>
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-bdrbg text-navy-ink">
                          {Icon ? <Icon size={14} /> : <ArrowRightIcon size={14} />}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13.5px] text-dark-text">{row.label}</span>
                        {row.hint && <span className="shrink-0 text-[11px] font-[700] text-gray">{row.hint}</span>}
                        <span className="shrink-0 text-[10px] font-[800] uppercase tracking-wide text-gray">{row.group}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {cheats && <Cheatsheet onClose={() => setCheats(false)} />}
    </>,
    document.body
  )
}

// tiny inline icon used for the "keyboard shortcuts" command
function InfoRow({ size = 14 }: any) {
  return <span style={{ fontSize: size, fontWeight: 900, lineHeight: 1 }}>?</span>
}

const SHORTCUTS: [string, string][] = [
  ['⌘K', 'Open the command palette'],
  ['t', 'New task'], ['n', 'New note'], ['c', 'Ask the coach'],
  ['[', 'Collapse / expand sidebar'], ['?', 'This cheatsheet'],
  ['g then h', 'Go Home'], ['g then t', 'Go to Today'], ['g then c', 'Go to CRM'],
  ['g then l', 'Go to Leaderboard'], ['g then r', 'Go to Resources'],
]

function Cheatsheet({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[1210] flex items-center justify-center p-4" onMouseDown={onClose}>
      <div className="absolute inset-0 bg-dark-text/50 backdrop-blur-[2px] animate-fade-in" />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-modal animate-fade-up" onMouseDown={e => e.stopPropagation()}>
        <div className="mb-3 text-[15px] font-[900] text-dark-text">Keyboard shortcuts</div>
        <div className="space-y-1.5">
          {SHORTCUTS.map(([k, d]) => (
            <div key={k} className="flex items-center justify-between gap-3">
              <span className="text-[12.5px] text-mid-text">{d}</span>
              <kbd className="shrink-0 rounded border border-border bg-bdrbg px-2 py-0.5 text-[11px] font-[800] text-dark-text">{k}</kbd>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 w-full rounded-lg bg-navy py-2 text-[13px] font-[800] text-white">Got it</button>
      </div>
    </div>
  )
}
