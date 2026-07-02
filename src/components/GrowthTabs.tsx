'use client'

// The Apex switcher — one destination, five views: Overview (where you stand),
// Pipeline, Lead Gen, Automations, AI Team, and Build. On desktop these views
// now live in the left sidebar's expandable "Agentic CRM" group instead (see
// components/nav — GrowthNavGroup), so this only renders on mobile, where
// there's no sidebar to hold them. Analytics, Content, and Commissions are
// standalone top-level tabs now (not nested here) — Agentic CRM stays focused
// on the pipeline + the AI agent workforce that feeds it.
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/components/usePermissions'
import { DashboardIcon, TargetIcon, LightningIcon, IntegrationIcon, ChecklistIcon, HandshakeIcon } from '@/components/icons'

const GROWTH_VIEWS = [
  { href: '/grow',            label: 'Overview',    icon: DashboardIcon,   feature: 'growth' },
  { href: '/partners',        label: 'Pipeline',    icon: HandshakeIcon,   feature: 'partners' },
  { href: '/grow/leadgen',    label: 'Lead Gen',    icon: TargetIcon,      feature: 'growth' },
  { href: '/grow/automations',label: 'Automations', icon: LightningIcon,   feature: 'growth' },
  { href: '/grow/team',       label: 'AI Team',     icon: IntegrationIcon, feature: 'growth' },
  // Build is hard-locked to Admin/Manager — hidden entirely from standard users.
  { href: '/grow/build',      label: 'Build',       icon: ChecklistIcon,   feature: 'growth_build', lock: true },
]

export function GrowthTabs() {
  const pathname = usePathname()
  const { canView, ready } = usePermissions()
  // All CRM sub-views are rep-scope and always shown; only the locked Build tab
  // is gated, and hidden until perms resolve so it never flashes to a rep.
  const views = GROWTH_VIEWS.filter(v => !v.lock || (ready && canView(v.feature)))
  return (
    <div className="no-print flex gap-1 overflow-x-auto rounded-xl bg-bdrbg p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden desktop:hidden" role="tablist" aria-label="Agentic CRM">
      {views.map(v => {
        const active = v.href === '/grow' ? pathname === '/grow' : (pathname === v.href || pathname.startsWith(v.href + '/'))
        const Icon = v.icon
        return (
          <Link key={v.href} href={v.href} role="tab" aria-selected={active}
            className={cn('flex flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[12.5px] font-[700] transition-all',
              active ? 'bg-card text-navy-ink shadow-sm' : 'text-gray hover:text-navy-ink')}>
            <Icon size={15} /> <span>{v.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
