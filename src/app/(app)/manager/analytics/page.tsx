// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, EmptyState, SkeletonList } from '@/components/ui'
import { InsightRow, StatTile, MiniBar, PageHeader } from '@/components/manager'
import {
  TrophyIcon, ChartRisingIcon, PhoneIcon, TargetIcon, FlameIcon,
  BarChartIcon, LightningIcon, BookIcon,
} from '@/components/icons'
import { formatXP } from '@/lib/utils'
import { deriveTeamInsights } from '@/lib/insights'

export default function AnalyticsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [members, setMembers] = useState([])
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      supabase.from('users').select('team_id').eq('id', user.id).single().then(({ data }) => {
        if (!data?.team_id) { setLoading(false); return }
        supabase.from('partner_onboarding').select('stage, temperature').eq('team_id', data.team_id)
          .then(({ data: lds }) => setLeads(lds ?? []))
        supabase.from('users')
          .select('id, name, user_progress(total_xp, current_streak, longest_streak, belt_day, total_calls, total_demos, total_deals, calls_this_week, demos_this_week, deals_this_month, completed_lessons, last_active_date)')
          .eq('team_id', data.team_id).eq('role', 'rep')
          .then(({ data: mems }) => {
            setMembers((mems ?? []).map((m) => {
              const p = m.user_progress?.[0] ?? {}
              return {
                id: m.id, name: m.name,
                total_xp: p.total_xp ?? 0, current_streak: p.current_streak ?? 0, longest_streak: p.longest_streak ?? 0,
                belt_day: p.belt_day ?? 0, total_calls: p.total_calls ?? 0, total_demos: p.total_demos ?? 0,
                total_deals: p.total_deals ?? 0, calls_this_week: p.calls_this_week ?? 0, demos_this_week: p.demos_this_week ?? 0,
                deals_this_month: p.deals_this_month ?? 0, lessons_completed: (p.completed_lessons ?? []).length,
                last_active_date: p.last_active_date ?? null,
              }
            }))
            setLoading(false)
          })
      })
    })
  }, [])

  const size = members.length
  const totalXP = members.reduce((s, m) => s + m.total_xp, 0)
  const totalCalls = members.reduce((s, m) => s + m.total_calls, 0)
  const totalDemos = members.reduce((s, m) => s + m.total_demos, 0)
  const totalDeals = members.reduce((s, m) => s + m.total_deals, 0)
  const activeStreaks = members.filter(m => m.current_streak > 0).length
  // Call→demo and demo→deal conversion are the funnel a manager actually coaches.
  // Clamp at 100%: the three counters are independent (a deal can be logged
  // without a matching demo in the same window), so a raw ratio can exceed 100.
  const callToDemo = totalCalls ? Math.min(100, Math.round((totalDemos / totalCalls) * 100)) : 0
  const demoToDeal = totalDemos ? Math.min(100, Math.round((totalDeals / totalDemos) * 100)) : 0
  // Lead pipeline + warm/cold closing across the team. Only count leads that
  // have actually been triaged warm/cold — folding untriaged (null) leads into
  // "cold" would crater the cold close-rate and mislead coaching.
  const wonRate = (arr) => arr.length ? Math.round(arr.filter(l => l.stage === 'opportunity_won').length / arr.length * 100) : 0
  const warmLeads = leads.filter(l => l.temperature === 'warm')
  const coldLeads = leads.filter(l => l.temperature === 'cold')
  const insights = deriveTeamInsights(members)
  const maxXP = Math.max(1, ...members.map(m => m.total_xp))
  const rankedXP = [...members].sort((a, b) => b.total_xp - a.total_xp)

  const metrics = [
    { label: 'Total team XP', value: formatXP(totalXP).replace(' XP', ''), sub: 'All time', icon: <TrophyIcon size={18} />, accent: 'text-gold' },
    { label: 'Avg XP / rep', value: formatXP(size ? Math.round(totalXP / size) : 0).replace(' XP', ''), sub: 'All time', icon: <ChartRisingIcon size={18} />, accent: 'text-navy' },
    { label: 'Total calls', value: totalCalls, sub: 'All time', icon: <PhoneIcon size={18} />, accent: 'text-teal' },
    { label: 'Total deals', value: totalDeals, sub: 'Closed-won', icon: <TargetIcon size={18} />, accent: 'text-success' },
  ]

  return (
    <div className="space-y-5 pb-4 stagger-rise">
      <PageHeader title="Analytics" subtitle={loading || !size ? undefined : `Across ${size} rep${size === 1 ? '' : 's'}`} />

      {loading ? (
        <SkeletonList count={2} />
      ) : size === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<BarChartIcon size={28} />}
            title="No data to analyze yet"
            description="Once reps join and start logging calls, demos, and training, you'll see team XP, an activity funnel, and AI coaching insights here."
            action={{ label: 'Invite your team', onClick: () => router.push('/manager/roles') }}
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {metrics.map(m => <StatTile key={m.label} {...m} />)}
          </div>

          {/* AI coaching insights */}
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <LightningIcon size={16} className="text-teal" />
              <h2 className="text-h3 text-dark-text">AI Coaching Insights</h2>
            </div>
            {insights.length === 0 ? (
              <p className="text-[13px] text-gray">No flags right now. As activity accumulates, prioritized coaching nudges surface here automatically.</p>
            ) : (
              <div className="space-y-2">{insights.map(i => <InsightRow key={i.id} insight={i} />)}</div>
            )}
          </Card>

          {/* Lead pipeline + warm/cold closing */}
          {leads.length > 0 && (
            <Card>
              <h2 className="text-h3 text-dark-text mb-1">Lead Pipeline &amp; Closing</h2>
              <p className="mb-4 text-[12px] text-gray">Across {leads.length} team lead{leads.length === 1 ? '' : 's'} · {warmLeads.length} warm · {coldLeads.length} cold.</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { l: 'Overall close', v: wonRate(leads), c: 'rgb(var(--navy))' },
                  { l: 'Warm close', v: wonRate(warmLeads), c: '#EA580C' },
                  { l: 'Cold close', v: wonRate(coldLeads), c: '#2563EB' },
                ].map(x => (
                  <div key={x.l} className="rounded-md border border-border bg-bdrbg p-3">
                    <div className="text-[22px] font-[800] tabular-nums" style={{ color: x.c }}>{x.v}%</div>
                    <div className="mt-0.5 text-[11px] text-gray">{x.l}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Activity funnel */}
          <Card>
            <h2 className="text-h3 text-dark-text mb-1">Activity Funnel</h2>
            <p className="mb-4 text-[12px] text-gray">Team totals, all time. Conversion rates show where coaching moves the needle.</p>
            <div className="space-y-3">
              <MiniBar label="Calls" value={totalCalls} max={Math.max(1, totalCalls)} color="bg-teal" />
              <MiniBar label="Demos" value={totalDemos} max={Math.max(1, totalCalls)} color="bg-navy" />
              <MiniBar label="Deals" value={totalDeals} max={Math.max(1, totalCalls)} color="bg-success" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-md border border-border bg-bdrbg p-3 text-center">
                <div className="text-[20px] font-[800] text-dark-text">{callToDemo}%</div>
                <div className="text-[11px] font-[600] text-gray">Call → Demo</div>
              </div>
              <div className="rounded-md border border-border bg-bdrbg p-3 text-center">
                <div className="text-[20px] font-[800] text-dark-text">{demoToDeal}%</div>
                <div className="text-[11px] font-[600] text-gray">Demo → Deal</div>
              </div>
            </div>
          </Card>

          {/* XP leaderboard viz */}
          <Card>
            <h2 className="text-h3 text-dark-text mb-3">XP by Rep</h2>
            <div className="space-y-2.5">
              {rankedXP.map(m => (
                <MiniBar key={m.id} label={m.name} value={m.total_xp} max={maxXP} display={formatXP(m.total_xp).replace(' XP', '')} />
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Reps on a streak" value={`${activeStreaks}/${size}`} icon={<FlameIcon size={18} />} accent="text-orange-500" />
            <StatTile label="Total demos" value={totalDemos} icon={<BookIcon size={18} />} accent="text-navy" />
          </div>
        </>
      )}
    </div>
  )
}
