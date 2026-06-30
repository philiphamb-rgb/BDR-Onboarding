// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useProgress } from '@/lib/hooks/useProgress'
import { Card, CardTitle, ProgressBar, Badge, Skeleton } from '@/components/ui'
import {
  BeltIcon,
  FlameIcon,
  XpIcon,
  ChartRisingIcon,
  LightningIcon,
  TrainIcon,
  CoachIcon,
  ArrowRightIcon,
  MedalIcon,
  CoinIcon,
} from '@/components/icons'
import { cn, formatXP } from '@/lib/utils'
import { computePace, fmtMoney, PACE_LABEL } from '@/lib/goals'

const PACE_BADGE = { ahead: 'success', 'on-track': 'teal', behind: 'gold', 'no-data': 'gray' } as const

const BELTS = [
  { name: 'white', label: 'White', color: '#9CA3AF', day: 0 },
  { name: 'yellow', label: 'Yellow', color: '#FBBF24', day: 7 },
  { name: 'orange', label: 'Orange', color: '#F97316', day: 14 },
  { name: 'green', label: 'Green', color: '#22C55E', day: 30 },
  { name: 'blue', label: 'Blue', color: '#3B82F6', day: 50 },
  { name: 'purple', label: 'Purple', color: '#9333EA', day: 70 },
  { name: 'black', label: 'Black', color: '#111827', day: 90 },
]

export default function GrowPage() {
  const supabase = createClient()
  const router = useRouter()
  const [userId, setUserId] = useState<string>()
  const [goal, setGoal] = useState<{ pace: ReturnType<typeof computePace>; target: number } | null>(null)
  const { progress, loading } = useProgress(userId)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const now = new Date()
      const first = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      Promise.all([
        supabase.from('goals').select('target_income, commission_per_deal, close_rate, working_days')
          .eq('user_id', user.id).eq('is_active', true).maybeSingle(),
        supabase.from('wins').select('id').eq('user_id', user.id).eq('type', 'deal').gte('logged_at', first + 'T00:00:00'),
      ]).then(([{ data: g }, { data: deals }]) => {
        if (g && g.target_income > 0 && g.commission_per_deal > 0) {
          setGoal({ pace: computePace(g, deals?.length ?? 0, now), target: g.target_income })
        }
      })
    })
  }, [])

  const currentBelt = progress?.belt_rank ?? 'white'
  const currentIdx = Math.max(0, BELTS.findIndex((b) => b.name === currentBelt))
  const nextBelt = BELTS[currentIdx + 1] ?? null

  const insight = (() => {
    if (!progress) return 'Loading your growth path…'
    if ((progress.current_streak ?? 0) === 0)
      return 'Start a streak today — consistency is the #1 predictor of ramp speed. Log one activity to begin.'
    if (nextBelt && progress.daysUntilNextBelt != null)
      return `You're ${progress.daysUntilNextBelt} day${progress.daysUntilNextBelt === 1 ? '' : 's'} from your ${nextBelt.label} Belt. Keep your daily habits going to get there faster.`
    return 'You\'ve reached the top belt — focus on mentoring teammates and sharpening advanced skills.'
  })()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-h1 text-dark-text">Grow</h1>
        <p className="text-sm text-gray mt-1">Your development journey from new rep to top performer.</p>
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : (
        <>
          {/* AI insight */}
          <Card className="bg-gradient-hero text-white">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                <LightningIcon size={20} className="text-white" />
              </div>
              <div>
                <div className="text-[11px] font-[800] uppercase tracking-[0.08em] text-white/70 mb-1">
                  AI Insight
                </div>
                <p className="text-sm leading-relaxed">{insight}</p>
              </div>
            </div>
          </Card>

          {/* Commission pace */}
          {goal ? (
            <Link href="/goals">
              <Card hover>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CoinIcon size={18} className="text-navy" />
                    <CardTitle>Commission Pace</CardTitle>
                  </div>
                  <Badge variant={PACE_BADGE[goal.pace.status]}>{PACE_LABEL[goal.pace.status]}</Badge>
                </div>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-h2 font-bold text-dark-text tabular-nums">{fmtMoney(goal.pace.earned)}</span>
                  <span className="text-sm text-gray">/ {fmtMoney(goal.target)} this month</span>
                </div>
                <ProgressBar value={Math.min(100, goal.pace.progressPct)} color="#00C2B2" />
                <div className="mt-1.5 flex justify-between text-[11px] text-gray">
                  <span>{Math.round(goal.pace.progressPct)}% of target</span>
                  <span>pace line {Math.round(goal.pace.expectedPct)}%</span>
                </div>
              </Card>
            </Link>
          ) : (
            <Link href="/goals">
              <Card hover className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy/10 text-navy shrink-0"><CoinIcon size={20} /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-[700] text-dark-text">Set a commission goal</div>
                  <div className="text-xs text-gray">Turn an income target into a daily activity plan.</div>
                </div>
                <ArrowRightIcon size={16} className="text-gray shrink-0" />
              </Card>
            </Link>
          )}

          {/* Belt journey */}
          <Card>
            <CardTitle>Belt Journey</CardTitle>
            <div className="mt-4 space-y-3">
              {BELTS.map((belt, i) => {
                const reached = i <= currentIdx
                const isCurrent = i === currentIdx
                return (
                  <div key={belt.name} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: reached ? belt.color : '#E4ECF2' }}
                    >
                      <BeltIcon size={16} className={reached ? 'text-white' : 'text-gray'} />
                    </div>
                    <div className="flex-1">
                      <span className={cn('text-sm font-[700]', reached ? 'text-dark-text' : 'text-gray')}>
                        {belt.label} Belt
                      </span>
                      <span className="text-xs text-gray ml-2">day {belt.day}+</span>
                    </div>
                    {isCurrent && <Badge variant="teal">You are here</Badge>}
                    {reached && !isCurrent && <Badge variant="gray">Earned</Badge>}
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="text-center">
              <XpIcon size={22} className="text-gold mx-auto mb-1" />
              <div className="text-h3 text-dark-text">{formatXP(progress?.total_xp ?? 0)}</div>
              <div className="text-[11px] text-gray uppercase tracking-wide">Total XP</div>
            </Card>
            <Card className="text-center">
              <FlameIcon size={22} className="text-orange-500 mx-auto mb-1" />
              <div className="text-h3 text-dark-text">{progress?.current_streak ?? 0}</div>
              <div className="text-[11px] text-gray uppercase tracking-wide">Day Streak</div>
            </Card>
            <Card className="text-center">
              <ChartRisingIcon size={22} className="text-teal mx-auto mb-1" />
              <div className="text-h3 text-dark-text">{progress?.belt_day ?? 0}</div>
              <div className="text-[11px] text-gray uppercase tracking-wide">Belt Day</div>
            </Card>
          </div>

          {/* Next belt progress */}
          {nextBelt && (
            <Card>
              <div className="flex items-center justify-between mb-2">
                <CardTitle>Next: {nextBelt.label} Belt</CardTitle>
                <span className="text-xs text-gray">{progress?.beltProgressPercent ?? 0}%</span>
              </div>
              <ProgressBar value={progress?.beltProgressPercent ?? 0} color={nextBelt.color} />
            </Card>
          )}

          {/* Certificate */}
          <Link href="/certificate">
            <Card className="flex items-center gap-3 hover:border-teal transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-gold text-white shrink-0">
                <MedalIcon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-[700] text-dark-text">Your Certificate</div>
                <div className="text-xs text-gray">Complete all modules to earn your BDR certificate.</div>
              </div>
              <ArrowRightIcon size={16} className="text-gray shrink-0" />
            </Card>
          </Link>

          {/* Keep growing */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/train">
              <Card className="hover:border-teal transition-colors h-full">
                <TrainIcon size={22} className="text-navy mb-2" />
                <div className="text-sm font-[700] text-dark-text flex items-center gap-1">
                  Keep training <ArrowRightIcon size={14} />
                </div>
                <p className="text-xs text-gray mt-1">Complete modules to earn XP and level up.</p>
              </Card>
            </Link>
            <Link href="/coach">
              <Card className="hover:border-teal transition-colors h-full">
                <CoachIcon size={22} className="text-navy mb-2" />
                <div className="text-sm font-[700] text-dark-text flex items-center gap-1">
                  Ask your Coach <ArrowRightIcon size={14} />
                </div>
                <p className="text-xs text-gray mt-1">Get AI guidance tailored to your goals.</p>
              </Card>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
