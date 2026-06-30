// Friction-free, instant note triage (no network needed). As the rep writes,
// we infer a category/folder, tags, and — when turning a line into a task — a
// time estimate and priority from context. The optional /api/note-triage route
// can layer richer AI extraction on top, but everything works without it.

export const NOTE_CATEGORIES = ['Selling', 'Admin', 'Planning', 'Learning', 'Personal', 'General'] as const
export type NoteCategory = typeof NOTE_CATEGORIES[number]

export const CATEGORY_COLOR: Record<string, string> = {
  Selling: '#00C2B2', Admin: '#6D28D9', Planning: '#003087',
  Learning: '#CA8A04', Personal: '#16A34A', General: '#64748B',
}

function categoryFor(text: string): NoteCategory {
  const t = text.toLowerCase()
  if (/\b(call|follow[\s-]?up|prospect|demo|pitch|close|lead|partner|outreach|email|deal|quote|proposal)\b/.test(t)) return 'Selling'
  if (/\b(update|crm|hubspot|log|admin|report|invoice|form|data|onboard|inbox|expense)\b/.test(t)) return 'Admin'
  if (/\b(plan|review|prep|research|strategy|organi|roadmap|goal)\b/.test(t)) return 'Planning'
  if (/\b(learn|study|train|course|watch|read|practice|drill|certif)\b/.test(t)) return 'Learning'
  if (/\b(gym|family|home|personal|errand|appt|appointment|doctor|lunch)\b/.test(t)) return 'Personal'
  return 'General'
}

// Hashtags + a couple of inferred keyword tags.
function tagsFor(text: string, category: string): string[] {
  const hash = (text.match(/#([\w-]+)/g) || []).map(s => s.slice(1).toLowerCase())
  const inferred: string[] = []
  const t = text.toLowerCase()
  if (/\b(follow[\s-]?up)\b/.test(t)) inferred.push('follow-up')
  if (/\b(urgent|asap|today|eod|deadline)\b/.test(t)) inferred.push('urgent')
  if (/\b(demo)\b/.test(t)) inferred.push('demo')
  if (/\b(prospect|new lead)\b/.test(t)) inferred.push('prospecting')
  return Array.from(new Set([...hash, ...inferred])).slice(0, 6)
}

function priorityFor(text: string): boolean {
  return /\b(urgent|asap|today|now|important|critical|eod|by end of day|deadline|must)\b/.test(text.toLowerCase())
}

function estimateFor(text: string, category: string): number {
  const t = text.toLowerCase()
  if (/\b(quick|brief|short|ping|reply)\b/.test(t)) return 10
  if (/\b(demo|meeting|call with|deep|build|write up|prepare)\b/.test(t)) return 45
  if (category === 'Selling') return 15
  if (category === 'Admin') return 20
  if (category === 'Planning') return 30
  return 30
}

export interface SmartDefaults { estimated_minutes: number; priority: boolean; category: NoteCategory; tags: string[] }

// Smart defaults for a task created from a line of note text.
export function smartTaskDefaults(text: string): SmartDefaults {
  const category = categoryFor(text)
  return { estimated_minutes: estimateFor(text, category), priority: priorityFor(text), category, tags: tagsFor(text, category) }
}

// Suggested category + tags for a whole note (combined block text).
export function suggestNoteMeta(text: string): { category: NoteCategory; tags: string[] } {
  const category = categoryFor(text)
  return { category, tags: tagsFor(text, category) }
}

// Heuristic: does a line read like an action item? (for auto-extracting tasks)
export function looksActionable(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  if (/^[-*\[]\s*\]?/.test(t)) return true               // - item, * item, [ ] item
  if (/^(call|email|follow|send|book|schedule|prep|update|review|draft|finish|fix|ask|check|confirm|reach|set up|create|write|build|add|remove|plan)\b/i.test(t)) return true
  return false
}

// Strip leading bullet / checkbox markers for a clean task title.
export function cleanTaskTitle(text: string): string {
  return text.replace(/^\s*[-*]\s+/, '').replace(/^\s*\[\s*\]?\s*/, '').replace(/^\s*\[x\]\s*/i, '').trim()
}
