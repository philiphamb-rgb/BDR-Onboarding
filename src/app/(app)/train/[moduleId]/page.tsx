// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, Badge, ProgressBar, Button } from '@/components/ui'
import { CheckIcon, ArrowRightIcon, BackIcon, XpIcon } from '@/components/icons'
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

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-32 bg-gray-200 rounded-2xl" /></div>
  if (!module) return <div className="text-center py-12 text-gray-500">Module not found</div>

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
        <BackIcon className="w-4 h-4" />Training
      </button>

      <Card className="bg-gradient-primary !p-5">
        <div className="text-white/70 text-xs font-medium mb-1">MODULE {module.order_index}</div>
        <h1 className="text-xl font-bold text-white mb-1">{module.title}</h1>
        {module.subtitle && <p className="text-white/70 text-sm mb-3">{module.subtitle}</p>}
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/80 text-sm">{completedCount}/{lessons.length} lessons</span>
          <span className="text-white/80 text-sm flex items-center gap-1"><XpIcon className="w-4 h-4 text-gold" />+{module.xp_quiz} XP quiz</span>
        </div>
        <ProgressBar value={percentage(completedCount, lessons.length)} max={100} color="#00C2B2" className="h-2" />
      </Card>

      {nextLesson && (
        <Link href={`/train/${moduleId}/${nextLesson.id}`}>
          <Button className="w-full" size="lg">Continue Learning<ArrowRightIcon className="ml-2" /></Button>
        </Link>
      )}

      {hasQuiz && completedCount > 0 && (
        <Link href={`/train/${moduleId}/quiz`}>
          <Button variant={quizPassed ? 'ghost' : 'secondary'} className="w-full">
            {quizPassed ? 'Retake Quiz' : 'Take Module Quiz'}<ArrowRightIcon className="ml-2" />
          </Button>
        </Link>
      )}

      <div className="space-y-2">
        {lessons.map((lesson, idx) => {
          const isLocked = idx > 0 && !lessons[idx - 1].is_completed && !lesson.is_completed
          return (
            <Link key={lesson.id} href={isLocked ? '#' : `/train/${moduleId}/${lesson.id}`}
              className={cn('block', isLocked && 'pointer-events-none opacity-60')}>
              <Card className="!p-3">
                <div className="flex items-center gap-3">
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                    lesson.is_completed ? 'bg-teal/10 text-teal' : isLocked ? 'bg-gray-100 text-gray-400' : 'bg-navy/10 text-navy')}>
                    {lesson.is_completed ? <CheckIcon className="w-4 h-4" /> : idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{lesson.title}</div>
                    {lesson.duration_minutes && <div className="text-xs text-gray-400">{lesson.duration_minutes} min</div>}
                  </div>
                  {lesson.is_completed
                    ? <Badge color="success" className="text-xs">Done</Badge>
                    : !isLocked && <ArrowRightIcon className="w-4 h-4 text-gray-400" />}
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
