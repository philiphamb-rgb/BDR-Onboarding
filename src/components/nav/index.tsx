'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn, Avatar } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import {
  HomeIcon, TodayIcon, TrainIcon, CoachIcon, DashboardIcon, XpIcon,
  BellIcon, BellDotIcon, SettingsIcon, LeaderboardIcon, TeamIcon, BarChartIcon,
  BookIcon, HandshakeIcon, ClockIcon, MoreIcon, CoinIcon,
  ChecklistIcon, ShieldIcon, SearchIcon, ChevronDownIcon, CloseIcon, GrowIcon,
} from '@/components/icons'
import type { User } from '@/types/database'
import { usePermissions } from '@/components/usePermissions'
import { featureForHref } from '@/lib/permissions'
import { askCoach } from '@/lib/coachBus'
import { ApexLogo } from '@/components/ApexLogo'

interface NavItem {
  href: string
  label: string
  shortLabel?: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  match?: string[]   // extra hrefs that should mark this item active
}

// Always-visible quick destinations. Plan is one workspace (Capture/Organize/
// Schedule) — its three views share the in-page PlanTabs switcher.
// Coach is no longer a tab — it lives in the header (desktop) + a draggable FAB
// (mobile). Wins is no longer a tab — wins now surface as throttled milestone
// notifications, scattered through the app instead of a destination.
const TOP_NAV: NavItem[] = [
  { href: '/home',     label: 'Home',  icon: HomeIcon },
  { href: '/today',    label: 'Today', icon: TodayIcon },
  { href: '/schedule', label: 'Plan',  icon: ChecklistIcon, match: ['/notes', '/tasks', '/schedule'] },
]

// Collapsible sections (accordion — one open at a time).
const REP_SECTIONS: { title: string; items: NavItem[] }[] = [
  { title: 'Sell', items: [
    { href: '/partners',    label: 'Partners',    icon: HandshakeIcon },
    { href: '/analytics',   label: 'Analytics',   icon: BarChartIcon },
    { href: '/commissions', label: 'Commissions', icon: CoinIcon },
  ] },
  { title: 'Grow', items: [
    { href: '/grow',        label: 'Apex',       icon: GrowIcon, match: ['/grow'] },
    { href: '/train',       label: 'Learning Center', shortLabel: 'Learn', icon: TrainIcon, match: ['/train', '/progress'] },
    { href: '/leaderboard', label: 'Leaderboard',     icon: LeaderboardIcon },
    { href: '/resources',   label: 'Resources',       icon: BookIcon },
  ] },
]

const MANAGER_ITEMS: NavItem[] = [
  { href: '/manager/dashboard',    label: 'Dashboard',           icon: DashboardIcon },
  { href: '/manager/team',         label: 'Team',                icon: TeamIcon },
  { href: '/manager/partners',     label: 'Team Partners',       icon: HandshakeIcon },
  { href: '/manager/rhythm',       label: 'Team Time Blocks',    icon: ClockIcon },
  { href: '/manager/analytics',    label: 'Analytics',           icon: BarChartIcon },
  { href: '/manager/broadcast',    label: 'Broadcast',           icon: BellIcon },
  { href: '/manager/resources',    label: 'Resources',           icon: BookIcon },
  { href: '/manager/gamification', label: 'XP Rules',            icon: XpIcon },
  { href: '/manager/roles',        label: 'Roles & Permissions', icon: ShieldIcon },
]

// Mobile bottom bar (5 slots). Coach is the draggable FAB now; Wins is gone.
const BOTTOM_NAV: NavItem[] = [
  { href: '/home',     label: 'Home',     icon: HomeIcon },
  { href: '/today',    label: 'Today',    icon: TodayIcon },
  { href: '/partners', label: 'Partners', icon: HandshakeIcon },
  { href: '/grow',     label: 'Apex',     icon: GrowIcon, match: ['/grow'] },
  { href: '/train',    label: 'Learning Center', shortLabel: 'Learn', icon: TrainIcon },
]

const isActiveHref = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + '/')
const matchNav = (pathname: string, item: NavItem) => isActiveHref(pathname, item.href) || (item.match?.some(m => isActiveHref(pathname, m)) ?? false)

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL SEARCH (header)
// ═══════════════════════════════════════════════════════════════════════════════

const PAGE_INDEX: { label: string; href: string }[] = [
  ...TOP_NAV.map(i => ({ label: i.label, href: i.href })),
  ...REP_SECTIONS.flatMap(s => s.items.map(i => ({ label: i.label, href: i.href }))),
  // Workspace sub-views whose nav entry is the workspace itself.
  { label: 'Notes', href: '/notes' }, { label: 'Tasks', href: '/tasks' }, { label: 'Time Blocks', href: '/schedule' },
  { label: 'Progress', href: '/progress' },
  { label: 'AI Team', href: '/grow/team' }, { label: 'Content Engine', href: '/grow/content' }, { label: 'Build Phases', href: '/grow/build' },
  { label: 'Settings', href: '/settings' }, { label: 'Notifications', href: '/notifications' },
]

function GlobalSearch() {
  const supabase = createClient()
  const router = useRouter()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<{ group: string; label: string; href: string }[]>([])
  const timer = useRef<any>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); inputRef.current?.focus(); setOpen(true) }
      if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur() }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [])

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    const term = q.trim()
    if (!term) { setResults([]); return }
    timer.current = setTimeout(async () => {
      const like = `%${term}%`
      const pages = PAGE_INDEX.filter(p => p.label.toLowerCase().includes(term.toLowerCase())).slice(0, 3).map(p => ({ group: 'Go to', label: p.label, href: p.href }))
      const [{ data: partners }, { data: tasks }, { data: notes }, { data: lessons }, { data: wins }] = await Promise.all([
        supabase.from('partner_onboarding').select('id, partner_name').ilike('partner_name', like).limit(4),
        supabase.from('tasks').select('id, title').eq('done', false).ilike('title', like).limit(4),
        supabase.from('notes').select('id, title').ilike('title', like).eq('archived', false).limit(4),
        supabase.from('lessons').select('id, module_id, title').eq('is_published', true).ilike('title', like).limit(4),
        supabase.from('wins').select('id, description').ilike('description', like).limit(3),
      ])
      const r: any[] = [...pages]
      for (const p of (partners ?? []) as any[]) r.push({ group: 'Partners', label: p.partner_name, href: `/partners/${p.id}` })
      for (const t of (tasks ?? []) as any[]) r.push({ group: 'Tasks', label: t.title, href: '/tasks' })
      for (const n of (notes ?? []) as any[]) r.push({ group: 'Notes', label: n.title || 'Untitled note', href: '/notes' })
      for (const l of (lessons ?? []) as any[]) r.push({ group: 'Learn', label: l.title, href: `/train/${l.module_id}/${l.id}` })
      for (const w of (wins ?? []) as any[]) r.push({ group: 'Wins', label: w.description, href: '/wins' })
      setResults(r)
    }, 220)
  }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  const go = (href: string) => { setOpen(false); setQ(''); setResults([]); router.push(href) }

  return (
    <div ref={boxRef} className="relative w-full max-w-[520px]">
      <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray" />
      <input
        ref={inputRef}
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Search partners, tasks, notes, lessons…"
        className="w-full rounded-lg border border-border bg-bdrbg py-2 pl-9 pr-12 text-[13px] outline-none focus:border-navy/40 focus:bg-card focus:ring-2 focus:ring-navy/30"
      />
      {q ? (
        <button onClick={() => { setQ(''); setResults([]) }} aria-label="Clear" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray hover:text-dark-text"><CloseIcon size={14} /></button>
      ) : (
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-[700] text-gray desktop:block">⌘K</kbd>
      )}
      {open && q.trim() && (
        <div className="absolute left-0 right-0 top-full z-[60] mt-1 max-h-[60vh] overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-modal">
          {results.length === 0 ? (
            <div className="px-3 py-3 text-center text-[12px] text-gray">No matches</div>
          ) : results.map((r, i) => (
            <button key={i} onClick={() => go(r.href)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-bdrbg">
              <span className="w-[58px] shrink-0 text-[10px] font-[800] uppercase tracking-wide text-gray">{r.group}</span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-dark-text">{r.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL HEADER (every page)
// ═══════════════════════════════════════════════════════════════════════════════

export function AppHeader({ user, unreadCount = 0 }: { user?: User | null; unreadCount?: number }) {
  const Bell = unreadCount > 0 ? BellDotIcon : BellIcon
  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-card/80 desktop:px-6">
      <div className="flex-1"><GlobalSearch /></div>

      {/* Ask Coach — desktop trigger lives in the header (no floating button on
          the back-office canvas, so it never overlaps page content). A subtle
          pulse/flash keeps it discoverable without shouting. */}
      <button onClick={() => askCoach()} aria-label="Ask your AI Coach"
        className="group relative hidden shrink-0 items-center gap-1.5 overflow-visible rounded-lg bg-gradient-hero px-3 py-2 text-[12px] font-[800] text-white shadow-card transition-transform active:scale-95 desktop:flex">
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-lg bg-teal/40 animate-coach-pulse" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-shimmer rounded-lg bg-white/25 blur-md" />
        <CoachIcon size={16} className="relative" /> <span className="relative">Ask Coach</span>
      </button>

      {/* User name + role (desktop) */}
      <Link href="/settings/profile" className="hidden items-center gap-2 rounded-lg px-2 py-1 hover:bg-bdrbg desktop:flex">
        <Avatar src={user?.avatar_url ?? null} name={user?.name ?? ''} size={30} />
        <div className="leading-tight">
          <div className="text-[12px] font-[700] text-dark-text">{user?.name ?? ''}</div>
          <div className="text-[10px] capitalize text-gray">{user?.role}</div>
        </div>
      </Link>

      <Link href="/settings" aria-label="Settings" className="hidden h-9 w-9 items-center justify-center rounded-lg text-gray hover:bg-bdrbg hover:text-navy desktop:flex">
        <SettingsIcon size={19} />
      </Link>

      <Link href="/notifications" data-tour="nav-bell" aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray hover:bg-bdrbg hover:text-navy">
        <Bell size={20} className={unreadCount > 0 ? 'text-navy animate-ring' : ''} />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[9px] font-[800] text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </Link>

      {/* Avatar → settings (mobile) */}
      <Link href="/settings" aria-label="Settings & profile" className="desktop:hidden">
        <Avatar src={user?.avatar_url ?? null} name={user?.name ?? ''} size={30} />
      </Link>
    </header>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOTTOM NAV (mobile)
// ═══════════════════════════════════════════════════════════════════════════════

export function BottomNav({ user }: { user?: User | null; unreadCount?: number }) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const { canView } = usePermissions()

  const role = user?.role ?? 'rep'
  const isManager = ['manager', 'owner'].includes(role)
  const allowed = (item: NavItem) => { const f = featureForHref(item.href); return !f || canView(f) }
  const inBottom = (href: string) => BOTTOM_NAV.some(b => b.href === href)
  // Everything not on the bar (Settings + Notifications live in the header now).
  const moreItems: NavItem[] = [
    ...TOP_NAV.filter(i => !inBottom(i.href)),
    ...REP_SECTIONS.flatMap(s => s.items).filter(allowed).filter(i => !inBottom(i.href)),
    ...(isManager ? MANAGER_ITEMS.filter(allowed) : []),
  ]
  const moreActive = moreItems.some(i => matchNav(pathname, i))

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-nav desktop:hidden" aria-modal="true" role="dialog">
          <button aria-label="Close menu" onClick={() => setMoreOpen(false)} className="absolute inset-0 bg-dark-text/40" />
          <div className="absolute bottom-[60px] left-0 right-0 max-h-[70vh] overflow-y-auto rounded-t-2xl border-t border-border bg-card p-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-modal">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border" />
            <div className="grid grid-cols-4 gap-1">
              {moreItems.map(item => {
                const isActive = matchNav(pathname, item)
                const Icon = item.icon
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)}
                    className={cn('flex flex-col items-center justify-center gap-1 rounded-lg px-1 py-3 text-center', isActive ? 'bg-teal/8 text-teal' : 'text-mid-text hover:bg-bdrbg')}
                    aria-current={isActive ? 'page' : undefined}>
                    <Icon size={22} />
                    <span className="text-[10px] font-[700] leading-tight">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <nav className={cn('fixed bottom-0 left-0 right-0 z-nav bg-card border-t border-border flex items-center justify-around px-2 pb-safe pt-1 h-[60px] pb-[max(8px,env(safe-area-inset-bottom))] desktop:hidden')} aria-label="Main navigation">
        {BOTTOM_NAV.map(item => {
          const isActive = matchNav(pathname, item)
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)}
              className={cn('flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-3 rounded-lg transition-colors duration-[150ms]', isActive ? 'text-teal' : 'text-gray hover:text-navy')}
              aria-current={isActive ? 'page' : undefined}>
              <Icon size={22} className={cn('transition-transform duration-200', isActive && 'scale-110')} />
              <span className={cn('text-[10px] font-[700] uppercase tracking-[0.05em]', isActive ? 'text-teal' : 'text-gray')}>{item.shortLabel ?? item.label}</span>
              {isActive && <span className="absolute -bottom-0.5 h-1 w-1 animate-pop rounded-full bg-teal" />}
            </Link>
          )
        })}
        <button onClick={() => setMoreOpen(o => !o)} aria-label="More" aria-expanded={moreOpen}
          className={cn('flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-3 rounded-lg transition-colors duration-[150ms]', moreOpen || moreActive ? 'text-teal' : 'text-gray hover:text-navy')}>
          <MoreIcon size={22} />
          <span className={cn('text-[10px] font-[700] uppercase tracking-[0.05em]', moreOpen || moreActive ? 'text-teal' : 'text-gray')}>More</span>
        </button>
      </nav>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR (desktop) — accordion sections
// ═══════════════════════════════════════════════════════════════════════════════

export function Sidebar({ user }: { user?: User | null; unreadCount?: number }) {
  const pathname = usePathname()
  const role = user?.role ?? 'rep'
  const isManager = ['manager', 'owner'].includes(role)
  const { canView } = usePermissions()
  const allowed = (item: NavItem) => { const f = featureForHref(item.href); return !f || canView(f) }

  const sections = [
    ...REP_SECTIONS.map(s => ({ title: s.title, items: s.items.filter(allowed) })),
    ...(isManager ? [{ title: 'Manager', items: MANAGER_ITEMS.filter(allowed) }] : []),
  ].filter(s => s.items.length > 0)

  // Accordion: one open at a time; default collapsed but auto-open the section
  // that contains the current route so the active page is always visible.
  const sectionOf = (path: string) => sections.find(s => s.items.some(i => matchNav(path, i)))?.title ?? null
  const [open, setOpen] = useState<string | null>(null)
  useEffect(() => { const s = sectionOf(pathname); if (s) setOpen(s) }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <aside className={cn('fixed left-0 top-0 bottom-0 z-sidebar w-[240px] bg-card border-r border-border flex flex-col hidden desktop:flex')}>
      <div className="px-4 py-4 border-b border-border">
        <Link href="/home" aria-label="Apex home" className="flex items-center transition-transform active:scale-[0.98]">
          <ApexLogo size={40} />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-3 px-3">
        {/* Always-visible quick destinations */}
        <div className="space-y-0.5">
          {TOP_NAV.map(item => <SidebarItem key={item.href} item={item} pathname={pathname} />)}
        </div>

        {/* Accordion sections */}
        <div className="mt-3 space-y-1">
          {sections.map(s => {
            const isOpen = open === s.title
            const hasActive = s.items.some(i => matchNav(pathname, i))
            return (
              <div key={s.title}>
                <button onClick={() => setOpen(o => o === s.title ? null : s.title)} aria-expanded={isOpen}
                  className={cn('flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors',
                    hasActive ? 'text-navy' : 'text-mid-text hover:bg-bdrbg')}>
                  <span className="flex-1 text-[11px] font-[800] uppercase tracking-[0.08em]">{s.title}</span>
                  {hasActive && !isOpen && <span className="h-1.5 w-1.5 rounded-full bg-teal" />}
                  <ChevronDownIcon size={15} className={cn('text-gray transition-transform', isOpen && 'rotate-180')} />
                </button>
                {isOpen && (
                  <div className="mt-0.5 space-y-0.5">
                    {s.items.map(item => <SidebarItem key={item.href} item={item} pathname={pathname} />)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </aside>
  )
}

function SidebarItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon
  const isActive = matchNav(pathname, item)
  return (
    <Link href={item.href}
      className={cn('relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-lg min-h-[42px] w-full text-[14px] font-[600] transition-all duration-[150ms]',
        isActive ? 'bg-teal/8 text-teal font-[700]' : 'text-mid-text hover:bg-bdrbg hover:text-navy')}
      aria-current={isActive ? 'page' : undefined}>
      {/* Active indicator: pinned to the far-left edge so it never touches the
          icon, with a subtle live "bob" that echoes the notification bell. */}
      <div className={cn('absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-teal transition-opacity duration-200',
        isActive ? 'opacity-100 animate-tab-bob' : 'opacity-0')} />
      <Icon size={18} />
      <span className="flex-1">{item.label}</span>
    </Link>
  )
}
