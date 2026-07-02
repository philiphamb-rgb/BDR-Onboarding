// @ts-nocheck
// Self-improvement loop — the company learns from its own performance, not just
// from rep feedback. Reads each team's recent agent-run errors, clusters the
// failure patterns, and proposes a prompt ADDENDUM per struggling agent into the
// same review queue managers already use (growth_instruction_proposals). Nothing
// is applied automatically — every proposal is human-approved, per the HITL rule.

import Anthropic from '@anthropic-ai/sdk'
import { ROSTER } from '@/lib/modules/growth-os/roster'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const ROSTER_LINES = ROSTER.map(a => `- ${a.id}: ${a.name} (${a.category})`).join('\n')
const VALID = new Set(ROSTER.map(a => a.id))

const SYS = `You are the Apex self-improvement engine for a ConsumerDirect Co-Brand PLUS+ BDR team. You are given a summary of recent AGENT RUN ERRORS (which agent failed, how often, and sample error messages), plus the agent roster. Turn the recurring failure patterns into at most 4 concrete improvement PROPOSALS, each targeting ONE agent as a short instruction ADDENDUM to append to its system prompt so the failure is less likely next time.

THE AGENT ROSTER (use these exact ids):
${ROSTER_LINES}

RULES
- Only target agents that actually show a recurring problem in the data — never invent one.
- Each addendum is 1–3 sentences, a directive TO the agent that addresses the observed failure (e.g. "If the input is missing a partner name, ask for it before proceeding rather than guessing.").
- Respect compliance: never propose anything implying a guaranteed credit outcome or misstating Co-Brand PLUS+ terms.
- If the errors are too sparse or generic to act on, return an empty array.
- Respond with ONLY a JSON array, no markdown fences, each object exactly: {"agent_id","summary","addendum","rationale","source_ids"} where source_ids is an array of the agent_run ids referenced.`

// Reads recent errored runs for a team, clusters them, returns validated
// proposal rows (team_id stamped). Never throws — returns a reason instead.
export async function synthesizeSelfImprovement({ supabase, teamId, days = 7 }) {
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const { data: runs } = await supabase.from('agent_runs')
    .select('id, agent_id, status, error, trigger, started_at')
    .eq('team_id', teamId).eq('status', 'error').gte('started_at', since)
    .order('started_at', { ascending: false }).limit(200)
  const errs = (runs ?? []).filter(r => (r.error || '').trim())
  if (errs.length < 3) return { rows: [], reason: 'not enough errored runs to learn from' }

  // Compact per-agent error summary so the model sees the pattern, not noise.
  const byAgent: Record<string, any> = {}
  for (const r of errs) {
    const a = (byAgent[r.agent_id] ??= { count: 0, samples: [], ids: [] })
    a.count++
    if (a.samples.length < 3) a.samples.push(String(r.error).slice(0, 160))
    if (a.ids.length < 8) a.ids.push(r.id)
  }
  const summary = Object.entries(byAgent)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([id, v]: any) => `- ${id}: ${v.count} errors. Samples: ${v.samples.map(s => `"${s}"`).join('; ')}. run_ids: [${v.ids.join(', ')}]`)
    .join('\n')

  let proposals = []
  try {
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 1200, system: SYS,
      messages: [{ role: 'user', content: `AGENT RUN ERRORS over the last ${days} days:\n${summary}` }],
    })
    const text = resp.content.find(c => c.type === 'text')?.text ?? '[]'
    proposals = JSON.parse(text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, ''))
  } catch { return { rows: [], reason: 'no parseable proposals' } }

  const rows = (Array.isArray(proposals) ? proposals : [])
    .filter(p => p && VALID.has(p.agent_id) && (p.addendum || '').trim() && (p.summary || '').trim())
    .slice(0, 4)
    .map(p => ({
      team_id: teamId, agent_id: p.agent_id,
      summary: `[self-review] ${String(p.summary).slice(0, 185)}`,
      addendum: String(p.addendum).slice(0, 800),
      rationale: p.rationale ? String(p.rationale).slice(0, 500) : null,
      source_ids: Array.isArray(p.source_ids) ? p.source_ids : [],
    }))
  return { rows, reason: rows.length ? null : 'no clear proposals from the error patterns' }
}
