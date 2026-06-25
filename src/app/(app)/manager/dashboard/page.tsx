// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, Badge } from '@/components/ui'
import { TeamIcon, ChartRisingIcon } from '@/components/icons'
import { cn, formatXP } from '@/lib/utils'
import Link from 'next/link'

function beltFromDays(d: number) {
  return d >= 90 ? 'black' : d >= 70 ? 'purple' : d >= 50 ? 'blue' : d >= 30 ? 'green' : d >= 14 ? 'orange' : d >= 7 ? 'yellow' : 'white'
}
const BELT_DOT: Record<string, string> = {
  white:'bg-gray-300',yellow:'bg-yellow-400',orange:'bg-orange-500',
  green:'bg-green-500',blue:'bg-blue-600',purple:'bg-purple-600',black:'bg-gray-900'
}

export default function ManagerDashboardPage() {
  const supabase = createClient()
  const [team, setTeam] = useState<{ id: string; name: string; belt: string; total_xp: number; streak: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('users').select('team_id').eq('id', user.id).single().then(({ data }) => {
        if (!data?.team_id) { setLoading(false); return }
        supabase.from('users').select(`id, name, user_progress(total_xp, current_streak, belt_day)`)
          .eq('team_id', data.team_id).eq('role', 'rep').then(({ data: mems }) => {
            setTeam((mems ?? []).map((m: { id: string; name: string; user_progress: { total_xp: number; current_streak: number; belt_day: number }[] }) => {
              const p = m.user_progress?.[0] ?? {}
              return { id: m.id, name: m.name, belt: beltFromDays(p.belt_day ?? 0), total_xp: p.total_xp ?? 0, streak: p.current_streak ?? 0 }
            }))
            setLoading(false)
          })
      })
    })
  }, [])

  const avgXP = team.length ? Math.round(team.reduce((s, m) => s + m.total_xp, 0) / team.length) : 0
  const activeStreaks = team.filter(m => m.streak > 0).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-gray-900">Team Dashboard</h1>
        <Badge color="info">{team.length} reps</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Avg XP', value: formatXP(avgXP) },
          { label: 'Active Streaks', value: `${activeStreaks}/${team.length}` },
        ].map(s => (
          <Card key={s.label} className="!p-3">
            <div className="text-xs text-gray-500 mb-1">{s.label}</div>
            <div className="text-xl font-bold text-gray-900">{s.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/manager/team">
          <Card className="flex items-center gap-2 !p-3 hover:border-navy/30 transition-colors">
            <TeamIcon className="text-navy" /><span className="text-sm font-medium text-gray-900">Team View</span>
          </Card>
        </Link>
        <Link href="/manager/analytics">
          <Card className="flex items-center gap-2 !p-3 hover:border-navy/30 transition-colors">
            <ChartRisingIcon className="text-teal" /><span className="text-sm font-medium text-gray-900">Analytics</span>
          </Card>
        </Link>
      </div>

      <Card>
        <h2 className="text-h3 text-gray-900 mb-3">Your Team</h2>
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : team.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-500">No team members yet</div>
        ) : (
          <div className="space-y-2">
            {[...team].sort((a, b) => b.total_xp - a.total_xp).map((m, idx) => (
              <div key={m.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                <span className="w-6 text-center text-sm text-gray-400 font-medium">{idx + 1}</span>
                <div className={cn('w-3 h-3 rounded-full flex-shrink-0', BELT_DOT[m.belt])} />
                <span className="flex-1 text-sm font-medium text-gray-900 truncate">{m.name}</span>
                <div className="text-right">
                  <div className="text-xs font-semibold text-gray-900">{formatXP(m.total_xp)}</div>
                  <div className="text-xs text-gray-400">{m.streak}d streak</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
