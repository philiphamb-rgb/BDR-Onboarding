// @ts-nocheck
// SmartCredit fit scoring — the Partner Fit Scorer rates an account across the
// six fit dimensions (decision + file 08), returns a composite + rationale,
// persists a qualification_scores row, and writes the composite back to the
// account. Ethical guardrail: this scores BUSINESS FIT for a partnership; it
// makes no claim about any consumer's credit outcome.

export const dynamic = 'force-dynamic'
export const maxDuration = 45

import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const AGENT_MODEL = process.env.AGENT_MODEL || 'claude-sonnet-4-6'

export async function POST(req: Request) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const { accountId } = await req.json()
  if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: me } = await supabase.from('users').select('team_id').eq('id', user.id).maybeSingle()

  const { data: account } = await supabase.from('accounts').select('*').eq('id', accountId).maybeSingle()
  if (!account) return NextResponse.json({ error: 'account not found' }, { status: 404 })

  const system = `You are the Partner Fit Scorer for a business that offers ConsumerDirect SmartCredit as a strategic partner opportunity to other businesses. Rate how good a PARTNERSHIP FIT this business is across six dimensions, each 0-100:
audience_fit, trust_level, customer_volume, monetization_fit, regulatory_sensitivity (higher = MORE sensitive = riskier), activation_potential.
Return STRICT JSON only: {"audience_fit":n,"trust_level":n,"customer_volume":n,"monetization_fit":n,"regulatory_sensitivity":n,"activation_potential":n,"composite":n,"rationale":"one short paragraph"}.
composite is your overall 0-100 partnership-fit score (weigh regulatory_sensitivity as a negative). This is about business fit only — never assert anything about any individual's credit outcome. If information is thin, score conservatively and say so.`

  let s: any = null
  try {
    const resp = await anthropic.messages.create({
      model: AGENT_MODEL, max_tokens: 500, system,
      messages: [{ role: 'user', content: `Business: ${account.name}\nVertical: ${account.vertical || 'unknown'}\nSegment: ${account.segment || 'unknown'}\nRevenue potential: ${account.revenue_potential ?? 'unknown'}\nNotes: ${account.ai_summary || 'none'}\n\nReturn the JSON.` }],
    })
    const text = (resp.content?.[0]?.text || '').trim()
    s = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'scoring failed' }, { status: 502 })
  }

  const clamp = (n: any) => { const v = Math.round(Number(n)); return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : null }
  const row = {
    user_id: user.id, team_id: me?.team_id ?? null, account_id: accountId,
    audience_fit: clamp(s.audience_fit), trust_level: clamp(s.trust_level), customer_volume: clamp(s.customer_volume),
    monetization_fit: clamp(s.monetization_fit), regulatory_sensitivity: clamp(s.regulatory_sensitivity),
    activation_potential: clamp(s.activation_potential), composite: clamp(s.composite),
    rationale: typeof s.rationale === 'string' ? s.rationale : null, scored_by: 'partner-ops-lead',
  }
  const { data: saved } = await supabase.from('qualification_scores').insert(row).select('*').maybeSingle()
  if (row.composite != null) {
    await supabase.from('accounts').update({ smartcredit_fit_score: row.composite, updated_at: new Date().toISOString() }).eq('id', accountId)
  }
  return NextResponse.json({ score: saved || row })
}
