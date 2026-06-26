// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui'
import { TrophyIcon, ChartRisingIcon, PhoneIcon, TargetIcon, FlameIcon } from '@/components/icons'
import { formatXP } from '@/lib/utils'

export default function AnalyticsPage() {
  const supabase = createClient()
  const [stats, setStats] = useState({ totalTeamXP: 0, avgXP: 0, totalCalls: 0, totalDeals: 0, activeStreaks: 0, teamSize: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('users').select('team_id').eq('id', user.id).single().then(({ data }) => {
        if (!data?.team_id) { setLoading(false); return }
        supabase.from('users').select(`id, user_progress(total_xp, current_streak, total_calls, total_deals)`)
          .eq('team_id', data.team_id).eq('role', 'rep').then(({ data: mems }) => {
            if (!mems) { setLoading(false); return }
            const progs = mems.flatMap((m: { user_progress: { total_xp: number; current_streak: number; total_calls: number; total_deals: number }[] }) => m.user_progress ?? [])
            const totalXP = progs.reduce((s, p) => s + (p.total_xp ?? 0), 0)
            setStats({
              totalTeamXP: totalXP,
              avgXP: progs.length ? Math.round(totalXP / progs.length) : 0,
              totalCalls: progs.reduce((s, p) => s + (p.total_calls ?? 0), 0),
              totalDeals: progs.reduce((s, p) => s + (p.total_deals ?? 0), 0),
              activeStreaks: progs.filter(p => (p.current_streak ?? 0) > 0).length,
              teamSize: mems.length,
            })
            setLoading(false)
          })
      })
    })
  }, [])

  const metrics = [
    { label: 'Total Team XP', value: formatXP(stats.totalTeamXP), sub: 'All time', icon: <TrophyIcon className="text-gold" /> },
    { label: 'Avg XP / Rep',  value: formatXP(stats.avgXP), sub: 'All time', icon: <ChartRisingIcon className="text-navy" /> },
    { label: 'Total Calls',   value: stats.totalCalls.toString(), sub: 'All time', icon: <PhoneIcon className="text-teal" /> },
    { label: 'Total Deals',   value: stats.totalDeals.toString(), sub: 'All time', icon: <TargetIcon className="text-green-600" /> },
    { label: 'Active Streaks',value: `${stats.activeStreaks}/${stats.teamSize}`, sub: 'Reps on streak', icon: <FlameIcon className="text-orange-500" /> },
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-h1 text-gray-900">Analytics</h1>
      {loading ? (
        <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 rounded-2xl animate-pulse" />)}</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {metrics.map(m => (
            <Card key={m.label} className="!p-4">
              <div className="mb-2">{m.icon}</div>
              <div className="text-xl font-bold text-gray-900">{m.value}</div>
              <div className="text-xs text-gray-500">{m.label}</div>
              <div className="text-xs text-gray-400">{m.sub}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
