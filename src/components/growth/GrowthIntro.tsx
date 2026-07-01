// @ts-nocheck
'use client'

// First-run orientation for Apex — kills the "where do I even start" moment.
// A single, dismissible card that maps each tab to a plain-English purpose and
// points at the one next step. Progressive disclosure: the per-tab legend is
// tucked behind "What's what" so the default view stays calm. Dismissal persists
// per-user; re-openable any time from the chrome.

import { useState } from 'react'
import { useModuleKV } from '@/lib/hooks/useModuleKV'
import { GrowIcon, DashboardIcon, EditIcon, TargetIcon, LightningIcon, IntegrationIcon, ChecklistIcon, ChevronDownIcon, CloseIcon, ArrowRightIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

const LEGEND = [
  { icon: DashboardIcon, label: 'Overview', what: 'Where you stand + your top moves today. Start here.' },
  { icon: EditIcon, label: 'Content', what: 'Exactly what to publish to attract partners, ranked by value.' },
  { icon: TargetIcon, label: 'Lead Gen', what: 'Your real pipeline, scored and routed, with one-tap outreach.' },
  { icon: LightningIcon, label: 'Automations', what: 'The workflows your AI team runs — with ROI and settings.' },
  { icon: IntegrationIcon, label: 'AI Team', what: 'All 18 agents, each with its ready-to-use system prompt.' },
  { icon: ChecklistIcon, label: 'Build', what: 'The step-by-step plan to stand the whole system up. (Managers)' },
]

export function GrowthIntro() {
  const { loading, value, save } = useModuleKV('growth_intro', { seen: false })
  const [showLegend, setShowLegend] = useState(false)
  if (loading || value.seen) return null

  return (
    <div className="relative overflow-hidden rounded-2xl border border-teal/25 bg-teal/[0.05] p-4 stagger-rise">
      <button onClick={() => save({ seen: true })} aria-label="Dismiss guide" className="absolute right-3 top-3 text-gray hover:text-dark-text"><CloseIcon size={16} /></button>
      <div className="flex items-start gap-3 pr-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-hero text-white"><GrowIcon size={20} /></span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-[900] text-dark-text">Welcome to your growth engine</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-mid-text">
            Six views, one job: sign more partners with less manual work. You don&rsquo;t need to learn all of it — the strip below always tells you the single highest-value move. <span className="font-[700] text-dark-text">Start there.</span>
          </p>
        </div>
      </div>

      <div className="mt-3">
        <button onClick={() => setShowLegend(v => !v)} className="flex items-center gap-1.5 text-[12px] font-[800] text-teal">
          What&rsquo;s what <ChevronDownIcon size={13} className={cn('transition-transform', showLegend && 'rotate-180')} />
        </button>
        {showLegend && (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {LEGEND.map(l => {
              const Icon = l.icon
              return (
                <div key={l.label} className="flex items-start gap-2 rounded-xl border border-border bg-card p-2.5">
                  <Icon size={15} className="mt-0.5 shrink-0 text-navy" />
                  <div className="min-w-0"><div className="text-[12.5px] font-[800] text-dark-text">{l.label}</div><div className="text-[11.5px] leading-snug text-gray">{l.what}</div></div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <button onClick={() => save({ seen: true })} className="mt-3 flex items-center gap-1.5 rounded-lg bg-navy px-3.5 py-2 text-[12.5px] font-[800] text-white">
        Got it — show me my plan <ArrowRightIcon size={14} />
      </button>
    </div>
  )
}
