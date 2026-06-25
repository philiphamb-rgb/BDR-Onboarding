'use client'

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
  GrowIcon,
} from '@/components/icons'
import type { User } from '@/types/database'
import { Avatar } from '@/components/ui'

// ─── Nav Item Definition ──────────────────────────────────────────────────────

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  managerOnly?: boolean
}

const REP_NAV: NavItem[] = [
  { href: '/home',    label: 'Home',    icon: HomeIcon  },
  { href: '/today',   label: 'Today',   icon: TodayIcon },
  { href: '/train',   label: 'Train',   icon: TrainIcon },
  { href: '/wins',    label: 'Wins',    icon: WinsIcon  },
  { href: '/coach',   label: 'Coach',   icon: CoachIcon },
]

const MANAGER_EXTRA_NAV: NavItem[] = [
  { href: '/manager/dashboard',    label: 'Dashboard',    icon: DashboardIcon,  managerOnly: true },
  { href: '/manager/team',         label: 'Team',          icon: TeamIcon,       managerOnly: true },
  { href: '/manager/analytics',    label: 'Analytics',     icon: BarChartIcon,   managerOnly: true },
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

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-nav',
        'bg-card border-t border-border',
        'flex items-center justify-around',
        'px-2 pb-safe pt-1',
        'h-[60px] pb-[max(8px,env(safe-area-inset-bottom))]'
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
              {item.label}
            </span>
            {/* Active indicator dot */}
            {isActive && (
              <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-teal" />
            )}
          </Link>
        )
      })}
    </nav>
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
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center">
            <span className="text-white font-[900] text-[14px]">B</span>
          </div>
          <div>
            <span className="text-[16px] font-[900] text-navy">BDR OS</span>
            <span className="block text-[11px] font-[700] text-gray uppercase tracking-[0.07em]">v2</span>
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
        <NavSection
          items={[
            { href: '/leaderboard', label: 'Leaderboard', icon: LeaderboardIcon },
            { href: '/grow',        label: 'Grow',         icon: GrowIcon },
          ]}
          pathname={pathname}
        />
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
