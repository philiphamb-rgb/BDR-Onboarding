'use client'

// The Plan workspace switcher — one tool, three views following the real flow:
// Capture (Notes) → Organize (Tasks) → Schedule (Time Blocks). Rendered at the
// top of each of the three pages so they read as one cohesive workspace rather
// than three separate tabs.
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { DocumentIcon, ChecklistIcon, ClockIcon } from '@/components/icons'

const PLAN_VIEWS = [
  { href: '/notes', label: 'Capture', icon: DocumentIcon },
  { href: '/tasks', label: 'Organize', icon: ChecklistIcon },
  { href: '/schedule', label: 'Schedule', icon: ClockIcon },
]

export function PlanTabs() {
  const pathname = usePathname()
  return (
    <div data-tour="plan-tabs" className="flex gap-1 rounded-xl bg-bdrbg p-1" role="tablist" aria-label="Plan workspace">
      {PLAN_VIEWS.map(v => {
        const active = pathname === v.href || pathname.startsWith(v.href + '/')
        const Icon = v.icon
        return (
          <Link key={v.href} href={v.href} role="tab" aria-selected={active}
            className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-[700] transition-all',
              active ? 'bg-card text-navy shadow-sm' : 'text-gray hover:text-navy')}>
            <Icon size={15} /> <span>{v.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
