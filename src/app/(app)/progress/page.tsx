// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, Button, Badge, SkeletonCard } from '@/components/ui'
import { MedalIcon, LockIcon, BookIcon, DownloadIcon, BeltIcon, FlameIcon, XpIcon, PhoneIcon, TargetIcon, HandshakeIcon, TrophyIcon } from '@/components/icons'
import { cn, formatXP } from '@/lib/utils'
import { BELTS, normalizeBelt, beltIndex } from '@/lib/belts'
import { computeAchievements, TIER_COLOR } from '@/lib/achievements'
import { passedModuleSet, isModuleComplete } from '@/lib/moduleProgress'
import { LearnTabs } from '@/components/LearnTabs'
import Link from 'next/link'

// Progress = your personal development hub: belt journey, completion certificate,
// and a snapshot of XP/streak. (Leaderboard stays separate — that's social/
// comparative; this is about tracking yourself.)
export default function ProgressPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{ name: string; completed: number; total: number; xp: number; streak: number; belt: string } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      load(user.id)
    })
  }, [])

  const load = async (uid: string) => {
    const [{ data: u }, { data: mods }, { data: prog }, { data: attempts }] = await Promise.all([
      supabase.from('users').select('name').eq('id', uid).single(),
      supabase.from('modules').select('id, order_index, lessons(id)').eq('is_published', true),
      supabase.from('user_progress').select('completed_lessons, total_xp, current_streak, belt_rank, total_calls, total_demos, total_deals, longest_streak').eq('user_id', uid).single(),
      supabase.from('quiz_attempts').select('module_id, percentage').eq('user_id', uid),
    ])
    const done = new Set<string>(prog?.completed_lessons ?? [])
    const passed = passedModuleSet(attempts ?? [])
    const completed = (mods ?? []).filter(m => isModuleComplete((m.lessons ?? []).map(l => l.id), done, passed, m.id)).length
    setData({
      name: u?.name ?? 'BDR',
      completed, total: (mods ?? []).length,
      xp: prog?.total_xp ?? 0,
      streak: prog?.current_streak ?? 0,
      belt: prog?.belt_rank ?? 'White Belt',
      stats: {
        total_calls: prog?.total_calls ?? 0, total_demos: prog?.total_demos ?? 0, total_deals: prog?.total_deals ?? 0,
        current_streak: prog?.current_streak ?? 0, longest_streak: prog?.longest_streak ?? 0, total_xp: prog?.total_xp ?? 0,
      },
    })
    setLoading(false)
  }

  if (loading) return <div className="space-y-4"><SkeletonCard /></div>
  const earned = data.completed >= data.total && data.total > 0
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const beltKey = normalizeBelt(data.belt)
  const currentIdx = beltIndex(beltKey)
  const beltLabel = BELTS[currentIdx]?.label ?? 'White'

  return (
    <div className="space-y-5 pb-4 stagger-rise">
      <LearnTabs />
      <div className="flex items-start justify-between gap-3 no-print">
        <div>
          <h1 className="text-h1 text-dark-text">Progress</h1>
          <p className="mt-0.5 text-[13px] text-gray">Your belt journey, certificate, and stats — all in one place.</p>
        </div>
        {earned && (
          <Button size="sm" onClick={() => window.print()} icon={<DownloadIcon size={16} />}>Print / Save</Button>
        )}
      </div>

      {/* Personal snapshot */}
      <div data-tour="progress-snapshot" className="grid grid-cols-3 gap-2 no-print">
        <Card className="!p-3 text-center">
          <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: BELTS[currentIdx]?.color }}>
            <BeltIcon size={16} className="text-white" />
          </div>
          <div className="text-[15px] font-[800] text-dark-text">{beltLabel}</div>
          <div className="text-[11px] text-gray">Belt</div>
        </Card>
        <Card className="!p-3 text-center">
          <XpIcon size={20} className="mx-auto mb-1 text-gold" />
          <div className="text-[15px] font-[800] text-dark-text tabular-nums">{formatXP(data.xp).replace(' XP', '')}</div>
          <div className="text-[11px] text-gray">Total XP</div>
        </Card>
        <Card className="!p-3 text-center">
          <FlameIcon size={20} className="mx-auto mb-1 text-orange-500" />
          <div className="text-[15px] font-[800] text-dark-text tabular-nums">{data.streak}</div>
          <div className="text-[11px] text-gray">Day streak</div>
        </Card>
      </div>

      {!earned ? (
        <Card className="text-center !py-10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-bdrbg text-gray">
            <LockIcon size={28} />
          </div>
          <h2 className="text-h3 text-dark-text">{data.completed} of {data.total} modules complete</h2>
          <p className="mx-auto mt-1 max-w-[300px] text-[13px] text-gray">
            Complete every module and pass its quiz to unlock your ConsumerDirect BDR certificate.
          </p>
          <Link href="/train" className="mt-5 inline-block">
            <Button variant="conversion" icon={<BookIcon size={18} />} iconPosition="right">Keep learning</Button>
          </Link>
        </Card>
      ) : (
        // ── The certificate ──────────────────────────────────────────────────
        <div className="certificate rounded-2xl bg-gradient-to-br from-navy via-navy to-navy-dark p-1.5 shadow-modal">
          <div className="rounded-xl bg-card px-6 py-10 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/consumerdirect-mark.svg" alt="ConsumerDirect" className="mx-auto mb-4 h-12 w-12" />
            <div className="label text-teal">ConsumerDirect</div>
            <div className="mt-1 text-[11px] font-[700] uppercase tracking-[0.2em] text-gray">Certificate of Completion</div>

            <div className="my-6">
              <p className="text-[13px] text-gray">This certifies that</p>
              <p className="mt-1 text-[28px] font-[900] text-dark-text">{data.name}</p>
              <p className="mx-auto mt-2 max-w-[360px] text-[13px] leading-relaxed text-mid-text">
                has successfully completed the <span className="font-[700] text-dark-text">BDR Hub Onboarding Program</span> —
                all {data.total} modules and qualifying assessments.
              </p>
            </div>

            <div className="mx-auto mb-6 flex max-w-[320px] items-center justify-center gap-6">
              <div className="text-center">
                <div className="text-[20px] font-[800] text-dark-text">{data.total}</div>
                <div className="text-[11px] text-gray">Modules</div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <div className="text-[20px] font-[800] text-dark-text">{formatXP(data.xp).replace(' XP', '')}</div>
                <div className="text-[11px] text-gray">XP earned</div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <div className="text-[20px] font-[800] text-dark-text">{beltLabel}</div>
                <div className="text-[11px] text-gray">Belt</div>
              </div>
            </div>

            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-gold text-white shadow-button">
              <MedalIcon size={32} />
            </div>

            <div className="mx-auto flex max-w-[360px] items-end justify-between gap-6">
              <div className="flex-1 border-t border-border pt-1 text-left">
                <div className="text-[12px] font-[700] text-dark-text">Ryan Fleming</div>
                <div className="text-[10px] text-gray">Sales Manager</div>
              </div>
              <div className="flex-1 border-t border-border pt-1 text-right">
                <div className="text-[12px] font-[700] text-dark-text">{today}</div>
                <div className="text-[10px] text-gray">Date completed</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Achievement wall */}
      <AchievementWall stats={data.stats} />

      {/* Belt journey — your development ladder */}
      <Card className="no-print">
        <h2 className="text-h3 text-dark-text">Belt Journey</h2>
        <div className="mt-4 space-y-3">
          {BELTS.map((belt, i) => {
            const reached = i <= currentIdx
            const isCurrent = i === currentIdx
            return (
              <div key={belt.key} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: reached ? belt.color : '#E4ECF2' }}>
                  <BeltIcon size={16} className={reached ? 'text-white' : 'text-gray'} />
                </div>
                <div className="flex-1">
                  <span className={cn('text-sm font-[700]', reached ? 'text-dark-text' : 'text-gray')}>{belt.label} Belt</span>
                  <span className="ml-2 text-xs text-gray">day {belt.day}+</span>
                </div>
                {isCurrent && <Badge variant="teal">You are here</Badge>}
                {reached && !isCurrent && <Badge variant="gray">Earned</Badge>}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

const ACH_ICON: Record<string, any> = { phone: PhoneIcon, target: TargetIcon, handshake: HandshakeIcon, trophy: TrophyIcon, flame: FlameIcon, xp: XpIcon }

function AchievementWall({ stats }: { stats: any }) {
  const badges = computeAchievements(stats)
  const earnedCount = badges.filter(b => b.earned).length
  return (
    <Card className="no-print">
      <div className="flex items-center justify-between">
        <h2 className="text-h3 text-dark-text">Achievements</h2>
        <span className="text-[12px] font-[800] text-gray tabular-nums">{earnedCount}/{badges.length}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {badges.map(b => {
          const Icon = ACH_ICON[b.icon] || TrophyIcon
          const color = TIER_COLOR[b.tier]
          return (
            <div key={b.id} title={b.desc}
              className={cn('flex flex-col items-center gap-1 rounded-xl border p-2.5 text-center transition-all',
                b.earned ? 'border-border bg-card' : 'border-dashed border-border bg-bdrbg/50')}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: b.earned ? color : 'rgb(var(--border))', opacity: b.earned ? 1 : 0.5 }}>
                {b.earned ? <Icon size={18} className="text-white" /> : <LockIcon size={15} className="text-gray" />}
              </span>
              <div className={cn('text-[11px] font-[800] leading-tight', b.earned ? 'text-dark-text' : 'text-gray')}>{b.label}</div>
              {!b.earned && (
                <div className="mt-0.5 w-full">
                  <div className="h-1 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-navy-mid" style={{ width: `${b.pct}%` }} /></div>
                  <div className="mt-0.5 text-[9px] font-[700] tabular-nums text-gray">{b.have}/{b.need}</div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
