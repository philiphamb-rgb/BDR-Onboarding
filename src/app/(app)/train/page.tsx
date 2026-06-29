// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, Badge, ProgressBar, Skeleton } from '@/components/ui'
import {
  ArrowRightIcon, XpIcon, SuccessIcon, BookIcon,
  HubspotIcon, ChartRisingIcon, PipelineIcon, TeamIcon, DocumentSignIcon,
  HubIcon, CoinIcon, PhoneIcon, ChecklistIcon, IntegrationIcon,
  ProductsIcon, OrgChartIcon, TargetIcon, LockIcon, SearchIcon, CloseIcon,
} from '@/components/icons'
import { cn, percentage } from '@/lib/utils'
import Link from 'next/link'

interface ModuleRow {
  id: string; title: string; subtitle: string | null; order_index: number; xp_quiz: number; is_published: boolean;
  lessons: { id: string }[]
}

const MODULE_ICONS: Record<number, React.ComponentType<{ size?: number; className?: string }>> = {
  1: HubspotIcon, 2: ChartRisingIcon, 3: PipelineIcon, 4: TeamIcon, 5: DocumentSignIcon,
  6: HubIcon, 7: CoinIcon, 8: PhoneIcon, 9: ChecklistIcon, 10: IntegrationIcon,
  11: ProductsIcon, 12: OrgChartIcon, 13: TargetIcon,
}

export default function TrainPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string>()
  const [modules, setModules] = useState<(ModuleRow & { lessons_count: number; completed_lessons: number; quiz_passed: boolean })[]>([])
  const [allLessons, setAllLessons] = useState<{ id: string; title: string; module_id: string }[]>([])
  const [isManager, setIsManager] = useState(false)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUserId(user.id); fetchModules(user.id) }
    })
  }, [])

  const fetchModules = async (uid: string) => {
    setLoading(true)
    const [{ data: mods }, { data: prog }, { data: quizAttempts }, { data: me }, { data: lessonList }] = await Promise.all([
      supabase.from('modules').select('id, title, subtitle, order_index, xp_quiz, is_published, lessons(id)').eq('is_published', true).order('order_index'),
      supabase.from('user_progress').select('completed_lessons').eq('user_id', uid).single(),
      supabase.from('quiz_attempts').select('module_id, percentage').eq('user_id', uid),
      supabase.from('users').select('role').eq('id', uid).single(),
      supabase.from('lessons').select('id, title, module_id').eq('is_published', true).order('order_index'),
    ])
    setIsManager(['manager', 'owner'].includes(me?.role ?? 'rep'))
    setAllLessons(lessonList ?? [])

    const completedIds = new Set<string>(prog?.completed_lessons ?? [])
    const passedModules = new Set<string>(
      (quizAttempts ?? []).filter(a => (a.percentage ?? 0) >= 70).map(a => a.module_id)
    )

    setModules((mods ?? []).map(m => {
      const lessonIds = (m.lessons as { id: string }[]).map(l => l.id)
      const done = lessonIds.filter(id => completedIds.has(id)).length
      return {
        ...m,
        lessons_count: lessonIds.length,
        completed_lessons: done,
        quiz_passed: passedModules.has(m.id),
      }
    }))
    setLoading(false)
  }

  const completedModules = modules.filter(m => m.completed_lessons === m.lessons_count && m.quiz_passed).length

  // Search across all lessons + module titles, respecting gating for reps.
  const moduleMeta: Record<string, { order: number; title: string; unlocked: boolean }> = {}
  modules.forEach((m, idx) => {
    const prev = idx > 0 ? modules[idx - 1] : null
    const prevDone = prev ? (prev.completed_lessons === prev.lessons_count && prev.quiz_passed) : true
    moduleMeta[m.id] = { order: m.order_index, title: m.title, unlocked: isManager || idx === 0 || prevDone }
  })
  const q = query.trim().toLowerCase()
  const lessonResults = q ? allLessons.filter(l => l.title.toLowerCase().includes(q) && moduleMeta[l.module_id]?.unlocked) : []
  const moduleResults = q ? modules.filter(m => m.title.toLowerCase().includes(q) && moduleMeta[m.id]?.unlocked) : []
  const hasResults = lessonResults.length > 0 || moduleResults.length > 0

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-10 rounded-xl" />
      {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
    </div>
  )

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-h1 text-dark-text">Learning Center</h1>
        <p className="text-sm text-gray">{completedModules} of {modules.length} modules complete</p>
      </div>

      {/* Search across all lessons */}
      <div className="relative">
        <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search lessons — e.g. order form, objection, PartnerHub…"
          className="w-full rounded-pill border border-border bg-card py-2.5 pl-9 pr-9 text-sm text-dark-text shadow-card focus:outline-none focus:ring-2 focus:ring-teal"
        />
        {query && (
          <button onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray hover:text-dark-text">
            <CloseIcon size={16} />
          </button>
        )}
      </div>

      {/* Search results */}
      {q ? (
        <div className="space-y-2">
          {!hasResults ? (
            <Card className="text-center !py-8">
              <p className="text-sm text-gray">No lessons match "<span className="font-[700] text-dark-text">{query}</span>".</p>
            </Card>
          ) : (
            <>
              {moduleResults.map(m => (
                <Link key={`m-${m.id}`} href={`/train/${m.id}`} className="block">
                  <Card className="flex items-center gap-3 !p-3 hover:border-teal transition-colors">
                    <BookIcon size={18} className="text-navy shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-[700] text-dark-text truncate">{m.title}</div>
                      <div className="text-[11px] text-gray">Module {m.order_index} · whole module</div>
                    </div>
                    <ArrowRightIcon size={16} className="text-gray shrink-0" />
                  </Card>
                </Link>
              ))}
              {lessonResults.map(l => (
                <Link key={`l-${l.id}`} href={`/train/${l.module_id}/${l.id}`} className="block">
                  <Card className="flex items-center gap-3 !p-3 hover:border-teal transition-colors">
                    <ChecklistIcon size={18} className="text-teal shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-[600] text-dark-text truncate">{l.title}</div>
                      <div className="text-[11px] text-gray truncate">Module {moduleMeta[l.module_id]?.order} · {moduleMeta[l.module_id]?.title}</div>
                    </div>
                    <ArrowRightIcon size={16} className="text-gray shrink-0" />
                  </Card>
                </Link>
              ))}
            </>
          )}
        </div>
      ) : (
      <>
      <Card className="bg-gradient-primary !p-4">
        <div className="text-white/70 text-xs font-medium mb-1">OVERALL PROGRESS</div>
        <div className="flex items-end justify-between mb-3">
          <div className="text-2xl font-bold text-white">{completedModules}/{modules.length}</div>
        </div>
        <ProgressBar value={percentage(completedModules, modules.length)} max={100} color="#00C2B2" className="h-2" />
      </Card>

      <div className="space-y-3">
        {modules.map((mod, idx) => {
          const pct = mod.lessons_count > 0 ? percentage(mod.completed_lessons, mod.lessons_count) : 0
          const allLessonsDone = mod.completed_lessons === mod.lessons_count && mod.lessons_count > 0
          const fullyDone = allLessonsDone && mod.quiz_passed
          const prev = idx > 0 ? modules[idx - 1] : null
          const prevDone = prev ? (prev.completed_lessons === prev.lessons_count && prev.quiz_passed) : true
          const locked = !isManager && idx > 0 && !prevDone

          const Icon = locked ? LockIcon : fullyDone ? SuccessIcon : (MODULE_ICONS[mod.order_index] ?? BookIcon)
          const card = (
            <Card variant={fullyDone ? 'completed' : 'default'} className={cn(locked && 'opacity-70')}>
              <div className="flex items-start gap-4">
                <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0',
                  locked ? 'bg-bdrbg' : fullyDone ? 'bg-teal/10' : 'bg-navy/5')}>
                  <Icon size={locked ? 20 : 24} className={locked ? 'text-gray' : fullyDone ? 'text-teal' : 'text-navy'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <div className="text-xs text-gray font-medium">Module {mod.order_index}</div>
                      <h3 className={cn('text-sm font-semibold leading-tight', locked ? 'text-gray' : 'text-dark-text')}>{mod.title}</h3>
                    </div>
                    {locked
                      ? <LockIcon size={15} className="text-border flex-shrink-0 mt-1" />
                      : <ArrowRightIcon className="w-4 h-4 text-gray flex-shrink-0 mt-1" />}
                  </div>
                  {locked ? (
                    <div className="text-xs text-gray flex items-center gap-1"><LockIcon size={12} />Pass Module {prev?.order_index} quiz to unlock</div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray">{mod.completed_lessons}/{mod.lessons_count} lessons{mod.quiz_passed ? ' · Quiz passed' : ''}</span>
                        <span className="text-xs text-gray flex items-center gap-0.5"><XpIcon className="w-3 h-3 text-gold" />+{mod.xp_quiz} XP</span>
                      </div>
                      {mod.lessons_count > 0 && (
                        <ProgressBar value={pct} max={100} color={fullyDone ? '#00C2B2' : '#003087'} className="h-1.5" />
                      )}
                    </>
                  )}
                </div>
              </div>
            </Card>
          )
          return locked
            ? <div key={mod.id} aria-disabled className="block">{card}</div>
            : <Link key={mod.id} href={`/train/${mod.id}`} className="block active:scale-[0.98] transition-transform">{card}</Link>
        })}
      </div>
      </>
      )}
    </div>
  )
}
