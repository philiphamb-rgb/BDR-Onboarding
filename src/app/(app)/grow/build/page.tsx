// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'

// Growth OS — Build Phases. The guided roadmap to stand up your growth system.
// Steps that the app can verify from real data auto-complete (goals set, leads
// tagged, agents live); the rest are manual checks persisted to module_progress.
// Every step deep-links into the real screen where the work happens.

import Link from 'next/link'
import { Card, Skeleton, ProgressBar } from '@/components/ui'
import { GrowthTabs } from '@/components/GrowthTabs'
import { GrowIcon, CheckIcon, ArrowRightIcon, LightningIcon, SuccessIcon } from '@/components/icons'
import { useGrowthOS } from '@/lib/hooks/useGrowthOS'
import { useModuleKV } from '@/lib/hooks/useModuleKV'
import { askCoach } from '@/lib/coachBus'
import { cn } from '@/lib/utils'

// Phase plan. `auto(ctx)` → the app verifies it; otherwise it's a manual check.
const PHASES = [
  { key: 'foundations', title: 'Foundations', blurb: 'Point the engine at a number.', steps: [
    { id: 'goals', label: 'Set your growth goals', hint: 'Leads/week + close rate', href: '/grow', auto: c => (c.goals.leads_per_week_goal || 0) > 0 || (Number(c.goals.close_rate_goal) || 0) > 0 },
    { id: 'income', label: 'Build your income plan', hint: 'Commission Planner sets your deal goal', href: '/commissions', auto: c => (c.goals.monthly_deal_goal || 0) > 0 },
    { id: 'pipeline', label: 'Load your pipeline', hint: 'At least 5 partners tracked', href: '/partners', auto: c => c.leads.total >= 5 },
  ] },
  { key: 'funnel', title: 'Activate the funnel', blurb: 'Put your AI agents to work.', steps: [
    { id: 'funnel-live', label: 'Turn on your Funnel agents', hint: 'Lead Scorer + Hot-Lead Alert live', href: '/grow/team', auto: c => c.roster.filter(a => a.category === 'funnel' && a.status === 'live').length >= 2 },
    { id: 'tag-hot', label: 'Tag your hottest leads', hint: 'Mark a partner hot so alerts fire', href: '/partners', auto: c => c.leads.hot >= 1 },
  ] },
  { key: 'content', title: 'Content system', blurb: 'Make outreach effortless.', steps: [
    { id: 'first-draft', label: 'Generate your first outreach', hint: 'Use a Content Engine angle', href: '/grow/content' },
    { id: 'save-angles', label: 'Save your go-to angles', hint: 'Keep what works on your idea board', href: '/grow/content' },
  ] },
  { key: 'retention', title: 'Retention', blurb: 'Protect what you signed.', steps: [
    { id: 'health-live', label: 'Turn on Account Health', hint: 'Catch partners before they churn', href: '/grow/team', auto: c => c.roster.find(a => a.id === 'health')?.status === 'live' },
    { id: 'review-risk', label: 'Review your at-risk partners', hint: 'Work the cold end of your book', href: '/partners' },
  ] },
  { key: 'scale', title: 'Scale', blurb: 'Compound the system.', steps: [
    { id: 'forecast', label: 'Check your month-end forecast', hint: 'Know where the month lands', href: '/analytics' },
    { id: 'coach-plan', label: 'Get your growth plan from Coach', hint: 'Your top 3 moves, from real data', action: 'coach' },
  ] },
]

export default function GrowthBuildPage() {
  const { loading: gLoading, goals, leads, roster, liveCount } = useGrowthOS()
  const { loading: kvLoading, value, save } = useModuleKV('growth_build', { done: [] })
  const loading = gLoading || kvLoading

  const ctx = { goals, leads, roster, liveCount }
  const doneSet = new Set(value.done || [])
  const isDone = step => (step.auto ? !!step.auto(ctx) : doneSet.has(step.id))
  const toggle = step => {
    if (step.auto) return
    save(p => {
      const set = new Set(p.done || [])
      set.has(step.id) ? set.delete(step.id) : set.add(step.id)
      return { done: [...set] }
    })
  }
  // Action steps (e.g. "ask Coach") only ever complete — never un-complete on a
  // repeat tap — so re-using the action can't silently wipe the final step.
  const markDone = id => save(p => ({ done: [...new Set([...(p.done || []), id])] }))

  const allSteps = PHASES.flatMap(p => p.steps)
  const completed = loading ? 0 : allSteps.filter(isDone).length
  const pct = allSteps.length ? Math.round((completed / allSteps.length) * 100) : 0

  return (
    <div className="space-y-4 stagger-rise">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-hero text-white"><GrowIcon size={18} /></span>
        <div>
          <h1 className="text-h2 leading-tight text-dark-text">Growth OS</h1>
          <p className="text-[12px] text-gray">Your AI-powered growth engine</p>
        </div>
      </div>
      <GrowthTabs />

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : (
        <>
          <Card className="bg-gradient-hero !p-4 text-white">
            <div className="mb-1 flex items-end justify-between">
              <span className="text-[12px] font-[700] text-white/75">BUILD PROGRESS</span>
              <span className="text-[12px] font-[800] tabular-nums">{completed}/{allSteps.length} steps</span>
            </div>
            <div className="text-[26px] font-[900] leading-none">{pct}%</div>
            <ProgressBar value={pct} max={100} color="#5EEAD4" className="mt-2 h-2 !bg-white/20" />
            <p className="mt-2 text-[12px] text-white/80">{pct === 100 ? 'Your growth system is fully stood up. Now compound it. 🚀' : 'Auto-verified steps tick themselves as you do the work in the app.'}</p>
          </Card>

          {PHASES.map((phase, pi) => {
            const done = phase.steps.filter(isDone).length
            const phaseComplete = done === phase.steps.length
            return (
              <div key={phase.key}>
                <div className="mb-2 flex items-center gap-2 px-0.5">
                  <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-[900]', phaseComplete ? 'bg-teal text-white' : 'bg-navy/10 text-navy')}>
                    {phaseComplete ? <CheckIcon size={13} /> : pi + 1}
                  </span>
                  <div className="flex-1">
                    <h2 className="text-[14px] font-[800] text-dark-text leading-tight">{phase.title}</h2>
                    <p className="text-[11px] text-gray">{phase.blurb}</p>
                  </div>
                  <span className="text-[11px] font-[700] text-gray tabular-nums">{done}/{phase.steps.length}</span>
                </div>
                <div className="space-y-2">
                  {phase.steps.map(step => {
                    const done = isDone(step)
                    const Row = (
                      <div className={cn('flex items-center gap-3 rounded-2xl border bg-card p-3.5 shadow-card transition-colors',
                        done ? 'border-teal/30' : 'border-border hover:border-teal/40')}>
                        <button
                          onClick={e => { if (!step.auto && !step.action) { e.preventDefault(); toggle(step) } }}
                          aria-label={done ? 'Completed' : 'Mark complete'} style={{ minHeight: 24 }}
                          className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-[1.5px] transition-colors',
                            done ? 'border-teal bg-teal text-white' : 'border-gray/40 text-transparent', !step.auto && !step.action && !done && 'hover:border-teal')}>
                          {step.auto ? (done ? <SuccessIcon size={14} /> : null) : <CheckIcon size={14} />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className={cn('text-[13.5px] font-[700] text-dark-text', done && 'line-through opacity-70')}>{step.label}</div>
                          <div className="text-[12px] text-gray">{step.hint}{step.auto && <span className="ml-1 text-teal">· auto</span>}</div>
                        </div>
                        <ArrowRightIcon size={15} className="shrink-0 text-gray" />
                      </div>
                    )
                    if (step.action === 'coach') {
                      return <button key={step.id} onClick={() => { markDone(step.id); askCoach("Give me my Growth OS plan: based on my leads/week and close-rate goals, my pipeline by temperature, and my live AI Team, what are the top 3 moves to grow my number this week?") }} className="block w-full text-left">{Row}</button>
                    }
                    return step.href
                      ? <Link key={step.id} href={step.href} className="block">{Row}</Link>
                      : <div key={step.id}>{Row}</div>
                  })}
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
