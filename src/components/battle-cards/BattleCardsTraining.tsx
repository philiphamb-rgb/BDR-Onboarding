// @ts-nocheck
'use client'

// Battle Cards training flow — Welcome → 11 lessons (4 reveal panels + a quiz
// each) → Graduation (score, review grid, enter the tool). Native React + the
// BDR Hub UI kit. Progress + the score live in the DB via useBattleCards.

import { useEffect, useState } from 'react'
import { Card, Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { CheckIcon, CloseIcon, ArrowRightIcon, BackIcon, LightningIcon, TrophyIcon } from '@/components/icons'
import { TRAINING } from '@/lib/modules/battle-cards'

const THREAT = { high: { bg: 'bg-error/10', text: 'text-error', label: 'High threat' }, med: { bg: 'bg-gold/15', text: 'text-[#A06C00]', label: 'Medium' }, low: { bg: 'bg-teal/10', text: 'text-teal', label: 'Low' } }

function Lesson({ step, recorded, onAnswer, reviewing }: any) {
  const [revealed, setRevealed] = useState(reviewing ? 4 : 1)
  const [picked, setPicked] = useState<number | null>(reviewing ? step.quiz.correct : null)
  useEffect(() => { setRevealed(reviewing ? 4 : 1); setPicked(reviewing ? step.quiz.correct : null) }, [step, reviewing])
  const th = step.threat ? THREAT[step.threat] : null
  const allShown = revealed >= step.panels.length

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-[800] uppercase tracking-wide text-teal">{step.kicker}</span>
          {th && <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-[800]', th.bg, th.text)}>{th.label}</span>}
        </div>
        <h2 className="mt-1 text-h2 text-dark-text">{step.title}</h2>
        <p className="mt-1 text-[14px] font-[700] italic text-navy">“{step.hook}”</p>
      </div>

      <div className="space-y-2">
        {step.panels.slice(0, revealed).map((p: any, i: number) => (
          <div key={i} className="rounded-xl border border-border bg-card p-3 shadow-sm animate-rise">
            <div className="text-[10px] font-[800] uppercase tracking-wide text-gray">{p.label}</div>
            <p className="mt-1 text-[13.5px] leading-relaxed text-dark-text">{p.content}</p>
          </div>
        ))}
      </div>

      {!allShown ? (
        <Button variant="secondary" className="w-full" onClick={() => setRevealed(r => r + 1)}>Next ({revealed}/{step.panels.length})</Button>
      ) : (
        <Card className="!p-4">
          <div className="text-[11px] font-[800] uppercase tracking-wide text-teal">Quick check</div>
          <p className="mt-1 text-[14px] font-[700] text-dark-text">{step.quiz.q}</p>
          <div className="mt-3 space-y-2">
            {step.quiz.options.map((opt: string, i: number) => {
              const isCorrect = i === step.quiz.correct
              const show = picked != null
              return (
                <button key={i} disabled={picked != null && !reviewing} onClick={() => { if (picked == null) { setPicked(i); onAnswer?.(i === step.quiz.correct) } }}
                  className={cn('flex w-full items-center gap-2 rounded-xl border p-3 text-left text-[13px] font-[600] transition-colors',
                    !show ? 'border-border bg-bdrbg hover:border-teal/50' : isCorrect ? 'border-success bg-success/10 text-success' : i === picked ? 'border-error bg-error/10 text-error' : 'border-border bg-bdrbg text-gray')}>
                  <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px]', show && isCorrect ? 'border-success bg-success text-white' : show && i === picked ? 'border-error bg-error text-white' : 'border-gray/40 text-transparent')}>
                    {show && (isCorrect ? <CheckIcon size={12} /> : i === picked ? <CloseIcon size={12} /> : null)}
                  </span>
                  <span className="flex-1">{opt}</span>
                </button>
              )
            })}
          </div>
          {picked != null && (
            <div className="mt-3 flex gap-2 rounded-xl bg-teal/[0.07] p-3">
              <LightningIcon size={15} className="mt-0.5 shrink-0 text-teal" />
              <p className="text-[12.5px] leading-relaxed text-mid-text">{step.quiz.explain}</p>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

export function BattleCardsTraining({ progress, save, certify, onEnter }: any) {
  const [reviewIdx, setReviewIdx] = useState<number | null>(null)
  const total = TRAINING.length
  const stepIdx = Math.min(progress.step, total - 1)
  const step = TRAINING[stepIdx]
  const lessons = TRAINING.map((s, i) => ({ s, i })).filter(x => x.s.type === 'lesson')
  const score = lessons.filter(l => progress.quiz[l.i]).length

  // ── Review mode (from graduation) ──
  if (reviewIdx != null) {
    const rs = TRAINING[reviewIdx]
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <button onClick={() => setReviewIdx(null)} className="flex items-center gap-1 text-[13px] font-[700] text-navy"><BackIcon size={15} /> Back to results</button>
        <Lesson step={rs} reviewing />
      </div>
    )
  }

  if (step.type === 'welcome') {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="overflow-hidden !p-0">
          <div className="bg-gradient-hero p-6 text-center text-white">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 animate-bob"><TrophyIcon size={28} /></div>
            <h1 className="text-[24px] font-[900]">{step.title}</h1>
            <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-white/85">{step.body}</p>
          </div>
          <div className="p-5 text-center">
            <p className="text-[12px] font-[700] text-gray">{step.stats}</p>
            <Button className="mt-4 w-full" onClick={() => save({ step: 1 })} icon={<ArrowRightIcon size={16} />} iconPosition="right">{step.cta}</Button>
          </div>
        </Card>
      </div>
    )
  }

  if (step.type === 'graduation') {
    const perfect = score === lessons.length
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Card className="overflow-hidden !p-0">
          <div className="bg-gradient-hero p-6 text-center text-white">
            <div className="mx-auto mb-2 text-[40px]">{perfect ? '🏆' : '🎓'}</div>
            <h1 className="text-[22px] font-[900]">{step.title}</h1>
            <p className="mx-auto mt-1 max-w-md text-[13px] text-white/85">{step.body}</p>
            <div className="mx-auto mt-4 inline-flex items-baseline gap-1 rounded-full bg-white/15 px-4 py-1.5">
              <span className="text-[22px] font-[900]">{score}</span><span className="text-[13px] text-white/70">/ {lessons.length} quizzes</span>
            </div>
          </div>
        </Card>
        <div>
          <div className="mb-2 text-[12px] font-[800] uppercase tracking-wide text-gray">Review any topic</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {lessons.map(l => (
              <button key={l.i} onClick={() => setReviewIdx(l.i)}
                className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 text-left shadow-card hover:border-teal/40">
                <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full', progress.quiz[l.i] ? 'bg-success/15 text-success' : 'bg-bdrbg text-gray')}><CheckIcon size={11} /></span>
                <span className="min-w-0 flex-1 truncate text-[12px] font-[700] text-dark-text">{l.s.title}</span>
              </button>
            ))}
          </div>
        </div>
        <Button className="w-full" onClick={() => { save({ done: true }); certify(score, lessons.length); onEnter() }} icon={<ArrowRightIcon size={16} />} iconPosition="right">{step.cta || 'Enter Battle Cards'}</Button>
      </div>
    )
  }

  // Lesson
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-gradient-to-r from-teal to-navy transition-all" style={{ width: `${(stepIdx / (total - 1)) * 100}%` }} /></div>
        <span className="text-[11px] font-[700] text-gray tabular-nums">{stepIdx}/{total - 1}</span>
      </div>
      <Lesson key={stepIdx} step={step} recorded={progress.quiz[stepIdx]}
        onAnswer={(correct: boolean) => save(p => ({ quiz: { ...p.quiz, [stepIdx]: correct } }))} />
      {progress.quiz[stepIdx] !== undefined && (
        <Button className="w-full" onClick={() => save({ step: stepIdx + 1 })} icon={<ArrowRightIcon size={16} />} iconPosition="right">
          {TRAINING[stepIdx + 1]?.type === 'graduation' ? 'See results' : 'Next lesson'}
        </Button>
      )}
    </div>
  )
}
