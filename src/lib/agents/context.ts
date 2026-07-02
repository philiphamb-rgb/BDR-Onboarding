// @ts-nocheck
// Builds the live business context every agent reasons from — so the team feels
// like it actually knows the operator's world, not a generic bot. Blends current
// pipeline state, goals, top trusted memories (the learned playbook), and the
// brand voice. Kept compact so it fits comfortably in a system prompt.

export async function buildBusinessContext(supabase, userId: string, teamId: string | null) {
  const [partners, goalRow, progress, goalItems, accounts, memories, brand] = await Promise.all([
    supabase.from('partner_onboarding').select('stage, temperature').eq('user_id', userId),
    supabase.from('goals').select('monthly_deal_goal').eq('user_id', userId).maybeSingle(),
    supabase.from('user_progress').select('deals_this_month, calls_this_week, demos_this_week').eq('user_id', userId).maybeSingle(),
    supabase.from('goal_items').select('horizon, title, target, metric, progress').eq('status', 'active').limit(8),
    supabase.from('accounts').select('name, smartcredit_fit_score, lifecycle_stage').order('smartcredit_fit_score', { ascending: false, nullsFirst: false }).limit(5),
    supabase.from('semantic_memories').select('title, content, trust_score').eq('lifecycle_state', 'active').order('trust_score', { ascending: false }).limit(6),
    teamId ? supabase.from('brand_settings').select('*').eq('team_id', teamId).maybeSingle() : Promise.resolve({ data: null }),
  ])

  const pRows = partners.data ?? []
  const stageCount = (s: string) => pRows.filter((p: any) => p.stage === s).length
  const hot = pRows.filter((p: any) => p.temperature === 'hot' && p.stage !== 'opportunity_won').length
  const parts: string[] = []

  parts.push(`Pipeline: ${pRows.length} partners tracked (${hot} hot, ${stageCount('proposal_sent') + stageCount('contract_signed')} awaiting a next step, ${stageCount('opportunity_won')} won).`)
  if (goalRow.data?.monthly_deal_goal) parts.push(`Monthly deal goal: ${progress.data?.deals_this_month ?? 0} of ${goalRow.data.monthly_deal_goal}. This week: ${progress.data?.calls_this_week ?? 0} calls, ${progress.data?.demos_this_week ?? 0} demos.`)
  if ((goalItems.data ?? []).length) parts.push(`Active goals: ${goalItems.data.map((g: any) => `${g.horizon} — ${g.title}${g.target ? ` (${g.progress}/${g.target}${g.metric ? ' ' + g.metric : ''})` : ''}`).join('; ')}.`)
  if ((accounts.data ?? []).length) parts.push(`Top-fit businesses: ${accounts.data.map((a: any) => `${a.name}${a.smartcredit_fit_score != null ? ` (fit ${a.smartcredit_fit_score})` : ''}`).join(', ')}.`)
  if ((memories.data ?? []).length) parts.push(`Trusted learnings (approved — treat as playbook):\n${memories.data.map((m: any) => `- ${m.title}: ${m.content} [trust ${m.trust_score}]`).join('\n')}`)

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
