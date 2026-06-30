// Adaptive triage heuristic. Deterministic and explainable (not opaque ML): it
// remembers what kinds of work you keep rolling over and gently biases future
// auto-triage so chronically-deferred categories get scheduled earlier, before
// they pile up. Stored per-user in users.settings.triageLearning.

export type WorkCat = 'focus' | 'admin' | 'plan' | 'other'

export interface TriageLearning {
  byType: Record<string, number>   // total deferrals seen per block type
  total: number                    // total deferrals recorded
  updatedAt?: string
}

export const EMPTY_LEARNING: TriageLearning = { byType: {}, total: 0 }

export function asLearning(raw: any): TriageLearning {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_LEARNING }
  return { byType: raw.byType && typeof raw.byType === 'object' ? raw.byType : {}, total: Number(raw.total) || 0, updatedAt: raw.updatedAt }
}

// Record that `count` tasks of a given block type were just deferred/rolled over.
export function recordDeferral(L: TriageLearning, blockType: string | null, count = 1, nowISO?: string): TriageLearning {
  const key = (blockType as WorkCat) || 'other'
  return {
    byType: { ...L.byType, [key]: (L.byType[key] ?? 0) + count },
    total: L.total + count,
    updatedAt: nowISO,
  }
}

// The category the user defers most — only once there's enough signal.
export function chronicCategory(L: TriageLearning): { type: string; share: number } | null {
  if (L.total < 4) return null
  let best: string | null = null, bestN = 0
  for (const [k, n] of Object.entries(L.byType)) if (n > bestN) { bestN = n; best = k }
  if (!best) return null
  return { type: best, share: bestN / L.total }
}

// A small, capped urgency bonus for the chronically-deferred category so the
// auto-planner schedules that work earlier next time.
export function learnedBonus(L: TriageLearning): (cat: 'focus' | 'admin' | 'plan' | null) => number {
  const c = chronicCategory(L)
  if (!c || c.share < 0.4) return () => 0
  const boost = Math.min(50, Math.round(60 * c.share))
  return (cat) => (cat === c.type ? boost : 0)
}

const CAT_LABEL: Record<string, string> = { focus: 'selling', admin: 'admin', plan: 'planning', other: 'these' }

// An honest, plain-English explanation of what the engine has learned.
export function learnedTip(L: TriageLearning): string | null {
  const c = chronicCategory(L)
  if (!c || c.share < 0.4) return null
  return `You roll over ${CAT_LABEL[c.type] ?? c.type} tasks most — the Hub now schedules them earlier so they don't pile up.`
}
