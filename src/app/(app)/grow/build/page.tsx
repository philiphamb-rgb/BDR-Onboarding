// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'

// Apex — Build Phases. The 8-phase roadmap to stand up the Co-Brand PLUS+
// partner-growth system, with per-task hours + tool, per-phase "what you'll
// have" and deliverables. Task completion persists per-user in module_progress;
// every task + phase has an "AI Help" that hands the exact context to the coach.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Skeleton, ProgressBar } from '@/components/ui'
import { GrowthTabs } from '@/components/GrowthTabs'
import { GrowthChrome } from '@/components/growth/GrowthChrome'
import { CheckIcon, ChevronDownIcon, ClockIcon, ChecklistIcon, LightningIcon, ArrowRightIcon, IntegrationIcon, LockIcon } from '@/components/icons'
import { useModuleKV } from '@/lib/hooks/useModuleKV'
import { usePermissions } from '@/components/usePermissions'
import { NoteButton } from '@/components/growth/NoteButton'
import { PHASES, PHASE_TONE, buildProgress, TOTAL_HOURS } from '@/lib/modules/growth-os/phases'
import { askCoach } from '@/lib/coachBus'
import { cn } from '@/lib/utils'

export default function GrowthBuildPage() {
  const router = useRouter()
  const { canView, ready } = usePermissions()
  const { loading, value, save } = useModuleKV('growth_build', { done: [] })
  const [open, setOpen] = useState<string | null>(null)
  const done = new Set(value.done || [])
  const bp = buildProgress(value.done || [])

  // Hard lock: the Build tab is Admin/Manager only. While perms resolve, show a
  // neutral skeleton — never the roadmap — so a rep hitting the URL directly
  // doesn't even glimpse the build mechanics before the guard engages.
  if (!ready) {
    return (
      <div className="space-y-4 stagger-rise">
        <GrowthChrome />
        <GrowthTabs />
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      </div>
    )
  }
  if (!canView('growth_build')) {
    return (
      <div className="space-y-4 stagger-rise">
        <GrowthChrome />
        <GrowthTabs />
        <Card className="!py-12 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-bdrbg text-gray"><LockIcon size={22} /></span>
          <h2 className="text-[16px] font-[800] text-dark-text">Build is manager-only</h2>
          <p className="mx-auto mt-1 max-w-xs text-[13px] leading-relaxed text-gray">Standing up the AI team + growth system is restricted to Admins and Managers. Ask your team lead if you need access.</p>
          <button onClick={() => router.push('/grow')} className="mt-4 rounded-lg bg-navy px-4 py-2 text-[13px] font-[700] text-white">Back to Agentic CRM</button>
        </Card>
      </div>
    )
  }

  const toggle = (id: string) => save(p => {
    const s = new Set(p.done || [])
    s.has(id) ? s.delete(id) : s.add(id)
    return { done: [...s] }
  })

  return (
    <div className="space-y-4 stagger-rise">
      <GrowthChrome />
      <GrowthTabs />

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : (
        <>
          {/* Roadmap totals */}
          <Card className="bg-gradient-hero !p-4 text-white">
            <div className="mb-2 flex items-end justify-between">
              <span className="text-[12px] font-[700] text-white/75">BUILD PROGRESS</span>
              <span className="text-[12px] font-[800] tabular-nums">{bp.complete}/{bp.total} tasks</span>
            </div>
            <div className="text-[26px] font-[900] leading-none">{bp.pct}%</div>
            <ProgressBar value={bp.pct} max={100} color="#5EEAD4" className="mt-2 h-2 !bg-white/20" />
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div><div className="text-[16px] font-[900] tabular-nums">{TOTAL_HOURS}h</div><div className="text-[10px] text-white/70">total build time</div></div>
              <div><div className="text-[16px] font-[900] tabular-nums">{bp.remainDays}d</div><div className="text-[10px] text-white/70">left at 6 focused hrs/day</div></div>
              <div><div className="text-[16px] font-[900] tabular-nums">{PHASES.length}</div><div className="text-[10px] text-white/70">phases</div></div>
            </div>
          </Card>

          {/* Mini-map */}
          <Card className="!p-4">
            <div className="mb-2 text-[10px] font-[800] uppercase tracking-wide text-gray">Build map</div>
            <div className="flex gap-1.5">
              {PHASES.map(ph => {
                const t = ph.tasks.filter(x => done.has(x.id)).length
                const pct = Math.round((t / ph.tasks.length) * 100)
                const tone = PHASE_TONE[ph.tone]
                return (
                  <button key={ph.n} onClick={() => setOpen(open === ph.n ? null : ph.n)} title={`Phase ${ph.n}: ${ph.name} (${pct}%)`} className="flex-1">
                    <div className={cn('h-1.5 rounded-full transition-all', pct === 100 ? tone.bg.replace('/12', '').replace('/10', '').replace('/8', '') + ' ' + tone.text : pct > 0 ? tone.bg : 'bg-border')} style={pct === 100 ? { background: 'currentColor' } : undefined} />
                    <div className={cn('mt-1 text-center text-[9px] font-[700]', pct > 0 ? tone.text : 'text-gray')}>{ph.n}</div>
                  </button>
                )
              })}
            </div>
          </Card>

          {/* Phases */}
          <div className="space-y-2">
            {PHASES.map(ph => {
              const t = ph.tasks.filter(x => done.has(x.id)).length
              const pct = Math.round((t / ph.tasks.length) * 100)
              const isOpen = open === ph.n
              const tone = PHASE_TONE[ph.tone]
              const phaseHrs = ph.tasks.reduce((s, x) => s + x.hrs, 0)
              return (
                <Card key={ph.n} className={cn('overflow-hidden !p-0', isOpen && `border ${tone.ring}`)}>
                  <button onClick={() => setOpen(isOpen ? null : ph.n)} className="flex w-full items-center gap-3 p-3.5 text-left">
                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[12px] font-[900]', pct === 100 ? 'bg-teal text-white' : cn(tone.bg, tone.text))}>
                      {pct === 100 ? <CheckIcon size={15} /> : ph.n}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-[800] text-dark-text">Phase {ph.n} — {ph.name}</div>
                      <div className="text-[11px] text-gray">{phaseHrs}h estimated · {ph.estDays}d</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-border"><div className={cn('h-full rounded-full', tone.text)} style={{ width: `${pct}%`, background: 'currentColor' }} /></div>
                      <span className={cn('w-8 text-right text-[12px] font-[800] tabular-nums', tone.text)}>{pct}%</span>
                      <ChevronDownIcon size={15} className={cn('text-gray transition-transform', isOpen && 'rotate-180')} />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4">
                      <div className={cn('mb-3 flex gap-2 rounded-xl p-3', tone.bg)}>
                        <LightningIcon size={14} className={cn('mt-0.5 shrink-0', tone.text)} />
                        <p className="text-[12px] leading-relaxed text-mid-text"><span className={cn('font-[800]', tone.text)}>What you'll have: </span>{ph.whatYouGet}</p>
                      </div>

                      <div className="mb-3">
                        {ph.tasks.map((task, i) => {
                          const d = done.has(task.id)
                          return (
                            <div key={task.id} className={cn('flex items-center gap-2.5 py-2', i < ph.tasks.length - 1 && 'border-b border-border')}>
                              <button onClick={() => toggle(task.id)} aria-label={d ? 'Mark incomplete' : 'Mark complete'} style={{ minHeight: 18 }}
                                className={cn('flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border-[1.5px] transition-colors', d ? 'border-teal bg-teal text-white' : 'border-gray/40 text-transparent hover:border-teal')}>
                                <CheckIcon size={11} />
                              </button>
                              <span onClick={() => toggle(task.id)} className={cn('flex-1 cursor-pointer text-[12.5px]', d ? 'text-gray line-through' : 'text-mid-text')}>{task.t}</span>
                              <span className="hidden shrink-0 rounded-md border border-border bg-bdrbg px-1.5 py-0.5 text-[10px] text-gray sm:inline"><ClockIcon size={9} className="mr-0.5 inline" />{task.hrs}h · {task.tool}</span>
                              <NoteButton compact entityType="phase-task" entityId={task.id} label={task.t} context={`Phase ${ph.n} ${ph.name}, ${task.hrs}h via ${task.tool}`} />
                              <button onClick={() => askCoach(`Help me complete this task for my ConsumerDirect Co-Brand PLUS+ Apex build, Phase ${ph.n} (${ph.name}): "${task.t}". Estimated ${task.hrs}h using ${task.tool}. Give a step-by-step plan with specific, ready-to-use output.`)}
                                className="flex shrink-0 items-center gap-1 rounded-md border border-border bg-bdrbg px-2 py-1 text-[10px] font-[600] text-gray hover:text-navy-ink">
                                <IntegrationIcon size={9} /> AI Help
                              </button>
                            </div>
                          )
                        })}
                      </div>

                      <div className="mb-3 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-[800] uppercase tracking-wide text-gray">Deliverables:</span>
                        {ph.del.map(d => <span key={d} className={cn('rounded-md px-2 py-0.5 text-[11px] font-[600]', tone.bg, tone.text)}>{d}</span>)}
                        <div className="ml-auto"><NoteButton entityType="phase" entityId={ph.n} label={`Phase ${ph.n} — ${ph.name}`} context={ph.whatYouGet} /></div>
                      </div>

                      <button onClick={() => askCoach(`I'm working on Phase ${ph.n} (${ph.name}) of my ConsumerDirect Co-Brand PLUS+ Apex build. Help me produce the key deliverables: ${ph.del.join(', ')}. Start with the most important one and give a complete, ready-to-use output.`)}
                        className={cn('flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-[12px] font-[700]', tone.bg, tone.text)}>
                        <span>Generate Phase {ph.n} deliverables with AI</span><ArrowRightIcon size={13} />
                      </button>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
