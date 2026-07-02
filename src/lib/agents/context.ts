// @ts-nocheck
// Builds the live business context every agent reasons from — so the team feels
// like it actually knows the operator's world, not a generic bot. Blends current
// pipeline state, goals, top trusted memories (the learned playbook), the brand
// voice, and compliance-approved language. Kept compact so it fits comfortably
// in a system prompt.
//
// Memory retrieval note: no embedding provider is configured in this deployment,
// so retrieval is relevance-ranked (keyword overlap × trust) rather than vector
// similarity. When a `query` (the operator's current message/topic) is passed,
// the most relevant learnings surface first — a pragmatic RAG that upgrades to
// true embeddings later by swapping `scoreRelevance` for a vector search.

const STOP = new Set('the a an and or but of to in for on with your you our we is are be it this that as at by from into if then when who what how why'.split(' '))
function tokens(s: string): string[] {
  return (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w))
}
function scoreRelevance(queryToks: Set<string>, m: any): number {
  if (!queryToks.size) return 0
  const mt = new Set(tokens(`${m.title} ${m.content} ${m.category ?? ''}`))
  let hits = 0
  for (const t of mt) if (queryToks.has(t)) hits++
  return hits
}

export async function buildBusinessContext(supabase, userId: string, teamId: string | null, query = '') {
  const [partners, goalRow, progress, goalItems, accounts, memories, brand, approved] = await Promise.all([
    supabase.from('partner_onboarding').select('stage, temperature').eq('user_id', userId),
    supabase.from('goals').select('monthly_deal_goal').eq('user_id', userId).maybeSingle(),
    supabase.from('user_progress').select('deals_this_month, calls_this_week, demos_this_week').eq('user_id', userId).maybeSingle(),
    supabase.from('goal_items').select('horizon, title, target, metric, progress').eq('status', 'active').limit(8),
    supabase.from('accounts').select('name, smartcredit_fit_score, lifecycle_stage').order('smartcredit_fit_score', { ascending: false, nullsFirst: false }).limit(5),
    // Pull a wider slate when we have a query to re-rank by relevance; else just top-trust.
    supabase.from('semantic_memories').select('title, content, category, trust_score').eq('lifecycle_state', 'active').order('trust_score', { ascending: false }).limit(query ? 30 : 6),
    teamId ? supabase.from('brand_settings').select('*').eq('team_id', teamId).maybeSingle() : Promise.resolve({ data: null }),
    teamId ? supabase.from('approved_language').select('category, label, snippet').eq('team_id', teamId).eq('active', true).limit(20) : Promise.resolve({ data: null }),
  ])

  const pRows = partners.data ?? []
  const stageCount = (s: string) => pRows.filter((p: any) => p.stage === s).length
  const hot = pRows.filter((p: any) => p.temperature === 'hot' && p.stage !== 'opportunity_won').length
  const parts: string[] = []

  parts.push(`Pipeline: ${pRows.length} partners tracked (${hot} hot, ${stageCount('proposal_sent') + stageCount('contract_signed')} awaiting a next step, ${stageCount('opportunity_won')} won).`)
  if (goalRow.data?.monthly_deal_goal) parts.push(`Monthly deal goal: ${progress.data?.deals_this_month ?? 0} of ${goalRow.data.monthly_deal_goal}. This week: ${progress.data?.calls_this_week ?? 0} calls, ${progress.data?.demos_this_week ?? 0} demos.`)
  if ((goalItems.data ?? []).length) parts.push(`Active goals: ${goalItems.data.map((g: any) => `${g.horizon} — ${g.title}${g.target ? ` (${g.progress}/${g.target}${g.metric ? ' ' + g.metric : ''})` : ''}`).join('; ')}.`)
  if ((accounts.data ?? []).length) parts.push(`Top-fit businesses: ${accounts.data.map((a: any) => `${a.name}${a.smartcredit_fit_score != null ? ` (fit ${a.smartcredit_fit_score})` : ''}`).join(', ')}.`)
  // Relevance-rank when we have the operator's query: overlap first, trust as tiebreak.
  let mems = memories.data ?? []
  if (query && mems.length) {
    const qt = new Set(tokens(query))
    mems = mems
      .map((m: any) => ({ m, rel: scoreRelevance(qt, m) }))
      .sort((a: any, b: any) => (b.rel - a.rel) || (b.m.trust_score - a.m.trust_score))
      .slice(0, 6).map((x: any) => x.m)
  }
  if (mems.length) parts.push(`Trusted learnings (${query ? 'most relevant to this conversation' : 'approved'} — treat as playbook):\n${mems.map((m: any) => `- ${m.title}: ${m.content} [trust ${m.trust_score}]`).join('\n')}`)
  if ((approved?.data ?? []).length) parts.push(`APPROVED LANGUAGE (pre-cleared by compliance — for any regulated, credit, or SmartCredit claim, use these exact phrasings; never improvise a new claim around them):\n${approved.data.map((a: any) => `- [${a.category}] ${a.label}: "${a.snippet}"`).join('\n')}`)

  return { context: parts.join('\n'), brand: brand.data }
}

// The brand-voice block, given the team brand + an agent's optional override.
export function brandBlock(brand: any, agentOverride: string | null): string {
  const voice = agentOverride || brand?.voice
  if (!brand && !voice) return ''
  const lines: string[] = []
  if (voice) lines.push(`Write in this brand voice: ${voice}`)
  if (brand?.audience) lines.push(`Audience: ${brand.audience}`)
  if (brand?.promise) lines.push(`Core promise: ${brand.promise}`)
  if (brand?.dos) lines.push(`Always: ${brand.dos}`)
  if (brand?.donts) lines.push(`Never: ${brand.donts}`)
  return lines.length ? `\nBRAND:\n${lines.join('\n')}` : ''
}
