// @ts-nocheck
// Repurposing engine — one long-form asset → many short ones. Saves the source
// as a podcast_asset, generates a spread of ready-to-use assets (reels, quotes,
// carousels, text posts, DMs, email + lead-magnet angles, hooks) with the
// Podcast Repurposing Lead's voice, and persists them to repurposed_assets.

export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const AGENT_MODEL = process.env.AGENT_MODEL || 'claude-sonnet-4-6'

export async function POST(req: Request) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const { title, transcript } = await req.json()
  if (!transcript || !transcript.trim()) return NextResponse.json({ error: 'transcript required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: me } = await supabase.from('users').select('team_id').eq('id', user.id).maybeSingle()

  const { data: source } = await supabase.from('podcast_assets')
    .insert({ user_id: user.id, team_id: me?.team_id ?? null, title: title?.trim() || 'Untitled long-form', transcript: transcript.slice(0, 20000) })
    .select('id').maybeSingle()

  const system = `You are the Podcast Repurposing Lead for a creator who teaches AI and Claude to businesses and offers ConsumerDirect SmartCredit as a fit-based partner opportunity. From one long-form transcript, produce a spread of ready-to-post short assets in the creator's practical, value-dense voice.
Return STRICT JSON only: {"assets":[{"kind": string, "title": string, "body": string}]}
Kinds to include a mix of: reel, quote, carousel, text, story, dm, email, hook, lead_magnet. 10-14 assets total. Each body must be genuinely usable as-is. No fabricated financial or credit-outcome claims.`

  let assets: any[] = []
  try {
    const resp = await anthropic.messages.create({
      model: AGENT_MODEL, max_tokens: 2200, system,
      messages: [{ role: 'user', content: `Long-form title: ${title || 'Untitled'}\n\nTranscript:\n${transcript.slice(0, 16000)}\n\nReturn the JSON.` }],
    })
    const text = (resp.content?.[0]?.text || '').trim()
    const jsonStr = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
    assets = JSON.parse(jsonStr).assets || []
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'generation failed' }, { status: 502 })
  }

  const rows = assets
    .filter((a: any) => a && typeof a.body === 'string' && a.body.trim())
    .slice(0, 16)
    .map((a: any) => ({ user_id: user.id, team_id: me?.team_id ?? null, podcast_asset_id: source?.id, kind: String(a.kind || 'text').slice(0, 40), title: String(a.title || '').slice(0, 200), body: String(a.body).slice(0, 4000) }))
  let saved: any[] = []
  if (rows.length) {
    const { data } = await supabase.from('repurposed_assets').insert(rows).select('*')
    saved = data ?? []
  }
  return NextResponse.json({ sourceId: source?.id, assets: saved })
}
