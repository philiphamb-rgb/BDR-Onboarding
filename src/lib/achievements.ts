// Deterministic achievement definitions, computed purely from user_progress
// counters. No new tables — the badge wall derives everything from stats, and
// MilestoneWatcher dedupes celebrations via localStorage.

export type AchStats = {
  total_calls?: number
  total_demos?: number
  total_deals?: number
  current_streak?: number
  longest_streak?: number
  total_xp?: number
}

export type Achievement = {
  id: string
  label: string
  desc: string
  icon: string            // icon key resolved by the badge wall
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  metric: keyof AchStats
  need: number
}

// Ordered easiest → hardest within each track.
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'call_1',    label: 'First Dial',      desc: 'Log your first call',        icon: 'phone',     tier: 'bronze',   metric: 'total_calls', need: 1 },
  { id: 'call_10',   label: 'Warming Up',      desc: 'Log 10 calls',               icon: 'phone',     tier: 'bronze',   metric: 'total_calls', need: 10 },
  { id: 'call_50',   label: 'Dial Machine',    desc: 'Log 50 calls',               icon: 'phone',     tier: 'silver',   metric: 'total_calls', need: 50 },
  { id: 'call_100',  label: 'Century Caller',  desc: 'Log 100 calls',              icon: 'phone',     tier: 'gold',     metric: 'total_calls', need: 100 },

  { id: 'demo_1',    label: 'First Demo',      desc: 'Run your first demo',        icon: 'target',    tier: 'bronze',   metric: 'total_demos', need: 1 },
  { id: 'demo_10',   label: 'Presenter',       desc: 'Run 10 demos',               icon: 'target',    tier: 'silver',   metric: 'total_demos', need: 10 },
  { id: 'demo_25',   label: 'Demo Master',     desc: 'Run 25 demos',               icon: 'target',    tier: 'gold',     metric: 'total_demos', need: 25 },

  { id: 'deal_1',    label: 'First Blood',     desc: 'Close your first deal',      icon: 'handshake', tier: 'silver',   metric: 'total_deals', need: 1 },
  { id: 'deal_5',    label: 'Closer',          desc: 'Close 5 deals',              icon: 'handshake', tier: 'gold',     metric: 'total_deals', need: 5 },
  { id: 'deal_10',   label: 'Rainmaker',       desc: 'Close 10 deals',             icon: 'handshake', tier: 'gold',     metric: 'total_deals', need: 10 },
  { id: 'deal_25',   label: 'Legend',          desc: 'Close 25 deals',             icon: 'trophy',    tier: 'platinum', metric: 'total_deals', need: 25 },

  { id: 'streak_3',  label: 'On a Roll',       desc: '3-day streak',               icon: 'flame',     tier: 'bronze',   metric: 'longest_streak', need: 3 },
  { id: 'streak_7',  label: 'Week Warrior',    desc: '7-day streak',               icon: 'flame',     tier: 'silver',   metric: 'longest_streak', need: 7 },
  { id: 'streak_14', label: 'Unstoppable',     desc: '14-day streak',              icon: 'flame',     tier: 'gold',     metric: 'longest_streak', need: 14 },
  { id: 'streak_30', label: 'Iron Will',       desc: '30-day streak',              icon: 'flame',     tier: 'platinum', metric: 'longest_streak', need: 30 },

  { id: 'xp_500',    label: 'Rising Star',     desc: 'Earn 500 XP',                icon: 'xp',        tier: 'bronze',   metric: 'total_xp', need: 500 },
  { id: 'xp_2500',   label: 'XP Hunter',       desc: 'Earn 2,500 XP',              icon: 'xp',        tier: 'silver',   metric: 'total_xp', need: 2500 },
  { id: 'xp_10000',  label: 'Grandmaster',     desc: 'Earn 10,000 XP',             icon: 'xp',        tier: 'gold',     metric: 'total_xp', need: 10000 },
]

export const TIER_COLOR: Record<Achievement['tier'], string> = {
  bronze: '#CD7F4E', silver: '#C6CDDA', gold: '#FFC46C', platinum: '#5CD1F3',
}

const val = (s: AchStats, m: keyof AchStats) => Number(s?.[m] ?? 0)

export function isEarned(a: Achievement, s: AchStats) { return val(s, a.metric) >= a.need }
export function earnedIds(s: AchStats) { return ACHIEVEMENTS.filter(a => isEarned(a, s)).map(a => a.id) }

// For the badge wall: each achievement with earned flag + progress toward it.
export function computeAchievements(s: AchStats) {
  return ACHIEVEMENTS.map(a => {
    const have = val(s, a.metric)
    return { ...a, earned: have >= a.need, have, pct: Math.min(100, Math.round((have / a.need) * 100)) }
  })
}
