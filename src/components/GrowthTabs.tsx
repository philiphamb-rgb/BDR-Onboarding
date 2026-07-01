'use client'

// The Apex switcher — one destination, six views mirroring the agentic
// system: Overview (where you stand), Content Engine, Lead Gen, Automations, AI
// Team, and Build. Mirrors LearnTabs / PlanTabs so the whole app shares one
// workspace-switcher pattern; scrolls horizontally on narrow screens.
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/components/usePermissions'
import { DashboardIcon, EditIcon, TargetIcon, LightningIcon, IntegrationIcon, ChecklistIcon, HandshakeIcon, BarChartIcon, CoinIcon } from '@/components/icons'

// The Agentic CRM switcher. Partner pipeline, Analytics, and Commissions are
// folded in here (no longer standalone tabs) so the CRM is the single home for
// the whole revenue motion — HubSpot-style, reporting nested inside the CRM.
const GROWTH_VIEWS = [
  { href: '/grow',            label: 'Overview',    icon: DashboardIcon,   feature: 'growth' },
  { href: '/partners',        label: 'Pipeline',    icon: HandshakeIcon,   feature: 'partners' },
  { href: '/grow/leadgen',    label: 'Lead Gen',    icon: TargetIcon,      feature: 'growth' },
  { href: '/analytics',       label: 'Analytics',   icon: BarChartIcon,    feature: 'analytics' },
  { href: '/grow/content',    label: 'Content',     icon: EditIcon,        feature: 'growth' },
  { href: '/grow/automations',label: 'Automations', icon: LightningIcon,   feature: 'growth' },
  { href: '/grow/team',       label: 'AI Team',     icon: IntegrationIcon, feature: 'growth' },
  { href: '/commissions',     label: 'Commissions', icon: CoinIcon,        feature: 'commissions' },
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
    <div className="no-print flex gap-1 overflow-x-auto rounded-xl bg-bdrbg p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Agentic CRM">
      {views.map(v => {
        const active = v.href === '/grow' ? pathname === '/grow' : (pathname === v.href || pathname.startsWith(v.href + '/'))
        const Icon = v.icon
        return (
          <Link key={v.href} href={v.href} role="tab" aria-selected={active}
            className={cn('flex flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[12.5px] font-[700] transition-all',
              active ? 'bg-card text-navy shadow-sm' : 'text-gray hover:text-navy')}>
            <Icon size={15} /> <span>{v.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
