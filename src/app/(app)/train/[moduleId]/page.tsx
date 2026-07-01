// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, Badge, ProgressBar, Button, SkeletonCard, EmptyState } from '@/components/ui'
import { CheckIcon, ArrowRightIcon, BackIcon, XpIcon, LockIcon, TrophyIcon, BookIcon } from '@/components/icons'
import { cn, percentage } from '@/lib/utils'
import Link from 'next/link'

interface LessonRow { id: string; title: string; order_index: number; duration_minutes: number | null; is_published: boolean }
interface ModuleRow { id: string; title: string; subtitle: string | null; order_index: number; xp_lessons: number; xp_quiz: number }

export default function ModulePage() {
  const { moduleId } = useParams<{ moduleId: string }>()
  const supabase = createClient()
  const router = useRouter()
  const [userId, setUserId] = useState<string>()
  const [module, setModule] = useState<ModuleRow | null>(null)
  const [lessons, setLessons] = useState<(LessonRow & { is_completed: boolean })[]>([])
  const [loading, setLoading] = useState(true)
  const [hasQuiz, setHasQuiz] = useState(false)
  const [quizPassed, setQuizPassed] = useState(false)
  const [isManager, setIsManager] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUserId(user.id); fetchData(user.id) }
    })
  }, [moduleId])

  const fetchData = async (uid: string) => {
    const [{ data: mod }, { data: lessonsData }, { data: attempts }, { data: questions }] = await Promise.all([
      supabase.from('modules').select('id, title, subtitle, order_index, xp_lessons, xp_quiz').eq('id', moduleId).single(),
      supabase.from('lessons').select('id, title, order_index, duration_minutes, is_published').eq('module_id', moduleId).eq('is_published', true).order('order_index'),
      supabase.from('quiz_attempts').select('module_id, percentage').eq('user_id', uid).eq('module_id', moduleId).order('attempted_at', { ascending: false }).limit(1),
      supabase.from('quiz_questions').select('id').eq('module_id', moduleId).limit(1),
    ])
    setModule(mod)
    const { data: me } = await supabase.from('users').select('role').eq('id', uid).single()
    setIsManager(['manager', 'owner'].includes(me?.role ?? 'rep'))
    // Track completed lessons via user_progress.completed_lessons array
    const { data: prog } = await supabase.from('user_progress').select('completed_lessons').eq('user_id', uid).single()
    const completedIds = new Set<string>(prog?.completed_lessons ?? [])
    setLessons((lessonsData ?? []).map(l => ({ ...l, is_completed: completedIds.has(l.id) })))
    setHasQuiz((questions?.length ?? 0) > 0)
    setQuizPassed((attempts?.[0]?.percentage ?? 0) >= 70)
    setLoading(false)
  }

  const completedCount = lessons.filter(l => l.is_completed).length
  const nextLesson = lessons.find(l => !l.is_completed)
  const allLessonsDone = lessons.length > 0 && completedCount === lessons.length
  const moduleComplete = allLessonsDone && (!hasQuiz || quizPassed)
  const perLessonXp = lessons.length ? Math.round((module?.xp_lessons ?? 0) / lessons.length) : 0

  if (loading) return <div className="space-y-4"><SkeletonCard /></div>
  if (!module) return (
    <EmptyState
      icon={<BookIcon size={28} />}
      title="Module not found"
      description="This module may have moved or isn't available yet. Head back to your Learning Center."
      action={{ label: 'Back to Learning Center', onClick: () => router.push('/train') }}
    />
  )

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray hover:text-dark-text">
        <BackIcon className="w-4 h-4" />Learning Center
      </button>

      <Card className={cn('!p-5', moduleComplete ? 'bg-gradient-hero' : 'bg-gradient-primary')}>
        <div className="flex items-center justify-between mb-1">
          <div className="text-white/70 text-xs font-medium">MODULE {module.order_index}</div>
          {moduleComplete && (
            <span className="flex items-center gap-1 text-xs font-[800] text-white bg-white/15 rounded-full px-2 py-0.5">
              <TrophyIcon size={13} className="text-gold" /> Module Complete
            </span>
          )}
        </div>
        <h1 className="text-xl font-bold text-white mb-1">{module.title}</h1>
        {module.subtitle && <p className="text-white/70 text-sm mb-3">{module.subtitle}</p>}
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/80 text-sm">{completedCount}/{lessons.length} lessons</span>
          <span className="text-white/80 text-sm flex items-center gap-1"><XpIcon className="w-4 h-4 text-gold" />+{module.xp_quiz} XP quiz</span>
        </div>
        <ProgressBar value={percentage(completedCount, lessons.length)} max={100} color="#FFFFFF" className="h-2" />
      </Card>

      {/* Primary conversion action — one at a time */}
      {nextLesson ? (
        <Link href={`/train/${moduleId}/${nextLesson.id}`}>
          <Button variant="conversion" className="w-full" size="lg">
            {completedCount === 0 ? 'Start Learning' : 'Continue Learning'}<ArrowRightIcon className="ml-2" />
          </Button>
        </Link>
      ) : hasQuiz && allLessonsDone && !quizPassed ? (
        <Link href={`/train/${moduleId}/quiz`}>
          <Button variant="conversion" className="w-full" size="lg">Take Module Quiz<ArrowRightIcon className="ml-2" /></Button>
        </Link>
      ) : lessons.length === 0 ? (
        <div className="rounded-xl border border-border bg-bdrbg px-4 py-6 text-center">
          <p className="text-[13px] font-[700] text-dark-text">No lessons published yet</p>
          <p className="mt-1 text-[12px] text-gray">This module is being built. Check back soon — you&apos;ll be able to start it here.</p>
        </div>
      ) : null}

      {/* Quiz becomes available only after ALL lessons are complete */}
      {hasQuiz && allLessonsDone && quizPassed && (
        <Link href={`/train/${moduleId}/quiz`}>
          <Button variant="ghost" className="w-full">Retake Quiz<ArrowRightIcon className="ml-2" /></Button>
        </Link>
      )}
      {hasQuiz && !allLessonsDone && (
        <div className="flex items-center justify-center gap-2 text-xs text-gray py-1">
          <LockIcon size={13} /> Finish all {lessons.length} lessons to unlock the quiz
        </div>
      )}

      <div className="space-y-2">
        {lessons.map((lesson, idx) => {
          const isLocked = !isManager && idx > 0 && !lessons[idx - 1].is_completed && !lesson.is_completed
          const row = (
            <Card className={cn('!p-3', !isLocked && !lesson.is_completed && 'hover:border-teal/40 transition-colors')}>
              <div className="flex items-center gap-3">
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                  lesson.is_completed ? 'bg-teal/10 text-teal' : isLocked ? 'bg-bdrbg text-gray' : 'bg-navy/10 text-navy-ink')}>
                  {lesson.is_completed ? <CheckIcon className="w-4 h-4" /> : isLocked ? <LockIcon size={14} /> : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn('text-sm font-medium truncate', isLocked ? 'text-gray' : 'text-dark-text')}>{lesson.title}</div>
                  {isLocked
                    ? <div className="text-xs text-gray">Finish the previous lesson to unlock</div>
                    : <div className="text-xs text-gray flex items-center gap-2">
                        {lesson.duration_minutes && <span>{lesson.duration_minutes} min</span>}
                        {!lesson.is_completed && perLessonXp > 0 && (
                          <span className="flex items-center gap-0.5 text-gold font-[700]"><XpIcon className="w-3 h-3" />+{perLessonXp}</span>
                        )}
                      </div>}
                </div>
                {lesson.is_completed
                  ? <Badge color="success" className="text-xs">Done</Badge>
                  : isLocked ? <LockIcon size={15} className="text-border" /> : <ArrowRightIcon className="w-4 h-4 text-gray" />}
              </div>
            </Card>
          )
          return isLocked
            ? <div key={lesson.id} aria-disabled className="block opacity-70">{row}</div>
            : <Link key={lesson.id} href={`/train/${moduleId}/${lesson.id}`} className="block">{row}</Link>
        })}
      </div>
    </div>
  )
}
