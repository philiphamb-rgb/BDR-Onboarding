// @ts-nocheck
// Apex — shared feedback-synthesis core, used by both the interactive
// (manager-triggered) route and the scheduled cron. Reads recent feedback for a
// team, asks Claude to cluster it into at most 4 agent-scoped instruction
// proposals, and returns validated rows ready to insert. The caller owns the
// insert (RLS client for the manager path; service role for cron).

import Anthropic from '@anthropic-ai/sdk'
import { ROSTER } from '@/lib/modules/growth-os/roster'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const ROSTER_LINES = ROSTER.map(a => `- ${a.id}: ${a.name} (${a.category}) — ${a.tagline}`).join('\n')
const VALID = new Set(ROSTER.map(a => a.id))

const SYS = `You are the Apex improvement synthesizer for a ConsumerDirect Co-Brand PLUS+ BDR team. You are given a batch of recent, real feedback from reps about the Apex system, and the roster of AI agents. Cluster the feedback into at most 4 concrete, high-signal improvement PROPOSALS, each targeting ONE agent and expressed as a short instruction ADDENDUM that could be appended to that agent's system prompt to address the feedback.

THE AGENT ROSTER (use these exact ids):
${ROSTER_LINES}

RULES
- Only propose changes clearly supported by the feedback — never invent a theme.
- Each addendum is 1–3 sentences, written as a directive TO the agent (e.g. "When a partner mentions pricing, always ... ").
- Respect compliance: never propose anything that would imply a guaranteed credit outcome or misstate Co-Brand PLUS+ terms.
- If the feedback is too thin or vague to act on, return an empty array — do not force proposals.
- Respond with ONLY a JSON array, no markdown fences, each object exactly: {"agent_id","summary","addendum","rationale","source_ids"} where source_ids is an array of the feedback ids this proposal draws from.`

// Read the team's recent detailed feedback via the given client, synthesize, and
// return validated proposal rows (team_id stamped). Never throws — returns a reason.
export async function synthesizeTeam({ supabase, teamId, days = 30 }) {
  const since = new Date(Date.now() - days * 86400000).toISOString()
  let query = supabase.from('growth_feedback').select('id, sentiment, detail, created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(120)
  if (teamId) query = query.eq('team_id', teamId)   // required for the service-role/cron path; harmless under RLS
  const { data: fb } = await query
  const items = (fb ?? []).filter(f => (f.detail || '').trim())
  if (items.length === 0) return { rows: [], reason: 'no actionable feedback with detail yet' }

  const userMsg = `RECENT FEEDBACK (${items.length} items):\n` + items.map(f => `[${f.id}] (${f.sentiment}) ${f.detail}`).join('\n')
  let proposals = []
  try {
    const resp = await anthropic.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 1200, system: SYS, messages: [{ role: 'user', content: userMsg }] })
    const text = resp.content.find(c => c.type === 'text')?.text ?? '[]'
    proposals = JSON.parse(text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, ''))
  } catch { return { rows: [], reason: 'synthesis produced no parseable proposals' } }

  const rows = (Array.isArray(proposals) ? proposals : [])
    .filter(p => p && VALID.has(p.agent_id) && (p.addendum || '').trim() && (p.summary || '').trim())
    .slice(0, 4)
    .map(p => ({ team_id: teamId, agent_id: p.agent_id, summary: String(p.summary).slice(0, 200), addendum: String(p.addendum).slice(0, 800), rationale: p.rationale ? String(p.rationale).slice(0, 500) : null, source_ids: Array.isArray(p.source_ids) ? p.source_ids : [] }))
  return { rows, reason: rows.length ? null : 'no clear proposals from this batch' }
}
