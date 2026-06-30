// AI-forward day triage. Deterministic (no fabricated data): it scores every
// open task by urgency — manual priority, due-date pressure, and AGE (older
// tasks creep up so nothing rots) — then packs the highest-urgency tasks into
// the day's schedulable time blocks by their time estimate and each block's
// remaining capacity. The same scoring drives the "tidy up" prompts for stale
// tasks (defer or remove) so the list never congests.

export interface TriageTask {
  id: string
  title: string
  done: boolean
  priority: boolean
  due_date: string | null         // YYYY-MM-DD
  estimated_minutes: number
  created_at: string              // ISO
  scheduled_day: string | null    // YYYY-MM-DD
  scheduled_block: string | null
  snoozed_until: string | null    // YYYY-MM-DD
  deferral_count?: number         // times rolled over / deferred
}

export interface TriageConfig {
  agingDays: number    // an unscheduled task older than this is "stale"
  agingRate: number    // urgency points added per day of age
  agingCap: number     // ceiling on age points
  deferralRate: number // urgency points added per deferral
  deferralCap: number  // ceiling on deferral points
}
export const DEFAULT_TRIAGE: TriageConfig = { agingDays: 7, agingRate: 6, agingCap: 60, deferralRate: 30, deferralCap: 120 }

// After this many auto-rollovers a task stops silently rolling and is surfaced
// for an explicit decision (do it, schedule it deliberately, or drop it) — so
// nothing can be deferred forever.
export const MAX_DEFERRALS = 5
// At/after this many deferrals a task auto-escalates to the priority flag.
export const AUTO_PRIORITY_DEFERRALS = 3

export function localDate(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
function dayDiff(a: string, b: string): number {
  // whole days from a -> b (b - a)
  const da = new Date(a + 'T00:00:00'), db = new Date(b + 'T00:00:00')
  return Math.round((db.getTime() - da.getTime()) / 86400000)
}
function ageDays(createdISO: string, now: Date): number {
  const created = new Date(createdISO)
  return Math.max(0, Math.floor((now.getTime() - created.getTime()) / 86400000))
}

// Higher = more urgent. Older tasks AND tasks that keep getting deferred both
// creep up so nothing gets buried. `learnBonus` lets the adaptive engine nudge
// whole categories the user chronically defers (see lib/triageLearning).
export function urgency(
  t: TriageTask, now: Date,
  cfg: TriageConfig = DEFAULT_TRIAGE,
  learnBonus?: (cat: 'focus' | 'admin' | 'plan' | null) => number,
): number {
  const today = localDate(now)
  let s = 0
  if (t.priority) s += 100
  if (t.due_date) {
    const d = dayDiff(today, t.due_date)
    if (d < 0) s += 200 + Math.min(120, -d * 20)   // overdue — worse the older
    else if (d === 0) s += 150
    else s += Math.max(0, 90 - d * 12)
  }
  s += Math.min(cfg.agingCap, ageDays(t.created_at, now) * cfg.agingRate)
  s += Math.min(cfg.deferralCap, (t.deferral_count ?? 0) * cfg.deferralRate)
  if (learnBonus) s += learnBonus(categorize(t.title))
  return Math.round(s)
}

export function urgencyLabel(score: number): { label: string; tone: 'high' | 'med' | 'low' } {
  if (score >= 150) return { label: 'Critical', tone: 'high' }
  if (score >= 80) return { label: 'High', tone: 'high' }
  if (score >= 40) return { label: 'Medium', tone: 'med' }
  return { label: 'Low', tone: 'low' }
}

// Is the task actively schedulable right now (not done, snooze elapsed)?
export function isActive(t: TriageTask, now: Date): boolean {
  if (t.done) return false
  if (t.snoozed_until && dayDiff(localDate(now), t.snoozed_until) > 0) return false
  return true
}

// Stale = active, unscheduled, and older than the aging threshold with no
// imminent due date → a candidate to defer or remove.
export function isStale(t: TriageTask, now: Date, cfg: TriageConfig = DEFAULT_TRIAGE): boolean {
  if (!isActive(t, now)) return false
  if (t.scheduled_day) return false
  if (t.due_date && dayDiff(localDate(now), t.due_date) <= 2) return false
  return ageDays(t.created_at, now) >= cfg.agingDays
}

export interface SchedSlot { key: string; type: string; capacity: number } // minutes

// Infer which kind of block a task belongs in from its title, so selling work
// lands in power blocks, admin in the admin block, planning in the plan block.
export function categorize(title: string): 'focus' | 'admin' | 'plan' | null {
  const t = (title || '').toLowerCase()
  if (/\b(call|follow[\s-]?up|prospect|demo|reach|pitch|close|outreach|book|meet|partner|lead|sell|email)\b/.test(t)) return 'focus'
  if (/\b(update|crm|hubspot|log|note|admin|clean|onboard|report|invoice|form|data|inbox)\b/.test(t)) return 'admin'
  if (/\b(plan|review|prioriti|organi|prep|strategy|research)\b/.test(t)) return 'plan'
  return null
}

// Pack the highest-urgency active tasks into schedulable blocks. Returns a map
// taskId -> block index. Tasks already scheduled today keep their slot (and
// consume its capacity) unless reflow is requested.
// Choose the next time block to roll an incomplete task into: a work block that
// hasn't ended yet (start+dur > afterMin), still has room for the task's
// estimate, preferring one whose type matches the task. Returns null → defer to
// another day. `used` is minutes already consumed per block key.
export interface PlacementBlock { key: string; type: string; start: number; dur: number }
export function pickRolloverBlock(
  t: TriageTask, blocks: PlacementBlock[], used: Record<string, number>, afterMin: number, excludeKey?: string,
): string | null {
  const est = t.estimated_minutes || 30
  const cat = categorize(t.title)
  const cands = blocks
    .filter(b => ['plan', 'focus', 'admin'].includes(b.type) && b.key !== excludeKey && (b.start + b.dur) > afterMin)
    .sort((a, b) => a.start - b.start)
  const room = (b: PlacementBlock) => (b.dur - (used[b.key] ?? 0)) >= est
  return (cat && cands.find(b => b.type === cat && room(b))?.key) || cands.find(room)?.key || null
}

export function autoPlan(
  tasks: TriageTask[], slots: SchedSlot[], now: Date,
  opts: { reflow?: boolean; cfg?: TriageConfig; learn?: (cat: 'focus' | 'admin' | 'plan' | null) => number } = {},
): Record<string, string> {
  const cfg = opts.cfg ?? DEFAULT_TRIAGE
  const today = localDate(now)
  const remaining = slots.map(s => s.capacity)
  const slotPos: Record<string, number> = {}
  slots.forEach((s, k) => { slotPos[s.key] = k })
  const assign: Record<string, string> = {}

  const active = tasks.filter(t => isActive(t, now))

  // Honor existing today-assignments first (unless reflowing) so a manual plan
  // isn't blown away, and so their time is reserved.
  if (!opts.reflow) {
    for (const t of active) {
      if (t.scheduled_day === today && t.scheduled_block != null) {
        const k = slotPos[String(t.scheduled_block)]
        if (k != null && remaining[k] >= t.estimated_minutes) {
          assign[t.id] = slots[k].key; remaining[k] -= t.estimated_minutes
        } else if (k != null) {
          assign[t.id] = slots[k].key   // keep it even if slightly over
        }
      }
    }
  }

  const pending = active
    .filter(t => assign[t.id] == null)
    .sort((a, b) => urgency(b, now, cfg, opts.learn) - urgency(a, now, cfg, opts.learn))

  for (const t of pending) {
    const cat = categorize(t.title)
    let placed = false
    // First choice: a block whose type matches the task's nature.
    if (cat) {
      for (let k = 0; k < slots.length; k++) {
        if (slots[k].type === cat && remaining[k] >= t.estimated_minutes) {
          assign[t.id] = slots[k].key; remaining[k] -= t.estimated_minutes; placed = true; break
        }
      }
    }
    // Fallback: the first block with room at all.
    if (!placed) {
      for (let k = 0; k < slots.length; k++) {
        if (remaining[k] >= t.estimated_minutes) { assign[t.id] = slots[k].key; remaining[k] -= t.estimated_minutes; break }
      }
    }
  }
  return assign
}

export function fmtEst(min: number): string {
  if (min >= 60) { const h = Math.floor(min / 60), m = min % 60; return m ? `${h}h${m}` : `${h}h` }
  return `${min}m`
}
