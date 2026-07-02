// Apex — Content Engine catalog. The top-of-funnel intelligence: the
// single highest-EV move, the ranked queue behind it, the income forecast, the
// 30-day funnel, and the "what's working" analytics (format leaderboard, hook
// archetypes, pillar mix, posting heatmap). Content here is aimed at attracting
// credit-repair AGENCY partners (not consumers). These are seed/benchmark
// figures, clearly badged Demo in the UI until a live analytics source connects;
// EV (Expected Value) = a plain-English "smart guess" at $ impact per post.

export const NEXT_MOVE = {
  title: 'Post the "Agency added $4,200/mo in recurring revenue in 11 weeks" case-study Reel',
  format: 'Reel · 9:16 · 28–34s', pillar: 'Proof / Transformation',
  ev: 1840, confidence: 'Proven', windowMins: 47, channel: 'face',
  math: [
    { label: 'Estimated reach', note: 'median of 9 comparable proof Reels, last 60 days', value: '18,400' },
    { label: 'Reach × save rate', note: 'saves correlate strongest with DM rate', value: '6.2% → 1,141 saves' },
    { label: 'Saves → DMs', note: '30-day rolling average', value: '9.8% → 112 DMs' },
    { label: 'DMs → partner calls booked', note: 'qualified agency threads only', value: '31% → 35 calls' },
    { label: 'Calls → signed partners', note: 'Co-Brand PLUS+ average', value: '24% → 8.4 signs' },
    { label: 'Avg. first-year value per partner', note: 'recurring, blended', value: '$219/mo' },
  ],
  evFinal: '8.4 signs × $219',
  plainSummary: 'This format has driven ~112 agency DMs over the last 30 days. At your typical close rate, that\'s worth ~$1,840 in partner revenue.',
}

export const STACK = [
  { id: 1, title: 'Carousel: "5 ways agencies add a recurring revenue line"', format: 'Carousel · 8 slides', pillar: 'Education', ev: 1120, conf: 'Proven', windowMins: 132, channel: 'faceless' },
  { id: 2, title: 'Duet a partner reacting to their first co-brand payout', format: 'Reel · 9:16 · 19s', pillar: 'Proof / Transformation', ev: 940, conf: 'Experiment', windowMins: 58, channel: 'face' },
  { id: 3, title: 'Story poll: "Would you white-label a credit tool?"', format: 'Story · poll sticker', pillar: 'Engagement', ev: 410, conf: 'Proven', windowMins: 21, channel: 'faceless' },
  { id: 4, title: 'Talking-head: "3 myths keeping agencies from partnering"', format: 'Reel · 9:16 · 41s', pillar: 'Education', ev: 760, conf: 'Experiment', windowMins: 205, channel: 'face' },
  { id: 5, title: 'Repost top partner UGC with co-brand overlay', format: 'Feed · single image', pillar: 'Social Proof', ev: 305, conf: 'Proven', windowMins: 89, channel: 'faceless' },
  { id: 6, title: 'AI avatar walks an agency through onboarding, start to finish', format: 'Reel · 9:16 · 35s', pillar: 'Education', ev: 680, conf: 'Experiment', windowMins: 160, channel: 'faceless' },
  { id: 7, title: 'Before/after partner revenue reveal, B-roll + voiceover', format: 'Reel · 9:16 · 22s', pillar: 'Proof / Transformation', ev: 590, conf: 'Experiment', windowMins: 95, channel: 'faceless' },
]

export const INCOME = { worst: 8240, expected: 13950, best: 21300, mtdActual: 9120, daysLeft: 9 }

export const FUNNEL = [
  { stage: 'Views', value: 184000 }, { stage: 'Saves', value: 11420 }, { stage: 'DMs', value: 1118 },
  { stage: 'Calls', value: 347 }, { stage: 'Signs', value: 84 }, { stage: '$', value: 18396, isCurrency: true },
]

export const LEADERBOARD = [
  { format: 'Proof Reel (transformation)', posts: 14, avgEv: 1390, saveRate: '6.2%', dmRate: '9.8%', trend: 1 },
  { format: 'Education Carousel', posts: 22, avgEv: 980, saveRate: '8.9%', dmRate: '4.1%', trend: 1 },
  { format: 'Talking-head Reel', posts: 19, avgEv: 710, saveRate: '3.4%', dmRate: '5.6%', trend: -1 },
  { format: 'Story poll / quiz', posts: 31, avgEv: 340, saveRate: '1.1%', dmRate: '2.0%', trend: 0 },
  { format: 'Static feed post', posts: 26, avgEv: 215, saveRate: '2.0%', dmRate: '1.3%', trend: -1 },
  { format: 'UGC repost', posts: 11, avgEv: 290, saveRate: '2.8%', dmRate: '3.0%', trend: 1 },
]

export const HOOKS = [
  { name: '"Before / after revenue reveal"', uses: 12, avgEv: 1510, retention: 71 },
  { name: '"I didn\'t believe this either…"', uses: 9, avgEv: 1180, retention: 64 },
  { name: '"3 things nobody tells agencies about…"', uses: 17, avgEv: 890, retention: 58 },
  { name: 'Cold open with a partner testimonial', uses: 8, avgEv: 1320, retention: 69 },
  { name: 'Direct question to camera', uses: 14, avgEv: 520, retention: 41 },
]

export const PILLARS = [
  { name: 'Proof / Transformation', goalPct: 30, actualPct: 22 },
  { name: 'Education', goalPct: 30, actualPct: 38 },
  { name: 'Engagement', goalPct: 15, actualPct: 9 },
  { name: 'Social Proof', goalPct: 15, actualPct: 19 },
  { name: 'Brand / Culture', goalPct: 10, actualPct: 12 },
]

export const HEAT_HOURS = [6, 8, 10, 12, 14, 16, 18, 20, 22]
export const HEAT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export function heatVal(d: number, h: number) {
  const seed = (d * 13 + h * 7) % 23; let base = (seed / 23) * 38
  if ((d === 1 || d === 2 || d === 3) && (h === 18 || h === 20)) base += 48
  if ((d === 5 || d === 6) && (h === 10 || h === 12)) base += 40
  if (h === 6 || h === 22) base *= 0.4
  return Math.min(100, Math.round(base))
}

export const fmtMoney = (n: number) => '$' + Math.round(n).toLocaleString('en-US')
export const fmtCompact = (n: number) => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : String(n)

// The Creator Playbook — a real, downloadable artifact compiled from what's
// currently performing best. The literal "teach it to another BDR" deliverable.
export function buildPlaybookText(dateStr: string) {
  const topFormats = [...LEADERBOARD].sort((a, b) => b.avgEv - a.avgEv).slice(0, 3)
  const topHooks = [...HOOKS].sort((a, b) => b.avgEv - a.avgEv).slice(0, 3)
  const cells: { d: string; h: number; v: number }[] = []
  HEAT_DAYS.forEach((d, di) => HEAT_HOURS.forEach(h => cells.push({ d, h, v: heatVal(di, h) })))
  const topWindows = cells.sort((a, b) => b.v - a.v).slice(0, 5)
  const line = '================================================'
  return [
    'CONSUMERDIRECT CO-BRAND PLUS+ — PARTNER CONTENT PLAYBOOK', 'Generated ' + dateStr, '',
    line, 'TOP-PERFORMING CONTENT FORMATS', line,
    ...topFormats.map((f, i) => `${i + 1}. ${f.format} — avg EV ${fmtMoney(f.avgEv)}, ${f.saveRate} save, ${f.dmRate} DM (${f.posts} posts)`), '',
    line, 'TOP HOOK ARCHETYPES — OPEN WITH THESE', line,
    ...topHooks.map((h, i) => `${i + 1}. ${h.name} — avg EV ${fmtMoney(h.avgEv)}, ${h.retention}% retention (${h.uses}x)`), '',
    line, 'CONTENT PILLAR MIX — KEEP THIS BALANCE', line,
    ...PILLARS.map(p => `${p.name}: aim for ${p.goalPct}% (currently ${p.actualPct}%)`), '',
    line, 'BEST TIMES TO POST', line,
    ...topWindows.map((w, i) => `${i + 1}. ${w.d} at ${w.h}:00`), '',
    line, 'THE CORE PRINCIPLE', line,
    'Lead with proof and education, not a hard sell. The highest-converting content',
    'has the fewest links per post — build trust with agency owners first, ask second.',
    '', 'Hand this to any BDR you train. Regenerate any time — it reflects what\'s working now.',
  ].join('\n')
}

export function downloadPlaybook(dateStr: string) {
  if (typeof document === 'undefined') return
  const blob = new Blob([buildPlaybookText(dateStr)], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'ConsumerDirect-Partner-Content-Playbook.txt'
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
}
