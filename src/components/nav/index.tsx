'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/components/ui'
import {
  HomeIcon,
  TodayIcon,
  TrainIcon,
  WinsIcon,
  CoachIcon,
  DashboardIcon,
  XpIcon,
  BellIcon,
  MailIcon,
  SettingsIcon,
  BellDotIcon,
  LeaderboardIcon,
  TeamIcon,
  BarChartIcon,
  BookIcon,
  TargetIcon,
  MedalIcon,
  HandshakeIcon,
  ClockIcon,
  MoreIcon,
} from '@/components/icons'
import type { User } from '@/types/database'
import { Avatar } from '@/components/ui'

// ─── Nav Item Definition ──────────────────────────────────────────────────────

interface NavItem {
  href: string
  label: string
  /** Compact label for the mobile bottom nav, where horizontal space is tight. */
  shortLabel?: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  managerOnly?: boolean
}

const REP_NAV: NavItem[] = [
  { href: '/home',    label: 'Home',    icon: HomeIcon  },
  { href: '/today',   label: 'Today',   icon: TodayIcon },
  { href: '/train',   label: 'Learning Center', shortLabel: 'Learn',   icon: TrainIcon },
  { href: '/wins',    label: 'Wins',    icon: WinsIcon  },
  { href: '/coach',   label: 'Coach',   icon: CoachIcon },
]

// Shared "Tools" routes — rendered in the desktop sidebar AND the mobile "More"
// sheet so every route is reachable on phones (the primary PWA surface).
const TOOLS_NAV: NavItem[] = [
  { href: '/partners',    label: 'Partners',        icon: HandshakeIcon },
  { href: '/analytics',   label: 'Analytics',       icon: BarChartIcon },
  { href: '/schedule',    label: 'Daily Time Management', icon: ClockIcon },
  { href: '/drill',       label: 'Objection Drill', icon: TargetIcon },
  { href: '/resources',   label: 'Resources',       icon: BookIcon },
  { href: '/leaderboard', label: 'Leaderboard',     icon: LeaderboardIcon },
  { href: '/certificate', label: 'Certificate',     icon: MedalIcon },
]

const MANAGER_EXTRA_NAV: NavItem[] = [
  { href: '/manager/dashboard',    label: 'Dashboard',    icon: DashboardIcon,  managerOnly: true },
  { href: '/manager/team',         label: 'Team',          icon: TeamIcon,       managerOnly: true },
  { href: '/manager/partners',     label: 'Team Partners', icon: HandshakeIcon,  managerOnly: true },
  { href: '/manager/rhythm',       label: 'Team Time Management', icon: ClockIcon, managerOnly: true },
  { href: '/manager/analytics',    label: 'Analytics',     icon: BarChartIcon,   managerOnly: true },
  { href: '/manager/broadcast',    label: 'Broadcast',     icon: BellIcon,       managerOnly: true },
  { href: '/manager/resources',    label: 'Resources',     icon: BookIcon,       managerOnly: true },
  { href: '/manager/invite',       label: 'Invite',        icon: MailIcon,       managerOnly: true },
  { href: '/manager/gamification', label: 'XP Rules',      icon: XpIcon,         managerOnly: true },
]

// ═══════════════════════════════════════════════════════════════════════════════
// BOTTOM NAV (mobile)
// ═══════════════════════════════════════════════════════════════════════════════

interface BottomNavProps {
  user?: User | null
  unreadCount?: number
}

export function BottomNav({ user, unreadCount = 0 }: BottomNavProps) {
  const pathname = usePathname()
  const navItems = REP_NAV
  const [moreOpen, setMoreOpen] = useState(false)

  const role = user?.role ?? 'rep'
  const isManager = ['manager', 'owner'].includes(role)
  // Everything not in the 5-slot bottom bar, so phones can reach every route.
  const moreItems: NavItem[] = [
    ...TOOLS_NAV,
    ...(isManager ? MANAGER_EXTRA_NAV : []),
    { href: '/notifications', label: 'Notifications', icon: unreadCount > 0 ? BellDotIcon : BellIcon },
    { href: '/settings', label: 'Settings', icon: SettingsIcon },
  ]
  // "More" reads as active whenever the current route lives in the sheet.
  const moreActive = moreItems.some(i => pathname === i.href || pathname.startsWith(i.href + '/'))

  return (
    <>
      {/* Slide-up "More" sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-nav desktop:hidden" aria-modal="true" role="dialog">
          <button
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-dark-text/40"
          />
          <div className="absolute bottom-[60px] left-0 right-0 rounded-t-2xl bg-card border-t border-border p-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-modal">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border" />
            <div className="grid grid-cols-4 gap-1">
              {moreItems.map(item => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1 rounded-lg px-1 py-3 text-center',
                      isActive ? 'bg-teal/8 text-teal' : 'text-mid-text hover:bg-bdrbg'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={22} />
                    <span className="text-[10px] font-[700] leading-tight">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <nav
        className={cn(
          'fixed bottom-0 left-0 right-0 z-nav',
          'bg-card border-t border-border',
          'flex items-center justify-around',
          'px-2 pb-safe pt-1',
          'h-[60px] pb-[max(8px,env(safe-area-inset-bottom))]',
          // Mobile only — desktop uses the side navigation
          'desktop:hidden'
        )}
        aria-label="Main navigation"
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMoreOpen(false)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5',
                'min-w-[44px] min-h-[44px] px-3 rounded-lg',
                'transition-colors duration-[150ms]',
                isActive ? 'text-teal' : 'text-gray hover:text-navy'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={22} />
              <span
                className={cn(
                  'text-[10px] font-[700] uppercase tracking-[0.05em]',
                  isActive ? 'text-teal' : 'text-gray'
                )}
              >
                {item.shortLabel ?? item.label}
              </span>
              {/* Active indicator dot */}
              {isActive && (
                <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-teal" />
              )}
            </Link>
          )
        })}

        {/* More — opens the sheet with every other route */}
        <button
          onClick={() => setMoreOpen(o => !o)}
          aria-label="More"
          aria-expanded={moreOpen}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5',
            'min-w-[44px] min-h-[44px] px-3 rounded-lg',
            'transition-colors duration-[150ms]',
            moreOpen || moreActive ? 'text-teal' : 'text-gray hover:text-navy'
          )}
        >
          <MoreIcon size={22} />
          <span
            className={cn(
              'text-[10px] font-[700] uppercase tracking-[0.05em]',
              moreOpen || moreActive ? 'text-teal' : 'text-gray'
            )}
          >
            More
          </span>
        </button>
      </nav>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR (desktop)
// ═══════════════════════════════════════════════════════════════════════════════

interface SidebarProps {
  user?: User | null
  unreadCount?: number
}

export function Sidebar({ user, unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const role = user?.role ?? 'rep'
  const isManager = ['manager', 'owner'].includes(role)

  const repItems = REP_NAV
  const managerItems = isManager ? MANAGER_EXTRA_NAV : []

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 bottom-0 z-sidebar',
        'w-[240px] bg-card border-r border-border',
        'flex flex-col',
        'hidden desktop:flex'
      )}
    >
      {/* Logo / Brand */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/consumerdirect-mark.svg" alt="ConsumerDirect" className="w-9 h-9 shrink-0" />
          <div className="leading-tight">
            <span className="block text-[15px] font-[900] text-navy">BDR Hub</span>
            <span className="block text-[11px] font-[700] text-gray uppercase tracking-[0.08em]">ConsumerDirect</span>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-border">
        <Link
          href="/settings/profile"
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-bdrbg transition-colors group"
        >
          <Avatar src={user?.avatar_url ?? null} name={user?.name ?? ''} size={36} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-[700] text-dark-text truncate">{user?.name ?? ''}</p>
            <p className="text-[11px] text-gray capitalize">{user?.role}</p>
          </div>
        </Link>
      </div>

      {/* Main nav */}
      <div className="flex-1 overflow-y-auto py-3 px-3">
        <NavSection items={repItems} pathname={pathname} />

        {isManager && (
          <>
            <div className="mt-4 mb-2 px-3">
              <span className="label text-[10px]">Manager</span>
            </div>
            <NavSection items={managerItems} pathname={pathname} />
          </>
        )}

        {/* Grow section */}
        <div className="mt-4 mb-2 px-3">
          <span className="label text-[10px]">Tools</span>
        </div>
        <NavSection items={TOOLS_NAV} pathname={pathname} />
      </div>

      {/* Bottom: notifications + settings */}
      <div className="border-t border-border p-3 space-y-1">
        <SidebarItem
          href="/notifications"
          label="Notifications"
          icon={unreadCount > 0 ? BellDotIcon : BellIcon}
          pathname={pathname}
          badge={unreadCount > 0 ? unreadCount : undefined}
        />
        <SidebarItem
          href="/settings"
          label="Settings"
          icon={SettingsIcon}
          pathname={pathname}
        />
      </div>
    </aside>
  )
}

// ── Sidebar nav item ──────────────────────────────────────────────────────────

function SidebarItem({
  href,
  label,
  icon: Icon,
  pathname,
  badge,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  pathname: string
  badge?: number
}) {
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg',
        'min-h-[44px] w-full',
        'text-[14px] font-[600]',
        'transition-all duration-[150ms]',
        isActive
          ? 'bg-teal/8 text-teal font-[700]'
          : 'text-mid-text hover:bg-bdrbg hover:text-navy'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {/* Left accent bar */}
      <div
        className={cn(
          'absolute left-3 w-[3px] h-5 rounded-full transition-all',
          isActive ? 'bg-teal opacity-100' : 'opacity-0'
        )}
      />
      <Icon size={18} />
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className="ml-auto flex items-center justify-center
                     min-w-[20px] h-5 px-1.5 rounded-full
                     bg-teal text-white text-[10px] font-[800]"
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
}

function NavSection({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <div className="space-y-0.5">
      {items.map(item => (
        <SidebarItem
          key={item.href}
          href={item.href}
          label={item.label}
          icon={item.icon}
          pathname={pathname}
        />
      ))}
    </div>
  )
}
