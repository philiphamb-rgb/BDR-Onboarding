'use client'

// The Growth OS switcher — one destination, four views: Overview (where you
// stand), AI Team (your 18 automations), Content (generate outreach), and Build
// (stand up your growth system). Mirrors LearnTabs / PlanTabs so the whole app
// shares one workspace-switcher pattern.
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { DashboardIcon, IntegrationIcon, EditIcon, ChecklistIcon } from '@/components/icons'

const GROWTH_VIEWS = [
  { href: '/grow',         label: 'Overview', icon: DashboardIcon },
  { href: '/grow/team',    label: 'AI Team',  icon: IntegrationIcon },
  { href: '/grow/content', label: 'Content',  icon: EditIcon },
  { href: '/grow/build',   label: 'Build',    icon: ChecklistIcon },
]

export function GrowthTabs() {
  const pathname = usePathname()
  return (
    <div className="flex gap-1 rounded-xl bg-bdrbg p-1 no-print" role="tablist" aria-label="Growth OS">
      {GROWTH_VIEWS.map(v => {
        const active = v.href === '/grow' ? pathname === '/grow' : (pathname === v.href || pathname.startsWith(v.href + '/'))
        const Icon = v.icon
        return (
          <Link key={v.href} href={v.href} role="tab" aria-selected={active}
            className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12.5px] font-[700] transition-all',
              active ? 'bg-card text-navy shadow-sm' : 'text-gray hover:text-navy')}>
            <Icon size={15} /> <span>{v.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
