// @ts-nocheck
// Autonomous brief generation — the core the scheduled crons run so the AI team
// works while the operator sleeps. Two shapes:
//   • Morning brief  — the Chief of Staff (Ravi) reads the operator's real
//     situation and writes the day's 3–5 priorities, grounded + brand-true.
//   • Nightly audit  — the QA Lead (Owen) reviews the day's agent activity for a
//     team and flags anything that needs a human (errors, pending reviews).
// Both persist to agent_briefs and log an agent_run, mirroring the interactive
// meeting-room path so observability stays one source of truth.

import Anthropic from '@anthropic-ai/sdk'
import { loadRegistry } from './registry'
import { buildAgentSystemPrompt } from './prompt'
import { buildBusinessContext, brandBlock } from './context'

const BRIEF_MODEL = process.env.AGENT_MODEL || 'claude-sonnet-4-6'

// One operator's morning brief. `supabase` is a service-role client (cron) so
// buildBusinessContext reads across RLS for the given user.
export async function generateMorningBrief({ supabase, anthropic, user, registry }: any) {
  const agent = registry.byId['daily-briefing']
  if (!agent) return null
  const { context, brand } = await buildBusinessContext(supabase, user.id, user.team_id)

  const started = Date.now()
  const system = buildAgentSystemPrompt(agent, context, brandBlock(brand, agent.brandVoiceOverride))
  const ask = `Write ${user.first_name || 'the operator'}'s morning brief for today. Ground it entirely in the business context above — do not invent numbers. Structure:
1. **Headline** — one line on where things stand.
2. **Today's 3 priorities** — the highest-leverage moves, each with the why in a few words.
3. **Watch** — anything slipping (a hot lead going cold, a goal off pace) — or "Nothing urgent" if clear.
Keep it tight and motivating. Markdown. No preamble.`

  let body = '', error: string | null = null
  try {
    const resp = await anthropic.messages.create({ model: BRIEF_MODEL, max_tokens: 550, system, messages: [{ role: 'user', content: ask }] })
    body = (resp.content?.[0]?.text || '').trim()
  } catch (e: any) { error = e?.message || 'generation failed' }

  await supabase.from('agent_runs').insert({
    agent_id: agent.id, user_id: user.id, team_id: user.team_id ?? null,
    trigger: 'cron', status: error ? 'error' : 'ok', model: BRIEF_MODEL,
    input: { kind: 'morning' }, output: { chars: body.length }, error,
    ended_at: new Date().toISOString(),
  })
  if (!body) return null

  await supabase.from('agent_briefs').insert({
    user_id: user.id, team_id: user.team_id ?? null, agent_id: agent.id,
    kind: 'morning', title: 'Your morning brief', body,
    data: { model: BRIEF_MODEL },
  })
  return { userId: user.id, chars: body.length }
}

// One team's nightly audit, authored by the QA Lead and delivered to each
// manager/owner on the team. Reads the day's agent activity + review backlog.
export async function generateNightlyAudit({ supabase, anthropic, registry, teamId, managers }: any) {
  const agent = registry.byId['qa']
  if (!agent || !managers?.length) return null
  const dayAgo = new Date(Date.now() - 86400000).toISOString()

  const [{ data: runs }, { count: pendingMem }, { count: pendingProps }] = await Promise.all([
    supabase.from('agent_runs').select('agent_id, status, trigger').eq('team_id', teamId).gte('started_at', dayAgo),
    supabase.from('memory_candidates').select('id', { count: 'exact', head: true }).eq('team_id', teamId).eq('status', 'pending'),
    supabase.from('growth_instruction_proposals').select('id', { count: 'exact', head: true }).eq('team_id', teamId).eq('status', 'pending'),
  ])
  const all = runs ?? []
  const errors = all.filter((r: any) => r.status === 'error')
  const byAgent: Record<string, number> = {}
  for (const r of all) byAgent[r.agent_id] = (byAgent[r.agent_id] ?? 0) + 1
  const topAgents = Object.entries(byAgent).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([id, n]) => `${registry.byId[id]?.fullName ?? id}: ${n}`).join(', ')

  const stats = `Last 24h — ${all.length} agent runs (${errors.length} errored). Most active: ${topAgents || 'none'}. Awaiting human review: ${pendingMem ?? 0} learnings, ${pendingProps ?? 0} improvement proposals.`
  const started = Date.now()
  const system = buildAgentSystemPrompt(agent, stats)
  const ask = `You are closing out the day as QA Lead. Based only on the stats above, write a short nightly audit for the manager:
1. **Health** — one line: is the AI team running clean?
2. **Flags** — bullet anything that needs a human (errors to check, a growing review backlog) — or "All clear" if nothing.
3. **Tomorrow** — one nudge on where attention will pay off.
Markdown, tight, no preamble.`

  let body = '', error: string | null = null
  try {
    const resp = await anthropic.messages.create({ model: BRIEF_MODEL, max_tokens: 450, system, messages: [{ role: 'user', content: ask }] })
    body = (resp.content?.[0]?.text || '').trim()
  } catch (e: any) { error = e?.message || 'generation failed' }

  await supabase.from('agent_runs').insert({
    agent_id: agent.id, user_id: null, team_id: teamId,
    trigger: 'cron', status: error ? 'error' : 'ok', model: BRIEF_MODEL,
    input: { kind: 'nightly', runs: all.length, errors: errors.length }, output: { chars: body.length }, error,
    ended_at: new Date().toISOString(),
  })
  if (!body) return null

  const rows = managers.map((m: any) => ({
    user_id: m.id, team_id: teamId, agent_id: agent.id,
    kind: 'nightly', title: 'Nightly team audit', body,
    data: { runs: all.length, errors: errors.length, pendingMem: pendingMem ?? 0, pendingProps: pendingProps ?? 0 },
  }))
  await supabase.from('agent_briefs').insert(rows)
  return { teamId, delivered: rows.length, runs: all.length, errors: errors.length }
}
