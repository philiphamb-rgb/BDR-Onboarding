// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui'
import { FlameIcon } from '@/components/icons'
import { cn, formatXP } from '@/lib/utils'

function beltFromDays(d: number) {
  return d >= 90 ? 'black' : d >= 70 ? 'purple' : d >= 50 ? 'blue' : d >= 30 ? 'green' : d >= 14 ? 'orange' : d >= 7 ? 'yellow' : 'white'
}
const BELT_LABEL: Record<string, string> = {
  white:'White',yellow:'Yellow',orange:'Orange',green:'Green',blue:'Blue',purple:'Purple',black:'Black'
}

export default function TeamPage() {
  const supabase = createClient()
  const [members, setMembers] = useState<{ id: string; name: string; email: string; total_xp: number; streak: number; belt_day: number; total_calls: number; total_demos: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('users').select('team_id').eq('id', user.id).single().then(({ data }) => {
        if (!data?.team_id) { setLoading(false); return }
        supabase.from('users').select(`id, name, email, user_progress(total_xp, current_streak, belt_day, total_calls, total_demos)`)
          .eq('team_id', data.team_id).eq('role', 'rep').then(({ data: mems }) => {
            setMembers((mems ?? []).map((m: { id: string; name: string; email: string; user_progress: { total_xp: number; current_streak: number; belt_day: number; total_calls: number; total_demos: number }[] }) => ({
              id: m.id, name: m.name, email: m.email,
              ...(m.user_progress?.[0] ?? { total_xp: 0, current_streak: 0, belt_day: 0, total_calls: 0, total_demos: 0 })
            })))
            setLoading(false)
          })
      })
    })
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-h1 text-gray-900">Team</h1>
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse" />)}</div>
      ) : members.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No team members</div>
      ) : (
        <div className="space-y-3">
          {members.map(m => {
            const belt = beltFromDays(m.belt_day ?? 0)
            return (
              <Card key={m.id}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-navy rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {m.name.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{m.name}</div>
                    <div className="text-xs text-gray-500">{m.email}</div>
                  </div>
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', belt === 'black' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600')}>
                    {BELT_LABEL[belt]} Belt
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'XP', value: formatXP(m.total_xp) },
                    { label: 'Streak', value: <span className="flex items-center gap-0.5 justify-center"><FlameIcon className="w-3.5 h-3.5 text-orange-500" />{m.streak}d</span> },
                    { label: 'Calls', value: m.total_calls ?? 0 },
                    { label: 'Demos', value: m.total_demos ?? 0 },
                  ].map(stat => (
                    <div key={stat.label}>
                      <div className="text-sm font-bold text-gray-900">{stat.value}</div>
                      <div className="text-xs text-gray-500">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
