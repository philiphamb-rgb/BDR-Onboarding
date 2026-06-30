// One shared loader for "today's schedulable blocks" — the optimized template
// plus the rep's per-day overrides and custom (freeform) blocks, filtered to the
// work block types and ordered upcoming-first. Home, Today, and Notes all need
// this identical slot list for on-screen auto-plan; defining it once removes the
// three copy-pasted loaders (and the shift-default drift between them).

import { OPTIMIZED_DAY, parseHM, DEFAULT_SHIFT, localToday } from './schedule'

export interface DaySlot { key: string; type: string; capacity: number }

export async function fetchDaySlots(
  supabase: any,
  uid: string,
  opts: { types?: string[] } = {},
): Promise<DaySlot[]> {
  const types = opts.types ?? ['plan', 'focus', 'admin']
  const [{ data: u }, { data: rows }] = await Promise.all([
    supabase.from('users').select('settings').eq('id', uid).single(),
    supabase.from('schedule_blocks').select('block_key, type, start_min, dur_min').eq('user_id', uid).eq('day', localToday()),
  ])
  const start = (u?.settings as any)?.shift || DEFAULT_SHIFT
  const base = parseHM(start)
  const ov: Record<string, any> = {}
  const customs: any[] = []
  for (const r of rows ?? []) {
    if (/^\d+$/.test(r.block_key)) ov[r.block_key] = r
    else customs.push({ key: r.block_key, type: r.type, start: r.start_min, dur: r.dur_min })
  }
  const template = OPTIMIZED_DAY.map((b, i) => ({ key: String(i), type: b.type, start: ov[i]?.start_min ?? base + b.off, dur: ov[i]?.dur_min ?? b.dur }))
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
  return [...template, ...customs]
    .filter(b => types.includes(b.type))
    .sort((a, b) => { const ap = (a.start + a.dur) <= nowMin ? 1 : 0, bp = (b.start + b.dur) <= nowMin ? 1 : 0; return ap - bp || a.start - b.start })
    .map(b => ({ key: b.key, type: b.type, capacity: b.dur }))
}
