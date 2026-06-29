// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProgress } from '@/lib/hooks/useProgress'
import { Card, ProgressBar, Badge, Skeleton, Button } from '@/components/ui'
import { FlameIcon, TrophyIcon, XpIcon, BeltIcon, ChartRisingIcon, PhoneIcon, ChecklistIcon, TargetIcon, ArrowRightIcon, LightningIcon, BookIcon, CoachIcon, HandshakeIcon, ClockIcon } from '@/components/icons'
import { cn, formatXP, pluralize } from '@/lib/utils'
import { currentBlock, fmtClock } from '@/lib/schedule'
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
  const { progress, loading } = useProgress(userId)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      fetchNextStep(user.id)
      supabase.from('users').select('name, settings').eq('id', user.id).single().then(({ data }) => {
        if (data?.name) setUserName(data.name.split(' ')[0])
        if (data?.settings?.shift) setShift(data.settings.shift)
      })
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

  const belt = progress?.belt_rank ?? 'white'
  const style = BELT_STYLES[belt] ?? BELT_STYLES.white
  const isBlack = belt === 'black'
  const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }
  const userRank = leaderboard.findIndex(l => l.user_id === userId) + 1
  const rhythm = shift ? currentBlock(shift) : null

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-36 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm text-gray">{greeting()},</p>
          <h1 className="text-h1 text-dark-text">{userName || 'BDR'}</h1>
        </div>
        <Link href="/notifications" className="p-2 relative" aria-label="Notifications">
          <svg className="w-6 h-6 text-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </Link>
      </div>

      {/* Belt Card */}
      <div className={cn('rounded-2xl p-5 shadow-card', style.bg)}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className={cn('text-label mb-1', isBlack ? 'text-white/60' : 'text-gray')}>{style.label}</div>
            <div className={cn('text-h1 font-bold', isBlack ? 'text-white' : 'text-dark-text')}>Day {progress?.belt_day ?? 0}</div>
          </div>
          <BeltIcon className={cn('w-12 h-12', isBlack ? 'text-white/80' : 'text-gray')} />
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

      {/* Right now — current time block from the rep's Daily Rhythm */}
      {rhythm?.status === 'active' ? (
        <Link href={rhythm.block.href ?? '/schedule'}>
          <Card hover className="flex items-center gap-3 border-teal/40 !p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal/10 text-teal"><ClockIcon size={18} /></div>
            <div className="min-w-0 flex-1">
              <div className="label text-teal">Right now · until {fmtClock(rhythm.endsAt)}</div>
              <div className="truncate text-[14px] font-[700] text-dark-text">{rhythm.block.label}</div>
            </div>
            <span className="shrink-0 text-[12px] font-[700] text-teal">{rhythm.block.cta ?? 'Open'} →</span>
          </Card>
        </Link>
      ) : (
        <Link href="/schedule">
          <Card hover className="flex items-center gap-3 !p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy"><ClockIcon size={18} /></div>
            <div className="min-w-0 flex-1">
              {!shift ? (
                <><div className="text-[14px] font-[700] text-dark-text">Set your shift</div><div className="text-[12px] text-gray">Pick your hours for a time-blocked day</div></>
              ) : (
                <><div className="label text-gray">Daily Rhythm</div><div className="text-[14px] font-[700] text-dark-text">{rhythm?.status === 'before' ? `Your day starts at ${fmtClock(rhythm.startsAt)}` : 'Shift complete — nice work'}</div></>
              )}
            </div>
            <span className="shrink-0 text-[12px] font-[700] text-teal">{!shift ? 'Set up' : 'View'} →</span>
          </Card>
        </Link>
      )}

      {/* Continue your path — the single next best action */}
      {nextStep && (
        <Card variant={nextStep.type === 'done' ? 'completed' : 'active'}>
          <div className="flex items-center gap-2 mb-1">
            <LightningIcon size={15} className="text-teal" />
            <span className="text-label text-teal">{nextStep.type === 'done' ? 'Curriculum complete' : 'Continue your path'}</span>
          </div>
          {nextStep.type === 'done' ? (
            <>
              <p className="text-[14px] font-[700] text-dark-text">You've finished every module. Outstanding.</p>
              <p className="text-[12px] text-gray mt-0.5 mb-3">Claim your certificate, then keep your edge sharp in the Drill.</p>
              <div className="flex gap-2">
                <Link href="/certificate" className="flex-1"><Button variant="conversion" fullWidth icon={<TrophyIcon size={18} />} iconPosition="right">Certificate</Button></Link>
                <Link href="/drill" className="flex-1"><Button variant="ghost" fullWidth icon={<TargetIcon size={18} />} iconPosition="right">Drill</Button></Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-[12px] text-gray">Module {nextStep.moduleOrder} · {nextStep.moduleTitle}</p>
              <p className="text-[15px] font-[800] text-dark-text mt-0.5 mb-3">
                {nextStep.type === 'quiz' ? 'Take the ' : ''}{nextStep.title}
              </p>
              <Link href={nextStep.href}>
                <Button variant="conversion" fullWidth icon={<ArrowRightIcon size={18} />} iconPosition="right">
                  {nextStep.type === 'quiz' ? 'Start quiz' : 'Continue learning'}
                </Button>
              </Link>
            </>
          )}
        </Card>
      )}

      {/* Today Summary */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-h3 text-dark-text">Today</h2>
          <Link href="/today" className="text-sm text-navy font-medium flex items-center gap-1">View all<ArrowRightIcon className="w-4 h-4" /></Link>
        </div>
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

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { href: '/partners',        Icon: HandshakeIcon, label: 'Partners',  sub: 'Onboarding checklist',    gradient: 'from-teal to-navy' },
          { href: '/today',          Icon: ChecklistIcon, label: 'Check In',  sub: 'Log today\'s habits',     gradient: 'from-teal to-teal-dark' },
          { href: '/wins?action=new', Icon: TrophyIcon,    label: 'Log Win',   sub: 'Call · Demo · Deal',      gradient: 'from-navy to-navy-dark' },
          { href: '/train',           Icon: BookIcon,      label: 'Learning Center', sub: 'Continue learning',     gradient: 'from-purple-600 to-purple-800' },
          { href: '/coach',           Icon: CoachIcon,     label: 'Coach AI',  sub: 'Get personalized tips',   gradient: 'from-gold to-orange-500' },
        ].map(a => (
          <Link key={a.href} href={a.href}
            className={cn('bg-gradient-to-br rounded-2xl p-4 flex flex-col gap-2 shadow-card active:scale-95 transition-transform', a.gradient)}>
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center"><a.Icon size={18} className="text-white" /></div>
            <div>
              <div className="text-sm font-bold text-white">{a.label}</div>
              <div className="text-xs text-white/70">{a.sub}</div>
            </div>
          </Link>
        ))}
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
        BDR Onboarding Tool · Version 2.0.0
      </p>
    </div>
  )
}
