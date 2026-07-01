// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'

// Team Leaderboard — a gamified team performance hub. Real data only, from the
// windowed team_leaderboard(p_since) aggregate (team-scoped, RLS-safe). A
// transparent composite Score weights PROACTIVE, self-generated effort (cold
// calls + self-sourced leads) highest. Polls live so ranks shift in front of you.

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, Skeleton, Avatar } from '@/components/ui'
import { CountUp } from '@/components/CountUp'
import { PhoneIcon, TargetIcon, HandshakeIcon, FlameIcon, CoinIcon, XpIcon, TrophyIcon, InfoIcon, ChartRisingIcon, ArrowRightIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

type Range = 'today' | 'week' | 'month' | 'all'

const RANGES: { key: Range; label: string }[] = [
  { key: 'today', label: 'Today' }, { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' }, { key: 'all', label: 'All-time' },
]

// Transparent scoring — shown to users. Proactive, self-generated effort weighted highest.
const W = { lead: 10, call: 2, demo: 6, deal: 25, pipelinePer500: 1, streakDay: 4, xpPer20: 1 }

const BELTS = [
  { d: 90, name: 'Black', c: '#111827' }, { d: 70, name: 'Purple', c: '#6D28D9' }, { d: 50, name: 'Blue', c: '#1D4ED8' },
  { d: 30, name: 'Green', c: '#059669' }, { d: 14, name: 'Orange', c: '#C2410C' }, { d: 7, name: 'Yellow', c: '#CA8A04' }, { d: 0, name: 'White', c: '#9CA3AF' },
]
const belt = (day: number) => BELTS.find(b => (day ?? 0) >= b.d) || BELTS[BELTS.length - 1]
const fmtMoney = (n: number) => '$' + Math.round(n || 0).toLocaleString('en-US')
const MEDALS = ['#FFC46C', '#C6CDDA', '#CD7F4E']

function sinceFor(range: Range): string | null {
  const now = Date.now()
  if (range === 'all') return null
  if (range === 'today') { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString() }
  if (range === 'week') return new Date(now - 7 * 864e5).toISOString()
  return new Date(now - 30 * 864e5).toISOString()
}

function score(r: any, range: Range) {
  const streak = range === 'all' ? (r.longest_streak || 0) : (r.current_streak || 0)
  const pipeline = Number(r.pipeline_weighted) || 0
  return Math.round(
    (Number(r.leads) || 0) * W.lead + (Number(r.calls) || 0) * W.call + (Number(r.demos) || 0) * W.demo +
    (Number(r.deals) || 0) * W.deal + Math.round(pipeline / 500) * W.pipelinePer500 + streak * W.streakDay +
    Math.round((Number(r.xp) || 0) / 20) * W.xpPer20
  )
}

export default function LeaderboardPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string>()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<Range>('week')
  const [showFormula, setShowFormula] = useState(false)
  const [flash, setFlash] = useState<Set<string>>(new Set())
  const prevRank = useRef<Record<string, number>>({})   // user_id -> last rank
  const [delta, setDelta] = useState<Record<string, number>>({})

  const load = async (r: Range, silent = false) => {
    if (!silent) setLoading(true)
    const { data } = await supabase.rpc('team_leaderboard', { p_since: sinceFor(r) })
    const ranked = [...(data ?? [])].sort((a, b) => score(b, r) - score(a, r))
    // Compute rank movement vs the previous snapshot; flash rows that climbed.
    const moved = new Set<string>(); const d: Record<string, number> = {}
    ranked.forEach((row, i) => {
      const prev = prevRank.current[row.user_id]
      if (prev != null && prev > i) moved.add(row.user_id)
      if (prev != null) d[row.user_id] = prev - i
      prevRank.current[row.user_id] = i
    })
    setRows(ranked); setDelta(d)
    if (silent && moved.size) { setFlash(moved); setTimeout(() => setFlash(new Set()), 1200) }
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => { if (user) setUserId(user.id) })
  }, [])

  // Reload on range change; reset the movement baseline so flashes only reflect
  // live changes within a range, not the switch itself.
  useEffect(() => { prevRank.current = {}; setDelta({}); load(range) /* eslint-disable-next-line */ }, [range])

  // Live polling every 25s while the tab is visible — ranks shift in real time.
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') load(range, true) }, 25000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range])

  // Memoized so the 25s poll / formula-toggle / rank-flash re-renders don't
  // re-score and re-sort the whole roster every time.
  const ranked = useMemo(() => rows.map(r => ({ ...r, s: score(r, range) })), [rows, range])
  const myIndex = useMemo(() => ranked.findIndex(r => r.user_id === userId), [ranked, userId])
  const me = myIndex >= 0 ? ranked[myIndex] : null
  const topScore = ranked[0]?.s || 1

  if (loading && rows.length === 0) return (
    <div className="space-y-4"><Skeleton className="h-10 w-48 rounded-xl" /><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>
  )

  if (ranked.length === 0) return (
    <div className="space-y-4">
      <h1 className="text-h1 text-dark-text">Leaderboard</h1>
      <Card className="!py-12 text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-navy/10 text-navy"><TrophyIcon size={22} /></span>
        <p className="text-[14px] font-[800] text-dark-text">No teammates on the board yet</p>
        <p className="mx-auto mt-1 max-w-xs text-[12.5px] text-gray">Once you and your team log calls, leads, and deals, the rankings light up here.</p>
      </Card>
    </div>
  )

  const podium = ranked.slice(0, 3)
  const cols = [
    { k: 'calls', label: 'Calls', get: (r: any) => r.calls },
    { k: 'leads', label: 'Self-gen leads', get: (r: any) => r.leads },
    { k: 'demos', label: 'Demos', get: (r: any) => r.demos },
    { k: 'deals', label: 'Deals', get: (r: any) => r.deals },
    { k: 'pipeline', label: 'Pipeline', get: (r: any) => fmtMoney(r.pipeline_weighted) },
    { k: 'streak', label: 'Streak', get: (r: any) => (range === 'all' ? r.longest_streak : r.current_streak) },
    { k: 'xp', label: 'XP', get: (r: any) => (Number(r.xp) || 0).toLocaleString() },
  ]

  const Trend = ({ r }: { r: any }) => {
    const up = Number(r.xp) - Number(r.xp_prev)
    if (range === 'all' || !r.xp_prev || up === 0) return null
    return <span className={cn('ml-1 text-[10px] font-[800]', up > 0 ? 'text-success' : 'text-error')}>{up > 0 ? '▲' : '▼'}{Math.abs(up)}</span>
  }

  return (
    <div className="space-y-4 stagger-rise">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h1 text-dark-text">Team Leaderboard</h1>
          <p className="mt-0.5 text-[13px] text-gray">Effort you can see. Proactive reps rise fastest. <span className="text-teal">Live</span>.</p>
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-bdrbg p-1">
          {RANGES.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)}
              className={cn('shrink-0 rounded-lg px-3 py-1.5 text-[12.5px] font-[800] transition-all', range === r.key ? 'bg-card text-navy shadow-sm' : 'text-gray hover:text-navy')}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Podium */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[1, 0, 2].map(slot => {
          const r = podium[slot]; if (!r) return <div key={slot} />
          const isFirst = slot === 0, medal = MEDALS[slot]
          return (
            <Card key={r.user_id}
              className={cn('relative flex flex-col items-center gap-1.5 overflow-hidden !p-3 text-center',
                isFirst ? 'order-2 -translate-y-1 sm:-translate-y-2' : slot === 1 ? 'order-1' : 'order-3',
                r.user_id === userId && 'ring-2 ring-navy')}
              style={isFirst ? { boxShadow: `0 0 0 1.5px ${medal}66, 0 8px 30px ${medal}33` } : undefined}>
              {isFirst && <div className="pointer-events-none absolute inset-x-0 top-0 h-16 opacity-30" style={{ background: `radial-gradient(60% 100% at 50% 0%, ${medal}, transparent)` }} />}
              <div className="relative">
                <Avatar src={r.avatar_url} name={r.name} size={isFirst ? 56 : 44} />
                <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-[900] text-white shadow" style={{ backgroundColor: medal }}>{slot + 1}</span>
              </div>
              <div className="mt-1 max-w-full truncate text-[12.5px] font-[800] text-dark-text">{r.name?.split(' ')[0] || '—'}</div>
              <div className="text-[19px] font-[900] leading-none text-navy tabular-nums"><CountUp value={r.s} /></div>
              <div className="text-[10px] font-[700] uppercase tracking-wide text-gray">points</div>
            </Card>
          )
        })}
      </div>

      {/* Score explainer */}
      <button onClick={() => setShowFormula(s => !s)} className="flex items-center gap-1.5 text-[11.5px] font-[700] text-navy"><InfoIcon size={13} /> How the score works</button>
      {showFormula && (
        <Card className="!p-3 text-[11.5px] leading-relaxed text-mid-text">
          <span className="font-[800] text-dark-text">Total Score</span> rewards proactive, self-generated effort most:
          <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-[700]">
            <span className="text-teal">Self-gen lead ×{W.lead}</span><span className="text-success">Deal won ×{W.deal}</span>
            <span className="text-navy">Demo ×{W.demo}</span><span className="text-navy">Cold call ×{W.call}</span>
            <span className="text-error">Streak day ×{W.streakDay}</span><span className="text-teal">Pipeline ×1 / $500</span><span className="text-gold">XP ×1 / 20</span>
          </span>
        </Card>
      )}

      {/* Your standing */}
      {me && (
        <div className="sticky top-2 z-10">
          <Card className="!p-3 ring-2 ring-navy" style={{ backgroundColor: 'rgb(var(--navy) / 0.06)' }}>
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-[13px] font-[900] text-white">{myIndex + 1}</span>
              <Avatar src={me.avatar_url} name={me.name} size={34} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-[800] text-dark-text">You · {belt(me.belt_day).name} Belt</div>
                <div className="text-[11px] text-gray">{me.calls} calls · {me.leads} self-gen leads · {me.deals} deals</div>
              </div>
              <div className="text-right"><div className="text-[18px] font-[900] leading-none text-navy tabular-nums">{me.s.toLocaleString()}</div><div className="text-[9.5px] font-[700] uppercase tracking-wide text-gray">your score</div></div>
            </div>
          </Card>
        </div>
      )}

      {/* Ranked table / mobile list */}
      <Card className="!p-0 overflow-hidden">
        <div className="hidden grid-cols-[40px_1.6fr_repeat(7,1fr)_1.1fr] items-center gap-2 border-b border-border px-3 py-2 text-[10px] font-[800] uppercase tracking-wide text-gray desktop:grid">
          <span>#</span><span>Rep</span>{cols.map(c => <span key={c.k} className="text-center">{c.label}</span>)}<span className="text-right">Score</span>
        </div>
        <div>
          {ranked.map((r, i) => {
            const mine = r.user_id === userId, b = belt(r.belt_day), d = delta[r.user_id]
            return (
              <div key={r.user_id}
                className={cn('items-center gap-2 border-b border-border px-3 py-2.5 last:border-0 hover:bg-bdrbg/60',
                  'grid grid-cols-[32px_1fr_auto] desktop:grid-cols-[40px_1.6fr_repeat(7,1fr)_1.1fr]',
                  mine && 'bg-navy/[0.05]', flash.has(r.user_id) && 'animate-rank-flash')}>
                <span className="flex items-center gap-0.5">
                  <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-[900]', i < 3 ? 'text-white' : 'bg-bdrbg text-gray')}
                    style={i < 3 ? { backgroundColor: MEDALS[i] } : undefined}>{i + 1}</span>
                  {d ? <span className={cn('text-[9px] font-[800]', d > 0 ? 'text-success' : 'text-error')}>{d > 0 ? '▲' : '▼'}</span> : null}
                </span>
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar src={r.avatar_url} name={r.name} size={28} />
                  <div className="min-w-0">
                    <div className="truncate text-[12.5px] font-[800] text-dark-text">{r.name || '—'}{mine && <span className="ml-1 text-[10px] font-[700] text-navy">(you)</span>}</div>
                    <div className="flex items-center gap-1 text-[10px] text-gray">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: b.c }} />{b.name} Belt
                      <span className="desktop:hidden"> · {r.calls} calls · {r.leads} leads · {r.deals} deals</span>
                    </div>
                  </div>
                </div>
                {cols.map(c => (
                  <span key={c.k} className="hidden text-center text-[12.5px] font-[700] tabular-nums text-mid-text desktop:block">
                    {c.get(r)}{c.k === 'xp' && <Trend r={r} />}
                  </span>
                ))}
                <div className="text-right">
                  <div className="text-[15px] font-[900] leading-none text-navy tabular-nums">{r.s.toLocaleString()}</div>
                  <div className="mt-1 hidden h-1 w-full overflow-hidden rounded-full bg-bdrbg desktop:block"><div className="h-full rounded-full bg-navy transition-all duration-700" style={{ width: `${Math.max(4, (r.s / topScore) * 100)}%` }} /></div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
