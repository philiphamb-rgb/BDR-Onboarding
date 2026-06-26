// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, EmptyState, SkeletonList, Avatar } from '@/components/ui'
import { PageHeader } from '@/components/manager'
import { FlameIcon, TeamIcon, PhoneIcon, TargetIcon, BookIcon } from '@/components/icons'
import { cn, formatXP } from '@/lib/utils'
import { daysSince } from '@/lib/insights'

function beltFromDays(d: number) {
  return d >= 90 ? 'black' : d >= 70 ? 'purple' : d >= 50 ? 'blue' : d >= 30 ? 'green' : d >= 14 ? 'orange' : d >= 7 ? 'yellow' : 'white'
}
const BELT_LABEL: Record<string, string> = {
  white: 'White', yellow: 'Yellow', orange: 'Orange', green: 'Green', blue: 'Blue', purple: 'Purple', black: 'Black',
}
const BELT_BADGE: Record<string, string> = {
  white: 'bg-bdrbg text-gray', yellow: 'bg-belt-yellow/10 text-belt-yellow',
  orange: 'bg-belt-orange/10 text-belt-orange', green: 'bg-belt-green/10 text-belt-green',
  blue: 'bg-belt-blue/10 text-belt-blue', purple: 'bg-belt-purple/10 text-belt-purple',
  black: 'bg-belt-black text-white',
}

export default function TeamPage() {
  const supabase = createClient()
  const router = useRouter()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      supabase.from('users').select('team_id').eq('id', user.id).single().then(({ data }) => {
        if (!data?.team_id) { setLoading(false); return }
        supabase.from('users')
          .select('id, name, email, user_progress(total_xp, current_streak, belt_day, total_calls, total_demos, total_deals, calls_this_week, completed_lessons, last_active_date)')
          .eq('team_id', data.team_id).eq('role', 'rep')
          .then(({ data: mems }) => {
            setMembers((mems ?? []).map((m) => {
              const p = m.user_progress?.[0] ?? {}
              return {
                id: m.id, name: m.name, email: m.email,
                total_xp: p.total_xp ?? 0, current_streak: p.current_streak ?? 0, belt_day: p.belt_day ?? 0,
                total_calls: p.total_calls ?? 0, total_demos: p.total_demos ?? 0, total_deals: p.total_deals ?? 0,
                calls_this_week: p.calls_this_week ?? 0, lessons_completed: (p.completed_lessons ?? []).length,
                last_active_date: p.last_active_date ?? null,
              }
            }).sort((a, b) => b.total_xp - a.total_xp))
            setLoading(false)
          })
      })
    })
  }, [])

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title="Team" subtitle={loading ? undefined : members.length ? `${members.length} rep${members.length === 1 ? '' : 's'}` : undefined} />

      {loading ? (
        <SkeletonList count={3} />
      ) : members.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<TeamIcon size={28} />}
            title="No team members yet"
            description="Each rep you invite shows up here with their belt, streak, calls, demos, and training progress — your full coaching view in one place."
            action={{ label: 'Invite reps', onClick: () => router.push('/manager/invite') }}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {members.map(m => {
            const belt = beltFromDays(m.belt_day)
            const idle = daysSince(m.last_active_date)
            const stats = [
              { label: 'XP', value: formatXP(m.total_xp).replace(' XP', ''), icon: null },
              { label: 'Streak', value: m.current_streak + 'd', icon: <FlameIcon size={13} className="text-orange-500" /> },
              { label: 'Calls', value: m.total_calls, icon: <PhoneIcon size={13} className="text-teal" /> },
              { label: 'Demos', value: m.total_demos, icon: null },
              { label: 'Deals', value: m.total_deals, icon: <TargetIcon size={13} className="text-success" /> },
              { label: 'Lessons', value: m.lessons_completed, icon: <BookIcon size={13} className="text-navy" /> },
            ]
            return (
              <Card key={m.id}>
                <div className="mb-3 flex items-start gap-3">
                  <Avatar name={m.name} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-[700] text-dark-text">{m.name}</div>
                    <div className="truncate text-[12px] text-gray">{m.email}</div>
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-[700]', BELT_BADGE[belt])}>
                    {BELT_LABEL[belt]} Belt
                  </span>
                </div>
                {idle !== null && idle >= 3 && (
                  <div className="mb-3 rounded-md border border-gold/40 bg-gold/[0.06] px-3 py-1.5 text-[12px] font-[600] text-[#A06C00]">
                    No activity in {idle} days — consider a check-in.
                  </div>
                )}
                <div className="grid grid-cols-3 gap-y-3 sm:grid-cols-6">
                  {stats.map(s => (
                    <div key={s.label} className="text-center">
                      <div className="flex items-center justify-center gap-1 text-[15px] font-[800] text-dark-text">
                        {s.icon}{s.value}
                      </div>
                      <div className="text-[11px] font-[600] uppercase tracking-[0.04em] text-gray">{s.label}</div>
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
