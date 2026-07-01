// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useProgress, useHabits } from '@/lib/hooks/useProgress'
import { Card, ProgressBar, Skeleton } from '@/components/ui'
import { CheckIcon, FlameIcon, XpIcon, PhoneIcon, TargetIcon, HandshakeIcon, ClockIcon, ArrowRightIcon, LightningIcon, CoachIcon } from '@/components/icons'
import { cn, formatXP, formatDateShort } from '@/lib/utils'
import { toast } from '@/components/ui'
import { AiTip } from '@/components/AiTip'
import { askCoach } from '@/lib/coachBus'
import { GoalCockpit } from '@/components/GoalCockpit'
import { FirstRunOverlay } from '@/components/FirstRunOverlay'
import { useWinsNotify } from '@/lib/hooks/useWinsNotify'
import { goalStats, buildActions } from '@/lib/priorityEngine'
import { autoPlan, fmtEst } from '@/lib/triageEngine'
import { stageMeta } from '@/lib/partnerChecklist'
import { localToday } from '@/lib/schedule'
import { fetchDaySlots } from '@/lib/daySlots'

export default function TodayPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string>()
  const [loaded, setLoaded] = useState(false)
  const [completing, setCompleting] = useState<string | null>(null)
  const [tasks, setTasks] = useState<any[]>([])          // all open top-level tasks (the brain)
  const [partners, setPartners] = useState<any[]>([])
  const [goal, setGoal] = useState<number | null>(null)
  const [dealsThisMonth, setDealsThisMonth] = useState(0)
  const [dayBlocks, setDayBlocks] = useState<any[]>([])
  const [triageBusy, setTriageBusy] = useState(false)
  const [doneTaskId, setDoneTaskId] = useState<string | null>(null)
  const { habits, loading: habitsLoading, refresh: refreshHabits } = useHabits(userId)
  const { progress, refresh: refreshProgress } = useProgress(userId)

  // Wins are now throttled milestone notifications, not a tab — logged as the
  // user's streak / deals / goal cross thresholds.
  useWinsNotify({ userId, streak: progress?.current_streak, deals: dealsThisMonth, goal })

  const today = localToday()

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoaded(true); return }
      setUserId(user.id)
      // Await the core loads together so the cockpit/streak render with real
      // numbers instead of flashing zeros on first paint.
      await Promise.all([
        loadTasks(user.id),
        loadDayBlocks(user.id),
        supabase.from('partner_onboarding').select('id, partner_name, stage, temperature, updated_at').eq('user_id', user.id).then(({ data }) => setPartners(data ?? [])),
        supabase.from('goals').select('monthly_deal_goal').eq('user_id', user.id).maybeSingle().then(({ data }) => setGoal(data?.monthly_deal_goal ?? null)),
        supabase.from('user_progress').select('deals_this_month').eq('user_id', user.id).single().then(({ data }) => setDealsThisMonth(data?.deals_this_month ?? 0)),
      ])
      setLoaded(true)
    })()
  }, [])

  // All open top-level tasks with the fields the priority engine needs.
  const loadTasks = async (uid: string) => {
    const { data } = await supabase.from('tasks')
      .select('id, title, done, priority, due_date, estimated_minutes, created_at, scheduled_day, scheduled_block, snoozed_until, deferral_count')
      .eq('user_id', uid).eq('done', false).is('parent_id', null)
    setTasks(data ?? [])
  }
  // Today's schedulable blocks (template + overrides + custom) for on-Today auto-plan.
  const loadDayBlocks = async (uid: string) => setDayBlocks(await fetchDaySlots(supabase, uid))

  // Auto-triage today: pack open tasks into time blocks by priority.
  const autoPlanToday = async () => {
    if (triageBusy || !userId) return
    setTriageBusy(true)
    try {
      const now = new Date()
      const assign = autoPlan(tasks, dayBlocks, now, { reflow: false })
      const t = localToday()
      const updates = tasks.filter(x => assign[x.id] != null && (x.scheduled_day !== t || String(x.scheduled_block) !== String(assign[x.id])))
      setTasks(prev => prev.map(x => assign[x.id] != null ? { ...x, scheduled_day: t, scheduled_block: String(assign[x.id]) } : x))
      await Promise.all(updates.map(x => supabase.from('tasks').update({ scheduled_day: t, scheduled_block: String(assign[x.id]), updated_at: new Date().toISOString() }).eq('id', x.id)))
      const n = Object.keys(assign).length
      toast.success(n ? `Planned ${n} task${n > 1 ? 's' : ''} into your day` : 'Nothing to plan right now')
    } finally { setTriageBusy(false) }
  }

  // Toggle a planned task done/undone inline — it stays in the day's checklist so
  // the progress bar fills as you knock items out; pop the check on completion.
  const togglePlanTask = (id: string, next: boolean) => {
    if (next) { setDoneTaskId(id); setTimeout(() => setDoneTaskId(p => (p === id ? null : p)), 450) }
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: next } : t))
    supabase.from('tasks').update({ done: next, updated_at: new Date().toISOString() }).eq('id', id).then(() => {})
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
    // Confirm the win persisted BEFORE awarding XP, so a failed insert can't
    // hand out XP for a deal that was never recorded (counter/XP desync).
    const { error: winErr } = await supabase.from('wins').insert({
      user_id: userId,
      type,
      description: `${label} logged from Today`,
    })
    if (winErr) { toast.error(`Could not log that ${type}. Try again.`); return }
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

  // ── Priority brain: live goal math + the single ranked action list ───────────
  const nowDate = new Date()
  const gstats = goalStats(goal, dealsThisMonth, nowDate)
  const actions = buildActions({ tasks, partners, g: gstats, now: nowDate, stageLabel: (s) => stageMeta(s).label })
  const focus = actions[0] ?? null

  // Today's time-blocked tasks (the day's execution list).
  const planned = tasks.filter(t => t.scheduled_day === today && t.scheduled_block != null)
  const plannedDone = planned.filter(t => t.done).length
  const plannedMins = planned.reduce((s, t) => s + (t.estimated_minutes || 30), 0)
  const unplanned = tasks.filter(t => !t.done && !(t.scheduled_day === today && t.scheduled_block != null))

  const completedCount = habits.filter(h => h.completed_today).length
  const totalCount = habits.length
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const allDone = completedCount === totalCount && totalCount > 0

  if (!loaded) return (
    <div className="space-y-4">
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  )

  return (
    <div className="space-y-4 stagger-rise">
      {/* First-visit welcome → launches new users into their baseline setup. */}
      <FirstRunOverlay
        kvKey="today_ftux"
        eyebrow="Welcome to BDR Hub"
        title="This is your daily race line"
        body="Today is your one screen to win the day: your goal pace, the single highest-value move, your live tasks, and your streak — all in one place. Start by setting your target so everything else calibrates to your number."
        steps={[
          { icon: TargetIcon, label: 'Set your income + deal goals (your baseline)' },
          { icon: LightningIcon, label: 'Work your top-ranked move first, every day' },
          { icon: FlameIcon, label: 'Build the streak — wins log themselves as you go' },
        ]}
        ctaLabel="Set your goals"
        ctaHref="/commissions"
      />

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
        Ask the coach to triage your day from your goal, pipeline, and tasks — then tap <span className="font-[700]">Auto-plan my day</span> to schedule it all into your time blocks.
      </AiTip>

      {/* ── Day cockpit — goal pace + today at a glance ── */}
      <Card className="overflow-hidden !p-0">
        <GoalCockpit g={gstats} title="Where you stand" />
        {/* Today at a glance — plan, habits, streak */}
        <div className="grid grid-cols-3 gap-px border-t border-border bg-border">
          {[
            { label: 'Plan', value: `${plannedDone}/${planned.length}`, sub: planned.length ? 'time-blocked' : 'nothing yet', done: planned.length > 0 && plannedDone >= planned.length },
            { label: 'Habits', value: `${completedCount}/${totalCount}`, sub: allDone ? 'all done' : 'routines', done: allDone },
            { label: 'Streak', value: String(progress?.current_streak ?? 0), sub: 'days', done: (progress?.current_streak ?? 0) > 0 },
          ].map(s => (
            <div key={s.label} className={cn('flex flex-col items-center justify-center bg-card py-2.5', s.done && 'bg-teal/5')}>
              <div className={cn('text-[16px] font-[800] tabular-nums', s.done ? 'text-teal' : 'text-dark-text')}>{s.value}</div>
              <div className="text-[10px] font-[700] uppercase tracking-wide text-gray">{s.label}</div>
              <div className="text-[10px] text-gray">{s.sub}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Do this now — the single most important action, alive ── */}
      {focus ? (
        <Link href={focus.href} className="relative block overflow-hidden rounded-2xl border-2 border-teal bg-card p-4 shadow-card animate-glow transition-transform active:scale-[0.99]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-hero text-white animate-bob"><LightningIcon size={22} /></div>
            <div className="min-w-0 flex-1">
              <div className="text-label text-teal">Do this now</div>
              <div className="truncate text-[16px] font-[800] text-dark-text">{focus.title}</div>
              <div className="truncate text-[12px] text-gray">{focus.why}{focus.est ? ` · ~${fmtEst(focus.est)}` : ''}</div>
            </div>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-teal px-3 py-1.5 text-[12px] font-[800] text-white">{focus.cta} <ArrowRightIcon size={14} className="animate-nudge-x" /></span>
          </div>
        </Link>
      ) : (
        <div className="rounded-2xl border-2 border-success/40 bg-success/[0.06] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success"><CheckIcon size={22} /></div>
            <div className="min-w-0">
              <div className="text-[15px] font-[800] text-dark-text">You&apos;re all caught up</div>
              <div className="text-[12px] text-gray">No urgent actions — prospect, learn, or log a win below.</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Today's plan — tasks scheduled into your time blocks ── */}
      <Card data-tour="today-plan-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-h3 text-dark-text">Today&apos;s plan</h2>
          <Link href="/schedule" className="flex items-center gap-1 text-sm font-medium text-navy">Time Blocks <ArrowRightIcon className="h-4 w-4" /></Link>
        </div>
        {planned.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-bdrbg p-3">
            <p className="text-sm text-gray">Nothing time-blocked yet{unplanned.length > 0 ? ` — you have ${unplanned.length} task${unplanned.length > 1 ? 's' : ''} ready to schedule.` : '.'}</p>
          </div>
        ) : (
          <>
            <div className="mb-1.5 flex items-center justify-between text-xs text-gray">
              <span className="tabular-nums">{plannedDone}/{planned.length} done</span>
              <span className="tabular-nums">{plannedMins >= 60 ? `${(plannedMins / 60).toFixed(plannedMins % 60 ? 1 : 0)}h` : `${plannedMins}m`} planned</span>
            </div>
            <ProgressBar value={plannedDone} max={planned.length} className="mb-3" />
            <div className="space-y-2">
              {planned.slice(0, 6).map(t => (
                <div key={t.id} className={cn('flex items-center gap-3 rounded-xl border bg-bdrbg p-3 transition-all duration-300', t.done ? 'border-teal/40 opacity-70' : 'border-border')}>
                  <button onClick={() => togglePlanTask(t.id, !t.done)} aria-label={t.done ? 'Mark incomplete' : 'Complete task'}
                    className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors', t.done ? 'border-teal bg-teal' : 'border-border hover:border-teal hover:bg-teal/10')}>
                    <CheckIcon className={cn('h-3 w-3', t.done ? 'text-white' : 'text-transparent', doneTaskId === t.id && 'animate-pop')} />
                  </button>
                  <span className={cn('flex-1 truncate text-sm font-medium', t.done ? 'text-gray line-through' : 'text-dark-text')}>{t.title}</span>
                  <span className="shrink-0 text-xs text-gray tabular-nums">{(t.estimated_minutes || 30) >= 60 ? `${(t.estimated_minutes || 30) / 60}h` : `${t.estimated_minutes || 30}m`}</span>
                </div>
              ))}
            </div>
          </>
        )}
        {/* Auto-triage controls — shared brain with Home */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={autoPlanToday} disabled={triageBusy}
            className="relative flex items-center justify-center gap-1.5 overflow-hidden rounded-lg bg-gradient-hero py-2.5 text-[13px] font-[800] text-white transition-transform active:scale-[0.99] disabled:opacity-60">
            <span className="pointer-events-none absolute inset-y-0 left-0 w-1/4 animate-shimmer bg-white/25 blur-md" aria-hidden="true" />
            <LightningIcon size={14} className="relative text-white" /><span className="relative">{triageBusy ? 'Planning…' : 'Auto-plan my day'}</span>
          </button>
          <button onClick={() => askCoach('Triage my day from my goal, pipeline, and tasks. What are the top 3 things to do right now, in order, and why?')}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-navy/30 bg-navy/5 py-2.5 text-[13px] font-[800] text-navy hover:bg-navy/10">
            <CoachIcon size={14} /> Coach my day
          </button>
        </div>
      </Card>

      {/* Streak banner */}
      {(progress?.current_streak ?? 0) > 0 && (
        <div className={cn('flex items-center gap-3 px-4 py-3 rounded-2xl border',
          progress?.streakStatus === 'at-risk' ? 'bg-yellow-500/10 border-yellow-200' : 'bg-orange-500/10 border-orange-500/40')}>
          <FlameIcon className="text-orange-500 w-5 h-5 animate-bob" />
          <div>
            <span className="text-sm font-bold text-orange-400">{progress?.current_streak} Day Streak</span>
            {progress?.streakStatus === 'at-risk' && (
              <span className="text-xs text-orange-400 ml-2">— complete habits to keep it!</span>
            )}
          </div>
        </div>
      )}

      {/* Daily Habits & routines */}
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
