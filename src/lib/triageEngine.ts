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
}

export interface TriageConfig {
  agingDays: number   // an unscheduled task older than this is "stale"
  agingRate: number   // urgency points added per day of age
  agingCap: number    // ceiling on age points
}
export const DEFAULT_TRIAGE: TriageConfig = { agingDays: 7, agingRate: 6, agingCap: 60 }

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

// Higher = more urgent.
export function urgency(t: TriageTask, now: Date, cfg: TriageConfig = DEFAULT_TRIAGE): number {
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

export interface SchedSlot { index: number; type: string; capacity: number } // minutes

// Pack the highest-urgency active tasks into schedulable blocks. Returns a map
// taskId -> block index. Tasks already scheduled today keep their slot (and
// consume its capacity) unless reflow is requested.
export function autoPlan(
  tasks: TriageTask[], slots: SchedSlot[], now: Date,
  opts: { reflow?: boolean; cfg?: TriageConfig } = {},
): Record<string, number> {
  const cfg = opts.cfg ?? DEFAULT_TRIAGE
  const today = localDate(now)
  const remaining = slots.map(s => s.capacity)
  const slotByIndex: Record<number, number> = {}
  slots.forEach((s, k) => { slotByIndex[s.index] = k })
  const assign: Record<string, number> = {}

  const active = tasks.filter(t => isActive(t, now))

  // Honor existing today-assignments first (unless reflowing) so a manual plan
  // isn't blown away, and so their time is reserved.
  if (!opts.reflow) {
    for (const t of active) {
      if (t.scheduled_day === today && t.scheduled_block != null) {
        const k = slotByIndex[Number(t.scheduled_block)]
        if (k != null && remaining[k] >= t.estimated_minutes) {
          assign[t.id] = slots[k].index; remaining[k] -= t.estimated_minutes
        } else if (k != null) {
          assign[t.id] = slots[k].index   // keep it even if slightly over
        }
      }
    }
  }

  const pending = active
    .filter(t => assign[t.id] == null)
    .sort((a, b) => urgency(b, now, cfg) - urgency(a, now, cfg))

  for (const t of pending) {
    for (let k = 0; k < slots.length; k++) {
      if (remaining[k] >= t.estimated_minutes) {
        assign[t.id] = slots[k].index; remaining[k] -= t.estimated_minutes; break
      }
    }
  }
  return assign
}

export function fmtEst(min: number): string {
  if (min >= 60) { const h = Math.floor(min / 60), m = min % 60; return m ? `${h}h${m}` : `${h}h` }
  return `${min}m`
}
