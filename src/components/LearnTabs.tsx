'use client'

// The Learning Center switcher — one destination, two views: Curriculum (what to
// learn) and Progress (how far you've come: belts, certificate, stats). Mirrors
// PlanTabs so the whole app shares one workspace-switcher pattern.
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { BookIcon, MedalIcon } from '@/components/icons'

const LEARN_VIEWS = [
  { href: '/train', label: 'Curriculum', icon: BookIcon },
  { href: '/progress', label: 'Progress', icon: MedalIcon },
]

export function LearnTabs() {
  const pathname = usePathname()
  return (
    <div className="flex gap-1 rounded-xl bg-bdrbg p-1 no-print" role="tablist" aria-label="Learning Center">
      {LEARN_VIEWS.map(v => {
        const active = pathname === v.href || pathname.startsWith(v.href + '/')
        const Icon = v.icon
        return (
          <Link key={v.href} href={v.href} role="tab" aria-selected={active}
            className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-[700] transition-all',
              active ? 'bg-card text-navy-ink shadow-sm' : 'text-gray hover:text-navy-ink')}>
            <Icon size={15} /> <span>{v.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
