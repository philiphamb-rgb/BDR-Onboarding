'use client'

// The Growth OS switcher — one destination, six views mirroring the agentic
// system: Overview (where you stand), Content Engine, Lead Gen, Automations, AI
// Team, and Build. Mirrors LearnTabs / PlanTabs so the whole app shares one
// workspace-switcher pattern; scrolls horizontally on narrow screens.
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { DashboardIcon, EditIcon, TargetIcon, LightningIcon, IntegrationIcon, ChecklistIcon } from '@/components/icons'

const GROWTH_VIEWS = [
  { href: '/grow',            label: 'Overview',    icon: DashboardIcon },
  { href: '/grow/content',    label: 'Content',     icon: EditIcon },
  { href: '/grow/leadgen',    label: 'Lead Gen',    icon: TargetIcon },
  { href: '/grow/automations',label: 'Automations', icon: LightningIcon },
  { href: '/grow/team',       label: 'AI Team',     icon: IntegrationIcon },
  { href: '/grow/build',      label: 'Build',       icon: ChecklistIcon },
]

export function GrowthTabs() {
  const pathname = usePathname()
  return (
    <div className="no-print flex gap-1 overflow-x-auto rounded-xl bg-bdrbg p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Growth OS">
      {GROWTH_VIEWS.map(v => {
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
