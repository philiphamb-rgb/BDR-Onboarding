// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProgress, useHabits } from '@/lib/hooks/useProgress'
import { Card, ProgressBar, Badge, Skeleton, Button, toast } from '@/components/ui'
import { FlameIcon, TrophyIcon, XpIcon, BeltIcon, ChartRisingIcon, PhoneIcon, ChecklistIcon, TargetIcon, ArrowRightIcon, LightningIcon, BookIcon, CoachIcon, HandshakeIcon, ClockIcon, CheckIcon, CoinIcon, PlusIcon, StarFilledIcon } from '@/components/icons'
import { cn, formatXP, pluralize } from '@/lib/utils'
import { currentBlock, fmtClock, fmtShift, SHIFT_OPTIONS } from '@/lib/schedule'
import { Tour } from '@/components/tour'
import { HOME_TOUR } from '@/lib/tours'
import { deriveAutoWins, monthPaceFraction } from '@/lib/winsEngine'
import { askCoach } from '@/lib/coachBus'
import { Belt3D } from '@/components/Belt3D'
import Link from 'next/link'

const BELT_STYLES: Record<string, { bg: string; bar: string; label: string }> = {
  white:  { bg: 'bg-bdrbg',   bar: '#9CA3AF', label: 'White Belt' },
  yellow: { bg: 'bg-yellow-50',  bar: '#FBBF24', label: 'Yellow Belt' },
  orange: { bg: 'bg-orange-50',  bar: '#F97316', label: 'Orange Belt' },
  green:  { bg: 'bg-green-50',   bar: '#22C55E', label: 'Green Belt' },
  blue:   { bg: 'bg-blue-50',    bar: '#3B82F6', label: 'Blue Belt' },
  purple: { bg: 'bg-purple-50',  bar: '#9333EA', label: 'Purple Belt' },
  black:  { bg: 'bg-gray-900',   bar: '#111827', label: 'Black Belt' },
}

export default function HomePage() {
  const supabase = createClient()
  const router = useRouter()
  const [userId, setUserId] = useState<string>()
  const [userName, setUserName] = useState('')
  const [leaderboard, setLeaderboard] = useState<{ user_id: string; name: string; total_xp: number }[]>([])
  const [nextStep, setNextStep] = useState<{ type: 'lesson' | 'quiz' | 'done'; moduleOrder?: number; moduleTitle?: string; href?: string; title?: string } | null>(null)
  const [shift, setShift] = useState<string | null>(null)
  const [stuck, setStuck] = useState(0)
  const [unread, setUnread] = useState(0)
  const [autoWins, setAutoWins] = useState<any[]>([])
  const [completing, setCompleting] = useState<string | null>(null)
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [tasks, setTasks] = useState<any[]>([])
  const [useEveryDay, setUseEveryDay] = useState(false)
  const [savingShift, setSavingShift] = useState(false)
  const { progress, loading, refresh: refreshProgress } = useProgress(userId)
  const { habits, refresh: refreshHabits } = useHabits(userId)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      fetchNextStep(user.id)
      supabase.from('users').select('name, settings').eq('id', user.id).single().then(({ data }) => {
        if (data?.name) setUserName(data.name.split(' ')[0])
        const s = data?.settings ?? {}
        setSettings(s)
        if (s.shift) setShift(s.shift)
        setUseEveryDay(!!s.shiftDefault)
      })
      // Top open tasks — surface task management right on Home.
      supabase.from('tasks').select('id, title, priority, due_date')
        .eq('user_id', user.id).eq('done', false).is('parent_id', null)
        .order('priority', { ascending: false }).order('due_date', { ascending: true, nullsFirst: false })
        .limit(3)
        .then(({ data }) => setTasks(data ?? []))
      // Partners awaiting a next step — drives the proactive "Right now" nudge.
      supabase.from('partner_onboarding').select('stage').eq('user_id', user.id).then(({ data }) => {
        setStuck((data ?? []).filter(p => p.stage === 'proposal_sent' || p.stage === 'contract_signed').length)
      })
      computeAutoWins(user.id)
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false)
        .then(({ count }) => setUnread(count ?? 0))
      supabase.from('user_progress').select('user_id, total_xp, users!inner(name)')
        .order('total_xp', { ascending: false }).limit(5)
        .then(({ data }) => {
          setLeaderboard((data ?? []).map((r: { user_id: string; total_xp: number; users: { name: string } }) => ({
            user_id: r.user_id,
            name: (r.users?.name ?? '').split(' ')[0],
            total_xp: r.total_xp ?? 0,
          })))
        })
    })
  }, [])

  // Compute the single next best action across the curriculum: the first
  // incomplete lesson in module order, else the first unpassed module quiz,
  // else "done" (curriculum complete → keep practicing).
  const fetchNextStep = async (uid: string) => {
    const [{ data: mods }, { data: lessons }, { data: prog }, { data: attempts }, { data: quizQs }] = await Promise.all([
      supabase.from('modules').select('id, title, order_index').order('order_index'),
      supabase.from('lessons').select('id, module_id, order_index, title').eq('is_published', true).order('order_index'),
      supabase.from('user_progress').select('completed_lessons').eq('user_id', uid).single(),
      supabase.from('quiz_attempts').select('module_id, percentage').eq('user_id', uid),
      supabase.from('quiz_questions').select('module_id'),
    ])
    const done = new Set<string>(prog?.completed_lessons ?? [])
    const passed = new Set<string>((attempts ?? []).filter(a => (a.percentage ?? 0) >= 70).map(a => a.module_id))
    const hasQuiz = new Set<string>((quizQs ?? []).map(q => q.module_id))
    for (const m of mods ?? []) {
      const ml = (lessons ?? []).filter(l => l.module_id === m.id)
      const nextLesson = ml.find(l => !done.has(l.id))
      if (nextLesson) {
        setNextStep({ type: 'lesson', moduleOrder: m.order_index, moduleTitle: m.title, title: nextLesson.title, href: `/train/${m.id}/${nextLesson.id}` })
        return
      }
      if (hasQuiz.has(m.id) && !passed.has(m.id)) {
        setNextStep({ type: 'quiz', moduleOrder: m.order_index, moduleTitle: m.title, title: `${m.title} Quiz`, href: `/train/${m.id}/quiz` })
        return
      }
    }
    setNextStep({ type: 'done' })
  }

  // Auto-Wins / Coach insights — deterministic, framed against goals. Real data only.
  const computeAutoWins = async (uid: string) => {
    const now = new Date()
    const wk = new Date(now.getTime() - 7 * 86400000).toISOString()
    const fortnight = new Date(now.getTime() - 14 * 86400000).toISOString()
    const [{ data: w }, { data: g }, { data: parts }, { data: up }] = await Promise.all([
      supabase.from('wins').select('type, logged_at').eq('user_id', uid).gte('logged_at', fortnight),
      supabase.from('goals').select('monthly_deal_goal').eq('user_id', uid).maybeSingle(),
      supabase.from('partner_onboarding').select('stage, temperature').eq('user_id', uid),
      supabase.from('user_progress').select('current_streak, deals_this_month').eq('user_id', uid).single(),
    ])
    const inWeek = (t: string, type: string) => (w ?? []).filter(x => x.type === type && x.logged_at >= t).length
    const cnt = (type: string) => ({
      thisW: inWeek(wk, type),
      lastW: (w ?? []).filter(x => x.type === type && x.logged_at >= fortnight && x.logged_at < wk).length,
    })
    const calls = cnt('call'), demos = cnt('demo'), deals = cnt('deal')
    const all = parts ?? []
    const warm = all.filter(p => (p.temperature ?? 'cold') === 'warm')
    const stalled = all.filter(p => p.stage === 'proposal_sent' || p.stage === 'contract_signed').length
    const closeRate = (arr: any[]) => arr.length ? Math.round(arr.filter(p => p.stage === 'opportunity_won').length / arr.length * 100) : 0
    setAutoWins(deriveAutoWins({
      callsThisWeek: calls.thisW, callsLastWeek: calls.lastW,
      demosThisWeek: demos.thisW, demosLastWeek: demos.lastW,
      dealsThisWeek: deals.thisW, dealsLastWeek: deals.lastW,
      dealsThisMonth: up?.deals_this_month ?? 0,
      monthlyDealGoal: g?.monthly_deal_goal ?? null,
      closeRateWarm: closeRate(warm), closeRateOverall: closeRate(all),
      streak: up?.current_streak ?? 0,
      modulesDone: 0, modulesTotal: 0,
      stalledPartners: stalled,
    }, monthPaceFraction(now)))
  }

  // Local (not UTC) date key so "today" matches the rep's calendar day.
  const localToday = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  // Confirm today's shift from Home. Optionally make it the daily default so the
  // prompt never reappears (still adjustable on Time Blocking).
  const confirmShift = async (start: string) => {
    if (!userId || savingShift) return
    setSavingShift(true)
    const next = { ...settings, shift: start, shiftConfirmedDate: localToday(), shiftDefault: useEveryDay }
    setSettings(next)
    setShift(start)
    await supabase.from('users').update({ settings: next }).eq('id', userId)
    setSavingShift(false)
  }

  // Complete a task inline from Home.
  const completeTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    await supabase.from('tasks').update({ done: true, updated_at: new Date().toISOString() }).eq('id', id)
  }

  // Complete a habit inline from Home — the daily core loop, 1 tap from landing.
  const completeHabit = async (habitId: string, habitLabel: string) => {
    if (!userId || completing) return
    setCompleting(habitId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { error } = await supabase.from('habit_logs').insert({
        user_id: userId, habit_id: habitId, date: new Date().toISOString().split('T')[0],
      })
      if (error) return // duplicate = already done
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/calculate-xp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'habit_complete', user_id: userId, habit_id: habitId }),
      })
      if (res.ok) {
        const { xp_earned } = await res.json()
        toast.xp(xp_earned ?? 0, `"${habitLabel}" done!`)
        await Promise.all([refreshHabits(), refreshProgress()])
      }
    } finally { setCompleting(null) }
  }
  const openHabits = habits.filter(h => !h.completed_today)

  const belt = progress?.belt_rank ?? 'white'
  const style = BELT_STYLES[belt] ?? BELT_STYLES.white
  const isBlack = belt === 'black'
  const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }
  const userRank = leaderboard.findIndex(l => l.user_id === userId) + 1
  const rhythm = shift ? currentBlock(shift) : null

  // Shift prompt shows at the very top until the rep sets today's shift — unless
  // they've made a shift their daily default (then it's applied automatically).
  const hasDefault = !!settings.shiftDefault && !!settings.shift
  const needsShift = !hasDefault && settings.shiftConfirmedDate !== localToday()

  // Proactive, block-aware coaching nudge for the active time block.
  const nudge = (() => {
    if (rhythm?.status !== 'active') return null
    const t = rhythm.block?.type
    if (t === 'focus') return stuck > 0
      ? `${stuck} partner${stuck > 1 ? 's' : ''} awaiting a next step — push them forward this block.`
      : 'Power block — live conversations only, no admin.'
    if (t === 'plan') return stuck > 0
      ? `Plan first: ${stuck} partner${stuck > 1 ? 's' : ''} need follow-up today.`
      : 'Set your top 3 and clear your tasks before calls start.'
    if (t === 'admin') return 'Batch CRM hygiene and advance your onboarding checklists.'
    return null
  })()

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-36 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  )

  return (
    <div className="space-y-4 stagger-rise">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm text-gray">{greeting()},</p>
          <h1 className="text-h1 text-dark-text">{userName || 'BDR'}</h1>
        </div>
        <Link href="/notifications" className="relative p-2" aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}>
          <svg className={cn('h-6 w-6', unread > 0 ? 'text-navy animate-ring' : 'text-gray')} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[9px] font-[800] text-white">{unread > 9 ? '9+' : unread}</span>
          )}
        </Link>
      </div>

      {/* Shift first — the very first thing each day, until it's set (or defaulted) */}
      {needsShift && (
        <Card className="border-teal/40 !p-4">
          <div className="mb-1 flex items-center gap-2">
            <ClockIcon size={16} className="text-teal" />
            <span className="text-[15px] font-[800] text-dark-text">Start your day — pick today&apos;s shift</span>
          </div>
          <p className="mb-3 text-[12px] text-gray">This sets up your time-blocked day and your &quot;Right now&quot; coaching. Takes one tap.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SHIFT_OPTIONS.map(o => (
              <button key={o.start} onClick={() => confirmShift(o.start)} disabled={savingShift}
                className={cn('flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-[13px] font-[700] transition-all',
                  shift === o.start ? 'border-navy bg-navy text-white' : 'border-border bg-bdrbg text-mid-text hover:border-navy/40')}>
                {shift === o.start && <CheckIcon size={14} />}{fmtShift(o)}
              </button>
            ))}
          </div>
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-[12px] font-[600] text-mid-text">
            <input type="checkbox" checked={useEveryDay} onChange={e => setUseEveryDay(e.target.checked)} className="h-4 w-4 rounded border-border accent-teal" />
            Use this shift every day (you can still adjust it anytime)
          </label>
        </Card>
      )}

      {/* Belt + next move — your rank and your next step, together */}
      <div data-tour="home-belt" className="overflow-hidden rounded-2xl shadow-card">
        <div className={cn('p-5', style.bg)}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className={cn('text-label mb-1', isBlack ? 'text-white/60' : 'text-gray')}>{style.label}</div>
              <div className={cn('text-h1 font-bold', isBlack ? 'text-white' : 'text-dark-text')}>Day {progress?.belt_day ?? 0}</div>
            </div>
            <Belt3D belt={belt} size={60} className="drop-shadow-sm animate-bob" />
          </div>
          {progress?.nextBelt && (
            <div className="mb-3">
              <div className="flex justify-between mb-2">
                <span className={cn('text-xs font-medium', isBlack ? 'text-white/70' : 'text-gray')}>
                  To {progress.nextBelt.charAt(0).toUpperCase() + progress.nextBelt.slice(1)} Belt
                </span>
                <span className={cn('text-xs', isBlack ? 'text-white/50' : 'text-gray')}>
                  {pluralize(progress.daysUntilNextBelt ?? 0, 'day')} left
                </span>
              </div>
              <ProgressBar value={progress.beltProgressPercent} max={100} color={style.bar} className="h-2" />
            </div>
          )}
          <div className="flex items-center gap-4 pt-2 border-t border-black/10">
            <div className="flex items-center gap-1.5">
              <XpIcon className={cn('w-4 h-4', isBlack ? 'text-gold' : 'text-navy')} />
              <span className={cn('text-sm font-semibold', isBlack ? 'text-white' : 'text-dark-text')}>{formatXP(progress?.total_xp ?? 0)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FlameIcon className="w-4 h-4 text-orange-500" />
              <span className={cn('text-sm font-medium', isBlack ? 'text-white/80' : 'text-mid-text')}>{progress?.current_streak ?? 0} day streak</span>
            </div>
            {progress?.streakStatus === 'at-risk' && <Badge variant="gold" className="ml-auto text-xs">Streak at risk!</Badge>}
          </div>
        </div>

        {/* Next move — paired with the belt so rank and progress live together */}
        {nextStep && nextStep.type !== 'done' && (
          <Link href={nextStep.href} data-tour="home-path" className="flex items-center gap-3 bg-gradient-hero px-5 py-3.5 text-white transition-transform active:scale-[0.99]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15"><LightningIcon size={20} className="text-white" /></div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-[800] uppercase tracking-wide text-white/70">Next up · Module {nextStep.moduleOrder}</div>
              <div className="truncate text-[15px] font-[800]">{nextStep.type === 'quiz' ? `${nextStep.moduleTitle} Quiz` : nextStep.title}</div>
            </div>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 text-[12px] font-[800]">{nextStep.type === 'quiz' ? 'Start' : 'Continue'} <ArrowRightIcon size={14} /></span>
          </Link>
        )}
        {nextStep?.type === 'done' && (
          <Link href="/certificate" data-tour="home-path" className="flex items-center gap-3 bg-gradient-hero px-5 py-3.5 text-white transition-transform active:scale-[0.99]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15"><TrophyIcon size={20} className="text-white" /></div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-[800] uppercase tracking-wide text-white/70">Curriculum complete 🎓</div>
              <div className="truncate text-[15px] font-[800]">Claim your certificate</div>
            </div>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 text-[12px] font-[800]">Open <ArrowRightIcon size={14} /></span>
          </Link>
        )}
      </div>

      {/* AI Coach — auto-detected wins & insights, each tappable to coach on it */}
      {autoWins.length > 0 && (
        <Card data-tour="home-wins" className="!p-3">
          <div className="mb-2 flex items-center gap-2">
            <LightningIcon size={15} className="text-teal" />
            <span className="text-label text-teal">Your coach sees</span>
            <Link href="/coach" className="ml-auto text-[12px] font-[700] text-navy">More →</Link>
          </div>
          <div className="space-y-1.5">
            {autoWins.slice(0, 3).map(wn => (
              <button key={wn.id} onClick={() => askCoach(`Coach me on this: ${wn.title}. ${wn.detail} What exactly should I do next?`)}
                className="flex w-full items-start gap-2.5 rounded-lg border border-border bg-bdrbg p-2.5 text-left transition-colors hover:border-teal/50 hover:bg-teal/5">
                <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', wn.tone === 'win' ? 'bg-success' : wn.tone === 'pace' ? 'bg-navy' : 'bg-gold')} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-[700] leading-snug text-dark-text">{wn.title}</div>
                  <div className="text-[12px] leading-snug text-gray">{wn.detail}</div>
                </div>
                <span className="mt-0.5 shrink-0 text-[11px] font-[700] text-teal">Coach me →</span>
              </button>
            ))}
          </div>
          <button onClick={() => askCoach("Give me my game plan for today: where I stand against my monthly goal, my single biggest opportunity right now, and the top 3 specific actions that move my number most. Use my real data and be concrete.")}
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-hero py-2.5 text-[13px] font-[800] text-white transition-transform active:scale-[0.99]">
            <LightningIcon size={14} className="text-white" /> Get today&apos;s game plan
          </button>
        </Card>
      )}

      {/* Right now — current time block from the rep's Daily Rhythm */}
      {rhythm?.status === 'active' ? (
        <Link href={rhythm.block.href ?? '/schedule'}>
          <Card hover data-tour="home-rhythm" className="flex items-center gap-3 border-teal/40 !p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal/10 text-teal"><ClockIcon size={18} /></div>
            <div className="min-w-0 flex-1">
              <div className="label text-teal">Right now · until {fmtClock(rhythm.endsAt)}</div>
              <div className="truncate text-[14px] font-[700] text-dark-text">{rhythm.block.label}</div>
              {nudge && <div className="mt-0.5 flex items-center gap-1 text-[11px] text-mid-text"><LightningIcon size={11} className="text-gold shrink-0" /><span className="line-clamp-2">{nudge}</span></div>}
            </div>
            <span className="shrink-0 text-[12px] font-[700] text-teal">{rhythm.block.cta ?? 'Open'} →</span>
          </Card>
        </Link>
      ) : (
        <Link href="/schedule">
          <Card hover data-tour="home-rhythm" className="flex items-center gap-3 !p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy"><ClockIcon size={18} /></div>
            <div className="min-w-0 flex-1">
              {!shift ? (
                <><div className="text-[14px] font-[700] text-dark-text">Set your shift</div><div className="text-[12px] text-gray">Pick your hours for a time-blocked day</div></>
              ) : (
                <><div className="label text-gray">Time Blocking</div><div className="text-[14px] font-[700] text-dark-text">{rhythm?.status === 'before' ? `Your day starts at ${fmtClock(rhythm.startsAt)}` : 'Shift complete — nice work'}</div></>
              )}
            </div>
            <span className="shrink-0 text-[12px] font-[700] text-teal">{!shift ? 'Set up' : 'View'} →</span>
          </Card>
        </Link>
      )}

      {/* Today Summary */}
      <Card data-tour="home-today">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-h3 text-dark-text">Today</h2>
          <Link href="/today" className="text-sm text-navy font-medium flex items-center gap-1">View all<ArrowRightIcon className="w-4 h-4" /></Link>
        </div>

        {/* Tasks — surfaced from the task manager, completable inline */}
        <div className="mb-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="label">My tasks</span>
            <Link href="/tasks" className="text-[12px] font-[700] text-navy">{tasks.length > 0 ? 'All tasks →' : 'Add tasks →'}</Link>
          </div>
          {tasks.length === 0 ? (
            <Link href="/tasks" className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-bdrbg p-3 text-left transition-colors hover:border-navy/40">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-border text-gray"><PlusIcon className="h-3.5 w-3.5" /></span>
              <span className="flex-1 text-sm font-medium text-mid-text">Add your first task</span>
            </Link>
          ) : (
            <div className="space-y-2">
              {tasks.map(t => (
                <div key={t.id} className="flex items-center gap-3 rounded-xl border border-border bg-bdrbg p-3">
                  <button onClick={() => completeTask(t.id)} aria-label="Complete task"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-border transition-colors hover:border-teal hover:bg-teal/10">
                    <CheckIcon className="h-3 w-3 text-transparent" />
                  </button>
                  <span className="flex-1 truncate text-sm font-medium text-dark-text">{t.title}</span>
                  {t.priority && <StarFilledIcon className="h-4 w-4 shrink-0 text-gold" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inline habit completion — tap to knock out the daily core loop here */}
        {openHabits.length > 0 && (
          <div className="mb-3 space-y-2">
            {openHabits.slice(0, 3).map(habit => (
              <button key={habit.id}
                onClick={() => completeHabit(habit.id, habit.label)}
                disabled={completing === habit.id}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-bdrbg p-3 text-left transition-all hover:border-teal/50 hover:bg-teal/5 active:scale-[0.98]">
                <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
                  completing === habit.id ? 'border-teal animate-pulse' : 'border-border')}>
                  <CheckIcon className="h-3 w-3 text-transparent" />
                </span>
                <span className="flex-1 text-sm font-medium text-dark-text">{habit.label}</span>
                <span className="flex items-center gap-1 text-xs text-gray"><XpIcon className="h-3 w-3" />+5</span>
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <ChecklistIcon className="text-teal" />, label: 'Habits', value: `${progress?.todayStats.habitsCompleted ?? 0}/${progress?.todayStats.habitsTotal ?? 0}`, done: (progress?.todayStats.habitsCompleted ?? 0) >= (progress?.todayStats.habitsTotal ?? 1) },
            { icon: <PhoneIcon className="text-navy" />, label: 'Calls', value: String(progress?.todayStats.callsLogged ?? 0), done: false },
            { icon: <LightningIcon className="text-gold" />, label: 'XP Today', value: formatXP(progress?.todayStats.xpEarnedToday ?? 0), done: false },
          ].map(s => (
            <div key={s.label} className={cn('p-3 rounded-xl border text-center', s.done ? 'border-teal/30 bg-teal/5' : 'border-border bg-bdrbg')}>
              <div className="flex justify-center mb-1">{s.icon}</div>
              <div className="text-sm font-bold text-dark-text">{s.value}</div>
              <div className="text-xs text-gray">{s.label}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Quick actions — a featured AI-forward Coach button + distinct action tiles */}
      <div className="space-y-3">
        <Link href="/coach" className="block">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-hero p-4 shadow-card transition-transform active:scale-[0.99]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15"><CoachIcon size={22} className="text-white" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[15px] font-[800] text-white">Ask your AI Coach</span>
                  <LightningIcon size={14} className="text-white/80" />
                </div>
                <div className="text-[12px] text-white/75">Personalized tips on hitting your number</div>
              </div>
              <ArrowRightIcon size={18} className="shrink-0 text-white/80" />
            </div>
          </div>
        </Link>

        <div className="grid grid-cols-2 gap-3">
          {[
            { href: '/partners',        Icon: HandshakeIcon, label: 'Partners',        sub: 'Work your pipeline', tint: 'bg-teal/10 text-teal',       accent: '#00C2B2' },
            { href: '/train',           Icon: BookIcon,      label: 'Learning Center', sub: 'Continue learning',  tint: 'bg-navy/10 text-navy',       accent: '#003087' },
            { href: '/wins?action=new', Icon: TrophyIcon,    label: 'Log a Win',       sub: 'Call · Demo · Deal', tint: 'bg-gold/10 text-gold',       accent: '#CA8A04' },
            { href: '/calculator',      Icon: CoinIcon,      label: 'Income Calc',     sub: 'Plan your goal',     tint: 'bg-success/10 text-success', accent: '#16A34A' },
          ].map(a => (
            <Link key={a.href} href={a.href}
              className="flex items-center gap-3 rounded-xl border border-l-4 border-border bg-card p-3 shadow-card transition-transform active:scale-95"
              style={{ borderLeftColor: a.accent }}>
              <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', a.tint)}><a.Icon size={18} /></div>
              <div className="min-w-0">
                <div className="text-[13px] font-[800] leading-tight text-dark-text">{a.label}</div>
                <div className="text-[11px] leading-tight text-gray">{a.sub}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Leaderboard preview */}
      {leaderboard.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-h3 text-dark-text">Leaderboard</h2>
            <Link href="/leaderboard" className="text-sm text-navy font-medium flex items-center gap-1">Full board<ArrowRightIcon className="w-4 h-4" /></Link>
          </div>
          {userRank > 0 && (
            <div className="mb-3 px-3 py-2 bg-teal/10 rounded-xl flex items-center gap-2">
              <TrophyIcon className="w-4 h-4 text-teal" />
              <span className="text-sm text-teal font-medium">You&apos;re ranked #{userRank}</span>
            </div>
          )}
          <div className="space-y-2">
            {leaderboard.slice(0, 3).map((entry, i) => (
              <div key={entry.user_id}
                className={cn('flex items-center gap-3 px-3 py-2 rounded-xl', entry.user_id === userId ? 'bg-navy/5 border border-navy/10' : 'bg-bdrbg')}>
                <span className={cn('w-6 text-sm font-bold text-center', i === 0 ? 'text-gold' : 'text-gray')}>{i + 1}</span>
                <span className="flex-1 text-sm font-medium text-dark-text truncate">{entry.name}</span>
                <span className="text-xs text-gray">{formatXP(entry.total_xp)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <p className="text-center text-[11px] text-gray pt-2">
        BDR Hub · Version 2.0.0
      </p>

      <Tour tourKey="home" steps={HOME_TOUR} />
    </div>
  )
}
