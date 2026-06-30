// Single source of truth for the belt ladder — thresholds, labels, colors, and
// dot classes. Previously duplicated across Home (BELT_LADDER), Certificate
// (BELTS), and Leaderboard (beltFromDays + BELT_DOT), which could silently
// drift. Belts rank by days active in BDR Hub.

export interface Belt {
  key: string
  label: string
  color: string   // hex for swatches/rings
  dot: string     // tailwind bg-* class for small dots
  day: number     // days-active threshold to reach this belt
  blurb: string
}

export const BELTS: Belt[] = [
  { key: 'white',  label: 'White',  color: '#9CA3AF', dot: 'bg-gray-300',  day: 0,  blurb: 'Day one. Learn the fundamentals and start logging activity.' },
  { key: 'yellow', label: 'Yellow', color: '#FBBF24', dot: 'bg-yellow-400', day: 7,  blurb: 'One week in — building the daily habit.' },
  { key: 'orange', label: 'Orange', color: '#F97316', dot: 'bg-orange-500', day: 14, blurb: 'Two weeks — running real conversations.' },
  { key: 'green',  label: 'Green',  color: '#22C55E', dot: 'bg-green-500',  day: 30, blurb: 'A month in — consistent pipeline work.' },
  { key: 'blue',   label: 'Blue',   color: '#3B82F6', dot: 'bg-blue-600',   day: 50, blurb: 'Seasoned — closing and onboarding partners.' },
  { key: 'purple', label: 'Purple', color: '#9333EA', dot: 'bg-purple-600', day: 70, blurb: 'Advanced — coaching-level fundamentals.' },
  { key: 'black',  label: 'Black',  color: '#111827', dot: 'bg-gray-900',   day: 90, blurb: 'Mastery — 90+ days of proven performance.' },
]

export const BELT_DOT: Record<string, string> = Object.fromEntries(BELTS.map(b => [b.key, b.dot]))
export const BELT_COLOR: Record<string, string> = Object.fromEntries(BELTS.map(b => [b.key, b.color]))

// Belt key from days active (highest threshold reached).
export function beltFromDays(d: number): string {
  let key = BELTS[0].key
  for (const b of BELTS) if (d >= b.day) key = b.key
  return key
}

// Normalize a stored belt_rank string ("White Belt", "white") to a belt key.
export function normalizeBelt(rank?: string | null): string {
  return (rank || 'white').toLowerCase().replace(' belt', '').trim()
}

export function beltIndex(key: string): number {
  const i = BELTS.findIndex(b => b.key === key)
  return i < 0 ? 0 : i
}
