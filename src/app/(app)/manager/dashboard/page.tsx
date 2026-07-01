// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, EmptyState, SkeletonList } from '@/components/ui'
import { InsightRow, StatTile, PageHeader } from '@/components/manager'
import {
  TeamIcon, ChartRisingIcon, BarChartIcon, FlameIcon, TargetIcon,
  XpIcon, BellIcon, ArrowRightIcon, LightningIcon,
} from '@/components/icons'
import { cn, formatXP } from '@/lib/utils'
import { deriveTeamInsights, daysSince } from '@/lib/insights'
import { CountUp } from '@/components/CountUp'

function beltFromDays(d: number) {
  return d >= 90 ? 'black' : d >= 70 ? 'purple' : d >= 50 ? 'blue' : d >= 30 ? 'green' : d >= 14 ? 'orange' : d >= 7 ? 'yellow' : 'white'
}
const BELT_DOT: Record<string, string> = {
  white: 'bg-belt-white', yellow: 'bg-belt-yellow', orange: 'bg-belt-orange',
  green: 'bg-belt-green', blue: 'bg-belt-blue', purple: 'bg-belt-purple', black: 'bg-belt-black',
}
const BELT_LABEL: Record<string, string> = {
  white: 'White', yellow: 'Yellow', orange: 'Orange', green: 'Green', blue: 'Blue', purple: 'Purple', black: 'Black',
}

export default function ManagerDashboardPage() {
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
          .select('id, name, email, user_progress(total_xp, current_streak, longest_streak, belt_day, total_calls, total_demos, total_deals, calls_this_week, demos_this_week, deals_this_month, completed_lessons, last_active_date)')
          .eq('team_id', data.team_id).eq('role', 'rep')
          .then(({ data: mems }) => {
            setMembers((mems ?? []).map((m) => {
              const p = m.user_progress?.[0] ?? {}
              return {
                id: m.id, name: m.name, email: m.email,
                total_xp: p.total_xp ?? 0,
                current_streak: p.current_streak ?? 0,
                longest_streak: p.longest_streak ?? 0,
                total_calls: p.total_calls ?? 0,
                total_demos: p.total_demos ?? 0,
                total_deals: p.total_deals ?? 0,
                calls_this_week: p.calls_this_week ?? 0,
                demos_this_week: p.demos_this_week ?? 0,
                deals_this_month: p.deals_this_month ?? 0,
                lessons_completed: (p.completed_lessons ?? []).length,
                belt_day: p.belt_day ?? 0,
                last_active_date: p.last_active_date ?? null,
              }
            }))
            setLoading(false)
          })
      })
    })
  }, [])

  const teamSize = members.length
  const avgXP = teamSize ? Math.round(members.reduce((s, m) => s + m.total_xp, 0) / teamSize) : 0
  const activeStreaks = members.filter(m => m.current_streak > 0).length
  const dealsThisMonth = members.reduce((s, m) => s + m.deals_this_month, 0)
  const callsThisWeek = members.reduce((s, m) => s + m.calls_this_week, 0)
  const insights = deriveTeamInsights(members)
  const ranked = [...members].sort((a, b) => b.total_xp - a.total_xp)

  return (
    <div className="space-y-5 pb-4 stagger-rise">
      <PageHeader
        title="Team Dashboard"
        subtitle={loading ? 'Loading team…' : teamSize ? `${teamSize} rep${teamSize === 1 ? '' : 's'} on your team` : 'Build your team to get started'}
      />

      {loading ? (
        <SkeletonList count={3} />
      ) : teamSize === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<TeamIcon size={28} />}
            title="No reps on your team yet"
            description="Invite your first BDR and this dashboard fills with live coaching insights, streaks, and pipeline activity."
            action={{ label: 'Invite your team', onClick: () => router.push('/manager/roles') }}
          />
        </Card>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Avg XP / rep" value={<CountUp value={avgXP} format={n => formatXP(n).replace(' XP', '')} />} sub="All time" icon={<ChartRisingIcon size={18} />} accent="text-navy-ink" />
            <StatTile label="On a streak" value={<><CountUp value={activeStreaks} />/{teamSize}</>} sub="Active today" icon={<FlameIcon size={18} />} accent="text-orange-500" />
            <StatTile label="Calls this week" value={<CountUp value={callsThisWeek} />} sub="Team total" icon={<LightningIcon size={18} />} accent="text-teal" />
            <StatTile label="Deals this month" value={<CountUp value={dealsThisMonth} />} sub="Closed-won" icon={<TargetIcon size={18} />} accent="text-success" />
          </div>

          {/* Coaching insights */}
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <LightningIcon size={16} className="text-teal" />
              <h2 className="text-h3 text-dark-text">Coaching Insights</h2>
            </div>
            {insights.length === 0 ? (
              <p className="text-[13px] text-gray">
                No flags right now — your team is steady. Insights appear here as reps log activity, build streaks, and approach belt milestones.
              </p>
            ) : (
              <div className="space-y-2">
                {insights.slice(0, 4).map(i => <InsightRow key={i.id} insight={i} />)}
              </div>
            )}
          </Card>

          {/* Team leaderboard */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-h3 text-dark-text">Your Team</h2>
              <Link href="/manager/team" className="flex items-center gap-1 text-[12px] font-[700] text-teal hover:text-teal-dark">
                View all <ArrowRightIcon size={14} />
              </Link>
            </div>
            <div className="space-y-1">
              {ranked.map((m, idx) => {
                const belt = beltFromDays(m.belt_day)
                const idle = daysSince(m.last_active_date)
                return (
                  <div key={m.id} className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-bdrbg">
                    <span className="w-5 text-center text-[13px] font-[700] text-gray">{idx + 1}</span>
                    <span className={cn('h-3 w-3 shrink-0 rounded-full', BELT_DOT[belt])} title={`${BELT_LABEL[belt]} Belt`} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-[600] text-dark-text">{m.name}</div>
                      {idle !== null && idle >= 3 && (
                        <div className="flex items-center gap-1 text-[11px] font-[600] text-[#A06C00]">
                          <span className="h-1.5 w-1.5 shrink-0 animate-attention rounded-full bg-gold" />Quiet for {idle}d
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-[13px] font-[700] text-dark-text">{formatXP(m.total_xp)}</div>
                      <div className="text-[11px] text-gray">{m.current_streak}d streak</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { href: '/manager/analytics', label: 'Analytics', icon: <BarChartIcon size={18} />, accent: 'text-navy-ink' },
              { href: '/manager/broadcast', label: 'Broadcast', icon: <BellIcon size={18} />, accent: 'text-teal' },
              { href: '/manager/gamification', label: 'XP Rules', icon: <XpIcon size={18} />, accent: 'text-gold' },
              { href: '/manager/roles', label: 'Roles', icon: <TeamIcon size={18} />, accent: 'text-navy-ink' },
            ].map(a => (
              <Link key={a.href} href={a.href}>
                <Card hover className="flex items-center gap-2 !p-3">
                  <span className={a.accent}>{a.icon}</span>
                  <span className="text-[13px] font-[600] text-dark-text">{a.label}</span>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
