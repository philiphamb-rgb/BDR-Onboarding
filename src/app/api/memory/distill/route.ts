// @ts-nocheck
// Insight Consolidator — distills recent activity (meeting outputs + rep
// feedback) into memory CANDIDATES for human review. It never promotes anything
// itself: candidates land as 'pending' in the Memory Lab review queue, where the
// operator approves/edits/rejects (decision B4 + file 12). High-risk domains are
// flagged so the reviewer knows to look closely.

export const dynamic = 'force-dynamic'
export const maxDuration = 45

import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const AGENT_MODEL = process.env.AGENT_MODEL || 'claude-sonnet-4-6'

export async function POST(req: Request) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: me } = await supabase.from('users').select('team_id').eq('id', user.id).maybeSingle()

  const [{ data: outputs }, { data: feedback }, { data: existing }] = await Promise.all([
    supabase.from('meeting_outputs').select('summary, decisions, next_actions').order('created_at', { ascending: false }).limit(8),
    supabase.from('growth_feedback').select('surface, sentiment, detail').order('created_at', { ascending: false }).limit(15),
    supabase.from('semantic_memories').select('title').limit(50),
  ])
  const material = [
    ...(outputs ?? []).map((o: any) => `Meeting: ${o.summary || ''} Decisions: ${(o.decisions || []).join('; ')}`),
    ...(feedback ?? []).map((f: any) => `Feedback (${f.sentiment}) on ${f.surface}: ${f.detail || ''}`),
  ].filter(s => s.trim().length > 10).join('\n')

  if (!material.trim()) return NextResponse.json({ candidates: [], note: 'Not enough recent activity to distill yet.' })

  const known = (existing ?? []).map((m: any) => m.title).join('; ')
  const system = `You distill a business's recent activity into durable LEARNINGS worth remembering. Return STRICT JSON only:
{"candidates":[{"title":string,"insight":string,"category":"content|funnel|partner|coaching|ops","risk_tier":"low|medium|high","confidence":0-100,"reason":string}]}
Rules: 3-6 candidates max. Each must be a genuine, reusable insight (not a one-off task). Mark risk_tier "high" for anything about SmartCredit claims, financial/credit messaging, compliance, qualification rules, or canonical playbooks. Do not duplicate these already-known learnings: ${known || 'none'}. Be concrete.`

  let candidates: any[] = []
  try {
    const resp = await anthropic.messages.create({
      model: AGENT_MODEL, max_tokens: 1000, system,
      messages: [{ role: 'user', content: `Recent activity:\n${material.slice(0, 8000)}\n\nReturn the JSON.` }],
    })
    const text = (resp.content?.[0]?.text || '').trim()
    candidates = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)).candidates || []
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'distill failed' }, { status: 502 })
  }

  const rows = candidates
    .filter((c: any) => c && c.title && c.insight)
    .slice(0, 6)
    .map((c: any) => ({
      user_id: user.id, team_id: me?.team_id ?? null,
      title: String(c.title).slice(0, 200), insight: String(c.insight).slice(0, 2000),
      category: String(c.category || 'ops').slice(0, 40),
      risk_tier: ['low', 'medium', 'high'].includes(c.risk_tier) ? c.risk_tier : 'low',
      confidence: Math.max(0, Math.min(100, Math.round(Number(c.confidence) || 50))),
      freshness: 100, reason: String(c.reason || '').slice(0, 500),
      status: 'pending',
    }))
  let saved: any[] = []
  if (rows.length) {
    const { data } = await supabase.from('memory_candidates').insert(rows).select('*')
    saved = data ?? []
  }
  return NextResponse.json({ candidates: saved })
}
