// Daily Rhythm — BDR shift options + an optimized, time-blocked day.
// Blocks are stored as offsets from the shift start so the same template renders
// at the right clock times for whichever shift a rep picks.

export interface ShiftOption { start: string; end: string } // "HH:MM" 24h
export const SHIFT_OPTIONS: ShiftOption[] = [
  { start: '06:00', end: '14:30' },
  { start: '06:30', end: '15:00' },
  { start: '07:00', end: '15:30' },
  { start: '07:30', end: '16:00' },
  { start: '08:00', end: '16:30' },
  { start: '08:30', end: '17:00' },
]
export const DEFAULT_SHIFT = '08:00'

export type BlockType = 'plan' | 'focus' | 'break' | 'lunch' | 'admin'

export interface ScheduleBlock {
  off: number   // minutes after shift start
  dur: number   // minutes
  label: string
  type: BlockType
  tip?: string
  href?: string // tap-through to the screen where this block's work happens
  cta?: string  // short call-to-action label for the link
}

// Optimized from the rep's draft: three contiguous "Talk to Partners" power
// blocks (4h 45m of selling), breaks protected, all admin batched to the end so
// peak-energy hours go to live conversations. 8h paid + 30m lunch = 8h30 span.
export const OPTIMIZED_DAY: ScheduleBlock[] = [
  { off: 0,   dur: 30,  label: 'Review Pipeline & Plan',          type: 'plan',  tip: 'Sort leads by score, set your top 3, clear HubSpot tasks, flag today’s risers.', href: '/partners', cta: 'Open pipeline' },
  { off: 30,  dur: 120, label: 'Talk to Partners — Power Block 1', type: 'focus', tip: 'Your highest-energy calling block. No admin — live conversations only.', href: '/drill', cta: 'Warm up in the Drill' },
  { off: 150, dur: 15,  label: 'Break',                            type: 'break' },
  { off: 165, dur: 75,  label: 'Talk to Partners — Power Block 2', type: 'focus', tip: 'Demos and discovery. Lead with the prospect’s pain (Sandler).', href: '/drill', cta: 'Warm up in the Drill' },
  { off: 240, dur: 30,  label: '30 Min Lunch',                     type: 'lunch' },
  { off: 270, dur: 90,  label: 'Talk to Partners — Follow-ups',    type: 'focus', tip: 'Re-engage risers, send order forms, book the next step before you hang up.', href: '/partners', cta: 'Work partners' },
  { off: 360, dur: 15,  label: 'Break',                            type: 'break' },
  { off: 375, dur: 105, label: 'Clean Up Records & Onboarding',    type: 'admin', tip: 'CRM hygiene, log every call, advance partner onboarding checklists.', href: '/partners', cta: 'Update onboarding' },
  { off: 480, dur: 30,  label: 'End-of-Day Standard',             type: 'plan',  tip: 'Update deal stages, log activity, set tomorrow’s first three calls.', href: '/today', cta: 'Log today' },
]

// Which block is happening right now, given the rep's shift start and the
// current local time. Used for the "Right now" card on Home.
// NOTE: compares the device's local time to the bare "HH:MM" shift string, so
// it assumes the rep's device clock is in the shift's intended timezone. Fine
// for a single-timezone team; revisit (anchor to a fixed TZ) if reps span zones.
export function currentBlock(shiftStart: string, now: Date = new Date()) {
  const base = parseHM(shiftStart)
  const cur = now.getHours() * 60 + now.getMinutes()
  const last = OPTIMIZED_DAY[OPTIMIZED_DAY.length - 1]
  const dayEnd = base + last.off + last.dur
  if (cur < base) return { status: 'before' as const, startsAt: base }
  if (cur >= dayEnd) return { status: 'after' as const }
  for (const b of OPTIMIZED_DAY) {
    const s = base + b.off, e = s + b.dur
    if (cur >= s && cur < e) return { status: 'active' as const, block: b, startsAt: s, endsAt: e, remaining: e - cur }
  }
  return { status: 'after' as const }
}

export const BLOCK_STYLE: Record<BlockType, { color: string; label: string }> = {
  plan:  { color: '#003087', label: 'Plan' },
  focus: { color: '#00C2B2', label: 'Sell' },
  break: { color: '#F5A623', label: 'Break' },
  lunch: { color: '#64748B', label: 'Lunch' },
  admin: { color: '#6D28D9', label: 'Admin' },
}

export function parseHM(hm: string): number {
  const [h, m] = hm.split(':').map(Number)
  return h * 60 + (m || 0)
}
export function fmtClock(minOfDay: number): string {
  const h = Math.floor(minOfDay / 60) % 24
  const m = minOfDay % 60
  const ap = h >= 12 ? 'PM' : 'AM'
  const hh = h % 12 === 0 ? 12 : h % 12
  return `${hh}:${String(m).padStart(2, '0')} ${ap}`
}
export function fmtShift(s: ShiftOption): string {
  return `${fmtClock(parseHM(s.start))} – ${fmtClock(parseHM(s.end))}`
}
export function fmtDuration(min: number): string {
  const h = Math.floor(min / 60), m = min % 60
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`
}
// Total minutes of selling (focus) time in the optimized day.
export const SELLING_MINUTES = OPTIMIZED_DAY.filter(b => b.type === 'focus').reduce((s, b) => s + b.dur, 0)
