// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useProgress, useHabits } from '@/lib/hooks/useProgress'
import { Card, Button, ProgressBar, Skeleton } from '@/components/ui'
import { CheckIcon, FlameIcon, XpIcon, PhoneIcon, TargetIcon, HandshakeIcon, ClockIcon, CoinIcon, ArrowRightIcon } from '@/components/icons'
import { cn, formatXP, formatDateShort } from '@/lib/utils'
import { toast } from '@/components/ui'
import { computePace } from '@/lib/goals'

export default function TodayPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string>()
  const [completing, setCompleting] = useState<string | null>(null)
  const [goalPace, setGoalPace] = useState<{ deals: number; conversations: number; hasCloseRate: boolean } | null>(null)
  const { habits, loading: habitsLoading, refresh: refreshHabits } = useHabits(userId)
  const { progress, refresh: refreshProgress } = useProgress(userId)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      fetchGoalPace(user.id)
    })
  }, [])

  // Today's required activity to stay on pace toward the monthly commission goal.
  const fetchGoalPace = async (uid: string) => {
    const now = new Date()
    const first = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const [{ data: g }, { data: deals }] = await Promise.all([
      supabase.from('goals').select('target_income, commission_per_deal, close_rate, working_days')
        .eq('user_id', uid).eq('is_active', true).maybeSingle(),
      supabase.from('wins').select('id').eq('user_id', uid).eq('type', 'deal').gte('logged_at', first + 'T00:00:00'),
    ])
    if (g && g.target_income > 0 && g.commission_per_deal > 0) {
      const p = computePace(g, deals?.length ?? 0, now)
      if (p.remainingDeals > 0) {
        setGoalPace({
          deals: Math.ceil(p.dealsPerRemainingDay),
          conversations: Math.ceil(p.conversationsPerRemainingDay),
          hasCloseRate: g.close_rate > 0,
        })
      }
    }
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
      toast.xp(xp_earned ?? 0, `${type[0].toUpperCase()}${type.slice(1)} logged!`)
      refreshProgress()
    }
  }

  const completedCount = habits.filter(h => h.completed_today).length
  const totalCount = habits.length
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const allDone = completedCount === totalCount && totalCount > 0

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 text-dark-text">Today</h1>
          <p className="text-sm text-gray">{formatDateShort(new Date())}</p>
        </div>
        <Link href="/schedule" className="flex items-center gap-1.5 rounded-pill border border-border bg-card px-3 py-2 text-[12px] font-[700] text-navy shadow-card hover:border-navy/40">
          <ClockIcon size={15} /> Daily Rhythm
        </Link>
      </div>

      {/* Today's pace toward the commission goal */}
      {goalPace && (
        <Link href="/goals">
          <Card hover className="flex items-center gap-3 border-navy/20 !p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy"><CoinIcon size={18} /></div>
            <div className="min-w-0 flex-1">
              <div className="label text-navy">To stay on pace today</div>
              <div className="text-[14px] font-[700] text-dark-text">
                {goalPace.deals} deal{goalPace.deals === 1 ? '' : 's'}
                {goalPace.hasCloseRate && <span className="font-[600] text-gray"> · ~{goalPace.conversations} conversations</span>}
              </div>
            </div>
            <ArrowRightIcon size={16} className="shrink-0 text-gray" />
          </Card>
        </Link>
      )}

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
                  habit.completed_today ? 'bg-teal border-teal'
                    : completing === habit.id ? 'border-teal animate-pulse' : 'border-border')}>
                  {habit.completed_today && <CheckIcon className="w-3 h-3 text-white" />}
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
