// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, Button, Badge, SkeletonCard, EmptyState } from '@/components/ui'
import { ArrowRightIcon, BackIcon, XpIcon, CheckIcon, ChecklistIcon, TrophyIcon, BookIcon, CloseIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui'
import { Confetti } from '@/components/gamification'

interface QuizQuestion {
  id: string
  question: string
  question_type: string
  options: string[]       // JSON array of 4 strings
  correct_answer: number  // index 0-3
  explanation: string
  source: { document: string; page: string; section?: string }
}

type QuizPhase = 'intro' | 'taking' | 'result'

export default function ModuleQuizPage() {
  const { moduleId } = useParams<{ moduleId: string }>()
  const supabase = createClient()
  const router = useRouter()
  const [userId, setUserId] = useState<string>()
  const [moduleName, setModuleName] = useState('')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState<QuizPhase>('intro')
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})  // questionId -> selected index
  const [showAnswer, setShowAnswer] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ correct: number; total: number; pct: number; passed: boolean; xpEarned: number } | null>(null)
  const [prevBest, setPrevBest] = useState<number>(0)

  // Survive a mid-quiz refresh / backgrounded-tab kill: in-flight answers are
  // persisted per module and rehydrated on mount, so a reload doesn't wipe a
  // 15-question run back to the intro.
  const storageKey = `quiz_progress_${moduleId}`

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUserId(user.id); fetchData(user.id) }
    })
  }, [moduleId])

  useEffect(() => {
    if (loading) return
    try {
      if (phase === 'taking') sessionStorage.setItem(storageKey, JSON.stringify({ currentIdx, answers, showAnswer }))
      else sessionStorage.removeItem(storageKey)
    } catch { /* storage unavailable — non-fatal */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIdx, answers, showAnswer, loading])

  const fetchData = async (uid: string) => {
    const [{ data: mod }, { data: qs }, { data: prevAttempts }] = await Promise.all([
      supabase.from('modules').select('title').eq('id', moduleId).single(),
      supabase.from('quiz_questions').select('*').eq('module_id', moduleId).order('order_index'),
      supabase.from('quiz_attempts').select('percentage').eq('user_id', uid).eq('module_id', moduleId).order('attempted_at', { ascending: false }).limit(5),
    ])
    const loaded = (qs ?? []).map(q => ({ ...q, options: q.options as string[] }))
    setModuleName(mod?.title ?? '')
    setQuestions(loaded)
    setPrevBest(Math.max(...(prevAttempts?.map(a => a.percentage) ?? [0])))
    // Rehydrate an interrupted run before showing the intro.
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null')
      if (saved && saved.answers && Object.keys(saved.answers).length > 0 && loaded.length > 0) {
        setAnswers(saved.answers)
        setCurrentIdx(Math.min(saved.currentIdx ?? 0, loaded.length - 1))
        setShowAnswer(!!saved.showAnswer)
        setPhase('taking')
      }
    } catch { /* ignore malformed */ }
    setLoading(false)
  }

  const selectAnswer = (questionId: string, idx: number) => {
    if (showAnswer) return
    setAnswers(prev => ({ ...prev, [questionId]: idx }))
    setShowAnswer(true)
  }

  const next = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(c => c + 1)
      setShowAnswer(false)
    } else {
      submitQuiz()
    }
  }

  const submitQuiz = async () => {
    if (!userId) return
    setSubmitting(true)
    try {
      const correct = questions.filter(q => answers[q.id] === q.correct_answer).length
      const pct = Math.round((correct / questions.length) * 100)
      const passed = pct >= 70

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Determine if first attempt
      const { data: existing } = await supabase.from('quiz_attempts').select('id').eq('user_id', userId).eq('module_id', moduleId).limit(1)
      const isFirst = (existing?.length ?? 0) === 0

      await supabase.from('quiz_attempts').insert({
        user_id: userId,
        module_id: moduleId,
        score: correct,
        percentage: pct,
        answers: Object.entries(answers).map(([qId, ans]) => ({
          question_id: qId,
          selected: ans,
          correct: questions.find(q => q.id === qId)?.correct_answer === ans,
        })),
        xp_earned: 0,
        is_first_attempt: isFirst,
        passed,
        completed_at: new Date().toISOString(),
      })

      let xpEarned = 0
      if (passed) {
        const action = pct >= 90 ? 'quiz_pass_90' : pct >= 80 ? 'quiz_pass_80' : 'quiz_pass_60'
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/calculate-xp`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ action, user_id: userId, module_id: moduleId, is_first_attempt: isFirst, prev_best: prevBest }),
          }
        )
        if (res.ok) xpEarned = (await res.json()).xp_earned
      }

      setResult({ correct, total: questions.length, pct, passed, xpEarned })
      setPhase('result')
    } finally { setSubmitting(false) }
  }

  if (loading) return <div className="space-y-4"><SkeletonCard /></div>

  if (questions.length === 0) return (
    <EmptyState
      icon={<ChecklistIcon size={28} />}
      title="No quiz yet"
      description="This module doesn't have a quiz available yet. Finish the lessons and check back."
      action={{ label: 'Back to module', onClick: () => router.back() }}
    />
  )

  // Intro
  if (phase === 'intro') return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray">
        <BackIcon className="w-4 h-4" />Back
      </button>
      <Card>
        <div className="text-center py-4">
          <div className="mb-3 flex justify-center"><ChecklistIcon size={36} className="text-navy-ink" /></div>
          <h1 className="text-h2 text-dark-text mb-2">{moduleName} Quiz</h1>
          <p className="text-sm text-gray mb-1">{questions.length} questions · Pass at 70%</p>
          {prevBest > 0 && <p className="text-xs text-gray">Your best: {prevBest}%</p>}
        </div>
      </Card>
      <Button onClick={() => setPhase('taking')} variant="conversion" fullWidth size="lg" icon={<ArrowRightIcon size={18} />} iconPosition="right">Start Quiz</Button>
    </div>
  )

  // Taking
  if (phase === 'taking') {
    const q = questions[currentIdx]
    const userAnswer = answers[q.id]
    const isAnswered = userAnswer !== undefined

    return (
      <div className="space-y-4">
        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray">Question {currentIdx + 1} of {questions.length}</span>
            <div className="flex gap-1">
              {questions.map((_, i) => (
                <div key={i} className={cn('w-2 h-2 rounded-full',
                  i < currentIdx ? 'bg-teal' : i === currentIdx ? 'bg-navy' : 'bg-gray-300')} />
              ))}
            </div>
          </div>
          <Badge className={cn('text-xs', q.question_type === 'scenario' ? 'bg-blue-500/15 text-blue-300' : 'bg-purple-500/15 text-purple-300')}>
            {q.question_type}
          </Badge>
        </div>

        <Card>
          <h2 className="text-sm font-semibold text-dark-text mb-4 leading-relaxed">{q.question}</h2>
          <div className="space-y-2">
            {q.options.map((opt, idx) => {
              let cls = 'border-border bg-bdrbg hover:bg-bdrbg text-mid-text'
              if (isAnswered) {
                if (idx === q.correct_answer) cls = 'border-teal bg-teal/5 text-teal font-medium'
                else if (idx === userAnswer) cls = 'border-error/50 bg-error/10 text-error'
                else cls = 'border-border bg-bdrbg opacity-40 text-gray'
              } else if (idx === userAnswer) {
                cls = 'border-navy bg-navy/5 text-navy-ink'
              }
              return (
                <button key={idx} onClick={() => selectAnswer(q.id, idx)}
                  className={cn('w-full text-left px-4 py-3 rounded-xl border text-sm transition-all', cls)}>
                  <span className="text-gray mr-2">{String.fromCharCode(65 + idx)}.</span>{opt}
                </button>
              )
            })}
          </div>

          {isAnswered && (
            <div className={cn('mt-4 p-3 rounded-xl border', userAnswer === q.correct_answer
              ? 'bg-teal/5 border-teal/30' : 'bg-error/10 border-red-500/40')}>
              <div className={cn('text-xs font-bold mb-1', userAnswer === q.correct_answer ? 'text-teal' : 'text-error')}>
                {userAnswer === q.correct_answer ? 'Correct!' : 'Incorrect'}
              </div>
              <p className="text-sm text-mid-text">{q.explanation}</p>
              {q.source?.document && (
                <p className="text-xs text-gray mt-1">Source: {q.source.document}{q.source.page ? `, p. ${q.source.page}` : ''}</p>
              )}
            </div>
          )}
        </Card>

        {isAnswered && (
          <Button onClick={next} loading={submitting} className="w-full" size="lg">
            {currentIdx < questions.length - 1 ? 'Next Question' : 'Submit Quiz'}
            <ArrowRightIcon className="ml-2" />
          </Button>
        )}
      </div>
    )
  }

  // Result
  if (phase === 'result' && result) return (
    <div className="space-y-4">
      {result.passed && <Confetti />}
      <Card className={cn('text-center py-8', result.passed ? 'border-teal/30 bg-teal/5' : 'border-red-500/40 bg-error/10')}>
        <div className="mb-3 flex justify-center">{result.passed ? <TrophyIcon size={44} className="text-gold" /> : <BookIcon size={44} className="text-navy-ink" />}</div>
        <h2 className="text-h2 text-dark-text mb-2">{result.passed ? 'Passed!' : 'Keep studying'}</h2>
        <div className="text-4xl font-bold text-dark-text mb-1">{result.pct}%</div>
        <p className="text-sm text-gray mb-4">{result.correct} of {result.total} correct</p>
        {result.xpEarned > 0 && (
          <div className="flex items-center gap-2 justify-center text-gold font-bold text-lg">
            <XpIcon className="w-5 h-5" />+{result.xpEarned} XP
          </div>
        )}
      </Card>

      {/* Answer review */}
      <Card>
        <h3 className="text-h3 text-dark-text mb-3">Review</h3>
        <div className="space-y-3">
          {questions.map((q, i) => {
            const ans = answers[q.id]
            const isCorrect = ans === q.correct_answer
            return (
              <div key={q.id} className={cn('p-3 rounded-xl border text-sm', isCorrect ? 'border-teal/30 bg-teal/5' : 'border-red-500/40 bg-error/10')}>
                <div className="flex items-start gap-2">
                  <div className={cn('w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                    isCorrect ? 'bg-teal/20' : 'bg-red-200')}>
                    {isCorrect ? <CheckIcon className="w-3 h-3 text-teal" /> : <CloseIcon className="w-3 h-3 text-error" />}
                  </div>
                  <div>
                    <p className="text-dark-text font-medium mb-1">{i + 1}. {q.question.slice(0, 80)}{q.question.length > 80 ? '…' : ''}</p>
                    {!isCorrect && <p className="text-xs text-gray">Correct: <span className="font-medium">{q.options[q.correct_answer]}</span></p>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <div className="flex gap-3">
        {!result.passed && (
          <Button variant="secondary" onClick={() => {
            setPhase('taking'); setCurrentIdx(0); setAnswers({}); setShowAnswer(false)
          }} className="flex-1">Try Again</Button>
        )}
        <Button onClick={() => router.push(`/train/${moduleId}`)} className="flex-1">
          {result.passed ? 'Back to Module' : 'Back'}
        </Button>
      </div>
    </div>
  )

  return null
}
