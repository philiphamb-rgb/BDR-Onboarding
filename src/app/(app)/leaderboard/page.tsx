// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, Badge, SkeletonList, Avatar } from '@/components/ui'
import { TrophyIcon, MedalIcon } from '@/components/icons'
import { cn, formatXP } from '@/lib/utils'
import { BELT_DOT, beltFromDays } from '@/lib/belts'

interface Leader { user_id: string; name: string; belt: string; total_xp: number; streak: number }

export default function LeaderboardPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string>()
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [streakLeaders, setStreakLeaders] = useState<Leader[]>([])
  const [tab, setTab] = useState<'xp' | 'streak'>('xp')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUserId(user.id); fetchLeaders() }
    })
  }, [])

  const mapRow = (r: any) => ({
    user_id: r.user_id,
    name: r.users?.name ?? '—',
    avatar_url: r.users?.avatar_url ?? null,
    belt: beltFromDays(r.belt_day ?? 0),
    total_xp: r.total_xp ?? 0,
    streak: r.current_streak ?? 0,
  })

  const fetchLeaders = async () => {
    const cols = 'user_id, total_xp, current_streak, belt_day, users!inner(name, avatar_url)'
    // Fetch each board with its OWN ordering — the Streak board must be the top
    // streaks, not the top-XP set re-sorted (which hides high-streak/low-XP reps).
    const [{ data: byXp }, { data: byStreak }] = await Promise.all([
      supabase.from('user_progress').select(cols).order('total_xp', { ascending: false }).limit(20),
      supabase.from('user_progress').select(cols).order('current_streak', { ascending: false }).limit(20),
    ])
    setLeaders((byXp ?? []).map(mapRow))
    setStreakLeaders((byStreak ?? []).map(mapRow))
    setLoading(false)
  }

  const sorted = tab === 'xp'
    ? [...leaders].sort((a, b) => b.total_xp - a.total_xp)
    : [...streakLeaders].sort((a, b) => b.streak - a.streak)
  const myRank = sorted.findIndex(l => l.user_id === userId) + 1

  return (
    <div className="space-y-4 stagger-rise">
      <div>
        <h1 className="text-h1 text-dark-text">Leaderboard</h1>
        {myRank > 0 && <p className="text-sm text-gray">Your rank: #{myRank}</p>}
      </div>

      <div className="flex gap-2 bg-bdrbg p-1 rounded-xl">
        {[{ key: 'xp', label: 'Total XP' }, { key: 'streak', label: 'Streak' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className={cn('flex-1 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t.key ? 'bg-card shadow text-navy' : 'text-gray')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Podium */}
      {!loading && sorted.length >= 3 && (
        <div className="flex items-end gap-2 justify-center mb-2">
          {[sorted[1], sorted[0], sorted[2]].map((entry, pos) => {
            const rank = pos === 0 ? 2 : pos === 1 ? 1 : 3
            const medalColors = ['text-gold', 'text-gray', 'text-orange-700']
            const heights = ['h-16', 'h-20', 'h-12']
            return (
              <div key={entry.user_id} className={cn('flex flex-col items-center flex-1 text-center', pos === 1 && 'order-2')}>
                <MedalIcon size={26} className={cn('mb-1', medalColors[rank - 1])} />
                <div className={cn('mx-auto mb-1 rounded-full', entry.user_id === userId && 'ring-2 ring-teal')}>
                  <Avatar src={entry.avatar_url} name={entry.name} size={40} />
                </div>
                <div className="text-xs font-medium text-dark-text truncate w-full">{entry.name.split(' ')[0]}</div>
                <div className={cn('w-full rounded-t-xl mt-1 flex items-center justify-center py-2',
                  rank === 1 ? 'bg-gold/20 h-20' : rank === 2 ? 'bg-bdrbg h-16' : 'bg-orange-50 h-12')}>
                  <span className="text-xs font-bold text-mid-text">
                    {tab === 'xp' ? formatXP(entry.total_xp) : `${entry.streak}d`}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {loading ? (
        <SkeletonList count={5} />
      ) : (
        <div className="space-y-2">
          {sorted.map((entry, idx) => (
            <Card key={entry.user_id} variant={entry.user_id === userId ? 'active' : 'default'} className="!p-3">
              <div className="flex items-center gap-3">
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                  idx === 0 ? 'bg-gold text-white' : idx === 1 ? 'bg-gray-400 text-white' : idx === 2 ? 'bg-orange-400 text-white' : 'bg-bdrbg text-gray')}>
                  {idx + 1}
                </div>
                <Avatar src={entry.avatar_url} name={entry.name} size={28} />
                <div className={cn('w-3 h-3 rounded-full flex-shrink-0', BELT_DOT[entry.belt])} />
                <span className={cn('flex-1 text-sm font-medium truncate', entry.user_id === userId ? 'text-navy font-bold' : 'text-dark-text')}>
                  {entry.name}{entry.user_id === userId ? ' (you)' : ''}
                </span>
                <div className="text-right">
                  <div className="text-sm font-bold text-dark-text">{tab === 'xp' ? formatXP(entry.total_xp) : `${entry.streak}d`}</div>
                  <div className="text-xs text-gray">{tab === 'xp' ? 'XP' : 'streak'}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
