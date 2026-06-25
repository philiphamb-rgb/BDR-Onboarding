// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, Badge } from '@/components/ui'
import { TrophyIcon } from '@/components/icons'
import { cn, formatXP } from '@/lib/utils'

interface Leader { user_id: string; name: string; belt: string; total_xp: number; streak: number }

const BELT_DOT: Record<string, string> = {
  white: 'bg-gray-300', yellow: 'bg-yellow-400', orange: 'bg-orange-500',
  green: 'bg-green-500', blue: 'bg-blue-600', purple: 'bg-purple-600', black: 'bg-gray-900',
}
function beltFromDays(d: number) {
  return d >= 90 ? 'black' : d >= 70 ? 'purple' : d >= 50 ? 'blue' : d >= 30 ? 'green' : d >= 14 ? 'orange' : d >= 7 ? 'yellow' : 'white'
}

export default function LeaderboardPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string>()
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [tab, setTab] = useState<'xp' | 'streak'>('xp')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUserId(user.id); fetchLeaders() }
    })
  }, [])

  const fetchLeaders = async () => {
    const { data } = await supabase
      .from('user_progress')
      .select('user_id, total_xp, current_streak, belt_day, users!inner(name)')
      .order('total_xp', { ascending: false })
      .limit(20)
    setLeaders((data ?? []).map((r: { user_id: string; total_xp: number; current_streak: number; belt_day: number; users: { name: string } }) => ({
      user_id: r.user_id,
      name: r.users?.name ?? '—',
      belt: beltFromDays(r.belt_day ?? 0),
      total_xp: r.total_xp ?? 0,
      streak: r.current_streak ?? 0,
    })))
    setLoading(false)
  }

  const sorted = [...leaders].sort((a, b) => tab === 'xp' ? b.total_xp - a.total_xp : b.streak - a.streak)
  const myRank = sorted.findIndex(l => l.user_id === userId) + 1

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-h1 text-gray-900">Leaderboard</h1>
        {myRank > 0 && <p className="text-sm text-gray-500">Your rank: #{myRank}</p>}
      </div>

      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
        {[{ key: 'xp', label: 'Total XP' }, { key: 'streak', label: 'Streak' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className={cn('flex-1 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t.key ? 'bg-white shadow text-navy' : 'text-gray-500')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Podium */}
      {!loading && sorted.length >= 3 && (
        <div className="flex items-end gap-2 justify-center mb-2">
          {[sorted[1], sorted[0], sorted[2]].map((entry, pos) => {
            const rank = pos === 0 ? 2 : pos === 1 ? 1 : 3
            const medals = ['🥇', '🥈', '🥉']
            const heights = ['h-16', 'h-20', 'h-12']
            return (
              <div key={entry.user_id} className={cn('flex flex-col items-center flex-1 text-center', pos === 1 && 'order-2')}>
                <span className="text-2xl mb-1">{medals[rank - 1]}</span>
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white mx-auto mb-1', entry.user_id === userId ? 'bg-teal' : 'bg-navy')}>
                  {entry.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="text-xs font-medium text-gray-900 truncate w-full">{entry.name.split(' ')[0]}</div>
                <div className={cn('w-full rounded-t-xl mt-1 flex items-center justify-center py-2',
                  rank === 1 ? 'bg-gold/20 h-20' : rank === 2 ? 'bg-gray-100 h-16' : 'bg-orange-50 h-12')}>
                  <span className="text-xs font-bold text-gray-700">
                    {tab === 'xp' ? formatXP(entry.total_xp) : `${entry.streak}d`}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-gray-200 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-2">
          {sorted.map((entry, idx) => (
            <Card key={entry.user_id} variant={entry.user_id === userId ? 'active' : 'default'} className="!p-3">
              <div className="flex items-center gap-3">
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold',
                  idx === 0 ? 'bg-gold text-white' : idx === 1 ? 'bg-gray-400 text-white' : idx === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-600')}>
                  {idx + 1}
                </div>
                <div className={cn('w-3 h-3 rounded-full flex-shrink-0', BELT_DOT[entry.belt])} />
                <span className={cn('flex-1 text-sm font-medium truncate', entry.user_id === userId ? 'text-navy font-bold' : 'text-gray-900')}>
                  {entry.name}{entry.user_id === userId ? ' (you)' : ''}
                </span>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900">{tab === 'xp' ? formatXP(entry.total_xp) : `${entry.streak}d`}</div>
                  <div className="text-xs text-gray-400">{tab === 'xp' ? 'XP' : 'streak'}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
