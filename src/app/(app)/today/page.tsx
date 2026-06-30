// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useProgress, useHabits } from '@/lib/hooks/useProgress'
import { Card, Button, ProgressBar, Skeleton } from '@/components/ui'
import { CheckIcon, FlameIcon, XpIcon, PhoneIcon, TargetIcon, HandshakeIcon, ClockIcon, ArrowRightIcon, LightningIcon } from '@/components/icons'
import { cn, formatXP, formatDateShort } from '@/lib/utils'
import { toast } from '@/components/ui'
import { AiTip } from '@/components/AiTip'
import { askCoach } from '@/lib/coachBus'

export default function TodayPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string>()
  const [completing, setCompleting] = useState<string | null>(null)
  const [planned, setPlanned] = useState<any[]>([])     // tasks scheduled into today's blocks
  const [unplannedCount, setUnplannedCount] = useState(0)
  const { habits, loading: habitsLoading, refresh: refreshHabits } = useHabits(userId)
  const { progress, refresh: refreshProgress } = useProgress(userId)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => { if (user) { setUserId(user.id); loadPlan(user.id) } })
  }, [])

  const loadPlan = async (uid: string) => {
    const { data } = await supabase.from('tasks').select('id, title, done, estimated_minutes, scheduled_day, scheduled_block')
      .eq('user_id', uid).is('parent_id', null).or(`done.eq.false,scheduled_day.eq.${today}`)
    const all = data ?? []
    setPlanned(all.filter(t => t.scheduled_day === today && t.scheduled_block != null))
    setUnplannedCount(all.filter(t => !t.done && !(t.scheduled_day === today && t.scheduled_block != null)).length)
  }
  const togglePlanTask = (id: string, done: boolean) => {
    setPlanned(prev => prev.map(t => t.id === id ? { ...t, done } : t))
    supabase.from('tasks').update({ done, updated_at: new Date().toISOString() }).eq('id', id).then(() => {})
  }

  const completeHabit = async (habitId: string, habitLabel: string) => {
    if (!userId) return
    setCompleting(habitId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase.from('habit_logs').insert({
        user_id: userId,
        habit_id: habitId,
        date: new Date().toISOString().split('T')[0],
      })
      if (error) { setCompleting(null); return } // duplicate = already done

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/calculate-xp`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: 'habit_complete', user_id: userId, habit_id: habitId }),
        }
      )
      if (res.ok) {
        const { xp_earned } = await res.json()
        toast.xp(xp_earned ?? 0, `"${habitLabel}" done!`)
        await Promise.all([refreshHabits(), refreshProgress()])
      }
    } finally { setCompleting(null) }
  }

  const logActivity = async (type: 'call' | 'demo' | 'deal') => {
    if (!userId) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const label = `${type[0].toUpperCase()}${type.slice(1)}`
    // One source of truth: a quick log creates the same `wins` record the Wins
    // page reads — not a silent XP-only tally that diverges from logged wins.
    await supabase.from('wins').insert({
      user_id: userId,
      type,
      description: `${label} logged from Today`,
    })
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/calculate-xp`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: `${type}_logged`, user_id: userId }),
      }
    )
    if (res.ok) {
      const { xp_earned } = await res.json()
      toast.xp(xp_earned ?? 0, `${label} logged!`)
      refreshProgress()
    }
  }

  const completedCount = habits.filter(h => h.completed_today).length
  const totalCount = habits.length
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const allDone = completedCount === totalCount && totalCount > 0

  return (
    <div className="space-y-4 stagger-rise">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 text-dark-text">Today</h1>
          <p className="text-sm text-gray">{formatDateShort(new Date())}</p>
        </div>
        <Link href="/schedule" className="flex items-center gap-1.5 rounded-pill border border-border bg-card px-3 py-2 text-[12px] font-[700] text-navy shadow-card hover:border-navy/40">
          <ClockIcon size={15} /> Time Blocks
        </Link>
      </div>

      <AiTip id="today-plan" title="Start the day with an AI game plan" prompt="Give me my game plan for today: where I stand, my biggest opportunity, and the top 3 things to do." tryLabel="Get today's game plan">
        Ask the coach to triage your day from your goal, pipeline, and tasks — then open <span className="font-[700]">Time Blocks</span> and tap Auto-plan to schedule it all.
      </AiTip>

      {/* Today's plan — tasks scheduled into your time blocks */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-h3 text-dark-text">Today&apos;s plan</h2>
          <Link href="/schedule" className="flex items-center gap-1 text-sm font-medium text-navy">Time Blocks <ArrowRightIcon className="h-4 w-4" /></Link>
        </div>
        {planned.length === 0 ? (
          <div>
            <p className="text-sm text-gray">Nothing time-blocked yet{unplannedCount > 0 ? ` — you have ${unplannedCount} unplanned task${unplannedCount > 1 ? 's' : ''}.` : '.'}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/schedule" className="flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-[13px] font-[800] text-white"><LightningIcon size={14} /> Plan in Time Blocks</Link>
              <button onClick={() => askCoach('Give me my game plan for today and tell me what to time-block first.')} className="rounded-lg bg-bdrbg px-3 py-2 text-[13px] font-[700] text-mid-text hover:bg-border/40">Ask the coach</button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-1.5 flex items-center justify-between text-xs text-gray">
              <span className="tabular-nums">{planned.filter(t => t.done).length}/{planned.length} done</span>
              <span className="tabular-nums">{planned.reduce((s, t) => s + (t.estimated_minutes || 30), 0)}m planned</span>
            </div>
            <ProgressBar value={planned.filter(t => t.done).length} max={planned.length} className="mb-3" />
            <div className="space-y-2">
              {planned.slice(0, 6).map(t => (
                <div key={t.id} className="flex items-center gap-3 rounded-xl border border-border bg-bdrbg p-3">
                  <button onClick={() => togglePlanTask(t.id, !t.done)} aria-label={t.done ? 'Mark incomplete' : 'Complete task'}
                    className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors', t.done ? 'border-success bg-success text-white' : 'border-border text-transparent hover:border-teal')}>
                    <CheckIcon className="h-3 w-3" />
                  </button>
                  <span className={cn('flex-1 truncate text-sm font-medium', t.done ? 'text-gray line-through' : 'text-dark-text')}>{t.title}</span>
                  <span className="shrink-0 text-xs text-gray tabular-nums">{(t.estimated_minutes || 30) >= 60 ? `${(t.estimated_minutes || 30) / 60}h` : `${t.estimated_minutes || 30}m`}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Streak banner */}
      {(progress?.current_streak ?? 0) > 0 && (
        <div className={cn('flex items-center gap-3 px-4 py-3 rounded-2xl border',
          progress?.streakStatus === 'at-risk' ? 'bg-yellow-50 border-yellow-200' : 'bg-orange-50 border-orange-200')}>
          <FlameIcon className="text-orange-500 w-5 h-5" />
          <div>
            <span className="text-sm font-bold text-orange-700">{progress?.current_streak} Day Streak</span>
            {progress?.streakStatus === 'at-risk' && (
              <span className="text-xs text-orange-600 ml-2">— complete habits to keep it!</span>
            )}
          </div>
        </div>
      )}

      {/* Habits */}
      <Card variant={allDone ? 'completed' : 'default'}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-h3 text-dark-text">Daily Habits</h2>
            <p className="text-sm text-gray">{completedCount} of {totalCount} complete</p>
          </div>
          {allDone && <span className="text-sm font-medium text-teal flex items-center gap-1"><CheckIcon className="w-4 h-4" />All done!</span>}
        </div>
        <ProgressBar value={completionPct} max={100} className="mb-4" />

        {habitsLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} height={48} className="w-full rounded-xl" />)}</div>
        ) : (
          <div className="space-y-2">
            {habits.map(habit => (
              <button key={habit.id}
                onClick={() => !habit.completed_today && completeHabit(habit.id, habit.label)}
                disabled={habit.completed_today || completing === habit.id}
                className={cn('w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                  habit.completed_today ? 'bg-teal/5 border-teal/30 opacity-80'
                    : 'bg-bdrbg border-border hover:border-teal/50 hover:bg-teal/5 active:scale-[0.98]')}>
                <div className={cn('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all',
                  habit.completed_today || completing === habit.id ? 'bg-teal border-teal' : 'border-border')}>
                  {(habit.completed_today || completing === habit.id) && <CheckIcon className={cn('w-3 h-3 text-white', completing === habit.id && 'animate-pop')} />}
                </div>
                <span className={cn('text-sm font-medium flex-1', habit.completed_today ? 'text-gray line-through' : 'text-dark-text')}>
                  {habit.label}
                </span>
                {!habit.completed_today && (
                  <span className="text-xs text-gray flex items-center gap-1"><XpIcon className="w-3 h-3" />+5</span>
                )}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Quick Log */}
      <Card>
        <h2 className="text-h3 text-dark-text mb-3">Quick Log</h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { type: 'call' as const,  label: 'Call',  Icon: PhoneIcon,     xp: 10 },
            { type: 'demo' as const,  label: 'Demo',  Icon: TargetIcon,    xp: 25 },
            { type: 'deal' as const,  label: 'Deal',  Icon: HandshakeIcon, xp: 100 },
          ].map(item => (
            <button key={item.type} onClick={() => logActivity(item.type)}
              className="flex flex-col items-center gap-1 p-3 bg-bdrbg hover:bg-bdrbg active:scale-95 rounded-xl border border-border transition-all">
              <item.Icon size={24} className="text-navy" />
              <span className="text-xs font-semibold text-dark-text">{item.label}</span>
              <span className="text-xs text-gray">+{item.xp} XP</span>
            </button>
          ))}
        </div>
      </Card>

      {/* XP earned today */}
      {(progress?.todayStats.xpEarnedToday ?? 0) > 0 && (
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold/10 rounded-full flex items-center justify-center">
              <XpIcon className="text-gold" />
            </div>
            <div>
              <div className="text-sm text-gray">XP earned today</div>
              <div className="text-h3 font-bold text-dark-text">{formatXP(progress?.todayStats.xpEarnedToday ?? 0)}</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
